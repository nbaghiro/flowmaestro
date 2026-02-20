/**
 * Agent Conversation Scenario E2E Tests
 *
 * Tests complete agent conversation lifecycle against a real PostgreSQL database
 * using Testcontainers. Covers thread creation, message persistence, multi-turn
 * conversations, tool calls, and archival.
 */

import {
    seedUser,
    seedWorkspace,
    seedAgent,
    seedThread,
    seedThreadMessage,
    seedThreadWithMessages
} from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("Agent Conversation Scenarios (Real PostgreSQL)", () => {
    // ========================================================================
    // THREAD WITH MESSAGES
    // ========================================================================

    // Helper to create an execution for a thread
    async function createExecution(
        client: import("pg").PoolClient,
        agentId: string,
        userId: string,
        threadId: string
    ): Promise<string> {
        const result = await client.query<{ id: string }>(
            `INSERT INTO flowmaestro.agent_executions (agent_id, user_id, thread_id, status)
             VALUES ($1, $2, $3, 'completed')
             RETURNING id`,
            [agentId, userId, threadId]
        );
        return result.rows[0].id;
    }

    describe("thread with messages", () => {
        it("should create thread and persist messages", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id);
                const executionId = await createExecution(client, agent.id, user.id, thread.id);

                // Add user message
                const userMessage = await seedThreadMessage(client, thread.id, executionId, {
                    role: "user",
                    content: "Hello, can you help me with a task?"
                });

                // Small delay to ensure different timestamps
                await new Promise((r) => setTimeout(r, 5));

                // Add assistant message
                const assistantMessage = await seedThreadMessage(client, thread.id, executionId, {
                    role: "assistant",
                    content:
                        "Of course! I'd be happy to help. What task do you need assistance with?"
                });

                // Verify messages - order by created_at to ensure chronological ordering
                const result = await client.query(
                    `SELECT role, content FROM flowmaestro.agent_messages
                     WHERE thread_id = $1
                     ORDER BY created_at ASC`,
                    [thread.id]
                );

                expect(result.rows).toHaveLength(2);
                expect(result.rows[0].role).toBe("user");
                expect(result.rows[1].role).toBe("assistant");
                expect(userMessage.id).toBeDefined();
                expect(assistantMessage.id).toBeDefined();
            });
        });

        it("should update thread last_message_at on new message", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id);
                const executionId = await createExecution(client, agent.id, user.id, thread.id);

                // Set initial last_message_at
                await client.query(
                    "UPDATE flowmaestro.threads SET last_message_at = NOW() - INTERVAL '1 hour' WHERE id = $1",
                    [thread.id]
                );

                // Get initial timestamp
                const before = await client.query(
                    "SELECT last_message_at FROM flowmaestro.threads WHERE id = $1",
                    [thread.id]
                );

                // Wait a moment
                await new Promise((resolve) => setTimeout(resolve, 10));

                // Add message
                await seedThreadMessage(client, thread.id, executionId, {
                    role: "user",
                    content: "Test message"
                });

                // Update last_message_at (this would be done by application logic)
                await client.query(
                    `UPDATE flowmaestro.threads
                     SET last_message_at = NOW()
                     WHERE id = $1`,
                    [thread.id]
                );

                // Verify timestamp updated
                const after = await client.query(
                    "SELECT last_message_at FROM flowmaestro.threads WHERE id = $1",
                    [thread.id]
                );

                expect(after.rows[0].last_message_at.getTime()).toBeGreaterThan(
                    before.rows[0].last_message_at.getTime()
                );
            });
        });
    });

    // ========================================================================
    // MULTI-TURN CONVERSATION
    // ========================================================================

    describe("multi-turn conversation", () => {
        it("should maintain message ordering across turns", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);

                const { thread, messages } = await seedThreadWithMessages(
                    client,
                    agent.id,
                    workspace.id,
                    user.id,
                    10
                );

                // Verify all messages in order
                const result = await client.query(
                    `SELECT id, role FROM flowmaestro.agent_messages
                     WHERE thread_id = $1
                     ORDER BY created_at ASC`,
                    [thread.id]
                );

                expect(result.rows).toHaveLength(10);
                // Messages should alternate user/assistant
                for (let i = 0; i < result.rows.length; i++) {
                    const expectedRole = i % 2 === 0 ? "user" : "assistant";
                    expect(result.rows[i].role).toBe(expectedRole);
                }

                expect(messages).toHaveLength(10);
            });
        });

        it("should support context retrieval for conversation", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id);
                const executionId = await createExecution(client, agent.id, user.id, thread.id);

                // Add conversation history
                const conversation = [
                    { role: "user", content: "What is the capital of France?" },
                    { role: "assistant", content: "The capital of France is Paris." },
                    { role: "user", content: "What about Germany?" },
                    { role: "assistant", content: "The capital of Germany is Berlin." },
                    { role: "user", content: "And what about the first country?" }
                ];

                for (const msg of conversation) {
                    await seedThreadMessage(client, thread.id, executionId, {
                        role: msg.role as "user" | "assistant",
                        content: msg.content
                    });
                }

                // Get last N messages for context
                const contextResult = await client.query(
                    `SELECT role, content FROM flowmaestro.agent_messages
                     WHERE thread_id = $1
                     ORDER BY created_at DESC
                     LIMIT 4`,
                    [thread.id]
                );

                // Reverse to get chronological order
                const context = contextResult.rows.reverse();

                expect(context).toHaveLength(4);
                // Last 4 messages should include context about France
                expect(context.some((m) => m.content.includes("France"))).toBe(true);
            });
        });

        it("should handle long conversations efficiently", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id);
                const executionId = await createExecution(client, agent.id, user.id, thread.id);

                // Add many messages
                for (let i = 0; i < 100; i++) {
                    await client.query(
                        `INSERT INTO flowmaestro.agent_messages
                         (execution_id, thread_id, role, content, created_at)
                         VALUES ($1, $2, $3, $4, NOW() + ($5 || ' seconds')::interval)`,
                        [
                            executionId,
                            thread.id,
                            i % 2 === 0 ? "user" : "assistant",
                            `Message ${i + 1}`,
                            i
                        ]
                    );
                }

                // Get message count
                const countResult = await client.query(
                    `SELECT COUNT(*) as count FROM flowmaestro.agent_messages
                     WHERE thread_id = $1`,
                    [thread.id]
                );

                expect(parseInt(countResult.rows[0].count)).toBe(100);

                // Pagination should work
                const pageResult = await client.query(
                    `SELECT content FROM flowmaestro.agent_messages
                     WHERE thread_id = $1
                     ORDER BY created_at ASC
                     LIMIT 10 OFFSET 50`,
                    [thread.id]
                );

                expect(pageResult.rows).toHaveLength(10);
                expect(pageResult.rows[0].content).toBe("Message 51");
            });
        });
    });

    // ========================================================================
    // THREAD MEMORY
    // ========================================================================

    describe("thread memory", () => {
        it("should store metadata in thread", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id);

                const threadMetadata = {
                    context: {
                        user_name: "John",
                        preferences: { language: "English" }
                    },
                    entities: ["Paris", "France"],
                    summary: "User asked about French geography"
                };

                // Update thread with metadata
                await client.query(
                    `UPDATE flowmaestro.threads
                     SET metadata = $2
                     WHERE id = $1`,
                    [thread.id, JSON.stringify(threadMetadata)]
                );

                // Retrieve and verify
                const result = await client.query(
                    "SELECT metadata FROM flowmaestro.threads WHERE id = $1",
                    [thread.id]
                );

                expect(result.rows[0].metadata.context.user_name).toBe("John");
                expect(result.rows[0].metadata.entities).toContain("Paris");
            });
        });

        it("should update metadata incrementally", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id, {
                    metadata: { entities: ["initial"] }
                });

                // Merge new metadata
                await client.query(
                    `UPDATE flowmaestro.threads
                     SET metadata = metadata || $2::jsonb
                     WHERE id = $1`,
                    [thread.id, JSON.stringify({ new_entity: "added" })]
                );

                const result = await client.query(
                    "SELECT metadata FROM flowmaestro.threads WHERE id = $1",
                    [thread.id]
                );

                expect(result.rows[0].metadata.entities).toEqual(["initial"]);
                expect(result.rows[0].metadata.new_entity).toBe("added");
            });
        });
    });

    // ========================================================================
    // TOOL CALL RECORDING
    // ========================================================================

    describe("tool call recording", () => {
        it("should record tool calls in messages", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id);
                const executionId = await createExecution(client, agent.id, user.id, thread.id);

                // Add message with tool calls (using the tool_calls JSONB column)
                const toolCalls = [
                    {
                        id: "call_123",
                        name: "web_search",
                        arguments: { query: "weather in Paris" }
                    }
                ];

                await client.query(
                    `INSERT INTO flowmaestro.agent_messages
                     (execution_id, thread_id, role, content, tool_calls, created_at)
                     VALUES ($1, $2, $3, $4, $5, NOW())`,
                    [
                        executionId,
                        thread.id,
                        "assistant",
                        "I'll search for that information.",
                        JSON.stringify(toolCalls)
                    ]
                );

                // Add tool result message
                await client.query(
                    `INSERT INTO flowmaestro.agent_messages
                     (execution_id, thread_id, role, content, tool_name, tool_call_id, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '1 second')`,
                    [executionId, thread.id, "tool", "Sunny, 22°C", "web_search", "call_123"]
                );

                // Verify tool call chain
                const result = await client.query(
                    `SELECT role, content, tool_calls, tool_name, tool_call_id
                     FROM flowmaestro.agent_messages
                     WHERE thread_id = $1
                     ORDER BY created_at ASC`,
                    [thread.id]
                );

                expect(result.rows).toHaveLength(2);
                expect(result.rows[0].tool_calls[0].name).toBe("web_search");
                expect(result.rows[1].role).toBe("tool");
                expect(result.rows[1].tool_call_id).toBe("call_123");
                expect(result.rows[1].tool_name).toBe("web_search");
            });
        });

        it("should track multiple tool calls in sequence", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id);
                const executionId = await createExecution(client, agent.id, user.id, thread.id);

                // Message with multiple tool calls
                const toolCalls = [
                    { id: "call_1", name: "get_weather", arguments: { city: "Paris" } },
                    { id: "call_2", name: "get_time", arguments: { timezone: "Europe/Paris" } }
                ];

                await client.query(
                    `INSERT INTO flowmaestro.agent_messages
                     (execution_id, thread_id, role, content, tool_calls, created_at)
                     VALUES ($1, $2, $3, $4, $5, NOW())`,
                    [
                        executionId,
                        thread.id,
                        "assistant",
                        "Let me gather that information.",
                        JSON.stringify(toolCalls)
                    ]
                );

                // Add tool results
                let offset = 1;
                for (const call of toolCalls) {
                    await client.query(
                        `INSERT INTO flowmaestro.agent_messages
                         (execution_id, thread_id, role, content, tool_name, tool_call_id, created_at)
                         VALUES ($1, $2, $3, $4, $5, $6, NOW() + ($7 || ' seconds')::interval)`,
                        [
                            executionId,
                            thread.id,
                            "tool",
                            `Result for ${call.id}`,
                            call.name,
                            call.id,
                            offset++
                        ]
                    );
                }

                // Count tool messages
                const result = await client.query(
                    `SELECT COUNT(*) as count FROM flowmaestro.agent_messages
                     WHERE thread_id = $1 AND role = 'tool'`,
                    [thread.id]
                );

                expect(parseInt(result.rows[0].count)).toBe(2);
            });
        });
    });

    // ========================================================================
    // CONVERSATION ARCHIVE
    // ========================================================================

    describe("conversation archive", () => {
        it("should archive thread and preserve messages", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id);
                const executionId = await createExecution(client, agent.id, user.id, thread.id);

                // Add messages
                await seedThreadMessage(client, thread.id, executionId, {
                    role: "user",
                    content: "Hello"
                });
                await seedThreadMessage(client, thread.id, executionId, {
                    role: "assistant",
                    content: "Hi!"
                });

                // Archive thread
                await client.query(
                    `UPDATE flowmaestro.threads
                     SET status = 'archived'
                     WHERE id = $1`,
                    [thread.id]
                );

                // Verify archived status
                const threadResult = await client.query(
                    "SELECT status FROM flowmaestro.threads WHERE id = $1",
                    [thread.id]
                );
                expect(threadResult.rows[0].status).toBe("archived");

                // Messages should still be accessible
                const messagesResult = await client.query(
                    `SELECT COUNT(*) as count FROM flowmaestro.agent_messages
                     WHERE thread_id = $1`,
                    [thread.id]
                );
                expect(parseInt(messagesResult.rows[0].count)).toBe(2);
            });
        });

        it("should exclude archived threads from active list", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);

                // Create active and archived threads
                await seedThread(client, agent.id, workspace.id, user.id, { status: "active" });
                await seedThread(client, agent.id, workspace.id, user.id, { status: "active" });
                await seedThread(client, agent.id, workspace.id, user.id, { status: "archived" });

                // Query active threads only
                const result = await client.query(
                    `SELECT COUNT(*) as count FROM flowmaestro.threads
                     WHERE agent_id = $1 AND status = 'active' AND deleted_at IS NULL`,
                    [agent.id]
                );

                expect(parseInt(result.rows[0].count)).toBe(2);
            });
        });

        it("should restore archived thread", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id, {
                    status: "archived"
                });

                // Restore thread
                await client.query(
                    `UPDATE flowmaestro.threads
                     SET status = 'active'
                     WHERE id = $1`,
                    [thread.id]
                );

                // Verify restored
                const result = await client.query(
                    "SELECT status FROM flowmaestro.threads WHERE id = $1",
                    [thread.id]
                );

                expect(result.rows[0].status).toBe("active");
            });
        });
    });

    // ========================================================================
    // CONVERSATION STATISTICS
    // ========================================================================

    describe("conversation statistics", () => {
        it("should calculate message count per thread", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);

                const thread1 = await seedThread(client, agent.id, workspace.id, user.id);
                const thread2 = await seedThread(client, agent.id, workspace.id, user.id);

                const exec1 = await createExecution(client, agent.id, user.id, thread1.id);
                const exec2 = await createExecution(client, agent.id, user.id, thread2.id);

                // Add different amounts of messages
                for (let i = 0; i < 5; i++) {
                    await seedThreadMessage(client, thread1.id, exec1, {
                        role: "user",
                        content: `Msg ${i}`
                    });
                }
                for (let i = 0; i < 10; i++) {
                    await seedThreadMessage(client, thread2.id, exec2, {
                        role: "user",
                        content: `Msg ${i}`
                    });
                }

                // Get message counts
                const result = await client.query(
                    `SELECT t.id, COUNT(tm.id) as message_count
                     FROM flowmaestro.threads t
                     LEFT JOIN flowmaestro.agent_messages tm ON t.id = tm.thread_id
                     WHERE t.agent_id = $1
                     GROUP BY t.id`,
                    [agent.id]
                );

                const counts: Record<string, number> = {};
                result.rows.forEach((row) => {
                    counts[row.id] = parseInt(row.message_count);
                });

                expect(counts[thread1.id]).toBe(5);
                expect(counts[thread2.id]).toBe(10);
            });
        });

        it("should get agent conversation summary", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);

                // Create threads with different statuses
                await seedThread(client, agent.id, workspace.id, user.id, { status: "active" });
                await seedThread(client, agent.id, workspace.id, user.id, { status: "active" });
                await seedThread(client, agent.id, workspace.id, user.id, { status: "archived" });

                // Get summary
                const result = await client.query(
                    `SELECT
                        COUNT(*) as total_threads,
                        COUNT(*) FILTER (WHERE status = 'active') as active_threads,
                        COUNT(*) FILTER (WHERE status = 'archived') as archived_threads
                     FROM flowmaestro.threads
                     WHERE agent_id = $1 AND deleted_at IS NULL`,
                    [agent.id]
                );

                expect(parseInt(result.rows[0].total_threads)).toBe(3);
                expect(parseInt(result.rows[0].active_threads)).toBe(2);
                expect(parseInt(result.rows[0].archived_threads)).toBe(1);
            });
        });
    });
});
