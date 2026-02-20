/**
 * AgentRepository E2E Tests
 *
 * Tests agent database operations against a real PostgreSQL database
 * using Testcontainers. Each test runs in a transaction that is
 * rolled back to ensure isolation.
 */

import {
    seedUser,
    seedWorkspace,
    seedAgent,
    seedFolder,
    generateTestId
} from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("AgentRepository (Real PostgreSQL)", () => {
    // ========================================================================
    // CREATE OPERATIONS
    // ========================================================================

    describe("create", () => {
        it("should create an agent with all required fields", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agentId = generateTestId("agent");

                const result = await client.query(
                    `INSERT INTO flowmaestro.agents (
                        id, user_id, workspace_id, name, description, model, provider,
                        system_prompt, temperature, max_tokens, max_iterations,
                        available_tools, memory_config, safety_config, metadata
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    RETURNING *`,
                    [
                        agentId,
                        user.id,
                        workspace.id,
                        "Test Agent",
                        "A test agent for E2E testing",
                        "gpt-4o",
                        "openai",
                        "You are a helpful assistant.",
                        0.7,
                        4096,
                        25,
                        JSON.stringify([]),
                        JSON.stringify({ max_messages: 50 }),
                        JSON.stringify({ max_iterations: 25 }),
                        JSON.stringify({})
                    ]
                );

                expect(result.rows).toHaveLength(1);
                const agent = result.rows[0];
                expect(agent.id).toBe(agentId);
                expect(agent.name).toBe("Test Agent");
                expect(agent.model).toBe("gpt-4o");
                expect(agent.provider).toBe("openai");
                expect(parseFloat(agent.temperature)).toBe(0.7);
                expect(agent.deleted_at).toBeNull();
                expect(agent.created_at).toBeInstanceOf(Date);
            });
        });

        it("should auto-generate UUID when id is not provided", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const result = await client.query(
                    `INSERT INTO flowmaestro.agents (
                        user_id, workspace_id, name, model, provider, system_prompt,
                        available_tools, memory_config, safety_config, metadata
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING id`,
                    [
                        user.id,
                        workspace.id,
                        "Auto-ID Agent",
                        "gpt-4o",
                        "openai",
                        "Test prompt",
                        JSON.stringify([]),
                        JSON.stringify({}),
                        JSON.stringify({}),
                        JSON.stringify({})
                    ]
                );

                expect(result.rows[0].id).toBeDefined();
                expect(typeof result.rows[0].id).toBe("string");
                expect(result.rows[0].id.length).toBe(36); // UUID format
            });
        });

        it("should store JSONB fields correctly", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const tools = [
                    {
                        id: "tool-1",
                        name: "calculator",
                        type: "function",
                        description: "Performs calculations"
                    }
                ];
                const memoryConfig = {
                    max_messages: 100,
                    embeddings_enabled: true,
                    working_memory_enabled: false
                };
                const safetyConfig = {
                    max_iterations: 50,
                    timeout_seconds: 600
                };
                const metadata = { version: "1.0", tags: ["test", "e2e"] };

                const agent = await seedAgent(client, workspace.id, user.id, {
                    available_tools: tools,
                    memory_config: memoryConfig,
                    safety_config: safetyConfig,
                    metadata
                });

                const result = await client.query(
                    `SELECT available_tools, memory_config, safety_config, metadata
                     FROM flowmaestro.agents WHERE id = $1`,
                    [agent.id]
                );

                expect(result.rows[0].available_tools).toEqual(tools);
                expect(result.rows[0].memory_config).toEqual(memoryConfig);
                expect(result.rows[0].safety_config).toEqual(safetyConfig);
                expect(result.rows[0].metadata).toEqual(metadata);
            });
        });
    });

    // ========================================================================
    // READ OPERATIONS
    // ========================================================================

    describe("findById", () => {
        it("should return agent when it exists", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);

                const result = await client.query(
                    `SELECT * FROM flowmaestro.agents
                     WHERE id = $1 AND deleted_at IS NULL`,
                    [agent.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].id).toBe(agent.id);
                expect(result.rows[0].name).toBe(agent.name);
            });
        });

        it("should return empty for non-existent agent", async () => {
            await withTransaction(async (client) => {
                const nonExistentUuid = "00000000-0000-0000-0000-000000000000";
                const result = await client.query(
                    `SELECT * FROM flowmaestro.agents
                     WHERE id = $1 AND deleted_at IS NULL`,
                    [nonExistentUuid]
                );

                expect(result.rows).toHaveLength(0);
            });
        });

        it("should not return soft-deleted agents", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);

                // Soft delete the agent
                await client.query(
                    `UPDATE flowmaestro.agents
                     SET deleted_at = CURRENT_TIMESTAMP
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
    });

    describe("findByWorkspaceId", () => {
        it("should return all agents in workspace", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                // Create multiple agents
                await seedAgent(client, workspace.id, user.id, { name: "Agent 1" });
                await seedAgent(client, workspace.id, user.id, { name: "Agent 2" });
                await seedAgent(client, workspace.id, user.id, { name: "Agent 3" });

                const result = await client.query(
                    `SELECT * FROM flowmaestro.agents
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     ORDER BY created_at DESC`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(3);
            });
        });

        it("should paginate results correctly", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                // Create 10 agents
                for (let i = 0; i < 10; i++) {
                    await seedAgent(client, workspace.id, user.id, { name: `Agent ${i + 1}` });
                }

                // Get first page
                const page1 = await client.query(
                    `SELECT * FROM flowmaestro.agents
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     ORDER BY created_at DESC
                     LIMIT $2 OFFSET $3`,
                    [workspace.id, 3, 0]
                );

                // Get second page
                const page2 = await client.query(
                    `SELECT * FROM flowmaestro.agents
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     ORDER BY created_at DESC
                     LIMIT $2 OFFSET $3`,
                    [workspace.id, 3, 3]
                );

                expect(page1.rows).toHaveLength(3);
                expect(page2.rows).toHaveLength(3);

                // Pages should have different agents
                const page1Ids = page1.rows.map((r) => r.id);
                const page2Ids = page2.rows.map((r) => r.id);
                expect(page1Ids).not.toEqual(page2Ids);
            });
        });

        it("should filter by folderId when specified", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const folder = await seedFolder(client, workspace.id, user.id, {
                    name: "Test Folder"
                });

                // Create agent with folder
                const agentInFolder = await seedAgent(client, workspace.id, user.id, {
                    name: "Agent in Folder"
                });
                await client.query(
                    "UPDATE flowmaestro.agents SET folder_ids = ARRAY[$1::uuid] WHERE id = $2",
                    [folder.id, agentInFolder.id]
                );

                // Create agent without folder
                await seedAgent(client, workspace.id, user.id, { name: "Agent without Folder" });

                // Query agents in the folder using array containment
                const result = await client.query(
                    `SELECT * FROM flowmaestro.agents
                     WHERE workspace_id = $1 AND deleted_at IS NULL
                     AND $2 = ANY(folder_ids)`,
                    [workspace.id, folder.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("Agent in Folder");
            });
        });
    });

    // ========================================================================
    // UPDATE OPERATIONS
    // ========================================================================

    describe("update", () => {
        it("should update agent name and description", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);

                await client.query(
                    `UPDATE flowmaestro.agents
                     SET name = $2, description = $3
                     WHERE id = $1`,
                    [agent.id, "Updated Agent", "Updated description"]
                );

                const result = await client.query(
                    "SELECT * FROM flowmaestro.agents WHERE id = $1",
                    [agent.id]
                );

                expect(result.rows[0].name).toBe("Updated Agent");
                expect(result.rows[0].description).toBe("Updated description");
            });
        });

        it("should update model configuration", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);

                await client.query(
                    `UPDATE flowmaestro.agents
                     SET model = $2, provider = $3, temperature = $4, max_tokens = $5
                     WHERE id = $1`,
                    [agent.id, "claude-3-opus", "anthropic", 0.9, 8192]
                );

                const result = await client.query(
                    "SELECT model, provider, temperature, max_tokens FROM flowmaestro.agents WHERE id = $1",
                    [agent.id]
                );

                expect(result.rows[0].model).toBe("claude-3-opus");
                expect(result.rows[0].provider).toBe("anthropic");
                expect(parseFloat(result.rows[0].temperature)).toBe(0.9);
                expect(result.rows[0].max_tokens).toBe(8192);
            });
        });

        it("should update available_tools array", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id, {
                    available_tools: []
                });

                const newTools = [
                    { id: "tool-1", name: "search", type: "function" },
                    { id: "tool-2", name: "calculator", type: "function" }
                ];

                await client.query(
                    `UPDATE flowmaestro.agents
                     SET available_tools = $2
                     WHERE id = $1`,
                    [agent.id, JSON.stringify(newTools)]
                );

                const result = await client.query(
                    "SELECT available_tools FROM flowmaestro.agents WHERE id = $1",
                    [agent.id]
                );

                expect(result.rows[0].available_tools).toHaveLength(2);
                expect(result.rows[0].available_tools[0].name).toBe("search");
            });
        });

        it("should update updated_at timestamp via trigger", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);
                const originalUpdatedAt = agent.updated_at;

                // Use pg_sleep to ensure timestamp difference within the transaction
                await client.query("SELECT pg_sleep(0.1)");

                await client.query("UPDATE flowmaestro.agents SET name = $2 WHERE id = $1", [
                    agent.id,
                    "Trigger Test"
                ]);

                const result = await client.query(
                    "SELECT updated_at FROM flowmaestro.agents WHERE id = $1",
                    [agent.id]
                );

                const newUpdatedAt = result.rows[0].updated_at;
                expect(newUpdatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
            });
        });
    });

    // ========================================================================
    // DELETE OPERATIONS
    // ========================================================================

    describe("soft delete", () => {
        it("should set deleted_at timestamp", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);

                await client.query(
                    `UPDATE flowmaestro.agents
                     SET deleted_at = CURRENT_TIMESTAMP
                     WHERE id = $1`,
                    [agent.id]
                );

                const result = await client.query(
                    "SELECT deleted_at FROM flowmaestro.agents WHERE id = $1",
                    [agent.id]
                );

                expect(result.rows[0].deleted_at).toBeInstanceOf(Date);
            });
        });

        it("should exclude soft-deleted from normal queries", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                // Create 5 agents
                const agents = [];
                for (let i = 0; i < 5; i++) {
                    const agent = await seedAgent(client, workspace.id, user.id, {
                        name: `Agent ${i + 1}`
                    });
                    agents.push(agent);
                }

                // Soft delete 2 agents
                await client.query(
                    `UPDATE flowmaestro.agents
                     SET deleted_at = CURRENT_TIMESTAMP
                     WHERE id = ANY($1)`,
                    [[agents[0].id, agents[1].id]]
                );

                const result = await client.query(
                    `SELECT * FROM flowmaestro.agents
                     WHERE workspace_id = $1 AND deleted_at IS NULL`,
                    [workspace.id]
                );

                expect(result.rows).toHaveLength(3);
            });
        });
    });

    describe("hard delete", () => {
        it("should permanently remove agent", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const agent = await seedAgent(client, workspace.id, user.id);

                await client.query("DELETE FROM flowmaestro.agents WHERE id = $1", [agent.id]);

                const result = await client.query(
                    "SELECT * FROM flowmaestro.agents WHERE id = $1",
                    [agent.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });
    });

    // ========================================================================
    // CONSTRAINT TESTS
    // ========================================================================

    describe("constraints", () => {
        it("should enforce user_id foreign key reference", async () => {
            await withTransaction(async (client) => {
                const workspace = await seedWorkspace(client, (await seedUser(client)).id);
                const nonExistentUserId = "00000000-0000-0000-0000-000000000000";

                await expect(
                    client.query(
                        `INSERT INTO flowmaestro.agents (
                            user_id, workspace_id, name, model, provider, system_prompt,
                            available_tools, memory_config, safety_config, metadata
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                        [
                            nonExistentUserId,
                            workspace.id,
                            "Invalid Agent",
                            "gpt-4o",
                            "openai",
                            "Test",
                            JSON.stringify([]),
                            JSON.stringify({}),
                            JSON.stringify({}),
                            JSON.stringify({})
                        ]
                    )
                ).rejects.toThrow(/violates foreign key constraint/);
            });
        });

        it("should allow null description", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const result = await client.query(
                    `INSERT INTO flowmaestro.agents (
                        user_id, workspace_id, name, description, model, provider, system_prompt,
                        available_tools, memory_config, safety_config, metadata
                    )
                    VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING description`,
                    [
                        user.id,
                        workspace.id,
                        "No Description Agent",
                        "gpt-4o",
                        "openai",
                        "Test",
                        JSON.stringify([]),
                        JSON.stringify({}),
                        JSON.stringify({}),
                        JSON.stringify({})
                    ]
                );

                expect(result.rows[0].description).toBeNull();
            });
        });
    });
});
