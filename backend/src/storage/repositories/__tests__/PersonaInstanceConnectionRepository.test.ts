/**
 * Tests for PersonaInstanceConnectionRepository
 */

const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { PersonaInstanceConnectionRepository } from "../PersonaInstanceConnectionRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generatePersonaInstanceConnectionRow,
    generatePersonaInstanceConnectionDetailRow,
    generateId
} from "./setup";

describe("PersonaInstanceConnectionRepository", () => {
    let repository: PersonaInstanceConnectionRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new PersonaInstanceConnectionRepository();
    });

    describe("create", () => {
        it("should create a connection with granted scopes", async () => {
            const instanceId = generateId();
            const connectionId = generateId();
            const input = {
                instance_id: instanceId,
                connection_id: connectionId,
                granted_scopes: ["read:messages", "write:messages"]
            };

            const mockRow = generatePersonaInstanceConnectionRow({
                instance_id: instanceId,
                connection_id: connectionId,
                granted_scopes: JSON.stringify(["read:messages", "write:messages"])
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.persona_instance_connections"),
                [instanceId, connectionId, JSON.stringify(["read:messages", "write:messages"])]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ON CONFLICT (instance_id, connection_id)"),
                expect.any(Array)
            );
            expect(result.instance_id).toBe(instanceId);
            expect(result.connection_id).toBe(connectionId);
            expect(result.granted_scopes).toEqual(["read:messages", "write:messages"]);
        });

        it("should create a connection with empty scopes", async () => {
            const instanceId = generateId();
            const connectionId = generateId();
            const input = {
                instance_id: instanceId,
                connection_id: connectionId
            };

            const mockRow = generatePersonaInstanceConnectionRow({
                instance_id: instanceId,
                connection_id: connectionId,
                granted_scopes: "[]"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
                instanceId,
                connectionId,
                "[]"
            ]);
            expect(result.granted_scopes).toEqual([]);
        });

        it("should update scopes on conflict", async () => {
            const instanceId = generateId();
            const connectionId = generateId();
            const input = {
                instance_id: instanceId,
                connection_id: connectionId,
                granted_scopes: ["new_scope"]
            };

            const mockRow = generatePersonaInstanceConnectionRow({
                granted_scopes: JSON.stringify(["new_scope"])
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DO UPDATE SET granted_scopes"),
                expect.any(Array)
            );
        });
    });

    describe("createMany", () => {
        it("should create multiple connections", async () => {
            const instanceId = generateId();
            const conn1 = generateId();
            const conn2 = generateId();

            const inputs = [
                { instance_id: instanceId, connection_id: conn1, granted_scopes: ["read"] },
                { instance_id: instanceId, connection_id: conn2, granted_scopes: ["write"] }
            ];

            const mockRow1 = generatePersonaInstanceConnectionRow({
                instance_id: instanceId,
                connection_id: conn1
            });
            const mockRow2 = generatePersonaInstanceConnectionRow({
                instance_id: instanceId,
                connection_id: conn2
            });

            mockQuery
                .mockResolvedValueOnce(mockInsertReturning([mockRow1]))
                .mockResolvedValueOnce(mockInsertReturning([mockRow2]));

            const results = await repository.createMany(inputs);

            expect(mockQuery).toHaveBeenCalledTimes(2);
            expect(results).toHaveLength(2);
        });

        it("should return empty array for empty input", async () => {
            const results = await repository.createMany([]);

            expect(mockQuery).not.toHaveBeenCalled();
            expect(results).toEqual([]);
        });
    });

    describe("findByInstanceId", () => {
        it("should return all connections for an instance with pagination", async () => {
            const instanceId = generateId();
            const mockConnections = [
                generatePersonaInstanceConnectionRow({ instance_id: instanceId }),
                generatePersonaInstanceConnectionRow({ instance_id: instanceId })
            ];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(2))
                .mockResolvedValueOnce(mockRows(mockConnections));

            const result = await repository.findByInstanceId(instanceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT * FROM flowmaestro.persona_instance_connections"),
                expect.any(Array)
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY created_at ASC"),
                expect.any(Array)
            );
            expect(result.connections).toHaveLength(2);
            expect(result.total).toBe(2);
        });

        it("should return empty array when no connections", async () => {
            mockQuery
                .mockResolvedValueOnce(mockCountResult(0))
                .mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findByInstanceId("instance-id");

            expect(result.connections).toEqual([]);
            expect(result.total).toBe(0);
        });

        it("should support custom limit and offset", async () => {
            const instanceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows([]));

            await repository.findByInstanceId(instanceId, { limit: 5, offset: 10 });

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("LIMIT $2 OFFSET $3"), [
                instanceId,
                5,
                10
            ]);
        });
    });

    describe("findByInstanceIdWithDetails", () => {
        it("should return connections with provider details", async () => {
            const instanceId = generateId();
            const mockConnections = [
                generatePersonaInstanceConnectionDetailRow({
                    instance_id: instanceId,
                    connection_name: "My Slack",
                    connection_provider: "slack",
                    connection_method: "oauth2"
                })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockConnections));

            const result = await repository.findByInstanceIdWithDetails(instanceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining(
                    "JOIN flowmaestro.connections c ON pic.connection_id = c.id"
                ),
                [instanceId]
            );
            expect(result).toHaveLength(1);
            expect(result[0].connection).toEqual({
                id: result[0].connection_id,
                name: "My Slack",
                provider: "slack",
                connection_method: "oauth2"
            });
        });

        it("should return empty array when no connections", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findByInstanceIdWithDetails("instance-id");

            expect(result).toEqual([]);
        });
    });

    describe("findByInstanceAndConnection", () => {
        it("should return specific connection", async () => {
            const instanceId = generateId();
            const connectionId = generateId();
            const mockRow = generatePersonaInstanceConnectionRow({
                instance_id: instanceId,
                connection_id: connectionId
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByInstanceAndConnection(instanceId, connectionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE instance_id = $1 AND connection_id = $2"),
                [instanceId, connectionId]
            );
            expect(result).not.toBeNull();
            expect(result?.connection_id).toBe(connectionId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findByInstanceAndConnection("inst", "conn");

            expect(result).toBeNull();
        });
    });

    describe("hasProviderAccess", () => {
        it("should return true when instance has provider access", async () => {
            mockQuery.mockResolvedValueOnce(mockRows([{ "1": 1 }]));

            const result = await repository.hasProviderAccess("instance-id", "slack");

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining(
                    "JOIN flowmaestro.connections c ON pic.connection_id = c.id"
                ),
                ["instance-id", "slack"]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE pic.instance_id = $1 AND c.provider = $2"),
                expect.any(Array)
            );
            expect(result).toBe(true);
        });

        it("should return false when no provider access", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.hasProviderAccess("instance-id", "slack");

            expect(result).toBe(false);
        });
    });

    describe("getConnectionForProvider", () => {
        it("should return connection for provider with details", async () => {
            const mockRow = generatePersonaInstanceConnectionDetailRow({
                connection_provider: "github",
                connection_name: "My GitHub"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.getConnectionForProvider("instance-id", "github");

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE pic.instance_id = $1 AND c.provider = $2"),
                ["instance-id", "github"]
            );
            expect(result).not.toBeNull();
            expect(result?.connection.provider).toBe("github");
            expect(result?.connection.name).toBe("My GitHub");
        });

        it("should return null when provider not connected", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.getConnectionForProvider("instance-id", "github");

            expect(result).toBeNull();
        });
    });

    describe("updateScopes", () => {
        it("should update granted scopes", async () => {
            const instanceId = generateId();
            const connectionId = generateId();
            const newScopes = ["read", "write", "delete"];

            const mockRow = generatePersonaInstanceConnectionRow({
                instance_id: instanceId,
                connection_id: connectionId,
                granted_scopes: JSON.stringify(newScopes)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.updateScopes(instanceId, connectionId, newScopes);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET granted_scopes = $3"),
                [instanceId, connectionId, JSON.stringify(newScopes)]
            );
            expect(result?.granted_scopes).toEqual(newScopes);
        });

        it("should return null when connection not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.updateScopes("inst", "conn", ["scope"]);

            expect(result).toBeNull();
        });
    });

    describe("delete", () => {
        it("should delete a connection and return true", async () => {
            const instanceId = generateId();
            const connectionId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(instanceId, connectionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.persona_instance_connections"),
                [instanceId, connectionId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE instance_id = $1 AND connection_id = $2"),
                expect.any(Array)
            );
            expect(result).toBe(true);
        });

        it("should return false when connection not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.delete("inst", "conn");

            expect(result).toBe(false);
        });
    });

    describe("deleteAllForInstance", () => {
        it("should delete all connections for an instance", async () => {
            const instanceId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(3));

            const result = await repository.deleteAllForInstance(instanceId);

            expect(mockQuery).toHaveBeenCalled();
            const calledWith = mockQuery.mock.calls[0];
            expect(calledWith[0]).toContain("DELETE FROM flowmaestro.persona_instance_connections");
            expect(calledWith[0]).toContain("instance_id = $1");
            expect(calledWith[1]).toEqual([instanceId]);
            expect(result).toBe(3);
        });

        it("should return 0 when no connections to delete", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.deleteAllForInstance("instance-id");

            expect(result).toBe(0);
        });
    });

    describe("row mapping", () => {
        it("should parse granted_scopes from JSON string", async () => {
            const scopes = ["read", "write"];
            const mockRow = generatePersonaInstanceConnectionRow({
                granted_scopes: JSON.stringify(scopes)
            });

            mockQuery
                .mockResolvedValueOnce(mockCountResult(1))
                .mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByInstanceId(mockRow.instance_id);

            expect(result.connections[0].granted_scopes).toEqual(scopes);
        });

        it("should handle granted_scopes as array (already parsed)", async () => {
            const scopes = ["read", "write"];
            const mockRow = {
                ...generatePersonaInstanceConnectionRow(),
                granted_scopes: scopes as unknown as string
            };

            mockQuery
                .mockResolvedValueOnce(mockCountResult(1))
                .mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByInstanceId(mockRow.instance_id);

            expect(result.connections[0].granted_scopes).toEqual(scopes);
        });

        it("should convert created_at to Date", async () => {
            const createdAt = new Date("2024-06-15T10:00:00Z");
            const mockRow = generatePersonaInstanceConnectionRow({
                created_at: createdAt
            });

            mockQuery
                .mockResolvedValueOnce(mockCountResult(1))
                .mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByInstanceId(mockRow.instance_id);

            expect(result.connections[0].created_at).toBeInstanceOf(Date);
        });

        it("should handle null/undefined granted_scopes", async () => {
            const mockRow = {
                ...generatePersonaInstanceConnectionRow(),
                granted_scopes: null as unknown as string
            };

            mockQuery
                .mockResolvedValueOnce(mockCountResult(1))
                .mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByInstanceId(mockRow.instance_id);

            expect(result.connections[0].granted_scopes).toEqual([]);
        });
    });
});
