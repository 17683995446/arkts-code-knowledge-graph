import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';

export interface SecurityConfig {
  enableEncryption: boolean;
  encryptionAlgorithm: 'aes-256-gcm' | 'aes-128-cbc';
  enableAudit: boolean;
  auditLogPath: string;
  enableRateLimit: boolean;
  rateLimitWindow: number;
  rateLimitMax: number;
  enableCORS: boolean;
  allowedOrigins: string[];
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  ip?: string;
  userAgent?: string;
  statusCode: number;
  duration: number;
  metadata?: Record<string, any>;
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class SecurityManager extends EventEmitter {
  private config: SecurityConfig;
  private encryptionKey: Buffer | null = null;
  private auditLog: AuditEntry[] = [];
  private rateLimitStore: Map<string, RateLimitEntry> = new Map();

  constructor(config: Partial<SecurityConfig> = {}) {
    super();
    this.config = {
      enableEncryption: true,
      encryptionAlgorithm: 'aes-256-gcm',
      enableAudit: true,
      auditLogPath: './logs/audit.log',
      enableRateLimit: true,
      rateLimitWindow: 60000,
      rateLimitMax: 100,
      enableCORS: true,
      allowedOrigins: ['*'],
      ...config,
    };

    if (this.config.enableEncryption) {
      this.initializeEncryption();
    }

    if (this.config.enableAudit) {
      this.ensureAuditLogPath();
    }
  }

  private initializeEncryption(): void {
    const keyEnv = process.env.ENCRYPTION_KEY;
    if (keyEnv) {
      this.encryptionKey = Buffer.from(keyEnv, 'hex');
    } else {
      this.encryptionKey = crypto.randomBytes(32);
      console.log('⚠️  Generated new encryption key. Set ENCRYPTION_KEY env var for persistence.');
    }
  }

  private ensureAuditLogPath(): void {
    const dir = path.dirname(this.config.auditLogPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  public encrypt(data: string): string {
    if (!this.config.enableEncryption || !this.encryptionKey) {
      return data;
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm' as any,
      this.encryptionKey,
      iv
    );

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  public decrypt(encryptedData: string): string {
    if (!this.config.enableEncryption || !this.encryptionKey) {
      return encryptedData;
    }

    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm' as any,
      this.encryptionKey,
      iv
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  public encryptObject(obj: Record<string, any>, fields: string[]): Record<string, any> {
    const result = { ...obj };

    for (const field of fields) {
      if (result[field] !== undefined) {
        result[field] = this.encrypt(JSON.stringify(result[field]));
      }
    }

    return result;
  }

  public decryptObject(obj: Record<string, any>, fields: string[]): Record<string, any> {
    const result = { ...obj };

    for (const field of fields) {
      if (result[field] !== undefined) {
        try {
          result[field] = JSON.parse(this.decrypt(result[field]));
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
        }
      }
    }

    return result;
  }

  public audit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
    if (!this.config.enableAudit) {
      return;
    }

    const auditEntry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...entry,
    };

    this.auditLog.push(auditEntry);

    if (this.auditLog.length > 10000) {
      this.flushAuditLog();
    }

    this.emit('audit', auditEntry);
  }

  public async flushAuditLog(): Promise<void> {
    if (this.auditLog.length === 0) {
      return;
    }

    const entries = [...this.auditLog];
    this.auditLog = [];

    const logLines = entries.map((entry) =>
      JSON.stringify({
        id: entry.id,
        timestamp: entry.timestamp.toISOString(),
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        method: entry.method,
        path: entry.path,
        ip: entry.ip,
        userAgent: entry.userAgent,
        statusCode: entry.statusCode,
        duration: entry.duration,
        metadata: entry.metadata,
      })
    );

    fs.appendFileSync(this.config.auditLogPath, logLines.join('\n') + '\n');
  }

  public getAuditLogs(filters?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    action?: string;
    resource?: string;
  }): AuditEntry[] {
    let logs = [...this.auditLog];

    if (filters) {
      if (filters.startDate) {
        logs = logs.filter((log) => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter((log) => log.timestamp <= filters.endDate!);
      }
      if (filters.userId) {
        logs = logs.filter((log) => log.userId === filters.userId);
      }
      if (filters.action) {
        logs = logs.filter((log) => log.action === filters.action);
      }
      if (filters.resource) {
        logs = logs.filter((log) => log.resource === filters.resource);
      }
    }

    return logs;
  }

  public checkRateLimit(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    if (!this.config.enableRateLimit) {
      return { allowed: true, remaining: -1, resetTime: 0 };
    }

    const now = Date.now();
    const entry = this.rateLimitStore.get(identifier);

    if (!entry || now > entry.resetTime) {
      this.rateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + this.config.rateLimitWindow,
      });

      return {
        allowed: true,
        remaining: this.config.rateLimitMax - 1,
        resetTime: now + this.config.rateLimitWindow,
      };
    }

    if (entry.count >= this.config.rateLimitMax) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    entry.count++;

    return {
      allowed: true,
      remaining: this.config.rateLimitMax - entry.count,
      resetTime: entry.resetTime,
    };
  }

  public validateOrigin(origin: string): boolean {
    if (!this.config.enableCORS) {
      return true;
    }

    if (this.config.allowedOrigins.includes('*')) {
      return true;
    }

    return this.config.allowedOrigins.includes(origin);
  }

  public generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  public hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const saltGenerated = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .pbkdf2Sync(password, saltGenerated, 100000, 64, 'sha512')
      .toString('hex');

    return { hash, salt: saltGenerated };
  }

  public verifyPassword(password: string, hash: string, salt: string): boolean {
    const verifyHash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
      .toString('hex');

    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(verifyHash));
  }

  public sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  public validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  public validateURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  public generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  public verifyCSRFToken(token: string, expected: string): boolean {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  }

  public clearRateLimitStore(): void {
    this.rateLimitStore.clear();
  }

  public getStats(): {
    auditLogSize: number;
    rateLimitEntries: number;
    encryptionEnabled: boolean;
  } {
    return {
      auditLogSize: this.auditLog.length,
      rateLimitEntries: this.rateLimitStore.size,
      encryptionEnabled: this.config.enableEncryption,
    };
  }
}

export default SecurityManager;
