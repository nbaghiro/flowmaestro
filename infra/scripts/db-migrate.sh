#!/bin/bash
#
# Database Migration Script
#
# Runs database migrations against local or production database.
#
# Usage:
#   ./db-migrate.sh [local|prod]
#
# Examples:
#   ./db-migrate.sh           # Runs against local database (default)
#   ./db-migrate.sh local     # Runs against local database
#   ./db-migrate.sh prod      # Runs migrations in Kubernetes cluster (requires confirmation)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Parse arguments
TARGET="${1:-local}"

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
        echo_info "Running migrations against local database..."
        cd "$PROJECT_ROOT/backend"
        npm run db:migrate
        echo_info "Local migrations completed successfully!"
        ;;

    prod|production)
        echo ""
        echo_warn "=========================================="
        echo_warn "  WARNING: PRODUCTION DATABASE"
        echo_warn "=========================================="
        echo ""
        echo "This will:"
        echo "  1. Build the migrations Docker image"
        echo "  2. Push to Google Artifact Registry"
        echo "  3. Run migrations against the PRODUCTION database"
        echo ""
        read -p "Are you sure you want to continue? (y/N): " confirm

        if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
            echo_info "Aborted."
            exit 0
        fi

        echo ""
        echo_info "Checking kubectl context..."
        CONTEXT=$(kubectl config current-context)
        echo "Current context: $CONTEXT"
        echo ""
        read -p "Is this the correct cluster? (y/N): " confirm_cluster

        if [[ "$confirm_cluster" != "y" && "$confirm_cluster" != "Y" ]]; then
            echo_info "Aborted. Please switch to the correct kubectl context."
            exit 0
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
        echo_info "Deleting any existing migration jobs..."
        kubectl delete job -n flowmaestro -l component=db-migration --ignore-not-found

        TIMESTAMP=$(date +%s)
        echo_info "Creating migration job db-migration-$TIMESTAMP..."

        # Replace placeholders and apply
        sed "s/\${TIMESTAMP}/$TIMESTAMP/g; s/\${IMAGE_TAG}/$IMAGE_TAG/g" \
            "$PROJECT_ROOT/infra/k8s/jobs/db-migration.yaml" | kubectl apply -f -

        echo ""
        echo_info "Waiting for migration job to complete (timeout: 5 minutes)..."
        if kubectl wait --for=condition=complete "job/db-migration-$TIMESTAMP" \
            -n flowmaestro --timeout=300s; then
            echo ""
            echo_info "=========================================="
            echo_info "  Migration completed successfully!"
            echo_info "=========================================="
            echo ""
            echo_info "Migration logs:"
            kubectl logs "job/db-migration-$TIMESTAMP" -n flowmaestro
        else
            echo ""
            echo_error "=========================================="
            echo_error "  Migration FAILED!"
            echo_error "=========================================="
            echo ""
            echo_error "Migration logs:"
            kubectl logs "job/db-migration-$TIMESTAMP" -n flowmaestro
            exit 1
        fi
        ;;

    *)
        echo "Usage: $0 [local|prod]"
        echo ""
        echo "Arguments:"
        echo "  local    Run migrations against local database (default)"
        echo "  prod     Run migrations in Kubernetes cluster (production)"
        exit 1
        ;;
esac
