/**
 * Form Interface Lifecycle Route Tests
 *
 * Tests for publish, unpublish, and duplicate operations.
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MOCK SETUP (must be before imports)
// ============================================================================

const mockFormInterfaceRepo = {
    findByWorkspaceId: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    findByWorkflowIdAndWorkspaceId: jest.fn(),
    findByAgentIdAndWorkspaceId: jest.fn(),
    isSlugAvailableInWorkspace: jest.fn(),
    create: jest.fn(),
    updateByWorkspaceId: jest.fn(),
    softDeleteByWorkspaceId: jest.fn(),
    publishByWorkspaceId: jest.fn(),
    unpublishByWorkspaceId: jest.fn(),
    duplicateByWorkspaceId: jest.fn(),
    setTriggerId: jest.fn()
};

const mockTriggerRepo = {
    findById: jest.fn(),
    create: jest.fn(),
    delete: jest.fn()
};

jest.mock("../../../../storage/repositories/FormInterfaceRepository", () => ({
    FormInterfaceRepository: jest.fn().mockImplementation(() => mockFormInterfaceRepo)
}));

jest.mock("../../../../storage/repositories/TriggerRepository", () => ({
    TriggerRepository: jest.fn().mockImplementation(() => mockTriggerRepo)
}));

jest.mock("../../../../storage/repositories", () => ({
    FormInterfaceRepository: jest.fn().mockImplementation(() => mockFormInterfaceRepo),
    TriggerRepository: jest.fn().mockImplementation(() => mockTriggerRepo),
    UserRepository: jest.fn().mockImplementation(() => ({
        findById: jest.fn(),
        findByEmail: jest.fn()
    }))
}));

import {
    authenticatedRequest,
    unauthenticatedRequest,
    createTestServer,
    closeTestServer,
    createTestUser,
    expectStatus,
    expectSuccessResponse,
    expectErrorResponse,
    DEFAULT_TEST_WORKSPACE_ID
} from "../../../../../__tests__/helpers/fastify-test-client";
import { createMockFormInterface, MockFormInterface } from "./setup";

function resetAllMocks(): void {
    jest.clearAllMocks();
    mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);
    mockFormInterfaceRepo.publishByWorkspaceId.mockImplementation((id) =>
        Promise.resolve(
            createMockFormInterface({ id, status: "published", publishedAt: new Date() })
        )
    );
    mockFormInterfaceRepo.unpublishByWorkspaceId.mockImplementation((id) =>
        Promise.resolve(createMockFormInterface({ id, status: "draft", publishedAt: null }))
    );
    mockFormInterfaceRepo.duplicateByWorkspaceId.mockImplementation(() =>
        Promise.resolve(createMockFormInterface({ status: "draft" }))
    );
    mockFormInterfaceRepo.setTriggerId.mockResolvedValue(undefined);
    mockTriggerRepo.findById.mockResolvedValue(null);
    mockTriggerRepo.create.mockImplementation(() =>
        Promise.resolve({ id: uuidv4(), name: "__form_interface_test__" })
    );
    mockTriggerRepo.delete.mockResolvedValue(true);
}

describe("Form Interface Lifecycle Routes", () => {
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
    // PUBLISH FORM INTERFACE
    // ========================================================================

    describe("POST /form-interfaces/:id/publish", () => {
        it("should publish draft form interface", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const draftForm = createMockFormInterface({
                id: formId,
                userId: testUser.id,
                status: "draft",
                workflowId: uuidv4()
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(draftForm);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/form-interfaces/${formId}/publish`
            });

            expectStatus(response, 200);
            expect(mockFormInterfaceRepo.publishByWorkspaceId).toHaveBeenCalledWith(
                formId,
                DEFAULT_TEST_WORKSPACE_ID
            );
        });

        it("should auto-create trigger for workflow target", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const workflowId = uuidv4();
            const draftForm = createMockFormInterface({
                id: formId,
                userId: testUser.id,
                status: "draft",
                targetType: "workflow",
                workflowId,
                triggerId: null
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(draftForm);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/form-interfaces/${formId}/publish`
            });

            expectStatus(response, 200);
            expect(mockTriggerRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    workflow_id: workflowId,
                    trigger_type: "manual"
                })
            );
        });

        it("should not create trigger for agent target", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const draftForm = createMockFormInterface({
                id: formId,
                userId: testUser.id,
                status: "draft",
                targetType: "agent",
                agentId: uuidv4(),
                workflowId: null
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(draftForm);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/form-interfaces/${formId}/publish`
            });

            expectStatus(response, 200);
            expect(mockTriggerRepo.create).not.toHaveBeenCalled();
        });

        it("should return success for already published form", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const publishedForm = createMockFormInterface({
                id: formId,
                userId: testUser.id,
                status: "published"
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(publishedForm);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/form-interfaces/${formId}/publish`
            });

            expectStatus(response, 200);
            expect(mockFormInterfaceRepo.publishByWorkspaceId).not.toHaveBeenCalled();
        });

        it("should return 400 when form has no target", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const formWithoutTarget = createMockFormInterface({
                id: formId,
                userId: testUser.id,
                status: "draft",
                workflowId: null,
                agentId: null
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formWithoutTarget);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/form-interfaces/${formId}/publish`
            });

            expectStatus(response, 400);
        });

        it("should return 404 for non-existent form", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/form-interfaces/${uuidv4()}/publish`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/form-interfaces/${uuidv4()}/publish`
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // UNPUBLISH FORM INTERFACE
    // ========================================================================

    describe("POST /form-interfaces/:id/unpublish", () => {
        it("should unpublish published form interface", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const publishedForm = createMockFormInterface({
                id: formId,
                userId: testUser.id,
                status: "published"
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(publishedForm);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/form-interfaces/${formId}/unpublish`
            });

            expectStatus(response, 200);
            expect(mockFormInterfaceRepo.unpublishByWorkspaceId).toHaveBeenCalledWith(
                formId,
                DEFAULT_TEST_WORKSPACE_ID
            );
        });

        it("should delete auto-created trigger on unpublish", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const triggerId = uuidv4();
            const publishedForm = createMockFormInterface({
                id: formId,
                userId: testUser.id,
                status: "published",
                triggerId
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(publishedForm);
            mockTriggerRepo.findById.mockResolvedValue({
                id: triggerId,
                name: `__form_interface_${formId}__`
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/form-interfaces/${formId}/unpublish`
            });

            expectStatus(response, 200);
            expect(mockTriggerRepo.delete).toHaveBeenCalledWith(triggerId);
        });

        it("should return success for already draft form", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const draftForm = createMockFormInterface({
                id: formId,
                userId: testUser.id,
                status: "draft"
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(draftForm);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/form-interfaces/${formId}/unpublish`
            });

            expectStatus(response, 200);
            expect(mockFormInterfaceRepo.unpublishByWorkspaceId).not.toHaveBeenCalled();
        });

        it("should return 404 for non-existent form", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/form-interfaces/${uuidv4()}/unpublish`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/form-interfaces/${uuidv4()}/unpublish`
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // DUPLICATE FORM INTERFACE
    // ========================================================================

    describe("POST /form-interfaces/:id/duplicate", () => {
        it("should duplicate form interface", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const originalForm = createMockFormInterface({
                id: formId,
                userId: testUser.id,
                name: "Original Form"
            });
            const duplicatedForm = createMockFormInterface({
                name: "Original Form (Copy)",
                status: "draft"
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(originalForm);
            mockFormInterfaceRepo.duplicateByWorkspaceId.mockResolvedValue(duplicatedForm);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/form-interfaces/${formId}/duplicate`
            });

            expectStatus(response, 201);
            expect(mockFormInterfaceRepo.duplicateByWorkspaceId).toHaveBeenCalledWith(
                formId,
                DEFAULT_TEST_WORKSPACE_ID
            );
        });

        it("should create duplicate as draft regardless of original status", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const publishedForm = createMockFormInterface({
                id: formId,
                userId: testUser.id,
                status: "published"
            });
            const duplicatedForm = createMockFormInterface({
                status: "draft"
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(publishedForm);
            mockFormInterfaceRepo.duplicateByWorkspaceId.mockResolvedValue(duplicatedForm);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/form-interfaces/${formId}/duplicate`
            });

            expectStatus(response, 201);
            const body = expectSuccessResponse<MockFormInterface>(response);
            expect(body.data.status).toBe("draft");
        });

        it("should return 404 for non-existent form", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/form-interfaces/${uuidv4()}/duplicate`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/form-interfaces/${uuidv4()}/duplicate`
            });

            expectErrorResponse(response, 401);
        });
    });
});
