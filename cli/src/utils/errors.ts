import chalk from "chalk";

export class CliError extends Error {
    constructor(
        message: string,
        public readonly code?: string,
        public readonly details?: Record<string, unknown>
    ) {
        super(message);
        this.name = "CliError";
    }
}

export class AuthenticationError extends CliError {
    constructor(message: string = "Authentication required. Run 'fm login' to authenticate.") {
        super(message, "AUTH_REQUIRED");
        this.name = "AuthenticationError";
    }
}

export class ApiError extends CliError {
    constructor(
        message: string,
        public readonly statusCode: number,
        code?: string,
        details?: Record<string, unknown>
    ) {
        super(message, code, details);
        this.name = "ApiError";
    }
}

export class ValidationError extends CliError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(message, "VALIDATION_ERROR", details);
        this.name = "ValidationError";
    }
}

export class NetworkError extends CliError {
    constructor(message: string = "Network error. Please check your connection.") {
        super(message, "NETWORK_ERROR");
        this.name = "NetworkError";
    }
}

export interface ApiErrorResponse {
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
    meta?: {
        request_id?: string;
    };
}

export function formatError(error: unknown): string {
    if (error instanceof AuthenticationError) {
        return chalk.red(`Authentication Error: ${error.message}`);
    }

    if (error instanceof ApiError) {
        let msg = chalk.red(`API Error (${error.statusCode}): ${error.message}`);
        if (error.code) {
            msg += chalk.gray(` [${error.code}]`);
        }
        return msg;
    }

    if (error instanceof ValidationError) {
        let msg = chalk.red(`Validation Error: ${error.message}`);
        if (error.details) {
            msg += chalk.gray(`\nDetails: ${JSON.stringify(error.details, null, 2)}`);
        }
        return msg;
    }

    if (error instanceof NetworkError) {
        return chalk.red(`Network Error: ${error.message}`);
    }

    if (error instanceof CliError) {
        return chalk.red(`Error: ${error.message}`);
    }

    if (error instanceof Error) {
        return chalk.red(`Error: ${error.message}`);
    }

    return chalk.red(`Unknown error: ${String(error)}`);
}

export function handleError(error: unknown, verbose: boolean = false): never {
    console.error(formatError(error));

    if (verbose && error instanceof Error && error.stack) {
        console.error(chalk.gray("\nStack trace:"));
        console.error(chalk.gray(error.stack));
    }

    process.exit(1);
}

export function parseApiError(response: Response, body: unknown): ApiError {
    if (isApiErrorResponse(body)) {
        return new ApiError(
            body.error.message,
            response.status,
            body.error.code,
            body.error.details
        );
    }

    return new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
}

function isApiErrorResponse(body: unknown): body is ApiErrorResponse {
    return (
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof (body as ApiErrorResponse).error === "object" &&
        (body as ApiErrorResponse).error !== null &&
        "message" in (body as ApiErrorResponse).error
    );
}
