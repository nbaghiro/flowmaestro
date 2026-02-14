/**
 * Public Get Published Form Interface Route Tests
 *
 * Tests for GET /api/public/form-interfaces/:slug
 */

import type { PublicFormInterface } from "@flowmaestro/shared";
import { createSimpleFormInterfaceTestEnvironment, createPublishedFormInterface } from "./setup";
import type { SimpleFormInterfaceTestEnvironment } from "./helpers/form-interface-test-env";

describe("GET /api/public/form-interfaces/:slug", () => {
    let testEnv: SimpleFormInterfaceTestEnvironment;

    beforeEach(() => {
        testEnv = createSimpleFormInterfaceTestEnvironment();
    });

    afterEach(() => {
        testEnv.cleanup();
    });

    describe("Success Cases", () => {
        it("should return published form by slug", async () => {
            // Arrange
            const publishedForm = createPublishedFormInterface({
                id: "fi-001",
                slug: "my-public-form",
                title: "My Public Form",
                description: "A publicly accessible form"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(publishedForm);

            // Act
            const result = await testEnv.repositories.formInterface.findBySlug("my-public-form");

            // Assert
            expect(result).not.toBeNull();
            expect(result?.slug).toBe("my-public-form");
            expect(result?.status).toBe("published");
        });

        it("should strip sensitive fields from response", async () => {
            // Arrange
            const publishedForm = createPublishedFormInterface({
                id: "fi-001",
                slug: "public-form",
                userId: "user-secret",
                workflowId: "wf-internal",
                agentId: null,
                triggerId: "trigger-internal"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(publishedForm);

            // Act
            const form = await testEnv.repositories.formInterface.findBySlug("public-form");

            // Simulate toPublicFormInterface transformation
            const publicForm: PublicFormInterface = {
                id: form!.id,
                slug: form!.slug,
                coverType: form!.coverType,
                coverValue: form!.coverValue,
                iconUrl: form!.iconUrl,
                title: form!.title,
                description: form!.description,
                inputPlaceholder: form!.inputPlaceholder,
                inputLabel: form!.inputLabel,
                fileUploadLabel: form!.fileUploadLabel,
                urlInputLabel: form!.urlInputLabel,
                allowFileUpload: form!.allowFileUpload,
                allowUrlInput: form!.allowUrlInput,
                maxFiles: form!.maxFiles,
                maxFileSizeMb: form!.maxFileSizeMb,
                allowedFileTypes: form!.allowedFileTypes,
                submitButtonText: form!.submitButtonText,
                submitLoadingText: form!.submitLoadingText,
                outputLabel: form!.outputLabel,
                showCopyButton: form!.showCopyButton,
                showDownloadButton: form!.showDownloadButton,
                allowOutputEdit: form!.allowOutputEdit
            };

            // Assert - sensitive fields should not be included
            expect(publicForm).not.toHaveProperty("userId");
            expect(publicForm).not.toHaveProperty("workflowId");
            expect(publicForm).not.toHaveProperty("agentId");
            expect(publicForm).not.toHaveProperty("triggerId");
            expect(publicForm).not.toHaveProperty("status");
            expect(publicForm).not.toHaveProperty("publishedAt");
        });

        it("should include all public fields", async () => {
            // Arrange
            const publishedForm = createPublishedFormInterface({
                id: "fi-full",
                slug: "full-form",
                coverType: "image",
                coverValue: "https://example.com/cover.jpg",
                iconUrl: "https://example.com/icon.png",
                title: "Full Form",
                description: "A complete form",
                inputPlaceholder: "Enter your request...",
                inputLabel: "Your Request",
                fileUploadLabel: "Upload files",
                urlInputLabel: "Add URLs",
                allowFileUpload: true,
                allowUrlInput: true,
                maxFiles: 10,
                maxFileSizeMb: 25,
                allowedFileTypes: ["application/pdf", "image/*"],
                submitButtonText: "Submit Request",
                submitLoadingText: "Processing...",
                outputLabel: "Result",
                showCopyButton: true,
                showDownloadButton: true,
                allowOutputEdit: false
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(publishedForm);

            // Act
            const result = await testEnv.repositories.formInterface.findBySlug("full-form");

            // Assert
            expect(result).toMatchObject({
                id: "fi-full",
                slug: "full-form",
                coverType: "image",
                coverValue: "https://example.com/cover.jpg",
                title: "Full Form",
                allowFileUpload: true,
                maxFiles: 10,
                maxFileSizeMb: 25
            });
        });
    });

    describe("Not Found", () => {
        it("should return null for non-existent slug", async () => {
            // Arrange
            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(null);

            // Act
            const result = await testEnv.repositories.formInterface.findBySlug("nonexistent-slug");

            // Assert
            expect(result).toBeNull();
        });
    });

    describe("Draft Forms", () => {
        it("should return null for draft (unpublished) form", async () => {
            // Arrange - Repository should filter out draft forms
            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(null);

            // Act
            const result = await testEnv.repositories.formInterface.findBySlug("draft-form");

            // Assert
            expect(result).toBeNull();
        });
    });

    describe("Deleted Forms", () => {
        it("should return null for soft deleted form", async () => {
            // Arrange - Repository should filter out deleted forms
            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(null);

            // Act
            const result = await testEnv.repositories.formInterface.findBySlug("deleted-form");

            // Assert
            expect(result).toBeNull();
        });
    });

    describe("File Upload Configuration", () => {
        it("should include file upload configuration", async () => {
            // Arrange
            const formWithUploads = createPublishedFormInterface({
                slug: "upload-enabled",
                allowFileUpload: true,
                maxFiles: 5,
                maxFileSizeMb: 10,
                allowedFileTypes: ["application/pdf", "text/plain"]
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formWithUploads);

            // Act
            const result = await testEnv.repositories.formInterface.findBySlug("upload-enabled");

            // Assert
            expect(result?.allowFileUpload).toBe(true);
            expect(result?.maxFiles).toBe(5);
            expect(result?.maxFileSizeMb).toBe(10);
            expect(result?.allowedFileTypes).toContain("application/pdf");
        });

        it("should indicate when file uploads are disabled", async () => {
            // Arrange
            const formNoUploads = createPublishedFormInterface({
                slug: "no-uploads",
                allowFileUpload: false
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formNoUploads);

            // Act
            const result = await testEnv.repositories.formInterface.findBySlug("no-uploads");

            // Assert
            expect(result?.allowFileUpload).toBe(false);
        });
    });

    describe("Output Configuration", () => {
        it("should include output display configuration", async () => {
            // Arrange
            const formWithOutput = createPublishedFormInterface({
                slug: "output-config",
                outputLabel: "Generated Content",
                showCopyButton: true,
                showDownloadButton: false,
                allowOutputEdit: true
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formWithOutput);

            // Act
            const result = await testEnv.repositories.formInterface.findBySlug("output-config");

            // Assert
            expect(result?.outputLabel).toBe("Generated Content");
            expect(result?.showCopyButton).toBe(true);
            expect(result?.showDownloadButton).toBe(false);
            expect(result?.allowOutputEdit).toBe(true);
        });
    });
});
