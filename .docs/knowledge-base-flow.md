# FlowMaestro Knowledge Base - Complete Document Flow

This document provides a comprehensive overview of how knowledge base documents flow through FlowMaestro, from upload to semantic search.

## Table of Contents

1. [Overview](#overview)
2. [Architecture Summary](#architecture-summary)
3. [Upload Flow](#upload-flow)
4. [Integration Import Flow](#integration-import-flow)
5. [Processing Workflow](#processing-workflow)
6. [Semantic Search](#semantic-search)
7. [Document Download](#document-download)
8. [Database Schema](#database-schema)
9. [Configuration](#configuration)
10. [Performance & Scalability](#performance--scalability)

---

## Overview

FlowMaestro implements a complete RAG (Retrieval-Augmented Generation) pipeline for knowledge base documents:

1. **Upload** → Document files uploaded via UI
2. **Storage** → Files stored in Google Cloud Storage
3. **Processing** → Temporal workflow extracts, chunks, and embeds text
4. **Indexing** → Vector embeddings stored in PostgreSQL with pgvector
5. **Search** → Semantic search using vector similarity
6. **Retrieval** → Download original documents via signed URLs

**Supported File Types:** PDF, DOCX, DOC, TXT, MD, HTML, JSON, CSV

---

## Architecture Summary

```
┌─────────────┐
│   Frontend  │  React + TypeScript
│   (Vite)    │  - File upload UI
└──────┬──────┘  - Search interface
       │         - Results display
       ↓
┌─────────────┐
│   Backend   │  Fastify + TypeScript
│   (API)     │  - Upload endpoint
└──────┬──────┘  - Query endpoint
       │         - Download endpoint
       ↓
┌─────────────────────────────────────┐
│  Google Cloud Storage               │
│  - Document files (gs://bucket/...) │
│  - User-scoped paths                │
│  - Workload Identity auth           │
└─────────────────────────────────────┘
       │
       ↓
┌─────────────┐
│  Temporal   │  Workflow Orchestration
│  Workflow   │  - Extract text
└──────┬──────┘  - Chunk content
       │         - Generate embeddings
       │         - Store chunks
       ↓
┌─────────────┐
│ PostgreSQL  │  Data Storage
│  + pgvector │  - Documents metadata
└─────────────┘  - Text chunks
                 - Vector embeddings
                 - HNSW index for search
```

---

## Upload Flow

### 1. User Interface

**Component:** `frontend/src/pages/KnowledgeBases/KnowledgeBaseDetail.tsx`

```tsx
// File input
<input
    type="file"
    onChange={handleFileUpload}
    accept=".pdf,.docx,.doc,.txt,.md,.html,.json,.csv"
/>;

// Upload handler
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files[0];
    await uploadDoc(knowledgeBaseId, file);
};
```

### 2. API Client

**Location:** `frontend/src/lib/api.ts`

```typescript
export async function uploadDocument(id: string, file: File): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_URL}/api/knowledge-bases/${id}/documents/upload`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: formData // multipart/form-data
    });

    return response.json();
}
```

### 3. Backend Upload Handler

**Location:** `backend/src/api/routes/knowledge-bases/upload-document.ts`

**Step-by-step Process:**

1. **Verify Ownership**

    ```typescript
    const kb = await kbRepository.findById(params.id);
    if (kb.user_id !== request.user.id) {
        return reply.status(403).send({ error: "Access denied" });
    }
    ```

2. **Receive File**

    ```typescript
    const data = await request.file(); // Fastify multipart
    ```

3. **Validate File Type**

    ```typescript
    const validExtensions = ["pdf", "docx", "doc", "txt", "md", "html", "json", "csv"];
    if (!validExtensions.includes(fileExtension)) {
        return reply.status(400).send({ error: "Unsupported file type" });
    }
    ```

4. **Upload to GCS**

    ```typescript
    const gcsService = getGCSStorageService();
    const gcsUri = await gcsService.upload(data.file, {
        userId: request.user.id,
        knowledgeBaseId: params.id,
        filename: data.filename
    });
    // Returns: gs://bucket/userId/kbId/timestamp_filename.ext
    ```

5. **Create Database Record**

    ```typescript
    const document = await docRepository.create({
        knowledge_base_id: params.id,
        name: data.filename,
        source_type: "file",
        file_path: gcsUri,
        file_type: fileExtension,
        file_size: metadata.size
    });
    // Status: 'pending'
    ```

6. **Start Temporal Workflow**

    ```typescript
    await client.workflow.start("processDocumentWorkflow", {
        taskQueue: "flowmaestro-orchestrator",
        workflowId: `process-document-${document.id}`,
        args: [
            {
                documentId: document.id,
                knowledgeBaseId: params.id,
                filePath: gcsUri,
                fileType: fileExtension,
                userId: request.user.id
            }
        ]
    });
    ```

7. **Return Success**
    ```typescript
    return reply.status(201).send({
        success: true,
        data: { document, workflowId },
        message: "Document uploaded successfully and processing started"
    });
    ```

**Key Points:**

- Upload completes immediately (doesn't wait for processing)
- File stored in GCS with user-scoped path
- Processing happens asynchronously in background
- Status updates: `pending` → `processing` → `ready`

---

## Integration Import Flow

FlowMaestro supports importing documents directly from connected integration providers (Google Drive, Dropbox, Notion, etc.) with optional continuous sync.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Integration Import Architecture                                             │
│                                                                              │
│  ┌──────────────┐     ┌─────────────────────┐     ┌────────────────────┐    │
│  │ File Browser │────▶│ Integration Import  │────▶│ Document Process   │    │
│  │ Modal (React)│     │ API Routes          │     │ Workflow (Temporal)│    │
│  └──────────────┘     └─────────────────────┘     └────────────────────┘    │
│         │                       │                           │               │
│         ▼                       ▼                           ▼               │
│  ┌──────────────┐     ┌─────────────────────┐     ┌────────────────────┐    │
│  │ Capability   │     │ Document Adapters   │     │ Sync Scheduler     │    │
│  │ Detector     │     │ (Binary/Structured) │     │ (Temporal Cron)    │    │
│  └──────────────┘     └─────────────────────┘     └────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1. Provider Capability Detection

**Location:** `backend/src/services/integration-documents/CapabilityDetector.ts`

The system auto-detects which providers support document import by inspecting their operations:

```typescript
const DOCUMENT_OPERATIONS = {
    list: ["listFiles", "listDriveItems", "listItems", "listPages"],
    download: ["downloadFile", "getFile", "downloadContent"],
    search: ["search", "searchContent", "searchFiles"],
    getContent: ["getPage", "getDocument", "getRecord"]
};

// A provider supports document import if it has list/search AND download operations
detectCapabilities(provider: IProvider): DocumentCapability | null {
    const operations = provider.getOperations().map(op => op.id);

    const listOp = DOCUMENT_OPERATIONS.list.find(op => operations.includes(op));
    const downloadOp = DOCUMENT_OPERATIONS.download.find(op => operations.includes(op));

    if (!listOp && !searchOp) return null;

    return {
        supportsBrowsing: !!listOp,
        supportsSearch: !!searchOp,
        contentType: this.detectContentType(provider), // "binary" | "structured" | "mixed"
        listOperation: listOp,
        downloadOperation: downloadOp
    };
}
```

**Content Types:**

- **binary**: File-based providers (Google Drive, Dropbox, Box) - downloads raw files
- **structured**: Page-based providers (Notion, Confluence) - converts pages to markdown
- **mixed**: Providers supporting both (some wikis)

### 2. Document Adapters

**Location:** `backend/src/services/integration-documents/adapters/`

Adapters normalize provider-specific operations to a standard interface:

```typescript
interface DocumentAdapter {
    browse(connection, options): Promise<IntegrationBrowseResult>;
    search(connection, query): Promise<IntegrationBrowseResult>;
    download(connection, fileId, mimeType): Promise<IntegrationDownloadResult>;
}
```

**BinaryFileAdapter** (Google Drive, Dropbox):

```typescript
async download(connection, fileId, mimeType) {
    // Execute provider's download operation
    const result = await this.provider.executeOperation("downloadFile", { fileId }, connection);

    return {
        buffer: Buffer.from(result.data.content, "base64"),
        contentType: result.data.contentType,
        filename: result.data.filename
    };
}
```

**StructuredContentAdapter** (Notion, Confluence):

```typescript
async download(connection, pageId, mimeType) {
    // Fetch page content
    const result = await this.provider.executeOperation("getPage", { pageId }, connection);

    // Convert to Markdown
    const markdown = this.convertNotionToMarkdown(result.data.blocks);

    return {
        buffer: Buffer.from(markdown, "utf-8"),
        contentType: "text/markdown",
        filename: `${result.data.title}.md`
    };
}
```

### 3. API Routes

**Location:** `backend/src/api/routes/knowledge-bases/integration/`

| Endpoint                              | Method | Description                               |
| ------------------------------------- | ------ | ----------------------------------------- |
| `/integration/providers`              | GET    | List providers with document capabilities |
| `/integration/:connectionId/browse`   | GET    | Browse files in a provider                |
| `/integration/sources`                | GET    | List configured sources                   |
| `/integration/sources`                | POST   | Create source and start import            |
| `/integration/sources/:sourceId`      | PUT    | Update sync settings                      |
| `/integration/sources/:sourceId`      | DELETE | Delete source                             |
| `/integration/sources/:sourceId/sync` | POST   | Trigger manual sync                       |
| `/integration/import/:jobId`          | GET    | Get import job progress                   |

### 4. Database Schema

**Table:** `knowledge_base_sources`

```sql
CREATE TABLE flowmaestro.knowledge_base_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES flowmaestro.knowledge_bases(id),
    connection_id UUID NOT NULL REFERENCES flowmaestro.connections(id),
    provider VARCHAR(100) NOT NULL,
    source_type VARCHAR(20) NOT NULL,  -- 'folder', 'file', 'search'
    source_config JSONB NOT NULL,      -- { folderId?, fileIds?, searchQuery? }
    sync_enabled BOOLEAN DEFAULT true,
    sync_interval_minutes INTEGER DEFAULT 60,
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(20) DEFAULT 'pending',  -- pending, syncing, completed, failed
    sync_error TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**Document Metadata Fields:**

```typescript
// Added to knowledge_documents.metadata for integration sources
{
    integration_source_id: string;      // References knowledge_base_sources
    integration_connection_id: string;
    integration_provider: string;
    integration_file_id: string;
    integration_file_path?: string;
    integration_last_modified?: string;
    integration_content_hash?: string;   // For change detection
}
```

### 5. Import Workflow

**Location:** `backend/src/temporal/workflows/integration-import.ts`

```typescript
export async function integrationImportWorkflow(input: IntegrationImportWorkflowInput) {
    // 1. List files from source
    const files = await listIntegrationFiles({
        connectionId: input.connectionId,
        provider: input.provider,
        sourceConfig: input.sourceConfig
    });

    // 2. Check existing documents (for sync)
    const existingDocs = await checkExistingDocuments({
        knowledgeBaseId: input.knowledgeBaseId,
        fileIds: files.map(f => f.id)
    });

    // 3. Process each file
    for (const file of files) {
        // Skip unchanged files
        const existing = existingDocs.find(d => d.integrationFileId === file.id);
        if (existing && file.modifiedTime <= existing.lastModified) {
            continue; // File unchanged, skip
        }

        // Download from provider
        const downloaded = await downloadIntegrationFile({...});

        // Store in GCS
        const gcsPath = await storeDocumentFile({...});

        // Create/update document record
        const documentId = await createIntegrationDocument({...});

        // Process through standard pipeline
        await extractDocumentText({...});
        await chunkDocumentText({...});
        await generateAndStoreChunks({...});
        await completeDocumentProcessing({...});
    }

    // 4. Update source sync status
    await updateSourceSyncStatus({
        sourceId: input.sourceId,
        status: "completed"
    });
}
```

### 6. Sync Scheduler

**Location:** `backend/src/temporal/workflows/sync-scheduler.ts`

A cron workflow that runs every 5 minutes to check for sources needing sync:

```typescript
export async function syncSchedulerWorkflow(input: SyncSchedulerWorkflowInput) {
    // Find sources due for sync
    const sources = await findSourcesDueForSync(input.maxConcurrentSyncs);

    for (const source of sources) {
        // Mark as syncing
        await updateSourceSyncStatus({ sourceId: source.id, status: "syncing" });

        // Start import workflow as child
        await startChild("integrationImportWorkflow", {
            workflowId: `integration-import-${source.id}-scheduled-${Date.now()}`,
            args: [
                {
                    sourceId: source.id,
                    knowledgeBaseId: source.knowledgeBaseId,
                    connectionId: source.connectionId,
                    provider: source.provider,
                    sourceConfig: source.sourceConfig,
                    isInitialImport: false
                }
            ],
            parentClosePolicy: ParentClosePolicy.ABANDON
        });
    }
}
```

**SQL for Finding Due Sources:**

```sql
SELECT * FROM knowledge_base_sources
WHERE sync_enabled = true
  AND sync_status != 'syncing'
  AND (
    last_synced_at IS NULL
    OR last_synced_at + (sync_interval_minutes || ' minutes')::interval < NOW()
  )
LIMIT $1
```

### 7. Change Detection

During sync, the system detects changed files by comparing:

1. **Last Modified Time**: Provider's `modifiedTime` vs stored `integration_last_modified`
2. **Content Hash**: Computed hash vs stored `integration_content_hash`

```typescript
// Skip if file hasn't changed
if (
    existingDoc.lastModified &&
    file.modifiedTime &&
    new Date(file.modifiedTime) <= new Date(existingDoc.lastModified)
) {
    results.push({ fileId: file.id, status: "skipped", action: "unchanged" });
    continue;
}
```

### 8. Frontend Components

| Component                     | Location      | Purpose                                |
| ----------------------------- | ------------- | -------------------------------------- |
| `IntegrationFileBrowserModal` | `modals/`     | Browse and select files from providers |
| `IntegrationSourcesPanel`     | `components/` | View/manage configured sources         |
| `IntegrationImportProgress`   | `components/` | Show import job progress               |

**Store Actions:**

```typescript
// knowledgeBaseStore.ts
fetchIntegrationProviders(kbId); // Get capable providers
fetchIntegrationSources(kbId); // Get configured sources
createIntegrationSource(kbId, input); // Create source + start import
updateIntegrationSource(kbId, sourceId, input); // Update sync settings
deleteIntegrationSource(kbId, sourceId); // Delete source
triggerSync(kbId, sourceId); // Manual sync
```

### Key Points

- **Generic Capability Detection**: Works with any provider that has list/download operations
- **Adapter Pattern**: Normalizes provider-specific formats to standard interface
- **Structured Content Conversion**: Notion/Confluence pages converted to Markdown
- **Durable Processing**: Temporal workflows for reliability and retry
- **Incremental Sync**: Only processes new/changed files
- **Configurable Sync**: User controls sync interval (15min to 24h)

---

## Processing Workflow

**Location:** `backend/src/temporal/workflows/process-document-workflow.ts`

### Workflow Configuration

```typescript
const activities = proxyActivities({
    startToCloseTimeout: "10 minutes",
    retry: {
        initialInterval: "1s",
        backoffCoefficient: 2,
        maximumAttempts: 3,
        maximumInterval: "30s"
    }
});
```

### Activity 1: Extract Text

**Location:** `backend/src/temporal/activities/process-document.ts`

**Process:**

1. **Download from GCS**

    ```typescript
    const gcsService = getGCSStorageService();
    const tempFilePath = await gcsService.downloadToTemp({ gcsUri: filePath });
    // Downloads to: /tmp/gcs-temp-{timestamp}-{filename}
    ```

2. **Extract Text by File Type**

    **PDF** (uses `pdf-parse`):

    ```typescript
    const dataBuffer = await fs.readFile(tempFilePath);
    const pdfData = await PDFParse({ data: dataBuffer });
    return {
        content: pdfData.text,
        metadata: { pages: pdfData.total, wordCount: countWords(pdfData.text) }
    };
    ```

    **DOCX** (uses `mammoth`):

    ```typescript
    const buffer = await fs.readFile(tempFilePath);
    const result = await mammoth.extractRawText({ buffer });
    return { content: result.value };
    ```

    **HTML** (uses `cheerio`):

    ```typescript
    const $ = cheerio.load(html);
    $("script, style").remove(); // Remove non-content

    // Extract from semantic tags
    const content = $("main, article, [role='main']").text() || $("body").text();
    return { content: content.replace(/\s+/g, " ").trim() };
    ```

    **TXT/MD**:

    ```typescript
    const content = await fs.readFile(tempFilePath, "utf-8");
    return { content };
    ```

    **JSON**:

    ```typescript
    const data = JSON.parse(await fs.readFile(tempFilePath, "utf-8"));
    const textParts = extractTextFromObject(data); // Recursive
    return { content: textParts.join("\n") };
    ```

    **CSV**:

    ```typescript
    const rows = content.split("\n").map((line) => line.split(","));
    const textParts = rows.map((row, i) =>
        i === 0 ? `Headers: ${row.join(", ")}` : formatRow(row)
    );
    return { content: textParts.join("\n") };
    ```

3. **Sanitize Text**

    ```typescript
    // Remove null bytes and control characters
    const sanitized = text
        .replace(/\x00/g, "") // Null bytes
        .replace(/[\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "") // Control chars
        .trim();
    ```

4. **Update Document**

    ```typescript
    await documentRepository.update(documentId, {
        content: sanitizedContent,
        metadata: extractedMetadata
    });
    ```

5. **Cleanup**
    ```typescript
    await fs.unlink(tempFilePath); // Delete temp file
    ```

### Activity 2: Chunk Text

**Location:** `backend/src/services/document-processing/TextChunker.ts`

**Configuration:**

```typescript
const chunker = new TextChunker({
    chunkSize: 1000, // Characters per chunk (from KB config)
    chunkOverlap: 200 // Overlap between chunks (from KB config)
});
```

**Chunking Algorithm:**

1. **Split into Sentences**

    ```typescript
    // Split on sentence boundaries (., !, ?)
    const sentences = text.split(/([.!?]+\s+)/).filter(Boolean);

    // Handle abbreviations to avoid false splits
    const isAbbreviation = /\b(Mr|Mrs|Dr|Prof|etc|i\.e|e\.g)\.\s*$/.test(sentence);
    ```

2. **Build Chunks**

    ```typescript
    for (const sentence of sentences) {
        const potentialChunk = currentChunk + " " + sentence;

        if (potentialChunk.length > chunkSize && currentChunk.length > 0) {
            // Save current chunk
            chunks.push({
                content: currentChunk,
                index: chunkIndex++,
                metadata: {
                    start_char: charPosition - currentChunk.length,
                    end_char: charPosition,
                    sentence_count: currentSentences.length
                }
            });

            // Start new chunk with overlap
            const overlapSentences = getLastSentences(currentSentences, chunkOverlap);
            currentChunk = overlapSentences.join(" ");
        }

        currentChunk += " " + sentence;
    }
    ```

3. **Chunk Metadata**
    ```typescript
    {
        start_char: 0,              // Position in original document
        end_char: 1050,
        sentence_count: 8,
        document_id: "uuid",
        document_name: "file.pdf",
        file_type: "pdf"
    }
    ```

**Example:**

```
Document: "Sentence 1. Sentence 2. Sentence 3. Sentence 4. Sentence 5."
chunkSize: 30, chunkOverlap: 10

Chunk 0: "Sentence 1. Sentence 2."       (28 chars)
Chunk 1: "Sentence 2. Sentence 3."       (28 chars, overlaps "Sentence 2")
Chunk 2: "Sentence 3. Sentence 4."       (28 chars, overlaps "Sentence 3")
Chunk 3: "Sentence 4. Sentence 5."       (28 chars, overlaps "Sentence 4")
```

### Activity 3: Generate Embeddings

**Location:** `backend/src/services/embeddings/EmbeddingService.ts`

**Configuration:**

```typescript
const config = {
    model: "text-embedding-3-small", // From KB config
    provider: "openai", // From KB config
    dimensions: 1536 // From KB config
};
```

**Process:**

1. **Get OpenAI API Key**

    ```typescript
    // Priority 1: User's OpenAI connection
    const connection = await connectionRepository.findByProvider(userId, "openai");
    if (connection && connection.status === "active") {
        return connection.data.api_key;
    }

    // Priority 2: Environment variable
    return process.env.OPENAI_API_KEY;
    ```

2. **Batch Processing**

    ```typescript
    const batchSize = 100; // Conservative (OpenAI supports up to 2048)
    const batches = createBatches(chunkTexts, batchSize);
    ```

3. **Generate Embeddings**

    ```typescript
    const client = new OpenAI({ apiKey });

    for (const batch of batches) {
        const response = await client.embeddings.create({
            model: "text-embedding-3-small",
            input: batch, // Array of texts
            dimensions: 1536
        });

        for (const embedding of response.data) {
            allEmbeddings.push(embedding.embedding); // number[] of length 1536
        }
    }
    ```

4. **Store Chunks with Embeddings**

    ```typescript
    const chunkInputs = chunks.map((chunk, index) => ({
        document_id: documentId,
        knowledge_base_id: knowledgeBaseId,
        chunk_index: chunk.index,
        content: chunk.content,
        embedding: embeddings[index], // [0.012, -0.034, 0.056, ...]
        token_count: estimateTokens(chunk.content),
        metadata: chunk.metadata
    }));

    // Batch insert all chunks in single transaction
    await chunkRepository.batchInsert(chunkInputs);
    ```

**Vector Format:**

```typescript
// JavaScript array
[0.012, -0.034, 0.056, ..., 0.078]  // 1536 numbers

// PostgreSQL pgvector format
'[0.012,-0.034,0.056,...,0.078]'    // String representation
```

### Activity 4: Mark Complete

**Location:** `backend/src/temporal/activities/process-document.ts`

```typescript
// Update status
await documentRepository.updateStatus(documentId, "ready");

// Emit event
globalEventEmitter.emitDocumentCompleted(knowledgeBaseId, documentId, chunkCount);
```

**Status Progression:**

```
pending → processing → ready
                    ↓
                   failed (on error)
```

---

## Semantic Search

### Query Endpoint

**Location:** `backend/src/api/routes/knowledge-bases/query.ts`

**Request:**

```json
POST /api/knowledge-bases/:id/query
{
  "query": "What is the main topic?"
}
```

**Process:**

1. **Verify Ownership**

    ```typescript
    const kb = await kbRepository.findById(params.id);
    if (kb.user_id !== request.user.id) {
        return reply.status(403).send({ error: "Access denied" });
    }
    ```

2. **Generate Query Embedding**

    ```typescript
    const embeddingService = new EmbeddingService();

    const queryEmbedding = await embeddingService.generateQueryEmbedding(
        body.query,
        {
            model: kb.config.embeddingModel,
            provider: kb.config.embeddingProvider,
            dimensions: kb.config.embeddingDimensions
        },
        request.user.id
    );
    // Returns: [0.012, -0.034, 0.056, ..., 0.078]  (1536 dimensions)
    ```

3. **Vector Similarity Search**
    ```typescript
    const results = await chunkRepository.searchSimilar({
        knowledge_base_id: params.id,
        query_embedding: queryEmbedding,
        top_k: 5, // Return top 5 results
        similarity_threshold: 0.7 // Minimum 70% similarity
    });
    ```

### Vector Search Implementation

**Location:** `backend/src/storage/repositories/KnowledgeChunkRepository.ts`

**SQL Query:**

```sql
SELECT
    kc.id,
    kc.document_id,
    kd.name as document_name,
    kc.chunk_index,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> $1::vector) as similarity
FROM knowledge_chunks kc
JOIN knowledge_documents kd ON kc.document_id = kd.id
WHERE kc.knowledge_base_id = $2
    AND kc.embedding IS NOT NULL
    AND (1 - (kc.embedding <=> $1::vector)) >= $3
ORDER BY kc.embedding <=> $1::vector
LIMIT $4
```

**Parameters:**

- `$1`: Query embedding vector `'[0.012,-0.034,...]'`
- `$2`: Knowledge base ID
- `$3`: Similarity threshold (0.7)
- `$4`: Top K results (5)

**Vector Operations:**

- `<=>`: Cosine distance operator (lower = more similar)
- `1 - distance`: Convert distance to similarity (0-1 range)
- HNSW index: Fast approximate nearest neighbor search

**Response:**

```json
{
  "success": true,
  "data": {
    "query": "What is the main topic?",
    "results": [
      {
        "id": "uuid",
        "document_id": "uuid",
        "document_name": "document.pdf",
        "chunk_index": 5,
        "content": "The main topic of this document is...",
        "metadata": {
          "start_char": 5420,
          "end_char": 6470,
          "page": 3
        },
        "similarity": 0.89
      },
      {
        "similarity": 0.82,
        ...
      }
    ],
    "count": 5
  }
}
```

### Frontend Display

**Component:** `frontend/src/pages/KnowledgeBases/KnowledgeBaseDetail.tsx`

```tsx
{
    searchResults.map((result, index) => (
        <div key={result.id} className="border rounded-lg p-4">
            {/* Rank and similarity */}
            <div className="flex justify-between">
                <div>
                    <span>#{index + 1}</span>
                    <span>{result.document_name}</span>
                    <span>Chunk {result.chunk_index + 1}</span>
                </div>
                <div className="text-primary">{(result.similarity * 100).toFixed(1)}% match</div>
            </div>

            {/* Content */}
            <div className="text-sm mt-2">{result.content}</div>

            {/* Metadata badges */}
            {result.metadata.page && <span className="badge">Page {result.metadata.page}</span>}
        </div>
    ));
}
```

---

## Document Download

### Download Endpoint

**Location:** `backend/src/api/routes/knowledge-bases/download-document.ts`

**Request:**

```
GET /api/knowledge-bases/:kbId/documents/:docId/download
Authorization: Bearer <token>
```

**Process:**

1. **Verify Ownership**

    ```typescript
    const kb = await kbRepository.findById(kbId);
    if (kb.user_id !== request.user.id) {
        return reply.status(403).send({ error: "Access denied" });
    }

    const document = await docRepository.findById(docId);
    if (document.knowledge_base_id !== kbId) {
        return reply.status(404).send({ error: "Document not found" });
    }
    ```

2. **Validate Download Type**

    ```typescript
    if (document.source_type !== "file") {
        return reply.status(400).send({
            error: "Cannot download URL-based documents"
        });
    }
    ```

3. **Generate Signed URL**

    ```typescript
    const gcsService = getGCSStorageService();
    const expiresIn = 3600; // 1 hour (from env)

    const signedUrl = await gcsService.getSignedDownloadUrl(
        document.file_path, // gs://bucket/userId/kbId/file.pdf
        expiresIn
    );
    ```

4. **Return Signed URL**
    ```typescript
    return reply.send({
        success: true,
        data: {
            url: signedUrl,
            expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
            expiresIn: 3600,
            filename: document.name
        }
    });
    ```

### Signed URL Generation

**Location:** `backend/src/services/storage/GCSStorageService.ts`

```typescript
public async getSignedDownloadUrl(
    gcsUri: string,
    expiresIn: number = 3600
): Promise<string> {
    const gcsPath = this.extractPathFromUri(gcsUri);
    const file = this.bucket.file(gcsPath);

    const [url] = await file.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + expiresIn * 1000
    });

    return url;
}
```

**Signed URL Format:**

```
https://storage.googleapis.com/bucket/path/to/file.pdf?
  X-Goog-Algorithm=GOOG4-RSA-SHA256&
  X-Goog-Credential=sa@project.iam.gserviceaccount.com/...&
  X-Goog-Date=20240101T120000Z&
  X-Goog-Expires=3600&
  X-Goog-SignedHeaders=host&
  X-Goog-Signature=...
```

**Security Features:**

- Temporary access (expires after 1 hour)
- No authentication required (URL contains signature)
- Cryptographic signature (using service account credentials)
- Read-only permission
- Cannot be modified or reused after expiration

### Frontend Download

**Location:** `frontend/src/lib/api.ts`

```typescript
export async function triggerDocumentDownload(kbId: string, docId: string): Promise<void> {
    const result = await downloadDocument(kbId, docId);

    if (!result.success || !result.data) {
        throw new Error("Failed to get download URL");
    }

    // Direct download from GCS (no backend proxy)
    window.open(result.data.url, "_blank");
}
```

---

## Database Schema

### knowledge_bases

```sql
CREATE TABLE flowmaestro.knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL DEFAULT '{
        "embeddingModel": "text-embedding-3-small",
        "embeddingProvider": "openai",
        "chunkSize": 1000,
        "chunkOverlap": 200,
        "embeddingDimensions": 1536
    }'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_bases_user_id ON flowmaestro.knowledge_bases(user_id);
```

### knowledge_documents

```sql
CREATE TABLE flowmaestro.knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES flowmaestro.knowledge_bases(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL,      -- 'file', 'url', or 'integration'
    source_url TEXT,
    source_id UUID REFERENCES flowmaestro.knowledge_base_sources(id),  -- For integration sources
    file_path TEXT,                        -- GCS URI: gs://bucket/path
    file_type VARCHAR(50) NOT NULL,        -- pdf, docx, txt, md, html, json, csv
    file_size BIGINT,
    content TEXT,                          -- Extracted text
    metadata JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, processing, ready, failed
    error_message TEXT,
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_documents_kb_id ON flowmaestro.knowledge_documents(knowledge_base_id);
CREATE INDEX idx_knowledge_documents_status ON flowmaestro.knowledge_documents(status);
CREATE INDEX idx_knowledge_documents_source_id ON flowmaestro.knowledge_documents(source_id);
```

### knowledge_base_sources (Integration Import)

```sql
CREATE TABLE flowmaestro.knowledge_base_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES flowmaestro.knowledge_bases(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES flowmaestro.connections(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    source_type VARCHAR(20) NOT NULL,      -- 'folder', 'file', 'search'
    source_config JSONB NOT NULL DEFAULT '{}',
    sync_enabled BOOLEAN DEFAULT true,
    sync_interval_minutes INTEGER DEFAULT 60,
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(20) DEFAULT 'pending',  -- pending, syncing, completed, failed
    sync_error TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kb_sources_kb_id ON flowmaestro.knowledge_base_sources(knowledge_base_id);
CREATE INDEX idx_kb_sources_connection_id ON flowmaestro.knowledge_base_sources(connection_id);
CREATE INDEX idx_kb_sources_sync_status ON flowmaestro.knowledge_base_sources(sync_status);
CREATE INDEX idx_kb_sources_next_sync ON flowmaestro.knowledge_base_sources(sync_enabled, last_synced_at);
```

### knowledge_chunks

```sql
CREATE TABLE flowmaestro.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES flowmaestro.knowledge_documents(id) ON DELETE CASCADE,
    knowledge_base_id UUID NOT NULL REFERENCES flowmaestro.knowledge_bases(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),                -- pgvector type
    token_count INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_chunks_document_id ON flowmaestro.knowledge_chunks(document_id);
CREATE INDEX idx_knowledge_chunks_kb_id ON flowmaestro.knowledge_chunks(knowledge_base_id);

-- HNSW index for fast vector similarity search
CREATE INDEX idx_knowledge_chunks_embedding_hnsw
ON flowmaestro.knowledge_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**HNSW Parameters:**

- `m = 16`: Connections per layer (higher = better recall, more memory)
- `ef_construction = 64`: Build quality (higher = better accuracy, slower build)

---

## Configuration

### Knowledge Base Config

**Default Configuration:**

```json
{
    "embeddingModel": "text-embedding-3-small",
    "embeddingProvider": "openai",
    "chunkSize": 1000,
    "chunkOverlap": 200,
    "embeddingDimensions": 1536
}
```

**Supported Embedding Models:**

- `text-embedding-3-small`: 1536 dimensions, $0.02 per 1M tokens
- `text-embedding-3-large`: 3072 dimensions, $0.13 per 1M tokens
- `text-embedding-ada-002`: 1536 dimensions, $0.10 per 1M tokens

### Environment Variables

```bash
# Google Cloud Storage
GCS_BUCKET_NAME=flowmaestro-knowledge-docs-dev
GCS_SIGNED_URL_EXPIRATION=3600

# OpenAI (fallback if user has no connection)
OPENAI_API_KEY=sk-...

# Temporal
TEMPORAL_ADDRESS=localhost:7233
```

### Search Configuration

**Default Search Parameters:**

```typescript
{
    top_k: 5,                    // Number of results
    similarity_threshold: 0.7    // Minimum similarity (0-1)
}
```

---

## Performance & Scalability

### Upload Performance

- **Multipart Upload:** Streaming to GCS (no memory buffering)
- **Immediate Response:** Returns before processing starts
- **Background Processing:** Temporal handles long-running tasks

### Processing Performance

- **Parallel Processing:** Multiple documents processed concurrently
- **Retry Logic:** Automatic retry on transient failures
- **Batch Operations:** Embeddings generated in batches of 100
- **Single Transaction:** All chunks inserted in one database operation

### Search Performance

- **HNSW Index:** O(log N) approximate nearest neighbor search
- **Cosine Distance:** Efficient similarity calculation
- **Index Parameters:** Tuned for balance of speed and accuracy

**Benchmark (approximate):**

- 1,000 chunks: <10ms
- 10,000 chunks: <20ms
- 100,000 chunks: <50ms
- 1,000,000 chunks: <100ms

### Storage Scalability

- **GCS:** Unlimited storage capacity
- **User-scoped Paths:** Natural sharding by user ID
- **Lifecycle Rules:** Automatic cleanup of old versions and temp files

### Database Scalability

- **Connection Pooling:** Reuse database connections
- **Prepared Statements:** Parameterized queries
- **Indexes:** Optimized for common query patterns
- **Batch Operations:** Minimize round trips

### Cost Optimization

**Storage Costs:**

- GCS Standard: $0.020 per GB/month
- 10,000 documents × 1MB avg = 10GB = **$0.20/month**

**Embedding Costs:**

- text-embedding-3-small: $0.02 per 1M tokens
- 10,000 documents × 1000 tokens avg = 10M tokens = **$0.20 one-time**

**Operation Costs:**

- GCS uploads: $0.05 per 10,000 operations
- GCS downloads: $0.004 per 10,000 operations
- Negligible for typical usage

**Total Estimated Cost:**

- 10,000 documents: ~$0.40 one-time + $0.20/month ongoing

---

## Key Takeaways

### 1. Async Processing

- Uploads return immediately
- Processing happens in background via Temporal
- Status updates tracked in database
- Events emitted for real-time updates

### 2. Reliable Storage

- Files stored in GCS (not local filesystem)
- User-scoped paths ensure isolation
- Versioning enabled for recovery
- Lifecycle rules for automatic cleanup

### 3. Intelligent Chunking

- Sentence-based boundaries (not arbitrary splits)
- Configurable size and overlap
- Metadata preserved for context
- Handles abbreviations correctly

### 4. Vector Embeddings

- OpenAI text-embedding-3-small (1536 dimensions)
- Batch processing for efficiency
- Stored in PostgreSQL with pgvector
- HNSW index for fast search

### 5. Semantic Search

- Query converted to embedding
- Cosine similarity for ranking
- Configurable top_k and threshold
- Returns chunks ranked by relevance

### 6. Secure Downloads

- Temporary signed URLs (1 hour expiration)
- Direct from GCS (no backend proxy)
- Cryptographic signature
- Read-only access

### 7. Scalability

- GCS: Unlimited file storage
- Temporal: Horizontal scaling of processing
- HNSW: Efficient vector search at scale
- Batch operations: Minimize database load

### 8. Security

- JWT authentication on all endpoints
- Ownership verification (user must own KB)
- Soft deletes (CASCADE on foreign keys)
- No public access to GCS bucket

---

## Related Documentation

- [GCS Setup Guide](.docs/gcs-setup.md)
- [GCS Infrastructure Setup](.docs/gcs-infrastructure-setup.md)
- [Architecture Overview](.docs/architecture.md)
- [Temporal Workflows](.docs/temporal-workflows.md)
- [Development Guidelines](../CLAUDE.md)
