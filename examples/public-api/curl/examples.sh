#!/bin/bash
#
# FlowMaestro Public API - curl Examples
#
# This script demonstrates common API operations using curl.
#
# Setup:
#   1. cp .env.example .env
#   2. Edit .env with your actual values
#   3. source .env
#   4. ./examples.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check for required environment variables
if [[ -z "$FLOWMAESTRO_API_KEY" || "$FLOWMAESTRO_API_KEY" == "fm_live_your_api_key_here" ]]; then
    echo -e "${RED}Error: FLOWMAESTRO_API_KEY not set${NC}"
    echo "Please run: source .env (after copying and editing .env.example)"
    exit 1
fi

BASE_URL="${FLOWMAESTRO_BASE_URL:-https://api.flowmaestro.io}"

echo -e "${BLUE}FlowMaestro Public API - curl Examples${NC}"
echo "========================================"
echo ""

# Helper function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3

    local args="-s"
    if [[ "$method" == "POST" || "$method" == "PATCH" ]]; then
        args="$args -X $method -H 'Content-Type: application/json'"
        if [[ -n "$data" ]]; then
            args="$args -d '$data'"
        fi
    elif [[ "$method" != "GET" ]]; then
        args="$args -X $method"
    fi

    eval "curl $args -H 'X-API-Key: $FLOWMAESTRO_API_KEY' '$BASE_URL$endpoint'"
}

# ==============================================================================
# WORKFLOWS
# ==============================================================================

echo -e "${GREEN}1. List Workflows${NC}"
echo "GET /api/v1/workflows"
echo ""
curl -s \
    -H "X-API-Key: $FLOWMAESTRO_API_KEY" \
    "$BASE_URL/api/v1/workflows?per_page=3" | jq '.data[] | {id, name, description}'
echo ""

# ==============================================================================
# Get specific workflow (if WORKFLOW_ID is set)
# ==============================================================================

if [[ -n "$WORKFLOW_ID" && "$WORKFLOW_ID" != "wf_your_workflow_id" ]]; then
    echo -e "${GREEN}2. Get Workflow Details${NC}"
    echo "GET /api/v1/workflows/$WORKFLOW_ID"
    echo ""
    curl -s \
        -H "X-API-Key: $FLOWMAESTRO_API_KEY" \
        "$BASE_URL/api/v1/workflows/$WORKFLOW_ID" | jq '.data | {id, name, version, inputs}'
    echo ""

    # ==============================================================================
    # Execute workflow
    # ==============================================================================

    echo -e "${GREEN}3. Execute Workflow${NC}"
    echo "POST /api/v1/workflows/$WORKFLOW_ID/execute"
    echo ""

    EXECUTION_RESPONSE=$(curl -s \
        -X POST \
        -H "X-API-Key: $FLOWMAESTRO_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"inputs": {"name": "curl-test", "email": "curl@example.com"}}' \
        "$BASE_URL/api/v1/workflows/$WORKFLOW_ID/execute")

    echo "$EXECUTION_RESPONSE" | jq '.data'
    echo ""

    EXECUTION_ID=$(echo "$EXECUTION_RESPONSE" | jq -r '.data.execution_id')

    if [[ "$EXECUTION_ID" != "null" && -n "$EXECUTION_ID" ]]; then
        # ==============================================================================
        # Get execution status
        # ==============================================================================

        echo -e "${GREEN}4. Get Execution Status${NC}"
        echo "GET /api/v1/executions/$EXECUTION_ID"
        echo ""

        # Poll for completion
        echo "Waiting for execution to complete..."
        for i in {1..30}; do
            EXEC_STATUS=$(curl -s \
                -H "X-API-Key: $FLOWMAESTRO_API_KEY" \
                "$BASE_URL/api/v1/executions/$EXECUTION_ID")

            STATUS=$(echo "$EXEC_STATUS" | jq -r '.data.status')
            echo -n "."

            if [[ "$STATUS" == "completed" || "$STATUS" == "failed" || "$STATUS" == "cancelled" ]]; then
                echo ""
                echo "$EXEC_STATUS" | jq '.data | {id, status, outputs, error}'
                break
            fi

            sleep 1
        done
        echo ""
    fi
else
    echo -e "${YELLOW}Skipping workflow execution (WORKFLOW_ID not set)${NC}"
    echo ""
fi

# ==============================================================================
# EXECUTIONS
# ==============================================================================

echo -e "${GREEN}5. List Executions${NC}"
echo "GET /api/v1/executions"
echo ""
curl -s \
    -H "X-API-Key: $FLOWMAESTRO_API_KEY" \
    "$BASE_URL/api/v1/executions?per_page=3" | jq '.data[] | {id, workflow_id, status, created_at}'
echo ""

# ==============================================================================
# AGENTS
# ==============================================================================

echo -e "${GREEN}6. List Agents${NC}"
echo "GET /api/v1/agents"
echo ""
curl -s \
    -H "X-API-Key: $FLOWMAESTRO_API_KEY" \
    "$BASE_URL/api/v1/agents" | jq '.data[] | {id, name, model}'
echo ""

# ==============================================================================
# KNOWLEDGE BASES
# ==============================================================================

echo -e "${GREEN}7. List Knowledge Bases${NC}"
echo "GET /api/v1/knowledge-bases"
echo ""
curl -s \
    -H "X-API-Key: $FLOWMAESTRO_API_KEY" \
    "$BASE_URL/api/v1/knowledge-bases" | jq '.data[] | {id, name, document_count, chunk_count}'
echo ""

# ==============================================================================
# SEMANTIC SEARCH (if KNOWLEDGE_BASE_ID is set)
# ==============================================================================

if [[ -n "$KNOWLEDGE_BASE_ID" && "$KNOWLEDGE_BASE_ID" != "kb_your_knowledge_base_id" ]]; then
    echo -e "${GREEN}8. Semantic Search${NC}"
    echo "POST /api/v1/knowledge-bases/$KNOWLEDGE_BASE_ID/query"
    echo ""
    curl -s \
        -X POST \
        -H "X-API-Key: $FLOWMAESTRO_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"query": "How do I get started?", "top_k": 3}' \
        "$BASE_URL/api/v1/knowledge-bases/$KNOWLEDGE_BASE_ID/query" | jq '.data.results[] | {score, content: .content[0:100]}'
    echo ""
else
    echo -e "${YELLOW}Skipping semantic search (KNOWLEDGE_BASE_ID not set)${NC}"
    echo ""
fi

# ==============================================================================
# WEBHOOKS
# ==============================================================================

echo -e "${GREEN}9. List Webhooks${NC}"
echo "GET /api/v1/webhooks"
echo ""
curl -s \
    -H "X-API-Key: $FLOWMAESTRO_API_KEY" \
    "$BASE_URL/api/v1/webhooks" | jq '.data[] | {id, name, url, events, is_active}'
echo ""

# ==============================================================================
# TRIGGERS
# ==============================================================================

echo -e "${GREEN}10. List Triggers${NC}"
echo "GET /api/v1/triggers"
echo ""
curl -s \
    -H "X-API-Key: $FLOWMAESTRO_API_KEY" \
    "$BASE_URL/api/v1/triggers" | jq '.data[] | {id, workflow_id, name, trigger_type, enabled}'
echo ""

echo "========================================"
echo -e "${BLUE}Examples completed!${NC}"
echo ""
echo "For SSE streaming, use:"
echo "  curl -N -H 'X-API-Key: \$FLOWMAESTRO_API_KEY' \\"
echo "    '\$FLOWMAESTRO_BASE_URL/api/v1/executions/<execution_id>/events'"
