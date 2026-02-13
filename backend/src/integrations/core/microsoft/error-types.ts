/**
 * Microsoft Graph API Error Types
 *
 * Shared error response interfaces for all Microsoft Graph API integrations.
 */

/**
 * Standard Microsoft Graph API error response structure
 */
export interface MicrosoftGraphErrorResponse {
    error: {
        code: string;
        message: string;
        innerError?: {
            date?: string;
            "request-id"?: string;
            "client-request-id"?: string;
        };
    };
}

/**
 * Parse error message from Microsoft Graph API error response
 */
export function parseMicrosoftErrorMessage(errorText: string): string | undefined {
    try {
        const errorJson = JSON.parse(errorText) as MicrosoftGraphErrorResponse;
        return errorJson?.error?.message;
    } catch {
        return undefined;
    }
}

/**
 * Parse error code from Microsoft Graph API error response
 */
export function parseMicrosoftErrorCode(errorText: string): string | undefined {
    try {
        const errorJson = JSON.parse(errorText) as MicrosoftGraphErrorResponse;
        return errorJson?.error?.code;
    } catch {
        return undefined;
    }
}
