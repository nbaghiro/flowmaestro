/**
 * Persona Instances Approvals, Connections, and Deliverables Routes Tests
 *
 * Tests for persona instance approval, connection, and deliverable endpoints:
 * - GET /persona-instances/approvals
 * - GET /persona-instances/approvals/count
 * - GET /persona-instances/:id/approvals
 * - POST /persona-instances/:id/approvals/:approvalId/approve
 * - POST /persona-instances/:id/approvals/:approvalId/deny
 * - GET /persona-instances/:id/connections
 * - POST /persona-instances/:id/connections
 * - DELETE /persona-instances/:id/connections/:connectionId
 * - GET /persona-instances/:id/deliverables
 * - GET /persona-instances/:id/deliverables/:deliverableId
 * - DELETE /persona-instances/:id/deliverables/:deliverableId
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
    expectSuccessResponse
} from "../../../../../__tests__/helpers/fastify-test-client";
import {
    mockPersonaInstanceRepo,
    mockPersonaDefinitionRepo,
    mockPersonaApprovalRepo,
    mockPersonaConnectionRepo,
    mockPersonaDeliverableRepo,
    mockConnectionRepo,
    mockTemporalClient,
    mockEventBus,
    createMockPersonaInstance,
    createMockApprovalRequest,
    createMockDeliverable,
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
    PersonaApprovalRequestRepository: jest.fn().mockImplementation(() => mockPersonaApprovalRepo)
}));

jest.mock("../../../../storage/repositories/PersonaInstanceConnectionRepository", () => ({
    PersonaInstanceConnectionRepository: jest
        .fn()
        .mockImplementation(() => mockPersonaConnectionRepo)
}));

jest.mock("../../../../storage/repositories/PersonaInstanceDeliverableRepository", () => ({
    PersonaInstanceDeliverableRepository: jest
        .fn()
        .mockImplementation(() => mockPersonaDeliverableRepo)
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

describe("Persona Instance Approvals, Connections, and Deliverables Routes", () => {
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
    // APPROVALS - WORKSPACE LEVEL
    // ========================================================================

    describe("GET /persona-instances/approvals", () => {
        it("should list pending approvals for workspace", async () => {
            const testUser = createTestUser();
            const approvals = [createMockApprovalRequest({ status: "pending" })];

            mockPersonaApprovalRepo.findPendingByWorkspaceId.mockResolvedValue(approvals);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/persona-instances/approvals"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ approvals: object[] }>(response);
            expect(body.data.approvals).toHaveLength(1);
        });
    });

    describe("GET /persona-instances/approvals/count", () => {
        it("should return pending approval count", async () => {
            const testUser = createTestUser();
            mockPersonaApprovalRepo.countPendingByWorkspaceId.mockResolvedValue(3);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/persona-instances/approvals/count"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ count: number }>(response);
            expect(body.data.count).toBe(3);
        });
    });

    // ========================================================================
    // APPROVALS - INSTANCE LEVEL
    // ========================================================================

    describe("GET /persona-instances/:id/approvals", () => {
        it("should list approvals for instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId });
            const approvals = [
                createMockApprovalRequest({ instance_id: instanceId, status: "approved" }),
                createMockApprovalRequest({ instance_id: instanceId, status: "pending" })
            ];

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaApprovalRepo.findByInstanceId.mockResolvedValue(approvals);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/persona-instances/${instanceId}/approvals`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ approvals: object[] }>(response);
            expect(body.data.approvals).toHaveLength(2);
        });
    });

    describe("POST /persona-instances/:id/approvals/:approvalId/approve", () => {
        it("should approve a pending approval", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const approvalId = uuidv4();
            const executionId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                execution_id: executionId,
                status: "waiting_approval"
            });
            const approval = createMockApprovalRequest({
                id: approvalId,
                instance_id: instanceId,
                status: "pending"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaApprovalRepo.findById.mockResolvedValue(approval);
            mockPersonaApprovalRepo.update.mockResolvedValue({ ...approval, status: "approved" });
            mockPersonaInstanceRepo.update.mockResolvedValue({ ...instance, status: "running" });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/approvals/${approvalId}/approve`
            });

            expectStatus(response, 200);
            expect(mockPersonaApprovalRepo.update).toHaveBeenCalledWith(
                approvalId,
                expect.objectContaining({ status: "approved" })
            );
        });

        it("should return 400 for already responded approval", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const approvalId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId });
            const approval = createMockApprovalRequest({
                id: approvalId,
                instance_id: instanceId,
                status: "approved" // Already approved
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaApprovalRepo.findById.mockResolvedValue(approval);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/approvals/${approvalId}/approve`
            });

            expectStatus(response, 400);
        });
    });

    describe("POST /persona-instances/:id/approvals/:approvalId/deny", () => {
        it("should deny a pending approval", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const approvalId = uuidv4();
            const executionId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                execution_id: executionId,
                status: "waiting_approval"
            });
            const approval = createMockApprovalRequest({
                id: approvalId,
                instance_id: instanceId,
                status: "pending"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaApprovalRepo.findById.mockResolvedValue(approval);
            mockPersonaApprovalRepo.update.mockResolvedValue({ ...approval, status: "denied" });
            mockPersonaInstanceRepo.update.mockResolvedValue({ ...instance, status: "running" });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/approvals/${approvalId}/deny`,
                payload: { note: "Too risky" }
            });

            expectStatus(response, 200);
            expect(mockPersonaApprovalRepo.update).toHaveBeenCalledWith(
                approvalId,
                expect.objectContaining({ status: "denied" })
            );
        });
    });

    // ========================================================================
    // CONNECTION MANAGEMENT
    // ========================================================================

    describe("GET /persona-instances/:id/connections", () => {
        it("should list connections for instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId });
            const connections = [
                {
                    id: uuidv4(),
                    instance_id: instanceId,
                    connection_id: uuidv4(),
                    granted_scopes: ["read"],
                    connection: {
                        id: uuidv4(),
                        name: "My Slack",
                        provider: "slack",
                        connection_method: "oauth2"
                    },
                    created_at: new Date()
                }
            ];

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaConnectionRepo.findByInstanceIdWithDetails.mockResolvedValue(connections);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/persona-instances/${instanceId}/connections`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<object[]>(response);
            expect(body.data).toHaveLength(1);
        });
    });

    describe("POST /persona-instances/:id/connections", () => {
        it("should grant connection to instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const connectionId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId });
            const connection = createMockConnection({ id: connectionId });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockConnectionRepo.findByIdAndWorkspaceId.mockResolvedValue(connection);
            mockPersonaConnectionRepo.create.mockResolvedValue({
                id: uuidv4(),
                instance_id: instanceId,
                connection_id: connectionId,
                granted_scopes: ["read"]
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/connections`,
                payload: { connection_id: connectionId, scopes: ["read"] }
            });

            expectStatus(response, 201);
        });

        it("should return 404 when connection not found", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockConnectionRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/connections`,
                payload: { connection_id: uuidv4() }
            });

            expectErrorResponse(response, 404);
        });
    });

    describe("DELETE /persona-instances/:id/connections/:connectionId", () => {
        it("should revoke connection from instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const connectionId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaConnectionRepo.delete.mockResolvedValue(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/persona-instances/${instanceId}/connections/${connectionId}`
            });

            expectStatus(response, 200);
        });
    });

    // ========================================================================
    // DELIVERABLES
    // ========================================================================

    describe("GET /persona-instances/:id/deliverables", () => {
        it("should list deliverables for instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId, user_id: testUser.id });
            const deliverables = [
                { id: uuidv4(), name: "Report", type: "markdown", preview: "# Report" }
            ];

            mockPersonaInstanceRepo.findById.mockResolvedValue(instance);
            mockPersonaDeliverableRepo.getSummariesByInstanceId.mockResolvedValue(deliverables);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/persona-instances/${instanceId}/deliverables`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<object[]>(response);
            expect(body.data).toHaveLength(1);
        });
    });

    describe("GET /persona-instances/:id/deliverables/:deliverableId", () => {
        it("should return full deliverable", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const deliverableId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId, user_id: testUser.id });
            const deliverable = createMockDeliverable({
                id: deliverableId,
                instance_id: instanceId
            });

            mockPersonaInstanceRepo.findById.mockResolvedValue(instance);
            mockPersonaDeliverableRepo.findById.mockResolvedValue(deliverable);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/persona-instances/${instanceId}/deliverables/${deliverableId}`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ id: string; content: string }>(response);
            expect(body.data.id).toBe(deliverableId);
        });

        it("should return 404 when deliverable not found", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId, user_id: testUser.id });

            mockPersonaInstanceRepo.findById.mockResolvedValue(instance);
            mockPersonaDeliverableRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/persona-instances/${instanceId}/deliverables/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });
    });

    describe("DELETE /persona-instances/:id/deliverables/:deliverableId", () => {
        it("should delete deliverable", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const deliverableId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId, user_id: testUser.id });
            // Create deliverable fixture for reference (used in mock setup)
            createMockDeliverable({
                id: deliverableId,
                instance_id: instanceId
            });

            mockPersonaInstanceRepo.findById.mockResolvedValue(instance);
            mockPersonaDeliverableRepo.delete.mockResolvedValue(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/persona-instances/${instanceId}/deliverables/${deliverableId}`
            });

            expectStatus(response, 200);
            expect(mockPersonaDeliverableRepo.delete).toHaveBeenCalledWith(deliverableId);
        });
    });
});
