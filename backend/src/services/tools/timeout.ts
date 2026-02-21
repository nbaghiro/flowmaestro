/**
 * Tool Execution Timeout Utility
 *
 * Wraps tool execution with configurable timeouts to prevent
 * hanging executions from blocking agent loops indefinitely.
 *
 * Critical Gap Fix: Prevents slow/hanging MCP tools or external
 * integrations from blocking agent execution forever.
 */

import { createServiceLogger } from "../../core/logging";

const logger = createServiceLogger("ToolTimeout");

/**
 * Default timeouts by tool type (in milliseconds)
 */
export const DEFAULT_TOOL_TIMEOUTS: Record<string, number> = {
    // Built-in tools - generally fast
    function: 30000, // 30 seconds
    knowledge_base: 60000, // 60 seconds (vector search can be slow)

    // External integrations - need more time
    mcp: 120000, // 2 minutes for MCP tools
    workflow: 300000, // 5 minutes for nested workflows
    agent: 600000, // 10 minutes for nested agents

    // Default for unknown types
    default: 60000 // 1 minute
};

/**
 * Tool timeout configuration
 */
export interface ToolTimeoutConfig {
    /** Timeout in milliseconds */
    timeoutMs: number;
    /** Optional custom timeouts per tool name */
    toolOverrides?: Record<string, number>;
}

/**
 * Error thrown when tool execution times out
 */
export class ToolTimeoutError extends Error {
    public readonly toolName: string;
    public readonly toolType: string;
    public readonly timeoutMs: number;
    public readonly startTime: number;

    constructor(toolName: string, toolType: string, timeoutMs: number, startTime: number) {
        super(
            `Tool "${toolName}" (type: ${toolType}) timed out after ${timeoutMs}ms. ` +
                "Consider increasing the timeout or checking the tool's external dependencies."
        );
        this.name = "ToolTimeoutError";
        this.toolName = toolName;
        this.toolType = toolType;
        this.timeoutMs = timeoutMs;
        this.startTime = startTime;
    }
}

/**
 * Execute a tool function with timeout
 *
 * @param toolName Name of the tool being executed
 * @param toolType Type of the tool (function, mcp, workflow, etc.)
 * @param executeFn The async function that executes the tool
 * @param config Optional timeout configuration
 * @returns The result of the tool execution
 * @throws ToolTimeoutError if execution exceeds timeout
 */
export async function executeWithTimeout<T>(
    toolName: string,
    toolType: string,
    executeFn: (signal: AbortSignal) => Promise<T>,
    config?: Partial<ToolTimeoutConfig>
): Promise<T> {
    // Determine timeout
    const baseTimeout = DEFAULT_TOOL_TIMEOUTS[toolType] || DEFAULT_TOOL_TIMEOUTS.default;
    const toolOverride = config?.toolOverrides?.[toolName];
    const timeoutMs = config?.timeoutMs || toolOverride || baseTimeout;

    const startTime = Date.now();
    const controller = new AbortController();
    const { signal } = controller;

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
            controller.abort();
            reject(new ToolTimeoutError(toolName, toolType, timeoutMs, startTime));
        }, timeoutMs);

        // Clean up timeout if execution completes first
        signal.addEventListener("abort", () => clearTimeout(timeoutId));
    });

    try {
        // Race between execution and timeout
        const result = await Promise.race([executeFn(signal), timeoutPromise]);

        const duration = Date.now() - startTime;
        if (duration > timeoutMs * 0.8) {
            // Warn if execution was close to timeout
            logger.warn(
                { toolName, toolType, duration, timeoutMs },
                "Tool execution completed but was close to timeout threshold"
            );
        }

        return result;
    } catch (error) {
        if (error instanceof ToolTimeoutError) {
            logger.error({ toolName, toolType, timeoutMs, startTime }, "Tool execution timed out");
            throw error;
        }

        // Re-throw other errors
        throw error;
    }
}

/**
 * Create a wrapped version of an async function with timeout
 *
 * @param toolName Name of the tool
 * @param toolType Type of the tool
 * @param config Optional timeout configuration
 * @returns A function wrapper that adds timeout behavior
 */
export function withTimeout<TArgs extends unknown[], TResult>(
    toolName: string,
    toolType: string,
    config?: Partial<ToolTimeoutConfig>
): (
    fn: (signal: AbortSignal, ...args: TArgs) => Promise<TResult>
) => (...args: TArgs) => Promise<TResult> {
    return (fn) => {
        return (...args: TArgs) => {
            return executeWithTimeout(toolName, toolType, (signal) => fn(signal, ...args), config);
        };
    };
}

/**
 * Check if an error is an abort error (from AbortController)
 */
export function isAbortError(error: unknown): boolean {
    if (error instanceof Error) {
        return error.name === "AbortError" || error.message.includes("aborted");
    }
    return false;
}

/**
 * Helper to create a fetch request that respects the abort signal
 */
export async function fetchWithSignal(
    url: string,
    options: RequestInit & { signal?: AbortSignal }
): Promise<Response> {
    const response = await fetch(url, options);
    return response;
}

/**
 * Get the appropriate timeout for a tool
 */
export function getToolTimeout(
    toolName: string,
    toolType: string,
    overrides?: Record<string, number>
): number {
    // Check for specific tool override
    if (overrides?.[toolName]) {
        return overrides[toolName];
    }

    // Check for tool type default
    if (DEFAULT_TOOL_TIMEOUTS[toolType]) {
        return DEFAULT_TOOL_TIMEOUTS[toolType];
    }

    // Fall back to default
    return DEFAULT_TOOL_TIMEOUTS.default;
}
