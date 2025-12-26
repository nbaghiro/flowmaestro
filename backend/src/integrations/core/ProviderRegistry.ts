import { getLogger } from "../../core/logging";
import type { IProvider, ProviderRegistryEntry, ProviderSummary } from "./types";

const logger = getLogger();

/**
 * Provider Registry - manages provider instances and lazy loading
 */
export class ProviderRegistry {
    private providers: Map<string, IProvider> = new Map();
    private registry: Map<string, ProviderRegistryEntry> = new Map();

    /**
     * Register a provider
     */
    register(entry: ProviderRegistryEntry): void {
        this.registry.set(entry.name, entry);
    }

    /**
     * Load provider (lazy loading)
     */
    async loadProvider(name: string): Promise<IProvider> {
        // Return cached instance if already loaded
        if (this.providers.has(name)) {
            return this.providers.get(name)!;
        }

        // Get registry entry
        const entry = this.registry.get(name);
        if (!entry) {
            throw new Error(`Provider ${name} not found in registry`);
        }

        // Load provider
        try {
            const provider = await entry.loader();
            this.providers.set(name, provider);
            return provider;
        } catch (error) {
            logger.error(
                { component: "ProviderRegistry", providerName: name, err: error },
                "Failed to load provider"
            );
            throw new Error(
                `Failed to load provider ${name}: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    /**
     * Get provider (throws if not loaded)
     */
    getProvider(name: string): IProvider {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new Error(`Provider ${name} not loaded. Call loadProvider() first.`);
        }
        return provider;
    }

    /**
     * Check if provider is loaded
     */
    isLoaded(name: string): boolean {
        return this.providers.has(name);
    }

    /**
     * Get all registered provider names
     */
    getRegisteredProviders(): string[] {
        return Array.from(this.registry.keys());
    }

    /**
     * Get provider summaries (for API responses)
     */
    async getProviderSummaries(): Promise<ProviderSummary[]> {
        const summaries: ProviderSummary[] = [];

        for (const [name, entry] of this.registry.entries()) {
            // Load provider if not already loaded
            const provider = await this.loadProvider(name);

            summaries.push({
                name: provider.name,
                displayName: provider.displayName,
                authMethod: provider.authMethod,
                category: entry.category,
                operationCount: provider.getOperations().length,
                capabilities: provider.capabilities
            });
        }

        return summaries;
    }

    /**
     * Clear loaded providers (for testing)
     */
    clear(): void {
        this.providers.clear();
    }
}

// Global provider registry instance
export const providerRegistry = new ProviderRegistry();
