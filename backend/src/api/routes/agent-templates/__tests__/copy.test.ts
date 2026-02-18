/**
 * Agent Templates Copy Route Tests
 *
 * Tests for copying templates to agents and public access.
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
import {
    mockAgentTemplateRepo,
    mockAgentRepo,
    createMockAgentTemplate,
    resetAllMocks
} from "./helpers/test-utils";

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

describe("Agent Templates - Copy Routes", () => {
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
                    { name: "search", description: "Search", type: "knowledge_base" as const },
                    { name: "email", description: "Send email", type: "function" as const }
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
                    memory_config: { max_messages: 20 }
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
