/**
 * PostHog API types and interfaces
 */

/**
 * Standard PostHog capture event request body
 */
export interface PostHogCaptureRequest {
    api_key: string;
    event: string;
    distinct_id: string;
    properties?: Record<string, unknown>;
    timestamp?: string;
    uuid?: string;
}

/**
 * PostHog batch capture request body
 */
export interface PostHogBatchRequest {
    api_key: string;
    batch: PostHogBatchEvent[];
}

/**
 * Single event in batch request
 */
export interface PostHogBatchEvent {
    event: string;
    distinct_id: string;
    properties?: Record<string, unknown>;
    timestamp?: string;
    uuid?: string;
}

/**
 * PostHog identify ($set) request - uses capture endpoint
 */
export interface PostHogIdentifyRequest {
    api_key: string;
    event: "$set";
    distinct_id: string;
    properties: {
        $set?: Record<string, unknown>;
        $set_once?: Record<string, unknown>;
    };
    timestamp?: string;
}

/**
 * PostHog group identify request - uses capture endpoint
 */
export interface PostHogGroupIdentifyRequest {
    api_key: string;
    event: "$groupidentify";
    distinct_id: string;
    properties: {
        $group_type: string;
        $group_key: string;
        $group_set?: Record<string, unknown>;
    };
    timestamp?: string;
}

/**
 * Success response from PostHog capture endpoint
 */
export interface PostHogCaptureResponse {
    status: 1 | 0;
}

/**
 * Success response from PostHog batch endpoint
 */
export interface PostHogBatchResponse {
    status: 1 | 0;
}

/**
 * Error response from PostHog
 */
export interface PostHogErrorResponse {
    type?: string;
    code?: string;
    detail?: string;
    attr?: string;
}
