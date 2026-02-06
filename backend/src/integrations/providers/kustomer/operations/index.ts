/**
 * Kustomer Operations Index
 *
 * Re-exports all operations for the Kustomer integration
 */

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
    type UpdateCustomerParams,
    deleteCustomerOperation,
    deleteCustomerSchema,
    executeDeleteCustomer,
    type DeleteCustomerParams,
    searchCustomersOperation,
    searchCustomersSchema,
    executeSearchCustomers,
    type SearchCustomersParams
} from "./customers";

// Conversation operations
export {
    listConversationsOperation,
    listConversationsSchema,
    executeListConversations,
    type ListConversationsParams,
    getConversationOperation,
    getConversationSchema,
    executeGetConversation,
    type GetConversationParams,
    createConversationOperation,
    createConversationSchema,
    executeCreateConversation,
    type CreateConversationParams,
    updateConversationOperation,
    updateConversationSchema,
    executeUpdateConversation,
    type UpdateConversationParams,
    addConversationTagsOperation,
    addConversationTagsSchema,
    executeAddConversationTags,
    type AddConversationTagsParams,
    removeConversationTagsOperation,
    removeConversationTagsSchema,
    executeRemoveConversationTags,
    type RemoveConversationTagsParams
} from "./conversations";

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
    createMessageByCustomerOperation,
    createMessageByCustomerSchema,
    executeCreateMessageByCustomer,
    type CreateMessageByCustomerParams
} from "./messages";
