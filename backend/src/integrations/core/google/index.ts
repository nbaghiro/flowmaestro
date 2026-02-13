/**
 * Google API Shared Utilities
 *
 * Reusable components for Google service integrations including
 * base client with Bearer auth, error handling, and type definitions.
 */

export { GoogleBaseClient } from "./base-client";
export type { GoogleClientConfig } from "./base-client";

export { parseGoogleErrorMessage, getGoogleErrorReason } from "./error-types";
export type { GoogleErrorResponse } from "./error-types";
