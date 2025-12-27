import type { JsonObject, JsonSchema } from "@flowmaestro/shared";
import type { ContextSnapshot } from "../shared/context-manager";

/**
 * Input to a node handler.
 */
export interface NodeHandlerInput {
    /** Unique node identifier */
    nodeId: string;

    /** Node type (e.g., "llm", "http", "conditional") */
    nodeType: string;

    /** Node display name */
    nodeName: string;

    /** Node configuration */
    config: JsonObject;

    /** Current execution context snapshot */
    context: ContextSnapshot;

    /** User ID executing the workflow */
    userId: string;

    /** Execution ID */
    executionId: string;

    /** Optional: Connection ID for integrations */
    connectionId?: string;
}

/**
 * Output from a node handler.
 */
export interface NodeHandlerOutput {
    /** Whether the node executed successfully */
    success: boolean;

    /** Output data from the node */
    data?: JsonObject;

    /** Error information if success is false */
    error?: {
        message: string;
        code?: string;
        stack?: string;
        retryable?: boolean;
    };

    /** Signals for the executor */
    signals?: NodeSignals;

    /** Streaming information */
    streaming?: {
        /** Stream ID for Trigger.dev Realtime */
        streamId: string;
        /** Token usage for LLM nodes */
        tokenUsage?: {
            input: number;
            output: number;
            model: string;
        };
    };

    /** Execution metadata */
    metadata?: {
        /** Execution duration in milliseconds */
        durationMs?: number;
        /** Node-specific metadata */
        [key: string]: unknown;
    };
}

/**
 * Signals that control execution flow.
 */
export interface NodeSignals {
    /** Pause execution and wait for user input */
    pause?: {
        /** Reason for pausing */
        reason: string;
        /** Waitpoint ID for resuming */
        waitpointId: string;
        /** Expected input schema */
        expectedInput?: JsonSchema;
    };

    /** Activate the error output port */
    activateErrorPort?: boolean;

    /** Selected route for router/switch nodes */
    selectedRoute?: string;

    /** Mark this branch as terminal */
    isTerminal?: boolean;

    /** Loop control signal */
    loopControl?: "continue" | "break";

    /** Variables to set in the workflow context */
    setVariables?: Record<string, unknown>;
}

/**
 * Node handler interface.
 * All node types implement this interface.
 */
export interface NodeHandler {
    /**
     * Check if this handler can handle the given node type.
     */
    canHandle(nodeType: string): boolean;

    /**
     * Execute the node.
     */
    execute(input: NodeHandlerInput): Promise<NodeHandlerOutput>;

    /**
     * Get supported node types for this handler.
     */
    getSupportedTypes(): string[];
}

/**
 * Abstract base class for node handlers.
 */
export abstract class BaseNodeHandler implements NodeHandler {
    protected abstract nodeTypes: string[];

    canHandle(nodeType: string): boolean {
        return this.nodeTypes.includes(nodeType);
    }

    getSupportedTypes(): string[] {
        return this.nodeTypes;
    }

    abstract execute(input: NodeHandlerInput): Promise<NodeHandlerOutput>;

    /**
     * Helper to create a successful output.
     */
    protected success(
        data: JsonObject,
        metadata?: NodeHandlerOutput["metadata"]
    ): NodeHandlerOutput {
        return {
            success: true,
            data,
            metadata
        };
    }

    /**
     * Helper to create a failed output.
     */
    protected failure(
        message: string,
        options?: {
            code?: string;
            stack?: string;
            retryable?: boolean;
            activateErrorPort?: boolean;
        }
    ): NodeHandlerOutput {
        return {
            success: false,
            error: {
                message,
                code: options?.code,
                stack: options?.stack,
                retryable: options?.retryable ?? false
            },
            signals: options?.activateErrorPort ? { activateErrorPort: true } : undefined
        };
    }

    /**
     * Helper to create a pause signal.
     */
    protected pause(
        waitpointId: string,
        reason: string,
        expectedInput?: JsonSchema
    ): NodeHandlerOutput {
        return {
            success: true,
            signals: {
                pause: { waitpointId, reason, expectedInput }
            }
        };
    }

    /**
     * Helper to create a route selection signal.
     */
    protected route(route: string, data?: JsonObject): NodeHandlerOutput {
        return {
            success: true,
            data,
            signals: { selectedRoute: route }
        };
    }
}

/**
 * Handler category type.
 */
export type HandlerCategory =
    | "llm"
    | "http"
    | "transform"
    | "logic"
    | "integration"
    | "control-flow"
    | "agent"
    | "input-output";
