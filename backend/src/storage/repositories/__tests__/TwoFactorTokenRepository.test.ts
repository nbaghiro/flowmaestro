/**
 * TwoFactorTokenRepository Tests
 *
 * Tests for two-factor authentication token operations including
 * code saving with invalidation, valid code lookup, and consumption.
 */

// Mock the logging module
jest.mock("../../../core/logging", () => ({
    createServiceLogger: () => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { TwoFactorTokenRepository } from "../TwoFactorTokenRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    generateTwoFactorTokenRow,
    generateId
} from "./setup";

describe("TwoFactorTokenRepository", () => {
    let repository: TwoFactorTokenRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new TwoFactorTokenRepository();
    });

    describe("saveCode", () => {
        it("should invalidate previous tokens and insert new one", async () => {
            const input = {
                user_id: generateId(),
                code_hash: "sha256_hashed_code",
                expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
                ip_address: "192.168.1.1",
                user_agent: "Mozilla/5.0"
            };

            const mockRow = generateTwoFactorTokenRow({
                user_id: input.user_id,
                code_hash: input.code_hash,
                expires_at: input.expires_at.toISOString(),
                ip_address: input.ip_address,
                user_agent: input.user_agent
            });

            // Mock the sequence: invalidate, before state, insert, after state
            mockQuery
                .mockResolvedValueOnce(mockAffectedRows(0)) // Invalidate previous
                .mockResolvedValueOnce(mockRows([])) // Before state
                .mockResolvedValueOnce(mockInsertReturning([mockRow])) // Insert
                .mockResolvedValueOnce(mockRows([mockRow])); // After state

            const result = await repository.saveCode(input);

            // Check invalidation query was called
            expect(mockQuery).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining("UPDATE flowmaestro.two_factor_tokens"),
                [input.user_id]
            );
            expect(mockQuery).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining("SET verified_at = NOW()"),
                expect.anything()
            );

            // Check insert query was called
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.two_factor_tokens"),
                expect.arrayContaining([
                    input.user_id,
                    input.code_hash,
                    input.expires_at,
                    input.ip_address,
                    input.user_agent
                ])
            );

            expect(result.user_id).toBe(input.user_id);
            expect(result.code_hash).toBe(input.code_hash);
        });

        it("should use null for optional fields when not provided", async () => {
            const input = {
                user_id: generateId(),
                code_hash: "sha256_hashed_code",
                expires_at: new Date(Date.now() + 10 * 60 * 1000)
            };

            const mockRow = generateTwoFactorTokenRow({
                user_id: input.user_id,
                code_hash: input.code_hash,
                ip_address: null,
                user_agent: null
            });

            mockQuery
                .mockResolvedValueOnce(mockAffectedRows(0))
                .mockResolvedValueOnce(mockRows([]))
                .mockResolvedValueOnce(mockInsertReturning([mockRow]))
                .mockResolvedValueOnce(mockRows([mockRow]));

            await repository.saveCode(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT"),
                expect.arrayContaining([
                    input.user_id,
                    input.code_hash,
                    input.expires_at,
                    null,
                    null
                ])
            );
        });
    });

    describe("findValidCode", () => {
        it("should return valid unexpired and unverified code", async () => {
            const userId = generateId();
            const mockRow = generateTwoFactorTokenRow({
                user_id: userId,
                verified_at: null
            });

            // First query is for raw tokens logging, second is for actual search
            mockQuery
                .mockResolvedValueOnce(mockRows([mockRow]))
                .mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findValidCode(userId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1"), [
                userId
            ]);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND verified_at IS NULL"),
                expect.anything()
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND expires_at > NOW()"),
                expect.anything()
            );
            expect(result?.user_id).toBe(userId);
        });

        it("should return null when no valid code exists", async () => {
            mockQuery.mockResolvedValueOnce(mockRows([])).mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findValidCode(generateId());

            expect(result).toBeNull();
        });

        it("should return most recent code when multiple exist", async () => {
            const userId = generateId();
            const mockRow = generateTwoFactorTokenRow({ user_id: userId });

            mockQuery
                .mockResolvedValueOnce(mockRows([mockRow]))
                .mockResolvedValueOnce(mockRows([mockRow]));

            await repository.findValidCode(userId);

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

    describe("consumeCode", () => {
        it("should mark code as verified", async () => {
            const tokenId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.consumeCode(tokenId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.two_factor_tokens"),
                [tokenId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET verified_at = NOW()"),
                expect.anything()
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE id = $1"),
                expect.anything()
            );
        });
    });

    describe("deleteByUserId", () => {
        it("should delete all tokens for user", async () => {
            const userId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(5));

            await repository.deleteByUserId(userId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.two_factor_tokens"),
                [userId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE user_id = $1"),
                expect.anything()
            );
        });
    });
});
