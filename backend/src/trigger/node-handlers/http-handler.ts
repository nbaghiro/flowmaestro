import { BaseNodeHandler, NodeHandlerInput, NodeHandlerOutput } from "./types";
import type { JsonObject, JsonValue } from "@flowmaestro/shared";

/**
 * HTTP method type.
 */
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

/**
 * Authentication type.
 */
type AuthType = "none" | "basic" | "bearer" | "api-key" | "oauth2";

/**
 * HTTPHandler - Handles HTTP/API request nodes.
 *
 * Supported node types:
 * - http: General HTTP requests
 * - api: API calls (alias for http)
 * - webhook: Outbound webhook calls
 * - rest: REST API calls
 */
export class HTTPHandler extends BaseNodeHandler {
    protected nodeTypes = ["http", "api", "webhook", "rest"];

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const { config, context } = input;

        try {
            // Extract configuration
            const url = this.resolveVariables(config.url as string, context);
            const method = ((config.method as string) || "GET").toUpperCase() as HttpMethod;
            const headers = this.resolveHeaders(config.headers as Record<string, string>, context);
            const body = this.resolveBody(config.body, method, context);
            const timeout = (config.timeout as number) || 30000;
            const auth = config.auth as
                | {
                      type: AuthType;
                      username?: string;
                      password?: string;
                      token?: string;
                      apiKey?: string;
                      headerName?: string;
                  }
                | undefined;

            // Validate URL
            if (!url) {
                throw new Error("URL is required for HTTP request");
            }

            // Apply authentication
            if (auth && auth.type !== "none") {
                this.applyAuth(headers, auth, context);
            }

            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                const response = await fetch(url, {
                    method,
                    headers,
                    body: body ? JSON.stringify(body) : undefined,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                // Parse response
                const contentType = response.headers.get("content-type") || "";
                let responseData: JsonValue;

                if (contentType.includes("application/json")) {
                    responseData = (await response.json()) as JsonValue;
                } else if (contentType.includes("text/")) {
                    responseData = await response.text();
                } else {
                    // Return as base64 for binary content
                    const buffer = await response.arrayBuffer();
                    responseData = Buffer.from(buffer).toString("base64");
                }

                const responseHeaders: Record<string, string> = {};
                response.headers.forEach((value, key) => {
                    responseHeaders[key] = value;
                });

                const durationMs = Date.now() - startTime;

                // Check if response indicates error
                if (!response.ok && config.failOnError !== false) {
                    return this.failure(
                        `HTTP ${response.status}: ${response.statusText}`,
                        {
                            code: `HTTP_${response.status}`,
                            activateErrorPort: true
                        }
                    );
                }

                return {
                    success: true,
                    data: {
                        status: response.status,
                        statusText: response.statusText,
                        headers: responseHeaders as JsonValue,
                        body: responseData,
                        ok: response.ok
                    },
                    metadata: {
                        durationMs,
                        method,
                        url
                    }
                };
            } catch (fetchError) {
                clearTimeout(timeoutId);

                if (fetchError instanceof Error && fetchError.name === "AbortError") {
                    throw new Error(`Request timeout after ${timeout}ms`);
                }
                throw fetchError;
            }
        } catch (error) {
            return this.failure(
                error instanceof Error ? error.message : String(error),
                {
                    code: "HTTP_ERROR",
                    activateErrorPort: true
                }
            );
        }
    }

    /**
     * Resolve variables in a string.
     */
    private resolveVariables(
        text: string,
        context: NodeHandlerInput["context"]
    ): string {
        if (!text) return text;

        return text.replace(/\{\{([^}]+)\}\}/g, (_match, path: string) => {
            const value = this.resolvePath(path.trim(), context);
            if (value === undefined || value === null) {
                return "";
            }
            if (typeof value === "object") {
                return JSON.stringify(value);
            }
            return String(value);
        });
    }

    /**
     * Resolve headers with variable substitution.
     */
    private resolveHeaders(
        headers: Record<string, string> | undefined,
        context: NodeHandlerInput["context"]
    ): Record<string, string> {
        const resolved: Record<string, string> = {
            "Content-Type": "application/json"
        };

        if (headers) {
            for (const [key, value] of Object.entries(headers)) {
                resolved[key] = this.resolveVariables(value, context);
            }
        }

        return resolved;
    }

    /**
     * Resolve request body with variable substitution.
     */
    private resolveBody(
        body: JsonValue | undefined,
        method: HttpMethod,
        context: NodeHandlerInput["context"]
    ): JsonObject | undefined {
        // No body for GET/HEAD/OPTIONS
        if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
            return undefined;
        }

        if (!body) return undefined;

        if (typeof body === "string") {
            // If body is a string, try to parse it as JSON with variables
            const resolved = this.resolveVariables(body, context);
            try {
                return JSON.parse(resolved) as JsonObject;
            } catch {
                // Return as-is if not valid JSON
                return { body: resolved } as JsonObject;
            }
        }

        if (typeof body === "object" && !Array.isArray(body)) {
            // Deep resolve variables in object
            return this.resolveObjectVariables(body as JsonObject, context);
        }

        return undefined;
    }

    /**
     * Recursively resolve variables in an object.
     */
    private resolveObjectVariables(
        obj: JsonObject,
        context: NodeHandlerInput["context"]
    ): JsonObject {
        const result: JsonObject = {};

        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === "string") {
                result[key] = this.resolveVariables(value, context);
            } else if (typeof value === "object" && value !== null) {
                if (Array.isArray(value)) {
                    result[key] = value.map((item) => {
                        if (typeof item === "string") {
                            return this.resolveVariables(item, context);
                        }
                        if (typeof item === "object" && item !== null) {
                            return this.resolveObjectVariables(
                                item as JsonObject,
                                context
                            );
                        }
                        return item;
                    });
                } else {
                    result[key] = this.resolveObjectVariables(
                        value as JsonObject,
                        context
                    );
                }
            } else {
                result[key] = value;
            }
        }

        return result;
    }

    /**
     * Apply authentication to headers.
     */
    private applyAuth(
        headers: Record<string, string>,
        auth: {
            type: AuthType;
            username?: string;
            password?: string;
            token?: string;
            apiKey?: string;
            headerName?: string;
        },
        context: NodeHandlerInput["context"]
    ): void {
        switch (auth.type) {
            case "basic": {
                const username = this.resolveVariables(auth.username || "", context);
                const password = this.resolveVariables(auth.password || "", context);
                const credentials = Buffer.from(`${username}:${password}`).toString("base64");
                headers["Authorization"] = `Basic ${credentials}`;
                break;
            }
            case "bearer": {
                const token = this.resolveVariables(auth.token || "", context);
                headers["Authorization"] = `Bearer ${token}`;
                break;
            }
            case "api-key": {
                const apiKey = this.resolveVariables(auth.apiKey || "", context);
                const headerName = auth.headerName || "X-API-Key";
                headers[headerName] = apiKey;
                break;
            }
            case "oauth2": {
                // OAuth2 token should be pre-fetched and passed as token
                const token = this.resolveVariables(auth.token || "", context);
                headers["Authorization"] = `Bearer ${token}`;
                break;
            }
        }
    }

    /**
     * Resolve a dot-notation path to a value.
     */
    private resolvePath(
        path: string,
        context: NodeHandlerInput["context"]
    ): unknown {
        const parts = path.split(".");
        const root = parts[0];

        let value: unknown;

        if (root === "inputs") {
            value = context.inputs;
        } else if (root === "variables" || root === "var") {
            value = context.workflowVariables;
        } else if (root === "loop" && context.loopContext) {
            value = context.loopContext;
        } else if (root === "parallel" && context.parallelContext) {
            value = context.parallelContext;
        } else if (context.nodeOutputs[root]) {
            value = context.nodeOutputs[root];
        } else {
            return undefined;
        }

        // Navigate remaining path
        for (let i = 1; i < parts.length && value != null; i++) {
            value = (value as Record<string, unknown>)[parts[i]];
        }

        return value;
    }
}
