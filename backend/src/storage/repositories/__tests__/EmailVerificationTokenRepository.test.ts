/**
 * EmailVerificationTokenRepository Tests
 *
 * Tests for email verification token operations including creation,
 * hash lookup, verification marking, and expiry cleanup.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { EmailVerificationTokenRepository } from "../EmailVerificationTokenRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generateEmailVerificationTokenRow,
    generateId
} from "./setup";

describe("EmailVerificationTokenRepository", () => {
    let repository: EmailVerificationTokenRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new EmailVerificationTokenRepository();
    });

    describe("create", () => {
        it("should insert a new email verification token", async () => {
            const input = {
                userId: generateId(),
                email: "test@example.com",
                tokenHash: "sha256_hashed_token",
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                ipAddress: "192.168.1.1",
                userAgent: "Mozilla/5.0"
            };

            const mockRow = generateEmailVerificationTokenRow({
                user_id: input.userId,
                email: input.email,
                token_hash: input.tokenHash,
                expires_at: input.expiresAt.toISOString(),
                ip_address: input.ipAddress,
                user_agent: input.userAgent
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.email_verification_tokens"),
                expect.arrayContaining([
                    input.userId,
                    input.email,
                    input.tokenHash,
                    input.expiresAt,
                    input.ipAddress,
                    input.userAgent
                ])
            );
            expect(result.user_id).toBe(input.userId);
            expect(result.email).toBe(input.email);
        });

        it("should use null for optional fields when not provided", async () => {
            const input = {
                userId: generateId(),
                email: "test@example.com",
                tokenHash: "sha256_hashed_token",
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            };

            const mockRow = generateEmailVerificationTokenRow({
                user_id: input.userId,
                email: input.email,
                token_hash: input.tokenHash,
                ip_address: null,
                user_agent: null
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([
                    input.userId,
                    input.email,
                    input.tokenHash,
                    input.expiresAt,
                    null,
                    null
                ])
            );
        });
    });

    describe("findByTokenHash", () => {
        it("should return token when found and not verified", async () => {
            const tokenHash = "sha256_hashed_token";
            const mockRow = generateEmailVerificationTokenRow({
                token_hash: tokenHash,
                verified_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByTokenHash(tokenHash);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE token_hash = $1 AND verified_at IS NULL"),
                [tokenHash]
            );
            expect(result?.token_hash).toBe(tokenHash);
        });

        it("should return null when token not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findByTokenHash("non-existent");

            expect(result).toBeNull();
        });

        it("should return most recent token when multiple exist", async () => {
            const tokenHash = "sha256_hashed_token";
            const mockRow = generateEmailVerificationTokenRow({
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

    describe("markAsVerified", () => {
        it("should update verified_at timestamp", async () => {
            const tokenId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.markAsVerified(tokenId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET verified_at = NOW()"),
                [tokenId]
            );
        });
    });

    describe("deleteExpired", () => {
        it("should delete expired tokens older than 24 hours", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(10));

            const result = await repository.deleteExpired();

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.email_verification_tokens")
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("expires_at < NOW() - INTERVAL '24 hours'")
            );
            expect(result).toBe(10);
        });

        it("should return 0 when no expired tokens found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.deleteExpired();

            expect(result).toBe(0);
        });
    });

    describe("countRecentByUserId", () => {
        it("should count recent tokens within time window", async () => {
            const userId = generateId();
            const windowMinutes = 60;

            mockQuery.mockResolvedValueOnce(mockCountResult(3));

            const result = await repository.countRecentByUserId(userId, windowMinutes);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1"), [
                userId
            ]);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("created_at > NOW() - INTERVAL"),
                expect.anything()
            );
            expect(result).toBe(3);
        });
    });

    describe("findPendingByUserId", () => {
        it("should return most recent unverified token for user", async () => {
            const userId = generateId();
            const mockRow = generateEmailVerificationTokenRow({
                user_id: userId,
                verified_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findPendingByUserId(userId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE user_id = $1 AND verified_at IS NULL"),
                [userId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY created_at DESC"),
                expect.anything()
            );
            expect(result?.user_id).toBe(userId);
        });

        it("should return null when no pending token exists", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findPendingByUserId(generateId());

            expect(result).toBeNull();
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const tokenHash = "test_hash";
            const now = new Date().toISOString();
            const mockRow = generateEmailVerificationTokenRow({
                token_hash: tokenHash,
                expires_at: now,
                created_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByTokenHash(tokenHash);

            expect(result?.expires_at).toBeInstanceOf(Date);
            expect(result?.created_at).toBeInstanceOf(Date);
        });

        it("should handle verified_at when set", async () => {
            const tokenHash = "test_hash";
            const now = new Date().toISOString();
            const mockRow = generateEmailVerificationTokenRow({
                token_hash: tokenHash,
                verified_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByTokenHash(tokenHash);

            expect(result?.verified_at).toBeInstanceOf(Date);
        });

        it("should handle null verified_at", async () => {
            const tokenHash = "test_hash";
            const mockRow = generateEmailVerificationTokenRow({
                token_hash: tokenHash,
                verified_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByTokenHash(tokenHash);

            expect(result?.verified_at).toBeNull();
        });

        it("should handle Date objects already parsed by pg", async () => {
            const tokenHash = "test_hash";
            const now = new Date();
            const mockRow = {
                ...generateEmailVerificationTokenRow({ token_hash: tokenHash }),
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
