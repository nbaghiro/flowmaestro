/**
 * Persona Instance Deliverable Repository
 *
 * Handles database operations for persona instance deliverables.
 */

import type { DeliverableType } from "@flowmaestro/shared";
import { db } from "../database";
import type {
    PersonaInstanceDeliverableRow,
    PersonaInstanceDeliverableModel,
    CreateDeliverableInput,
    DeliverableSummary
} from "../models/PersonaInstanceDeliverable";

/**
 * Generate a preview for a deliverable based on its type and content
 */
function generatePreview(type: DeliverableType, content: string | undefined): string | null {
    if (!content) return null;

    const maxLength = 500;

    switch (type) {
        case "markdown":
        case "html":
        case "code":
            // For text-based content, take first N characters
            return content.length > maxLength ? content.substring(0, maxLength) + "..." : content;

        case "csv":
            // For CSV, take first few lines
            const lines = content.split("\n").slice(0, 5);
            return lines.join("\n") + (content.split("\n").length > 5 ? "\n..." : "");

        case "json":
            // For JSON, try to pretty-print and truncate
            try {
                const parsed = JSON.parse(content);
                const pretty = JSON.stringify(parsed, null, 2);
                return pretty.length > maxLength ? pretty.substring(0, maxLength) + "..." : pretty;
            } catch {
                return content.substring(0, maxLength);
            }

        case "pdf":
        case "image":
            // Binary content - no preview
            return null;

        default:
            return content.length > maxLength ? content.substring(0, maxLength) + "..." : content;
    }
}

/**
 * Map database row to model
 */
function mapRow(row: PersonaInstanceDeliverableRow): PersonaInstanceDeliverableModel {
    return {
        id: row.id,
        instance_id: row.instance_id,
        name: row.name,
        description: row.description,
        type: row.type,
        content: row.content,
        file_url: row.file_url,
        file_size_bytes: row.file_size_bytes,
        file_extension: row.file_extension,
        preview: row.preview,
        created_at: row.created_at
    };
}

export class PersonaInstanceDeliverableRepository {
    /**
     * Create a new deliverable
     */
    async create(input: CreateDeliverableInput): Promise<PersonaInstanceDeliverableModel> {
        const preview = generatePreview(input.type, input.content);
        const fileSize =
            input.file_size_bytes ??
            (input.content ? Buffer.byteLength(input.content, "utf8") : null);

        const result = await db.query<PersonaInstanceDeliverableRow>(
            `INSERT INTO flowmaestro.persona_instance_deliverables
             (instance_id, name, description, type, content, file_url, file_size_bytes, file_extension, preview)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                input.instance_id,
                input.name,
                input.description || null,
                input.type,
                input.content || null,
                input.file_url || null,
                fileSize,
                input.file_extension || null,
                preview
            ]
        );

        return mapRow(result.rows[0]);
    }

    /**
     * Find a deliverable by ID
     */
    async findById(id: string): Promise<PersonaInstanceDeliverableModel | null> {
        const result = await db.query<PersonaInstanceDeliverableRow>(
            "SELECT * FROM flowmaestro.persona_instance_deliverables WHERE id = $1",
            [id]
        );

        return result.rows[0] ? mapRow(result.rows[0]) : null;
    }

    /**
     * Find all deliverables for an instance
     */
    async findByInstanceId(instanceId: string): Promise<PersonaInstanceDeliverableModel[]> {
        const result = await db.query<PersonaInstanceDeliverableRow>(
            `SELECT * FROM flowmaestro.persona_instance_deliverables
             WHERE instance_id = $1
             ORDER BY created_at ASC`,
            [instanceId]
        );

        return result.rows.map(mapRow);
    }

    /**
     * Get deliverable summaries for an instance (without full content)
     */
    async getSummariesByInstanceId(instanceId: string): Promise<DeliverableSummary[]> {
        const result = await db.query<{
            id: string;
            name: string;
            description: string | null;
            type: DeliverableType;
            file_size_bytes: number | null;
            file_extension: string | null;
            preview: string | null;
            created_at: Date;
        }>(
            `SELECT id, name, description, type, file_size_bytes, file_extension, preview, created_at
             FROM flowmaestro.persona_instance_deliverables
             WHERE instance_id = $1
             ORDER BY created_at ASC`,
            [instanceId]
        );

        return result.rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            type: row.type,
            file_size_bytes: row.file_size_bytes,
            file_extension: row.file_extension,
            preview: row.preview,
            created_at: row.created_at.toISOString()
        }));
    }

    /**
     * Get deliverable content by ID
     */
    async getContent(
        id: string
    ): Promise<{ content: string | null; file_url: string | null; type: DeliverableType } | null> {
        const result = await db.query<
            Pick<PersonaInstanceDeliverableRow, "content" | "file_url" | "type">
        >(
            "SELECT content, file_url, type FROM flowmaestro.persona_instance_deliverables WHERE id = $1",
            [id]
        );

        if (!result.rows[0]) return null;

        return {
            content: result.rows[0].content,
            file_url: result.rows[0].file_url,
            type: result.rows[0].type
        };
    }

    /**
     * Update a deliverable
     */
    async update(
        id: string,
        updates: Partial<Omit<CreateDeliverableInput, "instance_id">>
    ): Promise<PersonaInstanceDeliverableModel | null> {
        const setClauses: string[] = [];
        const values: (string | number | null)[] = [];
        let paramIndex = 1;

        if (updates.name !== undefined) {
            setClauses.push(`name = $${paramIndex++}`);
            values.push(updates.name);
        }
        if (updates.description !== undefined) {
            setClauses.push(`description = $${paramIndex++}`);
            values.push(updates.description || null);
        }
        if (updates.type !== undefined) {
            setClauses.push(`type = $${paramIndex++}`);
            values.push(updates.type);
        }
        if (updates.content !== undefined) {
            setClauses.push(`content = $${paramIndex++}`);
            values.push(updates.content || null);
            // Update preview when content changes
            const preview = generatePreview(updates.type || "markdown", updates.content);
            setClauses.push(`preview = $${paramIndex++}`);
            values.push(preview);
            // Update file size
            const fileSize = updates.content ? Buffer.byteLength(updates.content, "utf8") : null;
            setClauses.push(`file_size_bytes = $${paramIndex++}`);
            values.push(fileSize);
        }
        if (updates.file_url !== undefined) {
            setClauses.push(`file_url = $${paramIndex++}`);
            values.push(updates.file_url || null);
        }
        if (updates.file_extension !== undefined) {
            setClauses.push(`file_extension = $${paramIndex++}`);
            values.push(updates.file_extension || null);
        }

        if (setClauses.length === 0) {
            return this.findById(id);
        }

        values.push(id);

        const result = await db.query<PersonaInstanceDeliverableRow>(
            `UPDATE flowmaestro.persona_instance_deliverables
             SET ${setClauses.join(", ")}
             WHERE id = $${paramIndex}
             RETURNING *`,
            values
        );

        return result.rows[0] ? mapRow(result.rows[0]) : null;
    }

    /**
     * Delete a deliverable
     */
    async delete(id: string): Promise<boolean> {
        const result = await db.query(
            "DELETE FROM flowmaestro.persona_instance_deliverables WHERE id = $1",
            [id]
        );

        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Delete all deliverables for an instance
     */
    async deleteByInstanceId(instanceId: string): Promise<number> {
        const result = await db.query(
            "DELETE FROM flowmaestro.persona_instance_deliverables WHERE instance_id = $1",
            [instanceId]
        );

        return result.rowCount ?? 0;
    }

    /**
     * Count deliverables for an instance
     */
    async countByInstanceId(instanceId: string): Promise<number> {
        const result = await db.query<{ count: string }>(
            "SELECT COUNT(*) as count FROM flowmaestro.persona_instance_deliverables WHERE instance_id = $1",
            [instanceId]
        );

        return parseInt(result.rows[0].count, 10);
    }
}
