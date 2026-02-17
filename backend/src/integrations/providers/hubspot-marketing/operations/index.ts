/**
 * HubSpot Marketing Operations Index
 * Exports all operations for HubSpot Marketing provider
 */

// List Operations
export * from "./getLists";
export * from "./getList";
export * from "./createList";
export * from "./addToList";
export * from "./removeFromList";

// Contact Operations
export * from "./getContacts";
export * from "./getContact";
export * from "./createContact";
export * from "./updateContact";
export * from "./deleteContact";
export * from "./searchContacts";

// Campaign Operations
export * from "./getCampaigns";
export * from "./getCampaign";

// Form Operations
export * from "./getForms";
export * from "./getFormSubmissions";

// Email Operations
export * from "./getMarketingEmails";
export * from "./getEmailStats";

// Workflow Operations
export * from "./getWorkflows";

// Types
export * from "./types";
