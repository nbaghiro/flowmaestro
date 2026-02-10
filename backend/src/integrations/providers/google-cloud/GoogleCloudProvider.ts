import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { GoogleCloudClient } from "./client/GoogleCloudClient";
import * as CloudBuild from "./operations/cloud-build";
import * as CloudRun from "./operations/cloud-run";
import * as ComputeEngine from "./operations/compute-engine";
import * as SecretManager from "./operations/secret-manager";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

// Import all operations

/**
 * Google Cloud Platform Provider - unified access to Cloud Build, Secret Manager, Compute Engine, and Cloud Run
 *
 * ## Setup Instructions
 *
 * ### 1. Enable APIs in GCP Console
 * 1. Go to https://console.cloud.google.com/apis/library
 * 2. Enable the following APIs for your project:
 *    - Cloud Build API
 *    - Secret Manager API
 *    - Compute Engine API
 *    - Cloud Run API
 *
 * ### 2. OAuth Consent Screen
 * 1. Go to https://console.cloud.google.com/apis/credentials/consent
 * 2. Configure OAuth consent screen (Internal or External)
 * 3. Add required scopes: https://www.googleapis.com/auth/cloud-platform
 *
 * ### 3. Create OAuth 2.0 Client ID
 * 1. Go to https://console.cloud.google.com/apis/credentials
 * 2. Click "Create Credentials" → "OAuth client ID"
 * 3. Application type: Web application
 * 4. Add authorized redirect URI (provided by FlowMaestro)
 * 5. Save the Client ID and Client Secret
 *
 * ### 4. Configure in FlowMaestro
 * - Project ID: Your GCP project ID (e.g., my-project-123456)
 * - OAuth credentials will be handled automatically
 *
 * ### 5. Rate Limits
 * - Cloud Build: 60 concurrent builds
 * - Secret Manager: 1000 access requests/minute
 * - Compute Engine: 20 requests/second per project
 * - Cloud Run: 1000 requests/minute per service
 */
export class GoogleCloudProvider extends BaseProvider {
    readonly name = "google-cloud";
    readonly displayName = "Google Cloud";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        maxRequestSize: 10 * 1024 * 1024, // 10MB
        rateLimit: {
            tokensPerMinute: 600
        }
    };

    private clientPool: Map<string, GoogleCloudClient> = new Map();

    constructor() {
        super();

        // Register Cloud Build operations (10 operations)
        this.registerOperation(CloudBuild.listBuildsOperation);
        this.registerOperation(CloudBuild.getBuildOperation);
        this.registerOperation(CloudBuild.createBuildOperation);
        this.registerOperation(CloudBuild.retryBuildOperation);
        this.registerOperation(CloudBuild.cancelBuildOperation);
        this.registerOperation(CloudBuild.listTriggersOperation);
        this.registerOperation(CloudBuild.getTriggerOperation);
        this.registerOperation(CloudBuild.createTriggerOperation);
        this.registerOperation(CloudBuild.updateTriggerOperation);
        this.registerOperation(CloudBuild.deleteTriggerOperation);

        // Register Secret Manager operations (9 operations)
        this.registerOperation(SecretManager.listSecretsOperation);
        this.registerOperation(SecretManager.createSecretOperation);
        this.registerOperation(SecretManager.getSecretOperation);
        this.registerOperation(SecretManager.updateSecretOperation);
        this.registerOperation(SecretManager.deleteSecretOperation);
        this.registerOperation(SecretManager.addSecretVersionOperation);
        this.registerOperation(SecretManager.accessSecretVersionOperation);
        this.registerOperation(SecretManager.listSecretVersionsOperation);
        this.registerOperation(SecretManager.destroySecretVersionOperation);

        // Register Compute Engine operations (10 operations)
        this.registerOperation(ComputeEngine.listInstancesOperation);
        this.registerOperation(ComputeEngine.getInstanceOperation);
        this.registerOperation(ComputeEngine.createInstanceOperation);
        this.registerOperation(ComputeEngine.startInstanceOperation);
        this.registerOperation(ComputeEngine.stopInstanceOperation);
        this.registerOperation(ComputeEngine.deleteInstanceOperation);
        this.registerOperation(ComputeEngine.resetInstanceOperation);
        this.registerOperation(ComputeEngine.setInstanceMetadataOperation);
        this.registerOperation(ComputeEngine.addInstanceTagsOperation);
        this.registerOperation(ComputeEngine.attachDiskOperation);

        // Register Cloud Run operations (10 operations)
        this.registerOperation(CloudRun.listServicesOperation);
        this.registerOperation(CloudRun.getServiceOperation);
        this.registerOperation(CloudRun.createServiceOperation);
        this.registerOperation(CloudRun.updateServiceOperation);
        this.registerOperation(CloudRun.deleteServiceOperation);
        this.registerOperation(CloudRun.listRevisionsOperation);
        this.registerOperation(CloudRun.getRevisionOperation);
        this.registerOperation(CloudRun.deleteRevisionOperation);
        this.registerOperation(CloudRun.updateTrafficOperation);
        this.registerOperation(CloudRun.getServiceUrlOperation);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        return {
            headerName: "Authorization",
            headerTemplate: "Bearer {token}"
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
            // Cloud Build operations
            case "cloud_build_listBuilds":
                return await CloudBuild.executeListBuilds(client, validatedParams as never);
            case "cloud_build_getBuild":
                return await CloudBuild.executeGetBuild(client, validatedParams as never);
            case "cloud_build_createBuild":
                return await CloudBuild.executeCreateBuild(client, validatedParams as never);
            case "cloud_build_retryBuild":
                return await CloudBuild.executeRetryBuild(client, validatedParams as never);
            case "cloud_build_cancelBuild":
                return await CloudBuild.executeCancelBuild(client, validatedParams as never);
            case "cloud_build_listTriggers":
                return await CloudBuild.executeListTriggers(client, validatedParams as never);
            case "cloud_build_getTrigger":
                return await CloudBuild.executeGetTrigger(client, validatedParams as never);
            case "cloud_build_createTrigger":
                return await CloudBuild.executeCreateTrigger(client, validatedParams as never);
            case "cloud_build_updateTrigger":
                return await CloudBuild.executeUpdateTrigger(client, validatedParams as never);
            case "cloud_build_deleteTrigger":
                return await CloudBuild.executeDeleteTrigger(client, validatedParams as never);

            // Secret Manager operations
            case "secret_manager_listSecrets":
                return await SecretManager.executeListSecrets(client, validatedParams as never);
            case "secret_manager_createSecret":
                return await SecretManager.executeCreateSecret(client, validatedParams as never);
            case "secret_manager_getSecret":
                return await SecretManager.executeGetSecret(client, validatedParams as never);
            case "secret_manager_updateSecret":
                return await SecretManager.executeUpdateSecret(client, validatedParams as never);
            case "secret_manager_deleteSecret":
                return await SecretManager.executeDeleteSecret(client, validatedParams as never);
            case "secret_manager_addSecretVersion":
                return await SecretManager.executeAddSecretVersion(
                    client,
                    validatedParams as never
                );
            case "secret_manager_accessSecretVersion":
                return await SecretManager.executeAccessSecretVersion(
                    client,
                    validatedParams as never
                );
            case "secret_manager_listSecretVersions":
                return await SecretManager.executeListSecretVersions(
                    client,
                    validatedParams as never
                );
            case "secret_manager_destroySecretVersion":
                return await SecretManager.executeDestroySecretVersion(
                    client,
                    validatedParams as never
                );

            // Compute Engine operations
            case "compute_engine_listInstances":
                return await ComputeEngine.executeListInstances(client, validatedParams as never);
            case "compute_engine_getInstance":
                return await ComputeEngine.executeGetInstance(client, validatedParams as never);
            case "compute_engine_createInstance":
                return await ComputeEngine.executeCreateInstance(client, validatedParams as never);
            case "compute_engine_startInstance":
                return await ComputeEngine.executeStartInstance(client, validatedParams as never);
            case "compute_engine_stopInstance":
                return await ComputeEngine.executeStopInstance(client, validatedParams as never);
            case "compute_engine_deleteInstance":
                return await ComputeEngine.executeDeleteInstance(client, validatedParams as never);
            case "compute_engine_resetInstance":
                return await ComputeEngine.executeResetInstance(client, validatedParams as never);
            case "compute_engine_setInstanceMetadata":
                return await ComputeEngine.executeSetInstanceMetadata(
                    client,
                    validatedParams as never
                );
            case "compute_engine_addInstanceTags":
                return await ComputeEngine.executeAddInstanceTags(client, validatedParams as never);
            case "compute_engine_attachDisk":
                return await ComputeEngine.executeAttachDisk(client, validatedParams as never);

            // Cloud Run operations
            case "cloud_run_listServices":
                return await CloudRun.executeListServices(client, validatedParams as never);
            case "cloud_run_getService":
                return await CloudRun.executeGetService(client, validatedParams as never);
            case "cloud_run_createService":
                return await CloudRun.executeCreateService(client, validatedParams as never);
            case "cloud_run_updateService":
                return await CloudRun.executeUpdateService(client, validatedParams as never);
            case "cloud_run_deleteService":
                return await CloudRun.executeDeleteService(client, validatedParams as never);
            case "cloud_run_listRevisions":
                return await CloudRun.executeListRevisions(client, validatedParams as never);
            case "cloud_run_getRevision":
                return await CloudRun.executeGetRevision(client, validatedParams as never);
            case "cloud_run_deleteRevision":
                return await CloudRun.executeDeleteRevision(client, validatedParams as never);
            case "cloud_run_updateTraffic":
                return await CloudRun.executeUpdateTraffic(client, validatedParams as never);
            case "cloud_run_getServiceUrl":
                return await CloudRun.executeGetServiceUrl(client, validatedParams as never);

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
            name: `google_cloud_${op.id}`,
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
        // Remove google_cloud_ prefix to get operation ID
        const operationId = toolName.replace("google_cloud_", "");

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
     * Get or create Google Cloud client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): GoogleCloudClient {
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

        if (!data.access_token) {
            throw new Error(
                "OAuth access token is required. Please reconnect with valid credentials."
            );
        }

        if (!providerConfig?.projectId) {
            throw new Error(
                "GCP project ID is required. Please reconnect and enter your project ID."
            );
        }

        const client = new GoogleCloudClient({
            accessToken: data.access_token,
            projectId: providerConfig.projectId
        });

        // Cache client
        this.clientPool.set(poolKey, client);

        return client;
    }
}
