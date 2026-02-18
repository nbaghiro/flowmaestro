/**
 * Agent Templates Retrieval Route Tests
 *
 * Tests for getting single templates and listing categories.
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
    createTestServer,
    closeTestServer,
    unauthenticatedRequest,
    expectStatus,
    expectSuccessResponse,
    expectErrorResponse
} from "../../../../../__tests__/helpers/fastify-test-client";
import {
    mockAgentTemplateRepo,
    mockAgentRepo,
    createMockAgentTemplate,
    resetAllMocks
} from "./helpers/test-utils";
import type {
    AgentTemplateModel,
    AgentTemplateCategoryCount
} from "../../../../storage/models/AgentTemplate";

// ============================================================================
// MOCKS
// ============================================================================

jest.mock("../../../../storage/repositories", () => ({
    AgentTemplateRepository: jest.fn().mockImplementation(() => mockAgentTemplateRepo),
    AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo),
    UserRepository: jest.fn().mockImplementation(() => ({
        findById: jest.fn(),
        findByEmail: jest.fn()
    }))
}));

// ============================================================================
// TESTS
// ============================================================================

describe("Agent Templates - Retrieval Routes", () => {
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
            const body =
                expectSuccessResponse<Array<{ category: string; count: number; name: string }>>(
                    response
                );
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
            const body =
                expectSuccessResponse<Array<{ category: string; count: number }>>(response);
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
                    {
                        name: "search_kb",
                        description: "Search knowledge base",
                        type: "knowledge_base" as const
                    },
                    {
                        name: "create_ticket",
                        description: "Create support ticket",
                        type: "function" as const
                    }
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
});
