# FlowMaestro Python Examples

Examples demonstrating the FlowMaestro Public API using the official Python SDK.

## Setup

1. **Create virtual environment (recommended):**

    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

2. **Install dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

3. **Configure environment:**

    ```bash
    cp .env.example .env
    # Edit .env with your API key and resource IDs
    ```

4. **Get your API key:**
    - Log in to FlowMaestro
    - Navigate to **Settings > API & Webhooks**
    - Create a new API key with the required scopes

## Examples

| Example                     | Description                               | Required Scopes                                                  |
| --------------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| `01_basic_workflow.py`      | Execute a workflow and wait for results   | `workflows:read`, `workflows:execute`, `executions:read`         |
| `02_streaming_execution.py` | Real-time progress tracking with SSE      | `workflows:read`, `workflows:execute`, `executions:read`         |
| `03_batch_processing.py`    | Process multiple items with rate limiting | `workflows:read`, `workflows:execute`, `executions:read`         |
| `04_agent_chatbot.py`       | Interactive AI agent conversation         | `agents:read`, `agents:execute`, `threads:read`, `threads:write` |
| `05_semantic_search.py`     | RAG-powered knowledge base search         | `knowledge-bases:read`, `knowledge-bases:query`                  |
| `06_webhook_receiver.py`    | Receive and verify webhook notifications  | N/A (server-side)                                                |
| `07_cli_tool.py`            | Command-line workflow runner              | All workflow/execution scopes                                    |

## Running Examples

```bash
# Basic workflow execution
python 01_basic_workflow.py

# Streaming execution with real-time events
python 02_streaming_execution.py

# Batch processing multiple items
python 03_batch_processing.py

# Interactive AI chatbot
python 04_agent_chatbot.py

# Semantic search interface
python 05_semantic_search.py

# Start webhook receiver server
python 06_webhook_receiver.py

# CLI tool
python 07_cli_tool.py --help
python 07_cli_tool.py list
python 07_cli_tool.py run wf_abc123
python 07_cli_tool.py status exec_xyz789
```

## Example Details

### 01 - Basic Workflow Execution

The simplest integration pattern:

1. Get workflow details to understand required inputs
2. Execute the workflow with inputs
3. Poll for completion using `wait_for_completion()`
4. Display results

```python
with FlowMaestroClient(api_key="fm_live_...") as client:
    response = client.workflows.execute(
        "wf_123",
        inputs={"name": "John", "email": "john@example.com"}
    )

    result = client.executions.wait_for_completion(
        response["data"]["execution_id"]
    )
    print(result["outputs"])
```

### 02 - Streaming Execution

Real-time progress tracking using Server-Sent Events:

1. Execute workflow
2. Stream events via `stream()`
3. Display progress as nodes complete

```python
for event in client.executions.stream(execution_id):
    print(f"{event['type']}: {event.get('node_id', '')}")
    if event["type"] == "execution:completed":
        break
```

### 03 - Batch Processing

Process multiple items through a workflow with:

- Configurable concurrency limits using `ThreadPoolExecutor`
- Rate limit handling with exponential backoff
- Progress tracking
- Error collection

### 04 - AI Agent Chatbot

Build conversational interfaces:

1. Create a conversation thread
2. Send messages
3. Receive responses
4. Maintain conversation history

### 05 - Semantic Search

Use knowledge bases for RAG:

1. List available knowledge bases
2. Perform semantic queries
3. Display ranked results with similarity scores

### 06 - Webhook Receiver

Set up a Flask server to receive webhook notifications:

1. Verify webhook signatures
2. Route events to handlers
3. Process different event types

For local testing, use ngrok:

```bash
ngrok http 3456
# Then create a webhook in FlowMaestro pointing to your ngrok URL
```

### 07 - CLI Tool

A complete command-line interface for workflows:

```bash
# List all workflows
python 07_cli_tool.py list

# Get workflow details
python 07_cli_tool.py get wf_abc123

# Run a workflow interactively
python 07_cli_tool.py run wf_abc123

# Check execution status
python 07_cli_tool.py status exec_xyz789

# Cancel an execution
python 07_cli_tool.py cancel exec_xyz789
```

## Async Examples

The Python SDK supports both synchronous and asynchronous clients:

```python
import asyncio
from flowmaestro import AsyncFlowMaestroClient

async def main():
    async with AsyncFlowMaestroClient(api_key="fm_live_...") as client:
        response = await client.workflows.execute(
            "wf_123",
            inputs={"name": "John"}
        )

        # Stream events asynchronously
        async for event in client.executions.stream(
            response["data"]["execution_id"]
        ):
            print(event)
            if event["type"] == "execution:completed":
                break

asyncio.run(main())
```

## SDK Reference

Full SDK documentation: [Public API & SDKs](/.docs/public-api.md)

### Client Configuration

```python
client = FlowMaestroClient(
    api_key="fm_live_...",      # Required
    base_url="https://...",      # Optional (default: production)
    timeout=30.0,                # Optional (default: 30s)
    max_retries=3                # Optional (default: 3)
)
```

### Error Handling

```python
from flowmaestro import (
    FlowMaestroError,
    AuthenticationError,
    RateLimitError,
    NotFoundError,
    ValidationError
)

try:
    client.workflows.get("invalid-id")
except NotFoundError:
    # Handle not found
    pass
except RateLimitError as e:
    # Wait and retry
    import time
    time.sleep(e.retry_after)
except FlowMaestroError as e:
    print(f"API Error: {e.code} - {e.message}")
```

## Troubleshooting

### "API key is required"

Make sure you've created a `.env` file with your API key.

### "Missing required scopes"

Your API key doesn't have the necessary permissions. Create a new key with the required scopes.

### "Rate limit exceeded"

You've made too many requests. Wait for the retry period or upgrade your plan.

### ModuleNotFoundError

Make sure you've activated your virtual environment and installed dependencies:

```bash
source venv/bin/activate
pip install -r requirements.txt
```
