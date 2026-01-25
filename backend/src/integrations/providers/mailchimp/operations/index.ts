/**
 * Mailchimp Operations Index
 * Exports all operations for Mailchimp provider
 */

// List (Audience) Operations
export * from "./getLists";
export * from "./getList";
export * from "./createList";
export * from "./updateList";

// Member Operations
export * from "./getMembers";
export * from "./getMember";
export * from "./addMember";
export * from "./updateMember";
export * from "./archiveMember";
export * from "./deleteMemberPermanently";

// Tag Operations
export * from "./getTags";
export * from "./addTagsToMember";
export * from "./removeTagsFromMember";

// Segment Operations
export * from "./getSegments";
export * from "./getSegmentMembers";

// Campaign Operations
export * from "./getCampaigns";
export * from "./getCampaign";
export * from "./createCampaign";
export * from "./updateCampaign";
export * from "./sendCampaign";
export * from "./scheduleCampaign";
export * from "./unscheduleCampaign";

// Template Operations
export * from "./getTemplates";
export * from "./getTemplate";

// Types
export * from "./types";
