# FlowMaestro Python SDK

Official Python SDK for FlowMaestro.

## Installation

```bash
pip install flowmaestro
```

## Quick Start

### Synchronous Client

```python
from flowmaestro import FlowMaestroClient

with FlowMaestroClient(api_key="fm_live_...") as client:
    # Execute a workflow
    response = client.workflows.execute("wf_123", inputs={"name": "John"})
    execution_id = response["data"]["execution_id"]

    # Wait for completion
    result = client.executions.wait_for_completion(execution_id)
    print(f"Result: {result['outputs']}")
```

### Async Client

```python
import asyncio
from flowmaestro import AsyncFlowMaestroClient

async def main():
    async with AsyncFlowMaestroClient(api_key="fm_live_...") as client:
        # Execute a workflow
        response = await client.workflows.execute("wf_123", inputs={"name": "John"})
        execution_id = response["data"]["execution_id"]

        # Wait for completion
        result = await client.executions.wait_for_completion(execution_id)
        print(f"Result: {result['outputs']}")

asyncio.run(main())
```

## Features

- **Workflows**: List, get, and execute workflows
- **Executions**: Track, stream, and cancel executions
- **Agents**: List agents and create conversation threads
- **Threads**: Send messages with streaming support
- **Triggers**: List and execute workflow triggers
- **Knowledge Bases**: Semantic search across your knowledge bases
- **Webhooks**: Manage outgoing webhooks
- **Sync & Async**: Both synchronous and async clients

## API Reference

### Client Configuration

```python
client = FlowMaestroClient(
    api_key="fm_live_...",           # Required: Your API key
    base_url="https://api.flowmaestro.io",  # Optional: API base URL
    timeout=30.0,                     # Optional: Request timeout (seconds)
    max_retries=3                     # Optional: Max retry attempts
)
```

### Workflows

```python
# List all workflows
response = client.workflows.list()

# Get a specific workflow
response = client.workflows.get("wf_123")

# Execute a workflow
response = client.workflows.execute("wf_123", inputs={
    "name": "John",
    "email": "john@example.com"
})
```

### Executions

```python
# List executions
response = client.executions.list(workflow_id="wf_123", status="running")

# Get execution details
response = client.executions.get("exec_123")

# Wait for completion (polling)
result = client.executions.wait_for_completion(
    "exec_123",
    poll_interval=1.0,
    timeout=300.0
)

# Stream execution events (SSE)
for event in client.executions.stream("exec_123"):
    print(f"Event: {event['type']}")
    if event["type"] == "execution:completed":
        print(f"Outputs: {event.get('outputs')}")
        break

# Cancel execution
response = client.executions.cancel("exec_123")
```

### Agents & Threads

```python
# List agents
response = client.agents.list()

# Create a conversation thread
response = client.agents.create_thread("agent_123", metadata={"user_id": "user_456"})
thread_id = response["data"]["id"]

# Send a message
response = client.threads.send_message(thread_id, "Hello!")

# Stream the response
for event in client.threads.send_message_stream(thread_id, "Tell me a story"):
    if event["type"] == "message:token":
        print(event.get("token", ""), end="", flush=True)
    elif event["type"] == "message:completed":
        print("\n\nDone!")
        break

# Get message history
response = client.threads.list_messages(thread_id)
```

### Knowledge Bases

```python
# List knowledge bases
response = client.knowledge_bases.list()

# Semantic search
response = client.knowledge_bases.query(
    "kb_123",
    "How do I reset my password?",
    top_k=5
)

for result in response["data"]["results"]:
    print(f"[{result['similarity']:.3f}] {result['content']}")
```

### Webhooks

```python
# Create a webhook
response = client.webhooks.create(
    name="My Webhook",
    url="https://my-app.com/webhook",
    events=["execution.completed", "execution.failed"]
)

# Test webhook
response = client.webhooks.test("wh_123")
print(f"Response time: {response['data']['response_time_ms']}ms")

# Delete webhook
client.webhooks.delete("wh_123")
```

## Error Handling

```python
from flowmaestro import (
    FlowMaestroClient,
    FlowMaestroError,
    AuthenticationError,
    RateLimitError,
    NotFoundError
)

try:
    client.workflows.get("invalid-id")
except NotFoundError:
    print("Workflow not found")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after}s")
except AuthenticationError:
    print("Invalid API key")
except FlowMaestroError as e:
    print(f"API error: {e.code} - {e.message}")
```

## Type Hints

The SDK is fully typed and includes a `py.typed` marker for PEP 561 compliance:

```python
from flowmaestro.types import Workflow, Execution, ExecutionStatus
```

## Requirements

- Python 3.9+
- httpx
- httpx-sse

## License

MIT
