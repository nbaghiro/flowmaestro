#!/bin/bash

# FlowMaestro Local Secrets Sync Script
# Pulls ONLY developer-provided secrets from GCP Secret Manager
# (LLM API keys, OAuth credentials)
#
# System secrets (JWT, encryption key, database config) use local defaults
# from .env.example for local development.
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - Access to GCP project with Secret Manager read permissions
#
# Usage: ./infra/scripts/sync-secrets-local.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_header "FlowMaestro Secrets Sync"
print_info "GCP Project: ${GCP_PROJECT}"
print_warn "This will pull secrets from the current gcloud default project"

check_prerequisites

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
            print_warn "Secret ${secret_name} not found, using default"
            echo "$default_value"
        else
            print_warn "Secret ${secret_name} not found, skipping"
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

print_header "Fetching Developer Secrets from GCP Secret Manager"

print_info "NOTE: System secrets (JWT, encryption, database) use local defaults"
print_info "Only fetching LLM API keys and OAuth credentials from GCP"
echo ""

# Fetch LLM API keys
print_info "Fetching LLM API keys..."
OPENAI_API_KEY=$(get_secret "flowmaestro-app-openai-api-key" "")
ANTHROPIC_API_KEY=$(get_secret "flowmaestro-app-anthropic-api-key" "")
GOOGLE_API_KEY=$(get_secret "flowmaestro-app-google-api-key" "")
COHERE_API_KEY=$(get_secret "flowmaestro-app-cohere-api-key" "")

# Fetch OAuth secrets
print_info "Fetching OAuth secrets..."
SLACK_CLIENT_ID=$(get_secret "flowmaestro-app-slack-client-id" "")
SLACK_CLIENT_SECRET=$(get_secret "flowmaestro-app-slack-client-secret" "")
GOOGLE_CLIENT_ID=$(get_secret "flowmaestro-app-google-client-id" "")
GOOGLE_CLIENT_SECRET=$(get_secret "flowmaestro-app-google-client-secret" "")
NOTION_CLIENT_ID=$(get_secret "flowmaestro-app-notion-client-id" "")
NOTION_CLIENT_SECRET=$(get_secret "flowmaestro-app-notion-client-secret" "")
AIRTABLE_CLIENT_ID=$(get_secret "flowmaestro-app-airtable-client-id" "")
AIRTABLE_CLIENT_SECRET=$(get_secret "flowmaestro-app-airtable-client-secret" "")
HUBSPOT_CLIENT_ID=$(get_secret "flowmaestro-app-hubspot-client-id" "")
HUBSPOT_CLIENT_SECRET=$(get_secret "flowmaestro-app-hubspot-client-secret" "")
GITHUB_CLIENT_ID=$(get_secret "flowmaestro-app-github-client-id" "")
GITHUB_CLIENT_SECRET=$(get_secret "flowmaestro-app-github-client-secret" "")
LINEAR_CLIENT_ID=$(get_secret "flowmaestro-app-linear-client-id" "")
LINEAR_CLIENT_SECRET=$(get_secret "flowmaestro-app-linear-client-secret" "")
FIGMA_CLIENT_ID=$(get_secret "flowmaestro-app-figma-client-id" "")
FIGMA_CLIENT_SECRET=$(get_secret "flowmaestro-app-figma-client-secret" "")
MICROSOFT_CLIENT_ID=$(get_secret "flowmaestro-app-microsoft-client-id" "")
MICROSOFT_CLIENT_SECRET=$(get_secret "flowmaestro-app-microsoft-client-secret" "")
META_APP_ID=$(get_secret "flowmaestro-app-meta-app-id" "")
META_APP_SECRET=$(get_secret "flowmaestro-app-meta-app-secret" "")
META_CLIENT_TOKEN=$(get_secret "flowmaestro-app-meta-client-token" "")
META_WEBHOOK_VERIFY_TOKEN=$(get_secret "flowmaestro-app-meta-webhook-verify-token" "")
ZENDESK_CLIENT_ID=$(get_secret "flowmaestro-app-zendesk-client-id" "")
ZENDESK_CLIENT_SECRET=$(get_secret "flowmaestro-app-zendesk-client-secret" "")
APOLLO_CLIENT_ID=$(get_secret "flowmaestro-app-apollo-client-id" "")
APOLLO_CLIENT_SECRET=$(get_secret "flowmaestro-app-apollo-client-secret" "")
JIRA_CLIENT_ID=$(get_secret "flowmaestro-app-jira-client-id" "")
JIRA_CLIENT_SECRET=$(get_secret "flowmaestro-app-jira-client-secret" "")

# Email Service (Resend)
RESEND_API_KEY=$(get_secret "flowmaestro-app-resend-api-key" "")

print_success "Developer secrets fetched successfully"

# Generate .env file
print_header "Generating .env File"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_ENV_FILE="${ROOT_DIR}/backend/.env"

print_info "Writing to ${BACKEND_ENV_FILE}..."

cat > "$BACKEND_ENV_FILE" << EOF
# FlowMaestro Local Development Environment
# Generated by: infra/scripts/sync-secrets-local.sh
# GCP Project: ${GCP_PROJECT}
# Generated: $(date)
#
# NOTE: System secrets (database, JWT, encryption) use local defaults.
#       Only developer-provided secrets (LLM keys, OAuth) are synced from GCP.
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
# Security Secrets (Local Defaults - Safe for Development)
# ==============================================================================
JWT_SECRET=dev-jwt-secret-change-in-production
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# ==============================================================================
# LLM API Keys (From GCP Secret Manager)
# ==============================================================================
EOF

# Only add LLM keys if they exist
if [ -n "$OPENAI_API_KEY" ]; then
    echo "OPENAI_API_KEY=${OPENAI_API_KEY}" >> "$BACKEND_ENV_FILE"
else
    echo "OPENAI_API_KEY=" >> "$BACKEND_ENV_FILE"
fi

if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}" >> "$BACKEND_ENV_FILE"
else
    echo "ANTHROPIC_API_KEY=" >> "$BACKEND_ENV_FILE"
fi

if [ -n "$GOOGLE_API_KEY" ]; then
    echo "GOOGLE_API_KEY=${GOOGLE_API_KEY}" >> "$BACKEND_ENV_FILE"
else
    echo "GOOGLE_API_KEY=" >> "$BACKEND_ENV_FILE"
fi

if [ -n "$COHERE_API_KEY" ]; then
    echo "COHERE_API_KEY=${COHERE_API_KEY}" >> "$BACKEND_ENV_FILE"
else
    echo "COHERE_API_KEY=" >> "$BACKEND_ENV_FILE"
fi

cat >> "$BACKEND_ENV_FILE" << EOF

# ==============================================================================
# OAuth Integration Secrets (From GCP Secret Manager)
# ==============================================================================
EOF

# Slack OAuth
if [ -n "$SLACK_CLIENT_ID" ] || [ -n "$SLACK_CLIENT_SECRET" ]; then
    echo "# Slack" >> "$BACKEND_ENV_FILE"
    echo "SLACK_CLIENT_ID=${SLACK_CLIENT_ID}" >> "$BACKEND_ENV_FILE"
    echo "SLACK_CLIENT_SECRET=${SLACK_CLIENT_SECRET}" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
else
    echo "# Slack" >> "$BACKEND_ENV_FILE"
    echo "SLACK_CLIENT_ID=" >> "$BACKEND_ENV_FILE"
    echo "SLACK_CLIENT_SECRET=" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
fi

# Google OAuth
if [ -n "$GOOGLE_CLIENT_ID" ] || [ -n "$GOOGLE_CLIENT_SECRET" ]; then
    echo "# Google" >> "$BACKEND_ENV_FILE"
    echo "GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}" >> "$BACKEND_ENV_FILE"
    echo "GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
else
    echo "# Google" >> "$BACKEND_ENV_FILE"
    echo "GOOGLE_CLIENT_ID=" >> "$BACKEND_ENV_FILE"
    echo "GOOGLE_CLIENT_SECRET=" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
fi

# Notion OAuth
if [ -n "$NOTION_CLIENT_ID" ] || [ -n "$NOTION_CLIENT_SECRET" ]; then
    echo "# Notion" >> "$BACKEND_ENV_FILE"
    echo "NOTION_CLIENT_ID=${NOTION_CLIENT_ID}" >> "$BACKEND_ENV_FILE"
    echo "NOTION_CLIENT_SECRET=${NOTION_CLIENT_SECRET}" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
else
    echo "# Notion" >> "$BACKEND_ENV_FILE"
    echo "NOTION_CLIENT_ID=" >> "$BACKEND_ENV_FILE"
    echo "NOTION_CLIENT_SECRET=" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
fi

# Airtable OAuth
if [ -n "$AIRTABLE_CLIENT_ID" ] || [ -n "$AIRTABLE_CLIENT_SECRET" ]; then
    echo "# Airtable" >> "$BACKEND_ENV_FILE"
    echo "AIRTABLE_CLIENT_ID=${AIRTABLE_CLIENT_ID}" >> "$BACKEND_ENV_FILE"
    echo "AIRTABLE_CLIENT_SECRET=${AIRTABLE_CLIENT_SECRET}" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
else
    echo "# Airtable" >> "$BACKEND_ENV_FILE"
    echo "AIRTABLE_CLIENT_ID=" >> "$BACKEND_ENV_FILE"
    echo "AIRTABLE_CLIENT_SECRET=" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
fi

# HubSpot OAuth
if [ -n "$HUBSPOT_CLIENT_ID" ] || [ -n "$HUBSPOT_CLIENT_SECRET" ]; then
    echo "# HubSpot" >> "$BACKEND_ENV_FILE"
    echo "HUBSPOT_CLIENT_ID=${HUBSPOT_CLIENT_ID}" >> "$BACKEND_ENV_FILE"
    echo "HUBSPOT_CLIENT_SECRET=${HUBSPOT_CLIENT_SECRET}" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
else
    echo "# HubSpot" >> "$BACKEND_ENV_FILE"
    echo "HUBSPOT_CLIENT_ID=" >> "$BACKEND_ENV_FILE"
    echo "HUBSPOT_CLIENT_SECRET=" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
fi

# GitHub OAuth
if [ -n "$GITHUB_CLIENT_ID" ] || [ -n "$GITHUB_CLIENT_SECRET" ]; then
    echo "# GitHub" >> "$BACKEND_ENV_FILE"
    echo "GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}" >> "$BACKEND_ENV_FILE"
    echo "GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
else
    echo "# GitHub" >> "$BACKEND_ENV_FILE"
    echo "GITHUB_CLIENT_ID=" >> "$BACKEND_ENV_FILE"
    echo "GITHUB_CLIENT_SECRET=" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
fi

# Linear OAuth
if [ -n "$LINEAR_CLIENT_ID" ] || [ -n "$LINEAR_CLIENT_SECRET" ]; then
    echo "# Linear" >> "$BACKEND_ENV_FILE"
    echo "LINEAR_CLIENT_ID=${LINEAR_CLIENT_ID}" >> "$BACKEND_ENV_FILE"
    echo "LINEAR_CLIENT_SECRET=${LINEAR_CLIENT_SECRET}" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
else
    echo "# Linear" >> "$BACKEND_ENV_FILE"
    echo "LINEAR_CLIENT_ID=" >> "$BACKEND_ENV_FILE"
    echo "LINEAR_CLIENT_SECRET=" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
fi

# Figma OAuth
if [ -n "$FIGMA_CLIENT_ID" ] || [ -n "$FIGMA_CLIENT_SECRET" ]; then
    echo "# Figma" >> "$BACKEND_ENV_FILE"
    echo "FIGMA_CLIENT_ID=${FIGMA_CLIENT_ID}" >> "$BACKEND_ENV_FILE"
    echo "FIGMA_CLIENT_SECRET=${FIGMA_CLIENT_SECRET}" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
else
    echo "# Figma" >> "$BACKEND_ENV_FILE"
    echo "FIGMA_CLIENT_ID=" >> "$BACKEND_ENV_FILE"
    echo "FIGMA_CLIENT_SECRET=" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
fi

# Microsoft OAuth (OneDrive, Excel, Word, Teams, Outlook, etc.)
if [ -n "$MICROSOFT_CLIENT_ID" ] || [ -n "$MICROSOFT_CLIENT_SECRET" ]; then
    echo "# Microsoft (OneDrive, Excel, Word, Teams, Outlook, etc.)" >> "$BACKEND_ENV_FILE"
    echo "MICROSOFT_CLIENT_ID=${MICROSOFT_CLIENT_ID}" >> "$BACKEND_ENV_FILE"
    echo "MICROSOFT_CLIENT_SECRET=${MICROSOFT_CLIENT_SECRET}" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
else
    echo "# Microsoft (OneDrive, Excel, Word, Teams, Outlook, etc.)" >> "$BACKEND_ENV_FILE"
    echo "MICROSOFT_CLIENT_ID=" >> "$BACKEND_ENV_FILE"
    echo "MICROSOFT_CLIENT_SECRET=" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
fi

# Meta Platform OAuth (WhatsApp, Instagram, Messenger, Facebook Ads)
if [ -n "$META_APP_ID" ] || [ -n "$META_APP_SECRET" ]; then
    echo "# Meta Platform (WhatsApp, Instagram, Messenger, Facebook Ads)" >> "$BACKEND_ENV_FILE"
    echo "META_APP_ID=${META_APP_ID}" >> "$BACKEND_ENV_FILE"
    echo "META_APP_SECRET=${META_APP_SECRET}" >> "$BACKEND_ENV_FILE"
    echo "META_CLIENT_TOKEN=${META_CLIENT_TOKEN}" >> "$BACKEND_ENV_FILE"
    echo "META_WEBHOOK_VERIFY_TOKEN=${META_WEBHOOK_VERIFY_TOKEN}" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
else
    echo "# Meta Platform (WhatsApp, Instagram, Messenger, Facebook Ads)" >> "$BACKEND_ENV_FILE"
    echo "META_APP_ID=" >> "$BACKEND_ENV_FILE"
    echo "META_APP_SECRET=" >> "$BACKEND_ENV_FILE"
    echo "META_CLIENT_TOKEN=" >> "$BACKEND_ENV_FILE"
    echo "META_WEBHOOK_VERIFY_TOKEN=" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
fi

# Zendesk OAuth
if [ -n "$ZENDESK_CLIENT_ID" ] || [ -n "$ZENDESK_CLIENT_SECRET" ]; then
    echo "# Zendesk" >> "$BACKEND_ENV_FILE"
    echo "ZENDESK_CLIENT_ID=${ZENDESK_CLIENT_ID}" >> "$BACKEND_ENV_FILE"
    echo "ZENDESK_CLIENT_SECRET=${ZENDESK_CLIENT_SECRET}" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
else
    echo "# Zendesk" >> "$BACKEND_ENV_FILE"
    echo "ZENDESK_CLIENT_ID=" >> "$BACKEND_ENV_FILE"
    echo "ZENDESK_CLIENT_SECRET=" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
fi

# Apollo OAuth
if [ -n "$APOLLO_CLIENT_ID" ] || [ -n "$APOLLO_CLIENT_SECRET" ]; then
    echo "# Apollo.io" >> "$BACKEND_ENV_FILE"
    echo "APOLLO_CLIENT_ID=${APOLLO_CLIENT_ID}" >> "$BACKEND_ENV_FILE"
    echo "APOLLO_CLIENT_SECRET=${APOLLO_CLIENT_SECRET}" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
else
    echo "# Apollo.io" >> "$BACKEND_ENV_FILE"
    echo "APOLLO_CLIENT_ID=" >> "$BACKEND_ENV_FILE"
    echo "APOLLO_CLIENT_SECRET=" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
fi

# Jira Cloud OAuth
if [ -n "$JIRA_CLIENT_ID" ] || [ -n "$JIRA_CLIENT_SECRET" ]; then
    echo "# Jira Cloud" >> "$BACKEND_ENV_FILE"
    echo "JIRA_CLIENT_ID=${JIRA_CLIENT_ID}" >> "$BACKEND_ENV_FILE"
    echo "JIRA_CLIENT_SECRET=${JIRA_CLIENT_SECRET}" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
else
    echo "# Jira Cloud" >> "$BACKEND_ENV_FILE"
    echo "JIRA_CLIENT_ID=" >> "$BACKEND_ENV_FILE"
    echo "JIRA_CLIENT_SECRET=" >> "$BACKEND_ENV_FILE"
    echo "" >> "$BACKEND_ENV_FILE"
fi

# Email Service (Resend)
if [ -n "$RESEND_API_KEY" ]; then
    cat >> "$BACKEND_ENV_FILE" << EOF

# ==============================================================================
# Email Configuration (Resend)
# ==============================================================================
RESEND_API_KEY=${RESEND_API_KEY}
FRONTEND_URL=http://localhost:3000
EOF
else
    cat >> "$BACKEND_ENV_FILE" << EOF

# ==============================================================================
# Email Configuration (Resend)
# ==============================================================================
RESEND_API_KEY=
FRONTEND_URL=http://localhost:3000
EOF
fi

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
CORS_ORIGIN=http://localhost:3000

# ==============================================================================
# Frontend Configuration
# ==============================================================================
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001

# ==============================================================================
# Google Cloud Storage (for Knowledge Base documents)
# ==============================================================================
GCS_BUCKET_NAME=flowmaestro-knowledge-docs-flowmaestro-prod
GCS_SIGNED_URL_EXPIRATION=3600
EOF

print_success "backend/.env file created"

# ==============================================================================
# GCS Service Account Key Setup
# ==============================================================================
# Pulls the service account key from Secret Manager for local GCS access.
# This avoids RAPT token expiration issues that occur with user credentials.
# The key is created by Pulumi and stored in Secret Manager.

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

print_header "Secrets Sync Complete!"
print_success "backend/.env created with:"
echo "  • System secrets (database, JWT, encryption): Local defaults"
echo "  • Developer secrets (LLM keys, OAuth): From ${GCP_PROJECT}"
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
