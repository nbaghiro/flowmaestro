import * as path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { Storage, Bucket } from "@google-cloud/storage";
import { config } from "../core/config";
import { getLogger } from "../core/logging";

const logger = getLogger();

export interface UploadOptions {
    userId: string;
    knowledgeBaseId: string;
    filename: string;
}

export interface DownloadToTempOptions {
    gcsUri: string;
    tempDir?: string;
}

export class GCSStorageService {
    private storage: Storage;
    private bucket: Bucket;
    private bucketName: string;

    constructor() {
        const bucketName = config.gcs.bucketName;

        if (!bucketName) {
            throw new Error("GCS_BUCKET_NAME environment variable is required");
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
     * Generate GCS path for a file
     */
    public generateGCSPath(userId: string, knowledgeBaseId: string, filename: string): string {
        const timestamp = Date.now();
        const sanitizedFilename = this.sanitizeFilenameInternal(filename);
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
     * Upload a file stream to a specific GCS path.
     */
    public async uploadToPath(
        fileStream: Readable,
        options: {
            path: string;
            contentType?: string;
            metadata?: Record<string, string>;
        }
    ): Promise<string> {
        const file = this.bucket.file(options.path);
        const writeStream = file.createWriteStream({
            resumable: false,
            metadata: {
                contentType: options.contentType || "application/octet-stream",
                metadata: options.metadata
            }
        });

        await pipeline(fileStream, writeStream);

        return `gs://${this.bucketName}/${options.path}`;
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
     * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
     * @returns Signed URL that can be used to download the file
     */
    public async getSignedDownloadUrl(gcsUri: string, expiresIn: number = 3600): Promise<string> {
        const gcsPath = this.extractPathFromUri(gcsUri);
        const file = this.bucket.file(gcsPath);

        const [url] = await file.getSignedUrl({
            version: "v4",
            action: "read",
            expires: Date.now() + expiresIn * 1000
        });

        return url;
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
    public sanitizeFilename(filename: string): string {
        return this.sanitizeFilenameInternal(filename);
    }

    private sanitizeFilenameInternal(filename: string): string {
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
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
            ".gif": "image/gif",
            ".pdf": "application/pdf",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".doc": "application/msword",
            ".txt": "text/plain",
            ".md": "text/markdown",
            ".html": "text/html",
            ".json": "application/json",
            ".csv": "text/csv"
        };

        return contentTypeMap[ext] || "application/octet-stream";
    }
}

// Singleton instance
let gcsStorageService: GCSStorageService | null = null;

/**
 * Get or create GCS storage service singleton
 */
export function getGCSStorageService(): GCSStorageService {
    if (!gcsStorageService) {
        gcsStorageService = new GCSStorageService();
    }
    return gcsStorageService;
}
