import type { JsonValue, WorkflowDefinition } from "@flowmaestro/shared";
import { db } from "../database";
import {
    TemplateModel,
    TemplateListOptions,
    TemplateListResult,
    CategoryCount,
    CreateTemplateInput,
    TemplateCategory,
    TemplateStatus,
    TemplateSortBy
} from "../models/Template";

interface TemplateRow {
    id: string;
    name: string;
    description: string | null;
    definition: string | Record<string, JsonValue>;
    category: string;
    tags: string[];
    icon: string | null;
    color: string | null;
    preview_image_url: string | null;
    author_name: string | null;
    author_avatar_url: string | null;
    view_count: number;
    use_count: number;
    featured: boolean;
    sort_order: number;
    required_integrations: string[];
    version: string;
    status: string;
    created_at: string | Date;
    updated_at: string | Date;
    published_at: string | Date | null;
}

export class TemplateRepository {
    async findAll(options: TemplateListOptions = {}): Promise<TemplateListResult> {
        const {
            category,
            tags,
            featured,
            search,
            status = "active",
            sortBy = "default",
            limit = 20,
            offset = 0
        } = options;

        const conditions: string[] = ["status = $1"];
        const values: unknown[] = [status];
        let paramIndex = 2;

        if (category) {
            conditions.push(`category = $${paramIndex++}`);
            values.push(category);
        }

        if (tags && tags.length > 0) {
            conditions.push(`tags && $${paramIndex++}`);
            values.push(tags);
        }

        if (featured !== undefined) {
            conditions.push(`featured = $${paramIndex++}`);
            values.push(featured);
        }

        if (search) {
            conditions.push(
                `to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')) @@ plainto_tsquery('english', $${paramIndex++})`
            );
            values.push(search);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        // Build ORDER BY clause based on sortBy option
        const orderByClause = this.buildOrderByClause(sortBy);

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.workflow_templates
            ${whereClause}
        `;

        const query = `
            SELECT * FROM flowmaestro.workflow_templates
            ${whereClause}
            ${orderByClause}
            LIMIT $${paramIndex++} OFFSET $${paramIndex}
        `;

        values.push(limit, offset);

        const [countResult, templatesResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, values.slice(0, -2)),
            db.query<TemplateRow>(query, values)
        ]);

        return {
            templates: templatesResult.rows.map((row) => this.mapRow(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * Build ORDER BY clause based on sort option
     */
    private buildOrderByClause(sortBy: TemplateSortBy): string {
        switch (sortBy) {
            case "complexity":
                // Sort by node count (ascending = simplest first)
                // Uses JSONB array length function to count nodes in the definition
                return "ORDER BY jsonb_array_length(definition->'nodes') ASC, name ASC";
            case "popularity":
                // Sort by use count (descending = most popular first)
                return "ORDER BY use_count DESC, view_count DESC, name ASC";
            case "newest":
                // Sort by creation date (descending = newest first)
                return "ORDER BY created_at DESC, name ASC";
            case "default":
            default:
                // Default: featured first, then by sort_order, then by popularity
                return "ORDER BY featured DESC, sort_order ASC, use_count DESC, created_at DESC";
        }
    }

    async findById(id: string): Promise<TemplateModel | null> {
        const query = `
            SELECT * FROM flowmaestro.workflow_templates
            WHERE id = $1
        `;

        const result = await db.query<TemplateRow>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByCategory(category: TemplateCategory): Promise<TemplateModel[]> {
        const query = `
            SELECT * FROM flowmaestro.workflow_templates
            WHERE category = $1 AND status = 'active'
            ORDER BY featured DESC, sort_order ASC, use_count DESC
        `;

        const result = await db.query<TemplateRow>(query, [category]);
        return result.rows.map((row) => this.mapRow(row));
    }

    async getCategories(): Promise<CategoryCount[]> {
        const query = `
            SELECT category, COUNT(*) as count
            FROM flowmaestro.workflow_templates
            WHERE status = 'active'
            GROUP BY category
            ORDER BY count DESC
        `;

        const result = await db.query<{ category: string; count: string }>(query);
        return result.rows.map((row) => ({
            category: row.category as TemplateCategory,
            count: parseInt(row.count)
        }));
    }

    async incrementViewCount(id: string): Promise<void> {
        const query = `
            UPDATE flowmaestro.workflow_templates
            SET view_count = view_count + 1
            WHERE id = $1
        `;

        await db.query(query, [id]);
    }

    async incrementUseCount(id: string): Promise<void> {
        const query = `
            UPDATE flowmaestro.workflow_templates
            SET use_count = use_count + 1
            WHERE id = $1
        `;

        await db.query(query, [id]);
    }

    async create(input: CreateTemplateInput): Promise<TemplateModel> {
        const query = `
            INSERT INTO flowmaestro.workflow_templates (
                name, description, definition, category, tags, icon, color,
                preview_image_url, author_name, author_avatar_url, featured,
                sort_order, required_integrations, version, status, published_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
        `;

        const values = [
            input.name,
            input.description || null,
            JSON.stringify(input.definition),
            input.category,
            input.tags || [],
            input.icon || null,
            input.color || null,
            input.preview_image_url || null,
            input.author_name || null,
            input.author_avatar_url || null,
            input.featured || false,
            input.sort_order || 0,
            input.required_integrations || [],
            input.version || "1.0.0",
            input.status || "active",
            input.status === "active" ? new Date() : null
        ];

        const result = await db.query<TemplateRow>(query, values);
        return this.mapRow(result.rows[0]);
    }

    async search(searchQuery: string, limit = 20): Promise<TemplateModel[]> {
        const query = `
            SELECT *,
                   ts_rank(
                       to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')),
                       plainto_tsquery('english', $1)
                   ) as rank
            FROM flowmaestro.workflow_templates
            WHERE status = 'active'
              AND to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')) @@ plainto_tsquery('english', $1)
            ORDER BY rank DESC, use_count DESC
            LIMIT $2
        `;

        const result = await db.query<TemplateRow & { rank: number }>(query, [searchQuery, limit]);
        return result.rows.map((row) => this.mapRow(row));
    }

    async getFeatured(limit = 6): Promise<TemplateModel[]> {
        const query = `
            SELECT * FROM flowmaestro.workflow_templates
            WHERE status = 'active' AND featured = true
            ORDER BY sort_order ASC, use_count DESC
            LIMIT $1
        `;

        const result = await db.query<TemplateRow>(query, [limit]);
        return result.rows.map((row) => this.mapRow(row));
    }

    async delete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.workflow_templates
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    private mapRow(row: TemplateRow): TemplateModel {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            definition:
                typeof row.definition === "string"
                    ? JSON.parse(row.definition)
                    : (row.definition as unknown as WorkflowDefinition),
            category: row.category as TemplateCategory,
            tags: row.tags || [],
            icon: row.icon,
            color: row.color,
            preview_image_url: row.preview_image_url,
            author_name: row.author_name,
            author_avatar_url: row.author_avatar_url,
            view_count: row.view_count,
            use_count: row.use_count,
            featured: row.featured,
            sort_order: row.sort_order,
            required_integrations: row.required_integrations || [],
            version: row.version,
            status: row.status as TemplateStatus,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            published_at: row.published_at ? new Date(row.published_at) : null
        };
    }
}
