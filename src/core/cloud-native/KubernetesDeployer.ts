import * as fs from 'fs';
import * as path from 'path';

export type Environment = 'development' | 'staging' | 'production';

export type Region = 
  | 'us-east-1' 
  | 'us-west-2' 
  | 'eu-west-1' 
  | 'eu-central-1' 
  | 'ap-northeast-1' 
  | 'ap-southeast-1';

export interface DeploymentConfig {
  environment: Environment;
  region: Region;
  namespace: string;
  replicas: number;
  resources: ResourceConfig;
  autoscaling?: AutoScalingConfig;
  storage?: StorageConfig;
  ingress?: IngressConfig;
  monitoring?: MonitoringConfig;
  security?: SecurityConfig;
}

export interface ResourceConfig {
  cpu: { request: string; limit: string };
  memory: { request: string; limit: string };
}

export interface AutoScalingConfig {
  minReplicas: number;
  maxReplicas: number;
  cpuThreshold: number;
  memoryThreshold?: number;
}

export interface StorageConfig {
  type: 'pvc' | 'hostPath' | 'emptyDir';
  size: string;
  accessModes?: string[];
}

export interface IngressConfig {
  host: string;
  tls: boolean;
  annotations?: Record<string, string>;
}

export interface MonitoringConfig {
  prometheus: boolean;
  grafana: boolean;
  metricsPort?: number;
}

export interface SecurityConfig {
  serviceAccount: string;
  rbacEnabled: boolean;
  networkPolicy: boolean;
  podSecurityPolicy?: string;
}

export class KubernetesDeployer {
  private outputDir: string;

  constructor(outputDir: string = './k8s') {
    this.outputDir = outputDir;
  }

  public generateDeploymentConfig(config: DeploymentConfig): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    this.generateNamespace(config);
    this.generateDeployment(config);
    this.generateService(config);
    this.generateConfigMap(config);
    this.generateSecret(config);
    
    if (config.autoscaling) {
      this.generateHPA(config);
    }
    
    if (config.storage) {
      this.generatePVC(config);
    }
    
    if (config.ingress) {
      this.generateIngress(config);
    }
    
    if (config.monitoring) {
      this.generateServiceMonitor(config);
    }
    
    if (config.security?.networkPolicy) {
      this.generateNetworkPolicy(config);
    }

    this.generateKustomization(config);
    
    console.log(`Generated Kubernetes deployment configs in ${this.outputDir}`);
  }

  private generateNamespace(config: DeploymentConfig): void {
    const content = `apiVersion: v1
kind: Namespace
metadata:
  name: ${config.namespace}
  labels:
    name: ${config.namespace}
    environment: ${config.environment}
`;
    fs.writeFileSync(path.join(this.outputDir, 'namespace.yaml'), content);
  }

  private generateDeployment(config: DeploymentConfig): void {
    const content = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: arkts-code-graph
  namespace: ${config.namespace}
  labels:
    app: arkts-code-graph
    environment: ${config.environment}
spec:
  replicas: ${config.replicas}
  selector:
    matchLabels:
      app: arkts-code-graph
  template:
    metadata:
      labels:
        app: arkts-code-graph
        environment: ${config.environment}
    spec:
      ${config.security?.serviceAccount ? `serviceAccountName: ${config.security.serviceAccount}` : ''}
      containers:
      - name: arkts-code-graph
        image: arkts-code-graph:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 9090
          name: metrics
        resources:
          requests:
            cpu: ${config.resources.cpu.request}
            memory: ${config.resources.memory.request}
          limits:
            cpu: ${config.resources.cpu.limit}
            memory: ${config.resources.memory.limit}
        envFrom:
        - configMapRef:
            name: arkts-code-graph-config
        - secretRef:
            name: arkts-code-graph-secret
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
`;
    fs.writeFileSync(path.join(this.outputDir, 'deployment.yaml'), content);
  }

  private generateService(config: DeploymentConfig): void {
    const content = `apiVersion: v1
kind: Service
metadata:
  name: arkts-code-graph
  namespace: ${config.namespace}
  labels:
    app: arkts-code-graph
    environment: ${config.environment}
spec:
  type: ClusterIP
  selector:
    app: arkts-code-graph
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  - port: 9090
    targetPort: 9090
    protocol: TCP
    name: metrics
`;
    fs.writeFileSync(path.join(this.outputDir, 'service.yaml'), content);
  }

  private generateConfigMap(config: DeploymentConfig): void {
    const content = `apiVersion: v1
kind: ConfigMap
metadata:
  name: arkts-code-graph-config
  namespace: ${config.namespace}
  labels:
    app: arkts-code-graph
data:
  NODE_ENV: ${config.environment}
  REGION: ${config.region}
  LOG_LEVEL: ${config.environment === 'production' ? 'info' : 'debug'}
`;
    fs.writeFileSync(path.join(this.outputDir, 'configmap.yaml'), content);
  }

  private generateSecret(config: DeploymentConfig): void {
    const content = `apiVersion: v1
kind: Secret
metadata:
  name: arkts-code-graph-secret
  namespace: ${config.namespace}
type: Opaque
stringData:
  DATABASE_URL: ""
  REDIS_URL: ""
  JWT_SECRET: ""
`;
    fs.writeFileSync(path.join(this.outputDir, 'secret.yaml'), content);
  }

  private generateHPA(config: DeploymentConfig): void {
    const autoScale = config.autoscaling!;
    const content = `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: arkts-code-graph-hpa
  namespace: ${config.namespace}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: arkts-code-graph
  minReplicas: ${autoScale.minReplicas}
  maxReplicas: ${autoScale.maxReplicas}
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: ${autoScale.cpuThreshold}
${autoScale.memoryThreshold ? `
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: ${autoScale.memoryThreshold}
` : ''}
`;
    fs.writeFileSync(path.join(this.outputDir, 'hpa.yaml'), content);
  }

  private generatePVC(config: DeploymentConfig): void {
    const storage = config.storage!;
    const content = `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: arkts-code-graph-storage
  namespace: ${config.namespace}
spec:
  accessModes:
    ${(storage.accessModes || ['ReadWriteOnce']).map(mode => `  - ${mode}`).join('\n')}
  resources:
    requests:
      storage: ${storage.size}
`;
    fs.writeFileSync(path.join(this.outputDir, 'pvc.yaml'), content);
  }

  private generateIngress(config: DeploymentConfig): void {
    const ingress = config.ingress!;
    const content = `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: arkts-code-graph-ingress
  namespace: ${config.namespace}
  ${ingress.annotations ? `annotations:
${Object.entries(ingress.annotations).map(([k, v]) => `    ${k}: ${v}`).join('\n')}` : ''}
spec:
  ${ingress.tls ? `tls:
  - hosts:
    - ${ingress.host}
    secretName: arkts-code-graph-tls` : ''}
  rules:
  - host: ${ingress.host}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: arkts-code-graph
            port:
              number: 80
`;
    fs.writeFileSync(path.join(this.outputDir, 'ingress.yaml'), content);
  }

  private generateServiceMonitor(config: DeploymentConfig): void {
    const content = `apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: arkts-code-graph-monitor
  namespace: ${config.namespace}
spec:
  selector:
    matchLabels:
      app: arkts-code-graph
  endpoints:
  - port: metrics
    interval: 15s
`;
    fs.writeFileSync(path.join(this.outputDir, 'servicemonitor.yaml'), content);
  }

  private generateNetworkPolicy(config: DeploymentConfig): void {
    const content = `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: arkts-code-graph-network-policy
  namespace: ${config.namespace}
spec:
  podSelector:
    matchLabels:
      app: arkts-code-graph
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 3000
    - protocol: TCP
      port: 9090
`;
    fs.writeFileSync(path.join(this.outputDir, 'networkpolicy.yaml'), content);
  }

  private generateKustomization(config: DeploymentConfig): void {
    const resources = [
      'namespace.yaml',
      'configmap.yaml',
      'secret.yaml',
      'deployment.yaml',
      'service.yaml'
    ];

    if (config.autoscaling) resources.push('hpa.yaml');
    if (config.storage) resources.push('pvc.yaml');
    if (config.ingress) resources.push('ingress.yaml');
    if (config.monitoring) resources.push('servicemonitor.yaml');
    if (config.security?.networkPolicy) resources.push('networkpolicy.yaml');

    const content = `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: ${config.namespace}
resources:
${resources.map(r => `  - ${r}`).join('\n')}
labels:
- pairs:
    environment: ${config.environment}
    region: ${config.region}
`;
    fs.writeFileSync(path.join(this.outputDir, 'kustomization.yaml'), content);
  }
}

export default KubernetesDeployer;
