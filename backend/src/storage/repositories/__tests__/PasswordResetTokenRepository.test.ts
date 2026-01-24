/**
 * PasswordResetTokenRepository Tests
 *
 * Tests for password reset token operations including creation,
 * hash lookup, usage marking, and rate limiting by email.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { PasswordResetTokenRepository } from "../PasswordResetTokenRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generatePasswordResetTokenRow,
    generateId
} from "./setup";

describe("PasswordResetTokenRepository", () => {
    let repository: PasswordResetTokenRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new PasswordResetTokenRepository();
    });

    describe("create", () => {
        it("should insert a new password reset token", async () => {
            const input = {
                userId: generateId(),
                tokenHash: "sha256_hashed_token",
                expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
                ipAddress: "192.168.1.1",
                userAgent: "Mozilla/5.0"
            };

            const mockRow = generatePasswordResetTokenRow({
                user_id: input.userId,
                token_hash: input.tokenHash,
                expires_at: input.expiresAt.toISOString(),
                ip_address: input.ipAddress,
                user_agent: input.userAgent
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.password_reset_tokens"),
                expect.arrayContaining([
                    input.userId,
                    input.tokenHash,
                    input.expiresAt,
                    input.ipAddress,
                    input.userAgent
                ])
            );
            expect(result.user_id).toBe(input.userId);
            expect(result.token_hash).toBe(input.tokenHash);
        });

        it("should use null for optional fields when not provided", async () => {
            const input = {
                userId: generateId(),
                tokenHash: "sha256_hashed_token",
                expiresAt: new Date(Date.now() + 60 * 60 * 1000)
            };

            const mockRow = generatePasswordResetTokenRow({
                user_id: input.userId,
                token_hash: input.tokenHash,
                ip_address: null,
                user_agent: null
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([input.userId, input.tokenHash, input.expiresAt, null, null])
            );
        });
    });

    describe("findByTokenHash", () => {
        it("should return token when found and not used", async () => {
            const tokenHash = "sha256_hashed_token";
            const mockRow = generatePasswordResetTokenRow({
                token_hash: tokenHash,
                used_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByTokenHash(tokenHash);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE token_hash = $1 AND used_at IS NULL"),
                [tokenHash]
            );
            expect(result?.token_hash).toBe(tokenHash);
        });

        it("should return null when token not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findByTokenHash("non-existent");

            expect(result).toBeNull();
        });

        it("should return null when token already used", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findByTokenHash("used_token");

            expect(result).toBeNull();
        });

        it("should return most recent token when multiple exist", async () => {
            const tokenHash = "sha256_hashed_token";
            const mockRow = generatePasswordResetTokenRow({
                token_hash: tokenHash
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            await repository.findByTokenHash(tokenHash);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY created_at DESC"),
                expect.anything()
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("LIMIT 1"),
                expect.anything()
            );
        });
    });

    describe("markAsUsed", () => {
        it("should update used_at timestamp", async () => {
            const tokenId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.markAsUsed(tokenId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("SET used_at = NOW()"), [
                tokenId
            ]);
        });
    });

    describe("deleteExpired", () => {
        it("should delete expired tokens older than 24 hours", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(15));

            const result = await repository.deleteExpired();

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.password_reset_tokens")
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("expires_at < NOW() - INTERVAL '24 hours'")
            );
            expect(result).toBe(15);
        });

        it("should return 0 when no expired tokens found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.deleteExpired();

            expect(result).toBe(0);
        });
    });

    describe("countRecentByEmail", () => {
        it("should count recent tokens for email within time window", async () => {
            const email = "test@example.com";
            const windowMinutes = 15;

            mockQuery.mockResolvedValueOnce(mockCountResult(2));

            const result = await repository.countRecentByEmail(email, windowMinutes);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("JOIN flowmaestro.users u ON prt.user_id = u.id"),
                [email]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE u.email = $1"),
                expect.anything()
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("prt.created_at > NOW() - INTERVAL"),
                expect.anything()
            );
            expect(result).toBe(2);
        });

        it("should return 0 when no recent tokens exist", async () => {
            mockQuery.mockResolvedValueOnce(mockCountResult(0));

            const result = await repository.countRecentByEmail("new@example.com", 15);

            expect(result).toBe(0);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const tokenHash = "test_hash";
            const now = new Date().toISOString();
            const mockRow = generatePasswordResetTokenRow({
                token_hash: tokenHash,
                expires_at: now,
                created_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByTokenHash(tokenHash);

            expect(result?.expires_at).toBeInstanceOf(Date);
            expect(result?.created_at).toBeInstanceOf(Date);
        });

        it("should handle used_at when set", async () => {
            const tokenHash = "test_hash";
            const now = new Date().toISOString();
            const mockRow = generatePasswordResetTokenRow({
                token_hash: tokenHash,
                used_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByTokenHash(tokenHash);

            expect(result?.used_at).toBeInstanceOf(Date);
        });

        it("should handle null used_at", async () => {
            const tokenHash = "test_hash";
            const mockRow = generatePasswordResetTokenRow({
                token_hash: tokenHash,
                used_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByTokenHash(tokenHash);

            expect(result?.used_at).toBeNull();
        });

        it("should handle Date objects already parsed by pg", async () => {
            const tokenHash = "test_hash";
            const now = new Date();
            const mockRow = {
                ...generatePasswordResetTokenRow({ token_hash: tokenHash }),
                expires_at: now,
                created_at: now
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByTokenHash(tokenHash);

            expect(result?.expires_at).toBeInstanceOf(Date);
            expect(result?.created_at).toBeInstanceOf(Date);
        });
    });
});
