import { z } from "zod";

/**
 * Asana Integration - Zod Validation Schemas
 * All schemas for the Asana operations
 */

// ============================================================================
// TASK OPERATIONS
// ============================================================================

/**
 * Create Task Schema
 */
export const createTaskInputSchema = z.object({
    workspace: z.string().describe("The workspace GID to create the task in"),
    name: z.string().min(1).max(1024).describe("Name of the task"),
    notes: z
        .string()
        .optional()
        .describe("Free-form textual information associated with the task (i.e., its description)"),
    html_notes: z.string().optional().describe("HTML-formatted notes for the task"),
    assignee: z
        .string()
        .optional()
        .describe("GID of the user to assign the task to, or 'me' for the current user"),
    due_on: z.string().optional().describe("Due date in YYYY-MM-DD format"),
    due_at: z.string().optional().describe("Due date and time in ISO 8601 format"),
    start_on: z.string().optional().describe("Start date in YYYY-MM-DD format"),
    start_at: z.string().optional().describe("Start date and time in ISO 8601 format"),
    projects: z.array(z.string()).optional().describe("Array of project GIDs to add the task to"),
    parent: z.string().optional().describe("GID of the parent task (to create a subtask)"),
    tags: z.array(z.string()).optional().describe("Array of tag GIDs to add to the task"),
    followers: z.array(z.string()).optional().describe("Array of user GIDs to add as followers"),
    custom_fields: z
        .record(z.unknown())
        .optional()
        .describe("Custom field values as key-value pairs (field GID -> value)")
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

/**
 * Get Task Schema
 */
export const getTaskInputSchema = z.object({
    task_gid: z.string().describe("The GID of the task to retrieve"),
    opt_fields: z.array(z.string()).optional().describe("Fields to include in the response")
});

export type GetTaskInput = z.infer<typeof getTaskInputSchema>;

/**
 * Update Task Schema
 */
export const updateTaskInputSchema = z.object({
    task_gid: z.string().describe("The GID of the task to update"),
    name: z.string().optional().describe("Name of the task"),
    notes: z.string().optional().describe("Free-form textual information (description)"),
    html_notes: z.string().optional().describe("HTML-formatted notes"),
    assignee: z.string().nullable().optional().describe("GID of the assignee, or null to unassign"),
    due_on: z
        .string()
        .nullable()
        .optional()
        .describe("Due date in YYYY-MM-DD format, or null to clear"),
    due_at: z.string().nullable().optional().describe("Due date and time in ISO 8601 format"),
    start_on: z.string().nullable().optional().describe("Start date in YYYY-MM-DD format"),
    start_at: z.string().nullable().optional().describe("Start date and time in ISO 8601 format"),
    completed: z.boolean().optional().describe("Whether the task is completed"),
    custom_fields: z.record(z.unknown()).optional().describe("Custom field values to update")
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

/**
 * Delete Task Schema
 */
export const deleteTaskInputSchema = z.object({
    task_gid: z.string().describe("The GID of the task to delete")
});

export type DeleteTaskInput = z.infer<typeof deleteTaskInputSchema>;

/**
 * List Tasks Schema
 */
export const listTasksInputSchema = z.object({
    project: z.string().optional().describe("The project GID to get tasks from"),
    section: z.string().optional().describe("The section GID to get tasks from"),
    assignee: z.string().optional().describe("The assignee GID to filter by (requires workspace)"),
    workspace: z
        .string()
        .optional()
        .describe("The workspace GID (required when filtering by assignee)"),
    completed_since: z
        .string()
        .optional()
        .describe("Only return tasks completed since this time (ISO 8601)"),
    modified_since: z
        .string()
        .optional()
        .describe("Only return tasks modified since this time (ISO 8601)"),
    opt_fields: z.array(z.string()).optional().describe("Fields to include in the response"),
    limit: z.number().int().min(1).max(100).default(50).describe("Number of results to return")
});

export type ListTasksInput = z.infer<typeof listTasksInputSchema>;

/**
 * Search Tasks Schema
 */
export const searchTasksInputSchema = z.object({
    workspace: z.string().describe("The workspace GID to search in"),
    text: z.string().optional().describe("Text to search for in task names and descriptions"),
    assignee: z.string().optional().describe("GID of assignee to filter by"),
    "assignee.any": z.string().optional().describe("Comma-separated list of assignee GIDs"),
    projects: z.string().optional().describe("GID of project to filter by"),
    "projects.any": z.string().optional().describe("Comma-separated list of project GIDs"),
    sections: z.string().optional().describe("GID of section to filter by"),
    "sections.any": z.string().optional().describe("Comma-separated list of section GIDs"),
    tags: z.string().optional().describe("GID of tag to filter by"),
    "tags.any": z.string().optional().describe("Comma-separated list of tag GIDs"),
    completed: z.boolean().optional().describe("Filter by completion status"),
    is_subtask: z.boolean().optional().describe("Filter by whether task is a subtask"),
    "due_on.before": z
        .string()
        .optional()
        .describe("Filter for tasks due before this date (YYYY-MM-DD)"),
    "due_on.after": z
        .string()
        .optional()
        .describe("Filter for tasks due after this date (YYYY-MM-DD)"),
    "start_on.before": z.string().optional().describe("Filter for tasks starting before this date"),
    "start_on.after": z.string().optional().describe("Filter for tasks starting after this date"),
    "created_on.before": z
        .string()
        .optional()
        .describe("Filter for tasks created before this date"),
    "created_on.after": z.string().optional().describe("Filter for tasks created after this date"),
    "modified_on.before": z
        .string()
        .optional()
        .describe("Filter for tasks modified before this date"),
    "modified_on.after": z
        .string()
        .optional()
        .describe("Filter for tasks modified after this date"),
    sort_by: z
        .enum(["due_date", "created_at", "completed_at", "likes", "modified_at"])
        .optional()
        .describe("Field to sort by"),
    sort_ascending: z.boolean().optional().describe("Sort in ascending order"),
    opt_fields: z.array(z.string()).optional().describe("Fields to include in the response"),
    limit: z.number().int().min(1).max(100).default(50).describe("Number of results to return")
});

export type SearchTasksInput = z.infer<typeof searchTasksInputSchema>;

/**
 * Add Task to Project Schema
 */
export const addTaskToProjectInputSchema = z.object({
    task_gid: z.string().describe("The GID of the task"),
    project: z.string().describe("The GID of the project to add the task to"),
    section: z
        .string()
        .optional()
        .describe("The GID of the section within the project to add the task to"),
    insert_before: z.string().optional().describe("GID of task to insert before"),
    insert_after: z.string().optional().describe("GID of task to insert after")
});

export type AddTaskToProjectInput = z.infer<typeof addTaskToProjectInputSchema>;

/**
 * Remove Task from Project Schema
 */
export const removeTaskFromProjectInputSchema = z.object({
    task_gid: z.string().describe("The GID of the task"),
    project: z.string().describe("The GID of the project to remove the task from")
});

export type RemoveTaskFromProjectInput = z.infer<typeof removeTaskFromProjectInputSchema>;

/**
 * Create Subtask Schema
 */
export const createSubtaskInputSchema = z.object({
    parent_task_gid: z.string().describe("The GID of the parent task"),
    name: z.string().min(1).max(1024).describe("Name of the subtask"),
    notes: z.string().optional().describe("Description of the subtask"),
    assignee: z.string().optional().describe("GID of the user to assign the subtask to"),
    due_on: z.string().optional().describe("Due date in YYYY-MM-DD format"),
    custom_fields: z.record(z.unknown()).optional().describe("Custom field values")
});

export type CreateSubtaskInput = z.infer<typeof createSubtaskInputSchema>;

/**
 * Get Subtasks Schema
 */
export const getSubtasksInputSchema = z.object({
    task_gid: z.string().describe("The GID of the parent task"),
    opt_fields: z.array(z.string()).optional().describe("Fields to include in the response"),
    limit: z.number().int().min(1).max(100).default(50).describe("Number of results to return")
});

export type GetSubtasksInput = z.infer<typeof getSubtasksInputSchema>;

// ============================================================================
// PROJECT OPERATIONS
// ============================================================================

/**
 * Create Project Schema
 */
export const createProjectInputSchema = z.object({
    workspace: z.string().describe("The workspace GID to create the project in"),
    name: z.string().min(1).max(255).describe("Name of the project"),
    notes: z.string().optional().describe("Free-form textual information (description)"),
    color: z
        .enum([
            "dark-pink",
            "dark-green",
            "dark-blue",
            "dark-red",
            "dark-teal",
            "dark-brown",
            "dark-orange",
            "dark-purple",
            "dark-warm-gray",
            "light-pink",
            "light-green",
            "light-blue",
            "light-red",
            "light-teal",
            "light-brown",
            "light-orange",
            "light-purple",
            "light-warm-gray"
        ])
        .optional()
        .describe("Color of the project"),
    default_view: z
        .enum(["list", "board", "calendar", "timeline"])
        .optional()
        .describe("Default view for the project"),
    due_on: z.string().optional().describe("Due date for the project (YYYY-MM-DD)"),
    start_on: z.string().optional().describe("Start date for the project (YYYY-MM-DD)"),
    public: z.boolean().optional().describe("Whether the project is public to the workspace"),
    team: z
        .string()
        .optional()
        .describe("The team GID to create the project under (for organization workspaces)")
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

/**
 * Get Project Schema
 */
export const getProjectInputSchema = z.object({
    project_gid: z.string().describe("The GID of the project to retrieve"),
    opt_fields: z.array(z.string()).optional().describe("Fields to include in the response")
});

export type GetProjectInput = z.infer<typeof getProjectInputSchema>;

/**
 * Update Project Schema
 */
export const updateProjectInputSchema = z.object({
    project_gid: z.string().describe("The GID of the project to update"),
    name: z.string().optional().describe("Name of the project"),
    notes: z.string().optional().describe("Free-form textual information (description)"),
    color: z
        .enum([
            "dark-pink",
            "dark-green",
            "dark-blue",
            "dark-red",
            "dark-teal",
            "dark-brown",
            "dark-orange",
            "dark-purple",
            "dark-warm-gray",
            "light-pink",
            "light-green",
            "light-blue",
            "light-red",
            "light-teal",
            "light-brown",
            "light-orange",
            "light-purple",
            "light-warm-gray"
        ])
        .nullable()
        .optional()
        .describe("Color of the project, or null to remove"),
    default_view: z
        .enum(["list", "board", "calendar", "timeline"])
        .optional()
        .describe("Default view"),
    due_on: z.string().nullable().optional().describe("Due date (YYYY-MM-DD), or null to clear"),
    start_on: z
        .string()
        .nullable()
        .optional()
        .describe("Start date (YYYY-MM-DD), or null to clear"),
    public: z.boolean().optional().describe("Whether the project is public"),
    archived: z.boolean().optional().describe("Whether the project is archived")
});

export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;

/**
 * Delete Project Schema
 */
export const deleteProjectInputSchema = z.object({
    project_gid: z.string().describe("The GID of the project to delete")
});

export type DeleteProjectInput = z.infer<typeof deleteProjectInputSchema>;

/**
 * List Projects Schema
 */
export const listProjectsInputSchema = z.object({
    workspace: z.string().optional().describe("The workspace GID to get projects from"),
    team: z.string().optional().describe("The team GID to get projects from"),
    archived: z.boolean().optional().describe("Filter by archived status"),
    opt_fields: z.array(z.string()).optional().describe("Fields to include in the response"),
    limit: z.number().int().min(1).max(100).default(50).describe("Number of results to return")
});

export type ListProjectsInput = z.infer<typeof listProjectsInputSchema>;

// ============================================================================
// SECTION OPERATIONS
// ============================================================================

/**
 * Create Section Schema
 */
export const createSectionInputSchema = z.object({
    project: z.string().describe("The GID of the project to create the section in"),
    name: z.string().min(1).max(255).describe("Name of the section"),
    insert_before: z.string().optional().describe("GID of section to insert before"),
    insert_after: z.string().optional().describe("GID of section to insert after")
});

export type CreateSectionInput = z.infer<typeof createSectionInputSchema>;

/**
 * Get Section Schema
 */
export const getSectionInputSchema = z.object({
    section_gid: z.string().describe("The GID of the section to retrieve"),
    opt_fields: z.array(z.string()).optional().describe("Fields to include in the response")
});

export type GetSectionInput = z.infer<typeof getSectionInputSchema>;

/**
 * Update Section Schema
 */
export const updateSectionInputSchema = z.object({
    section_gid: z.string().describe("The GID of the section to update"),
    name: z.string().optional().describe("Name of the section")
});

export type UpdateSectionInput = z.infer<typeof updateSectionInputSchema>;

/**
 * Delete Section Schema
 */
export const deleteSectionInputSchema = z.object({
    section_gid: z.string().describe("The GID of the section to delete")
});

export type DeleteSectionInput = z.infer<typeof deleteSectionInputSchema>;

/**
 * List Sections Schema
 */
export const listSectionsInputSchema = z.object({
    project: z.string().describe("The GID of the project to get sections from"),
    opt_fields: z.array(z.string()).optional().describe("Fields to include in the response"),
    limit: z.number().int().min(1).max(100).default(50).describe("Number of results to return")
});

export type ListSectionsInput = z.infer<typeof listSectionsInputSchema>;

/**
 * Add Task to Section Schema
 */
export const addTaskToSectionInputSchema = z.object({
    section_gid: z.string().describe("The GID of the section"),
    task: z.string().describe("The GID of the task to add"),
    insert_before: z.string().optional().describe("GID of task to insert before"),
    insert_after: z.string().optional().describe("GID of task to insert after")
});

export type AddTaskToSectionInput = z.infer<typeof addTaskToSectionInputSchema>;

// ============================================================================
// USER OPERATIONS
// ============================================================================

/**
 * Get Current User Schema
 */
export const getCurrentUserInputSchema = z.object({
    opt_fields: z.array(z.string()).optional().describe("Fields to include in the response")
});

export type GetCurrentUserInput = z.infer<typeof getCurrentUserInputSchema>;

/**
 * Get User Schema
 */
export const getUserInputSchema = z.object({
    user_gid: z.string().describe("The GID of the user to retrieve"),
    opt_fields: z.array(z.string()).optional().describe("Fields to include in the response")
});

export type GetUserInput = z.infer<typeof getUserInputSchema>;

/**
 * List Users Schema
 */
export const listUsersInputSchema = z.object({
    workspace: z.string().describe("The workspace GID to get users from"),
    opt_fields: z.array(z.string()).optional().describe("Fields to include in the response"),
    limit: z.number().int().min(1).max(100).default(50).describe("Number of results to return")
});

export type ListUsersInput = z.infer<typeof listUsersInputSchema>;

// ============================================================================
// WORKSPACE OPERATIONS
// ============================================================================

/**
 * List Workspaces Schema
 */
export const listWorkspacesInputSchema = z.object({
    opt_fields: z.array(z.string()).optional().describe("Fields to include in the response"),
    limit: z.number().int().min(1).max(100).default(50).describe("Number of results to return")
});

export type ListWorkspacesInput = z.infer<typeof listWorkspacesInputSchema>;

/**
 * Get Workspace Schema
 */
export const getWorkspaceInputSchema = z.object({
    workspace_gid: z.string().describe("The GID of the workspace to retrieve"),
    opt_fields: z.array(z.string()).optional().describe("Fields to include in the response")
});

export type GetWorkspaceInput = z.infer<typeof getWorkspaceInputSchema>;

// ============================================================================
// TAG OPERATIONS
// ============================================================================

/**
 * List Tags Schema
 */
export const listTagsInputSchema = z.object({
    workspace: z.string().describe("The workspace GID to get tags from"),
    opt_fields: z.array(z.string()).optional().describe("Fields to include in the response"),
    limit: z.number().int().min(1).max(100).default(50).describe("Number of results to return")
});

export type ListTagsInput = z.infer<typeof listTagsInputSchema>;

/**
 * Add Tag to Task Schema
 */
export const addTagToTaskInputSchema = z.object({
    task_gid: z.string().describe("The GID of the task"),
    tag: z.string().describe("The GID of the tag to add")
});

export type AddTagToTaskInput = z.infer<typeof addTagToTaskInputSchema>;

/**
 * Remove Tag from Task Schema
 */
export const removeTagFromTaskInputSchema = z.object({
    task_gid: z.string().describe("The GID of the task"),
    tag: z.string().describe("The GID of the tag to remove")
});

export type RemoveTagFromTaskInput = z.infer<typeof removeTagFromTaskInputSchema>;

// ============================================================================
// COMMENT OPERATIONS
// ============================================================================

/**
 * Add Comment to Task Schema
 */
export const addCommentToTaskInputSchema = z.object({
    task_gid: z.string().describe("The GID of the task to comment on"),
    text: z.string().min(1).describe("The plain text of the comment"),
    html_text: z.string().optional().describe("HTML-formatted comment text"),
    is_pinned: z.boolean().optional().describe("Whether to pin the comment")
});

export type AddCommentToTaskInput = z.infer<typeof addCommentToTaskInputSchema>;

/**
 * Get Task Comments Schema
 */
export const getTaskCommentsInputSchema = z.object({
    task_gid: z.string().describe("The GID of the task to get comments from"),
    opt_fields: z.array(z.string()).optional().describe("Fields to include in the response"),
    limit: z.number().int().min(1).max(100).default(50).describe("Number of results to return")
});

export type GetTaskCommentsInput = z.infer<typeof getTaskCommentsInputSchema>;

// ============================================================================
// TEAM OPERATIONS
// ============================================================================

/**
 * List Teams Schema
 */
export const listTeamsInputSchema = z.object({
    workspace: z.string().describe("The workspace GID to get teams from (must be an organization)"),
    opt_fields: z.array(z.string()).optional().describe("Fields to include in the response"),
    limit: z.number().int().min(1).max(100).default(50).describe("Number of results to return")
});

export type ListTeamsInput = z.infer<typeof listTeamsInputSchema>;

// ============================================================================
// CONNECTION METADATA
// ============================================================================

/**
 * Asana Connection Metadata
 * Stored in connection.metadata
 */
export interface AsanaConnectionMetadata {
    defaultWorkspaceGid?: string;
    defaultWorkspaceName?: string;
    userGid?: string;
    userName?: string;
    userEmail?: string;
    workspaces?: Array<{
        gid: string;
        name: string;
    }>;
}
