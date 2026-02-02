/**
 * AWS Signature Version 4 Implementation
 *
 * This module implements AWS Signature Version 4, the authentication protocol
 * for AWS services. It handles request signing for S3 API calls.
 *
 * Reference: https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html
 */

import crypto from "crypto";

export interface SignatureV4Config {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    service: string;
}

export interface SignRequestParams {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string | Buffer;
    timestamp?: Date;
}

export interface SignedRequest {
    headers: Record<string, string>;
    url: string;
}

export interface PresignedUrlParams {
    method: string;
    bucket: string;
    key: string;
    expiresIn: number; // seconds
    timestamp?: Date;
}

/**
 * AWS Signature V4 Signer
 */
export class AWSSignatureV4 {
    private accessKeyId: string;
    private secretAccessKey: string;
    private region: string;
    private service: string;

    constructor(config: SignatureV4Config) {
        this.accessKeyId = config.accessKeyId;
        this.secretAccessKey = config.secretAccessKey;
        this.region = config.region;
        this.service = config.service;
    }

    /**
     * Sign a request with AWS Signature V4
     */
    signRequest(params: SignRequestParams): SignedRequest {
        const timestamp = params.timestamp || new Date();
        const amzDate = this.formatAmzDate(timestamp);
        const dateStamp = this.formatDateStamp(timestamp);

        // Parse URL
        const url = new URL(params.url);

        // Prepare headers
        const headers: Record<string, string> = {
            ...params.headers,
            host: url.host,
            "x-amz-date": amzDate
        };

        // Add content hash header for S3
        const payloadHash = this.sha256Hash(params.body || "");
        headers["x-amz-content-sha256"] = payloadHash;

        // Create canonical request
        const canonicalRequest = this.createCanonicalRequest(
            params.method,
            url.pathname,
            url.searchParams.toString(),
            headers,
            payloadHash
        );

        // Create string to sign
        const credentialScope = this.createCredentialScope(dateStamp);
        const stringToSign = this.createStringToSign(amzDate, credentialScope, canonicalRequest);

        // Calculate signature
        const signingKey = this.deriveSigningKey(dateStamp);
        const signature = this.hmacSha256Hex(signingKey, stringToSign);

        // Create authorization header
        const signedHeaders = this.getSignedHeaders(headers);
        const authorizationHeader =
            "AWS4-HMAC-SHA256 " +
            `Credential=${this.accessKeyId}/${credentialScope}, ` +
            `SignedHeaders=${signedHeaders}, ` +
            `Signature=${signature}`;

        headers["Authorization"] = authorizationHeader;

        return {
            headers,
            url: params.url
        };
    }

    /**
     * Generate a pre-signed URL for S3 object access
     */
    generatePresignedUrl(params: PresignedUrlParams): string {
        const timestamp = params.timestamp || new Date();
        const amzDate = this.formatAmzDate(timestamp);
        const dateStamp = this.formatDateStamp(timestamp);

        // Build the canonical URI
        const encodedKey = params.key
            .split("/")
            .map((segment) => encodeURIComponent(segment))
            .join("/");
        const canonicalUri = `/${encodedKey}`;

        // Credential scope
        const credentialScope = this.createCredentialScope(dateStamp);

        // Build query parameters
        const queryParams = new URLSearchParams({
            "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
            "X-Amz-Credential": `${this.accessKeyId}/${credentialScope}`,
            "X-Amz-Date": amzDate,
            "X-Amz-Expires": params.expiresIn.toString(),
            "X-Amz-SignedHeaders": "host"
        });

        // Sort query string for canonical request
        queryParams.sort();
        const canonicalQueryString = queryParams.toString();

        // Host header
        const host = `${params.bucket}.s3.${this.region}.amazonaws.com`;

        // Create canonical request for presigned URL
        // For presigned URLs, payload hash is always UNSIGNED-PAYLOAD
        const canonicalHeaders = `host:${host}\n`;
        const signedHeaders = "host";
        const payloadHash = "UNSIGNED-PAYLOAD";

        const canonicalRequest = [
            params.method,
            canonicalUri,
            canonicalQueryString,
            canonicalHeaders,
            signedHeaders,
            payloadHash
        ].join("\n");

        // Create string to sign
        const stringToSign = [
            "AWS4-HMAC-SHA256",
            amzDate,
            credentialScope,
            this.sha256Hash(canonicalRequest)
        ].join("\n");

        // Calculate signature
        const signingKey = this.deriveSigningKey(dateStamp);
        const signature = this.hmacSha256Hex(signingKey, stringToSign);

        // Build final URL
        queryParams.append("X-Amz-Signature", signature);

        return `https://${host}${canonicalUri}?${queryParams.toString()}`;
    }

    /**
     * Create canonical request string
     */
    private createCanonicalRequest(
        method: string,
        canonicalUri: string,
        queryString: string,
        headers: Record<string, string>,
        payloadHash: string
    ): string {
        const sortedHeaders = Object.keys(headers)
            .sort()
            .map((key) => `${key.toLowerCase()}:${headers[key].trim()}`)
            .join("\n");

        const signedHeaders = this.getSignedHeaders(headers);

        return [
            method,
            canonicalUri || "/",
            queryString,
            sortedHeaders + "\n",
            signedHeaders,
            payloadHash
        ].join("\n");
    }

    /**
     * Create string to sign
     */
    private createStringToSign(
        amzDate: string,
        credentialScope: string,
        canonicalRequest: string
    ): string {
        return [
            "AWS4-HMAC-SHA256",
            amzDate,
            credentialScope,
            this.sha256Hash(canonicalRequest)
        ].join("\n");
    }

    /**
     * Create credential scope
     */
    private createCredentialScope(dateStamp: string): string {
        return `${dateStamp}/${this.region}/${this.service}/aws4_request`;
    }

    /**
     * Derive signing key using HMAC chain
     */
    private deriveSigningKey(dateStamp: string): Buffer {
        const kDate = this.hmacSha256(`AWS4${this.secretAccessKey}`, dateStamp);
        const kRegion = this.hmacSha256(kDate, this.region);
        const kService = this.hmacSha256(kRegion, this.service);
        const kSigning = this.hmacSha256(kService, "aws4_request");
        return kSigning;
    }

    /**
     * Get sorted, lowercase header names
     */
    private getSignedHeaders(headers: Record<string, string>): string {
        return Object.keys(headers)
            .map((key) => key.toLowerCase())
            .sort()
            .join(";");
    }

    /**
     * Format date for X-Amz-Date header (ISO 8601 basic format)
     */
    private formatAmzDate(date: Date): string {
        return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
    }

    /**
     * Format date stamp for credential scope
     */
    private formatDateStamp(date: Date): string {
        return date.toISOString().split("T")[0].replace(/-/g, "");
    }

    /**
     * SHA-256 hash
     */
    private sha256Hash(data: string | Buffer): string {
        return crypto.createHash("sha256").update(data).digest("hex");
    }

    /**
     * HMAC-SHA256 returning Buffer
     */
    private hmacSha256(key: string | Buffer, data: string): Buffer {
        return crypto.createHmac("sha256", key).update(data).digest();
    }

    /**
     * HMAC-SHA256 returning hex string
     */
    private hmacSha256Hex(key: Buffer, data: string): string {
        return crypto.createHmac("sha256", key).update(data).digest("hex");
    }
}

/**
 * Parse XML error response from S3
 */
export function parseS3ErrorXML(xml: string): { code: string; message: string } | null {
    try {
        const codeMatch = xml.match(/<Code>([^<]+)<\/Code>/);
        const messageMatch = xml.match(/<Message>([^<]+)<\/Message>/);

        if (codeMatch && messageMatch) {
            return {
                code: codeMatch[1],
                message: messageMatch[1]
            };
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Parse XML list buckets response
 */
export function parseListBucketsXML(
    xml: string
): { buckets: Array<{ name: string; creationDate: string }> } | null {
    try {
        const buckets: Array<{ name: string; creationDate: string }> = [];
        const bucketMatches = xml.matchAll(
            /<Bucket>\s*<Name>([^<]+)<\/Name>\s*<CreationDate>([^<]+)<\/CreationDate>\s*<\/Bucket>/g
        );

        for (const match of bucketMatches) {
            buckets.push({
                name: match[1],
                creationDate: match[2]
            });
        }

        return { buckets };
    } catch {
        return null;
    }
}

/**
 * Parse XML list objects response
 */
export function parseListObjectsXML(xml: string): {
    contents: Array<{
        key: string;
        lastModified: string;
        eTag: string;
        size: string;
        storageClass: string;
    }>;
    isTruncated: boolean;
    nextContinuationToken?: string;
    commonPrefixes: string[];
} | null {
    try {
        const contents: Array<{
            key: string;
            lastModified: string;
            eTag: string;
            size: string;
            storageClass: string;
        }> = [];

        const objectMatches = xml.matchAll(
            /<Contents>\s*<Key>([^<]+)<\/Key>\s*<LastModified>([^<]+)<\/LastModified>\s*<ETag>([^<]+)<\/ETag>\s*<Size>([^<]+)<\/Size>\s*<StorageClass>([^<]+)<\/StorageClass>/g
        );

        for (const match of objectMatches) {
            contents.push({
                key: match[1],
                lastModified: match[2],
                eTag: match[3].replace(/"/g, ""),
                size: match[4],
                storageClass: match[5]
            });
        }

        const isTruncatedMatch = xml.match(/<IsTruncated>([^<]+)<\/IsTruncated>/);
        const isTruncated = isTruncatedMatch ? isTruncatedMatch[1] === "true" : false;

        const nextTokenMatch = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
        const nextContinuationToken = nextTokenMatch ? nextTokenMatch[1] : undefined;

        const commonPrefixes: string[] = [];
        const prefixMatches = xml.matchAll(
            /<CommonPrefixes>\s*<Prefix>([^<]+)<\/Prefix>\s*<\/CommonPrefixes>/g
        );
        for (const match of prefixMatches) {
            commonPrefixes.push(match[1]);
        }

        return { contents, isTruncated, nextContinuationToken, commonPrefixes };
    } catch {
        return null;
    }
}
