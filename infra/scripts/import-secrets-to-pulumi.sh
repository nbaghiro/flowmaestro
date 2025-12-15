#!/bin/bash

# FlowMaestro - Import Existing GCP Secrets into Pulumi State
#
# This script imports existing GCP Secret Manager secrets into Pulumi state
# so that Pulumi can manage them without "already exists" errors.
#
# Run this ONCE before `pulumi up` if you have existing secrets in GCP.
#
# Usage: ./infra/scripts/import-secrets-to-pulumi.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Get directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PULUMI_DIR="${SCRIPT_DIR}/../pulumi"

# Get GCP project
GCP_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ -z "$GCP_PROJECT" ]; then
    print_error "No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

print_header "Import Existing Secrets into Pulumi"
print_info "GCP Project: ${GCP_PROJECT}"
print_info "Pulumi Dir: ${PULUMI_DIR}"

# Change to Pulumi directory
cd "$PULUMI_DIR"

# Get secret definitions from Pulumi config file directly
# (can't use `pulumi stack output` since it requires a successful `pulumi up` first)
print_info "Reading secret definitions from Pulumi.production.yaml..."

# Extract the secrets JSON from the YAML config file using pulumi config
# This reads the config value directly without needing a full `pulumi up`
SECRETS_JSON=$(pulumi config get secrets 2>/dev/null || echo "[]")

if [ "$SECRETS_JSON" = "[]" ] || [ -z "$SECRETS_JSON" ]; then
    print_error "No secrets defined in Pulumi config"
    print_info "Add secrets to Pulumi.production.yaml under flowmaestro-infrastructure:secrets"
    exit 1
fi

SECRET_COUNT=$(echo "$SECRETS_JSON" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")
print_success "Found $SECRET_COUNT secret definitions"

# Check which secrets exist in GCP
print_header "Checking for Existing Secrets in GCP"

IMPORT_COUNT=0
SKIP_COUNT=0
MISSING_COUNT=0

for i in $(seq 0 $((SECRET_COUNT - 1))); do
    SECRET_NAME=$(echo "$SECRETS_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin)[$i]['name'])")

    GCP_SECRET_NAME="flowmaestro-app-${SECRET_NAME}"
    PULUMI_RESOURCE_NAME="flowmaestro-app-secret-${SECRET_NAME}"
    IMPORT_ID="projects/${GCP_PROJECT}/secrets/${GCP_SECRET_NAME}"

    # Check if secret exists in GCP
    if gcloud secrets describe "$GCP_SECRET_NAME" --project="$GCP_PROJECT" &>/dev/null; then
        # Check if already in Pulumi state
        if pulumi stack export 2>/dev/null | grep -q "\"urn.*${PULUMI_RESOURCE_NAME}\""; then
            print_info "Already in Pulumi: ${GCP_SECRET_NAME}"
            ((SKIP_COUNT++))
        else
            print_warn "Importing: ${GCP_SECRET_NAME}"

            # Import the secret into Pulumi state
            if pulumi import gcp:secretmanager/secret:Secret "$PULUMI_RESOURCE_NAME" "$IMPORT_ID" --yes --protect=false 2>/dev/null; then
                print_success "Imported: ${GCP_SECRET_NAME}"
                ((IMPORT_COUNT++))
            else
                print_error "Failed to import: ${GCP_SECRET_NAME}"
            fi
        fi
    else
        print_info "Not in GCP (will be created): ${GCP_SECRET_NAME}"
        ((MISSING_COUNT++))
    fi
done

print_header "Import Complete!"
echo "  Imported: $IMPORT_COUNT secrets"
echo "  Skipped (already in Pulumi): $SKIP_COUNT secrets"
echo "  Missing (will be created): $MISSING_COUNT secrets"
echo ""
print_info "Next steps:"
echo "  1. Run: pulumi up"
echo "  2. Run: ./infra/scripts/setup-secrets-gcp.sh (to set values for new secrets)"
echo ""
