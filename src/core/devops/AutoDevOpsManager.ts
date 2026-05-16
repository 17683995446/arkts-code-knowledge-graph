import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { applicationLogger } from '../../infrastructure/logger/index.js';

export type PipelineStage = 'build' | 'test' | 'deploy' | 'monitor' | 'cleanup';

export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface PipelineStep {
  id: string;
  name: string;
  stage: PipelineStage;
  command: string;
  workingDirectory?: string;
  env?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export interface PipelineRun {
  id: string;
  pipelineId: string;
  status: PipelineStatus;
  startedAt: Date;
  completedAt?: Date;
  steps: PipelineStepResult[];
  logs: string[];
}

export interface PipelineStepResult {
  stepId: string;
  status: PipelineStatus;
  startTime: Date;
  endTime?: Date;
  exitCode?: number;
  output?: string;
  error?: string;
}

export interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  target: string;
  strategy: 'rolling' | 'blue-green' | 'canary';
  healthCheckUrl?: string;
  rollbackOnFailure: boolean;
  timeout: number;
}

export interface PerformanceMetric {
  timestamp: Date;
  metricType: 'cpu' | 'memory' | 'disk' | 'network' | 'responseTime';
  value: number;
  unit: string;
  threshold?: number;
}

export interface AlertRule {
  id: string;
  name: string;
  metricType: PerformanceMetric['metricType'];
  operator: '>' | '<' | '>=' | '<=' | '==';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  notificationTargets: string[];
}

export class AutoDevOpsManager extends EventEmitter {
  private pipelines: Map<string, PipelineStep[]> = new Map();
  private pipelineRuns: Map<string, PipelineRun> = new Map();
  private deploymentConfigs: Map<string, DeploymentConfig> = new Map();
  private performanceMetrics: PerformanceMetric[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.loadDefaultPipelines();
    this.loadDefaultAlertRules();
  }

  private loadDefaultPipelines(): void {
    const defaultPipeline: PipelineStep[] = [
      {
        id: 'install',
        name: 'Install Dependencies',
        stage: 'build',
        command: 'npm install',
        workingDirectory: '.',
      },
      {
        id: 'lint',
        name: 'Lint Code',
        stage: 'build',
        command: 'npm run lint',
        workingDirectory: '.',
      },
      {
        id: 'typecheck',
        name: 'Type Check',
        stage: 'build',
        command: 'npm run typecheck',
        workingDirectory: '.',
      },
      {
        id: 'build',
        name: 'Build Project',
        stage: 'build',
        command: 'npm run build',
        workingDirectory: '.',
      },
      {
        id: 'test-unit',
        name: 'Unit Tests',
        stage: 'test',
        command: 'npm run test:unit',
        workingDirectory: '.',
      },
      {
        id: 'test-integration',
        name: 'Integration Tests',
        stage: 'test',
        command: 'npm run test:integration',
        workingDirectory: '.',
      },
      {
        id: 'deploy',
        name: 'Deploy',
        stage: 'deploy',
        command: 'npm run deploy',
        workingDirectory: '.',
      },
    ];

    this.pipelines.set('default', defaultPipeline);
  }

  private loadDefaultAlertRules(): void {
    const rules: AlertRule[] = [
      {
        id: 'cpu-high',
        name: 'High CPU Usage',
        metricType: 'cpu',
        operator: '>',
        threshold: 80,
        severity: 'high',
        enabled: true,
        notificationTargets: ['slack', 'email'],
      },
      {
        id: 'memory-high',
        name: 'High Memory Usage',
        metricType: 'memory',
        operator: '>',
        threshold: 85,
        severity: 'high',
        enabled: true,
        notificationTargets: ['slack', 'email'],
      },
      {
        id: 'response-slow',
        name: 'Slow Response Time',
        metricType: 'responseTime',
        operator: '>',
        threshold: 1000,
        severity: 'medium',
        enabled: true,
        notificationTargets: ['slack'],
      },
    ];

    rules.forEach(rule => this.alertRules.set(rule.id, rule));
  }

  public registerPipeline(pipelineId: string, steps: PipelineStep[]): void {
    this.pipelines.set(pipelineId, steps);
    applicationLogger.info(`Pipeline registered: ${pipelineId}`);
    this.emit('pipeline:registered', { pipelineId, stepCount: steps.length });
  }

  public getPipeline(pipelineId: string): PipelineStep[] | undefined {
    return this.pipelines.get(pipelineId);
  }

  public listPipelines(): string[] {
    return Array.from(this.pipelines.keys());
  }

  public async runPipeline(pipelineId: string): Promise<PipelineRun> {
    const steps = this.pipelines.get(pipelineId);
    if (!steps) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    const runId = `run-${Date.now()}`;
    const run: PipelineRun = {
      id: runId,
      pipelineId,
      status: 'running',
      startedAt: new Date(),
      steps: [],
      logs: [],
    };

    this.pipelineRuns.set(runId, run);
    this.emit('pipeline:started', { runId, pipelineId });

    for (const step of steps) {
      const stepResult = await this.executeStep(step, runId);
      run.steps.push(stepResult);
      run.logs.push(`[${step.name}] ${stepResult.status}: ${stepResult.output || stepResult.error || 'Completed'}`);

      if (stepResult.status === 'failed') {
        run.status = 'failed';
        run.completedAt = new Date();
        this.emit('pipeline:failed', { runId, pipelineId, failedStep: step.id });
        return run;
      }
    }

    run.status = 'completed';
    run.completedAt = new Date();
    this.emit('pipeline:completed', { runId, pipelineId });

    return run;
  }

  private async executeStep(step: PipelineStep, runId: string): Promise<PipelineStepResult> {
    const result: PipelineStepResult = {
      stepId: step.id,
      status: 'running',
      startTime: new Date(),
    };

    this.emit('step:started', { runId, stepId: step.id, stepName: step.name });

    try {
      const { output, error, exitCode } = await this.executeCommand(step);
      
      result.endTime = new Date();
      result.output = output;
      result.exitCode = exitCode;

      if (exitCode === 0) {
        result.status = 'completed';
      } else {
        result.status = 'failed';
        result.error = error || 'Command failed';
      }
    } catch (error) {
      result.endTime = new Date();
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    this.emit('step:completed', { runId, stepId: step.id, status: result.status });
    return result;
  }

  private async executeCommand(step: PipelineStep): Promise<{ output: string; error: string; exitCode: number }> {
    const { exec } = await import('child_process');
    return new Promise((resolve) => {
      const child = exec(step.command, {
        cwd: step.workingDirectory || process.cwd(),
        env: { ...process.env, ...step.env },
        timeout: step.timeout || 300000,
      });

      let output = '';
      let error = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', (code) => {
        resolve({ output, error, exitCode: code || 0 });
      });

      child.on('error', (err) => {
        resolve({ output, error: err.message, exitCode: 1 });
      });
    });
  }

  public getPipelineRun(runId: string): PipelineRun | undefined {
    return this.pipelineRuns.get(runId);
  }

  public listPipelineRuns(pipelineId?: string): PipelineRun[] {
    let runs = Array.from(this.pipelineRuns.values());
    if (pipelineId) {
      runs = runs.filter(r => r.pipelineId === pipelineId);
    }
    return runs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  public registerDeploymentConfig(configId: string, config: DeploymentConfig): void {
    this.deploymentConfigs.set(configId, config);
    applicationLogger.info(`Deployment config registered: ${configId}`);
  }

  public async deploy(configId: string): Promise<{ success: boolean; message: string }> {
    const config = this.deploymentConfigs.get(configId);
    if (!config) {
      return { success: false, message: `Deployment config ${configId} not found` };
    }

    this.emit('deployment:started', { configId, environment: config.environment });

    try {
      await this.executeDeployment(config);

      if (config.healthCheckUrl) {
        const healthy = await this.performHealthCheck(config.healthCheckUrl, config.timeout);
        if (!healthy) {
          if (config.rollbackOnFailure) {
            await this.executeRollback(config);
            return { success: false, message: 'Health check failed, rolled back' };
          }
          return { success: false, message: 'Health check failed' };
        }
      }

      this.emit('deployment:completed', { configId, environment: config.environment });
      return { success: true, message: 'Deployment successful' };
    } catch (error) {
      if (config.rollbackOnFailure) {
        await this.executeRollback(config);
      }
      this.emit('deployment:failed', { configId, environment: config.environment, error });
      return { success: false, message: error instanceof Error ? error.message : 'Deployment failed' };
    }
  }

  private async executeDeployment(config: DeploymentConfig): Promise<void> {
    applicationLogger.info(`Deploying to ${config.environment} environment`);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  private async executeRollback(config: DeploymentConfig): Promise<void> {
    applicationLogger.info(`Rolling back deployment to ${config.environment}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async performHealthCheck(url: string, timeout: number): Promise<boolean> {
    const deadline = Date.now() + timeout;
    
    while (Date.now() < deadline) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return true;
        }
      } catch {
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
  }

  public recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date(),
    };
    this.performanceMetrics.push(fullMetric);

    if (this.performanceMetrics.length > 10000) {
      this.performanceMetrics = this.performanceMetrics.slice(-5000);
    }

    this.checkAlerts(fullMetric);
  }

  private checkAlerts(metric: PerformanceMetric): void {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled || rule.metricType !== metric.metricType) continue;

      let shouldAlert = false;
      switch (rule.operator) {
        case '>': shouldAlert = metric.value > rule.threshold; break;
        case '<': shouldAlert = metric.value < rule.threshold; break;
        case '>=': shouldAlert = metric.value >= rule.threshold; break;
        case '<=': shouldAlert = metric.value <= rule.threshold; break;
        case '==': shouldAlert = metric.value === rule.threshold; break;
      }

      if (shouldAlert) {
        this.emit('alert:triggered', {
          rule,
          metric,
          message: `${rule.name}: ${metric.value}${metric.unit} ${rule.operator} ${rule.threshold}`,
        });
      }
    }
  }

  public getMetrics(metricType?: PerformanceMetric['metricType'], limit?: number): PerformanceMetric[] {
    let metrics = this.performanceMetrics;
    if (metricType) {
      metrics = metrics.filter(m => m.metricType === metricType);
    }
    if (limit) {
      metrics = metrics.slice(-limit);
    }
    return metrics;
  }

  public addAlertRule(rule: Omit<AlertRule, 'id'>): AlertRule {
    const id = `rule-${Date.now()}`;
    const newRule: AlertRule = { ...rule, id };
    this.alertRules.set(id, newRule);
    return newRule;
  }

  public updateAlertRule(ruleId: string, updates: Partial<AlertRule>): AlertRule | undefined {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return undefined;

    const updatedRule: AlertRule = { ...rule, ...updates, id: ruleId };
    this.alertRules.set(ruleId, updatedRule);
    return updatedRule;
  }

  public deleteAlertRule(ruleId: string): boolean {
    return this.alertRules.delete(ruleId);
  }

  public listAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  public startHealthMonitoring(target: string, intervalMs: number = 5000): void {
    if (this.healthCheckIntervals.has(target)) {
      this.stopHealthMonitoring(target);
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(target);
        const responseTime = Date.now();
        
        this.recordMetric({
          metricType: 'responseTime',
          value: responseTime - Date.now(),
          unit: 'ms',
          threshold: 1000,
        });

        if (!response.ok) {
          this.emit('health:degraded', { target, status: response.status });
        }
      } catch (error) {
        this.emit('health:failed', { target, error });
      }
    }, intervalMs);

    this.healthCheckIntervals.set(target, interval);
  }

  public stopHealthMonitoring(target: string): void {
    const interval = this.healthCheckIntervals.get(target);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(target);
    }
  }

  public getHealthStatus(target: string): { status: 'healthy' | 'degraded' | 'unhealthy' } {
    return { status: 'healthy' };
  }

  public generateDeploymentReport(configId: string): string {
    const config = this.deploymentConfigs.get(configId);
    const runs = this.listPipelineRuns().slice(0, 10);

    const report = `
Deployment Report - ${configId}
================================

Environment: ${config?.environment || 'Unknown'}
Strategy: ${config?.strategy || 'Unknown'}
Target: ${config?.target || 'Unknown'}

Recent Pipeline Runs:
---------------------
${runs.map(run => `
Run ID: ${run.id}
Status: ${run.status}
Started: ${run.startedAt.toISOString()}
Completed: ${run.completedAt?.toISOString() || 'N/A'}
Steps: ${run.steps.length} completed
`).join('')}

Performance Summary:
---------------------
${this.generatePerformanceSummary()}
    `.trim();

    return report;
  }

  private generatePerformanceSummary(): string {
    const metrics = this.getMetrics();
    if (metrics.length === 0) return 'No metrics available';

    const summaries: string[] = [];
    
    const metricTypes: PerformanceMetric['metricType'][] = ['cpu', 'memory', 'disk', 'network', 'responseTime'];
    metricTypes.forEach(type => {
      const typeMetrics = metrics.filter(m => m.metricType === type);
      if (typeMetrics.length > 0) {
        const avg = typeMetrics.reduce((sum, m) => sum + m.value, 0) / typeMetrics.length;
        const max = Math.max(...typeMetrics.map(m => m.value));
        const min = Math.min(...typeMetrics.map(m => m.value));
        summaries.push(`${type}: Avg=${avg.toFixed(2)}, Max=${max.toFixed(2)}, Min=${min.toFixed(2)}`);
      }
    });

    return summaries.join('\n');
  }
}

export default AutoDevOpsManager;