/**
 * Agent Tool Management Route Tests
 *
 * Tests for tool CRUD operations:
 * - GET /agents/:id/tools - List tools
 * - POST /agents/:id/tools - Add tool
 * - PUT /agents/:id/tools/:toolId - Update tool
 * - DELETE /agents/:id/tools/:toolId - Remove tool
 * - POST /agents/:id/tools/batch - Batch add tools
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MOCK SETUP
// ============================================================================

const mockAgentRepo = {
    findByWorkspaceId: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
};

jest.mock("../../../../storage/repositories/AgentRepository", () => ({
    AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo)
}));

jest.mock("../../../../storage/repositories", () => ({
    UserRepository: jest.fn().mockImplementation(() => ({
        findById: jest.fn(),
        findByEmail: jest.fn()
    })),
    AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo)
}));

// Import test helpers after mocks
import {
    authenticatedRequest,
    closeTestServer,
    createTestServer,
    createTestUser,
    expectErrorResponse,
    expectStatus,
    DEFAULT_TEST_WORKSPACE_ID
} from "../../../../../__tests__/helpers/fastify-test-client";

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockAgent(
    overrides: Partial<{
        id: string;
        workspace_id: string;
        available_tools: object[];
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        user_id: uuidv4(),
        workspace_id: overrides.workspace_id || DEFAULT_TEST_WORKSPACE_ID,
        name: "Test Agent",
        description: "A test agent",
        model: "gpt-4",
        provider: "openai",
        system_prompt: "You are helpful.",
        temperature: 0.7,
        max_tokens: 4096,
        max_iterations: 100,
        available_tools: overrides.available_tools || [],
        memory_config: { type: "buffer", max_messages: 50 },
        connection_id: null,
        folder_id: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null
    };
}

function createMockTool(
    overrides: Partial<{
        id: string;
        name: string;
        type: string;
        description: string;
        schema: object;
        config: object;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        name: overrides.name || "test_tool",
        type: overrides.type || "function",
        description: overrides.description || "A test tool",
        schema: overrides.schema || {
            type: "object",
            properties: {
                input: { type: "string" }
            },
            required: ["input"]
        },
        config: overrides.config || {}
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Agent Tool Routes", () => {
    let app: FastifyInstance;
    let testUser: ReturnType<typeof createTestUser>;

    beforeAll(async () => {
        app = await createTestServer();
        testUser = createTestUser();
    });

    afterAll(async () => {
        await closeTestServer(app);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("POST /agents/:id/tools", () => {
        it("should add a tool to agent", async () => {
            const agent = createMockAgent();
            const tool = createMockTool({ name: "new_tool" });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentRepo.update.mockResolvedValue({
                ...agent,
                available_tools: [tool]
            });

            const response = await authenticatedRequest(app, testUser, {
                method: "POST",
                url: `/agents/${agent.id}/tools`,
                payload: tool
            });

            expectStatus(response, 200);
            expect(mockAgentRepo.update).toHaveBeenCalledWith(
                agent.id,
                expect.objectContaining({
                    available_tools: expect.arrayContaining([
                        expect.objectContaining({ name: "new_tool" })
                    ])
                })
            );
        });

        it("should reject duplicate tool name", async () => {
            const existingTool = createMockTool({ name: "existing_tool" });
            const agent = createMockAgent({ available_tools: [existingTool] });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);

            const response = await authenticatedRequest(app, testUser, {
                method: "POST",
                url: `/agents/${agent.id}/tools`,
                payload: createMockTool({ name: "existing_tool" })
            });

            expectStatus(response, 400);
        });

        it("should validate tool schema structure", async () => {
            const agent = createMockAgent();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);

            const invalidTool = {
                name: "invalid_tool",
                type: "function",
                description: "Test",
                schema: "not-an-object", // Invalid schema
                config: {}
            };

            const response = await authenticatedRequest(app, testUser, {
                method: "POST",
                url: `/agents/${agent.id}/tools`,
                payload: invalidTool
            });

            expectStatus(response, 400);
        });

        it("should validate required tool fields", async () => {
            const agent = createMockAgent();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);

            const incompleteTool = {
                name: "incomplete_tool"
                // Missing type, description, schema
            };

            const response = await authenticatedRequest(app, testUser, {
                method: "POST",
                url: `/agents/${agent.id}/tools`,
                payload: incompleteTool
            });

            expectStatus(response, 400);
        });

        it("should return 404 for non-existent agent", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(app, testUser, {
                method: "POST",
                url: `/agents/${uuidv4()}/tools`,
                payload: createMockTool()
            });

            expectErrorResponse(response, 404);
        });

        it("should validate tool type enum", async () => {
            const agent = createMockAgent();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);

            const invalidTypeTool = createMockTool({ type: "invalid_type" });

            const response = await authenticatedRequest(app, testUser, {
                method: "POST",
                url: `/agents/${agent.id}/tools`,
                payload: invalidTypeTool
            });

            expectStatus(response, 400);
        });

        it("should auto-generate tool ID if not provided", async () => {
            const agent = createMockAgent();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentRepo.update.mockImplementation(async (_id, data) => {
                return { ...agent, ...data };
            });

            const toolWithoutId = {
                name: "auto_id_tool",
                type: "function",
                description: "Test",
                schema: { type: "object", properties: {} },
                config: {}
            };

            const response = await authenticatedRequest(app, testUser, {
                method: "POST",
                url: `/agents/${agent.id}/tools`,
                payload: toolWithoutId
            });

            expectStatus(response, 200);

            const updateCall = mockAgentRepo.update.mock.calls[0][1];
            const addedTool = updateCall.available_tools[0];
            expect(addedTool.id).toBeDefined();
            expect(typeof addedTool.id).toBe("string");
        });
    });

    describe("DELETE /agents/:id/tools/:toolId", () => {
        it("should remove tool from agent", async () => {
            const tool = createMockTool({ id: "tool-123", name: "removable_tool" });
            const agent = createMockAgent({ available_tools: [tool] });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentRepo.update.mockResolvedValue({
                ...agent,
                available_tools: []
            });

            const response = await authenticatedRequest(app, testUser, {
                method: "DELETE",
                url: `/agents/${agent.id}/tools/tool-123`
            });

            expectStatus(response, 200);
            expect(mockAgentRepo.update).toHaveBeenCalledWith(
                agent.id,
                expect.objectContaining({
                    available_tools: []
                })
            );
        });

        it("should return 404 for non-existent tool", async () => {
            const agent = createMockAgent({ available_tools: [] });
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);

            const response = await authenticatedRequest(app, testUser, {
                method: "DELETE",
                url: `/agents/${agent.id}/tools/non-existent`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 404 for non-existent agent", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(app, testUser, {
                method: "DELETE",
                url: `/agents/${uuidv4()}/tools/tool-123`
            });

            expectErrorResponse(response, 404);
        });

        it("should preserve other tools when removing one", async () => {
            const tool1 = createMockTool({ id: "tool-1", name: "tool_one" });
            const tool2 = createMockTool({ id: "tool-2", name: "tool_two" });
            const tool3 = createMockTool({ id: "tool-3", name: "tool_three" });
            const agent = createMockAgent({ available_tools: [tool1, tool2, tool3] });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentRepo.update.mockImplementation(async (_id, data) => {
                return { ...agent, ...data };
            });

            const response = await authenticatedRequest(app, testUser, {
                method: "DELETE",
                url: `/agents/${agent.id}/tools/tool-2`
            });

            expectStatus(response, 200);

            const updateCall = mockAgentRepo.update.mock.calls[0][1];
            expect(updateCall.available_tools).toHaveLength(2);
            expect(updateCall.available_tools.map((t: { name: string }) => t.name)).toEqual([
                "tool_one",
                "tool_three"
            ]);
        });
    });

    describe("POST /agents/:id/tools/batch", () => {
        it("should add multiple tools at once", async () => {
            const agent = createMockAgent();
            const tools = [
                createMockTool({ name: "batch_tool_1" }),
                createMockTool({ name: "batch_tool_2" }),
                createMockTool({ name: "batch_tool_3" })
            ];

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentRepo.update.mockResolvedValue({
                ...agent,
                available_tools: tools
            });

            const response = await authenticatedRequest(app, testUser, {
                method: "POST",
                url: `/agents/${agent.id}/tools/batch`,
                payload: { tools }
            });

            expectStatus(response, 200);
            expect(mockAgentRepo.update).toHaveBeenCalledWith(
                agent.id,
                expect.objectContaining({
                    available_tools: expect.arrayContaining([
                        expect.objectContaining({ name: "batch_tool_1" }),
                        expect.objectContaining({ name: "batch_tool_2" }),
                        expect.objectContaining({ name: "batch_tool_3" })
                    ])
                })
            );
        });

        it("should skip tools with duplicate names in existing agent tools", async () => {
            const existingTool = createMockTool({ name: "existing_tool" });
            const agent = createMockAgent({ available_tools: [existingTool] });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentRepo.update.mockResolvedValue({
                ...agent,
                available_tools: [existingTool, createMockTool({ name: "new_tool" })]
            });

            const newTools = [
                createMockTool({ name: "existing_tool" }), // Should be skipped
                createMockTool({ name: "new_tool" })
            ];

            const response = await authenticatedRequest(app, testUser, {
                method: "POST",
                url: `/agents/${agent.id}/tools/batch`,
                payload: { tools: newTools }
            });

            expectStatus(response, 200);
        });

        it("should skip duplicate tools within the same batch", async () => {
            const agent = createMockAgent();

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentRepo.update.mockResolvedValue({
                ...agent,
                available_tools: [createMockTool({ name: "duplicate_name" })]
            });

            const toolsWithDuplicates = [
                createMockTool({ name: "duplicate_name" }),
                createMockTool({ name: "duplicate_name" }) // Duplicate in batch
            ];

            const response = await authenticatedRequest(app, testUser, {
                method: "POST",
                url: `/agents/${agent.id}/tools/batch`,
                payload: { tools: toolsWithDuplicates }
            });

            expectStatus(response, 200);
        });

        it("should validate all tools in batch", async () => {
            const agent = createMockAgent();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);

            const toolsWithInvalid = [
                createMockTool({ name: "valid_tool" }),
                { name: "invalid_tool" } // Missing required fields
            ];

            const response = await authenticatedRequest(app, testUser, {
                method: "POST",
                url: `/agents/${agent.id}/tools/batch`,
                payload: { tools: toolsWithInvalid }
            });

            expectStatus(response, 400);
        });

        it("should return 404 for non-existent agent", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(app, testUser, {
                method: "POST",
                url: `/agents/${uuidv4()}/tools/batch`,
                payload: { tools: [createMockTool()] }
            });

            expectErrorResponse(response, 404);
        });
    });

    describe("Tool schema validation edge cases", () => {
        it("should accept complex nested schema", async () => {
            const agent = createMockAgent();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentRepo.update.mockImplementation(async (_id, data) => {
                return { ...agent, ...data };
            });

            const complexTool = createMockTool({
                name: "complex_tool",
                schema: {
                    type: "object",
                    properties: {
                        user: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                age: { type: "integer", minimum: 0 },
                                emails: {
                                    type: "array",
                                    items: { type: "string", format: "email" }
                                }
                            },
                            required: ["name"]
                        },
                        options: {
                            type: "object",
                            additionalProperties: { type: "string" }
                        }
                    },
                    required: ["user"]
                }
            });

            const response = await authenticatedRequest(app, testUser, {
                method: "POST",
                url: `/agents/${agent.id}/tools`,
                payload: complexTool
            });

            expectStatus(response, 200);
        });

        it("should accept schema with enum values", async () => {
            const agent = createMockAgent();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentRepo.update.mockImplementation(async (_id, data) => {
                return { ...agent, ...data };
            });

            const enumTool = createMockTool({
                name: "enum_tool",
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "string",
                            enum: ["pending", "active", "completed"]
                        },
                        priority: {
                            type: "integer",
                            enum: [1, 2, 3, 4, 5]
                        }
                    }
                }
            });

            const response = await authenticatedRequest(app, testUser, {
                method: "POST",
                url: `/agents/${agent.id}/tools`,
                payload: enumTool
            });

            expectStatus(response, 200);
        });
    });

    describe("Tool type-specific validation", () => {
        it("should validate workflow tool config", async () => {
            const agent = createMockAgent();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentRepo.update.mockImplementation(async (_id, data) => {
                return { ...agent, ...data };
            });

            const workflowTool = createMockTool({
                name: "workflow_tool",
                type: "workflow",
                config: { workflowId: uuidv4() }
            });

            const response = await authenticatedRequest(app, testUser, {
                method: "POST",
                url: `/agents/${agent.id}/tools`,
                payload: workflowTool
            });

            expectStatus(response, 200);
        });

        it("should validate mcp tool config", async () => {
            const agent = createMockAgent();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentRepo.update.mockImplementation(async (_id, data) => {
                return { ...agent, ...data };
            });

            const mcpTool = createMockTool({
                name: "mcp_tool",
                type: "mcp",
                config: {
                    connectionId: uuidv4(),
                    provider: "slack"
                }
            });

            const response = await authenticatedRequest(app, testUser, {
                method: "POST",
                url: `/agents/${agent.id}/tools`,
                payload: mcpTool
            });

            expectStatus(response, 200);
        });

        it("should validate knowledge_base tool config", async () => {
            const agent = createMockAgent();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentRepo.update.mockImplementation(async (_id, data) => {
                return { ...agent, ...data };
            });

            const kbTool = createMockTool({
                name: "kb_tool",
                type: "knowledge_base",
                config: { knowledgeBaseId: uuidv4() }
            });

            const response = await authenticatedRequest(app, testUser, {
                method: "POST",
                url: `/agents/${agent.id}/tools`,
                payload: kbTool
            });

            expectStatus(response, 200);
        });

        it("should reject builtin tool type (not user-addable)", async () => {
            const agent = createMockAgent();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);

            const builtinTool = createMockTool({
                name: "builtin_tool",
                type: "builtin",
                config: {
                    category: "web",
                    creditCost: 1
                }
            });

            const response = await authenticatedRequest(app, testUser, {
                method: "POST",
                url: `/agents/${agent.id}/tools`,
                payload: builtinTool
            });

            // Builtin tools are system-managed and cannot be added by users
            expectStatus(response, 400);
        });
    });

    describe("Multi-tenant isolation", () => {
        it("should not allow access to other workspace agent tools", async () => {
            const otherWorkspaceAgent = createMockAgent({
                workspace_id: "other-workspace-id"
            });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(app, testUser, {
                method: "POST",
                url: `/agents/${otherWorkspaceAgent.id}/tools`,
                payload: createMockTool()
            });

            expectErrorResponse(response, 404);
        });
    });
});
