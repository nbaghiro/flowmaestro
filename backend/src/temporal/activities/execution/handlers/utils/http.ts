/**
 * HTTP Node Execution
 *
 * Complete execution logic and handler for HTTP request nodes.
 * Supports various authentication methods, retries, and request configuration.
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import {
    ProviderError,
    ValidationError,
    withHeartbeat,
    getCancellationSignal,
    createActivityLogger,
    interpolateVariables,
    getExecutionContext
} from "../../../../core";
import { HTTPNodeConfigSchema, validateOrThrow, type HTTPNodeConfig } from "../../../../core";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";

const logger = createActivityLogger({ nodeType: "HTTP" });

// ============================================================================
// TYPES
// ============================================================================

export type { HTTPNodeConfig };

export interface HTTPNodeResult {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: JsonValue;
    responseTime: number;
}

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute HTTP node - makes HTTP requests with full configuration support
 */
export async function executeHTTPNode(config: unknown, context: JsonObject): Promise<JsonObject> {
    // Validate config with Zod schema
    const validatedConfig = validateOrThrow(HTTPNodeConfigSchema, config, "HTTP");

    return withHeartbeat("http", async (heartbeat) => {
        const startTime = Date.now();

        heartbeat.update({ step: "preparing_request", url: validatedConfig.url });

        // Interpolate variables in URL
        const url = interpolateVariables(validatedConfig.url, context);

        // Build headers
        const headers: Record<string, string> = {};
        if (validatedConfig.headers) {
            validatedConfig.headers.forEach(({ key, value }) => {
                if (key) {
                    headers[key] = interpolateVariables(value, context);
                }
            });
        }

        // Add authentication
        if (validatedConfig.authType && validatedConfig.authType !== "none") {
            const credentials = interpolateVariables(
                validatedConfig.authCredentials || "",
                context
            );
            switch (validatedConfig.authType) {
                case "basic": {
                    const [username, password] = credentials.split(":");
                    const basicAuth = Buffer.from(`${username}:${password}`).toString("base64");
                    headers["Authorization"] = `Basic ${basicAuth}`;
                    break;
                }
                case "bearer":
                    headers["Authorization"] = `Bearer ${credentials}`;
                    break;
                case "apiKey":
                    headers["X-API-Key"] = credentials;
                    break;
            }
        }

        // Build query params
        const queryParams = new URLSearchParams();
        if (validatedConfig.queryParams) {
            validatedConfig.queryParams.forEach(({ key, value }) => {
                if (key) {
                    queryParams.append(key, interpolateVariables(value, context));
                }
            });
        }

        // Build final URL with query params
        const finalUrl = queryParams.toString() ? `${url}?${queryParams.toString()}` : url;

        // Build request body
        let body: string | undefined;
        const method = validatedConfig.method || "GET";
        const methodsWithBody: string[] = ["POST", "PUT", "PATCH"];
        if (validatedConfig.body && methodsWithBody.includes(method)) {
            const bodyString = interpolateVariables(validatedConfig.body, context);

            if (validatedConfig.bodyType === "json") {
                try {
                    // Validate JSON
                    JSON.parse(bodyString);
                    body = bodyString;
                    headers["Content-Type"] = "application/json";
                } catch (e) {
                    throw new ValidationError(`Invalid JSON in request body: ${e}`, "body");
                }
            } else {
                body = bodyString;
            }
        }

        // Configure fetch request
        const timeout = (validatedConfig.timeout || 30) * 1000; // Convert to milliseconds
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Connect cancellation signal from Temporal
        const temporalSignal = getCancellationSignal();
        if (temporalSignal) {
            temporalSignal.addEventListener("abort", () => controller.abort());
        }

        // Execute with retries
        const maxRetries = validatedConfig.retryCount || 0;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                heartbeat.update({
                    step: "sending_request",
                    method,
                    attempt: attempt + 1,
                    maxAttempts: maxRetries + 1
                });
                logger.info("Sending HTTP request", {
                    method,
                    url: finalUrl,
                    attempt: attempt + 1,
                    maxAttempts: maxRetries + 1
                });

                const response = await fetch(finalUrl, {
                    method,
                    headers,
                    body,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                heartbeat.update({ step: "processing_response", status: response.status });

                const responseTime = Date.now() - startTime;

                logger.info("HTTP response received", {
                    status: response.status,
                    statusText: response.statusText,
                    responseTime
                });

                // Parse response data
                let data: JsonValue = null;
                const contentType = response.headers.get("content-type");

                if (contentType?.includes("application/json")) {
                    const text = await response.text();
                    data = text ? JSON.parse(text) : null;
                } else if (contentType?.includes("text/")) {
                    data = await response.text();
                } else {
                    // For other types, return as text
                    data = await response.text();
                }

                // Convert headers to plain object
                const responseHeaders: Record<string, string> = {};
                response.headers.forEach((value, key) => {
                    responseHeaders[key] = value;
                });

                const result: HTTPNodeResult = {
                    status: response.status,
                    statusText: response.statusText,
                    headers: responseHeaders,
                    data,
                    responseTime
                };

                if (validatedConfig.outputVariable) {
                    return { [validatedConfig.outputVariable]: result } as unknown as JsonObject;
                }

                return result as unknown as JsonObject;
            } catch (error) {
                clearTimeout(timeoutId);

                lastError = error as Error;
                logger.warn("HTTP request attempt failed", {
                    attempt: attempt + 1,
                    error: lastError.message
                });

                // If this isn't the last attempt, wait before retrying
                if (attempt < maxRetries) {
                    heartbeat.update({ step: "retrying", attempt: attempt + 1 });
                    const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
                    logger.debug("Retrying HTTP request", { delay });
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }

        // All retries failed
        throw new ProviderError(
            "HTTP",
            0,
            `Request failed after ${maxRetries + 1} attempts: ${lastError?.message}`
        );
    });
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for HTTP node type.
 */
export class HTTPNodeHandler extends BaseNodeHandler {
    readonly name = "HTTPNodeHandler";
    readonly supportedNodeTypes = ["http"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const context = getExecutionContext(input.context);

        const result = await executeHTTPNode(input.nodeConfig, context);

        return this.success(
            result,
            {},
            {
                durationMs: Date.now() - startTime
            }
        );
    }
}

/**
 * Factory function for creating HTTP handler.
 */
export function createHTTPNodeHandler(): HTTPNodeHandler {
    return new HTTPNodeHandler();
}
