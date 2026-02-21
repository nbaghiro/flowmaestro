/**
 * WorkspaceMemberRepository Tests
 *
 * Tests for workspace member CRUD operations including role management,
 * member queries, and user relationship handling.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { WorkspaceMemberRepository } from "../WorkspaceMemberRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generateWorkspaceMemberRow,
    generateId
} from "./setup";

describe("WorkspaceMemberRepository", () => {
    let repository: WorkspaceMemberRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new WorkspaceMemberRepository();
    });

    describe("create", () => {
        it("should insert a new workspace member", async () => {
            const input = {
                workspace_id: generateId(),
                user_id: generateId(),
                role: "member" as const
            };

            const mockRow = generateWorkspaceMemberRow({
                workspace_id: input.workspace_id,
                user_id: input.user_id,
                role: input.role
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.workspace_members"),
                expect.arrayContaining([input.workspace_id, input.user_id, input.role])
            );
            expect(result.workspace_id).toBe(input.workspace_id);
            expect(result.role).toBe(input.role);
        });

        it("should create member with invitation details", async () => {
            const invitedAt = new Date();
            const input = {
                workspace_id: generateId(),
                user_id: generateId(),
                role: "member" as const,
                invited_by: generateId(),
                invited_at: invitedAt
            };

            const mockRow = generateWorkspaceMemberRow({
                ...input,
                invited_at: invitedAt.toISOString(),
                accepted_at: null
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.invited_by).toBe(input.invited_by);
            expect(result.invited_at).toBeInstanceOf(Date);
            expect(result.accepted_at).toBeNull();
        });

        it("should create member with accepted_at", async () => {
            const acceptedAt = new Date();
            const input = {
                workspace_id: generateId(),
                user_id: generateId(),
                role: "admin" as const,
                accepted_at: acceptedAt
            };

            const mockRow = generateWorkspaceMemberRow({
                ...input,
                role: "admin",
                accepted_at: acceptedAt.toISOString()
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.accepted_at).toBeInstanceOf(Date);
        });
    });

    describe("findById", () => {
        it("should return member when found", async () => {
            const memberId = generateId();
            const mockRow = generateWorkspaceMemberRow({ id: memberId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(memberId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1"), [
                memberId
            ]);
            expect(result?.id).toBe(memberId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("findByWorkspaceAndUser", () => {
        it("should find member by workspace and user IDs", async () => {
            const workspaceId = generateId();
            const userId = generateId();
            const mockRow = generateWorkspaceMemberRow({
                workspace_id: workspaceId,
                user_id: userId
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByWorkspaceAndUser(workspaceId, userId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE workspace_id = $1 AND user_id = $2"),
                [workspaceId, userId]
            );
            expect(result?.workspace_id).toBe(workspaceId);
            expect(result?.user_id).toBe(userId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findByWorkspaceAndUser(generateId(), generateId());

            expect(result).toBeNull();
        });
    });

    describe("findByWorkspaceId", () => {
        it("should return all members for workspace with pagination", async () => {
            const workspaceId = generateId();
            const mockMembers = [
                generateWorkspaceMemberRow({ workspace_id: workspaceId, role: "owner" }),
                generateWorkspaceMemberRow({ workspace_id: workspaceId, role: "member" })
            ];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(2))
                .mockResolvedValueOnce(mockRows(mockMembers));

            const result = await repository.findByWorkspaceId(workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE workspace_id = $1"),
                [workspaceId]
            );
            expect(result.members).toHaveLength(2);
            expect(result.total).toBe(2);
        });

        it("should order by created_at", async () => {
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockCountResult(0)).mockResolvedValueOnce(mockRows([]));

            await repository.findByWorkspaceId(workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY created_at ASC"),
                expect.any(Array)
            );
        });

        it("should support custom limit and offset", async () => {
            const workspaceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows([]));

            await repository.findByWorkspaceId(workspaceId, { limit: 5, offset: 10 });

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("LIMIT $2 OFFSET $3"), [
                workspaceId,
                5,
                10
            ]);
        });
    });

    describe("findByWorkspaceIdWithUsers", () => {
        it("should return members with user details", async () => {
            const workspaceId = generateId();
            const mockMembersWithUsers = [
                {
                    ...generateWorkspaceMemberRow({ workspace_id: workspaceId, role: "owner" }),
                    user_name: "Owner User",
                    user_email: "owner@example.com"
                },
                {
                    ...generateWorkspaceMemberRow({ workspace_id: workspaceId, role: "member" }),
                    user_name: "Member User",
                    user_email: "member@example.com"
                }
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockMembersWithUsers));

            const result = await repository.findByWorkspaceIdWithUsers(workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INNER JOIN flowmaestro.users u"),
                [workspaceId]
            );
            expect(result).toHaveLength(2);
            expect(result[0].user.name).toBe("Owner User");
            expect(result[0].user.email).toBe("owner@example.com");
        });

        it("should order by role priority then created_at", async () => {
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.findByWorkspaceIdWithUsers(workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("CASE wm.role"), [
                workspaceId
            ]);
        });
    });

    describe("findByUserId", () => {
        it("should return all memberships for user", async () => {
            const userId = generateId();
            const mockMemberships = [
                generateWorkspaceMemberRow({ user_id: userId }),
                generateWorkspaceMemberRow({ user_id: userId })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockMemberships));

            const result = await repository.findByUserId(userId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1"), [
                userId
            ]);
            expect(result).toHaveLength(2);
        });
    });

    describe("update", () => {
        it("should update specified fields", async () => {
            const memberId = generateId();
            const mockRow = generateWorkspaceMemberRow({ id: memberId, role: "admin" });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(memberId, { role: "admin" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.workspace_members"),
                expect.arrayContaining(["admin", memberId])
            );
            expect(result?.role).toBe("admin");
        });

        it("should update accepted_at", async () => {
            const memberId = generateId();
            const acceptedAt = new Date();
            const mockRow = generateWorkspaceMemberRow({
                id: memberId,
                accepted_at: acceptedAt.toISOString()
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(memberId, { accepted_at: acceptedAt });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("accepted_at = $"),
                expect.arrayContaining([acceptedAt, memberId])
            );
            expect(result?.accepted_at).toBeInstanceOf(Date);
        });

        it("should return existing member when no updates provided", async () => {
            const memberId = generateId();
            const mockRow = generateWorkspaceMemberRow({ id: memberId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.update(memberId, {});

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT * FROM flowmaestro.workspace_members"),
                [memberId]
            );
            expect(result?.id).toBe(memberId);
        });
    });

    describe("updateRole", () => {
        it("should update role by workspace and user IDs", async () => {
            const workspaceId = generateId();
            const userId = generateId();
            const mockRow = generateWorkspaceMemberRow({
                workspace_id: workspaceId,
                user_id: userId,
                role: "admin"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.updateRole(workspaceId, userId, "admin");

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE workspace_id = $1 AND user_id = $2"),
                [workspaceId, userId, "admin"]
            );
            expect(result?.role).toBe("admin");
        });

        it("should return null when member not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.updateRole(generateId(), generateId(), "admin");

            expect(result).toBeNull();
        });
    });

    describe("delete", () => {
        it("should hard delete member and return true", async () => {
            const memberId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(memberId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.workspace_members"),
                [memberId]
            );
            expect(result).toBe(true);
        });

        it("should return false when member not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.delete("non-existent");

            expect(result).toBe(false);
        });
    });

    describe("deleteByWorkspaceAndUser", () => {
        it("should delete member by workspace and user IDs", async () => {
            const workspaceId = generateId();
            const userId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.deleteByWorkspaceAndUser(workspaceId, userId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE workspace_id = $1 AND user_id = $2"),
                [workspaceId, userId]
            );
            expect(result).toBe(true);
        });

        it("should return false when member not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.deleteByWorkspaceAndUser(generateId(), generateId());

            expect(result).toBe(false);
        });
    });

    describe("getMemberCount", () => {
        it("should return member count for workspace", async () => {
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockCountResult(5));

            const result = await repository.getMemberCount(workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT COUNT(*) as count"),
                [workspaceId]
            );
            expect(result).toBe(5);
        });
    });

    describe("getOwner", () => {
        it("should return workspace owner", async () => {
            const workspaceId = generateId();
            const mockRow = generateWorkspaceMemberRow({
                workspace_id: workspaceId,
                role: "owner"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.getOwner(workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE workspace_id = $1 AND role = 'owner'"),
                [workspaceId]
            );
            expect(result?.role).toBe("owner");
        });

        it("should return null when no owner found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.getOwner(generateId());

            expect(result).toBeNull();
        });
    });

    describe("isUserMember", () => {
        it("should return true when user is member", async () => {
            const workspaceId = generateId();
            const userId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.isUserMember(workspaceId, userId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT 1 FROM flowmaestro.workspace_members"),
                [workspaceId, userId]
            );
            expect(result).toBe(true);
        });

        it("should return false when user is not member", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.isUserMember(generateId(), generateId());

            expect(result).toBe(false);
        });
    });

    describe("modelToShared", () => {
        it("should convert model to shared type", () => {
            const model = {
                id: generateId(),
                workspace_id: generateId(),
                user_id: generateId(),
                role: "member" as const,
                invited_by: generateId(),
                invited_at: new Date(),
                accepted_at: new Date(),
                created_at: new Date(),
                updated_at: new Date()
            };

            const result = repository.modelToShared(model);

            expect(result.id).toBe(model.id);
            expect(result.workspaceId).toBe(model.workspace_id);
            expect(result.userId).toBe(model.user_id);
            expect(result.role).toBe(model.role);
            expect(result.invitedBy).toBe(model.invited_by);
            expect(result.invitedAt).toEqual(model.invited_at);
            expect(result.acceptedAt).toEqual(model.accepted_at);
            expect(result.createdAt).toEqual(model.created_at);
            expect(result.updatedAt).toEqual(model.updated_at);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const memberId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateWorkspaceMemberRow({
                id: memberId,
                invited_at: now,
                accepted_at: now,
                created_at: now,
                updated_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(memberId);

            expect(result?.created_at).toBeInstanceOf(Date);
            expect(result?.updated_at).toBeInstanceOf(Date);
            expect(result?.invited_at).toBeInstanceOf(Date);
            expect(result?.accepted_at).toBeInstanceOf(Date);
        });

        it("should handle null date fields", async () => {
            const memberId = generateId();
            const mockRow = generateWorkspaceMemberRow({
                id: memberId,
                invited_by: null,
                invited_at: null,
                accepted_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(memberId);

            expect(result?.invited_by).toBeNull();
            expect(result?.invited_at).toBeNull();
            expect(result?.accepted_at).toBeNull();
        });
    });
});
