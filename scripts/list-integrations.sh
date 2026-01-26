#!/bin/bash
#
# List all implemented integration providers and their operations
# Usage: ./scripts/list-integrations.sh [provider-name]
#
# Examples:
#   ./scripts/list-integrations.sh          # List all providers
#   ./scripts/list-integrations.sh github   # Show details for GitHub only
#   ./scripts/list-integrations.sh --summary # Show summary table only

set -e

PROVIDERS_DIR="backend/src/integrations/providers"

# Colors for output
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'

# Check if we're in the right directory
if [ ! -d "$PROVIDERS_DIR" ]; then
    echo "Error: Must run from project root (flowmaestro/)"
    exit 1
fi

# Function to count operations for a provider
count_operations() {
    local provider_dir="$1"
    grep -rl "OperationDefinition" "${provider_dir}/operations/" 2>/dev/null | grep -v "types.ts" | grep -v "index.ts" | wc -l | tr -d ' '
}

# Function to get operations for a provider
get_operations() {
    local provider_dir="$1"

    for op_file in $(grep -rl "OperationDefinition" "${provider_dir}/operations/" 2>/dev/null | grep -v "types.ts" | grep -v "index.ts" | sort); do
        local id=$(grep -o 'id: "[^"]*"' "$op_file" | head -1 | cut -d'"' -f2)
        local name=$(grep -o 'name: "[^"]*"' "$op_file" | head -1 | cut -d'"' -f2)
        local action=$(grep -o 'actionType: "[^"]*"' "$op_file" | head -1 | cut -d'"' -f2)
        action=${action:-read}

        if [ -n "$id" ] && [ -n "$name" ]; then
            echo "  - $id: $name ($action)"
        fi
    done
}

# Function to show summary table
show_summary() {
    echo -e "${BOLD}Implemented Integration Providers${RESET}"
    echo ""

    local total_providers=0
    local total_ops=0

    printf "%-20s %s\n" "Provider" "Operations"
    printf "%-20s %s\n" "--------" "----------"

    for provider_dir in "$PROVIDERS_DIR"/*/; do
        local provider_name=$(basename "$provider_dir")

        if [ ! -d "${provider_dir}operations" ]; then
            continue
        fi

        local op_count=$(count_operations "$provider_dir")

        if [ "$op_count" -gt 0 ]; then
            printf "%-20s %s\n" "$provider_name" "$op_count"
            total_providers=$((total_providers + 1))
            total_ops=$((total_ops + op_count))
        fi
    done

    echo ""
    echo -e "${BOLD}Total: $total_providers providers, $total_ops operations${RESET}"
}

# Function to show details for a single provider
show_provider() {
    local provider_name="$1"
    local provider_dir="$PROVIDERS_DIR/$provider_name"

    if [ ! -d "$provider_dir" ]; then
        echo "Error: Provider '$provider_name' not found"
        echo ""
        echo "Available providers:"
        ls -1 "$PROVIDERS_DIR" | grep -v "^\\." | sort | sed 's/^/  /'
        exit 1
    fi

    if [ ! -d "${provider_dir}/operations" ]; then
        echo "Error: Provider '$provider_name' has no operations directory"
        exit 1
    fi

    local op_count=$(count_operations "$provider_dir")

    echo -e "${BOLD}$provider_name${RESET} ($op_count operations)"
    echo ""
    get_operations "$provider_dir"
}

# Function to show all providers with operations
show_all() {
    echo -e "${BOLD}Implemented Integration Providers${RESET}"
    echo ""

    local total_providers=0
    local total_ops=0

    for provider_dir in "$PROVIDERS_DIR"/*/; do
        local provider_name=$(basename "$provider_dir")

        if [ ! -d "${provider_dir}operations" ]; then
            continue
        fi

        local op_count=$(count_operations "$provider_dir")

        if [ "$op_count" -gt 0 ]; then
            echo -e "${CYAN}### $provider_name${RESET} ($op_count operations)"
            echo ""
            get_operations "$provider_dir"
            echo ""
            total_providers=$((total_providers + 1))
            total_ops=$((total_ops + op_count))
        fi
    done

    echo -e "${BOLD}Total: $total_providers providers, $total_ops operations${RESET}"
}

# Main
case "${1:-}" in
    --summary|-s)
        show_summary
        ;;
    --help|-h)
        echo "Usage: $0 [options] [provider-name]"
        echo ""
        echo "Options:"
        echo "  --summary, -s    Show summary table only"
        echo "  --help, -h       Show this help"
        echo ""
        echo "Examples:"
        echo "  $0               List all providers with operations"
        echo "  $0 --summary     Show summary table"
        echo "  $0 github        Show GitHub operations only"
        echo "  $0 gitlab        Show GitLab operations only"
        ;;
    "")
        show_all
        ;;
    *)
        show_provider "$1"
        ;;
esac
