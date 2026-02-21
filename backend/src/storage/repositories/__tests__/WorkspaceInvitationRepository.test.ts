/**
 * WorkspaceInvitationRepository Tests
 *
 * Tests for workspace invitation CRUD operations including token handling,
 * status management, and email-based lookups.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { WorkspaceInvitationRepository } from "../WorkspaceInvitationRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generateWorkspaceInvitationRow,
    generateId
} from "./setup";

describe("WorkspaceInvitationRepository", () => {
    let repository: WorkspaceInvitationRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new WorkspaceInvitationRepository();
    });

    describe("create", () => {
        it("should insert a new invitation with default expiry", async () => {
            const input = {
                workspace_id: generateId(),
                email: "invite@example.com",
                role: "member" as const,
                token: "inv_test123",
                invited_by: generateId()
            };

            const mockRow = generateWorkspaceInvitationRow({
                workspace_id: input.workspace_id,
                email: input.email.toLowerCase(),
                role: input.role,
                token: input.token
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.workspace_invitations"),
                expect.arrayContaining([
                    input.workspace_id,
                    input.email.toLowerCase(),
                    input.role,
                    input.token
                ])
            );
            expect(result.workspace_id).toBe(input.workspace_id);
            expect(result.status).toBe("pending");
        });

        it("should use custom expiry when provided", async () => {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 14);

            const input = {
                workspace_id: generateId(),
                email: "invite@example.com",
                role: "admin" as const,
                token: "inv_custom",
                invited_by: generateId(),
                expires_at: expiresAt
            };

            const mockRow = generateWorkspaceInvitationRow({
                ...input,
                expires_at: expiresAt.toISOString()
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([expiresAt])
            );
        });

        it("should include message when provided", async () => {
            const input = {
                workspace_id: generateId(),
                email: "invite@example.com",
                role: "member" as const,
                token: "inv_msg",
                invited_by: generateId(),
                message: "Welcome to our workspace!"
            };

            const mockRow = generateWorkspaceInvitationRow({
                ...input,
                message: input.message
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.message).toBe(input.message);
        });
    });

    describe("findById", () => {
        it("should return invitation when found", async () => {
            const invitationId = generateId();
            const mockRow = generateWorkspaceInvitationRow({ id: invitationId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(invitationId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1"), [
                invitationId
            ]);
            expect(result?.id).toBe(invitationId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("findByToken", () => {
        it("should return invitation when found by token", async () => {
            const token = "inv_token123";
            const mockRow = generateWorkspaceInvitationRow({ token });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByToken(token);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE token = $1"), [
                token
            ]);
            expect(result?.token).toBe(token);
        });
    });

    describe("findByTokenWithDetails", () => {
        it("should return invitation with workspace and inviter details", async () => {
            const token = "inv_details";
            const mockRow = {
                ...generateWorkspaceInvitationRow({ token }),
                workspace_name: "Test Workspace",
                workspace_slug: "test-workspace",
                inviter_name: "John Doe",
                inviter_email: "john@example.com"
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByTokenWithDetails(token);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INNER JOIN flowmaestro.workspaces"),
                [token]
            );
            expect(result?.workspace.name).toBe("Test Workspace");
            expect(result?.inviter.name).toBe("John Doe");
        });
    });

    describe("findByWorkspaceId", () => {
        it("should return all invitations for workspace with pagination", async () => {
            const workspaceId = generateId();
            const mockInvitations = [
                generateWorkspaceInvitationRow({ workspace_id: workspaceId }),
                generateWorkspaceInvitationRow({ workspace_id: workspaceId })
            ];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(2))
                .mockResolvedValueOnce(mockRows(mockInvitations));

            const result = await repository.findByWorkspaceId(workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE workspace_id = $1"),
                [workspaceId]
            );
            expect(result.invitations).toHaveLength(2);
            expect(result.total).toBe(2);
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

    describe("findPendingByWorkspaceId", () => {
        it("should return only pending, non-expired invitations", async () => {
            const workspaceId = generateId();
            const mockInvitations = [
                generateWorkspaceInvitationRow({ workspace_id: workspaceId, status: "pending" })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockInvitations));

            const result = await repository.findPendingByWorkspaceId(workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("status = 'pending' AND expires_at > NOW()"),
                [workspaceId]
            );
            expect(result).toHaveLength(1);
        });
    });

    describe("findByEmail", () => {
        it("should return invitations for email (case-insensitive)", async () => {
            const email = "User@Example.com";
            const mockInvitations = [
                generateWorkspaceInvitationRow({ email: email.toLowerCase() })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockInvitations));

            const result = await repository.findByEmail(email);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE email = $1"), [
                email.toLowerCase()
            ]);
            expect(result).toHaveLength(1);
        });
    });

    describe("findPendingByEmail", () => {
        it("should return only pending, non-expired invitations for email", async () => {
            const email = "user@example.com";
            const mockInvitations = [generateWorkspaceInvitationRow({ email, status: "pending" })];

            mockQuery.mockResolvedValueOnce(mockRows(mockInvitations));

            const result = await repository.findPendingByEmail(email);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("status = 'pending' AND expires_at > NOW()"),
                [email.toLowerCase()]
            );
            expect(result).toHaveLength(1);
        });
    });

    describe("findPendingByWorkspaceAndEmail", () => {
        it("should find pending invitation for workspace and email", async () => {
            const workspaceId = generateId();
            const email = "user@example.com";
            const mockRow = generateWorkspaceInvitationRow({
                workspace_id: workspaceId,
                email,
                status: "pending"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findPendingByWorkspaceAndEmail(workspaceId, email);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE workspace_id = $1 AND email = $2"),
                [workspaceId, email.toLowerCase()]
            );
            expect(result?.workspace_id).toBe(workspaceId);
        });

        it("should return null when no pending invitation found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findPendingByWorkspaceAndEmail(
                generateId(),
                "no@example.com"
            );

            expect(result).toBeNull();
        });
    });

    describe("update", () => {
        it("should update specified fields", async () => {
            const invitationId = generateId();
            const mockRow = generateWorkspaceInvitationRow({
                id: invitationId,
                status: "accepted"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(invitationId, { status: "accepted" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.workspace_invitations"),
                expect.arrayContaining(["accepted", invitationId])
            );
            expect(result?.status).toBe("accepted");
        });

        it("should update accepted_at", async () => {
            const invitationId = generateId();
            const acceptedAt = new Date();
            const mockRow = generateWorkspaceInvitationRow({
                id: invitationId,
                accepted_at: acceptedAt.toISOString()
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(invitationId, { accepted_at: acceptedAt });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("accepted_at = $"),
                expect.arrayContaining([acceptedAt, invitationId])
            );
        });

        it("should return existing invitation when no updates provided", async () => {
            const invitationId = generateId();
            const mockRow = generateWorkspaceInvitationRow({ id: invitationId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.update(invitationId, {});

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT * FROM flowmaestro.workspace_invitations"),
                [invitationId]
            );
            expect(result?.id).toBe(invitationId);
        });
    });

    describe("markAsAccepted", () => {
        it("should update status to accepted and set accepted_at", async () => {
            const invitationId = generateId();
            const mockRow = generateWorkspaceInvitationRow({
                id: invitationId,
                status: "accepted"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.markAsAccepted(invitationId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("status = 'accepted', accepted_at = NOW()"),
                [invitationId]
            );
            expect(result?.status).toBe("accepted");
        });
    });

    describe("markAsDeclined", () => {
        it("should update status to declined", async () => {
            const invitationId = generateId();
            const mockRow = generateWorkspaceInvitationRow({
                id: invitationId,
                status: "declined"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.markAsDeclined(invitationId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("status = 'declined'"), [
                invitationId
            ]);
            expect(result?.status).toBe("declined");
        });
    });

    describe("delete", () => {
        it("should hard delete invitation and return true", async () => {
            const invitationId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(invitationId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.workspace_invitations"),
                [invitationId]
            );
            expect(result).toBe(true);
        });

        it("should return false when invitation not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.delete("non-existent");

            expect(result).toBe(false);
        });
    });

    describe("expireOldInvitations", () => {
        it("should update expired invitations to expired status", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(5));

            const result = await repository.expireOldInvitations();

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("status = 'expired'"));
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE status = 'pending' AND expires_at <= NOW()")
            );
            expect(result).toBe(5);
        });
    });

    describe("modelToShared", () => {
        it("should convert model to shared type", () => {
            const model = {
                id: generateId(),
                workspace_id: generateId(),
                email: "user@example.com",
                role: "member" as const,
                token: "inv_test",
                invited_by: generateId(),
                message: "Welcome!",
                status: "pending" as const,
                expires_at: new Date(),
                accepted_at: null,
                created_at: new Date()
            };

            const result = repository.modelToShared(model);

            expect(result.id).toBe(model.id);
            expect(result.workspaceId).toBe(model.workspace_id);
            expect(result.email).toBe(model.email);
            expect(result.role).toBe(model.role);
            expect(result.invitedBy).toBe(model.invited_by);
            expect(result.expiresAt).toEqual(model.expires_at);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const invitationId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateWorkspaceInvitationRow({
                id: invitationId,
                expires_at: now,
                accepted_at: now,
                created_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(invitationId);

            expect(result?.expires_at).toBeInstanceOf(Date);
            expect(result?.accepted_at).toBeInstanceOf(Date);
            expect(result?.created_at).toBeInstanceOf(Date);
        });

        it("should handle null accepted_at", async () => {
            const invitationId = generateId();
            const mockRow = generateWorkspaceInvitationRow({
                id: invitationId,
                accepted_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(invitationId);

            expect(result?.accepted_at).toBeNull();
        });
    });
});
