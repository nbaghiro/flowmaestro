#!/bin/bash

# Quick Documentation Site Update Script
# Usage: ./infra/scripts/deploy-docs.sh [environment]
# Example: ./infra/scripts/deploy-docs.sh prod

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Helper functions
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Determine repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PULUMI_DIR="$REPO_ROOT/infra/pulumi"

# Get environment from argument or default to production
ENVIRONMENT="${1:-production}"

print_info "Documentation site update for environment: $ENVIRONMENT"
echo ""

# Load configuration from Pulumi stack
cd "$PULUMI_DIR" || exit 1

# Try to select the stack
if ! pulumi stack select "$ENVIRONMENT" 2>/dev/null; then
    print_error "Stack '$ENVIRONMENT' not found"
    echo "Available stacks:"
    pulumi stack ls 2>/dev/null || echo "  No stacks found"
    exit 1
fi

# Get configuration
GCP_PROJECT=$(pulumi config get gcp:project 2>/dev/null)
GCP_REGION=$(pulumi config get gcp:region 2>/dev/null || echo "us-central1")

if [ -z "$GCP_PROJECT" ]; then
    print_error "Could not get GCP project from Pulumi config"
    exit 1
fi

REGISTRY="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT/flowmaestro"

print_info "Configuration:"
echo "  Project:  $GCP_PROJECT"
echo "  Region:   $GCP_REGION"
echo "  Registry: $REGISTRY"
echo ""

cd "$REPO_ROOT" || exit 1

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | head -1 > /dev/null; then
    print_error "Not authenticated with gcloud"
    echo "Run: gcloud auth login"
    exit 1
fi

# Set gcloud project
gcloud config set project "$GCP_PROJECT" --quiet

# Configure Docker authentication
print_info "Configuring Docker authentication..."
gcloud auth configure-docker "$GCP_REGION-docker.pkg.dev" --quiet
print_success "Docker authenticated"

# Build Docker image
print_info "Building docs Docker image for linux/amd64..."
docker build \
    --platform linux/amd64 \
    -f infra/docker/docs/Dockerfile \
    -t "$REGISTRY/docs:latest" \
    -t "$REGISTRY/docs:$ENVIRONMENT" \
    -t "$REGISTRY/docs:$(date +%Y%m%d-%H%M%S)" \
    .

print_success "Docs image built"

# Push Docker images
print_info "Pushing docs image to Artifact Registry..."
docker push "$REGISTRY/docs:latest"
docker push "$REGISTRY/docs:$ENVIRONMENT"
print_success "Docs image pushed"

# Get kubectl credentials
print_info "Configuring kubectl..."
gcloud container clusters get-credentials \
    "flowmaestro-cluster" \
    --region="$GCP_REGION" \
    --project="$GCP_PROJECT" \
    --quiet

# Restart deployment to pull new image
print_info "Restarting docs deployment..."
kubectl rollout restart deployment/docs -n flowmaestro

# Wait for rollout
print_info "Waiting for rollout to complete..."
kubectl rollout status deployment/docs -n flowmaestro --timeout=5m

# Show pod status
echo ""
print_success "Documentation site updated successfully!"
echo ""
kubectl get pods -n flowmaestro -l component=docs

echo ""
print_info "View logs with:"
echo "  kubectl logs -n flowmaestro -l component=docs --tail=50 -f"
