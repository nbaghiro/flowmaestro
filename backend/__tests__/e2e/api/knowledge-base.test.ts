/**
 * Knowledge Base API E2E Tests
 *
 * Tests knowledge base management against a real PostgreSQL database
 * with pgvector extension using Testcontainers. Covers CRUD operations,
 * document management, vector search, and statistics.
 */

import {
    seedUser,
    seedWorkspace,
    seedKnowledgeBase,
    seedKnowledgeDocument
} from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("Knowledge Base API (Real PostgreSQL)", () => {
    // ========================================================================
    // CREATE KNOWLEDGE BASE
    // ========================================================================

    describe("create knowledge base", () => {
        it("should create knowledge base with config", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const kb = await seedKnowledgeBase(client, workspace.id, user.id, {
                    name: "Company Docs",
                    description: "Internal documentation",
                    config: {
                        embeddingModel: "text-embedding-3-small",
                        embeddingProvider: "openai",
                        embeddingDimensions: 1536,
                        chunkSize: 1000,
                        chunkOverlap: 200
                    }
                });

                expect(kb.id).toBeDefined();

                const result = await client.query(
                    `SELECT name, description, config
                     FROM flowmaestro.knowledge_bases WHERE id = $1`,
                    [kb.id]
                );

                expect(result.rows[0].name).toBe("Company Docs");
                expect(result.rows[0].config.embeddingModel).toBe("text-embedding-3-small");
            });
        });

        it("should set chunking configuration", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const kb = await seedKnowledgeBase(client, workspace.id, user.id, {
                    config: {
                        embeddingModel: "text-embedding-3-small",
                        embeddingProvider: "openai",
                        embeddingDimensions: 1536,
                        chunkStrategy: "semantic",
                        chunkSize: 500,
                        chunkOverlap: 50
                    }
                });

                const result = await client.query(
                    "SELECT config FROM flowmaestro.knowledge_bases WHERE id = $1",
                    [kb.id]
                );

                expect(result.rows[0].config.chunkStrategy).toBe("semantic");
                expect(result.rows[0].config.chunkSize).toBe(500);
            });
        });
    });

    // ========================================================================
    // UPLOAD DOCUMENT
    // ========================================================================

    describe("upload document", () => {
        it("should create document record", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                const doc = await seedKnowledgeDocument(client, kb.id, {
                    name: "User Guide.pdf",
                    file_type: "pdf",
                    file_size: 1024 * 1024
                });

                const result = await client.query(
                    `SELECT name, file_type, file_size, status
                     FROM flowmaestro.knowledge_documents WHERE id = $1`,
                    [doc.id]
                );

                expect(result.rows[0].name).toBe("User Guide.pdf");
                expect(result.rows[0].file_type).toBe("pdf");
                expect(parseInt(result.rows[0].file_size)).toBe(1048576);
            });
        });

        it("should track processing status", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                const doc = await seedKnowledgeDocument(client, kb.id, {
                    status: "pending"
                });

                // Simulate processing lifecycle
                await client.query(
                    `UPDATE flowmaestro.knowledge_documents
                     SET status = 'processing'
                     WHERE id = $1`,
                    [doc.id]
                );

                const processing = await client.query(
                    "SELECT status FROM flowmaestro.knowledge_documents WHERE id = $1",
                    [doc.id]
                );
                expect(processing.rows[0].status).toBe("processing");

                // Complete processing
                await client.query(
                    `UPDATE flowmaestro.knowledge_documents
                     SET status = 'ready'
                     WHERE id = $1`,
                    [doc.id]
                );

                const completed = await client.query(
                    "SELECT status FROM flowmaestro.knowledge_documents WHERE id = $1",
                    [doc.id]
                );
                expect(completed.rows[0].status).toBe("ready");
            });
        });

        it("should store file metadata", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                const doc = await seedKnowledgeDocument(client, kb.id, {
                    metadata: {
                        page_count: 25,
                        word_count: 15000,
                        author: "John Smith",
                        created_date: "2024-01-15"
                    }
                });

                const result = await client.query(
                    "SELECT metadata FROM flowmaestro.knowledge_documents WHERE id = $1",
                    [doc.id]
                );

                expect(result.rows[0].metadata.page_count).toBe(25);
                expect(result.rows[0].metadata.author).toBe("John Smith");
            });
        });
    });

    // ========================================================================
    // QUERY KNOWLEDGE BASE
    // ========================================================================

    describe("query knowledge base", () => {
        it("should perform vector similarity search", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);
                const doc = await seedKnowledgeDocument(client, kb.id, { status: "ready" });

                // Create chunks with embeddings
                const embedding1 = new Array(1536).fill(0.1);
                const embedding2 = new Array(1536).fill(0.2);

                await client.query(
                    `INSERT INTO flowmaestro.knowledge_chunks
                     (knowledge_base_id, document_id, content, chunk_index, embedding)
                     VALUES ($1, $2, 'About machine learning', 0, $3::vector)`,
                    [kb.id, doc.id, `[${embedding1.join(",")}]`]
                );

                await client.query(
                    `INSERT INTO flowmaestro.knowledge_chunks
                     (knowledge_base_id, document_id, content, chunk_index, embedding)
                     VALUES ($1, $2, 'About deep learning', 1, $3::vector)`,
                    [kb.id, doc.id, `[${embedding2.join(",")}]`]
                );

                // Search
                const queryVector = new Array(1536).fill(0.1);
                const result = await client.query(
                    `SELECT content, embedding <-> $2::vector as distance
                     FROM flowmaestro.knowledge_chunks
                     WHERE knowledge_base_id = $1
                     ORDER BY embedding <-> $2::vector
                     LIMIT 5`,
                    [kb.id, `[${queryVector.join(",")}]`]
                );

                expect(result.rows).toHaveLength(2);
                expect(result.rows[0].content).toBe("About machine learning");
            });
        });

        it("should filter search by document", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                const doc1 = await seedKnowledgeDocument(client, kb.id, { name: "Doc 1" });
                const doc2 = await seedKnowledgeDocument(client, kb.id, { name: "Doc 2" });

                const embedding = new Array(1536).fill(0.1);

                await client.query(
                    `INSERT INTO flowmaestro.knowledge_chunks
                     (knowledge_base_id, document_id, content, chunk_index, embedding)
                     VALUES ($1, $2, 'Content from doc 1', 0, $3::vector)`,
                    [kb.id, doc1.id, `[${embedding.join(",")}]`]
                );

                await client.query(
                    `INSERT INTO flowmaestro.knowledge_chunks
                     (knowledge_base_id, document_id, content, chunk_index, embedding)
                     VALUES ($1, $2, 'Content from doc 2', 0, $3::vector)`,
                    [kb.id, doc2.id, `[${embedding.join(",")}]`]
                );

                // Search only in doc1
                const result = await client.query(
                    `SELECT content FROM flowmaestro.knowledge_chunks
                     WHERE knowledge_base_id = $1 AND document_id = $2
                     ORDER BY embedding <-> $3::vector`,
                    [kb.id, doc1.id, `[${embedding.join(",")}]`]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].content).toBe("Content from doc 1");
            });
        });

        it("should return search results with context", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);
                const doc = await seedKnowledgeDocument(client, kb.id, {
                    name: "Important Guide.pdf"
                });

                const embedding = new Array(1536).fill(0.1);

                await client.query(
                    `INSERT INTO flowmaestro.knowledge_chunks
                     (knowledge_base_id, document_id, content, chunk_index, embedding, metadata)
                     VALUES ($1, $2, $3, $4, $5::vector, $6)`,
                    [
                        kb.id,
                        doc.id,
                        "This is the answer you're looking for.",
                        5,
                        `[${embedding.join(",")}]`,
                        JSON.stringify({ page: 12, section: "FAQ" })
                    ]
                );

                const result = await client.query(
                    `SELECT
                        c.content,
                        c.metadata as chunk_metadata,
                        c.chunk_index,
                        d.name as document_name,
                        c.embedding <-> $2::vector as score
                     FROM flowmaestro.knowledge_chunks c
                     JOIN flowmaestro.knowledge_documents d ON c.document_id = d.id
                     WHERE c.knowledge_base_id = $1
                     ORDER BY c.embedding <-> $2::vector
                     LIMIT 1`,
                    [kb.id, `[${embedding.join(",")}]`]
                );

                expect(result.rows[0].document_name).toBe("Important Guide.pdf");
                expect(result.rows[0].chunk_metadata.page).toBe(12);
                expect(result.rows[0].chunk_metadata.section).toBe("FAQ");
            });
        });
    });

    // ========================================================================
    // DELETE DOCUMENT
    // ========================================================================

    describe("delete document", () => {
        it("should cascade delete chunks", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);
                const doc = await seedKnowledgeDocument(client, kb.id);

                // Create chunks
                for (let i = 0; i < 5; i++) {
                    await client.query(
                        `INSERT INTO flowmaestro.knowledge_chunks
                         (knowledge_base_id, document_id, content, chunk_index)
                         VALUES ($1, $2, $3, $4)`,
                        [kb.id, doc.id, `Chunk ${i}`, i]
                    );
                }

                // Verify chunks exist
                let chunkCount = await client.query(
                    `SELECT COUNT(*) as count FROM flowmaestro.knowledge_chunks
                     WHERE document_id = $1`,
                    [doc.id]
                );
                expect(parseInt(chunkCount.rows[0].count)).toBe(5);

                // Delete document
                await client.query("DELETE FROM flowmaestro.knowledge_documents WHERE id = $1", [
                    doc.id
                ]);

                // Chunks should be deleted
                chunkCount = await client.query(
                    `SELECT COUNT(*) as count FROM flowmaestro.knowledge_chunks
                     WHERE document_id = $1`,
                    [doc.id]
                );
                expect(parseInt(chunkCount.rows[0].count)).toBe(0);
            });
        });

        it("should handle partial document deletion", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                const doc1 = await seedKnowledgeDocument(client, kb.id, { name: "Keep" });
                const doc2 = await seedKnowledgeDocument(client, kb.id, { name: "Delete" });

                // Create chunks in both
                await client.query(
                    `INSERT INTO flowmaestro.knowledge_chunks
                     (knowledge_base_id, document_id, content, chunk_index)
                     VALUES ($1, $2, 'Keep this', 0)`,
                    [kb.id, doc1.id]
                );
                await client.query(
                    `INSERT INTO flowmaestro.knowledge_chunks
                     (knowledge_base_id, document_id, content, chunk_index)
                     VALUES ($1, $2, 'Delete this', 0)`,
                    [kb.id, doc2.id]
                );

                // Delete only doc2
                await client.query("DELETE FROM flowmaestro.knowledge_documents WHERE id = $1", [
                    doc2.id
                ]);

                // doc1 chunks should remain
                const remaining = await client.query(
                    `SELECT content FROM flowmaestro.knowledge_chunks
                     WHERE knowledge_base_id = $1`,
                    [kb.id]
                );

                expect(remaining.rows).toHaveLength(1);
                expect(remaining.rows[0].content).toBe("Keep this");
            });
        });
    });

    // ========================================================================
    // GET STATISTICS
    // ========================================================================

    describe("get statistics", () => {
        it("should return document and chunk counts", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                // Create documents with chunks
                for (let d = 0; d < 3; d++) {
                    const doc = await seedKnowledgeDocument(client, kb.id, {
                        status: "ready"
                    });
                    for (let c = 0; c < 10; c++) {
                        await client.query(
                            `INSERT INTO flowmaestro.knowledge_chunks
                             (knowledge_base_id, document_id, content, chunk_index)
                             VALUES ($1, $2, $3, $4)`,
                            [kb.id, doc.id, `Chunk ${c}`, c]
                        );
                    }
                }

                const stats = await client.query(
                    `SELECT
                        (SELECT COUNT(*) FROM flowmaestro.knowledge_documents WHERE knowledge_base_id = $1) as document_count,
                        (SELECT COUNT(*) FROM flowmaestro.knowledge_chunks WHERE knowledge_base_id = $1) as chunk_count`,
                    [kb.id]
                );

                expect(parseInt(stats.rows[0].document_count)).toBe(3);
                expect(parseInt(stats.rows[0].chunk_count)).toBe(30);
            });
        });

        it("should calculate total storage size", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                await seedKnowledgeDocument(client, kb.id, { file_size: 1000000 }); // 1MB
                await seedKnowledgeDocument(client, kb.id, { file_size: 2000000 }); // 2MB
                await seedKnowledgeDocument(client, kb.id, { file_size: 500000 }); // 0.5MB

                const stats = await client.query(
                    `SELECT SUM(file_size) as total_size
                     FROM flowmaestro.knowledge_documents
                     WHERE knowledge_base_id = $1`,
                    [kb.id]
                );

                expect(parseInt(stats.rows[0].total_size)).toBe(3500000);
            });
        });

        it("should group documents by status", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                await seedKnowledgeDocument(client, kb.id, { status: "ready" });
                await seedKnowledgeDocument(client, kb.id, { status: "ready" });
                await seedKnowledgeDocument(client, kb.id, { status: "processing" });
                await seedKnowledgeDocument(client, kb.id, { status: "failed" });

                const stats = await client.query(
                    `SELECT status, COUNT(*) as count
                     FROM flowmaestro.knowledge_documents
                     WHERE knowledge_base_id = $1
                     GROUP BY status`,
                    [kb.id]
                );

                const statusMap: Record<string, number> = {};
                stats.rows.forEach((row) => {
                    statusMap[row.status] = parseInt(row.count);
                });

                expect(statusMap.ready).toBe(2);
                expect(statusMap.processing).toBe(1);
                expect(statusMap.failed).toBe(1);
            });
        });
    });

    // ========================================================================
    // UPDATE KNOWLEDGE BASE
    // ========================================================================

    describe("update knowledge base", () => {
        it("should update name and description", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id, {
                    name: "Original Name",
                    description: "Original description"
                });

                await client.query(
                    `UPDATE flowmaestro.knowledge_bases
                     SET name = $2, description = $3, updated_at = NOW()
                     WHERE id = $1`,
                    [kb.id, "Updated Name", "Updated description"]
                );

                const result = await client.query(
                    "SELECT name, description FROM flowmaestro.knowledge_bases WHERE id = $1",
                    [kb.id]
                );

                expect(result.rows[0].name).toBe("Updated Name");
                expect(result.rows[0].description).toBe("Updated description");
            });
        });

        it("should merge config updates", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id, {
                    config: {
                        embeddingModel: "text-embedding-ada-002",
                        embeddingDimensions: 1536,
                        chunkSize: 1000
                    }
                });

                await client.query(
                    `UPDATE flowmaestro.knowledge_bases
                     SET config = config || $2::jsonb
                     WHERE id = $1`,
                    [kb.id, JSON.stringify({ embeddingModel: "text-embedding-3-large" })]
                );

                const result = await client.query(
                    "SELECT config FROM flowmaestro.knowledge_bases WHERE id = $1",
                    [kb.id]
                );

                expect(result.rows[0].config.embeddingModel).toBe("text-embedding-3-large");
                expect(result.rows[0].config.embeddingDimensions).toBe(1536); // Preserved
            });
        });
    });

    // ========================================================================
    // DELETE KNOWLEDGE BASE
    // ========================================================================

    describe("delete knowledge base", () => {
        it("should cascade delete documents and chunks", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                const doc = await seedKnowledgeDocument(client, kb.id);

                for (let i = 0; i < 5; i++) {
                    await client.query(
                        `INSERT INTO flowmaestro.knowledge_chunks
                         (knowledge_base_id, document_id, content, chunk_index)
                         VALUES ($1, $2, $3, $4)`,
                        [kb.id, doc.id, `Chunk ${i}`, i]
                    );
                }

                // Delete knowledge base
                await client.query("DELETE FROM flowmaestro.knowledge_bases WHERE id = $1", [
                    kb.id
                ]);

                // Documents should be deleted
                const docCount = await client.query(
                    `SELECT COUNT(*) as count FROM flowmaestro.knowledge_documents
                     WHERE knowledge_base_id = $1`,
                    [kb.id]
                );
                expect(parseInt(docCount.rows[0].count)).toBe(0);

                // Chunks should be deleted
                const chunkCount = await client.query(
                    `SELECT COUNT(*) as count FROM flowmaestro.knowledge_chunks
                     WHERE knowledge_base_id = $1`,
                    [kb.id]
                );
                expect(parseInt(chunkCount.rows[0].count)).toBe(0);
            });
        });
    });

    // ========================================================================
    // WORKSPACE ISOLATION
    // ========================================================================

    describe("workspace isolation", () => {
        it("should scope knowledge bases to workspace", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace1 = await seedWorkspace(client, user.id, { name: "WS1" });
                const workspace2 = await seedWorkspace(client, user.id, { name: "WS2" });

                await seedKnowledgeBase(client, workspace1.id, user.id, { name: "KB in WS1" });
                await seedKnowledgeBase(client, workspace2.id, user.id, { name: "KB in WS2" });

                const result = await client.query(
                    `SELECT name FROM flowmaestro.knowledge_bases
                     WHERE workspace_id = $1`,
                    [workspace1.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("KB in WS1");
            });
        });

        it("should scope vector search to knowledge base", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const kb1 = await seedKnowledgeBase(client, workspace.id, user.id, {
                    name: "KB 1"
                });
                const kb2 = await seedKnowledgeBase(client, workspace.id, user.id, {
                    name: "KB 2"
                });

                const doc1 = await seedKnowledgeDocument(client, kb1.id);
                const doc2 = await seedKnowledgeDocument(client, kb2.id);

                const embedding = new Array(1536).fill(0.1);

                await client.query(
                    `INSERT INTO flowmaestro.knowledge_chunks
                     (knowledge_base_id, document_id, content, chunk_index, embedding)
                     VALUES ($1, $2, 'KB1 content', 0, $3::vector)`,
                    [kb1.id, doc1.id, `[${embedding.join(",")}]`]
                );

                await client.query(
                    `INSERT INTO flowmaestro.knowledge_chunks
                     (knowledge_base_id, document_id, content, chunk_index, embedding)
                     VALUES ($1, $2, 'KB2 content', 0, $3::vector)`,
                    [kb2.id, doc2.id, `[${embedding.join(",")}]`]
                );

                // Search only in KB1
                const result = await client.query(
                    `SELECT content FROM flowmaestro.knowledge_chunks
                     WHERE knowledge_base_id = $1
                     ORDER BY embedding <-> $2::vector`,
                    [kb1.id, `[${embedding.join(",")}]`]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].content).toBe("KB1 content");
            });
        });
    });
});
