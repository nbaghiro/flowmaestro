/**
 * Minimal node type for provider extraction.
 * Only requires the fields we need to extract provider info.
 */
interface NodeWithProvider {
    type: string;
    config?: {
        provider?: string;
        providerId?: string; // Used by trigger nodes
        [key: string]: unknown;
    };
}

/**
 * Node types that have a provider field in their config.
 * These include integration nodes (3rd party services) and AI-related nodes.
 */
const PROVIDER_NODE_TYPES = [
    "llm",
    "integration",
    "vision",
    "embeddings",
    "audio",
    "audioInput",
    "audioOutput",
    "router",
    "action",
    "trigger"
];

/**
 * Extract unique provider IDs from workflow nodes.
 * Returns providers for both integration nodes (Slack, Gmail, etc.)
 * and AI nodes (OpenAI, Anthropic, etc.).
 */
export function extractProvidersFromNodes(
    nodes: Record<string, NodeWithProvider> | undefined
): string[] {
    if (!nodes || typeof nodes !== "object") {
        return [];
    }

    const providers = new Set<string>();

    for (const node of Object.values(nodes)) {
        if (!PROVIDER_NODE_TYPES.includes(node.type)) {
            continue;
        }

        // Check both 'provider' and 'providerId' (trigger nodes use providerId)
        const providerId = node.config?.provider || node.config?.providerId;
        if (providerId) {
            providers.add(String(providerId));
        }
    }

    return Array.from(providers);
}
