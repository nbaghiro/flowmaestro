import type { PersonaInputField } from "@flowmaestro/shared";
import { db } from "../database";
import type {
    PersonaTaskTemplateModel,
    PersonaTaskTemplateSummary,
    CreatePersonaTaskTemplateInput,
    UpdatePersonaTaskTemplateInput,
    PersonaTaskTemplateQueryOptions,
    TaskTemplateStatus
} from "../models/PersonaTaskTemplate";

/**
 * Database row interface for persona_task_templates table
 */
interface PersonaTaskTemplateRow {
    id: string;
    persona_definition_id: string;
    name: string;
    description: string;
    icon: string | null;
    task_template: string;
    variables: PersonaInputField[] | string;
    suggested_duration_hours: number | string;
    suggested_max_cost: number | string;
    sort_order: number | string;
    usage_count: number | string;
    status: string;
    created_at: string | Date;
    updated_at: string | Date;
}

export class PersonaTaskTemplateRepository {
    /**
     * Create a new task template
     */
    async create(input: CreatePersonaTaskTemplateInput): Promise<PersonaTaskTemplateModel> {
        const query = `
            INSERT INTO flowmaestro.persona_task_templates (
                persona_definition_id, name, description, icon,
                task_template, variables,
                suggested_duration_hours, suggested_max_cost,
                sort_order, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        const values = [
            input.persona_definition_id,
            input.name,
            input.description,
            input.icon || null,
            input.task_template,
            JSON.stringify(input.variables),
            input.suggested_duration_hours ?? 2.0,
            input.suggested_max_cost ?? 50,
            input.sort_order ?? 0,
            input.status ?? "active"
        ];

        const result = await db.query<PersonaTaskTemplateRow>(query, values);
        return this.mapRowToModel(result.rows[0]);
    }

    /**
     * Find template by ID
     */
    async findById(id: string): Promise<PersonaTaskTemplateModel | null> {
        const query = `
            SELECT *
            FROM flowmaestro.persona_task_templates
            WHERE id = $1
        `;

        const result = await db.query<PersonaTaskTemplateRow>(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToModel(result.rows[0]);
    }

    /**
     * Find all templates for a persona by persona ID
     */
    async findByPersonaId(
        personaDefinitionId: string,
        status: TaskTemplateStatus = "active"
    ): Promise<PersonaTaskTemplateSummary[]> {
        const query = `
            SELECT id, name, description, icon, variables,
                   suggested_duration_hours, suggested_max_cost, usage_count
            FROM flowmaestro.persona_task_templates
            WHERE persona_definition_id = $1
              AND status = $2
            ORDER BY sort_order ASC, name ASC
        `;

        const result = await db.query<PersonaTaskTemplateRow>(query, [personaDefinitionId, status]);
        return result.rows.map((row) => this.mapRowToSummary(row));
    }

    /**
     * Find all templates for a persona by persona slug
     */
    async findByPersonaSlug(
        personaSlug: string,
        status: TaskTemplateStatus = "active"
    ): Promise<PersonaTaskTemplateSummary[]> {
        const query = `
            SELECT t.id, t.name, t.description, t.icon, t.variables,
                   t.suggested_duration_hours, t.suggested_max_cost, t.usage_count
            FROM flowmaestro.persona_task_templates t
            JOIN flowmaestro.persona_definitions p ON t.persona_definition_id = p.id
            WHERE p.slug = $1
              AND t.status = $2
            ORDER BY t.sort_order ASC, t.name ASC
        `;

        const result = await db.query<PersonaTaskTemplateRow>(query, [personaSlug, status]);
        return result.rows.map((row) => this.mapRowToSummary(row));
    }

    /**
     * Find all templates with optional filtering
     */
    async findAll(
        options: PersonaTaskTemplateQueryOptions = {}
    ): Promise<PersonaTaskTemplateSummary[]> {
        const conditions: string[] = [];
        const values: (string | number)[] = [];
        let paramIndex = 1;

        if (options.persona_definition_id) {
            conditions.push(`t.persona_definition_id = $${paramIndex++}`);
            values.push(options.persona_definition_id);
        }

        if (options.persona_slug) {
            conditions.push(`p.slug = $${paramIndex++}`);
            values.push(options.persona_slug);
        }

        if (options.status) {
            conditions.push(`t.status = $${paramIndex++}`);
            values.push(options.status);
        } else {
            conditions.push("t.status = 'active'");
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const limit = options.limit ?? 100;
        const offset = options.offset ?? 0;

        const query = `
            SELECT t.id, t.name, t.description, t.icon, t.variables,
                   t.suggested_duration_hours, t.suggested_max_cost, t.usage_count
            FROM flowmaestro.persona_task_templates t
            JOIN flowmaestro.persona_definitions p ON t.persona_definition_id = p.id
            ${whereClause}
            ORDER BY t.sort_order ASC, t.name ASC
            LIMIT ${limit} OFFSET ${offset}
        `;

        const result = await db.query<PersonaTaskTemplateRow>(query, values);
        return result.rows.map((row) => this.mapRowToSummary(row));
    }

    /**
     * Update a task template
     */
    async update(
        id: string,
        input: UpdatePersonaTaskTemplateInput
    ): Promise<PersonaTaskTemplateModel | null> {
        const setClauses: string[] = [];
        const values: (string | number | null)[] = [];
        let paramIndex = 1;

        if (input.name !== undefined) {
            setClauses.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }

        if (input.description !== undefined) {
            setClauses.push(`description = $${paramIndex++}`);
            values.push(input.description);
        }

        if (input.icon !== undefined) {
            setClauses.push(`icon = $${paramIndex++}`);
            values.push(input.icon);
        }

        if (input.task_template !== undefined) {
            setClauses.push(`task_template = $${paramIndex++}`);
            values.push(input.task_template);
        }

        if (input.variables !== undefined) {
            setClauses.push(`variables = $${paramIndex++}`);
            values.push(JSON.stringify(input.variables));
        }

        if (input.suggested_duration_hours !== undefined) {
            setClauses.push(`suggested_duration_hours = $${paramIndex++}`);
            values.push(input.suggested_duration_hours);
        }

        if (input.suggested_max_cost !== undefined) {
            setClauses.push(`suggested_max_cost = $${paramIndex++}`);
            values.push(input.suggested_max_cost);
        }

        if (input.sort_order !== undefined) {
            setClauses.push(`sort_order = $${paramIndex++}`);
            values.push(input.sort_order);
        }

        if (input.status !== undefined) {
            setClauses.push(`status = $${paramIndex++}`);
            values.push(input.status);
        }

        if (setClauses.length === 0) {
            return this.findById(id);
        }

        values.push(id);

        const query = `
            UPDATE flowmaestro.persona_task_templates
            SET ${setClauses.join(", ")}, updated_at = NOW()
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query<PersonaTaskTemplateRow>(query, values);
        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToModel(result.rows[0]);
    }

    /**
     * Increment usage count for a template
     */
    async incrementUsageCount(id: string): Promise<void> {
        const query = `
            UPDATE flowmaestro.persona_task_templates
            SET usage_count = usage_count + 1, updated_at = NOW()
            WHERE id = $1
        `;

        await db.query(query, [id]);
    }

    /**
     * Delete a task template
     */
    async delete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.persona_task_templates
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Upsert a template by persona ID and name (useful for seeding)
     */
    async upsertByPersonaAndName(
        input: CreatePersonaTaskTemplateInput
    ): Promise<PersonaTaskTemplateModel> {
        const query = `
            INSERT INTO flowmaestro.persona_task_templates (
                persona_definition_id, name, description, icon,
                task_template, variables,
                suggested_duration_hours, suggested_max_cost,
                sort_order, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (persona_definition_id, name) DO UPDATE SET
                description = EXCLUDED.description,
                icon = EXCLUDED.icon,
                task_template = EXCLUDED.task_template,
                variables = EXCLUDED.variables,
                suggested_duration_hours = EXCLUDED.suggested_duration_hours,
                suggested_max_cost = EXCLUDED.suggested_max_cost,
                sort_order = EXCLUDED.sort_order,
                status = EXCLUDED.status,
                updated_at = NOW()
            RETURNING *
        `;

        const values = [
            input.persona_definition_id,
            input.name,
            input.description,
            input.icon || null,
            input.task_template,
            JSON.stringify(input.variables),
            input.suggested_duration_hours ?? 2.0,
            input.suggested_max_cost ?? 50,
            input.sort_order ?? 0,
            input.status ?? "active"
        ];

        const result = await db.query<PersonaTaskTemplateRow>(query, values);
        return this.mapRowToModel(result.rows[0]);
    }

    // =========================================================================
    // Private Helper Methods
    // =========================================================================

    private mapRowToModel(row: PersonaTaskTemplateRow): PersonaTaskTemplateModel {
        return {
            id: row.id,
            persona_definition_id: row.persona_definition_id,
            name: row.name,
            description: row.description,
            icon: row.icon,
            task_template: row.task_template,
            variables: this.parseJsonArray<PersonaInputField>(row.variables),
            suggested_duration_hours: this.parseNumber(row.suggested_duration_hours),
            suggested_max_cost: this.parseNumber(row.suggested_max_cost),
            sort_order: this.parseNumber(row.sort_order),
            usage_count: this.parseNumber(row.usage_count),
            status: row.status as TaskTemplateStatus,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        };
    }

    private mapRowToSummary(row: PersonaTaskTemplateRow): PersonaTaskTemplateSummary {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            icon: row.icon,
            variables: this.parseJsonArray<PersonaInputField>(row.variables),
            suggested_duration_hours: this.parseNumber(row.suggested_duration_hours),
            suggested_max_cost: this.parseNumber(row.suggested_max_cost),
            usage_count: this.parseNumber(row.usage_count)
        };
    }

    private parseJsonArray<T>(value: T[] | string): T[] {
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

    private parseNumber(value: number | string): number {
        if (typeof value === "number") {
            return value;
        }
        return parseFloat(value) || 0;
    }
}
