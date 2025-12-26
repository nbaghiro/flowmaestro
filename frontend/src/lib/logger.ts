/**
 * Frontend Structured Logger
 *
 * Provides centralized logging with:
 * - Correlation ID capture from API responses
 * - Batched log shipping to backend
 * - Session context tracking
 * - PII redaction
 * - Log level control
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

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
    "clientsecret",
    "client_secret",
    "clientSecret",
    "authorization",
    "cookie",
    "creditcard",
    "credit_card",
    "creditCard",
    "ssn"
]);

const REDACTED = "[REDACTED]";

/**
 * Log entry structure for batched shipping
 */
export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    traceId?: string;
    sessionId: string;
    userId?: string;
    route: string;
    userAgent: string;
    data?: Record<string, unknown>;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

/**
 * Logger configuration
 */
interface LoggerConfig {
    /** Minimum log level to capture */
    level: LogLevel;
    /** Flush interval in ms */
    flushIntervalMs: number;
    /** Max entries before forcing flush */
    maxBatchSize: number;
    /** API endpoint for log ingestion */
    apiEndpoint: string;
    /** Enable console output in development */
    enableConsole: boolean;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

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

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Get or create session ID from sessionStorage
 */
function getSessionId(): string {
    const STORAGE_KEY = "flowmaestro_session_id";
    try {
        let sessionId = sessionStorage.getItem(STORAGE_KEY);
        if (!sessionId) {
            sessionId = generateSessionId();
            sessionStorage.setItem(STORAGE_KEY, sessionId);
        }
        return sessionId;
    } catch {
        // sessionStorage not available (SSR, incognito, etc.)
        return generateSessionId();
    }
}

/**
 * Frontend Logger Class
 */
class FrontendLogger {
    private queue: LogEntry[] = [];
    private config: LoggerConfig;
    private sessionId: string;
    private userId: string | null = null;
    private lastTraceId: string | null = null;
    private flushTimer: ReturnType<typeof setTimeout> | null = null;
    private isFlushing = false;

    constructor() {
        this.sessionId = getSessionId();
        this.config = {
            level: (import.meta.env.VITE_LOG_LEVEL as LogLevel) || "info",
            flushIntervalMs: 5000,
            maxBatchSize: 50,
            apiEndpoint: `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/logs`,
            enableConsole: import.meta.env.DEV
        };

        // Start flush timer
        this.startFlushTimer();

        // Flush on page unload
        if (typeof window !== "undefined") {
            window.addEventListener("beforeunload", () => this.flushSync());
            window.addEventListener("pagehide", () => this.flushSync());
        }
    }

    /**
     * Capture correlation IDs from API response headers
     */
    captureCorrelationId(response: Response): void {
        const traceId = response.headers.get("X-Trace-ID");

        if (traceId) {
            this.lastTraceId = traceId;
        }
    }

    /**
     * Set user context when authenticated
     */
    setUser(userId: string | null): void {
        this.userId = userId;
    }

    /**
     * Get the last captured trace ID
     */
    getLastTraceId(): string | null {
        return this.lastTraceId;
    }

    /**
     * Get the session ID
     */
    getSessionId(): string {
        return this.sessionId;
    }

    /**
     * Check if a log level should be logged
     */
    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.level];
    }

    /**
     * Create a log entry
     */
    private createEntry(
        level: LogLevel,
        message: string,
        data?: Record<string, unknown>,
        error?: Error
    ): LogEntry {
        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            route: typeof window !== "undefined" ? window.location.pathname : "/",
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown"
        };

        if (this.lastTraceId) {
            entry.traceId = this.lastTraceId;
        }

        if (this.userId) {
            entry.userId = this.userId;
        }

        if (data) {
            entry.data = sanitizeLogData(data);
        }

        if (error) {
            entry.error = {
                name: error.name,
                message: error.message,
                stack: error.stack
            };
        }

        return entry;
    }

    /**
     * Add entry to queue and potentially flush
     */
    private log(
        level: LogLevel,
        message: string,
        data?: Record<string, unknown>,
        error?: Error
    ): void {
        if (!this.shouldLog(level)) {
            return;
        }

        const entry = this.createEntry(level, message, data, error);
        this.queue.push(entry);

        // Console output in development
        if (this.config.enableConsole) {
            const consoleMethod =
                level === "error" ? console.error : level === "warn" ? console.warn : console.log;
            const prefix = `[${level.toUpperCase()}]`;
            if (error) {
                consoleMethod(prefix, message, data || "", error);
            } else if (data) {
                consoleMethod(prefix, message, data);
            } else {
                consoleMethod(prefix, message);
            }
        }

        // Flush if batch is full
        if (this.queue.length >= this.config.maxBatchSize) {
            this.flush();
        }
    }

    /**
     * Debug level log
     */
    debug(message: string, data?: Record<string, unknown>): void {
        this.log("debug", message, data);
    }

    /**
     * Info level log
     */
    info(message: string, data?: Record<string, unknown>): void {
        this.log("info", message, data);
    }

    /**
     * Warning level log
     */
    warn(message: string, data?: Record<string, unknown>): void {
        this.log("warn", message, data);
    }

    /**
     * Error level log
     */
    error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
        const errorObj =
            error instanceof Error ? error : error ? new Error(String(error)) : undefined;
        this.log("error", message, data, errorObj);
    }

    /**
     * Start the flush timer
     */
    private startFlushTimer(): void {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
        }
        this.flushTimer = setTimeout(() => {
            this.flush();
            this.startFlushTimer();
        }, this.config.flushIntervalMs);
    }

    /**
     * Async flush logs to backend
     */
    async flush(): Promise<void> {
        if (this.isFlushing || this.queue.length === 0) {
            return;
        }

        this.isFlushing = true;
        const entries = this.queue;
        this.queue = [];

        try {
            const token = localStorage.getItem("token");
            const headers: Record<string, string> = {
                "Content-Type": "application/json"
            };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
            // Add session ID header for unauthenticated requests
            headers["X-Session-ID"] = this.sessionId;

            const response = await fetch(this.config.apiEndpoint, {
                method: "POST",
                headers,
                body: JSON.stringify({ logs: entries })
            });

            if (!response.ok) {
                // Put entries back in queue
                this.queue = [...entries, ...this.queue];
                // Console fallback
                if (this.config.enableConsole) {
                    console.warn(
                        "[Logger] Failed to flush logs to backend, entries queued for retry"
                    );
                }
            }
        } catch {
            // Put entries back in queue
            this.queue = [...entries, ...this.queue];
            // Console fallback
            if (this.config.enableConsole) {
                console.warn("[Logger] Failed to flush logs to backend, entries queued for retry");
            }
        } finally {
            this.isFlushing = false;
        }
    }

    /**
     * Synchronous flush using sendBeacon (for page unload)
     */
    flushSync(): void {
        if (this.queue.length === 0 || typeof navigator === "undefined" || !navigator.sendBeacon) {
            return;
        }

        const entries = this.queue;
        this.queue = [];

        try {
            const blob = new Blob([JSON.stringify({ logs: entries })], {
                type: "application/json"
            });
            navigator.sendBeacon(this.config.apiEndpoint, blob);
        } catch {
            // Best effort, nothing we can do on page unload
        }
    }

    /**
     * Update logger configuration
     */
    configure(config: Partial<LoggerConfig>): void {
        this.config = { ...this.config, ...config };
    }
}

// Export singleton instance
export const logger = new FrontendLogger();

// Export class for testing
export { FrontendLogger };
