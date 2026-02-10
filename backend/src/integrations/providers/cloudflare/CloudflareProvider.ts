import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { CloudflareClient } from "./client/CloudflareClient";
import * as DNS from "./operations/dns";
import * as KV from "./operations/kv";
import * as Workers from "./operations/workers";
import * as Zones from "./operations/zones";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

/**
 * Cloudflare Provider - unified access to DNS, Workers, KV, and Zones
 *
 * ## Setup Instructions
 *
 * ### 1. Create an API Token
 * 1. Go to https://dash.cloudflare.com/profile/api-tokens
 * 2. Click "Create Token"
 * 3. Use a template or create a custom token with permissions:
 *    - Zone: Read (for listing zones)
 *    - DNS: Edit (for managing DNS records)
 *    - Workers Scripts: Edit (for managing Workers)
 *    - Workers KV Storage: Edit (for managing KV)
 *
 * ### 2. Get Your Account ID
 * 1. Log in to the Cloudflare dashboard
 * 2. Click on any zone, or go to Account Settings
 * 3. Your Account ID is shown on the right sidebar (32-character hex string)
 *
 * ### 3. Configure in FlowMaestro
 * - API Token: Your Cloudflare API token
 * - Account ID: Your 32-character account ID
 *
 * ### 4. Rate Limits
 * - 1200 requests per 5 minutes (240/minute)
 * - Workers KV has additional limits: 1000 keys/second read, 1 write/second per key
 */
export class CloudflareProvider extends BaseProvider {
    readonly name = "cloudflare";
    readonly displayName = "Cloudflare";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        maxRequestSize: 100 * 1024 * 1024, // 100MB for Workers
        rateLimit: {
            tokensPerMinute: 240
        }
    };

    private clientPool: Map<string, CloudflareClient> = new Map();

    constructor() {
        super();

        // Register Zone operations (2 operations)
        this.registerOperation(Zones.listZonesOperation);
        this.registerOperation(Zones.getZoneOperation);

        // Register DNS operations (5 operations)
        this.registerOperation(DNS.listDnsRecordsOperation);
        this.registerOperation(DNS.getDnsRecordOperation);
        this.registerOperation(DNS.createDnsRecordOperation);
        this.registerOperation(DNS.updateDnsRecordOperation);
        this.registerOperation(DNS.deleteDnsRecordOperation);

        // Register Workers operations (5 operations)
        this.registerOperation(Workers.listWorkersOperation);
        this.registerOperation(Workers.getWorkerOperation);
        this.registerOperation(Workers.uploadWorkerOperation);
        this.registerOperation(Workers.deleteWorkerOperation);
        this.registerOperation(Workers.getWorkerSettingsOperation);

        // Register KV operations (8 operations)
        this.registerOperation(KV.listKvNamespacesOperation);
        this.registerOperation(KV.createKvNamespaceOperation);
        this.registerOperation(KV.deleteKvNamespaceOperation);
        this.registerOperation(KV.listKvKeysOperation);
        this.registerOperation(KV.getKvValueOperation);
        this.registerOperation(KV.putKvValueOperation);
        this.registerOperation(KV.deleteKvKeyOperation);
        this.registerOperation(KV.bulkWriteKvOperation);
    }

    /**
     * Get API Key configuration
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
            // Zone operations
            case "zones_listZones":
                return await Zones.executeListZones(client, validatedParams as never);
            case "zones_getZone":
                return await Zones.executeGetZone(client, validatedParams as never);

            // DNS operations
            case "dns_listRecords":
                return await DNS.executeListDnsRecords(client, validatedParams as never);
            case "dns_getRecord":
                return await DNS.executeGetDnsRecord(client, validatedParams as never);
            case "dns_createRecord":
                return await DNS.executeCreateDnsRecord(client, validatedParams as never);
            case "dns_updateRecord":
                return await DNS.executeUpdateDnsRecord(client, validatedParams as never);
            case "dns_deleteRecord":
                return await DNS.executeDeleteDnsRecord(client, validatedParams as never);

            // Workers operations
            case "workers_listScripts":
                return await Workers.executeListWorkers(client, validatedParams as never);
            case "workers_getScript":
                return await Workers.executeGetWorker(client, validatedParams as never);
            case "workers_uploadScript":
                return await Workers.executeUploadWorker(client, validatedParams as never);
            case "workers_deleteScript":
                return await Workers.executeDeleteWorker(client, validatedParams as never);
            case "workers_getSettings":
                return await Workers.executeGetWorkerSettings(client, validatedParams as never);

            // KV operations
            case "kv_listNamespaces":
                return await KV.executeListKvNamespaces(client, validatedParams as never);
            case "kv_createNamespace":
                return await KV.executeCreateKvNamespace(client, validatedParams as never);
            case "kv_deleteNamespace":
                return await KV.executeDeleteKvNamespace(client, validatedParams as never);
            case "kv_listKeys":
                return await KV.executeListKvKeys(client, validatedParams as never);
            case "kv_getValue":
                return await KV.executeGetKvValue(client, validatedParams as never);
            case "kv_putValue":
                return await KV.executePutKvValue(client, validatedParams as never);
            case "kv_deleteKey":
                return await KV.executeDeleteKvKey(client, validatedParams as never);
            case "kv_bulkWrite":
                return await KV.executeBulkWriteKv(client, validatedParams as never);

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
            name: `cloudflare_${op.id}`,
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
        // Remove cloudflare_ prefix to get operation ID
        const operationId = toolName.replace("cloudflare_", "");

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
     * Get or create Cloudflare client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): CloudflareClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as ApiKeyData;
        const providerConfig = connection.metadata.provider_config as
            | { accountId?: string }
            | undefined;

        if (!data.api_key) {
            throw new Error(
                "Cloudflare API token is required. Please reconnect with valid credentials."
            );
        }

        if (!providerConfig?.accountId) {
            throw new Error(
                "Cloudflare Account ID is required. Please reconnect and enter your Account ID."
            );
        }

        const client = new CloudflareClient({
            apiToken: data.api_key,
            accountId: providerConfig.accountId
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
