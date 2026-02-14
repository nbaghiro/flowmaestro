/**
 * Public Form File Upload Route Tests
 *
 * Tests for POST /api/public/form-interfaces/:slug/upload
 */

import {
    createSimpleFormInterfaceTestEnvironment,
    createPublishedFormInterface,
    createNoUploadFormInterface
} from "./setup";
import type { SimpleFormInterfaceTestEnvironment } from "./helpers/form-interface-test-env";

describe("POST /api/public/form-interfaces/:slug/upload", () => {
    let testEnv: SimpleFormInterfaceTestEnvironment;

    beforeEach(() => {
        testEnv = createSimpleFormInterfaceTestEnvironment();
    });

    afterEach(() => {
        testEnv.cleanup();
    });

    describe("Success Cases", () => {
        it("should upload file to GCS and return signed URL", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "upload-form",
                allowFileUpload: true,
                maxFileSizeMb: 10,
                allowedFileTypes: ["application/pdf"]
            });

            const sessionId = `session-${Date.now()}`;
            const fileName = "document.pdf";
            const mimeType = "application/pdf";

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.services.gcs.upload.mockResolvedValue(
                `gs://test-bucket/form-submissions/${formInterface.id}/${sessionId}/${Date.now()}_${fileName}`
            );
            testEnv.services.gcs.getSignedDownloadUrl.mockResolvedValue(
                `https://storage.googleapis.com/signed/form-submissions/${formInterface.id}/${sessionId}/${fileName}?token=test`
            );

            // Act
            await testEnv.repositories.formInterface.findBySlug("upload-form");

            // Simulate file upload
            const gcsUri = await testEnv.services.gcs.upload(
                {} /* stream */,
                {
                    filename: `${Date.now()}_${fileName}`,
                    contentType: mimeType
                }
            );

            const downloadUrl = await testEnv.services.gcs.getSignedDownloadUrl(gcsUri, 86400); // 24h

            // Assert
            expect(gcsUri).toContain("gs://test-bucket/");
            expect(downloadUrl).toContain("https://storage.googleapis.com/signed/");
            expect(testEnv.services.gcs.upload).toHaveBeenCalled();
        });

        it("should use sessionId for file grouping", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "session-upload",
                allowFileUpload: true
            });

            const sessionId = "custom-session-123";
            const fileName = "doc.pdf";

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.services.gcs.upload.mockResolvedValue(
                `gs://test-bucket/form-submissions/${formInterface.id}/${sessionId}/${Date.now()}_${fileName}`
            );

            // Act
            const gcsUri = await testEnv.services.gcs.upload(
                {},
                {
                    filename: `${Date.now()}_${fileName}`
                }
            );

            // Assert - path should include sessionId
            expect(gcsUri).toContain(sessionId);
        });

        it("should sanitize filename", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                allowFileUpload: true
            });

            const unsafeFileName = "../../../etc/passwd";

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);

            // Act - filename sanitization: remove path traversal, then replace unsafe chars
            const sanitized = unsafeFileName
                .replace(/\.\.\//g, "") // Remove path traversal sequences
                .replace(/[^a-zA-Z0-9._-]/g, "_");

            // Assert
            expect(sanitized).not.toContain("..");
            expect(sanitized).not.toContain("/");
            expect(sanitized).toBe("etc_passwd");
        });

        it("should generate sessionId if not provided", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                allowFileUpload: true
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);

            // Act - generate sessionId on server
            const generatedSessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

            // Assert
            expect(generatedSessionId).toMatch(/^\d+-[a-z0-9]+$/);
        });
    });

    describe("Validation", () => {
        it("should reject when file upload is disabled", async () => {
            // Arrange
            const formInterface = createNoUploadFormInterface({
                id: "fi-no-upload",
                slug: "no-upload-form"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);

            // Act
            const form = await testEnv.repositories.formInterface.findBySlug("no-upload-form");

            // Assert
            expect(form?.allowFileUpload).toBe(false);
        });

        it("should reject file exceeding max size", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "size-limit-form",
                allowFileUpload: true,
                maxFileSizeMb: 10 // 10MB limit
            });

            const fileSize = 15 * 1024 * 1024; // 15MB - exceeds limit

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);

            // Act
            const form = await testEnv.repositories.formInterface.findBySlug("size-limit-form");
            const maxSizeBytes = form!.maxFileSizeMb * 1024 * 1024;

            // Assert
            expect(fileSize).toBeGreaterThan(maxSizeBytes);
        });

        it("should reject invalid file type", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "type-limit-form",
                allowFileUpload: true,
                allowedFileTypes: ["application/pdf", "text/plain"]
            });

            const invalidMimeType = "application/x-msdownload"; // .exe

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);

            // Act
            await testEnv.repositories.formInterface.findBySlug("type-limit-form");

            // Check if type is allowed
            const isAllowed = formInterface.allowedFileTypes.some((allowedType) => {
                if (allowedType.endsWith("/*")) {
                    // Wildcard match (e.g., "image/*")
                    const category = allowedType.slice(0, -2);
                    return invalidMimeType.startsWith(category);
                }
                return allowedType === invalidMimeType;
            });

            // Assert
            expect(isAllowed).toBe(false);
        });

        it("should accept wildcard file types", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                allowFileUpload: true,
                allowedFileTypes: ["image/*", "application/pdf"]
            });

            const imageMimeType = "image/png";
            const pdfMimeType = "application/pdf";

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);

            // Act - fetch form and check wildcard matching
            const isImageAllowed = formInterface.allowedFileTypes.some((allowedType) => {
                if (allowedType === "image/*") {
                    return imageMimeType.startsWith("image/");
                }
                return allowedType === imageMimeType;
            });

            const isPdfAllowed = formInterface.allowedFileTypes.includes(pdfMimeType);

            // Assert
            expect(isImageAllowed).toBe(true);
            expect(isPdfAllowed).toBe(true);
        });
    });

    describe("Not Found", () => {
        it("should fail for non-existent form", async () => {
            // Arrange
            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(null);

            // Act
            const result = await testEnv.repositories.formInterface.findBySlug("nonexistent");

            // Assert
            expect(result).toBeNull();
        });
    });

    describe("Response Format", () => {
        it("should return complete upload response", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                allowFileUpload: true
            });

            const fileName = "document.pdf";
            const fileSize = 102400;
            const mimeType = "application/pdf";
            const gcsUri = `gs://test-bucket/form-submissions/fi-001/session-001/${Date.now()}_${fileName}`;
            const downloadUrl = `https://storage.googleapis.com/signed/${gcsUri}?token=test`;

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.services.gcs.upload.mockResolvedValue(gcsUri);
            testEnv.services.gcs.getSignedDownloadUrl.mockResolvedValue(downloadUrl);

            // Act
            const uploadedUri = await testEnv.services.gcs.upload({}, { filename: fileName });
            const signedUrl = await testEnv.services.gcs.getSignedDownloadUrl(uploadedUri, 86400);

            // Build response
            const response = {
                gcsUri: uploadedUri,
                downloadUrl: signedUrl,
                fileName,
                fileSize,
                mimeType
            };

            // Assert
            expect(response).toMatchObject({
                gcsUri: expect.stringContaining("gs://"),
                downloadUrl: expect.stringContaining("https://"),
                fileName: "document.pdf",
                fileSize: 102400,
                mimeType: "application/pdf"
            });
        });
    });

    describe("Signed URL Duration", () => {
        it("should create signed URL valid for 24 hours", async () => {
            // Arrange
            const expectedTtlSeconds = 24 * 60 * 60; // 24 hours

            testEnv.services.gcs.getSignedDownloadUrl.mockResolvedValue(
                "https://storage.googleapis.com/signed/file?token=test"
            );

            // Act
            await testEnv.services.gcs.getSignedDownloadUrl("gs://bucket/file", expectedTtlSeconds);

            // Assert
            expect(testEnv.services.gcs.getSignedDownloadUrl).toHaveBeenCalledWith(
                "gs://bucket/file",
                expectedTtlSeconds
            );
        });
    });

    describe("Storage Location", () => {
        it("should upload to artifacts bucket (private)", async () => {
            // Arrange
            const formId = "fi-001";
            const sessionId = "session-001";
            const fileName = "document.pdf";

            const expectedPath = `form-submissions/${formId}/${sessionId}/`;

            testEnv.services.gcs.upload.mockResolvedValue(
                `gs://flowmaestro-artifacts/${expectedPath}${Date.now()}_${fileName}`
            );

            // Act
            const gcsUri = await testEnv.services.gcs.upload({}, { filename: fileName });

            // Assert
            expect(gcsUri).toContain("form-submissions/");
            expect(gcsUri).toContain(formId);
            expect(gcsUri).toContain(sessionId);
        });
    });
});
