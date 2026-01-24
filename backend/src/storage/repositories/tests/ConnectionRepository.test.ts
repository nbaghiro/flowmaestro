/**
 * ConnectionRepository Tests
 *
 * Tests for connection CRUD operations including encryption integration,
 * token updates, and expiry checking.
 */

// Mock encryption service
const mockEncryptObject = jest.fn().mockReturnValue("encrypted_data");
const mockDecryptObject = jest.fn().mockReturnValue({ api_key: "test_key" });

jest.mock("../../../services/EncryptionService", () => ({
    getEncryptionService: () => ({
        encryptObject: mockEncryptObject,
        decryptObject: mockDecryptObject
    })
}));

// Mock the database module
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { ConnectionRepository } from "../ConnectionRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generateConnectionRow,
    generateId
} from "./setup";

describe("ConnectionRepository", () => {
    let repository: ConnectionRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new ConnectionRepository();
    });

    describe("create", () => {
        it("should encrypt data and insert a new connection", async () => {
            const input = {
                user_id: generateId(),
                workspace_id: generateId(),
                name: "OpenAI Connection",
                connection_method: "api_key" as const,
                provider: "openai",
                data: { api_key: "sk-test123" }
            };

            const mockRow = generateConnectionRow({
                user_id: input.user_id,
                workspace_id: input.workspace_id,
                name: input.name,
                connection_method: input.connection_method,
                provider: input.provider
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockEncryptObject).toHaveBeenCalledWith(input.data);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.connections"),
                expect.arrayContaining([
                    input.user_id,
                    input.workspace_id,
                    input.name,
                    input.connection_method,
                    input.provider,
                    "encrypted_data"
                ])
            );
            expect(result.name).toBe(input.name);
        });

        it("should handle OAuth connection with metadata", async () => {
            const input = {
                user_id: generateId(),
                workspace_id: generateId(),
                name: "Google OAuth",
                connection_method: "oauth2" as const,
                provider: "google",
                data: {
                    access_token: "token123",
                    refresh_token: "refresh123",
                    token_type: "Bearer"
                },
                metadata: { expires_at: Date.now() + 3600000 }
            };

            const mockRow = generateConnectionRow({
                ...input,
                metadata: JSON.stringify(input.metadata)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([JSON.stringify(input.metadata)])
            );
        });
    });

    describe("findById", () => {
        it("should return connection summary (without decrypted data)", async () => {
            const connectionId = generateId();
            const mockRow = generateConnectionRow({ id: connectionId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(connectionId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1"), [
                connectionId
            ]);
            expect(result?.id).toBe(connectionId);
            // Should not decrypt data
            expect(mockDecryptObject).not.toHaveBeenCalled();
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("findByIdWithData", () => {
        it("should return connection with decrypted data", async () => {
            const connectionId = generateId();
            const mockRow = generateConnectionRow({ id: connectionId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdWithData(connectionId);

            expect(mockDecryptObject).toHaveBeenCalledWith(mockRow.encrypted_data);
            expect(result?.data).toEqual({ api_key: "test_key" });
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findByIdWithData("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("findByIdAndWorkspaceId", () => {
        it("should find connection by id and workspace id", async () => {
            const connectionId = generateId();
            const workspaceId = generateId();
            const mockRow = generateConnectionRow({
                id: connectionId,
                workspace_id: workspaceId
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(connectionId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE id = $1 AND workspace_id = $2"),
                [connectionId, workspaceId]
            );
            expect(result?.id).toBe(connectionId);
        });
    });

    describe("findByWorkspaceId", () => {
        it("should return paginated connections with total count", async () => {
            const workspaceId = generateId();
            const mockConnections = [generateConnectionRow(), generateConnectionRow()];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows(mockConnections));

            const result = await repository.findByWorkspaceId(workspaceId, {
                limit: 2,
                offset: 0
            });

            expect(result.total).toBe(10);
            expect(result.connections).toHaveLength(2);
        });

        it("should filter by provider", async () => {
            const workspaceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(5))
                .mockResolvedValueOnce(mockRows([generateConnectionRow()]));

            await repository.findByWorkspaceId(workspaceId, { provider: "openai" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND provider = $2"),
                expect.arrayContaining([workspaceId, "openai"])
            );
        });

        it("should filter by connection method", async () => {
            const workspaceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(3))
                .mockResolvedValueOnce(mockRows([generateConnectionRow()]));

            await repository.findByWorkspaceId(workspaceId, { connection_method: "oauth2" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND connection_method = $2"),
                expect.arrayContaining([workspaceId, "oauth2"])
            );
        });

        it("should filter by status", async () => {
            const workspaceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(2))
                .mockResolvedValueOnce(mockRows([generateConnectionRow()]));

            await repository.findByWorkspaceId(workspaceId, { status: "active" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND status = $2"),
                expect.arrayContaining([workspaceId, "active"])
            );
        });
    });

    describe("findByProviderInWorkspace", () => {
        it("should find active connections by provider", async () => {
            const workspaceId = generateId();
            const provider = "openai";

            mockQuery.mockResolvedValueOnce(mockRows([generateConnectionRow()]));

            const result = await repository.findByProviderInWorkspace(workspaceId, provider);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("provider = $2 AND status = 'active'"),
                [workspaceId, provider]
            );
            expect(result).toHaveLength(1);
        });
    });

    describe("update", () => {
        it("should update specified fields only", async () => {
            const connectionId = generateId();
            const mockRow = generateConnectionRow({ id: connectionId, name: "Updated Name" });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(connectionId, { name: "Updated Name" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.connections"),
                expect.arrayContaining(["Updated Name", connectionId])
            );
            expect(result?.name).toBe("Updated Name");
        });

        it("should encrypt data when updating", async () => {
            const connectionId = generateId();
            const newData = { api_key: "new_key" };
            const mockRow = generateConnectionRow({ id: connectionId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(connectionId, { data: newData });

            expect(mockEncryptObject).toHaveBeenCalledWith(newData);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("encrypted_data = $1"),
                expect.arrayContaining(["encrypted_data", connectionId])
            );
        });

        it("should return existing connection when no updates provided", async () => {
            const connectionId = generateId();
            const mockRow = generateConnectionRow({ id: connectionId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.update(connectionId, {});

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT * FROM flowmaestro.connections"),
                [connectionId]
            );
            expect(result?.id).toBe(connectionId);
        });
    });

    describe("updateTokens", () => {
        it("should merge new tokens with existing data", async () => {
            const connectionId = generateId();
            const existingData = { access_token: "old_token", refresh_token: "refresh123" };
            const newTokens = { access_token: "new_token", expires_in: 3600 };

            mockDecryptObject.mockReturnValueOnce(existingData);
            mockQuery
                .mockResolvedValueOnce(mockRows([generateConnectionRow({ id: connectionId })]))
                .mockResolvedValueOnce(mockAffectedRows(1));

            await repository.updateTokens(connectionId, newTokens);

            expect(mockEncryptObject).toHaveBeenCalledWith({
                ...existingData,
                ...newTokens
            });
        });

        it("should throw error when connection not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            await expect(repository.updateTokens("non-existent", {})).rejects.toThrow(
                "Connection not found"
            );
        });
    });

    describe("markAsUsed", () => {
        it("should update last_used_at timestamp", async () => {
            const connectionId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.markAsUsed(connectionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET last_used_at = CURRENT_TIMESTAMP"),
                [connectionId]
            );
        });
    });

    describe("updateStatus", () => {
        it("should update connection status", async () => {
            const connectionId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.updateStatus(connectionId, "invalid");

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("SET status = $1"), [
                "invalid",
                connectionId
            ]);
        });
    });

    describe("delete", () => {
        it("should hard delete connection and return true", async () => {
            const connectionId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(connectionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.connections"),
                [connectionId]
            );
            expect(result).toBe(true);
        });

        it("should return false when connection not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.delete("non-existent");

            expect(result).toBe(false);
        });
    });

    describe("isExpired", () => {
        it("should return false when no expires_at metadata", () => {
            const connection = {
                id: generateId(),
                name: "Test",
                connection_method: "api_key" as const,
                provider: "openai",
                status: "active" as const,
                metadata: {},
                capabilities: {},
                last_used_at: null,
                created_at: new Date(),
                updated_at: new Date()
            };

            expect(repository.isExpired(connection)).toBe(false);
        });

        it("should return true when token expires within 5 minutes", () => {
            const connection = {
                id: generateId(),
                name: "Test",
                connection_method: "oauth2" as const,
                provider: "google",
                status: "active" as const,
                metadata: { expires_at: Date.now() + 2 * 60 * 1000 }, // 2 minutes from now
                capabilities: {},
                last_used_at: null,
                created_at: new Date(),
                updated_at: new Date()
            };

            expect(repository.isExpired(connection)).toBe(true);
        });

        it("should return false when token expires after 5 minutes", () => {
            const connection = {
                id: generateId(),
                name: "Test",
                connection_method: "oauth2" as const,
                provider: "google",
                status: "active" as const,
                metadata: { expires_at: Date.now() + 10 * 60 * 1000 }, // 10 minutes from now
                capabilities: {},
                last_used_at: null,
                created_at: new Date(),
                updated_at: new Date()
            };

            expect(repository.isExpired(connection)).toBe(false);
        });
    });

    describe("getOwnerId", () => {
        it("should return user_id for connection", async () => {
            const connectionId = generateId();
            const userId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([{ user_id: userId }]));

            const result = await repository.getOwnerId(connectionId);

            expect(result).toBe(userId);
        });

        it("should return null when connection not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.getOwnerId("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const connectionId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateConnectionRow({
                id: connectionId,
                created_at: now,
                updated_at: now,
                last_used_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(connectionId);

            expect(result?.created_at).toBeInstanceOf(Date);
            expect(result?.updated_at).toBeInstanceOf(Date);
            expect(result?.last_used_at).toBeInstanceOf(Date);
        });

        it("should parse JSON metadata and capabilities", async () => {
            const connectionId = generateId();
            const metadata = { expires_at: Date.now() };
            const capabilities = { can_refresh: true };
            const mockRow = generateConnectionRow({
                id: connectionId,
                metadata: JSON.stringify(metadata),
                capabilities: JSON.stringify(capabilities)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(connectionId);

            expect(result?.metadata).toEqual(metadata);
            expect(result?.capabilities).toEqual(capabilities);
        });
    });
});
