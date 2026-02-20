/**
 * Capability Detector
 *
 * Auto-detects which providers support document import by inspecting
 * their available operations.
 */

import { createServiceLogger } from "../../core/logging";
import { providerRegistry } from "../../integrations/registry";
import { ConnectionRepository } from "../../storage/repositories/ConnectionRepository";
import { DOCUMENT_OPERATIONS } from "./types";
import type { DocumentCapability, CapableProvider, CapableConnection } from "./types";
import type { IProvider, OperationDefinition } from "../../integrations/core/types";

const logger = createServiceLogger("CapabilityDetector");

/**
 * Determines if a provider supports document import by analyzing its operations
 */
export class CapabilityDetector {
    private connectionRepository = new ConnectionRepository();
    private capabilityCache = new Map<string, DocumentCapability | null>();

    /**
     * Detect if a provider supports document import by checking its operations
     */
    detectCapabilities(provider: IProvider): DocumentCapability | null {
        const providerName = provider.name;

        // Check cache first
        if (this.capabilityCache.has(providerName)) {
            return this.capabilityCache.get(providerName) || null;
        }

        try {
            const operations = provider.getOperations();
            const operationIds = operations.map((op) => op.id.toLowerCase());

            // Find matching operations
            const listOp = this.findMatchingOperation(
                operationIds,
                operations,
                DOCUMENT_OPERATIONS.list
            );
            const downloadOp = this.findMatchingOperation(
                operationIds,
                operations,
                DOCUMENT_OPERATIONS.download
            );
            const searchOp = this.findMatchingOperation(
                operationIds,
                operations,
                DOCUMENT_OPERATIONS.search
            );
            const getContentOp = this.findMatchingOperation(
                operationIds,
                operations,
                DOCUMENT_OPERATIONS.getContent
            );

            // Must have at least list or search capability to browse files
            if (!listOp && !searchOp) {
                this.capabilityCache.set(providerName, null);
                return null;
            }

            // Determine content type based on available operations
            const contentType = this.detectContentType(
                provider,
                operations,
                downloadOp,
                getContentOp
            );

            const capability: DocumentCapability = {
                supportsBrowsing: !!listOp,
                supportsSearch: !!searchOp,
                contentType,
                listOperation: listOp,
                downloadOperation: downloadOp,
                searchOperation: searchOp,
                getContentOperation: getContentOp
            };

            logger.debug({ provider: providerName, capability }, "Detected document capabilities");

            this.capabilityCache.set(providerName, capability);
            return capability;
        } catch (error) {
            logger.error({ provider: providerName, err: error }, "Error detecting capabilities");
            this.capabilityCache.set(providerName, null);
            return null;
        }
    }

    /**
     * Find a matching operation from a list of candidate operation patterns
     */
    private findMatchingOperation(
        operationIds: string[],
        operations: OperationDefinition[],
        patterns: readonly string[]
    ): string | undefined {
        for (const pattern of patterns) {
            const patternLower = pattern.toLowerCase();
            const matchIndex = operationIds.findIndex((id) => id === patternLower);
            if (matchIndex >= 0) {
                // Return the original cased operation ID
                return operations[matchIndex].id;
            }
        }
        return undefined;
    }

    /**
     * Determine the content type based on provider and operations
     */
    private detectContentType(
        provider: IProvider,
        _operations: OperationDefinition[],
        downloadOp: string | undefined,
        getContentOp: string | undefined
    ): "binary" | "structured" | "mixed" {
        const name = provider.name.toLowerCase();

        // Known structured content providers (pages/blocks)
        const structuredProviders = ["notion", "confluence", "coda"];
        if (structuredProviders.includes(name)) {
            return "structured";
        }

        // Known binary file providers (file storage)
        const binaryProviders = [
            "google-drive",
            "dropbox",
            "box",
            "onedrive",
            "microsoft-onedrive",
            "sharepoint",
            "aws-s3",
            "google-cloud-storage",
            "azure-storage",
            "azure-blob-storage"
        ];
        if (binaryProviders.includes(name)) {
            return "binary";
        }

        // Mixed content providers (both files and pages)
        const mixedProviders = ["github", "gitlab"];
        if (mixedProviders.includes(name)) {
            return "mixed";
        }

        // Infer from operations
        if (downloadOp && getContentOp) {
            return "mixed";
        }
        if (downloadOp) {
            return "binary";
        }
        if (getContentOp) {
            return "structured";
        }

        // Default to binary for unknown providers with file operations
        return "binary";
    }

    /**
     * Get all registered providers with document capabilities
     */
    async getCapableProviders(): Promise<CapableProvider[]> {
        const capableProviders: CapableProvider[] = [];
        const providerNames = providerRegistry.getRegisteredProviders();

        for (const name of providerNames) {
            try {
                const provider = await providerRegistry.loadProvider(name);
                const capability = this.detectCapabilities(provider);

                if (capability) {
                    capableProviders.push({
                        provider: provider.name,
                        displayName: provider.displayName,
                        capability
                    });
                }
            } catch (error) {
                logger.debug({ provider: name, err: error }, "Skipping provider (failed to load)");
            }
        }

        return capableProviders;
    }

    /**
     * Get all user connections with document capabilities
     */
    async getCapableConnections(workspaceId: string): Promise<CapableConnection[]> {
        const capableConnections: CapableConnection[] = [];

        // Get all active connections for the workspace
        const { connections } = await this.connectionRepository.findByWorkspaceId(workspaceId, {
            status: "active"
        });

        for (const connection of connections) {
            try {
                // Load the provider to check capabilities
                const provider = await providerRegistry.loadProvider(connection.provider);
                const capability = this.detectCapabilities(provider);

                if (capability) {
                    capableConnections.push({
                        connectionId: connection.id,
                        connectionName: connection.name,
                        provider: provider.name,
                        displayName: provider.displayName,
                        capability
                    });
                }
            } catch (error) {
                logger.debug(
                    { connection: connection.id, provider: connection.provider, err: error },
                    "Skipping connection (provider not found or failed to load)"
                );
            }
        }

        return capableConnections;
    }

    /**
     * Check if a specific provider supports document import
     */
    async isProviderCapable(providerName: string): Promise<boolean> {
        try {
            const provider = await providerRegistry.loadProvider(providerName);
            const capability = this.detectCapabilities(provider);
            return capability !== null;
        } catch {
            return false;
        }
    }

    /**
     * Get capability for a specific provider
     */
    async getProviderCapability(providerName: string): Promise<DocumentCapability | null> {
        try {
            const provider = await providerRegistry.loadProvider(providerName);
            return this.detectCapabilities(provider);
        } catch {
            return null;
        }
    }

    /**
     * Clear the capability cache (useful for testing or when providers are updated)
     */
    clearCache(): void {
        this.capabilityCache.clear();
    }
}

// Export singleton instance
export const capabilityDetector = new CapabilityDetector();
