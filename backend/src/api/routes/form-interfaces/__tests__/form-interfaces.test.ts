/**
 * Form Interface Routes Integration Tests
 *
 * Tests for form interface management endpoints including:
 * - CRUD operations (list, create, get, update, delete)
 * - Publishing lifecycle (publish, unpublish, duplicate)
 * - Submissions listing
 * - Multi-tenant isolation
 * - Pagination
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock form interface repository
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

// Mock submission repository
const mockSubmissionRepo = {
    findByInterfaceId: jest.fn(),
    findById: jest.fn()
};

// Mock GCS storage service
const mockGCSService = {
    upload: jest.fn(),
    uploadBuffer: jest.fn(),
    getPublicUrl: jest.fn(),
    getSignedDownloadUrl: jest.fn()
};

// Mock trigger repository
const mockTriggerRepo = {
    findById: jest.fn(),
    create: jest.fn(),
    delete: jest.fn()
};

jest.mock("../../../../storage/repositories/FormInterfaceRepository", () => ({
    FormInterfaceRepository: jest.fn().mockImplementation(() => mockFormInterfaceRepo)
}));

jest.mock("../../../../storage/repositories/FormInterfaceSubmissionRepository", () => ({
    FormInterfaceSubmissionRepository: jest.fn().mockImplementation(() => mockSubmissionRepo)
}));

jest.mock("../../../../storage/repositories/TriggerRepository", () => ({
    TriggerRepository: jest.fn().mockImplementation(() => mockTriggerRepo)
}));

jest.mock("../../../../storage/repositories", () => ({
    FormInterfaceRepository: jest.fn().mockImplementation(() => mockFormInterfaceRepo),
    FormInterfaceSubmissionRepository: jest.fn().mockImplementation(() => mockSubmissionRepo),
    TriggerRepository: jest.fn().mockImplementation(() => mockTriggerRepo),
    UserRepository: jest.fn().mockImplementation(() => ({
        findById: jest.fn(),
        findByEmail: jest.fn()
    }))
}));

jest.mock("../../../../services/GCSStorageService", () => ({
    getUploadsStorageService: jest.fn().mockImplementation(() => mockGCSService),
    getArtifactsStorageService: jest.fn().mockImplementation(() => mockGCSService)
}));

// Import test helpers after mocks
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

// ============================================================================
// TEST HELPERS
// ============================================================================

interface MockFormInterface {
    id: string;
    userId: string;
    workspaceId: string;
    name: string;
    slug: string;
    title: string;
    description: string | null;
    targetType: "workflow" | "agent";
    workflowId: string | null;
    agentId: string | null;
    triggerId: string | null;
    status: "draft" | "published";
    coverType: "gradient" | "image" | "color";
    coverValue: string;
    iconUrl: string | null;
    inputPlaceholder: string;
    inputLabel: string;
    fileUploadLabel: string;
    urlInputLabel: string;
    allowFileUpload: boolean;
    allowUrlInput: boolean;
    maxFiles: number;
    maxFileSizeMb: number;
    allowedFileTypes: string[];
    submitButtonText: string;
    submitLoadingText: string;
    outputLabel: string;
    showCopyButton: boolean;
    showDownloadButton: boolean;
    allowOutputEdit: boolean;
    folderId: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

function createMockFormInterface(
    overrides: Partial<MockFormInterface> = {}
): MockFormInterface {
    return {
        id: overrides.id || uuidv4(),
        userId: overrides.userId || uuidv4(),
        workspaceId: overrides.workspaceId || DEFAULT_TEST_WORKSPACE_ID,
        name: overrides.name || "Test Form Interface",
        slug: overrides.slug || `test-form-${Date.now()}`,
        title: overrides.title || "Test Form",
        description: overrides.description ?? "A test form interface",
        targetType: overrides.targetType || "workflow",
        workflowId: "workflowId" in overrides ? (overrides.workflowId ?? null) : uuidv4(),
        agentId: "agentId" in overrides ? (overrides.agentId ?? null) : null,
        triggerId: overrides.triggerId ?? null,
        status: overrides.status || "draft",
        coverType: overrides.coverType || "gradient",
        coverValue: overrides.coverValue || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        iconUrl: overrides.iconUrl ?? null,
        inputPlaceholder: overrides.inputPlaceholder || "Enter your message...",
        inputLabel: overrides.inputLabel || "Message",
        fileUploadLabel: overrides.fileUploadLabel || "Upload files",
        urlInputLabel: overrides.urlInputLabel || "Add URLs",
        allowFileUpload: overrides.allowFileUpload ?? false,
        allowUrlInput: overrides.allowUrlInput ?? false,
        maxFiles: overrides.maxFiles ?? 5,
        maxFileSizeMb: overrides.maxFileSizeMb ?? 10,
        allowedFileTypes: overrides.allowedFileTypes || ["application/pdf"],
        submitButtonText: overrides.submitButtonText || "Submit",
        submitLoadingText: overrides.submitLoadingText || "Processing...",
        outputLabel: overrides.outputLabel || "Result",
        showCopyButton: overrides.showCopyButton ?? true,
        showDownloadButton: overrides.showDownloadButton ?? false,
        allowOutputEdit: overrides.allowOutputEdit ?? false,
        folderId: overrides.folderId ?? null,
        publishedAt: overrides.publishedAt ?? null,
        createdAt: overrides.createdAt || new Date(),
        updatedAt: overrides.updatedAt || new Date(),
        deletedAt: overrides.deletedAt ?? null
    };
}

function createMockSubmission(overrides: Partial<{
    id: string;
    interfaceId: string;
    message: string;
    executionStatus: string;
    executionId: string | null;
    output: string | null;
    createdAt: Date;
}> = {}) {
    return {
        id: overrides.id || uuidv4(),
        interfaceId: overrides.interfaceId || uuidv4(),
        message: overrides.message || "Test submission",
        executionStatus: overrides.executionStatus || "completed",
        executionId: overrides.executionId ?? uuidv4(),
        output: overrides.output ?? "Test output",
        files: [],
        urls: [],
        attachmentsStatus: "ready",
        createdAt: overrides.createdAt || new Date(),
        updatedAt: new Date()
    };
}

function resetAllMocks() {
    jest.clearAllMocks();

    // Reset default behaviors
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
    mockFormInterfaceRepo.publishByWorkspaceId.mockImplementation((id) =>
        Promise.resolve(createMockFormInterface({ id, status: "published", publishedAt: new Date() }))
    );
    mockFormInterfaceRepo.unpublishByWorkspaceId.mockImplementation((id) =>
        Promise.resolve(createMockFormInterface({ id, status: "draft", publishedAt: null }))
    );
    mockFormInterfaceRepo.duplicateByWorkspaceId.mockImplementation(() =>
        Promise.resolve(createMockFormInterface({ status: "draft" }))
    );
    mockFormInterfaceRepo.setTriggerId.mockResolvedValue(undefined);

    mockSubmissionRepo.findByInterfaceId.mockResolvedValue({ submissions: [], total: 0 });
    mockSubmissionRepo.findById.mockResolvedValue(null);

    mockGCSService.upload.mockResolvedValue("gs://test-bucket/test-file");
    mockGCSService.uploadBuffer.mockResolvedValue("gs://test-bucket/test-file");
    mockGCSService.getPublicUrl.mockReturnValue("https://storage.googleapis.com/test-bucket/test-file");
    mockGCSService.getSignedDownloadUrl.mockResolvedValue("https://storage.googleapis.com/signed/test-file?token=abc");

    mockTriggerRepo.findById.mockResolvedValue(null);
    mockTriggerRepo.create.mockImplementation(() =>
        Promise.resolve({ id: uuidv4(), name: "__form_interface_test__" })
    );
    mockTriggerRepo.delete.mockResolvedValue(true);
}

// ============================================================================
// TESTS
// ============================================================================

describe("Form Interface Routes", () => {
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
                page: number;
                pageSize: number;
                hasMore: boolean;
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
                url: "/form-interfaces",
                query: { limit: "1", offset: "2" }
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
                url: "/form-interfaces",
                query: { workflowId }
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
                url: "/form-interfaces",
                query: { agentId }
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
                url: "/form-interfaces",
                query: { folderId }
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
                url: "/form-interfaces",
                query: { folderId: "null" }
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
                name: formData.name,
                slug: formData.slug,
                title: formData.title,
                targetType: formData.targetType,
                workflowId: formData.workflowId
            });
            mockFormInterfaceRepo.create.mockResolvedValue(createdForm);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/form-interfaces",
                payload: formData
            });

            expectStatus(response, 201);
            const body = expectSuccessResponse<{ id: string; name: string }>(response);
            expect(body.data.name).toBe("New Form");
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
                name: formData.name,
                slug: formData.slug,
                title: formData.title,
                targetType: formData.targetType,
                agentId: formData.agentId,
                workflowId: null
            });
            mockFormInterfaceRepo.create.mockResolvedValue(createdForm);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/form-interfaces",
                payload: formData
            });

            expectStatus(response, 201);
            const body = expectSuccessResponse<{ targetType: string }>(response);
            expect(body.data.targetType).toBe("agent");
        });

        it("should return 400 for missing required fields", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/form-interfaces",
                payload: {
                    name: "Only name"
                    // Missing slug, title, targetType
                }
            });

            expectStatus(response, 400);
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
                    name: "Test Form",
                    slug: "a", // Too short (must be 2+ chars)
                    title: "Test",
                    targetType: "workflow",
                    workflowId: uuidv4()
                }
            });

            expectStatus(response, 400);
        });

        it("should return 400 for reserved slug", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/form-interfaces",
                payload: {
                    name: "Test Form",
                    slug: "admin", // Reserved
                    title: "Test",
                    targetType: "workflow",
                    workflowId: uuidv4()
                }
            });

            expectStatus(response, 400);
        });

        it("should return 400 for duplicate slug in workspace", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.isSlugAvailableInWorkspace.mockResolvedValue(false);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/form-interfaces",
                payload: {
                    name: "Test Form",
                    slug: "existing-slug",
                    title: "Test",
                    targetType: "workflow",
                    workflowId: uuidv4()
                }
            });

            expectStatus(response, 400);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/form-interfaces",
                payload: {
                    name: "Test",
                    slug: "test",
                    title: "Test",
                    targetType: "workflow",
                    workflowId: uuidv4()
                }
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // GET FORM INTERFACE BY ID
    // ========================================================================

    describe("GET /form-interfaces/:id", () => {
        it("should return form interface for workspace member", async () => {
            const testUser = createTestUser();
            const formInterface = createMockFormInterface({
                id: uuidv4(),
                userId: testUser.id,
                name: "My Form"
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces/${formInterface.id}`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ id: string; name: string }>(response);
            expect(body.data.name).toBe("My Form");
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

        it("should return 404 for other workspace's form (multi-tenant isolation)", async () => {
            const testUser = createTestUser();
            // Form exists but findByIdAndWorkspaceId returns null because different workspace
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
        it("should update form interface", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const existingForm = createMockFormInterface({
                id: formId,
                userId: testUser.id,
                name: "Old Name"
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(existingForm);
            mockFormInterfaceRepo.updateByWorkspaceId.mockResolvedValue({
                ...existingForm,
                name: "New Name"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/form-interfaces/${formId}`,
                payload: { name: "New Name" }
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ name: string }>(response);
            expect(body.data.name).toBe("New Name");
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
            const formId = uuidv4();
            const existingForm = createMockFormInterface({ id: formId, userId: testUser.id });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(existingForm);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/form-interfaces/${formId}`,
                payload: { slug: "dashboard" }
            });

            expectStatus(response, 400);
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

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "PUT",
                url: `/form-interfaces/${uuidv4()}`,
                payload: { name: "Test" }
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
            // Should not call publish again
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
                status: "draft" // Always draft
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(publishedForm);
            mockFormInterfaceRepo.duplicateByWorkspaceId.mockResolvedValue(duplicatedForm);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/form-interfaces/${formId}/duplicate`
            });

            expectStatus(response, 201);
            const body = expectSuccessResponse<{ status: string }>(response);
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

    // ========================================================================
    // LIST SUBMISSIONS
    // ========================================================================

    describe("GET /form-interfaces/:id/submissions", () => {
        it("should list submissions for form interface", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const formInterface = createMockFormInterface({
                id: formId,
                userId: testUser.id
            });
            const submissions = [
                createMockSubmission({ interfaceId: formId }),
                createMockSubmission({ interfaceId: formId })
            ];
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);
            mockSubmissionRepo.findByInterfaceId.mockResolvedValue({
                submissions,
                total: 2
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces/${formId}/submissions`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                items: object[];
                total: number;
                hasMore: boolean;
            }>(response);
            expect(body.data.items).toHaveLength(2);
            expect(body.data.total).toBe(2);
        });

        it("should respect pagination parameters", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const formInterface = createMockFormInterface({
                id: formId,
                userId: testUser.id
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);
            mockSubmissionRepo.findByInterfaceId.mockResolvedValue({
                submissions: [],
                total: 10
            });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces/${formId}/submissions`,
                query: { limit: "5", offset: "10" }
            });

            expect(mockSubmissionRepo.findByInterfaceId).toHaveBeenCalledWith(
                formId,
                expect.objectContaining({ limit: 5, offset: 10 })
            );
        });

        it("should return 404 for non-existent form interface", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces/${uuidv4()}/submissions`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/form-interfaces/${uuidv4()}/submissions`
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // MULTI-TENANT ISOLATION TESTS
    // ========================================================================

    describe("Multi-tenant Isolation", () => {
        it("form interfaces are filtered by workspace ID", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.findByWorkspaceId.mockResolvedValue({
                formInterfaces: [],
                total: 0
            });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/form-interfaces"
            });

            expect(mockFormInterfaceRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.any(Object)
            );
        });

        it("form interfaces created are assigned to authenticated user and workspace", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.create.mockImplementation((userId, workspaceId, data) =>
                Promise.resolve(createMockFormInterface({ userId, workspaceId, ...data }))
            );

            await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/form-interfaces",
                payload: {
                    name: "Test Form",
                    slug: "test-form",
                    title: "Test",
                    targetType: "workflow",
                    workflowId: uuidv4()
                }
            });

            expect(mockFormInterfaceRepo.create).toHaveBeenCalledWith(
                testUser.id,
                DEFAULT_TEST_WORKSPACE_ID,
                expect.any(Object)
            );
        });

        it("updates are scoped to workspace", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const existingForm = createMockFormInterface({ id: formId, userId: testUser.id });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(existingForm);
            mockFormInterfaceRepo.updateByWorkspaceId.mockResolvedValue(existingForm);

            await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/form-interfaces/${formId}`,
                payload: { name: "Updated" }
            });

            expect(mockFormInterfaceRepo.updateByWorkspaceId).toHaveBeenCalledWith(
                formId,
                DEFAULT_TEST_WORKSPACE_ID,
                expect.any(Object)
            );
        });

        it("deletes are scoped to workspace", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const existingForm = createMockFormInterface({ id: formId, userId: testUser.id });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(existingForm);

            await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/form-interfaces/${formId}`
            });

            expect(mockFormInterfaceRepo.softDeleteByWorkspaceId).toHaveBeenCalledWith(
                formId,
                DEFAULT_TEST_WORKSPACE_ID
            );
        });
    });

    // ========================================================================
    // UPLOAD ASSETS (COVER/ICON)
    // ========================================================================

    describe("POST /form-interfaces/:id/assets", () => {
        it("should return 404 for non-existent form interface", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/form-interfaces/${uuidv4()}/assets`,
                payload: {}
            });

            expectErrorResponse(response, 404);
        });

        it("should require multipart file upload", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const formInterface = createMockFormInterface({
                id: formId,
                userId: testUser.id
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);

            // Without multipart middleware properly configured, sending JSON will error
            // The actual endpoint expects multipart/form-data with a file
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/form-interfaces/${formId}/assets`,
                payload: {}
            });

            // Returns error because no multipart data provided (400 or 500 depending on multipart middleware)
            expect([400, 500]).toContain(response.statusCode);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/form-interfaces/${uuidv4()}/assets`,
                payload: {}
            });

            expectErrorResponse(response, 401);
        });

        // Note: Full multipart file upload tests require integration testing.
        // The handler validates:
        // - Asset type must be 'cover' or 'icon' (from field name)
        // - MIME type must be image (jpeg, png, webp, gif, svg+xml)
        // - Uploads to GCS and updates form interface with public URL
        // - For 'cover': sets coverType='image' and coverValue=url
        // - For 'icon': sets iconUrl=url
    });

    // ========================================================================
    // SUBMISSION FILE DOWNLOAD
    // ========================================================================

    describe("GET /form-interfaces/:id/submissions/:submissionId/files/:fileIndex/download", () => {
        it("should return 404 for non-existent form interface", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces/${uuidv4()}/submissions/${uuidv4()}/files/0/download`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 404 for non-existent submission", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const formInterface = createMockFormInterface({
                id: formId,
                userId: testUser.id
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);
            mockSubmissionRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces/${formId}/submissions/${uuidv4()}/files/0/download`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 403 when submission belongs to different form", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const formInterface = createMockFormInterface({
                id: formId,
                userId: testUser.id
            });
            const submission = createMockSubmission({
                id: uuidv4(),
                interfaceId: uuidv4() // Different form
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);
            mockSubmissionRepo.findById.mockResolvedValue(submission);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces/${formId}/submissions/${submission.id}/files/0/download`
            });

            expectErrorResponse(response, 403);
        });

        it("should return 400 for invalid file index", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const submissionId = uuidv4();
            const formInterface = createMockFormInterface({
                id: formId,
                userId: testUser.id
            });
            const submission = createMockSubmission({
                id: submissionId,
                interfaceId: formId
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);
            mockSubmissionRepo.findById.mockResolvedValue(submission);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces/${formId}/submissions/${submissionId}/files/-1/download`
            });

            expectStatus(response, 400);
        });

        it("should return 404 when file index out of range", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const submissionId = uuidv4();
            const formInterface = createMockFormInterface({
                id: formId,
                userId: testUser.id
            });
            const submission = {
                ...createMockSubmission({
                    id: submissionId,
                    interfaceId: formId
                }),
                files: [] // No files
            };
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);
            mockSubmissionRepo.findById.mockResolvedValue(submission);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces/${formId}/submissions/${submissionId}/files/0/download`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 400 when file has no GCS URI", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const submissionId = uuidv4();
            const formInterface = createMockFormInterface({
                id: formId,
                userId: testUser.id
            });
            const submission = {
                ...createMockSubmission({
                    id: submissionId,
                    interfaceId: formId
                }),
                files: [
                    {
                        fileName: "test.pdf",
                        fileSize: 1024,
                        mimeType: "application/pdf",
                        gcsUri: null // No GCS URI
                    }
                ]
            };
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);
            mockSubmissionRepo.findById.mockResolvedValue(submission);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces/${formId}/submissions/${submissionId}/files/0/download`
            });

            expectStatus(response, 400);
        });

        it("should generate signed URL for valid file", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const submissionId = uuidv4();
            const formInterface = createMockFormInterface({
                id: formId,
                userId: testUser.id
            });
            const submission = {
                ...createMockSubmission({
                    id: submissionId,
                    interfaceId: formId
                }),
                files: [
                    {
                        fileName: "document.pdf",
                        fileSize: 2048,
                        mimeType: "application/pdf",
                        gcsUri: "gs://test-bucket/form-submissions/doc.pdf"
                    }
                ]
            };
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);
            mockSubmissionRepo.findById.mockResolvedValue(submission);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces/${formId}/submissions/${submissionId}/files/0/download`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                downloadUrl: string;
                fileName: string;
                fileSize: number;
                mimeType: string;
            }>(response);
            expect(body.data.downloadUrl).toContain("https://");
            expect(body.data.fileName).toBe("document.pdf");
            expect(body.data.fileSize).toBe(2048);
            expect(body.data.mimeType).toBe("application/pdf");
        });

        it("should respect custom expiresIn parameter", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const submissionId = uuidv4();
            const formInterface = createMockFormInterface({
                id: formId,
                userId: testUser.id
            });
            const submission = {
                ...createMockSubmission({
                    id: submissionId,
                    interfaceId: formId
                }),
                files: [
                    {
                        fileName: "document.pdf",
                        fileSize: 2048,
                        mimeType: "application/pdf",
                        gcsUri: "gs://test-bucket/form-submissions/doc.pdf"
                    }
                ]
            };
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);
            mockSubmissionRepo.findById.mockResolvedValue(submission);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces/${formId}/submissions/${submissionId}/files/0/download`,
                query: { expiresIn: "7200" } // 2 hours
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ expiresIn: number }>(response);
            expect(body.data.expiresIn).toBe(7200);
        });

        it("should cap expiresIn at 7 days", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const submissionId = uuidv4();
            const formInterface = createMockFormInterface({
                id: formId,
                userId: testUser.id
            });
            const submission = {
                ...createMockSubmission({
                    id: submissionId,
                    interfaceId: formId
                }),
                files: [
                    {
                        fileName: "document.pdf",
                        fileSize: 2048,
                        mimeType: "application/pdf",
                        gcsUri: "gs://test-bucket/form-submissions/doc.pdf"
                    }
                ]
            };
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);
            mockSubmissionRepo.findById.mockResolvedValue(submission);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces/${formId}/submissions/${submissionId}/files/0/download`,
                query: { expiresIn: "999999999" } // Huge value
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ expiresIn: number }>(response);
            expect(body.data.expiresIn).toBe(7 * 24 * 60 * 60); // 7 days max
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/form-interfaces/${uuidv4()}/submissions/${uuidv4()}/files/0/download`
            });

            expectErrorResponse(response, 401);
        });
    });
});
