/**
 * Agent Templates List Route Tests
 *
 * Tests for listing agent templates with filters and pagination.
 */

import { FastifyInstance } from "fastify";
import {
    createTestServer,
    closeTestServer,
    unauthenticatedRequest,
    expectStatus,
    expectSuccessResponse
} from "../../../../../__tests__/helpers/fastify-test-client";
import {
    mockAgentTemplateRepo,
    mockAgentRepo,
    createMockAgentTemplate,
    resetAllMocks
} from "./helpers/test-utils";
import type { AgentTemplateModel } from "../../../../storage/models/AgentTemplate";

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

describe("Agent Templates - List Routes", () => {
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
});
