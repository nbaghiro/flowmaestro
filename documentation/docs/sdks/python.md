---
sidebar_position: 2
title: Python SDK
---

# Python SDK

Official Python SDK for FlowMaestro with both synchronous and asynchronous clients.

## Installation

```bash
pip install flowmaestro
```

**Requirements:** Python 3.9+

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

## Configuration

```python
from flowmaestro import FlowMaestroClient

client = FlowMaestroClient(
    # Required: Your API key
    api_key="fm_live_your_api_key",

    # Optional: Custom base URL (default: https://api.flowmaestro.io)
    base_url="https://api.flowmaestro.io",

    # Optional: Request timeout in seconds (default: 30.0)
    timeout=30.0,

    # Optional: Max retry attempts (default: 3)
    max_retries=3,

    # Optional: Custom headers
    headers={
        "X-Custom-Header": "value"
    }
)
```

## Workflows

### List Workflows

```python
response = client.workflows.list(page=1, per_page=20)

for workflow in response["data"]:
    print(f"{workflow['name']} ({workflow['id']})")

print(f"Total: {response['pagination']['total_count']}")
```

### Get Workflow

```python
response = client.workflows.get("wf_abc123")

workflow = response["data"]
print(f"Workflow: {workflow['name']}")
print(f"Input Schema: {workflow['input_schema']}")
```

### Execute Workflow

```python
response = client.workflows.execute("wf_abc123", inputs={
    "customer_email": "john@example.com",
    "customer_name": "John Doe"
})

print(f"Execution ID: {response['data']['execution_id']}")
print(f"Status: {response['data']['status']}")  # "pending"
```

## Executions

### Get Execution Status

```python
response = client.executions.get("exec_xyz789")

execution = response["data"]
print(f"Status: {execution['status']}")

if execution["status"] == "completed":
    print(f"Outputs: {execution['outputs']}")
```

### Wait for Completion

```python
# Wait with polling (default: 1 second interval, 5 minute timeout)
result = client.executions.wait_for_completion(
    "exec_xyz789",
    poll_interval=1.0,  # Check every second
    timeout=300.0       # 5 minute timeout
)

if result["status"] == "completed":
    print(f"Success: {result['outputs']}")
else:
    print(f"Failed: {result['error']}")
```

### Stream Execution Events

```python
# Stream events using Server-Sent Events
for event in client.executions.stream("exec_xyz789"):
    print(f"Event: {event['type']}")

    if event["type"] == "execution:completed":
        print(f"Outputs: {event.get('outputs')}")
        break

    if event["type"] == "execution:failed":
        print(f"Error: {event.get('error')}")
        break
```

### Async Streaming

```python
async for event in client.executions.stream("exec_xyz789"):
    if event["type"] == "node:started":
        print(f"Starting node: {event['node_id']}")
    elif event["type"] == "execution:completed":
        print(f"Done: {event['outputs']}")
        break
```

### Cancel Execution

```python
response = client.executions.cancel("exec_xyz789")
print(f"Cancelled: {response['data']['status'] == 'cancelled'}")
```

## Agents & Threads

### List Agents

```python
response = client.agents.list()

for agent in response["data"]:
    print(f"{agent['name']} ({agent['model']})")
```

### Create Thread

```python
response = client.agents.create_thread(
    "agent_abc123",
    metadata={"user_id": "user_456"}
)

thread_id = response["data"]["id"]
print(f"Thread ID: {thread_id}")
```

### Send Message

```python
response = client.threads.send_message("thread_xyz789", "What is my order status?")

print(f"Response: {response['data']['content']}")
print(f"Tokens used: {response['data']['usage']['total_tokens']}")
```

### Stream Message Response

```python
for event in client.threads.send_message_stream("thread_xyz789", "Tell me a story"):
    if event["type"] == "message:token":
        print(event.get("token", ""), end="", flush=True)
    elif event["type"] == "message:completed":
        print("\n\nDone!")
        break
```

### Get Thread Messages

```python
response = client.threads.list_messages("thread_xyz789")

for msg in response["data"]:
    print(f"[{msg['role']}]: {msg['content']}")
```

### Delete Thread

```python
client.threads.delete("thread_xyz789")
```

## Knowledge Bases

### List Knowledge Bases

```python
response = client.knowledge_bases.list()

for kb in response["data"]:
    print(f"{kb['name']} - {kb['document_count']} documents")
```

### Query Knowledge Base

```python
response = client.knowledge_bases.query(
    "kb_abc123",
    "How do I reset my password?",
    top_k=5
)

for result in response["data"]["results"]:
    print(f"Score: {result['similarity']:.3f}")
    print(f"Content: {result['content']}")
    print(f"Source: {result['document_name']}")
    print("---")
```

## Triggers

### List Triggers

```python
response = client.triggers.list(workflow_id="wf_abc123")

for trigger in response["data"]:
    print(f"{trigger['name']} ({trigger['type']})")
```

### Execute Trigger

```python
response = client.triggers.execute("trigger_abc123", inputs={
    "event_type": "user_signup",
    "user_id": "user_123"
})

print(f"Execution ID: {response['data']['execution_id']}")
```

## Webhooks

### Create Webhook

```python
response = client.webhooks.create(
    name="My Webhook",
    url="https://api.example.com/webhook",
    events=["execution.completed", "execution.failed"]
)

# Store the secret securely!
print(f"Webhook ID: {response['data']['id']}")
print(f"Secret: {response['data']['secret']}")
```

### List Webhooks

```python
response = client.webhooks.list()

for webhook in response["data"]:
    print(f"{webhook['name']} - {webhook['url']}")
```

### Test Webhook

```python
response = client.webhooks.test("wh_abc123")

if response["data"]["success"]:
    print(f"Webhook working! Response time: {response['data']['response_time_ms']}ms")
else:
    print(f"Webhook failed: {response['data']['error_message']}")
```

### Delete Webhook

```python
client.webhooks.delete("wh_abc123")
```

## Error Handling

```python
from flowmaestro import (
    FlowMaestroClient,
    FlowMaestroError,
    AuthenticationError,
    NotFoundError,
    RateLimitError,
    ValidationError
)

try:
    response = client.workflows.execute("wf_invalid")
except NotFoundError:
    print("Workflow not found")
except AuthenticationError:
    print("Invalid API key")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after}s")
except ValidationError as e:
    print(f"Validation error: {e.details}")
except FlowMaestroError as e:
    print(f"API error: {e.code} - {e.message}")
```

## Type Hints

The SDK is fully typed and includes a `py.typed` marker for PEP 561 compliance:

```python
from flowmaestro.types import Workflow, Execution, ExecutionStatus

def process_workflow(workflow: Workflow) -> None:
    print(f"Processing: {workflow['name']}")
```

## Context Managers

Both clients support context managers for automatic cleanup:

```python
# Sync
with FlowMaestroClient(api_key="...") as client:
    response = client.workflows.list()

# Async
async with AsyncFlowMaestroClient(api_key="...") as client:
    response = await client.workflows.list()
```

Or manually close when done:

```python
client = FlowMaestroClient(api_key="...")
try:
    response = client.workflows.list()
finally:
    client.close()
```
