/**
 * Heap API types and interfaces
 */

/**
 * Standard Heap track event request body
 */
export interface HeapTrackRequest {
    app_id: string;
    identity: string;
    event: string;
    timestamp?: string;
    properties?: Record<string, string | number | boolean>;
    idempotency_key?: string;
}

/**
 * Heap add user properties request body
 */
export interface HeapUserPropertiesRequest {
    app_id: string;
    identity: string;
    properties: Record<string, string | number | boolean>;
}

/**
 * Heap add account properties request body
 */
export interface HeapAccountPropertiesRequest {
    app_id: string;
    account_id: string;
    properties: Record<string, string | number | boolean>;
}

/**
 * Success response from Heap API (empty 200 response)
 */
export interface HeapSuccessResponse {
    success: true;
}

/**
 * Error response from Heap API
 */
export interface HeapErrorResponse {
    error?: string;
    message?: string;
    status?: number;
}
