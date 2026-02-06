/**
 * Gorgias Operations Index
 *
 * Re-exports all operations for the Gorgias integration
 */

// Ticket operations
export {
    listTicketsOperation,
    listTicketsSchema,
    executeListTickets,
    type ListTicketsParams,
    getTicketOperation,
    getTicketSchema,
    executeGetTicket,
    type GetTicketParams,
    createTicketOperation,
    createTicketSchema,
    executeCreateTicket,
    type CreateTicketParams,
    updateTicketOperation,
    updateTicketSchema,
    executeUpdateTicket,
    type UpdateTicketParams,
    searchTicketsOperation,
    searchTicketsSchema,
    executeSearchTickets,
    type SearchTicketsParams
} from "./tickets";

// Customer operations
export {
    listCustomersOperation,
    listCustomersSchema,
    executeListCustomers,
    type ListCustomersParams,
    getCustomerOperation,
    getCustomerSchema,
    executeGetCustomer,
    type GetCustomerParams,
    createCustomerOperation,
    createCustomerSchema,
    executeCreateCustomer,
    type CreateCustomerParams,
    updateCustomerOperation,
    updateCustomerSchema,
    executeUpdateCustomer,
    type UpdateCustomerParams
} from "./customers";

// Message operations
export {
    listMessagesOperation,
    listMessagesSchema,
    executeListMessages,
    type ListMessagesParams,
    createMessageOperation,
    createMessageSchema,
    executeCreateMessage,
    type CreateMessageParams,
    createInternalNoteOperation,
    createInternalNoteSchema,
    executeCreateInternalNote,
    type CreateInternalNoteParams
} from "./messages";
