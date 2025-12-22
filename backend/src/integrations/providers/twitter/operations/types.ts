/**
 * X (Twitter) API v2 response types and interfaces
 */

/**
 * Base X API response wrapper
 */
export interface XAPIResponse<T> {
    data?: T;
    errors?: XAPIError[];
    meta?: {
        result_count?: number;
        next_token?: string;
        previous_token?: string;
    };
}

/**
 * X API error format
 */
export interface XAPIError {
    message: string;
    type?: string;
    title?: string;
    detail?: string;
    resource_type?: string;
    parameter?: string;
    value?: string;
}

/**
 * Tweet object from X API v2
 */
export interface Tweet {
    id: string;
    text: string;
    author_id?: string;
    created_at?: string;
    conversation_id?: string;
    in_reply_to_user_id?: string;
    referenced_tweets?: Array<{
        type: "replied_to" | "quoted" | "retweeted";
        id: string;
    }>;
    public_metrics?: {
        retweet_count: number;
        reply_count: number;
        like_count: number;
        quote_count: number;
        bookmark_count?: number;
        impression_count?: number;
    };
    edit_history_tweet_ids?: string[];
}

/**
 * User object from X API v2
 */
export interface XUser {
    id: string;
    name: string;
    username: string;
    created_at?: string;
    description?: string;
    profile_image_url?: string;
    protected?: boolean;
    verified?: boolean;
    public_metrics?: {
        followers_count: number;
        following_count: number;
        tweet_count: number;
        listed_count: number;
    };
}

/**
 * Response for creating a tweet
 */
export interface CreateTweetResponse {
    data: {
        id: string;
        text: string;
    };
}

/**
 * Response for deleting a tweet
 */
export interface DeleteTweetResponse {
    data: {
        deleted: boolean;
    };
}

/**
 * Response for getting user info
 */
export interface GetUserResponse {
    data: XUser;
}

/**
 * Response for timeline/search operations
 */
export interface TweetsResponse {
    data?: Tweet[];
    meta?: {
        result_count: number;
        next_token?: string;
        previous_token?: string;
        newest_id?: string;
        oldest_id?: string;
    };
}
