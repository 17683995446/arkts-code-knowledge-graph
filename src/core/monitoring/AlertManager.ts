import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { MetricsCollector } from './MetricsCollector';

export interface AlertRule {
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  enabled: boolean;
}

export interface Alert {
  id: string;
  rule: AlertRule;
  currentValue: number;
  triggeredAt: Date;
  resolvedAt?: Date;
  status: 'firing' | 'resolved';
  acknowledged: boolean;
}

export interface AlertChannel {
  type: 'console' | 'webhook' | 'email' | 'slack';
  config: Record<string, any>;
}

export class AlertManager extends EventEmitter {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private channels: AlertChannel[] = [];
  private collector: MetricsCollector;
  private evaluationInterval: NodeJS.Timeout | null = null;
  private evaluationIntervalMs: number = 10000;

  constructor(metricsCollector: MetricsCollector) {
    super();
    this.collector = metricsCollector;
  }

  public addRule(rule: AlertRule): void {
    this.rules.set(rule.name, rule);
    console.log(`   ✅ Alert rule added: ${rule.name} (${rule.severity})`);
  }

  public removeRule(name: string): void {
    this.rules.delete(name);
  }

  public getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  public addChannel(channel: AlertChannel): void {
    this.channels.push(channel);
    console.log(`   ✅ Alert channel added: ${channel.type}`);
  }

  public startEvaluation(): void {
    if (this.evaluationInterval) return;

    this.evaluationInterval = setInterval(() => {
      this.evaluateRules();
    }, this.evaluationIntervalMs);

    console.log(`   🔔 Alert evaluation started (interval: ${this.evaluationIntervalMs}ms)`);
  }

  public stopEvaluation(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }
  }

  private evaluateRules(): void {
    for (const [name, rule] of this.rules) {
      if (!rule.enabled) continue;

      const summary = this.collector.getSummary(rule.metric, this.detectMetricType(rule.metric));
      if (!summary) continue;

      const currentValue = summary.avg;
      const isViolated = this.checkCondition(currentValue, rule.condition, rule.threshold);

      const existingAlert = this.activeAlerts.get(name);

      if (isViolated) {
        if (!existingAlert) {
          this.triggerAlert(name, currentValue);
        }
      } else {
        if (existingAlert && existingAlert.status === 'firing') {
          this.resolveAlert(name);
        }
      }
    }
  }

  private detectMetricType(metricName: string): any {
    if (metricName.startsWith('counter.')) return 'counter';
    if (metricName.startsWith('gauge.')) return 'gauge';
    if (metricName.startsWith('histogram.')) return 'histogram';
    if (metricName.startsWith('timer.')) return 'timer';
    return 'gauge';
  }

  private checkCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'eq':
        return value === threshold;
      case 'gte':
        return value >= threshold;
      case 'lte':
        return value <= threshold;
      default:
        return false;
    }
  }

  private triggerAlert(ruleName: string, currentValue: number): void {
    const rule = this.rules.get(ruleName);
    if (!rule) return;

    const alert: Alert = {
      id: `${ruleName}-${Date.now()}`,
      rule,
      currentValue,
      triggeredAt: new Date(),
      status: 'firing',
      acknowledged: false,
    };

    this.activeAlerts.set(ruleName, alert);
    this.alertHistory.push(alert);
    this.notifyChannels(alert);

    this.emit('alert', alert);
    this.emit('alert:firing', alert);

    console.log(`   🚨 Alert triggered: ${ruleName} (${rule.severity}) - ${rule.message}`);
    console.log(`      Current value: ${currentValue.toFixed(2)}, Threshold: ${rule.threshold}`);
  }

  private resolveAlert(ruleName: string): void {
    const alert = this.activeAlerts.get(ruleName);
    if (!alert) return;

    alert.status = 'resolved';
    alert.resolvedAt = new Date();

    this.activeAlerts.delete(ruleName);

    this.emit('alert:resolved', alert);

    console.log(`   ✅ Alert resolved: ${ruleName}`);
  }

  private notifyChannels(alert: Alert): void {
    for (const channel of this.channels) {
      this.sendNotification(channel, alert);
    }
  }

  private sendNotification(channel: AlertChannel, alert: Alert): void {
    switch (channel.type) {
      case 'console':
        console.log(`[ALERT] ${alert.rule.name}: ${alert.rule.message}`);
        break;
      case 'webhook':
        console.log(`[WEBHOOK] Would send alert to: ${channel.config.url}`);
        break;
      case 'email':
        console.log(`[EMAIL] Would send email to: ${channel.config.to}`);
        break;
      case 'slack':
        console.log(`[SLACK] Would send message to: ${channel.config.channel}`);
        break;
    }
  }

  public acknowledgeAlert(ruleName: string): void {
    const alert = this.activeAlerts.get(ruleName);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  public getAlertHistory(limit?: number): Alert[] {
    if (limit) {
      return this.alertHistory.slice(-limit);
    }
    return [...this.alertHistory];
  }

  public getAlertByRule(ruleName: string): Alert | undefined {
    return this.activeAlerts.get(ruleName);
  }

  public clearHistory(): void {
    this.alertHistory = [];
  }

  public exportAlerts(filepath?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = filepath || `alerts-export-${timestamp}.json`;
    const data = {
      exportedAt: new Date().toISOString(),
      activeAlerts: this.getActiveAlerts(),
      alertHistory: this.getAlertHistory(),
    };
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`   📁 Alerts exported to: ${filename}`);
    return filename;
  }

  public loadAlertRulesFromFile(filepath: string): void {
    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      const rules = JSON.parse(content);
      for (const rule of rules) {
        this.addRule(rule);
      }
      console.log(`   ✅ Loaded ${rules.length} alert rules from ${filepath}`);
    } catch (error) {
      console.error(`   ❌ Failed to load alert rules: ${error}`);
    }
  }

  public saveAlertRulesToFile(filepath: string): void {
    const rules = this.getRules();
    fs.writeFileSync(filepath, JSON.stringify(rules, null, 2));
    console.log(`   ✅ Saved ${rules.length} alert rules to ${filepath}`);
  }
}

export default AlertManager;
