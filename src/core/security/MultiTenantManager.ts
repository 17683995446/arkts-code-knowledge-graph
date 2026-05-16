import * as crypto from 'crypto';
import { SecurityManager } from './SecurityManager.js';

export interface TenantConfig {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  enabled: boolean;
  encryptionKey: string;
  maxProjects: number;
  maxUsers: number;
  rateLimitConfig: {
    windowMs: number;
    maxRequests: number;
  };
  allowedOrigins: string[];
  metadata?: Record<string, any>;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  role: 'admin' | 'developer' | 'viewer';
  createdAt: Date;
  lastLoginAt?: Date;
  enabled: boolean;
}

export interface TenantProject {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  enabled: boolean;
}

export class MultiTenantManager {
  private tenants: Map<string, TenantConfig> = new Map();
  private users: Map<string, TenantUser> = new Map();
  private projects: Map<string, TenantProject> = new Map();
  private tenantUsersIndex: Map<string, Set<string>> = new Map();
  private tenantProjectsIndex: Map<string, Set<string>> = new Map();
  private securityManager: SecurityManager;

  constructor(securityManager: SecurityManager) {
    this.securityManager = securityManager;
  }

  public createTenant(config: Omit<TenantConfig, 'id' | 'createdAt' | 'updatedAt'>): TenantConfig {
    const tenantId = crypto.randomUUID();
    const tenantConfig: TenantConfig = {
      ...config,
      id: tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tenants.set(tenantId, tenantConfig);
    this.tenantUsersIndex.set(tenantId, new Set());
    this.tenantProjectsIndex.set(tenantId, new Set());

    this.securityManager.audit({
      action: 'tenant.create',
      resource: 'tenant',
      resourceId: tenantId,
      method: 'POST',
      path: '/api/tenants',
      statusCode: 201,
      duration: 0,
      metadata: { name: config.name },
    });

    return tenantConfig;
  }

  public getTenant(tenantId: string): TenantConfig | undefined {
    return this.tenants.get(tenantId);
  }

  public updateTenant(tenantId: string, updates: Partial<Omit<TenantConfig, 'id' | 'createdAt'>>): TenantConfig | undefined {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return undefined;
    }

    const updatedTenant: TenantConfig = {
      ...tenant,
      ...updates,
      updatedAt: new Date(),
    };

    this.tenants.set(tenantId, updatedTenant);

    this.securityManager.audit({
      action: 'tenant.update',
      resource: 'tenant',
      resourceId: tenantId,
      method: 'PUT',
      path: `/api/tenants/${tenantId}`,
      statusCode: 200,
      duration: 0,
      metadata: { updates: Object.keys(updates) },
    });

    return updatedTenant;
  }

  public deleteTenant(tenantId: string): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return false;
    }

    const userIds = this.tenantUsersIndex.get(tenantId) || new Set();
    userIds.forEach(userId => this.users.delete(userId));
    
    const projectIds = this.tenantProjectsIndex.get(tenantId) || new Set();
    projectIds.forEach(projectId => this.projects.delete(projectId));

    this.tenants.delete(tenantId);
    this.tenantUsersIndex.delete(tenantId);
    this.tenantProjectsIndex.delete(tenantId);

    this.securityManager.audit({
      action: 'tenant.delete',
      resource: 'tenant',
      resourceId: tenantId,
      method: 'DELETE',
      path: `/api/tenants/${tenantId}`,
      statusCode: 200,
      duration: 0,
    });

    return true;
  }

  public listTenants(): TenantConfig[] {
    return Array.from(this.tenants.values());
  }

  public createUser(tenantId: string, user: Omit<TenantUser, 'id' | 'createdAt' | 'tenantId'>): TenantUser | undefined {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return undefined;
    }

    const existingUsers = this.tenantUsersIndex.get(tenantId)?.size || 0;
    if (existingUsers >= tenant.maxUsers) {
      throw new Error('Tenant user limit exceeded');
    }

    const userId = crypto.randomUUID();
    const tenantUser: TenantUser = {
      ...user,
      id: userId,
      tenantId,
      createdAt: new Date(),
    };

    this.users.set(userId, tenantUser);
    this.tenantUsersIndex.get(tenantId)?.add(userId);

    this.securityManager.audit({
      action: 'user.create',
      resource: 'user',
      resourceId: userId,
      method: 'POST',
      path: `/api/tenants/${tenantId}/users`,
      statusCode: 201,
      duration: 0,
      metadata: { email: user.email, role: user.role },
    });

    return tenantUser;
  }

  public getUser(userId: string): TenantUser | undefined {
    return this.users.get(userId);
  }

  public updateUser(userId: string, updates: Partial<Omit<TenantUser, 'id' | 'tenantId' | 'createdAt'>>): TenantUser | undefined {
    const user = this.users.get(userId);
    if (!user) {
      return undefined;
    }

    const updatedUser: TenantUser = {
      ...user,
      ...updates,
    };

    this.users.set(userId, updatedUser);

    this.securityManager.audit({
      action: 'user.update',
      resource: 'user',
      resourceId: userId,
      method: 'PUT',
      path: `/api/users/${userId}`,
      statusCode: 200,
      duration: 0,
      metadata: { updates: Object.keys(updates) },
    });

    return updatedUser;
  }

  public deleteUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }

    this.users.delete(userId);
    this.tenantUsersIndex.get(user.tenantId)?.delete(userId);

    this.securityManager.audit({
      action: 'user.delete',
      resource: 'user',
      resourceId: userId,
      method: 'DELETE',
      path: `/api/users/${userId}`,
      statusCode: 200,
      duration: 0,
    });

    return true;
  }

  public listUsers(tenantId: string): TenantUser[] {
    const userIds = this.tenantUsersIndex.get(tenantId) || new Set();
    return Array.from(userIds).map(id => this.users.get(id)).filter(Boolean) as TenantUser[];
  }

  public createProject(tenantId: string, project: Omit<TenantProject, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>): TenantProject | undefined {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return undefined;
    }

    const existingProjects = this.tenantProjectsIndex.get(tenantId)?.size || 0;
    if (existingProjects >= tenant.maxProjects) {
      throw new Error('Tenant project limit exceeded');
    }

    const projectId = crypto.randomUUID();
    const tenantProject: TenantProject = {
      ...project,
      id: projectId,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.projects.set(projectId, tenantProject);
    this.tenantProjectsIndex.get(tenantId)?.add(projectId);

    this.securityManager.audit({
      action: 'project.create',
      resource: 'project',
      resourceId: projectId,
      method: 'POST',
      path: `/api/tenants/${tenantId}/projects`,
      statusCode: 201,
      duration: 0,
      metadata: { name: project.name },
    });

    return tenantProject;
  }

  public getProject(projectId: string): TenantProject | undefined {
    return this.projects.get(projectId);
  }

  public updateProject(projectId: string, updates: Partial<Omit<TenantProject, 'id' | 'tenantId' | 'createdAt'>>): TenantProject | undefined {
    const project = this.projects.get(projectId);
    if (!project) {
      return undefined;
    }

    const updatedProject: TenantProject = {
      ...project,
      ...updates,
      updatedAt: new Date(),
    };

    this.projects.set(projectId, updatedProject);

    this.securityManager.audit({
      action: 'project.update',
      resource: 'project',
      resourceId: projectId,
      method: 'PUT',
      path: `/api/projects/${projectId}`,
      statusCode: 200,
      duration: 0,
      metadata: { updates: Object.keys(updates) },
    });

    return updatedProject;
  }

  public deleteProject(projectId: string): boolean {
    const project = this.projects.get(projectId);
    if (!project) {
      return false;
    }

    this.projects.delete(projectId);
    this.tenantProjectsIndex.get(project.tenantId)?.delete(projectId);

    this.securityManager.audit({
      action: 'project.delete',
      resource: 'project',
      resourceId: projectId,
      method: 'DELETE',
      path: `/api/projects/${projectId}`,
      statusCode: 200,
      duration: 0,
    });

    return true;
  }

  public listProjects(tenantId: string): TenantProject[] {
    const projectIds = this.tenantProjectsIndex.get(tenantId) || new Set();
    return Array.from(projectIds).map(id => this.projects.get(id)).filter(Boolean) as TenantProject[];
  }

  public checkTenantRateLimit(tenantId: string, identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return { allowed: false, remaining: 0, resetTime: 0 };
    }

    const key = `${tenantId}:${identifier}`;
    return this.securityManager.checkRateLimit(key);
  }

  public getTenantStats(tenantId: string) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return null;
    }

    const userCount = this.tenantUsersIndex.get(tenantId)?.size || 0;
    const projectCount = this.tenantProjectsIndex.get(tenantId)?.size || 0;

    return {
      tenantId,
      name: tenant.name,
      userCount,
      projectCount,
      maxUsers: tenant.maxUsers,
      maxProjects: tenant.maxProjects,
      enabled: tenant.enabled,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  public validateTenantAccess(userId: string, tenantId: string): boolean {
    const user = this.users.get(userId);
    return user?.tenantId === tenantId && user.enabled;
  }

  public validateProjectAccess(userId: string, projectId: string): boolean {
    const user = this.users.get(userId);
    const project = this.projects.get(projectId);
    
    if (!user || !project || !user.enabled || !project.enabled) {
      return false;
    }

    return user.tenantId === project.tenantId;
  }
}

export default MultiTenantManager;