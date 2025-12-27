import type { NodeHandler, NodeHandlerInput, NodeHandlerOutput } from "./types";

/**
 * GenericHandler - Fallback handler for unknown node types.
 */
class GenericHandler implements NodeHandler {
    canHandle(_nodeType: string): boolean {
        return true; // Handles any type as fallback
    }

    getSupportedTypes(): string[] {
        return ["*"]; // Wildcard
    }

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        // Log warning about unhandled node type
        console.warn(
            `No handler found for node type "${input.nodeType}". ` +
                `Node "${input.nodeId}" will pass through unchanged.`
        );

        // Pass through with warning
        return {
            success: true,
            data: {
                __warning: `No handler for node type: ${input.nodeType}`,
                __nodeId: input.nodeId,
                __config: input.config
            }
        };
    }
}

/**
 * NodeHandlerRegistry - Manages and routes to node handlers.
 *
 * Features:
 * - Pluggable handler registration
 * - Type-based handler routing
 * - Fallback to generic handler
 * - Handler discovery
 */
export class NodeHandlerRegistry {
    private handlers: NodeHandler[] = [];
    private genericHandler = new GenericHandler();
    private typeCache = new Map<string, NodeHandler>();

    /**
     * Register a handler.
     */
    register(handler: NodeHandler): void {
        this.handlers.push(handler);
        // Clear cache when handlers change
        this.typeCache.clear();
    }

    /**
     * Register multiple handlers.
     */
    registerAll(handlers: NodeHandler[]): void {
        for (const handler of handlers) {
            this.register(handler);
        }
    }

    /**
     * Get the handler for a node type.
     * Returns generic handler if no specific handler is found.
     */
    getHandler(nodeType: string): NodeHandler {
        // Check cache first
        const cached = this.typeCache.get(nodeType);
        if (cached) {
            return cached;
        }

        // Find handler that can handle this type
        const handler = this.handlers.find((h) => h.canHandle(nodeType));

        if (handler) {
            this.typeCache.set(nodeType, handler);
            return handler;
        }

        // Fall back to generic handler
        return this.genericHandler;
    }

    /**
     * Check if a specific handler exists for a node type.
     */
    hasHandler(nodeType: string): boolean {
        return this.handlers.some((h) => h.canHandle(nodeType));
    }

    /**
     * Get all registered handlers.
     */
    getHandlers(): NodeHandler[] {
        return [...this.handlers];
    }

    /**
     * Get all supported node types.
     */
    getSupportedTypes(): string[] {
        const types = new Set<string>();
        for (const handler of this.handlers) {
            for (const type of handler.getSupportedTypes()) {
                types.add(type);
            }
        }
        return Array.from(types);
    }

    /**
     * Execute a node using the appropriate handler.
     */
    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const handler = this.getHandler(input.nodeType);
        return handler.execute(input);
    }

    /**
     * Clear all registered handlers.
     */
    clear(): void {
        this.handlers = [];
        this.typeCache.clear();
    }
}

// Create and export singleton instance
export const handlerRegistry = new NodeHandlerRegistry();
