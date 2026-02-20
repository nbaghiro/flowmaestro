/**
 * Agent API E2E Tests
 *
 * Tests agent management against a real PostgreSQL database
 * using Testcontainers. Covers CRUD operations, tool configuration,
 * memory settings, and execution history.
 */

import {
    seedUser,
    seedWorkspace,
    seedAgent,
    seedThread,
    seedThreadMessage
} from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("Agent API (Real PostgreSQL)", () => {
    // ========================================================================
    // CREATE AGENT
    // ========================================================================

    describe("create agent", () => {
        it("should create agent with config", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const agent = await seedAgent(client, workspace.id, user.id, {
                    name: "Support Agent",
                    model: "gpt-4",
                    provider: "openai",
                    system_prompt: "You are a helpful customer support agent."
                });

                expect(agent.id).toBeDefined();

                const result = await client.query(
                    `SELECT name, model, provider, system_prompt
                     FROM flowmaestro.agents WHERE id = $1`,
                    [agent.id]
                );

                expect(result.rows[0].name).toBe("Support Agent");
                expect(result.rows[0].model).toBe("gpt-4");
                expect(result.rows[0].system_prompt).toContain("customer support");
            });
        });

        it("should store temperature and max_tokens", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const agent = await seedAgent(client, workspace.id, user.id, {
                    temperature: 0.7,
                    max_tokens: 2000
                });

                const result = await client.query(
                    `SELECT temperature, max_tokens
                     FROM flowmaestro.agents WHERE id = $1`,
                    [agent.id]
                );

                expect(parseFloat(result.rows[0].temperature)).toBeCloseTo(0.7);
                expect(result.rows[0].max_tokens).toBe(2000);
            });
        });

        it("should set safety configuration", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const safetyConfig = {
                    max_iterations: 20,
                    timeout_seconds: 300,
                    content_filters: ["pii", "offensive"]
                };

                const agent = await seedAgent(client, workspace.id, user.id, {
                    safety_config: safetyConfig
                });

                const result = await client.query(
                    "SELECT safety_config FROM flowmaestro.agents WHERE id = $1",
                    [agent.id]
                );

                expect(result.rows[0].safety_config.max_iterations).toBe(20);
                expect(result.rows[0].safety_config.content_filters).toContain("pii");
            });
        });
    });

    // ========================================================================
    // ADD TOOLS
    // ========================================================================

    describe("add tools", () => {
        it("should store tool configuration", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const tools = [
                    {
                        name: "web_search",
                        description: "Search the web",
                        parameters: { query: { type: "string" } }
                    },
                    {
                        name: "calculator",
                        description: "Perform calculations",
                        parameters: { expression: { type: "string" } }
                    }
                ];

                const agent = await seedAgent(client, workspace.id, user.id, {
                    available_tools: tools
                });

                const result = await client.query(
                    "SELECT available_tools FROM flowmaestro.agents WHERE id = $1",
                    [agent.id]
                );

                expect(result.rows[0].available_tools).toHaveLength(2);
                expect(result.rows[0].available_tools[0].name).toBe("web_search");
            });
        });

        it("should update tool list", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const agent = await seedAgent(client, workspace.id, user.id, {
                    available_tools: [{ name: "tool1" }]
                });

                // Add new tool
                await client.query(
                    `UPDATE flowmaestro.agents
                     SET available_tools = available_tools || $2::jsonb
                     WHERE id = $1`,
                    [agent.id, JSON.stringify([{ name: "tool2" }])]
                );

                const result = await client.query(
                    "SELECT available_tools FROM flowmaestro.agents WHERE id = $1",
                    [agent.id]
                );

                expect(result.rows[0].available_tools).toHaveLength(2);
            });
        });

        it("should remove tool from list", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const agent = await seedAgent(client, workspace.id, user.id, {
                    available_tools: [{ name: "keep" }, { name: "remove" }]
                });

                // Replace with filtered list
                await client.query(
                    `UPDATE flowmaestro.agents
                     SET available_tools = $2
                     WHERE id = $1`,
                    [agent.id, JSON.stringify([{ name: "keep" }])]
                );

                const result = await client.query(
                    "SELECT available_tools FROM flowmaestro.agents WHERE id = $1",
                    [agent.id]
                );

                expect(result.rows[0].available_tools).toHaveLength(1);
                expect(result.rows[0].available_tools[0].name).toBe("keep");
            });
        });
    });

    // ========================================================================
    // UPDATE MEMORY CONFIG
    // ========================================================================

    describe("update memory config", () => {
        it("should set memory type and parameters", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const memoryConfig = {
                    type: "buffer",
                    max_messages: 50,
                    include_system: true
                };

                const agent = await seedAgent(client, workspace.id, user.id, {
                    memory_config: memoryConfig
                });

                const result = await client.query(
                    "SELECT memory_config FROM flowmaestro.agents WHERE id = $1",
                    [agent.id]
                );

                expect(result.rows[0].memory_config.type).toBe("buffer");
                expect(result.rows[0].memory_config.max_messages).toBe(50);
            });
        });

        it("should merge memory config updates", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const agent = await seedAgent(client, workspace.id, user.id, {
                    memory_config: { type: "buffer", max_messages: 20 }
                });

                // Update max_messages only
                await client.query(
                    `UPDATE flowmaestro.agents
                     SET memory_config = memory_config || $2::jsonb
                     WHERE id = $1`,
                    [agent.id, JSON.stringify({ max_messages: 100 })]
                );

                const result = await client.query(
                    "SELECT memory_config FROM flowmaestro.agents WHERE id = $1",
                    [agent.id]
                );

                expect(result.rows[0].memory_config.type).toBe("buffer"); // Preserved
                expect(result.rows[0].memory_config.max_messages).toBe(100); // Updated
            });
        });
    });

    // ========================================================================
    // LIST THREADS
    // ========================================================================

    describe("list threads", () => {
        it("should list active threads for agent", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);

                // Create threads
                await seedThread(client, agent.id, workspace.id, user.id, { status: "active" });
                await seedThread(client, agent.id, workspace.id, user.id, { status: "active" });
                await seedThread(client, agent.id, workspace.id, user.id, { status: "archived" });

                const result = await client.query(
                    `SELECT * FROM flowmaestro.threads
                     WHERE agent_id = $1 AND status = 'active' AND deleted_at IS NULL`,
                    [agent.id]
                );

                expect(result.rows).toHaveLength(2);
            });
        });

        it("should get thread with message count", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id);

                // Create an execution for the thread
                const execResult = await client.query(
                    `INSERT INTO flowmaestro.agent_executions
                     (agent_id, user_id, thread_id, status)
                     VALUES ($1, $2, $3, $4)
                     RETURNING id`,
                    [agent.id, user.id, thread.id, "completed"]
                );
                const executionId = execResult.rows[0].id;

                // Add messages to the execution/thread
                for (let i = 0; i < 10; i++) {
                    await client.query(
                        `INSERT INTO flowmaestro.agent_messages
                         (execution_id, thread_id, role, content)
                         VALUES ($1, $2, $3, $4)`,
                        [executionId, thread.id, i % 2 === 0 ? "user" : "assistant", `Message ${i}`]
                    );
                }

                const result = await client.query(
                    `SELECT t.*, COUNT(am.id) as message_count
                     FROM flowmaestro.threads t
                     LEFT JOIN flowmaestro.agent_messages am ON t.id = am.thread_id
                     WHERE t.id = $1
                     GROUP BY t.id`,
                    [thread.id]
                );

                expect(parseInt(result.rows[0].message_count)).toBe(10);
            });
        });
    });

    // ========================================================================
    // DELETE AGENT
    // ========================================================================

    describe("delete agent", () => {
        it("should soft delete agent", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);

                await client.query(
                    `UPDATE flowmaestro.agents
                     SET deleted_at = NOW()
                     WHERE id = $1`,
                    [agent.id]
                );

                const result = await client.query(
                    `SELECT * FROM flowmaestro.agents
                     WHERE id = $1 AND deleted_at IS NULL`,
                    [agent.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });

        it("should preserve threads on soft delete", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id);

                // Soft delete agent
                await client.query(
                    `UPDATE flowmaestro.agents
                     SET deleted_at = NOW()
                     WHERE id = $1`,
                    [agent.id]
                );

                // Thread should still exist
                const result = await client.query(
                    "SELECT * FROM flowmaestro.threads WHERE id = $1",
                    [thread.id]
                );

                expect(result.rows).toHaveLength(1);
            });
        });
    });

    // ========================================================================
    // AGENT STATISTICS
    // ========================================================================

    describe("agent statistics", () => {
        it("should calculate thread and message counts", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);

                // Create threads with executions and messages
                const thread1 = await seedThread(client, agent.id, workspace.id, user.id);
                const thread2 = await seedThread(client, agent.id, workspace.id, user.id);

                // Create executions for each thread
                const exec1Result = await client.query(
                    "INSERT INTO flowmaestro.agent_executions (agent_id, user_id, thread_id, status) VALUES ($1, $2, $3, 'completed') RETURNING id",
                    [agent.id, user.id, thread1.id]
                );
                const exec2Result = await client.query(
                    "INSERT INTO flowmaestro.agent_executions (agent_id, user_id, thread_id, status) VALUES ($1, $2, $3, 'completed') RETURNING id",
                    [agent.id, user.id, thread2.id]
                );

                for (let i = 0; i < 5; i++) {
                    await seedThreadMessage(client, thread1.id, exec1Result.rows[0].id, {
                        role: "user",
                        content: `Msg ${i}`
                    });
                }
                for (let i = 0; i < 3; i++) {
                    await seedThreadMessage(client, thread2.id, exec2Result.rows[0].id, {
                        role: "user",
                        content: `Msg ${i}`
                    });
                }

                const stats = await client.query(
                    `SELECT
                        (SELECT COUNT(*) FROM flowmaestro.threads WHERE agent_id = $1 AND deleted_at IS NULL) as thread_count,
                        (SELECT COUNT(*) FROM flowmaestro.agent_messages am
                         JOIN flowmaestro.threads t ON am.thread_id = t.id
                         WHERE t.agent_id = $1) as total_messages`,
                    [agent.id]
                );

                expect(parseInt(stats.rows[0].thread_count)).toBe(2);
                expect(parseInt(stats.rows[0].total_messages)).toBe(8);
            });
        });

        it("should track last active timestamp", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const thread = await seedThread(client, agent.id, workspace.id, user.id);

                // Create execution for thread
                const execResult = await client.query(
                    "INSERT INTO flowmaestro.agent_executions (agent_id, user_id, thread_id, status) VALUES ($1, $2, $3, 'completed') RETURNING id",
                    [agent.id, user.id, thread.id]
                );

                // Add message
                await seedThreadMessage(client, thread.id, execResult.rows[0].id, {
                    role: "user",
                    content: "Hello"
                });

                // Update timestamp (simulating agent activity via metadata)
                await client.query(
                    `UPDATE flowmaestro.agents
                     SET metadata = metadata || $2::jsonb
                     WHERE id = $1`,
                    [agent.id, JSON.stringify({ last_active_at: new Date().toISOString() })]
                );

                const result = await client.query(
                    "SELECT metadata FROM flowmaestro.agents WHERE id = $1",
                    [agent.id]
                );

                expect(result.rows[0].metadata.last_active_at).not.toBeNull();
            });
        });
    });

    // ========================================================================
    // AGENT DUPLICATION
    // ========================================================================

    describe("agent duplication", () => {
        it("should create copy of agent with new name", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const original = await seedAgent(client, workspace.id, user.id, {
                    name: "Original Agent",
                    model: "gpt-4",
                    system_prompt: "You are helpful.",
                    available_tools: [{ name: "search" }],
                    memory_config: { type: "buffer", max_messages: 50 }
                });

                // Get original config
                const origConfig = await client.query(
                    `SELECT model, provider, system_prompt, available_tools, memory_config
                     FROM flowmaestro.agents WHERE id = $1`,
                    [original.id]
                );

                // Create copy
                const copyResult = await client.query(
                    `INSERT INTO flowmaestro.agents
                     (workspace_id, user_id, name, model, provider, system_prompt, available_tools, memory_config)
                     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
                     RETURNING id`,
                    [
                        workspace.id,
                        user.id,
                        "Original Agent (Copy)",
                        origConfig.rows[0].model,
                        origConfig.rows[0].provider,
                        origConfig.rows[0].system_prompt,
                        JSON.stringify(origConfig.rows[0].available_tools),
                        JSON.stringify(origConfig.rows[0].memory_config)
                    ]
                );

                const copy = await client.query("SELECT * FROM flowmaestro.agents WHERE id = $1", [
                    copyResult.rows[0].id
                ]);

                expect(copy.rows[0].name).toBe("Original Agent (Copy)");
                expect(copy.rows[0].model).toBe("gpt-4");
                expect(copy.rows[0].available_tools[0].name).toBe("search");
            });
        });
    });

    // ========================================================================
    // WORKSPACE SCOPING
    // ========================================================================

    describe("workspace scoping", () => {
        it("should only list agents in workspace", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace1 = await seedWorkspace(client, user.id, { name: "WS1" });
                const workspace2 = await seedWorkspace(client, user.id, { name: "WS2" });

                await seedAgent(client, workspace1.id, user.id, { name: "Agent WS1" });
                await seedAgent(client, workspace2.id, user.id, { name: "Agent WS2" });

                const result = await client.query(
                    `SELECT name FROM flowmaestro.agents
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace1.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("Agent WS1");
            });
        });
    });
});
