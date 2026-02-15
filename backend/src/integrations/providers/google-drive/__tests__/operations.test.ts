/**
 * GoogleDrive Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import {
    executeCopyFile,
    copyFileSchema,
    executeCreateFolder,
    createFolderSchema,
    executeDeleteFile,
    deleteFileSchema,
    executeDownloadFile,
    downloadFileSchema,
    executeExportDocument,
    exportDocumentSchema,
    executeGetFile,
    getFileSchema,
    executeListFiles,
    listFilesSchema,
    executeListPermissions,
    listPermissionsSchema,
    executeMoveFile,
    moveFileSchema,
    executeRevokePermission,
    revokePermissionSchema,
    executeShareFile,
    shareFileSchema,
    executeTrashFile,
    trashFileSchema,
    executeUpdateFile,
    updateFileSchema,
    executeUploadFile,
    uploadFileSchema
} from "../operations";
import type { GoogleDriveClient } from "../client/GoogleDriveClient";

// Mock GoogleDriveClient factory
function createMockGoogleDriveClient(): jest.Mocked<GoogleDriveClient> {
    return {
        getFile: jest.fn(),
        listFiles: jest.fn(),
        createFile: jest.fn(),
        updateFile: jest.fn(),
        deleteFile: jest.fn(),
        copyFile: jest.fn(),
        moveFile: jest.fn(),
        downloadFile: jest.fn(),
        exportDocument: jest.fn(),
        uploadFile: jest.fn(),
        createPermission: jest.fn(),
        listPermissions: jest.fn(),
        deletePermission: jest.fn(),
        getAbout: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<GoogleDriveClient>;
}

describe("GoogleDrive Operation Executors", () => {
    let mockClient: jest.Mocked<GoogleDriveClient>;

    beforeEach(() => {
        mockClient = createMockGoogleDriveClient();
    });

    describe("executeGetFile", () => {
        it("calls client with correct params", async () => {
            mockClient.getFile.mockResolvedValueOnce({
                id: "file123",
                name: "test.pdf",
                mimeType: "application/pdf"
            });

            await executeGetFile(mockClient, {
                fileId: "file123"
            });

            expect(mockClient.getFile).toHaveBeenCalledWith(
                "file123",
                "id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink"
            );
        });

        it("uses custom fields when provided", async () => {
            mockClient.getFile.mockResolvedValueOnce({
                id: "file123",
                name: "test.pdf"
            });

            await executeGetFile(mockClient, {
                fileId: "file123",
                fields: "id,name"
            });

            expect(mockClient.getFile).toHaveBeenCalledWith("file123", "id,name");
        });

        it("returns normalized output on success", async () => {
            const fileData = {
                id: "file123",
                name: "test.pdf",
                mimeType: "application/pdf",
                size: "1024",
                webViewLink: "https://drive.google.com/file/d/file123/view"
            };

            mockClient.getFile.mockResolvedValueOnce(fileData);

            const result = await executeGetFile(mockClient, {
                fileId: "file123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(fileData);
        });

        it("returns error on client failure", async () => {
            mockClient.getFile.mockRejectedValueOnce(new Error("File not found"));

            const result = await executeGetFile(mockClient, {
                fileId: "nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("File not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getFile.mockRejectedValueOnce("string error");

            const result = await executeGetFile(mockClient, {
                fileId: "file123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get file metadata");
        });
    });

    describe("executeListFiles", () => {
        it("calls client with default params", async () => {
            mockClient.listFiles.mockResolvedValueOnce({
                files: [],
                nextPageToken: undefined
            });

            await executeListFiles(mockClient, {});

            expect(mockClient.listFiles).toHaveBeenCalledWith({
                q: undefined,
                pageSize: 100,
                pageToken: undefined,
                orderBy: undefined,
                fields: "nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink)"
            });
        });

        it("calls client with custom params", async () => {
            mockClient.listFiles.mockResolvedValueOnce({
                files: [],
                nextPageToken: undefined
            });

            await executeListFiles(mockClient, {
                query: "'folder123' in parents",
                pageSize: 50,
                orderBy: "modifiedTime desc"
            });

            expect(mockClient.listFiles).toHaveBeenCalledWith({
                q: "'folder123' in parents",
                pageSize: 50,
                pageToken: undefined,
                orderBy: "modifiedTime desc",
                fields: "nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink)"
            });
        });

        it("returns normalized output on success", async () => {
            const filesData = {
                files: [
                    { id: "file1", name: "doc.pdf", mimeType: "application/pdf" },
                    { id: "file2", name: "sheet.xlsx", mimeType: "application/vnd.ms-excel" }
                ],
                nextPageToken: "token123"
            };

            mockClient.listFiles.mockResolvedValueOnce(filesData);

            const result = await executeListFiles(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual(filesData);
        });

        it("passes pagination token", async () => {
            mockClient.listFiles.mockResolvedValueOnce({
                files: [],
                nextPageToken: undefined
            });

            await executeListFiles(mockClient, {
                pageToken: "nextPage123"
            });

            expect(mockClient.listFiles).toHaveBeenCalledWith(
                expect.objectContaining({
                    pageToken: "nextPage123"
                })
            );
        });

        it("returns error on client failure", async () => {
            mockClient.listFiles.mockRejectedValueOnce(new Error("Insufficient permissions"));

            const result = await executeListFiles(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Insufficient permissions");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeCreateFolder", () => {
        it("calls client with minimal params", async () => {
            mockClient.createFile.mockResolvedValueOnce({
                id: "folder123",
                name: "New Folder",
                mimeType: "application/vnd.google-apps.folder"
            });

            await executeCreateFolder(mockClient, {
                folderName: "New Folder"
            });

            expect(mockClient.createFile).toHaveBeenCalledWith({
                name: "New Folder",
                mimeType: "application/vnd.google-apps.folder"
            });
        });

        it("calls client with parent folder", async () => {
            mockClient.createFile.mockResolvedValueOnce({
                id: "folder456",
                name: "Subfolder"
            });

            await executeCreateFolder(mockClient, {
                folderName: "Subfolder",
                parentFolderId: "parentFolder123"
            });

            expect(mockClient.createFile).toHaveBeenCalledWith({
                name: "Subfolder",
                mimeType: "application/vnd.google-apps.folder",
                parents: ["parentFolder123"]
            });
        });

        it("calls client with description", async () => {
            mockClient.createFile.mockResolvedValueOnce({
                id: "folder789",
                name: "Documented Folder"
            });

            await executeCreateFolder(mockClient, {
                folderName: "Documented Folder",
                description: "This folder contains important documents"
            });

            expect(mockClient.createFile).toHaveBeenCalledWith({
                name: "Documented Folder",
                mimeType: "application/vnd.google-apps.folder",
                description: "This folder contains important documents"
            });
        });

        it("returns normalized output on success", async () => {
            const folderData = {
                id: "folder123",
                name: "New Folder",
                mimeType: "application/vnd.google-apps.folder",
                webViewLink: "https://drive.google.com/drive/folders/folder123"
            };

            mockClient.createFile.mockResolvedValueOnce(folderData);

            const result = await executeCreateFolder(mockClient, {
                folderName: "New Folder"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(folderData);
        });

        it("returns error on client failure", async () => {
            mockClient.createFile.mockRejectedValueOnce(new Error("Quota exceeded"));

            const result = await executeCreateFolder(mockClient, {
                folderName: "New Folder"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Quota exceeded");
        });
    });

    describe("executeCopyFile", () => {
        it("calls client with minimal params", async () => {
            mockClient.copyFile.mockResolvedValueOnce({
                id: "copyFile456",
                name: "Copy of original.pdf"
            });

            await executeCopyFile(mockClient, {
                fileId: "originalFile123"
            });

            expect(mockClient.copyFile).toHaveBeenCalledWith("originalFile123", {});
        });

        it("calls client with new name", async () => {
            mockClient.copyFile.mockResolvedValueOnce({
                id: "copyFile456",
                name: "renamed-copy.pdf"
            });

            await executeCopyFile(mockClient, {
                fileId: "originalFile123",
                newName: "renamed-copy.pdf"
            });

            expect(mockClient.copyFile).toHaveBeenCalledWith("originalFile123", {
                name: "renamed-copy.pdf"
            });
        });

        it("calls client with parent folder", async () => {
            mockClient.copyFile.mockResolvedValueOnce({
                id: "copyFile456",
                name: "Copy of original.pdf"
            });

            await executeCopyFile(mockClient, {
                fileId: "originalFile123",
                parentFolderId: "targetFolder789"
            });

            expect(mockClient.copyFile).toHaveBeenCalledWith("originalFile123", {
                parents: ["targetFolder789"]
            });
        });

        it("calls client with all params", async () => {
            mockClient.copyFile.mockResolvedValueOnce({
                id: "copyFile456",
                name: "new-name.pdf"
            });

            await executeCopyFile(mockClient, {
                fileId: "originalFile123",
                newName: "new-name.pdf",
                parentFolderId: "targetFolder789"
            });

            expect(mockClient.copyFile).toHaveBeenCalledWith("originalFile123", {
                name: "new-name.pdf",
                parents: ["targetFolder789"]
            });
        });

        it("returns normalized output on success", async () => {
            const copyData = {
                id: "copyFile456",
                name: "Copy of original.pdf",
                mimeType: "application/pdf"
            };

            mockClient.copyFile.mockResolvedValueOnce(copyData);

            const result = await executeCopyFile(mockClient, {
                fileId: "originalFile123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(copyData);
        });

        it("returns error on client failure", async () => {
            mockClient.copyFile.mockRejectedValueOnce(new Error("Source file not found"));

            const result = await executeCopyFile(mockClient, {
                fileId: "nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Source file not found");
        });
    });

    describe("executeDeleteFile", () => {
        it("calls client with correct params", async () => {
            mockClient.deleteFile.mockResolvedValueOnce(undefined);

            await executeDeleteFile(mockClient, {
                fileId: "fileToDelete123"
            });

            expect(mockClient.deleteFile).toHaveBeenCalledWith("fileToDelete123");
        });

        it("returns normalized output on success", async () => {
            mockClient.deleteFile.mockResolvedValueOnce(undefined);

            const result = await executeDeleteFile(mockClient, {
                fileId: "fileToDelete123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                fileId: "fileToDelete123",
                deleted: true
            });
        });

        it("returns error on client failure", async () => {
            mockClient.deleteFile.mockRejectedValueOnce(new Error("Permission denied"));

            const result = await executeDeleteFile(mockClient, {
                fileId: "fileToDelete123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Permission denied");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeDownloadFile", () => {
        it("calls client with correct params", async () => {
            const mockBlob = new Blob(["test content"], { type: "text/plain" });
            mockClient.downloadFile.mockResolvedValueOnce(mockBlob);

            await executeDownloadFile(mockClient, {
                fileId: "fileToDownload123"
            });

            expect(mockClient.downloadFile).toHaveBeenCalledWith("fileToDownload123");
        });

        it("returns normalized output with base64 content on success", async () => {
            const mockContent = "test file content";
            const mockBlob = new Blob([mockContent], { type: "text/plain" });
            mockClient.downloadFile.mockResolvedValueOnce(mockBlob);

            const result = await executeDownloadFile(mockClient, {
                fileId: "fileToDownload123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty("fileId", "fileToDownload123");
            expect(result.data).toHaveProperty("content");
            expect(result.data).toHaveProperty("contentType", "text/plain");
        });

        it("returns error on client failure", async () => {
            mockClient.downloadFile.mockRejectedValueOnce(
                new Error("Cannot download Google Workspace files")
            );

            const result = await executeDownloadFile(mockClient, {
                fileId: "googleDoc123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Cannot download Google Workspace files");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeExportDocument", () => {
        it("calls client with correct params", async () => {
            const mockBlob = new Blob(["exported content"], { type: "application/pdf" });
            mockClient.exportDocument.mockResolvedValueOnce(mockBlob);

            await executeExportDocument(mockClient, {
                fileId: "googleDoc123",
                mimeType: "application/pdf"
            });

            expect(mockClient.exportDocument).toHaveBeenCalledWith(
                "googleDoc123",
                "application/pdf"
            );
        });

        it("returns normalized output with base64 content on success", async () => {
            const mockBlob = new Blob(["exported content"], { type: "application/pdf" });
            mockClient.exportDocument.mockResolvedValueOnce(mockBlob);

            const result = await executeExportDocument(mockClient, {
                fileId: "googleDoc123",
                mimeType: "application/pdf"
            });

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty("fileId", "googleDoc123");
            expect(result.data).toHaveProperty("mimeType", "application/pdf");
            expect(result.data).toHaveProperty("content");
            expect(result.data).toHaveProperty("contentType", "application/pdf");
        });

        it("returns error on client failure", async () => {
            mockClient.exportDocument.mockRejectedValueOnce(
                new Error("Export format not supported")
            );

            const result = await executeExportDocument(mockClient, {
                fileId: "googleDoc123",
                mimeType: "application/invalid"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Export format not supported");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeMoveFile", () => {
        it("calls client with correct params", async () => {
            mockClient.moveFile.mockResolvedValueOnce({
                id: "movedFile123",
                name: "document.pdf",
                parents: ["newFolder456"]
            });

            await executeMoveFile(mockClient, {
                fileId: "file123",
                newFolderId: "newFolder456",
                oldFolderId: "oldFolder789"
            });

            expect(mockClient.moveFile).toHaveBeenCalledWith(
                "file123",
                "newFolder456",
                "oldFolder789"
            );
        });

        it("returns normalized output on success", async () => {
            const movedFile = {
                id: "movedFile123",
                name: "document.pdf",
                parents: ["newFolder456"]
            };

            mockClient.moveFile.mockResolvedValueOnce(movedFile);

            const result = await executeMoveFile(mockClient, {
                fileId: "file123",
                newFolderId: "newFolder456",
                oldFolderId: "oldFolder789"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(movedFile);
        });

        it("returns error on client failure", async () => {
            mockClient.moveFile.mockRejectedValueOnce(new Error("Target folder not found"));

            const result = await executeMoveFile(mockClient, {
                fileId: "file123",
                newFolderId: "nonexistent",
                oldFolderId: "oldFolder789"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Target folder not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeTrashFile", () => {
        it("calls client with correct params", async () => {
            mockClient.updateFile.mockResolvedValueOnce({
                id: "trashedFile123",
                trashed: true
            });

            await executeTrashFile(mockClient, {
                fileId: "fileToTrash123"
            });

            expect(mockClient.updateFile).toHaveBeenCalledWith("fileToTrash123", {
                trashed: true
            });
        });

        it("returns normalized output on success", async () => {
            const trashedFile = {
                id: "trashedFile123",
                name: "old-document.pdf",
                trashed: true
            };

            mockClient.updateFile.mockResolvedValueOnce(trashedFile);

            const result = await executeTrashFile(mockClient, {
                fileId: "fileToTrash123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(trashedFile);
        });

        it("returns error on client failure", async () => {
            mockClient.updateFile.mockRejectedValueOnce(new Error("File not found"));

            const result = await executeTrashFile(mockClient, {
                fileId: "nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("File not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeUpdateFile", () => {
        it("calls client with name update", async () => {
            mockClient.updateFile.mockResolvedValueOnce({
                id: "file123",
                name: "renamed-file.pdf"
            });

            await executeUpdateFile(mockClient, {
                fileId: "file123",
                name: "renamed-file.pdf"
            });

            expect(mockClient.updateFile).toHaveBeenCalledWith("file123", {
                name: "renamed-file.pdf"
            });
        });

        it("calls client with description update", async () => {
            mockClient.updateFile.mockResolvedValueOnce({
                id: "file123",
                description: "New description"
            });

            await executeUpdateFile(mockClient, {
                fileId: "file123",
                description: "New description"
            });

            expect(mockClient.updateFile).toHaveBeenCalledWith("file123", {
                description: "New description"
            });
        });

        it("calls client with both name and description", async () => {
            mockClient.updateFile.mockResolvedValueOnce({
                id: "file123",
                name: "new-name.pdf",
                description: "New description"
            });

            await executeUpdateFile(mockClient, {
                fileId: "file123",
                name: "new-name.pdf",
                description: "New description"
            });

            expect(mockClient.updateFile).toHaveBeenCalledWith("file123", {
                name: "new-name.pdf",
                description: "New description"
            });
        });

        it("returns validation error when no updates provided", async () => {
            const result = await executeUpdateFile(mockClient, {
                fileId: "file123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("validation");
            expect(result.error?.message).toBe(
                "At least one of name or description must be provided"
            );
            expect(result.error?.retryable).toBe(false);
            expect(mockClient.updateFile).not.toHaveBeenCalled();
        });

        it("returns normalized output on success", async () => {
            const updatedFile = {
                id: "file123",
                name: "new-name.pdf",
                description: "New description"
            };

            mockClient.updateFile.mockResolvedValueOnce(updatedFile);

            const result = await executeUpdateFile(mockClient, {
                fileId: "file123",
                name: "new-name.pdf"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(updatedFile);
        });

        it("returns error on client failure", async () => {
            mockClient.updateFile.mockRejectedValueOnce(new Error("File not found"));

            const result = await executeUpdateFile(mockClient, {
                fileId: "nonexistent",
                name: "new-name.pdf"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("File not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeUploadFile", () => {
        it("calls client with minimal params", async () => {
            mockClient.uploadFile.mockResolvedValueOnce({
                id: "uploadedFile123",
                name: "uploaded.pdf"
            });

            await executeUploadFile(mockClient, {
                fileName: "uploaded.pdf",
                fileContent: "base64content",
                mimeType: "application/pdf"
            });

            expect(mockClient.uploadFile).toHaveBeenCalledWith({
                fileName: "uploaded.pdf",
                fileContent: "base64content",
                mimeType: "application/pdf",
                folderId: undefined,
                description: undefined
            });
        });

        it("calls client with all params", async () => {
            mockClient.uploadFile.mockResolvedValueOnce({
                id: "uploadedFile123",
                name: "uploaded.pdf"
            });

            await executeUploadFile(mockClient, {
                fileName: "uploaded.pdf",
                fileContent: "base64content",
                mimeType: "application/pdf",
                folderId: "targetFolder123",
                description: "Important document"
            });

            expect(mockClient.uploadFile).toHaveBeenCalledWith({
                fileName: "uploaded.pdf",
                fileContent: "base64content",
                mimeType: "application/pdf",
                folderId: "targetFolder123",
                description: "Important document"
            });
        });

        it("returns normalized output on success", async () => {
            const uploadedFile = {
                id: "uploadedFile123",
                name: "uploaded.pdf",
                mimeType: "application/pdf",
                webViewLink: "https://drive.google.com/file/d/uploadedFile123/view"
            };

            mockClient.uploadFile.mockResolvedValueOnce(uploadedFile);

            const result = await executeUploadFile(mockClient, {
                fileName: "uploaded.pdf",
                fileContent: "base64content",
                mimeType: "application/pdf"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(uploadedFile);
        });

        it("returns error on client failure", async () => {
            mockClient.uploadFile.mockRejectedValueOnce(new Error("Storage quota exceeded"));

            const result = await executeUploadFile(mockClient, {
                fileName: "large-file.pdf",
                fileContent: "base64content",
                mimeType: "application/pdf"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Storage quota exceeded");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeShareFile", () => {
        it("calls client to share with user", async () => {
            mockClient.createPermission.mockResolvedValueOnce({
                id: "permission123",
                type: "user",
                role: "reader"
            });

            await executeShareFile(mockClient, {
                fileId: "file123",
                type: "user",
                role: "reader",
                emailAddress: "user@example.com"
            });

            expect(mockClient.createPermission).toHaveBeenCalledWith("file123", {
                type: "user",
                role: "reader",
                emailAddress: "user@example.com"
            });
        });

        it("calls client to share with anyone (public)", async () => {
            mockClient.createPermission.mockResolvedValueOnce({
                id: "permission123",
                type: "anyone",
                role: "reader"
            });

            await executeShareFile(mockClient, {
                fileId: "file123",
                type: "anyone",
                role: "reader"
            });

            expect(mockClient.createPermission).toHaveBeenCalledWith("file123", {
                type: "anyone",
                role: "reader"
            });
        });

        it("calls client to share with domain", async () => {
            mockClient.createPermission.mockResolvedValueOnce({
                id: "permission123",
                type: "domain",
                role: "writer"
            });

            await executeShareFile(mockClient, {
                fileId: "file123",
                type: "domain",
                role: "writer",
                domain: "example.com"
            });

            expect(mockClient.createPermission).toHaveBeenCalledWith("file123", {
                type: "domain",
                role: "writer",
                domain: "example.com"
            });
        });

        it("returns validation error when user type missing email", async () => {
            const result = await executeShareFile(mockClient, {
                fileId: "file123",
                type: "user",
                role: "reader"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("validation");
            expect(result.error?.message).toBe("emailAddress is required for type 'user'");
            expect(result.error?.retryable).toBe(false);
            expect(mockClient.createPermission).not.toHaveBeenCalled();
        });

        it("returns validation error when group type missing email", async () => {
            const result = await executeShareFile(mockClient, {
                fileId: "file123",
                type: "group",
                role: "reader"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("validation");
            expect(result.error?.message).toBe("emailAddress is required for type 'group'");
            expect(mockClient.createPermission).not.toHaveBeenCalled();
        });

        it("returns validation error when domain type missing domain", async () => {
            const result = await executeShareFile(mockClient, {
                fileId: "file123",
                type: "domain",
                role: "reader"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("validation");
            expect(result.error?.message).toBe("domain is required for type 'domain'");
            expect(mockClient.createPermission).not.toHaveBeenCalled();
        });

        it("returns normalized output on success", async () => {
            const permissionData = {
                id: "permission123",
                type: "user",
                role: "writer",
                emailAddress: "collaborator@example.com"
            };

            mockClient.createPermission.mockResolvedValueOnce(permissionData);

            const result = await executeShareFile(mockClient, {
                fileId: "file123",
                type: "user",
                role: "writer",
                emailAddress: "collaborator@example.com"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(permissionData);
        });

        it("returns error on client failure", async () => {
            mockClient.createPermission.mockRejectedValueOnce(new Error("Invalid email address"));

            const result = await executeShareFile(mockClient, {
                fileId: "file123",
                type: "user",
                role: "reader",
                emailAddress: "invalid"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Invalid email address");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListPermissions", () => {
        it("calls client with correct params", async () => {
            mockClient.listPermissions.mockResolvedValueOnce({
                permissions: []
            });

            await executeListPermissions(mockClient, {
                fileId: "file123"
            });

            expect(mockClient.listPermissions).toHaveBeenCalledWith("file123");
        });

        it("returns normalized output on success", async () => {
            const permissionsData = {
                permissions: [
                    { id: "perm1", type: "user", role: "owner", emailAddress: "owner@example.com" },
                    {
                        id: "perm2",
                        type: "user",
                        role: "reader",
                        emailAddress: "viewer@example.com"
                    }
                ]
            };

            mockClient.listPermissions.mockResolvedValueOnce(permissionsData);

            const result = await executeListPermissions(mockClient, {
                fileId: "file123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(permissionsData);
        });

        it("returns error on client failure", async () => {
            mockClient.listPermissions.mockRejectedValueOnce(new Error("File not found"));

            const result = await executeListPermissions(mockClient, {
                fileId: "nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("File not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeRevokePermission", () => {
        it("calls client with correct params", async () => {
            mockClient.deletePermission.mockResolvedValueOnce(undefined);

            await executeRevokePermission(mockClient, {
                fileId: "file123",
                permissionId: "perm456"
            });

            expect(mockClient.deletePermission).toHaveBeenCalledWith("file123", "perm456");
        });

        it("returns normalized output on success", async () => {
            mockClient.deletePermission.mockResolvedValueOnce(undefined);

            const result = await executeRevokePermission(mockClient, {
                fileId: "file123",
                permissionId: "perm456"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                fileId: "file123",
                permissionId: "perm456",
                revoked: true
            });
        });

        it("returns error on client failure", async () => {
            mockClient.deletePermission.mockRejectedValueOnce(new Error("Permission not found"));

            const result = await executeRevokePermission(mockClient, {
                fileId: "file123",
                permissionId: "nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Permission not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("schema validation", () => {
        describe("getFileSchema", () => {
            it("validates minimal input", () => {
                const result = getFileSchema.safeParse({
                    fileId: "file123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with optional fields", () => {
                const result = getFileSchema.safeParse({
                    fileId: "file123",
                    fields: "id,name,mimeType"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing fileId", () => {
                const result = getFileSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty fileId", () => {
                const result = getFileSchema.safeParse({
                    fileId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listFilesSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listFilesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with query", () => {
                const result = listFilesSchema.safeParse({
                    query: "'folder123' in parents"
                });
                expect(result.success).toBe(true);
            });

            it("validates with all params", () => {
                const result = listFilesSchema.safeParse({
                    query: "trashed=false",
                    pageSize: 50,
                    pageToken: "token123",
                    orderBy: "modifiedTime desc",
                    fields: "id,name"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid pageSize", () => {
                const result = listFilesSchema.safeParse({
                    pageSize: 2000
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative pageSize", () => {
                const result = listFilesSchema.safeParse({
                    pageSize: -1
                });
                expect(result.success).toBe(false);
            });

            it("applies default pageSize", () => {
                const result = listFilesSchema.parse({});
                expect(result.pageSize).toBe(100);
            });
        });

        describe("createFolderSchema", () => {
            it("validates minimal input", () => {
                const result = createFolderSchema.safeParse({
                    folderName: "New Folder"
                });
                expect(result.success).toBe(true);
            });

            it("validates with all params", () => {
                const result = createFolderSchema.safeParse({
                    folderName: "New Folder",
                    parentFolderId: "parent123",
                    description: "My folder"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty folderName", () => {
                const result = createFolderSchema.safeParse({
                    folderName: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing folderName", () => {
                const result = createFolderSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects folder name exceeding 255 characters", () => {
                const result = createFolderSchema.safeParse({
                    folderName: "a".repeat(256)
                });
                expect(result.success).toBe(false);
            });
        });

        describe("copyFileSchema", () => {
            it("validates minimal input", () => {
                const result = copyFileSchema.safeParse({
                    fileId: "file123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with all params", () => {
                const result = copyFileSchema.safeParse({
                    fileId: "file123",
                    newName: "copied-file.pdf",
                    parentFolderId: "folder456"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing fileId", () => {
                const result = copyFileSchema.safeParse({
                    newName: "copied-file.pdf"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("deleteFileSchema", () => {
            it("validates input", () => {
                const result = deleteFileSchema.safeParse({
                    fileId: "file123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty fileId", () => {
                const result = deleteFileSchema.safeParse({
                    fileId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("downloadFileSchema", () => {
            it("validates input", () => {
                const result = downloadFileSchema.safeParse({
                    fileId: "file123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing fileId", () => {
                const result = downloadFileSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("exportDocumentSchema", () => {
            it("validates input", () => {
                const result = exportDocumentSchema.safeParse({
                    fileId: "doc123",
                    mimeType: "application/pdf"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing mimeType", () => {
                const result = exportDocumentSchema.safeParse({
                    fileId: "doc123"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("moveFileSchema", () => {
            it("validates input", () => {
                const result = moveFileSchema.safeParse({
                    fileId: "file123",
                    newFolderId: "folder456",
                    oldFolderId: "folder789"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing newFolderId", () => {
                const result = moveFileSchema.safeParse({
                    fileId: "file123",
                    oldFolderId: "folder789"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing oldFolderId", () => {
                const result = moveFileSchema.safeParse({
                    fileId: "file123",
                    newFolderId: "folder456"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("trashFileSchema", () => {
            it("validates input", () => {
                const result = trashFileSchema.safeParse({
                    fileId: "file123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty fileId", () => {
                const result = trashFileSchema.safeParse({
                    fileId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("updateFileSchema", () => {
            it("validates with name only", () => {
                const result = updateFileSchema.safeParse({
                    fileId: "file123",
                    name: "new-name.pdf"
                });
                expect(result.success).toBe(true);
            });

            it("validates with description only", () => {
                const result = updateFileSchema.safeParse({
                    fileId: "file123",
                    description: "New description"
                });
                expect(result.success).toBe(true);
            });

            it("validates with both name and description", () => {
                const result = updateFileSchema.safeParse({
                    fileId: "file123",
                    name: "new-name.pdf",
                    description: "New description"
                });
                expect(result.success).toBe(true);
            });

            it("validates with only fileId (executor handles validation)", () => {
                const result = updateFileSchema.safeParse({
                    fileId: "file123"
                });
                // Schema allows this, executor validates at least one update field
                expect(result.success).toBe(true);
            });

            it("rejects missing fileId", () => {
                const result = updateFileSchema.safeParse({
                    name: "new-name.pdf"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("uploadFileSchema", () => {
            it("validates minimal input", () => {
                const result = uploadFileSchema.safeParse({
                    fileName: "document.pdf",
                    fileContent: "base64content",
                    mimeType: "application/pdf"
                });
                expect(result.success).toBe(true);
            });

            it("validates with all params", () => {
                const result = uploadFileSchema.safeParse({
                    fileName: "document.pdf",
                    fileContent: "base64content",
                    mimeType: "application/pdf",
                    folderId: "folder123",
                    description: "Important document"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty fileName", () => {
                const result = uploadFileSchema.safeParse({
                    fileName: "",
                    fileContent: "base64content",
                    mimeType: "application/pdf"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing mimeType", () => {
                const result = uploadFileSchema.safeParse({
                    fileName: "document.pdf",
                    fileContent: "base64content"
                });
                expect(result.success).toBe(false);
            });

            it("rejects file name exceeding 255 characters", () => {
                const result = uploadFileSchema.safeParse({
                    fileName: "a".repeat(256),
                    fileContent: "base64content",
                    mimeType: "application/pdf"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("shareFileSchema", () => {
            it("validates user share with email", () => {
                const result = shareFileSchema.safeParse({
                    fileId: "file123",
                    type: "user",
                    role: "reader",
                    emailAddress: "user@example.com"
                });
                expect(result.success).toBe(true);
            });

            it("validates public share", () => {
                const result = shareFileSchema.safeParse({
                    fileId: "file123",
                    type: "anyone",
                    role: "reader"
                });
                expect(result.success).toBe(true);
            });

            it("validates domain share", () => {
                const result = shareFileSchema.safeParse({
                    fileId: "file123",
                    type: "domain",
                    role: "writer",
                    domain: "example.com"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid type", () => {
                const result = shareFileSchema.safeParse({
                    fileId: "file123",
                    type: "invalid",
                    role: "reader"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid role", () => {
                const result = shareFileSchema.safeParse({
                    fileId: "file123",
                    type: "anyone",
                    role: "invalid"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid email format", () => {
                const result = shareFileSchema.safeParse({
                    fileId: "file123",
                    type: "user",
                    role: "reader",
                    emailAddress: "not-an-email"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listPermissionsSchema", () => {
            it("validates input", () => {
                const result = listPermissionsSchema.safeParse({
                    fileId: "file123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty fileId", () => {
                const result = listPermissionsSchema.safeParse({
                    fileId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("revokePermissionSchema", () => {
            it("validates input", () => {
                const result = revokePermissionSchema.safeParse({
                    fileId: "file123",
                    permissionId: "perm456"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing permissionId", () => {
                const result = revokePermissionSchema.safeParse({
                    fileId: "file123"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty permissionId", () => {
                const result = revokePermissionSchema.safeParse({
                    fileId: "file123",
                    permissionId: ""
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
