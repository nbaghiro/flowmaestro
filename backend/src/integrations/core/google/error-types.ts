/**
 * Google API Error Types
 *
 * Shared error response interfaces for all Google API integrations.
 */

/**
 * Standard Google API error response structure
 * Common across Calendar, Drive, Docs, Sheets, Forms, Slides, and Cloud Storage
 */
export interface GoogleErrorResponse {
    error: {
        code: number;
        message: string;
        status?: string;
        errors?: Array<{
            domain?: string;
            reason?: string;
            message?: string;
        }>;
        details?: unknown[];
    };
}

/**
 * Parse error message from Google API error response
 */
export function parseGoogleErrorMessage(data: unknown): string | undefined {
    const errorData = data as GoogleErrorResponse;
    return errorData?.error?.message;
}

/**
 * Get error reason from Google API error response (used for rate limit detection)
 */
export function getGoogleErrorReason(data: unknown): string | undefined {
    const errorData = data as GoogleErrorResponse;
    return errorData?.error?.errors?.[0]?.reason;
}
