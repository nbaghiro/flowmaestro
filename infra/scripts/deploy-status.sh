#!/bin/bash

# ============================================================================
# DEPRECATION NOTICE
# ============================================================================
# This script is DEPRECATED. Please use the unified deployment CLI instead:
#
#   npx fmctl deploy status [options]
#
# Examples:
#   npx fmctl deploy status --env prod
#
# Run 'npx fmctl deploy --help' for more information.
# ============================================================================

# Deploy Status Page to GKE
# Usage: ./infra/scripts/deploy-status.sh

set -e

# Print deprecation warning
echo -e "\033[1;33m[DEPRECATED]\033[0m This script is deprecated. Use 'npx fmctl deploy status' instead."
echo ""

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

ENVIRONMENT="production"

print_info "Status page deployment for environment: $ENVIRONMENT"
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
print_info "Building status Docker image for linux/amd64..."
docker build \
    --platform linux/amd64 \
    -f infra/docker/status/Dockerfile \
    -t "$REGISTRY/status:latest" \
    -t "$REGISTRY/status:$ENVIRONMENT" \
    -t "$REGISTRY/status:$(date +%Y%m%d-%H%M%S)" \
    .

print_success "Status image built"

# Push Docker images
print_info "Pushing status image to Artifact Registry..."
docker push "$REGISTRY/status:latest"
docker push "$REGISTRY/status:$ENVIRONMENT"
print_success "Status image pushed"

# Get kubectl credentials
print_info "Configuring kubectl..."
gcloud container clusters get-credentials \
    "flowmaestro-cluster" \
    --region="$GCP_REGION" \
    --project="$GCP_PROJECT" \
    --quiet

# Check if deployment exists
if kubectl get deployment status -n flowmaestro &>/dev/null; then
    # Deployment exists - restart to pull new image
    print_info "Restarting status deployment..."
    kubectl rollout restart deployment/status -n flowmaestro
else
    # First-time deployment - apply k8s manifests
    print_info "Status deployment not found. Applying k8s manifests..."
    kubectl apply -f "$REPO_ROOT/infra/k8s/base/status-deployment.yaml"
fi

# Wait for rollout
print_info "Waiting for rollout to complete..."
kubectl rollout status deployment/status -n flowmaestro --timeout=5m

# Show pod status
echo ""
print_success "Status page deployed successfully!"
echo ""
kubectl get pods -n flowmaestro -l app=status

echo ""
print_info "View logs with:"
echo "  kubectl logs -n flowmaestro -l app=status --tail=50 -f"
