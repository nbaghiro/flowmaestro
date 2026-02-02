import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { GoogleCloudStorageClient } from "./client/GoogleCloudStorageClient";
import {
    // Bucket operations
    listBucketsOperation,
    executeListBuckets,
    createBucketOperation,
    executeCreateBucket,
    deleteBucketOperation,
    executeDeleteBucket,
    // Object operations
    listObjectsOperation,
    executeListObjects,
    uploadObjectOperation,
    executeUploadObject,
    downloadObjectOperation,
    executeDownloadObject,
    deleteObjectOperation,
    executeDeleteObject,
    getObjectMetadataOperation,
    executeGetObjectMetadata,
    copyObjectOperation,
    executeCopyObject,
    getSignedUrlOperation,
    executeGetSignedUrl
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities
} from "../../core/types";

/**
 * Google Cloud Storage Provider - implements OAuth2 authentication with REST API operations
 *
 * ## Setup Instructions
 *
 * ### 1. Enable Google Cloud Storage API
 * 1. Go to https://console.cloud.google.com/
 * 2. Select your project (or create a new one)
 * 3. Go to "APIs & Services" > "Library"
 * 4. Search for "Cloud Storage API" or "Cloud Storage JSON API"
 * 5. Click "Enable"
 *
 * ### 2. Configure OAuth Consent Screen
 * 1. Go to "APIs & Services" > "OAuth consent screen"
 * 2. Add the scope: https://www.googleapis.com/auth/devstorage.full_control
 *
 * ### 3. Use Existing Google OAuth Credentials
 * This provider uses the same Google OAuth credentials as other Google services
 * (Google Drive, Sheets, Calendar, etc.)
 *
 * ### 4. OAuth Scopes
 * Required scope: https://www.googleapis.com/auth/devstorage.full_control
 *
 * Alternative scopes for more restricted access:
 * - devstorage.read_only - Read-only access
 * - devstorage.read_write - Read and write access
 *
 * ### 5. Rate Limits
 * - Read requests: 50,000 per second per project
 * - Write requests: 10,000 per second per project
 * - Recommended: Stay under these limits with exponential backoff
 */
export class GoogleCloudStorageProvider extends BaseProvider {
    readonly name = "google-cloud-storage";
    readonly displayName = "Google Cloud Storage";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true, // Pub/Sub notifications
        maxRequestSize: 5 * 1024 * 1024 * 1024, // 5GB max object size
        rateLimit: {
            tokensPerMinute: 1000
        }
    };

    private clientPool: Map<string, GoogleCloudStorageClient> = new Map();

    constructor() {
        super();

        // Register bucket operations
        this.registerOperation(listBucketsOperation);
        this.registerOperation(createBucketOperation);
        this.registerOperation(deleteBucketOperation);

        // Register object operations
        this.registerOperation(listObjectsOperation);
        this.registerOperation(uploadObjectOperation);
        this.registerOperation(downloadObjectOperation);
        this.registerOperation(deleteObjectOperation);
        this.registerOperation(getObjectMetadataOperation);
        this.registerOperation(copyObjectOperation);
        this.registerOperation(getSignedUrlOperation);

        // Register triggers for Cloud Storage events
        this.registerTrigger({
            id: "object_created",
            name: "Object Created",
            description: "Triggered when a new object is uploaded to a bucket",
            requiredScopes: ["https://www.googleapis.com/auth/devstorage.full_control"],
            configFields: [
                {
                    name: "bucket",
                    label: "Bucket Name",
                    type: "text",
                    required: true,
                    description: "Bucket to monitor for new objects",
                    placeholder: "my-bucket"
                },
                {
                    name: "prefix",
                    label: "Object Prefix",
                    type: "text",
                    required: false,
                    description: "Only trigger for objects with this prefix",
                    placeholder: "uploads/"
                }
            ],
            tags: ["storage", "files"]
        });

        this.registerTrigger({
            id: "object_deleted",
            name: "Object Deleted",
            description: "Triggered when an object is deleted from a bucket",
            requiredScopes: ["https://www.googleapis.com/auth/devstorage.full_control"],
            configFields: [
                {
                    name: "bucket",
                    label: "Bucket Name",
                    type: "text",
                    required: true,
                    description: "Bucket to monitor for deleted objects",
                    placeholder: "my-bucket"
                }
            ],
            tags: ["storage", "files"]
        });
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
            tokenUrl: "https://oauth2.googleapis.com/token",
            scopes: ["https://www.googleapis.com/auth/devstorage.full_control"],
            clientId: appConfig.oauth.google.clientId,
            clientSecret: appConfig.oauth.google.clientSecret,
            redirectUri: getOAuthRedirectUri("google"),
            refreshable: true
        };

        return config;
    }

    /**
     * Execute operation via direct API
     */
    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        // Validate parameters
        const validatedParams = this.validateParams(operationId, params);

        // Get or create client
        const client = this.getOrCreateClient(connection);

        // Execute operation
        switch (operationId) {
            // Bucket operations
            case "listBuckets":
                return await executeListBuckets(client, validatedParams as never);
            case "createBucket":
                return await executeCreateBucket(client, validatedParams as never);
            case "deleteBucket":
                return await executeDeleteBucket(client, validatedParams as never);

            // Object operations
            case "listObjects":
                return await executeListObjects(client, validatedParams as never);
            case "uploadObject":
                return await executeUploadObject(client, validatedParams as never);
            case "downloadObject":
                return await executeDownloadObject(client, validatedParams as never);
            case "deleteObject":
                return await executeDeleteObject(client, validatedParams as never);
            case "getObjectMetadata":
                return await executeGetObjectMetadata(client, validatedParams as never);
            case "copyObject":
                return await executeCopyObject(client, validatedParams as never);
            case "getSignedUrl":
                return await executeGetSignedUrl(client, validatedParams as never);

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown operation: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }

    /**
     * Get MCP tools
     */
    getMCPTools(): MCPTool[] {
        return this.getOperations().map((op) => ({
            name: `gcs_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema)
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        // Remove gcs_ prefix to get operation ID
        const operationId = toolName.replace("gcs_", "");

        const result = await this.executeOperation(operationId, params, connection, {
            mode: "agent",
            conversationId: "unknown",
            toolCallId: "unknown"
        });

        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error?.message || "MCP tool execution failed");
        }
    }

    /**
     * Get or create Google Cloud Storage client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): GoogleCloudStorageClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;
        const providerConfig = connection.metadata.provider_config as
            | { projectId?: string }
            | undefined;

        if (!providerConfig?.projectId) {
            throw new Error(
                "Google Cloud Project ID is required. Please reconnect with a project ID."
            );
        }

        const client = new GoogleCloudStorageClient({
            accessToken: data.access_token,
            projectId: providerConfig.projectId
        });

        // Cache client
        this.clientPool.set(poolKey, client);

        return client;
    }

    /**
     * Clear client from pool (e.g., when connection is deleted)
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
