#!/bin/bash
#
# Database Seeding Script
#
# Seeds workflow templates and agent templates into the database.
#
# Usage:
#   ./db-seed.sh [local|prod] [--yes]
#
# Options:
#   --yes, -y    Skip confirmation prompts (for CI/CD or scripted usage)
#
# Examples:
#   ./db-seed.sh           # Seeds local database (default)
#   ./db-seed.sh local     # Seeds local database
#   ./db-seed.sh prod      # Seeds production database in Kubernetes (requires confirmation)
#   ./db-seed.sh prod --yes # Seeds production database without confirmation
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Parse arguments
TARGET="${1:-local}"
SKIP_CONFIRM=false

for arg in "$@"; do
    case "$arg" in
        --yes|-y)
            SKIP_CONFIRM=true
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

case "$TARGET" in
    local)
        echo_info "Seeding local database..."
        cd "$PROJECT_ROOT/backend"
        npm run db:seed
        echo_info "Local seeding completed successfully!"
        ;;

    prod|production)
        echo ""
        echo_warn "=========================================="
        echo_warn "  WARNING: PRODUCTION DATABASE"
        echo_warn "=========================================="
        echo ""
        echo "This will:"
        echo "  1. Build the migrations Docker image (if not already built)"
        echo "  2. Push to Google Artifact Registry"
        echo "  3. Seed templates into the PRODUCTION database"
        echo ""
        echo "Note: Seeding is idempotent (uses ON CONFLICT DO UPDATE)."
        echo ""
        if [[ "$SKIP_CONFIRM" != "true" ]]; then
            read -p "Are you sure you want to continue? (y/N): " confirm

            if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
                echo_info "Aborted."
                exit 0
            fi
        fi

        echo ""
        echo_info "Checking kubectl context..."
        CONTEXT=$(kubectl config current-context)
        echo "Current context: $CONTEXT"
        echo ""

        if [[ "$SKIP_CONFIRM" != "true" ]]; then
            read -p "Is this the correct cluster? (y/N): " confirm_cluster

            if [[ "$confirm_cluster" != "y" && "$confirm_cluster" != "Y" ]]; then
                echo_info "Aborted. Please switch to the correct kubectl context."
                exit 0
            fi
        fi

        # Configuration
        REGISTRY="us-central1-docker.pkg.dev/flowmaestro-prod/flowmaestro"
        IMAGE_TAG="latest"

        echo ""
        echo_info "Building migrations Docker image (linux/amd64)..."
        cd "$PROJECT_ROOT"
        docker build --platform linux/amd64 -f infra/docker/migrations/Dockerfile -t "$REGISTRY/migrations:$IMAGE_TAG" .

        echo ""
        echo_info "Pushing image to registry..."
        docker push "$REGISTRY/migrations:$IMAGE_TAG"

        echo ""
        echo_info "Deleting any existing seed jobs..."
        kubectl delete job -n flowmaestro -l component=db-seed --ignore-not-found

        TIMESTAMP=$(date +%s)
        echo_info "Creating seed job db-seed-$TIMESTAMP..."

        # Replace placeholders and apply
        sed "s/\${TIMESTAMP}/$TIMESTAMP/g; s/\${IMAGE_TAG}/$IMAGE_TAG/g" \
            "$PROJECT_ROOT/infra/k8s/jobs/db-seed.yaml" | kubectl apply -f -

        echo ""
        echo_info "Waiting for seed job to complete (timeout: 5 minutes)..."
        if kubectl wait --for=condition=complete "job/db-seed-$TIMESTAMP" \
            -n flowmaestro --timeout=300s; then
            echo ""
            echo_info "=========================================="
            echo_info "  Seeding completed successfully!"
            echo_info "=========================================="
            echo ""
            echo_info "Seed logs:"
            kubectl logs "job/db-seed-$TIMESTAMP" -n flowmaestro
        else
            echo ""
            echo_error "=========================================="
            echo_error "  Seeding FAILED!"
            echo_error "=========================================="
            echo ""
            echo_error "Seed logs:"
            kubectl logs "job/db-seed-$TIMESTAMP" -n flowmaestro
            exit 1
        fi
        ;;

    *)
        echo "Usage: $0 [local|prod] [--yes]"
        echo ""
        echo "Arguments:"
        echo "  local    Seed local database (default)"
        echo "  prod     Seed production database in Kubernetes"
        echo ""
        echo "Options:"
        echo "  --yes, -y    Skip confirmation prompts"
        exit 1
        ;;
esac
