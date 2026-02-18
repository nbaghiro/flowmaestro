/**
 * Persona Instances Action Routes Tests
 *
 * Tests for persona instance action endpoints:
 * - POST /persona-instances/:id/message
 * - POST /persona-instances/:id/cancel
 * - POST /persona-instances/:id/skip-clarification
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// Import mocks from test-utils
import {
    authenticatedRequest,
    closeTestServer,
    createTestServer,
    createTestUser,
    expectStatus,
    expectSuccessResponse
} from "../../../../../__tests__/helpers/fastify-test-client";
import {
    mockPersonaInstanceRepo,
    mockPersonaDefinitionRepo,
    mockPersonaInstanceMessageRepo,
    mockTemporalClient,
    mockTemporalHandle,
    mockEventBus,
    createMockPersonaInstance,
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
    PersonaInstanceConnectionRepository: jest.fn().mockImplementation(() => ({
        findByInstanceIdWithDetails: jest.fn(),
        create: jest.fn(),
        delete: jest.fn()
    }))
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
    ConnectionRepository: jest.fn().mockImplementation(() => ({
        findByIdAndWorkspaceId: jest.fn()
    }))
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
    PersonaInstanceMessageRepository: jest
        .fn()
        .mockImplementation(() => mockPersonaInstanceMessageRepo)
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

describe("Persona Instance Action Routes", () => {
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
    // SEND MESSAGE
    // ========================================================================

    describe("POST /persona-instances/:id/message", () => {
        it("should send message to running instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const executionId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                execution_id: executionId,
                status: "clarifying"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaInstanceMessageRepo.create.mockResolvedValue({ id: uuidv4() });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/message`,
                payload: { content: "Here is more context" }
            });

            expectStatus(response, 200);
            expect(mockTemporalHandle.signal).toHaveBeenCalled();
        });

        it("should return 400 for completed instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                status: "completed"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/message`,
                payload: { content: "Test" }
            });

            expectStatus(response, 400);
        });

        it("should return 400 for empty message", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/message`,
                payload: { content: "" }
            });

            expectStatus(response, 400);
        });
    });

    // ========================================================================
    // CANCEL INSTANCE
    // ========================================================================

    describe("POST /persona-instances/:id/cancel", () => {
        it("should cancel a running instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const executionId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                execution_id: executionId,
                status: "running"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaInstanceRepo.updateStatus.mockResolvedValue({
                ...instance,
                status: "cancelled"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/cancel`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ status: string }>(response);
            expect(body.data.status).toBe("cancelled");
        });

        it("should return 400 for completed instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                status: "completed"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/cancel`
            });

            expectStatus(response, 400);
        });
    });

    // ========================================================================
    // SKIP CLARIFICATION
    // ========================================================================

    describe("POST /persona-instances/:id/skip-clarification", () => {
        it("should skip clarification phase", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const executionId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                execution_id: executionId,
                status: "clarifying"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaInstanceRepo.skipClarification.mockResolvedValue({
                ...instance,
                status: "running",
                clarification_skipped: true
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/skip-clarification`
            });

            expectStatus(response, 200);
            expect(mockTemporalHandle.signal).toHaveBeenCalled();
        });

        it("should return 400 when not in clarifying status", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                status: "running"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/skip-clarification`
            });

            expectStatus(response, 400);
        });
    });
});
