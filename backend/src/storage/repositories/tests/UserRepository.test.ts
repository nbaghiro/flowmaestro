/**
 * UserRepository Tests
 *
 * Tests for user CRUD operations including OAuth ID lookups,
 * password updates, and email verification.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { UserRepository } from "../UserRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    generateUserRow,
    generateId
} from "./setup";

describe("UserRepository", () => {
    let repository: UserRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new UserRepository();
    });

    describe("create", () => {
        it("should insert a new user and return the created record", async () => {
            const input = {
                email: "test@example.com",
                password_hash: "$2b$10$hashedpassword",
                name: "Test User"
            };

            const mockRow = generateUserRow({
                email: input.email,
                password_hash: input.password_hash,
                name: input.name
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.users"),
                expect.arrayContaining([input.email, input.password_hash, input.name])
            );
            expect(result.email).toBe(input.email);
            expect(result.name).toBe(input.name);
            expect(result.id).toBe(mockRow.id);
        });

        it("should handle OAuth user creation without password", async () => {
            const input = {
                email: "oauth@example.com",
                google_id: "google-123",
                auth_provider: "google" as const,
                name: "OAuth User"
            };

            const mockRow = generateUserRow({
                email: input.email,
                google_id: input.google_id,
                auth_provider: input.auth_provider,
                name: input.name,
                password_hash: null
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.google_id).toBe(input.google_id);
            expect(result.auth_provider).toBe("google");
            expect(result.password_hash).toBeNull();
        });
    });

    describe("findById", () => {
        it("should return user when found", async () => {
            const userId = generateId();
            const mockRow = generateUserRow({ id: userId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(userId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1"), [
                userId
            ]);
            expect(result).not.toBeNull();
            expect(result?.id).toBe(userId);
        });

        it("should return null when user not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent-id");

            expect(result).toBeNull();
        });
    });

    describe("findByEmail", () => {
        it("should return user when found by email", async () => {
            const email = "test@example.com";
            const mockRow = generateUserRow({ email });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByEmail(email);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE email = $1"), [
                email
            ]);
            expect(result?.email).toBe(email);
        });

        it("should return null when email not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findByEmail("nonexistent@example.com");

            expect(result).toBeNull();
        });
    });

    describe("findByGoogleId", () => {
        it("should return user when found by Google ID", async () => {
            const googleId = "google-12345";
            const mockRow = generateUserRow({ google_id: googleId, auth_provider: "google" });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByGoogleId(googleId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE google_id = $1"),
                [googleId]
            );
            expect(result?.google_id).toBe(googleId);
        });
    });

    describe("findByMicrosoftId", () => {
        it("should return user when found by Microsoft ID", async () => {
            const microsoftId = "microsoft-12345";
            const mockRow = generateUserRow({
                microsoft_id: microsoftId,
                auth_provider: "microsoft"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByMicrosoftId(microsoftId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE microsoft_id = $1"),
                [microsoftId]
            );
            expect(result?.microsoft_id).toBe(microsoftId);
        });
    });

    describe("findByEmailOrGoogleId", () => {
        it("should find user by email or Google ID", async () => {
            const email = "test@example.com";
            const googleId = "google-123";
            const mockRow = generateUserRow({ email, google_id: googleId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByEmailOrGoogleId(email, googleId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE email = $1 OR google_id = $2"),
                [email, googleId]
            );
            expect(result).not.toBeNull();
        });
    });

    describe("findByEmailOrMicrosoftId", () => {
        it("should find user by email or Microsoft ID", async () => {
            const email = "test@example.com";
            const microsoftId = "ms-123";
            const mockRow = generateUserRow({ email, microsoft_id: microsoftId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByEmailOrMicrosoftId(email, microsoftId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE email = $1 OR microsoft_id = $2"),
                [email, microsoftId]
            );
            expect(result).not.toBeNull();
        });
    });

    describe("update", () => {
        it("should update specified fields only", async () => {
            const userId = generateId();
            const mockRow = generateUserRow({ id: userId, name: "Updated Name" });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(userId, { name: "Updated Name" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.users"),
                expect.arrayContaining(["Updated Name", userId])
            );
            expect(result?.name).toBe("Updated Name");
        });

        it("should return existing user when no updates provided", async () => {
            const userId = generateId();
            const mockRow = generateUserRow({ id: userId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.update(userId, {});

            // Should call findById instead of update
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT * FROM flowmaestro.users"),
                [userId]
            );
            expect(result?.id).toBe(userId);
        });

        it("should return null when user not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.update("non-existent", { name: "New Name" });

            expect(result).toBeNull();
        });

        it("should update multiple fields", async () => {
            const userId = generateId();
            const updates = {
                name: "New Name",
                email: "newemail@example.com",
                two_factor_enabled: true
            };
            const mockRow = generateUserRow({ id: userId, ...updates });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(userId, updates);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.users"),
                expect.arrayContaining([updates.name, updates.email, updates.two_factor_enabled])
            );
            expect(result?.name).toBe(updates.name);
            expect(result?.email).toBe(updates.email);
            expect(result?.two_factor_enabled).toBe(true);
        });
    });

    describe("delete", () => {
        it("should hard delete user and return true", async () => {
            const userId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(userId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.users"),
                [userId]
            );
            expect(result).toBe(true);
        });

        it("should return false when user not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.delete("non-existent");

            expect(result).toBe(false);
        });
    });

    describe("updateEmailVerification", () => {
        it("should update email verification status", async () => {
            const userId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.updateEmailVerification(userId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET email_verified = TRUE"),
                [userId]
            );
        });
    });

    describe("updatePassword", () => {
        it("should update password hash", async () => {
            const userId = generateId();
            const newPasswordHash = "$2b$10$newhashedpassword";
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.updatePassword(userId, newPasswordHash);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET password_hash = $2"),
                [userId, newPasswordHash]
            );
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields to Date objects", async () => {
            const userId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateUserRow({
                id: userId,
                created_at: now,
                updated_at: now,
                email_verified_at: now,
                last_login_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(userId);

            expect(result?.created_at).toBeInstanceOf(Date);
            expect(result?.updated_at).toBeInstanceOf(Date);
            expect(result?.email_verified_at).toBeInstanceOf(Date);
            expect(result?.last_login_at).toBeInstanceOf(Date);
        });

        it("should handle null date fields", async () => {
            const userId = generateId();
            const mockRow = generateUserRow({
                id: userId,
                email_verified_at: null,
                last_login_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(userId);

            expect(result?.email_verified_at).toBeNull();
            expect(result?.last_login_at).toBeNull();
        });
    });
});
