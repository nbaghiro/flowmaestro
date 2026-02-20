/**
 * Form Interface CRUD Route Tests
 *
 * Tests for list, create, get, update, delete operations.
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
    mockFormInterfaceRepo.findByWorkspaceId.mockResolvedValue({ formInterfaces: [], total: 0 });
    mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);
    mockFormInterfaceRepo.findByWorkflowIdAndWorkspaceId.mockResolvedValue([]);
    mockFormInterfaceRepo.findByAgentIdAndWorkspaceId.mockResolvedValue([]);
    mockFormInterfaceRepo.isSlugAvailableInWorkspace.mockResolvedValue(true);
    mockFormInterfaceRepo.create.mockImplementation((userId, workspaceId, data) =>
        Promise.resolve(createMockFormInterface({ userId, workspaceId, ...data, id: uuidv4() }))
    );
    mockFormInterfaceRepo.updateByWorkspaceId.mockImplementation((id, _workspaceId, data) =>
        Promise.resolve(createMockFormInterface({ id, ...data }))
    );
    mockFormInterfaceRepo.softDeleteByWorkspaceId.mockResolvedValue(true);
    mockFormInterfaceRepo.setTriggerId.mockResolvedValue(undefined);
    mockTriggerRepo.findById.mockResolvedValue(null);
    mockTriggerRepo.create.mockImplementation(() =>
        Promise.resolve({ id: uuidv4(), name: "__form_interface_test__" })
    );
    mockTriggerRepo.delete.mockResolvedValue(true);
}

describe("Form Interface CRUD Routes", () => {
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
    // LIST FORM INTERFACES
    // ========================================================================

    describe("GET /form-interfaces", () => {
        it("should list form interfaces for authenticated user", async () => {
            const testUser = createTestUser();
            const formInterfaces = [
                createMockFormInterface({ userId: testUser.id, name: "Form 1" }),
                createMockFormInterface({ userId: testUser.id, name: "Form 2" })
            ];
            mockFormInterfaceRepo.findByWorkspaceId.mockResolvedValue({
                formInterfaces,
                total: 2
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/form-interfaces"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                items: object[];
                total: number;
            }>(response);
            expect(body.data.items).toHaveLength(2);
            expect(body.data.total).toBe(2);
        });

        it("should return empty list for new workspace", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.findByWorkspaceId.mockResolvedValue({
                formInterfaces: [],
                total: 0
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/form-interfaces"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ items: object[]; total: number }>(response);
            expect(body.data.items).toHaveLength(0);
            expect(body.data.total).toBe(0);
        });

        it("should respect limit and offset parameters", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.findByWorkspaceId.mockResolvedValue({
                formInterfaces: [createMockFormInterface()],
                total: 10
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/form-interfaces?limit=1&offset=2"
            });

            expectStatus(response, 200);
            expect(mockFormInterfaceRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.objectContaining({ limit: 1, offset: 2 })
            );
        });

        it("should filter by workflowId", async () => {
            const testUser = createTestUser();
            const workflowId = uuidv4();
            mockFormInterfaceRepo.findByWorkflowIdAndWorkspaceId.mockResolvedValue([
                createMockFormInterface({ workflowId })
            ]);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces?workflowId=${workflowId}`
            });

            expectStatus(response, 200);
            expect(mockFormInterfaceRepo.findByWorkflowIdAndWorkspaceId).toHaveBeenCalledWith(
                workflowId,
                DEFAULT_TEST_WORKSPACE_ID
            );
        });

        it("should filter by agentId", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            mockFormInterfaceRepo.findByAgentIdAndWorkspaceId.mockResolvedValue([
                createMockFormInterface({ targetType: "agent", agentId, workflowId: null })
            ]);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces?agentId=${agentId}`
            });

            expectStatus(response, 200);
            expect(mockFormInterfaceRepo.findByAgentIdAndWorkspaceId).toHaveBeenCalledWith(
                agentId,
                DEFAULT_TEST_WORKSPACE_ID
            );
        });

        it("should filter by folderId", async () => {
            const testUser = createTestUser();
            const folderId = uuidv4();
            mockFormInterfaceRepo.findByWorkspaceId.mockResolvedValue({
                formInterfaces: [],
                total: 0
            });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces?folderId=${folderId}`
            });

            expect(mockFormInterfaceRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.objectContaining({ folderId })
            );
        });

        it("should filter root-level forms with folderId=null", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.findByWorkspaceId.mockResolvedValue({
                formInterfaces: [],
                total: 0
            });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/form-interfaces?folderId=null"
            });

            expect(mockFormInterfaceRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.objectContaining({ folderId: null })
            );
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/form-interfaces"
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // CREATE FORM INTERFACE
    // ========================================================================

    describe("POST /form-interfaces", () => {
        it("should create a form interface with workflow target", async () => {
            const testUser = createTestUser();
            const workflowId = uuidv4();
            const formData = {
                name: "New Form",
                slug: "new-form",
                title: "New Form Title",
                targetType: "workflow" as const,
                workflowId
            };

            const createdForm = createMockFormInterface({
                userId: testUser.id,
                ...formData
            });
            mockFormInterfaceRepo.create.mockResolvedValue(createdForm);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/form-interfaces",
                payload: formData
            });

            expectStatus(response, 201);
            const body = expectSuccessResponse<MockFormInterface>(response);
            expect(body.data.name).toBe("New Form");
            expect(body.data.targetType).toBe("workflow");
        });

        it("should create a form interface with agent target", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const formData = {
                name: "Agent Form",
                slug: "agent-form",
                title: "Agent Form Title",
                targetType: "agent" as const,
                agentId
            };

            const createdForm = createMockFormInterface({
                userId: testUser.id,
                ...formData,
                workflowId: null
            });
            mockFormInterfaceRepo.create.mockResolvedValue(createdForm);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/form-interfaces",
                payload: formData
            });

            expectStatus(response, 201);
            const body = expectSuccessResponse<MockFormInterface>(response);
            expect(body.data.targetType).toBe("agent");
        });

        it("should return 400 for missing required fields", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/form-interfaces",
                payload: { name: "Test" }
            });

            expectErrorResponse(response, 400);
        });

        it("should return 400 when workflow targetType lacks workflowId", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/form-interfaces",
                payload: {
                    name: "Test Form",
                    slug: "test-form",
                    title: "Test",
                    targetType: "workflow"
                    // Missing workflowId
                }
            });

            expectStatus(response, 400);
        });

        it("should return 400 when agent targetType lacks agentId", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/form-interfaces",
                payload: {
                    name: "Test Form",
                    slug: "test-form",
                    title: "Test",
                    targetType: "agent"
                    // Missing agentId
                }
            });

            expectStatus(response, 400);
        });

        it("should return 400 for invalid slug format", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/form-interfaces",
                payload: {
                    name: "Test",
                    slug: "A",
                    title: "Test Title",
                    targetType: "workflow",
                    workflowId: uuidv4()
                }
            });

            expectErrorResponse(response, 400);
        });

        it("should return 400 for reserved slug", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/form-interfaces",
                payload: {
                    name: "Test",
                    slug: "api",
                    title: "Test Title",
                    targetType: "workflow",
                    workflowId: uuidv4()
                }
            });

            expectErrorResponse(response, 400);
        });

        it("should return 400 for duplicate slug", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.isSlugAvailableInWorkspace.mockResolvedValue(false);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/form-interfaces",
                payload: {
                    name: "Test",
                    slug: "existing-slug",
                    title: "Test Title",
                    targetType: "workflow",
                    workflowId: uuidv4()
                }
            });

            expectErrorResponse(response, 400);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/form-interfaces",
                payload: {
                    name: "Test",
                    slug: "test-form",
                    title: "Test Title",
                    targetType: "workflow",
                    workflowId: uuidv4()
                }
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // GET FORM INTERFACE
    // ========================================================================

    describe("GET /form-interfaces/:id", () => {
        it("should get a form interface by id", async () => {
            const testUser = createTestUser();
            const formInterface = createMockFormInterface({ userId: testUser.id });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces/${formInterface.id}`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<MockFormInterface>(response);
            expect(body.data.id).toBe(formInterface.id);
        });

        it("should return 404 for non-existent form interface", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/form-interfaces/${uuidv4()}`
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // UPDATE FORM INTERFACE
    // ========================================================================

    describe("PUT /form-interfaces/:id", () => {
        it("should update a form interface", async () => {
            const testUser = createTestUser();
            const formInterface = createMockFormInterface({ userId: testUser.id });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);

            const updateData = { name: "Updated Name", title: "Updated Title" };

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/form-interfaces/${formInterface.id}`,
                payload: updateData
            });

            expectStatus(response, 200);
            expect(mockFormInterfaceRepo.updateByWorkspaceId).toHaveBeenCalled();
        });

        it("should return 404 for non-existent form interface", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/form-interfaces/${uuidv4()}`,
                payload: { name: "Updated" }
            });

            expectErrorResponse(response, 404);
        });

        it("should update slug with validation", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const existingForm = createMockFormInterface({
                id: formId,
                userId: testUser.id,
                slug: "old-slug"
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(existingForm);
            mockFormInterfaceRepo.isSlugAvailableInWorkspace.mockResolvedValue(true);
            mockFormInterfaceRepo.updateByWorkspaceId.mockResolvedValue({
                ...existingForm,
                slug: "new-slug"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/form-interfaces/${formId}`,
                payload: { slug: "new-slug" }
            });

            expectStatus(response, 200);
            expect(mockFormInterfaceRepo.isSlugAvailableInWorkspace).toHaveBeenCalledWith(
                "new-slug",
                DEFAULT_TEST_WORKSPACE_ID,
                formId
            );
        });

        it("should return 400 for invalid slug format on update", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const existingForm = createMockFormInterface({ id: formId, userId: testUser.id });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(existingForm);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/form-interfaces/${formId}`,
                payload: { slug: "UPPERCASE-NOT-ALLOWED" }
            });

            expectStatus(response, 400);
        });

        it("should return 400 for reserved slug on update", async () => {
            const testUser = createTestUser();
            const formInterface = createMockFormInterface({ userId: testUser.id });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/form-interfaces/${formInterface.id}`,
                payload: { slug: "dashboard" }
            });

            expectErrorResponse(response, 400);
        });

        it("should return 400 when changing to workflow targetType without workflowId", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const existingForm = createMockFormInterface({
                id: formId,
                userId: testUser.id,
                targetType: "agent"
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(existingForm);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/form-interfaces/${formId}`,
                payload: { targetType: "workflow" } // Missing workflowId
            });

            expectStatus(response, 400);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "PUT",
                url: `/form-interfaces/${uuidv4()}`,
                payload: { name: "Updated" }
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // DELETE FORM INTERFACE
    // ========================================================================

    describe("DELETE /form-interfaces/:id", () => {
        it("should soft delete form interface", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const formInterface = createMockFormInterface({
                id: formId,
                userId: testUser.id
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/form-interfaces/${formId}`
            });

            expectStatus(response, 200);
            expect(mockFormInterfaceRepo.softDeleteByWorkspaceId).toHaveBeenCalledWith(
                formId,
                DEFAULT_TEST_WORKSPACE_ID
            );
        });

        it("should delete auto-created trigger when deleting form", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const triggerId = uuidv4();
            const formInterface = createMockFormInterface({
                id: formId,
                userId: testUser.id,
                triggerId
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);
            mockTriggerRepo.findById.mockResolvedValue({
                id: triggerId,
                name: `__form_interface_${formId}__`
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/form-interfaces/${formId}`
            });

            expectStatus(response, 200);
            expect(mockTriggerRepo.delete).toHaveBeenCalledWith(triggerId);
        });

        it("should not delete manually created trigger", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const triggerId = uuidv4();
            const formInterface = createMockFormInterface({
                id: formId,
                userId: testUser.id,
                triggerId
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);
            mockTriggerRepo.findById.mockResolvedValue({
                id: triggerId,
                name: "manual-trigger" // Not auto-created
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/form-interfaces/${formId}`
            });

            expectStatus(response, 200);
            expect(mockTriggerRepo.delete).not.toHaveBeenCalled();
        });

        it("should return 404 for non-existent form interface", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/form-interfaces/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "DELETE",
                url: `/form-interfaces/${uuidv4()}`
            });

            expectErrorResponse(response, 401);
        });
    });
});
