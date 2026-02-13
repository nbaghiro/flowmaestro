/**
 * SAP OData Error Types
 *
 * Common error response interfaces for SAP OData v2 APIs.
 * Used by both SAP S/4HANA and SAP SuccessFactors.
 */

/**
 * Standard SAP OData v2 error response format
 */
export interface SapODataErrorResponse {
    error?: {
        code?: string;
        message?: {
            lang?: string;
            value?: string;
        };
        innererror?: {
            errordetails?: Array<{
                code?: string;
                message?: string;
                severity?: string;
            }>;
        };
    };
}

/**
 * Parse SAP OData error response into a human-readable message
 */
export function parseSapODataError(data: SapODataErrorResponse): string | null {
    if (!data.error) {
        return null;
    }

    // Primary error message
    const primaryMessage = data.error.message?.value;

    // Inner error details
    const errorDetails = data.error.innererror?.errordetails;
    if (errorDetails?.length) {
        const details = errorDetails
            .map((d) => d.message)
            .filter(Boolean)
            .join("; ");

        if (primaryMessage) {
            return `${primaryMessage}. Details: ${details}`;
        }
        return details;
    }

    return primaryMessage || null;
}
