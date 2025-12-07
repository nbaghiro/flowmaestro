# Phase 17: Knowledge Base Core

## Overview

Implement 3 core knowledge base nodes: Search KB, Add to KB, and KB Chat.

---

## Prerequisites

- **Phase 09**: Core AI nodes (for KB Chat responses)

---

## Existing Infrastructure

### Embeddings Executor (Multi-Provider)

**File**: `backend/src/temporal/activities/node-executors/embeddings-executor.ts`

```typescript
export interface EmbeddingsNodeConfig {
    provider: "openai" | "cohere" | "google";
    model: string;
    input: string | string[];
    inputTruncate?: "start" | "end" | "none";
    taskType?: "search_document" | "search_query" | "classification" | "clustering";
    batchSize?: number;
    outputVariable?: string;
}

export async function executeEmbeddingsNode(
    config: EmbeddingsNodeConfig,
    context: JsonObject
): Promise<JsonObject>;

// Supports OpenAI text-embedding-3-small, Cohere embed-english-v3.0, Google embedding-001
// Batch processing with configurable batch size
// Returns embeddings array with metadata (dimensions, tokensUsed, processingTime)
```

### Knowledge Base Repository

**File**: `backend/src/storage/repositories/KnowledgeBaseRepository.ts`

```typescript
export class KnowledgeBaseRepository {
    async create(input: CreateKnowledgeBaseInput): Promise<KnowledgeBaseModel>;
    async findById(id: string): Promise<KnowledgeBaseModel | null>;
    async findByUserId(
        userId: string,
        options?
    ): Promise<{ knowledgeBases: KnowledgeBaseModel[]; total: number }>;
    async update(id: string, input: UpdateKnowledgeBaseInput): Promise<KnowledgeBaseModel | null>;
    async delete(id: string): Promise<boolean>;
    async getStats(id: string): Promise<KnowledgeBaseStats | null>;
}

// Default config:
const DEFAULT_CONFIG: KnowledgeBaseConfig = {
    embeddingModel: "text-embedding-3-small",
    embeddingProvider: "openai",
    chunkSize: 1000,
    chunkOverlap: 200,
    embeddingDimensions: 1536
};
```

### Knowledge Document Repository

**File**: `backend/src/storage/repositories/KnowledgeDocumentRepository.ts`

```typescript
export class KnowledgeDocumentRepository {
    async create(input: CreateKnowledgeDocumentInput): Promise<KnowledgeDocumentModel>;
    async findById(id: string): Promise<KnowledgeDocumentModel | null>;
    async findByKnowledgeBaseId(
        kbId: string,
        options?
    ): Promise<{ documents: KnowledgeDocumentModel[]; total: number }>;
    async update(
        id: string,
        input: UpdateKnowledgeDocumentInput
    ): Promise<KnowledgeDocumentModel | null>;
    async updateStatus(
        id: string,
        status: DocumentStatus,
        errorMessage?: string
    ): Promise<KnowledgeDocumentModel | null>;
    async delete(id: string): Promise<boolean>;
}

// Status: "pending" | "processing" | "ready" | "failed"
// Source types: "upload" | "url" | "notion" | "drive" | "text"
// File types: "pdf" | "docx" | "txt" | "md" | "html" | "csv"
```

### Knowledge Chunk Repository with pgvector

**File**: `backend/src/storage/repositories/KnowledgeChunkRepository.ts`

```typescript
import { toSql } from "pgvector";

export class KnowledgeChunkRepository {
    async create(input: CreateKnowledgeChunkInput): Promise<KnowledgeChunkModel>;
    async batchInsert(inputs: CreateKnowledgeChunkInput[]): Promise<KnowledgeChunkModel[]>;
    async findById(id: string): Promise<KnowledgeChunkModel | null>;
    async findByDocumentId(documentId: string): Promise<KnowledgeChunkModel[]>;
    async searchSimilar(input: SearchChunksInput): Promise<ChunkSearchResult[]>;
    async updateEmbedding(id: string, embedding: number[]): Promise<KnowledgeChunkModel | null>;
    async deleteByDocumentId(documentId: string): Promise<number>;
}

// Vector similarity search with cosine distance:
// SELECT *, 1 - (embedding <=> $1::vector) as similarity
// FROM knowledge_chunks
// WHERE knowledge_base_id = $2
//   AND (1 - (embedding <=> $1::vector)) >= $3
// ORDER BY embedding <=> $1::vector
// LIMIT $4
```

### pgvector Extension

**File**: `backend/migrations/1730000000004_enable-pgvector.sql`

```sql
-- Enable pgvector for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;
```

### LLM Executor for Chat Responses

**File**: `backend/src/temporal/activities/node-executors/llm-executor.ts`

```typescript
// Use executeLLMNode for KB Chat responses
// Inject retrieved chunks into system prompt or context
```

---

## Nodes (3)

| Node          | Description                       | Category  |
| ------------- | --------------------------------- | --------- |
| **Search KB** | Find relevant documents via RAG   | knowledge |
| **Add to KB** | Index new content with embeddings | knowledge |
| **KB Chat**   | Conversational Q&A with KB        | knowledge |

---

## Node Specifications

### Search KB Node

**Purpose**: Semantic search across knowledge base

**Config**:

- Knowledge base selection
- Search type: semantic / keyword / hybrid
- Top K results
- Minimum similarity threshold
- Filters: source, date, tags

**Inputs**: `query` (string)
**Outputs**: `results` (array), `sources` (array), `scores` (array)

### Add to KB Node

**Purpose**: Add new documents to knowledge base

**Config**:

- Knowledge base selection
- Content source: text / URL / file
- Chunking strategy: fixed / semantic / paragraph
- Metadata fields
- Update mode: append / replace

**Inputs**: `content` (string/file), `metadata` (object)
**Outputs**: `documentId` (string), `chunkCount` (number), `success` (boolean)

### KB Chat Node

**Purpose**: Q&A with knowledge base context (RAG)

**Config**:

- Knowledge base selection
- AI model for responses
- System prompt for chat style
- Include citations
- Max context chunks
- Memory: none / last N / summary

**Inputs**: `question` (string), `history` (optional)
**Outputs**: `answer` (string), `sources` (array), `history` (array)

---

## Complete TypeScript Interfaces

```typescript
// backend/src/temporal/activities/node-executors/knowledge/types.ts

export interface SearchKBNodeConfig {
    knowledgeBaseId: string;
    searchType: "semantic" | "keyword" | "hybrid";
    topK: number;
    similarityThreshold?: number;
    filters?: {
        sourceType?: string[];
        dateRange?: { start: Date; end: Date };
        tags?: string[];
        metadata?: Record<string, unknown>;
    };
    query: string;
    outputVariable?: string;
}

export interface SearchKBNodeResult {
    results: Array<{
        chunkId: string;
        documentId: string;
        documentName: string;
        content: string;
        similarity: number;
        metadata: Record<string, unknown>;
    }>;
    sources: string[];
    scores: number[];
}

export interface AddToKBNodeConfig {
    knowledgeBaseId: string;
    contentSource: "text" | "url" | "file";
    content: string;
    fileName?: string;
    chunkingStrategy: "fixed" | "semantic" | "paragraph";
    chunkSize?: number;
    chunkOverlap?: number;
    metadata?: Record<string, unknown>;
    updateMode: "append" | "replace";
    outputVariable?: string;
}

export interface AddToKBNodeResult {
    documentId: string;
    chunkCount: number;
    success: boolean;
    processingTime: number;
}

export interface KBChatNodeConfig {
    knowledgeBaseId: string;
    provider: "openai" | "anthropic" | "google";
    model: string;
    systemPrompt?: string;
    includeCitations: boolean;
    maxContextChunks: number;
    memoryMode: "none" | "lastN" | "summary";
    memorySize?: number;
    temperature?: number;
    outputVariable?: string;
}

export interface KBChatNodeResult {
    answer: string;
    sources: Array<{
        documentId: string;
        documentName: string;
        chunkContent: string;
        similarity: number;
    }>;
    history: Array<{ role: "user" | "assistant"; content: string }>;
}
```

---

## Backend Executor Implementations

### Search KB Executor

```typescript
// backend/src/temporal/activities/node-executors/knowledge/search-kb-executor.ts
import type { JsonObject } from "@flowmaestro/shared";
import { executeEmbeddingsNode } from "../embeddings-executor";
import { KnowledgeChunkRepository } from "../../../storage/repositories/KnowledgeChunkRepository";
import { KnowledgeBaseRepository } from "../../../storage/repositories/KnowledgeBaseRepository";
import { interpolateVariables } from "../utils";
import type { SearchKBNodeConfig, SearchKBNodeResult } from "./types";

const chunkRepo = new KnowledgeChunkRepository();
const kbRepo = new KnowledgeBaseRepository();

export async function executeSearchKBNode(
    config: SearchKBNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const query = interpolateVariables(config.query, context);

    // Get KB config for embedding settings
    const kb = await kbRepo.findById(config.knowledgeBaseId);
    if (!kb) {
        throw new Error(`Knowledge base ${config.knowledgeBaseId} not found`);
    }

    // Generate query embedding
    const embeddingResult = await executeEmbeddingsNode(
        {
            provider: kb.config.embeddingProvider,
            model: kb.config.embeddingModel,
            input: query,
            taskType: "search_query"
        },
        context
    );

    const queryEmbedding = (embeddingResult.embeddings as number[][])[0];

    // Search for similar chunks
    const searchResults = await chunkRepo.searchSimilar({
        knowledge_base_id: config.knowledgeBaseId,
        query_embedding: queryEmbedding,
        top_k: config.topK || 5,
        similarity_threshold: config.similarityThreshold || 0.7
    });

    // Apply additional filters if specified
    let filteredResults = searchResults;
    if (config.filters) {
        filteredResults = applyFilters(searchResults, config.filters);
    }

    const result: SearchKBNodeResult = {
        results: filteredResults.map((r) => ({
            chunkId: r.id,
            documentId: r.document_id,
            documentName: r.document_name,
            content: r.content,
            similarity: r.similarity,
            metadata: r.metadata
        })),
        sources: [...new Set(filteredResults.map((r) => r.document_name))],
        scores: filteredResults.map((r) => r.similarity)
    };

    if (config.outputVariable) {
        return { [config.outputVariable]: result } as unknown as JsonObject;
    }
    return result as unknown as JsonObject;
}

function applyFilters(results: ChunkSearchResult[], filters: SearchKBNodeConfig["filters"]) {
    return results.filter((r) => {
        if (filters?.tags && filters.tags.length > 0) {
            const chunkTags = (r.metadata?.tags as string[]) || [];
            if (!filters.tags.some((t) => chunkTags.includes(t))) {
                return false;
            }
        }
        // Add more filter logic as needed
        return true;
    });
}
```

### Add to KB Executor

```typescript
// backend/src/temporal/activities/node-executors/knowledge/add-to-kb-executor.ts
import type { JsonObject } from "@flowmaestro/shared";
import { executeEmbeddingsNode } from "../embeddings-executor";
import { KnowledgeBaseRepository } from "../../../storage/repositories/KnowledgeBaseRepository";
import { KnowledgeDocumentRepository } from "../../../storage/repositories/KnowledgeDocumentRepository";
import { KnowledgeChunkRepository } from "../../../storage/repositories/KnowledgeChunkRepository";
import { interpolateVariables } from "../utils";
import type { AddToKBNodeConfig, AddToKBNodeResult } from "./types";

const kbRepo = new KnowledgeBaseRepository();
const docRepo = new KnowledgeDocumentRepository();
const chunkRepo = new KnowledgeChunkRepository();

export async function executeAddToKBNode(
    config: AddToKBNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const startTime = Date.now();
    const content = interpolateVariables(config.content, context);

    // Get KB config for embedding/chunking settings
    const kb = await kbRepo.findById(config.knowledgeBaseId);
    if (!kb) {
        throw new Error(`Knowledge base ${config.knowledgeBaseId} not found`);
    }

    // Create document record
    const document = await docRepo.create({
        knowledge_base_id: config.knowledgeBaseId,
        name: config.fileName || `Document-${Date.now()}`,
        source_type: config.contentSource,
        file_type: "txt",
        metadata: config.metadata || {}
    });

    // Update status to processing
    await docRepo.updateStatus(document.id, "processing");

    try {
        // Chunk the content
        const chunks = chunkContent(content, {
            strategy: config.chunkingStrategy,
            chunkSize: config.chunkSize || kb.config.chunkSize,
            chunkOverlap: config.chunkOverlap || kb.config.chunkOverlap
        });

        // Generate embeddings for all chunks (batched)
        const embeddingResult = await executeEmbeddingsNode(
            {
                provider: kb.config.embeddingProvider,
                model: kb.config.embeddingModel,
                input: chunks,
                taskType: "search_document"
            },
            context
        );

        const embeddings = embeddingResult.embeddings as number[][];

        // Insert chunks with embeddings
        const chunkInputs = chunks.map((chunk, index) => ({
            document_id: document.id,
            knowledge_base_id: config.knowledgeBaseId,
            chunk_index: index,
            content: chunk,
            embedding: embeddings[index],
            token_count: estimateTokens(chunk),
            metadata: config.metadata || {}
        }));

        await chunkRepo.batchInsert(chunkInputs);

        // Update document status
        await docRepo.updateStatus(document.id, "ready");

        const result: AddToKBNodeResult = {
            documentId: document.id,
            chunkCount: chunks.length,
            success: true,
            processingTime: Date.now() - startTime
        };

        if (config.outputVariable) {
            return { [config.outputVariable]: result } as unknown as JsonObject;
        }
        return result as unknown as JsonObject;
    } catch (error) {
        await docRepo.updateStatus(document.id, "failed", (error as Error).message);
        throw error;
    }
}

interface ChunkOptions {
    strategy: "fixed" | "semantic" | "paragraph";
    chunkSize: number;
    chunkOverlap: number;
}

function chunkContent(content: string, options: ChunkOptions): string[] {
    const { strategy, chunkSize, chunkOverlap } = options;

    switch (strategy) {
        case "paragraph":
            return chunkByParagraph(content, chunkSize);
        case "semantic":
            return chunkBySentence(content, chunkSize, chunkOverlap);
        case "fixed":
        default:
            return chunkByCharacters(content, chunkSize, chunkOverlap);
    }
}

function chunkByCharacters(text: string, size: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + size, text.length);
        chunks.push(text.slice(start, end));
        start = end - overlap;
        if (start >= text.length - overlap) break;
    }

    return chunks;
}

function chunkByParagraph(text: string, maxSize: number): string[] {
    const paragraphs = text.split(/\n\n+/);
    const chunks: string[] = [];
    let currentChunk = "";

    for (const para of paragraphs) {
        if (currentChunk.length + para.length > maxSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = para;
        } else {
            currentChunk += (currentChunk ? "\n\n" : "") + para;
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

function chunkBySentence(text: string, maxSize: number, overlap: number): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = "";
    let overlapBuffer: string[] = [];

    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            // Keep last few sentences for overlap
            currentChunk = overlapBuffer.join(" ") + " " + sentence;
            overlapBuffer = [];
        } else {
            currentChunk += " " + sentence;
        }

        // Track sentences for overlap
        overlapBuffer.push(sentence);
        if (overlapBuffer.join(" ").length > overlap) {
            overlapBuffer.shift();
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

function estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
}
```

### KB Chat Executor

```typescript
// backend/src/temporal/activities/node-executors/knowledge/kb-chat-executor.ts
import type { JsonObject } from "@flowmaestro/shared";
import { executeLLMNode } from "../llm-executor";
import { executeSearchKBNode } from "./search-kb-executor";
import { interpolateVariables } from "../utils";
import type { KBChatNodeConfig, KBChatNodeResult } from "./types";

export async function executeKBChatNode(
    config: KBChatNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const question = interpolateVariables(
        (context.question as string) || (context.input as string),
        context
    );
    const history = (context.history as Array<{ role: string; content: string }>) || [];

    // Search for relevant context
    const searchResult = await executeSearchKBNode(
        {
            knowledgeBaseId: config.knowledgeBaseId,
            searchType: "semantic",
            query: question,
            topK: config.maxContextChunks || 5,
            similarityThreshold: 0.6
        },
        context
    );

    const chunks = (
        searchResult as unknown as {
            results: Array<{
                content: string;
                documentName: string;
                similarity: number;
                documentId: string;
            }>;
        }
    ).results;

    // Build context from retrieved chunks
    const contextText = chunks
        .map((c, i) => `[Source ${i + 1}: ${c.documentName}]\n${c.content}`)
        .join("\n\n---\n\n");

    // Build system prompt with RAG context
    const baseSystemPrompt =
        config.systemPrompt ||
        "You are a helpful assistant that answers questions based on the provided context.";

    const systemPrompt = `${baseSystemPrompt}

Use the following context to answer the user's question. If the answer is not in the context, say so clearly.
${config.includeCitations ? "Include citations in [Source N] format when referencing information." : ""}

Context:
${contextText}`;

    // Build conversation history for multi-turn
    const messages = buildMessages(history, question, config.memoryMode, config.memorySize);

    // Generate response using LLM
    const llmResult = await executeLLMNode(
        {
            provider: config.provider,
            model: config.model,
            systemPrompt,
            prompt: messages.map((m) => `${m.role}: ${m.content}`).join("\n"),
            temperature: config.temperature || 0.7
        },
        context
    );

    const answer = llmResult.text as string;

    // Build result
    const result: KBChatNodeResult = {
        answer,
        sources: chunks.map((c) => ({
            documentId: c.documentId,
            documentName: c.documentName,
            chunkContent: c.content.substring(0, 200) + "...",
            similarity: c.similarity
        })),
        history: [
            ...history,
            { role: "user", content: question },
            { role: "assistant", content: answer }
        ] as Array<{ role: "user" | "assistant"; content: string }>
    };

    if (config.outputVariable) {
        return { [config.outputVariable]: result } as unknown as JsonObject;
    }
    return result as unknown as JsonObject;
}

function buildMessages(
    history: Array<{ role: string; content: string }>,
    currentQuestion: string,
    memoryMode: "none" | "lastN" | "summary",
    memorySize?: number
): Array<{ role: string; content: string }> {
    let relevantHistory: Array<{ role: string; content: string }> = [];

    switch (memoryMode) {
        case "none":
            break;
        case "lastN":
            relevantHistory = history.slice(-(memorySize || 10));
            break;
        case "summary":
            // For summary mode, you'd use an LLM to summarize history
            // Simplified: just take last few messages
            relevantHistory = history.slice(-4);
            break;
    }

    return [...relevantHistory, { role: "user", content: currentQuestion }];
}
```

---

## Node Registration

```typescript
// Add to backend/src/shared/registry/node-registry.ts

{
    type: "search-kb",
    name: "Search KB",
    description: "Search knowledge base using semantic, keyword, or hybrid search",
    category: "knowledge",
    subcategory: "retrieval",
    keywords: ["rag", "vector", "semantic", "search", "retrieve", "embedding", "similarity"],
    inputs: [{ name: "query", type: "string", required: true }],
    outputs: [
        { name: "results", type: "array" },
        { name: "sources", type: "array" },
        { name: "scores", type: "array" }
    ],
    configSchema: { /* SearchKBNodeConfig schema */ }
},
{
    type: "add-to-kb",
    name: "Add to KB",
    description: "Add documents to knowledge base with automatic chunking and embedding",
    category: "knowledge",
    subcategory: "ingestion",
    keywords: ["ingest", "index", "document", "chunk", "embed", "add"],
    inputs: [
        { name: "content", type: "string", required: true },
        { name: "metadata", type: "object", required: false }
    ],
    outputs: [
        { name: "documentId", type: "string" },
        { name: "chunkCount", type: "number" },
        { name: "success", type: "boolean" }
    ],
    configSchema: { /* AddToKBNodeConfig schema */ }
},
{
    type: "kb-chat",
    name: "KB Chat",
    description: "Conversational Q&A with knowledge base context (RAG)",
    category: "knowledge",
    subcategory: "retrieval",
    keywords: ["chat", "qa", "rag", "conversation", "answer", "question"],
    inputs: [
        { name: "question", type: "string", required: true },
        { name: "history", type: "array", required: false }
    ],
    outputs: [
        { name: "answer", type: "string" },
        { name: "sources", type: "array" },
        { name: "history", type: "array" }
    ],
    configSchema: { /* KBChatNodeConfig schema */ }
}
```

---

## Unit Tests

### Test Pattern

**Pattern B + DB**: Mock LLM for embeddings and use test database for vector storage.

### Files to Create

| Executor | Test File                                                                | Pattern |
| -------- | ------------------------------------------------------------------------ | ------- |
| SearchKB | `backend/tests/unit/node-executors/knowledge/search-kb-executor.test.ts` | B + DB  |
| AddKB    | `backend/tests/unit/node-executors/knowledge/add-kb-executor.test.ts`    | B + DB  |
| KBChat   | `backend/tests/unit/node-executors/knowledge/kb-chat-executor.test.ts`   | B + DB  |

### Mock Setup

```typescript
// Mock embedding generation
mockLLM.setEmbeddingResponse([0.1, 0.2, 0.3, ...]); // 1536-dim vector

// Use test database with pgvector
const pool = getGlobalTestPool();
await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
```

### Required Test Cases

#### search-kb-executor.test.ts

- `should return semantically similar documents`
- `should respect topK limit`
- `should filter by metadata`
- `should return relevance scores`
- `should handle empty results`

#### add-kb-executor.test.ts

- `should chunk document by strategy`
- `should generate embeddings for chunks`
- `should store with metadata`
- `should handle duplicate detection`
- `should support batch ingestion`

#### kb-chat-executor.test.ts

- `should retrieve context and generate answer`
- `should cite sources in response`
- `should maintain conversation history`
- `should handle no relevant context`

---

## Test Workflow: Q&A Bot

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│  Webhook    │───▶│  Search KB   │───▶│   Ask AI    │───▶│   Output    │
│ (question)  │    │              │    │ (answer)    │    │ (response)  │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
```

**Test Input**: "What is the refund policy?"
**Expected**: Retrieves relevant docs, generates grounded answer

---

## Knowledge Base Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Knowledge Base                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ Documents   │  │ Chunks      │  │ Embeddings      │  │
│  │             │  │             │  │ (Vector DB)     │  │
│  │ - id        │  │ - id        │  │                 │  │
│  │ - source    │  │ - doc_id    │  │ pgvector or     │  │
│  │ - metadata  │  │ - content   │  │ Pinecone        │  │
│  │ - created   │  │ - embedding │  │                 │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Files to Create

### Frontend Components

```
frontend/src/canvas/nodes/knowledge/
├── SearchKBNode.tsx
├── AddToKBNode.tsx
├── KBChatNode.tsx
├── config/
│   ├── SearchKBNodeConfig.tsx
│   ├── AddToKBNodeConfig.tsx
│   └── KBChatNodeConfig.tsx
└── index.ts
```

### Backend

```
backend/src/temporal/activities/node-executors/knowledge/
├── search-kb-executor.ts
├── add-to-kb-executor.ts
└── kb-chat-executor.ts

backend/src/services/knowledge-base/
├── kb-manager.ts
├── document-processor.ts
├── chunker.ts
├── embeddings.ts
└── vector-search.ts
```

---

## How to Deliver

1. Register all 3 nodes in `node-registry.ts`
2. Set up vector database (pgvector or Pinecone)
3. Create embedding service (OpenAI embeddings)
4. Implement document chunking strategies
5. Create frontend node components
6. Create config forms with KB selector
7. Implement backend executors
8. Test end-to-end RAG flow

---

## How to Test

| Test               | Expected Result                  |
| ------------------ | -------------------------------- |
| Add document to KB | Document indexed, chunks created |
| Search with query  | Returns relevant chunks          |
| Search with filter | Respects source/date filters     |
| KB Chat question   | Grounded answer with citations   |
| KB Chat follow-up  | Maintains conversation context   |

### Integration Tests

```typescript
describe("Knowledge Base", () => {
    it("indexes and retrieves documents", async () => {
        // Add document
        const addResult = await executeAddToKB({
            kbId: testKBId,
            content: "Our refund policy allows returns within 30 days.",
            metadata: { source: "policy.md" }
        });
        expect(addResult.success).toBe(true);

        // Search
        const searchResult = await executeSearchKB({
            kbId: testKBId,
            query: "refund policy",
            topK: 3
        });
        expect(searchResult.results.length).toBeGreaterThan(0);
        expect(searchResult.results[0].content).toContain("30 days");
    });
});

describe("KB Chat", () => {
    it("answers with citations", async () => {
        const result = await executeKBChat({
            kbId: testKBId,
            question: "What is the refund policy?"
        });
        expect(result.answer).toContain("30 days");
        expect(result.sources.length).toBeGreaterThan(0);
    });
});
```

---

## Acceptance Criteria

- [ ] Search KB returns relevant results with scores
- [ ] Search KB supports semantic/keyword/hybrid modes
- [ ] Search KB respects filters (source, date, tags)
- [ ] Add to KB indexes text, URLs, and files
- [ ] Add to KB creates embeddings for chunks
- [ ] Add to KB supports different chunking strategies
- [ ] KB Chat generates grounded answers
- [ ] KB Chat includes source citations
- [ ] KB Chat maintains conversation history
- [ ] All nodes display with Knowledge category styling (purple)

---

## Dependencies

These nodes enable RAG-powered Q&A and document search.

Enables:

- **Phase 18**: KB Management builds on this infrastructure
