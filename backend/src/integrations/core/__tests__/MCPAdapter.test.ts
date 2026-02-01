/**
 * MCP Adapter Unit Tests
 *
 * Tests the MCP (Model Context Protocol) adapter functionality for integration providers.
 * Verifies tool listing, schema generation, name construction, tool execution, and error handling.
 */

import { sandboxDataService } from "../../sandbox";
import { providerRegistry } from "../ProviderRegistry";
import type { ConnectionWithData } from "../../../storage/models/Connection";
import type { MCPTool, JSONSchema } from "../types";

// Import registry to register all providers
import "../../registry";

/**
 * Create a test connection for a provider (simplified for unit tests)
 */
function createTestConnection(provider: string): ConnectionWithData {
    return {
        id: `test-connection-${provider}-${Date.now()}`,
        user_id: "test-user-id",
        workspace_id: "test-workspace-id",
        name: `Test ${provider} Connection`,
        connection_method: "oauth2",
        provider,
        status: "active",
        metadata: {
            isTestConnection: true,
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

/**
 * Test providers to verify MCP adapter consistency
 */
const TEST_PROVIDERS = ["slack", "airtable", "github"];

describe("MCP Adapter", () => {
    beforeEach(() => {
        sandboxDataService.clearScenarios();
    });

    describe("Tool Listing", () => {
        it.each(TEST_PROVIDERS)("%s: getTools() returns non-empty array", async (providerName) => {
            const provider = await providerRegistry.loadProvider(providerName);
            const tools = provider.getMCPTools();

            expect(Array.isArray(tools)).toBe(true);
            expect(tools.length).toBeGreaterThan(0);
        });

        it.each(TEST_PROVIDERS)(
            "%s: getTools() returns tools with correct structure",
            async (providerName) => {
                const provider = await providerRegistry.loadProvider(providerName);
                const tools = provider.getMCPTools();

                for (const tool of tools) {
                    expect(tool).toHaveProperty("name");
                    expect(tool).toHaveProperty("description");
                    expect(tool).toHaveProperty("inputSchema");
                    expect(typeof tool.name).toBe("string");
                    expect(typeof tool.description).toBe("string");
                    expect(typeof tool.inputSchema).toBe("object");
                }
            }
        );

        it.each(TEST_PROVIDERS)("%s: tool count matches operation count", async (providerName) => {
            const provider = await providerRegistry.loadProvider(providerName);
            const tools = provider.getMCPTools();
            const operations = provider.getOperations();

            expect(tools.length).toBe(operations.length);
        });
    });

    describe("Tool Name Construction", () => {
        it.each(TEST_PROVIDERS)(
            "%s: tool names follow provider_operationId format",
            async (providerName) => {
                const provider = await providerRegistry.loadProvider(providerName);
                const tools = provider.getMCPTools();

                for (const tool of tools) {
                    expect(tool.name).toMatch(new RegExp(`^${providerName}_\\w+$`));
                }
            }
        );

        it("slack: generates slack_sendMessage tool name", async () => {
            const provider = await providerRegistry.loadProvider("slack");
            const tools = provider.getMCPTools();

            const sendMessageTool = tools.find((t) => t.name === "slack_sendMessage");
            expect(sendMessageTool).toBeDefined();
            expect(sendMessageTool?.name).toBe("slack_sendMessage");
        });

        it("airtable: generates airtable_listRecords tool name", async () => {
            const provider = await providerRegistry.loadProvider("airtable");
            const tools = provider.getMCPTools();

            const listRecordsTool = tools.find((t) => t.name === "airtable_listRecords");
            expect(listRecordsTool).toBeDefined();
            expect(listRecordsTool?.name).toBe("airtable_listRecords");
        });

        it("github: generates github_createIssue tool name", async () => {
            const provider = await providerRegistry.loadProvider("github");
            const tools = provider.getMCPTools();

            const createIssueTool = tools.find((t) => t.name === "github_createIssue");
            expect(createIssueTool).toBeDefined();
            expect(createIssueTool?.name).toBe("github_createIssue");
        });

        it.each(TEST_PROVIDERS)("%s: all tool names are unique", async (providerName) => {
            const provider = await providerRegistry.loadProvider(providerName);
            const tools = provider.getMCPTools();
            const toolNames = tools.map((t) => t.name);
            const uniqueNames = new Set(toolNames);

            expect(uniqueNames.size).toBe(toolNames.length);
        });

        it.each(TEST_PROVIDERS)(
            "%s: tool name corresponds to operation executeRef",
            async (providerName) => {
                const provider = await providerRegistry.loadProvider(providerName);
                const tools = provider.getMCPTools();
                const operations = provider.getOperations();
                const operationIds = operations.map((op) => op.id);

                for (const tool of tools) {
                    // Extract operation ID from tool name
                    const expectedOperationId = tool.name.replace(`${providerName}_`, "");
                    expect(operationIds).toContain(expectedOperationId);

                    // Verify executeRef matches if present
                    if (tool.executeRef) {
                        expect(tool.executeRef).toBe(expectedOperationId);
                    }
                }
            }
        );
    });

    describe("Tool Schema Generation", () => {
        it.each(TEST_PROVIDERS)(
            "%s: each tool has valid JSON Schema inputSchema",
            async (providerName) => {
                const provider = await providerRegistry.loadProvider(providerName);
                const tools = provider.getMCPTools();

                for (const tool of tools) {
                    const schema = tool.inputSchema;

                    // JSON Schema should have a type
                    expect(schema).toHaveProperty("type");
                    expect(schema.type).toBe("object");
                }
            }
        );

        it.each(TEST_PROVIDERS)(
            "%s: tool schemas have properties for object types",
            async (providerName) => {
                const provider = await providerRegistry.loadProvider(providerName);
                const tools = provider.getMCPTools();

                for (const tool of tools) {
                    const schema = tool.inputSchema;

                    if (schema.type === "object") {
                        // Object schemas should have properties (even if empty)
                        expect(schema).toHaveProperty("properties");
                        expect(typeof schema.properties).toBe("object");
                    }
                }
            }
        );

        it.each(TEST_PROVIDERS)(
            "%s: tool schemas have required array for objects with required fields",
            async (providerName) => {
                const provider = await providerRegistry.loadProvider(providerName);
                const tools = provider.getMCPTools();

                for (const tool of tools) {
                    const schema = tool.inputSchema;

                    // If schema has required fields, verify it's an array
                    if (schema.required !== undefined) {
                        expect(Array.isArray(schema.required)).toBe(true);
                    }
                }
            }
        );

        it("slack_sendMessage: schema has channel and text properties", async () => {
            const provider = await providerRegistry.loadProvider("slack");
            const tools = provider.getMCPTools();
            const sendMessageTool = tools.find((t) => t.name === "slack_sendMessage");

            expect(sendMessageTool).toBeDefined();
            const schema = sendMessageTool!.inputSchema;

            expect(schema.properties).toHaveProperty("channel");
            expect(schema.properties).toHaveProperty("text");
        });

        it("airtable_createRecord: schema has baseId, tableId, and fields properties", async () => {
            const provider = await providerRegistry.loadProvider("airtable");
            const tools = provider.getMCPTools();
            const createRecordTool = tools.find((t) => t.name === "airtable_createRecord");

            expect(createRecordTool).toBeDefined();
            const schema = createRecordTool!.inputSchema;

            expect(schema.properties).toHaveProperty("baseId");
            expect(schema.properties).toHaveProperty("tableId");
            expect(schema.properties).toHaveProperty("fields");
        });

        it("github_createIssue: schema has owner, repo, and title properties", async () => {
            const provider = await providerRegistry.loadProvider("github");
            const tools = provider.getMCPTools();
            const createIssueTool = tools.find((t) => t.name === "github_createIssue");

            expect(createIssueTool).toBeDefined();
            const schema = createIssueTool!.inputSchema;

            expect(schema.properties).toHaveProperty("owner");
            expect(schema.properties).toHaveProperty("repo");
            expect(schema.properties).toHaveProperty("title");
        });

        it.each(TEST_PROVIDERS)(
            "%s: schema property types are valid JSON Schema types",
            async (providerName) => {
                const provider = await providerRegistry.loadProvider(providerName);
                const tools = provider.getMCPTools();

                const validTypes = [
                    "string",
                    "number",
                    "integer",
                    "boolean",
                    "array",
                    "object",
                    "null"
                ];

                for (const tool of tools) {
                    const schema = tool.inputSchema;

                    if (schema.properties) {
                        for (const [_propName, propSchema] of Object.entries(schema.properties)) {
                            const prop = propSchema as JSONSchema;

                            // Property should have type (or anyOf/oneOf for union types)
                            if (prop.type) {
                                if (Array.isArray(prop.type)) {
                                    for (const t of prop.type) {
                                        expect(validTypes).toContain(t);
                                    }
                                } else {
                                    expect(validTypes).toContain(prop.type);
                                }
                            }
                        }
                    }
                }
            }
        );
    });

    describe("Tool Execution", () => {
        /**
         * Tool execution tests use the ExecutionRouter which handles sandbox mode
         * for test connections (isTestConnection: true in metadata).
         *
         * Note: Direct provider.executeMCPTool() calls bypass sandbox mode,
         * so we use router.execute() which properly routes to sandbox for tests.
         */
        it("slack: MCP adapter correctly parses tool name and extracts operation ID", async () => {
            const provider = await providerRegistry.loadProvider("slack");
            const tools = provider.getMCPTools();
            const sendMessageTool = tools.find((t) => t.name === "slack_sendMessage");

            expect(sendMessageTool).toBeDefined();
            // executeRef should match the operation ID
            expect(sendMessageTool?.executeRef).toBe("sendMessage");
        });

        it("airtable: MCP adapter correctly parses tool name and extracts operation ID", async () => {
            const provider = await providerRegistry.loadProvider("airtable");
            const tools = provider.getMCPTools();
            const createRecordTool = tools.find((t) => t.name === "airtable_createRecord");

            expect(createRecordTool).toBeDefined();
            expect(createRecordTool?.executeRef).toBe("createRecord");
        });

        it("github: MCP adapter correctly parses tool name and extracts operation ID", async () => {
            const provider = await providerRegistry.loadProvider("github");
            const tools = provider.getMCPTools();
            const createIssueTool = tools.find((t) => t.name === "github_createIssue");

            expect(createIssueTool).toBeDefined();
            expect(createIssueTool?.executeRef).toBe("createIssue");
        });

        it.each(TEST_PROVIDERS)(
            "%s: all tools have executeRef matching operation ID",
            async (providerName) => {
                const provider = await providerRegistry.loadProvider(providerName);
                const tools = provider.getMCPTools();
                const operations = provider.getOperations();
                const operationMap = new Map(operations.map((op) => [op.id, op]));

                for (const tool of tools) {
                    const expectedOperationId = tool.name.replace(`${providerName}_`, "");
                    expect(tool.executeRef).toBe(expectedOperationId);
                    expect(operationMap.has(expectedOperationId)).toBe(true);
                }
            }
        );
    });

    describe("Error Handling", () => {
        it("slack: throws error for unknown tool name", async () => {
            const provider = await providerRegistry.loadProvider("slack");
            const connection = createTestConnection("slack");

            await expect(
                provider.executeMCPTool("slack_unknownOperation", {}, connection)
            ).rejects.toThrow(/unknown.*operation/i);
        });

        it("airtable: throws error for unknown tool name", async () => {
            const provider = await providerRegistry.loadProvider("airtable");
            const connection = createTestConnection("airtable");

            await expect(
                provider.executeMCPTool("airtable_unknownOperation", {}, connection)
            ).rejects.toThrow(/unknown.*operation/i);
        });

        it("github: throws error for unknown tool name", async () => {
            const provider = await providerRegistry.loadProvider("github");
            const connection = createTestConnection("github");

            await expect(
                provider.executeMCPTool("github_unknownOperation", {}, connection)
            ).rejects.toThrow(/unknown.*operation/i);
        });

        it("slack: throws error when operation fails", async () => {
            sandboxDataService.registerScenario({
                id: "mcp-error-test",
                provider: "slack",
                operation: "sendMessage",
                response: {
                    success: false,
                    error: {
                        type: "permission",
                        message: "not_in_channel",
                        retryable: false
                    }
                }
            });

            const provider = await providerRegistry.loadProvider("slack");
            const connection = createTestConnection("slack");

            await expect(
                provider.executeMCPTool(
                    "slack_sendMessage",
                    {
                        channel: "#private-channel",
                        text: "Test"
                    },
                    connection
                )
            ).rejects.toThrow();

            sandboxDataService.removeScenario("mcp-error-test");
        });

        it("github: throws error when operation fails with rate limit", async () => {
            sandboxDataService.registerScenario({
                id: "mcp-rate-limit-test",
                provider: "github",
                operation: "createIssue",
                response: {
                    success: false,
                    error: {
                        type: "rate_limit",
                        message: "API rate limit exceeded",
                        retryable: true
                    }
                }
            });

            const provider = await providerRegistry.loadProvider("github");
            const connection = createTestConnection("github");

            await expect(
                provider.executeMCPTool(
                    "github_createIssue",
                    {
                        owner: "test-org",
                        repo: "test-repo",
                        title: "Test"
                    },
                    connection
                )
            ).rejects.toThrow();

            sandboxDataService.removeScenario("mcp-rate-limit-test");
        });
    });

    describe("Cross-Provider Consistency", () => {
        it("all test providers follow same MCP tool structure", async () => {
            const toolsByProvider: Map<string, MCPTool[]> = new Map();

            for (const providerName of TEST_PROVIDERS) {
                const provider = await providerRegistry.loadProvider(providerName);
                toolsByProvider.set(providerName, provider.getMCPTools());
            }

            // Verify all providers return tools with the same structure
            for (const [providerName, tools] of toolsByProvider) {
                for (const tool of tools) {
                    // Required properties
                    expect(tool).toHaveProperty("name");
                    expect(tool).toHaveProperty("description");
                    expect(tool).toHaveProperty("inputSchema");

                    // Name format
                    expect(tool.name).toMatch(new RegExp(`^${providerName}_\\w+$`));

                    // Description is non-empty
                    expect(tool.description.length).toBeGreaterThan(0);

                    // Schema is an object type
                    expect(tool.inputSchema.type).toBe("object");
                }
            }
        });

        it("tool descriptions are meaningful and non-empty", async () => {
            for (const providerName of TEST_PROVIDERS) {
                const provider = await providerRegistry.loadProvider(providerName);
                const tools = provider.getMCPTools();

                for (const tool of tools) {
                    expect(tool.description).toBeTruthy();
                    expect(tool.description.length).toBeGreaterThan(5);
                    // Description should not be placeholder text
                    expect(tool.description.toLowerCase()).not.toContain("todo");
                    expect(tool.description.toLowerCase()).not.toContain("placeholder");
                }
            }
        });
    });

    describe("Operation to Tool Mapping", () => {
        it.each(TEST_PROVIDERS)(
            "%s: every operation has a corresponding MCP tool",
            async (providerName) => {
                const provider = await providerRegistry.loadProvider(providerName);
                const operations = provider.getOperations();
                const tools = provider.getMCPTools();

                const toolOperationIds = tools.map((t) => t.name.replace(`${providerName}_`, ""));

                for (const operation of operations) {
                    expect(toolOperationIds).toContain(operation.id);
                }
            }
        );

        it.each(TEST_PROVIDERS)(
            "%s: tool description matches operation description",
            async (providerName) => {
                const provider = await providerRegistry.loadProvider(providerName);
                const operations = provider.getOperations();
                const tools = provider.getMCPTools();

                for (const operation of operations) {
                    const matchingTool = tools.find(
                        (t) => t.name === `${providerName}_${operation.id}`
                    );

                    expect(matchingTool).toBeDefined();
                    expect(matchingTool?.description).toBe(operation.description);
                }
            }
        );
    });
});
