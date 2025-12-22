import type { NodeTypeDefinition, NodeCategory, NodeSubcategory } from "@flowmaestro/shared";

/**
 * Global node registry
 * Populated by registerNode() calls from node implementations
 */
const nodeRegistry: Map<string, NodeTypeDefinition> = new Map();

/**
 * Index for fast category lookups
 */
const categoryIndex: Map<NodeCategory, Set<string>> = new Map();
const subcategoryIndex: Map<NodeSubcategory, Set<string>> = new Map();

/**
 * Register a node type in the registry
 * Called during node module initialization
 *
 * @example
 * registerNode({
 *     type: "llm",
 *     label: "Ask AI",
 *     description: "Generate text with LLM models",
 *     category: "ai",
 *     subcategory: "using-ai",
 *     icon: "Bot",
 *     keywords: ["gpt", "openai", "anthropic", "chat", "generate"]
 * });
 */
export function registerNode(node: NodeTypeDefinition): void {
    // Validate required fields
    if (!node.type || !node.label || !node.category) {
        throw new Error(`Invalid node definition: ${JSON.stringify(node)}`);
    }

    // Check for duplicates
    if (nodeRegistry.has(node.type)) {
        console.warn(`Node type "${node.type}" already registered, overwriting`);
    }

    // Add to registry
    nodeRegistry.set(node.type, node);

    // Update category index
    if (!categoryIndex.has(node.category)) {
        categoryIndex.set(node.category, new Set());
    }
    categoryIndex.get(node.category)!.add(node.type);

    // Update subcategory index
    if (node.subcategory) {
        if (!subcategoryIndex.has(node.subcategory)) {
            subcategoryIndex.set(node.subcategory, new Set());
        }
        subcategoryIndex.get(node.subcategory)!.add(node.type);
    }
}

/**
 * Get all nodes in a category
 */
export function getNodesByCategory(category: NodeCategory): NodeTypeDefinition[] {
    const nodeTypes = categoryIndex.get(category);
    if (!nodeTypes) return [];

    return Array.from(nodeTypes)
        .map((type) => nodeRegistry.get(type)!)
        .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Get all nodes in a subcategory
 */
export function getNodesBySubcategory(subcategory: NodeSubcategory): NodeTypeDefinition[] {
    const nodeTypes = subcategoryIndex.get(subcategory);
    if (!nodeTypes) return [];

    return Array.from(nodeTypes)
        .map((type) => nodeRegistry.get(type)!)
        .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Search nodes by query string
 * Searches label, description, and keywords
 */
export function searchNodes(query: string): NodeTypeDefinition[] {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    const results: NodeTypeDefinition[] = [];

    for (const node of nodeRegistry.values()) {
        const matchLabel = node.label.toLowerCase().includes(lowerQuery);
        const matchDesc = node.description.toLowerCase().includes(lowerQuery);
        const matchKeywords = node.keywords.some((k) => k.toLowerCase().includes(lowerQuery));

        if (matchLabel || matchDesc || matchKeywords) {
            results.push(node);
        }
    }

    // Sort: exact label matches first, then by label
    return results.sort((a, b) => {
        const aExact = a.label.toLowerCase() === lowerQuery;
        const bExact = b.label.toLowerCase() === lowerQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return a.label.localeCompare(b.label);
    });
}

/**
 * Get node definition by type
 */
export function getNodeDefinition(type: string): NodeTypeDefinition | undefined {
    return nodeRegistry.get(type);
}

/**
 * Get all registered node types
 */
export function getAllNodes(): NodeTypeDefinition[] {
    return Array.from(nodeRegistry.values());
}

/**
 * Get frequently used nodes (placeholder - implement with usage tracking)
 */
export function getFrequentlyUsedNodes(): NodeTypeDefinition[] {
    // Default frequently used nodes
    const frequentTypes = ["llm", "transform", "conditional", "http", "variable"];
    return frequentTypes
        .map((type) => nodeRegistry.get(type))
        .filter((node): node is NodeTypeDefinition => node !== undefined);
}

registerNode({
    type: "input",
    label: "Input",
    description: "Entry point for workflow data",
    category: "tools",
    subcategory: "flow-control",
    icon: "ArrowDownToLine",
    keywords: ["start", "entry", "data", "input"]
});

registerNode({
    type: "output",
    label: "Output",
    description: "Format and return workflow results",
    category: "tools",
    subcategory: "flow-control",
    icon: "ArrowUpFromLine",
    keywords: ["result", "return", "output"]
});

registerNode({
    type: "router",
    label: "Router",
    description: "Branch workflow based on conditions",
    category: "tools",
    subcategory: "flow-control",
    icon: "GitBranch",
    keywords: ["condition", "branch", "if", "switch", "route"]
});

registerNode({
    type: "loop",
    label: "Loop",
    description: "Iterate over array items",
    category: "tools",
    subcategory: "flow-control",
    icon: "Repeat",
    keywords: ["for", "each", "iterate", "array", "loop"]
});

registerNode({
    type: "wait",
    label: "Wait",
    description: "Pause execution for a duration or until a time",
    category: "tools",
    subcategory: "flow-control",
    icon: "Clock",
    keywords: ["delay", "pause", "sleep", "timer"]
});

registerNode({
    type: "transform",
    label: "Transform",
    description: "Transform data using JSONata, JavaScript, or Templates",
    category: "tools",
    subcategory: "data-processing",
    icon: "Wand2",
    keywords: ["transform", "map", "jsonata", "javascript", "template", "expression"]
});
