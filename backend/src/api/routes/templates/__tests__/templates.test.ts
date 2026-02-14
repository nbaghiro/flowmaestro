/**
 * Templates Route Tests
 *
 * Tests for workflow template listing, retrieval, and copying.
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
import type { TemplateModel, CategoryCount } from "../../../../storage/models/Template";

// ============================================================================
// MOCKS
// ============================================================================

// Mock template repository
const mockTemplateRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    getCategories: jest.fn(),
    incrementViewCount: jest.fn(),
    incrementUseCount: jest.fn()
};

// Mock workflow repository for copy operation
const mockWorkflowRepo = {
    create: jest.fn()
};

jest.mock("../../../../storage/repositories", () => ({
    TemplateRepository: jest.fn().mockImplementation(() => mockTemplateRepo),
    WorkflowRepository: jest.fn().mockImplementation(() => mockWorkflowRepo),
    UserRepository: jest.fn().mockImplementation(() => ({
        findById: jest.fn(),
        findByEmail: jest.fn()
    }))
}));

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockTemplate(overrides: Partial<TemplateModel> = {}): TemplateModel {
    return {
        id: uuidv4(),
        name: "Test Template",
        description: "A test template for workflow automation",
        definition: {
            name: "Test Workflow",
            nodes: {
                "input-1": { type: "input", name: "Input", config: {}, position: { x: 0, y: 0 } }
            },
            edges: [],
            entryPoint: "input-1"
        },
        category: "marketing",
        tags: ["automation", "email"],
        icon: "mail",
        color: "#3B82F6",
        preview_image_url: null,
        author_name: "FlowMaestro",
        author_avatar_url: null,
        view_count: 100,
        use_count: 50,
        featured: false,
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
    mockTemplateRepo.findAll.mockResolvedValue({ templates: [], total: 0 });
    mockTemplateRepo.findById.mockResolvedValue(null);
    mockTemplateRepo.getCategories.mockResolvedValue([]);
    mockTemplateRepo.incrementViewCount.mockResolvedValue(undefined);
    mockTemplateRepo.incrementUseCount.mockResolvedValue(undefined);

    mockWorkflowRepo.create.mockImplementation((data) =>
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

describe("Templates Routes", () => {
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
    // GET /templates - List Templates
    // ========================================================================

    describe("GET /templates", () => {
        it("should return empty list when no templates exist", async () => {
            mockTemplateRepo.findAll.mockResolvedValue({ templates: [], total: 0 });

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/templates"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                items: TemplateModel[];
                total: number;
                page: number;
                pageSize: number;
                hasMore: boolean;
            }>(response);
            expect(body.data.items).toEqual([]);
            expect(body.data.total).toBe(0);
            expect(body.data.hasMore).toBe(false);
        });

        it("should return list of templates", async () => {
            const templates = [
                createMockTemplate({ name: "Template 1" }),
                createMockTemplate({ name: "Template 2" })
            ];
            mockTemplateRepo.findAll.mockResolvedValue({ templates, total: 2 });

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/templates"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ items: TemplateModel[]; total: number }>(response);
            expect(body.data.items).toHaveLength(2);
            expect(body.data.total).toBe(2);
        });

        it("should filter by category", async () => {
            const templates = [createMockTemplate({ category: "marketing" })];
            mockTemplateRepo.findAll.mockResolvedValue({ templates, total: 1 });

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/templates?category=marketing"
            });

            expectStatus(response, 200);
            expect(mockTemplateRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ category: "marketing" })
            );
        });

        it("should filter by tags", async () => {
            mockTemplateRepo.findAll.mockResolvedValue({ templates: [], total: 0 });

            await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/templates?tags=automation,email"
            });

            expect(mockTemplateRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ tags: ["automation", "email"] })
            );
        });

        it("should filter by featured", async () => {
            mockTemplateRepo.findAll.mockResolvedValue({ templates: [], total: 0 });

            await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/templates?featured=true"
            });

            expect(mockTemplateRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ featured: true })
            );
        });

        it("should filter by search term", async () => {
            mockTemplateRepo.findAll.mockResolvedValue({ templates: [], total: 0 });

            await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/templates?search=invoice"
            });

            expect(mockTemplateRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ search: "invoice" })
            );
        });

        it("should support pagination", async () => {
            const templates = [createMockTemplate()];
            mockTemplateRepo.findAll.mockResolvedValue({ templates, total: 50 });

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/templates?limit=10&offset=20"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                items: TemplateModel[];
                page: number;
                pageSize: number;
                hasMore: boolean;
            }>(response);
            expect(body.data.page).toBe(3); // offset 20 / limit 10 + 1 = 3
            expect(body.data.pageSize).toBe(10);
            expect(body.data.hasMore).toBe(true);
            expect(mockTemplateRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ limit: 10, offset: 20 })
            );
        });

        it("should support sorting", async () => {
            mockTemplateRepo.findAll.mockResolvedValue({ templates: [], total: 0 });

            await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/templates?sortBy=popularity"
            });

            expect(mockTemplateRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ sortBy: "popularity" })
            );
        });

        it("should return 400 for invalid category", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/templates?category=invalid-category"
            });

            expectStatus(response, 400);
        });

        it("should return 400 for limit exceeding max", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/templates?limit=500"
            });

            expectStatus(response, 400);
        });
    });

    // ========================================================================
    // GET /templates/categories - List Categories
    // ========================================================================

    describe("GET /templates/categories", () => {
        it("should return categories with counts", async () => {
            const categoryCounts: CategoryCount[] = [
                { category: "marketing", count: 10 },
                { category: "sales", count: 5 }
            ];
            mockTemplateRepo.getCategories.mockResolvedValue(categoryCounts);

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/templates/categories"
            });

            expectStatus(response, 200);
            const body =
                expectSuccessResponse<Array<{ category: string; count: number; name: string }>>(
                    response
                );
            expect(body.data.length).toBeGreaterThan(0);

            // Check that existing categories have correct counts
            const marketing = body.data.find((c) => c.category === "marketing");
            expect(marketing?.count).toBe(10);
        });

        it("should include categories with zero count", async () => {
            mockTemplateRepo.getCategories.mockResolvedValue([]);

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/templates/categories"
            });

            expectStatus(response, 200);
            const body =
                expectSuccessResponse<Array<{ category: string; count: number }>>(response);
            // Should have all categories from TEMPLATE_CATEGORY_META
            expect(body.data.length).toBeGreaterThan(0);
            expect(body.data.every((c) => c.count === 0)).toBe(true);
        });

        it("should sort categories by count descending", async () => {
            const categoryCounts: CategoryCount[] = [
                { category: "marketing", count: 5 },
                { category: "sales", count: 10 },
                { category: "operations", count: 3 }
            ];
            mockTemplateRepo.getCategories.mockResolvedValue(categoryCounts);

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/templates/categories"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<Array<{ count: number }>>(response);
            // First category should have highest count
            expect(body.data[0].count).toBe(10);
        });
    });

    // ========================================================================
    // GET /templates/:id - Get Template
    // ========================================================================

    describe("GET /templates/:id", () => {
        it("should return template by ID", async () => {
            const template = createMockTemplate({ name: "Invoice Processing" });
            mockTemplateRepo.findById.mockResolvedValue(template);

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/templates/${template.id}`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<TemplateModel>(response);
            expect(body.data.name).toBe("Invoice Processing");
            expect(mockTemplateRepo.findById).toHaveBeenCalledWith(template.id);
        });

        it("should increment view count on retrieval", async () => {
            const template = createMockTemplate();
            mockTemplateRepo.findById.mockResolvedValue(template);

            await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/templates/${template.id}`
            });

            // View count increment is called in background
            expect(mockTemplateRepo.incrementViewCount).toHaveBeenCalledWith(template.id);
        });

        it("should return 404 for non-existent template", async () => {
            mockTemplateRepo.findById.mockResolvedValue(null);
            const nonExistentId = uuidv4();

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/templates/${nonExistentId}`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 400 for invalid UUID", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/templates/not-a-uuid"
            });

            expectStatus(response, 400);
        });
    });

    // ========================================================================
    // POST /templates/:id/copy - Copy Template to Workflow
    // ========================================================================

    describe("POST /templates/:id/copy", () => {
        it("should copy template to new workflow", async () => {
            const testUser = createTestUser();
            const template = createMockTemplate({
                name: "Email Automation",
                description: "Automate email workflows"
            });
            mockTemplateRepo.findById.mockResolvedValue(template);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/templates/${template.id}/copy`,
                payload: {}
            });

            expectStatus(response, 201);
            const body = expectSuccessResponse<{ workflowId: string }>(response);
            expect(body.data.workflowId).toBeDefined();
            expect(mockWorkflowRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "Email Automation",
                    description: "Automate email workflows",
                    user_id: testUser.id,
                    workspace_id: DEFAULT_TEST_WORKSPACE_ID,
                    ai_generated: false
                })
            );
        });

        it("should use custom name when provided", async () => {
            const testUser = createTestUser();
            const template = createMockTemplate({ name: "Original Name" });
            mockTemplateRepo.findById.mockResolvedValue(template);

            await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/templates/${template.id}/copy`,
                payload: { name: "My Custom Workflow" }
            });

            expect(mockWorkflowRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "My Custom Workflow"
                })
            );
        });

        it("should increment use count on copy", async () => {
            const testUser = createTestUser();
            const template = createMockTemplate();
            mockTemplateRepo.findById.mockResolvedValue(template);

            await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/templates/${template.id}/copy`,
                payload: {}
            });

            expect(mockTemplateRepo.incrementUseCount).toHaveBeenCalledWith(template.id);
        });

        it("should convert template nodes to workflow format", async () => {
            const testUser = createTestUser();
            const template = createMockTemplate({
                definition: {
                    name: "Test",
                    nodes: {
                        "node-1": {
                            type: "llm",
                            name: "Generate Text",
                            config: { provider: "openai", model: "gpt-4" },
                            position: { x: 100, y: 100 }
                        }
                    },
                    edges: [],
                    entryPoint: "node-1"
                }
            });
            mockTemplateRepo.findById.mockResolvedValue(template);

            await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/templates/${template.id}/copy`,
                payload: {}
            });

            expect(mockWorkflowRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    definition: expect.objectContaining({
                        nodes: {
                            "node-1": expect.objectContaining({
                                type: "llm",
                                position: { x: 100, y: 100 },
                                name: "Generate Text",
                                config: expect.objectContaining({
                                    provider: "openai",
                                    model: "gpt-4"
                                })
                            })
                        }
                    })
                })
            );
        });

        it("should return 404 for non-existent template", async () => {
            const testUser = createTestUser();
            mockTemplateRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/templates/${uuidv4()}/copy`,
                payload: {}
            });

            expectErrorResponse(response, 404);
        });

        it("should return 401 without authentication", async () => {
            const template = createMockTemplate();

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/templates/${template.id}/copy`
            });

            expectErrorResponse(response, 401);
        });

        it("should return 400 for invalid template ID", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/templates/not-a-uuid/copy"
            });

            expectStatus(response, 400);
        });
    });

    // ========================================================================
    // Public Access
    // ========================================================================

    describe("Public Access", () => {
        it("GET /templates should be accessible without auth", async () => {
            mockTemplateRepo.findAll.mockResolvedValue({ templates: [], total: 0 });

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/templates"
            });

            expectStatus(response, 200);
        });

        it("GET /templates/categories should be accessible without auth", async () => {
            mockTemplateRepo.getCategories.mockResolvedValue([]);

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/templates/categories"
            });

            expectStatus(response, 200);
        });

        it("GET /templates/:id should be accessible without auth", async () => {
            const template = createMockTemplate();
            mockTemplateRepo.findById.mockResolvedValue(template);

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/templates/${template.id}`
            });

            expectStatus(response, 200);
        });
    });
});
