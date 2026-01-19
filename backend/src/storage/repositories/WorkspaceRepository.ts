import {
    WORKSPACE_LIMITS,
    type Workspace,
    type WorkspaceWithStats,
    type WorkspaceCategory,
    type WorkspaceType
} from "@flowmaestro/shared";
import { db } from "../database";
import { WorkspaceModel, CreateWorkspaceInput, UpdateWorkspaceInput } from "../models/Workspace";

interface WorkspaceRow {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category: WorkspaceCategory;
    type: WorkspaceType;
    owner_id: string;
    max_workflows: number;
    max_agents: number;
    max_knowledge_bases: number;
    max_kb_chunks: number;
    max_members: number;
    max_connections: number;
    execution_history_days: number;
    stripe_subscription_id: string | null;
    billing_email: string | null;
    settings: Record<string, unknown>;
    created_at: string | Date;
    updated_at: string | Date;
    deleted_at: string | Date | null;
}

interface WorkspaceWithStatsRow extends WorkspaceRow {
    member_count: string;
    workflow_count?: string;
    agent_count?: string;
}

export class WorkspaceRepository {
    async create(input: CreateWorkspaceInput): Promise<WorkspaceModel> {
        // Get limits for the workspace type
        const limits = WORKSPACE_LIMITS[input.type || "free"];

        const query = `
            INSERT INTO flowmaestro.workspaces (
                owner_id, name, slug, description, category, type,
                max_workflows, max_agents, max_knowledge_bases, max_kb_chunks,
                max_members, max_connections, execution_history_days
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `;

        const values = [
            input.owner_id,
            input.name,
            input.slug,
            input.description || null,
            input.category || "personal",
            input.type || "free",
            limits.max_workflows,
            limits.max_agents,
            limits.max_knowledge_bases,
            limits.max_kb_chunks,
            limits.max_members,
            limits.max_connections,
            limits.execution_history_days
        ];

        const result = await db.query<WorkspaceRow>(query, values);
        return this.mapRow(result.rows[0]);
    }

    async findById(id: string): Promise<WorkspaceModel | null> {
        const query = `
            SELECT * FROM flowmaestro.workspaces
            WHERE id = $1 AND deleted_at IS NULL
        `;

        const result = await db.query<WorkspaceRow>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findBySlug(slug: string): Promise<WorkspaceModel | null> {
        const query = `
            SELECT * FROM flowmaestro.workspaces
            WHERE slug = $1 AND deleted_at IS NULL
        `;

        const result = await db.query<WorkspaceRow>(query, [slug]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByOwnerId(ownerId: string): Promise<WorkspaceModel[]> {
        const query = `
            SELECT * FROM flowmaestro.workspaces
            WHERE owner_id = $1 AND deleted_at IS NULL
            ORDER BY created_at ASC
        `;

        const result = await db.query<WorkspaceRow>(query, [ownerId]);
        return result.rows.map((row) => this.mapRow(row));
    }

    async findByOwnerIdWithStats(ownerId: string): Promise<WorkspaceWithStats[]> {
        const query = `
            SELECT
                w.*,
                (SELECT COUNT(*) FROM flowmaestro.workspace_members wm WHERE wm.workspace_id = w.id) as member_count,
                (SELECT COUNT(*) FROM flowmaestro.workflows wf WHERE wf.workspace_id = w.id AND wf.deleted_at IS NULL) as workflow_count,
                (SELECT COUNT(*) FROM flowmaestro.agents a WHERE a.workspace_id = w.id AND a.deleted_at IS NULL) as agent_count
            FROM flowmaestro.workspaces w
            WHERE w.owner_id = $1 AND w.deleted_at IS NULL
            ORDER BY w.created_at ASC
        `;

        const result = await db.query<WorkspaceWithStatsRow>(query, [ownerId]);
        return result.rows.map((row) => this.mapRowWithStats(row));
    }

    async findByMemberUserId(userId: string): Promise<WorkspaceModel[]> {
        const query = `
            SELECT w.* FROM flowmaestro.workspaces w
            INNER JOIN flowmaestro.workspace_members wm ON w.id = wm.workspace_id
            WHERE wm.user_id = $1 AND w.deleted_at IS NULL
            ORDER BY w.created_at ASC
        `;

        const result = await db.query<WorkspaceRow>(query, [userId]);
        return result.rows.map((row) => this.mapRow(row));
    }

    async findByMemberUserIdWithStats(userId: string): Promise<WorkspaceWithStats[]> {
        const query = `
            SELECT
                w.*,
                (SELECT COUNT(*) FROM flowmaestro.workspace_members wm2 WHERE wm2.workspace_id = w.id) as member_count,
                (SELECT COUNT(*) FROM flowmaestro.workflows wf WHERE wf.workspace_id = w.id AND wf.deleted_at IS NULL) as workflow_count,
                (SELECT COUNT(*) FROM flowmaestro.agents a WHERE a.workspace_id = w.id AND a.deleted_at IS NULL) as agent_count
            FROM flowmaestro.workspaces w
            INNER JOIN flowmaestro.workspace_members wm ON w.id = wm.workspace_id
            WHERE wm.user_id = $1 AND w.deleted_at IS NULL
            ORDER BY w.created_at ASC
        `;

        const result = await db.query<WorkspaceWithStatsRow>(query, [userId]);
        return result.rows.map((row) => this.mapRowWithStats(row));
    }

    async findMemberWorkspacesExcludingOwned(userId: string): Promise<WorkspaceWithStats[]> {
        const query = `
            SELECT
                w.*,
                (SELECT COUNT(*) FROM flowmaestro.workspace_members wm2 WHERE wm2.workspace_id = w.id) as member_count,
                (SELECT COUNT(*) FROM flowmaestro.workflows wf WHERE wf.workspace_id = w.id AND wf.deleted_at IS NULL) as workflow_count,
                (SELECT COUNT(*) FROM flowmaestro.agents a WHERE a.workspace_id = w.id AND a.deleted_at IS NULL) as agent_count
            FROM flowmaestro.workspaces w
            INNER JOIN flowmaestro.workspace_members wm ON w.id = wm.workspace_id
            WHERE wm.user_id = $1 AND w.owner_id != $1 AND w.deleted_at IS NULL
            ORDER BY w.created_at ASC
        `;

        const result = await db.query<WorkspaceWithStatsRow>(query, [userId]);
        return result.rows.map((row) => this.mapRowWithStats(row));
    }

    async update(id: string, input: UpdateWorkspaceInput): Promise<WorkspaceModel | null> {
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
        if (input.type !== undefined) {
            updates.push(`type = $${paramIndex++}`);
            values.push(input.type);
        }
        if (input.max_workflows !== undefined) {
            updates.push(`max_workflows = $${paramIndex++}`);
            values.push(input.max_workflows);
        }
        if (input.max_agents !== undefined) {
            updates.push(`max_agents = $${paramIndex++}`);
            values.push(input.max_agents);
        }
        if (input.max_knowledge_bases !== undefined) {
            updates.push(`max_knowledge_bases = $${paramIndex++}`);
            values.push(input.max_knowledge_bases);
        }
        if (input.max_kb_chunks !== undefined) {
            updates.push(`max_kb_chunks = $${paramIndex++}`);
            values.push(input.max_kb_chunks);
        }
        if (input.max_members !== undefined) {
            updates.push(`max_members = $${paramIndex++}`);
            values.push(input.max_members);
        }
        if (input.max_connections !== undefined) {
            updates.push(`max_connections = $${paramIndex++}`);
            values.push(input.max_connections);
        }
        if (input.execution_history_days !== undefined) {
            updates.push(`execution_history_days = $${paramIndex++}`);
            values.push(input.execution_history_days);
        }
        if (input.stripe_subscription_id !== undefined) {
            updates.push(`stripe_subscription_id = $${paramIndex++}`);
            values.push(input.stripe_subscription_id);
        }
        if (input.billing_email !== undefined) {
            updates.push(`billing_email = $${paramIndex++}`);
            values.push(input.billing_email);
        }
        if (input.settings !== undefined) {
            updates.push(`settings = $${paramIndex++}`);
            values.push(JSON.stringify(input.settings));
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.workspaces
            SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramIndex} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query<WorkspaceRow>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async delete(id: string): Promise<boolean> {
        const query = `
            UPDATE flowmaestro.workspaces
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    async isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
        const query = excludeId
            ? "SELECT 1 FROM flowmaestro.workspaces WHERE slug = $1 AND id != $2 AND deleted_at IS NULL"
            : "SELECT 1 FROM flowmaestro.workspaces WHERE slug = $1 AND deleted_at IS NULL";

        const params = excludeId ? [slug, excludeId] : [slug];
        const result = await db.query(query, params);
        return result.rowCount === 0;
    }

    async isNameAvailableForOwner(
        name: string,
        ownerId: string,
        excludeId?: string
    ): Promise<boolean> {
        const query = excludeId
            ? "SELECT 1 FROM flowmaestro.workspaces WHERE name = $1 AND owner_id = $2 AND id != $3 AND deleted_at IS NULL"
            : "SELECT 1 FROM flowmaestro.workspaces WHERE name = $1 AND owner_id = $2 AND deleted_at IS NULL";

        const params = excludeId ? [name, ownerId, excludeId] : [name, ownerId];
        const result = await db.query(query, params);
        return result.rowCount === 0;
    }

    async getResourceCounts(workspaceId: string): Promise<{
        workflows: number;
        agents: number;
        knowledgeBases: number;
        connections: number;
        folders: number;
        formInterfaces: number;
        chatInterfaces: number;
    }> {
        const query = `
            SELECT
                (SELECT COUNT(*) FROM flowmaestro.workflows WHERE workspace_id = $1 AND deleted_at IS NULL) as workflow_count,
                (SELECT COUNT(*) FROM flowmaestro.agents WHERE workspace_id = $1 AND deleted_at IS NULL) as agent_count,
                (SELECT COUNT(*) FROM flowmaestro.knowledge_bases WHERE workspace_id = $1) as knowledge_base_count,
                (SELECT COUNT(*) FROM flowmaestro.connections WHERE workspace_id = $1) as connection_count,
                (SELECT COUNT(*) FROM flowmaestro.folders WHERE workspace_id = $1 AND deleted_at IS NULL) as folder_count,
                (SELECT COUNT(*) FROM flowmaestro.form_interfaces WHERE workspace_id = $1 AND deleted_at IS NULL) as form_interface_count,
                (SELECT COUNT(*) FROM flowmaestro.chat_interfaces WHERE workspace_id = $1 AND deleted_at IS NULL) as chat_interface_count
        `;

        const result = await db.query<{
            workflow_count: string;
            agent_count: string;
            knowledge_base_count: string;
            connection_count: string;
            folder_count: string;
            form_interface_count: string;
            chat_interface_count: string;
        }>(query, [workspaceId]);

        const row = result.rows[0];
        return {
            workflows: parseInt(row.workflow_count),
            agents: parseInt(row.agent_count),
            knowledgeBases: parseInt(row.knowledge_base_count),
            connections: parseInt(row.connection_count),
            folders: parseInt(row.folder_count),
            formInterfaces: parseInt(row.form_interface_count),
            chatInterfaces: parseInt(row.chat_interface_count)
        };
    }

    private mapRow(row: WorkspaceRow): WorkspaceModel {
        return {
            id: row.id,
            name: row.name,
            slug: row.slug,
            description: row.description,
            category: row.category,
            type: row.type,
            owner_id: row.owner_id,
            max_workflows: row.max_workflows,
            max_agents: row.max_agents,
            max_knowledge_bases: row.max_knowledge_bases,
            max_kb_chunks: row.max_kb_chunks,
            max_members: row.max_members,
            max_connections: row.max_connections,
            execution_history_days: row.execution_history_days,
            stripe_subscription_id: row.stripe_subscription_id,
            billing_email: row.billing_email,
            settings: row.settings || {},
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            deleted_at: row.deleted_at ? new Date(row.deleted_at) : null
        };
    }

    private mapRowWithStats(row: WorkspaceWithStatsRow): WorkspaceWithStats {
        return {
            id: row.id,
            name: row.name,
            slug: row.slug,
            description: row.description,
            category: row.category,
            type: row.type,
            ownerId: row.owner_id,
            maxWorkflows: row.max_workflows,
            maxAgents: row.max_agents,
            maxKnowledgeBases: row.max_knowledge_bases,
            maxKbChunks: row.max_kb_chunks,
            maxMembers: row.max_members,
            maxConnections: row.max_connections,
            executionHistoryDays: row.execution_history_days,
            stripeSubscriptionId: row.stripe_subscription_id,
            billingEmail: row.billing_email,
            settings: row.settings || {},
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            memberCount: parseInt(row.member_count),
            workflowCount: row.workflow_count ? parseInt(row.workflow_count) : undefined,
            agentCount: row.agent_count ? parseInt(row.agent_count) : undefined
        };
    }

    // Convert model to shared type
    modelToShared(model: WorkspaceModel): Workspace {
        return {
            id: model.id,
            name: model.name,
            slug: model.slug,
            description: model.description,
            category: model.category,
            type: model.type,
            ownerId: model.owner_id,
            maxWorkflows: model.max_workflows,
            maxAgents: model.max_agents,
            maxKnowledgeBases: model.max_knowledge_bases,
            maxKbChunks: model.max_kb_chunks,
            maxMembers: model.max_members,
            maxConnections: model.max_connections,
            executionHistoryDays: model.execution_history_days,
            stripeSubscriptionId: model.stripe_subscription_id,
            billingEmail: model.billing_email,
            settings: model.settings,
            createdAt: model.created_at,
            updatedAt: model.updated_at
        };
    }
}
