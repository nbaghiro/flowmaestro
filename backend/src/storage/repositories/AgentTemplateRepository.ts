import type { AgentTemplateTool } from "@flowmaestro/shared";
import { db } from "../database";
import {
    AgentTemplateModel,
    AgentTemplateListOptions,
    AgentTemplateListResult,
    AgentTemplateCategoryCount,
    CreateAgentTemplateInput,
    AgentTemplateCategory,
    AgentTemplateStatus,
    AgentTemplateProvider
} from "../models/AgentTemplate";

interface AgentTemplateRow {
    id: string;
    name: string;
    description: string | null;
    system_prompt: string;
    model: string;
    provider: string;
    temperature: number | string;
    max_tokens: number;
    available_tools: string | AgentTemplateTool[];
    category: string;
    tags: string[];
    icon: string | null;
    color: string | null;
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

export class AgentTemplateRepository {
    async findAll(options: AgentTemplateListOptions = {}): Promise<AgentTemplateListResult> {
        const {
            category,
            tags,
            featured,
            search,
            status = "active",
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

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.agent_templates
            ${whereClause}
        `;

        const query = `
            SELECT * FROM flowmaestro.agent_templates
            ${whereClause}
            ORDER BY jsonb_array_length(available_tools) DESC, featured DESC, sort_order ASC, use_count DESC, created_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex}
        `;

        values.push(limit, offset);

        const [countResult, templatesResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, values.slice(0, -2)),
            db.query<AgentTemplateRow>(query, values)
        ]);

        return {
            templates: templatesResult.rows.map((row) => this.mapRow(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    async findById(id: string): Promise<AgentTemplateModel | null> {
        const query = `
            SELECT * FROM flowmaestro.agent_templates
            WHERE id = $1
        `;

        const result = await db.query<AgentTemplateRow>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByCategory(category: AgentTemplateCategory): Promise<AgentTemplateModel[]> {
        const query = `
            SELECT * FROM flowmaestro.agent_templates
            WHERE category = $1 AND status = 'active'
            ORDER BY jsonb_array_length(available_tools) DESC, featured DESC, sort_order ASC, use_count DESC
        `;

        const result = await db.query<AgentTemplateRow>(query, [category]);
        return result.rows.map((row) => this.mapRow(row));
    }

    async getCategories(): Promise<AgentTemplateCategoryCount[]> {
        const query = `
            SELECT category, COUNT(*) as count
            FROM flowmaestro.agent_templates
            WHERE status = 'active'
            GROUP BY category
            ORDER BY count DESC
        `;

        const result = await db.query<{ category: string; count: string }>(query);
        return result.rows.map((row) => ({
            category: row.category as AgentTemplateCategory,
            count: parseInt(row.count)
        }));
    }

    async incrementViewCount(id: string): Promise<void> {
        const query = `
            UPDATE flowmaestro.agent_templates
            SET view_count = view_count + 1
            WHERE id = $1
        `;

        await db.query(query, [id]);
    }

    async incrementUseCount(id: string): Promise<void> {
        const query = `
            UPDATE flowmaestro.agent_templates
            SET use_count = use_count + 1
            WHERE id = $1
        `;

        await db.query(query, [id]);
    }

    async create(input: CreateAgentTemplateInput): Promise<AgentTemplateModel> {
        const query = `
            INSERT INTO flowmaestro.agent_templates (
                name, description, system_prompt, model, provider, temperature,
                max_tokens, available_tools, category, tags, icon, color,
                author_name, author_avatar_url, featured, sort_order,
                required_integrations, version, status, published_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING *
        `;

        const values = [
            input.name,
            input.description || null,
            input.system_prompt,
            input.model,
            input.provider,
            input.temperature ?? 0.7,
            input.max_tokens ?? 4000,
            JSON.stringify(input.available_tools || []),
            input.category,
            input.tags || [],
            input.icon || null,
            input.color || null,
            input.author_name || null,
            input.author_avatar_url || null,
            input.featured || false,
            input.sort_order || 0,
            input.required_integrations || [],
            input.version || "1.0.0",
            input.status || "active",
            input.status === "active" ? new Date() : null
        ];

        const result = await db.query<AgentTemplateRow>(query, values);
        return this.mapRow(result.rows[0]);
    }

    async search(searchQuery: string, limit = 20): Promise<AgentTemplateModel[]> {
        const query = `
            SELECT *,
                   ts_rank(
                       to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')),
                       plainto_tsquery('english', $1)
                   ) as rank
            FROM flowmaestro.agent_templates
            WHERE status = 'active'
              AND to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')) @@ plainto_tsquery('english', $1)
            ORDER BY rank DESC, use_count DESC
            LIMIT $2
        `;

        const result = await db.query<AgentTemplateRow & { rank: number }>(query, [
            searchQuery,
            limit
        ]);
        return result.rows.map((row) => this.mapRow(row));
    }

    async getFeatured(limit = 6): Promise<AgentTemplateModel[]> {
        const query = `
            SELECT * FROM flowmaestro.agent_templates
            WHERE status = 'active' AND featured = true
            ORDER BY jsonb_array_length(available_tools) DESC, sort_order ASC, use_count DESC
            LIMIT $1
        `;

        const result = await db.query<AgentTemplateRow>(query, [limit]);
        return result.rows.map((row) => this.mapRow(row));
    }

    async delete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.agent_templates
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    private mapRow(row: AgentTemplateRow): AgentTemplateModel {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            system_prompt: row.system_prompt,
            model: row.model,
            provider: row.provider as AgentTemplateProvider,
            temperature:
                typeof row.temperature === "string" ? parseFloat(row.temperature) : row.temperature,
            max_tokens: row.max_tokens,
            available_tools:
                typeof row.available_tools === "string"
                    ? JSON.parse(row.available_tools)
                    : (row.available_tools as AgentTemplateTool[]),
            category: row.category as AgentTemplateCategory,
            tags: row.tags || [],
            icon: row.icon,
            color: row.color,
            author_name: row.author_name,
            author_avatar_url: row.author_avatar_url,
            view_count: row.view_count,
            use_count: row.use_count,
            featured: row.featured,
            sort_order: row.sort_order,
            required_integrations: row.required_integrations || [],
            version: row.version,
            status: row.status as AgentTemplateStatus,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            published_at: row.published_at ? new Date(row.published_at) : null
        };
    }
}
