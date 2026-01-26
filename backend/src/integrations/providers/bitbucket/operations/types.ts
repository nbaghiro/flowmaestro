/**
 * Bitbucket API response types
 * Based on Bitbucket REST API 2.0 documentation
 */

export interface BitbucketLinks {
    self?: { href: string };
    html?: { href: string };
    avatar?: { href: string };
    commits?: { href: string };
    diff?: { href: string };
    diffstat?: { href: string };
    comments?: { href: string };
    approve?: { href: string };
    decline?: { href: string };
    merge?: { href: string };
    activity?: { href: string };
}

export interface BitbucketUser {
    type: string;
    uuid: string;
    username?: string;
    display_name: string;
    nickname?: string;
    account_id?: string;
    links: BitbucketLinks;
}

export interface BitbucketWorkspace {
    type: string;
    uuid: string;
    name: string;
    slug: string;
    links: BitbucketLinks;
}

export interface BitbucketProject {
    type: string;
    uuid: string;
    key: string;
    name: string;
    links: BitbucketLinks;
}

export interface BitbucketRepository {
    type: string;
    uuid: string;
    name: string;
    full_name: string;
    description: string;
    is_private: boolean;
    fork_policy: string;
    language: string;
    created_on: string;
    updated_on: string;
    size: number;
    has_issues: boolean;
    has_wiki: boolean;
    mainbranch?: {
        name: string;
        type: string;
    };
    owner: BitbucketUser | BitbucketWorkspace;
    workspace: BitbucketWorkspace;
    project?: BitbucketProject;
    links: BitbucketLinks;
    scm: string;
}

export interface BitbucketPullRequest {
    type: string;
    id: number;
    title: string;
    description: string;
    state: string;
    created_on: string;
    updated_on: string;
    source: {
        branch: {
            name: string;
        };
        repository?: BitbucketRepository;
        commit?: {
            hash: string;
        };
    };
    destination: {
        branch: {
            name: string;
        };
        repository?: BitbucketRepository;
        commit?: {
            hash: string;
        };
    };
    author: BitbucketUser;
    close_source_branch: boolean;
    closed_by: BitbucketUser | null;
    merge_commit: {
        hash: string;
    } | null;
    comment_count: number;
    task_count: number;
    reviewers: BitbucketUser[];
    participants: Array<{
        user: BitbucketUser;
        role: string;
        approved: boolean;
        state: string | null;
        participated_on: string | null;
    }>;
    links: BitbucketLinks;
}

export interface BitbucketIssue {
    type: string;
    id: number;
    title: string;
    content: {
        raw: string;
        markup: string;
        html: string;
    };
    reporter: BitbucketUser;
    assignee: BitbucketUser | null;
    state: string;
    kind: string;
    priority: string;
    component: {
        name: string;
    } | null;
    milestone: {
        name: string;
    } | null;
    version: {
        name: string;
    } | null;
    created_on: string;
    updated_on: string;
    edited_on: string | null;
    votes: number;
    links: BitbucketLinks;
}

export interface BitbucketPipeline {
    type: string;
    uuid: string;
    build_number: number;
    creator: BitbucketUser;
    repository: BitbucketRepository;
    target: {
        type: string;
        ref_type: string;
        ref_name: string;
        selector?: {
            type: string;
            pattern: string;
        };
        commit?: {
            type: string;
            hash: string;
        };
    };
    trigger: {
        type: string;
        name?: string;
    };
    state: {
        type: string;
        name: string;
        result?: {
            type: string;
            name: string;
        };
        stage?: {
            type: string;
            name: string;
        };
    };
    created_on: string;
    completed_on: string | null;
    run_number: number;
    duration_in_seconds: number | null;
    build_seconds_used: number;
    first_successful: boolean;
    expired: boolean;
    links: BitbucketLinks;
}

export interface BitbucketPaginatedResponse<T> {
    size?: number;
    page?: number;
    pagelen: number;
    next?: string;
    previous?: string;
    values: T[];
}
