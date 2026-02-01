/**
 * GitHub API response types
 * Based on GitHub REST API v3 documentation
 */

export interface GitHubRepository {
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    private: boolean;
    owner: GitHubUser;
    html_url: string;
    description: string | null;
    fork: boolean;
    url: string;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    homepage: string | null;
    size: number;
    stargazers_count: number;
    watchers_count: number;
    language: string | null;
    has_issues: boolean;
    has_projects: boolean;
    has_downloads: boolean;
    has_wiki: boolean;
    has_pages: boolean;
    forks_count: number;
    archived: boolean;
    disabled: boolean;
    open_issues_count: number;
    license: GitHubLicense | null;
    topics: string[];
    visibility: string;
    default_branch: string;
}

export interface GitHubUser {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    type: string;
    site_admin: boolean;
}

export interface GitHubLicense {
    key: string;
    name: string;
    spdx_id: string;
    url: string | null;
    node_id: string;
}

export interface GitHubIssue {
    id: number;
    node_id: string;
    url: string;
    repository_url: string;
    labels_url: string;
    comments_url: string;
    events_url: string;
    html_url: string;
    number: number;
    state: string;
    state_reason?: string | null;
    title: string;
    body: string | null;
    user: GitHubUser;
    labels: GitHubLabel[];
    assignee: GitHubUser | null;
    assignees: GitHubUser[];
    milestone: GitHubMilestone | null;
    locked: boolean;
    comments: number;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    author_association: string;
}

export interface GitHubLabel {
    id: number;
    node_id: string;
    url: string;
    name: string;
    color: string;
    default: boolean;
    description: string | null;
}

export interface GitHubMilestone {
    url: string;
    html_url: string;
    labels_url: string;
    id: number;
    node_id: string;
    number: number;
    state: string;
    title: string;
    description: string | null;
    creator: GitHubUser;
    open_issues: number;
    closed_issues: number;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    due_on: string | null;
}

export interface GitHubComment {
    id: number;
    node_id: string;
    url: string;
    html_url: string;
    body: string;
    user: GitHubUser;
    created_at: string;
    updated_at: string;
    author_association: string;
}

export interface GitHubPullRequest {
    id: number;
    node_id: string;
    url: string;
    html_url: string;
    diff_url: string;
    patch_url: string;
    issue_url: string;
    number: number;
    state: string;
    locked: boolean;
    title: string;
    user: GitHubUser;
    body: string | null;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    merged_at: string | null;
    merge_commit_sha: string | null;
    assignee: GitHubUser | null;
    assignees: GitHubUser[];
    requested_reviewers: GitHubUser[];
    labels: GitHubLabel[];
    milestone: GitHubMilestone | null;
    draft: boolean;
    head: GitHubPullRequestRef;
    base: GitHubPullRequestRef;
    merged: boolean;
    mergeable: boolean | null;
    rebaseable: boolean | null;
    mergeable_state: string;
    merged_by: GitHubUser | null;
    comments: number;
    review_comments: number;
    maintainer_can_modify: boolean;
    commits: number;
    additions: number;
    deletions: number;
    changed_files: number;
}

export interface GitHubPullRequestRef {
    label: string;
    ref: string;
    sha: string;
    user: GitHubUser;
    repo: GitHubRepository;
}

export interface GitHubReview {
    id: number;
    node_id: string;
    user: GitHubUser;
    body: string;
    state: string;
    html_url: string;
    pull_request_url: string;
    submitted_at: string;
    commit_id: string;
    author_association: string;
}

export interface GitHubWorkflow {
    id: number;
    node_id: string;
    name: string;
    path: string;
    state: string;
    created_at: string;
    updated_at: string;
    url: string;
    html_url: string;
    badge_url: string;
}

export interface GitHubWorkflowRun {
    id: number;
    name: string;
    node_id: string;
    head_branch: string;
    head_sha: string;
    run_number: number;
    event: string;
    status: string;
    conclusion: string | null;
    workflow_id: number;
    url: string;
    html_url: string;
    created_at: string;
    updated_at: string;
    run_started_at: string;
}

export interface GitHubWorkflowRunsList {
    total_count: number;
    workflow_runs: GitHubWorkflowRun[];
}

export interface GitHubWorkflowsList {
    total_count: number;
    workflows: GitHubWorkflow[];
}
