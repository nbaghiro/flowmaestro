/**
 * ExecutionRouter Unit Tests
 *
 * Tests for routing logic including sandbox detection, MCP vs direct execution,
 * and fallback behavior.
 */

import { sandboxDataService, fixtureRegistry } from "../../sandbox";
import { ExecutionRouter } from "../ExecutionRouter";
import { ProviderRegistry } from "../ProviderRegistry";
import type { ConnectionWithData } from "../../../storage/models/Connection";
import type { IProvider, ProviderCapabilities, ExecutionContext } from "../types";

// Mock the sandbox config
jest.mock("../../sandbox/SandboxConfig", () => ({
    getSandboxConfig: jest.fn(() => ({
        enabled: false,
        fallbackBehavior: "error",
        providerOverrides: {},
        operationOverrides: {}
    }))
}));

// Import after mock - required by Jest's module mocking pattern
// eslint-disable-next-line import/order
import { getSandboxConfig } from "../../sandbox/SandboxConfig";
const mockGetSandboxConfig = getSandboxConfig as jest.MockedFunction<typeof getSandboxConfig>;

// Mock provider implementation
function createMockProvider(name: string, overrides: Partial<IProvider> = {}): IProvider {
    return {
        name,
        displayName: `${name} Display Name`,
        authMethod: "oauth2",
        capabilities: {
            supportsWebhooks: true,
            prefersMCP: false
        } as ProviderCapabilities,
        getAuthConfig: () => ({
            authUrl: "https://example.com/auth",
            tokenUrl: "https://example.com/token",
            scopes: ["read", "write"],
            clientId: "test-client-id",
            clientSecret: "test-client-secret",
            redirectUri: "https://example.com/callback"
        }),
        getOperations: () => [],
        getOperationSchema: () => null,
        getMCPTools: () => [],
        executeOperation: jest
            .fn()
            .mockResolvedValue({ success: true, data: { result: "direct" } }),
        executeMCPTool: jest.fn().mockResolvedValue({ result: "mcp" }),
        getTriggers: () => [],
        getWebhookConfig: () => null,
        ...overrides
    } as IProvider;
}

function createTestConnection(
    provider: string,
    isTestConnection: boolean = false
): ConnectionWithData {
    return {
        id: `conn-${provider}-${Date.now()}`,
        user_id: "user-123",
        workspace_id: "workspace-123",
        name: `Test ${provider} Connection`,
        connection_method: "oauth2",
        provider,
        status: "active",
        metadata: {
            isTestConnection,
            account_info: { name: `Test ${provider} Account` }
        },
        capabilities: {},
        last_used_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        data: {
            access_token: `test-token-${provider}`,
            token_type: "Bearer",
            expires_at: new Date(Date.now() + 3600000).toISOString()
        }
    } as ConnectionWithData;
}

describe("ExecutionRouter", () => {
    let providerRegistry: ProviderRegistry;
    let router: ExecutionRouter;
    let mockProvider: IProvider;

    beforeEach(() => {
        providerRegistry = new ProviderRegistry();
        mockProvider = createMockProvider("slack");

        providerRegistry.register({
            name: "slack",
            displayName: "Slack",
            authMethod: "oauth2",
            category: "communication",
            loader: async () => mockProvider
        });

        mockGetSandboxConfig.mockReturnValue({
            enabled: false,
            fallbackBehavior: "error",
            providerOverrides: {},
            operationOverrides: {}
        });

        router = new ExecutionRouter(providerRegistry);
        sandboxDataService.clearScenarios();
        fixtureRegistry.clear();
    });

    describe("execute", () => {
        describe("sandbox routing", () => {
            it("routes to sandbox when isTestConnection is true", async () => {
                const connection = createTestConnection("slack", true);
                const context: ExecutionContext = {
                    mode: "workflow",
                    workflowId: "wf-123",
                    nodeId: "node-123"
                };

                // Register a sandbox scenario
                sandboxDataService.registerScenario({
                    id: "test-scenario",
                    provider: "slack",
                    operation: "sendMessage",
                    response: {
                        success: true,
                        data: { messageId: "sandbox-123", sandboxMode: true }
                    }
                });

                const result = await router.execute(
                    "slack",
                    "sendMessage",
                    { channel: "#general", text: "Hello" },
                    connection,
                    context
                );

                expect(result.success).toBe(true);
                expect(result.data).toHaveProperty("sandboxMode", true);
                expect(mockProvider.executeOperation).not.toHaveBeenCalled();
            });

            it("routes to real execution when isTestConnection is false", async () => {
                const connection = createTestConnection("slack", false);
                const context: ExecutionContext = {
                    mode: "workflow",
                    workflowId: "wf-123",
                    nodeId: "node-123"
                };

                const result = await router.execute(
                    "slack",
                    "sendMessage",
                    { channel: "#general", text: "Hello" },
                    connection,
                    context
                );

                expect(result.success).toBe(true);
                expect(mockProvider.executeOperation).toHaveBeenCalled();
            });

            it("routes to sandbox when global sandbox mode is enabled", async () => {
                mockGetSandboxConfig.mockReturnValue({
                    enabled: true,
                    fallbackBehavior: "error",
                    providerOverrides: {},
                    operationOverrides: {}
                });

                // Recreate router with new config
                router = new ExecutionRouter(providerRegistry);

                const connection = createTestConnection("slack", false);
                const context: ExecutionContext = {
                    mode: "workflow",
                    workflowId: "wf-123",
                    nodeId: "node-123"
                };

                sandboxDataService.registerScenario({
                    id: "global-sandbox",
                    provider: "slack",
                    operation: "sendMessage",
                    response: {
                        success: true,
                        data: { messageId: "global-sandbox-123" }
                    }
                });

                const result = await router.execute(
                    "slack",
                    "sendMessage",
                    { channel: "#general", text: "Hello" },
                    connection,
                    context
                );

                expect(result.success).toBe(true);
                expect(result.data).toHaveProperty("messageId", "global-sandbox-123");
            });

            it("respects provider-level override", async () => {
                mockGetSandboxConfig.mockReturnValue({
                    enabled: false,
                    fallbackBehavior: "error",
                    providerOverrides: {
                        slack: { enabled: true }
                    },
                    operationOverrides: {}
                });

                router = new ExecutionRouter(providerRegistry);

                const connection = createTestConnection("slack", false);
                const context: ExecutionContext = {
                    mode: "workflow",
                    workflowId: "wf-123",
                    nodeId: "node-123"
                };

                sandboxDataService.registerScenario({
                    id: "provider-override",
                    provider: "slack",
                    operation: "sendMessage",
                    response: {
                        success: true,
                        data: { messageId: "provider-override-123" }
                    }
                });

                const result = await router.execute(
                    "slack",
                    "sendMessage",
                    { channel: "#general", text: "Hello" },
                    connection,
                    context
                );

                expect(result.success).toBe(true);
                expect(result.data).toHaveProperty("messageId", "provider-override-123");
            });

            it("respects operation-level override", async () => {
                mockGetSandboxConfig.mockReturnValue({
                    enabled: false,
                    fallbackBehavior: "error",
                    providerOverrides: {},
                    operationOverrides: {
                        "slack:sendMessage": { enabled: true }
                    }
                });

                router = new ExecutionRouter(providerRegistry);

                const connection = createTestConnection("slack", false);
                const context: ExecutionContext = {
                    mode: "workflow",
                    workflowId: "wf-123",
                    nodeId: "node-123"
                };

                sandboxDataService.registerScenario({
                    id: "operation-override",
                    provider: "slack",
                    operation: "sendMessage",
                    response: {
                        success: true,
                        data: { messageId: "operation-override-123" }
                    }
                });

                const result = await router.execute(
                    "slack",
                    "sendMessage",
                    { channel: "#general", text: "Hello" },
                    connection,
                    context
                );

                expect(result.success).toBe(true);
                expect(result.data).toHaveProperty("messageId", "operation-override-123");
            });
        });

        describe("fallback behavior", () => {
            it("returns error when fallback is 'error' and no sandbox data", async () => {
                const connection = createTestConnection("slack", true);
                const context: ExecutionContext = {
                    mode: "workflow",
                    workflowId: "wf-123",
                    nodeId: "node-123"
                };

                // No sandbox data registered
                const result = await router.execute(
                    "slack",
                    "sendMessage",
                    { channel: "#general", text: "Hello" },
                    connection,
                    context
                );

                expect(result.success).toBe(false);
                expect(result.error?.type).toBe("validation");
                expect(result.error?.message).toContain("No sandbox data found");
            });

            it("returns empty response when fallback is 'empty'", async () => {
                mockGetSandboxConfig.mockReturnValue({
                    enabled: false,
                    fallbackBehavior: "empty",
                    providerOverrides: {},
                    operationOverrides: {}
                });

                router = new ExecutionRouter(providerRegistry);

                const connection = createTestConnection("slack", true);
                const context: ExecutionContext = {
                    mode: "workflow",
                    workflowId: "wf-123",
                    nodeId: "node-123"
                };

                const result = await router.execute(
                    "slack",
                    "sendMessage",
                    { channel: "#general", text: "Hello" },
                    connection,
                    context
                );

                expect(result.success).toBe(true);
                expect(result.data).toEqual({});
            });

            it("passes through to real execution when fallback is 'passthrough'", async () => {
                mockGetSandboxConfig.mockReturnValue({
                    enabled: false,
                    fallbackBehavior: "passthrough",
                    providerOverrides: {},
                    operationOverrides: {}
                });

                router = new ExecutionRouter(providerRegistry);

                const connection = createTestConnection("slack", true);
                const context: ExecutionContext = {
                    mode: "workflow",
                    workflowId: "wf-123",
                    nodeId: "node-123"
                };

                const result = await router.execute(
                    "slack",
                    "sendMessage",
                    { channel: "#general", text: "Hello" },
                    connection,
                    context
                );

                expect(result.success).toBe(true);
                expect(mockProvider.executeOperation).toHaveBeenCalled();
            });
        });

        describe("MCP vs direct routing", () => {
            it("uses direct API for workflow context", async () => {
                const connection = createTestConnection("slack", false);
                const context: ExecutionContext = {
                    mode: "workflow",
                    workflowId: "wf-123",
                    nodeId: "node-123"
                };

                await router.execute(
                    "slack",
                    "sendMessage",
                    { channel: "#general", text: "Hello" },
                    connection,
                    context
                );

                expect(mockProvider.executeOperation).toHaveBeenCalled();
                expect(mockProvider.executeMCPTool).not.toHaveBeenCalled();
            });

            it("uses MCP for agent context", async () => {
                const connection = createTestConnection("slack", false);
                const context: ExecutionContext = {
                    mode: "agent",
                    conversationId: "conv-123",
                    toolCallId: "tool-123"
                };

                await router.execute(
                    "slack",
                    "sendMessage",
                    { channel: "#general", text: "Hello" },
                    connection,
                    context
                );

                expect(mockProvider.executeMCPTool).toHaveBeenCalled();
                expect(mockProvider.executeOperation).not.toHaveBeenCalled();
            });

            it("uses MCP when provider prefers it", async () => {
                const mcpPreferringProvider = createMockProvider("slack", {
                    capabilities: {
                        supportsWebhooks: true,
                        prefersMCP: true
                    } as ProviderCapabilities
                });

                providerRegistry.clear();
                providerRegistry.register({
                    name: "slack",
                    displayName: "slack",
                    authMethod: "oauth2",
                    category: "communication",
                    loader: async () => mcpPreferringProvider
                });

                const connection = createTestConnection("slack", false);
                const context: ExecutionContext = {
                    mode: "workflow",
                    workflowId: "wf-123",
                    nodeId: "node-123"
                };

                await router.execute(
                    "slack",
                    "sendMessage",
                    { channel: "#general", text: "Hello" },
                    connection,
                    context
                );

                expect(mcpPreferringProvider.executeMCPTool).toHaveBeenCalled();
            });
        });
    });

    describe("hasSandboxData", () => {
        it("returns true when scenario is registered", () => {
            sandboxDataService.registerScenario({
                id: "test",
                provider: "slack",
                operation: "sendMessage",
                response: { success: true, data: {} }
            });

            expect(router.hasSandboxData("slack", "sendMessage")).toBe(true);
        });

        it("returns true when fixture is registered", () => {
            fixtureRegistry.register({
                provider: "slack",
                operationId: "listChannels",
                validCases: [
                    {
                        name: "basic",
                        input: {},
                        expectedOutput: { channels: [] }
                    }
                ],
                errorCases: []
            });

            expect(router.hasSandboxData("slack", "listChannels")).toBe(true);
        });

        it("returns false when no data exists", () => {
            expect(router.hasSandboxData("slack", "unknownOperation")).toBe(false);
        });
    });

    describe("getMCPTools", () => {
        it("returns MCP tools from provider", async () => {
            const toolsProvider = createMockProvider("slack", {
                getMCPTools: () => [
                    {
                        name: "slack_sendMessage",
                        description: "Send a message to Slack",
                        inputSchema: { type: "object", properties: {} }
                    },
                    {
                        name: "slack_listChannels",
                        description: "List Slack channels",
                        inputSchema: { type: "object", properties: {} }
                    }
                ]
            });

            providerRegistry.clear();
            providerRegistry.register({
                name: "slack",
                displayName: "slack",
                authMethod: "oauth2",
                category: "communication",
                loader: async () => toolsProvider
            });

            const tools = await router.getMCPTools("slack");

            expect(tools).toHaveLength(2);
            expect(tools[0].name).toBe("slack_sendMessage");
        });
    });

    describe("executeMCPTool", () => {
        it("executes MCP tool through provider", async () => {
            const connection = createTestConnection("slack");

            await router.executeMCPTool(
                "slack",
                "slack_sendMessage",
                { channel: "#general", text: "Hello" },
                connection
            );

            expect(mockProvider.executeMCPTool).toHaveBeenCalledWith(
                "slack_sendMessage",
                { channel: "#general", text: "Hello" },
                connection
            );
        });
    });

    describe("discoverOperations", () => {
        it("returns operation summaries", async () => {
            const { z } = await import("zod");

            const operationsProvider = createMockProvider("slack", {
                getOperations: () => [
                    {
                        id: "sendMessage",
                        name: "Send Message",
                        description: "Send a message to a channel",
                        category: "messaging",
                        inputSchema: z.object({
                            channel: z.string().describe("Channel to send to"),
                            text: z.string().describe("Message text")
                        }),
                        retryable: true
                    },
                    {
                        id: "listChannels",
                        name: "List Channels",
                        description: "List all channels",
                        category: "channels",
                        inputSchema: z.object({
                            limit: z.number().optional().describe("Max results")
                        }),
                        retryable: true
                    }
                ]
            });

            providerRegistry.clear();
            providerRegistry.register({
                name: "slack",
                displayName: "slack",
                authMethod: "oauth2",
                category: "communication",
                loader: async () => operationsProvider
            });

            const operations = await router.discoverOperations("slack");

            expect(operations).toHaveLength(2);
            expect(operations[0]).toMatchObject({
                id: "sendMessage",
                name: "Send Message",
                category: "messaging",
                retryable: true
            });
            expect(operations[0].parameters).toBeDefined();
            expect(operations[0].parameters?.some((p) => p.name === "channel")).toBe(true);
        });

        it("throws error for unregistered provider", async () => {
            await expect(router.discoverOperations("nonexistent")).rejects.toThrow();
        });
    });
});
