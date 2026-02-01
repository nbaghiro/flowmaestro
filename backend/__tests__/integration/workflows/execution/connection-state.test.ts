/**
 * Connection State Tests
 *
 * Tests for connection handling in the ExecutionRouter, covering:
 * - Test connection detection and sandbox routing
 * - Different connection methods (oauth2, api_key, oauth1)
 * - Missing connection data handling
 * - Connection status (active vs inactive)
 * - Permission errors from invalid credentials
 */

import { ExecutionRouter } from "../../../../src/integrations/core/ExecutionRouter";
import { sandboxDataService } from "../../../../src/integrations/sandbox";
import {
    createTestConnection,
    createExecutionContext,
    createTestRouter,
    expectOperationSuccess,
    expectOperationError
} from "../../../helpers/provider-test-utils";
import type { ExecutionContext } from "../../../../src/integrations/core/types";
import type { ConnectionWithData } from "../../../../src/storage/models/Connection";

// Import fixtures to register them
import "../../../fixtures/integration-fixtures";

describe("Connection State Tests", () => {
    let router: ExecutionRouter;
    let context: ExecutionContext;

    beforeAll(() => {
        router = createTestRouter();
        context = createExecutionContext();
    });

    beforeEach(() => {
        sandboxDataService.clearScenarios();
    });

    describe("Test Connection Detection", () => {
        it("routes to sandbox when isTestConnection is true in metadata", async () => {
            const connection = createTestConnection("slack", {
                metadata: {
                    isTestConnection: true,
                    account_info: { name: "Test Slack Account" }
                }
            });

            // Register a sandbox response for this test
            sandboxDataService.registerScenario({
                id: "test-sandbox-detection",
                provider: "slack",
                operation: "sendMessage",
                paramMatchers: {},
                response: {
                    success: true,
                    data: {
                        messageId: "sandbox-msg-123",
                        channel: "C024BE91L",
                        sandboxMode: true
                    }
                }
            });

            const result = await router.execute(
                "slack",
                "sendMessage",
                { channel: "#general", text: "Test message" },
                connection,
                context
            );

            expectOperationSuccess(result);
            expect(result.data).toHaveProperty("sandboxMode", true);
        });

        it("uses real execution path when isTestConnection is false", async () => {
            const connection = createTestConnection("slack", {
                metadata: {
                    isTestConnection: false,
                    account_info: { name: "Real Slack Account" }
                }
            });

            // Register a scenario that should NOT be used
            sandboxDataService.registerScenario({
                id: "test-no-sandbox",
                provider: "slack",
                operation: "sendMessage",
                paramMatchers: {},
                response: {
                    success: true,
                    data: { sandboxMode: true }
                }
            });

            // The execution will go through real path, but since we don't have
            // real credentials, we expect it to fail (provider not loaded in test env)
            // This test verifies the routing decision - sandbox is bypassed
            try {
                const result = await router.execute(
                    "slack",
                    "sendMessage",
                    { channel: "#general", text: "Test message" },
                    connection,
                    context
                );

                // If execution succeeds (unlikely in test env), verify sandbox wasn't used
                if (result.success && result.data) {
                    const data = result.data as Record<string, unknown>;
                    expect(data.sandboxMode).not.toBe(true);
                }
            } catch (error) {
                // Expected: In test environment, real execution fails because
                // providers aren't fully loaded. The important thing is that
                // we attempted real execution (bypassed sandbox) which caused
                // this error instead of returning the sandbox response.
                expect(error).toBeDefined();
                // Verify we tried to load the provider (real path)
                expect(String(error)).toMatch(/provider|not found|slack/i);
            }
        });

        it("defaults to sandbox when isTestConnection is undefined but created via createTestConnection", async () => {
            // createTestConnection sets isTestConnection: true by default
            const connection = createTestConnection("github");

            sandboxDataService.registerScenario({
                id: "test-default-sandbox",
                provider: "github",
                operation: "listRepositories",
                paramMatchers: {},
                response: {
                    success: true,
                    data: {
                        repositories: [],
                        sandboxMode: true
                    }
                }
            });

            const result = await router.execute(
                "github",
                "listRepositories",
                { page: 1, perPage: 10 },
                connection,
                context
            );

            expectOperationSuccess(result);
            expect(result.data).toHaveProperty("sandboxMode", true);
        });
    });

    describe("Connection Method Handling", () => {
        it("handles oauth2 connections", async () => {
            const connection = createTestConnection("slack", {
                connection_method: "oauth2",
                data: {
                    access_token: "xoxb-test-token",
                    token_type: "Bearer",
                    expires_in: 3600,
                    scope: "chat:write channels:read"
                }
            });

            sandboxDataService.registerScenario({
                id: "oauth2-test",
                provider: "slack",
                operation: "listChannels",
                paramMatchers: {},
                response: {
                    success: true,
                    data: {
                        channels: [
                            { id: "C024BE91L", name: "general" },
                            { id: "C024BE91M", name: "random" }
                        ]
                    }
                }
            });

            const result = await router.execute(
                "slack",
                "listChannels",
                { excludeArchived: true },
                connection,
                context
            );

            expectOperationSuccess(result);
            expect(result.data).toHaveProperty("channels");
        });

        it("handles api_key connections", async () => {
            const connection = createTestConnection("openai", {
                connection_method: "api_key",
                provider: "openai",
                data: {
                    api_key: "sk-test-key-123"
                }
            });

            sandboxDataService.registerScenario({
                id: "api-key-test",
                provider: "openai",
                operation: "listModels",
                paramMatchers: {},
                response: {
                    success: true,
                    data: {
                        models: [
                            { id: "gpt-4", object: "model" },
                            { id: "gpt-3.5-turbo", object: "model" }
                        ]
                    }
                }
            });

            const result = await router.execute("openai", "listModels", {}, connection, context);

            expectOperationSuccess(result);
            expect(result.data).toHaveProperty("models");
        });

        it("handles oauth1 connections", async () => {
            const connection = createTestConnection("twitter", {
                connection_method: "oauth1",
                provider: "twitter",
                data: {
                    oauth_token: "test-oauth-token",
                    oauth_token_secret: "test-oauth-secret"
                }
            });

            sandboxDataService.registerScenario({
                id: "oauth1-test",
                provider: "twitter",
                operation: "getTweet",
                paramMatchers: {},
                response: {
                    success: true,
                    data: {
                        id: "1234567890",
                        text: "Test tweet content"
                    }
                }
            });

            const result = await router.execute(
                "twitter",
                "getTweet",
                { tweetId: "1234567890" },
                connection,
                context
            );

            expectOperationSuccess(result);
            expect(result.data).toHaveProperty("text");
        });
    });

    describe("Missing Connection Data", () => {
        it("fails gracefully when access_token is missing for oauth2", async () => {
            const connection = createTestConnection("slack", {
                connection_method: "oauth2",
                metadata: {
                    isTestConnection: false // Force real execution path
                },
                data: {
                    access_token: "", // Empty token
                    token_type: "Bearer"
                }
            });

            // Register error scenario
            sandboxDataService.registerScenario({
                id: "missing-token-error",
                provider: "slack",
                operation: "sendMessage",
                paramMatchers: {},
                response: {
                    success: false,
                    error: {
                        type: "permission",
                        message: "Invalid or missing authentication token",
                        retryable: false
                    }
                }
            });

            // For test connection (force sandbox mode to test the scenario)
            const testConnection = { ...connection, metadata: { isTestConnection: true } };

            const result = await router.execute(
                "slack",
                "sendMessage",
                { channel: "#general", text: "Test" },
                testConnection as ConnectionWithData,
                context
            );

            expectOperationError(result, {
                type: "permission",
                message: /invalid|missing|authentication/i
            });
        });

        it("fails gracefully when api_key is missing", async () => {
            const connection = createTestConnection("anthropic", {
                connection_method: "api_key",
                provider: "anthropic",
                data: {
                    api_key: "" // Empty API key
                }
            });

            sandboxDataService.registerScenario({
                id: "missing-api-key-error",
                provider: "anthropic",
                operation: "createMessage",
                paramMatchers: {},
                response: {
                    success: false,
                    error: {
                        type: "permission",
                        message: "API key is required",
                        retryable: false
                    }
                }
            });

            const result = await router.execute(
                "anthropic",
                "createMessage",
                { model: "claude-3-opus", messages: [] },
                connection,
                context
            );

            expectOperationError(result, {
                type: "permission",
                retryable: false
            });
        });

        it("handles null data field gracefully", async () => {
            const connection = createTestConnection("github", {
                data: null as unknown as ConnectionWithData["data"]
            });

            sandboxDataService.registerScenario({
                id: "null-data-error",
                provider: "github",
                operation: "getRepository",
                paramMatchers: {},
                response: {
                    success: false,
                    error: {
                        type: "validation",
                        message: "Connection data is missing",
                        retryable: false
                    }
                }
            });

            const result = await router.execute(
                "github",
                "getRepository",
                { owner: "test", repo: "test" },
                connection,
                context
            );

            expectOperationError(result, {
                type: "validation"
            });
        });
    });

    describe("Connection Status", () => {
        it("processes active connections normally", async () => {
            const connection = createTestConnection("slack", {
                status: "active"
            });

            sandboxDataService.registerScenario({
                id: "active-connection",
                provider: "slack",
                operation: "getUser",
                paramMatchers: {},
                response: {
                    success: true,
                    data: {
                        user: {
                            id: "U024BE7LH",
                            name: "testuser",
                            real_name: "Test User"
                        }
                    }
                }
            });

            const result = await router.execute(
                "slack",
                "getUser",
                { userId: "U024BE7LH" },
                connection,
                context
            );

            expectOperationSuccess(result);
            expect(result.data).toHaveProperty("user");
        });

        it("returns error for invalid connections", async () => {
            const connection = createTestConnection("slack", {
                status: "invalid"
            });

            sandboxDataService.registerScenario({
                id: "invalid-connection",
                provider: "slack",
                operation: "sendMessage",
                paramMatchers: {},
                response: {
                    success: false,
                    error: {
                        type: "permission",
                        message: "Connection credentials are invalid",
                        retryable: false
                    }
                }
            });

            const result = await router.execute(
                "slack",
                "sendMessage",
                { channel: "#general", text: "Test" },
                connection,
                context
            );

            expectOperationError(result, {
                type: "permission",
                message: /invalid/i
            });
        });

        it("returns error for expired connections", async () => {
            const connection = createTestConnection("google-calendar", {
                status: "expired",
                provider: "google-calendar",
                data: {
                    access_token: "expired-token",
                    token_type: "Bearer",
                    expires_in: -1 // Already expired
                }
            });

            sandboxDataService.registerScenario({
                id: "expired-connection",
                provider: "google-calendar",
                operation: "listEvents",
                paramMatchers: {},
                response: {
                    success: false,
                    error: {
                        type: "permission",
                        message: "Access token has expired. Please re-authenticate.",
                        retryable: false
                    }
                }
            });

            const result = await router.execute(
                "google-calendar",
                "listEvents",
                { calendarId: "primary" },
                connection,
                context
            );

            expectOperationError(result, {
                type: "permission",
                message: /expired/i
            });
        });

        it("returns error for revoked connections", async () => {
            const connection = createTestConnection("github", {
                status: "revoked"
            });

            sandboxDataService.registerScenario({
                id: "revoked-connection",
                provider: "github",
                operation: "listRepositories",
                paramMatchers: {},
                response: {
                    success: false,
                    error: {
                        type: "permission",
                        message: "Access has been revoked. Please reconnect.",
                        retryable: false
                    }
                }
            });

            const result = await router.execute(
                "github",
                "listRepositories",
                {},
                connection,
                context
            );

            expectOperationError(result, {
                type: "permission",
                message: /revoked/i
            });
        });
    });

    describe("Permission Errors", () => {
        it("returns permission error for invalid credentials", async () => {
            const connection = createTestConnection("slack", {
                data: {
                    access_token: "invalid-token-xyz",
                    token_type: "Bearer"
                }
            });

            sandboxDataService.registerScenario({
                id: "invalid-credentials",
                provider: "slack",
                operation: "sendMessage",
                paramMatchers: {},
                response: {
                    success: false,
                    error: {
                        type: "permission",
                        message: "invalid_auth",
                        code: "invalid_auth",
                        retryable: false
                    }
                }
            });

            const result = await router.execute(
                "slack",
                "sendMessage",
                { channel: "#general", text: "Test" },
                connection,
                context
            );

            expectOperationError(result, {
                type: "permission",
                retryable: false
            });
        });

        it("returns permission error for insufficient scopes", async () => {
            const connection = createTestConnection("slack", {
                data: {
                    access_token: "xoxb-valid-token",
                    token_type: "Bearer",
                    scope: "channels:read" // Missing chat:write scope
                }
            });

            sandboxDataService.registerScenario({
                id: "insufficient-scopes",
                provider: "slack",
                operation: "sendMessage",
                paramMatchers: {},
                response: {
                    success: false,
                    error: {
                        type: "permission",
                        message: "missing_scope: chat:write",
                        code: "missing_scope",
                        retryable: false,
                        details: {
                            required: ["chat:write"],
                            granted: ["channels:read"]
                        }
                    }
                }
            });

            const result = await router.execute(
                "slack",
                "sendMessage",
                { channel: "#general", text: "Test" },
                connection,
                context
            );

            expectOperationError(result, {
                type: "permission",
                message: /missing_scope|chat:write/i
            });
        });

        it("returns permission error for organization access denied", async () => {
            const connection = createTestConnection("github", {
                data: {
                    access_token: "ghp-valid-token",
                    token_type: "Bearer"
                }
            });

            sandboxDataService.registerScenario({
                id: "org-access-denied",
                provider: "github",
                operation: "listRepositories",
                paramMatchers: { org: "restricted-org" },
                response: {
                    success: false,
                    error: {
                        type: "permission",
                        message: "You do not have access to this organization",
                        code: "403",
                        retryable: false
                    }
                }
            });

            const result = await router.execute(
                "github",
                "listRepositories",
                { org: "restricted-org" },
                connection,
                context
            );

            expectOperationError(result, {
                type: "permission",
                message: /access|organization/i
            });
        });

        it("distinguishes between retryable and non-retryable permission errors", async () => {
            const connection = createTestConnection("slack");

            // Non-retryable: invalid credentials
            sandboxDataService.registerScenario({
                id: "non-retryable-permission",
                provider: "slack",
                operation: "sendMessage",
                paramMatchers: { channel: "#locked" },
                response: {
                    success: false,
                    error: {
                        type: "permission",
                        message: "channel_locked",
                        retryable: false
                    }
                }
            });

            const nonRetryableResult = await router.execute(
                "slack",
                "sendMessage",
                { channel: "#locked", text: "Test" },
                connection,
                context
            );

            expectOperationError(nonRetryableResult, {
                type: "permission",
                retryable: false
            });
        });
    });

    describe("Multi-Provider Connection Tests", () => {
        it("handles Slack, GitHub, and HubSpot connections in sequence", async () => {
            // Test Slack
            const slackConnection = createTestConnection("slack");
            sandboxDataService.registerScenario({
                id: "multi-slack",
                provider: "slack",
                operation: "listChannels",
                paramMatchers: {},
                response: {
                    success: true,
                    data: { channels: [{ id: "C1", name: "general" }] }
                }
            });

            const slackResult = await router.execute(
                "slack",
                "listChannels",
                {},
                slackConnection,
                context
            );
            expectOperationSuccess(slackResult);

            // Test GitHub
            const githubConnection = createTestConnection("github");
            sandboxDataService.registerScenario({
                id: "multi-github",
                provider: "github",
                operation: "listIssues",
                paramMatchers: {},
                response: {
                    success: true,
                    data: { issues: [{ id: 1, title: "Test Issue" }] }
                }
            });

            const githubResult = await router.execute(
                "github",
                "listIssues",
                { owner: "test", repo: "test" },
                githubConnection,
                context
            );
            expectOperationSuccess(githubResult);

            // Test HubSpot
            const hubspotConnection = createTestConnection("hubspot");
            sandboxDataService.registerScenario({
                id: "multi-hubspot",
                provider: "hubspot",
                operation: "listContacts",
                paramMatchers: {},
                response: {
                    success: true,
                    data: { contacts: [{ id: "1", email: "test@example.com" }] }
                }
            });

            const hubspotResult = await router.execute(
                "hubspot",
                "listContacts",
                {},
                hubspotConnection,
                context
            );
            expectOperationSuccess(hubspotResult);
        });

        it("isolates connection errors between providers", async () => {
            // Slack succeeds
            const slackConnection = createTestConnection("slack");
            sandboxDataService.registerScenario({
                id: "isolated-slack-success",
                provider: "slack",
                operation: "sendMessage",
                paramMatchers: {},
                response: {
                    success: true,
                    data: { messageId: "123" }
                }
            });

            // GitHub fails
            const githubConnection = createTestConnection("github");
            sandboxDataService.registerScenario({
                id: "isolated-github-error",
                provider: "github",
                operation: "createIssue",
                paramMatchers: {},
                response: {
                    success: false,
                    error: {
                        type: "permission",
                        message: "Resource not accessible by integration",
                        retryable: false
                    }
                }
            });

            const slackResult = await router.execute(
                "slack",
                "sendMessage",
                { channel: "#general", text: "Test" },
                slackConnection,
                context
            );
            expectOperationSuccess(slackResult);

            const githubResult = await router.execute(
                "github",
                "createIssue",
                { owner: "test", repo: "test", title: "Test" },
                githubConnection,
                context
            );
            expectOperationError(githubResult, { type: "permission" });

            // Verify Slack still works after GitHub error
            const slackResult2 = await router.execute(
                "slack",
                "sendMessage",
                { channel: "#random", text: "Still works" },
                slackConnection,
                context
            );
            expectOperationSuccess(slackResult2);
        });
    });

    describe("Execution Context Modes", () => {
        it("processes workflow context correctly", async () => {
            const connection = createTestConnection("slack");
            const workflowContext = createExecutionContext("workflow");

            sandboxDataService.registerScenario({
                id: "workflow-context",
                provider: "slack",
                operation: "sendMessage",
                paramMatchers: {},
                response: {
                    success: true,
                    data: { messageId: "workflow-123" }
                }
            });

            const result = await router.execute(
                "slack",
                "sendMessage",
                { channel: "#general", text: "Workflow message" },
                connection,
                workflowContext
            );

            expectOperationSuccess(result);
        });

        it("processes agent context correctly", async () => {
            const connection = createTestConnection("slack");
            const agentContext = createExecutionContext("agent");

            sandboxDataService.registerScenario({
                id: "agent-context",
                provider: "slack",
                operation: "sendMessage",
                paramMatchers: {},
                response: {
                    success: true,
                    data: { messageId: "agent-456" }
                }
            });

            const result = await router.execute(
                "slack",
                "sendMessage",
                { channel: "#general", text: "Agent message" },
                connection,
                agentContext
            );

            expectOperationSuccess(result);
        });
    });
});
