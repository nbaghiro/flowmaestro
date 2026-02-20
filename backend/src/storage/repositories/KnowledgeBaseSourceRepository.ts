/**
 * Knowledge Base Source Repository
 *
 * Handles CRUD operations for knowledge base integration sources
 */

import { db } from "../database";
import type {
    KnowledgeBaseSource,
    CreateKBSourceInput,
    UpdateKBSourceInput,
    SourceConfig,
    KBSourceType,
    SyncStatus
} from "../../services/integration-documents/types";

interface KBSourceRow {
    id: string;
    knowledge_base_id: string;
    connection_id: string;
    provider: string;
    source_type: string;
    source_config: string | SourceConfig;
    sync_enabled: boolean;
    sync_interval_minutes: number;
    last_synced_at: string | Date | null;
    sync_status: string;
    sync_error: string | null;
    created_at: string | Date;
    updated_at: string | Date;
}

export class KnowledgeBaseSourceRepository {
    /**
     * Create a new integration source
     */
    async create(input: CreateKBSourceInput): Promise<KnowledgeBaseSource> {
        const query = `
            INSERT INTO flowmaestro.knowledge_base_sources
            (knowledge_base_id, connection_id, provider, source_type, source_config, sync_enabled, sync_interval_minutes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const values = [
            input.knowledgeBaseId,
            input.connectionId,
            input.provider,
            input.sourceType,
            JSON.stringify(input.sourceConfig),
            input.syncEnabled,
            input.syncIntervalMinutes || 60
        ];

        const result = await db.query<KBSourceRow>(query, values);
        return this.mapRow(result.rows[0]);
    }

    /**
     * Find source by ID
     */
    async findById(id: string): Promise<KnowledgeBaseSource | null> {
        const query = `
            SELECT * FROM flowmaestro.knowledge_base_sources
            WHERE id = $1
        `;

        const result = await db.query<KBSourceRow>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * Find sources by knowledge base ID
     */
    async findByKnowledgeBaseId(knowledgeBaseId: string): Promise<KnowledgeBaseSource[]> {
        const query = `
            SELECT * FROM flowmaestro.knowledge_base_sources
            WHERE knowledge_base_id = $1
            ORDER BY created_at DESC
        `;

        const result = await db.query<KBSourceRow>(query, [knowledgeBaseId]);
        return result.rows.map((row) => this.mapRow(row));
    }

    /**
     * Find sources by connection ID
     */
    async findByConnectionId(connectionId: string): Promise<KnowledgeBaseSource[]> {
        const query = `
            SELECT * FROM flowmaestro.knowledge_base_sources
            WHERE connection_id = $1
            ORDER BY created_at DESC
        `;

        const result = await db.query<KBSourceRow>(query, [connectionId]);
        return result.rows.map((row) => this.mapRow(row));
    }

    /**
     * Update a source
     */
    async update(id: string, input: UpdateKBSourceInput): Promise<KnowledgeBaseSource | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.syncEnabled !== undefined) {
            updates.push(`sync_enabled = $${paramIndex++}`);
            values.push(input.syncEnabled);
        }

        if (input.syncIntervalMinutes !== undefined) {
            updates.push(`sync_interval_minutes = $${paramIndex++}`);
            values.push(input.syncIntervalMinutes);
        }

        if (input.sourceConfig !== undefined) {
            // Merge with existing config
            const existing = await this.findById(id);
            if (!existing) return null;

            const mergedConfig = { ...existing.sourceConfig, ...input.sourceConfig };
            updates.push(`source_config = $${paramIndex++}`);
            values.push(JSON.stringify(mergedConfig));
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        // updated_at is handled by trigger
        values.push(id);
        const query = `
            UPDATE flowmaestro.knowledge_base_sources
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query<KBSourceRow>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * Update sync status
     */
    async updateSyncStatus(
        id: string,
        status: SyncStatus,
        error?: string
    ): Promise<KnowledgeBaseSource | null> {
        const updates = ["sync_status = $1"];
        const values: unknown[] = [status];

        if (status === "completed") {
            updates.push("last_synced_at = CURRENT_TIMESTAMP");
            updates.push("sync_error = NULL");
        } else if (status === "failed" && error) {
            updates.push("sync_error = $2");
            values.push(error);
        } else if (status === "syncing") {
            updates.push("sync_error = NULL");
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.knowledge_base_sources
            SET ${updates.join(", ")}
            WHERE id = $${values.length}
            RETURNING *
        `;

        const result = await db.query<KBSourceRow>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * Delete a source
     */
    async delete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.knowledge_base_sources
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Delete all sources for a knowledge base
     */
    async deleteByKnowledgeBaseId(knowledgeBaseId: string): Promise<number> {
        const query = `
            DELETE FROM flowmaestro.knowledge_base_sources
            WHERE knowledge_base_id = $1
        `;

        const result = await db.query(query, [knowledgeBaseId]);
        return result.rowCount || 0;
    }

    /**
     * Find sources that need syncing
     * Returns sources where:
     * - sync_enabled = true
     * - last_synced_at is null OR last_synced_at + interval < now
     * - sync_status is not 'syncing'
     */
    async findDueForSync(limit: number = 50): Promise<KnowledgeBaseSource[]> {
        const query = `
            SELECT * FROM flowmaestro.knowledge_base_sources
            WHERE sync_enabled = true
            AND sync_status != 'syncing'
            AND (
                last_synced_at IS NULL
                OR last_synced_at + (sync_interval_minutes || ' minutes')::interval < CURRENT_TIMESTAMP
            )
            ORDER BY last_synced_at ASC NULLS FIRST
            LIMIT $1
        `;

        const result = await db.query<KBSourceRow>(query, [limit]);
        return result.rows.map((row) => this.mapRow(row));
    }

    /**
     * Find sources by provider (across all knowledge bases)
     * Useful for batch operations on all sources from a provider
     */
    async findByProvider(provider: string): Promise<KnowledgeBaseSource[]> {
        const query = `
            SELECT * FROM flowmaestro.knowledge_base_sources
            WHERE provider = $1
            ORDER BY created_at DESC
        `;

        const result = await db.query<KBSourceRow>(query, [provider]);
        return result.rows.map((row) => this.mapRow(row));
    }

    /**
     * Check if a source with the same configuration already exists
     */
    async findExisting(
        knowledgeBaseId: string,
        connectionId: string,
        sourceType: KBSourceType,
        sourceConfig: SourceConfig
    ): Promise<KnowledgeBaseSource | null> {
        // For folder sources, check by folderId
        // For file sources, check by fileIds
        // For search sources, check by searchQuery
        let configQuery = "";

        if (sourceType === "folder" && sourceConfig.folderId) {
            configQuery = "AND source_config->>'folderId' = $4";
        } else if (sourceType === "search" && sourceConfig.searchQuery) {
            configQuery = "AND source_config->>'searchQuery' = $4";
        } else {
            // Can't easily compare fileIds arrays, skip for file type
            return null;
        }

        const query = `
            SELECT * FROM flowmaestro.knowledge_base_sources
            WHERE knowledge_base_id = $1
            AND connection_id = $2
            AND source_type = $3
            ${configQuery}
        `;

        const values: unknown[] = [knowledgeBaseId, connectionId, sourceType];
        if (sourceType === "folder" && sourceConfig.folderId) {
            values.push(sourceConfig.folderId);
        } else if (sourceType === "search" && sourceConfig.searchQuery) {
            values.push(sourceConfig.searchQuery);
        }

        const result = await db.query<KBSourceRow>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * Map database row to model
     */
    private mapRow(row: KBSourceRow): KnowledgeBaseSource {
        return {
            id: row.id,
            knowledgeBaseId: row.knowledge_base_id,
            connectionId: row.connection_id,
            provider: row.provider,
            sourceType: row.source_type as KBSourceType,
            sourceConfig:
                typeof row.source_config === "string"
                    ? JSON.parse(row.source_config)
                    : row.source_config,
            syncEnabled: row.sync_enabled,
            syncIntervalMinutes: row.sync_interval_minutes,
            lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at).toISOString() : null,
            syncStatus: row.sync_status as SyncStatus,
            syncError: row.sync_error,
            createdAt: new Date(row.created_at).toISOString(),
            updatedAt: new Date(row.updated_at).toISOString()
        };
    }
}
