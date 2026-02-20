/**
 * Knowledge Base Scenario E2E Tests
 *
 * Tests complete knowledge base lifecycle against a real PostgreSQL database
 * with pgvector extension using Testcontainers. Covers document upload,
 * chunking, vector storage, semantic search, and deletion cascades.
 */

import {
    seedUser,
    seedWorkspace,
    seedKnowledgeBase,
    seedKnowledgeDocument,
    seedKnowledgeBaseWithDocuments
} from "../../fixtures/database-seeds";
import { withTransaction } from "../setup";

describe("Knowledge Base Scenarios (Real PostgreSQL)", () => {
    // ========================================================================
    // DOCUMENT UPLOAD
    // ========================================================================

    describe("document upload", () => {
        it("should create document with file metadata", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                const document = await seedKnowledgeDocument(client, kb.id, {
                    name: "Technical Guide.pdf",
                    file_type: "pdf",
                    file_size: 1024 * 1024 * 2, // 2MB
                    metadata: {
                        page_count: 50,
                        author: "John Doe",
                        created_date: "2024-01-15"
                    }
                });

                expect(document.id).toBeDefined();
                expect(document.name).toBe("Technical Guide.pdf");

                // Verify stored in database
                const result = await client.query(
                    `SELECT name, file_type, file_size, metadata
                     FROM flowmaestro.knowledge_documents
                     WHERE id = $1`,
                    [document.id]
                );

                expect(Number(result.rows[0].file_size)).toBe(2097152);
                expect(result.rows[0].metadata.page_count).toBe(50);
            });
        });

        it("should track document processing status", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                const document = await seedKnowledgeDocument(client, kb.id, {
                    name: "Processing Document.txt",
                    status: "pending"
                });

                // Simulate processing lifecycle
                const statuses = ["pending", "processing", "ready"];

                for (const status of statuses) {
                    await client.query(
                        `UPDATE flowmaestro.knowledge_documents
                         SET status = $2, updated_at = NOW()
                         WHERE id = $1`,
                        [document.id, status]
                    );

                    const result = await client.query(
                        "SELECT status FROM flowmaestro.knowledge_documents WHERE id = $1",
                        [document.id]
                    );

                    expect(result.rows[0].status).toBe(status);
                }
            });
        });

        it("should handle failed document processing", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                const document = await seedKnowledgeDocument(client, kb.id, {
                    status: "processing"
                });

                // Mark as failed with error
                await client.query(
                    `UPDATE flowmaestro.knowledge_documents
                     SET status = 'failed',
                         metadata = metadata || $2::jsonb
                     WHERE id = $1`,
                    [
                        document.id,
                        JSON.stringify({
                            error: {
                                code: "PARSING_ERROR",
                                message: "Failed to extract text from PDF"
                            }
                        })
                    ]
                );

                const result = await client.query(
                    "SELECT status, metadata FROM flowmaestro.knowledge_documents WHERE id = $1",
                    [document.id]
                );

                expect(result.rows[0].status).toBe("failed");
                expect(result.rows[0].metadata.error.code).toBe("PARSING_ERROR");
            });
        });
    });

    // ========================================================================
    // CHUNK CREATION
    // ========================================================================

    describe("chunk creation", () => {
        it("should create chunks from document", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);
                const document = await seedKnowledgeDocument(client, kb.id);

                // Create chunks
                const chunks = [
                    { content: "First section of the document...", index: 0 },
                    { content: "Second section continues here...", index: 1 },
                    { content: "Final section wraps up...", index: 2 }
                ];

                for (const chunk of chunks) {
                    await client.query(
                        `INSERT INTO flowmaestro.knowledge_chunks
                         (knowledge_base_id, document_id, content, chunk_index, metadata)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [
                            kb.id,
                            document.id,
                            chunk.content,
                            chunk.index,
                            JSON.stringify({ char_count: chunk.content.length })
                        ]
                    );
                }

                // Verify chunks
                const result = await client.query(
                    `SELECT content, chunk_index FROM flowmaestro.knowledge_chunks
                     WHERE document_id = $1
                     ORDER BY chunk_index ASC`,
                    [document.id]
                );

                expect(result.rows).toHaveLength(3);
                expect(result.rows[0].chunk_index).toBe(0);
                expect(result.rows[2].chunk_index).toBe(2);
            });
        });

        it("should store chunk with position metadata", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);
                const document = await seedKnowledgeDocument(client, kb.id, {
                    metadata: { page_count: 10 }
                });

                // Create chunk with position info
                await client.query(
                    `INSERT INTO flowmaestro.knowledge_chunks
                     (knowledge_base_id, document_id, content, chunk_index, metadata)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [
                        kb.id,
                        document.id,
                        "Chunk content from page 3...",
                        0,
                        JSON.stringify({
                            page_number: 3,
                            start_char: 1500,
                            end_char: 2000,
                            section: "Chapter 2"
                        })
                    ]
                );

                const result = await client.query(
                    `SELECT metadata FROM flowmaestro.knowledge_chunks
                     WHERE document_id = $1`,
                    [document.id]
                );

                expect(result.rows[0].metadata.page_number).toBe(3);
                expect(result.rows[0].metadata.section).toBe("Chapter 2");
            });
        });
    });

    // ========================================================================
    // VECTOR STORAGE
    // ========================================================================

    describe("vector storage", () => {
        it("should store embedding vectors for chunks", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id, {
                    embedding_config: { model: "text-embedding-3-small", dimensions: 1536 }
                });
                const document = await seedKnowledgeDocument(client, kb.id);

                // Create chunk with embedding
                // Generate a test embedding (1536 dimensions for OpenAI)
                const embedding = new Array(1536).fill(0).map(() => Math.random() - 0.5);

                await client.query(
                    `INSERT INTO flowmaestro.knowledge_chunks
                     (knowledge_base_id, document_id, content, chunk_index, embedding)
                     VALUES ($1, $2, $3, $4, $5::vector)`,
                    [
                        kb.id,
                        document.id,
                        "Test content for embedding",
                        0,
                        `[${embedding.join(",")}]`
                    ]
                );

                // Verify embedding stored
                const result = await client.query(
                    `SELECT embedding IS NOT NULL as has_embedding,
                            vector_dims(embedding) as dimensions
                     FROM flowmaestro.knowledge_chunks
                     WHERE document_id = $1`,
                    [document.id]
                );

                expect(result.rows[0].has_embedding).toBe(true);
                expect(result.rows[0].dimensions).toBe(1536);
            });
        });

        it("should batch store embeddings for multiple chunks", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);
                const document = await seedKnowledgeDocument(client, kb.id);

                // Create multiple chunks with embeddings
                const chunkCount = 5;
                for (let i = 0; i < chunkCount; i++) {
                    const embedding = new Array(1536).fill(0).map(() => Math.random() - 0.5);
                    await client.query(
                        `INSERT INTO flowmaestro.knowledge_chunks
                         (knowledge_base_id, document_id, content, chunk_index, embedding)
                         VALUES ($1, $2, $3, $4, $5::vector)`,
                        [kb.id, document.id, `Chunk ${i} content`, i, `[${embedding.join(",")}]`]
                    );
                }

                // Verify all embeddings stored
                const result = await client.query(
                    `SELECT COUNT(*) as count,
                            COUNT(embedding) as embedded_count
                     FROM flowmaestro.knowledge_chunks
                     WHERE document_id = $1`,
                    [document.id]
                );

                expect(parseInt(result.rows[0].count)).toBe(5);
                expect(parseInt(result.rows[0].embedded_count)).toBe(5);
            });
        });
    });

    // ========================================================================
    // SEMANTIC SEARCH
    // ========================================================================

    describe("semantic search", () => {
        it("should find similar chunks by vector distance", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);
                const document = await seedKnowledgeDocument(client, kb.id);

                // Create chunks with different embeddings
                // Similar vectors (close to each other)
                const baseVector = new Array(1536).fill(0.1);
                const similarVector = new Array(1536).fill(0.11);
                // Different vector
                const differentVector = new Array(1536).fill(-0.5);

                await client.query(
                    `INSERT INTO flowmaestro.knowledge_chunks
                     (knowledge_base_id, document_id, content, chunk_index, embedding)
                     VALUES ($1, $2, 'Similar content 1', 0, $3::vector)`,
                    [kb.id, document.id, `[${baseVector.join(",")}]`]
                );

                await client.query(
                    `INSERT INTO flowmaestro.knowledge_chunks
                     (knowledge_base_id, document_id, content, chunk_index, embedding)
                     VALUES ($1, $2, 'Similar content 2', 1, $3::vector)`,
                    [kb.id, document.id, `[${similarVector.join(",")}]`]
                );

                await client.query(
                    `INSERT INTO flowmaestro.knowledge_chunks
                     (knowledge_base_id, document_id, content, chunk_index, embedding)
                     VALUES ($1, $2, 'Different content', 2, $3::vector)`,
                    [kb.id, document.id, `[${differentVector.join(",")}]`]
                );

                // Search with query vector similar to base
                const queryVector = new Array(1536).fill(0.1);

                const result = await client.query(
                    `SELECT content, embedding <-> $2::vector as distance
                     FROM flowmaestro.knowledge_chunks
                     WHERE knowledge_base_id = $1
                     ORDER BY embedding <-> $2::vector
                     LIMIT 2`,
                    [kb.id, `[${queryVector.join(",")}]`]
                );

                expect(result.rows).toHaveLength(2);
                // First result should be most similar
                expect(result.rows[0].content).toBe("Similar content 1");
                // Distance should be low for similar vectors
                expect(result.rows[0].distance).toBeLessThan(1);
            });
        });

        it("should filter search by knowledge base", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                // Create two knowledge bases
                const kb1 = await seedKnowledgeBase(client, workspace.id, user.id, {
                    name: "KB 1"
                });
                const kb2 = await seedKnowledgeBase(client, workspace.id, user.id, {
                    name: "KB 2"
                });

                const doc1 = await seedKnowledgeDocument(client, kb1.id);
                const doc2 = await seedKnowledgeDocument(client, kb2.id);

                const embedding = new Array(1536).fill(0.1);

                // Add chunks to both KBs
                await client.query(
                    `INSERT INTO flowmaestro.knowledge_chunks
                     (knowledge_base_id, document_id, content, chunk_index, embedding)
                     VALUES ($1, $2, 'KB1 Content', 0, $3::vector)`,
                    [kb1.id, doc1.id, `[${embedding.join(",")}]`]
                );

                await client.query(
                    `INSERT INTO flowmaestro.knowledge_chunks
                     (knowledge_base_id, document_id, content, chunk_index, embedding)
                     VALUES ($1, $2, 'KB2 Content', 0, $3::vector)`,
                    [kb2.id, doc2.id, `[${embedding.join(",")}]`]
                );

                // Search only in KB1
                const result = await client.query(
                    `SELECT content FROM flowmaestro.knowledge_chunks
                     WHERE knowledge_base_id = $1
                     ORDER BY embedding <-> $2::vector
                     LIMIT 10`,
                    [kb1.id, `[${embedding.join(",")}]`]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].content).toBe("KB1 Content");
            });
        });

        it("should return search results with metadata", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);
                const document = await seedKnowledgeDocument(client, kb.id, {
                    name: "Source Document.pdf"
                });

                const embedding = new Array(1536).fill(0.1);

                await client.query(
                    `INSERT INTO flowmaestro.knowledge_chunks
                     (knowledge_base_id, document_id, content, chunk_index, embedding, metadata)
                     VALUES ($1, $2, $3, $4, $5::vector, $6)`,
                    [
                        kb.id,
                        document.id,
                        "Important content here",
                        0,
                        `[${embedding.join(",")}]`,
                        JSON.stringify({ page: 5, section: "Introduction" })
                    ]
                );

                // Search with full context
                const result = await client.query(
                    `SELECT
                        c.content,
                        c.metadata as chunk_metadata,
                        d.name as document_name,
                        c.embedding <-> $2::vector as score
                     FROM flowmaestro.knowledge_chunks c
                     JOIN flowmaestro.knowledge_documents d ON c.document_id = d.id
                     WHERE c.knowledge_base_id = $1
                     ORDER BY c.embedding <-> $2::vector
                     LIMIT 1`,
                    [kb.id, `[${embedding.join(",")}]`]
                );

                expect(result.rows[0].document_name).toBe("Source Document.pdf");
                expect(result.rows[0].chunk_metadata.page).toBe(5);
            });
        });
    });

    // ========================================================================
    // DOCUMENT DELETION
    // ========================================================================

    describe("document deletion", () => {
        it("should cascade delete chunks when document deleted", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);
                const document = await seedKnowledgeDocument(client, kb.id);

                // Add chunks
                for (let i = 0; i < 5; i++) {
                    await client.query(
                        `INSERT INTO flowmaestro.knowledge_chunks
                         (knowledge_base_id, document_id, content, chunk_index)
                         VALUES ($1, $2, $3, $4)`,
                        [kb.id, document.id, `Chunk ${i}`, i]
                    );
                }

                // Verify chunks exist
                let chunkCount = await client.query(
                    `SELECT COUNT(*) as count FROM flowmaestro.knowledge_chunks
                     WHERE document_id = $1`,
                    [document.id]
                );
                expect(parseInt(chunkCount.rows[0].count)).toBe(5);

                // Delete document
                await client.query("DELETE FROM flowmaestro.knowledge_documents WHERE id = $1", [
                    document.id
                ]);

                // Chunks should be deleted (cascade)
                chunkCount = await client.query(
                    `SELECT COUNT(*) as count FROM flowmaestro.knowledge_chunks
                     WHERE document_id = $1`,
                    [document.id]
                );
                expect(parseInt(chunkCount.rows[0].count)).toBe(0);
            });
        });

        it("should cascade delete documents when knowledge base deleted", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);

                const { knowledgeBase, documents } = await seedKnowledgeBaseWithDocuments(
                    client,
                    workspace.id,
                    user.id,
                    3
                );

                // Verify documents exist
                let docCount = await client.query(
                    `SELECT COUNT(*) as count FROM flowmaestro.knowledge_documents
                     WHERE knowledge_base_id = $1`,
                    [knowledgeBase.id]
                );
                expect(parseInt(docCount.rows[0].count)).toBe(3);
                expect(documents).toHaveLength(3);

                // Delete knowledge base
                await client.query("DELETE FROM flowmaestro.knowledge_bases WHERE id = $1", [
                    knowledgeBase.id
                ]);

                // Documents should be deleted (cascade)
                docCount = await client.query(
                    `SELECT COUNT(*) as count FROM flowmaestro.knowledge_documents
                     WHERE knowledge_base_id = $1`,
                    [knowledgeBase.id]
                );
                expect(parseInt(docCount.rows[0].count)).toBe(0);
            });
        });
    });

    // ========================================================================
    // KNOWLEDGE BASE STATISTICS
    // ========================================================================

    describe("knowledge base statistics", () => {
        it("should calculate document and chunk counts", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                // Add documents with chunks
                for (let d = 0; d < 3; d++) {
                    const doc = await seedKnowledgeDocument(client, kb.id, {
                        status: "ready"
                    });
                    for (let c = 0; c < 5; c++) {
                        await client.query(
                            `INSERT INTO flowmaestro.knowledge_chunks
                             (knowledge_base_id, document_id, content, chunk_index)
                             VALUES ($1, $2, $3, $4)`,
                            [kb.id, doc.id, `Doc ${d} Chunk ${c}`, c]
                        );
                    }
                }

                // Get statistics
                const result = await client.query(
                    `SELECT
                        (SELECT COUNT(*) FROM flowmaestro.knowledge_documents WHERE knowledge_base_id = $1) as document_count,
                        (SELECT COUNT(*) FROM flowmaestro.knowledge_chunks WHERE knowledge_base_id = $1) as chunk_count`,
                    [kb.id]
                );

                expect(parseInt(result.rows[0].document_count)).toBe(3);
                expect(parseInt(result.rows[0].chunk_count)).toBe(15);
            });
        });

        it("should calculate total storage size", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                // Add documents with sizes
                await seedKnowledgeDocument(client, kb.id, { file_size: 1024 * 1024 }); // 1MB
                await seedKnowledgeDocument(client, kb.id, { file_size: 2 * 1024 * 1024 }); // 2MB
                await seedKnowledgeDocument(client, kb.id, { file_size: 512 * 1024 }); // 512KB

                // Calculate total size
                const result = await client.query(
                    `SELECT SUM(file_size) as total_size
                     FROM flowmaestro.knowledge_documents
                     WHERE knowledge_base_id = $1`,
                    [kb.id]
                );

                const totalSizeMB = parseInt(result.rows[0].total_size) / (1024 * 1024);
                expect(totalSizeMB).toBeCloseTo(3.5, 1);
            });
        });

        it("should track documents by status", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace = await seedWorkspace(client, user.id);
                const kb = await seedKnowledgeBase(client, workspace.id, user.id);

                // Add documents with different statuses
                await seedKnowledgeDocument(client, kb.id, { status: "ready" });
                await seedKnowledgeDocument(client, kb.id, { status: "ready" });
                await seedKnowledgeDocument(client, kb.id, { status: "processing" });
                await seedKnowledgeDocument(client, kb.id, { status: "failed" });

                // Get status breakdown
                const result = await client.query(
                    `SELECT status, COUNT(*) as count
                     FROM flowmaestro.knowledge_documents
                     WHERE knowledge_base_id = $1
                     GROUP BY status`,
                    [kb.id]
                );

                const statusCounts: Record<string, number> = {};
                result.rows.forEach((row) => {
                    statusCounts[row.status] = parseInt(row.count);
                });

                expect(statusCounts.ready).toBe(2);
                expect(statusCounts.processing).toBe(1);
                expect(statusCounts.failed).toBe(1);
            });
        });
    });

    // ========================================================================
    // WORKSPACE ISOLATION
    // ========================================================================

    describe("workspace isolation", () => {
        it("should not return knowledge bases from other workspaces", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace1 = await seedWorkspace(client, user.id, { name: "WS 1" });
                const workspace2 = await seedWorkspace(client, user.id, { name: "WS 2" });

                await seedKnowledgeBase(client, workspace1.id, user.id, { name: "KB in WS1" });
                await seedKnowledgeBase(client, workspace2.id, user.id, { name: "KB in WS2" });

                // Query for workspace1 only
                const result = await client.query(
                    `SELECT name FROM flowmaestro.knowledge_bases
                     WHERE workspace_id = $1`,
                    [workspace1.id]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].name).toBe("KB in WS1");
            });
        });

        it("should scope vector search to workspace", async () => {
            await withTransaction(async (client) => {
                const user = await seedUser(client);
                const workspace1 = await seedWorkspace(client, user.id);
                const workspace2 = await seedWorkspace(client, user.id);

                const kb1 = await seedKnowledgeBase(client, workspace1.id, user.id);
                const kb2 = await seedKnowledgeBase(client, workspace2.id, user.id);

                const doc1 = await seedKnowledgeDocument(client, kb1.id);
                const doc2 = await seedKnowledgeDocument(client, kb2.id);

                const embedding = new Array(1536).fill(0.1);

                // Add similar chunks to both KBs
                await client.query(
                    `INSERT INTO flowmaestro.knowledge_chunks
                     (knowledge_base_id, document_id, content, chunk_index, embedding)
                     VALUES ($1, $2, 'WS1 Content', 0, $3::vector)`,
                    [kb1.id, doc1.id, `[${embedding.join(",")}]`]
                );

                await client.query(
                    `INSERT INTO flowmaestro.knowledge_chunks
                     (knowledge_base_id, document_id, content, chunk_index, embedding)
                     VALUES ($1, $2, 'WS2 Content', 0, $3::vector)`,
                    [kb2.id, doc2.id, `[${embedding.join(",")}]`]
                );

                // Search scoped to workspace1
                const result = await client.query(
                    `SELECT c.content
                     FROM flowmaestro.knowledge_chunks c
                     JOIN flowmaestro.knowledge_bases kb ON c.knowledge_base_id = kb.id
                     WHERE kb.workspace_id = $1
                     ORDER BY c.embedding <-> $2::vector
                     LIMIT 10`,
                    [workspace1.id, `[${embedding.join(",")}]`]
                );

                expect(result.rows).toHaveLength(1);
                expect(result.rows[0].content).toBe("WS1 Content");
            });
        });
    });
});
