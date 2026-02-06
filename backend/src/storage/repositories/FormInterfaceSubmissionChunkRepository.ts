import type {
    FormInterfaceSubmissionChunk,
    FormSubmissionChunkSearchResult
} from "@flowmaestro/shared";
import { db } from "../database";

// Database row interface
interface SubmissionChunkRow {
    id: string;
    submission_id: string;
    source_type: "file" | "url";
    source_name: string;
    source_index: number;
    content: string;
    chunk_index: number;
    metadata: Record<string, unknown> | string;
    created_at: string | Date;
}

// Input for creating chunks
export interface CreateSubmissionChunkInput {
    submissionId: string;
    sourceType: "file" | "url";
    sourceName: string;
    sourceIndex: number;
    content: string;
    chunkIndex: number;
    embedding: number[];
    metadata?: Record<string, unknown>;
}

// Search parameters
export interface SubmissionChunkSearchParams {
    submissionId: string;
    queryEmbedding: number[];
    topK?: number;
    similarityThreshold?: number;
}

export class FormInterfaceSubmissionChunkRepository {
    /**
     * Create multiple chunks with embeddings (batch insert)
     */
    async createChunks(chunks: CreateSubmissionChunkInput[]): Promise<void> {
        if (chunks.length === 0) return;

        // Build batch insert query
        const values: unknown[] = [];
        const placeholders: string[] = [];

        chunks.forEach((chunk, idx) => {
            const baseIdx = idx * 8;
            placeholders.push(
                `($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5}, $${baseIdx + 6}, $${baseIdx + 7}::vector, $${baseIdx + 8})`
            );
            values.push(
                chunk.submissionId,
                chunk.sourceType,
                chunk.sourceName,
                chunk.sourceIndex,
                chunk.content,
                chunk.chunkIndex,
                `[${chunk.embedding.join(",")}]`,
                JSON.stringify(chunk.metadata || {})
            );
        });

        const query = `
            INSERT INTO flowmaestro.form_interface_submission_chunks
                (submission_id, source_type, source_name, source_index, content, chunk_index, embedding, metadata)
            VALUES ${placeholders.join(", ")}
        `;

        await db.query(query, values);
    }

    /**
     * Search for similar chunks using vector similarity
     */
    async searchSimilar(
        params: SubmissionChunkSearchParams
    ): Promise<FormSubmissionChunkSearchResult[]> {
        const { submissionId, queryEmbedding, topK = 5, similarityThreshold = 0.7 } = params;

        const query = `
            SELECT
                id,
                content,
                source_name,
                source_type,
                1 - (embedding <=> $2::vector) AS similarity,
                metadata
            FROM flowmaestro.form_interface_submission_chunks
            WHERE submission_id = $1
              AND 1 - (embedding <=> $2::vector) >= $3
            ORDER BY similarity DESC
            LIMIT $4
        `;

        const result = await db.query(query, [
            submissionId,
            `[${queryEmbedding.join(",")}]`,
            similarityThreshold,
            topK
        ]);

        return result.rows.map((row) => ({
            id: row.id,
            content: row.content,
            sourceName: row.source_name,
            sourceType: row.source_type,
            similarity: parseFloat(row.similarity),
            metadata:
                typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata || {}
        }));
    }

    /**
     * Find all chunks for a submission
     */
    async findBySubmissionId(submissionId: string): Promise<FormInterfaceSubmissionChunk[]> {
        const query = `
            SELECT * FROM flowmaestro.form_interface_submission_chunks
            WHERE submission_id = $1
            ORDER BY source_index, chunk_index
        `;

        const result = await db.query(query, [submissionId]);
        return result.rows.map((row) => this.mapRow(row as SubmissionChunkRow));
    }

    /**
     * Count chunks for a submission
     */
    async countBySubmissionId(submissionId: string): Promise<number> {
        const query = `
            SELECT COUNT(*) as count
            FROM flowmaestro.form_interface_submission_chunks
            WHERE submission_id = $1
        `;

        const result = await db.query<{ count: string }>(query, [submissionId]);
        return parseInt(result.rows[0].count);
    }

    /**
     * Delete all chunks for a submission
     */
    async deleteBySubmissionId(submissionId: string): Promise<void> {
        const query = `
            DELETE FROM flowmaestro.form_interface_submission_chunks
            WHERE submission_id = $1
        `;

        await db.query(query, [submissionId]);
    }

    /**
     * Map database row to FormInterfaceSubmissionChunk model
     */
    private mapRow(row: SubmissionChunkRow): FormInterfaceSubmissionChunk {
        return {
            id: row.id,
            submissionId: row.submission_id,
            sourceType: row.source_type,
            sourceName: row.source_name,
            sourceIndex: row.source_index,
            content: row.content,
            chunkIndex: row.chunk_index,
            metadata:
                typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata || {},
            createdAt: new Date(row.created_at)
        };
    }
}
