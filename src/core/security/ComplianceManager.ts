import * as crypto from 'crypto';
import { SecurityManager } from './SecurityManager.js';

export interface CompliancePolicy {
  id: string;
  name: string;
  description?: string;
  type: 'GDPR' | 'CCPA' | 'HIPAA' | 'SOX' | 'ISO27001' | 'CUSTOM';
  enabled: boolean;
  dataRetentionDays: number;
  encryptionRequired: boolean;
  auditLoggingRequired: boolean;
  accessControlRequired: boolean;
  dataMinimizationRequired: boolean;
  consentManagementRequired: boolean;
  breachNotificationDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataSubjectRequest {
  id: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'objection' | 'consent-withdrawal';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  dataSubjectId: string;
  tenantId: string;
  createdAt: Date;
  processedAt?: Date;
  metadata?: Record<string, any>;
}

export interface DataBreachRecord {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedRecords: number;
  breachDate: Date;
  discoveredDate: Date;
  reportedDate?: Date;
  status: 'investigating' | 'contained' | 'resolved' | 'reported';
  metadata?: Record<string, any>;
}

export interface PrivacyAssessment {
  id: string;
  tenantId: string;
  assessmentDate: Date;
  overallScore: number;
  findings: PrivacyFinding[];
  recommendations: string[];
}

export interface PrivacyFinding {
  category: 'data-collection' | 'data-storage' | 'data-processing' | 'data-sharing' | 'data-retention' | 'access-control';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  complianceStatus: 'compliant' | 'partially-compliant' | 'non-compliant';
  remediationSuggestion: string;
}

export class ComplianceManager {
  private policies: Map<string, CompliancePolicy> = new Map();
  private dataSubjectRequests: Map<string, DataSubjectRequest> = new Map();
  private breachRecords: Map<string, DataBreachRecord> = new Map();
  private assessments: Map<string, PrivacyAssessment> = new Map();
  private securityManager: SecurityManager;

  constructor(securityManager: SecurityManager) {
    this.securityManager = securityManager;
    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies(): void {
    const defaultPolicies: Omit<CompliancePolicy, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'GDPR Compliance Policy',
        description: 'General Data Protection Regulation compliance policy',
        type: 'GDPR',
        enabled: true,
        dataRetentionDays: 730,
        encryptionRequired: true,
        auditLoggingRequired: true,
        accessControlRequired: true,
        dataMinimizationRequired: true,
        consentManagementRequired: true,
        breachNotificationDays: 7,
      },
      {
        name: 'CCPA Compliance Policy',
        description: 'California Consumer Privacy Act compliance policy',
        type: 'CCPA',
        enabled: true,
        dataRetentionDays: 365,
        encryptionRequired: true,
        auditLoggingRequired: true,
        accessControlRequired: true,
        dataMinimizationRequired: true,
        consentManagementRequired: true,
        breachNotificationDays: 7,
      },
      {
        name: 'HIPAA Compliance Policy',
        description: 'Health Insurance Portability and Accountability Act compliance policy',
        type: 'HIPAA',
        enabled: true,
        dataRetentionDays: 1825,
        encryptionRequired: true,
        auditLoggingRequired: true,
        accessControlRequired: true,
        dataMinimizationRequired: true,
        consentManagementRequired: true,
        breachNotificationDays: 60,
      },
    ];

    defaultPolicies.forEach(policy => {
      const policyWithId: CompliancePolicy = {
        ...policy,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.policies.set(policyWithId.id, policyWithId);
    });
  }

  public createPolicy(policy: Omit<CompliancePolicy, 'id' | 'createdAt' | 'updatedAt'>): CompliancePolicy {
    const policyId = crypto.randomUUID();
    const newPolicy: CompliancePolicy = {
      ...policy,
      id: policyId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.policies.set(policyId, newPolicy);

    this.securityManager.audit({
      action: 'compliance.policy.create',
      resource: 'compliance-policy',
      resourceId: policyId,
      method: 'POST',
      path: '/api/compliance/policies',
      statusCode: 201,
      duration: 0,
      metadata: { name: policy.name, type: policy.type },
    });

    return newPolicy;
  }

  public getPolicy(policyId: string): CompliancePolicy | undefined {
    return this.policies.get(policyId);
  }

  public updatePolicy(policyId: string, updates: Partial<Omit<CompliancePolicy, 'id' | 'createdAt'>>): CompliancePolicy | undefined {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return undefined;
    }

    const updatedPolicy: CompliancePolicy = {
      ...policy,
      ...updates,
      updatedAt: new Date(),
    };

    this.policies.set(policyId, updatedPolicy);

    this.securityManager.audit({
      action: 'compliance.policy.update',
      resource: 'compliance-policy',
      resourceId: policyId,
      method: 'PUT',
      path: `/api/compliance/policies/${policyId}`,
      statusCode: 200,
      duration: 0,
      metadata: { updates: Object.keys(updates) },
    });

    return updatedPolicy;
  }

  public deletePolicy(policyId: string): boolean {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return false;
    }

    this.policies.delete(policyId);

    this.securityManager.audit({
      action: 'compliance.policy.delete',
      resource: 'compliance-policy',
      resourceId: policyId,
      method: 'DELETE',
      path: `/api/compliance/policies/${policyId}`,
      statusCode: 200,
      duration: 0,
    });

    return true;
  }

  public listPolicies(): CompliancePolicy[] {
    return Array.from(this.policies.values());
  }

  public createDataSubjectRequest(request: Omit<DataSubjectRequest, 'id' | 'createdAt' | 'status'>): DataSubjectRequest {
    const requestId = crypto.randomUUID();
    const newRequest: DataSubjectRequest = {
      ...request,
      id: requestId,
      createdAt: new Date(),
      status: 'pending',
    };

    this.dataSubjectRequests.set(requestId, newRequest);

    this.securityManager.audit({
      action: 'compliance.dsr.create',
      resource: 'data-subject-request',
      resourceId: requestId,
      method: 'POST',
      path: '/api/compliance/dsr',
      statusCode: 201,
      duration: 0,
      metadata: { type: request.type, dataSubjectId: request.dataSubjectId },
    });

    return newRequest;
  }

  public updateDataSubjectRequest(requestId: string, updates: Partial<Omit<DataSubjectRequest, 'id' | 'type' | 'dataSubjectId' | 'tenantId' | 'createdAt'>>): DataSubjectRequest | undefined {
    const request = this.dataSubjectRequests.get(requestId);
    if (!request) {
      return undefined;
    }

    const updatedRequest: DataSubjectRequest = {
      ...request,
      ...updates,
    };

    this.dataSubjectRequests.set(requestId, updatedRequest);

    if (updates.status === 'completed' || updates.status === 'rejected') {
      updatedRequest.processedAt = new Date();
    }

    this.securityManager.audit({
      action: 'compliance.dsr.update',
      resource: 'data-subject-request',
      resourceId: requestId,
      method: 'PUT',
      path: `/api/compliance/dsr/${requestId}`,
      statusCode: 200,
      duration: 0,
      metadata: { updates: Object.keys(updates) },
    });

    return updatedRequest;
  }

  public getDataSubjectRequest(requestId: string): DataSubjectRequest | undefined {
    return this.dataSubjectRequests.get(requestId);
  }

  public listDataSubjectRequests(tenantId?: string): DataSubjectRequest[] {
    let requests = Array.from(this.dataSubjectRequests.values());
    if (tenantId) {
      requests = requests.filter(r => r.tenantId === tenantId);
    }
    return requests;
  }

  public createDataBreachRecord(record: Omit<DataBreachRecord, 'id' | 'discoveredDate' | 'status'>): DataBreachRecord {
    const recordId = crypto.randomUUID();
    const newRecord: DataBreachRecord = {
      ...record,
      id: recordId,
      discoveredDate: new Date(),
      status: 'investigating',
    };

    this.breachRecords.set(recordId, newRecord);

    this.securityManager.audit({
      action: 'compliance.breach.create',
      resource: 'data-breach',
      resourceId: recordId,
      method: 'POST',
      path: '/api/compliance/breaches',
      statusCode: 201,
      duration: 0,
      metadata: { title: record.title, severity: record.severity, affectedRecords: record.affectedRecords },
    });

    return newRecord;
  }

  public updateDataBreachRecord(recordId: string, updates: Partial<Omit<DataBreachRecord, 'id' | 'tenantId' | 'title' | 'description' | 'severity' | 'affectedRecords' | 'breachDate' | 'discoveredDate'>>): DataBreachRecord | undefined {
    const record = this.breachRecords.get(recordId);
    if (!record) {
      return undefined;
    }

    const updatedRecord: DataBreachRecord = {
      ...record,
      ...updates,
    };

    this.breachRecords.set(recordId, updatedRecord);

    if (updates.status === 'reported') {
      updatedRecord.reportedDate = new Date();
    }

    this.securityManager.audit({
      action: 'compliance.breach.update',
      resource: 'data-breach',
      resourceId: recordId,
      method: 'PUT',
      path: `/api/compliance/breaches/${recordId}`,
      statusCode: 200,
      duration: 0,
      metadata: { updates: Object.keys(updates) },
    });

    return updatedRecord;
  }

  public getDataBreachRecord(recordId: string): DataBreachRecord | undefined {
    return this.breachRecords.get(recordId);
  }

  public listDataBreachRecords(tenantId?: string): DataBreachRecord[] {
    let records = Array.from(this.breachRecords.values());
    if (tenantId) {
      records = records.filter(r => r.tenantId === tenantId);
    }
    return records;
  }

  public performPrivacyAssessment(tenantId: string): PrivacyAssessment {
    const assessmentId = crypto.randomUUID();
    const findings: PrivacyFinding[] = this.generateFindings();
    const overallScore = this.calculateOverallScore(findings);
    const recommendations = this.generateRecommendations(findings);

    const assessment: PrivacyAssessment = {
      id: assessmentId,
      tenantId,
      assessmentDate: new Date(),
      overallScore,
      findings,
      recommendations,
    };

    this.assessments.set(assessmentId, assessment);

    this.securityManager.audit({
      action: 'compliance.assessment.create',
      resource: 'privacy-assessment',
      resourceId: assessmentId,
      method: 'POST',
      path: `/api/compliance/assessments/${tenantId}`,
      statusCode: 201,
      duration: 0,
      metadata: { overallScore, findingCount: findings.length },
    });

    return assessment;
  }

  private generateFindings(): PrivacyFinding[] {
    const categories: PrivacyFinding['category'][] = ['data-collection', 'data-storage', 'data-processing', 'data-sharing', 'data-retention', 'access-control'];
    const severities: PrivacyFinding['severity'][] = ['low', 'medium', 'high', 'critical'];
    const statuses: PrivacyFinding['complianceStatus'][] = ['compliant', 'partially-compliant', 'non-compliant'];

    return categories.map(category => ({
      category,
      severity: severities[Math.floor(Math.random() * severities.length)],
      description: `Assessment finding for ${category}`,
      complianceStatus: statuses[Math.floor(Math.random() * statuses.length)],
      remediationSuggestion: `Remediation suggestion for ${category}`,
    }));
  }

  private calculateOverallScore(findings: PrivacyFinding[]): number {
    const severityWeights: Record<PrivacyFinding['severity'], number> = {
      critical: 1.0,
      high: 0.75,
      medium: 0.5,
      low: 0.25,
    };

    const statusWeights: Record<PrivacyFinding['complianceStatus'], number> = {
      compliant: 1.0,
      'partially-compliant': 0.5,
      'non-compliant': 0,
    };

    const totalWeight = findings.reduce((sum, finding) => sum + severityWeights[finding.severity], 0);
    const weightedScore = findings.reduce((sum, finding) => {
      return sum + severityWeights[finding.severity] * statusWeights[finding.complianceStatus];
    }, 0);

    return totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 100;
  }

  private generateRecommendations(findings: PrivacyFinding[]): string[] {
    const criticalFindings = findings.filter(f => f.severity === 'critical' && f.complianceStatus !== 'compliant');
    const highFindings = findings.filter(f => f.severity === 'high' && f.complianceStatus !== 'compliant');

    const recommendations: string[] = [];

    if (criticalFindings.length > 0) {
      recommendations.push('立即修复所有严重违规项');
    }

    if (highFindings.length > 0) {
      recommendations.push('优先处理高优先级问题');
    }

    if (findings.some(f => f.category === 'data-storage' && f.complianceStatus !== 'compliant')) {
      recommendations.push('审查并强化数据存储安全措施');
    }

    if (findings.some(f => f.category === 'access-control' && f.complianceStatus !== 'compliant')) {
      recommendations.push('实施最小权限原则');
    }

    recommendations.push('定期进行隐私合规评估');

    return recommendations;
  }

  public getAssessment(assessmentId: string): PrivacyAssessment | undefined {
    return this.assessments.get(assessmentId);
  }

  public listAssessments(tenantId?: string): PrivacyAssessment[] {
    let assessments = Array.from(this.assessments.values());
    if (tenantId) {
      assessments = assessments.filter(a => a.tenantId === tenantId);
    }
    return assessments;
  }

  public getComplianceStatus(tenantId: string): {
    status: 'compliant' | 'partially-compliant' | 'non-compliant';
    score: number;
    lastAssessmentDate?: Date;
    activePolicies: number;
    pendingDSR: number;
    activeBreaches: number;
  } {
    const activePolicies = this.listPolicies().filter(p => p.enabled).length;
    const pendingDSR = this.listDataSubjectRequests(tenantId).filter(r => r.status === 'pending').length;
    const activeBreaches = this.listDataBreachRecords(tenantId).filter(b => b.status !== 'resolved').length;
    
    const assessments = this.listAssessments(tenantId);
    const latestAssessment = assessments.length > 0
      ? assessments.reduce((latest, current) => 
          current.assessmentDate > latest.assessmentDate ? current : latest
        )
      : null;

    let status: 'compliant' | 'partially-compliant' | 'non-compliant' = 'compliant';
    let score = 100;

    if (latestAssessment) {
      score = latestAssessment.overallScore;
      if (score >= 80) {
        status = 'compliant';
      } else if (score >= 50) {
        status = 'partially-compliant';
      } else {
        status = 'non-compliant';
      }
    }

    if (activeBreaches > 0) {
      status = 'non-compliant';
    }

    return {
      status,
      score,
      lastAssessmentDate: latestAssessment?.assessmentDate,
      activePolicies,
      pendingDSR,
      activeBreaches,
    };
  }
}

export default ComplianceManager;