/**
 * Mixpanel API types and interfaces
 */

/**
 * Standard Mixpanel event structure for /track endpoint
 */
export interface MixpanelTrackEvent {
    event: string;
    properties: {
        token: string;
        distinct_id?: string;
        time?: number;
        $insert_id?: string;
        [key: string]: unknown;
    };
}

/**
 * Event structure for /import endpoint (batch/historical)
 */
export interface MixpanelImportEvent {
    event: string;
    properties: {
        distinct_id: string;
        time: number;
        $insert_id?: string;
        [key: string]: unknown;
    };
}

/**
 * Response from /track endpoint (returns 1 or 0)
 */
export type MixpanelTrackResponse = 1 | 0;

/**
 * Response from /import endpoint
 */
export interface MixpanelImportResponse {
    code: number;
    num_records_imported: number;
    status: string;
}

/**
 * User profile update for /engage endpoint
 */
export interface MixpanelEngagePayload {
    $token: string;
    $distinct_id: string;
    $ip?: string;
    $ignore_time?: boolean;
    $set?: Record<string, unknown>;
    $set_once?: Record<string, unknown>;
    $add?: Record<string, number>;
    $append?: Record<string, unknown>;
    $union?: Record<string, unknown[]>;
    $remove?: Record<string, unknown>;
    $unset?: string[];
    $delete?: string;
}

/**
 * Response from /engage endpoint (returns 1 or 0)
 */
export type MixpanelEngageResponse = 1 | 0;

/**
 * Group profile update for /groups endpoint
 */
export interface MixpanelGroupPayload {
    $token: string;
    $group_key: string;
    $group_id: string;
    $set?: Record<string, unknown>;
    $set_once?: Record<string, unknown>;
    $unset?: string[];
    $delete?: string;
}

/**
 * Response from /groups endpoint (returns 1 or 0)
 */
export type MixpanelGroupResponse = 1 | 0;

/**
 * Error response from Mixpanel
 */
export interface MixpanelErrorResponse {
    error: string;
    status: number;
}
