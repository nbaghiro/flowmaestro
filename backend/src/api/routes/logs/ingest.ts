/**
 * POST /logs
 * Ingest client-side logs for centralized logging
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { config } from "../../../core/config";
import { getLogger, sanitizeLogData } from "../../../core/logging";

/**
 * Schema for client log entries
 */
const clientLogEntrySchema = z.object({
    level: z.enum(["debug", "info", "warn", "error"]),
    message: z.string().max(10000),
    timestamp: z.string(),
    traceId: z.string().optional(),
    sessionId: z.string(),
    userId: z.string().optional(),
    route: z.string().max(2000),
    userAgent: z.string().max(500),
    data: z.record(z.unknown()).optional(),
    error: z
        .object({
            name: z.string(),
            message: z.string(),
            stack: z.string().optional()
        })
        .optional()
});

/**
 * Schema for batched log request
 */
const clientLogBatchSchema = z.object({
    logs: z.array(clientLogEntrySchema).max(100) // Max 100 logs per batch
});

/**
 * Map client log levels to Pino log levels
 */
const LOG_LEVEL_MAP = {
    debug: "debug",
    info: "info",
    warn: "warn",
    error: "error"
} as const;

export async function ingestLogsRoute(fastify: FastifyInstance): Promise<void> {
    // Register in an encapsulated context with its own body limit
    await fastify.register(async (instance) => {
        // Remove inherited parser and add one with higher body limit for this route only
        instance.removeContentTypeParser("application/json");
        instance.addContentTypeParser(
            "application/json",
            { parseAs: "string", bodyLimit: 5 * 1024 * 1024 },
            (_req, body, done) => {
                try {
                    const json = body === "" ? {} : JSON.parse(body as string);
                    done(null, json);
                } catch (err) {
                    done(err as Error, undefined);
                }
            }
        );

        instance.post(
            "/logs",
            {
                config: {
                    rateLimit: {
                        max: 100,
                        timeWindow: "1 minute"
                    }
                }
            },
            async (request: FastifyRequest, reply: FastifyReply) => {
                // Return early if client log ingestion is disabled
                if (!config.logging.enableClientLogIngestion) {
                    return reply.status(204).send();
                }

                // Parse and validate request body
                const parseResult = clientLogBatchSchema.safeParse(request.body);

                if (!parseResult.success) {
                    return reply.status(400).send({
                        success: false,
                        error: "Invalid log batch format",
                        details: parseResult.error.issues
                    });
                }

                const { logs } = parseResult.data;

                if (logs.length === 0) {
                    return reply.status(204).send();
                }

                // Get server logger
                const logger = getLogger();

                // Create a child logger for client logs
                const clientLogger = logger.child({
                    source: "frontend",
                    service: "flowmaestro-frontend"
                });

                // Get authenticated user ID if available
                const authUserId = request.user?.id;

                // Get client IP for context
                const clientIp = request.ip;

                // Process each log entry
                for (const entry of logs) {
                    // Sanitize any data fields to redact PII
                    const sanitizedData = entry.data ? sanitizeLogData(entry.data) : undefined;

                    // Build log object
                    const logObj: Record<string, unknown> = {
                        clientTimestamp: entry.timestamp,
                        sessionId: entry.sessionId,
                        route: entry.route,
                        userAgent: entry.userAgent.substring(0, 200), // Truncate user agent
                        clientIp
                    };

                    // Add trace ID if present
                    if (entry.traceId) {
                        logObj.traceId = entry.traceId;
                    }

                    // Add user ID (prefer authenticated, fall back to client-provided)
                    if (authUserId) {
                        logObj.userId = authUserId;
                    } else if (entry.userId) {
                        logObj.userId = entry.userId;
                    }

                    // Add sanitized data
                    if (sanitizedData && Object.keys(sanitizedData).length > 0) {
                        logObj.data = sanitizedData;
                    }

                    // Add error details if present
                    if (entry.error) {
                        logObj.err = {
                            name: entry.error.name,
                            message: entry.error.message,
                            stack: entry.error.stack
                        };
                    }

                    // Log at the appropriate level
                    const level = LOG_LEVEL_MAP[entry.level];
                    clientLogger[level](logObj, entry.message);
                }

                // Return 204 No Content on success
                return reply.status(204).send();
            }
        );
    });
}
