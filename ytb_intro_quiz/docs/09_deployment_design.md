# デプロイメント設計書

## 1. 概要

YouTube イントロクイズバトルシステムのデプロイメント戦略とインフラ構成を定義します。Kubernetes、CI/CD、監視、災害復旧を含む包括的な運用設計です。

## 2. インフラアーキテクチャ

### 2.1 全体構成

```
┌──────────────────────────────────────────────────────────┐
│                    Internet                               │
└─────────────────────┬────────────────────────────────────┘
                      │
┌─────────────────────┴────────────────────────────────────┐
│                   CDN (CloudFlare)                       │
└─────────────────────┬────────────────────────────────────┘
                      │
┌─────────────────────┴────────────────────────────────────┐
│              Load Balancer (ALB)                         │
└─────────────────────┬────────────────────────────────────┘
                      │
┌─────────────────────┴────────────────────────────────────┐
│               Kubernetes Cluster (EKS)                   │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Frontend  │  │   Backend   │  │  WebSocket  │    │
│  │   (Next.js) │  │  (NestJS)   │  │   Server    │    │
│  │             │  │             │  │             │    │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │    │
│  │ │ Pod 1   │ │  │ │ Pod 1   │ │  │ │ Pod 1   │ │    │
│  │ │ Pod 2   │ │  │ │ Pod 2   │ │  │ │ Pod 2   │ │    │
│  │ │ Pod 3   │ │  │ │ Pod 3   │ │  │ │ Pod 3   │ │    │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└──────────────────────────────────────────────────────────┘
                      │
┌─────────────────────┴────────────────────────────────────┐
│                   Data Layer                             │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ PostgreSQL  │  │    Redis    │  │  RabbitMQ   │    │
│  │   (RDS)     │  │(ElastiCache)│  │   (MSK)     │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### 2.2 AWS サービス構成

| コンポーネント | AWSサービス | インスタンス | 理由 |
|-------------|-------------|-------------|------|
| Kubernetes | EKS | - | マネージドサービス、運用負荷軽減 |
| データベース | RDS PostgreSQL | db.r6g.large × 2 | Multi-AZ、自動バックアップ |
| キャッシュ | ElastiCache Redis | cache.r6g.large × 3 | クラスター構成、高可用性 |
| メッセージキュー | MSK (Kafka) | kafka.m5.large × 3 | 高スループット、durability |
| ロードバランサー | ALB | - | L7負荷分散、SSL終端 |
| CDN | CloudFront | - | グローバル配信、キャッシュ最適化 |
| DNS | Route 53 | - | ヘルスチェック、フェイルオーバー |
| 監視 | CloudWatch | - | ログ集約、メトリクス |

## 3. Kubernetes 設計

### 3.1 クラスター構成

```yaml
# cluster-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-config
data:
  cluster-name: yiq-production
  cluster-version: "1.29"
  
  node-groups:
    - name: general-purpose
      instance-types:
        - m5.large
        - m5.xlarge
      min-size: 3
      max-size: 20
      desired-size: 6
    
    - name: compute-optimized
      instance-types:
        - c5.large
        - c5.xlarge
      min-size: 2
      max-size: 10
      desired-size: 4
      taints:
        - key: compute-intensive
          value: "true"
          effect: NoSchedule
```

### 3.2 Namespace設計

```yaml
# namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production
---
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    environment: staging
---
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    environment: monitoring
```

### 3.3 アプリケーションマニフェスト

#### Frontend (Next.js)
```yaml
# frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: yiq/frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_API_URL
          value: "https://api.yiq.example.com"
        - name: NEXT_PUBLIC_WS_URL
          value: "wss://ws.yiq.example.com"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: production
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

#### Backend (NestJS)
```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: yiq/backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10

---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: production
spec:
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

### 3.4 HPA (Horizontal Pod Autoscaler)

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

## 4. CI/CD パイプライン

### 4.1 GitHub Actions ワークフロー

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  AWS_REGION: ap-northeast-1
  EKS_CLUSTER_NAME: yiq-production

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'pnpm'
    
    - name: Install dependencies
      run: pnpm install
    
    - name: Run linting
      run: pnpm lint
    
    - name: Run tests
      run: pnpm test:coverage
    
    - name: SonarQube Scan
      uses: sonarqube-quality-gate-action@master
      env:
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    
    - name: Security scan
      run: |
        pnpm audit
        npx snyk test

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}
    
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v2
    
    - name: Build and push Docker images
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        ECR_REPOSITORY_FRONTEND: yiq/frontend
        ECR_REPOSITORY_BACKEND: yiq/backend
        IMAGE_TAG: ${{ github.sha }}
      run: |
        # Frontend build
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY_FRONTEND:$IMAGE_TAG \
                     -t $ECR_REGISTRY/$ECR_REPOSITORY_FRONTEND:latest \
                     -f apps/frontend/Dockerfile .
        docker push $ECR_REGISTRY/$ECR_REPOSITORY_FRONTEND:$IMAGE_TAG
        docker push $ECR_REGISTRY/$ECR_REPOSITORY_FRONTEND:latest
        
        # Backend build
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY_BACKEND:$IMAGE_TAG \
                     -t $ECR_REGISTRY/$ECR_REPOSITORY_BACKEND:latest \
                     -f apps/backend/Dockerfile .
        docker push $ECR_REGISTRY/$ECR_REPOSITORY_BACKEND:$IMAGE_TAG
        docker push $ECR_REGISTRY/$ECR_REPOSITORY_BACKEND:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}
    
    - name: Update kubeconfig
      run: aws eks update-kubeconfig --region ${{ env.AWS_REGION }} --name ${{ env.EKS_CLUSTER_NAME }}
    
    - name: Deploy to Kubernetes
      run: |
        # Database migration
        kubectl apply -f k8s/migration-job.yaml
        kubectl wait --for=condition=complete job/db-migration --timeout=300s
        
        # Deploy applications
        envsubst < k8s/frontend-deployment.yaml | kubectl apply -f -
        envsubst < k8s/backend-deployment.yaml | kubectl apply -f -
        
        # Wait for rollout
        kubectl rollout status deployment/frontend -n production
        kubectl rollout status deployment/backend -n production
    
    - name: Run smoke tests
      run: |
        kubectl apply -f k8s/smoke-test-job.yaml
        kubectl wait --for=condition=complete job/smoke-test --timeout=300s
```

### 4.2 Blue-Green デプロイメント

```bash
# blue-green-deploy.sh
#!/bin/bash

set -e

NAMESPACE="production"
APP_NAME="backend"
NEW_VERSION=$1
CURRENT_VERSION=$(kubectl get deployment $APP_NAME -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].image}' | cut -d':' -f2)

echo "Current version: $CURRENT_VERSION"
echo "New version: $NEW_VERSION"

# Green環境にデプロイ
kubectl set image deployment/$APP_NAME-green $APP_NAME=$APP_NAME:$NEW_VERSION -n $NAMESPACE

# ロールアウト待機
kubectl rollout status deployment/$APP_NAME-green -n $NAMESPACE --timeout=300s

# ヘルスチェック
GREEN_ENDPOINT=$(kubectl get service $APP_NAME-green -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
for i in {1..10}; do
    if curl -f http://$GREEN_ENDPOINT/health; then
        echo "Health check passed"
        break
    fi
    sleep 10
done

# トラフィック切り替え
kubectl patch service $APP_NAME -n $NAMESPACE -p '{"spec":{"selector":{"version":"green"}}}'

# Blue環境のクリーンアップ（オプション）
read -p "Remove blue environment? (y/N): " -n 1 -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    kubectl delete deployment $APP_NAME-blue -n $NAMESPACE
fi
```

## 5. 監視・ログ設計

### 5.1 Prometheus + Grafana

```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    rule_files:
    - "/etc/prometheus/rules/*.yml"
    
    alerting:
      alertmanagers:
      - static_configs:
        - targets:
          - alertmanager:9093
    
    scrape_configs:
    - job_name: 'kubernetes-apiservers'
      kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names:
          - default
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        insecure_skip_verify: true
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    
    - job_name: 'kubernetes-nodes'
      kubernetes_sd_configs:
      - role: node
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        insecure_skip_verify: true
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
```

### 5.2 アラート設定

```yaml
# alert-rules.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alert-rules
  namespace: monitoring
data:
  alerts.yml: |
    groups:
    - name: yiq-alerts
      rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"
      
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "95th percentile latency is {{ $value }}s"
      
      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Pod is crash looping"
          description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} is crash looping"
      
      - alert: DatabaseConnectionFailure
        expr: up{job="postgresql"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failure"
          description: "Cannot connect to PostgreSQL database"
```

### 5.3 ログ集約（Fluentd + Elasticsearch + Kibana）

```yaml
# fluentd-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: monitoring
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      format json
      read_from_head true
    </source>
    
    <filter kubernetes.**>
      @type kubernetes_metadata
    </filter>
    
    <filter kubernetes.**>
      @type record_transformer
      <record>
        hostname "#{Socket.gethostname}"
        tag ${tag}
        timestamp ${time}
      </record>
    </filter>
    
    <match kubernetes.**>
      @type elasticsearch
      host elasticsearch.monitoring.svc.cluster.local
      port 9200
      index_name kubernetes-logs
      type_name _doc
      logstash_format true
      logstash_prefix kubernetes
      logstash_dateformat %Y.%m.%d
      include_tag_key true
      tag_key @log_name
      flush_interval 10s
    </match>
```

## 6. セキュリティ

### 6.1 ネットワークセキュリティ

```yaml
# network-policies.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress

---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 3000
```

### 6.2 Pod Security Standards

```yaml
# pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

### 6.3 Secret管理

```yaml
# external-secrets.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-secret
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: database-secret
    creationPolicy: Owner
  data:
  - secretKey: url
    remoteRef:
      key: yiq/production/database
      property: connection_string
```

## 7. 災害復旧

### 7.1 バックアップ戦略

```bash
# backup-script.sh
#!/bin/bash

# Database backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -f "/backup/db_$(date +%Y%m%d_%H%M%S).sql"

# Redis backup
redis-cli -h $REDIS_HOST --rdb "/backup/redis_$(date +%Y%m%d_%H%M%S).rdb"

# Kubernetes resources backup
kubectl get all,pv,pvc,secrets,configmaps -o yaml > "/backup/k8s_$(date +%Y%m%d_%H%M%S).yaml"

# Upload to S3
aws s3 sync /backup/ s3://yiq-backups/$(date +%Y/%m/%d)/
```

### 7.2 災害復旧手順

```yaml
# disaster-recovery-plan.yaml
disaster_recovery:
  rpo: 1h  # Recovery Point Objective
  rto: 2h  # Recovery Time Objective
  
  procedures:
    1_assessment:
      - identify_scope_of_disaster
      - activate_disaster_recovery_team
      - notify_stakeholders
    
    2_infrastructure:
      - provision_new_aws_region
      - restore_networking_configuration
      - deploy_kubernetes_cluster
    
    3_data_restoration:
      - restore_database_from_backup
      - restore_redis_data
      - validate_data_integrity
    
    4_application_deployment:
      - deploy_applications
      - update_dns_records
      - run_smoke_tests
    
    5_validation:
      - validate_system_functionality
      - notify_users
      - monitor_system_health
```

## 8. スケーリング戦略

### 8.1 水平スケーリング

```yaml
# cluster-autoscaler.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      containers:
      - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.21.0
        name: cluster-autoscaler
        resources:
          limits:
            cpu: 100m
            memory: 300Mi
          requests:
            cpu: 100m
            memory: 300Mi
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/yiq-production
```

### 8.2 垂直スケーリング

```yaml
# vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: backend-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: backend
      controlledResources: ["cpu", "memory"]
      maxAllowed:
        cpu: 2
        memory: 4Gi
      minAllowed:
        cpu: 100m
        memory: 256Mi
```

## 9. コスト最適化

### 9.1 リソース最適化

```yaml
# cost-optimization.yaml
strategies:
  compute:
    - use_spot_instances_for_non_critical_workloads
    - implement_cluster_autoscaling
    - use_graviton_instances_where_possible
    - schedule_dev_environments_to_shutdown_after_hours
  
  storage:
    - use_gp3_volumes_instead_of_gp2
    - implement_lifecycle_policies_for_s3
    - compress_and_archive_old_logs
  
  networking:
    - use_vpc_endpoints_to_reduce_nat_gateway_costs
    - optimize_data_transfer_between_services
  
  monitoring:
    - implement_cost_alerts
    - use_aws_cost_anomaly_detection
    - regular_cost_optimization_reviews
```

### 9.2 環境別リソース配分

| 環境 | CPU | Memory | Storage | インスタンス数 | 月額コスト(概算) |
|-----|-----|--------|---------|-------------|---------------|
| Production | 20 vCPU | 80 GB | 2 TB | 10 | $1,200 |
| Staging | 8 vCPU | 32 GB | 500 GB | 4 | $480 |
| Development | 4 vCPU | 16 GB | 200 GB | 2 | $240 |

## 10. 運用手順

### 10.1 日次運用

```bash
# daily-operations.sh
#!/bin/bash

# ヘルスチェック
kubectl get pods --all-namespaces | grep -v Running
kubectl top nodes
kubectl top pods --all-namespaces

# ログ確認
kubectl logs -f deployment/backend -n production --tail=100

# メトリクス確認
curl -s http://prometheus:9090/api/v1/query?query=up | jq .

# バックアップ確認
aws s3 ls s3://yiq-backups/$(date +%Y/%m/%d)/
```

### 10.2 インシデント対応

```yaml
# incident-response.yaml
severity_levels:
  P0: # Critical - Service Down
    response_time: 15min
    escalation: immediate
    notification: all_oncall + management
  
  P1: # High - Major Feature Impacted  
    response_time: 1h
    escalation: 2h
    notification: primary_oncall + team_lead
  
  P2: # Medium - Minor Feature Impacted
    response_time: 4h
    escalation: 8h
    notification: primary_oncall
  
  P3: # Low - Enhancement/Cleanup
    response_time: next_business_day
    escalation: none
    notification: team_backlog

runbooks:
  database_connection_failure:
    steps:
      1: check_database_connectivity
      2: verify_credentials_and_certificates
      3: check_security_groups_and_network_acls
      4: failover_to_standby_if_needed
  
  high_memory_usage:
    steps:
      1: identify_memory_consuming_pods
      2: check_for_memory_leaks
      3: restart_affected_pods_if_necessary
      4: scale_up_resources_if_needed
```

## 11. まとめ

本デプロイメント設計により、以下を実現：

1. **高可用性**: Multi-AZ構成による冗長化
2. **自動スケーリング**: 負荷に応じた動的リソース調整  
3. **完全自動化**: CI/CDによるゼロダウンタイムデプロイ
4. **包括的監視**: メトリクス・ログ・アラートの統合
5. **災害復旧**: RPO 1時間、RTO 2時間の復旧体制