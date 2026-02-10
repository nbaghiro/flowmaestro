import { BaseProvider } from "../../core/BaseProvider";
import { CopperClient } from "./client/CopperClient";
import { CopperMCPAdapter } from "./mcp/CopperMCPAdapter";
// Lead operations
import {
    listCompaniesOperation,
    executeListCompanies,
    getCompanyOperation,
    executeGetCompany,
    createCompanyOperation,
    executeCreateCompany,
    updateCompanyOperation,
    executeUpdateCompany,
    deleteCompanyOperation,
    executeDeleteCompany
} from "./operations/companies";
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
    executeDeleteLead,
    searchLeadsOperation,
    executeSearchLeads
} from "./operations/leads";
// People operations
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
    listPeopleOperation,
    executeListPeople,
    getPersonOperation,
    executeGetPerson,
    createPersonOperation,
    executeCreatePerson,
    updatePersonOperation,
    executeUpdatePerson,
    deletePersonOperation,
    executeDeletePerson
} from "./operations/people";
// Company operations
// Opportunity operations
// Task operations
import {
    listTasksOperation,
    executeListTasks,
    getTaskOperation,
    executeGetTask,
    createTaskOperation,
    executeCreateTask,
    updateTaskOperation,
    executeUpdateTask
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
 * Copper CRM Provider - implements API Key authentication with CRM operations
 *
 * Copper uses custom headers for authentication:
 * - X-PW-AccessToken: API key
 * - X-PW-Application: developer_api
 * - X-PW-UserEmail: User's email address
 *
 * Rate limit: 180 requests/minute (rolling)
 */
export class CopperProvider extends BaseProvider {
    readonly name = "copper";
    readonly displayName = "Copper";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 180
        }
    };

    private mcpAdapter: CopperMCPAdapter;
    private clientPool: Map<string, CopperClient> = new Map();

    constructor() {
        super();

        // Register Lead operations
        this.registerOperation(listLeadsOperation);
        this.registerOperation(getLeadOperation);
        this.registerOperation(createLeadOperation);
        this.registerOperation(updateLeadOperation);
        this.registerOperation(deleteLeadOperation);
        this.registerOperation(searchLeadsOperation);

        // Register People operations
        this.registerOperation(listPeopleOperation);
        this.registerOperation(getPersonOperation);
        this.registerOperation(createPersonOperation);
        this.registerOperation(updatePersonOperation);
        this.registerOperation(deletePersonOperation);

        // Register Company operations
        this.registerOperation(listCompaniesOperation);
        this.registerOperation(getCompanyOperation);
        this.registerOperation(createCompanyOperation);
        this.registerOperation(updateCompanyOperation);
        this.registerOperation(deleteCompanyOperation);

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

        // Initialize MCP adapter
        this.mcpAdapter = new CopperMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "X-PW-AccessToken",
            headerTemplate: "{{api_key}}"
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
            case "searchLeads":
                return await executeSearchLeads(client, validatedParams as never);
            // People operations
            case "listPeople":
                return await executeListPeople(client, validatedParams as never);
            case "getPerson":
                return await executeGetPerson(client, validatedParams as never);
            case "createPerson":
                return await executeCreatePerson(client, validatedParams as never);
            case "updatePerson":
                return await executeUpdatePerson(client, validatedParams as never);
            case "deletePerson":
                return await executeDeletePerson(client, validatedParams as never);
            // Company operations
            case "listCompanies":
                return await executeListCompanies(client, validatedParams as never);
            case "getCompany":
                return await executeGetCompany(client, validatedParams as never);
            case "createCompany":
                return await executeCreateCompany(client, validatedParams as never);
            case "updateCompany":
                return await executeUpdateCompany(client, validatedParams as never);
            case "deleteCompany":
                return await executeDeleteCompany(client, validatedParams as never);
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
     * Get or create Copper client (with connection pooling)
     *
     * Copper requires both API key and user email for authentication
     */
    private getOrCreateClient(connection: ConnectionWithData): CopperClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        // Copper uses api_key for the API key and api_secret for the user email
        const data = connection.data as ApiKeyData;
        const client = new CopperClient({
            apiKey: data.api_key,
            userEmail: data.api_secret || "" // User email is stored in api_secret field
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
