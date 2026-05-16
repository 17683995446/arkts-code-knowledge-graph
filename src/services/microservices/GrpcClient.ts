import * as crypto from 'crypto';
import { ServiceConfig, ServiceResponse, ServiceError, ServiceClient } from './ServiceInterface.js';

export interface GrpcMethodInfo {
  service: string;
  method: string;
  requestType: string;
  responseType: string;
}

export interface GrpcCallOptions {
  deadline?: number;
  metadata?: Record<string, string>;
  compression?: 'none' | 'gzip' | 'deflate';
}

export interface GrpcError extends ServiceError {
  grpcCode: number;
  details?: string;
}

export abstract class GrpcClient extends ServiceClient {
  private connection: GrpcConnection | null = null;
  private connected = false;

  constructor(config: ServiceConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    this.connection = await this.createConnection();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.connected || !this.connection) return;

    await this.connection.close();
    this.connection = null;
    this.connected = false;
  }

  async call<T = unknown, R = unknown>(operation: string, payload: T): Promise<ServiceResponse<R>> {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      if (!this.connected) {
        await this.connect();
      }

      const result = await this.executeWithRetry(async () => {
        if (!this.connection) {
          throw new Error('Not connected');
        }
        return this.connection.call<T, R>(operation, payload);
      });

      return {
        requestId,
        success: true,
        payload: result,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      const grpcError: GrpcError = {
        code: 'GRPC_ERROR',
        message: (error as Error).message,
        grpcCode: 2,
        retryable: true,
      };

      return {
        requestId,
        success: false,
        error: grpcError,
        latency: Date.now() - startTime,
      };
    }
  }

  protected abstract createConnection(): Promise<GrpcConnection>;
}

export interface GrpcConnection {
  call<T = unknown, R = unknown>(method: string, payload: T): Promise<R>;
  close(): Promise<void>;
  isConnected(): boolean;
}

export class GrpcConnectionImpl implements GrpcConnection {
  private host: string;
  private port: number;
  private connected = false;

  constructor(host: string, port: number) {
    this.host = host;
    this.port = port;
  }

  async call<T = unknown, R = unknown>(method: string, payload: T): Promise<R> {
    if (!this.connected) {
      await this.connectInternal();
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({} as R);
      }, Math.random() * 100);
    });
  }

  async close(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async connectInternal(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    this.connected = true;
  }
}

export class ParserGrpcClient extends GrpcClient {
  constructor(config: ServiceConfig) {
    super(config);
  }

  protected createConnection(): Promise<GrpcConnection> {
    return Promise.resolve(new GrpcConnectionImpl(this.config.host, this.config.port));
  }

  async parseFile(filePath: string): Promise<ServiceResponse<unknown>> {
    return this.call('parseFile', { filePath });
  }

  async parseDirectory(directoryPath: string): Promise<ServiceResponse<unknown>> {
    return this.call('parseDirectory', { directoryPath });
  }

  async parseProject(projectPath: string): Promise<ServiceResponse<unknown>> {
    return this.call('parseProject', { projectPath });
  }
}

export class GraphGrpcClient extends GrpcClient {
  constructor(config: ServiceConfig) {
    super(config);
  }

  protected createConnection(): Promise<GrpcConnection> {
    return Promise.resolve(new GrpcConnectionImpl(this.config.host, this.config.port));
  }

  async addEntity(entity: unknown): Promise<ServiceResponse<unknown>> {
    return this.call('addEntity', entity);
  }

  async addRelation(relation: unknown): Promise<ServiceResponse<unknown>> {
    return this.call('addRelation', relation);
  }

  async query(query: string): Promise<ServiceResponse<unknown>> {
    return this.call('query', { query });
  }

  async getStatistics(): Promise<ServiceResponse<unknown>> {
    return this.call('getStatistics', {});
  }
}

export class SearchGrpcClient extends GrpcClient {
  constructor(config: ServiceConfig) {
    super(config);
  }

  protected createConnection(): Promise<GrpcConnection> {
    return Promise.resolve(new GrpcConnectionImpl(this.config.host, this.config.port));
  }

  async search(query: string): Promise<ServiceResponse<unknown>> {
    return this.call('search', { query });
  }

  async semanticSearch(query: string): Promise<ServiceResponse<unknown>> {
    return this.call('semanticSearch', { query });
  }

  async indexDocument(document: unknown): Promise<ServiceResponse<unknown>> {
    return this.call('indexDocument', document);
  }
}

export class AIGrpcClient extends GrpcClient {
  constructor(config: ServiceConfig) {
    super(config);
  }

  protected createConnection(): Promise<GrpcConnection> {
    return Promise.resolve(new GrpcConnectionImpl(this.config.host, this.config.port));
  }

  async analyzeCode(code: string, language: string): Promise<ServiceResponse<unknown>> {
    return this.call('analyzeCode', { code, language });
  }

  async generateSuggestions(code: string): Promise<ServiceResponse<unknown>> {
    return this.call('generateSuggestions', { code });
  }

  async analyzeSecurity(code: string): Promise<ServiceResponse<unknown>> {
    return this.call('analyzeSecurity', { code });
  }
}