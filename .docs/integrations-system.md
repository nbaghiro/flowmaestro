# FlowMaestro Integration System

Complete architecture guide for FlowMaestro's Provider SDK-based integration system supporting both direct API execution (workflows) and MCP tooling (agents).

---

## Overview

FlowMaestro's integration system uses a **Provider SDK architecture** where each external service (Slack, GitHub, OpenAI, etc.) is implemented as a self-contained provider module with dual execution interfaces:

1. **Direct API** - High-performance HTTP calls for workflow execution
2. **MCP Tools** - Standardized tool interface for AI agents

### Key Principles

- **Explicit over implicit** - Clear, readable code; no magic or code generation
- **Dual interface** - Same operations work for workflows and agents
- **Provider isolation** - Each provider is self-contained and independently testable
- **Connection pooling** - HTTP keep-alive for 10-50x performance improvement
- **Type safety** - End-to-end TypeScript with Zod schemas

---

## Architecture Layers

### Layer 1: Core Abstractions

```
backend/src/integrations/core/
├── BaseProvider.ts          # Abstract provider class
├── BaseAPIClient.ts         # Shared HTTP client base
├── ProviderRegistry.ts      # Provider discovery and loading
├── ExecutionRouter.ts       # Workflow vs Agent routing
├── ConnectionPool.ts        # HTTP connection pooling
├── RateLimiter.ts          # Token bucket rate limiting
├── RetryHandler.ts         # Exponential backoff retry logic
└── types.ts                # Shared interfaces
```

**BaseProvider** - Abstract class defining provider contract:

- Define provider metadata (name, auth method, capabilities)
- Expose available operations with schemas
- Provide direct API execution method
- Provide MCP tool execution method
- Handle connection lifecycle and pooling

**BaseAPIClient** - Shared HTTP client foundation:

- Connection pooling with keep-alive
- Automatic token refresh interceptor
- Retry logic with exponential backoff
- Error normalization
- Request/response logging

**ProviderRegistry** - Provider discovery and management:

- Lazy-load providers on demand
- Cache loaded provider instances
- Support dynamic registration
- Discovery APIs for UI

**ExecutionRouter** - Intelligent routing:

- Single entry point for all executions
- Context-aware routing (workflow vs agent)
- Routes to SDK provider MCP adapters for agent tool execution

---

### Layer 2: Provider Implementation

```
backend/src/integrations/providers/slack/
├── SlackProvider.ts         # Main provider class
├── client/
│   └── SlackClient.ts       # HTTP client wrapper
├── operations/
│   ├── types.ts             # Slack-specific types
│   ├── sendMessage.ts       # Send message operation
│   ├── updateMessage.ts     # Update message operation
│   ├── listChannels.ts      # List channels operation
│   ├── uploadFile.ts        # File upload operation
│   └── index.ts             # Export all operations
├── mcp/
│   └── SlackMCPAdapter.ts   # MCP tool wrapper
├── auth.ts                  # OAuth configuration
└── schemas.ts              # Shared Zod schemas
```

**Provider structure:**

- One file per operation for clarity
- Shared client handles auth and connection pooling
- MCP adapter wraps operations as tools
- All schemas defined with Zod for type safety

---

## Provider Interface

### IProvider Contract

```typescript
interface IProvider {
    readonly name: string;
    readonly displayName: string;
    readonly authMethod: ConnectionMethod;
    readonly capabilities: ProviderCapabilities;

    // Authentication
    getAuthConfig(): AuthConfig;
    refreshCredentials?(connection: ConnectionWithData): Promise<TokenData>;

    // Direct API execution (workflows)
    executeOperation(
        operation: string,
        params: Record<string, any>,
        connection: ConnectionWithData,
        context: ExecutionContext
    ): Promise<OperationResult>;

    // MCP tool interface (agents)
    getMCPTools(): MCPTool[];
    executeMCPTool(
        toolName: string,
        params: Record<string, any>,
        connection: ConnectionWithData
    ): Promise<any>;

    // Discovery
    getOperations(): OperationDefinition[];
    getOperationSchema(operation: string): z.ZodSchema;
}
```

### Operation Definition

```typescript
interface OperationDefinition {
    id: string; // "sendMessage"
    name: string; // "Send Message"
    description: string;
    category: string; // "messaging", "files", "channels"
    inputSchema: z.ZodSchema; // Zod for TypeScript
    inputSchemaJSON: JSONSchema; // JSON Schema for MCP
    outputSchema: z.ZodSchema;
    rateLimit?: RateLimitConfig;
    timeout?: number;
    retryable: boolean;
}
```

---

## Execution Flow

### Workflow Execution (Direct API)

```
1. Node config: { provider: "slack", operation: "sendMessage", params: {...} }
2. ExecutionRouter.execute(provider, operation, params, connection, context)
3. Router detects context.mode === "workflow" → use direct API
4. ProviderRegistry.getProvider("slack") → loads SlackProvider
5. SlackProvider.executeOperation("sendMessage", params, connection)
6. Provider validates params against Zod schema
7. Provider gets/creates SlackClient for this connection (pooled)
8. Operation executes via client with retry/rate limiting
9. Returns OperationResult to workflow
```

**Performance optimizations:**

- Client reused across executions (pooled)
- HTTP keep-alive reduces latency 10-50x
- Token refresh proactive (5-min buffer)
- Retry logic with exponential backoff

---

### Agent Execution (MCP Tools)

```
1. Agent requests: "What tools are available for Slack?"
2. ExecutionRouter.getMCPTools("slack")
3. SlackProvider.getMCPTools() → returns tool definitions
4. Agent selects tool: "slack_sendMessage" with params
5. ExecutionRouter.executeMCPTool("slack", "slack_sendMessage", params, connection)
6. SlackMCPAdapter routes to sendMessage operation
7. Same execution path as workflow (step 7-9 above)
```

**Key insight:** Workflows and agents use **identical execution logic**, just different entry points.

---

## Connection Storage

### Database Schema

```sql
CREATE TABLE flowmaestro.connections (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    connection_method VARCHAR(50) NOT NULL,  -- 'api_key', 'oauth2', 'basic_auth', 'custom'
    provider VARCHAR(100) NOT NULL,          -- 'slack', 'openai', 'coda', etc.
    encrypted_data TEXT NOT NULL,            -- AES-256-GCM encrypted JSON
    metadata JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active',
    capabilities JSONB DEFAULT '{}',

    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

**Design decisions:**

- Single table for all connection types
- AES-256-GCM encryption for sensitive data
- Soft deletes for audit trail
- Multi-tenant with user_id isolation

### Connection Data Types

```typescript
// API Key
interface ApiKeyData {
    api_key: string;
    api_secret?: string;
}

// OAuth2
interface OAuth2TokenData {
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
    scope: string[];
}

// Basic Auth
interface BasicAuthData {
    username: string;
    password: string;
}

// Custom Headers
interface CustomHeaderData {
    headers: Record<string, string>;
}
```

---

## Operation Implementation

### Operation Structure

Each operation is a self-contained module:

```
operations/sendMessage.ts exports:
- sendMessageSchema (Zod)
- sendMessageSchemaJSON (JSON Schema)
- sendMessageMetadata (operation info)
- executeSendMessage (execution function)
```

### Operation Pattern

```typescript
// Zod schema for validation
export const sendMessageSchema = z.object({
    channel: z.string().describe("Channel ID or name"),
    text: z.string().describe("Message text"),
    thread_ts: z.string().optional()
});

// Metadata
export const sendMessageMetadata = {
    id: "sendMessage",
    name: "Send Message",
    description: "Send a message to a Slack channel",
    category: "messaging",
    retryable: true,
    timeout: 10000
};

// Execution function
export async function executeSendMessage(
    client: SlackClient,
    params: z.infer<typeof sendMessageSchema>
): Promise<OperationResult> {
    const response = await client.post("/chat.postMessage", {
        channel: params.channel,
        text: params.text,
        thread_ts: params.thread_ts
    });

    return {
        success: true,
        data: {
            messageId: response.ts,
            channel: response.channel
        }
    };
}
```

---

## MCP Adapter Pattern

### SlackMCPAdapter

Wraps all operations as MCP tools:

```typescript
export class SlackMCPAdapter {
    constructor(private operations: Map<string, Operation>) {}

    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `slack_${op.id}`,
            description: op.description,
            inputSchema: op.inputSchemaJSON,
            executeRef: op.id
        }));
    }

    async executeTool(toolName: string, params: any, client: SlackClient) {
        const operationId = toolName.replace(/^slack_/, "");
        const operation = this.operations.get(operationId);
        return await operation.execute(client, params);
    }
}
```

**Key insight:** MCP tools are **thin wrappers** around existing operations. No duplicate logic.

---

## Connection Pooling

### Why It Matters

HTTP connection setup overhead:

- DNS lookup + TCP handshake + TLS negotiation = ~100-500ms
- With keep-alive reuse = ~5-20ms
- **10-50x performance improvement** for high-volume workflows

### Implementation

**Per-provider client pooling:**

- Clients keyed by connection ID
- HTTP Agent with keep-alive enabled
- Max sockets: 50, Max free sockets: 10
- Socket timeout: 60s, Free socket timeout: 30s

**Lifecycle:**

- Created on first use (lazy)
- Persist in memory across executions
- Cleaned up periodically
- Destroyed when connection deleted

**Token refresh:**

- Proactive refresh (5-min expiration buffer)
- Handled transparently via interceptor
- New token stored in database
- Client continues with same connection

---

## Error Handling

### Three-Layer Strategy

**Layer 1: HTTP Client (BaseAPIClient)**

- Network errors (ECONNRESET, ETIMEDOUT)
- HTTP status errors (4xx, 5xx)
- Retry transient errors automatically

**Layer 2: Provider Client (e.g., SlackClient)**

- Provider-specific error parsing
- Map error codes to messages
- Decide retryability

**Layer 3: Operation**

- Operation-specific error handling
- Response validation
- Add operation context

### Standardized Response

```typescript
// Success
{ success: true, data: {...} }

// Failure
{
    success: false,
    error: {
        type: "validation" | "permission" | "not_found" | "rate_limit" | "server_error",
        message: "User-friendly message",
        code: "provider_error_code",
        retryable: boolean
    }
}
```

### Retry Configuration

- Max retries: 3 (configurable per operation)
- Backoff: exponential (1s, 2s, 4s, 8s, max 10s)
- Retryable statuses: 429, 500, 502, 503, 504
- Retryable errors: ECONNRESET, ETIMEDOUT

---

## Adding a New Provider

### Step-by-Step Process

**1. Create provider directory:**

```
providers/newprovider/
├── NewProviderProvider.ts
├── client/NewProviderClient.ts
├── operations/
│   ├── types.ts
│   ├── operation1.ts
│   └── index.ts
├── mcp/NewProviderMCPAdapter.ts
├── auth.ts
└── schemas.ts
```

**2. Implement client (extends BaseAPIClient):**

- Set base URL
- Configure auth injection
- Add error parsing
- Optional method shortcuts

**3. Implement operations:**

- One file per operation
- Define Zod schema and metadata
- Implement execute function

**4. Implement provider (extends BaseProvider):**

- Import and register operations
- Implement client pooling
- Implement executeOperation and MCP methods

**5. Create MCP adapter:**

- Import all operations
- Generate tool definitions

**6. Register provider:**

- Add to provider registry
- Configure auth (OAuth/API key)
- Set rate limits

**Time estimate: 1-2 days per provider**

---

## Authentication Methods

### API Key

**Data structure:**

```typescript
{ api_key: string; api_secret?: string; }
```

**Supported providers:** OpenAI, Anthropic, Coda, GitHub (PAT)

**Testing:** Make test API call to verify key validity

---

### OAuth 2.0

**Data structure:**

```typescript
{
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
    scope: string[];
}
```

**Supported providers:** Slack, Google, Notion, GitHub

**Flow:**

1. Frontend initiates OAuth → backend generates auth URL
2. User authorizes on provider's page
3. Provider redirects to callback with code
4. Backend exchanges code for tokens
5. Tokens encrypted and stored
6. Callback page posts message to parent window
7. Popup closes, parent receives connection

**Automatic token refresh:**

- Background scheduler runs every 5 minutes
- Proactively refreshes tokens expiring within 10 minutes
- On-demand refresh during execution (5-minute buffer)
- Handled transparently - workflows/agents never see expired tokens
- Graceful error handling with connection status updates

**Token Refresh Architecture:**

FlowMaestro implements a two-layer token refresh strategy:

1. **Background Scheduler** (`CredentialRefreshScheduler`)
    - Runs every 5 minutes automatically
    - Scans all OAuth connections across all users
    - Refreshes tokens expiring within 10 minutes
    - Prevents auth failures before they happen
    - Logs refresh successes and failures

2. **On-Demand Refresh** (`TokenRefreshService.getAccessToken()`)
    - Checked before every API call
    - Refreshes if token expires within 5 minutes
    - Updates database with new tokens
    - Transparent to calling code

**Implementation:**

```typescript
// Background scheduler (started on server boot)
credentialRefreshScheduler.start();
// Checks every 5 minutes, refreshes tokens expiring within 10 minutes

// On-demand refresh (used by operations)
const accessToken = await getAccessToken(connectionId);
// Automatically refreshes if needed, returns valid token
```

**Admin Endpoints:**

```http
GET  /api/oauth/scheduler/status     # Check scheduler status
POST /api/oauth/scheduler/refresh    # Trigger manual refresh cycle
```

**Environment variables:**

```env
SLACK_CLIENT_ID=xxxxx
SLACK_CLIENT_SECRET=xxxxx
GOOGLE_CLIENT_ID=xxxxx
GOOGLE_CLIENT_SECRET=xxxxx
```

---

## Usage in Workflows

Connections referenced by ID in node configurations:

```json
{
    "type": "integration",
    "label": "Send Slack Message",
    "config": {
        "provider": "slack",
        "operation": "sendMessage",
        "connectionId": "uuid",
        "parameters": {
            "channel": "#general",
            "text": "Workflow completed"
        }
    }
}
```

**Execution:**

```typescript
// In workflow executor
const connection = await connectionRepo.findByIdWithData(config.connectionId);
const result = await executionRouter.execute(
    config.provider,
    config.operation,
    config.parameters,
    connection,
    { mode: "workflow", workflowId: "...", nodeId: "..." }
);
```

---

## Usage in Agents

### LLM Provider Connections

Agents configured with default LLM connection:

```typescript
{
    name: "Research Assistant",
    model: "gpt-4",
    provider: "openai",
    connectionId: "uuid"  // OpenAI API key connection
}
```

### Agent Tools with Connections

Agents can use provider MCP adapters to access tools from connected integrations:

**Provider Tool:**

```typescript
{
    type: "provider_mcp",
    name: "slack_sendMessage",
    config: {
        provider: "slack",
        connectionId: "uuid"
    }
}
```

**Execution:**

```typescript
const connection = await connectionRepo.findByIdWithData(tool.config.connectionId);
const provider = providerRegistry.getProvider(tool.config.provider);
return await provider.executeMCPTool(tool.name, toolCall.arguments, connection);
```

---

## Security

### Encryption at Rest

All sensitive data encrypted with AES-256-GCM:

```typescript
const encryptedData = encryptionService.encrypt({
    api_key: "sk-...",
    api_secret: "org-..."
});
```

**Key management:**

- Store in `ENCRYPTION_KEY` environment variable
- 32-byte base64-encoded string
- Rotate periodically
- Never commit to version control

### Multi-Tenancy Isolation

All operations enforce user ID matching:

```typescript
async findByIdWithData(id: string, userId: string) {
    // WHERE id = $1 AND user_id = $2
    // User can only access their own connections
}
```

### OAuth Security

- State parameter prevents CSRF
- Tokens encrypted at rest
- Automatic refresh before expiry
- Short-lived access tokens

---

## Performance Characteristics

### Expected Performance

**Cold start (first execution):**

- Provider load: ~10ms
- Client creation: ~50ms
- First API call: ~200-500ms (connection setup)
- **Total: ~260-560ms**

**Warm execution (cached client):**

- Provider lookup: ~1ms
- Client reuse: ~1ms
- API call: ~50-200ms (network latency)
- **Total: ~52-202ms**

**Concurrent executions:**

- Connection pool handles 100s of parallel requests
- Rate limiter prevents throttling
- Max sockets limit prevents overload

### Memory Footprint

**Per provider:**

- Loaded code: ~100KB
- Client pool (10 connections): ~1MB
- Cached metadata: ~10KB
- **Total: ~1.1MB per provider**

**For 50 providers: ~55MB** (acceptable for backend service)

---

## API Endpoints

### Connection Management

```http
GET /api/connections                     # List connections
GET /api/connections/:id                 # Get single connection
POST /api/connections                    # Create connection
PUT /api/connections/:id                 # Update connection
DELETE /api/connections/:id              # Delete connection (soft)
POST /api/connections/:id/test           # Test existing connection
POST /api/connections/test               # Test before saving
```

### OAuth Endpoints

```http
GET /api/oauth/:provider/authorize       # Get auth URL
GET /api/oauth/:provider/callback        # OAuth callback
POST /api/oauth/:provider/refresh        # Refresh token (manual)
POST /api/oauth/:provider/revoke         # Revoke token
GET /api/oauth/providers                 # List OAuth providers
GET /api/oauth/scheduler/status          # Get refresh scheduler status
POST /api/oauth/scheduler/refresh        # Trigger manual refresh cycle
```

---

## Frontend Integration

### ConnectionStore (Zustand)

```typescript
interface ConnectionStore {
    connections: Connection[];
    loading: boolean;

    fetchConnections: (params?: FilterParams) => Promise<void>;
    addConnection: (input: CreateConnectionInput) => Promise<Connection>;
    updateConnectionById: (id: string, input: Partial<Connection>) => Promise<void>;
    deleteConnectionById: (id: string) => Promise<void>;

    getByProvider: (provider: string) => Connection[];
    getByMethod: (method: ConnectionMethod) => Connection[];
}
```

### ConnectionPicker Component

Used in node configurations:

```typescript
<ConnectionPicker
    provider="openai"
    value={config.connectionId}
    onChange={setConnectionId}
    allowedMethods={["api_key"]}
    required={true}
/>
```

---

## Testing Strategy

### Unit Tests

**Per operation:**

- Mock HTTP client
- Test input validation
- Test response parsing
- Test error handling

**Provider class:**

- Test operation registration
- Test client pooling
- Test MCP tool generation

### Integration Tests

**With real APIs:**

- Test OAuth flow
- Test actual API calls
- Test token refresh
- Test rate limiting
- Use sandbox/test accounts

### E2E Tests

**Full workflow execution:**

- Create test workflow
- Execute with real provider
- Verify results

---

## Advantages of Provider SDK Approach

✅ **Clarity** - Every line has clear purpose, easy to debug
✅ **Control** - Full control over API interactions and optimizations
✅ **Type Safety** - End-to-end TypeScript with compile-time errors
✅ **Performance** - Connection pooling, caching, optimized retry logic
✅ **Testability** - Mock at any level, test in isolation
✅ **Maintainability** - One provider breaks? Fix one provider
✅ **Flexibility** - Need custom logic? Just write it
✅ **Dual Interface** - Same code serves workflows and agents

---

## When to Use This Approach

✅ **Use Provider SDK when:**

- Provider is business-critical (Slack, Gmail, Notion)
- High volume of operations
- Need custom error handling
- Complex authentication flows
- Need maximum performance
- Team values code clarity

❌ **Consider alternatives when:**

- Provider rarely used
- Simple REST API with good OpenAPI spec
- Limited engineering resources

---

## Related Documentation

- **[workflows.md](./workflows.md)** - Using connections in workflow nodes
- **[agents.md](./agents.md)** - Using connections for agent LLM calls and tools
- **[temporal.md](./temporal.md)** - Connection usage in durable executions

---

## Summary

FlowMaestro's Provider SDK integration system provides:

1. **Dual Execution** - Direct API for workflows, MCP tools for agents
2. **High Performance** - Connection pooling, retry logic, rate limiting
3. **Type Safety** - Zod schemas and TypeScript throughout
4. **Security** - AES-256-GCM encryption, multi-tenancy isolation
5. **Extensibility** - Clear pattern for adding new providers
6. **Developer Experience** - Explicit, readable, testable code

This architecture balances developer experience with performance, providing a solid foundation for integrating 10-50 critical external services while maintaining code quality and system reliability.
