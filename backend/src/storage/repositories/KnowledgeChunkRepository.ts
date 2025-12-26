import { toSql } from "pgvector";
import type { JsonValue } from "@flowmaestro/shared";
import { createServiceLogger } from "../../core/logging";
import { db } from "../database";
import {
    KnowledgeChunkModel,
    CreateKnowledgeChunkInput,
    ChunkSearchResult,
    SearchChunksInput
} from "../models/KnowledgeChunk";

const logger = createServiceLogger("KnowledgeChunkRepository");

interface KnowledgeChunkRow {
    id: string;
    document_id: string;
    knowledge_base_id: string;
    chunk_index: number;
    content: string;
    embedding: string | number[] | null;
    token_count: number | null;
    metadata: string | Record<string, JsonValue>;
    created_at: string | Date;
}

export class KnowledgeChunkRepository {
    async create(input: CreateKnowledgeChunkInput): Promise<KnowledgeChunkModel> {
        const query = `
            INSERT INTO flowmaestro.knowledge_chunks
            (document_id, knowledge_base_id, chunk_index, content, embedding, token_count, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const values = [
            input.document_id,
            input.knowledge_base_id,
            input.chunk_index,
            input.content,
            input.embedding ? toSql(input.embedding) : null,
            input.token_count || null,
            JSON.stringify(input.metadata || {})
        ];

        const result = await db.query<KnowledgeChunkRow>(query, values);
        return this.mapRow(result.rows[0] as KnowledgeChunkRow);
    }

    async batchInsert(inputs: CreateKnowledgeChunkInput[]): Promise<KnowledgeChunkModel[]> {
        if (inputs.length === 0) {
            return [];
        }

        // Build a batch insert query
        const placeholders: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        inputs.forEach((input) => {
            const placeholder = `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`;
            placeholders.push(placeholder);

            values.push(
                input.document_id,
                input.knowledge_base_id,
                input.chunk_index,
                input.content,
                input.embedding ? toSql(input.embedding) : null,
                input.token_count || null,
                JSON.stringify(input.metadata || {})
            );
        });

        const query = `
            INSERT INTO flowmaestro.knowledge_chunks
            (document_id, knowledge_base_id, chunk_index, content, embedding, token_count, metadata)
            VALUES ${placeholders.join(", ")}
            RETURNING *
        `;

        const result = await db.query<KnowledgeChunkRow>(query, values);
        return result.rows.map((row) => this.mapRow(row as KnowledgeChunkRow));
    }

    async findById(id: string): Promise<KnowledgeChunkModel | null> {
        const query = `
            SELECT * FROM flowmaestro.knowledge_chunks
            WHERE id = $1
        `;

        const result = await db.query<KnowledgeChunkRow>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as KnowledgeChunkRow) : null;
    }

    async findByDocumentId(documentId: string): Promise<KnowledgeChunkModel[]> {
        const query = `
            SELECT * FROM flowmaestro.knowledge_chunks
            WHERE document_id = $1
            ORDER BY chunk_index ASC
        `;

        const result = await db.query<KnowledgeChunkRow>(query, [documentId]);
        return result.rows.map((row) => this.mapRow(row as KnowledgeChunkRow));
    }

    async searchSimilar(input: SearchChunksInput): Promise<ChunkSearchResult[]> {
        const { knowledge_base_id, query_embedding, top_k, similarity_threshold = 0.0 } = input;

        // Use cosine similarity for vector search
        // pgvector's <=> operator returns distance (lower is better)
        // We convert to similarity: 1 - distance
        const query = `
            SELECT
                kc.id,
                kc.document_id,
                kd.name as document_name,
                kc.chunk_index,
                kc.content,
                kc.metadata,
                1 - (kc.embedding <=> $1::vector) as similarity
            FROM flowmaestro.knowledge_chunks kc
            JOIN flowmaestro.knowledge_documents kd ON kc.document_id = kd.id
            WHERE kc.knowledge_base_id = $2
                AND kc.embedding IS NOT NULL
                AND (1 - (kc.embedding <=> $1::vector)) >= $3
            ORDER BY kc.embedding <=> $1::vector
            LIMIT $4
        `;

        const values = [toSql(query_embedding), knowledge_base_id, similarity_threshold, top_k];

        const result = await db.query(query, values);

        return result.rows.map((row) => ({
            id: row.id,
            document_id: row.document_id,
            document_name: row.document_name,
            chunk_index: row.chunk_index,
            content: row.content,
            metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
            similarity: parseFloat(row.similarity)
        }));
    }

    async deleteByDocumentId(documentId: string): Promise<number> {
        const query = `
            DELETE FROM flowmaestro.knowledge_chunks
            WHERE document_id = $1
        `;

        const result = await db.query(query, [documentId]);
        return result.rowCount || 0;
    }

    async deleteByKnowledgeBaseId(knowledgeBaseId: string): Promise<number> {
        const query = `
            DELETE FROM flowmaestro.knowledge_chunks
            WHERE knowledge_base_id = $1
        `;

        const result = await db.query(query, [knowledgeBaseId]);
        return result.rowCount || 0;
    }

    async updateEmbedding(id: string, embedding: number[]): Promise<KnowledgeChunkModel | null> {
        const query = `
            UPDATE flowmaestro.knowledge_chunks
            SET embedding = $1
            WHERE id = $2
            RETURNING *
        `;

        const result = await db.query<KnowledgeChunkRow>(query, [toSql(embedding), id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as KnowledgeChunkRow) : null;
    }

    async countByKnowledgeBaseId(knowledgeBaseId: string): Promise<number> {
        const query = `
            SELECT COUNT(*) as count
            FROM flowmaestro.knowledge_chunks
            WHERE knowledge_base_id = $1
        `;

        const result = await db.query<{ count: string }>(query, [knowledgeBaseId]);
        return parseInt(result.rows[0].count);
    }

    private mapRow(row: KnowledgeChunkRow): KnowledgeChunkModel {
        return {
            ...row,
            embedding: row.embedding ? this.parseVector(row.embedding) : null,
            metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
            created_at: new Date(row.created_at)
        };
    }

    private parseVector(vectorString: string | number[]): number[] | null {
        if (!vectorString) return null;
        if (Array.isArray(vectorString)) return vectorString;

        // pgvector returns vectors as "[1,2,3]" strings
        try {
            // Remove brackets and split by comma
            const cleaned = vectorString.replace(/[[\]]/g, "");
            return cleaned.split(",").map((v) => parseFloat(v.trim()));
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            logger.error({ error: msg }, "Error parsing vector");
            return null;
        }
    }
}
