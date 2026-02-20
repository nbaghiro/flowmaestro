/**
 * Form Interface Submissions Route Tests
 *
 * Tests for submissions listing, file download, and asset upload operations.
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

jest.mock("../../../../storage/repositories/FormInterfaceRepository", () => ({
    FormInterfaceRepository: jest.fn().mockImplementation(() => mockFormInterfaceRepo)
}));

jest.mock("../../../../storage/repositories/FormInterfaceSubmissionRepository", () => ({
    FormInterfaceSubmissionRepository: jest.fn().mockImplementation(() => mockSubmissionRepo)
}));

jest.mock("../../../../storage/repositories", () => ({
    FormInterfaceRepository: jest.fn().mockImplementation(() => mockFormInterfaceRepo),
    FormInterfaceSubmissionRepository: jest.fn().mockImplementation(() => mockSubmissionRepo),
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
    unauthenticatedRequest,
    createTestServer,
    closeTestServer,
    createTestUser,
    expectStatus,
    expectSuccessResponse,
    expectErrorResponse
} from "../../../../../__tests__/helpers/fastify-test-client";
import { createMockFormInterface, createMockSubmission } from "./setup";

function resetAllMocks(): void {
    jest.clearAllMocks();
    mockFormInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);
    mockSubmissionRepo.findByInterfaceId.mockResolvedValue({ submissions: [], total: 0 });
    mockSubmissionRepo.findById.mockResolvedValue(null);
    mockGCSService.upload.mockResolvedValue("gs://test-bucket/test-file");
    mockGCSService.uploadBuffer.mockResolvedValue("gs://test-bucket/test-file");
    mockGCSService.getPublicUrl.mockReturnValue(
        "https://storage.googleapis.com/test-bucket/test-file"
    );
    mockGCSService.getSignedDownloadUrl.mockResolvedValue(
        "https://storage.googleapis.com/signed/test-file?token=abc"
    );
}

describe("Form Interface Submissions Routes", () => {
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

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/form-interfaces/${formId}/assets`,
                payload: {}
            });

            // Returns error because no multipart data provided
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
                        gcsUri: null
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
                query: { expiresIn: "7200" }
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
                query: { expiresIn: "999999999" }
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
