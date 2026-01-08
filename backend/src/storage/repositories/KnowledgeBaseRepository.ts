import { db } from "../database";
import {
    KnowledgeBaseModel,
    CreateKnowledgeBaseInput,
    UpdateKnowledgeBaseInput,
    KnowledgeBaseStats,
    KnowledgeBaseConfig
} from "../models/KnowledgeBase";
import { FolderRepository } from "./FolderRepository";

const DEFAULT_CONFIG: KnowledgeBaseConfig = {
    embeddingModel: "text-embedding-3-small",
    embeddingProvider: "openai",
    chunkSize: 1000,
    chunkOverlap: 200,
    embeddingDimensions: 1536
};

interface KnowledgeBaseRow {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    config: string | KnowledgeBaseConfig;
    created_at: string | Date;
    updated_at: string | Date;
}

export class KnowledgeBaseRepository {
    async create(input: CreateKnowledgeBaseInput): Promise<KnowledgeBaseModel> {
        const config = { ...DEFAULT_CONFIG, ...input.config };

        const query = `
            INSERT INTO flowmaestro.knowledge_bases (user_id, name, description, config)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const values = [
            input.user_id,
            input.name,
            input.description || null,
            JSON.stringify(config)
        ];

        const result = await db.query<KnowledgeBaseRow>(query, values);
        return this.mapRow(result.rows[0] as KnowledgeBaseRow);
    }

    async findById(id: string): Promise<KnowledgeBaseModel | null> {
        const query = `
            SELECT * FROM flowmaestro.knowledge_bases
            WHERE id = $1
        `;

        const result = await db.query<KnowledgeBaseRow>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as KnowledgeBaseRow) : null;
    }

    async findByUserId(
        userId: string,
        options: { limit?: number; offset?: number; folderId?: string | null } = {}
    ): Promise<{ knowledgeBases: KnowledgeBaseModel[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        // Ensure junction tables exist
        const folderRepo = new FolderRepository();
        await folderRepo.ensureJunctionTablesExist();

        // Build folder filter using junction table
        let folderJoin = "";
        let folderFilter = "";
        const countParams: unknown[] = [userId];
        const queryParams: unknown[] = [userId];

        if (options.folderId === null) {
            // Knowledge bases not in any folder
            folderFilter = ` AND NOT EXISTS (
                SELECT 1 FROM flowmaestro.folder_knowledge_bases fkb
                WHERE fkb.knowledge_base_id = knowledge_bases.id
            )`;
        } else if (options.folderId !== undefined) {
            // Knowledge bases in specific folder
            folderJoin =
                " INNER JOIN flowmaestro.folder_knowledge_bases fkb ON fkb.knowledge_base_id = knowledge_bases.id AND fkb.folder_id = $2";
            countParams.push(options.folderId);
            queryParams.push(options.folderId);
        }

        const countQuery = `
            SELECT COUNT(DISTINCT knowledge_bases.id) as count
            FROM flowmaestro.knowledge_bases
            ${folderJoin}
            WHERE knowledge_bases.user_id = $1${folderFilter}
        `;

        const limitParamIndex = queryParams.length + 1;
        const offsetParamIndex = queryParams.length + 2;
        const query = `
            SELECT DISTINCT knowledge_bases.*
            FROM flowmaestro.knowledge_bases
            ${folderJoin}
            WHERE knowledge_bases.user_id = $1${folderFilter}
            ORDER BY knowledge_bases.created_at DESC
            LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
        `;

        queryParams.push(limit, offset);

        const [countResult, kbResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, countParams),
            db.query<KnowledgeBaseRow>(query, queryParams)
        ]);

        return {
            knowledgeBases: kbResult.rows.map((row) => this.mapRow(row as KnowledgeBaseRow)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    async update(id: string, input: UpdateKnowledgeBaseInput): Promise<KnowledgeBaseModel | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }

        if (input.description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(input.description);
        }

        if (input.config !== undefined) {
            // Merge with existing config
            const existing = await this.findById(id);
            if (existing) {
                const mergedConfig = { ...existing.config, ...input.config };
                updates.push(`config = $${paramIndex++}`);
                values.push(JSON.stringify(mergedConfig));
            }
        }

        // Always update updated_at
        updates.push("updated_at = CURRENT_TIMESTAMP");

        if (updates.length === 1) {
            // Only updated_at, no actual changes
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.knowledge_bases
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query<KnowledgeBaseRow>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as KnowledgeBaseRow) : null;
    }

    async delete(id: string): Promise<boolean> {
        // Hard delete - cascades to documents and chunks via foreign key constraints
        const query = `
            DELETE FROM flowmaestro.knowledge_bases
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    async getStats(id: string): Promise<KnowledgeBaseStats | null> {
        const query = `
            SELECT
                kb.id,
                kb.name,
                COUNT(DISTINCT kd.id) as document_count,
                COUNT(kc.id) as chunk_count,
                COALESCE(SUM(kd.file_size), 0) as total_size_bytes,
                MAX(GREATEST(kb.updated_at, kd.updated_at)) as last_updated
            FROM flowmaestro.knowledge_bases kb
            LEFT JOIN flowmaestro.knowledge_documents kd ON kb.id = kd.knowledge_base_id
            LEFT JOIN flowmaestro.knowledge_chunks kc ON kb.id = kc.knowledge_base_id
            WHERE kb.id = $1
            GROUP BY kb.id, kb.name
        `;

        const result = await db.query(query, [id]);

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            id: row.id,
            name: row.name,
            document_count: parseInt(row.document_count || "0"),
            chunk_count: parseInt(row.chunk_count || "0"),
            total_size_bytes: parseInt(row.total_size_bytes || "0"),
            last_updated: new Date(row.last_updated)
        };
    }

    private mapRow(row: KnowledgeBaseRow): KnowledgeBaseModel {
        return {
            ...row,
            config: typeof row.config === "string" ? JSON.parse(row.config) : row.config,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        };
    }
}
