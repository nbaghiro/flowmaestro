/**
 * ActiveCampaign Operations Index
 * Exports all operations for ActiveCampaign provider
 */

// Contact Operations
export * from "./getContacts";
export * from "./getContact";
export * from "./createContact";
export * from "./updateContact";
export * from "./deleteContact";

// List Operations
export * from "./getLists";
export * from "./getList";
export * from "./createList";
export * from "./addToList";
export * from "./removeFromList";

// Tag Operations
export * from "./getTags";
export * from "./addTag";
export * from "./removeTag";

// Automation Operations
export * from "./getAutomations";
export * from "./addContactToAutomation";

// Campaign Operations
export * from "./getCampaigns";
export * from "./getCampaignStats";

// Custom Field Operations
export * from "./getCustomFields";

// Types
export * from "./types";
