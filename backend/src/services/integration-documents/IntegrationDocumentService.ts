/**
 * Integration Document Service
 *
 * Main service for importing documents from integration providers into knowledge bases.
 * Orchestrates capability detection, browsing, and import operations.
 */

import { createServiceLogger } from "../../core/logging";
import { ConnectionRepository } from "../../storage/repositories/ConnectionRepository";
import { AdapterFactory } from "./adapters/AdapterFactory";
import { capabilityDetector } from "./CapabilityDetector";
import type { DocumentAdapter } from "./adapters/DocumentAdapter";
import type {
    DocumentCapability,
    CapableConnection,
    IntegrationBrowseResult,
    IntegrationFile,
    IntegrationDownloadResult,
    BrowseOptions
} from "./types";
import type { ConnectionWithData } from "../../storage/models/Connection";

const logger = createServiceLogger("IntegrationDocumentService");

/**
 * Service for managing integration document imports
 */
export class IntegrationDocumentService {
    private connectionRepository = new ConnectionRepository();

    /**
     * Get all connections with document import capabilities for a workspace
     */
    async getCapableConnections(workspaceId: string): Promise<CapableConnection[]> {
        return capabilityDetector.getCapableConnections(workspaceId);
    }

    /**
     * Get all provider IDs that support document import (regardless of connections)
     */
    async getCapableProviderIds(): Promise<string[]> {
        const providers = await capabilityDetector.getCapableProviders();
        return providers.map((p) => p.provider);
    }

    /**
     * Get capability for a specific connection
     */
    async getConnectionCapability(connectionId: string): Promise<DocumentCapability | null> {
        const connection = await this.connectionRepository.findById(connectionId);
        if (!connection) {
            return null;
        }

        return capabilityDetector.getProviderCapability(connection.provider);
    }

    /**
     * Browse files in a connection
     */
    async browseConnection(
        connectionId: string,
        options: BrowseOptions
    ): Promise<IntegrationBrowseResult> {
        const { connection, adapter } = await this.getConnectionAndAdapter(connectionId);
        return adapter.browse(connection, options);
    }

    /**
     * Search files in a connection
     */
    async searchConnection(
        connectionId: string,
        query: string,
        options?: { pageToken?: string; pageSize?: number }
    ): Promise<IntegrationBrowseResult> {
        const { connection, adapter } = await this.getConnectionAndAdapter(connectionId);
        return adapter.search(connection, query, options);
    }

    /**
     * Get file info from a connection
     */
    async getFileInfo(connectionId: string, fileId: string): Promise<IntegrationFile | null> {
        const { connection, adapter } = await this.getConnectionAndAdapter(connectionId);
        return adapter.getFileInfo(connection, fileId);
    }

    /**
     * Download file content from a connection
     */
    async downloadFile(
        connectionId: string,
        fileId: string,
        mimeType: string
    ): Promise<IntegrationDownloadResult> {
        const { connection, adapter } = await this.getConnectionAndAdapter(connectionId);
        return adapter.download(connection, fileId, mimeType);
    }

    /**
     * Build breadcrumbs for a folder
     */
    async buildBreadcrumbs(
        connectionId: string,
        folderId: string
    ): Promise<Array<{ id: string; name: string }>> {
        const { connection, adapter } = await this.getConnectionAndAdapter(connectionId);
        return adapter.buildBreadcrumbs(connection, folderId);
    }

    /**
     * Get connection with data and appropriate adapter
     */
    private async getConnectionAndAdapter(connectionId: string): Promise<{
        connection: ConnectionWithData;
        adapter: DocumentAdapter;
        capability: DocumentCapability;
    }> {
        // Get connection with credentials
        const connection = await this.connectionRepository.findByIdWithData(connectionId);
        if (!connection) {
            throw new Error(`Connection not found: ${connectionId}`);
        }

        // Check connection status
        if (connection.status !== "active") {
            throw new Error(`Connection is ${connection.status}: ${connectionId}`);
        }

        // Get capability
        const capability = await capabilityDetector.getProviderCapability(connection.provider);
        if (!capability) {
            throw new Error(`Provider ${connection.provider} does not support document import`);
        }

        // Get adapter
        const adapter = await AdapterFactory.getAdapter(connection.provider, capability);

        // Mark connection as used
        this.connectionRepository.markAsUsed(connectionId);

        return { connection, adapter, capability };
    }

    /**
     * Validate that a connection can be used for document import
     */
    async validateConnection(connectionId: string): Promise<{
        valid: boolean;
        error?: string;
        capability?: DocumentCapability;
    }> {
        try {
            const connection = await this.connectionRepository.findById(connectionId);
            if (!connection) {
                return { valid: false, error: "Connection not found" };
            }

            if (connection.status !== "active") {
                return { valid: false, error: `Connection is ${connection.status}` };
            }

            const capability = await capabilityDetector.getProviderCapability(connection.provider);
            if (!capability) {
                return { valid: false, error: "Provider does not support document import" };
            }

            return { valid: true, capability };
        } catch (error) {
            logger.error({ connectionId, err: error }, "Error validating connection");
            return {
                valid: false,
                error: error instanceof Error ? error.message : "Validation failed"
            };
        }
    }

    /**
     * List files from a folder source configuration
     */
    async listSourceFiles(
        connectionId: string,
        sourceConfig: { folderId?: string; recursive?: boolean }
    ): Promise<IntegrationFile[]> {
        const files: IntegrationFile[] = [];
        let pageToken: string | null = null;

        const { connection, adapter } = await this.getConnectionAndAdapter(connectionId);

        // Fetch all pages
        do {
            const result = await adapter.browse(connection, {
                folderId: sourceConfig.folderId,
                pageToken: pageToken || undefined,
                pageSize: 100
            });

            // Add non-folder files
            for (const file of result.files) {
                if (file.downloadable && !file.isFolder) {
                    files.push(file);
                }

                // Recursively process subfolders if requested
                if (sourceConfig.recursive && file.isFolder) {
                    const subFiles = await this.listSourceFiles(connectionId, {
                        folderId: file.id,
                        recursive: true
                    });
                    files.push(...subFiles);
                }
            }

            pageToken = result.nextPageToken;
        } while (pageToken);

        return files;
    }
}

// Export singleton instance
export const integrationDocumentService = new IntegrationDocumentService();
