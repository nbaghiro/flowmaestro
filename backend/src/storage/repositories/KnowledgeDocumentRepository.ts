import type { JsonValue } from "@flowmaestro/shared";
import { db } from "../database";
import {
    KnowledgeDocumentModel,
    CreateKnowledgeDocumentInput,
    UpdateKnowledgeDocumentInput,
    DocumentStatus,
    DocumentSourceType,
    DocumentFileType
} from "../models/KnowledgeDocument";

interface KnowledgeDocumentRow {
    id: string;
    knowledge_base_id: string;
    name: string;
    source_type: string;
    source_url: string | null;
    file_path: string | null;
    file_type: string;
    file_size: number | null;
    content: string | null;
    metadata: string | Record<string, JsonValue>;
    status: DocumentStatus;
    error_message: string | null;
    processing_started_at: string | Date | null;
    processing_completed_at: string | Date | null;
    created_at: string | Date;
    updated_at: string | Date;
    source_id: string | null;
}

export class KnowledgeDocumentRepository {
    async create(input: CreateKnowledgeDocumentInput): Promise<KnowledgeDocumentModel> {
        const query = `
            INSERT INTO flowmaestro.knowledge_documents
            (knowledge_base_id, name, source_type, source_url, file_path, file_type, file_size, metadata, status, source_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        const values = [
            input.knowledge_base_id,
            input.name,
            input.source_type,
            input.source_url || null,
            input.file_path || null,
            input.file_type,
            input.file_size || null,
            JSON.stringify(input.metadata || {}),
            "pending", // Initial status
            input.source_id || null
        ];

        const result = await db.query<KnowledgeDocumentRow>(query, values);
        return this.mapRow(result.rows[0] as KnowledgeDocumentRow);
    }

    async findById(id: string): Promise<KnowledgeDocumentModel | null> {
        const query = `
            SELECT * FROM flowmaestro.knowledge_documents
            WHERE id = $1
        `;

        const result = await db.query<KnowledgeDocumentRow>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as KnowledgeDocumentRow) : null;
    }

    async findByKnowledgeBaseId(
        knowledgeBaseId: string,
        options: { limit?: number; offset?: number; status?: DocumentStatus } = {}
    ): Promise<{ documents: KnowledgeDocumentModel[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        let countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.knowledge_documents
            WHERE knowledge_base_id = $1
        `;

        let query = `
            SELECT * FROM flowmaestro.knowledge_documents
            WHERE knowledge_base_id = $1
        `;

        const countValues: unknown[] = [knowledgeBaseId];
        const queryValues: unknown[] = [knowledgeBaseId];

        if (options.status) {
            countQuery += " AND status = $2";
            query += " AND status = $2";
            countValues.push(options.status);
            queryValues.push(options.status);
        }

        query += ` ORDER BY created_at DESC LIMIT $${queryValues.length + 1} OFFSET $${queryValues.length + 2}`;
        queryValues.push(limit, offset);

        const [countResult, documentsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, countValues),
            db.query<KnowledgeDocumentRow>(query, queryValues)
        ]);

        return {
            documents: documentsResult.rows.map((row) => this.mapRow(row as KnowledgeDocumentRow)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    async update(
        id: string,
        input: UpdateKnowledgeDocumentInput
    ): Promise<KnowledgeDocumentModel | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }

        if (input.content !== undefined) {
            updates.push(`content = $${paramIndex++}`);
            values.push(input.content);
        }

        if (input.metadata !== undefined) {
            updates.push(`metadata = $${paramIndex++}`);
            values.push(JSON.stringify(input.metadata));
        }

        if (input.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(input.status);
        }

        if (input.error_message !== undefined) {
            updates.push(`error_message = $${paramIndex++}`);
            values.push(input.error_message);
        }

        if (input.processing_started_at !== undefined) {
            updates.push(`processing_started_at = $${paramIndex++}`);
            values.push(input.processing_started_at);
        }

        if (input.processing_completed_at !== undefined) {
            updates.push(`processing_completed_at = $${paramIndex++}`);
            values.push(input.processing_completed_at);
        }

        if (input.file_size !== undefined) {
            updates.push(`file_size = $${paramIndex++}`);
            values.push(input.file_size);
        }

        // Always update updated_at
        updates.push("updated_at = CURRENT_TIMESTAMP");

        if (updates.length === 1) {
            // Only updated_at, no actual changes
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.knowledge_documents
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query<KnowledgeDocumentRow>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as KnowledgeDocumentRow) : null;
    }

    async delete(id: string): Promise<boolean> {
        // Hard delete - cascades to chunks via foreign key constraints
        const query = `
            DELETE FROM flowmaestro.knowledge_documents
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    async updateStatus(
        id: string,
        status: DocumentStatus,
        errorMessage?: string
    ): Promise<KnowledgeDocumentModel | null> {
        const updates: string[] = ["status = $1"];
        const values: unknown[] = [status];
        let paramIndex = 2;

        if (status === "processing") {
            updates.push("processing_started_at = CURRENT_TIMESTAMP");
        } else if (status === "ready" || status === "failed") {
            updates.push("processing_completed_at = CURRENT_TIMESTAMP");
        }

        if (errorMessage !== undefined) {
            updates.push(`error_message = $${paramIndex++}`);
            values.push(errorMessage);
        }

        updates.push("updated_at = CURRENT_TIMESTAMP");
        values.push(id);

        const query = `
            UPDATE flowmaestro.knowledge_documents
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query<KnowledgeDocumentRow>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as KnowledgeDocumentRow) : null;
    }

    async deleteByKnowledgeBaseId(knowledgeBaseId: string): Promise<number> {
        const query = `
            DELETE FROM flowmaestro.knowledge_documents
            WHERE knowledge_base_id = $1
        `;

        const result = await db.query(query, [knowledgeBaseId]);
        return result.rowCount || 0;
    }

    private mapRow(row: KnowledgeDocumentRow): KnowledgeDocumentModel {
        return {
            id: row.id,
            knowledge_base_id: row.knowledge_base_id,
            name: row.name,
            source_type: row.source_type as DocumentSourceType,
            source_url: row.source_url,
            file_path: row.file_path,
            file_type: row.file_type as DocumentFileType,
            file_size: row.file_size !== null ? BigInt(row.file_size) : null,
            content: row.content,
            metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
            status: row.status as DocumentStatus,
            error_message: row.error_message,
            processing_started_at: row.processing_started_at
                ? new Date(row.processing_started_at)
                : null,
            processing_completed_at: row.processing_completed_at
                ? new Date(row.processing_completed_at)
                : null,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            source_id: row.source_id
        };
    }

    /**
     * Find documents by integration source ID
     */
    async findBySourceId(sourceId: string): Promise<KnowledgeDocumentModel[]> {
        const query = `
            SELECT * FROM flowmaestro.knowledge_documents
            WHERE source_id = $1
            ORDER BY created_at DESC
        `;

        const result = await db.query<KnowledgeDocumentRow>(query, [sourceId]);
        return result.rows.map((row) => this.mapRow(row as KnowledgeDocumentRow));
    }

    /**
     * Find document by integration file ID within a knowledge base
     */
    async findByIntegrationFileId(
        knowledgeBaseId: string,
        integrationFileId: string
    ): Promise<KnowledgeDocumentModel | null> {
        const query = `
            SELECT * FROM flowmaestro.knowledge_documents
            WHERE knowledge_base_id = $1
            AND metadata->>'integration_file_id' = $2
        `;

        const result = await db.query<KnowledgeDocumentRow>(query, [
            knowledgeBaseId,
            integrationFileId
        ]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as KnowledgeDocumentRow) : null;
    }

    /**
     * Delete all documents for a source
     */
    async deleteBySourceId(sourceId: string): Promise<number> {
        const query = `
            DELETE FROM flowmaestro.knowledge_documents
            WHERE source_id = $1
        `;

        const result = await db.query(query, [sourceId]);
        return result.rowCount || 0;
    }
}
