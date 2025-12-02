#!/bin/bash

# FlowMaestro GCP Secret Manager Setup Script
# Creates/updates secrets in GCP Secret Manager from local values
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - Secret Manager Admin role on the GCP project
#
# Usage:
#   ./infra/scripts/setup-secrets-gcp.sh              # Only prompt for non-existing secrets
#   ./infra/scripts/setup-secrets-gcp.sh --prompt-all # Prompt for all secrets
#   ./infra/scripts/setup-secrets-gcp.sh -a           # Prompt for all secrets (short form)

set -e

# Parse command line arguments
PROMPT_ALL=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --prompt-all|-a)
            PROMPT_ALL=true
            shift
            ;;
        --help|-h)
            echo "Usage: ./infra/scripts/setup-secrets-gcp.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --prompt-all, -a    Prompt for all secrets, including existing ones"
            echo "  --help, -h          Show this help message"
            echo ""
            echo "By default, only prompts for secrets that don't exist in GCP Secret Manager"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

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

# Function to get secret from K8s
get_k8s_secret_value() {
    local secret_name=$1
    local key=$2
    local namespace=${3:-flowmaestro}

    kubectl get secret "$secret_name" -n "$namespace" -o jsonpath="{.data.$key}" 2>/dev/null | base64 -d 2>/dev/null || echo ""
}

# Function to parse DATABASE_URL or REDIS_URL from K8s
parse_connection_url() {
    local url=$1
    local component=$2  # host, port, user, password, database

    if [[ $url =~ ^postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+)$ ]]; then
        case $component in
            user) echo "${BASH_REMATCH[1]}" ;;
            password) echo "${BASH_REMATCH[2]}" ;;
            host) echo "${BASH_REMATCH[3]}" ;;
            port) echo "${BASH_REMATCH[4]}" ;;
            database) echo "${BASH_REMATCH[5]}" ;;
        esac
    elif [[ $url =~ ^redis://([^:]+):([0-9]+)$ ]]; then
        case $component in
            host) echo "${BASH_REMATCH[1]}" ;;
            port) echo "${BASH_REMATCH[2]}" ;;
        esac
    fi
}

# Function to get Pulumi stack output
get_pulumi_output() {
    local output_name=$1
    local pulumi_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../pulumi" && pwd)"

    (cd "$pulumi_dir" && pulumi stack output "$output_name" 2>/dev/null) || echo ""
}

# Function to mask secret for display
mask_secret() {
    local secret=$1
    local visible=4

    if [ ${#secret} -le $visible ]; then
        echo "****"
    else
        echo "${secret:0:$visible}$(printf '%.0s*' $(seq 1 $((${#secret} - $visible))))"
    fi
}

# Function to prompt with existing value
prompt_with_existing() {
    local prompt_text=$1
    local existing_value=$2
    local var_name=$3

    if [ -n "$existing_value" ]; then
        local masked=$(mask_secret "$existing_value")
        read -p "$prompt_text [current: $masked, press Enter to keep]: " user_input
        if [ -z "$user_input" ]; then
            eval "$var_name=\"$existing_value\""
        else
            eval "$var_name=\"$user_input\""
        fi
    else
        read -p "$prompt_text: " user_input
        eval "$var_name=\"$user_input\""
    fi
}

# Get current GCP project
GCP_PROJECT=$(gcloud config get-value project 2>/dev/null)

if [ -z "$GCP_PROJECT" ]; then
    print_error "No GCP project is set"
    echo "Set your project with: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

print_header "FlowMaestro GCP Secrets Setup"
print_info "GCP Project: ${GCP_PROJECT}"
print_warn "This will create/update secrets in GCP Secret Manager"

echo ""
read -p "Continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Cancelled"
    exit 1
fi

# Function to create or update a secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2

    if [ -z "$secret_value" ]; then
        print_warn "Skipping ${secret_name} (no value provided)"
        return
    fi

    # Check if secret exists
    if gcloud secrets describe "$secret_name" --project="$GCP_PROJECT" &>/dev/null; then
        # Update existing secret
        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" \
            --project="$GCP_PROJECT" \
            --data-file=- >/dev/null 2>&1
        print_success "Updated ${secret_name}"
    else
        # Create new secret
        echo -n "$secret_value" | gcloud secrets create "$secret_name" \
            --project="$GCP_PROJECT" \
            --replication-policy="automatic" \
            --data-file=- >/dev/null 2>&1
        print_success "Created ${secret_name}"
    fi
}

# Function to create or update a JSON secret
create_or_update_json_secret() {
    local secret_name=$1
    local json_data=$2

    if [ -z "$json_data" ] || [ "$json_data" = "{}" ]; then
        print_warn "Skipping ${secret_name} (no data provided)"
        return
    fi

    # Check if secret exists
    if gcloud secrets describe "$secret_name" --project="$GCP_PROJECT" &>/dev/null; then
        # Update existing secret
        echo -n "$json_data" | gcloud secrets versions add "$secret_name" \
            --project="$GCP_PROJECT" \
            --data-file=- >/dev/null 2>&1
        print_success "Updated ${secret_name}"
    else
        # Create new secret
        echo -n "$json_data" | gcloud secrets create "$secret_name" \
            --project="$GCP_PROJECT" \
            --replication-policy="automatic" \
            --data-file=- >/dev/null 2>&1
        print_success "Created ${secret_name}"
    fi
}

print_header "Detecting Existing Secrets"

# Function to get existing secret from GCP Secret Manager
get_existing_gcp_secret() {
    local secret_name=$1
    gcloud secrets versions access latest --secret="${secret_name}" --project="${GCP_PROJECT}" 2>/dev/null || echo ""
}

# Function to parse JSON field from GCP secret
get_gcp_json_field() {
    local secret_name=$1
    local field=$2
    local json=$(get_existing_gcp_secret "$secret_name")
    if [ -n "$json" ]; then
        echo "$json" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('$field', ''))" 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# Try to detect existing secrets from GCP Secret Manager (source of truth)
print_info "Checking for existing secrets in GCP Secret Manager..."

# Check for existing secrets
EXISTING_JWT=$(get_existing_gcp_secret "flowmaestro-jwt-secret")
EXISTING_ENCRYPTION=$(get_existing_gcp_secret "flowmaestro-encryption-key")

# Check database config (JSON secret)
EXISTING_DB_HOST=$(get_gcp_json_field "flowmaestro-db-config" "db_host")
EXISTING_DB_PORT=$(get_gcp_json_field "flowmaestro-db-config" "db_port")
EXISTING_DB_NAME=$(get_gcp_json_field "flowmaestro-db-config" "db_name")
EXISTING_DB_USER=$(get_gcp_json_field "flowmaestro-db-config" "db_user")
EXISTING_DB_PASSWORD=$(get_gcp_json_field "flowmaestro-db-config" "db_password")

# Check Redis config (JSON secret)
EXISTING_REDIS_HOST=$(get_gcp_json_field "flowmaestro-redis-config" "redis_host")
EXISTING_REDIS_PORT=$(get_gcp_json_field "flowmaestro-redis-config" "redis_port")

# Check LLM API keys
EXISTING_OPENAI_KEY=$(get_existing_gcp_secret "flowmaestro-app-openai-api-key")
EXISTING_ANTHROPIC_KEY=$(get_existing_gcp_secret "flowmaestro-app-anthropic-api-key")
EXISTING_GOOGLE_KEY=$(get_existing_gcp_secret "flowmaestro-app-google-api-key")
EXISTING_COHERE_KEY=$(get_existing_gcp_secret "flowmaestro-app-cohere-api-key")

# Check OAuth secrets
EXISTING_SLACK_CLIENT_ID=$(get_existing_gcp_secret "flowmaestro-app-slack-client-id")
EXISTING_SLACK_CLIENT_SECRET=$(get_existing_gcp_secret "flowmaestro-app-slack-client-secret")
EXISTING_GOOGLE_CLIENT_ID=$(get_existing_gcp_secret "flowmaestro-app-google-client-id")
EXISTING_GOOGLE_CLIENT_SECRET=$(get_existing_gcp_secret "flowmaestro-app-google-client-secret")
EXISTING_NOTION_CLIENT_ID=$(get_existing_gcp_secret "flowmaestro-app-notion-client-id")
EXISTING_NOTION_CLIENT_SECRET=$(get_existing_gcp_secret "flowmaestro-app-notion-client-secret")
EXISTING_AIRTABLE_CLIENT_ID=$(get_existing_gcp_secret "flowmaestro-app-airtable-client-id")
EXISTING_AIRTABLE_CLIENT_SECRET=$(get_existing_gcp_secret "flowmaestro-app-airtable-client-secret")
EXISTING_HUBSPOT_CLIENT_ID=$(get_existing_gcp_secret "flowmaestro-app-hubspot-client-id")
EXISTING_HUBSPOT_CLIENT_SECRET=$(get_existing_gcp_secret "flowmaestro-app-hubspot-client-secret")
EXISTING_GITHUB_CLIENT_ID=$(get_existing_gcp_secret "flowmaestro-app-github-client-id")
EXISTING_GITHUB_CLIENT_SECRET=$(get_existing_gcp_secret "flowmaestro-app-github-client-secret")
EXISTING_LINEAR_CLIENT_ID=$(get_existing_gcp_secret "flowmaestro-app-linear-client-id")
EXISTING_LINEAR_CLIENT_SECRET=$(get_existing_gcp_secret "flowmaestro-app-linear-client-secret")
EXISTING_FIGMA_CLIENT_ID=$(get_existing_gcp_secret "flowmaestro-app-figma-client-id")
EXISTING_FIGMA_CLIENT_SECRET=$(get_existing_gcp_secret "flowmaestro-app-figma-client-secret")
EXISTING_MICROSOFT_CLIENT_ID=$(get_existing_gcp_secret "flowmaestro-app-microsoft-client-id")
EXISTING_MICROSOFT_CLIENT_SECRET=$(get_existing_gcp_secret "flowmaestro-app-microsoft-client-secret")
EXISTING_META_APP_ID=$(get_existing_gcp_secret "flowmaestro-app-meta-app-id")
EXISTING_META_APP_SECRET=$(get_existing_gcp_secret "flowmaestro-app-meta-app-secret")
EXISTING_META_CLIENT_TOKEN=$(get_existing_gcp_secret "flowmaestro-app-meta-client-token")
EXISTING_META_WEBHOOK_VERIFY_TOKEN=$(get_existing_gcp_secret "flowmaestro-app-meta-webhook-verify-token")
EXISTING_ZENDESK_CLIENT_ID=$(get_existing_gcp_secret "flowmaestro-app-zendesk-client-id")
EXISTING_ZENDESK_CLIENT_SECRET=$(get_existing_gcp_secret "flowmaestro-app-zendesk-client-secret")
EXISTING_APOLLO_CLIENT_ID=$(get_existing_gcp_secret "flowmaestro-app-apollo-client-id")
EXISTING_APOLLO_CLIENT_SECRET=$(get_existing_gcp_secret "flowmaestro-app-apollo-client-secret")
EXISTING_JIRA_CLIENT_ID=$(get_existing_gcp_secret "flowmaestro-app-jira-client-id")
EXISTING_JIRA_CLIENT_SECRET=$(get_existing_gcp_secret "flowmaestro-app-jira-client-secret")

# Try to get from Pulumi outputs as fallback for infrastructure values
if [ -z "$EXISTING_DB_HOST" ]; then
    EXISTING_DB_HOST=$(get_pulumi_output "dbHost")
fi
if [ -z "$EXISTING_REDIS_HOST" ]; then
    EXISTING_REDIS_HOST=$(get_pulumi_output "redisHost")
fi

# Show what was found
FOUND_COUNT=0
[ -n "$EXISTING_JWT" ] && ((FOUND_COUNT++))
[ -n "$EXISTING_ENCRYPTION" ] && ((FOUND_COUNT++))
[ -n "$EXISTING_DB_HOST" ] && ((FOUND_COUNT++))
[ -n "$EXISTING_OPENAI_KEY" ] && ((FOUND_COUNT++))
[ -n "$EXISTING_ANTHROPIC_KEY" ] && ((FOUND_COUNT++))
[ -n "$EXISTING_GOOGLE_KEY" ] && ((FOUND_COUNT++))
[ -n "$EXISTING_COHERE_KEY" ] && ((FOUND_COUNT++))
[ -n "$EXISTING_SLACK_CLIENT_ID" ] && ((FOUND_COUNT++))
[ -n "$EXISTING_GOOGLE_CLIENT_ID" ] && ((FOUND_COUNT++))
[ -n "$EXISTING_NOTION_CLIENT_ID" ] && ((FOUND_COUNT++))
[ -n "$EXISTING_AIRTABLE_CLIENT_ID" ] && ((FOUND_COUNT++))
[ -n "$EXISTING_HUBSPOT_CLIENT_ID" ] && ((FOUND_COUNT++))
[ -n "$EXISTING_GITHUB_CLIENT_ID" ] && ((FOUND_COUNT++))
[ -n "$EXISTING_LINEAR_CLIENT_ID" ] && ((FOUND_COUNT++))
[ -n "$EXISTING_FIGMA_CLIENT_ID" ] && ((FOUND_COUNT++))
[ -n "$EXISTING_MICROSOFT_CLIENT_ID" ] && ((FOUND_COUNT++))
[ -n "$EXISTING_META_APP_ID" ] && ((FOUND_COUNT++))
[ -n "$EXISTING_ZENDESK_CLIENT_ID" ] && ((FOUND_COUNT++))
[ -n "$EXISTING_APOLLO_CLIENT_ID" ] && ((FOUND_COUNT++))
[ -n "$EXISTING_JIRA_CLIENT_ID" ] && ((FOUND_COUNT++))

if [ $FOUND_COUNT -gt 0 ]; then
    print_success "Found $FOUND_COUNT existing secret(s)!"
    [ -n "$EXISTING_JWT" ] && print_info "  - JWT Secret: $(mask_secret "$EXISTING_JWT")"
    [ -n "$EXISTING_ENCRYPTION" ] && print_info "  - Encryption Key: $(mask_secret "$EXISTING_ENCRYPTION")"
    [ -n "$EXISTING_DB_HOST" ] && print_info "  - Database Host: $EXISTING_DB_HOST"
    [ -n "$EXISTING_REDIS_HOST" ] && print_info "  - Redis Host: $EXISTING_REDIS_HOST"
    [ -n "$EXISTING_OPENAI_KEY" ] && print_info "  - OpenAI API Key: $(mask_secret "$EXISTING_OPENAI_KEY")"
    [ -n "$EXISTING_ANTHROPIC_KEY" ] && print_info "  - Anthropic API Key: $(mask_secret "$EXISTING_ANTHROPIC_KEY")"
    [ -n "$EXISTING_GOOGLE_KEY" ] && print_info "  - Google API Key: $(mask_secret "$EXISTING_GOOGLE_KEY")"
    [ -n "$EXISTING_COHERE_KEY" ] && print_info "  - Cohere API Key: $(mask_secret "$EXISTING_COHERE_KEY")"
    [ -n "$EXISTING_SLACK_CLIENT_ID" ] && print_info "  - Slack OAuth: configured"
    [ -n "$EXISTING_GOOGLE_CLIENT_ID" ] && print_info "  - Google OAuth: configured"
    [ -n "$EXISTING_NOTION_CLIENT_ID" ] && print_info "  - Notion OAuth: configured"
    [ -n "$EXISTING_AIRTABLE_CLIENT_ID" ] && print_info "  - Airtable OAuth: configured"
    [ -n "$EXISTING_HUBSPOT_CLIENT_ID" ] && print_info "  - HubSpot OAuth: configured"
    [ -n "$EXISTING_MICROSOFT_CLIENT_ID" ] && print_info "  - Microsoft OAuth: configured"
    [ -n "$EXISTING_ZENDESK_CLIENT_ID" ] && print_info "  - Zendesk OAuth: configured"
    [ -n "$EXISTING_APOLLO_CLIENT_ID" ] && print_info "  - Apollo OAuth: configured"
    [ -n "$EXISTING_JIRA_CLIENT_ID" ] && print_info "  - Jira OAuth: configured"
    echo ""
    if [ "$PROMPT_ALL" = false ]; then
        print_info "Mode: Only prompting for NON-EXISTING secrets"
        print_info "Use --prompt-all or -a to prompt for all secrets"
        echo ""
    else
        print_warn "Mode: Prompting for ALL secrets (--prompt-all enabled)"
        echo ""
    fi
else
    print_warn "No existing secrets found - will prompt for all values"
    echo ""
fi

print_header "Interactive Secret Setup"

# Core Secrets
print_info "Core Application Secrets"

# JWT Secret
if [ -n "$EXISTING_JWT" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "JWT Secret: already exists ($(mask_secret "$EXISTING_JWT"))"
    JWT_SECRET="$EXISTING_JWT"
elif [ -n "$EXISTING_JWT" ]; then
    prompt_with_existing "JWT Secret (leave empty to keep current, or type 'generate' for new)" "$EXISTING_JWT" "JWT_SECRET"
    if [ "$JWT_SECRET" = "generate" ]; then
        JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
        print_info "Generated new JWT Secret"
    fi
else
    read -p "JWT Secret (leave empty to generate): " JWT_SECRET
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
        print_info "Generated JWT Secret"
    fi
fi

# Encryption Key
if [ -n "$EXISTING_ENCRYPTION" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Encryption Key: already exists ($(mask_secret "$EXISTING_ENCRYPTION"))"
    ENCRYPTION_KEY="$EXISTING_ENCRYPTION"
elif [ -n "$EXISTING_ENCRYPTION" ]; then
    prompt_with_existing "Encryption Key (leave empty to keep current, or type 'generate' for new)" "$EXISTING_ENCRYPTION" "ENCRYPTION_KEY"
    if [ "$ENCRYPTION_KEY" = "generate" ]; then
        ENCRYPTION_KEY=$(openssl rand -hex 32)
        print_info "Generated new Encryption Key"
    fi
else
    read -p "Encryption Key (leave empty to generate): " ENCRYPTION_KEY
    if [ -z "$ENCRYPTION_KEY" ]; then
        ENCRYPTION_KEY=$(openssl rand -hex 32)
        print_info "Generated Encryption Key (64 hex chars)"
    fi
fi

# Database Config
echo ""
print_info "Database Configuration"

# Database Host
if [ -n "$EXISTING_DB_HOST" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Database Host: $EXISTING_DB_HOST (using existing)"
    DB_HOST="$EXISTING_DB_HOST"
elif [ -n "$EXISTING_DB_HOST" ]; then
    read -p "Database Host [current: $EXISTING_DB_HOST]: " DB_HOST
    DB_HOST=${DB_HOST:-$EXISTING_DB_HOST}
else
    DB_HOST=$(get_pulumi_output "dbHost")
    if [ -z "$DB_HOST" ]; then
        read -p "Database Host [localhost]: " DB_HOST
        DB_HOST=${DB_HOST:-localhost}
    else
        read -p "Database Host [$DB_HOST]: " DB_HOST_INPUT
        DB_HOST=${DB_HOST_INPUT:-$DB_HOST}
    fi
fi

# Database Port
if [ -n "$EXISTING_DB_PORT" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Database Port: $EXISTING_DB_PORT (using existing)"
    DB_PORT="$EXISTING_DB_PORT"
else
    read -p "Database Port [${EXISTING_DB_PORT:-5432}]: " DB_PORT
    DB_PORT=${DB_PORT:-${EXISTING_DB_PORT:-5432}}
fi

# Database Name
if [ -n "$EXISTING_DB_NAME" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Database Name: $EXISTING_DB_NAME (using existing)"
    DB_NAME="$EXISTING_DB_NAME"
else
    read -p "Database Name [${EXISTING_DB_NAME:-flowmaestro}]: " DB_NAME
    DB_NAME=${DB_NAME:-${EXISTING_DB_NAME:-flowmaestro}}
fi

# Database User
if [ -n "$EXISTING_DB_USER" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Database User: $EXISTING_DB_USER (using existing)"
    DB_USER="$EXISTING_DB_USER"
else
    read -p "Database User [${EXISTING_DB_USER:-flowmaestro}]: " DB_USER
    DB_USER=${DB_USER:-${EXISTING_DB_USER:-flowmaestro}}
fi

# Database Password
if [ -n "$EXISTING_DB_PASSWORD" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Database Password: $(mask_secret "$EXISTING_DB_PASSWORD") (using existing)"
    DB_PASSWORD="$EXISTING_DB_PASSWORD"
elif [ -n "$EXISTING_DB_PASSWORD" ]; then
    prompt_with_existing "Database Password (leave empty to keep current, or type 'generate' for new)" "$EXISTING_DB_PASSWORD" "DB_PASSWORD"
    if [ "$DB_PASSWORD" = "generate" ]; then
        DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
        print_info "Generated new Database Password"
    fi
else
    read -p "Database Password (leave empty to generate): " -s DB_PASSWORD
    echo
    if [ -z "$DB_PASSWORD" ]; then
        DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
        print_info "Generated Database Password"
    fi
fi

DB_CONFIG_JSON=$(cat <<EOF
{
  "db_host": "${DB_HOST}",
  "db_port": "${DB_PORT}",
  "db_name": "${DB_NAME}",
  "db_user": "${DB_USER}",
  "db_password": "${DB_PASSWORD}"
}
EOF
)

# Redis Config
echo ""
print_info "Redis Configuration"

# Redis Host
if [ -n "$EXISTING_REDIS_HOST" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Redis Host: $EXISTING_REDIS_HOST (using existing)"
    REDIS_HOST="$EXISTING_REDIS_HOST"
elif [ -n "$EXISTING_REDIS_HOST" ]; then
    read -p "Redis Host [current: $EXISTING_REDIS_HOST]: " REDIS_HOST
    REDIS_HOST=${REDIS_HOST:-$EXISTING_REDIS_HOST}
else
    REDIS_HOST=$(get_pulumi_output "redisHost")
    if [ -z "$REDIS_HOST" ]; then
        read -p "Redis Host [localhost]: " REDIS_HOST
        REDIS_HOST=${REDIS_HOST:-localhost}
    else
        read -p "Redis Host [$REDIS_HOST]: " REDIS_HOST_INPUT
        REDIS_HOST=${REDIS_HOST_INPUT:-$REDIS_HOST}
    fi
fi

# Redis Port
if [ -n "$EXISTING_REDIS_PORT" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Redis Port: $EXISTING_REDIS_PORT (using existing)"
    REDIS_PORT="$EXISTING_REDIS_PORT"
else
    read -p "Redis Port [${EXISTING_REDIS_PORT:-6379}]: " REDIS_PORT
    REDIS_PORT=${REDIS_PORT:-${EXISTING_REDIS_PORT:-6379}}
fi

REDIS_CONFIG_JSON=$(cat <<EOF
{
  "redis_host": "${REDIS_HOST}",
  "redis_port": "${REDIS_PORT}"
}
EOF
)

# Temporal DB Config
echo ""
print_info "Temporal Database Configuration"
read -p "Use same as main database? (y/n): " -n 1 -r USE_SAME_DB
echo
if [[ $USE_SAME_DB =~ ^[Yy]$ ]]; then
    TEMPORAL_DB_HOST=$DB_HOST
    TEMPORAL_DB_PORT=$DB_PORT
    TEMPORAL_DB_USER=$DB_USER
    TEMPORAL_DB_PASSWORD=$DB_PASSWORD
else
    read -p "Temporal DB Host: " TEMPORAL_DB_HOST
    read -p "Temporal DB Port [5432]: " TEMPORAL_DB_PORT
    TEMPORAL_DB_PORT=${TEMPORAL_DB_PORT:-5432}
    read -p "Temporal DB User: " TEMPORAL_DB_USER
    read -p "Temporal DB Password: " -s TEMPORAL_DB_PASSWORD
    echo
fi

read -p "Temporal Database Name [flowmaestro_temporal]: " TEMPORAL_DB_NAME
TEMPORAL_DB_NAME=${TEMPORAL_DB_NAME:-flowmaestro_temporal}
read -p "Temporal Visibility Database Name [flowmaestro_temporal_visibility]: " TEMPORAL_VISIBILITY_DB
TEMPORAL_VISIBILITY_DB=${TEMPORAL_VISIBILITY_DB:-flowmaestro_temporal_visibility}

TEMPORAL_DB_CONFIG_JSON=$(cat <<EOF
{
  "host": "${TEMPORAL_DB_HOST}",
  "port": "${TEMPORAL_DB_PORT}",
  "database": "${TEMPORAL_DB_NAME}",
  "user": "${TEMPORAL_DB_USER}",
  "password": "${TEMPORAL_DB_PASSWORD}",
  "visibility-database": "${TEMPORAL_VISIBILITY_DB}"
}
EOF
)

# LLM API Keys (optional)
echo ""
print_info "LLM API Keys (optional - press Enter to skip)"

# OpenAI API Key
if [ -n "$EXISTING_OPENAI_KEY" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "OpenAI API Key: already exists ($(mask_secret "$EXISTING_OPENAI_KEY"))"
    OPENAI_API_KEY="$EXISTING_OPENAI_KEY"
elif [ -n "$EXISTING_OPENAI_KEY" ]; then
    prompt_with_existing "OpenAI API Key" "$EXISTING_OPENAI_KEY" "OPENAI_API_KEY"
else
    read -p "OpenAI API Key: " OPENAI_API_KEY
fi

# Anthropic API Key
if [ -n "$EXISTING_ANTHROPIC_KEY" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Anthropic API Key: already exists ($(mask_secret "$EXISTING_ANTHROPIC_KEY"))"
    ANTHROPIC_API_KEY="$EXISTING_ANTHROPIC_KEY"
elif [ -n "$EXISTING_ANTHROPIC_KEY" ]; then
    prompt_with_existing "Anthropic API Key" "$EXISTING_ANTHROPIC_KEY" "ANTHROPIC_API_KEY"
else
    read -p "Anthropic API Key: " ANTHROPIC_API_KEY
fi

# Google API Key
if [ -n "$EXISTING_GOOGLE_KEY" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Google API Key: already exists ($(mask_secret "$EXISTING_GOOGLE_KEY"))"
    GOOGLE_API_KEY="$EXISTING_GOOGLE_KEY"
elif [ -n "$EXISTING_GOOGLE_KEY" ]; then
    prompt_with_existing "Google API Key" "$EXISTING_GOOGLE_KEY" "GOOGLE_API_KEY"
else
    read -p "Google API Key: " GOOGLE_API_KEY
fi

# Cohere API Key
if [ -n "$EXISTING_COHERE_KEY" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Cohere API Key: already exists ($(mask_secret "$EXISTING_COHERE_KEY"))"
    COHERE_API_KEY="$EXISTING_COHERE_KEY"
elif [ -n "$EXISTING_COHERE_KEY" ]; then
    prompt_with_existing "Cohere API Key" "$EXISTING_COHERE_KEY" "COHERE_API_KEY"
else
    read -p "Cohere API Key: " COHERE_API_KEY
fi

# OAuth Secrets (optional)
echo ""
print_info "OAuth Secrets (optional - press Enter to skip)"

# Slack OAuth
if [ -n "$EXISTING_SLACK_CLIENT_ID" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Slack OAuth: already configured"
    SLACK_CLIENT_ID="$EXISTING_SLACK_CLIENT_ID"
    SLACK_CLIENT_SECRET="$EXISTING_SLACK_CLIENT_SECRET"
elif [ -n "$EXISTING_SLACK_CLIENT_ID" ]; then
    prompt_with_existing "Slack Client ID" "$EXISTING_SLACK_CLIENT_ID" "SLACK_CLIENT_ID"
    prompt_with_existing "Slack Client Secret" "$EXISTING_SLACK_CLIENT_SECRET" "SLACK_CLIENT_SECRET"
else
    read -p "Slack Client ID: " SLACK_CLIENT_ID
    read -p "Slack Client Secret: " -s SLACK_CLIENT_SECRET
    echo
fi

# Google OAuth
if [ -n "$EXISTING_GOOGLE_CLIENT_ID" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Google OAuth: already configured"
    GOOGLE_CLIENT_ID="$EXISTING_GOOGLE_CLIENT_ID"
    GOOGLE_CLIENT_SECRET="$EXISTING_GOOGLE_CLIENT_SECRET"
elif [ -n "$EXISTING_GOOGLE_CLIENT_ID" ]; then
    prompt_with_existing "Google OAuth Client ID" "$EXISTING_GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_ID"
    prompt_with_existing "Google OAuth Client Secret" "$EXISTING_GOOGLE_CLIENT_SECRET" "GOOGLE_CLIENT_SECRET"
else
    read -p "Google OAuth Client ID: " GOOGLE_CLIENT_ID
    read -p "Google OAuth Client Secret: " -s GOOGLE_CLIENT_SECRET
    echo
fi

# Notion OAuth
if [ -n "$EXISTING_NOTION_CLIENT_ID" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Notion OAuth: already configured"
    NOTION_CLIENT_ID="$EXISTING_NOTION_CLIENT_ID"
    NOTION_CLIENT_SECRET="$EXISTING_NOTION_CLIENT_SECRET"
elif [ -n "$EXISTING_NOTION_CLIENT_ID" ]; then
    prompt_with_existing "Notion Client ID" "$EXISTING_NOTION_CLIENT_ID" "NOTION_CLIENT_ID"
    prompt_with_existing "Notion Client Secret" "$EXISTING_NOTION_CLIENT_SECRET" "NOTION_CLIENT_SECRET"
else
    read -p "Notion Client ID: " NOTION_CLIENT_ID
    read -p "Notion Client Secret: " -s NOTION_CLIENT_SECRET
    echo
fi

# Airtable OAuth
if [ -n "$EXISTING_AIRTABLE_CLIENT_ID" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Airtable OAuth: already configured"
    AIRTABLE_CLIENT_ID="$EXISTING_AIRTABLE_CLIENT_ID"
    AIRTABLE_CLIENT_SECRET="$EXISTING_AIRTABLE_CLIENT_SECRET"
elif [ -n "$EXISTING_AIRTABLE_CLIENT_ID" ]; then
    prompt_with_existing "Airtable Client ID" "$EXISTING_AIRTABLE_CLIENT_ID" "AIRTABLE_CLIENT_ID"
    prompt_with_existing "Airtable Client Secret" "$EXISTING_AIRTABLE_CLIENT_SECRET" "AIRTABLE_CLIENT_SECRET"
else
    read -p "Airtable Client ID: " AIRTABLE_CLIENT_ID
    read -p "Airtable Client Secret: " -s AIRTABLE_CLIENT_SECRET
    echo
fi

# HubSpot OAuth
if [ -n "$EXISTING_HUBSPOT_CLIENT_ID" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "HubSpot OAuth: already configured"
    HUBSPOT_CLIENT_ID="$EXISTING_HUBSPOT_CLIENT_ID"
    HUBSPOT_CLIENT_SECRET="$EXISTING_HUBSPOT_CLIENT_SECRET"
elif [ -n "$EXISTING_HUBSPOT_CLIENT_ID" ]; then
    prompt_with_existing "HubSpot Client ID" "$EXISTING_HUBSPOT_CLIENT_ID" "HUBSPOT_CLIENT_ID"
    prompt_with_existing "HubSpot Client Secret" "$EXISTING_HUBSPOT_CLIENT_SECRET" "HUBSPOT_CLIENT_SECRET"
else
    read -p "HubSpot Client ID: " HUBSPOT_CLIENT_ID
    read -p "HubSpot Client Secret: " -s HUBSPOT_CLIENT_SECRET
    echo
fi

# GitHub OAuth
if [ -n "$EXISTING_GITHUB_CLIENT_ID" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "GitHub OAuth: already configured"
    GITHUB_CLIENT_ID="$EXISTING_GITHUB_CLIENT_ID"
    GITHUB_CLIENT_SECRET="$EXISTING_GITHUB_CLIENT_SECRET"
elif [ -n "$EXISTING_GITHUB_CLIENT_ID" ]; then
    prompt_with_existing "GitHub Client ID" "$EXISTING_GITHUB_CLIENT_ID" "GITHUB_CLIENT_ID"
    prompt_with_existing "GitHub Client Secret" "$EXISTING_GITHUB_CLIENT_SECRET" "GITHUB_CLIENT_SECRET"
else
    read -p "GitHub Client ID: " GITHUB_CLIENT_ID
    read -p "GitHub Client Secret: " -s GITHUB_CLIENT_SECRET
    echo
fi

# Linear OAuth
if [ -n "$EXISTING_LINEAR_CLIENT_ID" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Linear OAuth: already configured"
    LINEAR_CLIENT_ID="$EXISTING_LINEAR_CLIENT_ID"
    LINEAR_CLIENT_SECRET="$EXISTING_LINEAR_CLIENT_SECRET"
elif [ -n "$EXISTING_LINEAR_CLIENT_ID" ]; then
    prompt_with_existing "Linear Client ID" "$EXISTING_LINEAR_CLIENT_ID" "LINEAR_CLIENT_ID"
    prompt_with_existing "Linear Client Secret" "$EXISTING_LINEAR_CLIENT_SECRET" "LINEAR_CLIENT_SECRET"
else
    read -p "Linear Client ID: " LINEAR_CLIENT_ID
    read -p "Linear Client Secret: " -s LINEAR_CLIENT_SECRET
    echo
fi

# Figma OAuth
if [ -n "$EXISTING_FIGMA_CLIENT_ID" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Figma OAuth: already configured"
    FIGMA_CLIENT_ID="$EXISTING_FIGMA_CLIENT_ID"
    FIGMA_CLIENT_SECRET="$EXISTING_FIGMA_CLIENT_SECRET"
elif [ -n "$EXISTING_FIGMA_CLIENT_ID" ]; then
    prompt_with_existing "Figma Client ID" "$EXISTING_FIGMA_CLIENT_ID" "FIGMA_CLIENT_ID"
    prompt_with_existing "Figma Client Secret" "$EXISTING_FIGMA_CLIENT_SECRET" "FIGMA_CLIENT_SECRET"
else
    read -p "Figma Client ID: " FIGMA_CLIENT_ID
    read -p "Figma Client Secret: " -s FIGMA_CLIENT_SECRET
    echo
fi

# Microsoft OAuth (OneDrive, Excel, Word, Teams, Outlook, etc.)
if [ -n "$EXISTING_MICROSOFT_CLIENT_ID" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Microsoft OAuth: already configured"
    MICROSOFT_CLIENT_ID="$EXISTING_MICROSOFT_CLIENT_ID"
    MICROSOFT_CLIENT_SECRET="$EXISTING_MICROSOFT_CLIENT_SECRET"
elif [ -n "$EXISTING_MICROSOFT_CLIENT_ID" ]; then
    prompt_with_existing "Microsoft Client ID" "$EXISTING_MICROSOFT_CLIENT_ID" "MICROSOFT_CLIENT_ID"
    prompt_with_existing "Microsoft Client Secret" "$EXISTING_MICROSOFT_CLIENT_SECRET" "MICROSOFT_CLIENT_SECRET"
else
    read -p "Microsoft Client ID: " MICROSOFT_CLIENT_ID
    read -p "Microsoft Client Secret: " -s MICROSOFT_CLIENT_SECRET
    echo
fi

# Meta Platform OAuth (WhatsApp, Instagram, Messenger, Facebook Ads)
if [ -n "$EXISTING_META_APP_ID" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Meta Platform OAuth: already configured"
    META_APP_ID="$EXISTING_META_APP_ID"
    META_APP_SECRET="$EXISTING_META_APP_SECRET"
    META_CLIENT_TOKEN="$EXISTING_META_CLIENT_TOKEN"
    META_WEBHOOK_VERIFY_TOKEN="$EXISTING_META_WEBHOOK_VERIFY_TOKEN"
elif [ -n "$EXISTING_META_APP_ID" ]; then
    prompt_with_existing "Meta App ID" "$EXISTING_META_APP_ID" "META_APP_ID"
    prompt_with_existing "Meta App Secret" "$EXISTING_META_APP_SECRET" "META_APP_SECRET"
    prompt_with_existing "Meta Client Token" "$EXISTING_META_CLIENT_TOKEN" "META_CLIENT_TOKEN"
    prompt_with_existing "Meta Webhook Verify Token" "$EXISTING_META_WEBHOOK_VERIFY_TOKEN" "META_WEBHOOK_VERIFY_TOKEN"
else
    read -p "Meta App ID: " META_APP_ID
    read -p "Meta App Secret: " -s META_APP_SECRET
    echo
    read -p "Meta Client Token: " META_CLIENT_TOKEN
    read -p "Meta Webhook Verify Token: " META_WEBHOOK_VERIFY_TOKEN
fi

# Zendesk OAuth
if [ -n "$EXISTING_ZENDESK_CLIENT_ID" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Zendesk OAuth: already configured"
    ZENDESK_CLIENT_ID="$EXISTING_ZENDESK_CLIENT_ID"
    ZENDESK_CLIENT_SECRET="$EXISTING_ZENDESK_CLIENT_SECRET"
elif [ -n "$EXISTING_ZENDESK_CLIENT_ID" ]; then
    prompt_with_existing "Zendesk Client ID" "$EXISTING_ZENDESK_CLIENT_ID" "ZENDESK_CLIENT_ID"
    prompt_with_existing "Zendesk Client Secret" "$EXISTING_ZENDESK_CLIENT_SECRET" "ZENDESK_CLIENT_SECRET"
else
    read -p "Zendesk Client ID: " ZENDESK_CLIENT_ID
    read -p "Zendesk Client Secret: " -s ZENDESK_CLIENT_SECRET
    echo
fi

# Apollo OAuth
if [ -n "$EXISTING_APOLLO_CLIENT_ID" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Apollo OAuth: already configured"
    APOLLO_CLIENT_ID="$EXISTING_APOLLO_CLIENT_ID"
    APOLLO_CLIENT_SECRET="$EXISTING_APOLLO_CLIENT_SECRET"
elif [ -n "$EXISTING_APOLLO_CLIENT_ID" ]; then
    prompt_with_existing "Apollo Client ID" "$EXISTING_APOLLO_CLIENT_ID" "APOLLO_CLIENT_ID"
    prompt_with_existing "Apollo Client Secret" "$EXISTING_APOLLO_CLIENT_SECRET" "APOLLO_CLIENT_SECRET"
else
    read -p "Apollo Client ID: " APOLLO_CLIENT_ID
    read -p "Apollo Client Secret: " -s APOLLO_CLIENT_SECRET
    echo
fi

# Email Service (Resend)
echo ""
print_info "Email Service Configuration (Resend)"
EXISTING_RESEND_API_KEY=$(get_existing_gcp_secret "flowmaestro-app-resend-api-key")
EXISTING_RESEND_FROM_EMAIL=$(get_existing_gcp_secret "flowmaestro-app-resend-from-email")

if [ -n "$EXISTING_RESEND_API_KEY" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Resend API Key: already exists ($(mask_secret "$EXISTING_RESEND_API_KEY"))"
    RESEND_API_KEY="$EXISTING_RESEND_API_KEY"
elif [ -n "$EXISTING_RESEND_API_KEY" ]; then
    prompt_with_existing "Resend API Key" "$EXISTING_RESEND_API_KEY" "RESEND_API_KEY"
else
    read -p "Resend API Key: " RESEND_API_KEY
fi

if [ -n "$EXISTING_RESEND_FROM_EMAIL" ] && [ "$PROMPT_ALL" = false ]; then
    print_info "Resend From Email: $EXISTING_RESEND_FROM_EMAIL (using existing)"
    RESEND_FROM_EMAIL="$EXISTING_RESEND_FROM_EMAIL"
elif [ -n "$EXISTING_RESEND_FROM_EMAIL" ]; then
    read -p "Resend From Email [current: $EXISTING_RESEND_FROM_EMAIL]: " RESEND_FROM_EMAIL
    RESEND_FROM_EMAIL=${RESEND_FROM_EMAIL:-$EXISTING_RESEND_FROM_EMAIL}
else
    read -p "Resend From Email [noreply@flowmaestro.ai]: " RESEND_FROM_EMAIL
    RESEND_FROM_EMAIL=${RESEND_FROM_EMAIL:-noreply@flowmaestro.ai}
fi

print_header "Creating/Updating Secrets in GCP Secret Manager"

# Create/update all secrets
create_or_update_secret "flowmaestro-jwt-secret" "$JWT_SECRET"
create_or_update_secret "flowmaestro-encryption-key" "$ENCRYPTION_KEY"

create_or_update_json_secret "flowmaestro-db-config" "$DB_CONFIG_JSON"
create_or_update_json_secret "flowmaestro-redis-config" "$REDIS_CONFIG_JSON"
create_or_update_json_secret "flowmaestro-temporal-db-config" "$TEMPORAL_DB_CONFIG_JSON"

# LLM Keys
create_or_update_secret "flowmaestro-app-openai-api-key" "$OPENAI_API_KEY"
create_or_update_secret "flowmaestro-app-anthropic-api-key" "$ANTHROPIC_API_KEY"
create_or_update_secret "flowmaestro-app-google-api-key" "$GOOGLE_API_KEY"
create_or_update_secret "flowmaestro-app-cohere-api-key" "$COHERE_API_KEY"

# OAuth Secrets
create_or_update_secret "flowmaestro-app-slack-client-id" "$SLACK_CLIENT_ID"
create_or_update_secret "flowmaestro-app-slack-client-secret" "$SLACK_CLIENT_SECRET"
create_or_update_secret "flowmaestro-app-google-client-id" "$GOOGLE_CLIENT_ID"
create_or_update_secret "flowmaestro-app-google-client-secret" "$GOOGLE_CLIENT_SECRET"
create_or_update_secret "flowmaestro-app-notion-client-id" "$NOTION_CLIENT_ID"
create_or_update_secret "flowmaestro-app-notion-client-secret" "$NOTION_CLIENT_SECRET"
create_or_update_secret "flowmaestro-app-airtable-client-id" "$AIRTABLE_CLIENT_ID"
create_or_update_secret "flowmaestro-app-airtable-client-secret" "$AIRTABLE_CLIENT_SECRET"
create_or_update_secret "flowmaestro-app-hubspot-client-id" "$HUBSPOT_CLIENT_ID"
create_or_update_secret "flowmaestro-app-hubspot-client-secret" "$HUBSPOT_CLIENT_SECRET"
create_or_update_secret "flowmaestro-app-github-client-id" "$GITHUB_CLIENT_ID"
create_or_update_secret "flowmaestro-app-github-client-secret" "$GITHUB_CLIENT_SECRET"
create_or_update_secret "flowmaestro-app-linear-client-id" "$LINEAR_CLIENT_ID"
create_or_update_secret "flowmaestro-app-linear-client-secret" "$LINEAR_CLIENT_SECRET"
create_or_update_secret "flowmaestro-app-figma-client-id" "$FIGMA_CLIENT_ID"
create_or_update_secret "flowmaestro-app-figma-client-secret" "$FIGMA_CLIENT_SECRET"
create_or_update_secret "flowmaestro-app-microsoft-client-id" "$MICROSOFT_CLIENT_ID"
create_or_update_secret "flowmaestro-app-microsoft-client-secret" "$MICROSOFT_CLIENT_SECRET"
create_or_update_secret "flowmaestro-app-meta-app-id" "$META_APP_ID"
create_or_update_secret "flowmaestro-app-meta-app-secret" "$META_APP_SECRET"
create_or_update_secret "flowmaestro-app-meta-client-token" "$META_CLIENT_TOKEN"
create_or_update_secret "flowmaestro-app-meta-webhook-verify-token" "$META_WEBHOOK_VERIFY_TOKEN"
create_or_update_secret "flowmaestro-app-zendesk-client-id" "$ZENDESK_CLIENT_ID"
create_or_update_secret "flowmaestro-app-zendesk-client-secret" "$ZENDESK_CLIENT_SECRET"
create_or_update_secret "flowmaestro-app-apollo-client-id" "$APOLLO_CLIENT_ID"
create_or_update_secret "flowmaestro-app-apollo-client-secret" "$APOLLO_CLIENT_SECRET"
create_or_update_secret "flowmaestro-app-jira-client-id" "$JIRA_CLIENT_ID"
create_or_update_secret "flowmaestro-app-jira-client-secret" "$JIRA_CLIENT_SECRET"

# Email Service (Resend)
create_or_update_secret "flowmaestro-app-resend-api-key" "$RESEND_API_KEY"
create_or_update_secret "flowmaestro-app-resend-from-email" "$RESEND_FROM_EMAIL"

print_header "Setup Complete!"
print_success "All secrets have been created/updated in ${GCP_PROJECT}"
echo ""
print_info "Next steps:"
echo "  1. Run ./infra/scripts/sync-secrets-local.sh to pull secrets to .env"
echo "  2. Deploy with Pulumi: cd infra/pulumi && pulumi up"
echo ""
print_warn "Generated values (save these securely):"
echo "  JWT Secret: ${JWT_SECRET}"
echo "  Encryption Key: ${ENCRYPTION_KEY}"
[ -z "$OPENAI_API_KEY" ] || echo "  DB Password: ${DB_PASSWORD}"
echo ""
