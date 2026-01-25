/**
 * Intercom Operations Index
 *
 * Re-exports all operations for the Intercom integration
 */

// Contacts operations
export {
    listContactsOperation,
    listContactsSchema,
    executeListContacts,
    type ListContactsParams,
    getContactOperation,
    getContactSchema,
    executeGetContact,
    type GetContactParams,
    createContactOperation,
    createContactSchema,
    executeCreateContact,
    type CreateContactParams,
    updateContactOperation,
    updateContactSchema,
    executeUpdateContact,
    type UpdateContactParams,
    searchContactsOperation,
    searchContactsSchema,
    executeSearchContacts,
    type SearchContactsParams
} from "./contacts";

// Conversations operations
export {
    listConversationsOperation,
    listConversationsSchema,
    executeListConversations,
    type ListConversationsParams,
    getConversationOperation,
    getConversationSchema,
    executeGetConversation,
    type GetConversationParams,
    replyToConversationOperation,
    replyToConversationSchema,
    executeReplyToConversation,
    type ReplyToConversationParams,
    closeConversationOperation,
    closeConversationSchema,
    executeCloseConversation,
    type CloseConversationParams,
    assignConversationOperation,
    assignConversationSchema,
    executeAssignConversation,
    type AssignConversationParams
} from "./conversations";

// Companies operations
export {
    listCompaniesOperation,
    listCompaniesSchema,
    executeListCompanies,
    type ListCompaniesParams,
    getCompanyOperation,
    getCompanySchema,
    executeGetCompany,
    type GetCompanyParams,
    createOrUpdateCompanyOperation,
    createOrUpdateCompanySchema,
    executeCreateOrUpdateCompany,
    type CreateOrUpdateCompanyParams
} from "./companies";

// Tags operations
export {
    listTagsOperation,
    listTagsSchema,
    executeListTags,
    type ListTagsParams,
    tagContactOperation,
    tagContactSchema,
    executeTagContact,
    type TagContactParams,
    tagConversationOperation,
    tagConversationSchema,
    executeTagConversation,
    type TagConversationParams
} from "./tags";

// Notes operations
export {
    createNoteOperation,
    createNoteSchema,
    executeCreateNote,
    type CreateNoteParams,
    listNotesOperation,
    listNotesSchema,
    executeListNotes,
    type ListNotesParams
} from "./notes";
