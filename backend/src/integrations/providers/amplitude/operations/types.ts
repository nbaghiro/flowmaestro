/**
 * Amplitude API types and interfaces
 */

/**
 * Standard Amplitude event structure
 */
export interface AmplitudeEvent {
    user_id?: string;
    device_id?: string;
    event_type: string;
    time?: number;
    event_properties?: Record<string, unknown>;
    user_properties?: Record<string, unknown>;
    groups?: Record<string, string | string[]>;
    app_version?: string;
    platform?: string;
    os_name?: string;
    os_version?: string;
    device_brand?: string;
    device_manufacturer?: string;
    device_model?: string;
    carrier?: string;
    country?: string;
    region?: string;
    city?: string;
    dma?: string;
    language?: string;
    price?: number;
    quantity?: number;
    revenue?: number;
    productId?: string;
    revenueType?: string;
    location_lat?: number;
    location_lng?: number;
    ip?: string;
    idfa?: string;
    idfv?: string;
    adid?: string;
    android_id?: string;
    event_id?: number;
    session_id?: number;
    insert_id?: string;
}

/**
 * Response from HTTP API v2 (single/batch events)
 */
export interface AmplitudeHttpApiResponse {
    code: number;
    server_upload_time: number;
    payload_size_bytes: number;
    events_ingested: number;
}

/**
 * Response from Batch API
 */
export interface AmplitudeBatchResponse {
    code: number;
    events_ingested: number;
    payload_size_bytes: number;
    server_upload_time: number;
}

/**
 * Response from Identify API
 */
export interface AmplitudeIdentifyResponse {
    code: number;
    server_upload_time: number;
    events_ingested: number;
}

/**
 * User identification payload for Identify API
 */
export interface AmplitudeIdentification {
    user_id?: string;
    device_id?: string;
    user_properties?: {
        $set?: Record<string, unknown>;
        $setOnce?: Record<string, unknown>;
        $add?: Record<string, number>;
        $append?: Record<string, unknown>;
        $prepend?: Record<string, unknown>;
        $unset?: Record<string, unknown>;
    };
}

/**
 * Error response from Amplitude
 */
export interface AmplitudeErrorResponse {
    code: number;
    error: string;
    missing_field?: string;
    events_with_invalid_fields?: Record<string, number[]>;
    events_with_missing_fields?: Record<string, number[]>;
}
