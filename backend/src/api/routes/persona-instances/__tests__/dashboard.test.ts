/**
 * Persona Instances Dashboard Routes Tests
 *
 * Tests for persona instance dashboard endpoints:
 * - GET /persona-instances/dashboard
 * - GET /persona-instances/count
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
    mockTemporalClient,
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

describe("Persona Instance Dashboard Routes", () => {
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
    // DASHBOARD
    // ========================================================================

    describe("GET /persona-instances/dashboard", () => {
        it("should return dashboard data", async () => {
            const testUser = createTestUser();
            mockPersonaInstanceRepo.getDashboard.mockResolvedValue({
                needs_attention: 2,
                running: 3,
                recent_completed: [createMockPersonaInstance({ status: "completed" })]
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/persona-instances/dashboard"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                needs_attention: number;
                running: number;
                recent_completed: object[];
            }>(response);
            expect(body.data.needs_attention).toBe(2);
            expect(body.data.running).toBe(3);
        });
    });

    // ========================================================================
    // COUNT
    // ========================================================================

    describe("GET /persona-instances/count", () => {
        it("should return instance count", async () => {
            const testUser = createTestUser();
            mockPersonaInstanceRepo.countNeedsAttention.mockResolvedValue(5);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/persona-instances/count"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ count: number }>(response);
            expect(body.data.count).toBe(5);
        });
    });
});
