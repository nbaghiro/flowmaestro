/**
 * Agent Templates Route Tests
 *
 * Tests for agent template listing, retrieval, and copying.
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
    createTestServer,
    closeTestServer,
    authenticatedRequest,
    unauthenticatedRequest,
    createTestUser,
    expectStatus,
    expectSuccessResponse,
    expectErrorResponse,
    DEFAULT_TEST_WORKSPACE_ID
} from "../../../../../__tests__/helpers/fastify-test-client";
import type {
    AgentTemplateModel,
    AgentTemplateCategoryCount
} from "../../../../storage/models/AgentTemplate";

// ============================================================================
// MOCKS
// ============================================================================

// Mock agent template repository
const mockAgentTemplateRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    getCategories: jest.fn(),
    incrementViewCount: jest.fn(),
    incrementUseCount: jest.fn()
};

// Mock agent repository for copy operation
const mockAgentRepo = {
    create: jest.fn()
};

jest.mock("../../../../storage/repositories", () => ({
    AgentTemplateRepository: jest.fn().mockImplementation(() => mockAgentTemplateRepo),
    AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo),
    UserRepository: jest.fn().mockImplementation(() => ({
        findById: jest.fn(),
        findByEmail: jest.fn()
    }))
}));

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockAgentTemplate(
    overrides: Partial<AgentTemplateModel> = {}
): AgentTemplateModel {
    return {
        id: uuidv4(),
        name: "Test Agent Template",
        description: "A test agent template for customer support",
        system_prompt: "You are a helpful customer support agent.",
        model: "gpt-4",
        provider: "openai",
        temperature: 0.7,
        max_tokens: 4096,
        available_tools: [
            { name: "search_knowledge_base", description: "Search the knowledge base" }
        ],
        category: "support",
        tags: ["customer-service", "chatbot"],
        icon: "headphones",
        color: "#10B981",
        author_name: "FlowMaestro",
        author_avatar_url: null,
        view_count: 200,
        use_count: 100,
        featured: true,
        sort_order: 1,
        required_integrations: [],
        version: "1.0.0",
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
        published_at: new Date(),
        ...overrides
    };
}

function resetAllMocks(): void {
    jest.clearAllMocks();

    // Reset default behaviors
    mockAgentTemplateRepo.findAll.mockResolvedValue({ templates: [], total: 0 });
    mockAgentTemplateRepo.findById.mockResolvedValue(null);
    mockAgentTemplateRepo.getCategories.mockResolvedValue([]);
    mockAgentTemplateRepo.incrementViewCount.mockResolvedValue(undefined);
    mockAgentTemplateRepo.incrementUseCount.mockResolvedValue(undefined);

    mockAgentRepo.create.mockImplementation((data) =>
        Promise.resolve({
            id: uuidv4(),
            ...data,
            created_at: new Date(),
            updated_at: new Date()
        })
    );
}

// ============================================================================
// TESTS
// ============================================================================

describe("Agent Templates Routes", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createTestServer();
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        resetAllMocks();
    });

    // ========================================================================
    // GET /agent-templates - List Agent Templates
    // ========================================================================

    describe("GET /agent-templates", () => {
        it("should return empty list when no templates exist", async () => {
            mockAgentTemplateRepo.findAll.mockResolvedValue({ templates: [], total: 0 });

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/agent-templates"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                items: AgentTemplateModel[];
                total: number;
                page: number;
                pageSize: number;
                hasMore: boolean;
            }>(response);
            expect(body.data.items).toEqual([]);
            expect(body.data.total).toBe(0);
            expect(body.data.hasMore).toBe(false);
        });

        it("should return list of agent templates", async () => {
            const templates = [
                createMockAgentTemplate({ name: "Support Agent" }),
                createMockAgentTemplate({ name: "Sales Agent" })
            ];
            mockAgentTemplateRepo.findAll.mockResolvedValue({ templates, total: 2 });

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/agent-templates"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ items: AgentTemplateModel[]; total: number }>(
                response
            );
            expect(body.data.items).toHaveLength(2);
            expect(body.data.total).toBe(2);
        });

        it("should filter by category", async () => {
            const templates = [createMockAgentTemplate({ category: "sales" })];
            mockAgentTemplateRepo.findAll.mockResolvedValue({ templates, total: 1 });

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/agent-templates?category=sales"
            });

            expectStatus(response, 200);
            expect(mockAgentTemplateRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ category: "sales" })
            );
        });

        it("should filter by tags", async () => {
            mockAgentTemplateRepo.findAll.mockResolvedValue({ templates: [], total: 0 });

            await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/agent-templates?tags=chatbot,ai"
            });

            expect(mockAgentTemplateRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ tags: ["chatbot", "ai"] })
            );
        });

        it("should filter by featured", async () => {
            mockAgentTemplateRepo.findAll.mockResolvedValue({ templates: [], total: 0 });

            await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/agent-templates?featured=true"
            });

            expect(mockAgentTemplateRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ featured: true })
            );
        });

        it("should filter by search term", async () => {
            mockAgentTemplateRepo.findAll.mockResolvedValue({ templates: [], total: 0 });

            await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/agent-templates?search=customer"
            });

            expect(mockAgentTemplateRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ search: "customer" })
            );
        });

        it("should support pagination", async () => {
            const templates = [createMockAgentTemplate()];
            mockAgentTemplateRepo.findAll.mockResolvedValue({ templates, total: 100 });

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/agent-templates?limit=25&offset=50"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                items: AgentTemplateModel[];
                page: number;
                pageSize: number;
                hasMore: boolean;
            }>(response);
            expect(body.data.page).toBe(3); // offset 50 / limit 25 + 1 = 3
            expect(body.data.pageSize).toBe(25);
            expect(body.data.hasMore).toBe(true);
            expect(mockAgentTemplateRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ limit: 25, offset: 50 })
            );
        });

        it("should return 400 for invalid category", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/agent-templates?category=invalid-category"
            });

            expectStatus(response, 400);
        });

        it("should return 400 for limit exceeding max", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/agent-templates?limit=500"
            });

            expectStatus(response, 400);
        });

        it("should return 400 for negative offset", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/agent-templates?offset=-1"
            });

            expectStatus(response, 400);
        });
    });

    // ========================================================================
    // GET /agent-templates/categories - List Categories
    // ========================================================================

    describe("GET /agent-templates/categories", () => {
        it("should return categories with counts", async () => {
            const categoryCounts: AgentTemplateCategoryCount[] = [
                { category: "support", count: 15 },
                { category: "sales", count: 8 }
            ];
            mockAgentTemplateRepo.getCategories.mockResolvedValue(categoryCounts);

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/agent-templates/categories"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<
                Array<{ category: string; count: number; name: string }>
            >(response);
            expect(body.data.length).toBeGreaterThan(0);

            // Check that existing categories have correct counts
            const support = body.data.find((c) => c.category === "support");
            expect(support?.count).toBe(15);
        });

        it("should include all agent categories with zero count when empty", async () => {
            mockAgentTemplateRepo.getCategories.mockResolvedValue([]);

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/agent-templates/categories"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<Array<{ category: string; count: number }>>(
                response
            );
            // Should have the 5 main agent categories
            const categories = body.data.map((c) => c.category);
            expect(categories).toContain("marketing");
            expect(categories).toContain("sales");
            expect(categories).toContain("operations");
            expect(categories).toContain("engineering");
            expect(categories).toContain("support");
        });

        it("should sort categories by count descending", async () => {
            const categoryCounts: AgentTemplateCategoryCount[] = [
                { category: "marketing", count: 5 },
                { category: "support", count: 20 },
                { category: "sales", count: 10 }
            ];
            mockAgentTemplateRepo.getCategories.mockResolvedValue(categoryCounts);

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/agent-templates/categories"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<Array<{ count: number }>>(response);
            // First category should have highest count
            expect(body.data[0].count).toBe(20);
        });
    });

    // ========================================================================
    // GET /agent-templates/:id - Get Agent Template
    // ========================================================================

    describe("GET /agent-templates/:id", () => {
        it("should return agent template by ID", async () => {
            const template = createMockAgentTemplate({ name: "Customer Support Agent" });
            mockAgentTemplateRepo.findById.mockResolvedValue(template);

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/agent-templates/${template.id}`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<AgentTemplateModel>(response);
            expect(body.data.name).toBe("Customer Support Agent");
            expect(body.data.system_prompt).toBeDefined();
            expect(body.data.model).toBe("gpt-4");
            expect(mockAgentTemplateRepo.findById).toHaveBeenCalledWith(template.id);
        });

        it("should include available tools in response", async () => {
            const template = createMockAgentTemplate({
                available_tools: [
                    { name: "search_kb", description: "Search knowledge base" },
                    { name: "create_ticket", description: "Create support ticket" }
                ]
            });
            mockAgentTemplateRepo.findById.mockResolvedValue(template);

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/agent-templates/${template.id}`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<AgentTemplateModel>(response);
            expect(body.data.available_tools).toHaveLength(2);
        });

        it("should increment view count on retrieval", async () => {
            const template = createMockAgentTemplate();
            mockAgentTemplateRepo.findById.mockResolvedValue(template);

            await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/agent-templates/${template.id}`
            });

            // View count increment is called in background
            expect(mockAgentTemplateRepo.incrementViewCount).toHaveBeenCalledWith(template.id);
        });

        it("should return 404 for non-existent template", async () => {
            mockAgentTemplateRepo.findById.mockResolvedValue(null);
            const nonExistentId = uuidv4();

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/agent-templates/${nonExistentId}`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 400 for invalid UUID", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/agent-templates/not-a-uuid"
            });

            expectStatus(response, 400);
        });
    });

    // ========================================================================
    // POST /agent-templates/:id/copy - Copy Template to Agent
    // ========================================================================

    describe("POST /agent-templates/:id/copy", () => {
        it("should copy template to new agent", async () => {
            const testUser = createTestUser();
            const template = createMockAgentTemplate({
                name: "Support Bot",
                description: "AI-powered support agent",
                system_prompt: "You are a helpful support agent.",
                model: "gpt-4",
                provider: "openai",
                temperature: 0.7,
                max_tokens: 4096
            });
            mockAgentTemplateRepo.findById.mockResolvedValue(template);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agent-templates/${template.id}/copy`,
                payload: {}
            });

            expectStatus(response, 201);
            const body = expectSuccessResponse<{ agentId: string }>(response);
            expect(body.data.agentId).toBeDefined();
            expect(mockAgentRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "Support Bot",
                    description: "AI-powered support agent",
                    system_prompt: "You are a helpful support agent.",
                    model: "gpt-4",
                    provider: "openai",
                    temperature: 0.7,
                    max_tokens: 4096,
                    user_id: testUser.id,
                    workspace_id: DEFAULT_TEST_WORKSPACE_ID
                })
            );
        });

        it("should use custom name when provided", async () => {
            const testUser = createTestUser();
            const template = createMockAgentTemplate({ name: "Original Agent" });
            mockAgentTemplateRepo.findById.mockResolvedValue(template);

            await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agent-templates/${template.id}/copy`,
                payload: { name: "My Custom Agent" }
            });

            expect(mockAgentRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "My Custom Agent"
                })
            );
        });

        it("should create agent with empty tools (user must connect their own)", async () => {
            const testUser = createTestUser();
            const template = createMockAgentTemplate({
                available_tools: [
                    { name: "search", description: "Search" },
                    { name: "email", description: "Send email" }
                ]
            });
            mockAgentTemplateRepo.findById.mockResolvedValue(template);

            await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agent-templates/${template.id}/copy`,
                payload: {}
            });

            // Agent should be created with empty tools
            expect(mockAgentRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    available_tools: []
                })
            );
        });

        it("should create agent with default memory config", async () => {
            const testUser = createTestUser();
            const template = createMockAgentTemplate();
            mockAgentTemplateRepo.findById.mockResolvedValue(template);

            await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agent-templates/${template.id}/copy`,
                payload: {}
            });

            expect(mockAgentRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    memory_config: { type: "buffer", max_messages: 20 }
                })
            );
        });

        it("should increment use count on copy", async () => {
            const testUser = createTestUser();
            const template = createMockAgentTemplate();
            mockAgentTemplateRepo.findById.mockResolvedValue(template);

            await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agent-templates/${template.id}/copy`,
                payload: {}
            });

            expect(mockAgentTemplateRepo.incrementUseCount).toHaveBeenCalledWith(template.id);
        });

        it("should return 404 for non-existent template", async () => {
            const testUser = createTestUser();
            mockAgentTemplateRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agent-templates/${uuidv4()}/copy`,
                payload: {}
            });

            expectErrorResponse(response, 404);
        });

        it("should return 401 without authentication", async () => {
            const template = createMockAgentTemplate();

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/agent-templates/${template.id}/copy`
            });

            expectErrorResponse(response, 401);
        });

        it("should return 400 for invalid template ID", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/agent-templates/not-a-uuid/copy"
            });

            expectStatus(response, 400);
        });

        it("should copy agent with all model settings", async () => {
            const testUser = createTestUser();
            const template = createMockAgentTemplate({
                model: "claude-3-opus",
                provider: "anthropic",
                temperature: 0.5,
                max_tokens: 8192
            });
            mockAgentTemplateRepo.findById.mockResolvedValue(template);

            await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agent-templates/${template.id}/copy`,
                payload: {}
            });

            expect(mockAgentRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: "claude-3-opus",
                    provider: "anthropic",
                    temperature: 0.5,
                    max_tokens: 8192
                })
            );
        });
    });

    // ========================================================================
    // Public Access
    // ========================================================================

    describe("Public Access", () => {
        it("GET /agent-templates should be accessible without auth", async () => {
            mockAgentTemplateRepo.findAll.mockResolvedValue({ templates: [], total: 0 });

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/agent-templates"
            });

            expectStatus(response, 200);
        });

        it("GET /agent-templates/categories should be accessible without auth", async () => {
            mockAgentTemplateRepo.getCategories.mockResolvedValue([]);

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/agent-templates/categories"
            });

            expectStatus(response, 200);
        });

        it("GET /agent-templates/:id should be accessible without auth", async () => {
            const template = createMockAgentTemplate();
            mockAgentTemplateRepo.findById.mockResolvedValue(template);

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/agent-templates/${template.id}`
            });

            expectStatus(response, 200);
        });
    });
});
