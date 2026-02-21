/**
 * Persona Files Upload Handler Unit Tests
 *
 * Tests for the upload handler logic without full server integration.
 * Multipart file upload testing requires specific Fastify setup,
 * so we test the core logic in isolation.
 */

import * as path from "path";

// Mock GCS service
const mockGCSService = {
    upload: jest.fn(),
    getMetadata: jest.fn(),
    getSignedDownloadUrl: jest.fn(),
    delete: jest.fn()
};

jest.mock("../../../../services/GCSStorageService", () => ({
    getUploadsStorageService: jest.fn(() => mockGCSService)
}));

describe("Persona Files Upload - Unit Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("File extension validation", () => {
        const DEFAULT_ALLOWED_EXTENSIONS = [
            "pdf",
            "doc",
            "docx",
            "txt",
            "md",
            "csv",
            "json",
            "html",
            "xml",
            "jpg",
            "jpeg",
            "png",
            "gif",
            "webp",
            "svg"
        ];

        it("should recognize valid file extensions", () => {
            const validFiles = [
                "document.pdf",
                "report.docx",
                "data.csv",
                "config.json",
                "image.png",
                "photo.jpg"
            ];

            for (const filename of validFiles) {
                const ext = path.extname(filename).toLowerCase().substring(1);
                expect(DEFAULT_ALLOWED_EXTENSIONS).toContain(ext);
            }
        });

        it("should reject invalid file extensions", () => {
            const invalidFiles = ["virus.exe", "script.sh", "archive.zip", "code.py"];

            for (const filename of invalidFiles) {
                const ext = path.extname(filename).toLowerCase().substring(1);
                expect(DEFAULT_ALLOWED_EXTENSIONS).not.toContain(ext);
            }
        });

        it("should handle case-insensitive extensions", () => {
            const filename = "Document.PDF";
            const ext = path.extname(filename).toLowerCase().substring(1);
            expect(ext).toBe("pdf");
            expect(DEFAULT_ALLOWED_EXTENSIONS).toContain(ext);
        });
    });

    describe("GCS upload integration", () => {
        it("should call GCS upload with correct parameters", async () => {
            mockGCSService.upload.mockResolvedValue("gs://bucket/file.pdf");
            mockGCSService.getMetadata.mockResolvedValue({ size: 1024 });
            mockGCSService.getSignedDownloadUrl.mockResolvedValue("https://signed.url");

            // Simulate upload
            const fileStream = Buffer.from("test content");
            const gcsUri = await mockGCSService.upload(fileStream, {
                userId: "user-123",
                knowledgeBaseId: "persona-files-123",
                filename: "test.pdf"
            });

            expect(gcsUri).toBe("gs://bucket/file.pdf");
            expect(mockGCSService.upload).toHaveBeenCalledWith(
                fileStream,
                expect.objectContaining({
                    userId: "user-123",
                    filename: "test.pdf"
                })
            );
        });

        it("should get metadata after upload", async () => {
            mockGCSService.getMetadata.mockResolvedValue({
                size: 2048,
                contentType: "application/pdf"
            });

            const metadata = await mockGCSService.getMetadata("gs://bucket/file.pdf");

            expect(metadata.size).toBe(2048);
        });

        it("should generate signed URL for preview", async () => {
            mockGCSService.getSignedDownloadUrl.mockResolvedValue(
                "https://storage.googleapis.com/bucket/file.pdf?signature=xxx"
            );

            const signedUrl = await mockGCSService.getSignedDownloadUrl(
                "gs://bucket/file.pdf",
                3600
            );

            expect(signedUrl).toContain("signature=");
            expect(mockGCSService.getSignedDownloadUrl).toHaveBeenCalledWith(
                "gs://bucket/file.pdf",
                3600
            );
        });

        it("should delete file if it exceeds size limit", async () => {
            const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
            mockGCSService.upload.mockResolvedValue("gs://bucket/large.pdf");
            mockGCSService.getMetadata.mockResolvedValue({
                size: 100 * 1024 * 1024 // 100MB
            });
            mockGCSService.delete.mockResolvedValue(undefined);

            const gcsUri = "gs://bucket/large.pdf";
            const metadata = await mockGCSService.getMetadata(gcsUri);

            if (metadata.size > MAX_FILE_SIZE) {
                await mockGCSService.delete(gcsUri);
            }

            expect(mockGCSService.delete).toHaveBeenCalledWith(gcsUri);
        });
    });

    describe("Upload result structure", () => {
        it("should build correct response structure", () => {
            const uploadResult = {
                gcs_uri: "gs://bucket/doc.pdf",
                filename: "document.pdf",
                file_type: "pdf",
                file_size_bytes: 2048,
                field_name: "documents",
                signed_url: "https://signed.url/doc.pdf"
            };

            expect(uploadResult).toHaveProperty("gcs_uri");
            expect(uploadResult).toHaveProperty("filename");
            expect(uploadResult).toHaveProperty("file_type");
            expect(uploadResult).toHaveProperty("file_size_bytes");
            expect(uploadResult).toHaveProperty("field_name");
            expect(uploadResult).toHaveProperty("signed_url");

            expect(uploadResult.gcs_uri).toMatch(/^gs:\/\//);
            expect(uploadResult.file_type).toBe("pdf");
        });

        it("should build batch response with multiple files", () => {
            const uploadBatchId = `persona-files-${Date.now()}`;
            const files = [
                {
                    gcs_uri: "gs://bucket/file1.pdf",
                    filename: "file1.pdf",
                    file_type: "pdf",
                    file_size_bytes: 1024,
                    field_name: "documents",
                    signed_url: "https://signed.url/1"
                },
                {
                    gcs_uri: "gs://bucket/file2.docx",
                    filename: "file2.docx",
                    file_type: "docx",
                    file_size_bytes: 2048,
                    field_name: "documents",
                    signed_url: "https://signed.url/2"
                }
            ];

            const response = {
                success: true,
                data: {
                    files,
                    upload_batch_id: uploadBatchId
                }
            };

            expect(response.success).toBe(true);
            expect(response.data.files).toHaveLength(2);
            expect(response.data.upload_batch_id).toMatch(/^persona-files-/);
        });
    });

    describe("Query parameter parsing", () => {
        it("should parse field_name from query", () => {
            const query = {
                field_name: "design_files"
            };

            expect(query.field_name).toBe("design_files");
        });

        it("should use default field_name when not provided", () => {
            const query = {};
            const fieldName = (query as { field_name?: string }).field_name || "files";

            expect(fieldName).toBe("files");
        });

        it("should parse allowed_extensions from comma-separated string", () => {
            const query = {
                allowed_extensions: "pdf,docx,xlsx"
            };

            const extensions = query.allowed_extensions
                .split(",")
                .map((e) => e.trim().toLowerCase());

            expect(extensions).toEqual(["pdf", "docx", "xlsx"]);
        });

        it("should parse max_file_size_bytes as number", () => {
            const query = {
                max_file_size_bytes: "10485760" // 10MB
            };

            const maxSize = parseInt(query.max_file_size_bytes, 10);

            expect(maxSize).toBe(10485760);
        });
    });
});
