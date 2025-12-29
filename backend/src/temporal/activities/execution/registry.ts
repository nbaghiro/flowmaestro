/**
 * Handler Registry
 *
 * Manages registration and lookup of node handlers.
 * Uses a first-match-wins approach based on priority.
 */

import type {
    NodeHandler,
    NodeHandlerFactory,
    NodeHandlerCategory,
    HandlerRegistration,
    NodeHandlerInput,
    NodeHandlerOutput
} from "./types";

// ============================================================================
// REGISTRY STATE
// ============================================================================

/**
 * Global handler registry.
 * Handlers are sorted by priority (lower = higher priority).
 */
const registeredHandlers: HandlerRegistration[] = [];

/**
 * Cache of node type to handler mappings.
 * Cleared when handlers are registered/unregistered.
 */
const handlerCache = new Map<string, NodeHandler | null>();

// ============================================================================
// REGISTRATION FUNCTIONS
// ============================================================================

/**
 * Register a node handler.
 *
 * @param handler - The handler to register
 * @param category - Handler category for organization
 * @param priority - Priority for lookup (lower = higher priority, default 100)
 */
export function registerHandler(
    handler: NodeHandler,
    category: NodeHandlerCategory,
    priority: number = 100
): void {
    registeredHandlers.push({ handler, category, priority });

    // Sort by priority (lower = higher priority)
    registeredHandlers.sort((a, b) => a.priority - b.priority);

    // Clear cache when handlers change
    handlerCache.clear();
}

/**
 * Register a handler factory for lazy initialization.
 *
 * @param factory - Factory function that creates the handler
 * @param category - Handler category
 * @param priority - Priority (lower = higher priority)
 */
export function registerHandlerFactory(
    factory: NodeHandlerFactory,
    category: NodeHandlerCategory,
    priority: number = 100
): void {
    // Create handler lazily on first access
    let handler: NodeHandler | null = null;

    const lazyHandler: NodeHandler = {
        get name(): string {
            if (!handler) handler = factory();
            return handler.name;
        },
        get supportedNodeTypes(): readonly string[] {
            if (!handler) handler = factory();
            return handler.supportedNodeTypes;
        },
        canHandle(nodeType: string): boolean {
            if (!handler) handler = factory();
            return handler.canHandle(nodeType);
        },
        execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
            if (!handler) handler = factory();
            return handler.execute(input);
        }
    };

    registerHandler(lazyHandler, category, priority);
}

// ============================================================================
// LOOKUP FUNCTIONS
// ============================================================================

/**
 * Find a handler for the given node type.
 * Uses first-match-wins based on priority order.
 *
 * @param nodeType - The node type to find a handler for
 * @returns The matching handler, or null if none found
 */
export function findHandler(nodeType: string): NodeHandler | null {
    // Check cache first
    if (handlerCache.has(nodeType)) {
        return handlerCache.get(nodeType) ?? null;
    }

    // Find first matching handler
    for (const registration of registeredHandlers) {
        if (registration.handler.canHandle(nodeType)) {
            handlerCache.set(nodeType, registration.handler);
            return registration.handler;
        }
    }

    // No handler found
    handlerCache.set(nodeType, null);
    return null;
}

/**
 * Get handler for node type, throwing if not found.
 *
 * @param nodeType - The node type
 * @returns The handler
 * @throws Error if no handler found
 */
export function getHandler(nodeType: string): NodeHandler {
    const handler = findHandler(nodeType);
    if (!handler) {
        throw new Error(`No handler registered for node type: ${nodeType}`);
    }
    return handler;
}

/**
 * Check if a handler exists for the given node type.
 *
 * @param nodeType - The node type to check
 * @returns True if a handler exists
 */
export function hasHandler(nodeType: string): boolean {
    return findHandler(nodeType) !== null;
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get all registered handlers.
 *
 * @returns Array of handler registrations
 */
export function getAllHandlers(): readonly HandlerRegistration[] {
    return [...registeredHandlers];
}

/**
 * Get handlers by category.
 *
 * @param category - The category to filter by
 * @returns Array of handlers in that category
 */
export function getHandlersByCategory(category: NodeHandlerCategory): NodeHandler[] {
    return registeredHandlers.filter((reg) => reg.category === category).map((reg) => reg.handler);
}

/**
 * Get all supported node types across all handlers.
 *
 * @returns Set of node type strings
 */
export function getSupportedNodeTypes(): Set<string> {
    const types = new Set<string>();

    for (const registration of registeredHandlers) {
        for (const nodeType of registration.handler.supportedNodeTypes) {
            types.add(nodeType);
        }
    }

    return types;
}

// ============================================================================
// MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Unregister all handlers.
 * Primarily used for testing.
 */
export function clearHandlers(): void {
    registeredHandlers.length = 0;
    handlerCache.clear();
}

/**
 * Unregister a specific handler.
 *
 * @param handlerName - Name of the handler to remove
 * @returns True if handler was removed
 */
export function unregisterHandler(handlerName: string): boolean {
    const index = registeredHandlers.findIndex((reg) => reg.handler.name === handlerName);

    if (index >= 0) {
        registeredHandlers.splice(index, 1);
        handlerCache.clear();
        return true;
    }

    return false;
}

// ============================================================================
// EXECUTION FUNCTIONS
// ============================================================================

/**
 * Execute a node using the registry.
 * Finds the appropriate handler and executes the node.
 *
 * @param input - Node handler input
 * @returns Handler output with result and signals
 * @throws Error if no handler found
 */
export async function executeWithRegistry(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
    const handler = getHandler(input.nodeType);
    return handler.execute(input);
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get registry statistics.
 *
 * @returns Registry stats
 */
export function getRegistryStats(): {
    handlerCount: number;
    categoryCounts: Record<NodeHandlerCategory, number>;
    supportedTypeCount: number;
    cacheSize: number;
} {
    const categoryCounts: Record<NodeHandlerCategory, number> = {
        ai: 0,
        data: 0,
        logic: 0,
        integration: 0,
        control: 0,
        generic: 0
    };

    for (const reg of registeredHandlers) {
        categoryCounts[reg.category]++;
    }

    return {
        handlerCount: registeredHandlers.length,
        categoryCounts,
        supportedTypeCount: getSupportedNodeTypes().size,
        cacheSize: handlerCache.size
    };
}
