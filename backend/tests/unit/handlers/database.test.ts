/**
 * Database Node Handler Unit Tests
 *
 * Tests database node handler with mocked dependencies:
 * - ConnectionRepository mocked for connection lookup
 * - Provider registry mocked for database operations
 * - Full handler execution tests for PostgreSQL, MySQL, and MongoDB
 */

// Mock config before importing handler
jest.mock("../../../src/core/config", () => ({
    config: {
        ai: {
            openai: { apiKey: "test-openai-key" },
            anthropic: { apiKey: "test-anthropic-key" }
        },
        database: {
            host: "localhost",
            port: 5432,
            database: "test",
            user: "test",
            password: "test"
        }
    }
}));

// Mock database module
jest.mock("../../../src/storage/database", () => ({
    Database: {
        getInstance: jest.fn().mockReturnValue({
            query: jest.fn().mockResolvedValue({ rows: [] }),
            getPool: jest.fn()
        })
    }
}));

// Mock ConnectionRepository
const mockFindByIdWithData = jest.fn();
const mockMarkAsUsed = jest.fn();
jest.mock("../../../src/storage/repositories/ConnectionRepository", () => ({
    ConnectionRepository: jest.fn().mockImplementation(() => ({
        findByIdWithData: mockFindByIdWithData,
        markAsUsed: mockMarkAsUsed
    }))
}));

// Mock provider instance
const mockExecuteOperation = jest.fn();
const mockProvider = {
    name: "test-provider",
    executeOperation: mockExecuteOperation
};

// Mock provider registry
jest.mock("../../../src/integrations/registry", () => ({
    providerRegistry: {
        getProvider: jest.fn().mockResolvedValue(mockProvider)
    }
}));

// Mock heartbeat functions
jest.mock("../../../src/temporal/core/services/heartbeat", () => ({
    withHeartbeat: jest.fn((_name: string, fn: (heartbeat: unknown) => Promise<unknown>) => {
        const mockHeartbeat = { update: jest.fn() };
        return fn(mockHeartbeat);
    }),
    getCancellationSignal: jest.fn().mockReturnValue(null),
    createHeartbeatManager: jest.fn(),
    sendHeartbeat: jest.fn(),
    isCancelled: jest.fn().mockReturnValue(false),
    HeartbeatManager: jest.fn()
}));

import type { JsonObject } from "@flowmaestro/shared";
import {
    DatabaseNodeHandler,
    createDatabaseNodeHandler
} from "../../../src/temporal/activities/execution/handlers/utils/database";
import { createTestContext, createTestMetadata } from "../../helpers/handler-test-utils";
import type { ContextSnapshot } from "../../../src/temporal/core/types";

// Helper to create handler input
function createHandlerInput(
    overrides: {
        nodeType?: string;
        nodeConfig?: Record<string, unknown>;
        context?: ContextSnapshot;
    } = {}
) {
    const defaultConfig = {
        connectionId: "conn-db-123",
        provider: "postgresql",
        operation: "query",
        parameters: {
            sql: "SELECT * FROM users"
        }
    };

    return {
        nodeType: overrides.nodeType || "database",
        nodeConfig: { ...defaultConfig, ...overrides.nodeConfig },
        context: overrides.context || createTestContext(),
        metadata: createTestMetadata({ nodeId: "test-db-node" })
    };
}

// Create mock connection data
function createMockConnection(
    overrides: Partial<{
        id: string;
        status: string;
        provider: string;
        data: Record<string, unknown>;
    }> = {}
) {
    return {
        id: overrides.id || "conn-db-123",
        user_id: "user-123",
        provider: overrides.provider || "postgresql",
        name: "My Database Connection",
        status: overrides.status || "active",
        data: overrides.data || {
            host: "localhost",
            port: 5432,
            database: "testdb",
            user: "testuser",
            password: "testpass"
        },
        created_at: new Date(),
        updated_at: new Date()
    };
}

describe("DatabaseNodeHandler", () => {
    let handler: DatabaseNodeHandler;

    beforeEach(() => {
        handler = createDatabaseNodeHandler();
        jest.clearAllMocks();
        mockFindByIdWithData.mockResolvedValue(createMockConnection());
        mockMarkAsUsed.mockResolvedValue(undefined);
        mockExecuteOperation.mockResolvedValue({
            success: true,
            data: { rows: [] }
        });
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("DatabaseNodeHandler");
        });

        it("supports database node type", () => {
            expect(handler.supportedNodeTypes).toContain("database");
        });

        it("can handle database type", () => {
            expect(handler.canHandle("database")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("sql")).toBe(false);
            expect(handler.canHandle("postgres")).toBe(false);
            expect(handler.canHandle("mongodb")).toBe(false);
        });
    });

    describe("connection validation", () => {
        it("throws error when connectionId is missing", async () => {
            // Use raw input to avoid default config being applied
            const input = {
                nodeType: "database",
                nodeConfig: {
                    provider: "postgresql",
                    operation: "query",
                    parameters: { sql: "SELECT 1" }
                    // connectionId intentionally missing
                },
                context: createTestContext(),
                metadata: createTestMetadata({ nodeId: "test-db-node" })
            };

            await expect(handler.execute(input)).rejects.toThrow(/connectionId is required/);
        });

        it("throws error when provider is missing", async () => {
            // Use raw input to avoid default config being applied
            const input = {
                nodeType: "database",
                nodeConfig: {
                    connectionId: "conn-123",
                    operation: "query",
                    parameters: { sql: "SELECT 1" }
                    // provider intentionally missing
                },
                context: createTestContext(),
                metadata: createTestMetadata({ nodeId: "test-db-node" })
            };

            await expect(handler.execute(input)).rejects.toThrow(/provider is required/);
        });

        it("returns error when connection not found", async () => {
            mockFindByIdWithData.mockResolvedValue(null);

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "non-existent-conn",
                    provider: "postgresql",
                    operation: "query",
                    parameters: { sql: "SELECT 1" }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(false);
            expect((result.error as JsonObject).message).toMatch(/not found/i);
        });

        it("returns error when connection is not active", async () => {
            mockFindByIdWithData.mockResolvedValue(createMockConnection({ status: "expired" }));

            const input = createHandlerInput();

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(false);
            expect((result.error as JsonObject).message).toMatch(/not active/i);
        });

        it("returns error when provider mismatch", async () => {
            mockFindByIdWithData.mockResolvedValue(createMockConnection({ provider: "mysql" }));

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-123",
                    provider: "postgresql",
                    operation: "query",
                    parameters: { sql: "SELECT 1" }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(false);
            expect((result.error as JsonObject).message).toMatch(/expected postgresql, got mysql/);
        });
    });

    describe("PostgreSQL operations", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(
                createMockConnection({ provider: "postgresql" })
            );
        });

        it("executes SELECT query", async () => {
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: {
                    rows: [
                        { id: 1, name: "Alice", email: "alice@example.com" },
                        { id: 2, name: "Bob", email: "bob@example.com" }
                    ],
                    rowCount: 2
                }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-pg",
                    provider: "postgresql",
                    operation: "query",
                    parameters: { sql: "SELECT * FROM users" }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(true);
            expect(result.operation).toBe("query");
            expect(result.provider).toBe("postgresql");
            expect((result.data as JsonObject).rows).toHaveLength(2);
        });

        it("executes INSERT query", async () => {
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: {
                    rows: [{ id: 3 }],
                    rowCount: 1
                }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-pg",
                    provider: "postgresql",
                    operation: "insert",
                    parameters: {
                        sql: "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
                        values: ["Charlie", "charlie@example.com"]
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(true);
            expect(mockExecuteOperation).toHaveBeenCalledWith(
                "insert",
                expect.objectContaining({
                    sql: expect.stringContaining("INSERT INTO users"),
                    values: ["Charlie", "charlie@example.com"]
                }),
                expect.any(Object),
                expect.any(Object)
            );
        });

        it("executes UPDATE query", async () => {
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: { rowCount: 5 }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-pg",
                    provider: "postgresql",
                    operation: "update",
                    parameters: {
                        sql: "UPDATE users SET active = true WHERE created_at > $1",
                        values: ["2024-01-01"]
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(true);
            expect((result.data as JsonObject).rowCount).toBe(5);
        });

        it("executes DELETE query", async () => {
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: { rowCount: 3 }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-pg",
                    provider: "postgresql",
                    operation: "delete",
                    parameters: {
                        sql: "DELETE FROM users WHERE active = false"
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(true);
            expect((result.data as JsonObject).rowCount).toBe(3);
        });

        it("lists tables", async () => {
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: {
                    rows: [
                        { table_name: "users" },
                        { table_name: "posts" },
                        { table_name: "comments" }
                    ]
                }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-pg",
                    provider: "postgresql",
                    operation: "listTables",
                    parameters: {}
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(true);
            expect((result.data as JsonObject).rows).toHaveLength(3);
        });
    });

    describe("MySQL operations", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createMockConnection({ provider: "mysql" }));
        });

        it("executes query with MySQL provider", async () => {
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: {
                    rows: [{ id: 1, name: "Test" }],
                    affectedRows: 0
                }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-mysql",
                    provider: "mysql",
                    operation: "query",
                    parameters: { sql: "SELECT * FROM products LIMIT 10" }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(true);
            expect(result.provider).toBe("mysql");
        });

        it("handles MySQL-specific INSERT syntax", async () => {
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: {
                    insertId: 42,
                    affectedRows: 1
                }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-mysql",
                    provider: "mysql",
                    operation: "insert",
                    parameters: {
                        sql: "INSERT INTO products (name, price) VALUES (?, ?)",
                        values: ["Widget", 29.99]
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(true);
            expect((result.data as JsonObject).insertId).toBe(42);
        });
    });

    describe("MongoDB operations", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(
                createMockConnection({
                    provider: "mongodb",
                    data: {
                        connectionString: "mongodb://localhost:27017",
                        database: "testdb"
                    }
                })
            );
        });

        it("executes find operation", async () => {
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: [
                    { _id: "1", name: "Document 1" },
                    { _id: "2", name: "Document 2" }
                ]
            });

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-mongo",
                    provider: "mongodb",
                    operation: "find",
                    parameters: {
                        collection: "documents",
                        filter: { active: true }
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(true);
            expect(result.provider).toBe("mongodb");
            expect(result.data).toHaveLength(2);
        });

        it("executes insertOne operation", async () => {
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: {
                    acknowledged: true,
                    insertedId: "new-doc-id"
                }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-mongo",
                    provider: "mongodb",
                    operation: "insertOne",
                    parameters: {
                        collection: "documents",
                        document: { name: "New Doc", status: "draft" }
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(true);
            expect((result.data as JsonObject).insertedId).toBe("new-doc-id");
        });

        it("executes insertMany operation", async () => {
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: {
                    acknowledged: true,
                    insertedCount: 3,
                    insertedIds: ["id1", "id2", "id3"]
                }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-mongo",
                    provider: "mongodb",
                    operation: "insertMany",
                    parameters: {
                        collection: "documents",
                        documents: [{ name: "Doc 1" }, { name: "Doc 2" }, { name: "Doc 3" }]
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(true);
            expect((result.data as JsonObject).insertedCount).toBe(3);
        });

        it("executes updateOne operation", async () => {
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: {
                    matchedCount: 1,
                    modifiedCount: 1
                }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-mongo",
                    provider: "mongodb",
                    operation: "updateOne",
                    parameters: {
                        collection: "documents",
                        filter: { _id: "doc-123" },
                        update: { $set: { status: "published" } }
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(true);
            expect((result.data as JsonObject).modifiedCount).toBe(1);
        });

        it("executes updateMany operation", async () => {
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: {
                    matchedCount: 10,
                    modifiedCount: 10
                }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-mongo",
                    provider: "mongodb",
                    operation: "updateMany",
                    parameters: {
                        collection: "documents",
                        filter: { status: "draft" },
                        update: { $set: { reviewed: true } }
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(true);
            expect((result.data as JsonObject).modifiedCount).toBe(10);
        });

        it("executes deleteOne operation", async () => {
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: { deletedCount: 1 }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-mongo",
                    provider: "mongodb",
                    operation: "deleteOne",
                    parameters: {
                        collection: "documents",
                        filter: { _id: "doc-to-delete" }
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(true);
            expect((result.data as JsonObject).deletedCount).toBe(1);
        });

        it("executes deleteMany operation", async () => {
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: { deletedCount: 5 }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-mongo",
                    provider: "mongodb",
                    operation: "deleteMany",
                    parameters: {
                        collection: "documents",
                        filter: { archived: true }
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(true);
            expect((result.data as JsonObject).deletedCount).toBe(5);
        });

        it("executes aggregate operation", async () => {
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: [
                    { _id: "category1", total: 150 },
                    { _id: "category2", total: 200 }
                ]
            });

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-mongo",
                    provider: "mongodb",
                    operation: "aggregate",
                    parameters: {
                        collection: "orders",
                        pipeline: [{ $group: { _id: "$category", total: { $sum: "$amount" } } }]
                    }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it("lists collections", async () => {
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: ["users", "documents", "orders"]
            });

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-mongo",
                    provider: "mongodb",
                    operation: "listCollections",
                    parameters: {}
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(true);
            expect(result.data).toContain("users");
        });
    });

    describe("output handling", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createMockConnection());
        });

        it("returns query result data", async () => {
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: { rows: [{ id: 1 }], rowCount: 1 }
            });

            const input = createHandlerInput();
            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
        });

        it("uses outputVariable when specified", async () => {
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: { rows: [{ count: 42 }] }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-123",
                    provider: "postgresql",
                    operation: "query",
                    parameters: { sql: "SELECT COUNT(*) FROM users" },
                    outputVariable: "userCount"
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.userCount).toBeDefined();
        });

        it("returns error result on failure", async () => {
            mockExecuteOperation.mockResolvedValue({
                success: false,
                error: {
                    type: "query_error",
                    message: "syntax error at or near SELECT"
                }
            });

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-123",
                    provider: "postgresql",
                    operation: "query",
                    parameters: { sql: "SELEC * FROM users" } // intentional typo
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it("includes query time in metadata", async () => {
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: { rows: [] }
            });

            const input = createHandlerInput();
            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.metadata).toBeDefined();
            expect((result.metadata as JsonObject).queryTime).toBeGreaterThanOrEqual(0);
        });
    });

    describe("error handling", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createMockConnection());
        });

        it("handles connection errors gracefully", async () => {
            mockExecuteOperation.mockRejectedValue(new Error("Connection refused"));

            const input = createHandlerInput();
            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(false);
            expect((result.error as JsonObject).message).toContain("Connection refused");
        });

        it("handles query syntax errors", async () => {
            mockExecuteOperation.mockRejectedValue(new Error("syntax error at position 10"));

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-123",
                    provider: "postgresql",
                    operation: "query",
                    parameters: { sql: "INVALID SQL HERE" }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.success).toBe(false);
            expect((result.error as JsonObject).message).toContain("syntax error");
        });

        it("throws error with outputVariable on failure", async () => {
            mockExecuteOperation.mockRejectedValue(new Error("Query timeout"));

            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-123",
                    provider: "postgresql",
                    operation: "query",
                    parameters: { sql: "SELECT * FROM large_table" },
                    outputVariable: "queryResult"
                }
            });

            // When outputVariable is specified, errors are thrown
            await expect(handler.execute(input)).rejects.toThrow("Query timeout");
        });
    });

    describe("metrics", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createMockConnection());
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: { rows: [] }
            });
        });

        it("records execution duration", async () => {
            const input = createHandlerInput();
            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });

        it("records query time in result", async () => {
            const input = createHandlerInput();
            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect((result.metadata as JsonObject).queryTime).toBeGreaterThanOrEqual(0);
        });

        it("marks connection as used after successful query", async () => {
            const input = createHandlerInput();
            await handler.execute(input);

            expect(mockMarkAsUsed).toHaveBeenCalledWith("conn-db-123");
        });
    });

    describe("backward compatibility", () => {
        beforeEach(() => {
            mockFindByIdWithData.mockResolvedValue(createMockConnection());
            mockExecuteOperation.mockResolvedValue({
                success: true,
                data: { rows: [] }
            });
        });

        it("supports legacy databaseConnectionId field", async () => {
            // Use raw input to test only legacy field without default connectionId
            const input = {
                nodeType: "database",
                nodeConfig: {
                    databaseConnectionId: "conn-legacy",
                    provider: "postgresql",
                    operation: "query",
                    parameters: { sql: "SELECT 1" }
                },
                context: createTestContext(),
                metadata: createTestMetadata({ nodeId: "test-db-node" })
            };

            await handler.execute(input);

            expect(mockFindByIdWithData).toHaveBeenCalledWith("conn-legacy");
        });

        it("supports legacy databaseType field", async () => {
            const input = createHandlerInput({
                nodeConfig: {
                    connectionId: "conn-123",
                    databaseType: "postgresql",
                    operation: "query",
                    parameters: { sql: "SELECT 1" }
                }
            });

            const output = await handler.execute(input);
            const result = output.result as JsonObject;

            expect(result.provider).toBe("postgresql");
        });
    });
});
