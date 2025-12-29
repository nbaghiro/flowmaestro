/**
 * Reddit API response types and interfaces
 */

/**
 * Base Reddit API response wrapper
 * Reddit wraps most responses in { kind: "Listing", data: { children: [...] } }
 */
export interface RedditListingResponse<T> {
    kind: "Listing";
    data: {
        after?: string | null;
        before?: string | null;
        dist?: number;
        modhash?: string;
        geo_filter?: string;
        children: Array<{
            kind: string;
            data: T;
        }>;
    };
}

/**
 * Reddit API error format
 */
export interface RedditAPIError {
    error: number;
    message: string;
    reason?: string;
}

/**
 * Reddit post (submission) object
 */
export interface RedditPost {
    id: string;
    name: string; // Fullname (t3_xxx)
    title: string;
    selftext?: string;
    selftext_html?: string;
    url?: string;
    permalink: string;
    author: string;
    author_fullname?: string;
    subreddit: string;
    subreddit_id: string;
    subreddit_name_prefixed: string;
    created_utc: number;
    score: number;
    upvote_ratio?: number;
    ups: number;
    downs: number;
    num_comments: number;
    is_self: boolean;
    is_video: boolean;
    over_18: boolean;
    spoiler: boolean;
    stickied: boolean;
    locked: boolean;
    archived: boolean;
    saved: boolean;
    likes?: boolean | null; // true = upvoted, false = downvoted, null = no vote
    thumbnail?: string;
    preview?: {
        images: Array<{
            source: { url: string; width: number; height: number };
            resolutions: Array<{ url: string; width: number; height: number }>;
        }>;
    };
    link_flair_text?: string | null;
    link_flair_css_class?: string | null;
}

/**
 * Reddit comment object
 */
export interface RedditComment {
    id: string;
    name: string; // Fullname (t1_xxx)
    body: string;
    body_html: string;
    author: string;
    author_fullname?: string;
    parent_id: string;
    link_id: string;
    subreddit: string;
    subreddit_id: string;
    created_utc: number;
    score: number;
    ups: number;
    downs: number;
    is_submitter: boolean;
    stickied: boolean;
    locked: boolean;
    archived: boolean;
    saved: boolean;
    likes?: boolean | null;
    depth?: number;
    replies?: RedditListingResponse<RedditComment> | "" | null;
}

/**
 * Reddit user object
 */
export interface RedditUser {
    id: string;
    name: string;
    created_utc: number;
    link_karma: number;
    comment_karma: number;
    total_karma: number;
    is_gold: boolean;
    is_mod: boolean;
    has_verified_email: boolean;
    icon_img?: string;
    snoovatar_img?: string;
    subreddit?: {
        display_name: string;
        title: string;
        public_description: string;
        subscribers: number;
    };
}

/**
 * Response for submitting a post
 */
export interface SubmitPostResponse {
    json: {
        errors: string[][];
        data?: {
            url: string;
            drafts_count: number;
            id: string;
            name: string;
        };
    };
}

/**
 * Response for submitting a comment
 */
export interface SubmitCommentResponse {
    json: {
        errors: string[][];
        data?: {
            things: Array<{
                kind: string;
                data: RedditComment;
            }>;
        };
    };
}

/**
 * Response for vote operation
 * Reddit returns empty response on success
 */
export type VoteResponse = Record<string, never>;

/**
 * Response for save/unsave operation
 * Reddit returns empty response on success
 */
export type SaveResponse = Record<string, never>;

/**
 * Subreddit info object
 */
export interface RedditSubreddit {
    id: string;
    name: string;
    display_name: string;
    display_name_prefixed: string;
    title: string;
    public_description: string;
    description: string;
    subscribers: number;
    active_user_count?: number;
    created_utc: number;
    over18: boolean;
    url: string;
    icon_img?: string;
    banner_img?: string;
    header_img?: string;
    subreddit_type: "public" | "private" | "restricted" | "gold_restricted" | "archived";
}

/**
 * Sort types for posts
 */
export type PostSortType = "hot" | "new" | "top" | "rising" | "controversial";

/**
 * Time filter for top/controversial
 */
export type TimeFilter = "hour" | "day" | "week" | "month" | "year" | "all";

/**
 * Vote direction
 */
export type VoteDirection = 1 | 0 | -1;
