import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { getLogger } from "../../../core/logging";
import { BaseProvider } from "../../core/BaseProvider";
import { HubspotClient } from "./client/HubspotClient";
import { HubspotMCPAdapter } from "./mcp/HubspotMCPAdapter";
import {
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
    batchReadContactsOperation,
    executeBatchReadContacts,
    batchUpsertContactsOperation,
    executeBatchUpsertContacts,
    // Company Operations
    createCompanyOperation,
    executeCreateCompany,
    getCompanyOperation,
    executeGetCompany,
    updateCompanyOperation,
    executeUpdateCompany,
    deleteCompanyOperation,
    executeDeleteCompany,
    listCompaniesOperation,
    executeListCompanies,
    searchCompaniesOperation,
    executeSearchCompanies,
    batchCreateCompaniesOperation,
    executeBatchCreateCompanies,
    batchUpdateCompaniesOperation,
    executeBatchUpdateCompanies,
    batchReadCompaniesOperation,
    executeBatchReadCompanies,
    batchUpsertCompaniesOperation,
    executeBatchUpsertCompanies,
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
    batchReadDealsOperation,
    executeBatchReadDeals,
    batchUpsertDealsOperation,
    executeBatchUpsertDeals,
    // Ticket Operations
    createTicketOperation,
    executeCreateTicket,
    getTicketOperation,
    executeGetTicket,
    updateTicketOperation,
    executeUpdateTicket,
    deleteTicketOperation,
    executeDeleteTicket,
    listTicketsOperation,
    executeListTickets,
    searchTicketsOperation,
    executeSearchTickets,
    batchCreateTicketsOperation,
    executeBatchCreateTickets,
    batchUpdateTicketsOperation,
    executeBatchUpdateTickets,
    batchReadTicketsOperation,
    executeBatchReadTickets,
    batchUpsertTicketsOperation,
    executeBatchUpsertTickets,
    // Product Operations
    createProductOperation,
    executeCreateProduct,
    getProductOperation,
    executeGetProduct,
    updateProductOperation,
    executeUpdateProduct,
    deleteProductOperation,
    executeDeleteProduct,
    listProductsOperation,
    executeListProducts,
    searchProductsOperation,
    executeSearchProducts,
    // Quote Operations
    createQuoteOperation,
    executeCreateQuote,
    getQuoteOperation,
    executeGetQuote,
    updateQuoteOperation,
    executeUpdateQuote,
    deleteQuoteOperation,
    executeDeleteQuote,
    listQuotesOperation,
    executeListQuotes,
    // Line Item Operations
    createLineItemOperation,
    executeCreateLineItem,
    getLineItemOperation,
    executeGetLineItem,
    updateLineItemOperation,
    executeUpdateLineItem,
    deleteLineItemOperation,
    executeDeleteLineItem,
    listLineItemsOperation,
    executeListLineItems,
    batchCreateLineItemsOperation,
    executeBatchCreateLineItems,
    // Association Operations
    createAssociationOperation,
    executeCreateAssociation,
    deleteAssociationOperation,
    executeDeleteAssociation,
    listAssociationsOperation,
    executeListAssociations,
    batchCreateAssociationsOperation,
    executeBatchCreateAssociations,
    // Meeting Operations
    createMeetingOperation,
    executeCreateMeeting,
    getMeetingOperation,
    executeGetMeeting,
    updateMeetingOperation,
    executeUpdateMeeting,
    deleteMeetingOperation,
    executeDeleteMeeting,
    listMeetingsOperation,
    executeListMeetings,
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
    // Email Operations
    createEmailOperation,
    executeCreateEmail,
    getEmailOperation,
    executeGetEmail,
    listEmailsOperation,
    executeListEmails,
    // Owner Operations
    listOwnersOperation,
    executeListOwners,
    getOwnerOperation,
    executeGetOwner
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

const logger = getLogger();

/**
 * HubSpot Provider
 *
 * Implements OAuth 2.0 authentication and provides 105+ operations for:
 * - CRM Objects (Contacts, Companies, Deals, Tickets, Products, Quotes, Line Items)
 * - Associations (linking objects together)
 * - Engagements (Meetings, Tasks, Notes, Calls, Emails)
 * - Marketing (Emails, Forms, Workflows)
 * - Lists, Owners, Timeline Events, and more
 *
 * Rate Limits:
 * - 100 requests per 10 seconds (600/minute) for standard accounts
 * - Burst allowance for brief spikes
 *
 * Documentation: https://developers.hubspot.com/docs/api/overview
 */
export class HubspotProvider extends BaseProvider {
    readonly name = "hubspot";
    readonly displayName = "HubSpot";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 600, // 100 req/10s = 600/min
            burstSize: 20
        }
    };

    private clientPool: Map<string, HubspotClient> = new Map();
    private mcpAdapter: HubspotMCPAdapter;

    constructor() {
        super();

        // Register Contact Operations (10 operations)
        this.registerOperation(createContactOperation);
        this.registerOperation(getContactOperation);
        this.registerOperation(updateContactOperation);
        this.registerOperation(deleteContactOperation);
        this.registerOperation(listContactsOperation);
        this.registerOperation(searchContactsOperation);
        this.registerOperation(batchCreateContactsOperation);
        this.registerOperation(batchUpdateContactsOperation);
        this.registerOperation(batchReadContactsOperation);
        this.registerOperation(batchUpsertContactsOperation);

        // Register Company Operations (10 operations)
        this.registerOperation(createCompanyOperation);
        this.registerOperation(getCompanyOperation);
        this.registerOperation(updateCompanyOperation);
        this.registerOperation(deleteCompanyOperation);
        this.registerOperation(listCompaniesOperation);
        this.registerOperation(searchCompaniesOperation);
        this.registerOperation(batchCreateCompaniesOperation);
        this.registerOperation(batchUpdateCompaniesOperation);
        this.registerOperation(batchReadCompaniesOperation);
        this.registerOperation(batchUpsertCompaniesOperation);

        // Register Deal Operations (10 operations)
        this.registerOperation(createDealOperation);
        this.registerOperation(getDealOperation);
        this.registerOperation(updateDealOperation);
        this.registerOperation(deleteDealOperation);
        this.registerOperation(listDealsOperation);
        this.registerOperation(searchDealsOperation);
        this.registerOperation(batchCreateDealsOperation);
        this.registerOperation(batchUpdateDealsOperation);
        this.registerOperation(batchReadDealsOperation);
        this.registerOperation(batchUpsertDealsOperation);

        // Register Ticket Operations (10 operations)
        this.registerOperation(createTicketOperation);
        this.registerOperation(getTicketOperation);
        this.registerOperation(updateTicketOperation);
        this.registerOperation(deleteTicketOperation);
        this.registerOperation(listTicketsOperation);
        this.registerOperation(searchTicketsOperation);
        this.registerOperation(batchCreateTicketsOperation);
        this.registerOperation(batchUpdateTicketsOperation);
        this.registerOperation(batchReadTicketsOperation);
        this.registerOperation(batchUpsertTicketsOperation);

        // Register Product Operations (6 operations)
        this.registerOperation(createProductOperation);
        this.registerOperation(getProductOperation);
        this.registerOperation(updateProductOperation);
        this.registerOperation(deleteProductOperation);
        this.registerOperation(listProductsOperation);
        this.registerOperation(searchProductsOperation);

        // Register Quote Operations (5 operations)
        this.registerOperation(createQuoteOperation);
        this.registerOperation(getQuoteOperation);
        this.registerOperation(updateQuoteOperation);
        this.registerOperation(deleteQuoteOperation);
        this.registerOperation(listQuotesOperation);

        // Register Line Item Operations (6 operations)
        this.registerOperation(createLineItemOperation);
        this.registerOperation(getLineItemOperation);
        this.registerOperation(updateLineItemOperation);
        this.registerOperation(deleteLineItemOperation);
        this.registerOperation(listLineItemsOperation);
        this.registerOperation(batchCreateLineItemsOperation);

        // Register Association Operations (4 operations)
        this.registerOperation(createAssociationOperation);
        this.registerOperation(deleteAssociationOperation);
        this.registerOperation(listAssociationsOperation);
        this.registerOperation(batchCreateAssociationsOperation);

        // Register Meeting Operations (5 operations)
        this.registerOperation(createMeetingOperation);
        this.registerOperation(getMeetingOperation);
        this.registerOperation(updateMeetingOperation);
        this.registerOperation(deleteMeetingOperation);
        this.registerOperation(listMeetingsOperation);

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

        // Register Email Operations (3 operations)
        this.registerOperation(createEmailOperation);
        this.registerOperation(getEmailOperation);
        this.registerOperation(listEmailsOperation);

        // Register Owner Operations (2 operations)
        this.registerOperation(listOwnersOperation);
        this.registerOperation(getOwnerOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new HubspotMCPAdapter(this.operations);

        logger.info(
            { component: "HubspotProvider", operationCount: this.operations.size },
            "Registered operations"
        );
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://app.hubspot.com/oauth/authorize",
            tokenUrl: "https://api.hubapi.com/oauth/v1/token",
            scopes: [
                // CRM Objects
                "crm.objects.contacts.read",
                "crm.objects.contacts.write",
                "crm.objects.companies.read",
                "crm.objects.companies.write",
                "crm.objects.deals.read",
                "crm.objects.deals.write",
                "crm.objects.tickets.read",
                "crm.objects.tickets.write",
                "crm.objects.quotes.read",
                "crm.objects.quotes.write",
                "crm.objects.line_items.read",
                "crm.objects.line_items.write",
                // Engagements
                "crm.objects.meetings.read",
                "crm.objects.meetings.write",
                "crm.objects.tasks.read",
                "crm.objects.tasks.write",
                "crm.objects.notes.read",
                "crm.objects.notes.write",
                "crm.objects.calls.read",
                "crm.objects.calls.write",
                "crm.objects.emails.read",
                "crm.objects.emails.write",
                // Schema & Lists
                "crm.schemas.contacts.read",
                "crm.schemas.companies.read",
                "crm.schemas.deals.read",
                "crm.lists.read",
                "crm.lists.write",
                // Marketing
                "content",
                "forms",
                "automation",
                // Files & Communication
                "files",
                "conversations.read",
                "conversations.write"
            ],
            clientId: appConfig.oauth.hubspot.clientId,
            clientSecret: appConfig.oauth.hubspot.clientSecret,
            redirectUri: getOAuthRedirectUri("hubspot"),
            refreshable: true
        };

        return config;
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
            case "batchReadContacts":
                return executeBatchReadContacts(
                    client,
                    params as Parameters<typeof executeBatchReadContacts>[1]
                );
            case "batchUpsertContacts":
                return executeBatchUpsertContacts(
                    client,
                    params as Parameters<typeof executeBatchUpsertContacts>[1]
                );

            // Company Operations
            case "createCompany":
                return executeCreateCompany(
                    client,
                    params as Parameters<typeof executeCreateCompany>[1]
                );
            case "getCompany":
                return executeGetCompany(client, params as Parameters<typeof executeGetCompany>[1]);
            case "updateCompany":
                return executeUpdateCompany(
                    client,
                    params as Parameters<typeof executeUpdateCompany>[1]
                );
            case "deleteCompany":
                return executeDeleteCompany(
                    client,
                    params as Parameters<typeof executeDeleteCompany>[1]
                );
            case "listCompanies":
                return executeListCompanies(
                    client,
                    params as Parameters<typeof executeListCompanies>[1]
                );
            case "searchCompanies":
                return executeSearchCompanies(
                    client,
                    params as Parameters<typeof executeSearchCompanies>[1]
                );
            case "batchCreateCompanies":
                return executeBatchCreateCompanies(
                    client,
                    params as Parameters<typeof executeBatchCreateCompanies>[1]
                );
            case "batchUpdateCompanies":
                return executeBatchUpdateCompanies(
                    client,
                    params as Parameters<typeof executeBatchUpdateCompanies>[1]
                );
            case "batchReadCompanies":
                return executeBatchReadCompanies(
                    client,
                    params as Parameters<typeof executeBatchReadCompanies>[1]
                );
            case "batchUpsertCompanies":
                return executeBatchUpsertCompanies(
                    client,
                    params as Parameters<typeof executeBatchUpsertCompanies>[1]
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
            case "batchReadDeals":
                return executeBatchReadDeals(
                    client,
                    params as Parameters<typeof executeBatchReadDeals>[1]
                );
            case "batchUpsertDeals":
                return executeBatchUpsertDeals(
                    client,
                    params as Parameters<typeof executeBatchUpsertDeals>[1]
                );

            // Ticket Operations
            case "createTicket":
                return executeCreateTicket(
                    client,
                    params as Parameters<typeof executeCreateTicket>[1]
                );
            case "getTicket":
                return executeGetTicket(client, params as Parameters<typeof executeGetTicket>[1]);
            case "updateTicket":
                return executeUpdateTicket(
                    client,
                    params as Parameters<typeof executeUpdateTicket>[1]
                );
            case "deleteTicket":
                return executeDeleteTicket(
                    client,
                    params as Parameters<typeof executeDeleteTicket>[1]
                );
            case "listTickets":
                return executeListTickets(
                    client,
                    params as Parameters<typeof executeListTickets>[1]
                );
            case "searchTickets":
                return executeSearchTickets(
                    client,
                    params as Parameters<typeof executeSearchTickets>[1]
                );
            case "batchCreateTickets":
                return executeBatchCreateTickets(
                    client,
                    params as Parameters<typeof executeBatchCreateTickets>[1]
                );
            case "batchUpdateTickets":
                return executeBatchUpdateTickets(
                    client,
                    params as Parameters<typeof executeBatchUpdateTickets>[1]
                );
            case "batchReadTickets":
                return executeBatchReadTickets(
                    client,
                    params as Parameters<typeof executeBatchReadTickets>[1]
                );
            case "batchUpsertTickets":
                return executeBatchUpsertTickets(
                    client,
                    params as Parameters<typeof executeBatchUpsertTickets>[1]
                );

            // Product Operations
            case "createProduct":
                return executeCreateProduct(
                    client,
                    params as Parameters<typeof executeCreateProduct>[1]
                );
            case "getProduct":
                return executeGetProduct(client, params as Parameters<typeof executeGetProduct>[1]);
            case "updateProduct":
                return executeUpdateProduct(
                    client,
                    params as Parameters<typeof executeUpdateProduct>[1]
                );
            case "deleteProduct":
                return executeDeleteProduct(
                    client,
                    params as Parameters<typeof executeDeleteProduct>[1]
                );
            case "listProducts":
                return executeListProducts(
                    client,
                    params as Parameters<typeof executeListProducts>[1]
                );
            case "searchProducts":
                return executeSearchProducts(
                    client,
                    params as Parameters<typeof executeSearchProducts>[1]
                );

            // Quote Operations
            case "createQuote":
                return executeCreateQuote(
                    client,
                    params as Parameters<typeof executeCreateQuote>[1]
                );
            case "getQuote":
                return executeGetQuote(client, params as Parameters<typeof executeGetQuote>[1]);
            case "updateQuote":
                return executeUpdateQuote(
                    client,
                    params as Parameters<typeof executeUpdateQuote>[1]
                );
            case "deleteQuote":
                return executeDeleteQuote(
                    client,
                    params as Parameters<typeof executeDeleteQuote>[1]
                );
            case "listQuotes":
                return executeListQuotes(client, params as Parameters<typeof executeListQuotes>[1]);

            // Line Item Operations
            case "createLineItem":
                return executeCreateLineItem(
                    client,
                    params as Parameters<typeof executeCreateLineItem>[1]
                );
            case "getLineItem":
                return executeGetLineItem(
                    client,
                    params as Parameters<typeof executeGetLineItem>[1]
                );
            case "updateLineItem":
                return executeUpdateLineItem(
                    client,
                    params as Parameters<typeof executeUpdateLineItem>[1]
                );
            case "deleteLineItem":
                return executeDeleteLineItem(
                    client,
                    params as Parameters<typeof executeDeleteLineItem>[1]
                );
            case "listLineItems":
                return executeListLineItems(
                    client,
                    params as Parameters<typeof executeListLineItems>[1]
                );
            case "batchCreateLineItems":
                return executeBatchCreateLineItems(
                    client,
                    params as Parameters<typeof executeBatchCreateLineItems>[1]
                );

            // Association Operations
            case "createAssociation":
                return executeCreateAssociation(
                    client,
                    params as Parameters<typeof executeCreateAssociation>[1]
                );
            case "deleteAssociation":
                return executeDeleteAssociation(
                    client,
                    params as Parameters<typeof executeDeleteAssociation>[1]
                );
            case "listAssociations":
                return executeListAssociations(
                    client,
                    params as Parameters<typeof executeListAssociations>[1]
                );
            case "batchCreateAssociations":
                return executeBatchCreateAssociations(
                    client,
                    params as Parameters<typeof executeBatchCreateAssociations>[1]
                );

            // Meeting Operations
            case "createMeeting":
                return executeCreateMeeting(
                    client,
                    params as Parameters<typeof executeCreateMeeting>[1]
                );
            case "getMeeting":
                return executeGetMeeting(client, params as Parameters<typeof executeGetMeeting>[1]);
            case "updateMeeting":
                return executeUpdateMeeting(
                    client,
                    params as Parameters<typeof executeUpdateMeeting>[1]
                );
            case "deleteMeeting":
                return executeDeleteMeeting(
                    client,
                    params as Parameters<typeof executeDeleteMeeting>[1]
                );
            case "listMeetings":
                return executeListMeetings(
                    client,
                    params as Parameters<typeof executeListMeetings>[1]
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

            // Email Operations
            case "createEmail":
                return executeCreateEmail(
                    client,
                    params as Parameters<typeof executeCreateEmail>[1]
                );
            case "getEmail":
                return executeGetEmail(client, params as Parameters<typeof executeGetEmail>[1]);
            case "listEmails":
                return executeListEmails(client, params as Parameters<typeof executeListEmails>[1]);

            // Owner Operations
            case "listOwners":
                return executeListOwners(client, params as Parameters<typeof executeListOwners>[1]);
            case "getOwner":
                return executeGetOwner(client, params as Parameters<typeof executeGetOwner>[1]);

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
    private getOrCreateClient(connection: ConnectionWithData): HubspotClient {
        const cacheKey = connection.id;

        let client = this.clientPool.get(cacheKey);

        if (!client) {
            const oauth2Data = connection.data as OAuth2TokenData;
            if (!oauth2Data.access_token) {
                throw new Error("No access token found in connection data");
            }

            client = new HubspotClient({
                accessToken: oauth2Data.access_token,
                connectionId: connection.id
            });

            this.clientPool.set(cacheKey, client);
            logger.info(
                { component: "HubspotProvider", connectionId: connection.id },
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
            { component: "HubspotProvider", connectionId },
            "Cleared client cache for connection"
        );
    }
}
