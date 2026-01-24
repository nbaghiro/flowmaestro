/**
 * WorkspaceRepository Tests
 *
 * Tests for workspace CRUD operations including slug uniqueness,
 * member lookups, and resource count aggregations.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { WorkspaceRepository } from "../WorkspaceRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    generateWorkspaceRow,
    generateId
} from "./setup";

describe("WorkspaceRepository", () => {
    let repository: WorkspaceRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new WorkspaceRepository();
    });

    describe("create", () => {
        it("should insert a new workspace with default limits", async () => {
            const input = {
                name: "Test Workspace",
                slug: "test-workspace",
                owner_id: generateId()
            };

            const mockRow = {
                ...generateWorkspaceRow({
                    name: input.name,
                    slug: input.slug,
                    owner_id: input.owner_id
                }),
                category: "personal",
                type: "free",
                max_workflows: 10,
                max_agents: 5,
                max_knowledge_bases: 3,
                max_kb_chunks: 10000,
                max_members: 1,
                max_connections: 10,
                execution_history_days: 7,
                stripe_subscription_id: null,
                billing_email: null,
                settings: {}
            };

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.workspaces"),
                expect.arrayContaining([input.owner_id, input.name, input.slug])
            );
            expect(result.name).toBe(input.name);
            expect(result.slug).toBe(input.slug);
        });

        it("should handle optional description and category", async () => {
            const input = {
                name: "Team Workspace",
                slug: "team-workspace",
                owner_id: generateId(),
                description: "A team workspace",
                category: "team" as const
            };

            const mockRow = {
                ...generateWorkspaceRow({
                    name: input.name,
                    slug: input.slug,
                    owner_id: input.owner_id,
                    description: input.description
                }),
                category: input.category,
                type: "free",
                max_workflows: 10,
                max_agents: 5,
                max_knowledge_bases: 3,
                max_kb_chunks: 10000,
                max_members: 1,
                max_connections: 10,
                execution_history_days: 7,
                stripe_subscription_id: null,
                billing_email: null,
                settings: {}
            };

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.description).toBe(input.description);
            expect(result.category).toBe("team");
        });
    });

    describe("findById", () => {
        it("should return workspace when found", async () => {
            const workspaceId = generateId();
            const mockRow = {
                ...generateWorkspaceRow({ id: workspaceId }),
                category: "personal",
                type: "free",
                max_workflows: 10,
                max_agents: 5,
                max_knowledge_bases: 3,
                max_kb_chunks: 10000,
                max_members: 1,
                max_connections: 10,
                execution_history_days: 7,
                stripe_subscription_id: null,
                billing_email: null,
                settings: {}
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE id = $1 AND deleted_at IS NULL"),
                [workspaceId]
            );
            expect(result?.id).toBe(workspaceId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("findBySlug", () => {
        it("should return workspace when found by slug", async () => {
            const slug = "my-workspace";
            const mockRow = {
                ...generateWorkspaceRow({ slug }),
                category: "personal",
                type: "free",
                max_workflows: 10,
                max_agents: 5,
                max_knowledge_bases: 3,
                max_kb_chunks: 10000,
                max_members: 1,
                max_connections: 10,
                execution_history_days: 7,
                stripe_subscription_id: null,
                billing_email: null,
                settings: {}
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findBySlug(slug);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE slug = $1 AND deleted_at IS NULL"),
                [slug]
            );
            expect(result?.slug).toBe(slug);
        });
    });

    describe("findByOwnerId", () => {
        it("should return all workspaces owned by user", async () => {
            const ownerId = generateId();
            const mockRows1 = [
                {
                    ...generateWorkspaceRow({ owner_id: ownerId, name: "Workspace 1" }),
                    category: "personal",
                    type: "free",
                    max_workflows: 10,
                    max_agents: 5,
                    max_knowledge_bases: 3,
                    max_kb_chunks: 10000,
                    max_members: 1,
                    max_connections: 10,
                    execution_history_days: 7,
                    stripe_subscription_id: null,
                    billing_email: null,
                    settings: {}
                },
                {
                    ...generateWorkspaceRow({ owner_id: ownerId, name: "Workspace 2" }),
                    category: "personal",
                    type: "free",
                    max_workflows: 10,
                    max_agents: 5,
                    max_knowledge_bases: 3,
                    max_kb_chunks: 10000,
                    max_members: 1,
                    max_connections: 10,
                    execution_history_days: 7,
                    stripe_subscription_id: null,
                    billing_email: null,
                    settings: {}
                }
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockRows1));

            const result = await repository.findByOwnerId(ownerId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE owner_id = $1 AND deleted_at IS NULL"),
                [ownerId]
            );
            expect(result).toHaveLength(2);
        });
    });

    describe("findByOwnerIdWithStats", () => {
        it("should return workspaces with member, workflow, and agent counts", async () => {
            const ownerId = generateId();
            const mockRow = {
                ...generateWorkspaceRow({ owner_id: ownerId }),
                category: "personal",
                type: "free",
                max_workflows: 10,
                max_agents: 5,
                max_knowledge_bases: 3,
                max_kb_chunks: 10000,
                max_members: 1,
                max_connections: 10,
                execution_history_days: 7,
                stripe_subscription_id: null,
                billing_email: null,
                settings: {},
                member_count: "5",
                workflow_count: "10",
                agent_count: "3"
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByOwnerIdWithStats(ownerId);

            expect(result).toHaveLength(1);
            expect(result[0].memberCount).toBe(5);
            expect(result[0].workflowCount).toBe(10);
            expect(result[0].agentCount).toBe(3);
        });
    });

    describe("findByMemberUserId", () => {
        it("should return workspaces where user is a member", async () => {
            const userId = generateId();
            const mockRow = {
                ...generateWorkspaceRow(),
                category: "team",
                type: "free",
                max_workflows: 10,
                max_agents: 5,
                max_knowledge_bases: 3,
                max_kb_chunks: 10000,
                max_members: 1,
                max_connections: 10,
                execution_history_days: 7,
                stripe_subscription_id: null,
                billing_email: null,
                settings: {}
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByMemberUserId(userId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INNER JOIN flowmaestro.workspace_members"),
                [userId]
            );
            expect(result).toHaveLength(1);
        });
    });

    describe("update", () => {
        it("should update specified fields only", async () => {
            const workspaceId = generateId();
            const mockRow = {
                ...generateWorkspaceRow({ id: workspaceId, name: "Updated Name" }),
                category: "personal",
                type: "free",
                max_workflows: 10,
                max_agents: 5,
                max_knowledge_bases: 3,
                max_kb_chunks: 10000,
                max_members: 1,
                max_connections: 10,
                execution_history_days: 7,
                stripe_subscription_id: null,
                billing_email: null,
                settings: {}
            };

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(workspaceId, { name: "Updated Name" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.workspaces"),
                expect.arrayContaining(["Updated Name", workspaceId])
            );
            expect(result?.name).toBe("Updated Name");
        });

        it("should return existing workspace when no updates provided", async () => {
            const workspaceId = generateId();
            const mockRow = {
                ...generateWorkspaceRow({ id: workspaceId }),
                category: "personal",
                type: "free",
                max_workflows: 10,
                max_agents: 5,
                max_knowledge_bases: 3,
                max_kb_chunks: 10000,
                max_members: 1,
                max_connections: 10,
                execution_history_days: 7,
                stripe_subscription_id: null,
                billing_email: null,
                settings: {}
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.update(workspaceId, {});

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT * FROM flowmaestro.workspaces"),
                [workspaceId]
            );
            expect(result?.id).toBe(workspaceId);
        });

        it("should stringify settings when updating", async () => {
            const workspaceId = generateId();
            const newSettings = { theme: "dark" };
            const mockRow = {
                ...generateWorkspaceRow({ id: workspaceId }),
                category: "personal",
                type: "free",
                max_workflows: 10,
                max_agents: 5,
                max_knowledge_bases: 3,
                max_kb_chunks: 10000,
                max_members: 1,
                max_connections: 10,
                execution_history_days: 7,
                stripe_subscription_id: null,
                billing_email: null,
                settings: newSettings
            };

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(workspaceId, { settings: newSettings });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("settings = $1"),
                expect.arrayContaining([JSON.stringify(newSettings), workspaceId])
            );
        });
    });

    describe("delete", () => {
        it("should soft delete workspace and return true", async () => {
            const workspaceId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET deleted_at = CURRENT_TIMESTAMP"),
                [workspaceId]
            );
            expect(result).toBe(true);
        });

        it("should return false when workspace not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.delete("non-existent");

            expect(result).toBe(false);
        });
    });

    describe("isSlugAvailable", () => {
        it("should return true when slug is available", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.isSlugAvailable("new-slug");

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE slug = $1"), [
                "new-slug"
            ]);
            expect(result).toBe(true);
        });

        it("should return false when slug is taken", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.isSlugAvailable("existing-slug");

            expect(result).toBe(false);
        });

        it("should exclude specified id when checking", async () => {
            const excludeId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            await repository.isSlugAvailable("my-slug", excludeId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("AND id != $2"), [
                "my-slug",
                excludeId
            ]);
        });
    });

    describe("isNameAvailableForOwner", () => {
        it("should check name availability for owner", async () => {
            const ownerId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.isNameAvailableForOwner("New Workspace", ownerId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("LOWER(name) = LOWER($1) AND owner_id = $2"),
                ["New Workspace", ownerId]
            );
            expect(result).toBe(true);
        });
    });

    describe("getResourceCounts", () => {
        it("should return aggregated resource counts", async () => {
            const workspaceId = generateId();
            const mockRow = {
                workflow_count: "10",
                agent_count: "5",
                knowledge_base_count: "3",
                connection_count: "2",
                folder_count: "4",
                form_interface_count: "1",
                chat_interface_count: "2"
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.getResourceCounts(workspaceId);

            expect(result).toEqual({
                workflows: 10,
                agents: 5,
                knowledgeBases: 3,
                connections: 2,
                folders: 4,
                formInterfaces: 1,
                chatInterfaces: 2
            });
        });
    });

    describe("modelToShared", () => {
        it("should convert model to shared workspace type", async () => {
            const workspaceId = generateId();
            const mockRow = {
                ...generateWorkspaceRow({ id: workspaceId }),
                category: "personal" as const,
                type: "free" as const,
                max_workflows: 10,
                max_agents: 5,
                max_knowledge_bases: 3,
                max_kb_chunks: 10000,
                max_members: 1,
                max_connections: 10,
                execution_history_days: 7,
                stripe_subscription_id: null,
                billing_email: null,
                settings: {}
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const model = await repository.findById(workspaceId);
            const shared = repository.modelToShared(model!);

            expect(shared.id).toBe(workspaceId);
            expect(shared.ownerId).toBe(model?.owner_id);
            expect(shared.maxWorkflows).toBe(model?.max_workflows);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const workspaceId = generateId();
            const now = new Date().toISOString();
            const mockRow = {
                ...generateWorkspaceRow({ id: workspaceId, created_at: now, updated_at: now }),
                category: "personal",
                type: "free",
                max_workflows: 10,
                max_agents: 5,
                max_knowledge_bases: 3,
                max_kb_chunks: 10000,
                max_members: 1,
                max_connections: 10,
                execution_history_days: 7,
                stripe_subscription_id: null,
                billing_email: null,
                settings: {}
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(workspaceId);

            expect(result?.created_at).toBeInstanceOf(Date);
            expect(result?.updated_at).toBeInstanceOf(Date);
            expect(result?.deleted_at).toBeNull();
        });
    });
});
