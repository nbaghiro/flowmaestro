/**
 * Form Interface Error Handling Route Tests
 *
 * Tests for error scenarios and 500 responses.
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

const mockSubmissionRepo = {
    findByInterfaceId: jest.fn(),
    findById: jest.fn()
};

const mockGCSService = {
    upload: jest.fn(),
    uploadBuffer: jest.fn(),
    getPublicUrl: jest.fn(),
    getSignedDownloadUrl: jest.fn()
};

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

import {
    authenticatedRequest,
    createTestServer,
    closeTestServer,
    createTestUser,
    expectErrorResponse
} from "../../../../../__tests__/helpers/fastify-test-client";
import { createMockFormInterface, createMockSubmission } from "./setup";

function resetAllMocks(): void {
    jest.clearAllMocks();
    mockFormInterfaceRepo.findByWorkspaceId.mockResolvedValue({ formInterfaces: [], total: 0 });
    mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);
    mockFormInterfaceRepo.isSlugAvailableInWorkspace.mockResolvedValue(true);
    mockSubmissionRepo.findByInterfaceId.mockResolvedValue({ submissions: [], total: 0 });
    mockSubmissionRepo.findById.mockResolvedValue(null);
}

describe("Form Interface Error Handling", () => {
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
    // ERROR HANDLING
    // ========================================================================

    describe("Error handling", () => {
        it("should return 500 when repository throws on list", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.findByWorkspaceId.mockRejectedValue(new Error("Database error"));

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/form-interfaces"
            });

            expectErrorResponse(response, 500);
        });

        it("should return 500 when repository throws on get", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockRejectedValue(
                new Error("Database error")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces/${uuidv4()}`
            });

            expectErrorResponse(response, 500);
        });

        it("should return 500 when repository throws on create", async () => {
            const testUser = createTestUser();
            mockFormInterfaceRepo.create.mockRejectedValue(new Error("Database error"));

            const response = await authenticatedRequest(fastify, testUser, {
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

            expectErrorResponse(response, 500);
        });

        it("should return 500 when repository throws on update", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const formInterface = createMockFormInterface({ id: formId, userId: testUser.id });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);
            mockFormInterfaceRepo.updateByWorkspaceId.mockRejectedValue(
                new Error("Database error")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/form-interfaces/${formId}`,
                payload: { name: "Updated" }
            });

            expectErrorResponse(response, 500);
        });

        it("should return 500 when repository throws on delete", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const formInterface = createMockFormInterface({ id: formId, userId: testUser.id });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);
            mockFormInterfaceRepo.softDeleteByWorkspaceId.mockRejectedValue(
                new Error("Database error")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/form-interfaces/${formId}`
            });

            expectErrorResponse(response, 500);
        });

        it("should return 500 when repository throws on publish", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const formInterface = createMockFormInterface({
                id: formId,
                userId: testUser.id,
                status: "draft",
                workflowId: uuidv4()
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);
            mockFormInterfaceRepo.publishByWorkspaceId.mockRejectedValue(
                new Error("Database error")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/form-interfaces/${formId}/publish`
            });

            expectErrorResponse(response, 500);
        });

        it("should return 500 when repository throws on unpublish", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const formInterface = createMockFormInterface({
                id: formId,
                userId: testUser.id,
                status: "published"
            });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);
            mockFormInterfaceRepo.unpublishByWorkspaceId.mockRejectedValue(
                new Error("Database error")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/form-interfaces/${formId}/unpublish`
            });

            expectErrorResponse(response, 500);
        });

        it("should return 500 when repository throws on duplicate", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const formInterface = createMockFormInterface({ id: formId, userId: testUser.id });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);
            mockFormInterfaceRepo.duplicateByWorkspaceId.mockRejectedValue(
                new Error("Database error")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/form-interfaces/${formId}/duplicate`
            });

            expectErrorResponse(response, 500);
        });

        it("should return 500 when repository throws on list submissions", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const formInterface = createMockFormInterface({ id: formId, userId: testUser.id });
            mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(formInterface);
            mockSubmissionRepo.findByInterfaceId.mockRejectedValue(new Error("Database error"));

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces/${formId}/submissions`
            });

            expectErrorResponse(response, 500);
        });

        it("should return 500 when GCS throws on file download", async () => {
            const testUser = createTestUser();
            const formId = uuidv4();
            const submissionId = uuidv4();
            const formInterface = createMockFormInterface({ id: formId, userId: testUser.id });
            const submission = {
                ...createMockSubmission({ id: submissionId, interfaceId: formId }),
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
            mockGCSService.getSignedDownloadUrl.mockRejectedValue(new Error("GCS error"));

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/form-interfaces/${formId}/submissions/${submissionId}/files/0/download`
            });

            expectErrorResponse(response, 500);
        });
    });
});
