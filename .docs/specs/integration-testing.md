# Integration Testing System Specification

## Overview

Implement a comprehensive testing infrastructure for FlowMaestro's 58+ integration providers. This system enables E2E testing of workflows and agents without requiring real external API calls, using structured test data that matches exact provider API contracts.

## Scope Summary

**Features:**

- Output schema definitions for all provider operations
- Structured test fixtures with input/output pairs and mock API responses
- MockableExecutionRouter for intercepting operations at the routing layer
- Test account system with pre-seeded connections
- Hybrid testing mode (mix mocked and live providers)
- Dev-only API endpoints for test data management

**Out of Scope (Future):**

- Automated contract extraction from TypeScript AST
- OpenAPI documentation generation
- Visual fixture editor UI
- Load testing with generated data
- CI integration for mock coverage reporting

---

## 1. Problem Statement

FlowMaestro's integration system lacks comprehensive testing infrastructure:

| Gap                       | Impact                                                  |
| ------------------------- | ------------------------------------------------------- |
| No formal output schemas  | Can't validate mock data matches real responses         |
| No standardized test data | Manual testing inconsistent across providers            |
| No mock mode              | Testing requires real external API credentials          |
| No test accounts          | Developers can't test workflows without production data |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: API Contracts                                         │
│  - Output schemas (Zod) added to OperationDefinition            │
│  - outputSchemaJSON for MCP/frontend compatibility              │
│  - Example input/output pairs for documentation                 │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Test Data Fixtures                                    │
│  - Per-provider fixtures in testing/fixtures/                   │
│  - TestFixture<TInput, TOutput> with valid/error cases          │
│  - TestDataRegistry for centralized access                      │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Mock Execution Mode                                   │
│  - MockableExecutionRouter extends ExecutionRouter              │
│  - MockDataService returns fixtures for matching operations     │
│  - Environment/connection-based mock mode activation            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Structure

Test infrastructure lives in a dedicated `testing/` directory within integrations:

```
backend/src/integrations/
├── core/
│   ├── types.ts                      # Extend OperationDefinition
│   ├── ExecutionRouter.ts            # Existing router
│   └── MockableExecutionRouter.ts    # NEW: Mock-aware router
├── testing/                          # NEW: Test infrastructure
│   ├── core/
│   │   ├── types.ts                  # TestFixture, TestCase types
│   │   └── registry.ts               # TestDataRegistry
│   ├── fixtures/
│   │   ├── slack.fixtures.ts
│   │   ├── github.fixtures.ts
│   │   ├── airtable.fixtures.ts
│   │   └── index.ts                  # Auto-registers fixtures
│   ├── mocks/
│   │   ├── MockDataService.ts
│   │   ├── MockConfig.ts
│   │   └── sandbox-accounts.ts
│   └── generators/
│       └── realistic-data.ts
└── providers/
    └── slack/
        ├── operations/
        │   ├── sendMessage.ts        # Add outputSchema
        │   └── ...
        └── SlackProvider.ts
```

---

## 4. Output Schema Infrastructure

### 4.1 Schema Fields: Zod vs JSON Schema

The `OperationDefinition` interface includes both Zod schemas and JSON Schema versions:

| Field              | Type          | Purpose                                 |
| ------------------ | ------------- | --------------------------------------- |
| `inputSchema`      | `z.ZodSchema` | Runtime validation in TypeScript        |
| `inputSchemaJSON`  | `JSONSchema`  | MCP tool definitions, frontend display  |
| `outputSchema`     | `z.ZodSchema` | Runtime validation of operation results |
| `outputSchemaJSON` | `JSONSchema`  | MCP tool output schema, documentation   |

**Key Insight:** The JSON Schema fields are **always derived** from the Zod schemas using `toJSONSchema()`. They are not independently maintained.

```typescript
// The relationship is always:
outputSchemaJSON = toJSONSchema(outputSchema);
```

### 4.2 Why Both Formats?

**Zod Schema (source of truth):**

- Used for TypeScript type inference (`z.infer<typeof schema>`)
- Runtime validation with rich error messages
- Composable with other Zod schemas

**JSON Schema (derived):**

- Required by MCP protocol for tool definitions
- Used by frontend to render dynamic forms
- Language-agnostic API documentation
- Cannot be reverse-converted to Zod reliably

### 4.3 Simplifying Operation Definitions

To reduce boilerplate and ensure consistency, use a helper function:

**File:** `backend/src/integrations/core/schema-utils.ts`

```typescript
import { toJSONSchema } from "./schema-utils";
import type { OperationDefinition, OperationExample } from "./types";
import type { z } from "zod";

/**
 * Create an operation definition with automatic JSON schema derivation
 */
export function defineOperation(config: {
    id: string;
    name: string;
    description: string;
    category: string;
    inputSchema: z.ZodSchema;
    outputSchema?: z.ZodSchema;
    examples?: OperationExample[];
    retryable?: boolean;
    timeout?: number;
}): OperationDefinition {
    return {
        id: config.id,
        name: config.name,
        description: config.description,
        category: config.category,
        inputSchema: config.inputSchema,
        inputSchemaJSON: toJSONSchema(config.inputSchema), // Auto-derived
        outputSchema: config.outputSchema,
        outputSchemaJSON: config.outputSchema // Auto-derived
            ? toJSONSchema(config.outputSchema)
            : undefined,
        examples: config.examples,
        retryable: config.retryable ?? false,
        timeout: config.timeout
    };
}
```

### 4.4 Clean Operation Pattern

**File:** `backend/src/integrations/providers/slack/operations/sendMessage.ts`

```typescript
import { z } from "zod";
import { defineOperation } from "../../../core/schema-utils";

// Input schema
export const sendMessageSchema = z.object({
    channel: SlackChannelSchema,
    text: SlackTextSchema,
    thread_ts: SlackThreadTsSchema,
    blocks: SlackBlocksSchema
});

// Output schema (Zod only - JSON Schema is derived automatically)
export const sendMessageOutputSchema = z.object({
    messageId: z.string().describe("Slack message timestamp (ts)"),
    channel: z.string().describe("Channel ID where message was posted"),
    threadTimestamp: z.string().describe("Thread timestamp")
});

export type SendMessageParams = z.infer<typeof sendMessageSchema>;
export type SendMessageOutput = z.infer<typeof sendMessageOutputSchema>;

// Clean operation definition - no manual toJSONSchema() calls
export const sendMessageOperation = defineOperation({
    id: "sendMessage",
    name: "Send Message",
    description: "Send a message to a Slack channel or direct message",
    category: "messaging",
    inputSchema: sendMessageSchema,
    outputSchema: sendMessageOutputSchema,
    examples: [
        {
            name: "simple_text_message",
            input: { channel: "#general", text: "Hello, World!" },
            output: { messageId: "1234567890.123456", channel: "C024BE91L" }
        }
    ],
    retryable: true,
    timeout: 10000
});
```

### 4.5 OperationDefinition Interface

**File:** `backend/src/integrations/core/types.ts`

```typescript
export interface OperationDefinition {
    id: string;
    name: string;
    description: string;
    category: string;
    actionType?: OperationActionType;

    // Input schemas
    inputSchema: z.ZodSchema; // Source of truth
    inputSchemaJSON: JSONSchema; // Derived via toJSONSchema()

    // Output schemas (optional)
    outputSchema?: z.ZodSchema; // Source of truth
    outputSchemaJSON?: JSONSchema; // Derived via toJSONSchema()

    // Documentation
    examples?: OperationExample[];

    // Execution config
    rateLimit?: RateLimitConfig;
    timeout?: number;
    retryable: boolean;
}

export interface OperationExample {
    name: string;
    description?: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    tags?: string[]; // e.g., ["happy-path", "error-case", "edge-case"]
}
```

> **Note:** The JSON Schema fields exist for performance (pre-computed at definition time) and serialization (can be returned from API endpoints without importing Zod). They should never be manually authored - always use `defineOperation()` or `toJSONSchema()` to derive them.

### 4.3 Priority Providers for Output Schemas

Add output schemas to these providers first (sorted by usage):

1. Slack - messaging operations
2. GitHub - repository/issue operations
3. Airtable - record operations
4. HubSpot - contact/deal operations
5. Gmail/Google - email/calendar operations
6. Stripe - payment operations
7. Notion - page/database operations
8. Shopify - order/product operations
9. Salesforce - lead/opportunity operations
10. Linear - issue operations

---

## 5. Test Data Fixtures

### 5.1 Core Types

**File:** `backend/src/integrations/testing/core/types.ts`

```typescript
import type { OperationError } from "../../core/types";

/**
 * A single test case with input, expected output, and mock API response
 */
export interface TestCase<TInput, TOutput> {
    /** Unique identifier for this test case */
    name: string;

    /** Human-readable description */
    description?: string;

    /** Input parameters to the operation */
    input: TInput;

    /** Expected output (for success cases) */
    expectedOutput?: TOutput;

    /** Expected error (for error cases) */
    expectedError?: ExpectedError;

    /** Raw API response the mock should return */
    mockAPIResponse: unknown;

    /** Optional response headers */
    mockHeaders?: Record<string, string>;

    /** Optional HTTP status code (default: 200) */
    mockStatusCode?: number;

    /** Tags for filtering: happy-path, error, edge-case, etc. */
    tags?: string[];
}

export interface ExpectedError {
    type: OperationError["type"];
    message: string;
    retryable: boolean;
}

/**
 * Complete fixture set for an operation
 */
export interface TestFixture<TInput, TOutput> {
    /** Operation identifier (e.g., "sendMessage") */
    operationId: string;

    /** Provider identifier (e.g., "slack") */
    provider: string;

    /** Success test cases */
    validCases: TestCase<TInput, TOutput>[];

    /** Error test cases */
    errorCases: TestCase<TInput, undefined>[];

    /** Edge cases (optional) */
    edgeCases?: TestCase<TInput, TOutput>[];
}
```

### 5.2 Fixture Registry

**File:** `backend/src/integrations/testing/core/registry.ts`

```typescript
import type { TestFixture, TestCase } from "./types";

/**
 * Central registry for all test fixtures
 */
class TestDataRegistry {
    private fixtures: Map<string, TestFixture<unknown, unknown>> = new Map();

    /**
     * Register a fixture for an operation
     */
    register<TInput, TOutput>(fixture: TestFixture<TInput, TOutput>): void {
        const key = `${fixture.provider}:${fixture.operationId}`;
        this.fixtures.set(key, fixture as TestFixture<unknown, unknown>);
    }

    /**
     * Get fixture for an operation
     */
    get<TInput, TOutput>(
        provider: string,
        operationId: string
    ): TestFixture<TInput, TOutput> | undefined {
        const key = `${provider}:${operationId}`;
        return this.fixtures.get(key) as TestFixture<TInput, TOutput> | undefined;
    }

    /**
     * Get all fixtures for a provider
     */
    getByProvider(provider: string): TestFixture<unknown, unknown>[] {
        return Array.from(this.fixtures.values()).filter((f) => f.provider === provider);
    }

    /**
     * Get a specific test case by name
     */
    getTestCase<TInput, TOutput>(
        provider: string,
        operationId: string,
        caseName: string
    ): TestCase<TInput, TOutput> | undefined {
        const fixture = this.get<TInput, TOutput>(provider, operationId);
        if (!fixture) return undefined;

        const allCases = [
            ...fixture.validCases,
            ...fixture.errorCases,
            ...(fixture.edgeCases || [])
        ];
        return allCases.find((c) => c.name === caseName);
    }

    /**
     * Check if a fixture exists for an operation
     */
    hasFixture(provider: string, operationId: string): boolean {
        return this.fixtures.has(`${provider}:${operationId}`);
    }

    /**
     * Get all registered fixtures
     */
    getAll(): TestFixture<unknown, unknown>[] {
        return Array.from(this.fixtures.values());
    }
}

export const testDataRegistry = new TestDataRegistry();
```

### 5.3 Example Fixture

**File:** `backend/src/integrations/testing/fixtures/slack.fixtures.ts`

```typescript
import type { TestFixture } from "../core/types";
import type {
    SendMessageParams,
    SendMessageOutput
} from "../../providers/slack/operations/sendMessage";
import { testDataRegistry } from "../core/registry";

const sendMessageFixture: TestFixture<SendMessageParams, SendMessageOutput> = {
    operationId: "sendMessage",
    provider: "slack",
    validCases: [
        {
            name: "simple_text_message",
            description: "Send a simple text message to a channel",
            input: {
                channel: "#general",
                text: "Hello, World!"
            },
            expectedOutput: {
                messageId: "1234567890.123456",
                channel: "C024BE91L",
                threadTimestamp: "1234567890.123456"
            },
            mockAPIResponse: {
                ok: true,
                ts: "1234567890.123456",
                channel: "C024BE91L",
                message: {
                    type: "message",
                    text: "Hello, World!",
                    user: "U12345678",
                    ts: "1234567890.123456"
                }
            },
            tags: ["happy-path"]
        },
        {
            name: "threaded_reply",
            description: "Send a reply in a thread",
            input: {
                channel: "C024BE91L",
                text: "This is a reply",
                thread_ts: "1234567890.000001"
            },
            expectedOutput: {
                messageId: "1234567890.123457",
                channel: "C024BE91L",
                threadTimestamp: "1234567890.000001"
            },
            mockAPIResponse: {
                ok: true,
                ts: "1234567890.123457",
                channel: "C024BE91L"
            },
            tags: ["happy-path"]
        }
    ],
    errorCases: [
        {
            name: "channel_not_found",
            description: "Attempt to send to a non-existent channel",
            input: {
                channel: "#nonexistent",
                text: "Hello"
            },
            expectedError: {
                type: "not_found",
                message: "channel_not_found",
                retryable: false
            },
            mockAPIResponse: {
                ok: false,
                error: "channel_not_found"
            },
            tags: ["error"]
        },
        {
            name: "rate_limited",
            description: "Rate limit exceeded",
            input: {
                channel: "#general",
                text: "Spam message"
            },
            expectedError: {
                type: "rate_limit",
                message: "ratelimited",
                retryable: true
            },
            mockAPIResponse: {
                ok: false,
                error: "ratelimited"
            },
            mockHeaders: {
                "Retry-After": "30"
            },
            tags: ["error", "rate-limit"]
        }
    ]
};

// Register fixtures
testDataRegistry.register(sendMessageFixture);

// Export for direct usage if needed
export { sendMessageFixture };
```

### 5.4 Filterable Data Configuration

For operations that support filtering and pagination (like Airtable's `listRecords` or HubSpot's `searchContacts`), fixtures can include a `filterableData` configuration that enables dynamic filtering behavior in sandbox mode.

**File:** `backend/src/integrations/sandbox/types.ts`

```typescript
/**
 * Configuration for operations that support filtering/pagination
 */
export interface FilterableDataConfig {
    /** The full dataset of records */
    records: Record<string, unknown>[];

    /** Field name that contains the records array in the response */
    recordsField: string; // e.g., "records", "results", "data"

    /** Field name for the pagination offset in responses */
    offsetField?: string; // e.g., "offset", "nextCursor", "after"

    /** Default page size if not specified in params */
    defaultPageSize?: number;

    /** Maximum page size allowed */
    maxPageSize?: number;

    /** Param name for page size */
    pageSizeParam?: string; // e.g., "pageSize", "limit"

    /** Param name for offset/cursor */
    offsetParam?: string; // e.g., "offset", "cursor"

    /** Provider-specific filter configuration */
    filterConfig?: FilterConfig;
}

export interface FilterConfig {
    /** Filter type determines how filters are applied */
    type: "airtable" | "hubspot" | "generic";

    /** Fields that can be filtered on (for generic type) */
    filterableFields?: string[];
}
```

**Example: Airtable listRecords with Filtering**

```typescript
const listRecordsFixture: TestFixture<ListRecordsParams, ListRecordsOutput> = {
    operationId: "listRecords",
    provider: "airtable",

    // Filterable data configuration
    filterableData: {
        recordsField: "records",
        offsetField: "offset",
        defaultPageSize: 100,
        maxPageSize: 100,
        pageSizeParam: "pageSize",
        offsetParam: "offset",
        filterConfig: { type: "airtable" },

        // Base dataset that can be filtered/paginated
        records: [
            {
                id: "recwPQIfs4wKPyc9D",
                fields: { Name: "Record 1", Status: "Active", Priority: "High" },
                createdTime: "2024-01-14T22:04:31.000Z",
                _views: ["All Records", "Active Tasks"] // Internal metadata
            },
            {
                id: "rechOLltN9SpPHq5o",
                fields: { Name: "Record 2", Status: "Pending", Priority: "Medium" },
                createdTime: "2024-01-15T15:21:50.000Z",
                _views: ["All Records"]
            }
            // ... more records
        ]
    },

    validCases: [
        {
            name: "list_with_filter",
            input: {
                baseId: "appXXX",
                tableId: "tblYYY",
                filterByFormula: "{Status} = 'Active'"
            },
            // expectedOutput is for reference; actual results are dynamically filtered
            expectedOutput: {
                records: [
                    /* filtered results */
                ]
            }
        }
    ],
    errorCases: []
};
```

**Supported Filtering Types:**

| Type       | Provider | Supported Filters                                                    |
| ---------- | -------- | -------------------------------------------------------------------- |
| `airtable` | Airtable | `filterByFormula`, `view`, pagination via `pageSize`/`offset`        |
| `hubspot`  | HubSpot  | `filterGroups` with operators: EQ, NEQ, CONTAINS_TOKEN, GT, LT, etc. |
| `generic`  | Any      | Field-based equality filtering on `filterableFields`                 |

**Internal Metadata:**
Records can contain fields prefixed with `_` (like `_views`) for internal filtering logic. These fields are automatically stripped from responses before returning to the caller.

---

## 6. Mock Execution Mode

### 6.1 Mock Configuration

**File:** `backend/src/integrations/testing/mocks/MockConfig.ts`

```typescript
export interface MockModeConfig {
    /** Whether mock mode is enabled globally */
    enabled: boolean;

    /** Behavior when no mock data exists for an operation */
    fallbackBehavior: "error" | "passthrough" | "empty";

    /** Provider-specific overrides */
    providerOverrides: Record<
        string,
        {
            enabled: boolean;
            fallbackBehavior?: MockModeConfig["fallbackBehavior"];
        }
    >;

    /** Per-operation overrides (key: "provider:operation") */
    operationOverrides: Record<
        string,
        {
            enabled: boolean;
            fallbackBehavior?: MockModeConfig["fallbackBehavior"];
        }
    >;
}

/**
 * Load mock config from environment variables
 */
export function getMockModeConfig(): MockModeConfig {
    const enabled = process.env.MOCK_MODE_ENABLED === "true";
    const fallback =
        (process.env.MOCK_MODE_FALLBACK as MockModeConfig["fallbackBehavior"]) || "error";

    const providerOverrides: Record<string, { enabled: boolean }> = {};
    const providerConfig = process.env.MOCK_MODE_PROVIDERS || "";

    for (const entry of providerConfig.split(",").filter(Boolean)) {
        const [provider, mode] = entry.split(":");
        providerOverrides[provider] = {
            enabled: mode === "mock"
        };
    }

    return {
        enabled,
        fallbackBehavior: fallback,
        providerOverrides,
        operationOverrides: {}
    };
}
```

### 6.2 Mock Data Service

**File:** `backend/src/integrations/testing/mocks/MockDataService.ts`

```typescript
import type { OperationResult } from "../../core/types";
import { testDataRegistry } from "../core/registry";

export interface MockScenario {
    id: string;
    provider: string;
    operation: string;
    paramMatchers?: Record<string, unknown>;
    response: OperationResult;
    delay?: number;
}

export class MockDataService {
    private customScenarios: Map<string, MockScenario[]> = new Map();

    /**
     * Get mock response for an operation
     */
    async getMockResponse(
        provider: string,
        operation: string,
        params: Record<string, unknown>
    ): Promise<OperationResult | null> {
        // Check custom scenarios first
        const customResponse = await this.getCustomScenarioResponse(provider, operation, params);
        if (customResponse) return customResponse;

        // Fall back to fixtures
        return this.getFixtureResponse(provider, operation, params);
    }

    /**
     * Register a custom mock scenario (for dynamic testing)
     */
    registerScenario(scenario: MockScenario): void {
        const key = `${scenario.provider}:${scenario.operation}`;
        if (!this.customScenarios.has(key)) {
            this.customScenarios.set(key, []);
        }
        this.customScenarios.get(key)!.push(scenario);
    }

    /**
     * Clear all custom scenarios
     */
    clearScenarios(): void {
        this.customScenarios.clear();
    }

    private async getCustomScenarioResponse(
        provider: string,
        operation: string,
        params: Record<string, unknown>
    ): Promise<OperationResult | null> {
        const key = `${provider}:${operation}`;
        const scenarios = this.customScenarios.get(key) || [];

        for (const scenario of scenarios) {
            if (this.matchesParams(scenario.paramMatchers, params)) {
                if (scenario.delay) {
                    await new Promise((resolve) => setTimeout(resolve, scenario.delay));
                }
                return scenario.response;
            }
        }
        return null;
    }

    private getFixtureResponse(
        provider: string,
        operation: string,
        _params: Record<string, unknown>
    ): OperationResult | null {
        const fixture = testDataRegistry.get(provider, operation);
        if (!fixture || fixture.validCases.length === 0) return null;

        // Return first valid case as default
        const testCase = fixture.validCases[0];
        return {
            success: true,
            data: testCase.expectedOutput
        };
    }

    private matchesParams(
        matchers: Record<string, unknown> | undefined,
        params: Record<string, unknown>
    ): boolean {
        if (!matchers) return true;
        for (const [key, value] of Object.entries(matchers)) {
            if (params[key] !== value) return false;
        }
        return true;
    }
}

export const mockDataService = new MockDataService();
```

### 6.3 MockableExecutionRouter

**File:** `backend/src/integrations/core/MockableExecutionRouter.ts`

```typescript
import { ExecutionRouter } from "./ExecutionRouter";
import { ProviderRegistry } from "./ProviderRegistry";
import type { OperationResult, ExecutionContext } from "./types";
import type { ConnectionWithData } from "../../storage/models/Connection";
import type { MockModeConfig } from "../testing/mocks/MockConfig";
import type { MockDataService } from "../testing/mocks/MockDataService";

export class MockableExecutionRouter extends ExecutionRouter {
    constructor(
        providerRegistry: ProviderRegistry,
        private mockDataService: MockDataService,
        private mockConfig: MockModeConfig
    ) {
        super(providerRegistry);
    }

    async execute(
        providerName: string,
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        context: ExecutionContext
    ): Promise<OperationResult> {
        // Check if mock mode applies to this operation
        if (this.shouldMock(providerName, operationId, connection)) {
            const mockResponse = await this.mockDataService.getMockResponse(
                providerName,
                operationId,
                params
            );

            if (mockResponse) {
                return mockResponse;
            }

            // Handle fallback behavior
            return this.handleFallback(providerName, operationId, params, connection, context);
        }

        // Pass through to real execution
        return super.execute(providerName, operationId, params, connection, context);
    }

    private shouldMock(
        providerName: string,
        operationId: string,
        connection: ConnectionWithData
    ): boolean {
        // Check if connection is marked as test connection
        if (connection.metadata?.isTestConnection) {
            return true;
        }

        // Check operation-level override
        const operationKey = `${providerName}:${operationId}`;
        const opOverride = this.mockConfig.operationOverrides[operationKey];
        if (opOverride !== undefined) {
            return opOverride.enabled;
        }

        // Check provider-level override
        const providerOverride = this.mockConfig.providerOverrides[providerName];
        if (providerOverride !== undefined) {
            return providerOverride.enabled;
        }

        // Fall back to global setting
        return this.mockConfig.enabled;
    }

    private async handleFallback(
        providerName: string,
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        context: ExecutionContext
    ): Promise<OperationResult> {
        const fallbackBehavior = this.getFallbackBehavior(providerName, operationId);

        switch (fallbackBehavior) {
            case "passthrough":
                return super.execute(providerName, operationId, params, connection, context);

            case "empty":
                return {
                    success: true,
                    data: {}
                };

            case "error":
            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `No mock data found for ${providerName}:${operationId}`,
                        retryable: false
                    }
                };
        }
    }

    private getFallbackBehavior(
        providerName: string,
        operationId: string
    ): MockModeConfig["fallbackBehavior"] {
        const operationKey = `${providerName}:${operationId}`;

        if (this.mockConfig.operationOverrides[operationKey]?.fallbackBehavior) {
            return this.mockConfig.operationOverrides[operationKey].fallbackBehavior!;
        }

        if (this.mockConfig.providerOverrides[providerName]?.fallbackBehavior) {
            return this.mockConfig.providerOverrides[providerName].fallbackBehavior!;
        }

        return this.mockConfig.fallbackBehavior;
    }
}
```

---

## 7. Test Account System

### 7.1 Sandbox Accounts

**File:** `backend/src/integrations/testing/mocks/sandbox-accounts.ts`

```typescript
export interface MockAccount {
    id: string;
    provider: string;
    name: string;
    description: string;
    credentials: {
        type: "api_key" | "oauth2" | "basic_auth";
        tokenPrefix: string;
    };
    prePopulatedData: Record<string, MockResource[]>;
    capabilities: string[];
}

export interface MockResource {
    id: string;
    data: Record<string, unknown>;
}

export const sandboxAccounts: MockAccount[] = [
    {
        id: "sandbox-slack-demo",
        provider: "slack",
        name: "Demo Slack Workspace",
        description: "A pre-populated Slack workspace for testing",
        credentials: {
            type: "oauth2",
            tokenPrefix: "xoxb-sandbox-demo-"
        },
        capabilities: ["sendMessage", "listChannels", "listUsers", "getChannel", "uploadFile"],
        prePopulatedData: {
            channels: [
                {
                    id: "C001GENERAL",
                    data: { name: "general", is_private: false, num_members: 45 }
                },
                { id: "C002RANDOM", data: { name: "random", is_private: false, num_members: 42 } },
                {
                    id: "C003ENGINEERING",
                    data: { name: "engineering", is_private: true, num_members: 12 }
                }
            ],
            users: [
                {
                    id: "U001ALICE",
                    data: { name: "alice", real_name: "Alice Johnson", email: "alice@demo.com" }
                },
                {
                    id: "U002BOB",
                    data: { name: "bob", real_name: "Bob Smith", email: "bob@demo.com" }
                }
            ]
        }
    },
    {
        id: "sandbox-github-demo",
        provider: "github",
        name: "Demo GitHub Account",
        description: "A demo GitHub user with sample repositories",
        credentials: {
            type: "oauth2",
            tokenPrefix: "ghp_sandbox_demo_"
        },
        capabilities: [
            "listRepositories",
            "getRepository",
            "createIssue",
            "listIssues",
            "createPullRequest"
        ],
        prePopulatedData: {
            repositories: [
                {
                    id: "repo-001",
                    data: {
                        id: 123456,
                        name: "demo-app",
                        full_name: "demo-user/demo-app",
                        private: false,
                        description: "A demo application",
                        default_branch: "main"
                    }
                }
            ],
            issues: [
                {
                    id: "issue-001",
                    data: { id: 789, number: 1, title: "Sample bug report", state: "open" }
                }
            ]
        }
    },
    {
        id: "sandbox-stripe-demo",
        provider: "stripe",
        name: "Demo Stripe Account",
        description: "A test-mode Stripe account with sample data",
        credentials: {
            type: "api_key",
            tokenPrefix: "sk_test_sandbox_demo_"
        },
        capabilities: [
            "createPaymentIntent",
            "getPaymentIntent",
            "listPaymentIntents",
            "createCustomer"
        ],
        prePopulatedData: {
            customers: [
                {
                    id: "cus_demo_001",
                    data: { id: "cus_demo_001", email: "alice@example.com", name: "Alice Demo" }
                }
            ],
            paymentIntents: [
                {
                    id: "pi_demo_001",
                    data: { id: "pi_demo_001", amount: 2000, currency: "usd", status: "succeeded" }
                }
            ]
        }
    }
];
```

### 7.2 Test Account Seeding Script

**File:** `backend/scripts/seed-test-accounts.ts`

```typescript
import { Pool } from "pg";
import { v4 as uuid } from "uuid";
import { hashPassword } from "../src/core/utils/password";
import { EncryptionService } from "../src/services/EncryptionService";
import { sandboxAccounts } from "../src/integrations/testing/mocks/sandbox-accounts";

const TEST_ACCOUNTS = [
    {
        email: "test-user@flowmaestro.dev",
        password: "TestPassword123!",
        name: "Test User",
        workspaceName: "Test Workspace"
    },
    {
        email: "demo@flowmaestro.dev",
        password: "DemoPassword123!",
        name: "Demo User",
        workspaceName: "Demo Workspace"
    }
];

async function seedTestAccounts(): Promise<void> {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const encryptionService = new EncryptionService();

    try {
        for (const account of TEST_ACCOUNTS) {
            const userId = uuid();
            const workspaceId = uuid();
            const passwordHash = await hashPassword(account.password);

            // Create user
            await pool.query(
                `INSERT INTO flowmaestro.users (id, email, password_hash, name, email_verified, auth_provider)
                 VALUES ($1, $2, $3, $4, true, 'local')
                 ON CONFLICT (email) DO UPDATE SET name = $4`,
                [userId, account.email, passwordHash, account.name]
            );

            // Create workspace with test flag
            await pool.query(
                `INSERT INTO flowmaestro.workspaces (id, name, slug, owner_id, settings)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (slug) DO UPDATE SET settings = $5`,
                [
                    workspaceId,
                    account.workspaceName,
                    `test-${userId.slice(0, 8)}`,
                    userId,
                    JSON.stringify({ isTestWorkspace: true, testConfig: { mockMode: "full" } })
                ]
            );

            // Create workspace membership
            await pool.query(
                `INSERT INTO flowmaestro.workspace_members (id, workspace_id, user_id, role)
                 VALUES ($1, $2, $3, 'owner')
                 ON CONFLICT DO NOTHING`,
                [uuid(), workspaceId, userId]
            );

            // Create test connections for each sandbox account
            for (const sandbox of sandboxAccounts) {
                const connectionId = uuid();
                const encryptedData = encryptionService.encrypt(
                    JSON.stringify({
                        access_token: `${sandbox.credentials.tokenPrefix}test-token`,
                        token_type: "Bearer"
                    })
                );

                await pool.query(
                    `INSERT INTO flowmaestro.connections
                     (id, user_id, workspace_id, name, connection_method, provider, encrypted_data, status, metadata)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)
                     ON CONFLICT DO NOTHING`,
                    [
                        connectionId,
                        userId,
                        workspaceId,
                        sandbox.name,
                        sandbox.credentials.type,
                        sandbox.provider,
                        encryptedData,
                        JSON.stringify({
                            isTestConnection: true,
                            account_info: { name: sandbox.name }
                        })
                    ]
                );
            }

            console.log(`Created test account: ${account.email}`);
        }
    } finally {
        await pool.end();
    }
}

seedTestAccounts().catch(console.error);
```

---

## 8. Environment Configuration

### Environment Variables

```bash
# Enable mock mode globally
MOCK_MODE_ENABLED=true

# Fallback behavior when no mock exists: error | passthrough | empty
MOCK_MODE_FALLBACK=error

# Per-provider overrides (comma-separated provider:mode pairs)
# mode can be: mock, passthrough
MOCK_MODE_PROVIDERS=slack:mock,github:mock,stripe:passthrough
```

### Connection Metadata

Connections can be marked as test connections via metadata:

```json
{
    "isTestConnection": true,
    "account_info": {
        "name": "Demo Slack Workspace"
    }
}
```

---

## 9. Files to Create/Modify

### New Files

| File                                                           | Purpose                     |
| -------------------------------------------------------------- | --------------------------- |
| `backend/src/integrations/testing/core/types.ts`               | TestFixture, TestCase types |
| `backend/src/integrations/testing/core/registry.ts`            | TestDataRegistry            |
| `backend/src/integrations/testing/fixtures/slack.fixtures.ts`  | Slack test fixtures         |
| `backend/src/integrations/testing/fixtures/github.fixtures.ts` | GitHub test fixtures        |
| `backend/src/integrations/testing/fixtures/index.ts`           | Auto-register all fixtures  |
| `backend/src/integrations/testing/mocks/MockConfig.ts`         | Mock mode configuration     |
| `backend/src/integrations/testing/mocks/MockDataService.ts`    | Mock response service       |
| `backend/src/integrations/testing/mocks/sandbox-accounts.ts`   | Sandbox account definitions |
| `backend/src/integrations/core/MockableExecutionRouter.ts`     | Mock-aware execution router |
| `backend/scripts/seed-test-accounts.ts`                        | Test account seeding script |

### Modified Files

| File                                                                             | Change                                                    |
| -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `backend/src/integrations/core/types.ts`                                         | Add `outputSchemaJSON`, `examples` to OperationDefinition |
| `backend/src/integrations/providers/slack/operations/*.ts`                       | Add output schemas                                        |
| `backend/src/integrations/providers/github/operations/*.ts`                      | Add output schemas                                        |
| `backend/src/storage/models/Workspace.ts`                                        | Add `testConfig` to WorkspaceSettings                     |
| `backend/src/temporal/activities/execution/handlers/integrations/integration.ts` | Use MockableExecutionRouter when mock mode enabled        |

---

## 10. Verification Plan

### Unit Tests

1. **Output Schema Validation**: Verify fixtures match output schemas
2. **MockDataService**: Test scenario matching and response interpolation
3. **MockableExecutionRouter**: Test mock mode activation and fallback behavior

### Integration Tests

1. Create workflow using Slack sendMessage operation
2. Enable mock mode via `MOCK_MODE_ENABLED=true`
3. Execute workflow
4. Verify mock response returned (not real Slack API call)

### Manual Testing

1. Run `npm run db:seed:test-accounts`
2. Log in as `test-user@flowmaestro.dev`
3. Verify pre-populated connections appear
4. Create workflow with Slack operation
5. Execute - should return mock data

---

## 11. Implementation Priority

| Week | Deliverables                                                   |
| ---- | -------------------------------------------------------------- |
| 1    | Output schema infrastructure + Slack/GitHub output schemas     |
| 2    | Test data fixtures for Slack/GitHub/Airtable + MockDataService |
| 3    | MockableExecutionRouter + environment configuration            |
| 4    | Test account system + seeding script                           |
| 5    | Remaining provider fixtures (HubSpot, Stripe, Notion, etc.)    |

---

## 12. Comprehensive Test Suite

### 12.1 Test Suite Structure

```
backend/__tests__/
├── integration/
│   ├── providers/                    # Provider operation tests
│   │   ├── slack.test.ts
│   │   ├── github.test.ts
│   │   ├── airtable.test.ts
│   │   ├── hubspot.test.ts
│   │   ├── stripe.test.ts
│   │   ├── linear.test.ts
│   │   └── helpers/
│   │       └── provider-test-utils.ts
│   ├── workflows/                    # Workflow execution tests
│   │   ├── single-integration.test.ts
│   │   ├── multi-integration.test.ts
│   │   └── error-handling.test.ts
│   └── agents/                       # Agent execution tests
│       ├── tool-execution.test.ts
│       └── multi-tool-flow.test.ts
```

### 12.2 Provider Test Helper

**File:** `backend/__tests__/integration/providers/helpers/provider-test-utils.ts`

```typescript
import {
    testDataRegistry,
    type TestFixture,
    type TestCase
} from "../../../../src/integrations/testing";
import { MockableExecutionRouter } from "../../../../src/integrations/core/MockableExecutionRouter";
import { mockDataService } from "../../../../src/integrations/testing/mocks/MockDataService";
import { getMockModeConfig } from "../../../../src/integrations/testing/mocks/MockConfig";
import { providerRegistry } from "../../../../src/integrations/core/ProviderRegistry";
import type { ConnectionWithData } from "../../../../src/storage/models/Connection";
import type { ExecutionContext } from "../../../../src/integrations/core/types";

/**
 * Create a mock connection for testing
 */
export function createTestConnection(
    provider: string,
    overrides: Partial<ConnectionWithData> = {}
): ConnectionWithData {
    return {
        id: `test-connection-${provider}`,
        userId: "test-user",
        workspaceId: "test-workspace",
        name: `Test ${provider} Connection`,
        connectionMethod: "oauth2",
        provider,
        status: "active",
        encryptedData: "encrypted-test-data",
        metadata: { isTestConnection: true },
        createdAt: new Date(),
        updatedAt: new Date(),
        decryptedCredentials: {
            access_token: "test-token",
            token_type: "Bearer"
        },
        ...overrides
    } as ConnectionWithData;
}

/**
 * Create a mock execution context
 */
export function createTestContext(mode: "workflow" | "agent" = "workflow"): ExecutionContext {
    if (mode === "workflow") {
        return {
            mode: "workflow",
            workflowId: "test-workflow-id",
            nodeId: "test-node-id"
        };
    }
    return {
        mode: "agent",
        conversationId: "test-conversation-id",
        toolCallId: "test-tool-call-id"
    };
}

/**
 * Create a MockableExecutionRouter for testing
 */
export async function createTestRouter(): Promise<MockableExecutionRouter> {
    const mockConfig = getMockModeConfig();
    mockConfig.enabled = true;
    mockConfig.fallbackBehavior = "error";

    return new MockableExecutionRouter(providerRegistry, mockDataService, mockConfig);
}

/**
 * Run all fixture test cases for a provider
 */
export function describeProviderFixtures(provider: string) {
    const fixtures = testDataRegistry.getByProvider(provider);

    if (fixtures.length === 0) {
        it.skip(`No fixtures found for provider: ${provider}`, () => {});
        return;
    }

    describe.each(fixtures)("$operationId", (fixture: TestFixture<unknown, unknown>) => {
        let router: MockableExecutionRouter;
        let connection: ConnectionWithData;
        let context: ExecutionContext;

        beforeAll(async () => {
            router = await createTestRouter();
            connection = createTestConnection(provider);
            context = createTestContext();
        });

        describe("valid cases", () => {
            if (fixture.validCases.length === 0) {
                it.skip("No valid cases defined", () => {});
                return;
            }

            test.each(fixture.validCases)("$name", async (testCase: TestCase<unknown, unknown>) => {
                const result = await router.execute(
                    provider,
                    fixture.operationId,
                    testCase.input as Record<string, unknown>,
                    connection,
                    context
                );

                expect(result.success).toBe(true);
                if (testCase.expectedOutput) {
                    expect(result.data).toMatchObject(testCase.expectedOutput as object);
                }
            });
        });

        describe("error cases", () => {
            if (fixture.errorCases.length === 0) {
                it.skip("No error cases defined", () => {});
                return;
            }

            test.each(fixture.errorCases)(
                "$name",
                async (testCase: TestCase<unknown, undefined>) => {
                    // Register error scenario
                    mockDataService.registerScenario({
                        id: `error-${testCase.name}`,
                        provider,
                        operation: fixture.operationId,
                        paramMatchers: testCase.input as Record<string, unknown>,
                        response: {
                            success: false,
                            error: {
                                type: testCase.expectedError?.type || "server_error",
                                message: testCase.expectedError?.message || "Test error",
                                retryable: testCase.expectedError?.retryable || false
                            }
                        }
                    });

                    const result = await router.execute(
                        provider,
                        fixture.operationId,
                        testCase.input as Record<string, unknown>,
                        connection,
                        context
                    );

                    expect(result.success).toBe(false);
                    if (testCase.expectedError) {
                        expect(result.error?.type).toBe(testCase.expectedError.type);
                    }

                    // Clean up scenario
                    mockDataService.removeScenario(`error-${testCase.name}`);
                }
            );
        });
    });
}
```

### 12.3 Provider Operation Tests

**File:** `backend/__tests__/integration/providers/slack.test.ts`

```typescript
import { describeProviderFixtures } from "./helpers/provider-test-utils";
import "../../../src/integrations/testing/fixtures"; // Auto-register fixtures

describe("Slack Provider Operations", () => {
    describeProviderFixtures("slack");
});
```

**File:** `backend/__tests__/integration/providers/github.test.ts`

```typescript
import { describeProviderFixtures } from "./helpers/provider-test-utils";
import "../../../src/integrations/testing/fixtures";

describe("GitHub Provider Operations", () => {
    describeProviderFixtures("github");
});
```

### 12.4 Workflow Integration Tests

**File:** `backend/__tests__/integration/workflows/single-integration.test.ts`

```typescript
import {
    createTestEnvironment,
    runWorkflowAndAssert,
    createTestWorkflowDefinition
} from "../../helpers/temporal-test-env";
import type { TestEnvironment } from "../../helpers/temporal-test-env";
import { mockDataService } from "../../../src/integrations/testing/mocks/MockDataService";
import "../../../src/integrations/testing/fixtures";

describe("Workflow with Single Integration Node", () => {
    let testEnv: TestEnvironment;

    beforeAll(async () => {
        testEnv = await createTestEnvironment({
            defaultOutputs: {
                integration: {
                    messageId: "1234567890.123456",
                    channel: "C024BE91L",
                    threadTimestamp: "1234567890.123456"
                }
            }
        });
    });

    afterAll(async () => {
        await testEnv.cleanup();
    });

    beforeEach(() => {
        mockDataService.clearScenarios();
    });

    it("executes Slack sendMessage in workflow context", async () => {
        const workflow = createTestWorkflowDefinition({
            name: "Slack Message Workflow",
            nodes: [
                {
                    id: "trigger",
                    type: "trigger",
                    config: {}
                },
                {
                    id: "integration_node",
                    type: "integration",
                    config: {
                        provider: "slack",
                        operation: "sendMessage",
                        inputs: {
                            channel: "{{trigger.channel}}",
                            text: "{{trigger.message}}"
                        }
                    }
                }
            ],
            edges: [{ source: "trigger", target: "integration_node" }]
        });

        await runWorkflowAndAssert(
            testEnv,
            workflow,
            {
                inputs: { channel: "#general", message: "Hello from workflow!" }
            },
            {
                expectSuccess: true
            }
        );
    });

    it("handles integration errors gracefully", async () => {
        // Register error scenario
        mockDataService.registerScenario({
            id: "channel-not-found",
            provider: "slack",
            operation: "sendMessage",
            paramMatchers: { channel: "#nonexistent" },
            response: {
                success: false,
                error: {
                    type: "not_found",
                    message: "channel_not_found",
                    retryable: false
                }
            }
        });

        const workflow = createTestWorkflowDefinition({
            name: "Slack Error Workflow",
            nodes: [
                { id: "trigger", type: "trigger", config: {} },
                {
                    id: "integration_node",
                    type: "integration",
                    config: {
                        provider: "slack",
                        operation: "sendMessage",
                        inputs: { channel: "#nonexistent", text: "Test" }
                    }
                }
            ],
            edges: [{ source: "trigger", target: "integration_node" }]
        });

        await runWorkflowAndAssert(
            testEnv,
            workflow,
            { inputs: {} },
            {
                expectSuccess: false,
                expectError: "channel_not_found"
            }
        );
    });
});
```

**File:** `backend/__tests__/integration/workflows/multi-integration.test.ts`

```typescript
import {
    createTestEnvironment,
    runWorkflowAndAssert,
    createTestWorkflowDefinition
} from "../../helpers/temporal-test-env";
import type { TestEnvironment } from "../../helpers/temporal-test-env";
import { mockDataService } from "../../../src/integrations/testing/mocks/MockDataService";
import "../../../src/integrations/testing/fixtures";

describe("Workflow with Multiple Integration Nodes", () => {
    let testEnv: TestEnvironment;

    beforeAll(async () => {
        testEnv = await createTestEnvironment({});
    });

    afterAll(async () => {
        await testEnv.cleanup();
    });

    beforeEach(() => {
        mockDataService.clearScenarios();
    });

    it("executes GitHub + Slack in sequence", async () => {
        const workflow = createTestWorkflowDefinition({
            name: "GitHub to Slack Notification",
            nodes: [
                { id: "trigger", type: "trigger", config: {} },
                {
                    id: "github_node",
                    type: "integration",
                    config: {
                        provider: "github",
                        operation: "createIssue",
                        inputs: {
                            owner: "demo-user",
                            repo: "demo-app",
                            title: "{{trigger.issueTitle}}",
                            body: "{{trigger.issueBody}}"
                        }
                    }
                },
                {
                    id: "slack_node",
                    type: "integration",
                    config: {
                        provider: "slack",
                        operation: "sendMessage",
                        inputs: {
                            channel: "#engineering",
                            text: "New issue created: {{github_node.title}}"
                        }
                    }
                }
            ],
            edges: [
                { source: "trigger", target: "github_node" },
                { source: "github_node", target: "slack_node" }
            ]
        });

        await runWorkflowAndAssert(
            testEnv,
            workflow,
            {
                inputs: {
                    issueTitle: "Test Issue",
                    issueBody: "This is a test issue"
                }
            },
            {
                expectSuccess: true,
                expectCompletedNodes: ["trigger", "github_node", "slack_node"]
            }
        );
    });

    it("executes parallel integrations", async () => {
        const workflow = createTestWorkflowDefinition({
            name: "Parallel Notifications",
            nodes: [
                { id: "trigger", type: "trigger", config: {} },
                {
                    id: "slack_node",
                    type: "integration",
                    config: {
                        provider: "slack",
                        operation: "sendMessage",
                        inputs: { channel: "#general", text: "{{trigger.message}}" }
                    }
                },
                {
                    id: "linear_node",
                    type: "integration",
                    config: {
                        provider: "linear",
                        operation: "createIssue",
                        inputs: {
                            teamId: "team-123",
                            title: "{{trigger.message}}"
                        }
                    }
                }
            ],
            edges: [
                { source: "trigger", target: "slack_node" },
                { source: "trigger", target: "linear_node" }
            ]
        });

        await runWorkflowAndAssert(
            testEnv,
            workflow,
            { inputs: { message: "Parallel notification test" } },
            { expectSuccess: true }
        );
    });
});
```

### 12.5 Agent Tool Execution Tests

**File:** `backend/__tests__/integration/agents/tool-execution.test.ts`

```typescript
import { mockDataService } from "../../../src/integrations/testing/mocks/MockDataService";
import { MockableExecutionRouter } from "../../../src/integrations/core/MockableExecutionRouter";
import { getMockModeConfig } from "../../../src/integrations/testing/mocks/MockConfig";
import { providerRegistry } from "../../../src/integrations/core/ProviderRegistry";
import { createTestConnection, createTestContext } from "../providers/helpers/provider-test-utils";
import "../../../src/integrations/testing/fixtures";

describe("Agent Tool Execution", () => {
    let router: MockableExecutionRouter;

    beforeAll(async () => {
        const mockConfig = getMockModeConfig();
        mockConfig.enabled = true;
        router = new MockableExecutionRouter(providerRegistry, mockDataService, mockConfig);
    });

    beforeEach(() => {
        mockDataService.clearScenarios();
    });

    it("executes MCP tool via agent", async () => {
        const connection = createTestConnection("slack");
        const context = createTestContext("agent");

        // Simulate tool call from LLM
        const toolCall = {
            name: "slack_sendMessage",
            arguments: { channel: "#general", text: "Agent message" }
        };

        // Parse tool call to extract provider and operation
        const [provider, operation] = toolCall.name.split("_");

        const result = await router.execute(
            provider,
            operation,
            toolCall.arguments,
            connection,
            context
        );

        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty("messageId");
    });

    it("handles tool errors and reports to agent", async () => {
        const connection = createTestConnection("slack");
        const context = createTestContext("agent");

        // Register error scenario
        mockDataService.registerScenario({
            id: "agent-error-test",
            provider: "slack",
            operation: "sendMessage",
            paramMatchers: { channel: "#invalid" },
            response: {
                success: false,
                error: {
                    type: "not_found",
                    message: "channel_not_found",
                    retryable: false
                }
            }
        });

        const result = await router.execute(
            "slack",
            "sendMessage",
            { channel: "#invalid", text: "Test" },
            connection,
            context
        );

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain("channel_not_found");
    });

    it("executes multiple tools in sequence", async () => {
        const slackConnection = createTestConnection("slack");
        const githubConnection = createTestConnection("github");
        const context = createTestContext("agent");

        // First tool call: Create GitHub issue
        const githubResult = await router.execute(
            "github",
            "createIssue",
            { owner: "demo-user", repo: "demo-app", title: "Bug report" },
            githubConnection,
            context
        );
        expect(githubResult.success).toBe(true);

        // Second tool call: Notify on Slack
        const slackResult = await router.execute(
            "slack",
            "sendMessage",
            { channel: "#bugs", text: "New bug report filed" },
            slackConnection,
            context
        );
        expect(slackResult.success).toBe(true);
    });
});
```

---

## 13. Schema & Fixture Generation Strategy

### 13.1 Prioritized Provider Tiers

Given 82 providers and 792 operations, we prioritize by usage and complexity:

**Tier 1 - Core (10 providers, ~120 ops)** - Full manual schemas + fixtures:

| Provider      | Operations | Status      |
| ------------- | ---------- | ----------- |
| Slack         | 4 ops      | ✅ Complete |
| GitHub        | 2 ops      | ✅ Complete |
| Airtable      | 16 ops     | ✅ Complete |
| HubSpot       | 2 ops      | ✅ Complete |
| Stripe        | 17 ops     | ✅ Complete |
| Linear        | 8 ops      | ✅ Complete |
| Gmail         | 18 ops     | 📝 Pending  |
| Google Sheets | 19 ops     | 📝 Pending  |
| Notion        | 6 ops      | 📝 Pending  |
| Salesforce    | 9 ops      | 📝 Pending  |

**Tier 2 - High Usage (15 providers, ~200 ops)** - Output schemas + basic fixtures:

- Mailchimp, SendGrid, YouTube, Google Calendar, Google Drive
- Microsoft Teams, Shopify, Jira, Asana, Monday
- Zendesk, Intercom, Calendly, Typeform, Zapier

**Tier 3 - Standard (30 providers, ~250 ops)** - Generated schemas from API docs:

- All remaining providers with established APIs

**Tier 4 - Long Tail (27 providers, ~220 ops)** - Minimal stubs:

- Niche providers, use passthrough mock behavior

### 13.2 Schema Generation Script

**File:** `backend/scripts/generate-output-schemas.ts`

```typescript
/**
 * Generate Output Schemas
 *
 * Analyzes existing operation execute functions to generate output schemas.
 * Uses TypeScript compiler API to extract return types.
 *
 * Usage: npx tsx backend/scripts/generate-output-schemas.ts [provider]
 */

import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";
import { glob } from "glob";
import { zodToJsonSchema } from "zod-to-json-schema";

interface OperationSchema {
    provider: string;
    operationId: string;
    inputSchema: string;
    outputSchema: string | null;
    outputSchemaJSON: object | null;
}

async function analyzeOperation(filePath: string): Promise<OperationSchema | null> {
    const sourceFile = ts.createSourceFile(
        filePath,
        fs.readFileSync(filePath, "utf-8"),
        ts.ScriptTarget.Latest,
        true
    );

    let operationId: string | null = null;
    let hasOutputSchema = false;

    // Walk the AST to find operation definition and output schema
    ts.forEachChild(sourceFile, (node) => {
        if (ts.isVariableStatement(node)) {
            const decl = node.declarationList.declarations[0];
            if (decl && ts.isIdentifier(decl.name)) {
                const name = decl.name.text;
                if (name.endsWith("Operation")) {
                    operationId = name.replace("Operation", "");
                }
                if (name.endsWith("OutputSchema")) {
                    hasOutputSchema = true;
                }
            }
        }
    });

    if (!operationId) return null;

    const provider = path.basename(path.dirname(path.dirname(filePath)));

    return {
        provider,
        operationId,
        inputSchema: `${operationId}Schema`,
        outputSchema: hasOutputSchema ? `${operationId}OutputSchema` : null,
        outputSchemaJSON: null
    };
}

async function generateOutputSchemas(targetProvider?: string): Promise<void> {
    const pattern = targetProvider
        ? `backend/src/integrations/providers/${targetProvider}/operations/*.ts`
        : "backend/src/integrations/providers/*/operations/*.ts";

    const files = await glob(pattern, { ignore: ["**/index.ts", "**/types.ts"] });

    console.log(`Analyzing ${files.length} operation files...`);

    const results: OperationSchema[] = [];
    let withSchema = 0;
    let withoutSchema = 0;

    for (const file of files) {
        const schema = await analyzeOperation(file);
        if (schema) {
            results.push(schema);
            if (schema.outputSchema) {
                withSchema++;
            } else {
                withoutSchema++;
            }
        }
    }

    console.log(`\nResults:`);
    console.log(`  With output schema: ${withSchema}`);
    console.log(`  Without output schema: ${withoutSchema}`);
    console.log(`  Coverage: ${((withSchema / (withSchema + withoutSchema)) * 100).toFixed(1)}%`);

    // Group by provider
    const byProvider: Record<string, OperationSchema[]> = {};
    for (const schema of results) {
        if (!byProvider[schema.provider]) {
            byProvider[schema.provider] = [];
        }
        byProvider[schema.provider].push(schema);
    }

    console.log(`\nPer-provider coverage:`);
    for (const [provider, schemas] of Object.entries(byProvider)) {
        const hasSchema = schemas.filter((s) => s.outputSchema).length;
        const total = schemas.length;
        const pct = ((hasSchema / total) * 100).toFixed(0);
        const status = hasSchema === total ? "✅" : hasSchema > 0 ? "🔶" : "❌";
        console.log(`  ${status} ${provider}: ${hasSchema}/${total} (${pct}%)`);
    }

    // Write report
    const reportPath = "backend/scripts/output/schema-coverage-report.json";
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({ results, byProvider }, null, 2));
    console.log(`\nReport written to: ${reportPath}`);
}

// Run
const targetProvider = process.argv[2];
generateOutputSchemas(targetProvider).catch(console.error);
```

### 13.3 Fixture Generation Script

**File:** `backend/scripts/generate-fixtures.ts`

```typescript
/**
 * Generate Test Fixtures
 *
 * Generates test fixtures for provider operations based on:
 * 1. Input schema analysis
 * 2. Output schema (if available)
 * 3. Realistic data generation via Faker
 *
 * Usage: npx tsx backend/scripts/generate-fixtures.ts [provider]
 */

import { faker } from "@faker-js/faker";
import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

interface GeneratedFixture {
    operationId: string;
    provider: string;
    validCases: Array<{
        name: string;
        description: string;
        input: Record<string, unknown>;
        expectedOutput: Record<string, unknown>;
        mockAPIResponse: Record<string, unknown>;
        tags: string[];
    }>;
    errorCases: Array<{
        name: string;
        description: string;
        input: Record<string, unknown>;
        expectedError: { type: string; message: string; retryable: boolean };
        mockAPIResponse: Record<string, unknown>;
        tags: string[];
    }>;
}

/**
 * Generate realistic values based on field name and type
 */
function generateValue(fieldName: string, fieldType: string): unknown {
    const name = fieldName.toLowerCase();

    // String patterns
    if (fieldType === "string") {
        if (name.includes("email")) return faker.internet.email();
        if (name.includes("name")) return faker.person.fullName();
        if (name.includes("title")) return faker.lorem.sentence({ min: 3, max: 6 });
        if (name.includes("description") || name.includes("body")) return faker.lorem.paragraph();
        if (name.includes("url") || name.includes("link")) return faker.internet.url();
        if (name.includes("channel")) return `#${faker.lorem.word()}`;
        if (name.includes("id")) return faker.string.alphanumeric(12);
        if (name.includes("timestamp") || name.includes("ts")) return `${Date.now() / 1000}`;
        return faker.lorem.word();
    }

    // Number patterns
    if (fieldType === "number" || fieldType === "integer") {
        if (name.includes("amount") || name.includes("price"))
            return faker.number.int({ min: 100, max: 10000 });
        if (name.includes("count") || name.includes("limit"))
            return faker.number.int({ min: 1, max: 100 });
        return faker.number.int({ min: 1, max: 1000 });
    }

    // Boolean
    if (fieldType === "boolean") {
        return faker.datatype.boolean();
    }

    // Array
    if (fieldType === "array") {
        return [];
    }

    return null;
}

/**
 * Generate fixtures for a single operation
 */
function generateOperationFixture(
    provider: string,
    operationId: string,
    inputFields: Array<{ name: string; type: string; required: boolean }>,
    outputFields: Array<{ name: string; type: string }>
): GeneratedFixture {
    const validCases = [];
    const errorCases = [];

    // Generate minimal input case
    const minimalInput: Record<string, unknown> = {};
    for (const field of inputFields.filter((f) => f.required)) {
        minimalInput[field.name] = generateValue(field.name, field.type);
    }

    // Generate expected output
    const expectedOutput: Record<string, unknown> = {};
    for (const field of outputFields) {
        expectedOutput[field.name] = generateValue(field.name, field.type);
    }

    validCases.push({
        name: "minimal_input",
        description: `${operationId} with only required fields`,
        input: minimalInput,
        expectedOutput,
        mockAPIResponse: { ok: true, ...expectedOutput },
        tags: ["happy-path", "minimal"]
    });

    // Generate full input case
    const fullInput: Record<string, unknown> = {};
    for (const field of inputFields) {
        fullInput[field.name] = generateValue(field.name, field.type);
    }

    validCases.push({
        name: "full_input",
        description: `${operationId} with all fields populated`,
        input: fullInput,
        expectedOutput,
        mockAPIResponse: { ok: true, ...expectedOutput },
        tags: ["happy-path", "full"]
    });

    // Generate common error cases
    errorCases.push({
        name: "not_found",
        description: "Resource not found error",
        input: { ...minimalInput, id: "nonexistent" },
        expectedError: { type: "not_found", message: "Resource not found", retryable: false },
        mockAPIResponse: { ok: false, error: "not_found" },
        tags: ["error"]
    });

    errorCases.push({
        name: "rate_limited",
        description: "Rate limit exceeded",
        input: minimalInput,
        expectedError: { type: "rate_limit", message: "Rate limit exceeded", retryable: true },
        mockAPIResponse: { ok: false, error: "rate_limited" },
        tags: ["error", "rate-limit"]
    });

    return {
        operationId,
        provider,
        validCases,
        errorCases
    };
}

async function generateFixtures(targetProvider?: string): Promise<void> {
    console.log(
        `Generating fixtures${targetProvider ? ` for ${targetProvider}` : " for all providers"}...`
    );

    // This is a skeleton - in production, you'd read actual schema files
    // and parse them to extract field information

    const fixtures: GeneratedFixture[] = [];

    // Example: Generate fixture for a hypothetical operation
    const exampleFixture = generateOperationFixture(
        targetProvider || "example",
        "exampleOperation",
        [
            { name: "name", type: "string", required: true },
            { name: "email", type: "string", required: true },
            { name: "description", type: "string", required: false }
        ],
        [
            { name: "id", type: "string" },
            { name: "createdAt", type: "string" }
        ]
    );

    fixtures.push(exampleFixture);

    // Write generated fixtures
    const outputPath = `backend/scripts/output/generated-fixtures/${targetProvider || "all"}.fixtures.ts`;
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const content = `
import type { TestFixture } from "../../src/integrations/testing/core/types";
import { testDataRegistry } from "../../src/integrations/testing/core/registry";

// Auto-generated fixtures - review and customize before use

${fixtures
    .map(
        (f) => `
const ${f.operationId}Fixture: TestFixture<unknown, unknown> = ${JSON.stringify(f, null, 4)};

testDataRegistry.register(${f.operationId}Fixture);
`
    )
    .join("\n")}
`;

    fs.writeFileSync(outputPath, content);
    console.log(`Generated ${fixtures.length} fixtures to: ${outputPath}`);
}

// Run
const targetProvider = process.argv[2];
generateFixtures(targetProvider).catch(console.error);
```

### 13.4 Mock Coverage Validation Script

**File:** `backend/scripts/validate-mock-coverage.ts`

```typescript
/**
 * Validate Mock Coverage
 *
 * Reports coverage statistics for test fixtures and output schemas.
 *
 * Usage: npx tsx backend/scripts/validate-mock-coverage.ts
 */

import "../src/integrations/testing/fixtures"; // Auto-register fixtures
import { testDataRegistry } from "../src/integrations/testing/core/registry";
import { providerRegistry } from "../src/integrations/core/ProviderRegistry";

async function validateMockCoverage(): Promise<void> {
    console.log("Validating mock coverage...\n");

    const providers = await providerRegistry.getProviderNames();
    const coverage = testDataRegistry.getCoverage();

    let totalOps = 0;
    let coveredOps = 0;

    console.log("Provider Coverage:");
    console.log("==================\n");

    for (const providerName of providers.sort()) {
        const provider = await providerRegistry.getProvider(providerName);
        if (!provider) continue;

        const operations = provider.getOperations();
        const fixtureCount = coverage[providerName] || 0;
        const opCount = operations.length;

        totalOps += opCount;
        coveredOps += fixtureCount;

        const pct = opCount > 0 ? ((fixtureCount / opCount) * 100).toFixed(0) : 0;
        const status = fixtureCount === opCount ? "✅" : fixtureCount > 0 ? "🔶" : "❌";

        console.log(
            `${status} ${providerName.padEnd(20)} ${fixtureCount}/${opCount} operations (${pct}%)`
        );

        // List uncovered operations
        if (fixtureCount < opCount) {
            for (const op of operations) {
                if (!testDataRegistry.hasFixture(providerName, op.id)) {
                    console.log(`   - ${op.id} (missing fixture)`);
                }
            }
        }
    }

    console.log("\n==================");
    console.log(
        `Total: ${coveredOps}/${totalOps} operations (${((coveredOps / totalOps) * 100).toFixed(1)}% coverage)`
    );

    // Exit with error if coverage is below threshold
    const threshold = parseFloat(process.env.MOCK_COVERAGE_THRESHOLD || "0");
    const actualCoverage = (coveredOps / totalOps) * 100;

    if (threshold > 0 && actualCoverage < threshold) {
        console.error(
            `\n❌ Coverage ${actualCoverage.toFixed(1)}% is below threshold ${threshold}%`
        );
        process.exit(1);
    }
}

validateMockCoverage().catch(console.error);
```

---

## 14. Updated Files to Create/Modify

### New Files (Test Suite)

| File                                                                     | Purpose                           |
| ------------------------------------------------------------------------ | --------------------------------- |
| `backend/__tests__/integration/providers/helpers/provider-test-utils.ts` | Provider test utilities           |
| `backend/__tests__/integration/providers/slack.test.ts`                  | Slack provider operation tests    |
| `backend/__tests__/integration/providers/github.test.ts`                 | GitHub provider operation tests   |
| `backend/__tests__/integration/providers/airtable.test.ts`               | Airtable provider operation tests |
| `backend/__tests__/integration/providers/hubspot.test.ts`                | HubSpot provider operation tests  |
| `backend/__tests__/integration/providers/stripe.test.ts`                 | Stripe provider operation tests   |
| `backend/__tests__/integration/providers/linear.test.ts`                 | Linear provider operation tests   |
| `backend/__tests__/integration/workflows/single-integration.test.ts`     | Single integration node tests     |
| `backend/__tests__/integration/workflows/multi-integration.test.ts`      | Multi-integration workflow tests  |
| `backend/__tests__/integration/agents/tool-execution.test.ts`            | Agent tool execution tests        |

### New Files (Generation Scripts)

| File                                         | Purpose                         |
| -------------------------------------------- | ------------------------------- |
| `backend/scripts/generate-output-schemas.ts` | Auto-generate output schemas    |
| `backend/scripts/generate-fixtures.ts`       | Auto-generate test fixtures     |
| `backend/scripts/validate-mock-coverage.ts`  | Report mock coverage statistics |

---

## 15. Updated Verification Plan

### Unit Tests

1. **Provider Tests**: Run `npm test -- --testPathPattern=providers` - all fixture-based tests pass
2. **Output Schema Validation**: Fixtures match output schemas via Zod parsing

### Integration Tests

1. **Workflow Tests**: Run `npm test -- --testPathPattern=workflows` - integration nodes work in workflow context
2. **Agent Tests**: Run `npm test -- --testPathPattern=agents` - MCP tools work in agent context

### Coverage Reports

1. **Schema Coverage**: Run `npx tsx backend/scripts/generate-output-schemas.ts` - shows % with output schemas
2. **Fixture Coverage**: Run `npx tsx backend/scripts/validate-mock-coverage.ts` - shows % with fixtures

### Manual E2E

1. Create test connection in UI (toggle "Create as test connection")
2. Build workflow using the test connection
3. Execute workflow
4. Verify mock data returned (no real API call made)

---

## 16. Implementation Batches

### Batch 1: Test Suite Foundation (Priority: High)

1. Create provider test utilities (`provider-test-utils.ts`)
2. Create tests for existing 6 providers with fixtures
3. Add workflow integration tests
4. Add agent tool execution tests

### Batch 2: Tier 1 Provider Completion (Priority: High)

1. Add output schemas to Gmail, Google Sheets, Notion, Salesforce
2. Create fixtures for remaining Tier 1 providers
3. Expand test coverage

### Batch 3: Generation Tooling (Priority: Medium)

1. Build `generate-output-schemas.ts` script
2. Build `generate-fixtures.ts` script
3. Build `validate-mock-coverage.ts` script
4. Add CI integration for coverage reporting

### Batch 4: Tier 2-3 Providers (Priority: Medium)

1. Generate schemas for Tier 2 providers
2. Generate fixtures for Tier 2 providers
3. Basic coverage for Tier 3 providers

### Batch 5: Full Coverage (Priority: Low)

1. Complete Tier 4 providers with stubs
2. Add edge case tests
3. Comprehensive error scenario coverage
