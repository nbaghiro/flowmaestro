import type {
    JsonObject,
    AgentTemplateTool,
    PersonaInputField,
    PersonaDeliverableSpec,
    PersonaEstimatedDuration
} from "@flowmaestro/shared";
import { db } from "../database";
import type {
    PersonaDefinitionModel,
    PersonaDefinitionSummary,
    CreatePersonaDefinitionInput,
    UpdatePersonaDefinitionInput,
    PersonaDefinitionQueryOptions,
    PersonaCategory,
    PersonaStatus,
    PersonaAutonomyLevel,
    LLMProvider
} from "../models/PersonaDefinition";

/**
 * Database row interface for persona_definitions table
 */
interface PersonaDefinitionRow {
    id: string;
    name: string;
    slug: string;
    title: string;
    description: string;
    avatar_url: string | null;
    category: string;
    tags: string[] | string;
    specialty: string;
    expertise_areas: string[] | string;
    example_tasks: string[] | string;
    typical_deliverables: string[] | string;
    input_fields: PersonaInputField[] | string;
    deliverables: PersonaDeliverableSpec[] | string;
    sop_steps: string[] | string;
    estimated_duration: PersonaEstimatedDuration | string;
    estimated_cost_credits: number | string;
    // Agent configuration
    system_prompt: string;
    model: string;
    provider: string;
    temperature: number | string;
    max_tokens: number | string;
    default_tools: AgentTemplateTool[] | string;
    default_max_duration_hours: number | string;
    default_max_cost_credits: number | string;
    autonomy_level: string;
    tool_risk_overrides: JsonObject | string;
    featured: boolean;
    sort_order: number | string;
    status: string;
    created_at: string | Date;
    updated_at: string | Date;
}

export class PersonaDefinitionRepository {
    /**
     * Create a new persona definition (used for seeding)
     */
    async create(input: CreatePersonaDefinitionInput): Promise<PersonaDefinitionModel> {
        const query = `
            INSERT INTO flowmaestro.persona_definitions (
                name, slug, title, description, avatar_url, category, tags,
                specialty, expertise_areas, example_tasks, typical_deliverables,
                input_fields, deliverables, sop_steps, estimated_duration, estimated_cost_credits,
                system_prompt, model, provider, temperature, max_tokens,
                default_tools, default_max_duration_hours, default_max_cost_credits,
                autonomy_level, tool_risk_overrides, featured, sort_order, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
            RETURNING *
        `;

        const values = [
            input.name,
            input.slug,
            input.title,
            input.description,
            input.avatar_url || null,
            input.category,
            input.tags || [],
            input.specialty,
            JSON.stringify(input.expertise_areas),
            JSON.stringify(input.example_tasks),
            JSON.stringify(input.typical_deliverables || []),
            JSON.stringify(input.input_fields),
            JSON.stringify(input.deliverables),
            JSON.stringify(input.sop_steps),
            JSON.stringify(input.estimated_duration || { min_minutes: 15, max_minutes: 30 }),
            input.estimated_cost_credits || 25,
            input.system_prompt,
            input.model || "claude-sonnet-4-20250514",
            input.provider || "anthropic",
            input.temperature !== undefined ? input.temperature : 0.7,
            input.max_tokens || 4096,
            JSON.stringify(input.default_tools || []),
            input.default_max_duration_hours !== undefined ? input.default_max_duration_hours : 4.0,
            input.default_max_cost_credits || 100,
            input.autonomy_level || "approve_high_risk",
            JSON.stringify(input.tool_risk_overrides || {}),
            input.featured || false,
            input.sort_order || 0,
            input.status || "active"
        ];

        const result = await db.query(query, values);
        return this.mapRow(result.rows[0] as PersonaDefinitionRow);
    }

    /**
     * Find persona definition by ID
     */
    async findById(id: string): Promise<PersonaDefinitionModel | null> {
        const query = `
            SELECT * FROM flowmaestro.persona_definitions
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as PersonaDefinitionRow) : null;
    }

    /**
     * Find persona definition by slug
     */
    async findBySlug(slug: string): Promise<PersonaDefinitionModel | null> {
        const query = `
            SELECT * FROM flowmaestro.persona_definitions
            WHERE slug = $1 AND status = 'active'
        `;

        const result = await db.query(query, [slug]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as PersonaDefinitionRow) : null;
    }

    /**
     * Find all persona definitions with optional filtering
     */
    async findAll(
        options: PersonaDefinitionQueryOptions = {}
    ): Promise<{ personas: PersonaDefinitionSummary[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const conditions: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        // Status filter (default to active)
        if (options.status !== undefined) {
            conditions.push(`status = $${paramIndex++}`);
            values.push(options.status);
        } else {
            conditions.push(`status = $${paramIndex++}`);
            values.push("active");
        }

        // Category filter
        if (options.category !== undefined) {
            conditions.push(`category = $${paramIndex++}`);
            values.push(options.category);
        }

        // Featured filter
        if (options.featured !== undefined) {
            conditions.push(`featured = $${paramIndex++}`);
            values.push(options.featured);
        }

        // Search filter
        if (options.search) {
            conditions.push(`(
                name ILIKE $${paramIndex} OR
                description ILIKE $${paramIndex} OR
                $${paramIndex}::text = ANY(tags)
            )`);
            values.push(`%${options.search}%`);
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        // Count query
        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.persona_definitions
            ${whereClause}
        `;

        // Data query
        const dataQuery = `
            SELECT
                id, name, slug, title, description, avatar_url, category, tags,
                specialty, expertise_areas, example_tasks, typical_deliverables,
                input_fields, deliverables, estimated_duration, estimated_cost_credits,
                default_tools, featured, status
            FROM flowmaestro.persona_definitions
            ${whereClause}
            ORDER BY
                featured DESC,
                sort_order ASC,
                name ASC
            LIMIT $${paramIndex++} OFFSET $${paramIndex}
        `;

        values.push(limit, offset);

        const [countResult, dataResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, values.slice(0, -2)),
            db.query(dataQuery, values)
        ]);

        return {
            personas: dataResult.rows.map((row) => this.mapSummaryRow(row as PersonaDefinitionRow)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * Get personas grouped by category
     */
    async findGroupedByCategory(): Promise<Record<PersonaCategory, PersonaDefinitionSummary[]>> {
        const query = `
            SELECT
                id, name, slug, title, description, avatar_url, category, tags,
                specialty, expertise_areas, example_tasks, typical_deliverables,
                input_fields, deliverables, estimated_duration, estimated_cost_credits,
                default_tools, featured, status
            FROM flowmaestro.persona_definitions
            WHERE status = 'active'
            ORDER BY
                category ASC,
                featured DESC,
                sort_order ASC,
                name ASC
        `;

        const result = await db.query(query);

        const grouped: Record<PersonaCategory, PersonaDefinitionSummary[]> = {
            research: [],
            content: [],
            development: [],
            data: [],
            operations: [],
            business: [],
            proposals: []
        };

        for (const row of result.rows) {
            const summary = this.mapSummaryRow(row as PersonaDefinitionRow);
            grouped[summary.category].push(summary);
        }

        return grouped;
    }

    /**
     * Update a persona definition
     */
    async update(
        id: string,
        input: UpdatePersonaDefinitionInput
    ): Promise<PersonaDefinitionModel | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }

        if (input.title !== undefined) {
            updates.push(`title = $${paramIndex++}`);
            values.push(input.title);
        }

        if (input.description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(input.description);
        }

        if (input.avatar_url !== undefined) {
            updates.push(`avatar_url = $${paramIndex++}`);
            values.push(input.avatar_url);
        }

        if (input.category !== undefined) {
            updates.push(`category = $${paramIndex++}`);
            values.push(input.category);
        }

        if (input.tags !== undefined) {
            updates.push(`tags = $${paramIndex++}`);
            values.push(input.tags);
        }

        if (input.specialty !== undefined) {
            updates.push(`specialty = $${paramIndex++}`);
            values.push(input.specialty);
        }

        if (input.expertise_areas !== undefined) {
            updates.push(`expertise_areas = $${paramIndex++}`);
            values.push(JSON.stringify(input.expertise_areas));
        }

        if (input.example_tasks !== undefined) {
            updates.push(`example_tasks = $${paramIndex++}`);
            values.push(JSON.stringify(input.example_tasks));
        }

        if (input.typical_deliverables !== undefined) {
            updates.push(`typical_deliverables = $${paramIndex++}`);
            values.push(JSON.stringify(input.typical_deliverables));
        }

        if (input.input_fields !== undefined) {
            updates.push(`input_fields = $${paramIndex++}`);
            values.push(JSON.stringify(input.input_fields));
        }

        if (input.deliverables !== undefined) {
            updates.push(`deliverables = $${paramIndex++}`);
            values.push(JSON.stringify(input.deliverables));
        }

        if (input.sop_steps !== undefined) {
            updates.push(`sop_steps = $${paramIndex++}`);
            values.push(JSON.stringify(input.sop_steps));
        }

        if (input.estimated_duration !== undefined) {
            updates.push(`estimated_duration = $${paramIndex++}`);
            values.push(JSON.stringify(input.estimated_duration));
        }

        if (input.estimated_cost_credits !== undefined) {
            updates.push(`estimated_cost_credits = $${paramIndex++}`);
            values.push(input.estimated_cost_credits);
        }

        if (input.system_prompt !== undefined) {
            updates.push(`system_prompt = $${paramIndex++}`);
            values.push(input.system_prompt);
        }

        if (input.model !== undefined) {
            updates.push(`model = $${paramIndex++}`);
            values.push(input.model);
        }

        if (input.provider !== undefined) {
            updates.push(`provider = $${paramIndex++}`);
            values.push(input.provider);
        }

        if (input.temperature !== undefined) {
            updates.push(`temperature = $${paramIndex++}`);
            values.push(input.temperature);
        }

        if (input.max_tokens !== undefined) {
            updates.push(`max_tokens = $${paramIndex++}`);
            values.push(input.max_tokens);
        }

        if (input.default_tools !== undefined) {
            updates.push(`default_tools = $${paramIndex++}`);
            values.push(JSON.stringify(input.default_tools));
        }

        if (input.default_max_duration_hours !== undefined) {
            updates.push(`default_max_duration_hours = $${paramIndex++}`);
            values.push(input.default_max_duration_hours);
        }

        if (input.default_max_cost_credits !== undefined) {
            updates.push(`default_max_cost_credits = $${paramIndex++}`);
            values.push(input.default_max_cost_credits);
        }

        if (input.autonomy_level !== undefined) {
            updates.push(`autonomy_level = $${paramIndex++}`);
            values.push(input.autonomy_level);
        }

        if (input.tool_risk_overrides !== undefined) {
            updates.push(`tool_risk_overrides = $${paramIndex++}`);
            values.push(JSON.stringify(input.tool_risk_overrides));
        }

        if (input.featured !== undefined) {
            updates.push(`featured = $${paramIndex++}`);
            values.push(input.featured);
        }

        if (input.sort_order !== undefined) {
            updates.push(`sort_order = $${paramIndex++}`);
            values.push(input.sort_order);
        }

        if (input.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(input.status);
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.persona_definitions
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as PersonaDefinitionRow) : null;
    }

    /**
     * Delete a persona definition (hard delete - use for cleanup only)
     */
    async delete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.persona_definitions
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Upsert a persona definition by slug (used for seeding)
     */
    async upsertBySlug(input: CreatePersonaDefinitionInput): Promise<PersonaDefinitionModel> {
        const query = `
            INSERT INTO flowmaestro.persona_definitions (
                name, slug, title, description, avatar_url, category, tags,
                specialty, expertise_areas, example_tasks, typical_deliverables,
                input_fields, deliverables, sop_steps, estimated_duration, estimated_cost_credits,
                system_prompt, model, provider, temperature, max_tokens,
                default_tools, default_max_duration_hours, default_max_cost_credits,
                autonomy_level, tool_risk_overrides, featured, sort_order, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
            ON CONFLICT (slug) DO UPDATE SET
                name = EXCLUDED.name,
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                avatar_url = EXCLUDED.avatar_url,
                category = EXCLUDED.category,
                tags = EXCLUDED.tags,
                specialty = EXCLUDED.specialty,
                expertise_areas = EXCLUDED.expertise_areas,
                example_tasks = EXCLUDED.example_tasks,
                typical_deliverables = EXCLUDED.typical_deliverables,
                input_fields = EXCLUDED.input_fields,
                deliverables = EXCLUDED.deliverables,
                sop_steps = EXCLUDED.sop_steps,
                estimated_duration = EXCLUDED.estimated_duration,
                estimated_cost_credits = EXCLUDED.estimated_cost_credits,
                system_prompt = EXCLUDED.system_prompt,
                model = EXCLUDED.model,
                provider = EXCLUDED.provider,
                temperature = EXCLUDED.temperature,
                max_tokens = EXCLUDED.max_tokens,
                default_tools = EXCLUDED.default_tools,
                default_max_duration_hours = EXCLUDED.default_max_duration_hours,
                default_max_cost_credits = EXCLUDED.default_max_cost_credits,
                autonomy_level = EXCLUDED.autonomy_level,
                tool_risk_overrides = EXCLUDED.tool_risk_overrides,
                featured = EXCLUDED.featured,
                sort_order = EXCLUDED.sort_order,
                status = EXCLUDED.status,
                updated_at = NOW()
            RETURNING *
        `;

        const values = [
            input.name,
            input.slug,
            input.title,
            input.description,
            input.avatar_url || null,
            input.category,
            input.tags || [],
            input.specialty,
            JSON.stringify(input.expertise_areas),
            JSON.stringify(input.example_tasks),
            JSON.stringify(input.typical_deliverables || []),
            JSON.stringify(input.input_fields),
            JSON.stringify(input.deliverables),
            JSON.stringify(input.sop_steps),
            JSON.stringify(input.estimated_duration || { min_minutes: 15, max_minutes: 30 }),
            input.estimated_cost_credits || 25,
            input.system_prompt,
            input.model || "claude-sonnet-4-20250514",
            input.provider || "anthropic",
            input.temperature !== undefined ? input.temperature : 0.7,
            input.max_tokens || 4096,
            JSON.stringify(input.default_tools || []),
            input.default_max_duration_hours !== undefined ? input.default_max_duration_hours : 4.0,
            input.default_max_cost_credits || 100,
            input.autonomy_level || "approve_high_risk",
            JSON.stringify(input.tool_risk_overrides || {}),
            input.featured || false,
            input.sort_order || 0,
            input.status || "active"
        ];

        const result = await db.query(query, values);
        return this.mapRow(result.rows[0] as PersonaDefinitionRow);
    }

    /**
     * Map database row to full model
     */
    private mapRow(row: PersonaDefinitionRow): PersonaDefinitionModel {
        return {
            id: row.id,
            name: row.name,
            slug: row.slug,
            title: row.title,
            description: row.description,
            avatar_url: row.avatar_url,
            category: row.category as PersonaCategory,
            tags: this.parseStringArray(row.tags),
            specialty: row.specialty,
            expertise_areas: this.parseJsonArray(row.expertise_areas),
            example_tasks: this.parseJsonArray(row.example_tasks),
            typical_deliverables: this.parseJsonArray(row.typical_deliverables),
            input_fields: this.parseJson(row.input_fields) as PersonaInputField[],
            deliverables: this.parseJson(row.deliverables) as PersonaDeliverableSpec[],
            sop_steps: this.parseJsonArray(row.sop_steps),
            estimated_duration: this.parseJson(row.estimated_duration) as PersonaEstimatedDuration,
            estimated_cost_credits:
                typeof row.estimated_cost_credits === "string"
                    ? parseInt(row.estimated_cost_credits)
                    : row.estimated_cost_credits,
            // Agent configuration
            system_prompt: row.system_prompt,
            model: row.model,
            provider: row.provider as LLMProvider,
            temperature:
                typeof row.temperature === "string" ? parseFloat(row.temperature) : row.temperature,
            max_tokens:
                typeof row.max_tokens === "string" ? parseInt(row.max_tokens) : row.max_tokens,
            default_tools:
                typeof row.default_tools === "string"
                    ? JSON.parse(row.default_tools)
                    : row.default_tools,
            default_max_duration_hours:
                typeof row.default_max_duration_hours === "string"
                    ? parseFloat(row.default_max_duration_hours)
                    : row.default_max_duration_hours,
            default_max_cost_credits:
                typeof row.default_max_cost_credits === "string"
                    ? parseInt(row.default_max_cost_credits)
                    : row.default_max_cost_credits,
            autonomy_level: row.autonomy_level as PersonaAutonomyLevel,
            tool_risk_overrides:
                typeof row.tool_risk_overrides === "string"
                    ? JSON.parse(row.tool_risk_overrides)
                    : row.tool_risk_overrides,
            featured: row.featured,
            sort_order:
                typeof row.sort_order === "string" ? parseInt(row.sort_order) : row.sort_order,
            status: row.status as PersonaStatus,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        };
    }

    /**
     * Map database row to summary model
     */
    private mapSummaryRow(row: PersonaDefinitionRow): PersonaDefinitionSummary {
        return {
            id: row.id,
            name: row.name,
            slug: row.slug,
            title: row.title,
            description: row.description,
            avatar_url: row.avatar_url,
            category: row.category as PersonaCategory,
            tags: this.parseStringArray(row.tags),
            specialty: row.specialty,
            expertise_areas: this.parseJsonArray(row.expertise_areas),
            example_tasks: this.parseJsonArray(row.example_tasks),
            typical_deliverables: this.parseJsonArray(row.typical_deliverables),
            input_fields: this.parseJson(row.input_fields) as PersonaInputField[],
            deliverables: this.parseJson(row.deliverables) as PersonaDeliverableSpec[],
            estimated_duration: this.parseJson(row.estimated_duration) as PersonaEstimatedDuration,
            estimated_cost_credits:
                typeof row.estimated_cost_credits === "string"
                    ? parseInt(row.estimated_cost_credits)
                    : row.estimated_cost_credits,
            default_tools:
                typeof row.default_tools === "string"
                    ? JSON.parse(row.default_tools)
                    : row.default_tools,
            featured: row.featured,
            status: row.status as PersonaStatus
        };
    }

    /**
     * Parse string array from database (handles both array and string format)
     */
    private parseStringArray(value: string[] | string): string[] {
        if (Array.isArray(value)) {
            return value;
        }
        if (typeof value === "string") {
            // PostgreSQL array format: {item1,item2}
            if (value.startsWith("{") && value.endsWith("}")) {
                const inner = value.slice(1, -1);
                return inner ? inner.split(",").map((s) => s.trim()) : [];
            }
            // JSON format
            try {
                return JSON.parse(value);
            } catch {
                return [];
            }
        }
        return [];
    }

    /**
     * Parse JSON array from database
     */
    private parseJsonArray(value: string[] | string): string[] {
        if (Array.isArray(value)) {
            return value;
        }
        if (typeof value === "string") {
            try {
                return JSON.parse(value);
            } catch {
                return [];
            }
        }
        return [];
    }

    /**
     * Parse JSON object from database
     */
    private parseJson<T>(value: T | string): T {
        if (typeof value === "string") {
            try {
                return JSON.parse(value) as T;
            } catch {
                return value as T;
            }
        }
        return value;
    }
}
