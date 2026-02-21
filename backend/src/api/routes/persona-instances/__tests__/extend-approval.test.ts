/**
 * Extend Approval Expiration Endpoint Tests
 *
 * Tests for POST /persona-instances/:id/approvals/:approvalId/extend
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

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
    mockPersonaApprovalRepo,
    createMockPersonaInstance,
    createMockApprovalRequest,
    resetAllMocks
} from "./helpers/test-utils";

// ============================================================================
// MOCK SETUP
// ============================================================================

jest.mock("../../../../storage/repositories/PersonaInstanceRepository", () => ({
    PersonaInstanceRepository: jest.fn().mockImplementation(() => mockPersonaInstanceRepo)
}));

jest.mock("../../../../storage/repositories/PersonaApprovalRequestRepository", () => ({
    PersonaApprovalRequestRepository: jest.fn().mockImplementation(() => mockPersonaApprovalRepo)
}));

// ============================================================================
// TESTS
// ============================================================================

describe("Extend Approval Expiration", () => {
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

    describe("POST /persona-instances/:id/approvals/:approvalId/extend", () => {
        it("should extend approval expiration by default 24 hours", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const approvalId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId });
            const currentExpiration = new Date();
            const approval = createMockApprovalRequest({
                id: approvalId,
                instance_id: instanceId,
                status: "pending",
                expires_at: currentExpiration
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaApprovalRepo.findById.mockResolvedValue(approval);
            mockPersonaApprovalRepo.extendExpiration.mockResolvedValue({
                ...approval,
                expires_at: new Date(currentExpiration.getTime() + 24 * 60 * 60 * 1000)
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/approvals/${approvalId}/extend`,
                payload: {}
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                id: string;
                extended_by_hours: number;
            }>(response);
            expect(body.data.id).toBe(approvalId);
            expect(body.data.extended_by_hours).toBe(24);
        });

        it("should extend approval by specified hours", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const approvalId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId });
            const currentExpiration = new Date();
            const approval = createMockApprovalRequest({
                id: approvalId,
                instance_id: instanceId,
                status: "pending",
                expires_at: currentExpiration
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaApprovalRepo.findById.mockResolvedValue(approval);
            mockPersonaApprovalRepo.extendExpiration.mockResolvedValue({
                ...approval,
                expires_at: new Date(currentExpiration.getTime() + 48 * 60 * 60 * 1000)
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/approvals/${approvalId}/extend`,
                payload: { hours: 48 }
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                extended_by_hours: number;
            }>(response);
            expect(body.data.extended_by_hours).toBe(48);
        });

        it("should return 404 when instance not found", async () => {
            const testUser = createTestUser();
            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${uuidv4()}/approvals/${uuidv4()}/extend`,
                payload: {}
            });

            expectErrorResponse(response, 404);
        });

        it("should return 404 when approval not found", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaApprovalRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/approvals/${uuidv4()}/extend`,
                payload: {}
            });

            expectErrorResponse(response, 404);
        });

        it("should return 404 when approval belongs to different instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const approvalId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId });
            const approval = createMockApprovalRequest({
                id: approvalId,
                instance_id: uuidv4(), // Different instance
                status: "pending"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaApprovalRepo.findById.mockResolvedValue(approval);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/approvals/${approvalId}/extend`,
                payload: {}
            });

            expectErrorResponse(response, 404);
        });

        it("should return 400 when approval is not pending", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const approvalId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId });
            const approval = createMockApprovalRequest({
                id: approvalId,
                instance_id: instanceId,
                status: "approved" // Not pending
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaApprovalRepo.findById.mockResolvedValue(approval);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/approvals/${approvalId}/extend`,
                payload: {}
            });

            expectStatus(response, 400);
        });

        it("should return 400 for hours below minimum", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const approvalId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId });
            const approval = createMockApprovalRequest({
                id: approvalId,
                instance_id: instanceId,
                status: "pending"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaApprovalRepo.findById.mockResolvedValue(approval);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/approvals/${approvalId}/extend`,
                payload: { hours: 0 } // Below min of 1
            });

            expectStatus(response, 400);
        });

        it("should return 400 for hours above maximum", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const approvalId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId });
            const approval = createMockApprovalRequest({
                id: approvalId,
                instance_id: instanceId,
                status: "pending"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaApprovalRepo.findById.mockResolvedValue(approval);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/approvals/${approvalId}/extend`,
                payload: { hours: 200 } // Above max of 168 (7 days)
            });

            expectStatus(response, 400);
        });
    });
});
