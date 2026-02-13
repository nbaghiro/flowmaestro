import { AWSSignatureV4 } from "../../../core/aws";
import { parseS3ErrorXML, parseListBucketsXML, parseListObjectsXML } from "../utils/xml-parser";

export interface AWSS3ClientConfig {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
}

interface S3Object {
    key: string;
    lastModified: string;
    eTag: string;
    size: string;
    storageClass: string;
}

interface S3Bucket {
    name: string;
    creationDate: string;
}

/**
 * AWS S3 API Client with Signature V4 authentication
 *
 * Uses virtual-hosted style URLs: https://{bucket}.s3.{region}.amazonaws.com
 */
export class AWSS3Client {
    private signer: AWSSignatureV4;
    private region: string;
    private timeout: number;

    constructor(config: AWSS3ClientConfig) {
        this.region = config.region;
        this.timeout = 60000; // 60 seconds

        this.signer = new AWSSignatureV4({
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
            region: config.region,
            service: "s3"
        });
    }

    /**
     * Make a signed request to S3
     */
    private async request(params: {
        method: string;
        bucket?: string;
        key?: string;
        query?: Record<string, string>;
        body?: string | Buffer;
        headers?: Record<string, string>;
    }): Promise<Response> {
        // Build URL
        let host: string;
        let path: string;

        if (params.bucket) {
            host = `${params.bucket}.s3.${this.region}.amazonaws.com`;
            path = params.key ? `/${encodeURIComponent(params.key).replace(/%2F/g, "/")}` : "/";
        } else {
            host = `s3.${this.region}.amazonaws.com`;
            path = "/";
        }

        let url = `https://${host}${path}`;

        if (params.query && Object.keys(params.query).length > 0) {
            const queryString = new URLSearchParams(params.query).toString();
            url += `?${queryString}`;
        }

        // Sign request
        const signedRequest = this.signer.signRequest({
            method: params.method,
            url,
            headers: {
                "Content-Type": params.headers?.["Content-Type"] || "application/octet-stream",
                ...params.headers
            },
            body: params.body
        });

        // Execute request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                method: params.method,
                headers: signedRequest.headers,
                body: params.body,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Check for errors
            if (!response.ok) {
                const errorBody = await response.text();
                const parsedError = parseS3ErrorXML(errorBody);

                if (parsedError) {
                    throw new Error(`S3 Error (${parsedError.code}): ${parsedError.message}`);
                }

                throw new Error(`S3 HTTP ${response.status}: ${response.statusText}`);
            }

            return response;
        } catch (error) {
            clearTimeout(timeoutId);

            if ((error as Error).name === "AbortError") {
                throw new Error("S3 request timeout");
            }

            throw error;
        }
    }

    // ==================== Bucket Operations ====================

    /**
     * List all buckets
     */
    async listBuckets(): Promise<{ buckets: S3Bucket[] }> {
        const response = await this.request({
            method: "GET"
        });

        const xml = await response.text();
        const parsed = parseListBucketsXML(xml);

        if (!parsed) {
            throw new Error("Failed to parse ListBuckets response");
        }

        return parsed;
    }

    /**
     * Create a new bucket
     */
    async createBucket(params: { bucket: string; region?: string }): Promise<void> {
        // For regions other than us-east-1, we need to specify location constraint
        let body: string | undefined;

        if (this.region !== "us-east-1") {
            body = `<?xml version="1.0" encoding="UTF-8"?>
<CreateBucketConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <LocationConstraint>${this.region}</LocationConstraint>
</CreateBucketConfiguration>`;
        }

        await this.request({
            method: "PUT",
            bucket: params.bucket,
            body,
            headers: body
                ? {
                      "Content-Type": "application/xml"
                  }
                : undefined
        });
    }

    /**
     * Delete a bucket (must be empty)
     */
    async deleteBucket(bucket: string): Promise<void> {
        await this.request({
            method: "DELETE",
            bucket
        });
    }

    /**
     * Get bucket location
     */
    async getBucketLocation(bucket: string): Promise<string> {
        const response = await this.request({
            method: "GET",
            bucket,
            query: { location: "" }
        });

        const xml = await response.text();
        const match = xml.match(/<LocationConstraint>([^<]*)<\/LocationConstraint>/);

        // Empty or null means us-east-1
        return match && match[1] ? match[1] : "us-east-1";
    }

    // ==================== Object Operations ====================

    /**
     * List objects in a bucket
     */
    async listObjects(params: {
        bucket: string;
        prefix?: string;
        delimiter?: string;
        maxKeys?: number;
        continuationToken?: string;
    }): Promise<{
        contents: S3Object[];
        isTruncated: boolean;
        nextContinuationToken?: string;
        commonPrefixes: string[];
    }> {
        const query: Record<string, string> = {
            "list-type": "2"
        };

        if (params.prefix) query.prefix = params.prefix;
        if (params.delimiter) query.delimiter = params.delimiter;
        if (params.maxKeys) query["max-keys"] = params.maxKeys.toString();
        if (params.continuationToken) query["continuation-token"] = params.continuationToken;

        const response = await this.request({
            method: "GET",
            bucket: params.bucket,
            query
        });

        const xml = await response.text();
        const parsed = parseListObjectsXML(xml);

        if (!parsed) {
            throw new Error("Failed to parse ListObjectsV2 response");
        }

        return parsed;
    }

    /**
     * Get object metadata (HEAD request)
     */
    async getObjectMetadata(params: { bucket: string; key: string }): Promise<{
        contentType: string;
        contentLength: number;
        lastModified: string;
        eTag: string;
        metadata: Record<string, string>;
    }> {
        const response = await this.request({
            method: "HEAD",
            bucket: params.bucket,
            key: params.key
        });

        const metadata: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            if (key.startsWith("x-amz-meta-")) {
                metadata[key.replace("x-amz-meta-", "")] = value;
            }
        });

        return {
            contentType: response.headers.get("content-type") || "application/octet-stream",
            contentLength: parseInt(response.headers.get("content-length") || "0", 10),
            lastModified: response.headers.get("last-modified") || "",
            eTag: (response.headers.get("etag") || "").replace(/"/g, ""),
            metadata
        };
    }

    /**
     * Download object content
     */
    async getObject(params: { bucket: string; key: string }): Promise<{
        body: Buffer;
        contentType: string;
        contentLength: number;
        lastModified: string;
        eTag: string;
    }> {
        const response = await this.request({
            method: "GET",
            bucket: params.bucket,
            key: params.key
        });

        const arrayBuffer = await response.arrayBuffer();

        return {
            body: Buffer.from(arrayBuffer),
            contentType: response.headers.get("content-type") || "application/octet-stream",
            contentLength: parseInt(response.headers.get("content-length") || "0", 10),
            lastModified: response.headers.get("last-modified") || "",
            eTag: (response.headers.get("etag") || "").replace(/"/g, "")
        };
    }

    /**
     * Upload object
     */
    async putObject(params: {
        bucket: string;
        key: string;
        body: Buffer | string;
        contentType: string;
        metadata?: Record<string, string>;
        storageClass?: string;
    }): Promise<{
        eTag: string;
        versionId?: string;
    }> {
        const headers: Record<string, string> = {
            "Content-Type": params.contentType
        };

        if (params.storageClass) {
            headers["x-amz-storage-class"] = params.storageClass;
        }

        if (params.metadata) {
            for (const [key, value] of Object.entries(params.metadata)) {
                headers[`x-amz-meta-${key}`] = value;
            }
        }

        const body =
            typeof params.body === "string" ? Buffer.from(params.body, "base64") : params.body;

        const response = await this.request({
            method: "PUT",
            bucket: params.bucket,
            key: params.key,
            body,
            headers
        });

        return {
            eTag: (response.headers.get("etag") || "").replace(/"/g, ""),
            versionId: response.headers.get("x-amz-version-id") || undefined
        };
    }

    /**
     * Delete an object
     */
    async deleteObject(params: { bucket: string; key: string }): Promise<void> {
        await this.request({
            method: "DELETE",
            bucket: params.bucket,
            key: params.key
        });
    }

    /**
     * Delete multiple objects
     */
    async deleteObjects(params: { bucket: string; keys: string[] }): Promise<{
        deleted: string[];
        errors: Array<{ key: string; code: string; message: string }>;
    }> {
        const objectsXml = params.keys.map((key) => `<Object><Key>${key}</Key></Object>`).join("");

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<Delete xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  ${objectsXml}
  <Quiet>false</Quiet>
</Delete>`;

        const response = await this.request({
            method: "POST",
            bucket: params.bucket,
            query: { delete: "" },
            body,
            headers: {
                "Content-Type": "application/xml"
            }
        });

        const xml = await response.text();

        const deleted: string[] = [];
        const errors: Array<{ key: string; code: string; message: string }> = [];

        const deletedMatches = xml.matchAll(/<Deleted>\s*<Key>([^<]+)<\/Key>/g);
        for (const match of deletedMatches) {
            deleted.push(match[1]);
        }

        const errorMatches = xml.matchAll(
            /<Error>\s*<Key>([^<]+)<\/Key>\s*<Code>([^<]+)<\/Code>\s*<Message>([^<]+)<\/Message>/g
        );
        for (const match of errorMatches) {
            errors.push({
                key: match[1],
                code: match[2],
                message: match[3]
            });
        }

        return { deleted, errors };
    }

    /**
     * Copy an object
     */
    async copyObject(params: {
        sourceBucket: string;
        sourceKey: string;
        destinationBucket: string;
        destinationKey: string;
        metadata?: Record<string, string>;
        storageClass?: string;
    }): Promise<{
        eTag: string;
        lastModified: string;
    }> {
        const headers: Record<string, string> = {
            "x-amz-copy-source": `/${params.sourceBucket}/${encodeURIComponent(params.sourceKey)}`
        };

        if (params.storageClass) {
            headers["x-amz-storage-class"] = params.storageClass;
        }

        if (params.metadata) {
            headers["x-amz-metadata-directive"] = "REPLACE";
            for (const [key, value] of Object.entries(params.metadata)) {
                headers[`x-amz-meta-${key}`] = value;
            }
        }

        const response = await this.request({
            method: "PUT",
            bucket: params.destinationBucket,
            key: params.destinationKey,
            headers
        });

        const xml = await response.text();
        const eTagMatch = xml.match(/<ETag>([^<]+)<\/ETag>/);
        const lastModifiedMatch = xml.match(/<LastModified>([^<]+)<\/LastModified>/);

        return {
            eTag: eTagMatch ? eTagMatch[1].replace(/"/g, "") : "",
            lastModified: lastModifiedMatch ? lastModifiedMatch[1] : ""
        };
    }

    /**
     * Generate a pre-signed URL for object access
     */
    getPresignedUrl(params: {
        bucket: string;
        key: string;
        expiresIn: number;
        method?: "GET" | "PUT";
    }): string {
        return this.signer.generatePresignedUrl({
            method: params.method || "GET",
            bucket: params.bucket,
            key: params.key,
            expiresIn: params.expiresIn
        });
    }
}
