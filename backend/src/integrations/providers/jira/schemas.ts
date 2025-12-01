import { z } from "zod";

/**
 * Jira Cloud Integration - Zod Validation Schemas
 * All schemas for the 22 Jira operations
 */

// ============================================================================
// ISSUE OPERATIONS
// ============================================================================

/**
 * Create Issue Schema
 */
export const createIssueInputSchema = z.object({
    project: z.object({ key: z.string() }),
    issuetype: z.object({ name: z.string() }),
    summary: z.string().min(1).max(255),
    description: z.string().optional(),
    assignee: z.object({ accountId: z.string() }).optional().nullable(),
    priority: z.object({ name: z.string() }).optional(),
    labels: z.array(z.string()).optional(),
    components: z.array(z.object({ name: z.string() })).optional(),
    parent: z.object({ key: z.string() }).optional(), // For subtasks
    customFields: z.record(z.unknown()).optional() // Custom fields as key-value pairs
});

export type CreateIssueInput = z.infer<typeof createIssueInputSchema>;

/**
 * Get Issue Schema
 */
export const getIssueInputSchema = z.object({
    issueIdOrKey: z.string(),
    fields: z.array(z.string()).optional(),
    expand: z.array(z.string()).optional(),
    properties: z.array(z.string()).optional()
});

export type GetIssueInput = z.infer<typeof getIssueInputSchema>;

/**
 * Update Issue Schema
 */
export const updateIssueInputSchema = z.object({
    issueIdOrKey: z.string(),
    fields: z.record(z.unknown()),
    notifyUsers: z.boolean().optional()
});

export type UpdateIssueInput = z.infer<typeof updateIssueInputSchema>;

/**
 * Delete Issue Schema
 */
export const deleteIssueInputSchema = z.object({
    issueIdOrKey: z.string(),
    deleteSubtasks: z.boolean().optional()
});

export type DeleteIssueInput = z.infer<typeof deleteIssueInputSchema>;

/**
 * Search Issues Schema (JQL)
 */
export const searchIssuesInputSchema = z.object({
    jql: z.string().min(1),
    startAt: z.number().int().min(0).default(0),
    maxResults: z.number().int().min(1).max(100).default(50),
    fields: z.array(z.string()).optional(),
    expand: z.array(z.string()).optional(),
    validateQuery: z.boolean().optional()
});

export type SearchIssuesInput = z.infer<typeof searchIssuesInputSchema>;

/**
 * Transition Issue Schema
 */
export const transitionIssueInputSchema = z.object({
    issueIdOrKey: z.string(),
    transitionId: z.string(),
    comment: z.string().optional(),
    fields: z.record(z.unknown()).optional()
});

export type TransitionIssueInput = z.infer<typeof transitionIssueInputSchema>;

/**
 * Assign Issue Schema
 */
export const assignIssueInputSchema = z.object({
    issueIdOrKey: z.string(),
    accountId: z.string().nullable() // null to unassign
});

export type AssignIssueInput = z.infer<typeof assignIssueInputSchema>;

/**
 * Add Comment Schema
 */
export const addCommentInputSchema = z.object({
    issueIdOrKey: z.string(),
    body: z.string().min(1)
});

export type AddCommentInput = z.infer<typeof addCommentInputSchema>;

/**
 * Get Comments Schema
 */
export const getCommentsInputSchema = z.object({
    issueIdOrKey: z.string(),
    startAt: z.number().int().min(0).default(0),
    maxResults: z.number().int().min(1).max(100).default(50),
    orderBy: z.enum(["created", "-created", "+created"]).optional()
});

export type GetCommentsInput = z.infer<typeof getCommentsInputSchema>;

/**
 * Add Attachment Schema
 */
export const addAttachmentInputSchema = z.object({
    issueIdOrKey: z.string(),
    filename: z.string(),
    fileContent: z.string(), // Base64 encoded file content
    mimeType: z.string().optional()
});

export type AddAttachmentInput = z.infer<typeof addAttachmentInputSchema>;

/**
 * Link Issues Schema
 */
export const linkIssuesInputSchema = z.object({
    type: z.object({ name: z.string() }), // e.g., "Blocks", "Relates to"
    inwardIssue: z.object({ key: z.string() }),
    outwardIssue: z.object({ key: z.string() }),
    comment: z.string().optional()
});

export type LinkIssuesInput = z.infer<typeof linkIssuesInputSchema>;

// ============================================================================
// PROJECT OPERATIONS
// ============================================================================

/**
 * List Projects Schema
 */
export const listProjectsInputSchema = z.object({
    expand: z.array(z.string()).optional(),
    recent: z.number().int().min(1).max(20).optional(),
    properties: z.array(z.string()).optional()
});

export type ListProjectsInput = z.infer<typeof listProjectsInputSchema>;

/**
 * Get Project Schema
 */
export const getProjectInputSchema = z.object({
    projectIdOrKey: z.string(),
    expand: z.array(z.string()).optional(),
    properties: z.array(z.string()).optional()
});

export type GetProjectInput = z.infer<typeof getProjectInputSchema>;

/**
 * Get Issue Types Schema
 */
export const getIssueTypesInputSchema = z.object({
    projectId: z.string()
});

export type GetIssueTypesInput = z.infer<typeof getIssueTypesInputSchema>;

// ============================================================================
// FIELD OPERATIONS
// ============================================================================

/**
 * List Fields Schema
 */
export const listFieldsInputSchema = z.object({
    // No required parameters - returns all fields
});

export type ListFieldsInput = z.infer<typeof listFieldsInputSchema>;

/**
 * Get Custom Field Configs Schema
 */
export const getCustomFieldConfigsInputSchema = z.object({
    fieldId: z.string()
});

export type GetCustomFieldConfigsInput = z.infer<typeof getCustomFieldConfigsInputSchema>;

// ============================================================================
// WEBHOOK OPERATIONS
// ============================================================================

/**
 * Register Webhook Schema
 */
export const registerWebhookInputSchema = z.object({
    name: z.string().min(1).max(100),
    url: z.string().url(),
    events: z.array(
        z.enum([
            "jira:issue_created",
            "jira:issue_updated",
            "jira:issue_deleted",
            "comment_created",
            "comment_updated",
            "comment_deleted",
            "issue_property_set",
            "issue_property_deleted"
        ])
    ),
    jqlFilter: z.string().optional(),
    excludeBody: z.boolean().optional()
});

export type RegisterWebhookInput = z.infer<typeof registerWebhookInputSchema>;

/**
 * List Webhooks Schema
 */
export const listWebhooksInputSchema = z.object({
    startAt: z.number().int().min(0).default(0),
    maxResults: z.number().int().min(1).max(100).default(50)
});

export type ListWebhooksInput = z.infer<typeof listWebhooksInputSchema>;

/**
 * Delete Webhook Schema
 */
export const deleteWebhookInputSchema = z.object({
    webhookId: z.string()
});

export type DeleteWebhookInput = z.infer<typeof deleteWebhookInputSchema>;

// ============================================================================
// USER OPERATIONS
// ============================================================================

/**
 * Search Users Schema
 */
export const searchUsersInputSchema = z.object({
    query: z.string().optional(),
    accountId: z.string().optional(),
    startAt: z.number().int().min(0).default(0),
    maxResults: z.number().int().min(1).max(100).default(50)
});

export type SearchUsersInput = z.infer<typeof searchUsersInputSchema>;

/**
 * Get Current User Schema
 */
export const getCurrentUserInputSchema = z.object({
    expand: z.array(z.string()).optional()
});

export type GetCurrentUserInput = z.infer<typeof getCurrentUserInputSchema>;

// ============================================================================
// CONNECTION METADATA
// ============================================================================

/**
 * Jira Connection Metadata
 * Stored in connection.metadata
 */
export interface JiraConnectionMetadata {
    cloudId: string; // Selected Jira site ID
    siteUrl: string; // e.g., "https://yourcompany.atlassian.net"
    siteName: string; // Display name
    availableSites?: Array<{
        cloudId: string;
        url: string;
        name: string;
        scopes: string[];
    }>;
}

/**
 * Atlassian Accessible Resource
 */
export interface AtlassianSite {
    id: string; // cloudId
    url: string;
    name: string;
    scopes: string[];
    avatarUrl?: string;
}
