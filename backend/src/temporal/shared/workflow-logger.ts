/**
 * Structured logging utility for Temporal workflows
 *
 * Note: Temporal workflows run in a deterministic V8 sandbox where we can't
 * use external modules like pino. Workflow logs are forwarded through Temporal's
 * logging sink to the Runtime logger, which adds a [workflowType(workflowId)] prefix.
 *
 * To keep logs readable with the Temporal prefix, we output simple formatted messages
 * rather than JSON. The Runtime logger handles final formatting.
 */

/**
 * Sensitive field names that should be automatically redacted
 */
const SENSITIVE_FIELDS = new Set([
    "password",
    "token",
    "accesstoken",
    "access_token",
    "refreshtoken",
    "refresh_token",
    "apikey",
    "api_key",
    "apiKey",
    "secret",
    "authorization",
    "cookie"
]);

const REDACTED = "[REDACTED]";

/**
 * Recursively sanitize an object by redacting sensitive fields
 */
function sanitizeLogData<T>(data: T, depth = 0): T {
    if (depth > 10 || data === null || data === undefined) {
        return data;
    }

    if (typeof data !== "object") {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map((item) => sanitizeLogData(item, depth + 1)) as T;
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_FIELDS.has(lowerKey)) {
            sanitized[key] = REDACTED;
        } else if (typeof value === "object" && value !== null) {
            sanitized[key] = sanitizeLogData(value, depth + 1);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized as T;
}

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

export interface WorkflowLogContext {
    executionId: string;
    workflowName: string;
    userId?: string;
    iteration?: number;
    nodeId?: string;
    [key: string]: unknown;
}

export interface WorkflowLogger {
    debug(message: string, data?: Record<string, unknown>): void;
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void;
    child(additionalContext: Record<string, unknown>): WorkflowLogger;
}

// Note: Temporal workflows run in a V8 sandbox without access to process.env
const currentLogLevel: LogLevel = "info";

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLogLevel];
}

/**
 * Format data object as compact key=value pairs
 */
function formatData(data?: Record<string, unknown>): string {
    if (!data || Object.keys(data).length === 0) {
        return "";
    }

    const pairs = Object.entries(data)
        .map(([key, value]) => {
            if (typeof value === "string") {
                return `${key}="${value}"`;
            }
            if (typeof value === "object") {
                return `${key}=${JSON.stringify(value)}`;
            }
            return `${key}=${value}`;
        })
        .join(" ");

    return pairs ? ` ${pairs}` : "";
}

/**
 * Create a logger for Temporal workflows
 *
 * Output format: "message key=value key=value"
 * The Temporal SDK will prefix with [workflowType(workflowId)]
 */
export function createWorkflowLogger(context: WorkflowLogContext): WorkflowLogger {
    const baseData = {
        workflow: context.workflowName,
        ...(context.nodeId && { nodeId: context.nodeId })
    };

    const logMethod = (level: LogLevel) => {
        return (
            message: string,
            dataOrError?: Record<string, unknown> | Error | unknown,
            additionalData?: Record<string, unknown>
        ) => {
            if (!shouldLog(level)) {
                return;
            }

            let data: Record<string, unknown> | undefined;
            let error: Error | undefined;

            if (level === "error") {
                if (dataOrError instanceof Error) {
                    error = dataOrError;
                    data = additionalData;
                } else if (
                    dataOrError &&
                    typeof dataOrError === "object" &&
                    "message" in dataOrError
                ) {
                    error = dataOrError as Error;
                    data = additionalData;
                } else {
                    data = dataOrError as Record<string, unknown>;
                }
            } else {
                data = dataOrError as Record<string, unknown>;
            }

            const sanitizedData = data ? sanitizeLogData(data) : undefined;
            const mergedData = { ...baseData, ...sanitizedData };
            const dataStr = formatData(mergedData);

            // Format: "message key=value key=value"
            let output = `${message}${dataStr}`;

            if (error) {
                output += ` error="${error.message}"`;
            }

            // Use console methods - Temporal will forward to Runtime logger
            if (level === "error") {
                console.error(output);
            } else if (level === "warn") {
                console.warn(output);
            } else if (level === "debug") {
                console.debug(output);
            } else {
                console.log(output);
            }
        };
    };

    return {
        debug: logMethod("debug"),
        info: logMethod("info"),
        warn: logMethod("warn"),
        error: (message: string, error?: Error | unknown, data?: Record<string, unknown>) => {
            if (!shouldLog("error")) {
                return;
            }

            const sanitizedData = data ? sanitizeLogData(data) : undefined;
            const mergedData = { ...baseData, ...sanitizedData };
            const dataStr = formatData(mergedData);

            let errorStr = "";
            if (error instanceof Error) {
                errorStr = ` error="${error.message}"`;
            } else if (error) {
                errorStr = ` error="${String(error)}"`;
            }

            console.error(`${message}${dataStr}${errorStr}`);
        },
        child: (additionalContext: Record<string, unknown>): WorkflowLogger => {
            return createWorkflowLogger({
                ...context,
                ...additionalContext
            } as WorkflowLogContext);
        }
    };
}
