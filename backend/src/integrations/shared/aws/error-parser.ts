/**
 * AWS Error Parser
 *
 * Parses AWS API error responses (XML and JSON formats) and maps them to
 * standardized error types for consistent handling across all AWS services.
 */

import type { OperationError } from "../../core/types";

/**
 * AWS error codes mapped to FlowMaestro error types
 */
const AWS_ERROR_TYPE_MAP: Record<string, OperationError["type"]> = {
    // Not found errors
    ResourceNotFoundException: "not_found",
    NoSuchBucket: "not_found",
    NoSuchKey: "not_found",
    NoSuchEntity: "not_found",
    FunctionNotFound: "not_found",

    // Validation errors
    InvalidParameterValueException: "validation",
    InvalidParameterCombination: "validation",
    InvalidParameterException: "validation",
    ValidationError: "validation",
    InvalidBucketName: "validation",
    InvalidArgument: "validation",
    MalformedXML: "validation",
    MalformedJSON: "validation",

    // Permission/auth errors
    AccessDeniedException: "permission",
    UnauthorizedException: "permission",
    AccessDenied: "permission",
    Forbidden: "permission",
    InvalidAccessKeyId: "permission",
    SignatureDoesNotMatch: "permission",
    ExpiredToken: "permission",
    TokenRefreshRequired: "permission",

    // Rate limit errors
    ThrottlingException: "rate_limit",
    TooManyRequestsException: "rate_limit",
    RequestLimitExceeded: "rate_limit",
    ProvisionedThroughputExceededException: "rate_limit",
    SlowDown: "rate_limit",

    // Conflict errors (map to validation as closest match)
    ResourceInUseException: "validation",
    ConflictException: "validation",
    BucketAlreadyExists: "validation",
    BucketNotEmpty: "validation",

    // Server errors (retryable)
    ServiceUnavailable: "server_error",
    InternalError: "server_error",
    InternalServiceError: "server_error",
    ServiceException: "server_error"
};

export interface ParsedAWSError {
    code: string;
    message: string;
    requestId?: string;
    type?: string;
}

/**
 * Parse XML error response (S3, ECS, CloudWatch)
 */
export function parseAWSErrorXML(xml: string): ParsedAWSError | null {
    try {
        const codeMatch = xml.match(/<Code>([^<]+)<\/Code>/);
        const messageMatch = xml.match(/<Message>([^<]+)<\/Message>/);
        const requestIdMatch = xml.match(/<RequestId>([^<]+)<\/RequestId>/);
        const typeMatch = xml.match(/<Type>([^<]+)<\/Type>/);

        if (codeMatch && messageMatch) {
            return {
                code: codeMatch[1],
                message: messageMatch[1],
                requestId: requestIdMatch ? requestIdMatch[1] : undefined,
                type: typeMatch ? typeMatch[1] : undefined
            };
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Parse JSON error response (Lambda, CloudWatch Logs)
 */
export function parseAWSErrorJSON(json: string): ParsedAWSError | null {
    try {
        const error = JSON.parse(json);

        // AWS uses different field names across services
        const code = error.__type || error.Code || error.code;
        const message = error.message || error.Message || error.errorMessage;

        if (code && message) {
            return {
                code,
                message,
                requestId: error.RequestId || error.requestId
            };
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Map AWS error code to FlowMaestro error type
 */
export function mapAWSErrorType(awsErrorCode: string): OperationError["type"] {
    // Try exact match first
    if (AWS_ERROR_TYPE_MAP[awsErrorCode]) {
        return AWS_ERROR_TYPE_MAP[awsErrorCode];
    }

    // Try partial match (e.g., "Lambda.ResourceNotFoundException" -> "ResourceNotFoundException")
    const simplifiedCode = awsErrorCode.split(".").pop() || awsErrorCode;
    if (AWS_ERROR_TYPE_MAP[simplifiedCode]) {
        return AWS_ERROR_TYPE_MAP[simplifiedCode];
    }

    // Default to server_error
    return "server_error";
}

/**
 * Check if AWS error is retryable
 */
export function isAWSErrorRetryable(errorType: OperationError["type"]): boolean {
    return errorType === "rate_limit" || errorType === "server_error";
}

/**
 * Create standardized error from AWS error response
 */
export function createAWSError(parsedError: ParsedAWSError, statusCode: number): OperationError {
    const errorType = mapAWSErrorType(parsedError.code);

    return {
        type: errorType,
        message: parsedError.message,
        code: parsedError.code,
        retryable: isAWSErrorRetryable(errorType),
        details: {
            requestId: parsedError.requestId,
            statusCode,
            awsErrorType: parsedError.type
        }
    };
}

/**
 * Parse AWS error response and create standardized error
 */
export function parseAWSError(
    response: Response,
    body: string,
    contentType?: string
): OperationError {
    // Try to parse based on content type
    const isXML = contentType?.includes("xml") || body.trim().startsWith("<");
    const isJSON = contentType?.includes("json") || body.trim().startsWith("{");

    let parsedError: ParsedAWSError | null = null;

    if (isXML) {
        parsedError = parseAWSErrorXML(body);
    } else if (isJSON) {
        parsedError = parseAWSErrorJSON(body);
    }

    // If we successfully parsed the error, create standardized error
    if (parsedError) {
        return createAWSError(parsedError, response.status);
    }

    // Fallback: create generic error based on status code
    let errorType: OperationError["type"] = "server_error";
    let message = `AWS HTTP ${response.status}: ${response.statusText}`;

    if (response.status === 404) {
        errorType = "not_found";
        message = "Resource not found";
    } else if (response.status === 403) {
        errorType = "permission";
        message = "Access denied - check IAM permissions";
    } else if (response.status === 401) {
        errorType = "permission";
        message = "Authentication failed - check credentials";
    } else if (response.status === 429) {
        errorType = "rate_limit";
        message = "Rate limit exceeded - too many requests";
    } else if (response.status === 400) {
        errorType = "validation";
        message = "Invalid request parameters";
    }

    return {
        type: errorType,
        message,
        code: response.status.toString(),
        retryable: isAWSErrorRetryable(errorType),
        details: {
            statusCode: response.status,
            statusText: response.statusText,
            body: body.substring(0, 500) // Include first 500 chars for debugging
        }
    };
}
