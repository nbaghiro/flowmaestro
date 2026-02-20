/**
 * Adapter Factory
 *
 * Creates the appropriate document adapter based on provider capabilities
 */

import { createServiceLogger } from "../../../core/logging";
import { providerRegistry } from "../../../integrations/registry";
import { BinaryFileAdapter } from "./BinaryFileAdapter";
import { StructuredContentAdapter } from "./StructuredContentAdapter";
import type { IProvider } from "../../../integrations/core/types";
import type { DocumentCapability } from "../types";
import type { DocumentAdapter } from "./DocumentAdapter";

const logger = createServiceLogger("AdapterFactory");

/**
 * Cache of adapter instances by provider name
 */
const adapterCache = new Map<string, DocumentAdapter>();

/**
 * Factory for creating document adapters based on provider capabilities
 */
export class AdapterFactory {
    /**
     * Create an adapter for a provider based on its detected capabilities
     */
    static createAdapter(provider: IProvider, capability: DocumentCapability): DocumentAdapter {
        const cacheKey = provider.name;

        // Return cached adapter if available
        if (adapterCache.has(cacheKey)) {
            return adapterCache.get(cacheKey)!;
        }

        let adapter: DocumentAdapter;

        switch (capability.contentType) {
            case "binary":
                adapter = new BinaryFileAdapter(provider, capability);
                break;

            case "structured":
                adapter = new StructuredContentAdapter(provider, capability);
                break;

            case "mixed":
                // For mixed content, prefer binary adapter as it can handle both
                // Files can be downloaded directly, pages can be exported
                adapter = new BinaryFileAdapter(provider, capability);
                break;

            default:
                // Default to binary adapter
                adapter = new BinaryFileAdapter(provider, capability);
        }

        adapterCache.set(cacheKey, adapter);

        logger.debug(
            { provider: provider.name, contentType: capability.contentType },
            "Created document adapter"
        );

        return adapter;
    }

    /**
     * Get or create an adapter for a provider by name
     */
    static async getAdapter(
        providerName: string,
        capability: DocumentCapability
    ): Promise<DocumentAdapter> {
        // Check cache first
        if (adapterCache.has(providerName)) {
            return adapterCache.get(providerName)!;
        }

        // Load provider and create adapter
        const provider = await providerRegistry.loadProvider(providerName);
        return this.createAdapter(provider, capability);
    }

    /**
     * Clear the adapter cache
     */
    static clearCache(): void {
        adapterCache.clear();
    }

    /**
     * Remove a specific adapter from cache
     */
    static removeFromCache(providerName: string): void {
        adapterCache.delete(providerName);
    }
}
