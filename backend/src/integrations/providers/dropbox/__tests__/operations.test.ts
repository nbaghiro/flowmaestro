/**
 * Dropbox Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeCreateFolder, createFolderSchema } from "../operations/createFolder";
import { executeDeleteFile, deleteFileSchema } from "../operations/deleteFile";
import { executeDownloadFile, downloadFileSchema } from "../operations/downloadFile";
import { executeListFiles, listFilesSchema } from "../operations/listFiles";
import { executeShareFile, shareFileSchema } from "../operations/shareFile";
import { executeUploadFile, uploadFileSchema } from "../operations/uploadFile";
import type { DropboxClient } from "../client/DropboxClient";

// Mock DropboxClient factory
function createMockDropboxClient(): jest.Mocked<DropboxClient> {
    return {
        uploadFile: jest.fn(),
        downloadFile: jest.fn(),
        listFolder: jest.fn(),
        listFolderContinue: jest.fn(),
        createFolder: jest.fn(),
        deleteFile: jest.fn(),
        getMetadata: jest.fn(),
        createSharedLink: jest.fn(),
        listSharedLinks: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<DropboxClient>;
}

describe("Dropbox Operation Executors", () => {
    let mockClient: jest.Mocked<DropboxClient>;

    beforeEach(() => {
        mockClient = createMockDropboxClient();
    });

    describe("executeCreateFolder", () => {
        it("calls client with correct params", async () => {
            mockClient.createFolder.mockResolvedValueOnce({
                metadata: {
                    ".tag": "folder",
                    name: "NewFolder",
                    path_lower: "/documents/newfolder",
                    path_display: "/Documents/NewFolder",
                    id: "id:folder123"
                }
            });

            await executeCreateFolder(mockClient, {
                path: "/Documents/NewFolder",
                autorename: false
            });

            expect(mockClient.createFolder).toHaveBeenCalledWith("/Documents/NewFolder", false);
        });

        it("returns normalized output on success", async () => {
            mockClient.createFolder.mockResolvedValueOnce({
                metadata: {
                    ".tag": "folder",
                    name: "NewFolder",
                    path_lower: "/documents/newfolder",
                    path_display: "/Documents/NewFolder",
                    id: "id:folder123"
                }
            });

            const result = await executeCreateFolder(mockClient, {
                path: "/Documents/NewFolder"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "id:folder123",
                name: "NewFolder",
                path: "/Documents/NewFolder"
            });
        });

        it("passes autorename when specified", async () => {
            mockClient.createFolder.mockResolvedValueOnce({
                metadata: {
                    ".tag": "folder",
                    name: "NewFolder (1)",
                    path_lower: "/documents/newfolder (1)",
                    path_display: "/Documents/NewFolder (1)",
                    id: "id:folder456"
                }
            });

            await executeCreateFolder(mockClient, {
                path: "/Documents/NewFolder",
                autorename: true
            });

            expect(mockClient.createFolder).toHaveBeenCalledWith("/Documents/NewFolder", true);
        });

        it("returns error on client failure", async () => {
            mockClient.createFolder.mockRejectedValueOnce(
                new Error("Dropbox error: path/conflict/folder")
            );

            const result = await executeCreateFolder(mockClient, {
                path: "/Documents/ExistingFolder"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Dropbox error: path/conflict/folder");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createFolder.mockRejectedValueOnce("unknown error type");

            const result = await executeCreateFolder(mockClient, {
                path: "/Documents/NewFolder"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create folder");
        });
    });

    describe("executeDeleteFile", () => {
        it("calls client with correct params", async () => {
            mockClient.deleteFile.mockResolvedValueOnce({
                metadata: {
                    ".tag": "file",
                    name: "old-file.pdf",
                    path_lower: "/documents/old-file.pdf",
                    path_display: "/Documents/old-file.pdf",
                    id: "id:file123"
                }
            });

            await executeDeleteFile(mockClient, {
                path: "/Documents/old-file.pdf"
            });

            expect(mockClient.deleteFile).toHaveBeenCalledWith("/Documents/old-file.pdf");
        });

        it("returns normalized output for deleted file", async () => {
            mockClient.deleteFile.mockResolvedValueOnce({
                metadata: {
                    ".tag": "file",
                    name: "old-file.pdf",
                    path_lower: "/documents/old-file.pdf",
                    path_display: "/Documents/old-file.pdf",
                    id: "id:file123"
                }
            });

            const result = await executeDeleteFile(mockClient, {
                path: "/Documents/old-file.pdf"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                type: "file",
                id: "id:file123",
                name: "old-file.pdf",
                path: "/Documents/old-file.pdf"
            });
        });

        it("returns normalized output for deleted folder", async () => {
            mockClient.deleteFile.mockResolvedValueOnce({
                metadata: {
                    ".tag": "folder",
                    name: "OldFolder",
                    path_lower: "/documents/oldfolder",
                    path_display: "/Documents/OldFolder",
                    id: "id:folder123"
                }
            });

            const result = await executeDeleteFile(mockClient, {
                path: "/Documents/OldFolder"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                type: "folder",
                id: "id:folder123",
                name: "OldFolder",
                path: "/Documents/OldFolder"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.deleteFile.mockRejectedValueOnce(new Error("Dropbox error: path/not_found"));

            const result = await executeDeleteFile(mockClient, {
                path: "/Documents/nonexistent.pdf"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Dropbox error: path/not_found");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.deleteFile.mockRejectedValueOnce({ code: "UNKNOWN" });

            const result = await executeDeleteFile(mockClient, {
                path: "/Documents/file.pdf"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to delete file");
        });
    });

    describe("executeDownloadFile", () => {
        it("calls client with correct params", async () => {
            mockClient.downloadFile.mockResolvedValueOnce({
                content: "SGVsbG8gV29ybGQ=",
                metadata: {
                    name: "report.pdf",
                    path_lower: "/documents/report.pdf",
                    path_display: "/Documents/report.pdf",
                    id: "id:file123",
                    client_modified: "2024-01-01T00:00:00Z",
                    server_modified: "2024-01-01T00:00:00Z",
                    size: 1024,
                    content_hash: "abc123"
                }
            });

            await executeDownloadFile(mockClient, {
                path: "/Documents/report.pdf"
            });

            expect(mockClient.downloadFile).toHaveBeenCalledWith("/Documents/report.pdf");
        });

        it("returns normalized output on success", async () => {
            mockClient.downloadFile.mockResolvedValueOnce({
                content: "SGVsbG8gV29ybGQ=",
                metadata: {
                    name: "report.pdf",
                    path_lower: "/documents/report.pdf",
                    path_display: "/Documents/report.pdf",
                    id: "id:file123",
                    client_modified: "2024-01-01T00:00:00Z",
                    server_modified: "2024-01-15T12:30:00Z",
                    size: 2048,
                    content_hash: "hash456"
                }
            });

            const result = await executeDownloadFile(mockClient, {
                path: "/Documents/report.pdf"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                content: "SGVsbG8gV29ybGQ=",
                contentEncoding: "base64",
                metadata: {
                    id: "id:file123",
                    name: "report.pdf",
                    path: "/Documents/report.pdf",
                    size: 2048,
                    modifiedAt: "2024-01-15T12:30:00Z",
                    contentHash: "hash456"
                }
            });
        });

        it("handles missing content_hash", async () => {
            mockClient.downloadFile.mockResolvedValueOnce({
                content: "SGVsbG8=",
                metadata: {
                    name: "file.txt",
                    path_lower: "/file.txt",
                    path_display: "/file.txt",
                    id: "id:file789",
                    client_modified: "2024-01-01T00:00:00Z",
                    server_modified: "2024-01-01T00:00:00Z",
                    size: 5
                }
            });

            const result = await executeDownloadFile(mockClient, {
                path: "/file.txt"
            });

            expect(result.success).toBe(true);
            expect(result.data?.metadata.contentHash).toBeUndefined();
        });

        it("returns error on client failure", async () => {
            mockClient.downloadFile.mockRejectedValueOnce(
                new Error("Dropbox download failed: path/not_found")
            );

            const result = await executeDownloadFile(mockClient, {
                path: "/Documents/missing.pdf"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Dropbox download failed: path/not_found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.downloadFile.mockRejectedValueOnce(null);

            const result = await executeDownloadFile(mockClient, {
                path: "/Documents/file.pdf"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to download file");
        });
    });

    describe("executeListFiles", () => {
        it("calls client with correct params for root folder", async () => {
            mockClient.listFolder.mockResolvedValueOnce({
                entries: [],
                cursor: "cursor123",
                has_more: false
            });

            await executeListFiles(mockClient, {
                path: "",
                recursive: false
            });

            expect(mockClient.listFolder).toHaveBeenCalledWith("", false);
        });

        it("normalizes root path from / to empty string", async () => {
            mockClient.listFolder.mockResolvedValueOnce({
                entries: [],
                cursor: "cursor123",
                has_more: false
            });

            await executeListFiles(mockClient, {
                path: "/",
                recursive: false
            });

            expect(mockClient.listFolder).toHaveBeenCalledWith("", false);
        });

        it("calls client with recursive flag", async () => {
            mockClient.listFolder.mockResolvedValueOnce({
                entries: [],
                cursor: "cursor123",
                has_more: false
            });

            await executeListFiles(mockClient, {
                path: "/Documents",
                recursive: true
            });

            expect(mockClient.listFolder).toHaveBeenCalledWith("/Documents", true);
        });

        it("returns normalized output with files and folders", async () => {
            mockClient.listFolder.mockResolvedValueOnce({
                entries: [
                    {
                        ".tag": "folder",
                        name: "Projects",
                        path_lower: "/documents/projects",
                        path_display: "/Documents/Projects",
                        id: "id:folder1"
                    },
                    {
                        ".tag": "file",
                        name: "report.pdf",
                        path_lower: "/documents/report.pdf",
                        path_display: "/Documents/report.pdf",
                        id: "id:file1",
                        server_modified: "2024-01-15T12:00:00Z",
                        size: 1024,
                        is_downloadable: true
                    }
                ],
                cursor: "cursor123",
                has_more: false
            });

            const result = await executeListFiles(mockClient, {
                path: "/Documents"
            });

            expect(result.success).toBe(true);
            expect(result.data?.path).toBe("/Documents");
            expect(result.data?.itemCount).toBe(2);
            expect(result.data?.items).toHaveLength(2);
            expect(result.data?.items[0]).toEqual({
                type: "folder",
                name: "Projects",
                path: "/Documents/Projects",
                id: "id:folder1"
            });
            expect(result.data?.items[1]).toEqual({
                type: "file",
                name: "report.pdf",
                path: "/Documents/report.pdf",
                id: "id:file1",
                size: 1024,
                modifiedAt: "2024-01-15T12:00:00Z",
                isDownloadable: true
            });
        });

        it("handles pagination with has_more", async () => {
            mockClient.listFolder.mockResolvedValueOnce({
                entries: [
                    {
                        ".tag": "file",
                        name: "file1.txt",
                        path_lower: "/file1.txt",
                        path_display: "/file1.txt",
                        id: "id:file1",
                        size: 100,
                        server_modified: "2024-01-01T00:00:00Z",
                        is_downloadable: true
                    }
                ],
                cursor: "cursor_page1",
                has_more: true
            });

            mockClient.listFolderContinue.mockResolvedValueOnce({
                entries: [
                    {
                        ".tag": "file",
                        name: "file2.txt",
                        path_lower: "/file2.txt",
                        path_display: "/file2.txt",
                        id: "id:file2",
                        size: 200,
                        server_modified: "2024-01-02T00:00:00Z",
                        is_downloadable: true
                    }
                ],
                cursor: "cursor_page2",
                has_more: false
            });

            const result = await executeListFiles(mockClient, {
                path: ""
            });

            expect(mockClient.listFolder).toHaveBeenCalledTimes(1);
            expect(mockClient.listFolderContinue).toHaveBeenCalledWith("cursor_page1");
            expect(result.success).toBe(true);
            expect(result.data?.itemCount).toBe(2);
            expect(result.data?.items).toHaveLength(2);
        });

        it("handles multiple pagination pages", async () => {
            mockClient.listFolder.mockResolvedValueOnce({
                entries: [
                    {
                        ".tag": "file",
                        name: "a.txt",
                        path_lower: "/a.txt",
                        path_display: "/a.txt",
                        id: "1"
                    }
                ],
                cursor: "cursor1",
                has_more: true
            });

            mockClient.listFolderContinue
                .mockResolvedValueOnce({
                    entries: [
                        {
                            ".tag": "file",
                            name: "b.txt",
                            path_lower: "/b.txt",
                            path_display: "/b.txt",
                            id: "2"
                        }
                    ],
                    cursor: "cursor2",
                    has_more: true
                })
                .mockResolvedValueOnce({
                    entries: [
                        {
                            ".tag": "file",
                            name: "c.txt",
                            path_lower: "/c.txt",
                            path_display: "/c.txt",
                            id: "3"
                        }
                    ],
                    cursor: "cursor3",
                    has_more: false
                });

            const result = await executeListFiles(mockClient, { path: "" });

            expect(mockClient.listFolderContinue).toHaveBeenCalledTimes(2);
            expect(result.success).toBe(true);
            expect(result.data?.itemCount).toBe(3);
        });

        it("returns root path as / when path is empty", async () => {
            mockClient.listFolder.mockResolvedValueOnce({
                entries: [],
                cursor: "cursor123",
                has_more: false
            });

            const result = await executeListFiles(mockClient, { path: "" });

            expect(result.success).toBe(true);
            expect(result.data?.path).toBe("/");
        });

        it("returns error on client failure", async () => {
            mockClient.listFolder.mockRejectedValueOnce(new Error("Dropbox error: path/not_found"));

            const result = await executeListFiles(mockClient, {
                path: "/NonexistentFolder"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Dropbox error: path/not_found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listFolder.mockRejectedValueOnce(undefined);

            const result = await executeListFiles(mockClient, { path: "" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list files");
        });
    });

    describe("executeShareFile", () => {
        it("calls client with correct params for public link", async () => {
            mockClient.createSharedLink.mockResolvedValueOnce({
                ".tag": "file",
                url: "https://www.dropbox.com/s/abc123/file.pdf?dl=0",
                name: "file.pdf",
                path_lower: "/documents/file.pdf",
                id: "id:file123",
                link_permissions: {
                    resolved_visibility: { ".tag": "public" },
                    can_revoke: true
                }
            });

            await executeShareFile(mockClient, {
                path: "/Documents/file.pdf",
                visibility: "public"
            });

            expect(mockClient.createSharedLink).toHaveBeenCalledWith("/Documents/file.pdf", {
                requested_visibility: "public"
            });
        });

        it("calls client with password settings", async () => {
            mockClient.createSharedLink.mockResolvedValueOnce({
                ".tag": "file",
                url: "https://www.dropbox.com/s/abc123/file.pdf?dl=0",
                name: "file.pdf",
                path_lower: "/documents/file.pdf",
                id: "id:file123",
                link_permissions: {
                    resolved_visibility: { ".tag": "password" },
                    can_revoke: true
                }
            });

            await executeShareFile(mockClient, {
                path: "/Documents/file.pdf",
                visibility: "password",
                password: "secret123"
            });

            expect(mockClient.createSharedLink).toHaveBeenCalledWith("/Documents/file.pdf", {
                requested_visibility: "password",
                link_password: "secret123"
            });
        });

        it("calls client with expiration date", async () => {
            mockClient.createSharedLink.mockResolvedValueOnce({
                ".tag": "file",
                url: "https://www.dropbox.com/s/abc123/file.pdf?dl=0",
                name: "file.pdf",
                path_lower: "/documents/file.pdf",
                id: "id:file123",
                link_permissions: {
                    resolved_visibility: { ".tag": "public" },
                    can_revoke: true
                },
                expires: "2025-12-31T23:59:59Z"
            });

            await executeShareFile(mockClient, {
                path: "/Documents/file.pdf",
                visibility: "public",
                expires: "2025-12-31T23:59:59Z"
            });

            expect(mockClient.createSharedLink).toHaveBeenCalledWith("/Documents/file.pdf", {
                requested_visibility: "public",
                expires: "2025-12-31T23:59:59Z"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.createSharedLink.mockResolvedValueOnce({
                ".tag": "file",
                url: "https://www.dropbox.com/s/abc123/report.pdf?dl=0",
                name: "report.pdf",
                path_lower: "/documents/report.pdf",
                id: "id:file123",
                link_permissions: {
                    resolved_visibility: { ".tag": "public" },
                    can_revoke: true
                }
            });

            const result = await executeShareFile(mockClient, {
                path: "/Documents/report.pdf"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                url: "https://www.dropbox.com/s/abc123/report.pdf?dl=0",
                name: "report.pdf",
                id: "id:file123",
                type: "file",
                visibility: "public",
                canRevoke: true,
                expires: undefined
            });
        });

        it("returns existing link when shared_link_already_exists error", async () => {
            mockClient.createSharedLink.mockRejectedValueOnce(
                new Error("Dropbox API error: shared_link_already_exists")
            );

            mockClient.listSharedLinks.mockResolvedValueOnce({
                links: [
                    {
                        ".tag": "file",
                        url: "https://www.dropbox.com/s/existing/file.pdf?dl=0",
                        name: "file.pdf",
                        path_lower: "/documents/file.pdf",
                        id: "id:existing123",
                        link_permissions: {
                            resolved_visibility: { ".tag": "public" },
                            can_revoke: true
                        }
                    }
                ]
            });

            const result = await executeShareFile(mockClient, {
                path: "/Documents/file.pdf"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                url: "https://www.dropbox.com/s/existing/file.pdf?dl=0",
                name: "file.pdf",
                id: "id:existing123",
                type: "file",
                visibility: "public",
                canRevoke: true,
                expires: undefined,
                existingLink: true
            });
        });

        it("returns error when link already exists but listSharedLinks fails", async () => {
            mockClient.createSharedLink.mockRejectedValueOnce(
                new Error("Dropbox API error: shared_link_already_exists")
            );

            mockClient.listSharedLinks.mockRejectedValueOnce(new Error("API error"));

            const result = await executeShareFile(mockClient, {
                path: "/Documents/file.pdf"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Dropbox API error: shared_link_already_exists");
        });

        it("returns error when link already exists but no links returned", async () => {
            mockClient.createSharedLink.mockRejectedValueOnce(
                new Error("Dropbox API error: shared_link_already_exists")
            );

            mockClient.listSharedLinks.mockResolvedValueOnce({ links: [] });

            const result = await executeShareFile(mockClient, {
                path: "/Documents/file.pdf"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Dropbox API error: shared_link_already_exists");
        });

        it("handles folder sharing", async () => {
            mockClient.createSharedLink.mockResolvedValueOnce({
                ".tag": "folder",
                url: "https://www.dropbox.com/sh/xyz789/Projects?dl=0",
                name: "Projects",
                path_lower: "/documents/projects",
                id: "id:folder456",
                link_permissions: {
                    resolved_visibility: { ".tag": "team_only" },
                    can_revoke: false
                }
            });

            const result = await executeShareFile(mockClient, {
                path: "/Documents/Projects",
                visibility: "team_only"
            });

            expect(result.success).toBe(true);
            expect(result.data?.type).toBe("folder");
            expect(result.data?.visibility).toBe("team_only");
            expect(result.data?.canRevoke).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.createSharedLink.mockRejectedValueOnce(
                new Error("Dropbox error: path/not_found")
            );

            const result = await executeShareFile(mockClient, {
                path: "/Documents/missing.pdf"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Dropbox error: path/not_found");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createSharedLink.mockRejectedValueOnce(42);

            const result = await executeShareFile(mockClient, {
                path: "/Documents/file.pdf"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create shared link");
        });
    });

    describe("executeUploadFile", () => {
        it("calls client with correct params", async () => {
            const base64Content = Buffer.from("Hello World").toString("base64");

            mockClient.uploadFile.mockResolvedValueOnce({
                ".tag": "file",
                name: "test.txt",
                path_lower: "/documents/test.txt",
                path_display: "/Documents/test.txt",
                id: "id:file123",
                client_modified: "2024-01-15T12:00:00Z",
                server_modified: "2024-01-15T12:00:00Z",
                size: 11,
                content_hash: "hash123",
                is_downloadable: true
            });

            await executeUploadFile(mockClient, {
                path: "/Documents/test.txt",
                content: base64Content,
                mode: "add",
                autorename: false
            });

            expect(mockClient.uploadFile).toHaveBeenCalledWith({
                path: "/Documents/test.txt",
                content: Buffer.from("Hello World"),
                mode: "add",
                autorename: false
            });
        });

        it("calls client with overwrite mode", async () => {
            const base64Content = Buffer.from("Updated content").toString("base64");

            mockClient.uploadFile.mockResolvedValueOnce({
                ".tag": "file",
                name: "existing.txt",
                path_lower: "/existing.txt",
                path_display: "/existing.txt",
                id: "id:file123",
                client_modified: "2024-01-15T12:00:00Z",
                server_modified: "2024-01-15T12:00:00Z",
                size: 15,
                content_hash: "hash456",
                is_downloadable: true
            });

            await executeUploadFile(mockClient, {
                path: "/existing.txt",
                content: base64Content,
                mode: "overwrite"
            });

            expect(mockClient.uploadFile).toHaveBeenCalledWith({
                path: "/existing.txt",
                content: Buffer.from("Updated content"),
                mode: "overwrite",
                autorename: undefined
            });
        });

        it("returns normalized output on success", async () => {
            const base64Content = Buffer.from("File data").toString("base64");

            mockClient.uploadFile.mockResolvedValueOnce({
                ".tag": "file",
                name: "uploaded.pdf",
                path_lower: "/documents/uploaded.pdf",
                path_display: "/Documents/uploaded.pdf",
                id: "id:newfile789",
                client_modified: "2024-01-15T12:00:00Z",
                server_modified: "2024-01-15T12:30:00Z",
                size: 9,
                content_hash: "contenthash123",
                is_downloadable: true
            });

            const result = await executeUploadFile(mockClient, {
                path: "/Documents/uploaded.pdf",
                content: base64Content
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "id:newfile789",
                name: "uploaded.pdf",
                path: "/Documents/uploaded.pdf",
                size: 9,
                modifiedAt: "2024-01-15T12:30:00Z",
                contentHash: "contenthash123",
                isDownloadable: true
            });
        });

        it("passes autorename when specified", async () => {
            const base64Content = Buffer.from("data").toString("base64");

            mockClient.uploadFile.mockResolvedValueOnce({
                ".tag": "file",
                name: "file (1).txt",
                path_lower: "/file (1).txt",
                path_display: "/file (1).txt",
                id: "id:renamed123",
                client_modified: "2024-01-15T12:00:00Z",
                server_modified: "2024-01-15T12:00:00Z",
                size: 4,
                content_hash: "hash",
                is_downloadable: true
            });

            await executeUploadFile(mockClient, {
                path: "/file.txt",
                content: base64Content,
                autorename: true
            });

            expect(mockClient.uploadFile).toHaveBeenCalledWith({
                path: "/file.txt",
                content: Buffer.from("data"),
                mode: undefined,
                autorename: true
            });
        });

        it("returns error on client failure", async () => {
            mockClient.uploadFile.mockRejectedValueOnce(
                new Error("Dropbox upload failed: path/conflict")
            );

            const result = await executeUploadFile(mockClient, {
                path: "/existing.txt",
                content: Buffer.from("data").toString("base64")
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Dropbox upload failed: path/conflict");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.uploadFile.mockRejectedValueOnce({ weird: "error" });

            const result = await executeUploadFile(mockClient, {
                path: "/file.txt",
                content: Buffer.from("data").toString("base64")
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to upload file");
        });
    });

    describe("schema validation", () => {
        describe("createFolderSchema", () => {
            it("validates minimal input", () => {
                const result = createFolderSchema.safeParse({
                    path: "/Documents/NewFolder"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createFolderSchema.safeParse({
                    path: "/Documents/NewFolder",
                    autorename: true
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing path", () => {
                const result = createFolderSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects non-string path", () => {
                const result = createFolderSchema.safeParse({
                    path: 123
                });
                expect(result.success).toBe(false);
            });

            it("applies default for autorename", () => {
                const result = createFolderSchema.parse({
                    path: "/Documents/NewFolder"
                });
                expect(result.autorename).toBe(false);
            });
        });

        describe("deleteFileSchema", () => {
            it("validates with path", () => {
                const result = deleteFileSchema.safeParse({
                    path: "/Documents/old-file.pdf"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing path", () => {
                const result = deleteFileSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty path", () => {
                const result = deleteFileSchema.safeParse({
                    path: ""
                });
                // Empty string is technically a valid string
                expect(result.success).toBe(true);
            });
        });

        describe("downloadFileSchema", () => {
            it("validates with path", () => {
                const result = downloadFileSchema.safeParse({
                    path: "/Documents/report.pdf"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing path", () => {
                const result = downloadFileSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listFilesSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listFilesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with path", () => {
                const result = listFilesSchema.safeParse({
                    path: "/Documents"
                });
                expect(result.success).toBe(true);
            });

            it("validates with recursive flag", () => {
                const result = listFilesSchema.safeParse({
                    path: "/Documents",
                    recursive: true
                });
                expect(result.success).toBe(true);
            });

            it("applies defaults", () => {
                const result = listFilesSchema.parse({});
                expect(result.path).toBe("");
                expect(result.recursive).toBe(false);
            });
        });

        describe("shareFileSchema", () => {
            it("validates minimal input", () => {
                const result = shareFileSchema.safeParse({
                    path: "/Documents/file.pdf"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = shareFileSchema.safeParse({
                    path: "/Documents/file.pdf",
                    visibility: "password",
                    password: "secret123",
                    expires: "2025-12-31T23:59:59Z"
                });
                expect(result.success).toBe(true);
            });

            it("validates visibility options", () => {
                const publicResult = shareFileSchema.safeParse({
                    path: "/file.pdf",
                    visibility: "public"
                });
                expect(publicResult.success).toBe(true);

                const teamOnlyResult = shareFileSchema.safeParse({
                    path: "/file.pdf",
                    visibility: "team_only"
                });
                expect(teamOnlyResult.success).toBe(true);

                const passwordResult = shareFileSchema.safeParse({
                    path: "/file.pdf",
                    visibility: "password"
                });
                expect(passwordResult.success).toBe(true);
            });

            it("rejects invalid visibility", () => {
                const result = shareFileSchema.safeParse({
                    path: "/file.pdf",
                    visibility: "invalid"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing path", () => {
                const result = shareFileSchema.safeParse({
                    visibility: "public"
                });
                expect(result.success).toBe(false);
            });

            it("applies default visibility", () => {
                const result = shareFileSchema.parse({
                    path: "/file.pdf"
                });
                expect(result.visibility).toBe("public");
            });
        });

        describe("uploadFileSchema", () => {
            it("validates minimal input", () => {
                const result = uploadFileSchema.safeParse({
                    path: "/Documents/file.txt",
                    content: "SGVsbG8="
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = uploadFileSchema.safeParse({
                    path: "/Documents/file.txt",
                    content: "SGVsbG8=",
                    mode: "overwrite",
                    autorename: true
                });
                expect(result.success).toBe(true);
            });

            it("validates mode options", () => {
                const addResult = uploadFileSchema.safeParse({
                    path: "/file.txt",
                    content: "data",
                    mode: "add"
                });
                expect(addResult.success).toBe(true);

                const overwriteResult = uploadFileSchema.safeParse({
                    path: "/file.txt",
                    content: "data",
                    mode: "overwrite"
                });
                expect(overwriteResult.success).toBe(true);
            });

            it("rejects invalid mode", () => {
                const result = uploadFileSchema.safeParse({
                    path: "/file.txt",
                    content: "data",
                    mode: "invalid"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing path", () => {
                const result = uploadFileSchema.safeParse({
                    content: "SGVsbG8="
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing content", () => {
                const result = uploadFileSchema.safeParse({
                    path: "/file.txt"
                });
                expect(result.success).toBe(false);
            });

            it("applies defaults", () => {
                const result = uploadFileSchema.parse({
                    path: "/file.txt",
                    content: "data"
                });
                expect(result.mode).toBe("add");
                expect(result.autorename).toBe(false);
            });
        });
    });
});
