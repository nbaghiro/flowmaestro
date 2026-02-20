/**
 * Pagination E2E Tests
 *
 * Tests pagination functionality across different tables
 * against a real PostgreSQL database using Testcontainers.
 */

import {
    seedUser,
    seedWorkspace,
    seedWorkflow,
    seedMultipleWorkflows,
    seedAgent
} from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("Pagination (Real PostgreSQL)", () => {
    // ========================================================================
    // BASIC PAGINATION
    // ========================================================================

    describe("first page", () => {
        it("should return correct first page with limit", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                await seedMultipleWorkflows(client, workspace.id, user.id, 20);

                const result = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     ORDER BY created_at DESC
                     LIMIT $2 OFFSET $3`,
                    [workspace.id, 5, 0]
                );

                expect(result.rows).toHaveLength(5);
            });
        });

        it("should return items in correct order", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                // Create workflows with slight delay to ensure ordering
                const workflows = [];
                for (let i = 0; i < 5; i++) {
                    const wf = await seedWorkflow(client, workspace.id, user.id, {
                        name: `Workflow ${i + 1}`
                    });
                    workflows.push(wf);
                }

                const result = await client.query(
                    `SELECT name FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     ORDER BY created_at ASC
                     LIMIT 3 OFFSET 0`,
                    [workspace.id]
                );

                // Should be in ascending order (oldest first)
                expect(result.rows[0].name).toBe("Workflow 1");
                expect(result.rows[1].name).toBe("Workflow 2");
                expect(result.rows[2].name).toBe("Workflow 3");
            });
        });
    });

    describe("middle page", () => {
        it("should return correct middle page with offset", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                await seedMultipleWorkflows(client, workspace.id, user.id, 20);

                // Get second page (offset 5, limit 5)
                const result = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     ORDER BY created_at DESC
                     LIMIT $2 OFFSET $3`,
                    [workspace.id, 5, 5]
                );

                expect(result.rows).toHaveLength(5);
            });
        });

        it("should not overlap with previous page", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                await seedMultipleWorkflows(client, workspace.id, user.id, 15);

                // Get first and second pages
                const page1 = await client.query(
                    `SELECT id FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     ORDER BY created_at DESC
                     LIMIT 5 OFFSET 0`,
                    [workspace.id]
                );

                const page2 = await client.query(
                    `SELECT id FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     ORDER BY created_at DESC
                     LIMIT 5 OFFSET 5`,
                    [workspace.id]
                );

                const page1Ids = new Set(page1.rows.map((r) => r.id));
                const page2Ids = page2.rows.map((r) => r.id);

                // No overlap
                for (const id of page2Ids) {
                    expect(page1Ids.has(id)).toBe(false);
                }
            });
        });
    });

    describe("last page", () => {
        it("should return partial results on last page", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                await seedMultipleWorkflows(client, workspace.id, user.id, 13);

                // Get last page (13 items, page size 5, page 3 should have 3 items)
                const result = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     ORDER BY created_at DESC
                     LIMIT 5 OFFSET 10`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(3);
            });
        });

        it("should return empty for offset beyond data", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                await seedMultipleWorkflows(client, workspace.id, user.id, 10);

                const result = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     ORDER BY created_at DESC
                     LIMIT 5 OFFSET 100`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });
    });

    describe("empty results", () => {
        it("should handle no data case", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                // No workflows created

                const result = await client.query(
                    `SELECT * FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     ORDER BY created_at DESC
                     LIMIT 5 OFFSET 0`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });
    });

    // ========================================================================
    // TOTAL COUNT
    // ========================================================================

    describe("total count", () => {
        it("should return accurate total count", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                await seedMultipleWorkflows(client, workspace.id, user.id, 25);

                const countResult = await client.query(
                    `SELECT COUNT(*) as total FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace.id]
                );

                expect(parseInt(countResult.rows[0].total)).toBe(25);
            });
        });

        it("should return count with filters applied", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                // Create mix of workflow types
                for (let i = 0; i < 10; i++) {
                    await seedWorkflow(client, workspace.id, user.id, {
                        workflow_type: i < 7 ? "user" : "system"
                    });
                }

                const userCount = await client.query(
                    `SELECT COUNT(*) as total FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL AND workflow_type = 'user'`,
                    [workspace.id]
                );

                expect(parseInt(userCount.rows[0].total)).toBe(7);
            });
        });
    });

    // ========================================================================
    // SORT ORDER
    // ========================================================================

    describe("sort order", () => {
        it("should maintain stable sorting with ties", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                // Create agents with same name
                for (let i = 0; i < 5; i++) {
                    await seedAgent(client, workspace.id, user.id, {
                        name: "Same Name Agent",
                        description: `Agent ${i}`
                    });
                }

                // Query twice - results should be consistent
                const query = `SELECT id, description FROM flowmaestro.agents
                               WHERE workspace_id = $1 AND deleted_at IS NULL
                               ORDER BY name, id
                               LIMIT 5`;

                const result1 = await client.query(query, [workspace.id]);
                const result2 = await client.query(query, [workspace.id]);

                const ids1 = result1.rows.map((r) => r.id);
                const ids2 = result2.rows.map((r) => r.id);

                expect(ids1).toEqual(ids2);
            });
        });

        it("should support multi-column sorting", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedWorkflow(client, workspace.id, user.id, {
                    name: "Alpha",
                    workflow_type: "system"
                });
                await seedWorkflow(client, workspace.id, user.id, {
                    name: "Alpha",
                    workflow_type: "user"
                });
                await seedWorkflow(client, workspace.id, user.id, {
                    name: "Beta",
                    workflow_type: "user"
                });

                const result = await client.query(
                    `SELECT name, workflow_type FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     ORDER BY name ASC, workflow_type DESC`,
                    [workspace.id]
                );

                expect(result.rows[0].name).toBe("Alpha");
                expect(result.rows[0].workflow_type).toBe("user"); // user > system in DESC
                expect(result.rows[1].name).toBe("Alpha");
                expect(result.rows[1].workflow_type).toBe("system");
                expect(result.rows[2].name).toBe("Beta");
            });
        });
    });

    // ========================================================================
    // CURSOR-BASED PAGINATION
    // ========================================================================

    describe("cursor-based pagination", () => {
        it("should paginate using cursor (last seen id)", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                await seedMultipleWorkflows(client, workspace.id, user.id, 10);

                // First page
                const page1 = await client.query(
                    `SELECT id, name FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     ORDER BY id ASC
                     LIMIT 3`,
                    [workspace.id]
                );

                expect(page1.rows).toHaveLength(3);
                const lastId = page1.rows[page1.rows.length - 1].id;

                // Second page using cursor
                const page2 = await client.query(
                    `SELECT id, name FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL AND id > $2
                     ORDER BY id ASC
                     LIMIT 3`,
                    [workspace.id, lastId]
                );

                expect(page2.rows).toHaveLength(3);
                // First ID of page 2 should be greater than last ID of page 1
                expect(page2.rows[0].id > lastId).toBe(true);
            });
        });

        it("should handle cursor pagination with compound key", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                // Create workflows with distinct timestamps for compound key pagination
                const baseTime = new Date();
                for (let i = 0; i < 10; i++) {
                    const timestamp = new Date(baseTime.getTime() - i * 1000); // Stagger by 1 second
                    await client.query(
                        `INSERT INTO flowmaestro.workflows
                         (workspace_id, user_id, name, definition, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, $5, $5)`,
                        [
                            workspace.id,
                            user.id,
                            `Workflow ${i + 1}`,
                            JSON.stringify({ nodes: [], edges: [] }),
                            timestamp
                        ]
                    );
                }

                // First page sorted by created_at, id
                const page1 = await client.query(
                    `SELECT id, created_at FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     ORDER BY created_at DESC, id DESC
                     LIMIT 3`,
                    [workspace.id]
                );

                const lastRow = page1.rows[page1.rows.length - 1];

                // Second page using compound cursor
                const page2 = await client.query(
                    `SELECT id, created_at FROM flowmaestro.workflows
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     AND (created_at, id) < ($2, $3)
                     ORDER BY created_at DESC, id DESC
                     LIMIT 3`,
                    [workspace.id, lastRow.created_at, lastRow.id]
                );

                expect(page2.rows).toHaveLength(3);
                // All results should be "before" the cursor
                for (const row of page2.rows) {
                    const isBefore =
                        row.created_at < lastRow.created_at ||
                        (row.created_at.getTime() === lastRow.created_at.getTime() &&
                            row.id < lastRow.id);
                    expect(isBefore).toBe(true);
                }
            });
        });
    });
});
