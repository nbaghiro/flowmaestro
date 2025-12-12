import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { interpolateVariables } from "../../utils/node-execution/utils";

export interface HTTPNodeConfig {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    url: string;
    headers?: Array<{ key: string; value: string }>;
    queryParams?: Array<{ key: string; value: string }>;
    authType?: "none" | "basic" | "bearer" | "apiKey";
    authCredentials?: string;
    bodyType?: "json" | "form" | "raw";
    body?: string;
    timeout?: number;
    retryCount?: number;
    outputVariable?: string;
}

export interface HTTPNodeResult {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: JsonValue;
    responseTime: number;
}

/**
 * Execute HTTP node - makes HTTP requests with full configuration support
 */
export async function executeHTTPNode(
    config: HTTPNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const startTime = Date.now();

    // Interpolate variables in URL
    const url = interpolateVariables(config.url, context);

    // Build headers
    const headers: Record<string, string> = {};
    if (config.headers) {
        config.headers.forEach(({ key, value }) => {
            if (key) {
                headers[key] = interpolateVariables(value, context);
            }
        });
    }

    // Add authentication
    if (config.authType && config.authType !== "none") {
        const credentials = interpolateVariables(config.authCredentials || "", context);
        switch (config.authType) {
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
    if (config.queryParams) {
        config.queryParams.forEach(({ key, value }) => {
            if (key) {
                queryParams.append(key, interpolateVariables(value, context));
            }
        });
    }

    // Build final URL with query params
    const finalUrl = queryParams.toString() ? `${url}?${queryParams.toString()}` : url;

    // Build request body
    let body: string | undefined;
    if (config.body && ["POST", "PUT", "PATCH"].includes(config.method)) {
        const bodyString = interpolateVariables(config.body, context);

        if (config.bodyType === "json") {
            try {
                // Validate JSON
                JSON.parse(bodyString);
                body = bodyString;
                headers["Content-Type"] = "application/json";
            } catch (e) {
                throw new Error(`Invalid JSON in request body: ${e}`);
            }
        } else {
            body = bodyString;
        }
    }

    // Configure fetch request
    const timeout = (config.timeout || 30) * 1000; // Convert to milliseconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Execute with retries
    const maxRetries = config.retryCount || 0;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            console.log(
                `[HTTP] ${config.method} ${finalUrl} (attempt ${attempt + 1}/${maxRetries + 1})`
            );

            const response = await fetch(finalUrl, {
                method: config.method,
                headers,
                body,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const responseTime = Date.now() - startTime;

            console.log(
                `[HTTP] Response: ${response.status} ${response.statusText} (${responseTime}ms)`
            );

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

            if (config.outputVariable) {
                return { [config.outputVariable]: result } as unknown as JsonObject;
            }

            return result as unknown as JsonObject;
        } catch (error) {
            clearTimeout(timeoutId);

            lastError = error as Error;
            console.error(`[HTTP] Attempt ${attempt + 1} failed:`, error);

            // If this isn't the last attempt, wait before retrying
            if (attempt < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
                console.log(`[HTTP] Retrying in ${delay}ms...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    // All retries failed
    throw new Error(`HTTP request failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
}

/**
 * Interpolate ${variableName} references in strings with actual values from context
 */
