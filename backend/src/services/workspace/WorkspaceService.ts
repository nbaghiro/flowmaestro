import type {
    Workspace,
    WorkspaceWithStats,
    GetWorkspacesResponse,
    CreateWorkspaceInput,
    UpdateWorkspaceInput
} from "@flowmaestro/shared";
import { createServiceLogger } from "../../core/logging";
import { WorkspaceCreditRepository } from "../../storage/repositories/WorkspaceCreditRepository";
import { WorkspaceMemberRepository } from "../../storage/repositories/WorkspaceMemberRepository";
import { WorkspaceRepository } from "../../storage/repositories/WorkspaceRepository";

const logger = createServiceLogger("WorkspaceService");

export class WorkspaceService {
    private workspaceRepo: WorkspaceRepository;
    private memberRepo: WorkspaceMemberRepository;
    private creditRepo: WorkspaceCreditRepository;

    constructor() {
        this.workspaceRepo = new WorkspaceRepository();
        this.memberRepo = new WorkspaceMemberRepository();
        this.creditRepo = new WorkspaceCreditRepository();
    }

    /**
     * Create a new workspace for a user.
     * Also creates the owner membership and initializes credits.
     */
    async createWorkspace(ownerId: string, input: CreateWorkspaceInput): Promise<Workspace> {
        // Generate slug from name
        const slug = await this.generateUniqueSlug(input.name);

        // Create workspace
        const workspace = await this.workspaceRepo.create({
            owner_id: ownerId,
            name: input.name,
            slug,
            description: input.description,
            category: input.category || "personal"
        });

        logger.info({ workspaceId: workspace.id, ownerId }, "Workspace created");

        // Create owner membership
        await this.memberRepo.create({
            workspace_id: workspace.id,
            user_id: ownerId,
            role: "owner",
            accepted_at: new Date()
        });

        // Initialize credits (100 free credits for new workspaces)
        const limits = (await import("@flowmaestro/shared")).WORKSPACE_LIMITS["free"];
        await this.creditRepo.create({
            workspace_id: workspace.id,
            subscription_balance: limits.monthly_credits
        });

        logger.info({ workspaceId: workspace.id }, "Workspace credits initialized");

        return this.workspaceRepo.modelToShared(workspace);
    }

    /**
     * Create personal workspace for a new user (called during registration).
     */
    async createPersonalWorkspace(userId: string, _userName: string | null): Promise<Workspace> {
        return this.createWorkspace(userId, {
            name: "Personal Workspace",
            category: "personal"
        });
    }

    /**
     * Get workspaces for a user, grouped by owned and member.
     */
    async getWorkspacesForUser(userId: string): Promise<GetWorkspacesResponse> {
        const [owned, member] = await Promise.all([
            this.workspaceRepo.findByOwnerIdWithStats(userId),
            this.workspaceRepo.findMemberWorkspacesExcludingOwned(userId)
        ]);

        return { owned, member };
    }

    /**
     * Get a single workspace by ID.
     */
    async getWorkspace(workspaceId: string): Promise<Workspace | null> {
        const workspace = await this.workspaceRepo.findById(workspaceId);
        if (!workspace) return null;
        return this.workspaceRepo.modelToShared(workspace);
    }

    /**
     * Get a workspace with stats.
     */
    async getWorkspaceWithStats(workspaceId: string): Promise<WorkspaceWithStats | null> {
        const workspace = await this.workspaceRepo.findById(workspaceId);
        if (!workspace) return null;

        const memberCount = await this.memberRepo.getMemberCount(workspaceId);
        const counts = await this.workspaceRepo.getResourceCounts(workspaceId);

        return {
            ...this.workspaceRepo.modelToShared(workspace),
            memberCount,
            workflowCount: counts.workflows,
            agentCount: counts.agents
        };
    }

    /**
     * Update a workspace.
     */
    async updateWorkspace(
        workspaceId: string,
        input: UpdateWorkspaceInput
    ): Promise<Workspace | null> {
        const workspace = await this.workspaceRepo.update(workspaceId, {
            name: input.name,
            description: input.description,
            billing_email: input.billingEmail,
            settings: input.settings
        });

        if (!workspace) return null;

        logger.info({ workspaceId }, "Workspace updated");
        return this.workspaceRepo.modelToShared(workspace);
    }

    /**
     * Delete a workspace (soft delete).
     */
    async deleteWorkspace(workspaceId: string): Promise<boolean> {
        const success = await this.workspaceRepo.delete(workspaceId);
        if (success) {
            logger.info({ workspaceId }, "Workspace deleted");
        }
        return success;
    }

    /**
     * Check if workspace has reached a resource limit.
     */
    async checkLimit(
        workspaceId: string,
        resource: "workflows" | "agents" | "knowledgeBases" | "members" | "connections"
    ): Promise<{ allowed: boolean; current: number; max: number }> {
        const workspace = await this.workspaceRepo.findById(workspaceId);
        if (!workspace) {
            return { allowed: false, current: 0, max: 0 };
        }

        const counts = await this.workspaceRepo.getResourceCounts(workspaceId);

        let current: number;
        let max: number;

        switch (resource) {
            case "workflows":
                current = counts.workflows;
                max = workspace.max_workflows;
                break;
            case "agents":
                current = counts.agents;
                max = workspace.max_agents;
                break;
            case "knowledgeBases":
                current = counts.knowledgeBases;
                max = workspace.max_knowledge_bases;
                break;
            case "members":
                current = await this.memberRepo.getMemberCount(workspaceId);
                max = workspace.max_members;
                break;
            case "connections":
                current = counts.connections;
                max = workspace.max_connections;
                break;
        }

        // -1 means unlimited
        const allowed = max === -1 || current < max;

        return { allowed, current, max };
    }

    /**
     * Generate a unique slug from a name.
     */
    private async generateUniqueSlug(name: string): Promise<string> {
        // Convert to lowercase, replace spaces with hyphens, remove special chars
        let baseSlug = name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");

        // Ensure minimum length
        if (baseSlug.length < 1) {
            baseSlug = "workspace";
        }

        // Check if available
        let slug = baseSlug;
        let counter = 1;

        while (!(await this.workspaceRepo.isSlugAvailable(slug))) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        return slug;
    }
}

// Singleton instance
export const workspaceService = new WorkspaceService();
