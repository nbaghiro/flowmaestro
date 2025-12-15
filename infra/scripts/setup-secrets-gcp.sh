#!/bin/bash

# FlowMaestro GCP Secret Manager Setup Script
# Reads secret definitions from Pulumi config and prompts for values
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - Secret Manager Admin role on the GCP project
# - Pulumi stack deployed (pulumi up) to create empty secrets
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
            echo "Unknown option: $1"
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

# Get current GCP project
GCP_PROJECT=$(gcloud config get-value project 2>/dev/null)

if [ -z "$GCP_PROJECT" ]; then
    print_error "No GCP project is set"
    echo "Set your project with: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

# Get Pulumi directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PULUMI_DIR="${SCRIPT_DIR}/../pulumi"

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

# =============================================================================
# Read Secret Definitions from Pulumi
# =============================================================================

print_header "Reading Secret Definitions from Pulumi"

# Get secret definitions from Pulumi config (not stack output, which requires successful pulumi up)
cd "$PULUMI_DIR"
SECRETS_JSON=$(pulumi config get secrets 2>/dev/null || echo "[]")
cd - > /dev/null

if [ "$SECRETS_JSON" = "[]" ] || [ -z "$SECRETS_JSON" ]; then
    print_error "No secrets defined in Pulumi config"
    echo ""
    echo "To define secrets, add them to Pulumi.production.yaml:"
    echo "  flowmaestro-infrastructure:secrets: |"
    echo '    [{"name":"my-secret","envVar":"MY_SECRET","category":"service","deployments":["api"],"required":true}]'
    echo ""
    echo "Then run: pulumi up"
    exit 1
fi

# Parse the JSON array into bash arrays
SECRET_COUNT=$(echo "$SECRETS_JSON" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")
print_success "Found $SECRET_COUNT secret definitions"

# =============================================================================
# Helper Functions for Secret Operations
# =============================================================================

# Function to get existing secret from GCP Secret Manager
get_existing_gcp_secret() {
    local secret_name=$1
    gcloud secrets versions access latest --secret="${secret_name}" --project="${GCP_PROJECT}" 2>/dev/null || echo ""
}

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

# =============================================================================
# Process Each Secret
# =============================================================================

print_header "Interactive Secret Setup"

CURRENT_CATEGORY=""
UPDATED_COUNT=0
SKIPPED_COUNT=0

# Process each secret definition
for i in $(seq 0 $((SECRET_COUNT - 1))); do
    # Extract secret properties using Python
    SECRET_NAME=$(echo "$SECRETS_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin)[$i]['name'])")
    SECRET_ENV_VAR=$(echo "$SECRETS_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin)[$i]['envVar'])")
    SECRET_CATEGORY=$(echo "$SECRETS_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin)[$i]['category'])")
    SECRET_REQUIRED=$(echo "$SECRETS_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin)[$i]['required'])")
    SECRET_DESCRIPTION=$(echo "$SECRETS_JSON" | python3 -c "import sys, json; d=json.load(sys.stdin)[$i]; print(d.get('description', ''))")

    # GCP secret name follows convention: flowmaestro-app-{name}
    GCP_SECRET_NAME="flowmaestro-app-${SECRET_NAME}"

    # Print category header when it changes
    if [ "$SECRET_CATEGORY" != "$CURRENT_CATEGORY" ]; then
        CURRENT_CATEGORY="$SECRET_CATEGORY"
        CATEGORY_UPPER=$(echo "$SECRET_CATEGORY" | tr '[:lower:]' '[:upper:]')
        print_category "${CATEGORY_UPPER} SECRETS"
    fi

    # Check for existing value
    EXISTING_VALUE=$(get_existing_gcp_secret "$GCP_SECRET_NAME")

    # Build prompt text
    if [ -n "$SECRET_DESCRIPTION" ]; then
        PROMPT_TEXT="$SECRET_ENV_VAR ($SECRET_DESCRIPTION)"
    else
        PROMPT_TEXT="$SECRET_ENV_VAR"
    fi

    if [ "$SECRET_REQUIRED" = "True" ]; then
        PROMPT_TEXT="$PROMPT_TEXT [REQUIRED]"
    fi

    # Determine if we should prompt
    if [ -n "$EXISTING_VALUE" ] && [ "$PROMPT_ALL" = false ]; then
        print_info "$SECRET_ENV_VAR: already exists ($(mask_secret "$EXISTING_VALUE"))"
        ((SKIPPED_COUNT++))
        continue
    fi

    # Prompt for value
    if [ -n "$EXISTING_VALUE" ]; then
        # Has existing value, show masked
        MASKED=$(mask_secret "$EXISTING_VALUE")
        read -p "$PROMPT_TEXT [current: $MASKED, Enter to keep]: " USER_INPUT
        if [ -z "$USER_INPUT" ]; then
            # Keep existing
            ((SKIPPED_COUNT++))
            continue
        fi
        SECRET_VALUE="$USER_INPUT"
    else
        # No existing value
        read -p "$PROMPT_TEXT: " SECRET_VALUE
        if [ -z "$SECRET_VALUE" ]; then
            if [ "$SECRET_REQUIRED" = "True" ]; then
                print_warn "Skipping required secret $SECRET_ENV_VAR (no value provided)"
            fi
            ((SKIPPED_COUNT++))
            continue
        fi
    fi

    # Create or update the secret
    create_or_update_secret "$GCP_SECRET_NAME" "$SECRET_VALUE"
    ((UPDATED_COUNT++))
done

# =============================================================================
# Also handle legacy/infrastructure secrets
# =============================================================================

print_header "Infrastructure Secrets"
print_info "Checking core infrastructure secrets..."

# Database config (JSON secret)
EXISTING_DB_CONFIG=$(get_existing_gcp_secret "flowmaestro-db-config")
if [ -z "$EXISTING_DB_CONFIG" ] || [ "$PROMPT_ALL" = true ]; then
    print_category "DATABASE CONFIGURATION"

    # Try to get defaults from Pulumi outputs
    DB_HOST_DEFAULT=$(cd "$PULUMI_DIR" && pulumi stack output databasePrivateIp 2>/dev/null || echo "localhost")

    read -p "Database Host [$DB_HOST_DEFAULT]: " DB_HOST
    DB_HOST=${DB_HOST:-$DB_HOST_DEFAULT}

    read -p "Database Port [5432]: " DB_PORT
    DB_PORT=${DB_PORT:-5432}

    read -p "Database Name [flowmaestro]: " DB_NAME
    DB_NAME=${DB_NAME:-flowmaestro}

    read -p "Database User [flowmaestro]: " DB_USER
    DB_USER=${DB_USER:-flowmaestro}

    read -p "Database Password (leave empty to generate): " -s DB_PASSWORD
    echo
    if [ -z "$DB_PASSWORD" ]; then
        DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
        print_info "Generated Database Password"
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
    create_or_update_secret "flowmaestro-db-config" "$DB_CONFIG_JSON"
else
    print_info "Database config: already exists"
fi

# Redis config (JSON secret)
EXISTING_REDIS_CONFIG=$(get_existing_gcp_secret "flowmaestro-redis-config")
if [ -z "$EXISTING_REDIS_CONFIG" ] || [ "$PROMPT_ALL" = true ]; then
    print_category "REDIS CONFIGURATION"

    REDIS_HOST_DEFAULT=$(cd "$PULUMI_DIR" && pulumi stack output redisHost 2>/dev/null || echo "localhost")

    read -p "Redis Host [$REDIS_HOST_DEFAULT]: " REDIS_HOST
    REDIS_HOST=${REDIS_HOST:-$REDIS_HOST_DEFAULT}

    read -p "Redis Port [6379]: " REDIS_PORT
    REDIS_PORT=${REDIS_PORT:-6379}

    REDIS_CONFIG_JSON=$(cat <<EOF
{
  "redis_host": "${REDIS_HOST}",
  "redis_port": "${REDIS_PORT}"
}
EOF
)
    create_or_update_secret "flowmaestro-redis-config" "$REDIS_CONFIG_JSON"
else
    print_info "Redis config: already exists"
fi

# Temporal DB config
EXISTING_TEMPORAL_CONFIG=$(get_existing_gcp_secret "flowmaestro-temporal-db-config")
if [ -z "$EXISTING_TEMPORAL_CONFIG" ] || [ "$PROMPT_ALL" = true ]; then
    print_category "TEMPORAL DATABASE CONFIGURATION"

    read -p "Use same DB host as main database? (y/n) [y]: " -n 1 -r USE_SAME
    echo
    USE_SAME=${USE_SAME:-y}

    if [[ $USE_SAME =~ ^[Yy]$ ]]; then
        # Get from existing db-config or use entered values
        if [ -n "$DB_HOST" ]; then
            TEMPORAL_DB_HOST="$DB_HOST"
            TEMPORAL_DB_PORT="$DB_PORT"
            TEMPORAL_DB_USER="$DB_USER"
            TEMPORAL_DB_PASSWORD="$DB_PASSWORD"
        else
            # Parse from existing config
            TEMPORAL_DB_HOST=$(echo "$EXISTING_DB_CONFIG" | python3 -c "import sys, json; print(json.load(sys.stdin).get('db_host', 'localhost'))" 2>/dev/null || echo "localhost")
            TEMPORAL_DB_PORT=$(echo "$EXISTING_DB_CONFIG" | python3 -c "import sys, json; print(json.load(sys.stdin).get('db_port', '5432'))" 2>/dev/null || echo "5432")
            TEMPORAL_DB_USER=$(echo "$EXISTING_DB_CONFIG" | python3 -c "import sys, json; print(json.load(sys.stdin).get('db_user', 'flowmaestro'))" 2>/dev/null || echo "flowmaestro")
            TEMPORAL_DB_PASSWORD=$(echo "$EXISTING_DB_CONFIG" | python3 -c "import sys, json; print(json.load(sys.stdin).get('db_password', ''))" 2>/dev/null || echo "")
        fi
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

    read -p "Temporal Visibility Database [flowmaestro_temporal_visibility]: " TEMPORAL_VISIBILITY_DB
    TEMPORAL_VISIBILITY_DB=${TEMPORAL_VISIBILITY_DB:-flowmaestro_temporal_visibility}

    TEMPORAL_CONFIG_JSON=$(cat <<EOF
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
    create_or_update_secret "flowmaestro-temporal-db-config" "$TEMPORAL_CONFIG_JSON"
else
    print_info "Temporal DB config: already exists"
fi

# Core secrets (JWT, encryption key)
EXISTING_JWT=$(get_existing_gcp_secret "flowmaestro-jwt-secret")
if [ -z "$EXISTING_JWT" ] || [ "$PROMPT_ALL" = true ]; then
    print_category "CORE SECRETS"

    read -p "JWT Secret (leave empty to generate): " JWT_SECRET
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
        print_info "Generated JWT Secret"
    fi
    create_or_update_secret "flowmaestro-jwt-secret" "$JWT_SECRET"
else
    print_info "JWT Secret: already exists"
fi

EXISTING_ENCRYPTION=$(get_existing_gcp_secret "flowmaestro-encryption-key")
if [ -z "$EXISTING_ENCRYPTION" ] || [ "$PROMPT_ALL" = true ]; then
    read -p "Encryption Key (leave empty to generate): " ENCRYPTION_KEY
    if [ -z "$ENCRYPTION_KEY" ]; then
        ENCRYPTION_KEY=$(openssl rand -hex 32)
        print_info "Generated Encryption Key (64 hex chars)"
    fi
    create_or_update_secret "flowmaestro-encryption-key" "$ENCRYPTION_KEY"
else
    print_info "Encryption Key: already exists"
fi

# =============================================================================
# Summary
# =============================================================================

print_header "Setup Complete!"
print_success "Secrets updated in ${GCP_PROJECT}"
echo ""
echo "  Updated: $UPDATED_COUNT secrets"
echo "  Skipped: $SKIPPED_COUNT secrets (already exist)"
echo ""
print_info "Next steps:"
echo "  1. External Secrets Operator will sync to K8s within 5 minutes"
echo "  2. To force sync: kubectl annotate externalsecret -n flowmaestro --all force-sync=\$(date +%s)"
echo "  3. Restart deployments to pick up new secrets:"
echo "     kubectl rollout restart deployment/api-server -n flowmaestro"
echo "     kubectl rollout restart deployment/temporal-worker -n flowmaestro"
echo ""
echo "  4. To sync secrets to local .env file:"
echo "     ./infra/scripts/sync-secrets-local.sh"
echo ""
