/**
 * Persona Instances CRUD Routes Tests
 *
 * Tests for persona instance CRUD endpoints:
 * - POST /persona-instances (Create)
 * - GET /persona-instances (List)
 * - GET /persona-instances/:id (Get single)
 * - DELETE /persona-instances/:id (Delete)
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// Import mocks from test-utils
import {
    authenticatedRequest,
    closeTestServer,
    createTestServer,
    createTestUser,
    expectErrorResponse,
    expectStatus,
    expectSuccessResponse,
    unauthenticatedRequest,
    DEFAULT_TEST_WORKSPACE_ID
} from "../../../../../__tests__/helpers/fastify-test-client";
import {
    mockPersonaInstanceRepo,
    mockPersonaDefinitionRepo,
    mockPersonaConnectionRepo,
    mockConnectionRepo,
    mockTemporalClient,
    mockEventBus,
    createMockPersonaInstance,
    createMockPersonaDefinition,
    createMockConnection,
    resetAllMocks
} from "./helpers/test-utils";

// ============================================================================
// MOCK SETUP - Must be before imports that use the mocked modules
// ============================================================================

jest.mock("../../../../storage/repositories/PersonaInstanceRepository", () => ({
    PersonaInstanceRepository: jest.fn().mockImplementation(() => mockPersonaInstanceRepo)
}));

jest.mock("../../../../storage/repositories/PersonaDefinitionRepository", () => ({
    PersonaDefinitionRepository: jest.fn().mockImplementation(() => mockPersonaDefinitionRepo)
}));

jest.mock("../../../../storage/repositories/PersonaApprovalRequestRepository", () => ({
    PersonaApprovalRequestRepository: jest.fn().mockImplementation(() => ({
        findPendingByWorkspaceId: jest.fn(),
        countPendingByWorkspaceId: jest.fn(),
        findByInstanceId: jest.fn(),
        findById: jest.fn(),
        update: jest.fn()
    }))
}));

jest.mock("../../../../storage/repositories/PersonaInstanceConnectionRepository", () => ({
    PersonaInstanceConnectionRepository: jest
        .fn()
        .mockImplementation(() => mockPersonaConnectionRepo)
}));

jest.mock("../../../../storage/repositories/PersonaInstanceDeliverableRepository", () => ({
    PersonaInstanceDeliverableRepository: jest.fn().mockImplementation(() => ({
        getSummariesByInstanceId: jest.fn(),
        findById: jest.fn(),
        getContent: jest.fn(),
        delete: jest.fn()
    }))
}));

jest.mock("../../../../storage/repositories/PersonaTaskTemplateRepository", () => ({
    PersonaTaskTemplateRepository: jest.fn().mockImplementation(() => ({
        incrementUsageCount: jest.fn()
    }))
}));

jest.mock("../../../../storage/repositories/ConnectionRepository", () => ({
    ConnectionRepository: jest.fn().mockImplementation(() => mockConnectionRepo)
}));

jest.mock("../../../../storage/repositories/ThreadRepository", () => ({
    ThreadRepository: jest.fn().mockImplementation(() => ({
        create: jest.fn().mockImplementation((data) => Promise.resolve({ id: uuidv4(), ...data }))
    }))
}));

jest.mock("../../../../storage/repositories/AgentExecutionRepository", () => ({
    AgentExecutionRepository: jest.fn().mockImplementation(() => ({
        create: jest.fn().mockImplementation((data) => Promise.resolve({ id: uuidv4(), ...data }))
    }))
}));

jest.mock("../../../../storage/repositories/PersonaInstanceMessageRepository", () => ({
    PersonaInstanceMessageRepository: jest.fn().mockImplementation(() => ({
        create: jest.fn()
    }))
}));

jest.mock("../../../../temporal/client", () => ({
    getTemporalClient: jest.fn().mockResolvedValue(mockTemporalClient),
    closeTemporalConnection: jest.fn().mockResolvedValue(undefined)
}));

jest.mock("../../../../temporal/workflows/persona-orchestrator", () => ({
    userMessageSignal: "userMessage",
    approvalResponseSignal: "approvalResponse",
    cancelSignal: "cancel",
    skipClarificationSignal: "skipClarification"
}));

jest.mock("../../../../services/events/RedisEventBus", () => ({
    redisEventBus: mockEventBus,
    RedisEventBus: jest.fn().mockImplementation(() => mockEventBus)
}));

// Import test helpers after mocks

// ============================================================================
// TESTS
// ============================================================================

describe("Persona Instance CRUD Routes", () => {
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
    // CREATE PERSONA INSTANCE
    // ========================================================================

    describe("POST /persona-instances", () => {
        it("should create a persona instance", async () => {
            const testUser = createTestUser();
            const persona = createMockPersonaDefinition({ slug: "research-assistant" });

            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(persona);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/persona-instances",
                payload: {
                    persona_slug: "research-assistant",
                    task_description: "Research AI market trends"
                }
            });

            expectStatus(response, 201);
            const body = expectSuccessResponse<{ id: string; status: string }>(response);
            expect(body.data.status).toBe("initializing");
            expect(mockTemporalClient.workflow.start).toHaveBeenCalled();
        });

        it("should create instance with optional parameters", async () => {
            const testUser = createTestUser();
            const persona = createMockPersonaDefinition({ slug: "research-assistant" });

            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(persona);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/persona-instances",
                payload: {
                    persona_slug: "research-assistant",
                    task_description: "Research AI market trends",
                    task_title: "AI Research",
                    max_duration_hours: 2,
                    max_cost_credits: 50,
                    skip_clarification: true
                }
            });

            expectStatus(response, 201);
        });

        it("should grant connections when provided", async () => {
            const testUser = createTestUser();
            const persona = createMockPersonaDefinition({ slug: "research-assistant" });
            const connection = createMockConnection();

            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(persona);
            mockConnectionRepo.findByIdAndWorkspaceId.mockResolvedValue(connection);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/persona-instances",
                payload: {
                    persona_slug: "research-assistant",
                    task_description: "Research AI market trends",
                    connections: [{ connection_id: connection.id, scopes: ["read"] }]
                }
            });

            expectStatus(response, 201);
            expect(mockPersonaConnectionRepo.create).toHaveBeenCalled();
        });

        it("should return 404 when persona not found", async () => {
            const testUser = createTestUser();
            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/persona-instances",
                payload: {
                    persona_slug: "non-existent",
                    task_description: "Test"
                }
            });

            expectErrorResponse(response, 404);
        });

        it("should return 400 for missing required fields", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/persona-instances",
                payload: {
                    // Missing persona_slug and task_description
                }
            });

            expectStatus(response, 400);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/persona-instances",
                payload: {
                    persona_slug: "research-assistant",
                    task_description: "Test"
                }
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // LIST PERSONA INSTANCES
    // ========================================================================

    describe("GET /persona-instances", () => {
        it("should list instances for workspace", async () => {
            const testUser = createTestUser();
            const instances = [
                createMockPersonaInstance({ status: "running" }),
                createMockPersonaInstance({ status: "completed" })
            ];

            mockPersonaInstanceRepo.findByUserId.mockResolvedValue({
                instances,
                total: 2
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/persona-instances"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ instances: object[]; total: number }>(response);
            expect(body.data.instances).toHaveLength(2);
            expect(body.data.total).toBe(2);
        });

        it("should filter by status", async () => {
            const testUser = createTestUser();
            mockPersonaInstanceRepo.findByUserId.mockResolvedValue({
                instances: [],
                total: 0
            });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/persona-instances",
                query: { status: "running,waiting_approval" }
            });

            expect(mockPersonaInstanceRepo.findByUserId).toHaveBeenCalledWith(
                testUser.id,
                DEFAULT_TEST_WORKSPACE_ID,
                expect.objectContaining({
                    status: expect.arrayContaining(["running", "waiting_approval"])
                })
            );
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/persona-instances"
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // GET PERSONA INSTANCE
    // ========================================================================

    describe("GET /persona-instances/:id", () => {
        it("should return instance by id", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                user_id: testUser.id,
                status: "running"
            });
            const persona = createMockPersonaDefinition();

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaDefinitionRepo.findById.mockResolvedValue(persona);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/persona-instances/${instanceId}`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ id: string; status: string }>(response);
            expect(body.data.id).toBe(instanceId);
            expect(body.data.status).toBe("running");
        });

        it("should return 404 when not found", async () => {
            const testUser = createTestUser();
            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/persona-instances/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });
    });

    // ========================================================================
    // DELETE PERSONA INSTANCE
    // ========================================================================

    describe("DELETE /persona-instances/:id", () => {
        it("should delete a pending instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                status: "pending"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaInstanceRepo.delete.mockResolvedValue(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/persona-instances/${instanceId}`
            });

            expectStatus(response, 204);
            expect(mockPersonaInstanceRepo.delete).toHaveBeenCalledWith(instanceId);
        });

        it("should return 400 for running instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                status: "running"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/persona-instances/${instanceId}`
            });

            expectStatus(response, 400);
        });

        it("should return 404 when not found", async () => {
            const testUser = createTestUser();
            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/persona-instances/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });
    });
});
