#!/bin/bash

# ============================================================================
# DEPRECATION NOTICE
# ============================================================================
# This script is DEPRECATED. Please use the unified deployment CLI instead:
#
#   npx fmctl validate [options]
#
# Examples:
#   npx fmctl validate --env production
#   npx fmctl validate --env staging
#
# Run 'npx fmctl validate --help' for more information.
# ============================================================================

# FlowMaestro Kubernetes Manifest Validation Script
# Validates Kubernetes manifests locally before pushing
#
# Prerequisites:
# - kustomize: brew install kustomize
# - kubeconform: brew install kubeconform
#
# Usage:
#   ./infra/scripts/validate-k8s.sh              # Validate production overlay (default)
#   ./infra/scripts/validate-k8s.sh staging      # Validate staging overlay
#   ./infra/scripts/validate-k8s.sh --help       # Show help

set -e

# Print deprecation warning
echo -e "\033[1;33m[DEPRECATED]\033[0m This script is deprecated. Use 'npx fmctl validate' instead."
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Help text
show_help() {
    echo "Usage: ./infra/scripts/validate-k8s.sh [OVERLAY]"
    echo ""
    echo "Validates Kubernetes manifests for the specified overlay."
    echo ""
    echo "Arguments:"
    echo "  OVERLAY    The kustomize overlay to validate (default: production)"
    echo "             Available: production, staging"
    echo ""
    echo "Options:"
    echo "  --help, -h    Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./infra/scripts/validate-k8s.sh              # Validate production"
    echo "  ./infra/scripts/validate-k8s.sh staging      # Validate staging"
    echo ""
    echo "Prerequisites:"
    echo "  macOS:   brew install kustomize kubeconform"
    echo "  Linux:   See README for installation instructions"
    exit 0
}

# Parse arguments
case "${1:-}" in
    --help|-h)
        show_help
        ;;
esac

OVERLAY="${1:-production}"
OVERLAY_PATH="$REPO_ROOT/infra/k8s/overlays/$OVERLAY"

if [ ! -d "$OVERLAY_PATH" ]; then
    print_error "Overlay not found: $OVERLAY_PATH"
    echo ""
    echo "Available overlays:"
    ls -1 "$REPO_ROOT/infra/k8s/overlays/" 2>/dev/null || echo "  (none found)"
    exit 1
fi

# Check for required tools
check_tools() {
    local missing=()

    if ! command -v kustomize &> /dev/null; then
        missing+=("kustomize (install: brew install kustomize)")
    fi

    if ! command -v kubeconform &> /dev/null; then
        missing+=("kubeconform (install: brew install kubeconform)")
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        print_error "Missing required tools:"
        for tool in "${missing[@]}"; do
            echo "  - $tool"
        done
        exit 1
    fi
}

# Build manifests with kustomize
build_manifests() {
    print_info "Building $OVERLAY manifests..."

    TEMP_FILE=$(mktemp)
    if ! kustomize build "$OVERLAY_PATH" > "$TEMP_FILE" 2>&1; then
        print_error "Kustomize build failed!"
        cat "$TEMP_FILE"
        rm "$TEMP_FILE"
        exit 1
    fi

    print_success "Kustomize build successful"
    echo "$TEMP_FILE"
}

# Validate with kubeconform
validate_schema() {
    local manifest_file="$1"
    print_info "Validating against Kubernetes schemas..."

    if ! kubeconform -strict -summary \
        -schema-location default \
        -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
        "$manifest_file"; then
        print_error "Schema validation failed!"
        exit 1
    fi

    print_success "Schema validation passed"
}

# Check for deprecated APIs
check_deprecated() {
    local manifest_file="$1"
    print_info "Checking for deprecated APIs..."

    if grep -qE "apiVersion:.*(extensions/v1beta1|apps/v1beta1|apps/v1beta2)" "$manifest_file"; then
        print_error "Deprecated API versions found!"
        grep -n "apiVersion:.*(extensions/v1beta1|apps/v1beta1|apps/v1beta2)" "$manifest_file"
        exit 1
    fi

    print_success "No deprecated APIs found"
}

# Show resource summary
show_summary() {
    local manifest_file="$1"
    print_info "Resource summary for $OVERLAY:"
    echo ""
    grep "^kind:" "$manifest_file" | sort | uniq -c | while read -r count kind; do
        echo "  $count $kind"
    done
    echo ""
}

# Main execution
main() {
    echo ""
    print_info "Validating Kubernetes manifests for: $OVERLAY"
    echo ""

    check_tools

    MANIFEST_FILE=$(build_manifests)
    validate_schema "$MANIFEST_FILE"
    check_deprecated "$MANIFEST_FILE"
    show_summary "$MANIFEST_FILE"

    rm "$MANIFEST_FILE"

    print_success "All validations passed for $OVERLAY!"
    echo ""
}

main
