/**
 * AWS S3 Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeCopyObject, copyObjectSchema } from "../operations/copyObject";
import { executeCreateBucket, createBucketSchema } from "../operations/createBucket";
import { executeDeleteBucket, deleteBucketSchema } from "../operations/deleteBucket";
import { executeDeleteObject, deleteObjectSchema } from "../operations/deleteObject";
import { executeDeleteObjects, deleteObjectsSchema } from "../operations/deleteObjects";
import { executeDownloadObject, downloadObjectSchema } from "../operations/downloadObject";
import { executeGetObjectMetadata, getObjectMetadataSchema } from "../operations/getObjectMetadata";
import { executeGetPresignedUrl, getPresignedUrlSchema } from "../operations/getPresignedUrl";
import { executeListBuckets, listBucketsSchema } from "../operations/listBuckets";
import { executeListObjects, listObjectsSchema } from "../operations/listObjects";
import { executeUploadObject, uploadObjectSchema } from "../operations/uploadObject";
import type { AWSS3Client } from "../client/AWSS3Client";

// Mock AWSS3Client factory
function createMockAWSS3Client(): jest.Mocked<AWSS3Client> {
    return {
        listBuckets: jest.fn(),
        createBucket: jest.fn(),
        deleteBucket: jest.fn(),
        getBucketLocation: jest.fn(),
        listObjects: jest.fn(),
        getObjectMetadata: jest.fn(),
        getObject: jest.fn(),
        putObject: jest.fn(),
        deleteObject: jest.fn(),
        deleteObjects: jest.fn(),
        copyObject: jest.fn(),
        getPresignedUrl: jest.fn()
    } as unknown as jest.Mocked<AWSS3Client>;
}

describe("AWS S3 Operation Executors", () => {
    let mockClient: jest.Mocked<AWSS3Client>;

    beforeEach(() => {
        mockClient = createMockAWSS3Client();
    });

    // ============================================
    // LIST BUCKETS
    // ============================================
    describe("executeListBuckets", () => {
        it("calls client with correct params", async () => {
            mockClient.listBuckets.mockResolvedValueOnce({
                buckets: []
            });

            await executeListBuckets(mockClient, {});

            expect(mockClient.listBuckets).toHaveBeenCalled();
        });

        it("returns normalized output on success", async () => {
            mockClient.listBuckets.mockResolvedValueOnce({
                buckets: [
                    { name: "my-bucket-1", creationDate: "2024-01-01T00:00:00.000Z" },
                    { name: "my-bucket-2", creationDate: "2024-01-15T00:00:00.000Z" }
                ]
            });

            const result = await executeListBuckets(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                buckets: [
                    { name: "my-bucket-1", creationDate: "2024-01-01T00:00:00.000Z" },
                    { name: "my-bucket-2", creationDate: "2024-01-15T00:00:00.000Z" }
                ]
            });
        });

        it("returns empty array when no buckets exist", async () => {
            mockClient.listBuckets.mockResolvedValueOnce({
                buckets: []
            });

            const result = await executeListBuckets(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.buckets).toEqual([]);
        });

        it("returns error on client failure", async () => {
            mockClient.listBuckets.mockRejectedValueOnce(new Error("Access Denied"));

            const result = await executeListBuckets(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Access Denied");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listBuckets.mockRejectedValueOnce("string error");

            const result = await executeListBuckets(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list buckets");
        });
    });

    // ============================================
    // CREATE BUCKET
    // ============================================
    describe("executeCreateBucket", () => {
        it("calls client with correct params", async () => {
            mockClient.createBucket.mockResolvedValueOnce(undefined);

            await executeCreateBucket(mockClient, { bucket: "new-bucket-123" });

            expect(mockClient.createBucket).toHaveBeenCalledWith({
                bucket: "new-bucket-123"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.createBucket.mockResolvedValueOnce(undefined);

            const result = await executeCreateBucket(mockClient, { bucket: "new-bucket-123" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                bucket: "new-bucket-123",
                created: true
            });
        });

        it("returns validation error on BucketAlreadyExists", async () => {
            mockClient.createBucket.mockRejectedValueOnce(
                new Error("S3 Error (BucketAlreadyExists): Bucket already exists")
            );

            const result = await executeCreateBucket(mockClient, { bucket: "existing-bucket" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("validation");
            expect(result.error?.message).toContain("BucketAlreadyExists");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns validation error on BucketAlreadyOwnedByYou", async () => {
            mockClient.createBucket.mockRejectedValueOnce(
                new Error("S3 Error (BucketAlreadyOwnedByYou): Bucket owned by you")
            );

            const result = await executeCreateBucket(mockClient, { bucket: "my-bucket" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("validation");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns server error on other failures", async () => {
            mockClient.createBucket.mockRejectedValueOnce(new Error("Internal Server Error"));

            const result = await executeCreateBucket(mockClient, { bucket: "new-bucket" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createBucket.mockRejectedValueOnce("string error");

            const result = await executeCreateBucket(mockClient, { bucket: "test-bucket" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create bucket");
        });
    });

    // ============================================
    // DELETE BUCKET
    // ============================================
    describe("executeDeleteBucket", () => {
        it("calls client with correct params", async () => {
            mockClient.deleteBucket.mockResolvedValueOnce(undefined);

            await executeDeleteBucket(mockClient, { bucket: "my-empty-bucket" });

            expect(mockClient.deleteBucket).toHaveBeenCalledWith("my-empty-bucket");
        });

        it("returns normalized output on success", async () => {
            mockClient.deleteBucket.mockResolvedValueOnce(undefined);

            const result = await executeDeleteBucket(mockClient, { bucket: "my-empty-bucket" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                bucket: "my-empty-bucket"
            });
        });

        it("returns not_found error on NoSuchBucket", async () => {
            mockClient.deleteBucket.mockRejectedValueOnce(
                new Error("S3 Error (NoSuchBucket): The specified bucket does not exist")
            );

            const result = await executeDeleteBucket(mockClient, { bucket: "nonexistent-bucket" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toContain("NoSuchBucket");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns validation error on BucketNotEmpty", async () => {
            mockClient.deleteBucket.mockRejectedValueOnce(
                new Error("S3 Error (BucketNotEmpty): The bucket you tried to delete is not empty")
            );

            const result = await executeDeleteBucket(mockClient, { bucket: "non-empty-bucket" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("validation");
            expect(result.error?.message).toContain("BucketNotEmpty");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns server error on other failures", async () => {
            mockClient.deleteBucket.mockRejectedValueOnce(new Error("Internal Server Error"));

            const result = await executeDeleteBucket(mockClient, { bucket: "my-bucket" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.deleteBucket.mockRejectedValueOnce("string error");

            const result = await executeDeleteBucket(mockClient, { bucket: "test-bucket" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to delete bucket");
        });
    });

    // ============================================
    // LIST OBJECTS
    // ============================================
    describe("executeListObjects", () => {
        it("calls client with correct params", async () => {
            mockClient.listObjects.mockResolvedValueOnce({
                contents: [],
                isTruncated: false,
                commonPrefixes: []
            });

            await executeListObjects(mockClient, { bucket: "my-bucket" });

            expect(mockClient.listObjects).toHaveBeenCalledWith({
                bucket: "my-bucket",
                prefix: undefined,
                delimiter: undefined,
                maxKeys: undefined,
                continuationToken: undefined
            });
        });

        it("calls client with all optional params", async () => {
            mockClient.listObjects.mockResolvedValueOnce({
                contents: [],
                isTruncated: false,
                commonPrefixes: []
            });

            await executeListObjects(mockClient, {
                bucket: "my-bucket",
                prefix: "documents/",
                delimiter: "/",
                maxKeys: 100,
                continuationToken: "abc123"
            });

            expect(mockClient.listObjects).toHaveBeenCalledWith({
                bucket: "my-bucket",
                prefix: "documents/",
                delimiter: "/",
                maxKeys: 100,
                continuationToken: "abc123"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listObjects.mockResolvedValueOnce({
                contents: [
                    {
                        key: "documents/report.pdf",
                        lastModified: "2024-01-15T10:00:00.000Z",
                        eTag: "abc123",
                        size: "2456789",
                        storageClass: "STANDARD"
                    },
                    {
                        key: "images/logo.png",
                        lastModified: "2024-01-16T10:00:00.000Z",
                        eTag: "def456",
                        size: "156789",
                        storageClass: "STANDARD"
                    }
                ],
                isTruncated: false,
                commonPrefixes: []
            });

            const result = await executeListObjects(mockClient, { bucket: "my-bucket" });

            expect(result.success).toBe(true);
            expect(result.data?.contents).toHaveLength(2);
            expect(result.data?.isTruncated).toBe(false);
            expect(result.data?.commonPrefixes).toEqual([]);
        });

        it("returns pagination token when truncated", async () => {
            mockClient.listObjects.mockResolvedValueOnce({
                contents: [
                    {
                        key: "file1.txt",
                        lastModified: "2024-01-15T10:00:00.000Z",
                        eTag: "abc123",
                        size: "1000",
                        storageClass: "STANDARD"
                    }
                ],
                isTruncated: true,
                nextContinuationToken: "next-token-abc",
                commonPrefixes: []
            });

            const result = await executeListObjects(mockClient, {
                bucket: "my-bucket",
                maxKeys: 1
            });

            expect(result.success).toBe(true);
            expect(result.data?.isTruncated).toBe(true);
            expect(result.data?.nextContinuationToken).toBe("next-token-abc");
        });

        it("returns common prefixes when using delimiter", async () => {
            mockClient.listObjects.mockResolvedValueOnce({
                contents: [],
                isTruncated: false,
                commonPrefixes: ["documents/", "images/", "videos/"]
            });

            const result = await executeListObjects(mockClient, {
                bucket: "my-bucket",
                delimiter: "/"
            });

            expect(result.success).toBe(true);
            expect(result.data?.commonPrefixes).toEqual(["documents/", "images/", "videos/"]);
        });

        it("returns not_found error on NoSuchBucket", async () => {
            mockClient.listObjects.mockRejectedValueOnce(
                new Error("S3 Error (NoSuchBucket): The specified bucket does not exist")
            );

            const result = await executeListObjects(mockClient, { bucket: "nonexistent-bucket" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns server error on other failures", async () => {
            mockClient.listObjects.mockRejectedValueOnce(new Error("Internal Server Error"));

            const result = await executeListObjects(mockClient, { bucket: "my-bucket" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listObjects.mockRejectedValueOnce("string error");

            const result = await executeListObjects(mockClient, { bucket: "my-bucket" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list objects");
        });
    });

    // ============================================
    // UPLOAD OBJECT
    // ============================================
    describe("executeUploadObject", () => {
        it("calls client with correct params", async () => {
            mockClient.putObject.mockResolvedValueOnce({
                eTag: "abc123"
            });

            await executeUploadObject(mockClient, {
                bucket: "my-bucket",
                key: "uploads/file.txt",
                body: "SGVsbG8sIFdvcmxkIQ==",
                contentType: "text/plain"
            });

            expect(mockClient.putObject).toHaveBeenCalledWith({
                bucket: "my-bucket",
                key: "uploads/file.txt",
                body: "SGVsbG8sIFdvcmxkIQ==",
                contentType: "text/plain",
                metadata: undefined,
                storageClass: undefined
            });
        });

        it("calls client with all optional params", async () => {
            mockClient.putObject.mockResolvedValueOnce({
                eTag: "abc123"
            });

            await executeUploadObject(mockClient, {
                bucket: "my-bucket",
                key: "uploads/file.txt",
                body: "SGVsbG8sIFdvcmxkIQ==",
                contentType: "text/plain",
                metadata: { author: "test-user" },
                storageClass: "STANDARD_IA"
            });

            expect(mockClient.putObject).toHaveBeenCalledWith({
                bucket: "my-bucket",
                key: "uploads/file.txt",
                body: "SGVsbG8sIFdvcmxkIQ==",
                contentType: "text/plain",
                metadata: { author: "test-user" },
                storageClass: "STANDARD_IA"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.putObject.mockResolvedValueOnce({
                eTag: "5eb63bbbe01eeed093cb22bb8f5acdc3"
            });

            const result = await executeUploadObject(mockClient, {
                bucket: "my-bucket",
                key: "uploads/new-file.txt",
                body: "SGVsbG8=",
                contentType: "text/plain"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                bucket: "my-bucket",
                key: "uploads/new-file.txt",
                eTag: "5eb63bbbe01eeed093cb22bb8f5acdc3",
                versionId: undefined
            });
        });

        it("returns versionId when versioning is enabled", async () => {
            mockClient.putObject.mockResolvedValueOnce({
                eTag: "abc123",
                versionId: "v1.1234567890"
            });

            const result = await executeUploadObject(mockClient, {
                bucket: "versioned-bucket",
                key: "file.txt",
                body: "SGVsbG8=",
                contentType: "text/plain"
            });

            expect(result.success).toBe(true);
            expect(result.data?.versionId).toBe("v1.1234567890");
        });

        it("returns not_found error on NoSuchBucket", async () => {
            mockClient.putObject.mockRejectedValueOnce(
                new Error("S3 Error (NoSuchBucket): The specified bucket does not exist")
            );

            const result = await executeUploadObject(mockClient, {
                bucket: "nonexistent-bucket",
                key: "file.txt",
                body: "SGVsbG8=",
                contentType: "text/plain"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns server error on other failures", async () => {
            mockClient.putObject.mockRejectedValueOnce(new Error("Internal Server Error"));

            const result = await executeUploadObject(mockClient, {
                bucket: "my-bucket",
                key: "file.txt",
                body: "SGVsbG8=",
                contentType: "text/plain"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.putObject.mockRejectedValueOnce("string error");

            const result = await executeUploadObject(mockClient, {
                bucket: "my-bucket",
                key: "file.txt",
                body: "SGVsbG8=",
                contentType: "text/plain"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to upload object");
        });
    });

    // ============================================
    // DOWNLOAD OBJECT
    // ============================================
    describe("executeDownloadObject", () => {
        it("calls client with correct params", async () => {
            mockClient.getObject.mockResolvedValueOnce({
                body: Buffer.from("Hello, World!"),
                contentType: "text/plain",
                contentLength: 13,
                lastModified: "2024-01-15T10:00:00.000Z",
                eTag: "abc123"
            });

            await executeDownloadObject(mockClient, {
                bucket: "my-bucket",
                key: "documents/file.txt"
            });

            expect(mockClient.getObject).toHaveBeenCalledWith({
                bucket: "my-bucket",
                key: "documents/file.txt"
            });
        });

        it("returns normalized output on success with base64 content", async () => {
            const content = "Hello, World!";
            mockClient.getObject.mockResolvedValueOnce({
                body: Buffer.from(content),
                contentType: "text/plain",
                contentLength: 13,
                lastModified: "2024-01-15T10:00:00.000Z",
                eTag: "abc123"
            });

            const result = await executeDownloadObject(mockClient, {
                bucket: "my-bucket",
                key: "file.txt"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                content: Buffer.from(content).toString("base64"),
                contentType: "text/plain",
                size: 13,
                lastModified: "2024-01-15T10:00:00.000Z",
                eTag: "abc123"
            });
        });

        it("returns not_found error on NoSuchKey", async () => {
            mockClient.getObject.mockRejectedValueOnce(
                new Error("S3 Error (NoSuchKey): The specified key does not exist")
            );

            const result = await executeDownloadObject(mockClient, {
                bucket: "my-bucket",
                key: "nonexistent.txt"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toContain("NoSuchKey");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns not_found error on NoSuchBucket", async () => {
            mockClient.getObject.mockRejectedValueOnce(
                new Error("S3 Error (NoSuchBucket): The specified bucket does not exist")
            );

            const result = await executeDownloadObject(mockClient, {
                bucket: "nonexistent-bucket",
                key: "file.txt"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
        });

        it("returns server error on other failures", async () => {
            mockClient.getObject.mockRejectedValueOnce(new Error("Internal Server Error"));

            const result = await executeDownloadObject(mockClient, {
                bucket: "my-bucket",
                key: "file.txt"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getObject.mockRejectedValueOnce("string error");

            const result = await executeDownloadObject(mockClient, {
                bucket: "my-bucket",
                key: "file.txt"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to download object");
        });
    });

    // ============================================
    // DELETE OBJECT
    // ============================================
    describe("executeDeleteObject", () => {
        it("calls client with correct params", async () => {
            mockClient.deleteObject.mockResolvedValueOnce(undefined);

            await executeDeleteObject(mockClient, {
                bucket: "my-bucket",
                key: "documents/report.pdf"
            });

            expect(mockClient.deleteObject).toHaveBeenCalledWith({
                bucket: "my-bucket",
                key: "documents/report.pdf"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.deleteObject.mockResolvedValueOnce(undefined);

            const result = await executeDeleteObject(mockClient, {
                bucket: "my-bucket",
                key: "documents/report.pdf"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                bucket: "my-bucket",
                key: "documents/report.pdf"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.deleteObject.mockRejectedValueOnce(new Error("Access Denied"));

            const result = await executeDeleteObject(mockClient, {
                bucket: "my-bucket",
                key: "file.txt"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Access Denied");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.deleteObject.mockRejectedValueOnce("string error");

            const result = await executeDeleteObject(mockClient, {
                bucket: "my-bucket",
                key: "file.txt"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to delete object");
        });
    });

    // ============================================
    // DELETE MULTIPLE OBJECTS
    // ============================================
    describe("executeDeleteObjects", () => {
        it("calls client with correct params", async () => {
            mockClient.deleteObjects.mockResolvedValueOnce({
                deleted: ["file1.txt", "file2.txt"],
                errors: []
            });

            await executeDeleteObjects(mockClient, {
                bucket: "my-bucket",
                keys: ["file1.txt", "file2.txt"]
            });

            expect(mockClient.deleteObjects).toHaveBeenCalledWith({
                bucket: "my-bucket",
                keys: ["file1.txt", "file2.txt"]
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.deleteObjects.mockResolvedValueOnce({
                deleted: ["documents/report.pdf", "images/logo.png"],
                errors: []
            });

            const result = await executeDeleteObjects(mockClient, {
                bucket: "my-bucket",
                keys: ["documents/report.pdf", "images/logo.png"]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: ["documents/report.pdf", "images/logo.png"],
                errors: [],
                deletedCount: 2,
                errorCount: 0
            });
        });

        it("returns partial success with errors", async () => {
            mockClient.deleteObjects.mockResolvedValueOnce({
                deleted: ["file1.txt"],
                errors: [{ key: "file2.txt", code: "AccessDenied", message: "Access Denied" }]
            });

            const result = await executeDeleteObjects(mockClient, {
                bucket: "my-bucket",
                keys: ["file1.txt", "file2.txt"]
            });

            expect(result.success).toBe(true);
            expect(result.data?.deletedCount).toBe(1);
            expect(result.data?.errorCount).toBe(1);
            expect(result.data?.errors).toHaveLength(1);
            expect(result.data?.errors[0]).toEqual({
                key: "file2.txt",
                code: "AccessDenied",
                message: "Access Denied"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.deleteObjects.mockRejectedValueOnce(new Error("Internal Server Error"));

            const result = await executeDeleteObjects(mockClient, {
                bucket: "my-bucket",
                keys: ["file1.txt"]
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.deleteObjects.mockRejectedValueOnce("string error");

            const result = await executeDeleteObjects(mockClient, {
                bucket: "my-bucket",
                keys: ["file.txt"]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to delete objects");
        });
    });

    // ============================================
    // GET OBJECT METADATA
    // ============================================
    describe("executeGetObjectMetadata", () => {
        it("calls client with correct params", async () => {
            mockClient.getObjectMetadata.mockResolvedValueOnce({
                contentType: "application/pdf",
                contentLength: 2456789,
                lastModified: "2024-01-15T10:00:00.000Z",
                eTag: "abc123",
                metadata: {}
            });

            await executeGetObjectMetadata(mockClient, {
                bucket: "my-bucket",
                key: "documents/report.pdf"
            });

            expect(mockClient.getObjectMetadata).toHaveBeenCalledWith({
                bucket: "my-bucket",
                key: "documents/report.pdf"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.getObjectMetadata.mockResolvedValueOnce({
                contentType: "application/pdf",
                contentLength: 2456789,
                lastModified: "2024-01-15T10:00:00.000Z",
                eTag: "d41d8cd98f00b204e9800998ecf8427e",
                metadata: { author: "test-user" }
            });

            const result = await executeGetObjectMetadata(mockClient, {
                bucket: "my-bucket",
                key: "documents/report.pdf"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                bucket: "my-bucket",
                key: "documents/report.pdf",
                contentType: "application/pdf",
                contentLength: 2456789,
                lastModified: "2024-01-15T10:00:00.000Z",
                eTag: "d41d8cd98f00b204e9800998ecf8427e",
                metadata: { author: "test-user" }
            });
        });

        it("returns not_found error on NoSuchKey", async () => {
            mockClient.getObjectMetadata.mockRejectedValueOnce(
                new Error("S3 Error (NoSuchKey): The specified key does not exist")
            );

            const result = await executeGetObjectMetadata(mockClient, {
                bucket: "my-bucket",
                key: "nonexistent.txt"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns not_found error on 404", async () => {
            mockClient.getObjectMetadata.mockRejectedValueOnce(new Error("S3 HTTP 404: Not Found"));

            const result = await executeGetObjectMetadata(mockClient, {
                bucket: "my-bucket",
                key: "nonexistent.txt"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
        });

        it("returns server error on other failures", async () => {
            mockClient.getObjectMetadata.mockRejectedValueOnce(new Error("Internal Server Error"));

            const result = await executeGetObjectMetadata(mockClient, {
                bucket: "my-bucket",
                key: "file.txt"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getObjectMetadata.mockRejectedValueOnce("string error");

            const result = await executeGetObjectMetadata(mockClient, {
                bucket: "my-bucket",
                key: "file.txt"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get object metadata");
        });
    });

    // ============================================
    // COPY OBJECT
    // ============================================
    describe("executeCopyObject", () => {
        it("calls client with correct params", async () => {
            mockClient.copyObject.mockResolvedValueOnce({
                eTag: "abc123",
                lastModified: "2024-01-22T10:00:00.000Z"
            });

            await executeCopyObject(mockClient, {
                sourceBucket: "source-bucket",
                sourceKey: "documents/report.pdf",
                destinationBucket: "dest-bucket",
                destinationKey: "backup/report.pdf"
            });

            expect(mockClient.copyObject).toHaveBeenCalledWith({
                sourceBucket: "source-bucket",
                sourceKey: "documents/report.pdf",
                destinationBucket: "dest-bucket",
                destinationKey: "backup/report.pdf",
                metadata: undefined,
                storageClass: undefined
            });
        });

        it("calls client with all optional params", async () => {
            mockClient.copyObject.mockResolvedValueOnce({
                eTag: "abc123",
                lastModified: "2024-01-22T10:00:00.000Z"
            });

            await executeCopyObject(mockClient, {
                sourceBucket: "source-bucket",
                sourceKey: "documents/report.pdf",
                destinationBucket: "dest-bucket",
                destinationKey: "backup/report.pdf",
                metadata: { copiedBy: "test" },
                storageClass: "GLACIER"
            });

            expect(mockClient.copyObject).toHaveBeenCalledWith({
                sourceBucket: "source-bucket",
                sourceKey: "documents/report.pdf",
                destinationBucket: "dest-bucket",
                destinationKey: "backup/report.pdf",
                metadata: { copiedBy: "test" },
                storageClass: "GLACIER"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.copyObject.mockResolvedValueOnce({
                eTag: "d41d8cd98f00b204e9800998ecf8427e",
                lastModified: "2024-01-22T10:00:00.000Z"
            });

            const result = await executeCopyObject(mockClient, {
                sourceBucket: "my-bucket",
                sourceKey: "documents/report.pdf",
                destinationBucket: "my-bucket",
                destinationKey: "backup/report-copy.pdf"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                sourceBucket: "my-bucket",
                sourceKey: "documents/report.pdf",
                destinationBucket: "my-bucket",
                destinationKey: "backup/report-copy.pdf",
                eTag: "d41d8cd98f00b204e9800998ecf8427e",
                lastModified: "2024-01-22T10:00:00.000Z"
            });
        });

        it("returns not_found error on NoSuchKey", async () => {
            mockClient.copyObject.mockRejectedValueOnce(
                new Error("S3 Error (NoSuchKey): The specified key does not exist")
            );

            const result = await executeCopyObject(mockClient, {
                sourceBucket: "my-bucket",
                sourceKey: "nonexistent.pdf",
                destinationBucket: "my-bucket",
                destinationKey: "copy.pdf"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns not_found error on NoSuchBucket", async () => {
            mockClient.copyObject.mockRejectedValueOnce(
                new Error("S3 Error (NoSuchBucket): The specified bucket does not exist")
            );

            const result = await executeCopyObject(mockClient, {
                sourceBucket: "nonexistent-bucket",
                sourceKey: "file.pdf",
                destinationBucket: "my-bucket",
                destinationKey: "copy.pdf"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
        });

        it("returns server error on other failures", async () => {
            mockClient.copyObject.mockRejectedValueOnce(new Error("Internal Server Error"));

            const result = await executeCopyObject(mockClient, {
                sourceBucket: "my-bucket",
                sourceKey: "file.pdf",
                destinationBucket: "my-bucket",
                destinationKey: "copy.pdf"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.copyObject.mockRejectedValueOnce("string error");

            const result = await executeCopyObject(mockClient, {
                sourceBucket: "my-bucket",
                sourceKey: "file.pdf",
                destinationBucket: "my-bucket",
                destinationKey: "copy.pdf"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to copy object");
        });
    });

    // ============================================
    // GET PRE-SIGNED URL
    // ============================================
    describe("executeGetPresignedUrl", () => {
        it("calls client with correct params for download", async () => {
            mockClient.getPresignedUrl.mockReturnValueOnce(
                "https://bucket.s3.amazonaws.com/file.pdf?X-Amz-Signature=..."
            );

            await executeGetPresignedUrl(mockClient, {
                bucket: "my-bucket",
                key: "documents/report.pdf",
                expiresIn: 3600,
                method: "GET"
            });

            expect(mockClient.getPresignedUrl).toHaveBeenCalledWith({
                bucket: "my-bucket",
                key: "documents/report.pdf",
                expiresIn: 3600,
                method: "GET"
            });
        });

        it("calls client with correct params for upload", async () => {
            mockClient.getPresignedUrl.mockReturnValueOnce(
                "https://bucket.s3.amazonaws.com/file.pdf?X-Amz-Signature=..."
            );

            await executeGetPresignedUrl(mockClient, {
                bucket: "my-bucket",
                key: "uploads/new-file.pdf",
                expiresIn: 3600,
                method: "PUT"
            });

            expect(mockClient.getPresignedUrl).toHaveBeenCalledWith({
                bucket: "my-bucket",
                key: "uploads/new-file.pdf",
                expiresIn: 3600,
                method: "PUT"
            });
        });

        it("returns normalized output on success", async () => {
            const presignedUrl =
                "https://my-bucket.s3.us-east-1.amazonaws.com/documents/report.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc123";

            mockClient.getPresignedUrl.mockReturnValueOnce(presignedUrl);

            const result = await executeGetPresignedUrl(mockClient, {
                bucket: "my-bucket",
                key: "documents/report.pdf",
                expiresIn: 3600,
                method: "GET"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                url: presignedUrl,
                bucket: "my-bucket",
                key: "documents/report.pdf",
                expiresIn: 3600,
                method: "GET"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getPresignedUrl.mockImplementationOnce(() => {
                throw new Error("Failed to sign URL");
            });

            const result = await executeGetPresignedUrl(mockClient, {
                bucket: "my-bucket",
                key: "file.pdf",
                expiresIn: 3600,
                method: "GET"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Failed to sign URL");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getPresignedUrl.mockImplementationOnce(() => {
                throw "string error";
            });

            const result = await executeGetPresignedUrl(mockClient, {
                bucket: "my-bucket",
                key: "file.pdf",
                expiresIn: 3600,
                method: "GET"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to generate pre-signed URL");
        });
    });

    // ============================================
    // SCHEMA VALIDATION
    // ============================================
    describe("schema validation", () => {
        describe("listBucketsSchema", () => {
            it("validates empty input", () => {
                const result = listBucketsSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("createBucketSchema", () => {
            it("validates valid bucket name", () => {
                const result = createBucketSchema.safeParse({
                    bucket: "my-valid-bucket-123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects bucket name too short", () => {
                const result = createBucketSchema.safeParse({
                    bucket: "ab"
                });
                expect(result.success).toBe(false);
            });

            it("rejects bucket name too long", () => {
                const result = createBucketSchema.safeParse({
                    bucket: "a".repeat(64)
                });
                expect(result.success).toBe(false);
            });

            it("rejects uppercase bucket name", () => {
                const result = createBucketSchema.safeParse({
                    bucket: "MyBucket"
                });
                expect(result.success).toBe(false);
            });

            it("rejects bucket name starting with hyphen", () => {
                const result = createBucketSchema.safeParse({
                    bucket: "-my-bucket"
                });
                expect(result.success).toBe(false);
            });

            it("rejects bucket name ending with hyphen", () => {
                const result = createBucketSchema.safeParse({
                    bucket: "my-bucket-"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing bucket", () => {
                const result = createBucketSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("deleteBucketSchema", () => {
            it("validates valid bucket name", () => {
                const result = deleteBucketSchema.safeParse({
                    bucket: "my-bucket"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing bucket", () => {
                const result = deleteBucketSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listObjectsSchema", () => {
            it("validates minimal input", () => {
                const result = listObjectsSchema.safeParse({
                    bucket: "my-bucket"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = listObjectsSchema.safeParse({
                    bucket: "my-bucket",
                    prefix: "documents/",
                    delimiter: "/",
                    maxKeys: 100,
                    continuationToken: "abc123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects maxKeys over 1000", () => {
                const result = listObjectsSchema.safeParse({
                    bucket: "my-bucket",
                    maxKeys: 1001
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative maxKeys", () => {
                const result = listObjectsSchema.safeParse({
                    bucket: "my-bucket",
                    maxKeys: -1
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing bucket", () => {
                const result = listObjectsSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("uploadObjectSchema", () => {
            it("validates minimal input", () => {
                const result = uploadObjectSchema.safeParse({
                    bucket: "my-bucket",
                    key: "file.txt",
                    body: "SGVsbG8="
                });
                expect(result.success).toBe(true);
            });

            it("validates full input with all options", () => {
                const result = uploadObjectSchema.safeParse({
                    bucket: "my-bucket",
                    key: "file.txt",
                    body: "SGVsbG8=",
                    contentType: "text/plain",
                    metadata: { author: "test" },
                    storageClass: "STANDARD_IA"
                });
                expect(result.success).toBe(true);
            });

            it("applies default contentType", () => {
                const result = uploadObjectSchema.parse({
                    bucket: "my-bucket",
                    key: "file.txt",
                    body: "SGVsbG8="
                });
                expect(result.contentType).toBe("application/octet-stream");
            });

            it("validates all storage classes", () => {
                const storageClasses = [
                    "STANDARD",
                    "REDUCED_REDUNDANCY",
                    "STANDARD_IA",
                    "ONEZONE_IA",
                    "INTELLIGENT_TIERING",
                    "GLACIER",
                    "DEEP_ARCHIVE",
                    "GLACIER_IR"
                ];

                for (const storageClass of storageClasses) {
                    const result = uploadObjectSchema.safeParse({
                        bucket: "my-bucket",
                        key: "file.txt",
                        body: "SGVsbG8=",
                        storageClass
                    });
                    expect(result.success).toBe(true);
                }
            });

            it("rejects invalid storage class", () => {
                const result = uploadObjectSchema.safeParse({
                    bucket: "my-bucket",
                    key: "file.txt",
                    body: "SGVsbG8=",
                    storageClass: "INVALID_CLASS"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty key", () => {
                const result = uploadObjectSchema.safeParse({
                    bucket: "my-bucket",
                    key: "",
                    body: "SGVsbG8="
                });
                expect(result.success).toBe(false);
            });
        });

        describe("downloadObjectSchema", () => {
            it("validates valid input", () => {
                const result = downloadObjectSchema.safeParse({
                    bucket: "my-bucket",
                    key: "documents/file.txt"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing bucket", () => {
                const result = downloadObjectSchema.safeParse({
                    key: "file.txt"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing key", () => {
                const result = downloadObjectSchema.safeParse({
                    bucket: "my-bucket"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("deleteObjectSchema", () => {
            it("validates valid input", () => {
                const result = deleteObjectSchema.safeParse({
                    bucket: "my-bucket",
                    key: "file.txt"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty key", () => {
                const result = deleteObjectSchema.safeParse({
                    bucket: "my-bucket",
                    key: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("deleteObjectsSchema", () => {
            it("validates valid input", () => {
                const result = deleteObjectsSchema.safeParse({
                    bucket: "my-bucket",
                    keys: ["file1.txt", "file2.txt"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty keys array", () => {
                const result = deleteObjectsSchema.safeParse({
                    bucket: "my-bucket",
                    keys: []
                });
                expect(result.success).toBe(false);
            });

            it("rejects keys array over 1000", () => {
                const result = deleteObjectsSchema.safeParse({
                    bucket: "my-bucket",
                    keys: Array.from({ length: 1001 }, (_, i) => `file${i}.txt`)
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing keys", () => {
                const result = deleteObjectsSchema.safeParse({
                    bucket: "my-bucket"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getObjectMetadataSchema", () => {
            it("validates valid input", () => {
                const result = getObjectMetadataSchema.safeParse({
                    bucket: "my-bucket",
                    key: "documents/report.pdf"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing bucket", () => {
                const result = getObjectMetadataSchema.safeParse({
                    key: "file.txt"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("copyObjectSchema", () => {
            it("validates minimal input", () => {
                const result = copyObjectSchema.safeParse({
                    sourceBucket: "source-bucket",
                    sourceKey: "source.pdf",
                    destinationBucket: "dest-bucket",
                    destinationKey: "dest.pdf"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = copyObjectSchema.safeParse({
                    sourceBucket: "source-bucket",
                    sourceKey: "source.pdf",
                    destinationBucket: "dest-bucket",
                    destinationKey: "dest.pdf",
                    metadata: { author: "test" },
                    storageClass: "GLACIER"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing sourceBucket", () => {
                const result = copyObjectSchema.safeParse({
                    sourceKey: "source.pdf",
                    destinationBucket: "dest-bucket",
                    destinationKey: "dest.pdf"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing destinationKey", () => {
                const result = copyObjectSchema.safeParse({
                    sourceBucket: "source-bucket",
                    sourceKey: "source.pdf",
                    destinationBucket: "dest-bucket"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getPresignedUrlSchema", () => {
            it("validates minimal input", () => {
                const result = getPresignedUrlSchema.safeParse({
                    bucket: "my-bucket",
                    key: "file.pdf"
                });
                expect(result.success).toBe(true);
            });

            it("applies default expiresIn", () => {
                const result = getPresignedUrlSchema.parse({
                    bucket: "my-bucket",
                    key: "file.pdf"
                });
                expect(result.expiresIn).toBe(3600);
            });

            it("applies default method", () => {
                const result = getPresignedUrlSchema.parse({
                    bucket: "my-bucket",
                    key: "file.pdf"
                });
                expect(result.method).toBe("GET");
            });

            it("validates full input", () => {
                const result = getPresignedUrlSchema.safeParse({
                    bucket: "my-bucket",
                    key: "file.pdf",
                    expiresIn: 7200,
                    method: "PUT"
                });
                expect(result.success).toBe(true);
            });

            it("rejects expiresIn over max (604800)", () => {
                const result = getPresignedUrlSchema.safeParse({
                    bucket: "my-bucket",
                    key: "file.pdf",
                    expiresIn: 604801
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative expiresIn", () => {
                const result = getPresignedUrlSchema.safeParse({
                    bucket: "my-bucket",
                    key: "file.pdf",
                    expiresIn: -1
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid method", () => {
                const result = getPresignedUrlSchema.safeParse({
                    bucket: "my-bucket",
                    key: "file.pdf",
                    method: "POST"
                });
                expect(result.success).toBe(false);
            });

            it("validates GET method", () => {
                const result = getPresignedUrlSchema.safeParse({
                    bucket: "my-bucket",
                    key: "file.pdf",
                    method: "GET"
                });
                expect(result.success).toBe(true);
            });

            it("validates PUT method", () => {
                const result = getPresignedUrlSchema.safeParse({
                    bucket: "my-bucket",
                    key: "file.pdf",
                    method: "PUT"
                });
                expect(result.success).toBe(true);
            });
        });
    });
});
