# Public API & SDKs

FlowMaestro provides a RESTful public API that allows customers to integrate workflow execution, AI agents, and knowledge bases into their own applications. Official SDKs are available for JavaScript/TypeScript and Python.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [API Reference](#api-reference)
    - [Workflows](#workflows)
    - [Executions](#executions)
    - [Agents](#agents)
    - [Threads](#threads)
    - [Triggers](#triggers)
    - [Knowledge Bases](#knowledge-bases)
    - [Webhooks](#webhooks)
- [SDKs](#sdks)
    - [JavaScript/TypeScript SDK](#javascripttypescript-sdk)
    - [Python SDK](#python-sdk)
- [Real-Time Streaming](#real-time-streaming)
- [Webhook Events](#webhook-events)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## Overview

The FlowMaestro Public API enables programmatic access to:

- **Workflow Execution** - Trigger workflows with custom inputs, track execution progress, and retrieve results
- **AI Agent Conversations** - Create conversation threads with AI agents and send messages with streaming responses
- **Knowledge Base Search** - Perform semantic search across your knowledge bases for RAG applications
- **Webhook Management** - Configure outgoing webhooks to receive real-time notifications

### Base URL

```
Production: https://api.flowmaestro.io
Development: http://localhost:3001
```

### Response Format

All API responses follow a consistent JSON structure:

```json
// Success response
{
  "data": { ... },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}

// Paginated response
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_count": 150,
    "has_more": true
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}

// Error response
{
  "error": {
    "code": "validation_error",
    "message": "Invalid input data",
    "details": { "field": "name" }
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Authentication

The API uses API key authentication. API keys are created in the FlowMaestro dashboard under **Settings > API & Webhooks**.

### API Key Format

```
fm_live_<32-character-base62-string>
```

### Providing the API Key

You can provide your API key in one of two ways:

**Option 1: X-API-Key Header (Recommended)**

```http
GET /api/v1/workflows
X-API-Key: fm_live_abc123...
```

**Option 2: Authorization Bearer Header**

```http
GET /api/v1/workflows
Authorization: Bearer fm_live_abc123...
```

### Scopes

API keys are issued with specific scopes that control what operations they can perform:

| Scope                   | Description                         |
| ----------------------- | ----------------------------------- |
| `workflows:read`        | List and view workflow details      |
| `workflows:execute`     | Execute workflows                   |
| `executions:read`       | List and view execution details     |
| `executions:write`      | Cancel executions                   |
| `agents:read`           | List and view agent details         |
| `agents:execute`        | Send messages to agents             |
| `threads:read`          | List and view conversation threads  |
| `threads:write`         | Create and delete threads           |
| `triggers:read`         | List and view triggers              |
| `triggers:execute`      | Execute triggers                    |
| `knowledge-bases:read`  | List and view knowledge bases       |
| `knowledge-bases:query` | Perform semantic search             |
| `webhooks:read`         | List and view webhooks              |
| `webhooks:write`        | Create, update, and delete webhooks |

### Scope Bundles

For convenience, the dashboard offers pre-configured scope bundles:

| Bundle                  | Included Scopes                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Read Only**           | `workflows:read`, `executions:read`, `agents:read`, `threads:read`, `triggers:read`, `knowledge-bases:read`, `webhooks:read` |
| **Workflow Automation** | `workflows:read`, `workflows:execute`, `executions:read`, `executions:write`, `triggers:read`, `triggers:execute`            |
| **Agent Integration**   | `agents:read`, `agents:execute`, `threads:read`, `threads:write`                                                             |
| **Full Access**         | All scopes                                                                                                                   |

---

## Rate Limiting

API requests are rate limited per API key:

| Plan       | Requests per Minute | Requests per Day |
| ---------- | ------------------- | ---------------- |
| Free       | 60                  | 1,000            |
| Pro        | 300                 | 50,000           |
| Enterprise | Custom              | Custom           |

Rate limit headers are included in every response:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1705312800
```

When rate limited, you'll receive a `429 Too Many Requests` response:

```json
{
    "error": {
        "code": "rate_limit_exceeded",
        "message": "Rate limit exceeded. Try again in 30 seconds.",
        "details": {
            "retry_after": 30
        }
    }
}
```

---

## API Reference

### Workflows

#### List Workflows

```http
GET /api/v1/workflows
```

**Required Scopes:** `workflows:read`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-indexed) |
| `per_page` | integer | 20 | Items per page (max 100) |

**Response:**

```json
{
    "data": [
        {
            "id": "wf_abc123",
            "name": "Customer Onboarding",
            "description": "Automated customer onboarding workflow",
            "version": 3,
            "inputs": {
                "customer_email": {
                    "type": "string",
                    "label": "Customer Email",
                    "required": true
                },
                "plan_type": {
                    "type": "select",
                    "label": "Plan Type",
                    "required": true,
                    "options": ["free", "pro", "enterprise"]
                }
            },
            "created_at": "2024-01-10T08:00:00.000Z",
            "updated_at": "2024-01-15T14:30:00.000Z"
        }
    ],
    "pagination": {
        "page": 1,
        "per_page": 20,
        "total_count": 15,
        "has_more": false
    }
}
```

#### Get Workflow

```http
GET /api/v1/workflows/:id
```

**Required Scopes:** `workflows:read`

**Response:**

```json
{
    "data": {
        "id": "wf_abc123",
        "name": "Customer Onboarding",
        "description": "Automated customer onboarding workflow",
        "version": 3,
        "inputs": {
            "customer_email": {
                "type": "string",
                "label": "Customer Email",
                "required": true,
                "description": "The customer's email address"
            }
        },
        "created_at": "2024-01-10T08:00:00.000Z",
        "updated_at": "2024-01-15T14:30:00.000Z"
    }
}
```

#### Execute Workflow

```http
POST /api/v1/workflows/:id/execute
```

**Required Scopes:** `workflows:read`, `workflows:execute`

**Request Body:**

```json
{
    "inputs": {
        "customer_email": "john@example.com",
        "plan_type": "pro"
    }
}
```

**Response:** `202 Accepted`

```json
{
    "data": {
        "execution_id": "exec_xyz789",
        "workflow_id": "wf_abc123",
        "status": "pending",
        "inputs": {
            "customer_email": "john@example.com",
            "plan_type": "pro"
        }
    }
}
```

The execution starts asynchronously. Use the [Executions](#executions) endpoints to track progress.

---

### Executions

#### List Executions

```http
GET /api/v1/executions
```

**Required Scopes:** `executions:read`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number |
| `per_page` | integer | Items per page |
| `workflow_id` | string | Filter by workflow ID |
| `status` | string | Filter by status: `pending`, `running`, `completed`, `failed`, `cancelled` |

**Response:**

```json
{
  "data": [
    {
      "id": "exec_xyz789",
      "workflow_id": "wf_abc123",
      "status": "completed",
      "inputs": { "customer_email": "john@example.com" },
      "outputs": { "welcome_email_sent": true, "account_created": true },
      "error": null,
      "started_at": "2024-01-15T10:30:01.000Z",
      "completed_at": "2024-01-15T10:30:15.000Z",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

#### Get Execution

```http
GET /api/v1/executions/:id
```

**Required Scopes:** `executions:read`

**Response:**

```json
{
    "data": {
        "id": "exec_xyz789",
        "workflow_id": "wf_abc123",
        "status": "completed",
        "inputs": { "customer_email": "john@example.com" },
        "outputs": { "welcome_email_sent": true },
        "error": null,
        "started_at": "2024-01-15T10:30:01.000Z",
        "completed_at": "2024-01-15T10:30:15.000Z",
        "created_at": "2024-01-15T10:30:00.000Z"
    }
}
```

#### Cancel Execution

```http
POST /api/v1/executions/:id/cancel
```

**Required Scopes:** `executions:write`

**Response:**

```json
{
    "data": {
        "id": "exec_xyz789",
        "status": "cancelled"
    }
}
```

#### Stream Execution Events (SSE)

```http
GET /api/v1/executions/:id/events
```

**Required Scopes:** `executions:read`

Returns a Server-Sent Events stream. See [Real-Time Streaming](#real-time-streaming) for details.

---

### Agents

#### List Agents

```http
GET /api/v1/agents
```

**Required Scopes:** `agents:read`

**Response:**

```json
{
  "data": [
    {
      "id": "agent_abc123",
      "name": "Customer Support Agent",
      "description": "Handles customer support inquiries",
      "model": "gpt-4o",
      "provider": "openai",
      "created_at": "2024-01-10T08:00:00.000Z",
      "updated_at": "2024-01-15T14:30:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

#### Get Agent

```http
GET /api/v1/agents/:id
```

**Required Scopes:** `agents:read`

**Response:**

```json
{
    "data": {
        "id": "agent_abc123",
        "name": "Customer Support Agent",
        "description": "Handles customer support inquiries",
        "model": "gpt-4o",
        "provider": "openai",
        "system_prompt": "You are a helpful customer support agent...",
        "temperature": 0.7,
        "max_tokens": 2048,
        "available_tools": [
            {
                "id": "tool_123",
                "name": "search_knowledge_base",
                "description": "Search the knowledge base for answers",
                "type": "knowledge_base"
            }
        ],
        "created_at": "2024-01-10T08:00:00.000Z",
        "updated_at": "2024-01-15T14:30:00.000Z"
    }
}
```

#### Create Thread

```http
POST /api/v1/agents/:id/threads
```

**Required Scopes:** `agents:read`, `threads:write`

**Request Body:**

```json
{
    "metadata": {
        "user_id": "user_456",
        "session_id": "sess_789"
    }
}
```

**Response:** `201 Created`

```json
{
    "data": {
        "id": "thread_xyz789",
        "agent_id": "agent_abc123",
        "status": "active",
        "created_at": "2024-01-15T10:30:00.000Z"
    }
}
```

---

### Threads

#### Get Thread

```http
GET /api/v1/threads/:id
```

**Required Scopes:** `threads:read`

**Response:**

```json
{
    "data": {
        "id": "thread_xyz789",
        "agent_id": "agent_abc123",
        "title": "Password Reset Help",
        "status": "active",
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:45:00.000Z",
        "last_message_at": "2024-01-15T10:45:00.000Z"
    }
}
```

#### Get Thread Messages

```http
GET /api/v1/threads/:id/messages
```

**Required Scopes:** `threads:read`

**Response:**

```json
{
    "data": {
        "messages": [
            {
                "id": "msg_001",
                "role": "user",
                "content": "How do I reset my password?",
                "tool_calls": null,
                "created_at": "2024-01-15T10:30:00.000Z"
            },
            {
                "id": "msg_002",
                "role": "assistant",
                "content": "I can help you reset your password. Please follow these steps...",
                "tool_calls": [
                    {
                        "id": "call_123",
                        "name": "search_knowledge_base",
                        "arguments": { "query": "password reset" }
                    }
                ],
                "created_at": "2024-01-15T10:30:05.000Z"
            }
        ]
    }
}
```

#### Send Message

```http
POST /api/v1/threads/:id/messages
```

**Required Scopes:** `agents:execute`, `threads:write`

**Request Body:**

```json
{
    "content": "How do I reset my password?",
    "stream": false
}
```

**Response:**

```json
{
    "data": {
        "message_id": "msg_003",
        "thread_id": "thread_xyz789",
        "status": "completed"
    }
}
```

> **Note:** Set `stream: true` to receive the response via Server-Sent Events.

#### Delete Thread

```http
DELETE /api/v1/threads/:id
```

**Required Scopes:** `threads:write`

**Response:**

```json
{
    "data": {
        "id": "thread_xyz789",
        "deleted": true
    }
}
```

---

### Triggers

#### List Triggers

```http
GET /api/v1/triggers
```

**Required Scopes:** `triggers:read`

**Response:**

```json
{
  "data": [
    {
      "id": "trig_abc123",
      "workflow_id": "wf_xyz789",
      "name": "Daily Report Trigger",
      "trigger_type": "schedule",
      "enabled": true,
      "last_triggered_at": "2024-01-15T00:00:00.000Z",
      "trigger_count": 45,
      "created_at": "2024-01-01T08:00:00.000Z",
      "updated_at": "2024-01-15T00:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

#### Execute Trigger

```http
POST /api/v1/triggers/:id/execute
```

**Required Scopes:** `triggers:read`, `triggers:execute`

**Request Body:**

```json
{
    "inputs": {
        "report_date": "2024-01-15"
    }
}
```

**Response:** `202 Accepted`

```json
{
    "data": {
        "execution_id": "exec_xyz789",
        "workflow_id": "wf_abc123",
        "trigger_id": "trig_abc123",
        "status": "pending",
        "inputs": { "report_date": "2024-01-15" }
    }
}
```

---

### Knowledge Bases

#### List Knowledge Bases

```http
GET /api/v1/knowledge-bases
```

**Required Scopes:** `knowledge-bases:read`

**Response:**

```json
{
  "data": [
    {
      "id": "kb_abc123",
      "name": "Product Documentation",
      "description": "Complete product documentation and guides",
      "document_count": 150,
      "chunk_count": 2340,
      "created_at": "2024-01-01T08:00:00.000Z",
      "updated_at": "2024-01-15T14:30:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

#### Get Knowledge Base

```http
GET /api/v1/knowledge-bases/:id
```

**Required Scopes:** `knowledge-bases:read`

**Response:**

```json
{
    "data": {
        "id": "kb_abc123",
        "name": "Product Documentation",
        "description": "Complete product documentation and guides",
        "embedding_model": "text-embedding-3-small",
        "chunk_size": 512,
        "chunk_overlap": 50,
        "document_count": 150,
        "chunk_count": 2340,
        "created_at": "2024-01-01T08:00:00.000Z",
        "updated_at": "2024-01-15T14:30:00.000Z"
    }
}
```

#### Query Knowledge Base (Semantic Search)

```http
POST /api/v1/knowledge-bases/:id/query
```

**Required Scopes:** `knowledge-bases:read`, `knowledge-bases:query`

**Request Body:**

```json
{
    "query": "How do I reset my password?",
    "top_k": 5
}
```

**Response:**

```json
{
    "data": {
        "results": [
            {
                "id": "chunk_001",
                "content": "To reset your password, go to Settings > Security > Change Password...",
                "document_id": "doc_abc123",
                "document_name": "user-guide.pdf",
                "score": 0.92,
                "metadata": {
                    "page": 15,
                    "section": "Account Settings"
                }
            },
            {
                "id": "chunk_002",
                "content": "If you forgot your password, click 'Forgot Password' on the login page...",
                "document_id": "doc_def456",
                "document_name": "faq.md",
                "score": 0.87,
                "metadata": {}
            }
        ],
        "query": "How do I reset my password?",
        "top_k": 5
    }
}
```

---

### Webhooks

#### List Webhooks

```http
GET /api/v1/webhooks
```

**Required Scopes:** `webhooks:read`

**Response:**

```json
{
  "data": [
    {
      "id": "wh_abc123",
      "name": "Execution Notifications",
      "url": "https://my-app.com/webhooks/flowmaestro",
      "events": ["execution.completed", "execution.failed"],
      "is_active": true,
      "created_at": "2024-01-10T08:00:00.000Z",
      "updated_at": "2024-01-15T14:30:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

#### Create Webhook

```http
POST /api/v1/webhooks
```

**Required Scopes:** `webhooks:write`

**Request Body:**

```json
{
    "name": "Execution Notifications",
    "url": "https://my-app.com/webhooks/flowmaestro",
    "events": ["execution.completed", "execution.failed"],
    "headers": {
        "X-Custom-Header": "my-value"
    }
}
```

**Response:** `201 Created`

```json
{
    "data": {
        "id": "wh_abc123",
        "name": "Execution Notifications",
        "url": "https://my-app.com/webhooks/flowmaestro",
        "secret": "whsec_abc123xyz...",
        "events": ["execution.completed", "execution.failed"],
        "headers": { "X-Custom-Header": "my-value" },
        "is_active": true,
        "created_at": "2024-01-15T10:30:00.000Z"
    }
}
```

> **Important:** The `secret` is only returned once when the webhook is created. Store it securely for signature verification.

#### Update Webhook

```http
PATCH /api/v1/webhooks/:id
```

**Required Scopes:** `webhooks:write`

**Request Body:**

```json
{
    "name": "Updated Webhook Name",
    "events": ["execution.completed", "execution.failed", "execution.started"],
    "is_active": false
}
```

#### Delete Webhook

```http
DELETE /api/v1/webhooks/:id
```

**Required Scopes:** `webhooks:write`

#### Test Webhook

```http
POST /api/v1/webhooks/:id/test
```

**Required Scopes:** `webhooks:write`

Sends a test event to verify your endpoint is receiving webhooks correctly.

**Response:**

```json
{
    "data": {
        "success": true,
        "status_code": 200,
        "message": "Test webhook delivered successfully"
    }
}
```

#### List Webhook Deliveries

```http
GET /api/v1/webhooks/:id/deliveries
```

**Required Scopes:** `webhooks:read`

**Response:**

```json
{
  "data": [
    {
      "id": "del_abc123",
      "event_type": "execution.completed",
      "status": "delivered",
      "attempts": 1,
      "response_status": 200,
      "error_message": null,
      "created_at": "2024-01-15T10:30:00.000Z",
      "last_attempt_at": "2024-01-15T10:30:01.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

## SDKs

### JavaScript/TypeScript SDK

**Installation:**

```bash
npm install @flowmaestro/sdk
```

**Basic Usage:**

```typescript
import { FlowMaestroClient } from "@flowmaestro/sdk";

const client = new FlowMaestroClient({
    apiKey: process.env.FLOWMAESTRO_API_KEY!,
    // Optional configuration
    baseUrl: "https://api.flowmaestro.io",
    timeout: 30000,
    maxRetries: 3
});

// List workflows
const { data: workflows } = await client.workflows.list();

// Execute a workflow
const { data } = await client.workflows.execute("wf_123", {
    inputs: { customer_email: "john@example.com" }
});

// Wait for completion (polling)
const execution = await client.executions.waitForCompletion(data.execution_id);
console.log("Result:", execution.outputs);

// Or stream execution events (SSE)
for await (const event of client.executions.streamIterator(data.execution_id)) {
    console.log(`Event: ${event.type}`);
    if (event.type === "execution:completed") {
        console.log("Outputs:", event.outputs);
        break;
    }
}
```

**Resources:**

- `client.workflows` - List, get, execute workflows
- `client.executions` - List, get, cancel, waitForCompletion, stream
- `client.agents` - List, get, createThread
- `client.threads` - Get, listMessages, sendMessage, delete
- `client.triggers` - List, execute
- `client.knowledgeBases` - List, get, query
- `client.webhooks` - List, get, create, update, delete, test

**Error Handling:**

```typescript
import {
    FlowMaestroClient,
    FlowMaestroError,
    AuthenticationError,
    RateLimitError,
    NotFoundError
} from "@flowmaestro/sdk";

try {
    await client.workflows.get("invalid-id");
} catch (error) {
    if (error instanceof NotFoundError) {
        console.log("Workflow not found");
    } else if (error instanceof RateLimitError) {
        console.log(`Rate limited. Retry after ${error.retryAfter}s`);
    } else if (error instanceof AuthenticationError) {
        console.log("Invalid API key");
    } else if (error instanceof FlowMaestroError) {
        console.log(`API error: ${error.code} - ${error.message}`);
    }
}
```

### Python SDK

**Installation:**

```bash
pip install flowmaestro
```

**Synchronous Client:**

```python
from flowmaestro import FlowMaestroClient

with FlowMaestroClient(api_key="fm_live_...") as client:
    # List workflows
    response = client.workflows.list()
    for workflow in response["data"]:
        print(f"- {workflow['name']} ({workflow['id']})")

    # Execute a workflow
    response = client.workflows.execute(
        "wf_123",
        inputs={"customer_email": "john@example.com"}
    )
    execution_id = response["data"]["execution_id"]

    # Wait for completion (polling)
    result = client.executions.wait_for_completion(execution_id)
    print(f"Result: {result['outputs']}")

    # Or stream execution events (SSE)
    for event in client.executions.stream(execution_id):
        print(f"Event: {event['type']}")
        if event["type"] == "execution:completed":
            print(f"Outputs: {event.get('outputs')}")
            break
```

**Asynchronous Client:**

```python
import asyncio
from flowmaestro import AsyncFlowMaestroClient

async def main():
    async with AsyncFlowMaestroClient(api_key="fm_live_...") as client:
        # Execute a workflow
        response = await client.workflows.execute(
            "wf_123",
            inputs={"customer_email": "john@example.com"}
        )
        execution_id = response["data"]["execution_id"]

        # Stream execution events
        async for event in client.executions.stream(execution_id):
            print(f"Event: {event['type']}")
            if event["type"] == "execution:completed":
                print(f"Outputs: {event.get('outputs')}")
                break

asyncio.run(main())
```

**Error Handling:**

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

---

## Real-Time Streaming

The API supports Server-Sent Events (SSE) for real-time updates during workflow execution and agent conversations.

### Execution Events

Connect to `/api/v1/executions/:id/events` to receive real-time execution updates:

```
event: connected
data: {"execution_id": "exec_123", "status": "running"}

event: node:started
data: {"execution_id": "exec_123", "node_id": "node_1", "node_type": "llm"}

event: node:completed
data: {"execution_id": "exec_123", "node_id": "node_1", "outputs": {...}}

event: execution:completed
data: {"execution_id": "exec_123", "status": "completed", "outputs": {...}}
```

**Event Types:**
| Event | Description |
|-------|-------------|
| `connected` | Initial connection established |
| `execution:started` | Execution has started |
| `execution:progress` | Progress update (percentage) |
| `node:started` | A node has started executing |
| `node:completed` | A node has finished successfully |
| `node:failed` | A node has failed |
| `execution:completed` | Execution completed successfully |
| `execution:failed` | Execution failed |
| `execution:cancelled` | Execution was cancelled |

### Connection Handling

The stream includes periodic heartbeats (`:heartbeat` comments) to keep the connection alive. The connection automatically closes after a terminal event (`execution:completed`, `execution:failed`, `execution:cancelled`).

**Example with curl:**

```bash
curl -N -H "X-API-Key: fm_live_..." \
  "https://api.flowmaestro.io/api/v1/executions/exec_123/events"
```

---

## Webhook Events

When you configure webhooks, FlowMaestro will send HTTP POST requests to your endpoint when events occur.

### Event Types

| Event                      | Description                                 |
| -------------------------- | ------------------------------------------- |
| `execution.started`        | A workflow execution has started            |
| `execution.completed`      | A workflow execution completed successfully |
| `execution.failed`         | A workflow execution failed                 |
| `thread.message.created`   | A message was created in a thread           |
| `thread.message.completed` | An agent response was completed             |

### Webhook Payload

```json
{
    "id": "evt_abc123",
    "event": "execution.completed",
    "created_at": "2024-01-15T10:30:00.000Z",
    "data": {
        "execution_id": "exec_xyz789",
        "workflow_id": "wf_abc123",
        "status": "completed",
        "outputs": { "result": "success" }
    }
}
```

### Signature Verification

All webhook requests include a signature header for verification:

```http
X-FlowMaestro-Signature: v1=abc123...
X-FlowMaestro-Delivery-ID: evt_abc123
```

**Verify the signature:**

```typescript
import crypto from "crypto";

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    return `v1=${expectedSignature}` === signature;
}

// In your webhook handler
app.post("/webhooks/flowmaestro", (req, res) => {
    const signature = req.headers["x-flowmaestro-signature"];
    const isValid = verifyWebhookSignature(
        JSON.stringify(req.body),
        signature,
        process.env.WEBHOOK_SECRET!
    );

    if (!isValid) {
        return res.status(401).send("Invalid signature");
    }

    // Process the webhook...
});
```

### Retry Policy

Failed webhook deliveries are retried with exponential backoff:

- Attempt 1: Immediate
- Attempt 2: After 1 minute
- Attempt 3: After 5 minutes
- Attempt 4: After 30 minutes
- Attempt 5: After 2 hours

A delivery is considered failed if:

- Your endpoint returns a non-2xx status code
- The request times out (10 seconds)
- The connection fails

---

## Error Handling

### Error Codes

| Code                  | HTTP Status | Description                               |
| --------------------- | ----------- | ----------------------------------------- |
| `invalid_api_key`     | 401         | API key is missing, invalid, or malformed |
| `expired_api_key`     | 401         | API key has expired                       |
| `revoked_api_key`     | 401         | API key has been revoked                  |
| `insufficient_scope`  | 403         | API key lacks required scopes             |
| `rate_limit_exceeded` | 429         | Too many requests                         |
| `resource_not_found`  | 404         | Requested resource doesn't exist          |
| `validation_error`    | 400         | Invalid request data                      |
| `execution_failed`    | 500         | Workflow execution error                  |
| `internal_error`      | 500         | Internal server error                     |
| `service_unavailable` | 503         | Service temporarily unavailable           |

### Error Response Format

```json
{
    "error": {
        "code": "insufficient_scope",
        "message": "Missing required scopes: workflows:execute",
        "details": {
            "required_scopes": ["workflows:read", "workflows:execute"],
            "missing_scopes": ["workflows:execute"],
            "your_scopes": ["workflows:read", "executions:read"]
        }
    },
    "meta": {
        "request_id": "req_abc123",
        "timestamp": "2024-01-15T10:30:00.000Z"
    }
}
```

---

## Examples

Example applications demonstrating SDK usage are available in the `/examples` directory:

| Example                    | Description                             | Languages  |
| -------------------------- | --------------------------------------- | ---------- |
| `basic-workflow-execution` | Execute a workflow and wait for results | JS, Python |
| `streaming-workflow`       | Real-time progress tracking with SSE    | JS, Python |
| `batch-processing`         | Process CSV data through workflows      | JS, Python |
| `ai-chatbot`               | Customer support chatbot integration    | JS, Python |
| `semantic-search`          | RAG-powered search interface            | JS, Python |
| `webhook-receiver`         | Handle webhook notifications            | JS, Python |
| `cli-tool`                 | Command-line workflow runner            | JS, Python |

See the [examples README](/examples/README.md) for detailed instructions.

---

## SDK Source Code

- **JavaScript SDK**: [`/sdks/javascript`](/sdks/javascript)
- **Python SDK**: [`/sdks/python`](/sdks/python)
