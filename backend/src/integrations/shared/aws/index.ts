/**
 * AWS Shared Utilities
 *
 * Reusable components for AWS service integrations including Signature V4,
 * error parsing, and base client.
 */

export { AWSSignatureV4 } from "./signature-v4";
export type {
    SignatureV4Config,
    SignRequestParams,
    SignedRequest,
    PresignedUrlParams
} from "./signature-v4";

export {
    parseAWSErrorXML,
    parseAWSErrorJSON,
    mapAWSErrorType,
    isAWSErrorRetryable,
    createAWSError,
    parseAWSError
} from "./error-parser";
export type { ParsedAWSError } from "./error-parser";

export { AWSBaseClient } from "./base-client";
export type { AWSClientConfig } from "./base-client";
