import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { MetricsCollector, Metric } from './MetricsCollector';
import { AlertManager, Alert } from './AlertManager';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

export interface ReportConfig {
  outputDir: string;
  format: 'json' | 'html' | 'md';
  includeSystemMetrics: boolean;
  includeApplicationMetrics: boolean;
  includeAlerts: boolean;
  includeCharts: boolean;
}

export interface Report {
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  systemMetrics: any;
  applicationMetrics: any;
  alerts: Alert[];
  summary: {
    totalMetrics: number;
    totalAlerts: number;
    activeAlerts: number;
    resolvedAlerts: number;
  };
}

export class ReportGenerator {
  private collector: MetricsCollector;
  private alertManager: AlertManager;
  private config: ReportConfig;

  constructor(
    metricsCollector: MetricsCollector,
    alertManager: AlertManager,
    config: Partial<ReportConfig> = {}
  ) {
    this.collector = metricsCollector;
    this.alertManager = alertManager;
    this.config = {
      outputDir: './reports',
      format: 'html',
      includeSystemMetrics: true,
      includeApplicationMetrics: true,
      includeAlerts: true,
      includeCharts: true,
      ...config,
    };
  }

  public async generateReport(period?: { start: Date; end: Date }): Promise<Report> {
    const report: Report = {
      generatedAt: new Date(),
      period: period || {
        start: new Date(Date.now() - 3600000),
        end: new Date(),
      },
      systemMetrics: null,
      applicationMetrics: null,
      alerts: [],
      summary: {
        totalMetrics: 0,
        totalAlerts: 0,
        activeAlerts: 0,
        resolvedAlerts: 0,
      },
    };

    if (this.config.includeSystemMetrics) {
      report.systemMetrics = this.collectSystemMetrics();
      report.summary.totalMetrics += Object.keys(report.systemMetrics).length;
    }

    if (this.config.includeApplicationMetrics) {
      report.applicationMetrics = this.collectApplicationMetrics();
      report.summary.totalMetrics += Object.keys(report.applicationMetrics).length;
    }

    if (this.config.includeAlerts) {
      report.alerts = this.alertManager.getAlertHistory();
      report.summary.totalAlerts = report.alerts.length;
      report.summary.activeAlerts = this.alertManager.getActiveAlerts().length;
      report.summary.resolvedAlerts = report.alerts.filter((a) => a.status === 'resolved').length;
    }

    return report;
  }

  private collectSystemMetrics(): any {
    const metrics = this.collector.getAllMetrics();
    const systemMetrics: any = {};

    for (const [name, value] of metrics.gauges) {
      if (name.startsWith('system.') || name.startsWith('process.')) {
        systemMetrics[name] = value;
      }
    }

    return systemMetrics;
  }

  private collectApplicationMetrics(): any {
    const metrics = this.collector.getAllMetrics();
    const appMetrics: any = {};

    for (const [name, value] of metrics.counters) {
      if (!name.startsWith('system.') && !name.startsWith('process.')) {
        appMetrics[name] = value;
      }
    }

    for (const [name, values] of metrics.histograms) {
      if (!name.startsWith('system.') && !name.startsWith('process.')) {
        const summary = this.collector.getSummary(name, 'histogram');
        if (summary) {
          appMetrics[name] = summary;
        }
      }
    }

    for (const [name, values] of metrics.timers) {
      if (!name.startsWith('system.') && !name.startsWith('process.')) {
        const summary = this.collector.getSummary(name, 'timer');
        if (summary) {
          appMetrics[name] = summary;
        }
      }
    }

    return appMetrics;
  }

  public async saveReport(report: Report, format?: 'json' | 'html' | 'md'): Promise<string> {
    const fmt = format || this.config.format;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `report-${timestamp}.${fmt}`;
    const filepath = path.join(this.config.outputDir, filename);

    await this.ensureDir(this.config.outputDir);

    let content: string;
    switch (fmt) {
      case 'json':
        content = JSON.stringify(report, null, 2);
        break;
      case 'md':
        content = this.generateMarkdownReport(report);
        break;
      case 'html':
        content = this.generateHtmlReport(report);
        break;
      default:
        content = JSON.stringify(report, null, 2);
    }

    await writeFile(filepath, content);
    console.log(`   ✅ Report saved to: ${filepath}`);

    return filepath;
  }

  private async ensureDir(dir: string): Promise<void> {
    try {
      await mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory exists
    }
  }

  private generateMarkdownReport(report: Report): string {
    let md = `# Metrics Report\n\n`;
    md += `**Generated:** ${report.generatedAt.toISOString()}\n\n`;
    md += `**Period:** ${report.period.start.toISOString()} to ${report.period.end.toISOString()}\n\n`;

    md += `## Summary\n\n`;
    md += `- Total Metrics: ${report.summary.totalMetrics}\n`;
    md += `- Total Alerts: ${report.summary.totalAlerts}\n`;
    md += `- Active Alerts: ${report.summary.activeAlerts}\n`;
    md += `- Resolved Alerts: ${report.summary.resolvedAlerts}\n\n`;

    if (report.systemMetrics) {
      md += `## System Metrics\n\n`;
      md += `| Metric | Value |\n`;
      md += `|--------|-------|\n`;
      for (const [name, value] of Object.entries(report.systemMetrics)) {
        const formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
        md += `| ${name} | ${formattedValue} |\n`;
      }
      md += `\n`;
    }

    if (report.applicationMetrics) {
      md += `## Application Metrics\n\n`;
      md += `### Counters\n\n`;
      for (const [name, value] of Object.entries(report.applicationMetrics)) {
        if (typeof value === 'number') {
          md += `- ${name}: ${value}\n`;
        }
      }
      md += `\n`;
    }

    if (report.alerts.length > 0) {
      md += `## Alerts\n\n`;
      md += `| Alert | Severity | Status | Triggered |\n`;
      md += `|-------|----------|--------|----------|\n`;
      for (const alert of report.alerts) {
        md += `| ${alert.rule.name} | ${alert.rule.severity} | ${alert.status} | ${alert.triggeredAt.toISOString()} |\n`;
      }
      md += `\n`;
    }

    return md;
  }

  private generateHtmlReport(report: Report): string {
    let html = `<!DOCTYPE html>
<html>
<head>
  <title>Metrics Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
    .summary-card { background: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center; }
    .summary-card h3 { margin: 0; color: #666; font-size: 14px; }
    .summary-card .value { font-size: 32px; font-weight: bold; color: #4CAF50; margin: 10px 0; }
    .alert-firing { background-color: #ffebee; color: #c62828; padding: 5px 10px; border-radius: 4px; }
    .alert-resolved { background-color: #e8f5e9; color: #2e7d32; padding: 5px 10px; border-radius: 4px; }
    .severity-critical { color: #d32f2f; font-weight: bold; }
    .severity-high { color: #f57c00; font-weight: bold; }
    .severity-medium { color: #fbc02d; }
    .severity-low { color: #388e3c; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Metrics Report</h1>
    <p><strong>Generated:</strong> ${report.generatedAt.toISOString()}</p>
    <p><strong>Period:</strong> ${report.period.start.toISOString()} to ${report.period.end.toISOString()}</p>

    <h2>Summary</h2>
    <div class="summary">
      <div class="summary-card">
        <h3>Total Metrics</h3>
        <div class="value">${report.summary.totalMetrics}</div>
      </div>
      <div class="summary-card">
        <h3>Total Alerts</h3>
        <div class="value">${report.summary.totalAlerts}</div>
      </div>
      <div class="summary-card">
        <h3>Active Alerts</h3>
        <div class="value">${report.summary.activeAlerts}</div>
      </div>
      <div class="summary-card">
        <h3>Resolved Alerts</h3>
        <div class="value">${report.summary.resolvedAlerts}</div>
      </div>
    </div>`;

    if (report.systemMetrics) {
      html += `
    <h2>System Metrics</h2>
    <table>
      <tr><th>Metric</th><th>Value</th></tr>`;
      for (const [name, value] of Object.entries(report.systemMetrics)) {
        const formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
        html += `<tr><td>${name}</td><td>${formattedValue}</td></tr>`;
      }
      html += `</table>`;
    }

    if (report.alerts.length > 0) {
      html += `
    <h2>Alerts</h2>
    <table>
      <tr><th>Alert</th><th>Severity</th><th>Status</th><th>Triggered</th></tr>`;
      for (const alert of report.alerts) {
        html += `<tr>
          <td>${alert.rule.name}</td>
          <td class="severity-${alert.rule.severity}">${alert.rule.severity.toUpperCase()}</td>
          <td><span class="alert-${alert.status}">${alert.status}</span></td>
          <td>${alert.triggeredAt.toISOString()}</td>
        </tr>`;
      }
      html += `</table>`;
    }

    html += `
  </div>
</body>
</html>`;

    return html;
  }

  public async generateDailyReport(): Promise<string> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const report = await this.generateReport({ start, end });
    return this.saveReport(report, 'html');
  }

  public async generateWeeklyReport(): Promise<string> {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    const report = await this.generateReport({ start, end });
    return this.saveReport(report, 'html');
  }

  public async generateMonthlyReport(): Promise<string> {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const report = await this.generateReport({ start, end });
    return this.saveReport(report, 'html');
  }
}

export default ReportGenerator;
