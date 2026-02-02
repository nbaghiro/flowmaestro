import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { AWSS3Client } from "./client/AWSS3Client";
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
    deleteObjectsOperation,
    executeDeleteObjects,
    getObjectMetadataOperation,
    executeGetObjectMetadata,
    copyObjectOperation,
    executeCopyObject,
    getPresignedUrlOperation,
    executeGetPresignedUrl
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

/**
 * AWS S3 Provider - implements API Key authentication with AWS Signature V4
 *
 * ## Setup Instructions
 *
 * ### 1. Create an IAM User
 * 1. Go to https://console.aws.amazon.com/iam/
 * 2. Navigate to "Users" and click "Add users"
 * 3. Enter a username (e.g., "flowmaestro-s3")
 * 4. Select "Access key - Programmatic access"
 *
 * ### 2. Set IAM Permissions
 * Attach a policy with S3 permissions. Example policy for full S3 access:
 * ```json
 * {
 *   "Version": "2012-10-17",
 *   "Statement": [
 *     {
 *       "Effect": "Allow",
 *       "Action": "s3:*",
 *       "Resource": "*"
 *     }
 *   ]
 * }
 * ```
 *
 * For more restricted access, specify bucket ARNs:
 * ```json
 * {
 *   "Effect": "Allow",
 *   "Action": "s3:*",
 *   "Resource": [
 *     "arn:aws:s3:::your-bucket-name",
 *     "arn:aws:s3:::your-bucket-name/*"
 *   ]
 * }
 * ```
 *
 * ### 3. Generate Access Keys
 * 1. After creating the user, go to "Security credentials"
 * 2. Create an access key
 * 3. Save both the Access Key ID and Secret Access Key
 *
 * ### 4. Configure in FlowMaestro
 * - Access Key ID: Your AWS access key
 * - Secret Access Key: Your AWS secret key
 * - Region: The AWS region for your S3 buckets
 *
 * ### 5. Rate Limits
 * - 3,500 PUT/COPY/POST/DELETE requests per second per prefix
 * - 5,500 GET/HEAD requests per second per prefix
 */
export class AWSS3Provider extends BaseProvider {
    readonly name = "aws-s3";
    readonly displayName = "AWS S3";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true, // S3 Event Notifications
        maxRequestSize: 5 * 1024 * 1024 * 1024, // 5GB max object size (simple upload)
        rateLimit: {
            tokensPerMinute: 3500
        }
    };

    private clientPool: Map<string, AWSS3Client> = new Map();

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
        this.registerOperation(deleteObjectsOperation);
        this.registerOperation(getObjectMetadataOperation);
        this.registerOperation(copyObjectOperation);
        this.registerOperation(getPresignedUrlOperation);

        // Register triggers for S3 events
        this.registerTrigger({
            id: "object_created",
            name: "Object Created",
            description: "Triggered when an object is uploaded to S3",
            requiredScopes: [],
            configFields: [
                {
                    name: "bucket",
                    label: "Bucket Name",
                    type: "text",
                    required: true,
                    description: "S3 bucket to monitor",
                    placeholder: "my-bucket"
                },
                {
                    name: "prefix",
                    label: "Prefix Filter",
                    type: "text",
                    required: false,
                    description: "Only trigger for objects with this prefix",
                    placeholder: "uploads/"
                },
                {
                    name: "suffix",
                    label: "Suffix Filter",
                    type: "text",
                    required: false,
                    description: "Only trigger for objects with this suffix",
                    placeholder: ".pdf"
                }
            ],
            tags: ["storage", "files"]
        });

        this.registerTrigger({
            id: "object_deleted",
            name: "Object Deleted",
            description: "Triggered when an object is deleted from S3",
            requiredScopes: [],
            configFields: [
                {
                    name: "bucket",
                    label: "Bucket Name",
                    type: "text",
                    required: true,
                    description: "S3 bucket to monitor",
                    placeholder: "my-bucket"
                }
            ],
            tags: ["storage", "files"]
        });
    }

    /**
     * Get API Key configuration
     * Note: AWS uses Signature V4, not simple header auth
     */
    getAuthConfig(): AuthConfig {
        return {
            headerName: "Authorization",
            headerTemplate: "" // Signature V4 computed dynamically
        };
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
            case "deleteObjects":
                return await executeDeleteObjects(client, validatedParams as never);
            case "getObjectMetadata":
                return await executeGetObjectMetadata(client, validatedParams as never);
            case "copyObject":
                return await executeCopyObject(client, validatedParams as never);
            case "getPresignedUrl":
                return await executeGetPresignedUrl(client, validatedParams as never);

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
            name: `s3_${op.id}`,
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
        // Remove s3_ prefix to get operation ID
        const operationId = toolName.replace("s3_", "");

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
     * Get or create AWS S3 client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): AWSS3Client {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as ApiKeyData;
        const providerConfig = connection.metadata.provider_config as
            | { region?: string }
            | undefined;

        if (!data.api_key || !data.api_secret) {
            throw new Error(
                "AWS credentials are required. Please reconnect with valid credentials."
            );
        }

        if (!providerConfig?.region) {
            throw new Error("AWS region is required. Please reconnect and select a region.");
        }

        const client = new AWSS3Client({
            accessKeyId: data.api_key,
            secretAccessKey: data.api_secret,
            region: providerConfig.region
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
