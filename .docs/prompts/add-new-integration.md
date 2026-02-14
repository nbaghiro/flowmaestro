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
├── __tests__/
│   ├── fixtures.ts             # Sandbox test fixtures (REQUIRED)
│   └── [provider-id].test.ts   # Provider unit tests
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

**IMPORTANT:** This step is REQUIRED for all OAuth providers. Without it, the integration will not work in production.

#### Add to Pulumi Config

Add to `infra/pulumi/Pulumi.production.yaml` in the `flowmaestro-infrastructure:secrets` JSON array:

```json
{"name":"[provider-id]-client-id","envVar":"[PROVIDER]_CLIENT_ID","category":"oauth","deployments":["api"],"required":false,"description":"[Display Name] OAuth client ID"},
{"name":"[provider-id]-client-secret","envVar":"[PROVIDER]_CLIENT_SECRET","category":"oauth","deployments":["api"],"required":false,"description":"[Display Name] OAuth client secret"}
```

**Secret Definition Fields:**

- `name`: kebab-case identifier (becomes GCP secret name: `flowmaestro-app-{name}`)
- `envVar`: SCREAMING_SNAKE_CASE environment variable name (must match config/index.ts)
- `category`: Use `oauth` for OAuth credentials (groups into K8s `oauth-secrets`)
- `deployments`: Use `["api"]` for OAuth (only API server needs these)
- `required`: Use `false` for optional integrations
- `description`: Human-readable description shown in setup prompts

#### After Pulumi Deployment

1. Run `cd infra/pulumi && pulumi up` to create empty GCP secrets + K8s ExternalSecrets
2. Run `./infra/scripts/setup-secrets-gcp.sh` to interactively set the secret values
3. Wait for External Secrets Operator to sync (~5 minutes) or force sync:
    ```bash
    kubectl annotate externalsecret -n flowmaestro --all force-sync=$(date +%s)
    kubectl rollout restart deployment/api-server -n flowmaestro
    ```

#### For Local Development

After setting GCP secrets, sync to your local `.env`:

```bash
./infra/scripts/sync-secrets-local.sh
```

### 7. Sandbox Test Fixtures

**IMPORTANT:** Every new provider MUST include sandbox fixtures. These enable:

- Agent integration tests to run without real API credentials
- Test connections in the UI to work properly
- Deterministic testing of MCP tool execution

#### Create Fixture Files

Create the `__tests__` directory with fixtures:

```
backend/src/integrations/providers/[provider-id]/
└── __tests__/
    ├── fixtures.ts           # Test fixtures for all operations
    └── [provider-id].test.ts # Unit tests for the provider
```

#### Fixture File Template

```typescript
// backend/src/integrations/providers/[provider-id]/__tests__/fixtures.ts
/**
 * [Provider] Provider Test Fixtures
 *
 * Based on official [Provider] API documentation:
 * - [link to API docs for operation 1]
 * - [link to API docs for operation 2]
 */

import type { TestFixture } from "../../../sandbox";

// ============================================================================
// SAMPLE DATA (for list operations with filtering/pagination)
// ============================================================================

const sampleRecords = [
    {
        id: "rec-001",
        name: "Sample Record 1",
        status: "active",
        createdAt: "2024-01-15T10:30:00Z",
        // Add internal filter fields prefixed with underscore
        _type: "type_a"
    },
    {
        id: "rec-002",
        name: "Sample Record 2",
        status: "inactive",
        createdAt: "2024-01-16T14:20:00Z",
        _type: "type_b"
    }
    // Add 5-10 realistic sample records
];

// ============================================================================
// OPERATION FIXTURES
// ============================================================================

/**
 * Fixture for [operationName] operation
 */
export const [operationName]Fixture: TestFixture = {
    operationId: "[operationName]",
    provider: "[provider-id]",
    validCases: [
        {
            name: "basic_success",
            description: "Successfully [describes what operation does]",
            input: {
                // Minimal valid input
                requiredParam: "value"
            },
            expectedOutput: {
                // Expected response shape
                id: "result-123",
                status: "success"
            }
        },
        {
            name: "with_optional_params",
            description: "[Operation] with all optional parameters",
            input: {
                requiredParam: "value",
                optionalParam: "extra"
            },
            expectedOutput: {
                id: "result-456",
                status: "success",
                extra: "data"
            }
        }
    ],
    errorCases: [
        {
            name: "not_found",
            description: "Resource not found error",
            input: {
                requiredParam: "nonexistent-id"
            },
            expectedError: {
                type: "not_found",
                message: "[Resource] not found",
                retryable: false
            }
        },
        {
            name: "invalid_input",
            description: "Invalid input parameters",
            input: {
                requiredParam: ""  // Empty/invalid value
            },
            expectedError: {
                type: "validation",
                message: "Invalid [parameter]",
                retryable: false
            }
        }
    ]
};

/**
 * Fixture for list operation with filtering support
 */
export const list[Resource]sFixture: TestFixture = {
    operationId: "list[Resource]s",
    provider: "[provider-id]",
    validCases: [
        {
            name: "list_all",
            description: "List all [resources]",
            input: {},
            expectedOutput: {
                records: sampleRecords.slice(0, 5),
                total: sampleRecords.length
            }
        }
    ],
    errorCases: [],
    // Enable dynamic filtering for list operations
    filterableData: {
        records: sampleRecords,
        recordsField: "records",       // Field name in response
        defaultPageSize: 10,
        maxPageSize: 100,
        pageSizeParam: "limit",        // Param name for page size
        offsetParam: "offset",         // Param name for offset
        filterConfig: {
            type: "generic",
            filterableFields: ["status", "type"]
        }
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

export const [providerId]Fixtures = {
    [operationName]: [operationName]Fixture,
    list[Resource]s: list[Resource]sFixture
};

export default [providerId]Fixtures;
```

#### Provider Test File Template

```typescript
// backend/src/integrations/providers/[provider-id]/__tests__/[provider-id].test.ts
import { [providerId]Fixtures } from "./fixtures";

describe("[Provider] Fixtures", () => {
    it("should have fixtures for all operations", () => {
        expect([providerId]Fixtures).toBeDefined();
        expect(Object.keys([providerId]Fixtures).length).toBeGreaterThan(0);
    });

    // Add operation-specific tests if needed
});
```

#### Register Fixtures

Add to `backend/src/integrations/sandbox/FixtureRegistry.ts`:

```typescript
// In the imports section
import { [providerId]Fixtures } from "../providers/[provider-id]/__tests__/fixtures";

// In the registerAllFixtures() method
this.registerProviderFixtures("[provider-id]", [providerId]Fixtures);
```

#### Fixture Guidelines

1. **Realistic Data**: Use realistic-looking sample data (not "test123")
2. **Error Cases**: Include at least `not_found` and `validation` error cases
3. **Filterable Data**: For list operations, provide 5-10 sample records
4. **Documentation Links**: Reference official API docs at the top of fixtures
5. **Cover All Operations**: Every operation in the provider must have a fixture

### 8. Type Checking

After implementation, run:

```bash
cd backend && npx tsc --noEmit
```

---

## Platform-Specific Base Clients

When adding a new integration for a service that belongs to an existing platform (Google, Microsoft, SAP, AWS), **always use the shared base client** instead of extending `BaseAPIClient` directly. This ensures consistent authentication, error handling, and retry logic across the platform family.

### Available Base Clients

| Platform      | Base Client                           | Location                      | Use For                                                                  |
| ------------- | ------------------------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| **Google**    | `GoogleBaseClient`                    | `integrations/core/google`    | Google Calendar, Docs, Drive, Sheets, Forms, Slides, Cloud Storage, etc. |
| **Microsoft** | `MicrosoftGraphClient`                | `integrations/core/microsoft` | Teams, Outlook, Excel, OneDrive, PowerPoint, Word, etc.                  |
| **SAP**       | `BaseAPIClient` + `ODataQueryBuilder` | `integrations/core/sap`       | SAP S/4HANA, SuccessFactors, etc.                                        |
| **AWS**       | `AWSBaseClient`                       | `integrations/core/aws`       | Lambda, CloudWatch, ECS, S3, etc.                                        |

### When to Use a Platform Base Client

Use the platform-specific base client when:

1. **The service uses the same API domain** (e.g., `graph.microsoft.com`, `googleapis.com`)
2. **The service uses the same authentication pattern** (e.g., Bearer token OAuth2)
3. **Error response formats are consistent** across the platform

### Example: Adding a New Google Provider

```typescript
// backend/src/integrations/providers/google-meet/client/GoogleMeetClient.ts
import { GoogleBaseClient } from "../../../core/google";

export interface GoogleMeetClientConfig {
    accessToken: string;
}

export class GoogleMeetClient extends GoogleBaseClient {
    constructor(config: GoogleMeetClientConfig) {
        super({
            accessToken: config.accessToken,
            serviceName: "Google Meet" // Used in error messages
        });
    }

    // Just add your service-specific methods
    async createMeeting(params: CreateMeetingParams): Promise<Meeting> {
        return this.post("/v1/spaces", params);
    }

    async getMeeting(spaceId: string): Promise<Meeting> {
        return this.get(`/v1/spaces/${spaceId}`);
    }
}
```

### Example: Adding a New Microsoft Provider

```typescript
// backend/src/integrations/providers/microsoft-planner/client/MicrosoftPlannerClient.ts
import { MicrosoftGraphClient } from "../../../core/microsoft";

export interface PlannerClientConfig {
    accessToken: string;
}

export class MicrosoftPlannerClient extends MicrosoftGraphClient {
    constructor(config: PlannerClientConfig) {
        super({
            accessToken: config.accessToken,
            serviceName: "Microsoft Planner"
        });
    }

    async listPlans(groupId: string): Promise<PlanList> {
        return this.get(`/groups/${groupId}/planner/plans`);
    }

    async createTask(planId: string, task: CreateTaskParams): Promise<Task> {
        return this.post("/planner/tasks", { planId, ...task });
    }
}
```

### Example: Adding a New SAP Provider

```typescript
// backend/src/integrations/providers/sap-ariba/client/SAPAribaClient.ts
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import { ODataQueryBuilder, SapODataErrorResponse, parseSapODataError } from "../../../core/sap";
import { isFetchError } from "../../../../core/utils/fetch-client";

export class SAPAribaClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: SAPAribaClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: `https://${config.realm}.ariba.com/api`,
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                backoffStrategy: "exponential"
            }
        };
        super(clientConfig);
        this.accessToken = config.accessToken;

        this.client.addRequestInterceptor((reqConfig) => {
            reqConfig.headers = reqConfig.headers || {};
            reqConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            reqConfig.headers["Accept"] = "application/json";
            return reqConfig;
        });
    }

    // Use shared ODataQueryBuilder for query construction
    async listDocuments(params?: ListParams): Promise<DocumentList> {
        const query = ODataQueryBuilder.create().formatJson().inlineCount();

        if (params?.top) query.top(params.top);
        if (params?.filter) query.filter(params.filter);

        return this.get(`/documents${query.buildWithPrefix()}`);
    }

    // Use shared error parsing
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as SapODataErrorResponse;
            const errorMessage = parseSapODataError(data);
            if (errorMessage) {
                throw new Error(`SAP Ariba error: ${errorMessage}`);
            }
        }
        throw error;
    }
}
```

### What the Base Clients Provide

| Feature          | GoogleBaseClient             | MicrosoftGraphClient               | SAP (via core/sap)       |
| ---------------- | ---------------------------- | ---------------------------------- | ------------------------ |
| Base URL         | `https://www.googleapis.com` | `https://graph.microsoft.com/v1.0` | Configurable             |
| Auth             | Bearer token interceptor     | Bearer token in headers            | Bearer token interceptor |
| Error handling   | 401, 403, 404, 429           | 401, 403, 404, 429                 | OData error parsing      |
| Retry logic      | Via BaseAPIClient            | Built-in                           | Via BaseAPIClient        |
| Binary downloads | `downloadBinary()`           | `downloadBinary()`                 | -                        |
| Binary uploads   | -                            | `requestBinary()`                  | -                        |
| OData queries    | -                            | -                                  | `ODataQueryBuilder`      |

### Benefits

1. **Consistency**: All Google/Microsoft/SAP providers handle errors the same way
2. **Less code**: No need to duplicate auth interceptors or error handling
3. **Easier maintenance**: Fix a bug in the base client, all providers benefit
4. **Better error messages**: Platform-specific error messages are already implemented

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

> **Note**: For Google, Microsoft, SAP, or AWS providers, use the platform-specific base client instead.
> See the "Platform-Specific Base Clients" section above.

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

| File                                                                     | Purpose                                      |
| ------------------------------------------------------------------------ | -------------------------------------------- |
| `backend/src/integrations/providers/[provider-id]/`                      | Provider implementation directory            |
| `backend/src/integrations/providers/[provider-id]/__tests__/fixtures.ts` | Sandbox test fixtures (REQUIRED)             |
| `backend/src/integrations/sandbox/FixtureRegistry.ts`                    | Register provider fixtures here              |
| `backend/src/integrations/registry.ts`                                   | Register provider (add entry here)           |
| `backend/src/services/oauth/OAuthProviderRegistry.ts`                    | OAuth config (OAuth providers only)          |
| `backend/src/core/config/index.ts`                                       | Environment variable config + callback paths |
| `backend/src/integrations/core/google/`                                  | GoogleBaseClient for Google providers        |
| `backend/src/integrations/core/microsoft/`                               | MicrosoftGraphClient for Microsoft providers |
| `backend/src/integrations/core/sap/`                                     | ODataQueryBuilder + error types for SAP      |
| `backend/src/integrations/core/aws/`                                     | AWSBaseClient + signature utils for AWS      |
| `shared/src/providers.ts`                                                | Frontend provider definitions + logo domains |
| `shared/src/connections.ts`                                              | Connection data types                        |
| `infra/pulumi/Pulumi.production.yaml`                                    | Secret definitions (REQUIRED for OAuth)      |
| `infra/scripts/setup-secrets-gcp.sh`                                     | Interactive script to set GCP secret values  |
| `infra/scripts/sync-secrets-local.sh`                                    | Sync GCP secrets to local .env file          |

---

## Testing the Integration

1. **Run unit tests**: `npm test -- --testPathPattern="providers/[provider-id]"`
2. **Run agent integration tests**: `npm run test:integration -- --testPathPattern="integration/agents"` (verifies sandbox fixtures work)
3. **Create connection via UI**: Go to Connections page, add new connection
4. **Test in workflow**: Create a workflow with an Integration node using the new provider
5. **Test in agent**: Add the integration as a tool to an agent and test via chat
6. **Verify MCP tools**: Check that operations appear as tools in the agent's tool list

---

## Common Gotchas

1. **OAuth Callback URL**: Must be registered in the provider's developer console exactly as configured
2. **Scopes**: Ensure all required scopes are requested during OAuth
3. **Token Refresh**: OAuth tokens expire - ensure refresh logic works
4. **Rate Limits**: Configure appropriate rate limits to avoid API throttling
5. **Type Safety**: Run `npx tsc --noEmit` before committing
6. **Pulumi Secrets**: ALWAYS add OAuth credentials to `Pulumi.production.yaml` - without this, the integration won't work in production
7. **Secret Sync**: After adding Pulumi secrets, run `pulumi up` then wait for ESO sync (~5 min) or force it
8. **Environment Variables**: Use SCREAMING_SNAKE_CASE for env var names, must match between config/index.ts and Pulumi.production.yaml
9. **Local Development**: After setting GCP secrets, run `sync-secrets-local.sh` to update your `.env` file
10. **Sandbox Fixtures**: ALWAYS create `__tests__/fixtures.ts` with test data for all operations - agent integration tests depend on this
11. **Fixture Registration**: Don't forget to register fixtures in `FixtureRegistry.ts` - unregistered fixtures won't be used by the sandbox
12. **Realistic Fixtures**: Use realistic sample data in fixtures (real-looking IDs, names, timestamps) - this helps catch edge cases
13. **Platform Base Clients**: When adding a Google/Microsoft/SAP/AWS provider, ALWAYS use the platform-specific base client from `core/google`, `core/microsoft`, `core/sap`, or `core/aws` - don't extend `BaseAPIClient` directly
