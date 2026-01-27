import { toSql } from "pgvector";
import type { JsonObject } from "@flowmaestro/shared";
import { createServiceLogger } from "../../core/logging";
import { db } from "../database";

const logger = createServiceLogger("ChatInterfaceMessageChunkRepository");

export interface ChatInterfaceMessageChunk {
    id: string;
    sessionId: string;
    threadId: string | null;
    sourceType: "file" | "url";
    sourceName: string | null;
    sourceIndex: number | null;
    content: string;
    chunkIndex: number;
    embedding: number[] | null;
    metadata: JsonObject;
    createdAt: Date;
}

export interface CreateChunkInput {
    sessionId: string;
    threadId?: string;
    sourceType: "file" | "url";
    sourceName?: string;
    sourceIndex?: number;
    content: string;
    chunkIndex: number;
    embedding?: number[];
    metadata?: JsonObject;
}

export interface ChunkSearchResult {
    id: string;
    sessionId: string;
    sourceType: "file" | "url";
    sourceName: string | null;
    content: string;
    chunkIndex: number;
    metadata: JsonObject;
    similarity: number;
}

export interface SearchChunksInput {
    sessionId: string;
    queryEmbedding: number[];
    topK?: number;
    similarityThreshold?: number;
}

interface ChunkRow {
    id: string;
    session_id: string;
    thread_id: string | null;
    source_type: string;
    source_name: string | null;
    source_index: number | null;
    content: string;
    chunk_index: number;
    embedding: string | number[] | null;
    metadata: string | JsonObject;
    created_at: string | Date;
}

export class ChatInterfaceMessageChunkRepository {
    /**
     * Create multiple chunks in a single batch insert
     */
    async createChunks(inputs: CreateChunkInput[]): Promise<ChatInterfaceMessageChunk[]> {
        if (inputs.length === 0) {
            return [];
        }

        const placeholders: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        inputs.forEach((input) => {
            const placeholder = `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`;
            placeholders.push(placeholder);

            values.push(
                input.sessionId,
                input.threadId || null,
                input.sourceType,
                input.sourceName || null,
                input.sourceIndex ?? null,
                input.content,
                input.chunkIndex,
                input.embedding ? toSql(input.embedding) : null,
                JSON.stringify(input.metadata || {})
            );
        });

        const query = `
            INSERT INTO flowmaestro.chat_interface_message_chunks
            (session_id, thread_id, source_type, source_name, source_index, content, chunk_index, embedding, metadata)
            VALUES ${placeholders.join(", ")}
            RETURNING *
        `;

        const result = await db.query<ChunkRow>(query, values);
        return result.rows.map((row) => this.mapRow(row));
    }

    /**
     * Search for similar chunks within a session using vector similarity
     */
    async searchSimilar(input: SearchChunksInput): Promise<ChunkSearchResult[]> {
        const { sessionId, queryEmbedding, topK = 5, similarityThreshold = 0.7 } = input;

        const query = `
            SELECT
                id,
                session_id,
                source_type,
                source_name,
                content,
                chunk_index,
                metadata,
                1 - (embedding <=> $1::vector) as similarity
            FROM flowmaestro.chat_interface_message_chunks
            WHERE session_id = $2
                AND embedding IS NOT NULL
                AND (1 - (embedding <=> $1::vector)) >= $3
            ORDER BY embedding <=> $1::vector
            LIMIT $4
        `;

        const values = [toSql(queryEmbedding), sessionId, similarityThreshold, topK];

        const result = await db.query(query, values);

        return result.rows.map((row) => ({
            id: row.id,
            sessionId: row.session_id,
            sourceType: row.source_type as "file" | "url",
            sourceName: row.source_name,
            content: row.content,
            chunkIndex: row.chunk_index,
            metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
            similarity: parseFloat(row.similarity)
        }));
    }

    /**
     * Delete all chunks for a session
     */
    async deleteBySessionId(sessionId: string): Promise<number> {
        const query = `
            DELETE FROM flowmaestro.chat_interface_message_chunks
            WHERE session_id = $1
        `;

        const result = await db.query(query, [sessionId]);
        return result.rowCount || 0;
    }

    /**
     * Delete all chunks for a thread
     */
    async deleteByThreadId(threadId: string): Promise<number> {
        const query = `
            DELETE FROM flowmaestro.chat_interface_message_chunks
            WHERE thread_id = $1
        `;

        const result = await db.query(query, [threadId]);
        return result.rowCount || 0;
    }

    /**
     * Get all chunks for a session
     */
    async findBySessionId(sessionId: string): Promise<ChatInterfaceMessageChunk[]> {
        const query = `
            SELECT * FROM flowmaestro.chat_interface_message_chunks
            WHERE session_id = $1
            ORDER BY source_index, chunk_index
        `;

        const result = await db.query<ChunkRow>(query, [sessionId]);
        return result.rows.map((row) => this.mapRow(row));
    }

    /**
     * Count chunks for a session
     */
    async countBySessionId(sessionId: string): Promise<number> {
        const query = `
            SELECT COUNT(*) as count
            FROM flowmaestro.chat_interface_message_chunks
            WHERE session_id = $1
        `;

        const result = await db.query<{ count: string }>(query, [sessionId]);
        return parseInt(result.rows[0].count);
    }

    private mapRow(row: ChunkRow): ChatInterfaceMessageChunk {
        return {
            id: row.id,
            sessionId: row.session_id,
            threadId: row.thread_id,
            sourceType: row.source_type as "file" | "url",
            sourceName: row.source_name,
            sourceIndex: row.source_index,
            content: row.content,
            chunkIndex: row.chunk_index,
            embedding: row.embedding ? this.parseVector(row.embedding) : null,
            metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
            createdAt: new Date(row.created_at)
        };
    }

    private parseVector(vectorString: string | number[]): number[] | null {
        if (!vectorString) return null;
        if (Array.isArray(vectorString)) return vectorString;

        try {
            const cleaned = vectorString.replace(/[[\]]/g, "");
            return cleaned.split(",").map((v) => parseFloat(v.trim()));
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            logger.error({ error: msg }, "Error parsing vector");
            return null;
        }
    }
}
