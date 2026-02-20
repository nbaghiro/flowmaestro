/**
 * JSONB Query E2E Tests
 *
 * Tests JSONB operations and queries against a real PostgreSQL database
 * using Testcontainers. Covers path extraction, containment operators,
 * array operations, and index usage.
 */

import { seedUser, seedWorkspace, seedWorkflow, seedAgent } from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("JSONB Queries (Real PostgreSQL)", () => {
    // ========================================================================
    // PATH EXTRACTION
    // ========================================================================

    describe("path extraction", () => {
        it("should extract top-level field with ->>", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                await seedWorkflow(client, workspace.id, user.id, {
                    definition: {
                        version: "1.0",
                        author: "test-author"
                    }
                });

                const result = await client.query(
                    `SELECT definition->>'version' as version
                     FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace.id]
                );

                expect(result.rows[0].version).toBe("1.0");
            });
        });

        it("should extract nested field with -> and ->>", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                await seedWorkflow(client, workspace.id, user.id, {
                    definition: {
                        nodes: {
                            start: {
                                type: "trigger",
                                config: { event: "manual" }
                            }
                        }
                    }
                });

                const result = await client.query(
                    `SELECT definition->'nodes'->'start'->>'type' as node_type
                     FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace.id]
                );

                expect(result.rows[0].node_type).toBe("trigger");
            });
        });

        it("should extract deep nested path", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                await seedAgent(client, workspace.id, user.id, {
                    memory_config: {
                        settings: {
                            context: {
                                window_size: 100
                            }
                        }
                    }
                });

                const result = await client.query(
                    `SELECT (memory_config->'settings'->'context'->>'window_size')::int as window_size
                     FROM flowmaestro.agents
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace.id]
                );

                expect(result.rows[0].window_size).toBe(100);
            });
        });

        it("should use #>> for path array extraction", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                await seedWorkflow(client, workspace.id, user.id, {
                    definition: {
                        deep: { nested: { path: { value: "found" } } }
                    }
                });

                const result = await client.query(
                    `SELECT definition #>> '{deep,nested,path,value}' as extracted
                     FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace.id]
                );

                expect(result.rows[0].extracted).toBe("found");
            });
        });
    });

    // ========================================================================
    // CONTAINMENT OPERATORS
    // ========================================================================

    describe("containment operator", () => {
        it("should use @> for JSONB containment", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedWorkflow(client, workspace.id, user.id, {
                    name: "Tagged Important",
                    definition: { metadata: { tag: "important", priority: 1 } }
                });
                await seedWorkflow(client, workspace.id, user.id, {
                    name: "Tagged Draft",
                    definition: { metadata: { tag: "draft" } }
                });

                const result = await client.query(
                    `SELECT name FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     AND definition @> '{"metadata": {"tag": "important"}}'`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("Tagged Important");
            });
        });

        it("should use <@ for reverse containment", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedWorkflow(client, workspace.id, user.id, {
                    name: "Simple",
                    definition: { type: "simple" }
                });
                await seedWorkflow(client, workspace.id, user.id, {
                    name: "Complex",
                    definition: { type: "simple", extra: "data", more: "fields" }
                });

                // Find workflows where definition is contained by the search object
                const result = await client.query(
                    `SELECT name FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     AND definition <@ '{"type": "simple"}'`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("Simple");
            });
        });

        it("should filter with multiple containment conditions", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedAgent(client, workspace.id, user.id, {
                    name: "Match",
                    metadata: { category: "production", active: true }
                });
                await seedAgent(client, workspace.id, user.id, {
                    name: "No Match 1",
                    metadata: { category: "production", active: false }
                });
                await seedAgent(client, workspace.id, user.id, {
                    name: "No Match 2",
                    metadata: { category: "staging", active: true }
                });

                const result = await client.query(
                    `SELECT name FROM flowmaestro.agents
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     AND metadata @> '{"category": "production"}'
                     AND metadata @> '{"active": true}'`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("Match");
            });
        });
    });

    // ========================================================================
    // ARRAY OPERATIONS
    // ========================================================================

    describe("array operations", () => {
        it("should query JSONB arrays with containment", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedWorkflow(client, workspace.id, user.id, {
                    name: "Has Node A",
                    definition: { edges: [{ from: "a", to: "b" }] }
                });
                await seedWorkflow(client, workspace.id, user.id, {
                    name: "Has Node X",
                    definition: { edges: [{ from: "x", to: "y" }] }
                });

                const result = await client.query(
                    `SELECT name FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     AND definition->'edges' @> '[{"from": "a"}]'`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("Has Node A");
            });
        });

        it("should check array length with jsonb_array_length", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedWorkflow(client, workspace.id, user.id, {
                    name: "Small",
                    definition: { edges: [{ id: 1 }] }
                });
                await seedWorkflow(client, workspace.id, user.id, {
                    name: "Medium",
                    definition: { edges: [{ id: 1 }, { id: 2 }, { id: 3 }] }
                });
                await seedWorkflow(client, workspace.id, user.id, {
                    name: "Large",
                    definition: { edges: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }] }
                });

                const result = await client.query(
                    `SELECT name, jsonb_array_length(definition->'edges') as edge_count
                     FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     AND jsonb_array_length(definition->'edges') >= 3`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(2);
                const names = result.rows.map((r) => r.name);
                expect(names).toContain("Medium");
                expect(names).toContain("Large");
            });
        });

        it("should access array element by index", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedWorkflow(client, workspace.id, user.id, {
                    definition: {
                        steps: [
                            { name: "step1", type: "trigger" },
                            { name: "step2", type: "process" },
                            { name: "step3", type: "output" }
                        ]
                    }
                });

                const result = await client.query(
                    `SELECT definition->'steps'->0->>'name' as first_step,
                            definition->'steps'->2->>'type' as last_type
                     FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace.id]
                );

                expect(result.rows[0].first_step).toBe("step1");
                expect(result.rows[0].last_type).toBe("output");
            });
        });
    });

    // ========================================================================
    // NESTED PATH QUERIES
    // ========================================================================

    describe("nested paths", () => {
        it("should traverse deep object paths", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedWorkflow(client, workspace.id, user.id, {
                    definition: {
                        nodes: {
                            node_1: {
                                config: {
                                    settings: {
                                        advanced: {
                                            timeout: 5000
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

                const result = await client.query(
                    `SELECT (definition->'nodes'->'node_1'->'config'->'settings'->'advanced'->>'timeout')::int as timeout
                     FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace.id]
                );

                expect(result.rows[0].timeout).toBe(5000);
            });
        });
    });

    // ========================================================================
    // NULL HANDLING
    // ========================================================================

    describe("NULL handling", () => {
        it("should return NULL for missing paths", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedWorkflow(client, workspace.id, user.id, {
                    definition: { existing: "value" }
                });

                const result = await client.query(
                    `SELECT definition->>'missing' as missing_field
                     FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace.id]
                );

                expect(result.rows[0].missing_field).toBeNull();
            });
        });

        it("should filter rows where path exists", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedWorkflow(client, workspace.id, user.id, {
                    name: "Has Flag",
                    definition: { settings: { flag: true } }
                });
                await seedWorkflow(client, workspace.id, user.id, {
                    name: "No Flag",
                    definition: { settings: {} }
                });

                const result = await client.query(
                    `SELECT name FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     AND definition->'settings' ? 'flag'`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("Has Flag");
            });
        });

        it("should check for NULL JSON values vs missing keys", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedWorkflow(client, workspace.id, user.id, {
                    name: "Explicit Null",
                    definition: { value: null }
                });
                await seedWorkflow(client, workspace.id, user.id, {
                    name: "Missing Key",
                    definition: {}
                });
                await seedWorkflow(client, workspace.id, user.id, {
                    name: "Has Value",
                    definition: { value: "present" }
                });

                // Key exists (regardless of value)
                const hasKey = await client.query(
                    `SELECT name FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     AND definition ? 'value'`,
                    [workspace.id]
                );

                expect(hasKey.rows).toHaveLength(2);
                expect(hasKey.rows.map((r) => r.name).sort()).toEqual([
                    "Explicit Null",
                    "Has Value"
                ]);

                // Value is not null
                const notNull = await client.query(
                    `SELECT name FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     AND (definition->>'value') IS NOT NULL`,
                    [workspace.id]
                );

                expect(notNull.rows).toHaveLength(1);
                expect(notNull.rows[0].name).toBe("Has Value");
            });
        });
    });

    // ========================================================================
    // JSONB COMPARISON
    // ========================================================================

    describe("comparison operations", () => {
        it("should compare numeric values in JSONB", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedAgent(client, workspace.id, user.id, {
                    name: "Low",
                    metadata: { priority: 1 }
                });
                await seedAgent(client, workspace.id, user.id, {
                    name: "Medium",
                    metadata: { priority: 5 }
                });
                await seedAgent(client, workspace.id, user.id, {
                    name: "High",
                    metadata: { priority: 10 }
                });

                const result = await client.query(
                    `SELECT name FROM flowmaestro.agents
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     AND (metadata->>'priority')::int >= 5
                     ORDER BY (metadata->>'priority')::int DESC`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(2);
                expect(result.rows[0].name).toBe("High");
                expect(result.rows[1].name).toBe("Medium");
            });
        });
    });
});
