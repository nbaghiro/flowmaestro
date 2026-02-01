/**
 * Agent Tool Execution Tests
 *
 * Tests MCP tool execution via agents using the mock infrastructure.
 * Verifies that integration operations work correctly when called as agent tools.
 */

import { ExecutionRouter } from "../../../../src/integrations/core/ExecutionRouter";
import { providerRegistry } from "../../../../src/integrations/core/ProviderRegistry";
import { sandboxDataService } from "../../../../src/integrations/sandbox";
import {
    createTestConnection,
    createExecutionContext,
    expectOperationSuccess,
    expectOperationError
} from "../../../helpers/provider-test-utils";

// Import fixtures to register them
import "../../../fixtures/integration-fixtures";

describe("Agent Tool Execution", () => {
    let router: ExecutionRouter;

    beforeAll(async () => {
        // Test connections have isTestConnection: true, which triggers sandbox mode
        router = new ExecutionRouter(providerRegistry);
    });

    beforeEach(() => {
        sandboxDataService.clearScenarios();
    });

    describe("Single Tool Execution", () => {
        it("executes Slack sendMessage tool", async () => {
            const connection = createTestConnection("slack");
            const context = createExecutionContext("agent");

            const result = await router.execute(
                "slack",
                "sendMessage",
                {
                    channel: "#general",
                    text: "Hello from agent!"
                },
                connection,
                context
            );

            expectOperationSuccess(result);
            expect(result.data).toHaveProperty("messageId");
            expect(result.data).toHaveProperty("channel");
        });

        it("executes GitHub createIssue tool", async () => {
            const connection = createTestConnection("github");
            const context = createExecutionContext("agent");

            const result = await router.execute(
                "github",
                "createIssue",
                {
                    owner: "demo-user",
                    repo: "demo-app",
                    title: "Bug: Agent found an issue",
                    body: "The agent detected this problem while analyzing logs."
                },
                connection,
                context
            );

            expectOperationSuccess(result);
            expect(result.data).toHaveProperty("id");
            expect(result.data).toHaveProperty("number");
        });

        it("executes Linear createIssue tool", async () => {
            const connection = createTestConnection("linear");
            const context = createExecutionContext("agent");

            const result = await router.execute(
                "linear",
                "createIssue",
                {
                    teamId: "team-123",
                    title: "Task from AI Agent",
                    description: "Created automatically by agent"
                },
                connection,
                context
            );

            expectOperationSuccess(result);
            expect(result.data).toHaveProperty("id");
        });

        it("executes Stripe createPaymentIntent tool", async () => {
            const connection = createTestConnection("stripe");
            const context = createExecutionContext("agent");

            const result = await router.execute(
                "stripe",
                "createPaymentIntent",
                {
                    amount: 5000,
                    currency: "usd"
                },
                connection,
                context
            );

            expectOperationSuccess(result);
            expect(result.data).toHaveProperty("id");
            expect(result.data).toHaveProperty("clientSecret");
        });

        it("executes Airtable createRecord tool", async () => {
            const connection = createTestConnection("airtable");
            const context = createExecutionContext("agent");

            const result = await router.execute(
                "airtable",
                "createRecord",
                {
                    baseId: "app123",
                    tableId: "tbl456",
                    fields: {
                        Name: "Agent-created record",
                        Status: "New",
                        Priority: "High"
                    }
                },
                connection,
                context
            );

            expectOperationSuccess(result);
            expect(result.data).toHaveProperty("id");
        });

        it("executes HubSpot createContact tool", async () => {
            const connection = createTestConnection("hubspot");
            const context = createExecutionContext("agent");

            const result = await router.execute(
                "hubspot",
                "createContact",
                {
                    email: "agent-lead@example.com",
                    firstname: "Agent",
                    lastname: "Lead"
                },
                connection,
                context
            );

            expectOperationSuccess(result);
            expect(result.data).toHaveProperty("id");
        });
    });

    describe("Tool Error Handling", () => {
        it("handles channel not found error", async () => {
            sandboxDataService.registerScenario({
                id: "agent-channel-not-found",
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

            const connection = createTestConnection("slack");
            const context = createExecutionContext("agent");

            const result = await router.execute(
                "slack",
                "sendMessage",
                { channel: "#nonexistent", text: "Test" },
                connection,
                context
            );

            expectOperationError(result, {
                type: "not_found",
                message: "channel_not_found",
                retryable: false
            });
        });

        it("handles permission denied error", async () => {
            sandboxDataService.registerScenario({
                id: "agent-permission-denied",
                provider: "github",
                operation: "createIssue",
                paramMatchers: { repo: "private-repo" },
                response: {
                    success: false,
                    error: {
                        type: "permission",
                        message: "Resource not accessible by integration",
                        retryable: false
                    }
                }
            });

            const connection = createTestConnection("github");
            const context = createExecutionContext("agent");

            const result = await router.execute(
                "github",
                "createIssue",
                { owner: "some-org", repo: "private-repo", title: "Test" },
                connection,
                context
            );

            expectOperationError(result, {
                type: "permission",
                retryable: false
            });
        });

        it("handles rate limit error with retry indication", async () => {
            sandboxDataService.registerScenario({
                id: "agent-rate-limit",
                provider: "slack",
                operation: "sendMessage",
                response: {
                    success: false,
                    error: {
                        type: "rate_limit",
                        message: "Rate limit exceeded. Retry after 30 seconds.",
                        retryable: true
                    }
                }
            });

            const connection = createTestConnection("slack");
            const context = createExecutionContext("agent");

            const result = await router.execute(
                "slack",
                "sendMessage",
                { channel: "#spam-channel", text: "Too many messages!" },
                connection,
                context
            );

            expectOperationError(result, {
                type: "rate_limit",
                retryable: true
            });
        });

        it("handles validation error for invalid input", async () => {
            sandboxDataService.registerScenario({
                id: "agent-validation-error",
                provider: "stripe",
                operation: "createPaymentIntent",
                paramMatchers: { amount: -100 },
                response: {
                    success: false,
                    error: {
                        type: "validation",
                        message: "Amount must be a positive integer",
                        retryable: false
                    }
                }
            });

            const connection = createTestConnection("stripe");
            const context = createExecutionContext("agent");

            const result = await router.execute(
                "stripe",
                "createPaymentIntent",
                { amount: -100, currency: "usd" },
                connection,
                context
            );

            expectOperationError(result, {
                type: "validation",
                retryable: false
            });
        });

        it("handles server error with retry indication", async () => {
            sandboxDataService.registerScenario({
                id: "agent-server-error",
                provider: "linear",
                operation: "createIssue",
                response: {
                    success: false,
                    error: {
                        type: "server_error",
                        message: "Internal server error",
                        retryable: true
                    }
                }
            });

            const connection = createTestConnection("linear");
            const context = createExecutionContext("agent");

            const result = await router.execute(
                "linear",
                "createIssue",
                { teamId: "team-123", title: "Test" },
                connection,
                context
            );

            expectOperationError(result, {
                type: "server_error",
                retryable: true
            });
        });
    });

    describe("Multi-Tool Sequences", () => {
        it("executes multiple tools in sequence", async () => {
            const context = createExecutionContext("agent");

            // Tool 1: Create GitHub issue
            const githubConnection = createTestConnection("github");
            const githubResult = await router.execute(
                "github",
                "createIssue",
                {
                    owner: "demo-user",
                    repo: "demo-app",
                    title: "Agent-created issue"
                },
                githubConnection,
                context
            );
            expectOperationSuccess(githubResult);

            // Tool 2: Notify on Slack
            const slackConnection = createTestConnection("slack");
            const slackResult = await router.execute(
                "slack",
                "sendMessage",
                {
                    channel: "#bugs",
                    text: `New issue created: ${(githubResult.data as { title?: string })?.title || "Issue"}`
                },
                slackConnection,
                context
            );
            expectOperationSuccess(slackResult);

            // Tool 3: Create Linear tracking issue
            const linearConnection = createTestConnection("linear");
            const linearResult = await router.execute(
                "linear",
                "createIssue",
                {
                    teamId: "team-123",
                    title: "Track: Agent-created issue"
                },
                linearConnection,
                context
            );
            expectOperationSuccess(linearResult);

            // Verify all succeeded
            expect(githubResult.success).toBe(true);
            expect(slackResult.success).toBe(true);
            expect(linearResult.success).toBe(true);
        });

        it("continues after one tool fails in sequence", async () => {
            const context = createExecutionContext("agent");

            // Tool 1: Succeeds
            const slackConnection = createTestConnection("slack");
            const slackResult = await router.execute(
                "slack",
                "sendMessage",
                { channel: "#general", text: "Starting sequence" },
                slackConnection,
                context
            );
            expectOperationSuccess(slackResult);

            // Tool 2: Fails
            sandboxDataService.registerScenario({
                id: "sequence-fail",
                provider: "github",
                operation: "createIssue",
                response: {
                    success: false,
                    error: {
                        type: "server_error",
                        message: "API unavailable",
                        retryable: true
                    }
                }
            });

            const githubConnection = createTestConnection("github");
            const githubResult = await router.execute(
                "github",
                "createIssue",
                { owner: "demo-user", repo: "demo-app", title: "Test" },
                githubConnection,
                context
            );
            expectOperationError(githubResult);

            // Tool 3: Agent can still call another tool (decisions about whether to continue are made by the agent)
            const linearConnection = createTestConnection("linear");
            const linearResult = await router.execute(
                "linear",
                "createIssue",
                { teamId: "team-123", title: "Fallback issue" },
                linearConnection,
                context
            );
            expectOperationSuccess(linearResult);
        });
    });

    describe("Tool Context Verification", () => {
        it("passes agent context correctly", async () => {
            const connection = createTestConnection("slack");
            const context = createExecutionContext("agent");

            // Verify context is agent mode
            expect(context.mode).toBe("agent");
            expect(context).toHaveProperty("conversationId");
            expect(context).toHaveProperty("toolCallId");

            const result = await router.execute(
                "slack",
                "sendMessage",
                { channel: "#general", text: "Context test" },
                connection,
                context
            );

            expectOperationSuccess(result);
        });

        it("uses test connection metadata for mock mode", async () => {
            const connection = createTestConnection("slack", {
                metadata: {
                    isTestConnection: true,
                    account_info: { name: "Test Slack" }
                }
            });
            const context = createExecutionContext("agent");

            // Verify connection is marked as test connection
            expect(connection.metadata?.isTestConnection).toBe(true);

            const result = await router.execute(
                "slack",
                "sendMessage",
                { channel: "#general", text: "Test connection message" },
                connection,
                context
            );

            // Should use mock response due to isTestConnection flag
            expectOperationSuccess(result);
        });
    });

    describe("Tool Output Validation", () => {
        it("returns expected output shape for Slack sendMessage", async () => {
            const connection = createTestConnection("slack");
            const context = createExecutionContext("agent");

            const result = await router.execute(
                "slack",
                "sendMessage",
                { channel: "#general", text: "Output shape test" },
                connection,
                context
            );

            expectOperationSuccess(result);

            // Verify output matches expected schema
            const output = result.data as Record<string, unknown>;
            expect(typeof output.messageId).toBe("string");
            expect(typeof output.channel).toBe("string");
        });

        it("returns expected output shape for GitHub createIssue", async () => {
            const connection = createTestConnection("github");
            const context = createExecutionContext("agent");

            const result = await router.execute(
                "github",
                "createIssue",
                { owner: "demo-user", repo: "demo-app", title: "Output test" },
                connection,
                context
            );

            expectOperationSuccess(result);

            const output = result.data as Record<string, unknown>;
            expect(typeof output.id).toBe("number");
            expect(typeof output.number).toBe("number");
            expect(typeof output.url).toBe("string");
        });
    });
});
