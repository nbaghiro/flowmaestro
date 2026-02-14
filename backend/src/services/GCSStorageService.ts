import * as path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { Storage, Bucket } from "@google-cloud/storage";
import { config } from "../core/config";
import { getLogger } from "../core/logging";

const logger = getLogger();

/**
 * GCS bucket types for different use cases
 */
export type GCSBucketType = "uploads" | "knowledgeDocs" | "artifacts" | "interfaceDocs";

export interface UploadOptions {
    userId: string;
    knowledgeBaseId: string;
    filename: string;
}

export interface DownloadToTempOptions {
    gcsUri: string;
    tempDir?: string;
}

export interface UploadBufferOptions {
    fileName: string;
    contentType: string;
}

export class GCSStorageService {
    private storage: Storage;
    private bucket: Bucket;
    private bucketName: string;
    private bucketType: GCSBucketType;

    constructor(bucketType: GCSBucketType = "knowledgeDocs") {
        this.bucketType = bucketType;
        const bucketName = this.getBucketName(bucketType);

        if (!bucketName) {
            const envVarName = this.getEnvVarName(bucketType);
            throw new Error(
                `${envVarName} environment variable is required for ${bucketType} bucket`
            );
        }

        // Initialize Storage with Application Default Credentials
        // In GKE with Workload Identity, this automatically uses the pod's service account
        // For local development, use: gcloud auth application-default login
        // Project ID is auto-detected from the environment
        this.storage = new Storage();

        this.bucketName = bucketName;
        this.bucket = this.storage.bucket(bucketName);
    }

    /**
     * Get bucket name from config based on bucket type
     */
    private getBucketName(bucketType: GCSBucketType): string {
        switch (bucketType) {
            case "uploads":
                return config.gcs.uploadsBucket;
            case "knowledgeDocs":
                return config.gcs.knowledgeDocsBucket;
            case "artifacts":
                return config.gcs.artifactsBucket;
            case "interfaceDocs":
                return config.gcs.interfaceDocsBucket;
        }
    }

    /**
     * Get environment variable name for error messages
     */
    private getEnvVarName(bucketType: GCSBucketType): string {
        switch (bucketType) {
            case "uploads":
                return "GCS_UPLOADS_BUCKET";
            case "knowledgeDocs":
                return "GCS_KNOWLEDGE_DOCS_BUCKET";
            case "artifacts":
                return "GCS_ARTIFACTS_BUCKET";
            case "interfaceDocs":
                return "GCS_INTERFACE_DOCS_BUCKET";
            default: {
                const _exhaustive: never = bucketType;
                throw new Error(`Unknown bucket type: ${_exhaustive}`);
            }
        }
    }

    /**
     * Get the bucket type this service is configured for
     */
    public getBucketType(): GCSBucketType {
        return this.bucketType;
    }

    /**
     * Generate GCS path for a file
     */
    public generateGCSPath(userId: string, knowledgeBaseId: string, filename: string): string {
        const timestamp = Date.now();
        const sanitizedFilename = this.sanitizeFilename(filename);
        return `${userId}/${knowledgeBaseId}/${timestamp}_${sanitizedFilename}`;
    }

    /**
     * Upload a file to GCS
     * @param fileStream - Readable stream of file data
     * @param options - Upload options including userId, knowledgeBaseId, and filename
     * @returns GCS URI (gs://bucket/path/to/file)
     */
    public async upload(fileStream: Readable, options: UploadOptions): Promise<string> {
        const { userId, knowledgeBaseId, filename } = options;
        const gcsPath = this.generateGCSPath(userId, knowledgeBaseId, filename);
        const file = this.bucket.file(gcsPath);

        // Upload file using stream pipeline
        const writeStream = file.createWriteStream({
            resumable: false, // For small files, non-resumable is faster
            metadata: {
                contentType: this.getContentType(filename),
                metadata: {
                    uploadedBy: userId,
                    knowledgeBaseId: knowledgeBaseId,
                    originalFilename: filename,
                    uploadedAt: new Date().toISOString()
                }
            }
        });

        await pipeline(fileStream, writeStream);

        // Return GCS URI
        return `gs://${this.bucketName}/${gcsPath}`;
    }

    /**
     * Upload a buffer to GCS at a specified path
     * @param buffer - Buffer data to upload
     * @param options - Upload options including fileName and contentType
     * @returns GCS URI (gs://bucket/path/to/file)
     */
    public async uploadBuffer(buffer: Buffer, options: UploadBufferOptions): Promise<string> {
        const { fileName, contentType } = options;
        const file = this.bucket.file(fileName);

        await file.save(buffer, {
            resumable: false,
            metadata: {
                contentType,
                metadata: {
                    uploadedAt: new Date().toISOString()
                }
            }
        });

        return `gs://${this.bucketName}/${fileName}`;
    }

    /**
     * Delete a file from GCS
     * @param gcsUri - GCS URI (gs://bucket/path/to/file)
     */
    public async delete(gcsUri: string): Promise<void> {
        const gcsPath = this.extractPathFromUri(gcsUri);
        const file = this.bucket.file(gcsPath);

        try {
            await file.delete();
        } catch (error: unknown) {
            // If file doesn't exist, that's okay (idempotent delete)
            if (error && typeof error === "object" && "code" in error && error.code === 404) {
                logger.warn({ component: "GCSStorageService", gcsUri }, "File not found in GCS");
                return;
            }
            throw error;
        }
    }

    /**
     * Generate a signed URL for downloading a file
     * @param gcsUri - GCS URI (gs://bucket/path/to/file)
     * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour, max: 604800 = 7 days)
     * @returns Signed URL that can be used to download the file
     */
    public async getSignedDownloadUrl(gcsUri: string, expiresIn: number = 3600): Promise<string> {
        const gcsPath = this.extractPathFromUri(gcsUri);
        const file = this.bucket.file(gcsPath);

        // GCS signed URLs have a max expiration of 7 days
        const maxExpiration = 7 * 24 * 60 * 60; // 604800 seconds
        const actualExpiration = Math.min(expiresIn, maxExpiration);

        const [url] = await file.getSignedUrl({
            version: "v4",
            action: "read",
            expires: Date.now() + actualExpiration * 1000
        });

        return url;
    }

    /**
     * Get a public URL for a file (requires bucket to be publicly readable)
     * Use this for assets that need permanent URLs (icons, covers, etc.)
     * @param gcsUri - GCS URI (gs://bucket/path/to/file)
     * @returns Public URL that can be used to access the file
     */
    public getPublicUrl(gcsUri: string): string {
        const gcsPath = this.extractPathFromUri(gcsUri);
        return `https://storage.googleapis.com/${this.bucketName}/${gcsPath}`;
    }

    /**
     * Download a file from GCS to a temporary location
     * Used for document processing (text extraction)
     * @param options - Download options including gcsUri and optional tempDir
     * @returns Path to the downloaded temporary file
     */
    public async downloadToTemp(options: DownloadToTempOptions): Promise<string> {
        const { gcsUri, tempDir = "/tmp" } = options;
        const gcsPath = this.extractPathFromUri(gcsUri);
        const file = this.bucket.file(gcsPath);

        // Generate temporary file path
        const filename = path.basename(gcsPath);
        const tempFilePath = path.join(tempDir, `gcs-temp-${Date.now()}-${filename}`);

        // Download file
        await file.download({ destination: tempFilePath });

        return tempFilePath;
    }

    /**
     * Check if a file exists in GCS
     * @param gcsUri - GCS URI (gs://bucket/path/to/file)
     * @returns true if file exists, false otherwise
     */
    public async exists(gcsUri: string): Promise<boolean> {
        const gcsPath = this.extractPathFromUri(gcsUri);
        const file = this.bucket.file(gcsPath);

        const [exists] = await file.exists();
        return exists;
    }

    /**
     * Get file metadata
     * @param gcsUri - GCS URI (gs://bucket/path/to/file)
     */
    public async getMetadata(gcsUri: string): Promise<{
        size: number;
        contentType: string;
        updated: Date;
    }> {
        const gcsPath = this.extractPathFromUri(gcsUri);
        const file = this.bucket.file(gcsPath);

        const [metadata] = await file.getMetadata();

        // Handle size which can be string or number
        let size = 0;
        if (typeof metadata.size === "number") {
            size = metadata.size;
        } else if (typeof metadata.size === "string") {
            size = parseInt(metadata.size, 10);
        }

        return {
            size,
            contentType: metadata.contentType || "application/octet-stream",
            updated: new Date(metadata.updated || Date.now())
        };
    }

    /**
     * Extract path from GCS URI
     * @param gcsUri - GCS URI (gs://bucket/path/to/file)
     * @returns Path within bucket (path/to/file)
     */
    private extractPathFromUri(gcsUri: string): string {
        if (!gcsUri.startsWith("gs://")) {
            throw new Error(`Invalid GCS URI: ${gcsUri}`);
        }

        const withoutProtocol = gcsUri.substring(5); // Remove 'gs://'
        const firstSlashIndex = withoutProtocol.indexOf("/");

        if (firstSlashIndex === -1) {
            throw new Error(`Invalid GCS URI (missing path): ${gcsUri}`);
        }

        const bucketName = withoutProtocol.substring(0, firstSlashIndex);
        const filePath = withoutProtocol.substring(firstSlashIndex + 1);

        if (bucketName !== this.bucketName) {
            throw new Error(
                `GCS URI bucket mismatch. Expected: ${this.bucketName}, Got: ${bucketName}`
            );
        }

        return filePath;
    }

    /**
     * Sanitize filename to remove invalid characters
     */
    private sanitizeFilename(filename: string): string {
        // Remove or replace characters that are problematic in GCS object names
        return filename
            .replace(/[^\w\s.-]/g, "") // Keep alphanumeric, spaces, dots, hyphens
            .replace(/\s+/g, "_") // Replace spaces with underscores
            .replace(/_{2,}/g, "_") // Replace multiple underscores with single
            .trim();
    }

    /**
     * Get content type based on file extension
     */
    private getContentType(filename: string): string {
        const ext = path.extname(filename).toLowerCase();
        const contentTypeMap: Record<string, string> = {
            // Documents
            ".pdf": "application/pdf",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".doc": "application/msword",
            ".txt": "text/plain",
            ".md": "text/markdown",
            ".html": "text/html",
            ".json": "application/json",
            ".csv": "text/csv",
            // Images
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".svg": "image/svg+xml"
        };

        return contentTypeMap[ext] || "application/octet-stream";
    }
}

// Singleton instances for each bucket type
const gcsStorageServices: Map<GCSBucketType, GCSStorageService> = new Map();

/**
 * Get or create GCS storage service singleton for a specific bucket type
 * @param bucketType - The type of bucket to use (defaults to "knowledgeDocs" for backwards compatibility)
 */
export function getGCSStorageService(
    bucketType: GCSBucketType = "knowledgeDocs"
): GCSStorageService {
    let service = gcsStorageServices.get(bucketType);
    if (!service) {
        service = new GCSStorageService(bucketType);
        gcsStorageServices.set(bucketType, service);
    }
    return service;
}

/**
 * Get GCS storage service for user uploads (icons, covers, images)
 */
export function getUploadsStorageService(): GCSStorageService {
    return getGCSStorageService("uploads");
}

/**
 * Get GCS storage service for knowledge base documents
 */
export function getKnowledgeDocsStorageService(): GCSStorageService {
    return getGCSStorageService("knowledgeDocs");
}

/**
 * Get GCS storage service for workflow artifacts
 */
export function getArtifactsStorageService(): GCSStorageService {
    return getGCSStorageService("artifacts");
}

/**
 * Get GCS storage service for interface documents (form submissions and chat attachments)
 */
export function getInterfaceDocsStorageService(): GCSStorageService {
    return getGCSStorageService("interfaceDocs");
}
