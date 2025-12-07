# FlowMaestro MCP Tools

Complete guide to FlowMaestro's auto-wrapped MCP tools system, which exposes connected integration provider operations as Model Context Protocol (MCP) compatible tools for AI agents.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [How Auto-Wrapping Works](#how-auto-wrapping-works)
4. [MCP Adapter Pattern](#mcp-adapter-pattern)
5. [Tool Schema Generation](#tool-schema-generation)
6. [Execution Flow](#execution-flow)
7. [Using MCP Tools in Agents](#using-mcp-tools-in-agents)
8. [Available Provider Tools](#available-provider-tools)
9. [Adding MCP Support to a Provider](#adding-mcp-support-to-a-provider)
10. [Security & Multi-Tenancy](#security--multi-tenancy)

---

## Overview

FlowMaestro automatically exposes connected integration provider operations as MCP-compatible tools for AI agents. When a user connects an OAuth integration (Slack, GitHub, Notion, etc.) or API key service, the provider's operations become immediately available as tools that agents can invoke.

### Key Features

- **Zero Configuration**: Tools auto-available when integrations are connected
- **Dual Interface**: Same operations serve both workflows and agents
- **Type Safety**: Zod schemas converted to JSON Schema for MCP compatibility
- **Connection Reuse**: Same execution path as workflow integrations (connection pooling, retry logic)
- **Multi-Provider**: 15+ providers with MCP adapters

### Why MCP?

The Model Context Protocol (MCP) provides a standardized way for AI models to interact with external tools. By wrapping provider operations as MCP tools, FlowMaestro enables:

- Consistent tool calling across different LLM providers (OpenAI, Anthropic, Google, Cohere)
- Standardized JSON Schema for tool parameters
- Unified execution and error handling

---

## Architecture

### System Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                         AI Agent                                │
│                   (OpenAI, Anthropic, etc.)                     │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ Tool Call
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ExecutionRouter                            │
│            Routes tool calls to provider adapters               │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Provider MCP Adapter                         │
│     (SlackMCPAdapter, GitHubMCPAdapter, NotionMCPAdapter, ...)  │
│         Wraps operations as MCP-compatible tools                │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Provider Operations                           │
│    (sendMessage, listChannels, createIssue, queryDatabase, ...) │
│              Actual API execution logic                         │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Provider HTTP Client                         │
│      Connection pooling, token refresh, retry logic             │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component          | Location                                             | Purpose                                   |
| ------------------ | ---------------------------------------------------- | ----------------------------------------- |
| `ExecutionRouter`  | `backend/src/integrations/core/ExecutionRouter.ts`   | Routes tool calls to appropriate provider |
| `ProviderRegistry` | `backend/src/integrations/core/ProviderRegistry.ts`  | Discovers and loads providers on demand   |
| `BaseProvider`     | `backend/src/integrations/core/BaseProvider.ts`      | Abstract base class for providers         |
| MCP Adapters       | `backend/src/integrations/providers/{provider}/mcp/` | Per-provider MCP tool wrappers            |

---

## How Auto-Wrapping Works

### The Dual Interface Pattern

Each integration provider in FlowMaestro implements two execution interfaces from the same underlying operations:

1. **Direct API** - High-performance HTTP calls for workflow node execution
2. **MCP Tools** - Standardized tool interface for AI agent tool calls

Both interfaces share:

- The same Zod validation schemas
- The same HTTP client with connection pooling
- The same retry and error handling logic
- The same token refresh mechanisms

### Provider Contract

Every provider implements the `IProvider` interface which requires MCP support:

```typescript
interface IProvider {
    // ... other methods ...

    // MCP tool interface (agents)
    getMCPTools(): MCPTool[];
    executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown>;
}
```

### Tool Definition Structure

MCP tools follow this structure:

```typescript
interface MCPTool {
    name: string; // e.g., "slack_sendMessage"
    description: string; // Human-readable description
    inputSchema: JSONSchema; // JSON Schema for parameters
    executeRef?: string; // Reference to underlying operation ID
}
```

---

## MCP Adapter Pattern

Each provider has an MCP adapter that wraps its operations as tools.

### Adapter Structure

```
backend/src/integrations/providers/slack/
├── SlackProvider.ts           # Main provider class
├── client/
│   └── SlackClient.ts         # HTTP client wrapper
├── operations/
│   ├── sendMessage.ts         # Send message operation
│   ├── listChannels.ts        # List channels operation
│   └── index.ts               # Export all operations
└── mcp/
    └── SlackMCPAdapter.ts     # MCP tool wrapper ← This is the adapter
```

### Adapter Implementation

The MCP adapter wraps all provider operations as tools:

```typescript
// backend/src/integrations/providers/slack/mcp/SlackMCPAdapter.ts

export class SlackMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools for this provider
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `slack_${op.id}`, // Prefixed with provider name
            description: op.description,
            inputSchema: op.inputSchemaJSON, // JSON Schema (not Zod)
            executeRef: op.id
        }));
    }

    /**
     * Execute an MCP tool call
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: SlackClient
    ): Promise<unknown> {
        // Remove provider prefix to get operation ID
        const operationId = toolName.replace(/^slack_/, "");

        // Route to appropriate operation executor
        switch (operationId) {
            case "sendMessage":
                return await executeSendMessage(client, params);
            case "listChannels":
                return await executeListChannels(client, params);
            default:
                throw new Error(`Unknown Slack operation: ${operationId}`);
        }
    }
}
```

### Provider Integration

The provider creates and uses the adapter:

```typescript
// backend/src/integrations/providers/slack/SlackProvider.ts

export class SlackProvider extends BaseProvider {
    private mcpAdapter: SlackMCPAdapter;

    constructor() {
        super();

        // Register operations
        this.registerOperation(sendMessageOperation);
        this.registerOperation(listChannelsOperation);

        // Initialize MCP adapter with registered operations
        this.mcpAdapter = new SlackMCPAdapter(this.operations);
    }

    /**
     * Get MCP tools (delegates to adapter)
     */
    getMCPTools(): MCPTool[] {
        return this.mcpAdapter.getTools();
    }

    /**
     * Execute MCP tool (delegates to adapter)
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const client = this.getOrCreateClient(connection);
        return await this.mcpAdapter.executeTool(toolName, params, client);
    }
}
```

---

## Tool Schema Generation

### From Zod to JSON Schema

Provider operations define input validation using Zod schemas. These are automatically converted to JSON Schema for MCP compatibility:

```typescript
// Operation definition with Zod schema
import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";

export const sendMessageSchema = z.object({
    channel: z.string().describe("Channel ID or name"),
    text: z.string().describe("Message text"),
    thread_ts: z.string().optional().describe("Thread timestamp for replies")
});

export const sendMessageOperation: OperationDefinition = {
    id: "sendMessage",
    name: "Send Message",
    description: "Send a message to a Slack channel or direct message",
    category: "messaging",
    inputSchema: sendMessageSchema, // Zod for TypeScript validation
    inputSchemaJSON: toJSONSchema(sendMessageSchema), // JSON Schema for MCP
    retryable: true,
    timeout: 10000
};
```

### Resulting JSON Schema

The Zod schema converts to:

```json
{
    "type": "object",
    "properties": {
        "channel": {
            "type": "string",
            "description": "Channel ID or name"
        },
        "text": {
            "type": "string",
            "description": "Message text"
        },
        "thread_ts": {
            "type": "string",
            "description": "Thread timestamp for replies"
        }
    },
    "required": ["channel", "text"]
}
```

### Tool Naming Convention

Tools follow the pattern: `{provider}_{operationId}`

| Provider | Operation     | Tool Name              |
| -------- | ------------- | ---------------------- |
| Slack    | sendMessage   | `slack_sendMessage`    |
| GitHub   | createIssue   | `github_createIssue`   |
| Notion   | queryDatabase | `notion_queryDatabase` |
| Airtable | listRecords   | `airtable_listRecords` |

---

## Execution Flow

### Agent Tool Call Execution

When an AI agent invokes an MCP tool:

```
1. Agent calls tool: slack_sendMessage({ channel: "#general", text: "Hello!" })
                                │
                                ▼
2. executeToolCall() in agent-activities.ts
   - Finds tool in agent's available_tools
   - Validates arguments against tool schema
   - Detects tool.type === "mcp"
                                │
                                ▼
3. executeMCPToolCall()
   - Loads connection from tool.config.connectionId
   - Verifies user ownership of connection
   - Calls ExecutionRouter.executeMCPTool()
                                │
                                ▼
4. ExecutionRouter.executeMCPTool()
   - Loads provider from ProviderRegistry
   - Calls provider.executeMCPTool()
                                │
                                ▼
5. SlackProvider.executeMCPTool()
   - Gets/creates pooled HTTP client
   - Delegates to SlackMCPAdapter.executeTool()
                                │
                                ▼
6. SlackMCPAdapter.executeTool()
   - Routes to executeSendMessage()
   - Returns operation result
                                │
                                ▼
7. Result returned to agent as JSON
```

### Relevant Code Paths

```typescript
// backend/src/temporal/activities/agent/agent-activities.ts

async function executeMCPToolCall(input: ExecuteMCPToolInput): Promise<JsonObject> {
    const { tool, arguments: args, userId } = input;

    // Load connection
    const connection = await connectionRepo.findByIdWithData(tool.config.connectionId);

    // Verify ownership
    if (connection.user_id !== userId) {
        throw new Error("Access denied to connection");
    }

    // Execute via router
    const result = await executionRouter.executeMCPTool(
        tool.config.provider,
        tool.name,
        args,
        connection
    );

    return {
        success: true,
        provider: tool.config.provider,
        toolName: tool.name,
        result: result
    };
}
```

---

## Using MCP Tools in Agents

### Configuring Agent Tools

When creating or editing an agent, MCP tools are added via the `available_tools` array:

```typescript
{
    id: "tool-uuid",
    name: "slack_sendMessage",
    description: "Send a message to a Slack channel",
    type: "mcp",
    schema: {
        type: "object",
        properties: {
            channel: { type: "string", description: "Channel ID or name" },
            text: { type: "string", description: "Message text" }
        },
        required: ["channel", "text"]
    },
    config: {
        connectionId: "connection-uuid",  // User's Slack connection
        provider: "slack"
    }
}
```

### Agent Builder UI

The frontend provides a tool picker that:

1. Lists all user's connected integrations
2. Shows available operations for each integration
3. Automatically populates tool schema and config
4. Allows selection of multiple tools per agent

### Tool Discovery API

```http
GET /api/integrations/:provider/operations
Authorization: Bearer {token}

Response:
{
    "success": true,
    "data": [
        {
            "id": "sendMessage",
            "name": "Send Message",
            "description": "Send a message to a Slack channel",
            "category": "messaging",
            "inputSchema": { ... },
            "retryable": true
        },
        ...
    ]
}
```

---

## Available Provider Tools

FlowMaestro includes MCP adapters for 15+ integration providers:

### Messaging & Communication

| Provider           | Tools                     | Auth      |
| ------------------ | ------------------------- | --------- |
| Slack              | sendMessage, listChannels | OAuth 2.0 |
| WhatsApp           | sendMessage, sendTemplate | API Key   |
| Facebook Messenger | sendMessage               | OAuth 2.0 |
| Instagram          | sendMessage, getMedia     | OAuth 2.0 |

### Productivity

| Provider | Tools                                    | Auth      |
| -------- | ---------------------------------------- | --------- |
| Notion   | queryDatabase, createPage, updatePage    | OAuth 2.0 |
| Coda     | listDocs, getDoc, listTables, upsertRows | API Key   |
| Airtable | listRecords, createRecord, updateRecord  | API Key   |

### Development

| Provider | Tools                              | Auth      |
| -------- | ---------------------------------- | --------- |
| GitHub   | createIssue, listRepos, createPR   | OAuth 2.0 |
| Jira     | createIssue, getIssue, updateIssue | OAuth 2.0 |

### CRM & Sales

| Provider   | Tools                                  | Auth      |
| ---------- | -------------------------------------- | --------- |
| HubSpot    | createContact, getContact, createDeal  | OAuth 2.0 |
| Salesforce | query, createRecord, updateRecord      | OAuth 2.0 |
| Apollo     | searchPeople, getContact, enrichPerson | API Key   |

### Support

| Provider | Tools                                 | Auth      |
| -------- | ------------------------------------- | --------- |
| Zendesk  | createTicket, getTicket, updateTicket | OAuth 2.0 |

---

## Adding MCP Support to a Provider

### Step-by-Step Process

**1. Create the MCP adapter file:**

```
providers/newprovider/mcp/NewProviderMCPAdapter.ts
```

**2. Implement the adapter:**

```typescript
import type { MCPTool, OperationDefinition } from "../../../core/types";
import { NewProviderClient } from "../client/NewProviderClient";
import { executeOperation1 } from "../operations/operation1";
import { executeOperation2 } from "../operations/operation2";

export class NewProviderMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `newprovider_${op.id}`,
            description: op.description,
            inputSchema: op.inputSchemaJSON,
            executeRef: op.id
        }));
    }

    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: NewProviderClient
    ): Promise<unknown> {
        const operationId = toolName.replace(/^newprovider_/, "");

        switch (operationId) {
            case "operation1":
                return await executeOperation1(client, params);
            case "operation2":
                return await executeOperation2(client, params);
            default:
                throw new Error(`Unknown operation: ${operationId}`);
        }
    }
}
```

**3. Integrate into provider:**

```typescript
// NewProviderProvider.ts
import { NewProviderMCPAdapter } from "./mcp/NewProviderMCPAdapter";

export class NewProviderProvider extends BaseProvider {
    private mcpAdapter: NewProviderMCPAdapter;

    constructor() {
        super();
        this.registerOperation(operation1);
        this.registerOperation(operation2);
        this.mcpAdapter = new NewProviderMCPAdapter(this.operations);
    }

    getMCPTools(): MCPTool[] {
        return this.mcpAdapter.getTools();
    }

    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const client = this.getOrCreateClient(connection);
        return await this.mcpAdapter.executeTool(toolName, params, client);
    }
}
```

**4. Ensure operations have JSON Schema:**

Every operation must define `inputSchemaJSON`:

```typescript
export const operation1: OperationDefinition = {
    id: "operation1",
    name: "Operation One",
    description: "Description for the operation",
    category: "category",
    inputSchema: zodSchema,
    inputSchemaJSON: toJSONSchema(zodSchema), // Required for MCP
    retryable: true
};
```

---

## Security & Multi-Tenancy

### Connection Ownership

Every MCP tool execution verifies connection ownership:

```typescript
// Verify the connection belongs to the user making the request
if (connection.user_id !== userId) {
    throw new Error("Access denied to connection");
}
```

### Credential Isolation

- Connections are stored encrypted (AES-256-GCM)
- Users can only access their own connections
- Tool configs reference connection IDs, not raw credentials

### Token Refresh

OAuth tokens are refreshed automatically:

- Background scheduler proactively refreshes tokens expiring within 10 minutes
- On-demand refresh during execution if token expires within 5 minutes
- Transparent to agents - they never see expired tokens

### Rate Limiting

Provider-specific rate limits are enforced:

```typescript
readonly capabilities: ProviderCapabilities = {
    rateLimit: {
        tokensPerMinute: 60,
        burstSize: 10
    }
};
```

---

## Related Documentation

- **[Integration System](./.docs/integrations-system.md)** - Provider SDK architecture
- **[Agent Architecture](./.docs/agent-architecture.md)** - Full agent system documentation
- **[Temporal Workflows](./.docs/temporal-workflows.md)** - Durable execution

---

## Summary

FlowMaestro's MCP tools system provides:

1. **Automatic Tool Wrapping** - Provider operations become MCP tools with zero configuration
2. **Unified Execution** - Same code path for workflows and agents
3. **Type Safety** - Zod schemas converted to JSON Schema for MCP compatibility
4. **Multi-Provider** - 15+ integration providers with MCP adapters
5. **Security** - Multi-tenant isolation with encrypted credential storage
6. **Performance** - Connection pooling and token refresh reused from direct API

The architecture ensures that adding MCP support to a new provider requires only a thin adapter layer, while all the heavy lifting (HTTP clients, connection pooling, retry logic, token refresh) is handled by the existing provider infrastructure.
