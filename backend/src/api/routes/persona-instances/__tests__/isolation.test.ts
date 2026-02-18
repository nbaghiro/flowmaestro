/**
 * Persona Instances Multi-tenant Isolation Tests
 *
 * Tests for multi-tenant isolation:
 * - Verifies users cannot access instances from other workspaces
 * - Verifies queries are properly scoped to current workspace
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
    DEFAULT_TEST_WORKSPACE_ID
} from "../../../../../__tests__/helpers/fastify-test-client";
import {
    mockPersonaInstanceRepo,
    mockPersonaDefinitionRepo,
    mockTemporalClient,
    mockEventBus,
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

describe("Persona Instance Multi-tenant Isolation", () => {
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
    // MULTI-TENANT ISOLATION
    // ========================================================================

    describe("Multi-tenant Isolation", () => {
        it("should not allow access to instances from other workspaces", async () => {
            const testUser = createTestUser();
            // findByIdAndWorkspaceId returns null because workspace doesn't match
            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/persona-instances/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });

        it("should only list instances for current workspace", async () => {
            const testUser = createTestUser();
            mockPersonaInstanceRepo.findByUserId.mockResolvedValue({
                instances: [],
                total: 0
            });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/persona-instances"
            });

            expect(mockPersonaInstanceRepo.findByUserId).toHaveBeenCalledWith(
                testUser.id,
                DEFAULT_TEST_WORKSPACE_ID,
                expect.any(Object)
            );
        });
    });
});
