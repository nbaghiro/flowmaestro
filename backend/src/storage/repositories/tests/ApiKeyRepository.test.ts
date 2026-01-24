/**
 * ApiKeyRepository Tests
 *
 * Tests for API key CRUD operations including key generation,
 * hashing, rotation, and validation.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { ApiKeyRepository } from "../ApiKeyRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generateApiKeyRow,
    generateId
} from "./setup";
import type { ApiKeyModel } from "../../models/ApiKey";

describe("ApiKeyRepository", () => {
    let repository: ApiKeyRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new ApiKeyRepository();
    });

    describe("create", () => {
        it("should generate key, hash it, and insert record", async () => {
            const input = {
                user_id: generateId(),
                workspace_id: generateId(),
                name: "Production API Key",
                scopes: ["workflows:read", "workflows:execute"] as (
                    | "workflows:read"
                    | "workflows:execute"
                )[]
            };

            const mockRow = generateApiKeyRow({
                user_id: input.user_id,
                workspace_id: input.workspace_id,
                name: input.name,
                scopes: input.scopes
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.api_keys"),
                expect.arrayContaining([input.user_id, input.workspace_id, input.name])
            );
            // Should return the raw key
            expect(result.key).toBeDefined();
            expect(result.key.startsWith("fm_live_")).toBe(true);
            expect(result.name).toBe(input.name);
        });

        it("should use default rate limits when not specified", async () => {
            const input = {
                user_id: generateId(),
                workspace_id: generateId(),
                name: "Default Key",
                scopes: ["workflows:read"] as "workflows:read"[]
            };

            const mockRow = generateApiKeyRow({
                ...input,
                rate_limit_per_minute: 60,
                rate_limit_per_day: 10000
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.rate_limit_per_minute).toBe(60);
            expect(result.rate_limit_per_day).toBe(10000);
        });

        it("should use custom rate limits when specified", async () => {
            const input = {
                user_id: generateId(),
                workspace_id: generateId(),
                name: "High Rate Key",
                scopes: ["workflows:read", "workflows:execute"] as (
                    | "workflows:read"
                    | "workflows:execute"
                )[],
                rate_limit_per_minute: 120,
                rate_limit_per_day: 50000
            };

            const mockRow = generateApiKeyRow(input);

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.rate_limit_per_minute).toBe(120);
            expect(result.rate_limit_per_day).toBe(50000);
        });
    });

    describe("findByKey", () => {
        it("should hash key and find by hash", async () => {
            const rawKey = "fm_live_testkey12345678901234567890";
            const mockRow = generateApiKeyRow();

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByKey(rawKey);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE key_hash = $1"),
                expect.any(Array)
            );
            expect(result).not.toBeNull();
        });

        it("should return null for invalid key", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findByKey("invalid_key");

            expect(result).toBeNull();
        });
    });

    describe("findByHash", () => {
        it("should find key by hash", async () => {
            const keyHash = "abc123hash";
            const mockRow = generateApiKeyRow({ key_hash: keyHash });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByHash(keyHash);

            expect(result?.key_hash).toBe(keyHash);
        });
    });

    describe("findById", () => {
        it("should return API key when found", async () => {
            const keyId = generateId();
            const mockRow = generateApiKeyRow({ id: keyId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(keyId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1"), [
                keyId
            ]);
            expect(result?.id).toBe(keyId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("findByIdAndUserId", () => {
        it("should find key by id and user id", async () => {
            const keyId = generateId();
            const userId = generateId();
            const mockRow = generateApiKeyRow({ id: keyId, user_id: userId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndUserId(keyId, userId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE id = $1 AND user_id = $2"),
                [keyId, userId]
            );
            expect(result?.id).toBe(keyId);
        });
    });

    describe("findByIdAndWorkspaceId", () => {
        it("should find key by id and workspace id", async () => {
            const keyId = generateId();
            const workspaceId = generateId();
            const mockRow = generateApiKeyRow({ id: keyId, workspace_id: workspaceId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(keyId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE id = $1 AND workspace_id = $2"),
                [keyId, workspaceId]
            );
            expect(result?.id).toBe(keyId);
        });
    });

    describe("findByUserId", () => {
        it("should return paginated keys with total count", async () => {
            const userId = generateId();
            const mockKeys = [generateApiKeyRow(), generateApiKeyRow()];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows(mockKeys));

            const result = await repository.findByUserId(userId, { limit: 2, offset: 0 });

            expect(result.total).toBe(10);
            expect(result.keys).toHaveLength(2);
        });

        it("should exclude revoked keys by default", async () => {
            const userId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(5))
                .mockResolvedValueOnce(mockRows([generateApiKeyRow()]));

            await repository.findByUserId(userId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("revoked_at IS NULL"),
                expect.arrayContaining([userId])
            );
        });

        it("should include revoked keys when specified", async () => {
            const userId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(8))
                .mockResolvedValueOnce(mockRows([generateApiKeyRow()]));

            await repository.findByUserId(userId, { includeRevoked: true });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.not.stringContaining("revoked_at IS NULL"),
                expect.arrayContaining([userId])
            );
        });
    });

    describe("findByWorkspaceId", () => {
        it("should return paginated keys for workspace", async () => {
            const workspaceId = generateId();
            const mockKeys = [generateApiKeyRow(), generateApiKeyRow()];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(5))
                .mockResolvedValueOnce(mockRows(mockKeys));

            const result = await repository.findByWorkspaceId(workspaceId);

            expect(result.total).toBe(5);
            expect(result.keys).toHaveLength(2);
        });
    });

    describe("update", () => {
        it("should update specified fields", async () => {
            const keyId = generateId();
            const userId = generateId();
            const mockRow = generateApiKeyRow({ id: keyId, name: "Updated Key" });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(keyId, userId, { name: "Updated Key" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.api_keys"),
                expect.arrayContaining(["Updated Key", keyId, userId])
            );
            expect(result?.name).toBe("Updated Key");
        });

        it("should return existing key when no updates provided", async () => {
            const keyId = generateId();
            const userId = generateId();
            const mockRow = generateApiKeyRow({ id: keyId, user_id: userId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.update(keyId, userId, {});

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT * FROM flowmaestro.api_keys"),
                [keyId, userId]
            );
            expect(result?.id).toBe(keyId);
        });
    });

    describe("updateLastUsed", () => {
        it("should update last_used_at and last_used_ip", async () => {
            const keyId = generateId();
            const ip = "192.168.1.1";

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.updateLastUsed(keyId, ip);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET last_used_at = CURRENT_TIMESTAMP, last_used_ip = $2"),
                [keyId, ip]
            );
        });
    });

    describe("revoke", () => {
        it("should revoke key and return true", async () => {
            const keyId = generateId();
            const userId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.revoke(keyId, userId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET revoked_at = CURRENT_TIMESTAMP, is_active = false"),
                [keyId, userId]
            );
            expect(result).toBe(true);
        });

        it("should return false when key not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.revoke("non-existent", generateId());

            expect(result).toBe(false);
        });
    });

    describe("rotate", () => {
        it("should revoke old key and create new one with same settings", async () => {
            const keyId = generateId();
            const userId = generateId();
            const existingKey = generateApiKeyRow({
                id: keyId,
                user_id: userId,
                name: "Production Key",
                scopes: ["read", "write"],
                rate_limit_per_minute: 100,
                rate_limit_per_day: 20000
            });

            // findByIdAndUserId
            mockQuery.mockResolvedValueOnce(mockRows([existingKey]));
            // revoke
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));
            // create
            mockQuery.mockResolvedValueOnce(mockInsertReturning([generateApiKeyRow()]));

            const result = await repository.rotate(keyId, userId);

            expect(result).not.toBeNull();
            expect(result?.key).toBeDefined();
        });

        it("should return null when key not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.rotate("non-existent", generateId());

            expect(result).toBeNull();
        });

        it("should return null when key already revoked", async () => {
            const existingKey = generateApiKeyRow({
                revoked_at: new Date().toISOString()
            });

            mockQuery.mockResolvedValueOnce(mockRows([existingKey]));

            const result = await repository.rotate(existingKey.id, existingKey.user_id);

            expect(result).toBeNull();
        });
    });

    describe("hasScope", () => {
        it("should return true when key has scope", () => {
            const key = {
                ...generateApiKeyRow({ scopes: ["workflows:read", "workflows:execute"] }),
                created_at: new Date(),
                updated_at: new Date(),
                expires_at: null,
                last_used_at: null,
                revoked_at: null
            } as unknown as ApiKeyModel;

            expect(repository.hasScope(key, "workflows:read")).toBe(true);
            expect(repository.hasScope(key, "workflows:execute")).toBe(true);
        });

        it("should return false when key lacks scope", () => {
            const key = {
                ...generateApiKeyRow({ scopes: ["workflows:read"] }),
                created_at: new Date(),
                updated_at: new Date(),
                expires_at: null,
                last_used_at: null,
                revoked_at: null
            } as unknown as ApiKeyModel;

            expect(repository.hasScope(key, "workflows:execute")).toBe(false);
        });
    });

    describe("hasScopes", () => {
        it("should return true when key has all scopes", () => {
            const key = {
                ...generateApiKeyRow({
                    scopes: ["workflows:read", "workflows:execute", "executions:read"]
                }),
                created_at: new Date(),
                updated_at: new Date(),
                expires_at: null,
                last_used_at: null,
                revoked_at: null
            } as unknown as ApiKeyModel;

            expect(repository.hasScopes(key, ["workflows:read", "workflows:execute"])).toBe(true);
        });

        it("should return false when key lacks any scope", () => {
            const key = {
                ...generateApiKeyRow({ scopes: ["workflows:read"] }),
                created_at: new Date(),
                updated_at: new Date(),
                expires_at: null,
                last_used_at: null,
                revoked_at: null
            } as unknown as ApiKeyModel;

            expect(repository.hasScopes(key, ["workflows:read", "workflows:execute"])).toBe(false);
        });
    });

    describe("isValid", () => {
        it("should return true for active, non-expired, non-revoked key", () => {
            const key = {
                ...generateApiKeyRow({ is_active: true }),
                created_at: new Date(),
                updated_at: new Date(),
                expires_at: null,
                last_used_at: null,
                revoked_at: null
            } as unknown as ApiKeyModel;

            expect(repository.isValid(key)).toBe(true);
        });

        it("should return false for inactive key", () => {
            const key = {
                ...generateApiKeyRow({ is_active: false }),
                created_at: new Date(),
                updated_at: new Date(),
                expires_at: null,
                last_used_at: null,
                revoked_at: null
            } as unknown as ApiKeyModel;

            expect(repository.isValid(key)).toBe(false);
        });

        it("should return false for revoked key", () => {
            const key = {
                ...generateApiKeyRow({ is_active: true }),
                created_at: new Date(),
                updated_at: new Date(),
                expires_at: null,
                last_used_at: null,
                revoked_at: new Date()
            } as unknown as ApiKeyModel;

            expect(repository.isValid(key)).toBe(false);
        });

        it("should return false for expired key", () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);

            const key = {
                ...generateApiKeyRow({ is_active: true }),
                created_at: new Date(),
                updated_at: new Date(),
                expires_at: pastDate,
                last_used_at: null,
                revoked_at: null
            } as unknown as ApiKeyModel;

            expect(repository.isValid(key)).toBe(false);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const keyId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateApiKeyRow({
                id: keyId,
                created_at: now,
                updated_at: now,
                expires_at: now,
                last_used_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(keyId);

            expect(result?.created_at).toBeInstanceOf(Date);
            expect(result?.updated_at).toBeInstanceOf(Date);
            expect(result?.expires_at).toBeInstanceOf(Date);
            expect(result?.last_used_at).toBeInstanceOf(Date);
        });

        it("should handle null date fields", async () => {
            const keyId = generateId();
            const mockRow = generateApiKeyRow({
                id: keyId,
                expires_at: null,
                last_used_at: null,
                revoked_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(keyId);

            expect(result?.expires_at).toBeNull();
            expect(result?.last_used_at).toBeNull();
            expect(result?.revoked_at).toBeNull();
        });
    });
});
