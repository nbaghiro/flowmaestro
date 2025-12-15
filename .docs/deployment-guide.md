# FlowMaestro Infrastructure Setup Guide

## Overview

This guide provides comprehensive instructions for deploying FlowMaestro to Google Kubernetes Engine (GKE) using Pulumi for infrastructure-as-code.

> **📍 Local Development**: For local Docker Compose development setup, see [`/infra/local/README.md`](../infra/local/README.md)

---

## Architecture Overview

### Services

1. **Backend API Server** - Fastify REST API + WebSocket server
2. **Temporal Worker** - Durable workflow orchestration engine
3. **Voice Worker** (Optional) - LiveKit voice call handler
4. **Frontend App** - React SPA served via Cloud CDN
5. **Marketing Site** - Static marketing website

### Managed Services

1. **Cloud SQL PostgreSQL 15** - Primary database with pgvector extension
2. **Memorystore Redis** - Pub/sub and caching layer
3. **Temporal Server (Self-Hosted)** - Workflow orchestration running in GKE
4. **Cloud Storage** - Static asset hosting and file uploads (GCS)
5. **Cloud CDN** - Global content delivery
6. **Secret Manager** - Secure credential storage

### Infrastructure Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloud Load Balancer                     │
│                    (SSL Termination)                        │
└──────────────┬──────────────────────────────────────────────┘
               │
    ┌──────────┴──────────┬──────────────────┐
    │                     │                  │
┌───▼────┐         ┌──────▼──────┐      ┌────▼─────┐
│  CDN   │         │   Ingress   │      │   CDN    │
│Frontend│         │  (GKE)      │      │Marketing │
└────────┘         └──────┬──────┘      └──────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
         ┌────▼─────┐          ┌──────▼──────┐
         │API Server│          │Temporal     │
         │(3 pods)  │          │Worker       │
         │          │          │(2 pods)     │
         └────┬─────┘          └──────┬──────┘
              │                       │
    ┌─────────┼───────────────────────┼─────────────┐
    │         │                       │             │
┌───▼────┐ ┌─-▼─────┐      ┌─────────▼──────┐  ┌──▼──────────┐
│Cloud   │ │Memory  │      │Temporal Server │  │Secret       │
│SQL     │ │store   │      │(3 pods GKE)    │  │Manager      │
│Postgres│ │Redis   │      │+ Temporal UI   │  │+ GCS        │
└────────┘ └────────┘      └────────────────┘  └─────────────┘
```

---

## Prerequisites

### Required Tools

- **gcloud CLI** - Google Cloud SDK
- **kubectl** - Kubernetes command-line tool
- **pulumi** - Infrastructure as code tool
- **docker** - Container runtime
- **Node.js 20+** - For Pulumi and local development
- **npm** - Package manager

### Installation

```bash
# Install gcloud CLI
# https://cloud.google.com/sdk/docs/install

# Install kubectl
gcloud components install kubectl

# Install Pulumi
curl -fsSL https://get.pulumi.com | sh

# Verify installations
gcloud --version
kubectl version --client
pulumi version
docker --version
node --version
```

### GCP Project Setup

```bash
# Set your GCP project ID
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"
export GCP_ZONE="us-central1-a"

# Authenticate
gcloud auth login
gcloud auth application-default login

# Set project
gcloud config set project $GCP_PROJECT_ID
gcloud config set compute/region $GCP_REGION
gcloud config set compute/zone $GCP_ZONE

# Enable required APIs
gcloud services enable \
    container.googleapis.com \
    sqladmin.googleapis.com \
    redis.googleapis.com \
    compute.googleapis.com \
    servicenetworking.googleapis.com \
    secretmanager.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    cloudresourcemanager.googleapis.com
```

### Temporal Cloud Setup

1. Sign up at https://temporal.io/cloud
2. Create a namespace (e.g., `flowmaestro-production`)
3. Generate CA certificate and key for mTLS
4. Note your namespace address: `<namespace>.<account>.tmprl.cloud:7233`
5. Store certificates in Secret Manager (we'll automate this)

---

## Project Structure

```
flowmaestro/
├── infra/                      # All infrastructure code
│   ├── pulumi/                 # Pulumi infrastructure code
│   │   ├── index.ts            # Main entry point
│   │   ├── gke-cluster.ts      # GKE cluster configuration
│   │   ├── database.ts         # Cloud SQL setup
│   │   ├── redis.ts            # Memorystore Redis
│   │   ├── secrets.ts          # Secret Manager
│   │   ├── networking.ts       # VPC, Load Balancer, DNS
│   │   ├── storage.ts          # Cloud Storage for frontend
│   │   ├── monitoring.ts       # Cloud Monitoring & Logging
│   │   ├── Pulumi.yaml         # Pulumi project config
│   │   ├── Pulumi.production.yaml  # Production stack config
│   │   ├── Pulumi.staging.yaml     # Staging stack config
│   │   └── package.json
│   ├── k8s/                    # Kubernetes manifests
│   │   ├── base/               # Base configurations
│   │   │   ├── api-deployment.yaml
│   │   │   ├── worker-deployment.yaml
│   │   │   ├── frontend-deployment.yaml
│   │   │   ├── services.yaml
│   │   │   └── ingress.yaml
│   │   ├── overlays/           # Environment-specific overlays
│   │   │   ├── production/
│   │   │   │   └── kustomization.yaml
│   │   │   └── staging/
│   │   │       └── kustomization.yaml
│   │   └── jobs/
│   │       └── db-migration.yaml
│   ├── docker/                 # Docker configurations
│   │   ├── backend/
│   │   │   ├── Dockerfile      # Backend container image
│   │   │   └── .dockerignore
│   │   ├── frontend/
│   │   │   ├── Dockerfile      # Frontend nginx image
│   │   │   ├── nginx.conf
│   │   │   └── .dockerignore
│   │   └── marketing/
│   │       ├── Dockerfile      # Marketing nginx image
│   │       ├── nginx.conf
│   │       └── .dockerignore
│   ├── deploy.sh               # Automated deployment script
│   └── README.md               # Comprehensive deployment guide
├── backend/                    # Backend application code
├── frontend/                   # Frontend application code
├── marketing/                  # Marketing site code
└── cloudbuild.yaml             # CI/CD pipeline
```

---

## Infrastructure Setup with Pulumi

### Step 1: Initialize Pulumi Project

```bash
# Create infrastructure directory
mkdir -p infra/pulumi
cd infra/pulumi

# Initialize Pulumi project
pulumi new gcp-typescript --name flowmaestro-infra

# Install additional dependencies
npm install @pulumi/gcp @pulumi/kubernetes @pulumi/random
```

### Step 2: Configure Pulumi Stack

```bash
# Create production stack
pulumi stack init production

# Set configuration values
pulumi config set gcp:project $GCP_PROJECT_ID
pulumi config set gcp:region us-central1
pulumi config set gcp:zone us-central1-a

# Set application configuration
pulumi config set domain "yourdomain.com"
pulumi config set appName "flowmaestro"
pulumi config set environment "production"

# Set secrets (will be encrypted)
pulumi config set --secret dbPassword "$(openssl rand -base64 32)"
pulumi config set --secret jwtSecret "$(openssl rand -base64 64)"
pulumi config set --secret encryptionKey "$(openssl rand -hex 32)"

# Temporal Cloud configuration
pulumi config set temporalNamespace "flowmaestro-production"
pulumi config set temporalAddress "flowmaestro-production.abc123.tmprl.cloud:7233"
pulumi config set --secret temporalCaCert "$(cat temporal-ca.pem)"
pulumi config set --secret temporalClientCert "$(cat temporal-client.pem)"
pulumi config set --secret temporalClientKey "$(cat temporal-client-key.pem)"
```

### Step 3: Infrastructure Components

The Pulumi infrastructure will provision the following components (see `infra/pulumi/` directory for implementation):

#### GKE Cluster (`gke-cluster.ts`)

- **Type**: Autopilot (managed, auto-scaling)
- **Networking**: VPC-native with IP aliasing
- **Security**: Workload Identity enabled, private nodes
- **Scaling**: Auto-scales based on workload
- **Node pools**: Managed automatically by Autopilot

#### Cloud SQL PostgreSQL (`database.ts`)

- **Version**: PostgreSQL 15
- **Tier**: db-custom-2-7680 (2 vCPUs, 7.5GB RAM)
- **Availability**: High Availability (regional)
- **Backup**: Automated daily backups, point-in-time recovery
- **Extensions**: uuid-ossp, pgcrypto, vector
- **Private IP**: Connected via VPC peering
- **Deletion Protection**: Enabled

#### Memorystore Redis (`redis.ts`)

- **Version**: Redis 7
- **Tier**: Standard (5GB)
- **Availability**: High Availability
- **Private IP**: Connected via VPC
- **Persistence**: RDB snapshots

#### Networking (`networking.ts`)

- **VPC**: Custom VPC with subnet for GKE
- **Private Service Connection**: For Cloud SQL and Memorystore
- **Cloud NAT**: For outbound traffic from private GKE nodes
- **Load Balancer**: Global HTTP(S) Load Balancer
- **SSL Certificate**: Google-managed SSL certificate
- **Cloud Armor**: DDoS protection and WAF

#### Cloud Storage (`storage.ts`)

- **Frontend Bucket**: Public-read for static assets
- **Marketing Bucket**: Public-read for marketing site
- **Lifecycle**: Delete old versions after 30 days
- **Cloud CDN**: Enabled for both buckets

#### Secret Manager (`secrets.ts`)

Stores sensitive credentials:

- `flowmaestro-db-password`
- `flowmaestro-jwt-secret`
- `flowmaestro-encryption-key`
- `flowmaestro-temporal-ca-cert`
- `flowmaestro-temporal-client-cert`
- `flowmaestro-temporal-client-key`
- `flowmaestro-openai-api-key` (optional)
- `flowmaestro-anthropic-api-key` (optional)

### Step 4: Deploy Infrastructure

```bash
# Preview changes
pulumi preview

# Deploy infrastructure
pulumi up

# Note the outputs:
# - GKE cluster name
# - Cloud SQL connection name
# - Redis host
# - Load balancer IP
# - Frontend bucket URL
```

---

## Docker Images

### Backend Dockerfile

Located at `infra/docker/backend/Dockerfile`:

```dockerfile
# Multi-stage build for backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm ci --workspace=backend --workspace=shared

# Copy source code
COPY shared/ ./shared/
COPY backend/ ./backend/
COPY tsconfig.json ./

# Build
RUN npm run build --workspace=shared
RUN npm run build --workspace=backend

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install production dependencies only
RUN npm ci --workspace=backend --workspace=shared --omit=dev

# Copy built files
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/shared/dist ./shared/dist

# Copy migrations
COPY backend/migrations ./backend/migrations

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3001

CMD ["node", "backend/dist/backend/src/index.js"]
```

### Frontend Dockerfile

Located at `infra/docker/frontend/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm ci --workspace=frontend --workspace=shared

# Copy source code
COPY shared/ ./shared/
COPY frontend/ ./frontend/
COPY tsconfig.json ./

# Build
ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build --workspace=shared
RUN npm run build --workspace=frontend

# Production image
FROM nginx:alpine

# Copy nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Frontend nginx config** (`frontend/nginx.conf`):

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing - all routes to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### Marketing Dockerfile

Located at `infra/docker/marketing/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY marketing/package*.json ./marketing/

# Install dependencies
RUN npm ci --workspace=marketing

# Copy source code
COPY marketing/ ./marketing/

# Build
RUN npm run build --workspace=marketing

# Production image
FROM nginx:alpine

# Copy nginx config
COPY marketing/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/marketing/dist /usr/share/nginx/html

# Non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Build and Push Images

```bash
# Configure Artifact Registry
export REGISTRY_REGION="us-central1"
export REGISTRY_NAME="flowmaestro"

# Create repository
gcloud artifacts repositories create $REGISTRY_NAME \
    --repository-format=docker \
    --location=$REGISTRY_REGION \
    --description="FlowMaestro container images"

# Configure Docker authentication
gcloud auth configure-docker ${REGISTRY_REGION}-docker.pkg.dev

# Build images
export IMAGE_TAG="$(git rev-parse --short HEAD)"
export IMAGE_BASE="${REGISTRY_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${REGISTRY_NAME}"

# Backend
docker build -f infra/docker/backend/Dockerfile -t ${IMAGE_BASE}/backend:${IMAGE_TAG} .
docker push ${IMAGE_BASE}/backend:${IMAGE_TAG}

# Frontend
docker build -f infra/docker/frontend/Dockerfile \
    --build-arg VITE_API_URL=https://api.yourdomain.com \
    --build-arg VITE_WS_URL=wss://api.yourdomain.com \
    -t ${IMAGE_BASE}/frontend:${IMAGE_TAG} .
docker push ${IMAGE_BASE}/frontend:${IMAGE_TAG}

# Marketing
docker build -f infra/docker/marketing/Dockerfile -t ${IMAGE_BASE}/marketing:${IMAGE_TAG} .
docker push ${IMAGE_BASE}/marketing:${IMAGE_TAG}

# Tag as latest
docker tag ${IMAGE_BASE}/backend:${IMAGE_TAG} ${IMAGE_BASE}/backend:latest
docker tag ${IMAGE_BASE}/frontend:${IMAGE_TAG} ${IMAGE_BASE}/frontend:latest
docker tag ${IMAGE_BASE}/marketing:${IMAGE_TAG} ${IMAGE_BASE}/marketing:latest

docker push ${IMAGE_BASE}/backend:latest
docker push ${IMAGE_BASE}/frontend:latest
docker push ${IMAGE_BASE}/marketing:latest
```

---

## Kubernetes Deployment

### Step 1: Get GKE Credentials

```bash
# Get cluster credentials
export CLUSTER_NAME=$(pulumi stack output clusterName)
gcloud container clusters get-credentials $CLUSTER_NAME --region $GCP_REGION
```

### Step 2: Create Secrets

```bash
# Create namespace
kubectl create namespace flowmaestro

# Database connection secret
kubectl create secret generic db-credentials \
    --namespace=flowmaestro \
    --from-literal=host=$(pulumi stack output cloudSqlPrivateIp) \
    --from-literal=port=5432 \
    --from-literal=database=flowmaestro \
    --from-literal=user=flowmaestro \
    --from-literal=password=$(pulumi config get dbPassword --show-secrets)

# Redis connection secret
kubectl create secret generic redis-credentials \
    --namespace=flowmaestro \
    --from-literal=host=$(pulumi stack output redisHost) \
    --from-literal=port=6379

# Application secrets
kubectl create secret generic app-secrets \
    --namespace=flowmaestro \
    --from-literal=jwt-secret=$(pulumi config get jwtSecret --show-secrets) \
    --from-literal=encryption-key=$(pulumi config get encryptionKey --show-secrets)

# Temporal Cloud credentials
kubectl create secret generic temporal-credentials \
    --namespace=flowmaestro \
    --from-literal=address=$(pulumi config get temporalAddress) \
    --from-literal=namespace=$(pulumi config get temporalNamespace) \
    --from-file=ca-cert=temporal-ca.pem \
    --from-file=client-cert=temporal-client.pem \
    --from-file=client-key=temporal-client-key.pem
```

### Step 3: Run Database Migrations

```bash
# Apply migration job
kubectl apply -f infra/k8s/jobs/db-migration.yaml

# Watch migration job
kubectl logs -f job/db-migration -n flowmaestro

# Verify completion
kubectl get jobs -n flowmaestro
```

### Step 4: Deploy Applications

```bash
# Apply base manifests
kubectl apply -k infra/k8s/overlays/production

# Watch rollout
kubectl rollout status deployment/api-server -n flowmaestro
kubectl rollout status deployment/temporal-worker -n flowmaestro
kubectl rollout status deployment/frontend -n flowmaestro

# Verify pods
kubectl get pods -n flowmaestro
```

### Step 5: Configure Ingress

```bash
# Create static IP
gcloud compute addresses create flowmaestro-ip --global

# Get IP address
gcloud compute addresses describe flowmaestro-ip --global --format="get(address)"

# Update DNS records (in your DNS provider)
# A record: api.yourdomain.com -> <IP address>
# A record: app.yourdomain.com -> <IP address>
# A record: www.yourdomain.com -> <IP address>

# Apply ingress with managed certificate
kubectl apply -f infra/k8s/base/ingress.yaml

# Wait for certificate provisioning (can take 15-60 minutes)
kubectl describe managedcertificate flowmaestro-cert -n flowmaestro
```

---

## Kubernetes Manifests Reference

### API Server Deployment

Key features:

- **Replicas**: 3 (HPA: 3-10 based on CPU/memory)
- **Resources**: 500m-2000m CPU, 512Mi-2Gi memory
- **Health checks**: Liveness and readiness probes on `/health`
- **Environment**: Injected from ConfigMap and Secrets
- **Ports**: 3001 (HTTP + WebSocket)

### Temporal Worker Deployment

Key features:

- **Replicas**: 2 (HPA: 2-5 based on CPU)
- **Resources**: 1000m-4000m CPU, 1Gi-4Gi memory
- **Command**: Override to run worker entry point
- **No service**: Workers don't expose ports
- **Temporal connection**: mTLS to Temporal Cloud

### Frontend Deployment

Key features:

- **Replicas**: 2
- **Resources**: 100m-500m CPU, 128Mi-512Mi memory
- **Image**: Nginx with built React SPA
- **Health checks**: `/health` endpoint
- **Port**: 80

### Database Migration Job

Key features:

- **Type**: Job (runs once)
- **Restart policy**: OnFailure
- **Command**: `npm run db:migrate`
- **Completion**: Must succeed before deployments

---

## Environment Variables

### API Server Environment

```yaml
# Server configuration
NODE_ENV: production
BACKEND_PORT: "3001"
BACKEND_HOST: "0.0.0.0"
LOG_LEVEL: info

# Database (from secret)
POSTGRES_HOST: <from db-credentials>
POSTGRES_PORT: <from db-credentials>
POSTGRES_DB: <from db-credentials>
POSTGRES_USER: <from db-credentials>
POSTGRES_PASSWORD: <from db-credentials>

# Redis (from secret)
REDIS_HOST: <from redis-credentials>
REDIS_PORT: <from redis-credentials>

# Temporal (from secret)
TEMPORAL_ADDRESS: <from temporal-credentials>
TEMPORAL_NAMESPACE: <from temporal-credentials>
TEMPORAL_CA_CERT: <from temporal-credentials>
TEMPORAL_CLIENT_CERT: <from temporal-credentials>
TEMPORAL_CLIENT_KEY: <from temporal-credentials>

# Security (from secret)
JWT_SECRET: <from app-secrets>
ENCRYPTION_KEY: <from app-secrets>

# URLs (used for CORS, OAuth redirects, email links)
APP_URL: https://app.yourdomain.com
MARKETING_URL: https://yourdomain.com

# Optional: LLM API keys
OPENAI_API_KEY: <from secret>
ANTHROPIC_API_KEY: <from secret>
GOOGLE_API_KEY: <from secret>
```

### Temporal Worker Environment

Same as API server, plus:

```yaml
# Worker configuration
TEMPORAL_TASK_QUEUE: flowmaestro-orchestrator
TEMPORAL_MAX_CONCURRENT_ACTIVITIES: "10"
TEMPORAL_MAX_CONCURRENT_WORKFLOWS: "10"
```

---

## CI/CD Pipeline

### Cloud Build Configuration

Located at `cloudbuild.yaml`:

```yaml
steps:
    # Build backend image
    - name: "gcr.io/cloud-builders/docker"
      args:
          - "build"
          - "-f"
          - "infra/docker/backend/Dockerfile"
          - "-t"
          - "${_REGISTRY}/${_BACKEND_IMAGE}:$SHORT_SHA"
          - "-t"
          - "${_REGISTRY}/${_BACKEND_IMAGE}:latest"
          - "."

    # Build frontend image
    - name: "gcr.io/cloud-builders/docker"
      args:
          - "build"
          - "-f"
          - "infra/docker/frontend/Dockerfile"
          - "--build-arg"
          - "VITE_API_URL=${_API_URL}"
          - "--build-arg"
          - "VITE_WS_URL=${_WS_URL}"
          - "-t"
          - "${_REGISTRY}/${_FRONTEND_IMAGE}:$SHORT_SHA"
          - "-t"
          - "${_REGISTRY}/${_FRONTEND_IMAGE}:latest"
          - "."

    # Push images
    - name: "gcr.io/cloud-builders/docker"
      args: ["push", "--all-tags", "${_REGISTRY}/${_BACKEND_IMAGE}"]

    - name: "gcr.io/cloud-builders/docker"
      args: ["push", "--all-tags", "${_REGISTRY}/${_FRONTEND_IMAGE}"]

    # Deploy to GKE
    - name: "gcr.io/cloud-builders/gke-deploy"
      args:
          - "run"
          - "--filename=infra/k8s/overlays/production"
          - "--image=${_REGISTRY}/${_BACKEND_IMAGE}:$SHORT_SHA"
          - "--location=${_GKE_REGION}"
          - "--cluster=${_GKE_CLUSTER}"
          - "--namespace=flowmaestro"

substitutions:
    _REGISTRY: "us-central1-docker.pkg.dev/${PROJECT_ID}/flowmaestro"
    _BACKEND_IMAGE: "backend"
    _FRONTEND_IMAGE: "frontend"
    _GKE_CLUSTER: "flowmaestro-cluster"
    _GKE_REGION: "us-central1"
    _API_URL: "https://api.yourdomain.com"
    _WS_URL: "wss://api.yourdomain.com"

options:
    machineType: "E2_HIGHCPU_8"
    logging: CLOUD_LOGGING_ONLY
```

### Set up Cloud Build Trigger

```bash
# Connect GitHub repository
gcloud builds triggers create github \
    --name="flowmaestro-production" \
    --repo-name="flowmaestro" \
    --repo-owner="your-github-username" \
    --branch-pattern="^main$" \
    --build-config="cloudbuild.yaml"
```

---

## Monitoring and Observability

### Cloud Logging

Logs are automatically collected from:

- GKE pod stdout/stderr
- Cloud SQL query logs (optional)
- Load Balancer access logs

**View logs:**

```bash
# API server logs
gcloud logging read "resource.type=k8s_container AND resource.labels.pod_name=~'api-server.*'" --limit 50 --format json

# Worker logs
gcloud logging read "resource.type=k8s_container AND resource.labels.pod_name=~'temporal-worker.*'" --limit 50 --format json
```

### Cloud Monitoring

**Dashboards** (see `infra/pulumi/monitoring.ts`):

- API server metrics (request rate, latency, errors)
- Worker metrics (activity execution, failures)
- Database metrics (connections, query latency)
- Redis metrics (memory usage, hit rate)

**Uptime Checks:**

- API health endpoint: `https://api.yourdomain.com/health`
- Frontend: `https://app.yourdomain.com`

**Alert Policies:**

- API server error rate > 5%
- API server p95 latency > 2s
- Database CPU > 80%
- Redis memory > 90%
- Pod crash loop

---

## Scaling Configuration

### Horizontal Pod Autoscaling

**API Server HPA:**

```yaml
minReplicas: 3
maxReplicas: 10
targetCPUUtilizationPercentage: 70
targetMemoryUtilizationPercentage: 80
```

**Temporal Worker HPA:**

```yaml
minReplicas: 2
maxReplicas: 5
targetCPUUtilizationPercentage: 75
```

### Database Scaling

**Cloud SQL:**

- Vertical scaling: Upgrade machine type
- Read replicas: Add read replicas for read-heavy workloads
- Connection pooling: Configured via `max_connections`

### Redis Scaling

**Memorystore:**

- Vertical scaling: Increase memory tier
- Standard tier: Automatic failover

---

## Security Best Practices

### Network Security

- ✅ Private GKE cluster with private nodes
- ✅ VPC-native networking
- ✅ Cloud Armor for DDoS protection
- ✅ Cloud NAT for outbound traffic
- ✅ Private IP for Cloud SQL and Redis

### Secret Management

- ✅ Secret Manager for sensitive credentials
- ✅ Kubernetes secrets for pod environment variables
- ✅ Workload Identity for GCP service authentication
- ✅ No secrets in code or Docker images

### Application Security

- ✅ JWT authentication with secure secret
- ✅ Encrypted credentials in database (AES-256)
- ✅ CORS configured for production domain
- ✅ HTTPS only (HTTP redirects to HTTPS)
- ✅ Security headers (X-Frame-Options, CSP, etc.)

### Container Security

- ✅ Non-root users in containers
- ✅ Multi-stage builds (small attack surface)
- ✅ Alpine base images (minimal)
- ✅ Regular image scanning (Cloud Build)

---

## Cost Optimization

### Estimated Monthly Costs (Production)

| Service             | Configuration       | Estimated Cost       |
| ------------------- | ------------------- | -------------------- |
| GKE Autopilot       | ~10 vCPUs, 20GB RAM | $250-400             |
| Cloud SQL           | db-custom-2-7680 HA | $180-220             |
| Memorystore Redis   | 5GB Standard        | $150-180             |
| Cloud Load Balancer | Global HTTPS        | $20-30               |
| Cloud CDN           | 100GB egress        | $10-20               |
| Cloud Storage       | 10GB, 1M requests   | $5-10                |
| Temporal Cloud      | Depends on plan     | $200-500             |
| **Total**           |                     | **$815-1,360/month** |

### Cost Optimization Tips

1. **Use Autopilot GKE** - Pay only for pods, not nodes
2. **Enable Cloud CDN caching** - Reduce backend load
3. **Use committed use discounts** - 37% savings on Cloud SQL/GKE
4. **Right-size resources** - Monitor and adjust requests/limits
5. **Use preemptible VMs** - For non-critical workers (staging)
6. **Set up budget alerts** - Avoid surprise bills

---

## Disaster Recovery

### Backup Strategy

**Cloud SQL:**

- Automated daily backups (retained 7 days)
- Point-in-time recovery (7 days)
- Manual snapshots before major changes

**Redis:**

- RDB snapshots (automated)
- Ephemeral data (can be rebuilt)

**Application Data:**

- Workflow definitions stored in PostgreSQL
- Execution history in Temporal Cloud (durable)

### Recovery Procedures

**Database Restore:**

```bash
# List backups
gcloud sql backups list --instance=flowmaestro-db

# Restore from backup
gcloud sql backups restore BACKUP_ID --backup-instance=flowmaestro-db
```

**Application Rollback:**

```bash
# Rollback to previous deployment
kubectl rollout undo deployment/api-server -n flowmaestro
kubectl rollout undo deployment/temporal-worker -n flowmaestro
```

---

## Troubleshooting

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod status
kubectl get pods -n flowmaestro

# Describe pod
kubectl describe pod <pod-name> -n flowmaestro

# Check logs
kubectl logs <pod-name> -n flowmaestro

# Common causes:
# - Image pull errors (check Artifact Registry permissions)
# - Secret missing (check secret existence)
# - Resource limits too low (check HPA metrics)
```

#### 2. Database Connection Errors

```bash
# Verify Cloud SQL proxy
kubectl get pods -n flowmaestro -l app=api-server

# Check database credentials
kubectl get secret db-credentials -n flowmaestro -o yaml

# Test connection from pod
kubectl exec -it <api-server-pod> -n flowmaestro -- sh
nc -zv <cloud-sql-ip> 5432
```

#### 3. Temporal Connection Errors

```bash
# Check Temporal credentials
kubectl get secret temporal-credentials -n flowmaestro -o yaml

# Verify certificates
kubectl exec -it <worker-pod> -n flowmaestro -- sh
ls -la /etc/temporal/

# Test Temporal connection
# Check worker logs for connection errors
kubectl logs <worker-pod> -n flowmaestro | grep -i temporal
```

#### 4. SSL Certificate Not Provisioning

```bash
# Check managed certificate status
kubectl describe managedcertificate flowmaestro-cert -n flowmaestro

# Common issues:
# - DNS not propagated (wait 24-48 hours)
# - Domain verification failed (check DNS records)
# - Load balancer not created (check ingress)

# Force certificate renewal
kubectl delete managedcertificate flowmaestro-cert -n flowmaestro
kubectl apply -f infra/k8s/base/ingress.yaml
```

#### 5. WebSocket Connection Failures

```bash
# Check ingress backend health
kubectl describe ingress flowmaestro-ingress -n flowmaestro

# Verify WebSocket path
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
    https://api.yourdomain.com/ws

# Common causes:
# - Load balancer timeout too short (increase to 300s)
# - Backend service not healthy
# - CORS issues (check browser console)
```

---

## Staging Environment

To create a staging environment, follow the same steps with different configuration:

```bash
# Create staging stack
pulumi stack init staging

# Set staging config
pulumi config set environment "staging"
pulumi config set domain "staging.yourdomain.com"

# Use smaller resources
pulumi config set dbTier "db-f1-micro"
pulumi config set redisMemorySizeGb "1"

# Deploy staging infrastructure
pulumi up

# Deploy staging Kubernetes resources
kubectl apply -k infra/k8s/overlays/staging
```

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] GCP project created and APIs enabled
- [ ] Temporal Cloud namespace created
- [ ] Domain registered and DNS configured
- [ ] Pulumi installed and authenticated
- [ ] Docker images built and pushed
- [ ] Secrets generated and stored in Secret Manager
- [ ] Database migrations tested locally

### Infrastructure Deployment

- [ ] Pulumi stack created and configured
- [ ] Infrastructure provisioned (`pulumi up`)
- [ ] GKE cluster accessible (`kubectl get nodes`)
- [ ] Cloud SQL instance running and accessible
- [ ] Memorystore Redis instance running
- [ ] Load Balancer created with static IP
- [ ] DNS records pointing to Load Balancer IP

### Application Deployment

- [ ] Kubernetes secrets created
- [ ] Database migrations completed successfully
- [ ] API server deployed and healthy
- [ ] Temporal worker deployed and connected
- [ ] Frontend deployed to Cloud Storage
- [ ] Ingress configured with SSL certificate
- [ ] SSL certificate provisioned (can take time)

### Post-Deployment

- [ ] Health checks passing
- [ ] API endpoints accessible via HTTPS
- [ ] Frontend loading correctly
- [ ] WebSocket connections working
- [ ] Temporal workflows executing
- [ ] Monitoring dashboards created
- [ ] Alert policies configured
- [ ] Logs flowing to Cloud Logging
- [ ] Uptime checks configured
- [ ] Budget alerts set up

### Verification

- [ ] Create test user account
- [ ] Create and execute test workflow
- [ ] Verify real-time updates (WebSocket)
- [ ] Test OAuth integrations
- [ ] Verify database backups
- [ ] Test horizontal autoscaling
- [ ] Verify disaster recovery procedures
- [ ] Run load tests
- [ ] Security scan completed

---

## Next Steps

1. **Review infrastructure code** in `infra/pulumi/` directory
2. **Review Kubernetes manifests** in `infra/k8s/` directory
3. **Customize configuration** for your domain and requirements
4. **Set up Temporal Cloud** account and certificates
5. **Deploy infrastructure** with Pulumi
6. **Build and push Docker images**
7. **Deploy to Kubernetes**
8. **Configure monitoring and alerts**
9. **Test thoroughly** before production traffic
10. **Set up CI/CD pipeline** for automated deployments

---

## Support and Resources

### Documentation

- [Pulumi GCP Documentation](https://www.pulumi.com/docs/clouds/gcp/)
- [GKE Documentation](https://cloud.google.com/kubernetes-engine/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Temporal Cloud Documentation](https://docs.temporal.io/cloud)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

### Monitoring

- **Cloud Console**: https://console.cloud.google.com
- **GKE Dashboard**: Kubernetes Engine > Workloads
- **Temporal Dashboard**: https://<namespace>.tmprl.cloud

### Getting Help

- Review logs in Cloud Logging
- Check monitoring dashboards
- Consult Temporal Cloud support
- Review FlowMaestro architecture documentation

---

**Last Updated**: 2025-11-04
**Version**: 1.0.0
