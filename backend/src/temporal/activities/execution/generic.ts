/**
 * Generic Handler
 *
 * Fallback handler for unknown or custom node types.
 * Provides basic execution with configurable behavior.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { activityLogger } from "../../core/logger";
import { BaseNodeHandler } from "./types";
import type { NodeHandlerInput, NodeHandlerOutput } from "./types";

// ============================================================================
// GENERIC NODE HANDLER
// ============================================================================

/**
 * Generic fallback handler for unknown node types.
 * This handler will accept any node type as a last resort.
 */
export class GenericNodeHandler extends BaseNodeHandler {
    readonly name = "GenericNodeHandler";
    readonly supportedNodeTypes = [] as readonly string[]; // Empty - accepts all as fallback

    /**
     * Override canHandle to accept all node types as fallback.
     * This handler should be registered with lowest priority.
     */
    canHandle(_nodeType: string): boolean {
        return true; // Accept all node types as fallback
    }

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();

        // Log warning about using generic handler
        activityLogger.warn(
            `No specific handler found for node type: ${input.nodeType}. Using generic handler.`,
            { nodeType: input.nodeType, nodeId: input.metadata.nodeId }
        );

        // Try to execute based on common patterns
        const result = await this.executeGeneric(input);

        return this.success(
            result,
            {},
            {
                durationMs: Date.now() - startTime
            }
        );
    }

    /**
     * Generic execution logic based on node configuration.
     */
    private async executeGeneric(input: NodeHandlerInput): Promise<JsonObject> {
        const config = input.nodeConfig;

        // If config has an 'outputVariable', use it to wrap the result
        const outputVariable =
            typeof config.outputVariable === "string" ? config.outputVariable : undefined;

        // Build result from config
        const result: JsonObject = {
            nodeType: input.nodeType,
            executed: true,
            timestamp: Date.now()
        };

        // Include any value from config
        if ("value" in config) {
            result.value = config.value;
        }

        // Include message if present
        if (typeof config.message === "string") {
            result.message = config.message;
        }

        // Wrap in output variable if specified
        if (outputVariable) {
            return { [outputVariable]: result };
        }

        return result;
    }
}

// ============================================================================
// PASS-THROUGH HANDLER
// ============================================================================

/**
 * Pass-through handler for nodes that just forward data.
 * Used for connector nodes, labels, annotations, etc.
 */
export class PassThroughNodeHandler extends BaseNodeHandler {
    readonly name = "PassThroughNodeHandler";
    readonly supportedNodeTypes = ["annotation", "label", "comment", "group", "note"] as const;

    async execute(_input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        // Pass-through nodes don't modify context
        return this.success({}, {}, { durationMs: 0 });
    }
}

// ============================================================================
// NO-OP HANDLER
// ============================================================================

/**
 * No-op handler for nodes that should be skipped.
 */
export class NoOpNodeHandler extends BaseNodeHandler {
    readonly name = "NoOpNodeHandler";
    readonly supportedNodeTypes = ["noop", "skip", "placeholder"] as const;

    async execute(_input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        return this.success({ skipped: true }, {}, { durationMs: 0 });
    }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Factory function for creating generic handler.
 */
export function createGenericNodeHandler(): GenericNodeHandler {
    return new GenericNodeHandler();
}

/**
 * Factory function for creating pass-through handler.
 */
export function createPassThroughNodeHandler(): PassThroughNodeHandler {
    return new PassThroughNodeHandler();
}

/**
 * Factory function for creating no-op handler.
 */
export function createNoOpNodeHandler(): NoOpNodeHandler {
    return new NoOpNodeHandler();
}
