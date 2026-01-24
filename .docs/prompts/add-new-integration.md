# Prompt Template: Add New Integration Provider

Use this prompt template when adding a new integration provider to FlowMaestro. Fill in the placeholders and provide to Claude.

---

## Prompt

I need to add a new integration provider for **[PROVIDER_NAME]** to FlowMaestro. Here are the details:

### Provider Information

- **Provider ID**: `[provider-id]` (kebab-case, e.g., `my-service`)
- **Display Name**: `[Display Name]` (human-readable, e.g., `My Service`)
- **Description**: `[Brief description of what this integration does]`
- **Category**: `[Category]` (e.g., `communication`, `productivity`, `crm`, `project_management`, `developer_tools`, `file_storage`, `social_media`, `database`, `ai_ml`, `ecommerce`, `marketing`)

### Authentication Method

- **Auth Type**: `[oauth2 | api_key]`

#### If OAuth2:

- **Auth URL**: `[https://provider.com/oauth/authorize]`
- **Token URL**: `[https://provider.com/oauth/token]`
- **Scopes**: `[scope1, scope2, scope3]`
- **PKCE Enabled**: `[yes | no]`
- **Refresh Token Support**: `[yes | no]`
- **Additional Auth Params**: `[any extra params needed for auth URL]`
- **Get User Info Endpoint**: `[optional URL to fetch user info after auth]`

#### If API Key:

- **Header Name**: `[Authorization | X-Api-Key | etc.]`
- **Header Template**: `[Bearer {{api_key}} | {{api_key}}]`
- **Additional Headers**: `[any other required headers]`

### Operations to Implement

List all operations this integration should support:

1. **Operation Name**: `[operationId]` (camelCase)
    - **Display Name**: `[Human Readable Name]`
    - **Description**: `[What this operation does]`
    - **Category**: `[messaging | data | files | etc.]`
    - **Action Type**: `[read | write]`
    - **Parameters**:
        - `param1` (type, required/optional): description
        - `param2` (type, required/optional): description
    - **Returns**: Description of return data

2. **Operation Name**: `[operationId]`
    - ... (repeat for each operation)

### Webhooks/Triggers (if applicable)

- **Supports Webhooks**: `[yes | no]`
- **Signature Type**: `[hmac_sha256 | hmac_sha1 | bearer_token | timestamp_signature | none]`
- **Signature Header**: `[X-Signature-Header]`
- **Triggers to Implement**:
    1. `[trigger_id]`: Description
    2. ... (repeat for each trigger)

### Rate Limits

- **Tokens Per Minute**: `[number]`
- **Burst Size**: `[number]` (optional)

### API Documentation

- **API Docs URL**: `[https://docs.provider.com/api]`

---

## Implementation Checklist

Please implement the following files for this integration:

### 1. Backend Provider Files

Create the provider directory structure:

```
backend/src/integrations/providers/[provider-id]/
├── [Provider]Provider.ts       # Main provider class
├── client/
│   └── [Provider]Client.ts     # HTTP client wrapper
├── operations/
│   ├── [operation1].ts         # Individual operation files
│   ├── [operation2].ts
│   └── index.ts                # Export all operations
├── mcp/
│   └── [Provider]MCPAdapter.ts # MCP tool adapter
└── schemas.ts                  # Shared Zod schemas (optional)
```

### 2. Register Provider

Add to `backend/src/integrations/registry.ts`:

```typescript
const [providerId]Entry: ProviderRegistryEntry = {
    name: "[provider-id]",
    displayName: "[Display Name]",
    authMethod: "[oauth2 | api_key]",
    category: "[category]",
    loader: async () => {
        const { [Provider]Provider } = await import("./providers/[provider-id]/[Provider]Provider");
        return new [Provider]Provider();
    }
};

providerRegistry.register([providerId]Entry);
```

### 3. If OAuth: Add to OAuth Provider Registry

Add to `backend/src/services/oauth/OAuthProviderRegistry.ts`:

```typescript
"[provider-id]": {
    name: "[provider-id]",
    displayName: "[Display Name]",
    authUrl: "[auth-url]",
    tokenUrl: "[token-url]",
    scopes: ["scope1", "scope2"],
    clientId: config.oauth.[providerId].clientId,
    clientSecret: config.oauth.[providerId].clientSecret,
    redirectUri: getOAuthRedirectUri("[provider-id]"),
    refreshable: true,
    pkceEnabled: false
},
```

### 4. Add Config Entry

Add to `backend/src/core/config/index.ts`:

**For OAuth providers:**

```typescript
// In config.oauth section
[providerId]: {
    clientId: process.env.[PROVIDER]_CLIENT_ID || "",
    clientSecret: process.env.[PROVIDER]_CLIENT_SECRET || ""
},

// In getOAuthRedirectUri() callbackPaths
"[provider-id]": "/oauth/[provider-id]/callback",

// In getOAuthCredentials() providerMap
"[provider-id]": "[providerId]",
```

**For API Key providers:**
No config entry needed (users provide their own API keys).

### 5. Add Provider Definition to Shared Types

Add to `shared/src/providers.ts`:

```typescript
// In PROVIDER_LOGO_DOMAINS (if needed)
"[provider-id]": "[domain.com]",

// In ALL_PROVIDERS array
{
    provider: "[provider-id]",
    displayName: "[Display Name]",
    description: "[Description]",
    logoUrl: getBrandLogo("[domain.com]"),
    category: "[Category]",
    methods: ["oauth2"] // or ["api_key"] or ["api_key", "oauth2"]
},
```

### 6. Secret Management (OAuth providers only)

#### Add to Pulumi Config

Add to `infra/pulumi/Pulumi.production.yaml` in the `secrets` JSON array:

```json
{"name":"[provider-id]-client-id","envVar":"[PROVIDER]_CLIENT_ID","category":"oauth","deployments":["api"],"required":false,"description":"[Display Name] OAuth client ID"},
{"name":"[provider-id]-client-secret","envVar":"[PROVIDER]_CLIENT_SECRET","category":"oauth","deployments":["api"],"required":false,"description":"[Display Name] OAuth client secret"}
```

#### After Pulumi Deployment

1. Run `pulumi up` to create empty GCP secrets
2. Run `./infra/scripts/setup-secrets-gcp.sh` to set the secret values
3. Wait for External Secrets Operator to sync (or force sync)

### 7. Type Checking

After implementation, run:

```bash
cd backend && npx tsc --noEmit
```

---

## Required File Templates

### Provider Class Template (OAuth)

```typescript
// backend/src/integrations/providers/[provider-id]/[Provider]Provider.ts
import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { [Provider]Client } from "./client/[Provider]Client";
import { [Provider]MCPAdapter } from "./mcp/[Provider]MCPAdapter";
import {
    // import operations
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities
} from "../../core/types";

export class [Provider]Provider extends BaseProvider {
    readonly name = "[provider-id]";
    readonly displayName = "[Display Name]";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: [number]
        }
    };

    private mcpAdapter: [Provider]MCPAdapter;
    private clientPool: Map<string, [Provider]Client> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation([operation1]);
        this.registerOperation([operation2]);

        // Initialize MCP adapter
        this.mcpAdapter = new [Provider]MCPAdapter(this.operations);
    }

    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "[auth-url]",
            tokenUrl: "[token-url]",
            scopes: ["scope1", "scope2"],
            clientId: appConfig.oauth.[providerId].clientId,
            clientSecret: appConfig.oauth.[providerId].clientSecret,
            redirectUri: getOAuthRedirectUri("[provider-id]"),
            refreshable: true
        };
        return config;
    }

    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const validatedParams = this.validateParams(operationId, params);
        const client = this.getOrCreateClient(connection);

        switch (operationId) {
            case "[operation1]":
                return await execute[Operation1](client, validatedParams as never);
            case "[operation2]":
                return await execute[Operation2](client, validatedParams as never);
            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown operation: ${operationId}`,
                        retryable: false
                    }
                };
        }
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
        const result = await this.mcpAdapter.executeTool(toolName, params, client);

        if ((result as { success?: boolean }).success) {
            return (result as { data?: unknown }).data;
        } else {
            throw new Error(
                (result as { error?: { message?: string } }).error?.message ||
                    "MCP tool execution failed"
            );
        }
    }

    private getOrCreateClient(connection: ConnectionWithData): [Provider]Client {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const tokens = connection.data as OAuth2TokenData;
        const client = new [Provider]Client({
            accessToken: tokens.access_token
        });

        this.clientPool.set(poolKey, client);
        return client;
    }

    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
```

### Provider Class Template (API Key)

```typescript
// backend/src/integrations/providers/[provider-id]/[Provider]Provider.ts
import { BaseProvider } from "../../core/BaseProvider";
import { [Provider]Client } from "./client/[Provider]Client";
import { [Provider]MCPAdapter } from "./mcp/[Provider]MCPAdapter";
import {
    // import operations
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    APIKeyConfig,
    ProviderCapabilities
} from "../../core/types";

export class [Provider]Provider extends BaseProvider {
    readonly name = "[provider-id]";
    readonly displayName = "[Display Name]";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: [number]
        }
    };

    private mcpAdapter: [Provider]MCPAdapter;
    private clientPool: Map<string, [Provider]Client> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation([operation1]);
        this.registerOperation([operation2]);

        // Initialize MCP adapter
        this.mcpAdapter = new [Provider]MCPAdapter(this.operations);
    }

    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "Bearer {{api_key}}"
        };
        return config;
    }

    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const validatedParams = this.validateParams(operationId, params);
        const client = this.getOrCreateClient(connection);

        switch (operationId) {
            case "[operation1]":
                return await execute[Operation1](client, validatedParams as never);
            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown operation: ${operationId}`,
                        retryable: false
                    }
                };
        }
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
        const result = await this.mcpAdapter.executeTool(toolName, params, client);

        if ((result as { success?: boolean }).success) {
            return (result as { data?: unknown }).data;
        } else {
            throw new Error(
                (result as { error?: { message?: string } }).error?.message ||
                    "MCP tool execution failed"
            );
        }
    }

    private getOrCreateClient(connection: ConnectionWithData): [Provider]Client {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as ApiKeyData;
        const client = new [Provider]Client({
            apiKey: data.api_key
        });

        this.clientPool.set(poolKey, client);
        return client;
    }

    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
```

### Client Template

```typescript
// backend/src/integrations/providers/[provider-id]/client/[Provider]Client.ts
import { createServiceLogger } from "../../../../core/logging";

const logger = createServiceLogger("[Provider]Client");

interface [Provider]ClientConfig {
    accessToken?: string;  // For OAuth
    apiKey?: string;       // For API Key
}

export class [Provider]Client {
    private baseUrl = "https://api.[provider].com/v1";
    private headers: Record<string, string>;

    constructor(config: [Provider]ClientConfig) {
        this.headers = {
            "Content-Type": "application/json"
        };

        if (config.accessToken) {
            this.headers["Authorization"] = `Bearer ${config.accessToken}`;
        } else if (config.apiKey) {
            this.headers["Authorization"] = `Bearer ${config.apiKey}`;
        }
    }

    private async request<T>(
        method: string,
        endpoint: string,
        body?: Record<string, unknown>
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const response = await fetch(url, {
            method,
            headers: this.headers,
            body: body ? JSON.stringify(body) : undefined
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            logger.error(
                { status: response.status, error },
                `[Provider] API error: ${endpoint}`
            );
            throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    // Add methods for each API endpoint
    async [methodName](params: [ParamsType]): Promise<[ReturnType]> {
        return this.request<[ReturnType]>("POST", "/endpoint", params);
    }
}
```

### Operation Template

```typescript
// backend/src/integrations/providers/[provider-id]/operations/[operationName].ts
import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { [Provider]Client } from "../client/[Provider]Client";
import type { OperationDefinition, OperationResult } from "../../../core/types";

// Define Zod schema for validation
export const [operationName]Schema = z.object({
    param1: z.string().describe("Description of param1"),
    param2: z.number().optional().describe("Description of param2")
});

export type [OperationName]Params = z.infer<typeof [operationName]Schema>;

// Define operation
export const [operationName]Operation: OperationDefinition = {
    id: "[operationName]",
    name: "[Operation Display Name]",
    description: "[What this operation does]",
    category: "[messaging | data | files | etc.]",
    inputSchema: [operationName]Schema,
    inputSchemaJSON: toJSONSchema([operationName]Schema),
    retryable: true,
    timeout: 30000
};

// Execute operation
export async function execute[OperationName](
    client: [Provider]Client,
    params: [OperationName]Params
): Promise<OperationResult> {
    try {
        const result = await client.[methodName](params);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Operation failed",
                retryable: true
            }
        };
    }
}
```

### Operations Index Template

```typescript
// backend/src/integrations/providers/[provider-id]/operations/index.ts
export {
    [operation1]Schema,
    [operation1]Operation,
    execute[Operation1]
} from "./[operation1]";

export {
    [operation2]Schema,
    [operation2]Operation,
    execute[Operation2]
} from "./[operation2]";
```

### MCP Adapter Template

```typescript
// backend/src/integrations/providers/[provider-id]/mcp/[Provider]MCPAdapter.ts
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { [Provider]Client } from "../client/[Provider]Client";
import {
    execute[Operation1],
    execute[Operation2]
} from "../operations";

export class [Provider]MCPAdapter {
    private operations: Map<string, OperationDefinition>;

    constructor(operations: Map<string, OperationDefinition>) {
        this.operations = operations;
    }

    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `[provider_id]_${op.id}`,
            description: op.description,
            inputSchema: op.inputSchemaJSON
        }));
    }

    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: [Provider]Client
    ): Promise<OperationResult> {
        const operationId = toolName.replace("[provider_id]_", "");

        switch (operationId) {
            case "[operation1]":
                return execute[Operation1](client, params as never);
            case "[operation2]":
                return execute[Operation2](client, params as never);
            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown tool: ${toolName}`,
                        retryable: false
                    }
                };
        }
    }
}
```

---

## Pre-Auth Fields (for OAuth with subdomain, etc.)

If the provider requires user input before OAuth (like Zendesk subdomain), add to `shared/src/providers.ts`:

```typescript
{
    provider: "[provider-id]",
    displayName: "[Display Name]",
    // ... other fields
    methods: ["oauth2"],
    oauthSettings: [
        {
            name: "subdomain",
            label: "[Provider] Subdomain",
            placeholder: "your-company",
            helpText: "Enter your [Provider] subdomain (e.g., 'acme' from acme.[provider].com)",
            required: true,
            type: "text",
            pattern: "^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$",
            patternError: "Subdomain must start and end with a letter or number"
        }
    ]
}
```

---

## Key Files Reference

| File                                                  | Purpose                             |
| ----------------------------------------------------- | ----------------------------------- |
| `backend/src/integrations/providers/[provider-id]/`   | Provider implementation directory   |
| `backend/src/integrations/registry.ts`                | Register provider (add entry here)  |
| `backend/src/services/oauth/OAuthProviderRegistry.ts` | OAuth config (OAuth providers only) |
| `backend/src/core/config/index.ts`                    | Environment variable config         |
| `shared/src/providers.ts`                             | Frontend provider definitions       |
| `shared/src/connections.ts`                           | Connection data types               |
| `infra/pulumi/Pulumi.production.yaml`                 | Secret definitions                  |
| `infra/scripts/setup-secrets-gcp.sh`                  | Set secret values                   |

---

## Testing the Integration

1. **Create connection via UI**: Go to Connections page, add new connection
2. **Test in workflow**: Create a workflow with an Integration node using the new provider
3. **Test in agent**: Add the integration as a tool to an agent and test via chat
4. **Verify MCP tools**: Check that operations appear as tools in the agent's tool list

---

## Common Gotchas

1. **OAuth Callback URL**: Must be registered in the provider's developer console exactly as configured
2. **Scopes**: Ensure all required scopes are requested during OAuth
3. **Token Refresh**: OAuth tokens expire - ensure refresh logic works
4. **Rate Limits**: Configure appropriate rate limits to avoid API throttling
5. **Type Safety**: Run `npx tsc --noEmit` before committing
6. **Secret Sync**: After adding Pulumi secrets, wait for ESO sync or force it
7. **Environment Variables**: Use SCREAMING_SNAKE_CASE for env var names
