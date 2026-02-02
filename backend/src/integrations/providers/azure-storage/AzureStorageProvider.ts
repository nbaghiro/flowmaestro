import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { AzureStorageClient } from "./client/AzureStorageClient";
import {
    // Container operations
    listContainersOperation,
    executeListContainers,
    createContainerOperation,
    executeCreateContainer,
    deleteContainerOperation,
    executeDeleteContainer,
    // Blob operations
    listBlobsOperation,
    executeListBlobs,
    uploadBlobOperation,
    executeUploadBlob,
    downloadBlobOperation,
    executeDownloadBlob,
    deleteBlobOperation,
    executeDeleteBlob,
    getBlobPropertiesOperation,
    executeGetBlobProperties,
    copyBlobOperation,
    executeCopyBlob,
    generateSasUrlOperation,
    executeGenerateSasUrl,
    setBlobTierOperation,
    executeSetBlobTier
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
 * Azure Blob Storage Provider - implements API Key authentication with Shared Key signing
 *
 * ## Setup Instructions
 *
 * ### 1. Create a Storage Account
 * 1. Go to https://portal.azure.com/
 * 2. Create a new Storage Account or use an existing one
 * 3. Choose "StorageV2 (general purpose v2)" for full features
 *
 * ### 2. Get Access Keys
 * 1. Navigate to your Storage Account
 * 2. Go to "Security + networking" > "Access keys"
 * 3. Copy the "Storage account name"
 * 4. Copy either "key1" or "key2" (the full base64 key)
 *
 * ### 3. Configure in FlowMaestro
 * - Storage Account Name: Your Azure storage account name
 * - Account Key: The full base64 access key
 * - Endpoint Suffix: Default is "core.windows.net" (Azure Public)
 *
 * ### 4. Alternative: Managed Identity (not supported in this implementation)
 * For production workloads in Azure, consider using Managed Identity
 * instead of access keys for better security.
 *
 * ### 5. Rate Limits
 * - 20,000 requests per second per storage account
 * - 60 MB/s ingress per storage account (for standard storage)
 */
export class AzureStorageProvider extends BaseProvider {
    readonly name = "azure-storage";
    readonly displayName = "Azure Blob Storage";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true, // Event Grid integration
        maxRequestSize: 256 * 1024 * 1024, // 256MB max block blob upload
        rateLimit: {
            tokensPerMinute: 20000
        }
    };

    private clientPool: Map<string, AzureStorageClient> = new Map();

    constructor() {
        super();

        // Register container operations
        this.registerOperation(listContainersOperation);
        this.registerOperation(createContainerOperation);
        this.registerOperation(deleteContainerOperation);

        // Register blob operations
        this.registerOperation(listBlobsOperation);
        this.registerOperation(uploadBlobOperation);
        this.registerOperation(downloadBlobOperation);
        this.registerOperation(deleteBlobOperation);
        this.registerOperation(getBlobPropertiesOperation);
        this.registerOperation(copyBlobOperation);
        this.registerOperation(generateSasUrlOperation);
        this.registerOperation(setBlobTierOperation);

        // Register triggers for Azure Storage events
        this.registerTrigger({
            id: "blob_created",
            name: "Blob Created",
            description: "Triggered when a blob is uploaded to a container",
            requiredScopes: [],
            configFields: [
                {
                    name: "container",
                    label: "Container Name",
                    type: "text",
                    required: true,
                    description: "Container to monitor",
                    placeholder: "my-container"
                },
                {
                    name: "prefix",
                    label: "Blob Prefix",
                    type: "text",
                    required: false,
                    description: "Only trigger for blobs with this prefix",
                    placeholder: "uploads/"
                }
            ],
            tags: ["storage", "files"]
        });

        this.registerTrigger({
            id: "blob_deleted",
            name: "Blob Deleted",
            description: "Triggered when a blob is deleted from a container",
            requiredScopes: [],
            configFields: [
                {
                    name: "container",
                    label: "Container Name",
                    type: "text",
                    required: true,
                    description: "Container to monitor",
                    placeholder: "my-container"
                }
            ],
            tags: ["storage", "files"]
        });
    }

    /**
     * Get API Key configuration
     * Note: Azure uses Shared Key signing, not simple header auth
     */
    getAuthConfig(): AuthConfig {
        return {
            headerName: "Authorization",
            headerTemplate: "" // Shared Key signature computed dynamically
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
            // Container operations
            case "listContainers":
                return await executeListContainers(client, validatedParams as never);
            case "createContainer":
                return await executeCreateContainer(client, validatedParams as never);
            case "deleteContainer":
                return await executeDeleteContainer(client, validatedParams as never);

            // Blob operations
            case "listBlobs":
                return await executeListBlobs(client, validatedParams as never);
            case "uploadBlob":
                return await executeUploadBlob(client, validatedParams as never);
            case "downloadBlob":
                return await executeDownloadBlob(client, validatedParams as never);
            case "deleteBlob":
                return await executeDeleteBlob(client, validatedParams as never);
            case "getBlobProperties":
                return await executeGetBlobProperties(client, validatedParams as never);
            case "copyBlob":
                return await executeCopyBlob(client, validatedParams as never);
            case "generateSasUrl":
                return await executeGenerateSasUrl(client, validatedParams as never);
            case "setBlobTier":
                return await executeSetBlobTier(client, validatedParams as never);

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
            name: `azure_blob_${op.id}`,
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
        // Remove azure_blob_ prefix to get operation ID
        const operationId = toolName.replace("azure_blob_", "");

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
     * Get or create Azure Storage client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): AzureStorageClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as ApiKeyData;
        const providerConfig = connection.metadata.provider_config as
            | { endpointSuffix?: string }
            | undefined;

        if (!data.api_key || !data.api_secret) {
            throw new Error(
                "Azure Storage credentials are required. Please reconnect with valid credentials."
            );
        }

        const client = new AzureStorageClient({
            accountName: data.api_key,
            accountKey: data.api_secret,
            endpointSuffix: providerConfig?.endpointSuffix || "core.windows.net"
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
