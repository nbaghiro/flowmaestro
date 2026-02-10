import crypto from "crypto";

export interface AzureStorageClientConfig {
    accountName: string;
    accountKey: string;
    endpointSuffix?: string;
}

interface AzureBlob {
    name: string;
    properties: {
        creationTime: string;
        lastModified: string;
        contentLength: number;
        contentType: string;
        contentMD5?: string;
        blobType: string;
        accessTier?: string;
    };
}

interface AzureContainer {
    name: string;
    properties: {
        lastModified: string;
        etag: string;
        publicAccess?: string;
    };
}

/**
 * Azure Blob Storage REST API Client with Shared Key authentication
 *
 * Uses the Azure Storage REST API with SharedKey authorization
 * Reference: https://learn.microsoft.com/en-us/rest/api/storageservices/
 */
export class AzureStorageClient {
    private accountName: string;
    private accountKey: string;
    private endpointSuffix: string;
    private apiVersion = "2023-11-03";
    private timeout: number;

    constructor(config: AzureStorageClientConfig) {
        this.accountName = config.accountName;
        this.accountKey = config.accountKey;
        this.endpointSuffix = config.endpointSuffix || "core.windows.net";
        this.timeout = 60000; // 60 seconds
    }

    /**
     * Get the base URL for blob storage
     */
    private getBaseUrl(): string {
        return `https://${this.accountName}.blob.${this.endpointSuffix}`;
    }

    /**
     * Create the Shared Key authorization signature
     */
    private createSharedKeySignature(params: {
        method: string;
        url: string;
        headers: Record<string, string>;
        contentLength?: number;
    }): string {
        const parsedUrl = new URL(params.url);
        const path = parsedUrl.pathname;

        // Build canonicalized headers
        const msHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(params.headers)) {
            if (key.toLowerCase().startsWith("x-ms-")) {
                msHeaders[key.toLowerCase()] = value;
            }
        }

        const sortedMsHeaders = Object.keys(msHeaders)
            .sort()
            .map((key) => `${key}:${msHeaders[key]}`)
            .join("\n");

        // Build canonicalized resource
        let canonicalizedResource = `/${this.accountName}${path}`;

        // Add query parameters (sorted)
        const queryParams = new URLSearchParams(parsedUrl.search);
        const sortedParams = Array.from(queryParams.entries()).sort(([a], [b]) =>
            a.localeCompare(b)
        );

        for (const [key, value] of sortedParams) {
            canonicalizedResource += `\n${key.toLowerCase()}:${value}`;
        }

        // Build the string to sign
        const stringToSign = [
            params.method,
            params.headers["Content-Encoding"] || "",
            params.headers["Content-Language"] || "",
            params.contentLength !== undefined ? params.contentLength.toString() : "",
            params.headers["Content-MD5"] || "",
            params.headers["Content-Type"] || "",
            "", // Date header (empty since we use x-ms-date)
            params.headers["If-Modified-Since"] || "",
            params.headers["If-Match"] || "",
            params.headers["If-None-Match"] || "",
            params.headers["If-Unmodified-Since"] || "",
            params.headers["Range"] || "",
            sortedMsHeaders,
            canonicalizedResource
        ].join("\n");

        // Sign with HMAC-SHA256
        const key = Buffer.from(this.accountKey, "base64");
        const signature = crypto
            .createHmac("sha256", key)
            .update(stringToSign, "utf8")
            .digest("base64");

        return `SharedKey ${this.accountName}:${signature}`;
    }

    /**
     * Make a signed request to Azure Storage
     */
    private async request(params: {
        method: string;
        path: string;
        query?: Record<string, string>;
        body?: string | Buffer;
        headers?: Record<string, string>;
    }): Promise<Response> {
        // Build URL
        let url = `${this.getBaseUrl()}${params.path}`;

        if (params.query && Object.keys(params.query).length > 0) {
            const queryString = new URLSearchParams(params.query).toString();
            url += `?${queryString}`;
        }

        // Build headers
        const now = new Date().toUTCString();
        const headers: Record<string, string> = {
            "x-ms-date": now,
            "x-ms-version": this.apiVersion,
            ...params.headers
        };

        // Calculate content length for body
        let contentLength: number | undefined;
        if (params.body !== undefined) {
            contentLength =
                typeof params.body === "string"
                    ? Buffer.byteLength(params.body)
                    : params.body.length;
            headers["Content-Length"] = contentLength.toString();
        }

        // Sign the request
        const authorization = this.createSharedKeySignature({
            method: params.method,
            url,
            headers,
            contentLength
        });

        headers["Authorization"] = authorization;

        // Execute request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                method: params.method,
                headers,
                body: params.body,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Check for errors
            if (!response.ok) {
                const errorBody = await response.text();
                const codeMatch = errorBody.match(/<Code>([^<]+)<\/Code>/);
                const messageMatch = errorBody.match(/<Message>([^<]+)<\/Message>/);

                const code = codeMatch ? codeMatch[1] : response.status.toString();
                const message = messageMatch ? messageMatch[1] : response.statusText;

                throw new Error(`Azure Storage Error (${code}): ${message}`);
            }

            return response;
        } catch (error) {
            clearTimeout(timeoutId);

            if ((error as Error).name === "AbortError") {
                throw new Error("Azure Storage request timeout");
            }

            throw error;
        }
    }

    // ==================== Container Operations ====================

    /**
     * List all containers
     */
    async listContainers(params?: {
        prefix?: string;
        maxResults?: number;
        marker?: string;
    }): Promise<{ containers: AzureContainer[]; nextMarker?: string }> {
        const query: Record<string, string> = { comp: "list" };

        if (params?.prefix) query.prefix = params.prefix;
        if (params?.maxResults) query.maxresults = params.maxResults.toString();
        if (params?.marker) query.marker = params.marker;

        const response = await this.request({
            method: "GET",
            path: "/",
            query
        });

        const xml = await response.text();
        return this.parseListContainersXML(xml);
    }

    /**
     * Create a new container
     */
    async createContainer(
        containerName: string,
        publicAccess?: "container" | "blob"
    ): Promise<void> {
        const headers: Record<string, string> = {};

        if (publicAccess) {
            headers["x-ms-blob-public-access"] = publicAccess;
        }

        await this.request({
            method: "PUT",
            path: `/${containerName}`,
            query: { restype: "container" },
            headers
        });
    }

    /**
     * Delete a container (must be empty or use lease)
     */
    async deleteContainer(containerName: string): Promise<void> {
        await this.request({
            method: "DELETE",
            path: `/${containerName}`,
            query: { restype: "container" }
        });
    }

    // ==================== Blob Operations ====================

    /**
     * List blobs in a container
     */
    async listBlobs(params: {
        container: string;
        prefix?: string;
        delimiter?: string;
        maxResults?: number;
        marker?: string;
    }): Promise<{ blobs: AzureBlob[]; blobPrefixes: string[]; nextMarker?: string }> {
        const query: Record<string, string> = {
            restype: "container",
            comp: "list"
        };

        if (params.prefix) query.prefix = params.prefix;
        if (params.delimiter) query.delimiter = params.delimiter;
        if (params.maxResults) query.maxresults = params.maxResults.toString();
        if (params.marker) query.marker = params.marker;

        const response = await this.request({
            method: "GET",
            path: `/${params.container}`,
            query
        });

        const xml = await response.text();
        return this.parseListBlobsXML(xml);
    }

    /**
     * Get blob properties (HEAD request)
     */
    async getBlobProperties(params: { container: string; blob: string }): Promise<{
        contentType: string;
        contentLength: number;
        lastModified: string;
        eTag: string;
        blobType: string;
        accessTier?: string;
        metadata: Record<string, string>;
    }> {
        const response = await this.request({
            method: "HEAD",
            path: `/${params.container}/${params.blob}`
        });

        const metadata: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            if (key.startsWith("x-ms-meta-")) {
                metadata[key.replace("x-ms-meta-", "")] = value;
            }
        });

        return {
            contentType: response.headers.get("content-type") || "application/octet-stream",
            contentLength: parseInt(response.headers.get("content-length") || "0", 10),
            lastModified: response.headers.get("last-modified") || "",
            eTag: (response.headers.get("etag") || "").replace(/"/g, ""),
            blobType: response.headers.get("x-ms-blob-type") || "BlockBlob",
            accessTier: response.headers.get("x-ms-access-tier") || undefined,
            metadata
        };
    }

    /**
     * Download blob content
     */
    async downloadBlob(params: { container: string; blob: string }): Promise<{
        body: Buffer;
        contentType: string;
        contentLength: number;
        lastModified: string;
        eTag: string;
    }> {
        const response = await this.request({
            method: "GET",
            path: `/${params.container}/${params.blob}`
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
     * Upload blob (block blob)
     */
    async uploadBlob(params: {
        container: string;
        blob: string;
        body: Buffer | string;
        contentType: string;
        metadata?: Record<string, string>;
    }): Promise<{
        eTag: string;
        lastModified: string;
    }> {
        const headers: Record<string, string> = {
            "Content-Type": params.contentType,
            "x-ms-blob-type": "BlockBlob"
        };

        if (params.metadata) {
            for (const [key, value] of Object.entries(params.metadata)) {
                headers[`x-ms-meta-${key}`] = value;
            }
        }

        const body =
            typeof params.body === "string" ? Buffer.from(params.body, "base64") : params.body;

        const response = await this.request({
            method: "PUT",
            path: `/${params.container}/${params.blob}`,
            body,
            headers
        });

        return {
            eTag: (response.headers.get("etag") || "").replace(/"/g, ""),
            lastModified: response.headers.get("last-modified") || ""
        };
    }

    /**
     * Delete a blob
     */
    async deleteBlob(params: { container: string; blob: string }): Promise<void> {
        await this.request({
            method: "DELETE",
            path: `/${params.container}/${params.blob}`
        });
    }

    /**
     * Copy a blob
     */
    async copyBlob(params: {
        sourceContainer: string;
        sourceBlob: string;
        destinationContainer: string;
        destinationBlob: string;
        metadata?: Record<string, string>;
    }): Promise<{
        copyId: string;
        copyStatus: string;
    }> {
        const sourceUrl = `${this.getBaseUrl()}/${params.sourceContainer}/${params.sourceBlob}`;

        const headers: Record<string, string> = {
            "x-ms-copy-source": sourceUrl
        };

        if (params.metadata) {
            for (const [key, value] of Object.entries(params.metadata)) {
                headers[`x-ms-meta-${key}`] = value;
            }
        }

        const response = await this.request({
            method: "PUT",
            path: `/${params.destinationContainer}/${params.destinationBlob}`,
            headers
        });

        return {
            copyId: response.headers.get("x-ms-copy-id") || "",
            copyStatus: response.headers.get("x-ms-copy-status") || ""
        };
    }

    /**
     * Set blob tier (Hot/Cool/Archive)
     */
    async setBlobTier(params: {
        container: string;
        blob: string;
        tier: "Hot" | "Cool" | "Cold" | "Archive";
    }): Promise<void> {
        await this.request({
            method: "PUT",
            path: `/${params.container}/${params.blob}`,
            query: { comp: "tier" },
            headers: {
                "x-ms-access-tier": params.tier
            }
        });
    }

    /**
     * Generate a SAS URL for blob access
     */
    generateSasUrl(params: {
        container: string;
        blob: string;
        permissions: string; // r=read, w=write, d=delete, l=list
        expiresIn: number; // seconds
    }): string {
        const now = new Date();
        const expiry = new Date(now.getTime() + params.expiresIn * 1000);

        // Format dates for SAS
        const startTime = now.toISOString().replace(/\.\d{3}Z$/, "Z");
        const expiryTime = expiry.toISOString().replace(/\.\d{3}Z$/, "Z");

        // Build the string to sign
        const canonicalizedResource = `/blob/${this.accountName}/${params.container}/${params.blob}`;

        const stringToSign = [
            params.permissions, // sp (permissions)
            startTime, // st (start time)
            expiryTime, // se (expiry time)
            canonicalizedResource, // canonicalized resource
            "", // si (signed identifier)
            "", // sip (IP range)
            "https", // spr (protocol)
            this.apiVersion, // sv (service version)
            "b", // sr (resource type: blob)
            "", // rscc (cache control)
            "", // rscd (content disposition)
            "", // rsce (content encoding)
            "", // rscl (content language)
            "" // rsct (content type)
        ].join("\n");

        // Sign with HMAC-SHA256
        const key = Buffer.from(this.accountKey, "base64");
        const signature = crypto
            .createHmac("sha256", key)
            .update(stringToSign, "utf8")
            .digest("base64");

        // Build the SAS token
        const sasParams = new URLSearchParams({
            sp: params.permissions,
            st: startTime,
            se: expiryTime,
            sr: "b",
            spr: "https",
            sv: this.apiVersion,
            sig: signature
        });

        return `${this.getBaseUrl()}/${params.container}/${params.blob}?${sasParams.toString()}`;
    }

    // ==================== XML Parsers ====================

    private parseListContainersXML(xml: string): {
        containers: AzureContainer[];
        nextMarker?: string;
    } {
        const containers: AzureContainer[] = [];

        const containerMatches = xml.matchAll(
            /<Container>\s*<Name>([^<]+)<\/Name>\s*<Properties>\s*<Last-Modified>([^<]+)<\/Last-Modified>\s*<Etag>([^<]+)<\/Etag>/g
        );

        for (const match of containerMatches) {
            containers.push({
                name: match[1],
                properties: {
                    lastModified: match[2],
                    etag: match[3].replace(/"/g, "")
                }
            });
        }

        const nextMarkerMatch = xml.match(/<NextMarker>([^<]+)<\/NextMarker>/);
        const nextMarker = nextMarkerMatch ? nextMarkerMatch[1] : undefined;

        return { containers, nextMarker };
    }

    private parseListBlobsXML(xml: string): {
        blobs: AzureBlob[];
        blobPrefixes: string[];
        nextMarker?: string;
    } {
        const blobs: AzureBlob[] = [];
        const blobPrefixes: string[] = [];

        // Parse blobs
        const blobRegex =
            /<Blob>\s*<Name>([^<]+)<\/Name>\s*<Properties>[\s\S]*?<Creation-Time>([^<]+)<\/Creation-Time>[\s\S]*?<Last-Modified>([^<]+)<\/Last-Modified>[\s\S]*?<Content-Length>([^<]+)<\/Content-Length>[\s\S]*?<Content-Type>([^<]+)<\/Content-Type>[\s\S]*?<BlobType>([^<]+)<\/BlobType>[\s\S]*?<\/Properties>/g;

        const blobMatches = xml.matchAll(blobRegex);

        for (const match of blobMatches) {
            blobs.push({
                name: match[1],
                properties: {
                    creationTime: match[2],
                    lastModified: match[3],
                    contentLength: parseInt(match[4], 10),
                    contentType: match[5],
                    blobType: match[6]
                }
            });
        }

        // Parse blob prefixes (virtual directories)
        const prefixMatches = xml.matchAll(
            /<BlobPrefix>\s*<Name>([^<]+)<\/Name>\s*<\/BlobPrefix>/g
        );
        for (const match of prefixMatches) {
            blobPrefixes.push(match[1]);
        }

        const nextMarkerMatch = xml.match(/<NextMarker>([^<]+)<\/NextMarker>/);
        const nextMarker = nextMarkerMatch ? nextMarkerMatch[1] : undefined;

        return { blobs, blobPrefixes, nextMarker };
    }
}
