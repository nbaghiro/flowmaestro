/**
 * SendGrid Operations Index
 * Exports all operations for SendGrid provider
 */

// Email Operations
export * from "./sendEmail";
export * from "./sendTemplateEmail";
export * from "./sendBatchEmail";

// Contact Operations
export * from "./getContacts";
export * from "./getContact";
export * from "./addContacts";
export * from "./updateContact";
export * from "./deleteContacts";
export * from "./searchContacts";

// List Operations
export * from "./getLists";
export * from "./getList";
export * from "./createList";
export * from "./updateList";
export * from "./deleteList";
export * from "./addContactsToList";
export * from "./removeContactsFromList";

// Template Operations
export * from "./getTemplates";
export * from "./getTemplate";

// Validation Operations
export * from "./validateEmail";

// Analytics Operations
export * from "./getStats";

// Types
export * from "./types";
