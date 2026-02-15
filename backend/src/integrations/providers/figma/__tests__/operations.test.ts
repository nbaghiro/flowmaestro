/**
 * Figma Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeCreateComment, createCommentOperation } from "../operations/createComment";
import { executeExportImages, exportImagesOperation } from "../operations/exportImages";
import { executeGetFile, getFileOperation } from "../operations/getFile";
import { executeGetFileNodes, getFileNodesOperation } from "../operations/getFileNodes";
import { executeGetFileVersions, getFileVersionsOperation } from "../operations/getFileVersions";
import { executeListComments, listCommentsOperation } from "../operations/listComments";
import type { FigmaClient } from "../client/FigmaClient";

// Mock FigmaClient factory
function createMockFigmaClient(): jest.Mocked<FigmaClient> {
    return {
        getFile: jest.fn(),
        getFileNodes: jest.fn(),
        getFileVersions: jest.fn(),
        exportImages: jest.fn(),
        getImageFills: jest.fn(),
        getComments: jest.fn(),
        createComment: jest.fn(),
        deleteComment: jest.fn(),
        getTeamProjects: jest.fn(),
        getProjectFiles: jest.fn(),
        createWebhook: jest.fn(),
        listWebhooks: jest.fn(),
        deleteWebhook: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<FigmaClient>;
}

describe("Figma Operation Executors", () => {
    let mockClient: jest.Mocked<FigmaClient>;

    beforeEach(() => {
        mockClient = createMockFigmaClient();
    });

    describe("executeCreateComment", () => {
        it("calls client with basic comment params", async () => {
            const mockResponse = {
                id: "1234567890",
                file_key: "xYz123AbC456dEf",
                parent_id: null,
                user: {
                    id: "987654321",
                    handle: "sarah.designer",
                    img_url: "https://s3-alpha.figma.com/profile/987654321"
                },
                created_at: "2024-03-15T14:30:00Z",
                resolved_at: null,
                message: "Great work on the hero section!",
                client_meta: null,
                order_id: "1"
            };

            mockClient.createComment.mockResolvedValueOnce(mockResponse);

            await executeCreateComment(mockClient, {
                fileKey: "xYz123AbC456dEf",
                message: "Great work on the hero section!"
            });

            expect(mockClient.createComment).toHaveBeenCalledWith("xYz123AbC456dEf", {
                message: "Great work on the hero section!"
            });
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                id: "1234567890",
                file_key: "xYz123AbC456dEf",
                parent_id: null,
                user: {
                    id: "987654321",
                    handle: "sarah.designer",
                    img_url: "https://s3-alpha.figma.com/profile/987654321"
                },
                created_at: "2024-03-15T14:30:00Z",
                resolved_at: null,
                message: "Great work!",
                client_meta: null,
                order_id: "1"
            };

            mockClient.createComment.mockResolvedValueOnce(mockResponse);

            const result = await executeCreateComment(mockClient, {
                fileKey: "xYz123AbC456dEf",
                message: "Great work!"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("includes client_meta with coordinates", async () => {
            mockClient.createComment.mockResolvedValueOnce({
                id: "2345678901",
                file_key: "pQr789StU012vWx",
                message: "Needs padding adjustment",
                client_meta: { x: 1420.5, y: 892.25 }
            });

            await executeCreateComment(mockClient, {
                fileKey: "pQr789StU012vWx",
                message: "Needs padding adjustment",
                x: 1420.5,
                y: 892.25
            });

            expect(mockClient.createComment).toHaveBeenCalledWith("pQr789StU012vWx", {
                message: "Needs padding adjustment",
                client_meta: {
                    x: 1420.5,
                    y: 892.25
                }
            });
        });

        it("includes nodeId in client_meta when provided with coordinates", async () => {
            mockClient.createComment.mockResolvedValueOnce({
                id: "3456789012",
                file_key: "aBc345DeF678gHi",
                message: "Button color issue",
                client_meta: { x: 256.0, y: 128.0, node_id: "1:234" }
            });

            await executeCreateComment(mockClient, {
                fileKey: "aBc345DeF678gHi",
                message: "Button color issue",
                x: 256.0,
                y: 128.0,
                nodeId: "1:234"
            });

            expect(mockClient.createComment).toHaveBeenCalledWith("aBc345DeF678gHi", {
                message: "Button color issue",
                client_meta: {
                    x: 256.0,
                    y: 128.0,
                    node_id: "1:234"
                }
            });
        });

        it("includes parent_id for replies", async () => {
            mockClient.createComment.mockResolvedValueOnce({
                id: "4567890123",
                file_key: "jKl901MnO234pQr",
                parent_id: "3456789012",
                message: "Good catch! Updated."
            });

            await executeCreateComment(mockClient, {
                fileKey: "jKl901MnO234pQr",
                message: "Good catch! Updated.",
                parentId: "3456789012"
            });

            expect(mockClient.createComment).toHaveBeenCalledWith("jKl901MnO234pQr", {
                message: "Good catch! Updated.",
                parent_id: "3456789012"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.createComment.mockRejectedValueOnce(new Error("Figma resource not found."));

            const result = await executeCreateComment(mockClient, {
                fileKey: "nonExistentFileKey123",
                message: "This comment will fail"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Figma resource not found.");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createComment.mockRejectedValueOnce("string error");

            const result = await executeCreateComment(mockClient, {
                fileKey: "test",
                message: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create comment");
        });
    });

    describe("executeExportImages", () => {
        it("calls client with default PNG format", async () => {
            const mockResponse = {
                err: null,
                images: {
                    "1:2": "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/abc123/1_2.png"
                }
            };

            mockClient.exportImages.mockResolvedValueOnce(mockResponse);

            await executeExportImages(mockClient, {
                fileKey: "xYz123AbC456dEf",
                nodeIds: ["1:2"]
            });

            expect(mockClient.exportImages).toHaveBeenCalledWith("xYz123AbC456dEf", ["1:2"], {
                format: undefined,
                scale: undefined,
                svg_include_id: undefined,
                svg_simplify_stroke: undefined,
                use_absolute_bounds: undefined
            });
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                err: null,
                images: {
                    "1:2": "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/abc123/1_2.png"
                }
            };

            mockClient.exportImages.mockResolvedValueOnce(mockResponse);

            const result = await executeExportImages(mockClient, {
                fileKey: "xYz123AbC456dEf",
                nodeIds: ["1:2"],
                format: "png"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("exports multiple nodes as JPG with scale", async () => {
            const mockResponse = {
                err: null,
                images: {
                    "12:34":
                        "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/def789/12_34@2x.jpg",
                    "12:56":
                        "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/def789/12_56@2x.jpg"
                }
            };

            mockClient.exportImages.mockResolvedValueOnce(mockResponse);

            await executeExportImages(mockClient, {
                fileKey: "pQr789StU012vWx",
                nodeIds: ["12:34", "12:56"],
                format: "jpg",
                scale: 2
            });

            expect(mockClient.exportImages).toHaveBeenCalledWith(
                "pQr789StU012vWx",
                ["12:34", "12:56"],
                {
                    format: "jpg",
                    scale: 2,
                    svg_include_id: undefined,
                    svg_simplify_stroke: undefined,
                    use_absolute_bounds: undefined
                }
            );
        });

        it("exports SVG with include_id and simplify_stroke options", async () => {
            const mockResponse = {
                err: null,
                images: {
                    "5:100":
                        "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/jkl345/5_100.svg"
                }
            };

            mockClient.exportImages.mockResolvedValueOnce(mockResponse);

            await executeExportImages(mockClient, {
                fileKey: "aBc345DeF678gHi",
                nodeIds: ["5:100"],
                format: "svg",
                svgIncludeId: true,
                svgSimplifyStroke: true
            });

            expect(mockClient.exportImages).toHaveBeenCalledWith("aBc345DeF678gHi", ["5:100"], {
                format: "svg",
                scale: undefined,
                svg_include_id: true,
                svg_simplify_stroke: true,
                use_absolute_bounds: undefined
            });
        });

        it("exports PDF with absolute bounds", async () => {
            const mockResponse = {
                err: null,
                images: {
                    "100:1":
                        "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/pqr901/100_1.pdf"
                }
            };

            mockClient.exportImages.mockResolvedValueOnce(mockResponse);

            await executeExportImages(mockClient, {
                fileKey: "jKl901MnO234pQr",
                nodeIds: ["100:1"],
                format: "pdf",
                useAbsoluteBounds: true
            });

            expect(mockClient.exportImages).toHaveBeenCalledWith("jKl901MnO234pQr", ["100:1"], {
                format: "pdf",
                scale: undefined,
                svg_include_id: undefined,
                svg_simplify_stroke: undefined,
                use_absolute_bounds: true
            });
        });

        it("exports at 4x scale for high resolution", async () => {
            mockClient.exportImages.mockResolvedValueOnce({
                err: null,
                images: {
                    "200:50":
                        "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/efg567/200_50@4x.png"
                }
            });

            await executeExportImages(mockClient, {
                fileKey: "vWx567YzA890bCd",
                nodeIds: ["200:50"],
                format: "png",
                scale: 4
            });

            expect(mockClient.exportImages).toHaveBeenCalledWith("vWx567YzA890bCd", ["200:50"], {
                format: "png",
                scale: 4,
                svg_include_id: undefined,
                svg_simplify_stroke: undefined,
                use_absolute_bounds: undefined
            });
        });

        it("returns error on client failure", async () => {
            mockClient.exportImages.mockRejectedValueOnce(new Error("Figma resource not found."));

            const result = await executeExportImages(mockClient, {
                fileKey: "nonExistentFileKey123",
                nodeIds: ["1:2"],
                format: "png"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Figma resource not found.");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.exportImages.mockRejectedValueOnce("unexpected error");

            const result = await executeExportImages(mockClient, {
                fileKey: "test",
                nodeIds: ["1:1"]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to export images");
        });
    });

    describe("executeGetFile", () => {
        it("calls client with fileKey only", async () => {
            const mockResponse = {
                name: "Mobile App Design System",
                lastModified: "2024-03-15T18:42:00Z",
                version: "5678901234",
                document: { id: "0:0", name: "Document", type: "DOCUMENT", children: [] }
            };

            mockClient.getFile.mockResolvedValueOnce(mockResponse);

            await executeGetFile(mockClient, {
                fileKey: "xYz123AbC456dEf"
            });

            expect(mockClient.getFile).toHaveBeenCalledWith("xYz123AbC456dEf", {
                version: undefined,
                depth: undefined,
                geometry: undefined,
                branch_data: undefined
            });
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                name: "Mobile App Design System",
                lastModified: "2024-03-15T18:42:00Z",
                thumbnailUrl: "https://s3-alpha-sig.figma.com/thumbnails/abc123/thumbnail.png",
                version: "5678901234",
                role: "editor",
                document: { id: "0:0", name: "Document", type: "DOCUMENT", children: [] },
                components: {},
                styles: {}
            };

            mockClient.getFile.mockResolvedValueOnce(mockResponse);

            const result = await executeGetFile(mockClient, {
                fileKey: "xYz123AbC456dEf"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("calls client with depth limit", async () => {
            mockClient.getFile.mockResolvedValueOnce({
                name: "Landing Page",
                document: { id: "0:0", name: "Document", type: "DOCUMENT", children: [] }
            });

            await executeGetFile(mockClient, {
                fileKey: "pQr789StU012vWx",
                depth: 2
            });

            expect(mockClient.getFile).toHaveBeenCalledWith("pQr789StU012vWx", {
                version: undefined,
                depth: 2,
                geometry: undefined,
                branch_data: undefined
            });
        });

        it("calls client with specific version", async () => {
            mockClient.getFile.mockResolvedValueOnce({
                name: "Icon Library v2.0",
                version: "3456789012"
            });

            await executeGetFile(mockClient, {
                fileKey: "aBc345DeF678gHi",
                version: "3456789012"
            });

            expect(mockClient.getFile).toHaveBeenCalledWith("aBc345DeF678gHi", {
                version: "3456789012",
                depth: undefined,
                geometry: undefined,
                branch_data: undefined
            });
        });

        it("calls client with geometry enabled", async () => {
            mockClient.getFile.mockResolvedValueOnce({
                name: "Logo Variations",
                document: {
                    id: "0:0",
                    children: [
                        {
                            id: "1:50",
                            fillGeometry: [{ path: "M 0 100...", windingRule: "NONZERO" }]
                        }
                    ]
                }
            });

            await executeGetFile(mockClient, {
                fileKey: "jKl901MnO234pQr",
                includeGeometry: true
            });

            expect(mockClient.getFile).toHaveBeenCalledWith("jKl901MnO234pQr", {
                version: undefined,
                depth: undefined,
                geometry: "paths",
                branch_data: undefined
            });
        });

        it("calls client with branch data enabled", async () => {
            mockClient.getFile.mockResolvedValueOnce({
                name: "E-commerce UI Kit",
                branches: [{ key: "branchKey123", name: "Feature: Dark Mode" }]
            });

            await executeGetFile(mockClient, {
                fileKey: "vWx567YzA890bCd",
                branchData: true
            });

            expect(mockClient.getFile).toHaveBeenCalledWith("vWx567YzA890bCd", {
                version: undefined,
                depth: undefined,
                geometry: undefined,
                branch_data: true
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getFile.mockRejectedValueOnce(new Error("Figma resource not found."));

            const result = await executeGetFile(mockClient, {
                fileKey: "nonExistentFileKey123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Figma resource not found.");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles permission denied error", async () => {
            mockClient.getFile.mockRejectedValueOnce(
                new Error("You don't have permission to access this Figma resource.")
            );

            const result = await executeGetFile(mockClient, {
                fileKey: "privateTeamFile789"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe(
                "You don't have permission to access this Figma resource."
            );
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getFile.mockRejectedValueOnce({ unexpected: "error" });

            const result = await executeGetFile(mockClient, {
                fileKey: "test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get Figma file");
        });
    });

    describe("executeGetFileNodes", () => {
        it("calls client with fileKey and nodeIds", async () => {
            const mockResponse = {
                name: "Mobile App Design System",
                nodes: {
                    "2:100": {
                        document: { id: "2:100", name: "Button/Primary", type: "COMPONENT" }
                    }
                }
            };

            mockClient.getFileNodes.mockResolvedValueOnce(mockResponse);

            await executeGetFileNodes(mockClient, {
                fileKey: "xYz123AbC456dEf",
                nodeIds: ["2:100"]
            });

            expect(mockClient.getFileNodes).toHaveBeenCalledWith("xYz123AbC456dEf", ["2:100"], {
                version: undefined,
                depth: undefined,
                geometry: undefined
            });
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                name: "Mobile App Design System",
                lastModified: "2024-03-15T18:42:00Z",
                nodes: {
                    "2:100": {
                        document: {
                            id: "2:100",
                            name: "Button/Primary",
                            type: "COMPONENT",
                            absoluteBoundingBox: { x: 100, y: 100, width: 120, height: 48 }
                        },
                        components: {},
                        styles: {}
                    }
                }
            };

            mockClient.getFileNodes.mockResolvedValueOnce(mockResponse);

            const result = await executeGetFileNodes(mockClient, {
                fileKey: "xYz123AbC456dEf",
                nodeIds: ["2:100"]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("calls client with multiple nodeIds", async () => {
            mockClient.getFileNodes.mockResolvedValueOnce({
                nodes: {
                    "3:100": { document: { id: "3:100", name: "Home Screen" } },
                    "3:200": { document: { id: "3:200", name: "Profile Screen" } }
                }
            });

            await executeGetFileNodes(mockClient, {
                fileKey: "xYz123AbC456dEf",
                nodeIds: ["3:100", "3:200"]
            });

            expect(mockClient.getFileNodes).toHaveBeenCalledWith(
                "xYz123AbC456dEf",
                ["3:100", "3:200"],
                {
                    version: undefined,
                    depth: undefined,
                    geometry: undefined
                }
            );
        });

        it("calls client with depth limit", async () => {
            mockClient.getFileNodes.mockResolvedValueOnce({
                nodes: {
                    "10:1": { document: { id: "10:1", name: "Hero Section", children: [] } }
                }
            });

            await executeGetFileNodes(mockClient, {
                fileKey: "pQr789StU012vWx",
                nodeIds: ["10:1"],
                depth: 1
            });

            expect(mockClient.getFileNodes).toHaveBeenCalledWith("pQr789StU012vWx", ["10:1"], {
                version: undefined,
                depth: 1,
                geometry: undefined
            });
        });

        it("calls client with specific version", async () => {
            mockClient.getFileNodes.mockResolvedValueOnce({
                version: "3456789012",
                nodes: {
                    "5:100": { document: { id: "5:100", name: "icon/chevron-right" } }
                }
            });

            await executeGetFileNodes(mockClient, {
                fileKey: "aBc345DeF678gHi",
                nodeIds: ["5:100"],
                version: "3456789012"
            });

            expect(mockClient.getFileNodes).toHaveBeenCalledWith("aBc345DeF678gHi", ["5:100"], {
                version: "3456789012",
                depth: undefined,
                geometry: undefined
            });
        });

        it("calls client with geometry enabled", async () => {
            mockClient.getFileNodes.mockResolvedValueOnce({
                nodes: {
                    "1:50": {
                        document: {
                            id: "1:50",
                            fillGeometry: [{ path: "M 0 100...", windingRule: "NONZERO" }]
                        }
                    }
                }
            });

            await executeGetFileNodes(mockClient, {
                fileKey: "jKl901MnO234pQr",
                nodeIds: ["1:50"],
                includeGeometry: true
            });

            expect(mockClient.getFileNodes).toHaveBeenCalledWith("jKl901MnO234pQr", ["1:50"], {
                version: undefined,
                depth: undefined,
                geometry: "paths"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getFileNodes.mockRejectedValueOnce(new Error("Figma resource not found."));

            const result = await executeGetFileNodes(mockClient, {
                fileKey: "nonExistentFileKey123",
                nodeIds: ["1:2"]
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Figma resource not found.");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles node not found error", async () => {
            mockClient.getFileNodes.mockRejectedValueOnce(
                new Error("Figma API error: Node not found")
            );

            const result = await executeGetFileNodes(mockClient, {
                fileKey: "xYz123AbC456dEf",
                nodeIds: ["9999:9999"]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Figma API error: Node not found");
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getFileNodes.mockRejectedValueOnce(null);

            const result = await executeGetFileNodes(mockClient, {
                fileKey: "test",
                nodeIds: ["1:1"]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get file nodes");
        });
    });

    describe("executeGetFileVersions", () => {
        it("calls client with fileKey", async () => {
            const mockResponse = {
                versions: [
                    {
                        id: "5678901234",
                        created_at: "2024-03-15T18:42:00Z",
                        label: "Final Design Review",
                        user: { id: "987654321", handle: "sarah.designer" }
                    }
                ]
            };

            mockClient.getFileVersions.mockResolvedValueOnce(mockResponse);

            await executeGetFileVersions(mockClient, {
                fileKey: "xYz123AbC456dEf"
            });

            expect(mockClient.getFileVersions).toHaveBeenCalledWith("xYz123AbC456dEf");
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                versions: [
                    {
                        id: "5678901234",
                        created_at: "2024-03-15T18:42:00Z",
                        label: "Final Design Review",
                        description: "Approved by stakeholders",
                        user: {
                            id: "987654321",
                            handle: "sarah.designer",
                            img_url: "https://s3-alpha.figma.com/profile/987654321"
                        }
                    },
                    {
                        id: "5678901233",
                        created_at: "2024-03-14T16:30:00Z",
                        label: "Updated Components",
                        description: "Refined button states",
                        user: {
                            id: "987654321",
                            handle: "sarah.designer",
                            img_url: "https://s3-alpha.figma.com/profile/987654321"
                        }
                    }
                ]
            };

            mockClient.getFileVersions.mockResolvedValueOnce(mockResponse);

            const result = await executeGetFileVersions(mockClient, {
                fileKey: "xYz123AbC456dEf"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("handles single version for new file", async () => {
            mockClient.getFileVersions.mockResolvedValueOnce({
                versions: [
                    {
                        id: "1000000001",
                        created_at: "2024-03-15T20:00:00Z",
                        label: null,
                        description: null,
                        user: { id: "456789123", handle: "new.designer" }
                    }
                ]
            });

            const result = await executeGetFileVersions(mockClient, {
                fileKey: "newFile123AbC456"
            });

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty("versions");
        });

        it("handles multiple contributors", async () => {
            mockClient.getFileVersions.mockResolvedValueOnce({
                versions: [
                    { id: "v1", user: { handle: "user1" } },
                    { id: "v2", user: { handle: "user2" } },
                    { id: "v3", user: { handle: "user3" } }
                ]
            });

            const result = await executeGetFileVersions(mockClient, {
                fileKey: "teamProject789StU"
            });

            expect(result.success).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.getFileVersions.mockRejectedValueOnce(
                new Error("Figma resource not found.")
            );

            const result = await executeGetFileVersions(mockClient, {
                fileKey: "nonExistentFileKey123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Figma resource not found.");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles permission denied error", async () => {
            mockClient.getFileVersions.mockRejectedValueOnce(
                new Error("You don't have permission to access this Figma resource.")
            );

            const result = await executeGetFileVersions(mockClient, {
                fileKey: "privateTeamFile789"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe(
                "You don't have permission to access this Figma resource."
            );
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getFileVersions.mockRejectedValueOnce(undefined);

            const result = await executeGetFileVersions(mockClient, {
                fileKey: "test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get file versions");
        });
    });

    describe("executeListComments", () => {
        it("calls client with fileKey", async () => {
            const mockResponse = {
                comments: [
                    {
                        id: "1234567890",
                        file_key: "xYz123AbC456dEf",
                        parent_id: null,
                        message: "Great work!",
                        user: { handle: "sarah.designer" }
                    }
                ]
            };

            mockClient.getComments.mockResolvedValueOnce(mockResponse);

            await executeListComments(mockClient, {
                fileKey: "xYz123AbC456dEf"
            });

            expect(mockClient.getComments).toHaveBeenCalledWith("xYz123AbC456dEf");
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                comments: [
                    {
                        id: "1234567890",
                        file_key: "xYz123AbC456dEf",
                        parent_id: null,
                        user: {
                            id: "987654321",
                            handle: "sarah.designer",
                            img_url: "https://s3-alpha.figma.com/profile/987654321"
                        },
                        created_at: "2024-03-15T14:30:00Z",
                        resolved_at: null,
                        message: "Great work on the hero section!",
                        client_meta: { x: 720.5, y: 360.25, node_id: "3:100" },
                        order_id: "1"
                    }
                ]
            };

            mockClient.getComments.mockResolvedValueOnce(mockResponse);

            const result = await executeListComments(mockClient, {
                fileKey: "xYz123AbC456dEf"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns empty comments array for file with no comments", async () => {
            mockClient.getComments.mockResolvedValueOnce({
                comments: []
            });

            const result = await executeListComments(mockClient, {
                fileKey: "newFileNoComments"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ comments: [] });
        });

        it("returns comments with replies (parent_id)", async () => {
            mockClient.getComments.mockResolvedValueOnce({
                comments: [
                    {
                        id: "1234567890",
                        parent_id: null,
                        message: "Original comment"
                    },
                    {
                        id: "1234567891",
                        parent_id: "1234567890",
                        message: "Reply to original"
                    }
                ]
            });

            const result = await executeListComments(mockClient, {
                fileKey: "xYz123AbC456dEf"
            });

            expect(result.success).toBe(true);
            const data = result.data as { comments: Array<{ parent_id: string | null }> };
            expect(data.comments[1].parent_id).toBe("1234567890");
        });

        it("returns resolved comments with resolved_at", async () => {
            mockClient.getComments.mockResolvedValueOnce({
                comments: [
                    {
                        id: "2345678901",
                        resolved_at: "2024-03-15T18:00:00Z",
                        message: "This was resolved"
                    }
                ]
            });

            const result = await executeListComments(mockClient, {
                fileKey: "xYz123AbC456dEf"
            });

            expect(result.success).toBe(true);
            const data = result.data as { comments: Array<{ resolved_at: string }> };
            expect(data.comments[0].resolved_at).toBe("2024-03-15T18:00:00Z");
        });

        it("returns error on client failure", async () => {
            mockClient.getComments.mockRejectedValueOnce(new Error("Figma resource not found."));

            const result = await executeListComments(mockClient, {
                fileKey: "nonExistentFileKey123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Figma resource not found.");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles permission denied error", async () => {
            mockClient.getComments.mockRejectedValueOnce(
                new Error("You don't have permission to access this Figma resource.")
            );

            const result = await executeListComments(mockClient, {
                fileKey: "privateTeamFile789"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe(
                "You don't have permission to access this Figma resource."
            );
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getComments.mockRejectedValueOnce(42);

            const result = await executeListComments(mockClient, {
                fileKey: "test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list comments");
        });
    });

    describe("schema validation", () => {
        describe("createCommentOperation.inputSchema", () => {
            const schema = createCommentOperation.inputSchema;

            it("validates minimal input", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    message: "Test comment"
                });
                expect(result.success).toBe(true);
            });

            it("validates input with coordinates", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    message: "Comment at position",
                    x: 100.5,
                    y: 200.25
                });
                expect(result.success).toBe(true);
            });

            it("validates input with nodeId", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    message: "Comment on node",
                    x: 100,
                    y: 200,
                    nodeId: "1:234"
                });
                expect(result.success).toBe(true);
            });

            it("validates input with parentId for replies", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    message: "Reply comment",
                    parentId: "123456789"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing fileKey", () => {
                const result = schema.safeParse({
                    message: "Test comment"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing message", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty message", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    message: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("exportImagesOperation.inputSchema", () => {
            const schema = exportImagesOperation.inputSchema;

            it("validates minimal input", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    nodeIds: ["1:2"]
                });
                expect(result.success).toBe(true);
            });

            it("validates all formats", () => {
                const formats = ["png", "jpg", "svg", "pdf"] as const;
                for (const format of formats) {
                    const result = schema.safeParse({
                        fileKey: "xYz123AbC456dEf",
                        nodeIds: ["1:2"],
                        format
                    });
                    expect(result.success).toBe(true);
                }
            });

            it("validates scale within range", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    nodeIds: ["1:2"],
                    scale: 2
                });
                expect(result.success).toBe(true);
            });

            it("rejects scale below minimum", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    nodeIds: ["1:2"],
                    scale: 0.001
                });
                expect(result.success).toBe(false);
            });

            it("rejects scale above maximum", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    nodeIds: ["1:2"],
                    scale: 5
                });
                expect(result.success).toBe(false);
            });

            it("validates SVG options", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    nodeIds: ["1:2"],
                    format: "svg",
                    svgIncludeId: true,
                    svgSimplifyStroke: false
                });
                expect(result.success).toBe(true);
            });

            it("validates useAbsoluteBounds", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    nodeIds: ["1:2"],
                    useAbsoluteBounds: true
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty nodeIds array", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    nodeIds: []
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid format", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    nodeIds: ["1:2"],
                    format: "webp"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getFileOperation.inputSchema", () => {
            const schema = getFileOperation.inputSchema;

            it("validates minimal input", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf"
                });
                expect(result.success).toBe(true);
            });

            it("validates with version", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    version: "5678901234"
                });
                expect(result.success).toBe(true);
            });

            it("validates with depth", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    depth: 3
                });
                expect(result.success).toBe(true);
            });

            it("validates with includeGeometry", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    includeGeometry: true
                });
                expect(result.success).toBe(true);
            });

            it("validates with branchData", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    branchData: true
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    version: "5678901234",
                    depth: 2,
                    includeGeometry: true,
                    branchData: false
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing fileKey", () => {
                const result = schema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects depth less than 1", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    depth: 0
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getFileNodesOperation.inputSchema", () => {
            const schema = getFileNodesOperation.inputSchema;

            it("validates minimal input", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    nodeIds: ["2:100"]
                });
                expect(result.success).toBe(true);
            });

            it("validates multiple nodeIds", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    nodeIds: ["2:100", "3:100", "4:200"]
                });
                expect(result.success).toBe(true);
            });

            it("validates with all options", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    nodeIds: ["2:100"],
                    version: "5678901234",
                    depth: 2,
                    includeGeometry: true
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty nodeIds array", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf",
                    nodeIds: []
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing nodeIds", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getFileVersionsOperation.inputSchema", () => {
            const schema = getFileVersionsOperation.inputSchema;

            it("validates fileKey only", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing fileKey", () => {
                const result = schema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("accepts empty fileKey (no min constraint)", () => {
                const result = schema.safeParse({
                    fileKey: ""
                });
                // Schema allows empty string since no .min(1) constraint
                expect(result.success).toBe(true);
            });
        });

        describe("listCommentsOperation.inputSchema", () => {
            const schema = listCommentsOperation.inputSchema;

            it("validates fileKey only", () => {
                const result = schema.safeParse({
                    fileKey: "xYz123AbC456dEf"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing fileKey", () => {
                const result = schema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("accepts empty fileKey (no min constraint)", () => {
                const result = schema.safeParse({
                    fileKey: ""
                });
                // Schema allows empty string since no .min(1) constraint
                expect(result.success).toBe(true);
            });
        });
    });
});
