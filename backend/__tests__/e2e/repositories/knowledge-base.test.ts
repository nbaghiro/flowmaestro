/**
 * KnowledgeBaseRepository E2E Tests
 *
 * Tests knowledge base database operations against a real PostgreSQL database
 * using Testcontainers. Each test runs in a transaction that is
 * rolled back to ensure isolation.
 */

import {
    seedUser,
    seedWorkspace,
    seedKnowledgeBase,
    seedKnowledgeDocument,
    seedKnowledgeBaseWithDocuments,
    seedFolder,
    generateTestId
} from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("KnowledgeBaseRepository (Real PostgreSQL)", () => {
    // ========================================================================
    // CREATE OPERATIONS
    // ========================================================================

    describe("create", () => {
        it("should create a knowledge base with all fields", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kbId = generateTestId("kb");

                const config = {
                    embeddingModel: "text-embedding-3-small",
                    embeddingProvider: "openai",
                    chunkSize: 1000,
                    chunkOverlap: 200,
                    embeddingDimensions: 1536
                };

                const result = await client.query(
                    `INSERT INTO flowmaestro.knowledge_bases (
                        id, user_id, workspace_id, name, description, category, config
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *`,
                    [
                        kbId,
                        user.id,
                        workspace.id,
                        "Test Knowledge Base",
                        "A test KB for E2E testing",
                        "documentation",
                        JSON.stringify(config)
                    ]
                );

                expect(result.rows).toHaveLength(1);
                const kb = result.rows[0];
                expect(kb.id).toBe(kbId);
                expect(kb.name).toBe("Test Knowledge Base");
                expect(kb.description).toBe("A test KB for E2E testing");
                expect(kb.category).toBe("documentation");
                expect(kb.config).toEqual(config);
            });
        });

        it("should create with default embedding config", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const result = await client.query(
                    `INSERT INTO flowmaestro.knowledge_bases (user_id, workspace_id, name)
                     VALUES ($1, $2, $3)
                     RETURNING config`,
                    [user.id, workspace.id, "Default Config KB"]
                );

                const config = result.rows[0].config;
                expect(config.embeddingModel).toBe("text-embedding-3-small");
                expect(config.embeddingProvider).toBe("openai");
                expect(config.chunkSize).toBe(1000);
                expect(config.chunkOverlap).toBe(200);
            });
        });
    });

    // ========================================================================
    // READ OPERATIONS
    // ========================================================================

    describe("findById", () => {
        it("should return knowledge base when it exists", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                const result = await client.query(
                    "SELECT * FROM flowmaestro.knowledge_bases WHERE id = $1",
                    [kb.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].id).toBe(kb.id);
                expect(result.rows[0].name).toBe(kb.name);
            });
        });

        it("should return empty for non-existent knowledge base", async () => {
            await withTransaction(async (client) => {
                const nonExistentUuid = "00000000-0000-0000-0000-000000000000";
                const result = await client.query(
                    "SELECT * FROM flowmaestro.knowledge_bases WHERE id = $1",
                    [nonExistentUuid]
                );

                expect(result.rows).toHaveLength(0);
            });
        });
    });

    describe("findByWorkspaceId", () => {
        it("should return all knowledge bases in workspace", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                await seedKnowledgeBase(client, workspace.id, user.id, { name: "KB 1" });
                await seedKnowledgeBase(client, workspace.id, user.id, { name: "KB 2" });
                await seedKnowledgeBase(client, workspace.id, user.id, { name: "KB 3" });

                const result = await client.query(
                    `SELECT * FROM flowmaestro.knowledge_bases
                     WHERE workspace_id = $1
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

                for (let i = 0; i < 10; i++) {
                    await seedKnowledgeBase(client, workspace.id, user.id, { name: `KB ${i + 1}` });
                }

                const page1 = await client.query(
                    `SELECT * FROM flowmaestro.knowledge_bases
                     WHERE workspace_id = $1
                     ORDER BY created_at DESC
                     LIMIT $2 OFFSET $3`,
                    [workspace.id, 3, 0]
                );

                const page2 = await client.query(
                    `SELECT * FROM flowmaestro.knowledge_bases
                     WHERE workspace_id = $1
                     ORDER BY created_at DESC
                     LIMIT $2 OFFSET $3`,
                    [workspace.id, 3, 3]
                );

                expect(page1.rows).toHaveLength(3);
                expect(page2.rows).toHaveLength(3);

                const page1Ids = page1.rows.map((r) => r.id);
                const page2Ids = page2.rows.map((r) => r.id);
                expect(page1Ids).not.toEqual(page2Ids);
            });
        });

        it("should filter by folderId", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const folder = await seedFolder(client, workspace.id, user.id);

                const kbInFolder = await seedKnowledgeBase(client, workspace.id, user.id, {
                    name: "KB in Folder"
                });
                await client.query(
                    "UPDATE flowmaestro.knowledge_bases SET folder_ids = ARRAY[$1::uuid] WHERE id = $2",
                    [folder.id, kbInFolder.id]
                );

                await seedKnowledgeBase(client, workspace.id, user.id, {
                    name: "KB without Folder"
                });

                const result = await client.query(
                    `SELECT * FROM flowmaestro.knowledge_bases
                     WHERE workspace_id = $1 AND $2 = ANY(folder_ids)`,
                    [workspace.id, folder.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("KB in Folder");
            });
        });
    });

    // ========================================================================
    // STATISTICS
    // ========================================================================

    describe("getStats", () => {
        it("should return document and chunk counts", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const { knowledgeBase, documents } = await seedKnowledgeBaseWithDocuments(
                    client,
                    workspace.id,
                    user.id,
                    5
                );

                // Create chunks for each document
                for (const doc of documents) {
                    for (let i = 0; i < 3; i++) {
                        await client.query(
                            `INSERT INTO flowmaestro.knowledge_chunks (
                                document_id, knowledge_base_id, chunk_index, content, token_count
                            )
                            VALUES ($1, $2, $3, $4, $5)`,
                            [doc.id, knowledgeBase.id, i, `Chunk ${i} content`, 100]
                        );
                    }
                }

                const docCount = await client.query(
                    "SELECT COUNT(*) as count FROM flowmaestro.knowledge_documents WHERE knowledge_base_id = $1",
                    [knowledgeBase.id]
                );

                const chunkCount = await client.query(
                    "SELECT COUNT(*) as count FROM flowmaestro.knowledge_chunks WHERE knowledge_base_id = $1",
                    [knowledgeBase.id]
                );

                expect(parseInt(docCount.rows[0].count)).toBe(5);
                expect(parseInt(chunkCount.rows[0].count)).toBe(15); // 5 docs * 3 chunks
            });
        });

        it("should return total size in bytes", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                await seedKnowledgeDocument(client, kb.id, { file_size: 1000 });
                await seedKnowledgeDocument(client, kb.id, { file_size: 2000 });
                await seedKnowledgeDocument(client, kb.id, { file_size: 3000 });

                const result = await client.query(
                    `SELECT COALESCE(SUM(file_size), 0) as total_size
                     FROM flowmaestro.knowledge_documents
                     WHERE knowledge_base_id = $1`,
                    [kb.id]
                );

                expect(parseInt(result.rows[0].total_size)).toBe(6000);
            });
        });
    });

    // ========================================================================
    // UPDATE OPERATIONS
    // ========================================================================

    describe("update", () => {
        it("should update knowledge base name and description", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                await client.query(
                    `UPDATE flowmaestro.knowledge_bases
                     SET name = $2, description = $3
                     WHERE id = $1`,
                    [kb.id, "Updated KB", "Updated description"]
                );

                const result = await client.query(
                    "SELECT name, description FROM flowmaestro.knowledge_bases WHERE id = $1",
                    [kb.id]
                );

                expect(result.rows[0].name).toBe("Updated KB");
                expect(result.rows[0].description).toBe("Updated description");
            });
        });

        it("should update embedding configuration", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                const newConfig = {
                    embeddingModel: "text-embedding-3-large",
                    embeddingProvider: "openai",
                    chunkSize: 2000,
                    chunkOverlap: 400,
                    embeddingDimensions: 3072
                };

                await client.query(
                    "UPDATE flowmaestro.knowledge_bases SET config = $2 WHERE id = $1",
                    [kb.id, JSON.stringify(newConfig)]
                );

                const result = await client.query(
                    "SELECT config FROM flowmaestro.knowledge_bases WHERE id = $1",
                    [kb.id]
                );

                expect(result.rows[0].config).toEqual(newConfig);
            });
        });

        it("should merge partial config updates", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                // Update only chunkSize using JSONB merge
                await client.query(
                    `UPDATE flowmaestro.knowledge_bases
                     SET config = config || '{"chunkSize": 1500}'::jsonb
                     WHERE id = $1`,
                    [kb.id]
                );

                const result = await client.query(
                    "SELECT config FROM flowmaestro.knowledge_bases WHERE id = $1",
                    [kb.id]
                );

                expect(result.rows[0].config.chunkSize).toBe(1500);
                // Other config values should be preserved
                expect(result.rows[0].config.embeddingModel).toBe("text-embedding-3-small");
            });
        });
    });

    // ========================================================================
    // DELETE OPERATIONS
    // ========================================================================

    describe("delete", () => {
        it("should delete knowledge base", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                await client.query("DELETE FROM flowmaestro.knowledge_bases WHERE id = $1", [
                    kb.id
                ]);

                const result = await client.query(
                    "SELECT * FROM flowmaestro.knowledge_bases WHERE id = $1",
                    [kb.id]
                );

                expect(result.rows).toHaveLength(0);
            });
        });

        it("should cascade delete documents and chunks", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);
                const doc = await seedKnowledgeDocument(client, kb.id);

                // Create chunks
                await client.query(
                    `INSERT INTO flowmaestro.knowledge_chunks (
                        document_id, knowledge_base_id, chunk_index, content
                    )
                    VALUES ($1, $2, $3, $4)`,
                    [doc.id, kb.id, 0, "Test chunk"]
                );

                // Verify data exists
                const beforeDocs = await client.query(
                    "SELECT COUNT(*) as count FROM flowmaestro.knowledge_documents WHERE knowledge_base_id = $1",
                    [kb.id]
                );
                const beforeChunks = await client.query(
                    "SELECT COUNT(*) as count FROM flowmaestro.knowledge_chunks WHERE knowledge_base_id = $1",
                    [kb.id]
                );

                expect(parseInt(beforeDocs.rows[0].count)).toBe(1);
                expect(parseInt(beforeChunks.rows[0].count)).toBe(1);

                // Delete knowledge base
                await client.query("DELETE FROM flowmaestro.knowledge_bases WHERE id = $1", [
                    kb.id
                ]);

                // Verify cascade delete
                const afterDocs = await client.query(
                    "SELECT COUNT(*) as count FROM flowmaestro.knowledge_documents WHERE knowledge_base_id = $1",
                    [kb.id]
                );
                const afterChunks = await client.query(
                    "SELECT COUNT(*) as count FROM flowmaestro.knowledge_chunks WHERE knowledge_base_id = $1",
                    [kb.id]
                );

                expect(parseInt(afterDocs.rows[0].count)).toBe(0);
                expect(parseInt(afterChunks.rows[0].count)).toBe(0);
            });
        });
    });

    // ========================================================================
    // WORKSPACE ISOLATION
    // ========================================================================

    describe("workspace isolation", () => {
        it("should only return knowledge bases from the specified workspace", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace1 = await seedWorkspace(client, user.id, { name: "Workspace 1" });
                const workspace2 = await seedWorkspace(client, user.id, { name: "Workspace 2" });

                await seedKnowledgeBase(client, workspace1.id, user.id, { name: "KB in WS1" });
                await seedKnowledgeBase(client, workspace2.id, user.id, { name: "KB in WS2" });

                const ws1Result = await client.query(
                    "SELECT * FROM flowmaestro.knowledge_bases WHERE workspace_id = $1",
                    [workspace1.id]
                );

                const ws2Result = await client.query(
                    "SELECT * FROM flowmaestro.knowledge_bases WHERE workspace_id = $1",
                    [workspace2.id]
                );

                expect(ws1Result.rows).toHaveLength(1);
                expect(ws1Result.rows[0].name).toBe("KB in WS1");
                expect(ws2Result.rows).toHaveLength(1);
                expect(ws2Result.rows[0].name).toBe("KB in WS2");
            });
        });
    });

    // ========================================================================
    // CONSTRAINT TESTS
    // ========================================================================

    describe("constraints", () => {
        it("should enforce user_id foreign key constraint", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const nonExistentUserId = "00000000-0000-0000-0000-000000000000";

                await expect(
                    client.query(
                        `INSERT INTO flowmaestro.knowledge_bases (user_id, workspace_id, name)
                         VALUES ($1, $2, $3)`,
                        [nonExistentUserId, workspace.id, "Invalid KB"]
                    )
                ).rejects.toThrow(/violates foreign key constraint/);
            });
        });

        it("should allow null description and category", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const result = await client.query(
                    `INSERT INTO flowmaestro.knowledge_bases (user_id, workspace_id, name, description, category)
                     VALUES ($1, $2, $3, NULL, NULL)
                     RETURNING description, category`,
                    [user.id, workspace.id, "Minimal KB"]
                );

                expect(result.rows[0].description).toBeNull();
                expect(result.rows[0].category).toBeNull();
            });
        });
    });
});
