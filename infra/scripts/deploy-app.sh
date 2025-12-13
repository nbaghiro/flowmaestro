#!/bin/bash

# FlowMaestro Application Deployment Script
# This script deploys application updates (not infrastructure)
# Usage: ./infra/scripts/deploy-app.sh [options]
#
# Options:
#   --backend      Deploy only backend
#   --frontend     Deploy only frontend
#   --marketing    Deploy only marketing
#   --worker       Deploy only temporal-worker
#   --all          Deploy all services (default)
#   --skip-build   Skip Docker build, only restart deployments
#   --tag TAG      Use specific image tag (default: latest)
#   --env ENV      Environment: prod, staging, dev (default: prod)

set -e

# Determine repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Default values
DEPLOY_BACKEND=false
DEPLOY_FRONTEND=false
DEPLOY_MARKETING=false
DEPLOY_WORKER=false
SKIP_BUILD=false
IMAGE_TAG="latest"
ENVIRONMENT="prod"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --backend)
            DEPLOY_BACKEND=true
            shift
            ;;
        --frontend)
            DEPLOY_FRONTEND=true
            shift
            ;;
        --marketing)
            DEPLOY_MARKETING=true
            shift
            ;;
        --worker)
            DEPLOY_WORKER=true
            shift
            ;;
        --all)
            DEPLOY_BACKEND=true
            DEPLOY_FRONTEND=true
            DEPLOY_MARKETING=true
            DEPLOY_WORKER=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --backend      Deploy only backend"
            echo "  --frontend     Deploy only frontend"
            echo "  --marketing    Deploy only marketing"
            echo "  --worker       Deploy only temporal-worker"
            echo "  --all          Deploy all services (default)"
            echo "  --skip-build   Skip Docker build, only restart deployments"
            echo "  --tag TAG      Use specific image tag (default: latest)"
            echo "  --env ENV      Environment: prod, staging, dev (default: prod)"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# If no service specified, deploy all
if ! $DEPLOY_BACKEND && ! $DEPLOY_FRONTEND && ! $DEPLOY_MARKETING && ! $DEPLOY_WORKER; then
    DEPLOY_BACKEND=true
    DEPLOY_FRONTEND=true
    DEPLOY_MARKETING=true
    DEPLOY_WORKER=true
fi

# Configuration based on environment
case $ENVIRONMENT in
    prod|production)
        GCP_PROJECT="flowmaestro-prod"
        GCP_REGION="us-central1"
        DOMAIN="flowmaestro.ai"
        CLUSTER_NAME="flowmaestro-cluster"
        ;;
    staging)
        GCP_PROJECT="flowmaestro-staging"
        GCP_REGION="us-central1"
        DOMAIN="staging.flowmaestro.ai"
        CLUSTER_NAME="flowmaestro-staging-cluster"
        ;;
    dev)
        GCP_PROJECT="flowmaestro-dev"
        GCP_REGION="us-central1"
        DOMAIN="dev.flowmaestro.ai"
        CLUSTER_NAME="flowmaestro-dev-cluster"
        ;;
    *)
        print_error "Unknown environment: $ENVIRONMENT"
        exit 1
        ;;
esac

REGISTRY="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT/flowmaestro"

print_info "Deploying to $ENVIRONMENT environment"
print_info "Registry: $REGISTRY"
print_info "Tag: $IMAGE_TAG"

# Configure kubectl if not in CI
if [ -z "$CI" ]; then
    print_info "Configuring kubectl..."
    gcloud container clusters get-credentials "$CLUSTER_NAME" \
        --region="$GCP_REGION" \
        --project="$GCP_PROJECT" 2>/dev/null || true
fi

# Build and push images
if ! $SKIP_BUILD; then
    print_info "Configuring Docker authentication..."
    gcloud auth configure-docker "$GCP_REGION-docker.pkg.dev" --quiet

    cd "$REPO_ROOT"

    if $DEPLOY_BACKEND || $DEPLOY_WORKER; then
        print_info "Building backend image..."
        docker build --platform linux/amd64 \
            -f infra/docker/backend/Dockerfile \
            -t "$REGISTRY/backend:$IMAGE_TAG" \
            -t "$REGISTRY/backend:$(git rev-parse --short HEAD)" \
            .

        print_info "Pushing backend image..."
        docker push "$REGISTRY/backend:$IMAGE_TAG"
        docker push "$REGISTRY/backend:$(git rev-parse --short HEAD)"
        print_success "Backend image pushed"
    fi

    if $DEPLOY_FRONTEND; then
        print_info "Building frontend image..."
        docker build --platform linux/amd64 \
            -f infra/docker/frontend/Dockerfile \
            --build-arg VITE_API_URL="https://api.$DOMAIN" \
            --build-arg VITE_WS_URL="https://api.$DOMAIN" \
            -t "$REGISTRY/frontend:$IMAGE_TAG" \
            -t "$REGISTRY/frontend:$(git rev-parse --short HEAD)" \
            .

        print_info "Pushing frontend image..."
        docker push "$REGISTRY/frontend:$IMAGE_TAG"
        docker push "$REGISTRY/frontend:$(git rev-parse --short HEAD)"
        print_success "Frontend image pushed"
    fi

    if $DEPLOY_MARKETING; then
        print_info "Building marketing image..."
        docker build --platform linux/amd64 \
            -f infra/docker/marketing/Dockerfile \
            -t "$REGISTRY/marketing:$IMAGE_TAG" \
            -t "$REGISTRY/marketing:$(git rev-parse --short HEAD)" \
            .

        print_info "Pushing marketing image..."
        docker push "$REGISTRY/marketing:$IMAGE_TAG"
        docker push "$REGISTRY/marketing:$(git rev-parse --short HEAD)"
        print_success "Marketing image pushed"
    fi
fi

# Restart deployments
print_info "Restarting deployments..."

if $DEPLOY_BACKEND; then
    print_info "Restarting api-server..."
    kubectl rollout restart deployment/api-server -n flowmaestro
fi

if $DEPLOY_FRONTEND; then
    print_info "Restarting frontend..."
    kubectl rollout restart deployment/frontend -n flowmaestro
fi

if $DEPLOY_MARKETING; then
    print_info "Restarting marketing..."
    kubectl rollout restart deployment/marketing -n flowmaestro
fi

if $DEPLOY_WORKER; then
    print_info "Restarting temporal-worker..."
    kubectl rollout restart deployment/temporal-worker -n flowmaestro
fi

# Wait for rollouts to complete
print_info "Waiting for rollouts to complete..."

if $DEPLOY_BACKEND; then
    kubectl rollout status deployment/api-server -n flowmaestro --timeout=5m
    print_success "api-server rolled out"
fi

if $DEPLOY_FRONTEND; then
    kubectl rollout status deployment/frontend -n flowmaestro --timeout=5m
    print_success "frontend rolled out"
fi

if $DEPLOY_MARKETING; then
    kubectl rollout status deployment/marketing -n flowmaestro --timeout=5m
    print_success "marketing rolled out"
fi

if $DEPLOY_WORKER; then
    kubectl rollout status deployment/temporal-worker -n flowmaestro --timeout=5m
    print_success "temporal-worker rolled out"
fi

print_success "Deployment complete!"
echo ""
print_info "Deployed services:"
kubectl get pods -n flowmaestro -o wide | grep -E "api-server|frontend|marketing|temporal-worker"
