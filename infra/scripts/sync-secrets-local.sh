#!/usr/bin/env bash

# FlowMaestro Local Secrets Sync Script
# Reads secret definitions from Pulumi and fetches values from GCP Secret Manager
#
# System secrets (JWT, encryption key, database config) use local defaults
# for local development. Only developer-provided secrets are synced from GCP.
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - Access to GCP project with Secret Manager read permissions
# - Pulumi stack deployed (for secret definitions)
#
# Usage: ./infra/scripts/sync-secrets-local.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_category() {
    echo -e "\n${CYAN}--- $1 ---${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed"
        echo "Install from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi

    print_success "gcloud CLI found"

    # Check authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        print_error "Not authenticated with gcloud"
        echo "Run: gcloud auth login"
        exit 1
    fi

    print_success "gcloud authenticated"
}

# Get current GCP project
GCP_PROJECT=$(gcloud config get-value project 2>/dev/null)

if [ -z "$GCP_PROJECT" ]; then
    print_error "No GCP project is set"
    echo "Set your project with: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

# Get directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/../.."
PULUMI_DIR="${SCRIPT_DIR}/../pulumi"
BACKEND_ENV_FILE="${ROOT_DIR}/backend/.env"

# Preserve existing JWT_SECRET and ENCRYPTION_KEY if they exist
EXISTING_JWT_SECRET=""
EXISTING_ENCRYPTION_KEY=""

if [ -f "$BACKEND_ENV_FILE" ]; then
    EXISTING_JWT_SECRET=$(grep "^JWT_SECRET=" "$BACKEND_ENV_FILE" 2>/dev/null | tail -1 | cut -d'=' -f2-)
    EXISTING_ENCRYPTION_KEY=$(grep "^ENCRYPTION_KEY=" "$BACKEND_ENV_FILE" 2>/dev/null | tail -1 | cut -d'=' -f2-)
fi

print_header "FlowMaestro Secrets Sync"
print_info "GCP Project: ${GCP_PROJECT}"
print_warn "This will pull secrets from the current gcloud default project"

# Notify user about preserved secrets
if [ -n "$EXISTING_JWT_SECRET" ]; then
    print_info "Preserving existing JWT_SECRET from .env"
fi
if [ -n "$EXISTING_ENCRYPTION_KEY" ]; then
    print_info "Preserving existing ENCRYPTION_KEY from .env"
fi

check_prerequisites

# =============================================================================
# Read Secret Definitions from Pulumi
# =============================================================================

print_header "Reading Secret Definitions from Pulumi"

# Get secret definitions from Pulumi config (not stack output, which requires successful pulumi up)
cd "$PULUMI_DIR"
SECRETS_JSON=$(pulumi config get secrets 2>/dev/null || echo "[]")
cd - > /dev/null

if [ "$SECRETS_JSON" = "[]" ] || [ -z "$SECRETS_JSON" ]; then
    print_warn "No secrets defined in Pulumi config - using hardcoded list"
    # Fallback to empty, will just sync what exists in GCP
    SECRET_COUNT=0
else
    SECRET_COUNT=$(echo "$SECRETS_JSON" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")
    print_success "Found $SECRET_COUNT secret definitions"
fi

# =============================================================================
# Helper Functions
# =============================================================================

# Function to get secret from Secret Manager
get_secret() {
    local secret_name=$1
    local default_value=$2

    # Try to get the secret
    local value=$(gcloud secrets versions access latest \
        --secret="${secret_name}" \
        --project="${GCP_PROJECT}" 2>/dev/null || echo "")

    if [ -z "$value" ]; then
        if [ -n "$default_value" ]; then
            echo "$default_value"
        else
            echo ""
        fi
    else
        echo "$value"
    fi
}

# Function to get JSON secret and extract field
get_json_secret_field() {
    local secret_name=$1
    local field=$2
    local default=$3

    local json=$(gcloud secrets versions access latest \
        --secret="${secret_name}" \
        --project="${GCP_PROJECT}" 2>/dev/null || echo "")

    if [ -n "$json" ]; then
        local value=$(echo "$json" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('$field', '$default'))" 2>/dev/null || echo "$default")
        echo "$value"
    else
        echo "$default"
    fi
}

# =============================================================================
# Fetch Secrets from GCP
# =============================================================================

print_header "Fetching Secrets from GCP Secret Manager"

print_info "NOTE: System secrets (database, JWT, encryption) use local defaults"
print_info "Fetching application secrets from GCP..."
echo ""

# Track counts
FETCHED_COUNT=0
MISSING_COUNT=0

# =============================================================================
# Generate .env File
# =============================================================================

print_header "Generating .env File"
print_info "Writing to ${BACKEND_ENV_FILE}..."

cat > "$BACKEND_ENV_FILE" << EOF
# FlowMaestro Local Development Environment
# Generated by: infra/scripts/sync-secrets-local.sh
# GCP Project: ${GCP_PROJECT}
# Generated: $(date)
#
# NOTE: System secrets (database, JWT, encryption) use local defaults.
#       Application secrets are synced from GCP Secret Manager.
#
# WARNING: This file contains secrets. DO NOT commit to git!

# ==============================================================================
# Core Application
# ==============================================================================
NODE_ENV=development
LOG_LEVEL=debug

# ==============================================================================
# Database Configuration (Local Defaults)
# ==============================================================================
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=flowmaestro
POSTGRES_USER=flowmaestro
POSTGRES_PASSWORD=flowmaestro_dev_password
DATABASE_URL=postgresql://flowmaestro:flowmaestro_dev_password@localhost:5432/flowmaestro

# ==============================================================================
# Redis Configuration (Local Defaults)
# ==============================================================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379

# ==============================================================================
# Security Secrets (Preserved from existing .env or defaults)
# ==============================================================================
JWT_SECRET=${EXISTING_JWT_SECRET:-dev-jwt-secret-change-in-production}
ENCRYPTION_KEY=${EXISTING_ENCRYPTION_KEY:-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef}

# ==============================================================================
# Application Secrets (From GCP Secret Manager)
# ==============================================================================
EOF

# Process each secret - fetch from GCP and write to .env
if [ "$SECRET_COUNT" -gt 0 ]; then
    CURRENT_CATEGORY=""

    for i in $(seq 0 $((SECRET_COUNT - 1))); do
        SECRET_NAME=$(echo "$SECRETS_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin)[$i]['name'])")
        SECRET_ENV_VAR=$(echo "$SECRETS_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin)[$i]['envVar'])")
        SECRET_CATEGORY=$(echo "$SECRETS_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin)[$i]['category'])")
        SECRET_DESCRIPTION=$(echo "$SECRETS_JSON" | python3 -c "import sys, json; d=json.load(sys.stdin)[$i]; print(d.get('description', ''))" 2>/dev/null || echo "")

        # Add category header if new category
        if [ "$SECRET_CATEGORY" != "$CURRENT_CATEGORY" ]; then
            CURRENT_CATEGORY="$SECRET_CATEGORY"
            CATEGORY_UPPER=$(echo "$SECRET_CATEGORY" | tr '[:lower:]' '[:upper:]')
            echo "" >> "$BACKEND_ENV_FILE"
            echo "# --- ${CATEGORY_UPPER} ---" >> "$BACKEND_ENV_FILE"
        fi

        # Fetch value from GCP
        GCP_SECRET_NAME="flowmaestro-app-${SECRET_NAME}"
        SECRET_VALUE=$(get_secret "$GCP_SECRET_NAME" "")

        if [ -n "$SECRET_VALUE" ]; then
            print_success "Fetched $SECRET_ENV_VAR"
            ((FETCHED_COUNT++))
        else
            print_warn "Not found: $SECRET_ENV_VAR"
            ((MISSING_COUNT++))
        fi

        # Add comment with description if available
        if [ -n "$SECRET_DESCRIPTION" ]; then
            echo "# $SECRET_DESCRIPTION" >> "$BACKEND_ENV_FILE"
        fi

        # Write the env var
        echo "${SECRET_ENV_VAR}=${SECRET_VALUE}" >> "$BACKEND_ENV_FILE"
    done
fi

# Add remaining configuration sections
cat >> "$BACKEND_ENV_FILE" << EOF

# ==============================================================================
# Temporal Configuration (Local Defaults)
# ==============================================================================
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default

# Temporal Database (for self-hosted Temporal)
TEMPORAL_DB_HOST=localhost
TEMPORAL_DB_PORT=5432
TEMPORAL_DB_NAME=flowmaestro_temporal
TEMPORAL_DB_USER=flowmaestro
TEMPORAL_DB_PASSWORD=flowmaestro_dev_password
TEMPORAL_VISIBILITY_DB=flowmaestro_temporal_visibility

# ==============================================================================
# Backend API Configuration
# ==============================================================================
BACKEND_PORT=3001
BACKEND_HOST=localhost
PORT=3001
API_URL=http://localhost:3001
APP_URL=http://localhost:3000
MARKETING_URL=http://localhost:5173

# ==============================================================================
# Frontend Configuration
# ==============================================================================
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
VITE_UNSPLASH_ACCESS_KEY=cNlNDO6FH0tAfqBa8wZJypg2aAhr9-3ZPud0omQzplo

# ==============================================================================
# Google Cloud Storage
# ==============================================================================
GCS_UPLOADS_BUCKET=flowmaestro-uploads-flowmaestro-prod
GCS_KNOWLEDGE_DOCS_BUCKET=flowmaestro-knowledge-docs-flowmaestro-prod
GCS_ARTIFACTS_BUCKET=flowmaestro-artifacts-flowmaestro-prod
GCS_SIGNED_URL_EXPIRATION=3600
EOF

print_success "backend/.env file created"

# ==============================================================================
# GCS Service Account Key Setup
# ==============================================================================

print_header "Setting up GCS Authentication"

GCS_KEY_SECRET_NAME="flowmaestro-storage-sa-key"
GCS_KEY_FILE="${HOME}/.config/gcloud/flowmaestro-storage-key.json"

# Try to pull the key from Secret Manager
print_info "Fetching GCS service account key from Secret Manager..."

GCS_KEY_JSON=$(gcloud secrets versions access latest \
    --secret="${GCS_KEY_SECRET_NAME}" \
    --project="${GCP_PROJECT}" 2>/dev/null || echo "")

if [ -n "$GCS_KEY_JSON" ]; then
    # Ensure the directory exists
    mkdir -p "$(dirname "$GCS_KEY_FILE")"

    # Write the key file
    echo "$GCS_KEY_JSON" > "$GCS_KEY_FILE"
    chmod 600 "$GCS_KEY_FILE"

    print_success "Service account key saved to ${GCS_KEY_FILE}"

    # Add GOOGLE_APPLICATION_CREDENTIALS to .env
    echo "" >> "$BACKEND_ENV_FILE"
    echo "# GCS Authentication (Service Account Key - avoids RAPT token expiration)" >> "$BACKEND_ENV_FILE"
    echo "GOOGLE_APPLICATION_CREDENTIALS=${GCS_KEY_FILE}" >> "$BACKEND_ENV_FILE"

    print_success "Added GOOGLE_APPLICATION_CREDENTIALS to .env"
    GCS_KEY_CONFIGURED="true"
else
    print_warn "GCS service account key not found in Secret Manager"
    print_info "The key will be created when you run 'pulumi up' in infra/pulumi"
    print_info "After that, re-run this script to fetch the key"
    print_info "For now, GCS will use 'gcloud auth application-default login' credentials"
    GCS_KEY_CONFIGURED=""
fi

# ==============================================================================
# Summary
# ==============================================================================

print_header "Secrets Sync Complete!"

print_success "backend/.env created with:"
echo "  • System secrets (database, JWT, encryption): Local defaults"
echo "  • Application secrets from ${GCP_PROJECT}: ${FETCHED_COUNT} found, ${MISSING_COUNT} missing"
if [ -n "$GCS_KEY_CONFIGURED" ]; then
    echo "  • GCS authentication: Service account key configured"
else
    echo "  • GCS authentication: Using gcloud credentials (may require re-auth)"
fi
echo ""
print_info "Next steps:"
echo "  1. Start your local infrastructure: npm run docker:up"
echo "  2. Run database migrations: npm run db:migrate"
echo "  3. Start the development servers: npm run dev"
echo ""
print_warn "Remember: Never commit .env files or service account keys to git!"
echo ""
