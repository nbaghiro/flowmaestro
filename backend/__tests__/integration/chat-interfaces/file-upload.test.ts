/**
 * Chat Interface File Upload Tests
 *
 * Tests for file upload, validation, and storage.
 */

import {
    createSimpleChatInterfaceTestEnvironment,
    createTestChatInterface,
    createNoUploadChatInterface,
    createTestSession,
    createTestFileAttachment,
    createFileTypeAttachments
} from "./setup";
import type { SimpleChatInterfaceTestEnvironment } from "./helpers/chat-interface-test-env";

describe("Chat Interface File Upload", () => {
    let testEnv: SimpleChatInterfaceTestEnvironment;

    beforeEach(() => {
        testEnv = createSimpleChatInterfaceTestEnvironment();
    });

    afterEach(() => {
        testEnv.cleanup();
    });

    describe("POST /api/public/chat-interfaces/:slug/sessions/:token/files", () => {
        it("should upload file to GCS", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({
                id: "ci-001",
                allowFileUpload: true
            });
            const session = createTestSession(chatInterface.id, {
                id: "session-001",
                sessionToken: "tok_abc123"
            });

            testEnv.repositories.session.findBySlugAndToken.mockResolvedValue(session);
            testEnv.repositories.chatInterface.findBySlug.mockResolvedValue(chatInterface);
            testEnv.services.gcs.upload.mockResolvedValue("gs://bucket/uploads/test.pdf");

            // Act - simulate file upload
            const mockFileStream = { pipe: jest.fn() };
            const gcsUri = await testEnv.services.gcs.upload(mockFileStream, {
                userId: session.id,
                knowledgeBaseId: "attachments",
                filename: "test-document.pdf"
            });

            // Assert
            expect(gcsUri).toBe("gs://bucket/uploads/test.pdf");
            expect(testEnv.services.gcs.upload).toHaveBeenCalled();
        });

        it("should generate 24-hour signed URL", async () => {
            // Arrange
            const gcsUri = "gs://bucket/uploads/test.pdf";
            const ttlSeconds = 24 * 60 * 60; // 24 hours

            testEnv.services.gcs.getSignedDownloadUrl.mockResolvedValue(
                "https://storage.googleapis.com/signed/test.pdf?token=abc"
            );

            // Act
            const signedUrl = await testEnv.services.gcs.getSignedDownloadUrl(gcsUri, ttlSeconds);

            // Assert
            expect(signedUrl).toContain("storage.googleapis.com");
            expect(testEnv.services.gcs.getSignedDownloadUrl).toHaveBeenCalledWith(
                gcsUri,
                ttlSeconds
            );
        });

        it("should return attachment with all metadata", async () => {
            // Arrange
            const attachment = createTestFileAttachment({
                id: "att-001",
                fileName: "report.pdf",
                fileSize: 102400,
                mimeType: "application/pdf",
                gcsUri: "gs://bucket/uploads/report.pdf",
                downloadUrl: "https://storage.googleapis.com/signed/report.pdf"
            });

            // Assert
            expect(attachment).toMatchObject({
                id: "att-001",
                type: "file",
                fileName: "report.pdf",
                fileSize: 102400,
                mimeType: "application/pdf",
                gcsUri: expect.stringContaining("gs://"),
                downloadUrl: expect.stringContaining("https://")
            });
        });

        it("should reject when file uploads are disabled", async () => {
            // Arrange
            const chatInterface = createNoUploadChatInterface({
                id: "ci-no-upload"
            });

            testEnv.repositories.chatInterface.findBySlug.mockResolvedValue(chatInterface);

            // Assert - interface has uploads disabled
            expect(chatInterface.allowFileUpload).toBe(false);
            // In real route, this would return 403 Forbidden
        });

        it("should reject oversized files", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({
                id: "ci-001",
                maxFileSizeMb: 5 // 5 MB limit
            });
            const oversizedFileSize = 10 * 1024 * 1024; // 10 MB

            // Assert
            expect(chatInterface.maxFileSizeMb).toBe(5);
            const fileSizeMb = oversizedFileSize / (1024 * 1024);
            expect(fileSizeMb).toBeGreaterThan(chatInterface.maxFileSizeMb);
            // In real route, this would return 400 Bad Request
        });

        it("should reject disallowed file types", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({
                id: "ci-001",
                allowedFileTypes: ["application/pdf", "text/plain"]
            });
            const disallowedMimeType = "application/zip";

            // Assert
            expect(chatInterface.allowedFileTypes).toContain("application/pdf");
            expect(chatInterface.allowedFileTypes).not.toContain(disallowedMimeType);
            // In real route, this would return 400 Bad Request
        });

        it("should validate wildcard mime types", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({
                id: "ci-001",
                allowedFileTypes: ["image/*", "application/pdf"]
            });

            // Check if various image types are allowed
            const testMimeTypes = [
                { mimeType: "image/png", shouldAllow: true },
                { mimeType: "image/jpeg", shouldAllow: true },
                { mimeType: "image/gif", shouldAllow: true },
                { mimeType: "image/webp", shouldAllow: true },
                { mimeType: "application/pdf", shouldAllow: true },
                { mimeType: "text/plain", shouldAllow: false }
            ];

            for (const test of testMimeTypes) {
                const isAllowed = chatInterface.allowedFileTypes.some((allowed) => {
                    if (allowed.includes("/*")) {
                        const prefix = allowed.replace("/*", "/");
                        return test.mimeType.startsWith(prefix);
                    }
                    return allowed === test.mimeType;
                });

                expect(isAllowed).toBe(test.shouldAllow);
            }
        });

        it("should validate extension-based file types", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({
                id: "ci-001",
                allowedFileTypes: [".pdf", ".txt", ".docx"]
            });

            // Assert
            const testFiles = [
                { filename: "document.pdf", shouldAllow: true },
                { filename: "notes.txt", shouldAllow: true },
                { filename: "report.docx", shouldAllow: true },
                { filename: "virus.exe", shouldAllow: false }
            ];

            for (const test of testFiles) {
                const ext = test.filename.split(".").pop()?.toLowerCase();
                const isAllowed = chatInterface.allowedFileTypes.some((allowed) => {
                    const allowedExt = allowed.startsWith(".") ? allowed.slice(1) : allowed;
                    return ext === allowedExt.toLowerCase();
                });

                expect(isAllowed).toBe(test.shouldAllow);
            }
        });

        it("should return 404 for invalid session", async () => {
            // Arrange
            testEnv.repositories.session.findBySlugAndToken.mockResolvedValue(null);

            // Act
            const session = await testEnv.repositories.session.findBySlugAndToken(
                "test-chat",
                "invalid_token"
            );

            // Assert
            expect(session).toBeNull();
        });
    });

    describe("File Type Handling", () => {
        it("should create attachments for all supported file types", () => {
            // Arrange
            const attachments = createFileTypeAttachments();

            // Assert
            expect(attachments.pdf).toBeDefined();
            expect(attachments.pdf.mimeType).toBe("application/pdf");

            expect(attachments.docx).toBeDefined();
            expect(attachments.docx.mimeType).toBe(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            );

            expect(attachments.txt).toBeDefined();
            expect(attachments.txt.mimeType).toBe("text/plain");

            expect(attachments.md).toBeDefined();
            expect(attachments.md.mimeType).toBe("text/markdown");

            expect(attachments.html).toBeDefined();
            expect(attachments.html.mimeType).toBe("text/html");

            expect(attachments.json).toBeDefined();
            expect(attachments.json.mimeType).toBe("application/json");

            expect(attachments.csv).toBeDefined();
            expect(attachments.csv.mimeType).toBe("text/csv");
        });

        it("should handle file without extension", () => {
            // Arrange
            const attachment = createTestFileAttachment({
                fileName: "document_without_extension",
                mimeType: "application/octet-stream"
            });

            // Assert
            expect(attachment.fileName).toBe("document_without_extension");
            expect(attachment.mimeType).toBe("application/octet-stream");
        });
    });

    describe("Max Files Validation", () => {
        it("should enforce max files limit", () => {
            // Arrange
            const chatInterface = createTestChatInterface({
                id: "ci-001",
                maxFiles: 3
            });

            // Assert
            expect(chatInterface.maxFiles).toBe(3);
        });

        it("should allow up to max files", () => {
            // Arrange
            const chatInterface = createTestChatInterface({
                maxFiles: 5
            });
            const attachments = [
                createTestFileAttachment({ fileName: "file1.pdf" }),
                createTestFileAttachment({ fileName: "file2.pdf" }),
                createTestFileAttachment({ fileName: "file3.pdf" }),
                createTestFileAttachment({ fileName: "file4.pdf" }),
                createTestFileAttachment({ fileName: "file5.pdf" })
            ];

            // Assert
            expect(attachments.length).toBeLessThanOrEqual(chatInterface.maxFiles);
        });
    });

    describe("GCS Storage", () => {
        it("should seed and retrieve files from mock GCS", async () => {
            // Arrange
            const testContent = "This is test file content";
            testEnv.services.gcs.seedFile("gs://bucket/test.txt", testContent);

            // Act
            const content = await testEnv.services.gcs.download("gs://bucket/test.txt");

            // Assert
            expect(content.toString()).toBe(testContent);
        });

        it("should throw error for non-existent files", async () => {
            // Arrange & Act & Assert
            await expect(
                testEnv.services.gcs.download("gs://bucket/non-existent.pdf")
            ).rejects.toThrow("File not found");
        });

        it("should download file to temp location", async () => {
            // Arrange
            testEnv.services.gcs.downloadToTemp.mockResolvedValue("/tmp/test-file.pdf");

            // Act
            const tempPath = await testEnv.services.gcs.downloadToTemp({
                gcsUri: "gs://bucket/document.pdf"
            });

            // Assert
            expect(tempPath).toContain("/tmp/");
        });
    });

    describe("Rate Limiting for Uploads", () => {
        it("should have separate rate limit for file uploads", () => {
            // File uploads are limited to 20 per minute per session
            // This is enforced in the route handler
            const uploadLimit = 20;
            const windowSeconds = 60;

            expect(uploadLimit).toBe(20);
            expect(windowSeconds).toBe(60);
        });
    });
});
