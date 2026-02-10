import { BaseProvider } from "../../core/BaseProvider";
import { InsightlyClient } from "./client/InsightlyClient";
import { InsightlyMCPAdapter } from "./mcp/InsightlyMCPAdapter";
// Contact operations
import {
    listContactsOperation,
    executeListContacts,
    getContactOperation,
    executeGetContact,
    createContactOperation,
    executeCreateContact,
    updateContactOperation,
    executeUpdateContact,
    deleteContactOperation,
    executeDeleteContact
} from "./operations/contacts";
// Organisation operations
// Lead operations
import {
    listLeadsOperation,
    executeListLeads,
    getLeadOperation,
    executeGetLead,
    createLeadOperation,
    executeCreateLead,
    updateLeadOperation,
    executeUpdateLead,
    deleteLeadOperation,
    executeDeleteLead
} from "./operations/leads";
// Opportunity operations
import {
    listOpportunitiesOperation,
    executeListOpportunities,
    getOpportunityOperation,
    executeGetOpportunity,
    createOpportunityOperation,
    executeCreateOpportunity,
    updateOpportunityOperation,
    executeUpdateOpportunity,
    deleteOpportunityOperation,
    executeDeleteOpportunity
} from "./operations/opportunities";
import {
    listOrganisationsOperation,
    executeListOrganisations,
    getOrganisationOperation,
    executeGetOrganisation,
    createOrganisationOperation,
    executeCreateOrganisation,
    updateOrganisationOperation,
    executeUpdateOrganisation,
    deleteOrganisationOperation,
    executeDeleteOrganisation
} from "./operations/organisations";
// Task operations
import {
    listTasksOperation,
    executeListTasks,
    getTaskOperation,
    executeGetTask,
    createTaskOperation,
    executeCreateTask,
    updateTaskOperation,
    executeUpdateTask,
    deleteTaskOperation,
    executeDeleteTask
} from "./operations/tasks";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    APIKeyConfig,
    ProviderCapabilities
} from "../../core/types";

/**
 * Insightly CRM Provider - implements API Key authentication with CRM operations
 *
 * Insightly uses HTTP Basic Auth with the API key as username and empty password
 * Base URL varies by pod: https://api.{pod}.insightly.com/v3.1
 *
 * Rate limit: 10 requests/second, daily limits by plan
 */
export class InsightlyProvider extends BaseProvider {
    readonly name = "insightly";
    readonly displayName = "Insightly";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 600 // 10 req/sec
        }
    };

    private mcpAdapter: InsightlyMCPAdapter;
    private clientPool: Map<string, InsightlyClient> = new Map();

    constructor() {
        super();

        // Register Contact operations
        this.registerOperation(listContactsOperation);
        this.registerOperation(getContactOperation);
        this.registerOperation(createContactOperation);
        this.registerOperation(updateContactOperation);
        this.registerOperation(deleteContactOperation);

        // Register Organisation operations
        this.registerOperation(listOrganisationsOperation);
        this.registerOperation(getOrganisationOperation);
        this.registerOperation(createOrganisationOperation);
        this.registerOperation(updateOrganisationOperation);
        this.registerOperation(deleteOrganisationOperation);

        // Register Lead operations
        this.registerOperation(listLeadsOperation);
        this.registerOperation(getLeadOperation);
        this.registerOperation(createLeadOperation);
        this.registerOperation(updateLeadOperation);
        this.registerOperation(deleteLeadOperation);

        // Register Opportunity operations
        this.registerOperation(listOpportunitiesOperation);
        this.registerOperation(getOpportunityOperation);
        this.registerOperation(createOpportunityOperation);
        this.registerOperation(updateOpportunityOperation);
        this.registerOperation(deleteOpportunityOperation);

        // Register Task operations
        this.registerOperation(listTasksOperation);
        this.registerOperation(getTaskOperation);
        this.registerOperation(createTaskOperation);
        this.registerOperation(updateTaskOperation);
        this.registerOperation(deleteTaskOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new InsightlyMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "Basic {{base64(api_key:)}}"
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
            // Contact operations
            case "listContacts":
                return await executeListContacts(client, validatedParams as never);
            case "getContact":
                return await executeGetContact(client, validatedParams as never);
            case "createContact":
                return await executeCreateContact(client, validatedParams as never);
            case "updateContact":
                return await executeUpdateContact(client, validatedParams as never);
            case "deleteContact":
                return await executeDeleteContact(client, validatedParams as never);
            // Organisation operations
            case "listOrganisations":
                return await executeListOrganisations(client, validatedParams as never);
            case "getOrganisation":
                return await executeGetOrganisation(client, validatedParams as never);
            case "createOrganisation":
                return await executeCreateOrganisation(client, validatedParams as never);
            case "updateOrganisation":
                return await executeUpdateOrganisation(client, validatedParams as never);
            case "deleteOrganisation":
                return await executeDeleteOrganisation(client, validatedParams as never);
            // Lead operations
            case "listLeads":
                return await executeListLeads(client, validatedParams as never);
            case "getLead":
                return await executeGetLead(client, validatedParams as never);
            case "createLead":
                return await executeCreateLead(client, validatedParams as never);
            case "updateLead":
                return await executeUpdateLead(client, validatedParams as never);
            case "deleteLead":
                return await executeDeleteLead(client, validatedParams as never);
            // Opportunity operations
            case "listOpportunities":
                return await executeListOpportunities(client, validatedParams as never);
            case "getOpportunity":
                return await executeGetOpportunity(client, validatedParams as never);
            case "createOpportunity":
                return await executeCreateOpportunity(client, validatedParams as never);
            case "updateOpportunity":
                return await executeUpdateOpportunity(client, validatedParams as never);
            case "deleteOpportunity":
                return await executeDeleteOpportunity(client, validatedParams as never);
            // Task operations
            case "listTasks":
                return await executeListTasks(client, validatedParams as never);
            case "getTask":
                return await executeGetTask(client, validatedParams as never);
            case "createTask":
                return await executeCreateTask(client, validatedParams as never);
            case "updateTask":
                return await executeUpdateTask(client, validatedParams as never);
            case "deleteTask":
                return await executeDeleteTask(client, validatedParams as never);
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
        return this.mcpAdapter.getTools();
    }

    /**
     * Execute MCP tool
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const client = this.getOrCreateClient(connection);
        const result = await this.mcpAdapter.executeTool(toolName, params, client);

        if ((result as { success?: boolean }).success) {
            return (result as { data?: unknown }).data;
        } else {
            throw new Error(
                (result as { error?: { message?: string } }).error?.message ||
                    "MCP tool execution failed"
            );
        }
    }

    /**
     * Get or create Insightly client (with connection pooling)
     *
     * Insightly requires API key and pod for authentication
     */
    private getOrCreateClient(connection: ConnectionWithData): InsightlyClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        // Insightly uses api_key for the API key and api_secret for the pod
        const data = connection.data as ApiKeyData;
        const client = new InsightlyClient({
            apiKey: data.api_key,
            pod: data.api_secret || "na1" // Pod is stored in api_secret field
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
