#!/bin/bash

# Quick Marketing Site Update Script
# Usage: ./infra/scripts/update-marketing.sh [environment]
# Example: ./infra/scripts/update-marketing.sh prod

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

print_info "Marketing site update for environment: $ENVIRONMENT"
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

# Get configuration from Pulumi config
GA_MEASUREMENT_ID=$(pulumi config get gaMeasurementId 2>/dev/null || echo "")
POSTHOG_KEY=$(pulumi config get posthogKey 2>/dev/null || echo "")
POSTHOG_HOST=$(pulumi config get posthogHost 2>/dev/null || echo "https://us.i.posthog.com")
APP_URL=$(pulumi config get appUrl 2>/dev/null || echo "https://app.flowmaestro.ai")
DOCS_URL=$(pulumi config get docsUrl 2>/dev/null || echo "https://docs.flowmaestro.ai")

print_info "Configuration:"
echo "  Project:  $GCP_PROJECT"
echo "  Region:   $GCP_REGION"
echo "  Registry: $REGISTRY"
echo "  App URL:  $APP_URL"
echo "  Docs URL: $DOCS_URL"
[ -n "$GA_MEASUREMENT_ID" ] && echo "  GA ID:    $GA_MEASUREMENT_ID"
[ -n "$POSTHOG_KEY" ] && echo "  PostHog:  configured"
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
print_info "Building marketing Docker image for linux/amd64..."
docker build \
    --platform linux/amd64 \
    --build-arg VITE_GA_MEASUREMENT_ID="$GA_MEASUREMENT_ID" \
    --build-arg VITE_POSTHOG_KEY="$POSTHOG_KEY" \
    --build-arg VITE_POSTHOG_HOST="$POSTHOG_HOST" \
    --build-arg VITE_APP_URL="$APP_URL" \
    --build-arg VITE_DOCS_URL="$DOCS_URL" \
    -f infra/docker/marketing/Dockerfile \
    -t "$REGISTRY/marketing:latest" \
    -t "$REGISTRY/marketing:$ENVIRONMENT" \
    -t "$REGISTRY/marketing:$(date +%Y%m%d-%H%M%S)" \
    .

print_success "Marketing image built"

# Push Docker images
print_info "Pushing marketing image to Artifact Registry..."
docker push "$REGISTRY/marketing:latest"
docker push "$REGISTRY/marketing:$ENVIRONMENT"
print_success "Marketing image pushed"

# Get kubectl credentials
print_info "Configuring kubectl..."
gcloud container clusters get-credentials \
    "flowmaestro-cluster" \
    --region="$GCP_REGION" \
    --project="$GCP_PROJECT" \
    --quiet

# Restart deployment to pull new image
print_info "Restarting marketing deployment..."
kubectl rollout restart deployment/marketing -n flowmaestro

# Wait for rollout
print_info "Waiting for rollout to complete..."
kubectl rollout status deployment/marketing -n flowmaestro --timeout=5m

# Show pod status
echo ""
print_success "Marketing site updated successfully!"
echo ""
kubectl get pods -n flowmaestro -l component=marketing

echo ""
print_info "View logs with:"
echo "  kubectl logs -n flowmaestro -l component=marketing --tail=50 -f"
