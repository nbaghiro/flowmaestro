import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { DigitalOceanClient } from "./client/DigitalOceanClient";
import * as Apps from "./operations/apps";
import * as Databases from "./operations/databases";
import * as Droplets from "./operations/droplets";
import * as Kubernetes from "./operations/kubernetes";
import * as LoadBalancers from "./operations/load-balancers";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

/**
 * DigitalOcean Provider - unified access to Droplets, Kubernetes, Apps, Databases, and Load Balancers
 *
 * ## Setup Instructions
 *
 * ### 1. Create a DigitalOcean App
 * 1. Go to https://cloud.digitalocean.com/account/api/applications
 * 2. Click "Create OAuth Application"
 * 3. Fill in application details:
 *    - Name: Your app name
 *    - Homepage URL: Your app's URL
 *    - Callback URL: The FlowMaestro OAuth callback URL
 * 4. Save and note the Client ID and Client Secret
 *
 * ### 2. Configure in FlowMaestro
 * - Set DIGITALOCEAN_CLIENT_ID environment variable
 * - Set DIGITALOCEAN_CLIENT_SECRET environment variable
 * - Connect via OAuth flow
 *
 * ### 3. Required OAuth Scopes
 * - read: Read access to all resources
 * - write: Write access to all resources
 *
 * ### 4. Rate Limits
 * - 5000 requests per hour (~83/minute)
 * - Token refreshes: Tokens expire after 30 days
 */
export class DigitalOceanProvider extends BaseProvider {
    readonly name = "digitalocean";
    readonly displayName = "DigitalOcean";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        maxRequestSize: 5 * 1024 * 1024, // 5MB
        rateLimit: {
            tokensPerMinute: 83
        }
    };

    private clientPool: Map<string, DigitalOceanClient> = new Map();

    constructor() {
        super();

        // Register Droplet operations (8 operations)
        this.registerOperation(Droplets.listDropletsOperation);
        this.registerOperation(Droplets.getDropletOperation);
        this.registerOperation(Droplets.createDropletOperation);
        this.registerOperation(Droplets.deleteDropletOperation);
        this.registerOperation(Droplets.powerOnDropletOperation);
        this.registerOperation(Droplets.powerOffDropletOperation);
        this.registerOperation(Droplets.rebootDropletOperation);
        this.registerOperation(Droplets.resizeDropletOperation);

        // Register Kubernetes operations (7 operations)
        this.registerOperation(Kubernetes.listClustersOperation);
        this.registerOperation(Kubernetes.getClusterOperation);
        this.registerOperation(Kubernetes.createClusterOperation);
        this.registerOperation(Kubernetes.deleteClusterOperation);
        this.registerOperation(Kubernetes.listNodePoolsOperation);
        this.registerOperation(Kubernetes.getNodePoolOperation);
        this.registerOperation(Kubernetes.scaleNodePoolOperation);

        // Register Apps operations (5 operations)
        this.registerOperation(Apps.listAppsOperation);
        this.registerOperation(Apps.getAppOperation);
        this.registerOperation(Apps.createDeploymentOperation);
        this.registerOperation(Apps.getDeploymentLogsOperation);
        this.registerOperation(Apps.rollbackDeploymentOperation);

        // Register Database operations (4 operations)
        this.registerOperation(Databases.listDatabasesOperation);
        this.registerOperation(Databases.getDatabaseOperation);
        this.registerOperation(Databases.createDatabaseOperation);
        this.registerOperation(Databases.listBackupsOperation);

        // Register Load Balancer operations (4 operations)
        this.registerOperation(LoadBalancers.listLoadBalancersOperation);
        this.registerOperation(LoadBalancers.getLoadBalancerOperation);
        this.registerOperation(LoadBalancers.createLoadBalancerOperation);
        this.registerOperation(LoadBalancers.deleteLoadBalancerOperation);
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
            // Droplet operations
            case "droplets_listDroplets":
                return await Droplets.executeListDroplets(client, validatedParams as never);
            case "droplets_getDroplet":
                return await Droplets.executeGetDroplet(client, validatedParams as never);
            case "droplets_createDroplet":
                return await Droplets.executeCreateDroplet(client, validatedParams as never);
            case "droplets_deleteDroplet":
                return await Droplets.executeDeleteDroplet(client, validatedParams as never);
            case "droplets_powerOnDroplet":
                return await Droplets.executePowerOnDroplet(client, validatedParams as never);
            case "droplets_powerOffDroplet":
                return await Droplets.executePowerOffDroplet(client, validatedParams as never);
            case "droplets_rebootDroplet":
                return await Droplets.executeRebootDroplet(client, validatedParams as never);
            case "droplets_resizeDroplet":
                return await Droplets.executeResizeDroplet(client, validatedParams as never);

            // Kubernetes operations
            case "kubernetes_listClusters":
                return await Kubernetes.executeListClusters(client, validatedParams as never);
            case "kubernetes_getCluster":
                return await Kubernetes.executeGetCluster(client, validatedParams as never);
            case "kubernetes_createCluster":
                return await Kubernetes.executeCreateCluster(client, validatedParams as never);
            case "kubernetes_deleteCluster":
                return await Kubernetes.executeDeleteCluster(client, validatedParams as never);
            case "kubernetes_listNodePools":
                return await Kubernetes.executeListNodePools(client, validatedParams as never);
            case "kubernetes_getNodePool":
                return await Kubernetes.executeGetNodePool(client, validatedParams as never);
            case "kubernetes_scaleNodePool":
                return await Kubernetes.executeScaleNodePool(client, validatedParams as never);

            // Apps operations
            case "apps_listApps":
                return await Apps.executeListApps(client, validatedParams as never);
            case "apps_getApp":
                return await Apps.executeGetApp(client, validatedParams as never);
            case "apps_createDeployment":
                return await Apps.executeCreateDeployment(client, validatedParams as never);
            case "apps_getDeploymentLogs":
                return await Apps.executeGetDeploymentLogs(client, validatedParams as never);
            case "apps_rollbackDeployment":
                return await Apps.executeRollbackDeployment(client, validatedParams as never);

            // Database operations
            case "databases_listDatabases":
                return await Databases.executeListDatabases(client, validatedParams as never);
            case "databases_getDatabase":
                return await Databases.executeGetDatabase(client, validatedParams as never);
            case "databases_createDatabase":
                return await Databases.executeCreateDatabase(client, validatedParams as never);
            case "databases_listBackups":
                return await Databases.executeListBackups(client, validatedParams as never);

            // Load Balancer operations
            case "loadBalancers_listLoadBalancers":
                return await LoadBalancers.executeListLoadBalancers(
                    client,
                    validatedParams as never
                );
            case "loadBalancers_getLoadBalancer":
                return await LoadBalancers.executeGetLoadBalancer(client, validatedParams as never);
            case "loadBalancers_createLoadBalancer":
                return await LoadBalancers.executeCreateLoadBalancer(
                    client,
                    validatedParams as never
                );
            case "loadBalancers_deleteLoadBalancer":
                return await LoadBalancers.executeDeleteLoadBalancer(
                    client,
                    validatedParams as never
                );

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
            name: `digitalocean_${op.id}`,
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
        // Remove digitalocean_ prefix to get operation ID
        const operationId = toolName.replace("digitalocean_", "");

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
     * Get or create DigitalOcean client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): DigitalOceanClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;

        if (!data.access_token) {
            throw new Error(
                "DigitalOcean access token is required. Please reconnect with valid credentials."
            );
        }

        const client = new DigitalOceanClient({
            accessToken: data.access_token
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
