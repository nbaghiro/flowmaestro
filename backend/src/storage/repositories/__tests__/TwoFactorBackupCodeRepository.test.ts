/**
 * TwoFactorBackupCodeRepository Tests
 *
 * Tests for two-factor backup code operations including creation,
 * lookup by user, consumption, and deletion.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { TwoFactorBackupCodeRepository } from "../TwoFactorBackupCodeRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    generateTwoFactorBackupCodeRow,
    generateId
} from "./setup";

describe("TwoFactorBackupCodeRepository", () => {
    let repository: TwoFactorBackupCodeRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new TwoFactorBackupCodeRepository();
    });

    describe("create", () => {
        it("should insert a new backup code", async () => {
            const input = {
                user_id: generateId(),
                code_hash: "sha256_hashed_backup_code"
            };

            const mockRow = generateTwoFactorBackupCodeRow({
                user_id: input.user_id,
                code_hash: input.code_hash
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.two_factor_backup_codes"),
                [input.user_id, input.code_hash]
            );
            expect(result.user_id).toBe(input.user_id);
            expect(result.code_hash).toBe(input.code_hash);
            expect(result.used_at).toBeNull();
        });
    });

    describe("findByUserId", () => {
        it("should return all backup codes for user", async () => {
            const userId = generateId();
            const mockCodes = [
                generateTwoFactorBackupCodeRow({ user_id: userId, used_at: null }),
                generateTwoFactorBackupCodeRow({ user_id: userId, used_at: null }),
                generateTwoFactorBackupCodeRow({
                    user_id: userId,
                    used_at: new Date().toISOString()
                })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockCodes));

            const result = await repository.findByUserId(userId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1"), [
                userId
            ]);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY created_at ASC"),
                expect.anything()
            );
            expect(result).toHaveLength(3);
        });

        it("should return empty array when no codes exist", async () => {
            mockQuery.mockResolvedValueOnce(mockRows([]));

            const result = await repository.findByUserId(generateId());

            expect(result).toEqual([]);
        });
    });

    describe("consumeCode", () => {
        it("should mark code as used and return true", async () => {
            const userId = generateId();
            const codeHash = "sha256_hashed_code";
            const mockRow = generateTwoFactorBackupCodeRow({
                user_id: userId,
                code_hash: codeHash,
                used_at: new Date().toISOString()
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.consumeCode(userId, codeHash);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.two_factor_backup_codes"),
                [userId, codeHash]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET used_at = NOW()"),
                expect.anything()
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE user_id = $1"),
                expect.anything()
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND code_hash = $2"),
                expect.anything()
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND used_at IS NULL"),
                expect.anything()
            );
            expect(result).toBe(true);
        });

        it("should return false when code not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.consumeCode(generateId(), "non-existent");

            expect(result).toBe(false);
        });

        it("should return false when code already used", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.consumeCode(generateId(), "already_used_code");

            expect(result).toBe(false);
        });
    });

    describe("deleteByUserId", () => {
        it("should delete all backup codes for user", async () => {
            const userId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(10));

            await repository.deleteByUserId(userId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.two_factor_backup_codes"),
                [userId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE user_id = $1"),
                expect.anything()
            );
        });
    });
});
