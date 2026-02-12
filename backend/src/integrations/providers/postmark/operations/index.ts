/**
 * Postmark Operations Index
 * Exports all operations for Postmark provider
 */

// Email Operations
export * from "./sendEmail";
export * from "./sendBatchEmails";
export * from "./sendTemplateEmail";

// Template Operations
export * from "./listTemplates";
export * from "./getTemplate";

// Analytics Operations
export * from "./getDeliveryStats";

// Bounce Operations
export * from "./listBounces";
export * from "./activateBounce";

// Types
export * from "./types";
