export type ServiceType = 'parser' | 'graph' | 'search' | 'ai' | 'api' | 'monitoring' | 'security';

export interface ServiceConfig {
  serviceType: ServiceType;
  serviceName: string;
  host: string;
  port: number;
  protocol: 'http' | 'grpc' | 'mq';
  healthCheckPath?: string;
  timeout: number;
  retries: number;
}

export interface ServiceDiscoveryConfig {
  type: 'consul' | 'etcd' | 'dns' | 'static';
  endpoints: string[];
  refreshInterval: number;
}

export interface ServiceMetadata {
  serviceId: string;
  serviceType: ServiceType;
  serviceName: string;
  host: string;
  port: number;
  version: string;
  status: 'healthy' | 'unhealthy' | 'starting';
  metadata: Record<string, string>;
  lastHeartbeat: Date;
}

export interface ServiceRequest<T = unknown> {
  requestId: string;
  serviceType: ServiceType;
  operation: string;
  payload: T;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ServiceResponse<T = unknown> {
  requestId: string;
  success: boolean;
  payload?: T;
  error?: ServiceError;
  latency?: number;
}

export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
}

export interface LoadBalancerConfig {
  strategy: 'round-robin' | 'least-connections' | 'random' | 'ip-hash';
  maxRetries: number;
  retryDelay: number;
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerSecond: number;
  burstLimit: number;
}

export interface ServiceMetrics {
  requests: number;
  successes: number;
  failures: number;
  latency: {
    p50: number;
    p90: number;
    p99: number;
    avg: number;
  };
  errors: Record<string, number>;
}

export abstract class ServiceClient {
  protected config: ServiceConfig;
  protected loadBalancer: LoadBalancer;
  protected circuitBreaker: CircuitBreaker;
  protected rateLimiter: RateLimiter;

  constructor(config: ServiceConfig) {
    this.config = config;
    this.loadBalancer = new LoadBalancer({ strategy: 'round-robin', maxRetries: 3, retryDelay: 100 });
    this.circuitBreaker = new CircuitBreaker({
      enabled: true,
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 5000,
      resetTimeout: 30000,
    });
    this.rateLimiter = new RateLimiter({ enabled: true, requestsPerSecond: 100, burstLimit: 50 });
  }

  abstract call<T = unknown, R = unknown>(operation: string, payload: T): Promise<ServiceResponse<R>>;
  
  protected async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    const maxRetries = this.config.retries;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          await this.delay(Math.pow(2, attempt) * 100);
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class LoadBalancer {
  private config: LoadBalancerConfig;
  private instances: ServiceMetadata[] = [];
  private currentIndex = 0;

  constructor(config: LoadBalancerConfig) {
    this.config = config;
  }

  addInstance(instance: ServiceMetadata): void {
    this.instances.push(instance);
  }

  removeInstance(serviceId: string): void {
    this.instances = this.instances.filter(i => i.serviceId !== serviceId);
  }

  selectInstance(): ServiceMetadata | undefined {
    if (this.instances.length === 0) return undefined;

    const healthyInstances = this.instances.filter(i => i.status === 'healthy');
    if (healthyInstances.length === 0) return undefined;

    switch (this.config.strategy) {
      case 'round-robin':
        const instance = healthyInstances[this.currentIndex % healthyInstances.length];
        this.currentIndex++;
        return instance;

      case 'random':
        return healthyInstances[Math.floor(Math.random() * healthyInstances.length)];

      case 'least-connections':
        return healthyInstances[0];

      case 'ip-hash':
        return healthyInstances[0];

      default:
        return healthyInstances[0];
    }
  }
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.config.enabled) {
      return fn();
    }

    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<T>((_, reject) => 
          setTimeout(() => reject(new Error('Circuit breaker timeout')), this.config.timeout)
        )
      ]);

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'closed';
        this.successCount = 0;
        this.failureCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }
}

export class RateLimiter {
  private config: RateLimitConfig;
  private tokens: number;
  private lastRefillTime: number;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.tokens = config.burstLimit;
    this.lastRefillTime = Date.now();
  }

  tryAcquire(): boolean {
    if (!this.config.enabled) return true;

    this.refill();

    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }

    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const tokensToAdd = (elapsed / 1000) * this.config.requestsPerSecond;

    this.tokens = Math.min(this.config.burstLimit, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  getRemainingTokens(): number {
    this.refill();
    return this.tokens;
  }
}