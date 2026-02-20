/**
 * ThreadRepository E2E Tests
 *
 * Tests thread database operations against a real PostgreSQL database
 * using Testcontainers. Each test runs in a transaction that is
 * rolled back to ensure isolation.
 */

import {
    seedUser,
    seedWorkspace,
    seedAgent,
    seedThread,
    seedThreadWithMessages,
    generateTestId
} from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("ThreadRepository (Real PostgreSQL)", () => {
    // ========================================================================
    // CREATE OPERATIONS
    // ========================================================================

    describe("create", () => {
        it("should create a thread with all fields", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const threadId = generateTestId("thread");

                const result = await client.query(
                    `INSERT INTO flowmaestro.threads (
                        id, user_id, workspace_id, agent_id, title, status, metadata
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *`,
                    [
                        threadId,
                        user.id,
                        workspace.id,
                        agent.id,
                        "Test Thread",
                        "active",
                        JSON.stringify({ topic: "testing" })
                    ]
                );

                expect(result.rows).toHaveLength(1);
                const thread = result.rows[0];
                expect(thread.id).toBe(threadId);
                expect(thread.agent_id).toBe(agent.id);
                expect(thread.title).toBe("Test Thread");
                expect(thread.status).toBe("active");
                expect(thread.deleted_at).toBeNull();
                expect(thread.archived_at).toBeNull();
            });
        });

        it("should link thread to agent and user", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id);

                const result = await client.query(
                    `SELECT t.*, a.name as agent_name, u.email as user_email
                     FROM flowmaestro.threads t
                     JOIN flowmaestro.agents a ON t.agent_id = a.id
                     JOIN flowmaestro.users u ON t.user_id = u.id
                     WHERE t.id = $1`,
                    [thread.id]
                );

                expect(result.rows[0].agent_id).toBe(agent.id);
                expect(result.rows[0].user_id).toBe(user.id);
                expect(result.rows[0].agent_name).toBe(agent.name);
                expect(result.rows[0].user_email).toBe(user.email);
            });
        });
    });

    // ========================================================================
    // READ OPERATIONS
    // ========================================================================

    describe("findById", () => {
        it("should return thread when it exists", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id);

                const result = await client.query(
                    `SELECT * FROM flowmaestro.threads
                     WHERE id = $1 AND deleted_at IS NULL`,
                    [thread.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].id).toBe(thread.id);
            });
        });

        it("should not return deleted threads", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id, {
                    status: "deleted"
                });

                await client.query(
                    "UPDATE flowmaestro.threads SET deleted_at = NOW() WHERE id = $1",
                    [thread.id]
                );

                const result = await client.query(
                    `SELECT * FROM flowmaestro.threads
                     WHERE id = $1 AND deleted_at IS NULL`,
                    [thread.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });
    });

    describe("list with filters", () => {
        it("should filter by status", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);

                await seedThread(client, agent.id, workspace.id, user.id, { status: "active" });
                await seedThread(client, agent.id, workspace.id, user.id, { status: "active" });
                await seedThread(client, agent.id, workspace.id, user.id, { status: "archived" });

                const activeResult = await client.query(
                    `SELECT * FROM flowmaestro.threads
                     WHERE workspace_id = $1 AND status = $2 AND deleted_at IS NULL`,
                    [workspace.id, "active"]
                );

                const archivedResult = await client.query(
                    `SELECT * FROM flowmaestro.threads
                     WHERE workspace_id = $1 AND status = $2 AND deleted_at IS NULL`,
                    [workspace.id, "archived"]
                );

                expect(activeResult.rows).toHaveLength(2);
                expect(archivedResult.rows).toHaveLength(1);
            });
        });

        it("should filter by agent_id", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent1 = await seedAgent(client, workspace.id, user.id, { name: "Agent 1" });
                const agent2 = await seedAgent(client, workspace.id, user.id, { name: "Agent 2" });

                await seedThread(client, agent1.id, workspace.id, user.id);
                await seedThread(client, agent1.id, workspace.id, user.id);
                await seedThread(client, agent2.id, workspace.id, user.id);

                const result = await client.query(
                    `SELECT * FROM flowmaestro.threads
                     WHERE workspace_id = $1 AND agent_id = $2 AND deleted_at IS NULL`,
                    [workspace.id, agent1.id]
                );

                expect(result.rows).toHaveLength(2);
            });
        });

        it("should search by title", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);

                await seedThread(client, agent.id, workspace.id, user.id, {
                    title: "Project Planning Discussion"
                });
                await seedThread(client, agent.id, workspace.id, user.id, {
                    title: "Bug Fixing Session"
                });
                await seedThread(client, agent.id, workspace.id, user.id, {
                    title: "Code Review Planning"
                });

                const result = await client.query(
                    `SELECT * FROM flowmaestro.threads
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     AND title ILIKE $2`,
                    [workspace.id, "%Planning%"]
                );

                expect(result.rows).toHaveLength(2);
            });
        });
    });

    // ========================================================================
    // ARCHIVE/UNARCHIVE
    // ========================================================================

    describe("archive", () => {
        it("should archive a thread", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id);

                await client.query(
                    `UPDATE flowmaestro.threads
                     SET status = 'archived', archived_at = NOW()
                     WHERE id = $1`,
                    [thread.id]
                );

                const result = await client.query(
                    "SELECT status, archived_at FROM flowmaestro.threads WHERE id = $1",
                    [thread.id]
                );

                expect(result.rows[0].status).toBe("archived");
                expect(result.rows[0].archived_at).toBeInstanceOf(Date);
            });
        });

        it("should unarchive a thread", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id, {
                    status: "archived"
                });

                await client.query(
                    "UPDATE flowmaestro.threads SET archived_at = NOW() WHERE id = $1",
                    [thread.id]
                );

                // Unarchive
                await client.query(
                    `UPDATE flowmaestro.threads
                     SET status = 'active', archived_at = NULL
                     WHERE id = $1`,
                    [thread.id]
                );

                const result = await client.query(
                    "SELECT status, archived_at FROM flowmaestro.threads WHERE id = $1",
                    [thread.id]
                );

                expect(result.rows[0].status).toBe("active");
                expect(result.rows[0].archived_at).toBeNull();
            });
        });
    });

    // ========================================================================
    // THREAD STATISTICS
    // ========================================================================

    describe("getStats", () => {
        it("should return message count", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const { thread } = await seedThreadWithMessages(
                    client,
                    agent.id,
                    workspace.id,
                    user.id,
                    10
                );

                const result = await client.query(
                    `SELECT COUNT(*) as message_count
                     FROM flowmaestro.agent_messages
                     WHERE thread_id = $1`,
                    [thread.id]
                );

                expect(parseInt(result.rows[0].message_count)).toBe(10);
            });
        });

        it("should return first and last message timestamps", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const { thread, messages: _messages } = await seedThreadWithMessages(
                    client,
                    agent.id,
                    workspace.id,
                    user.id,
                    5
                );

                const result = await client.query(
                    `SELECT
                         MIN(created_at) as first_message_at,
                         MAX(created_at) as last_message_at
                     FROM flowmaestro.agent_messages
                     WHERE thread_id = $1`,
                    [thread.id]
                );

                expect(result.rows[0].first_message_at).toBeInstanceOf(Date);
                expect(result.rows[0].last_message_at).toBeInstanceOf(Date);
                expect(result.rows[0].last_message_at.getTime()).toBeGreaterThanOrEqual(
                    result.rows[0].first_message_at.getTime()
                );
            });
        });
    });

    // ========================================================================
    // TITLE UPDATE
    // ========================================================================

    describe("updateTitle", () => {
        it("should update thread title", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id);

                await client.query("UPDATE flowmaestro.threads SET title = $2 WHERE id = $1", [
                    thread.id,
                    "New Thread Title"
                ]);

                const result = await client.query(
                    "SELECT title FROM flowmaestro.threads WHERE id = $1",
                    [thread.id]
                );

                expect(result.rows[0].title).toBe("New Thread Title");
            });
        });

        it("should allow null title", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id, {
                    title: "Initial Title"
                });

                await client.query("UPDATE flowmaestro.threads SET title = NULL WHERE id = $1", [
                    thread.id
                ]);

                const result = await client.query(
                    "SELECT title FROM flowmaestro.threads WHERE id = $1",
                    [thread.id]
                );

                expect(result.rows[0].title).toBeNull();
            });
        });
    });

    // ========================================================================
    // FIND MOST RECENT ACTIVE
    // ========================================================================

    describe("findMostRecentActive", () => {
        it("should return thread with most recent last_message_at", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);

                // Create threads with different last_message_at times
                const thread1 = await seedThread(client, agent.id, workspace.id, user.id);
                const thread2 = await seedThread(client, agent.id, workspace.id, user.id);
                const thread3 = await seedThread(client, agent.id, workspace.id, user.id);

                // Set last_message_at in ascending order
                await client.query(
                    "UPDATE flowmaestro.threads SET last_message_at = NOW() - INTERVAL '2 hours' WHERE id = $1",
                    [thread1.id]
                );
                await client.query(
                    "UPDATE flowmaestro.threads SET last_message_at = NOW() - INTERVAL '1 hour' WHERE id = $1",
                    [thread2.id]
                );
                await client.query(
                    "UPDATE flowmaestro.threads SET last_message_at = NOW() WHERE id = $1",
                    [thread3.id]
                );

                const result = await client.query(
                    `SELECT * FROM flowmaestro.threads
                     WHERE workspace_id = $1 AND agent_id = $2 AND status = 'active' AND deleted_at IS NULL
                     ORDER BY last_message_at DESC NULLS LAST
                     LIMIT 1`,
                    [workspace.id, agent.id]
                );

                expect(result.rows[0].id).toBe(thread3.id);
            });
        });

        it("should exclude archived threads", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);

                const activeThread = await seedThread(client, agent.id, workspace.id, user.id, {
                    status: "active"
                });
                const archivedThread = await seedThread(client, agent.id, workspace.id, user.id, {
                    status: "archived"
                });

                // Make archived thread have more recent last_message_at
                await client.query(
                    "UPDATE flowmaestro.threads SET last_message_at = NOW() - INTERVAL '1 hour' WHERE id = $1",
                    [activeThread.id]
                );
                await client.query(
                    "UPDATE flowmaestro.threads SET last_message_at = NOW() WHERE id = $1",
                    [archivedThread.id]
                );

                const result = await client.query(
                    `SELECT * FROM flowmaestro.threads
                     WHERE workspace_id = $1 AND agent_id = $2 AND status = 'active' AND deleted_at IS NULL
                     ORDER BY last_message_at DESC NULLS LAST
                     LIMIT 1`,
                    [workspace.id, agent.id]
                );

                expect(result.rows[0].id).toBe(activeThread.id);
            });
        });
    });

    // ========================================================================
    // DELETE OPERATIONS
    // ========================================================================

    describe("delete", () => {
        it("should soft delete a thread", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id);

                await client.query(
                    "UPDATE flowmaestro.threads SET status = 'deleted', deleted_at = NOW() WHERE id = $1",
                    [thread.id]
                );

                const result = await client.query(
                    "SELECT * FROM flowmaestro.threads WHERE id = $1 AND deleted_at IS NULL",
                    [thread.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });

        it("should hard delete thread and cascade to messages", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const { thread, messages } = await seedThreadWithMessages(
                    client,
                    agent.id,
                    workspace.id,
                    user.id,
                    5
                );

                expect(messages).toHaveLength(5);

                await client.query("DELETE FROM flowmaestro.threads WHERE id = $1", [thread.id]);

                const threadResult = await client.query(
                    "SELECT * FROM flowmaestro.threads WHERE id = $1",
                    [thread.id]
                );
                const messageResult = await client.query(
                    "SELECT * FROM flowmaestro.agent_messages WHERE thread_id = $1",
                    [thread.id]
                );

                expect(threadResult.rows).toHaveLength(0);
                expect(messageResult.rows).toHaveLength(0);
            });
        });
    });

    // ========================================================================
    // CONSTRAINT TESTS
    // ========================================================================

    describe("constraints", () => {
        it("should enforce agent_id foreign key constraint", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const nonExistentAgentId = "00000000-0000-0000-0000-000000000000";

                await expect(
                    client.query(
                        `INSERT INTO flowmaestro.threads (user_id, workspace_id, agent_id, status, metadata)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [user.id, workspace.id, nonExistentAgentId, "active", JSON.stringify({})]
                    )
                ).rejects.toThrow(/violates foreign key constraint/);
            });
        });

        it("should enforce valid status values", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);

                await expect(
                    client.query(
                        `INSERT INTO flowmaestro.threads (user_id, workspace_id, agent_id, status, metadata)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [user.id, workspace.id, agent.id, "invalid_status", JSON.stringify({})]
                    )
                ).rejects.toThrow();
            });
        });
    });
});
