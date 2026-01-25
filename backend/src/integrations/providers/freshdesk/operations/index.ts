/**
 * Freshdesk Operations Index
 *
 * Re-exports all operations for the Freshdesk integration
 */

// Tickets operations
export {
    createTicketOperation,
    createTicketSchema,
    executeCreateTicket,
    type CreateTicketParams,
    getTicketOperation,
    getTicketSchema,
    executeGetTicket,
    type GetTicketParams,
    updateTicketOperation,
    updateTicketSchema,
    executeUpdateTicket,
    type UpdateTicketParams,
    deleteTicketOperation,
    deleteTicketSchema,
    executeDeleteTicket,
    type DeleteTicketParams,
    listTicketsOperation,
    listTicketsSchema,
    executeListTickets,
    type ListTicketsParams,
    searchTicketsOperation,
    searchTicketsSchema,
    executeSearchTickets,
    type SearchTicketsParams,
    addTicketReplyOperation,
    addTicketReplySchema,
    executeAddTicketReply,
    type AddTicketReplyParams,
    addTicketNoteOperation,
    addTicketNoteSchema,
    executeAddTicketNote,
    type AddTicketNoteParams
} from "./tickets";

// Contacts operations
export {
    createContactOperation,
    createContactSchema,
    executeCreateContact,
    type CreateContactParams,
    getContactOperation,
    getContactSchema,
    executeGetContact,
    type GetContactParams,
    updateContactOperation,
    updateContactSchema,
    executeUpdateContact,
    type UpdateContactParams,
    listContactsOperation,
    listContactsSchema,
    executeListContacts,
    type ListContactsParams,
    searchContactsOperation,
    searchContactsSchema,
    executeSearchContacts,
    type SearchContactsParams
} from "./contacts";

// Companies operations
export {
    createCompanyOperation,
    createCompanySchema,
    executeCreateCompany,
    type CreateCompanyParams,
    getCompanyOperation,
    getCompanySchema,
    executeGetCompany,
    type GetCompanyParams,
    updateCompanyOperation,
    updateCompanySchema,
    executeUpdateCompany,
    type UpdateCompanyParams,
    listCompaniesOperation,
    listCompaniesSchema,
    executeListCompanies,
    type ListCompaniesParams
} from "./companies";

// Agents operations
export {
    listAgentsOperation,
    listAgentsSchema,
    executeListAgents,
    type ListAgentsParams,
    getAgentOperation,
    getAgentSchema,
    executeGetAgent,
    type GetAgentParams,
    getCurrentAgentOperation,
    getCurrentAgentSchema,
    executeGetCurrentAgent,
    type GetCurrentAgentParams
} from "./agents";
