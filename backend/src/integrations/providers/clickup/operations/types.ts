/**
 * ClickUp API Types
 */

// ============================================================================
// Common Types
// ============================================================================

export interface ClickUpPagination {
    last_page: boolean;
}

// ============================================================================
// User Types
// ============================================================================

export interface ClickUpUser {
    id: number;
    username: string;
    email: string;
    color: string;
    initials?: string;
    profilePicture?: string;
}

// ============================================================================
// Workspace (Team) Types
// ============================================================================

export interface ClickUpWorkspace {
    id: string;
    name: string;
    color?: string;
    avatar?: string;
    members: ClickUpWorkspaceMember[];
}

export interface ClickUpWorkspaceMember {
    user: ClickUpUser;
}

// ============================================================================
// Space Types
// ============================================================================

export interface ClickUpSpace {
    id: string;
    name: string;
    private: boolean;
    statuses: ClickUpStatus[];
    multiple_assignees: boolean;
    features: {
        due_dates: { enabled: boolean };
        sprints: { enabled: boolean };
        time_tracking: { enabled: boolean };
        points: { enabled: boolean };
        custom_items: { enabled: boolean };
        priorities: { enabled: boolean };
        tags: { enabled: boolean };
        time_estimates: { enabled: boolean };
        check_unresolved: { enabled: boolean };
        zoom: { enabled: boolean };
        milestones: { enabled: boolean };
        remap_dependencies: { enabled: boolean };
        dependency_warning: { enabled: boolean };
        portfolios: { enabled: boolean };
    };
    archived: boolean;
}

// ============================================================================
// Folder Types
// ============================================================================

export interface ClickUpFolder {
    id: string;
    name: string;
    orderindex: number;
    override_statuses: boolean;
    hidden: boolean;
    space: { id: string; name: string };
    task_count: string;
    archived: boolean;
    lists: ClickUpList[];
}

// ============================================================================
// List Types
// ============================================================================

export interface ClickUpList {
    id: string;
    name: string;
    orderindex: number;
    content?: string;
    status?: { status: string; color: string };
    priority?: { priority: string; color: string };
    assignee?: ClickUpUser;
    task_count?: number;
    due_date?: string;
    due_date_time?: boolean;
    start_date?: string;
    start_date_time?: boolean;
    folder?: { id: string; name: string; hidden: boolean; access: boolean };
    space?: { id: string; name: string; access: boolean };
    archived: boolean;
    override_statuses?: boolean;
    statuses?: ClickUpStatus[];
    permission_level?: string;
}

// ============================================================================
// Status Types
// ============================================================================

export interface ClickUpStatus {
    id?: string;
    status: string;
    type: string;
    orderindex: number;
    color: string;
}

// ============================================================================
// Priority Types
// ============================================================================

export interface ClickUpPriority {
    id: string;
    priority: string;
    color: string;
    orderindex: string;
}

// ============================================================================
// Tag Types
// ============================================================================

export interface ClickUpTag {
    name: string;
    tag_fg: string;
    tag_bg: string;
    creator?: number;
}

// ============================================================================
// Task Types
// ============================================================================

export interface ClickUpTask {
    id: string;
    custom_id?: string;
    name: string;
    text_content?: string;
    description?: string;
    status: ClickUpStatus;
    orderindex: string;
    date_created: string;
    date_updated: string;
    date_closed?: string;
    date_done?: string;
    archived: boolean;
    creator: ClickUpUser;
    assignees: ClickUpUser[];
    watchers: ClickUpUser[];
    checklists: ClickUpChecklist[];
    tags: ClickUpTag[];
    parent?: string;
    priority?: ClickUpPriority;
    due_date?: string;
    start_date?: string;
    points?: number;
    time_estimate?: number;
    time_spent?: number;
    custom_fields?: ClickUpCustomField[];
    dependencies?: ClickUpDependency[];
    linked_tasks?: ClickUpLinkedTask[];
    team_id: string;
    url: string;
    permission_level?: string;
    list: { id: string; name: string; access: boolean };
    project?: { id: string; name: string; hidden?: boolean; access: boolean };
    folder?: { id: string; name: string; hidden?: boolean; access: boolean };
    space: { id: string };
    attachments?: ClickUpAttachment[];
    subtasks?: ClickUpTask[];
}

export interface ClickUpChecklist {
    id: string;
    task_id: string;
    name: string;
    date_created: string;
    orderindex: number;
    creator: number;
    resolved: number;
    unresolved: number;
    items: ClickUpChecklistItem[];
}

export interface ClickUpChecklistItem {
    id: string;
    name: string;
    orderindex: number;
    assignee?: ClickUpUser;
    group_assignee?: unknown;
    resolved: boolean;
    parent?: string;
    date_created: string;
    children: ClickUpChecklistItem[];
}

export interface ClickUpCustomField {
    id: string;
    name: string;
    type: string;
    type_config: Record<string, unknown>;
    date_created: string;
    hide_from_guests: boolean;
    value?: unknown;
    required?: boolean;
}

export interface ClickUpDependency {
    task_id: string;
    depends_on: string;
    type: number;
    date_created: string;
    userid: string;
    workspace_id: string;
}

export interface ClickUpLinkedTask {
    task_id: string;
    link_id: string;
    date_created: string;
    userid: string;
    workspace_id: string;
}

export interface ClickUpAttachment {
    id: string;
    date: string;
    title: string;
    type: number;
    source: number;
    version: number;
    extension: string;
    thumbnail_small?: string;
    thumbnail_medium?: string;
    thumbnail_large?: string;
    is_folder?: boolean;
    mimetype?: string;
    hidden?: boolean;
    parent_id?: string;
    size?: number;
    total_comments?: number;
    resolved_comments?: number;
    user?: ClickUpUser;
    deleted?: boolean;
    orientation?: string;
    url?: string;
    email_data?: unknown;
    url_w_query?: string;
    url_w_host?: string;
}

// ============================================================================
// Comment Types
// ============================================================================

export interface ClickUpComment {
    id: string;
    comment: Array<{
        text?: string;
        type?: string;
        attributes?: Record<string, unknown>;
    }>;
    comment_text: string;
    user: ClickUpUser;
    resolved: boolean;
    assignee?: ClickUpUser;
    assigned_by?: ClickUpUser;
    reactions: ClickUpReaction[];
    date: string;
}

export interface ClickUpReaction {
    reaction: string;
    date: string;
    user: ClickUpUser;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ClickUpTeamsResponse {
    teams: ClickUpWorkspace[];
}

export interface ClickUpSpacesResponse {
    spaces: ClickUpSpace[];
}

export interface ClickUpFoldersResponse {
    folders: ClickUpFolder[];
}

export interface ClickUpListsResponse {
    lists: ClickUpList[];
}

export interface ClickUpTasksResponse {
    tasks: ClickUpTask[];
    last_page: boolean;
}

export interface ClickUpCommentsResponse {
    comments: ClickUpComment[];
}

export interface ClickUpUserResponse {
    user: ClickUpUser;
}
