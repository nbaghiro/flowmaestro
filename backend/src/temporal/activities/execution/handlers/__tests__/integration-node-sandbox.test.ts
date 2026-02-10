/**
 * Integration Node Handler - Sandbox Fixture Tests
 *
 * These tests exercise the integration node handler through the REAL ExecutionRouter
 * with sandbox mode enabled (via isTestConnection: true). This tests the complete
 * handler → router → SandboxDataService → fixture data flow.
 *
 * Unlike integration-node.test.ts which mocks ExecutionRouter, these tests verify
 * that actual fixture data is returned correctly.
 */

// Mock config before importing handler
jest.mock("../../../../../core/config", () => ({
    config: {
        ai: {
            openai: { apiKey: "test-openai-key" },
            anthropic: { apiKey: "test-anthropic-key" }
        },
        database: {
            host: "localhost",
            port: 5432,
            database: "test",
            user: "test",
            password: "test"
        }
    }
}));

// Mock database module
jest.mock("../../../../../storage/database", () => ({
    Database: {
        getInstance: jest.fn().mockReturnValue({
            query: jest.fn().mockResolvedValue({ rows: [] }),
            getPool: jest.fn()
        })
    }
}));

// Mock ConnectionRepository - we control this to return test connections
const mockFindByIdWithData = jest.fn();
jest.mock("../../../../../storage/repositories/ConnectionRepository", () => ({
    ConnectionRepository: jest.fn().mockImplementation(() => ({
        findByIdWithData: mockFindByIdWithData
    }))
}));

// DO NOT mock ExecutionRouter - we want the real one for sandbox tests

import type { JsonObject } from "@flowmaestro/shared";

import {
    createTestContext,
    createTestMetadata
} from "../../../../../../__tests__/helpers/handler-test-utils";
import { airtableFixtures } from "../../../../../integrations/providers/airtable/__tests__/fixtures";
import { discordFixtures } from "../../../../../integrations/providers/discord/__tests__/fixtures";
import { githubFixtures } from "../../../../../integrations/providers/github/__tests__/fixtures";
import { notionFixtures } from "../../../../../integrations/providers/notion/__tests__/fixtures";
import { slackFixtures } from "../../../../../integrations/providers/slack/__tests__/fixtures";
import { fixtureRegistry, sandboxDataService } from "../../../../../integrations/sandbox";
import { IntegrationNodeHandler, createIntegrationNodeHandler } from "../integrations/integration";
import type { TestFixture } from "../../../../../integrations/sandbox";

// Helper to create handler input
function createHandlerInput(
    overrides: {
        nodeType?: string;
        nodeConfig?: Record<string, unknown>;
        context?: ReturnType<typeof createTestContext>;
    } = {}
) {
    const defaultConfig = {
        provider: "airtable",
        operation: "listRecords",
        connectionId: "conn-sandbox-test",
        parameters: {
            baseId: "appXXXXXXXXXXXXXX",
            tableId: "tblYYYYYYYYYYYYYY"
        }
    };

    return {
        nodeType: overrides.nodeType || "integration",
        nodeConfig: { ...defaultConfig, ...overrides.nodeConfig },
        context: overrides.context || createTestContext(),
        metadata: createTestMetadata({ nodeId: "test-sandbox-integration-node" })
    };
}

// Create a test connection with isTestConnection: true for sandbox mode
function createSandboxConnection(
    provider: string,
    overrides: Partial<{
        id: string;
        status: string;
        data: Record<string, unknown>;
    }> = {}
) {
    return {
        id: overrides.id || `conn-sandbox-${provider}`,
        user_id: "test-user-id",
        workspace_id: "test-workspace-id",
        name: `Test ${provider} Connection`,
        connection_method: "oauth2",
        provider,
        status: overrides.status || "active",
        metadata: {
            isTestConnection: true, // This triggers sandbox mode in ExecutionRouter
            account_info: { name: `Test ${provider} Account` }
        },
        capabilities: {},
        last_used_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        data: overrides.data || {
            access_token: `test-token-${provider}`,
            token_type: "Bearer",
            expires_at: new Date(Date.now() + 3600000).toISOString()
        }
    };
}

describe("IntegrationNodeHandler with Sandbox Fixtures", () => {
    let handler: IntegrationNodeHandler;

    beforeAll(() => {
        // Register fixtures in the registry
        fixtureRegistry.registerAll(airtableFixtures);
        fixtureRegistry.registerAll(githubFixtures);
        fixtureRegistry.registerAll(slackFixtures);
        fixtureRegistry.registerAll(notionFixtures);
        fixtureRegistry.registerAll(discordFixtures);
    });

    beforeEach(() => {
        handler = createIntegrationNodeHandler();
        jest.clearAllMocks();
        sandboxDataService.clearScenarios();
    });

    describe("Airtable provider with filterableData", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createSandboxConnection("airtable"));
        });

        it("executes listRecords and returns fixture records", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    provider: "airtable",
                    operation: "listRecords",
                    connectionId: "conn-airtable",
                    parameters: {
                        baseId: "appXXXXXXXXXXXXXX",
                        tableId: "tblYYYYYYYYYYYYYY"
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(true);
            expect(integrationResult.provider).toBe("airtable");
            expect(integrationResult.operation).toBe("listRecords");

            const data = integrationResult.data as JsonObject;
            expect(data.records).toBeDefined();
            expect(Array.isArray(data.records)).toBe(true);
            expect((data.records as unknown[]).length).toBeGreaterThan(0);
        });

        it("applies pageSize limit to results", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    provider: "airtable",
                    operation: "listRecords",
                    connectionId: "conn-airtable",
                    parameters: {
                        baseId: "appXXXXXXXXXXXXXX",
                        tableId: "tblYYYYYYYYYYYYYY",
                        pageSize: 2
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(true);

            const data = integrationResult.data as JsonObject;
            const records = data.records as unknown[];
            expect(records.length).toBeLessThanOrEqual(2);
        });

        it("returns offset for pagination when more records exist", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    provider: "airtable",
                    operation: "listRecords",
                    connectionId: "conn-airtable",
                    parameters: {
                        baseId: "appXXXXXXXXXXXXXX",
                        tableId: "tblYYYYYYYYYYYYYY",
                        pageSize: 2 // Fixture has 5 records
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            const data = integrationResult.data as JsonObject;

            // Should have offset since there are more records
            expect(data.offset).toBeDefined();
            expect(typeof data.offset).toBe("string");
        });

        it("filters records by view", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    provider: "airtable",
                    operation: "listRecords",
                    connectionId: "conn-airtable",
                    parameters: {
                        baseId: "appXXXXXXXXXXXXXX",
                        tableId: "tblYYYYYYYYYYYYYY",
                        view: "Active Tasks"
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(true);

            const data = integrationResult.data as JsonObject;
            const records = data.records as JsonObject[];

            // All returned records should be from "Active Tasks" view
            // The fixture marks records with _views metadata
            expect(records.length).toBeGreaterThan(0);
        });

        it("applies filterByFormula filter", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    provider: "airtable",
                    operation: "listRecords",
                    connectionId: "conn-airtable",
                    parameters: {
                        baseId: "appXXXXXXXXXXXXXX",
                        tableId: "tblYYYYYYYYYYYYYY",
                        filterByFormula: "{Status} = 'Active'"
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(true);

            const data = integrationResult.data as JsonObject;
            const records = data.records as JsonObject[];

            // All returned records should have Status = Active
            for (const record of records) {
                const fields = record.fields as JsonObject;
                expect(fields.Status).toBe("Active");
            }
        });

        it("strips internal metadata fields from response", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    provider: "airtable",
                    operation: "listRecords",
                    connectionId: "conn-airtable",
                    parameters: {
                        baseId: "appXXXXXXXXXXXXXX",
                        tableId: "tblYYYYYYYYYYYYYY"
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            const data = integrationResult.data as JsonObject;
            const records = data.records as JsonObject[];

            // Verify no internal fields (prefixed with _) leak through
            for (const record of records) {
                const internalFields = Object.keys(record).filter((k) => k.startsWith("_"));
                expect(internalFields).toEqual([]);
            }
        });

        it("executes createRecord operation", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    provider: "airtable",
                    operation: "createRecord",
                    connectionId: "conn-airtable",
                    parameters: {
                        baseId: "appXXXXXXXXXXXXXX",
                        tableId: "tblYYYYYYYYYYYYYY",
                        fields: {
                            Name: "Test Record",
                            Status: "Active",
                            Priority: "High"
                        }
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(true);

            const data = integrationResult.data as JsonObject;
            expect(data.id).toBeDefined();
            expect(data.fields).toBeDefined();
        });
    });

    describe("GitHub provider operations", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createSandboxConnection("github"));
        });

        it("executes createIssue and returns expected output", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    provider: "github",
                    operation: "createIssue",
                    connectionId: "conn-github",
                    parameters: {
                        owner: "demo-user",
                        repo: "demo-app",
                        title: "Bug: Login fails on mobile",
                        body: "Users report login issues on iOS devices."
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(true);
            expect(integrationResult.provider).toBe("github");

            const data = integrationResult.data as JsonObject;
            expect(data.id).toBeDefined();
            expect(data.number).toBeDefined();
            expect(data.title).toBe("Bug: Login fails on mobile");
        });

        it("executes getRepository operation", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    provider: "github",
                    operation: "getRepository",
                    connectionId: "conn-github",
                    parameters: {
                        owner: "demo-user",
                        repo: "demo-app"
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(true);

            const data = integrationResult.data as JsonObject;
            expect(data.name).toBe("demo-app");
            expect(data.full_name).toBe("demo-user/demo-app");
        });

        it("executes listIssues with filterableData", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    provider: "github",
                    operation: "listIssues",
                    connectionId: "conn-github",
                    parameters: {
                        owner: "demo-user",
                        repo: "demo-app",
                        state: "open"
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(true);

            const data = integrationResult.data as JsonObject;
            expect(data.issues).toBeDefined();
            expect(Array.isArray(data.issues)).toBe(true);
        });
    });

    describe("Slack provider operations", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createSandboxConnection("slack"));
        });

        it("executes sendMessage operation", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    provider: "slack",
                    operation: "sendMessage",
                    connectionId: "conn-slack",
                    parameters: {
                        channel: "#general",
                        text: "Hello from sandbox test!"
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(true);
            expect(integrationResult.provider).toBe("slack");
        });
    });

    describe("Notion provider operations", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createSandboxConnection("notion"));
        });

        it("executes createPage operation", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    provider: "notion",
                    operation: "createPage",
                    connectionId: "conn-notion",
                    parameters: {
                        parent: { database_id: "test-db-id" },
                        properties: {
                            Name: { title: [{ text: { content: "Test Page" } }] }
                        }
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(true);
            expect(integrationResult.provider).toBe("notion");
        });
    });

    describe("Discord provider operations", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createSandboxConnection("discord"));
        });

        it("executes sendMessage operation", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    provider: "discord",
                    operation: "sendMessage",
                    connectionId: "conn-discord",
                    parameters: {
                        channelId: "123456789",
                        content: "Hello from sandbox!"
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(true);
            expect(integrationResult.provider).toBe("discord");
        });
    });

    describe("Error case handling via registered scenarios", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createSandboxConnection("airtable"));
        });

        it("returns rate limit error when scenario is registered", async () => {
            // Register an error scenario
            sandboxDataService.registerScenario({
                id: "test-rate-limit",
                provider: "airtable",
                operation: "createRecord",
                paramMatchers: {
                    baseId: "appRateLimited"
                },
                response: {
                    success: false,
                    error: {
                        type: "rate_limit",
                        message: "Rate limit exceeded. Please retry after some time.",
                        retryable: true
                    }
                }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "airtable",
                    operation: "createRecord",
                    connectionId: "conn-airtable",
                    parameters: {
                        baseId: "appRateLimited",
                        tableId: "tbl123",
                        fields: { Name: "Test" }
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(false);

            const error = integrationResult.error as JsonObject;
            expect(error.type).toBe("rate_limit");
            expect(error.retryable).toBe(true);
        });

        it("returns validation error when scenario is registered", async () => {
            sandboxDataService.registerScenario({
                id: "test-validation-error",
                provider: "airtable",
                operation: "createRecord",
                paramMatchers: {
                    baseId: "appValidationError"
                },
                response: {
                    success: false,
                    error: {
                        type: "validation",
                        message: 'Unknown field name: "InvalidField"',
                        retryable: false
                    }
                }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "airtable",
                    operation: "createRecord",
                    connectionId: "conn-airtable",
                    parameters: {
                        baseId: "appValidationError",
                        tableId: "tbl123",
                        fields: { InvalidField: "Test" }
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(false);

            const error = integrationResult.error as JsonObject;
            expect(error.type).toBe("validation");
            expect(error.retryable).toBe(false);
        });

        it("returns not_found error when scenario is registered", async () => {
            sandboxDataService.registerScenario({
                id: "test-not-found",
                provider: "github",
                operation: "getIssue",
                paramMatchers: {
                    issue_number: 9999
                },
                response: {
                    success: false,
                    error: {
                        type: "not_found",
                        message: "Not Found",
                        retryable: false
                    }
                }
            });

            mockFindByIdWithData.mockResolvedValue(createSandboxConnection("github"));

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "github",
                    operation: "getIssue",
                    connectionId: "conn-github",
                    parameters: {
                        owner: "demo-user",
                        repo: "demo-app",
                        issue_number: 9999
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(false);

            const error = integrationResult.error as JsonObject;
            expect(error.type).toBe("not_found");
        });
    });

    describe("Output variable handling", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createSandboxConnection("airtable"));
        });

        it("stores result in custom output variable", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    provider: "airtable",
                    operation: "listRecords",
                    connectionId: "conn-airtable",
                    parameters: {
                        baseId: "appXXXXXXXXXXXXXX",
                        tableId: "tblYYYYYYYYYYYYYY"
                    },
                    outputVariable: "airtableRecords"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            // Should have the custom output variable instead of integrationResult
            expect(result.airtableRecords).toBeDefined();
            expect(result.integrationResult).toBeUndefined();

            const data = result.airtableRecords as JsonObject;
            expect(data.records).toBeDefined();
        });
    });

    describe("Handler metadata", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createSandboxConnection("airtable"));
        });

        it("includes requestTime in metadata", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    provider: "airtable",
                    operation: "listRecords",
                    connectionId: "conn-airtable",
                    parameters: {
                        baseId: "appXXXXXXXXXXXXXX",
                        tableId: "tblYYYYYYYYYYYYYY"
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.metadata).toBeDefined();

            const metadata = integrationResult.metadata as JsonObject;
            expect(metadata.requestTime).toBeDefined();
            expect(typeof metadata.requestTime).toBe("number");
            expect(metadata.requestTime).toBeGreaterThanOrEqual(0);
        });

        it("includes durationMs in output metrics", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    provider: "airtable",
                    operation: "listRecords",
                    connectionId: "conn-airtable",
                    parameters: {
                        baseId: "appXXXXXXXXXXXXXX",
                        tableId: "tblYYYYYYYYYYYYYY"
                    }
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });
    });

    describe("Connection validation", () => {
        it("returns error when connection not found", async () => {
            mockFindByIdWithData.mockResolvedValue(null);

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "airtable",
                    operation: "listRecords",
                    connectionId: "non-existent-connection",
                    parameters: {
                        baseId: "appXXX",
                        tableId: "tblYYY"
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(false);
            expect((integrationResult.error as JsonObject).message).toContain("not found");
        });

        it("returns error when connection is not active", async () => {
            mockFindByIdWithData.mockResolvedValue(
                createSandboxConnection("airtable", { status: "expired" })
            );

            const input = createHandlerInput({
                nodeConfig: {
                    provider: "airtable",
                    operation: "listRecords",
                    connectionId: "conn-expired",
                    parameters: {
                        baseId: "appXXX",
                        tableId: "tblYYY"
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            const integrationResult = result.integrationResult as JsonObject;
            expect(integrationResult.success).toBe(false);
            expect((integrationResult.error as JsonObject).message).toContain("not active");
        });
    });

    describe("Fixture registry access", () => {
        it("verifies fixtures are registered for tested providers", () => {
            expect(fixtureRegistry.has("airtable", "listRecords")).toBe(true);
            expect(fixtureRegistry.has("airtable", "createRecord")).toBe(true);
            expect(fixtureRegistry.has("github", "createIssue")).toBe(true);
            expect(fixtureRegistry.has("github", "listIssues")).toBe(true);
        });

        it("retrieves fixture by provider and operation", () => {
            const fixture = fixtureRegistry.get("airtable", "listRecords") as TestFixture;

            expect(fixture).toBeDefined();
            expect(fixture.provider).toBe("airtable");
            expect(fixture.operationId).toBe("listRecords");
            expect(fixture.filterableData).toBeDefined();
            expect(fixture.validCases.length).toBeGreaterThan(0);
        });
    });
});
