/**
 * GitLab API response types
 * Based on GitLab REST API v4 documentation
 */

export interface GitLabUser {
    id: number;
    username: string;
    name: string;
    state: string;
    avatar_url: string;
    web_url: string;
}

export interface GitLabNamespace {
    id: number;
    name: string;
    path: string;
    kind: string;
    full_path: string;
    parent_id: number | null;
    avatar_url: string | null;
    web_url: string;
}

export interface GitLabProject {
    id: number;
    description: string | null;
    default_branch: string;
    visibility: string;
    ssh_url_to_repo: string;
    http_url_to_repo: string;
    web_url: string;
    readme_url: string | null;
    name: string;
    name_with_namespace: string;
    path: string;
    path_with_namespace: string;
    created_at: string;
    last_activity_at: string;
    forks_count: number;
    star_count: number;
    namespace: GitLabNamespace;
    archived: boolean;
    avatar_url: string | null;
    open_issues_count: number;
    merge_requests_enabled: boolean;
    issues_enabled: boolean;
    wiki_enabled: boolean;
    jobs_enabled: boolean;
    snippets_enabled: boolean;
    container_registry_enabled: boolean;
    owner?: GitLabUser;
}

export interface GitLabIssue {
    id: number;
    iid: number;
    project_id: number;
    title: string;
    description: string | null;
    state: string;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    closed_by: GitLabUser | null;
    labels: string[];
    milestone: GitLabMilestone | null;
    assignees: GitLabUser[];
    author: GitLabUser;
    type: string;
    assignee: GitLabUser | null;
    user_notes_count: number;
    merge_requests_count: number;
    upvotes: number;
    downvotes: number;
    due_date: string | null;
    confidential: boolean;
    discussion_locked: boolean | null;
    issue_type: string;
    web_url: string;
    time_stats: {
        time_estimate: number;
        total_time_spent: number;
    };
    task_completion_status: {
        count: number;
        completed_count: number;
    };
    weight: number | null;
    has_tasks: boolean;
    references: {
        short: string;
        relative: string;
        full: string;
    };
}

export interface GitLabMilestone {
    id: number;
    iid: number;
    project_id: number;
    title: string;
    description: string;
    state: string;
    created_at: string;
    updated_at: string;
    due_date: string | null;
    start_date: string | null;
    web_url: string;
}

export interface GitLabLabel {
    id: number;
    name: string;
    color: string;
    text_color: string;
    description: string | null;
    description_html: string | null;
    open_issues_count: number;
    closed_issues_count: number;
    open_merge_requests_count: number;
    subscribed: boolean;
    priority: number | null;
    is_project_label: boolean;
}

export interface GitLabMergeRequest {
    id: number;
    iid: number;
    project_id: number;
    title: string;
    description: string | null;
    state: string;
    created_at: string;
    updated_at: string;
    merged_by: GitLabUser | null;
    merged_at: string | null;
    closed_by: GitLabUser | null;
    closed_at: string | null;
    target_branch: string;
    source_branch: string;
    user_notes_count: number;
    upvotes: number;
    downvotes: number;
    author: GitLabUser;
    assignees: GitLabUser[];
    assignee: GitLabUser | null;
    reviewers: GitLabUser[];
    source_project_id: number;
    target_project_id: number;
    labels: string[];
    draft: boolean;
    work_in_progress: boolean;
    milestone: GitLabMilestone | null;
    merge_when_pipeline_succeeds: boolean;
    merge_status: string;
    sha: string;
    merge_commit_sha: string | null;
    squash_commit_sha: string | null;
    discussion_locked: boolean | null;
    should_remove_source_branch: boolean | null;
    force_remove_source_branch: boolean;
    reference: string;
    references: {
        short: string;
        relative: string;
        full: string;
    };
    web_url: string;
    time_stats: {
        time_estimate: number;
        total_time_spent: number;
    };
    squash: boolean;
    task_completion_status: {
        count: number;
        completed_count: number;
    };
    has_conflicts: boolean;
    blocking_discussions_resolved: boolean;
}

export interface GitLabPipeline {
    id: number;
    iid: number;
    project_id: number;
    sha: string;
    ref: string;
    status: string;
    source: string;
    created_at: string;
    updated_at: string;
    web_url: string;
    before_sha: string;
    tag: boolean;
    yaml_errors: string | null;
    user: GitLabUser;
    started_at: string | null;
    finished_at: string | null;
    committed_at: string | null;
    duration: number | null;
    queued_duration: number | null;
    coverage: string | null;
    detailed_status?: {
        icon: string;
        text: string;
        label: string;
        group: string;
        tooltip: string;
        has_details: boolean;
        details_path: string;
        illustration: string | null;
        favicon: string;
    };
}

export interface GitLabPipelineVariable {
    key: string;
    value: string;
    variable_type: string;
}
