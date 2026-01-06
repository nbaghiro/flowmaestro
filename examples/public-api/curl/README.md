# FlowMaestro curl Examples

Examples demonstrating the FlowMaestro Public API using curl commands.

## Setup

1. **Configure environment:**

    ```bash
    cp .env.example .env
    # Edit .env with your API key and resource IDs
    source .env
    ```

2. **Make scripts executable:**
    ```bash
    chmod +x *.sh
    ```

## Running Examples

```bash
# Run all examples
./examples.sh

# Run individual commands manually (after sourcing .env)
source .env

# List workflows
curl -s -H "X-API-Key: $FLOWMAESTRO_API_KEY" \
  "$FLOWMAESTRO_BASE_URL/api/v1/workflows" | jq

# Execute a workflow
curl -s -X POST \
  -H "X-API-Key: $FLOWMAESTRO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"name": "John"}}' \
  "$FLOWMAESTRO_BASE_URL/api/v1/workflows/$WORKFLOW_ID/execute" | jq
```

## Notes

- All examples use `jq` for JSON formatting (install with `brew install jq` or `apt install jq`)
- The `examples.sh` script runs through common API operations
- For SSE streaming, use `curl -N` to disable buffering
