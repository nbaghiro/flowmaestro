# Integration Provider Test Suite Specification

## Overview

This document specifies a comprehensive test suite for integration providers to ensure they are rock solid. The existing sandbox fixtures infrastructure is well-developed (150+ providers, filterableData support, error cases), but testing using this infrastructure is minimal.

## Current State

### What Exists (Well-developed)
1. **Fixture Infrastructure** - `TestFixture` with validCases, errorCases, edgeCases, filterableData
2. **SandboxDataService** - Filtering (Airtable, HubSpot, generic), pagination, interpolation
3. **FixtureRegistry** - 150+ providers with fixtures registered
4. **Provider Test Files** - 80+ files, but very thin (just call `describeProviderFixtures()`)
5. **describeProviderFixtures()** - Auto-generates tests from fixtures through sandbox

### Gaps to Address
1. No schema validation (fixture inputs/outputs don't validate against Zod schemas)
2. No provider implementation unit tests (BaseProvider, API clients)
3. No webhook signature verification tests
4. No MCP adapter tests
5. Limited error scenario coverage
6. No concurrency/rate limiting tests
7. ExecutionRouter tests need expansion

---

## Part 1: Unit Tests (Colocated with Providers)

All unit tests live alongside their implementation in `backend/src/integrations/providers/{provider}/__tests__/`.

### 1.1 Provider Class Tests
**Location:** `backend/src/integrations/providers/{provider}/__tests__/provider.test.ts`

Test each provider class in isolation:

```typescript
describe("SlackProvider", () => {
    let provider: SlackProvider;

    beforeEach(() => { provider = new SlackProvider(); });

    describe("operation registration", () => {
        it("registers sendMessage operation", () => {
            const ops = provider.getOperations();
            const sendMessage = ops.find(o => o.id === "sendMessage");
            expect(sendMessage).toBeDefined();
            expect(sendMessage?.category).toBe("messaging");
            expect(sendMessage?.actionType).toBe("write");
        });

        it("registers listChannels operation", () => {
            const ops = provider.getOperations();
            const listChannels = ops.find(o => o.id === "listChannels");
            expect(listChannels).toBeDefined();
            expect(listChannels?.actionType).toBe("read");
        });
    });

    describe("trigger registration", () => {
        it("registers message trigger", () => {
            const triggers = provider.getTriggers();
            expect(triggers?.map(t => t.id)).toContain("message");
        });

        it("registers app_mention trigger", () => {
            const triggers = provider.getTriggers();
            expect(triggers?.map(t => t.id)).toContain("app_mention");
        });
    });

    describe("parameter validation", () => {
        it("validates sendMessage with valid params", () => {
            expect(() => provider.validateParams("sendMessage", {
                channel: "#general",
                text: "Hello"
            })).not.toThrow();
        });

        it("rejects sendMessage without channel", () => {
            expect(() => provider.validateParams("sendMessage", {
                text: "Hello"
            })).toThrow(/channel/);
        });

        it("validates listChannels with optional params", () => {
            expect(() => provider.validateParams("listChannels", {})).not.toThrow();
            expect(() => provider.validateParams("listChannels", {
                excludeArchived: true,
                limit: 100
            })).not.toThrow();
        });
    });

    describe("auth configuration", () => {
        it("returns OAuth config", () => {
            const config = provider.getAuthConfig();
            expect(config.type).toBe("oauth2");
        });

        it("has required scopes for operations", () => {
            const config = provider.getAuthConfig() as OAuthConfig;
            expect(config.scopes).toContain("chat:write");
            expect(config.scopes).toContain("channels:read");
        });
    });

    describe("webhook configuration", () => {
        it("has timestamp_signature type", () => {
            const config = provider.getWebhookConfig();
            expect(config?.signatureType).toBe("timestamp_signature");
        });

        it("specifies correct headers", () => {
            const config = provider.getWebhookConfig();
            expect(config?.signatureHeader).toBe("X-Slack-Signature");
            expect(config?.timestampHeader).toBe("X-Slack-Request-Timestamp");
        });
    });

    describe("MCP tools", () => {
        it("generates tools for all operations", () => {
            const tools = provider.getMCPTools();
            const ops = provider.getOperations();
            expect(tools.length).toBe(ops.length);
        });

        it("follows naming convention", () => {
            const tools = provider.getMCPTools();
            for (const tool of tools) {
                expect(tool.name).toMatch(/^slack_[a-zA-Z]+$/);
            }
        });

        it("has valid JSON schemas", () => {
            const tools = provider.getMCPTools();
            for (const tool of tools) {
                expect(() => JSON.stringify(tool.inputSchema)).not.toThrow();
            }
        });
    });
});
```

### 1.2 API Client Tests
**Location:** `backend/src/integrations/providers/{provider}/__tests__/client.test.ts`

Test provider-specific API client:

```typescript
describe("SlackClient", () => {
    let client: SlackClient;
    let mockFetch: jest.Mock;

    beforeEach(() => {
        mockFetch = jest.fn();
        client = new SlackClient({
            accessToken: "xoxb-test-token",
            fetch: mockFetch // inject mock
        });
    });

    describe("postMessage", () => {
        it("sends message with correct payload", async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok: true,
                ts: "1234567890.123456",
                channel: "C024BE91L"
            }));

            const result = await client.postMessage({
                channel: "#general",
                text: "Hello"
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "https://slack.com/api/chat.postMessage",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({ channel: "#general", text: "Hello" })
                })
            );
        });

        it("maps Slack error to OperationError", async () => {
            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok: false,
                error: "channel_not_found"
            }));

            const result = await client.postMessage({
                channel: "#nonexistent",
                text: "Hello"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toBe("channel_not_found");
        });
    });

    describe("error mapping", () => {
        it.each([
            ["channel_not_found", "not_found", false],
            ["not_in_channel", "permission", false],
            ["ratelimited", "rate_limit", true],
            ["invalid_blocks", "validation", false],
            ["internal_error", "server_error", true]
        ])("maps %s to %s (retryable: %s)", async (slackError, expectedType, retryable) => {
            mockFetch.mockResolvedValueOnce(createMockResponse({
                ok: false,
                error: slackError
            }));

            const result = await client.postMessage({ channel: "#test", text: "hi" });
            expect(result.error?.type).toBe(expectedType);
            expect(result.error?.retryable).toBe(retryable);
        });
    });
});
```

### 1.3 Webhook Verification Tests
**Location:** `backend/src/integrations/providers/{provider}/__tests__/webhook.test.ts`

Test webhook signature verification for providers that support webhooks:

```typescript
describe("Slack Webhook Verification", () => {
    const provider = new SlackProvider();
    const secret = "test_signing_secret_12345";

    describe("signature verification", () => {
        it("verifies valid Slack signature", () => {
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const body = '{"type":"event_callback","event":{"type":"message"}}';
            const signature = createSlackSignature(secret, timestamp, body);

            const result = provider.verifyWebhookSignature(secret, {
                headers: {
                    "x-slack-signature": signature,
                    "x-slack-request-timestamp": timestamp
                },
                body
            });

            expect(result.valid).toBe(true);
        });

        it("rejects expired timestamp (replay attack prevention)", () => {
            const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString(); // 10 min ago
            const body = '{"type":"event_callback"}';
            const signature = createSlackSignature(secret, oldTimestamp, body);

            const result = provider.verifyWebhookSignature(secret, {
                headers: {
                    "x-slack-signature": signature,
                    "x-slack-request-timestamp": oldTimestamp
                },
                body
            });

            expect(result.valid).toBe(false);
            expect(result.error).toMatch(/too old|expired/i);
        });

        it("rejects invalid signature", () => {
            const timestamp = Math.floor(Date.now() / 1000).toString();

            const result = provider.verifyWebhookSignature(secret, {
                headers: {
                    "x-slack-signature": "v0=invalid_signature",
                    "x-slack-request-timestamp": timestamp
                },
                body: '{"type":"event_callback"}'
            });

            expect(result.valid).toBe(false);
        });

        it("rejects missing headers", () => {
            const result = provider.verifyWebhookSignature(secret, {
                headers: {},
                body: '{"type":"event_callback"}'
            });

            expect(result.valid).toBe(false);
            expect(result.error).toMatch(/missing/i);
        });
    });

    describe("event type extraction", () => {
        it("extracts message event type", () => {
            const eventType = provider.extractEventType({
                headers: {},
                body: JSON.stringify({
                    type: "event_callback",
                    event: { type: "message" }
                })
            });
            expect(eventType).toBe("message");
        });

        it("extracts app_mention event type", () => {
            const eventType = provider.extractEventType({
                headers: {},
                body: JSON.stringify({
                    type: "event_callback",
                    event: { type: "app_mention" }
                })
            });
            expect(eventType).toBe("app_mention");
        });

        it("identifies slash_command", () => {
            const eventType = provider.extractEventType({
                headers: { "content-type": "application/x-www-form-urlencoded" },
                body: "command=%2Fmycommand&text=hello"
            });
            expect(eventType).toBe("slash_command");
        });

        it("identifies url_verification challenge", () => {
            const eventType = provider.extractEventType({
                headers: {},
                body: JSON.stringify({ type: "url_verification", challenge: "abc123" })
            });
            expect(eventType).toBe("url_verification");
        });
    });
});
```

### 1.4 Operation Executor Tests
**Location:** `backend/src/integrations/providers/{provider}/__tests__/operations.test.ts`

Test individual operation executors:

```typescript
describe("Slack Operation Executors", () => {
    let mockClient: jest.Mocked<SlackClient>;

    beforeEach(() => {
        mockClient = createMockSlackClient();
    });

    describe("executeSendMessage", () => {
        it("calls client with normalized params", async () => {
            mockClient.postMessage.mockResolvedValueOnce({
                ok: true, ts: "123", channel: "C024BE91L"
            });

            await executeSendMessage(mockClient, {
                channel: "#general",
                text: "Hello"
            });

            expect(mockClient.postMessage).toHaveBeenCalledWith({
                channel: "#general",
                text: "Hello"
            });
        });

        it("returns normalized output", async () => {
            mockClient.postMessage.mockResolvedValueOnce({
                ok: true,
                ts: "1234567890.123456",
                channel: "C024BE91L"
            });

            const result = await executeSendMessage(mockClient, {
                channel: "#general",
                text: "Hello"
            });

            expect(result).toEqual({
                messageId: "1234567890.123456",
                channel: "C024BE91L",
                threadTimestamp: "1234567890.123456"
            });
        });
    });

    describe("executeListChannels", () => {
        it("handles pagination correctly", async () => {
            mockClient.listConversations
                .mockResolvedValueOnce({
                    ok: true,
                    channels: [{ id: "C1" }, { id: "C2" }],
                    response_metadata: { next_cursor: "cursor123" }
                })
                .mockResolvedValueOnce({
                    ok: true,
                    channels: [{ id: "C3" }],
                    response_metadata: { next_cursor: "" }
                });

            const result = await executeListChannels(mockClient, {
                limit: 100
            });

            expect(result.channels).toHaveLength(3);
        });
    });
});
```

---

## Part 2: Integration Tests

Integration tests live in `backend/__tests__/integration/providers/` and test the full execution path across multiple components.

### 2.1 Schema Contract Tests
**Location:** `backend/__tests__/integration/providers/schema-contract.test.ts`

Validate that fixture data matches operation schemas - catches drift between fixtures and implementations:

```typescript
describe("Schema Contract Tests", () => {
    beforeAll(async () => {
        // Load all providers and fixtures
        for (const name of providerRegistry.getRegisteredProviders()) {
            await providerRegistry.loadProvider(name);
        }
    });

    describe("fixture input validation", () => {
        it.each(providerRegistry.getRegisteredProviders())(
            "%s fixtures have valid inputs",
            async (providerName) => {
                const provider = providerRegistry.getProvider(providerName);
                const fixtures = fixtureRegistry.getByProvider(providerName);
                const violations: string[] = [];

                for (const fixture of fixtures) {
                    const operation = provider.getOperations()
                        .find(o => o.id === fixture.operationId);

                    if (!operation) {
                        violations.push(`${fixture.operationId}: operation not found`);
                        continue;
                    }

                    for (const testCase of fixture.validCases) {
                        const result = operation.inputSchema.safeParse(testCase.input);
                        if (!result.success) {
                            violations.push(
                                `${fixture.operationId}.${testCase.name}: ${result.error.message}`
                            );
                        }
                    }
                }

                expect(violations).toEqual([]);
            }
        );
    });

    describe("fixture output shape validation", () => {
        it.each(providerRegistry.getRegisteredProviders())(
            "%s fixtures have correctly shaped outputs",
            async (providerName) => {
                const provider = providerRegistry.getProvider(providerName);
                const fixtures = fixtureRegistry.getByProvider(providerName);

                for (const fixture of fixtures) {
                    const operation = provider.getOperations()
                        .find(o => o.id === fixture.operationId);

                    if (!operation?.outputSchema) continue;

                    for (const testCase of fixture.validCases) {
                        if (!testCase.expectedOutput) continue;

                        const result = operation.outputSchema.safeParse(testCase.expectedOutput);
                        expect(result.success).toBe(true);
                    }
                }
            }
        );
    });

    describe("error case inputs are valid (errors happen at API level)", () => {
        it.each(providerRegistry.getRegisteredProviders())(
            "%s error cases have schema-valid inputs",
            async (providerName) => {
                const provider = providerRegistry.getProvider(providerName);
                const fixtures = fixtureRegistry.getByProvider(providerName);

                for (const fixture of fixtures) {
                    const operation = provider.getOperations()
                        .find(o => o.id === fixture.operationId);

                    if (!operation) continue;

                    // Error cases should have valid inputs - the error comes from the API
                    for (const testCase of fixture.errorCases) {
                        const result = operation.inputSchema.safeParse(testCase.input);
                        // Either valid OR intentionally invalid (for validation errors)
                        if (!result.success && testCase.expectedError?.type !== "validation") {
                            fail(`Error case ${testCase.name} has invalid input but isn't a validation error`);
                        }
                    }
                }
            }
        );
    });
});
```

### 2.2 Execution Router Integration Tests
**Location:** `backend/__tests__/integration/providers/execution-router.test.ts`

Test the full execution path from router through sandbox:

```typescript
describe("ExecutionRouter Integration", () => {
    let router: ExecutionRouter;

    beforeEach(() => {
        router = new ExecutionRouter(providerRegistry);
        sandboxDataService.clearScenarios();
    });

    describe("sandbox routing", () => {
        it("uses sandbox for test connections", async () => {
            const connection = createTestConnection("slack", {
                metadata: { isTestConnection: true }
            });

            const result = await router.execute(
                "slack",
                "sendMessage",
                { channel: "#general", text: "Hello" },
                connection,
                createWorkflowContext()
            );

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty("messageId");
            // Verify sandbox data was used (not real API)
            expect(result.data.messageId).toBe("1503435956.000247");
        });

        it("matches custom scenarios over fixtures", async () => {
            sandboxDataService.registerScenario({
                id: "custom-response",
                provider: "slack",
                operation: "sendMessage",
                response: {
                    success: true,
                    data: { customField: "custom-value" }
                }
            });

            const result = await router.execute(
                "slack",
                "sendMessage",
                { channel: "#general", text: "Hello" },
                createTestConnection("slack"),
                createWorkflowContext()
            );

            expect(result.data).toEqual({ customField: "custom-value" });
        });

        it("matches scenarios by param matchers", async () => {
            sandboxDataService.registerScenario({
                id: "specific-channel",
                provider: "slack",
                operation: "sendMessage",
                paramMatchers: { channel: "#alerts" },
                response: {
                    success: true,
                    data: { messageId: "alert-message" }
                }
            });

            // Request to #alerts matches scenario
            const alertResult = await router.execute(
                "slack", "sendMessage",
                { channel: "#alerts", text: "Alert!" },
                createTestConnection("slack"),
                createWorkflowContext()
            );
            expect(alertResult.data.messageId).toBe("alert-message");

            // Request to #general falls back to fixture
            const generalResult = await router.execute(
                "slack", "sendMessage",
                { channel: "#general", text: "Hello" },
                createTestConnection("slack"),
                createWorkflowContext()
            );
            expect(generalResult.data.messageId).not.toBe("alert-message");
        });
    });

    describe("error scenarios", () => {
        it("returns error response for error scenarios", async () => {
            sandboxDataService.registerScenario({
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

            const result = await router.execute(
                "slack",
                "sendMessage",
                { channel: "#nonexistent", text: "Hello" },
                createTestConnection("slack"),
                createWorkflowContext()
            );

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toBe("channel_not_found");
        });
    });

    describe("fallback behavior", () => {
        it("returns error when no sandbox data and fallback=error", async () => {
            // Operation with no fixture
            const result = await router.execute(
                "slack",
                "unknownOperation",
                {},
                createTestConnection("slack"),
                createWorkflowContext()
            );

            expect(result.success).toBe(false);
            expect(result.error?.message).toMatch(/no sandbox data/i);
        });
    });

    describe("filterable data operations", () => {
        it("applies pagination to list operations", async () => {
            const result = await router.execute(
                "slack",
                "listChannels",
                { limit: 3 },
                createTestConnection("slack"),
                createWorkflowContext()
            );

            expect(result.success).toBe(true);
            expect(result.data.channels.length).toBeLessThanOrEqual(3);
            if (result.data.channels.length === 3) {
                expect(result.data).toHaveProperty("nextCursor");
            }
        });

        it("applies filters to list operations", async () => {
            const result = await router.execute(
                "slack",
                "listChannels",
                { types: "private_channel" },
                createTestConnection("slack"),
                createWorkflowContext()
            );

            expect(result.success).toBe(true);
            for (const channel of result.data.channels) {
                expect(channel.isPrivate).toBe(true);
            }
        });
    });
});
```

### 2.3 Cross-Provider Data Flow Tests
**Location:** `backend/__tests__/integration/providers/cross-provider.test.ts`

Test data flowing between different providers:

```typescript
describe("Cross-Provider Data Flow", () => {
    let router: ExecutionRouter;

    beforeEach(async () => {
        router = new ExecutionRouter(providerRegistry);
        sandboxDataService.clearScenarios();
    });

    it("chains GitHub issue creation to Slack notification", async () => {
        // Step 1: Create GitHub issue
        const githubResult = await router.execute(
            "github",
            "createIssue",
            {
                owner: "demo-user",
                repo: "demo-app",
                title: "Bug report",
                body: "Description"
            },
            createTestConnection("github"),
            createWorkflowContext()
        );

        expect(githubResult.success).toBe(true);
        const issueNumber = githubResult.data.number;
        const issueUrl = githubResult.data.url;

        // Step 2: Send Slack notification with GitHub data
        const slackResult = await router.execute(
            "slack",
            "sendMessage",
            {
                channel: "#engineering",
                text: `New issue #${issueNumber}: ${issueUrl}`
            },
            createTestConnection("slack"),
            createWorkflowContext()
        );

        expect(slackResult.success).toBe(true);
    });

    it("syncs data from Airtable to HubSpot", async () => {
        // Get record from Airtable
        const airtableResult = await router.execute(
            "airtable",
            "getRecord",
            { baseId: "app123", tableId: "tbl456", recordId: "rec789" },
            createTestConnection("airtable"),
            createWorkflowContext()
        );

        expect(airtableResult.success).toBe(true);
        const record = airtableResult.data;

        // Create contact in HubSpot with Airtable data
        const hubspotResult = await router.execute(
            "hubspot",
            "createContact",
            {
                email: record.fields.Email,
                firstname: record.fields.Name.split(" ")[0],
                lastname: record.fields.Name.split(" ")[1]
            },
            createTestConnection("hubspot"),
            createWorkflowContext()
        );

        expect(hubspotResult.success).toBe(true);
    });

    it("handles mixed success and failure in parallel operations", async () => {
        // Register one failure scenario
        sandboxDataService.registerScenario({
            id: "linear-fail",
            provider: "linear",
            operation: "createIssue",
            response: {
                success: false,
                error: { type: "server_error", message: "API unavailable", retryable: true }
            }
        });

        // Execute multiple providers in parallel
        const results = await Promise.all([
            router.execute("slack", "sendMessage", { channel: "#test", text: "hi" },
                createTestConnection("slack"), createWorkflowContext()),
            router.execute("linear", "createIssue", { teamId: "team", title: "test" },
                createTestConnection("linear"), createWorkflowContext()),
            router.execute("github", "createIssue", { owner: "o", repo: "r", title: "test" },
                createTestConnection("github"), createWorkflowContext())
        ]);

        // Slack and GitHub succeed, Linear fails
        expect(results[0].success).toBe(true);
        expect(results[1].success).toBe(false);
        expect(results[2].success).toBe(true);
    });
});
```

### 2.4 Error Scenario Tests
**Location:** `backend/__tests__/integration/providers/error-scenarios.test.ts`

Test comprehensive error scenarios across providers:

```typescript
describe("Error Scenario Tests", () => {
    let router: ExecutionRouter;

    beforeEach(() => {
        router = new ExecutionRouter(providerRegistry);
        sandboxDataService.clearScenarios();
    });

    describe("network errors", () => {
        it.each([
            ["ECONNRESET", "server_error", true],
            ["ETIMEDOUT", "server_error", true],
            ["ENOTFOUND", "server_error", false]
        ])("handles %s error correctly", async (code, expectedType, retryable) => {
            sandboxDataService.registerScenario({
                id: `network-${code}`,
                provider: "slack",
                operation: "sendMessage",
                response: {
                    success: false,
                    error: {
                        type: expectedType,
                        message: `Network error: ${code}`,
                        code,
                        retryable
                    }
                }
            });

            const result = await router.execute(
                "slack", "sendMessage",
                { channel: "#test", text: "hello" },
                createTestConnection("slack"),
                createWorkflowContext()
            );

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe(expectedType);
            expect(result.error?.retryable).toBe(retryable);
        });
    });

    describe("rate limiting", () => {
        it("returns rate_limit error with retry info", async () => {
            sandboxDataService.registerScenario({
                id: "rate-limited",
                provider: "slack",
                operation: "sendMessage",
                response: {
                    success: false,
                    error: {
                        type: "rate_limit",
                        message: "Too many requests",
                        retryable: true,
                        details: { retryAfter: 30 }
                    }
                }
            });

            const result = await router.execute(
                "slack", "sendMessage",
                { channel: "#test", text: "hello" },
                createTestConnection("slack"),
                createWorkflowContext()
            );

            expect(result.error?.type).toBe("rate_limit");
            expect(result.error?.retryable).toBe(true);
            expect(result.error?.details?.retryAfter).toBe(30);
        });
    });

    describe("authentication errors", () => {
        it.each([
            ["token_expired", "permission", false],
            ["token_revoked", "permission", false],
            ["invalid_auth", "permission", false],
            ["missing_scope", "permission", false]
        ])("handles %s auth error", async (errorCode, expectedType, retryable) => {
            sandboxDataService.registerScenario({
                id: `auth-${errorCode}`,
                provider: "slack",
                operation: "sendMessage",
                response: {
                    success: false,
                    error: {
                        type: expectedType,
                        message: errorCode,
                        retryable
                    }
                }
            });

            const result = await router.execute(
                "slack", "sendMessage",
                { channel: "#test", text: "hello" },
                createTestConnection("slack"),
                createWorkflowContext()
            );

            expect(result.error?.type).toBe(expectedType);
        });
    });

    describe("provider-specific errors", () => {
        describe("Slack errors", () => {
            it.each([
                ["channel_not_found", "not_found"],
                ["not_in_channel", "permission"],
                ["invalid_blocks", "validation"],
                ["msg_too_long", "validation"]
            ])("maps %s to %s", async (slackError, expectedType) => {
                sandboxDataService.registerScenario({
                    id: `slack-${slackError}`,
                    provider: "slack",
                    operation: "sendMessage",
                    response: {
                        success: false,
                        error: { type: expectedType, message: slackError, retryable: false }
                    }
                });

                const result = await router.execute(
                    "slack", "sendMessage",
                    { channel: "#test", text: "hello" },
                    createTestConnection("slack"),
                    createWorkflowContext()
                );

                expect(result.error?.type).toBe(expectedType);
            });
        });

        describe("GitHub errors", () => {
            it.each([
                ["Not Found", "not_found"],
                ["Bad credentials", "permission"],
                ["Validation Failed", "validation"]
            ])("maps '%s' to %s", async (githubError, expectedType) => {
                sandboxDataService.registerScenario({
                    id: `github-${githubError}`,
                    provider: "github",
                    operation: "createIssue",
                    response: {
                        success: false,
                        error: { type: expectedType, message: githubError, retryable: false }
                    }
                });

                const result = await router.execute(
                    "github", "createIssue",
                    { owner: "x", repo: "y", title: "z" },
                    createTestConnection("github"),
                    createWorkflowContext()
                );

                expect(result.error?.type).toBe(expectedType);
            });
        });
    });
});
```

### 2.5 MCP Adapter Integration Tests
**Location:** `backend/__tests__/integration/providers/mcp-adapter.test.ts`

Test MCP tools work correctly through the execution path:

```typescript
describe("MCP Adapter Integration", () => {
    describe("tool generation", () => {
        it.each(providerRegistry.getRegisteredProviders())(
            "%s generates valid MCP tools",
            async (providerName) => {
                const provider = await providerRegistry.loadProvider(providerName);
                const tools = provider.getMCPTools();

                expect(tools.length).toBeGreaterThan(0);

                for (const tool of tools) {
                    // Valid name format
                    expect(tool.name).toMatch(/^[a-z_]+_[a-zA-Z]+$/);

                    // Has description
                    expect(tool.description.length).toBeGreaterThan(10);

                    // Valid JSON schema
                    expect(tool.inputSchema.type).toBe("object");
                    expect(() => JSON.stringify(tool.inputSchema)).not.toThrow();
                }
            }
        );
    });

    describe("tool execution routing", () => {
        it("routes to MCP path in agent context", async () => {
            const router = new ExecutionRouter(providerRegistry);
            const agentContext: ExecutionContext = {
                mode: "agent",
                conversationId: "conv-123",
                toolCallId: "tool-456"
            };

            const result = await router.execute(
                "slack",
                "sendMessage",
                { channel: "#general", text: "Hello from agent" },
                createTestConnection("slack"),
                agentContext
            );

            expect(result.success).toBe(true);
        });
    });

    describe("schema consistency", () => {
        it.each(["slack", "github", "hubspot", "airtable"])(
            "%s MCP schemas match operation schemas",
            async (providerName) => {
                const provider = await providerRegistry.loadProvider(providerName);
                const operations = provider.getOperations();
                const tools = provider.getMCPTools();

                for (const op of operations) {
                    const tool = tools.find(t => t.name === `${providerName}_${op.id}`);
                    expect(tool).toBeDefined();

                    // Verify required properties match
                    const zodRequired = getRequiredProperties(op.inputSchema);
                    const mcpRequired = tool?.inputSchema.required || [];
                    expect(new Set(mcpRequired)).toEqual(new Set(zodRequired));
                }
            }
        );
    });
});
```

### 2.6 Concurrency and Isolation Tests
**Location:** `backend/__tests__/integration/providers/concurrency.test.ts`

Test parallel execution and isolation:

```typescript
describe("Concurrency and Isolation", () => {
    describe("parallel execution", () => {
        it("executes 10 operations concurrently without interference", async () => {
            const router = new ExecutionRouter(providerRegistry);

            const operations = Array.from({ length: 10 }, (_, i) =>
                router.execute(
                    "slack",
                    "sendMessage",
                    { channel: `#channel-${i}`, text: `Message ${i}` },
                    createTestConnection("slack"),
                    createWorkflowContext()
                )
            );

            const results = await Promise.all(operations);
            expect(results.every(r => r.success)).toBe(true);
            // Each result should have unique data (based on fixture interpolation)
        });

        it("maintains context isolation across parallel calls", async () => {
            const router = new ExecutionRouter(providerRegistry);

            const [slackResult, githubResult, hubspotResult] = await Promise.all([
                router.execute("slack", "sendMessage",
                    { channel: "#test", text: "Hi" },
                    createTestConnection("slack"),
                    createWorkflowContext()
                ),
                router.execute("github", "createIssue",
                    { owner: "x", repo: "y", title: "Issue" },
                    createTestConnection("github"),
                    createWorkflowContext()
                ),
                router.execute("hubspot", "createContact",
                    { email: "test@example.com" },
                    createTestConnection("hubspot"),
                    createWorkflowContext()
                )
            ]);

            // Each has correct provider-specific output
            expect(slackResult.data).toHaveProperty("messageId");
            expect(githubResult.data).toHaveProperty("number");
            expect(hubspotResult.data).toHaveProperty("id");
        });
    });

    describe("scenario isolation", () => {
        it("scenarios don't leak between tests", async () => {
            const router = new ExecutionRouter(providerRegistry);

            // Register custom scenario
            sandboxDataService.registerScenario({
                id: "custom",
                provider: "slack",
                operation: "sendMessage",
                response: { success: true, data: { custom: true } }
            });

            const result1 = await router.execute(
                "slack", "sendMessage",
                { channel: "#test", text: "hi" },
                createTestConnection("slack"),
                createWorkflowContext()
            );
            expect(result1.data.custom).toBe(true);

            // Clear scenarios
            sandboxDataService.clearScenarios();

            // Should fall back to fixture
            const result2 = await router.execute(
                "slack", "sendMessage",
                { channel: "#test", text: "hi" },
                createTestConnection("slack"),
                createWorkflowContext()
            );
            expect(result2.data.custom).toBeUndefined();
            expect(result2.data.messageId).toBeDefined();
        });
    });
});
```

---

## File Organization

```
backend/
├── __tests__/
│   ├── helpers/
│   │   ├── provider-test-utils.ts          # Existing + extend
│   │   ├── schema-validation-utils.ts      # NEW
│   │   ├── webhook-test-utils.ts           # NEW
│   │   └── mock-client-utils.ts            # NEW
│   │
│   ├── integration/providers/
│   │   ├── schema-contract.test.ts         # NEW
│   │   ├── execution-router.test.ts        # NEW
│   │   ├── cross-provider.test.ts          # NEW
│   │   ├── error-scenarios.test.ts         # NEW
│   │   ├── mcp-adapter.test.ts             # NEW
│   │   └── concurrency.test.ts             # NEW
│   │
│   ├── e2e/providers/                      # NEW (optional)
│   │   ├── slack.e2e.test.ts
│   │   └── github.e2e.test.ts
│   │
│   └── fixtures/
│       └── webhook-test-vectors.ts         # NEW
│
└── src/integrations/
    ├── core/__tests__/
    │   ├── BaseAPIClient.test.ts           # NEW
    │   ├── BaseProvider.test.ts            # NEW
    │   └── ProviderRegistry.test.ts        # NEW
    │
    └── providers/{provider}/__tests__/
        ├── fixtures.ts                     # Existing
        ├── {provider}.test.ts              # Existing (fixture runner)
        ├── provider.test.ts                # NEW - Provider class tests
        ├── client.test.ts                  # NEW - API client tests
        ├── webhook.test.ts                 # NEW - Webhook verification
        └── operations.test.ts              # NEW - Operation executor tests
```

---

## Implementation Priority

| Phase | Category | Location | Tests |
|-------|----------|----------|-------|
| 1 | Schema Contract | `__tests__/integration/providers/` | Fixture validation against Zod schemas |
| 2 | Provider Unit | `providers/{p}/__tests__/provider.test.ts` | Class tests for top 10 providers |
| 3 | Webhook Unit | `providers/{p}/__tests__/webhook.test.ts` | Signature verification tests |
| 4 | Execution Router | `__tests__/integration/providers/` | Routing and sandbox tests |
| 5 | Error Scenarios | `__tests__/integration/providers/` | Comprehensive error handling |
| 6 | MCP Adapter | `__tests__/integration/providers/` | Tool generation and execution |
| 7 | Client Unit | `providers/{p}/__tests__/client.test.ts` | API client retry/error tests |
| 8 | Concurrency | `__tests__/integration/providers/` | Parallel execution tests |
| 9 | Cross-Provider | `__tests__/integration/providers/` | Multi-provider data flow |
| 10 | E2E (Optional) | `__tests__/e2e/providers/` | Real API tests |

---

## Verification

```bash
# Run all provider tests
npm run test:backend -- --testPathPattern="providers"

# Run integration tests only
npm run test:backend -- --testPathPattern="integration/providers"

# Run specific provider's unit tests
npm run test:backend -- --testPathPattern="providers/slack/__tests__"

# Run schema contract tests
npm run test:backend -- schema-contract.test.ts

# Check coverage
npm run test:backend -- --coverage --collectCoverageFrom="src/integrations/**/*.ts"
```

---

## Implementation Progress

*Last updated: February 2026*

### Summary

| Category | Count | Status |
|----------|-------|--------|
| **Completed** (200+ lines) | 53 providers | Full detailed coverage |
| **Partial** (100-200 lines) | 34 providers | Basic tests |
| **Skeleton** (<100 lines) | 63 providers | Need detailed tests |
| **Total Test Files** | 150 `operations.test.ts` | All providers have test files |
| **Total Lines of Test Code** | 88,350+ | |
| **Tests Passing** | 5,034 | |
| **Tests Todo** | 2,157 | Skeleton placeholders |

### Files Created

- **Generator Script:** `backend/scripts/generate-provider-tests.ts`
- **Test Helper Utilities:**
  - `backend/__tests__/helpers/schema-validation-utils.ts`
  - `backend/__tests__/helpers/webhook-test-utils.ts`
- **Per-Provider Test Files:**
  - 152 `provider.test.ts` files
  - 150 `operations.test.ts` files
  - 69 `webhook.test.ts` files

### Completed Providers (53) - Full Coverage

These providers have comprehensive operation executor tests with mock clients, success/error cases, and schema validation:

| Provider | Lines | Provider | Lines | Provider | Lines |
|----------|-------|----------|-------|----------|-------|
| asana | 2,557 | mailchimp | 2,308 | google-sheets | 2,044 |
| sendgrid | 2,017 | github | 2,013 | hubspot | 2,000 |
| monday | 1,938 | zendesk | 1,905 | trello | 1,876 |
| stripe | 1,869 | intercom | 1,855 | freshdesk | 1,797 |
| bitbucket | 1,796 | gitlab | 1,795 | pagerduty | 1,761 |
| pipedrive | 1,728 | zoom | 1,717 | instagram | 1,665 |
| jira | 1,650 | contentful | 1,601 | shopify | 1,584 |
| circleci | 1,584 | datadog | 1,577 | aws-s3 | 1,544 |
| airtable | 1,538 | microsoft-teams | 1,513 | clickup | 1,497 |
| google-calendar | 1,492 | google-drive | 1,469 | xero | 1,465 |
| docusign | 1,448 | figma | 1,400 | sentry | 1,399 |
| segment | 1,374 | twilio | 1,366 | calendly | 1,342 |
| quickbooks | 1,341 | typeform | 1,312 | salesforce | 1,311 |
| confluence | 1,285 | linkedin | 1,278 | webflow | 1,264 |
| okta | 1,161 | dropbox | 1,144 | auth0 | 1,126 |
| mixpanel | 1,070 | linear | 1,044 | twitter | 994 |
| notion | 989 | discord | 937 | amplitude | 858 |
| coda | 702 | slack | 364 | | |

### Partial Coverage Providers (34)

These have basic test structure but could benefit from more detailed coverage:

apollo, azure-storage, bigcommerce, cal-com, drift, elasticsearch, etsy, facebook, front, gmail, google-cloud-storage, helpscout, klaviyo, livechat, looker, magento, marketo, microsoft-outlook, netsuite, paypal, personio, power-bi, ringcentral, rippling, sap, shippo, shipstation, square, squarespace, tableau, vercel, wix, woocommerce, youtube

### Skeleton Tests Remaining (63)

These providers have generated test file structure but need detailed test implementations:

**HR/Payroll:** adp, bamboohr, deel, gusto, hibob, lattice, personio, workday, sap-successfactors

**Finance:** bill-com, chargebee, expensify, freshbooks, plaid, ramp, sage, wise

**Infrastructure:** aws, azure-devops, cloudflare, digitalocean, google-cloud, supabase, redshift

**Microsoft Office:** microsoft-excel, microsoft-onedrive, microsoft-powerpoint, microsoft-word, sharepoint

**Google Workspace:** google-analytics, google-docs, google-forms, google-meet, google-slides

**Messaging:** telegram, whatsapp

**Other:** canva, miro, medium, reddit, buffer, box, surveymonkey, ebay, evernote, hellosign, posthog, heap, hotjar, crisp, gitbook, gorgias, kustomer, databricks, hootsuite, bigquery, copper, close, insightly, zoho-crm

### Test Patterns Used

All detailed tests follow this pattern:

```typescript
import type { ProviderClient } from "../client/ProviderClient";

function createMockClient(): jest.Mocked<ProviderClient> {
    return {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<ProviderClient>;
}

describe("Provider Operations", () => {
    let mockClient: jest.Mocked<ProviderClient>;

    beforeEach(() => {
        mockClient = createMockClient();
    });

    describe("operationName", () => {
        it("calls client with correct parameters", async () => {
            mockClient.post.mockResolvedValueOnce({ success: true, data: {...} });
            // Test implementation
        });

        it("handles API errors correctly", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("API Error"));
            // Test error handling
        });

        it("validates input schema", () => {
            const schema = operationInputSchema;
            expect(schema.safeParse(validInput).success).toBe(true);
            expect(schema.safeParse(invalidInput).success).toBe(false);
        });
    });
});
```

### Bugs Found and Fixed

During test implementation, the following source code bugs were discovered and fixed:

1. **HubSpot `updateNote.ts`:** Regular string used instead of template literal for URL interpolation
2. **HubSpot `getTask.ts`:** Regular string used instead of template literal for URL interpolation
3. **HubSpot `updateTask.ts`:** Regular string used instead of template literal for URL interpolation

### Running the Tests

```bash
# Run all provider operation tests
npm run test:backend -- --testPathPattern="operations.test.ts"

# Run tests for a specific provider
npm run test:backend -- --testPathPattern="providers/slack"

# Run with coverage
npm run test:backend -- --testPathPattern="operations.test.ts" --coverage
```
