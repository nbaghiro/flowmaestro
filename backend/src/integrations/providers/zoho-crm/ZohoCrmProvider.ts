import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { getLogger } from "../../../core/logging";
import { BaseProvider } from "../../core/BaseProvider";
import { ZohoCrmClient } from "./client/ZohoCrmClient";
import { ZohoCrmMCPAdapter } from "./mcp/ZohoCrmMCPAdapter";
import {
    // Lead Operations
    createLeadOperation,
    executeCreateLead,
    getLeadOperation,
    executeGetLead,
    updateLeadOperation,
    executeUpdateLead,
    deleteLeadOperation,
    executeDeleteLead,
    listLeadsOperation,
    executeListLeads,
    searchLeadsOperation,
    executeSearchLeads,
    batchCreateLeadsOperation,
    executeBatchCreateLeads,
    batchUpdateLeadsOperation,
    executeBatchUpdateLeads,
    convertLeadOperation,
    executeConvertLead,
    // Contact Operations
    createContactOperation,
    executeCreateContact,
    getContactOperation,
    executeGetContact,
    updateContactOperation,
    executeUpdateContact,
    deleteContactOperation,
    executeDeleteContact,
    listContactsOperation,
    executeListContacts,
    searchContactsOperation,
    executeSearchContacts,
    batchCreateContactsOperation,
    executeBatchCreateContacts,
    batchUpdateContactsOperation,
    executeBatchUpdateContacts,
    // Account Operations
    createAccountOperation,
    executeCreateAccount,
    getAccountOperation,
    executeGetAccount,
    updateAccountOperation,
    executeUpdateAccount,
    deleteAccountOperation,
    executeDeleteAccount,
    listAccountsOperation,
    executeListAccounts,
    searchAccountsOperation,
    executeSearchAccounts,
    batchCreateAccountsOperation,
    executeBatchCreateAccounts,
    batchUpdateAccountsOperation,
    executeBatchUpdateAccounts,
    // Deal Operations
    createDealOperation,
    executeCreateDeal,
    getDealOperation,
    executeGetDeal,
    updateDealOperation,
    executeUpdateDeal,
    deleteDealOperation,
    executeDeleteDeal,
    listDealsOperation,
    executeListDeals,
    searchDealsOperation,
    executeSearchDeals,
    batchCreateDealsOperation,
    executeBatchCreateDeals,
    batchUpdateDealsOperation,
    executeBatchUpdateDeals,
    // Task Operations
    createTaskOperation,
    executeCreateTask,
    getTaskOperation,
    executeGetTask,
    updateTaskOperation,
    executeUpdateTask,
    deleteTaskOperation,
    executeDeleteTask,
    listTasksOperation,
    executeListTasks,
    // Note Operations
    createNoteOperation,
    executeCreateNote,
    getNoteOperation,
    executeGetNote,
    updateNoteOperation,
    executeUpdateNote,
    deleteNoteOperation,
    executeDeleteNote,
    listNotesOperation,
    executeListNotes,
    // Call Operations
    createCallOperation,
    executeCreateCall,
    getCallOperation,
    executeGetCall,
    updateCallOperation,
    executeUpdateCall,
    deleteCallOperation,
    executeDeleteCall,
    listCallsOperation,
    executeListCalls,
    // Utility Operations
    queryRecordsOperation,
    executeQueryRecords,
    listModulesOperation,
    executeListModules
} from "./operations";
import { ZOHO_DATA_CENTERS, type ZohoDataCenter } from "./operations/types";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities
} from "../../core/types";

const logger = getLogger();

/**
 * Zoho CRM Provider
 *
 * Implements OAuth 2.0 authentication and provides 50+ operations for:
 * - CRM Objects (Leads, Contacts, Accounts, Deals)
 * - Engagements (Tasks, Notes, Calls)
 * - Utility (COQL Query, Modules)
 *
 * Key Differences from other providers:
 * - Multi-region data center support (US, EU, AU, IN, JP, CN, CA)
 * - Uses "Zoho-oauthtoken" instead of "Bearer" for auth header
 * - API version 8 (latest)
 *
 * Rate Limits:
 * - Concurrency-based (not time-based)
 * - Credits per 24h: varies by edition (Enterprise = 5M)
 * - Batch: up to 100 records per insert/update/delete
 * - Fetch: up to 200 records per GET
 *
 * Documentation: https://www.zoho.com/crm/developer/docs/api/v8/
 */
export class ZohoCrmProvider extends BaseProvider {
    readonly name = "zoho-crm";
    readonly displayName = "Zoho CRM";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 600,
            burstSize: 20
        }
    };

    private clientPool: Map<string, ZohoCrmClient> = new Map();
    private mcpAdapter: ZohoCrmMCPAdapter;

    constructor() {
        super();

        // Register Lead Operations (9 operations)
        this.registerOperation(createLeadOperation);
        this.registerOperation(getLeadOperation);
        this.registerOperation(updateLeadOperation);
        this.registerOperation(deleteLeadOperation);
        this.registerOperation(listLeadsOperation);
        this.registerOperation(searchLeadsOperation);
        this.registerOperation(batchCreateLeadsOperation);
        this.registerOperation(batchUpdateLeadsOperation);
        this.registerOperation(convertLeadOperation);

        // Register Contact Operations (8 operations)
        this.registerOperation(createContactOperation);
        this.registerOperation(getContactOperation);
        this.registerOperation(updateContactOperation);
        this.registerOperation(deleteContactOperation);
        this.registerOperation(listContactsOperation);
        this.registerOperation(searchContactsOperation);
        this.registerOperation(batchCreateContactsOperation);
        this.registerOperation(batchUpdateContactsOperation);

        // Register Account Operations (8 operations)
        this.registerOperation(createAccountOperation);
        this.registerOperation(getAccountOperation);
        this.registerOperation(updateAccountOperation);
        this.registerOperation(deleteAccountOperation);
        this.registerOperation(listAccountsOperation);
        this.registerOperation(searchAccountsOperation);
        this.registerOperation(batchCreateAccountsOperation);
        this.registerOperation(batchUpdateAccountsOperation);

        // Register Deal Operations (8 operations)
        this.registerOperation(createDealOperation);
        this.registerOperation(getDealOperation);
        this.registerOperation(updateDealOperation);
        this.registerOperation(deleteDealOperation);
        this.registerOperation(listDealsOperation);
        this.registerOperation(searchDealsOperation);
        this.registerOperation(batchCreateDealsOperation);
        this.registerOperation(batchUpdateDealsOperation);

        // Register Task Operations (5 operations)
        this.registerOperation(createTaskOperation);
        this.registerOperation(getTaskOperation);
        this.registerOperation(updateTaskOperation);
        this.registerOperation(deleteTaskOperation);
        this.registerOperation(listTasksOperation);

        // Register Note Operations (5 operations)
        this.registerOperation(createNoteOperation);
        this.registerOperation(getNoteOperation);
        this.registerOperation(updateNoteOperation);
        this.registerOperation(deleteNoteOperation);
        this.registerOperation(listNotesOperation);

        // Register Call Operations (5 operations)
        this.registerOperation(createCallOperation);
        this.registerOperation(getCallOperation);
        this.registerOperation(updateCallOperation);
        this.registerOperation(deleteCallOperation);
        this.registerOperation(listCallsOperation);

        // Register Utility Operations (2 operations)
        this.registerOperation(queryRecordsOperation);
        this.registerOperation(listModulesOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new ZohoCrmMCPAdapter(this.operations);

        logger.info(
            { component: "ZohoCrmProvider", operationCount: this.operations.size },
            "Registered operations"
        );
    }

    /**
     * Get OAuth configuration
     * Note: Zoho requires region-specific URLs, but the initial auth can use the main accounts.zoho.com
     * The actual API calls use the data center URL based on user selection
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://accounts.zoho.com/oauth/v2/auth",
            tokenUrl: "https://accounts.zoho.com/oauth/v2/token",
            scopes: [
                "ZohoCRM.modules.ALL",
                "ZohoCRM.settings.ALL",
                "ZohoCRM.users.READ",
                "ZohoCRM.org.READ",
                "ZohoCRM.coql.READ"
            ],
            clientId: appConfig.oauth.zohoCrm.clientId,
            clientSecret: appConfig.oauth.zohoCrm.clientSecret,
            redirectUri: getOAuthRedirectUri("zoho-crm"),
            refreshable: true
        };

        return config;
    }

    /**
     * Get auth URL with data center support
     */
    getAuthUrlForDataCenter(dataCenter: ZohoDataCenter): string {
        const dcConfig = ZOHO_DATA_CENTERS[dataCenter];
        return `${dcConfig.accountsUrl}/oauth/v2/auth`;
    }

    /**
     * Get token URL with data center support
     */
    getTokenUrlForDataCenter(dataCenter: ZohoDataCenter): string {
        const dcConfig = ZOHO_DATA_CENTERS[dataCenter];
        return `${dcConfig.accountsUrl}/oauth/v2/token`;
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
        return this.mcpAdapter.executeTool(toolName, params, client);
    }

    /**
     * Execute operation
     */
    async executeOperation(
        operation: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const client = this.getOrCreateClient(connection);

        // Route to appropriate operation executor
        switch (operation) {
            // Lead Operations
            case "createLead":
                return executeCreateLead(client, params as Parameters<typeof executeCreateLead>[1]);
            case "getLead":
                return executeGetLead(client, params as Parameters<typeof executeGetLead>[1]);
            case "updateLead":
                return executeUpdateLead(client, params as Parameters<typeof executeUpdateLead>[1]);
            case "deleteLead":
                return executeDeleteLead(client, params as Parameters<typeof executeDeleteLead>[1]);
            case "listLeads":
                return executeListLeads(client, params as Parameters<typeof executeListLeads>[1]);
            case "searchLeads":
                return executeSearchLeads(
                    client,
                    params as Parameters<typeof executeSearchLeads>[1]
                );
            case "batchCreateLeads":
                return executeBatchCreateLeads(
                    client,
                    params as Parameters<typeof executeBatchCreateLeads>[1]
                );
            case "batchUpdateLeads":
                return executeBatchUpdateLeads(
                    client,
                    params as Parameters<typeof executeBatchUpdateLeads>[1]
                );
            case "convertLead":
                return executeConvertLead(
                    client,
                    params as Parameters<typeof executeConvertLead>[1]
                );

            // Contact Operations
            case "createContact":
                return executeCreateContact(
                    client,
                    params as Parameters<typeof executeCreateContact>[1]
                );
            case "getContact":
                return executeGetContact(client, params as Parameters<typeof executeGetContact>[1]);
            case "updateContact":
                return executeUpdateContact(
                    client,
                    params as Parameters<typeof executeUpdateContact>[1]
                );
            case "deleteContact":
                return executeDeleteContact(
                    client,
                    params as Parameters<typeof executeDeleteContact>[1]
                );
            case "listContacts":
                return executeListContacts(
                    client,
                    params as Parameters<typeof executeListContacts>[1]
                );
            case "searchContacts":
                return executeSearchContacts(
                    client,
                    params as Parameters<typeof executeSearchContacts>[1]
                );
            case "batchCreateContacts":
                return executeBatchCreateContacts(
                    client,
                    params as Parameters<typeof executeBatchCreateContacts>[1]
                );
            case "batchUpdateContacts":
                return executeBatchUpdateContacts(
                    client,
                    params as Parameters<typeof executeBatchUpdateContacts>[1]
                );

            // Account Operations
            case "createAccount":
                return executeCreateAccount(
                    client,
                    params as Parameters<typeof executeCreateAccount>[1]
                );
            case "getAccount":
                return executeGetAccount(client, params as Parameters<typeof executeGetAccount>[1]);
            case "updateAccount":
                return executeUpdateAccount(
                    client,
                    params as Parameters<typeof executeUpdateAccount>[1]
                );
            case "deleteAccount":
                return executeDeleteAccount(
                    client,
                    params as Parameters<typeof executeDeleteAccount>[1]
                );
            case "listAccounts":
                return executeListAccounts(
                    client,
                    params as Parameters<typeof executeListAccounts>[1]
                );
            case "searchAccounts":
                return executeSearchAccounts(
                    client,
                    params as Parameters<typeof executeSearchAccounts>[1]
                );
            case "batchCreateAccounts":
                return executeBatchCreateAccounts(
                    client,
                    params as Parameters<typeof executeBatchCreateAccounts>[1]
                );
            case "batchUpdateAccounts":
                return executeBatchUpdateAccounts(
                    client,
                    params as Parameters<typeof executeBatchUpdateAccounts>[1]
                );

            // Deal Operations
            case "createDeal":
                return executeCreateDeal(client, params as Parameters<typeof executeCreateDeal>[1]);
            case "getDeal":
                return executeGetDeal(client, params as Parameters<typeof executeGetDeal>[1]);
            case "updateDeal":
                return executeUpdateDeal(client, params as Parameters<typeof executeUpdateDeal>[1]);
            case "deleteDeal":
                return executeDeleteDeal(client, params as Parameters<typeof executeDeleteDeal>[1]);
            case "listDeals":
                return executeListDeals(client, params as Parameters<typeof executeListDeals>[1]);
            case "searchDeals":
                return executeSearchDeals(
                    client,
                    params as Parameters<typeof executeSearchDeals>[1]
                );
            case "batchCreateDeals":
                return executeBatchCreateDeals(
                    client,
                    params as Parameters<typeof executeBatchCreateDeals>[1]
                );
            case "batchUpdateDeals":
                return executeBatchUpdateDeals(
                    client,
                    params as Parameters<typeof executeBatchUpdateDeals>[1]
                );

            // Task Operations
            case "createTask":
                return executeCreateTask(client, params as Parameters<typeof executeCreateTask>[1]);
            case "getTask":
                return executeGetTask(client, params as Parameters<typeof executeGetTask>[1]);
            case "updateTask":
                return executeUpdateTask(client, params as Parameters<typeof executeUpdateTask>[1]);
            case "deleteTask":
                return executeDeleteTask(client, params as Parameters<typeof executeDeleteTask>[1]);
            case "listTasks":
                return executeListTasks(client, params as Parameters<typeof executeListTasks>[1]);

            // Note Operations
            case "createNote":
                return executeCreateNote(client, params as Parameters<typeof executeCreateNote>[1]);
            case "getNote":
                return executeGetNote(client, params as Parameters<typeof executeGetNote>[1]);
            case "updateNote":
                return executeUpdateNote(client, params as Parameters<typeof executeUpdateNote>[1]);
            case "deleteNote":
                return executeDeleteNote(client, params as Parameters<typeof executeDeleteNote>[1]);
            case "listNotes":
                return executeListNotes(client, params as Parameters<typeof executeListNotes>[1]);

            // Call Operations
            case "createCall":
                return executeCreateCall(client, params as Parameters<typeof executeCreateCall>[1]);
            case "getCall":
                return executeGetCall(client, params as Parameters<typeof executeGetCall>[1]);
            case "updateCall":
                return executeUpdateCall(client, params as Parameters<typeof executeUpdateCall>[1]);
            case "deleteCall":
                return executeDeleteCall(client, params as Parameters<typeof executeDeleteCall>[1]);
            case "listCalls":
                return executeListCalls(client, params as Parameters<typeof executeListCalls>[1]);

            // Utility Operations
            case "queryRecords":
                return executeQueryRecords(
                    client,
                    params as Parameters<typeof executeQueryRecords>[1]
                );
            case "listModules":
                return executeListModules(
                    client,
                    params as Parameters<typeof executeListModules>[1]
                );

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown operation: ${operation}`,
                        retryable: false
                    }
                };
        }
    }

    /**
     * Get or create HTTP client for connection
     */
    private getOrCreateClient(connection: ConnectionWithData): ZohoCrmClient {
        const cacheKey = connection.id;

        let client = this.clientPool.get(cacheKey);

        if (!client) {
            const oauth2Data = connection.data as OAuth2TokenData;
            if (!oauth2Data.access_token) {
                throw new Error("No access token found in connection data");
            }

            // Get data center from connection metadata provider_config or default to US
            const dataCenter =
                (connection.metadata?.provider_config?.dataCenter as ZohoDataCenter) || "us";

            client = new ZohoCrmClient({
                accessToken: oauth2Data.access_token,
                connectionId: connection.id,
                dataCenter
            });

            this.clientPool.set(cacheKey, client);
            logger.info(
                { component: "ZohoCrmProvider", connectionId: connection.id, dataCenter },
                "Created new client for connection"
            );
        }

        return client;
    }

    /**
     * Clear cached client (e.g., after token refresh)
     */
    clearClientCache(connectionId: string): void {
        this.clientPool.delete(connectionId);
        logger.info(
            { component: "ZohoCrmProvider", connectionId },
            "Cleared client cache for connection"
        );
    }
}
