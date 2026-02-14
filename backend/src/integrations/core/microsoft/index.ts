/**
 * Microsoft Graph API Shared Utilities
 *
 * Reusable components for Microsoft Graph API integrations including
 * base client with Bearer auth, error handling, and type definitions.
 */

export { MicrosoftGraphClient } from "./graph-client";
export type { MicrosoftGraphClientConfig } from "./graph-client";

export { parseMicrosoftErrorMessage, parseMicrosoftErrorCode } from "./error-types";
export type { MicrosoftGraphErrorResponse } from "./error-types";
