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
│  - Per-provider fixtures in __tests__/fixtures/                 │
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

Following the existing `__tests__` convention, test infrastructure lives alongside integration code:

```
backend/src/integrations/
├── core/
│   ├── types.ts                      # Extend OperationDefinition
│   ├── ExecutionRouter.ts            # Existing router
│   ├── MockableExecutionRouter.ts    # NEW: Mock-aware router
│   └── __tests__/
│       ├── fixtures/                 # NEW: Test fixtures
│       │   ├── types.ts              # TestFixture, TestCase types
│       │   ├── registry.ts           # TestDataRegistry
│       │   ├── slack.fixtures.ts
│       │   ├── github.fixtures.ts
│       │   ├── airtable.fixtures.ts
│       │   └── index.ts              # Auto-registers fixtures
│       ├── mocks/                    # NEW: Mock services
│       │   ├── MockDataService.ts
│       │   ├── MockConfig.ts
│       │   └── sandbox-accounts.ts
│       ├── generators/               # NEW: Data generators
│       │   └── realistic-data.ts
│       └── ExecutionRouter.test.ts   # Existing test pattern
└── providers/
    └── slack/
        ├── operations/
        │   ├── sendMessage.ts        # Add outputSchema
        │   └── ...
        └── __tests__/
            └── SlackProvider.test.ts # Provider-specific tests
```

---

## 4. Output Schema Infrastructure

### 4.1 Extend OperationDefinition

**File:** `backend/src/integrations/core/types.ts`

```typescript
export interface OperationDefinition {
    id: string;
    name: string;
    description: string;
    category: string;
    actionType?: OperationActionType;
    inputSchema: z.ZodSchema;
    inputSchemaJSON: JSONSchema;

    // NEW: Output schema fields
    outputSchema?: z.ZodSchema;
    outputSchemaJSON?: JSONSchema;

    // NEW: Example data for testing and documentation
    examples?: OperationExample[];

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

### 4.2 Operation Pattern with Output Schema

**File:** `backend/src/integrations/providers/slack/operations/sendMessage.ts`

```typescript
import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";

// Existing input schema
export const sendMessageSchema = z.object({
    channel: SlackChannelSchema,
    text: SlackTextSchema,
    thread_ts: SlackThreadTsSchema,
    blocks: SlackBlocksSchema
});

// NEW: Output schema
export const sendMessageOutputSchema = z.object({
    messageId: z.string().describe("Slack message timestamp (ts)"),
    channel: z.string().describe("Channel ID where message was posted"),
    threadTimestamp: z.string().optional().describe("Thread timestamp if in thread")
});

export type SendMessageOutput = z.infer<typeof sendMessageOutputSchema>;

// Updated operation definition
export const sendMessageOperation: OperationDefinition = {
    id: "sendMessage",
    name: "Send Message",
    description: "Send a message to a Slack channel or direct message",
    category: "messaging",
    inputSchema: sendMessageSchema,
    inputSchemaJSON: toJSONSchema(sendMessageSchema),
    outputSchema: sendMessageOutputSchema,
    outputSchemaJSON: toJSONSchema(sendMessageOutputSchema),
    examples: [
        {
            name: "simple_text_message",
            input: { channel: "#general", text: "Hello, World!" },
            output: { messageId: "1234567890.123456", channel: "C024BE91L" }
        },
        {
            name: "threaded_reply",
            input: { channel: "C024BE91L", text: "Reply", thread_ts: "1234567890.000001" },
            output: {
                messageId: "1234567890.123457",
                channel: "C024BE91L",
                threadTimestamp: "1234567890.000001"
            }
        }
    ],
    retryable: true,
    timeout: 10000
};
```

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

**File:** `backend/src/integrations/core/__tests__/fixtures/types.ts`

```typescript
import type { OperationResult, OperationError } from "../../types";

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

**File:** `backend/src/integrations/core/__tests__/fixtures/registry.ts`

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

**File:** `backend/src/integrations/core/__tests__/fixtures/slack.fixtures.ts`

```typescript
import type { TestFixture } from "./types";
import type {
    SendMessageParams,
    SendMessageOutput
} from "../../../providers/slack/operations/sendMessage";
import { testDataRegistry } from "./registry";

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

---

## 6. Mock Execution Mode

### 6.1 Mock Configuration

**File:** `backend/src/integrations/core/__tests__/mocks/MockConfig.ts`

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

**File:** `backend/src/integrations/core/__tests__/mocks/MockDataService.ts`

```typescript
import type { OperationResult } from "../../types";
import { testDataRegistry } from "../fixtures/registry";

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
import type { MockModeConfig } from "./__tests__/mocks/MockConfig";
import type { MockDataService } from "./__tests__/mocks/MockDataService";

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

**File:** `backend/src/integrations/core/__tests__/mocks/sandbox-accounts.ts`

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
import { sandboxAccounts } from "../src/integrations/core/__tests__/mocks/sandbox-accounts";

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

| File                                                                  | Purpose                     |
| --------------------------------------------------------------------- | --------------------------- |
| `backend/src/integrations/core/__tests__/fixtures/types.ts`           | TestFixture, TestCase types |
| `backend/src/integrations/core/__tests__/fixtures/registry.ts`        | TestDataRegistry            |
| `backend/src/integrations/core/__tests__/fixtures/slack.fixtures.ts`  | Slack test fixtures         |
| `backend/src/integrations/core/__tests__/fixtures/github.fixtures.ts` | GitHub test fixtures        |
| `backend/src/integrations/core/__tests__/fixtures/index.ts`           | Auto-register all fixtures  |
| `backend/src/integrations/core/__tests__/mocks/MockConfig.ts`         | Mock mode configuration     |
| `backend/src/integrations/core/__tests__/mocks/MockDataService.ts`    | Mock response service       |
| `backend/src/integrations/core/__tests__/mocks/sandbox-accounts.ts`   | Sandbox account definitions |
| `backend/src/integrations/core/MockableExecutionRouter.ts`            | Mock-aware execution router |
| `backend/scripts/seed-test-accounts.ts`                               | Test account seeding script |

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
