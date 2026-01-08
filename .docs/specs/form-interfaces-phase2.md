# Form Interfaces - Phase 2 Implementation Plan

## Overview

Phase 2 adds execution integration to Form Interfaces, enabling public forms to actually run workflows or agents when submitted. This builds on the Phase 1 foundation (builder UI, public URLs, submissions storage).

**User Preferences:**

- **Trigger Setup**: Auto-create hidden manual trigger on publish
- **Output Display**: Wait for completion (loading → full output)
- **File Upload**: Upload immediately when user selects files

---

## Architecture Summary

```
File Upload Flow (immediate on selection):
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ User selects │────►│ Upload API   │────►│ GCS Artifacts│
│ file         │     │ (public)     │     │ (PRIVATE)    │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     Returns gcsUri +
                     signed URL (24h)

Form Submit Flow (on submit click):
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Submit Form  │────►│ Submit API   │────►│ Temporal     │
│ + file URLs  │     │ (public)     │     │ Workflow     │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │                    │                    │
       │             ┌──────▼──────┐             │
       │             │ Submission  │             │
       │             │ Record      │             │
       │             │ (JSONB)     │             │
       │             └─────────────┘             │
       │                                         │
       ▼                                         ▼
┌──────────────┐                         ┌──────────────┐
│ Subscribe to │◄────────────────────────│ SSE Stream   │
│ SSE events   │                         │ (Results)    │
└──────────────┘                         └──────────────┘
```

### File Attachment Storage

**Existing schema (`form_interface_submissions` table):**

```sql
files JSONB DEFAULT '[]',     -- [{fileName, fileSize, mimeType, gcsUri}]
urls JSONB DEFAULT '[]',      -- [{url, title?}]
```

**TypeScript types (already defined):**

```typescript
interface FormInterfaceFileAttachment {
    fileName: string;
    fileSize: number;
    mimeType: string;
    gcsUri: string; // gs://bucket/path (internal reference)
    downloadUrl?: string; // Public URL for access
}
```

**Complete flow:**

1. User selects file → immediately uploaded to GCS → signed URL returned
2. User submits form → submission created with file metadata in `files` JSONB
3. **Attachment processing workflow starts** → extract text → chunk → embed → store in `form_interface_submission_chunks`
4. Main execution starts → can query submission embeddings via RAG
5. Files remain in GCS permanently (no cleanup needed - they're part of submission record)

**Embedding Flow:**

```
Form Submission
       │
       ├─► Create submission record
       │
       └─► Start processFormSubmissionAttachmentsWorkflow
              │
              ├─► For each file:
              │     ├─► Download from GCS
              │     ├─► Extract text (TextExtractor)
              │     └─► Chunk + Embed + Store
              │
              └─► For each URL:
                    ├─► Fetch and extract (TextExtractor.extractFromURL)
                    └─► Chunk + Embed + Store

              ▼
       form_interface_submission_chunks table
              │
              ▼
       Agent/Workflow queries via semantic search
```

---

## Implementation Steps

### Step 1: Database Migration - Execution & Embedding Tables

**File**: `backend/migrations/XXXXXX_form-interface-phase2.sql`

```sql
-- Add trigger_id column to form_interfaces
ALTER TABLE form_interfaces
ADD COLUMN trigger_id UUID REFERENCES workflow_triggers(id) ON DELETE SET NULL;

-- Add execution tracking to submissions
ALTER TABLE form_interface_submissions
ADD COLUMN execution_id VARCHAR(255),
ADD COLUMN execution_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN attachments_status VARCHAR(50) DEFAULT 'pending';
-- execution_status: pending, running, completed, failed
-- attachments_status: pending, processing, ready, failed

-- Index for execution lookups
CREATE INDEX idx_form_interface_submissions_execution_id
ON form_interface_submissions(execution_id) WHERE execution_id IS NOT NULL;

-- =====================================================
-- SUBMISSION CHUNKS TABLE (for RAG on attachments)
-- =====================================================

CREATE TABLE IF NOT EXISTS form_interface_submission_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES form_interface_submissions(id) ON DELETE CASCADE,

    -- Source info
    source_type VARCHAR(20) NOT NULL,  -- 'file' | 'url'
    source_name VARCHAR(500),          -- filename or URL
    source_index INTEGER,              -- index in files/urls array

    -- Chunk content
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,

    -- Embedding (same dimensions as KB chunks)
    embedding vector(1536),

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX idx_submission_chunks_submission_id
ON form_interface_submission_chunks(submission_id);

-- Vector similarity index (HNSW for fast approximate search)
CREATE INDEX idx_submission_chunks_embedding
ON form_interface_submission_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

---

### Step 2: Shared Types - Add Execution Types

**File**: `shared/src/form-interface.ts` (additions)

```typescript
// Add to FormInterfaceSubmission
export interface FormInterfaceSubmission {
    // ... existing fields
    executionId?: string;
    executionStatus: "pending" | "running" | "completed" | "failed";
}

// New types for public form execution
export interface PublicFormSubmitInput {
    message: string;
    files?: FormInterfaceFileAttachment[]; // Full metadata from upload
    urls?: FormInterfaceUrlAttachment[];
}

export interface PublicFormSubmitResponse {
    submissionId: string;
    executionId: string;
}

// For file upload (artifacts bucket is PRIVATE - uses signed URLs)
export interface PublicFileUploadResponse {
    gcsUri: string; // Internal reference: gs://bucket/path (stored in DB)
    downloadUrl: string; // Signed URL valid for 24h (for workflow access)
    filename: string;
    size: number;
    mimeType: string;
}
```

---

### Step 3: Backend - Auto-Create Trigger on Publish

**File**: `backend/src/api/routes/form-interfaces/publish.ts` (modify)

Add logic to:

1. Check if form has a workflow target (only workflows use triggers)
2. If workflow and no existing trigger_id → create hidden manual trigger
3. Store trigger_id on form_interface record
4. Mark as published

```typescript
// Pseudo-code for publish handler
if (formInterface.workflowId && !formInterface.triggerId) {
    const trigger = await TriggerRepository.create({
        workflowId: formInterface.workflowId,
        name: `__form_interface_${formInterface.id}__`,
        triggerType: "manual",
        config: { description: "Auto-created for form interface" },
        enabled: true,
        userId: formInterface.userId
    });
    await FormInterfaceRepository.update(id, userId, { triggerId: trigger.id });
}
```

---

### Step 4: Backend - Public File Upload Endpoint

**File**: `backend/src/api/routes/public/form-interface-files.ts` (new)

`POST /api/public/form-interfaces/:slug/upload`

- Rate limited: 20 uploads/min/IP
- Max file size: 25MB
- Max files per request: 1 (multiple requests for multiple files)
- Returns **gcsUri** + temporary signed URL (artifacts bucket is PRIVATE)
- Files stored in: `form-submissions/{formInterfaceId}/{sessionId}/{timestamp}_{filename}`

```typescript
// Key implementation details:
// - Use getArtifactsStorageService() (the "artifacts" bucket - PRIVATE)
// - Use gcsService.uploadBuffer() for upload
// - Return gcsUri for storage, plus signed URL for immediate workflow access
// - Session ID is a UUID generated client-side to group files for a single submission
// - Signed URL valid for 24 hours (enough for execution to complete)
```

**GCS Bucket Configuration:**

```
Buckets available:
- uploads (GCS_UPLOADS_BUCKET) - For public assets (icons, covers) - publicly readable
- knowledgeDocs (GCS_KNOWLEDGE_DOCS_BUCKET) - For KB documents - PRIVATE
- artifacts (GCS_ARTIFACTS_BUCKET) - For execution artifacts - PRIVATE ← USE THIS
```

**Why artifacts bucket:**

- Submission files are user data tied to a specific submission
- Should NOT be publicly accessible
- Similar to audio/image outputs from executions
- Owner can view via signed URLs in submissions dashboard

**Path Pattern:**
Follow existing pattern from `audio-output.ts`:

```typescript
const gcsService = getArtifactsStorageService();
const fileName = `form-submissions/${formInterfaceId}/${sessionId}/${Date.now()}_${sanitizedFilename}`;

const gcsUri = await gcsService.uploadBuffer(fileBuffer, {
    fileName,
    contentType: data.mimetype
});

// Generate signed URL valid for 24 hours (for execution access)
const signedUrl = await gcsService.getSignedDownloadUrl(gcsUri, 86400);

return {
    gcsUri, // Internal reference: gs://bucket/path
    downloadUrl: signedUrl, // Temporary URL for workflow/agent
    filename: data.filename,
    size: fileBuffer.length,
    mimeType: data.mimetype
};
```

**Access control:**

- Public submitters: Get signed URL during upload (valid 24h for execution)
- Form owner: Can generate new signed URLs via submissions dashboard
- Workflow/Agent: Uses signed URL passed in execution context

---

### Step 5: Backend - Execute Form Submission

**File**: `backend/src/api/routes/public/form-interfaces.ts` (modify submit handler)

Update `POST /api/public/form-interfaces/:slug/submit` to:

1. Validate submission data
2. Create submission record with files stored in JSONB
3. Execute based on target type:
    - **Workflow**: Use existing `executeTrigger()` with trigger_id
    - **Agent**: Use existing `executeAgent()` with agent_id
4. Return executionId for SSE subscription

**Request body from frontend:**

```typescript
{
  message: "User's message",
  files: [
    { fileName: "doc.pdf", fileSize: 12345, mimeType: "application/pdf",
      gcsUri: "gs://bucket/path", downloadUrl: "https://storage.googleapis.com/..." }
  ],
  urls: [{ url: "https://example.com", title: "Example" }]
}
```

**Submission record created:**

```typescript
const submission = await SubmissionRepository.create({
    interfaceId: formInterface.id,
    message: input.message,
    files: input.files, // JSONB array stored as-is
    urls: input.urls, // JSONB array stored as-is
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"],
    executionStatus: "running"
});
```

**Execution triggered:**

```typescript
// For workflows - pass file URLs as trigger inputs
const result = await executeTrigger(formInterface.triggerId, {
    message: input.message,
    files: input.files.map((f) => f.downloadUrl), // Public URLs
    urls: input.urls.map((u) => u.url)
});

// For agents - pass as message context
const result = await executeAgent(formInterface.agentId, {
    message: input.message,
    attachments: {
        files: input.files,
        urls: input.urls
    }
});

// Update submission with execution ID
await SubmissionRepository.update(submission.id, {
    executionId: result.executionId
});

return { submissionId: submission.id, executionId: result.executionId };
```

---

### Step 6: Backend - Public Execution Stream Endpoint

**File**: `backend/src/api/routes/public/form-interface-stream.ts` (new)

`GET /api/public/form-interfaces/:slug/submissions/:submissionId/stream`

- No auth required (public endpoint)
- Validates submission belongs to the form interface
- For workflows: Proxies to existing `/executions/:id/stream`
- For agents: Proxies to existing `/agents/:id/executions/:execId/stream`
- Updates submission status when execution completes

```typescript
// Key events to forward:
// - execution:started
// - execution:node_started / execution:node_completed (workflows)
// - agent:chunk / agent:message (agents)
// - execution:completed / execution:failed

// On completion, update submission:
await SubmissionRepository.update(submissionId, {
    executionStatus: status,
    output: finalOutput
});
```

---

### Step 7: Backend - Repository Updates

**File**: `backend/src/storage/repositories/FormInterfaceRepository.ts` (modify)

Add methods:

- `setTriggerId(id, userId, triggerId)` - Set trigger after creation
- `getBySlugWithTrigger(slug)` - Include trigger_id in public lookup

**File**: `backend/src/storage/repositories/FormInterfaceSubmissionRepository.ts` (modify)

Add methods:

- `updateExecutionStatus(id, status, output?)` - Update after execution
- `findByExecutionId(executionId)` - Lookup by execution

---

### Step 8: Frontend API - Add Execution Functions

**File**: `frontend/src/lib/api.ts` (additions)

```typescript
// Upload file to form interface (no auth)
export async function uploadFormInterfaceFile(
    slug: string,
    file: File
): Promise<ApiResponse<PublicFileUploadResponse>>;

// Submit form with execution (no auth)
export async function submitPublicFormInterface(
    slug: string,
    data: PublicFormSubmitInput
): Promise<ApiResponse<PublicFormSubmitResponse>>;

// Stream execution results (no auth, returns EventSource)
export function streamFormInterfaceExecution(
    slug: string,
    submissionId: string,
    onMessage: (event: ExecutionEvent) => void,
    onError: (error: Error) => void,
    onComplete: () => void
): () => void; // Returns cleanup function
```

---

### Step 9: Frontend - Public Form File Upload Component

**File**: `frontend/src/components/public-form-interface/FileUploader.tsx` (modify)

Update to upload immediately on file selection:

```typescript
import type { FormInterfaceFileAttachment } from "@flowmaestro/shared";

// State - store full file metadata for submission
const [uploadedFiles, setUploadedFiles] = useState<FormInterfaceFileAttachment[]>([]);
const [uploading, setUploading] = useState<Set<string>>(new Set());

// On file select - upload immediately
const handleFileSelect = async (files: File[]) => {
    for (const file of files) {
        setUploading((prev) => new Set(prev).add(file.name));

        const response = await uploadFormInterfaceFile(slug, file);

        if (response.success) {
            // Store full metadata returned from upload API
            setUploadedFiles((prev) => [
                ...prev,
                {
                    fileName: response.data.filename,
                    fileSize: response.data.size,
                    mimeType: response.data.mimeType,
                    gcsUri: response.data.gcsUri, // gs://bucket/path
                    downloadUrl: response.data.url // Public URL
                }
            ]);
        }

        setUploading((prev) => {
            const next = new Set(prev);
            next.delete(file.name);
            return next;
        });
    }
};

// Remove file (optional: could also delete from GCS)
const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
};
```

**Upload API response:**

```typescript
interface PublicFileUploadResponse {
    gcsUri: string; // Internal: gs://bucket/path (stored in DB)
    downloadUrl: string; // Signed URL valid for 24h (for workflow access)
    filename: string;
    size: number;
    mimeType: string;
}
```

UI shows:

- Upload progress indicator per file
- Uploaded files with name, size, and remove button
- Error state for failed uploads

---

### Step 10: Frontend - Public Form Execution Flow

**File**: `frontend/src/pages/PublicFormInterface.tsx` (modify)

Add execution states and SSE subscription:

```typescript
// States
const [submitting, setSubmitting] = useState(false);
const [executionState, setExecutionState] = useState<{
    status: "idle" | "running" | "completed" | "failed";
    submissionId?: string;
    output?: string;
    error?: string;
}>({ status: "idle" });

// Submit handler - sends full file metadata
const handleSubmit = async () => {
    setSubmitting(true);
    setExecutionState({ status: "running" });

    const response = await submitPublicFormInterface(slug, {
        message,
        files: uploadedFiles, // Full FormInterfaceFileAttachment[]
        urls: urlAttachments // FormInterfaceUrlAttachment[]
    });

    if (response.success) {
        // Subscribe to execution stream
        const cleanup = streamFormInterfaceExecution(
            slug,
            response.data.submissionId,
            (event) => {
                if (event.type === "completed") {
                    setExecutionState({
                        status: "completed",
                        submissionId: response.data.submissionId,
                        output: event.output
                    });
                }
                // Handle other events (progress, chunks for agents)
            },
            (error) => {
                setExecutionState({
                    status: "failed",
                    error: error.message
                });
            },
            () => setSubmitting(false)
        );

        // Cleanup on unmount
        return cleanup;
    }
};
```

---

### Step 11: Frontend - Output Display Component

**File**: `frontend/src/components/public-form-interface/OutputDisplay.tsx` (modify)

Update from placeholder to real output display:

```typescript
interface OutputDisplayProps {
    status: "idle" | "running" | "completed" | "failed";
    output?: string;
    error?: string;
    outputConfig: FormInterface["outputConfig"];
}

// Render based on status:
// - idle: Nothing (or output config placeholder)
// - running: Loading spinner with "Processing..."
// - completed: Formatted output (markdown support)
// - failed: Error message with retry option
```

Support output formatting based on outputConfig:

- Plain text
- Markdown (rendered)
- JSON (formatted/collapsible)

---

### Step 12: Backend - Submission File Download Endpoint

**File**: `backend/src/api/routes/form-interfaces/submission-files.ts` (new)

`GET /api/form-interfaces/:id/submissions/:submissionId/files/:fileIndex/download`

- Auth required (form owner only)
- Regenerates signed URL for viewing submission files
- Handles expired signed URLs (original 24h URLs may have expired)

```typescript
// Form owner viewing submission files (signed URLs may have expired)
const submission = await SubmissionRepository.findById(submissionId);
const file = submission.files[fileIndex];

// Generate fresh signed URL valid for 1 hour
const gcsService = getArtifactsStorageService();
const signedUrl = await gcsService.getSignedDownloadUrl(file.gcsUri, 3600);

return {
    url: signedUrl,
    filename: file.fileName,
    expiresIn: 3600
};
```

---

### Step 13: Backend - Submission Chunks Repository

**File**: `backend/src/storage/repositories/FormInterfaceSubmissionChunkRepository.ts` (new)

```typescript
// Repository for managing submission attachment chunks
export class FormInterfaceSubmissionChunkRepository {
    // Create chunks with embeddings
    async createChunks(submissionId: string, chunks: SubmissionChunk[]): Promise<void>;

    // Vector similarity search
    async searchSimilar(params: {
        submission_id: string;
        query_embedding: number[];
        top_k?: number;
        similarity_threshold?: number;
    }): Promise<SubmissionChunkSearchResult[]>;

    // Delete all chunks for a submission
    async deleteBySubmissionId(submissionId: string): Promise<void>;

    // Count chunks for a submission
    async countBySubmissionId(submissionId: string): Promise<number>;
}
```

---

### Step 14: Backend - Attachment Processing Workflow

**File**: `backend/src/temporal/workflows/form-submission-attachments.ts` (new)

Temporal workflow to process submission files and URLs into embeddings:

```typescript
export interface ProcessSubmissionAttachmentsInput {
    submissionId: string;
    formInterfaceId: string;
    files: FormInterfaceFileAttachment[];
    urls: FormInterfaceUrlAttachment[];
    userId: string; // Form owner's ID for embedding API access
}

export async function processSubmissionAttachmentsWorkflow(
    input: ProcessSubmissionAttachmentsInput
): Promise<{ success: boolean; chunkCount: number; error?: string }> {
    // 1. Update submission status to 'processing'
    await updateSubmissionAttachmentsStatusActivity(input.submissionId, "processing");

    let totalChunks = 0;

    // 2. Process each file
    for (const file of input.files) {
        const { chunkCount } = await processSubmissionFileActivity({
            submissionId: input.submissionId,
            file,
            userId: input.userId
        });
        totalChunks += chunkCount;
    }

    // 3. Process each URL
    for (const url of input.urls) {
        const { chunkCount } = await processSubmissionUrlActivity({
            submissionId: input.submissionId,
            url,
            userId: input.userId
        });
        totalChunks += chunkCount;
    }

    // 4. Update submission status to 'ready'
    await updateSubmissionAttachmentsStatusActivity(input.submissionId, "ready");

    return { success: true, chunkCount: totalChunks };
}
```

---

### Step 15: Backend - Attachment Processing Activities

**File**: `backend/src/temporal/activities/form-submission-attachments.ts` (new)

Activities for processing submission attachments:

```typescript
// Process a single file attachment
export async function processSubmissionFileActivity(input: {
    submissionId: string;
    file: FormInterfaceFileAttachment;
    sourceIndex: number;
    userId: string;
}): Promise<{ chunkCount: number }> {
    const gcsService = getArtifactsStorageService();
    const textExtractor = new TextExtractor();
    const textChunker = new TextChunker({ chunkSize: 1000, chunkOverlap: 200 });
    const embeddingService = new EmbeddingService();
    const chunkRepo = new FormInterfaceSubmissionChunkRepository();

    // 1. Download file from GCS to temp
    const tempPath = await gcsService.downloadToTemp({ gcsUri: file.gcsUri });

    // 2. Extract text
    const fileType = getFileTypeFromMimeType(file.mimeType);
    const { content } = await textExtractor.extractFromFile(tempPath, fileType);

    // 3. Chunk text
    const chunks = textChunker.chunkText(content, {
        source: file.fileName,
        sourceType: "file"
    });

    // 4. Generate embeddings
    const { embeddings } = await embeddingService.generateEmbeddings(
        chunks.map((c) => c.content),
        { model: "text-embedding-3-small", provider: "openai" },
        userId
    );

    // 5. Store chunks with embeddings
    await chunkRepo.createChunks(
        submissionId,
        chunks.map((chunk, i) => ({
            sourceType: "file",
            sourceName: file.fileName,
            sourceIndex: input.sourceIndex,
            content: chunk.content,
            chunkIndex: chunk.index,
            embedding: embeddings[i],
            metadata: chunk.metadata
        }))
    );

    // 6. Cleanup temp file
    await fs.unlink(tempPath);

    return { chunkCount: chunks.length };
}

// Process a single URL attachment
export async function processSubmissionUrlActivity(input: {
    submissionId: string;
    url: FormInterfaceUrlAttachment;
    sourceIndex: number;
    userId: string;
}): Promise<{ chunkCount: number }> {
    // Similar flow: fetch URL → extract text → chunk → embed → store
}
```

---

### Step 16: Backend - Submission Attachment Query Endpoint

**File**: `backend/src/api/routes/public/form-interface-query.ts` (new)

`POST /api/public/form-interfaces/:slug/submissions/:submissionId/query`

Public endpoint for querying submission attachments during execution:

```typescript
// Request: { query: string }
// Response: { results: [{ content, similarity, source }] }

// This endpoint is called by the workflow/agent to search submission attachments
// No auth required but must validate submissionId belongs to the form interface
```

---

### Step 17: Backend - Cleanup Trigger on Unpublish/Delete

**File**: `backend/src/api/routes/form-interfaces/unpublish.ts` (modify)
**File**: `backend/src/api/routes/form-interfaces/delete.ts` (modify)

When unpublishing or deleting a form interface with an auto-created trigger:

1. Check if trigger name starts with `__form_interface_`
2. If yes, delete the trigger (it was auto-created)
3. Clear trigger_id on form interface

---

## File Summary

| Category                    | Files     | Type            |
| --------------------------- | --------- | --------------- |
| Migration                   | 1         | New             |
| Shared Types                | 1         | Modify          |
| Backend Routes              | 6         | 4 New, 2 Modify |
| Backend Repository          | 3         | 1 New, 2 Modify |
| Backend Temporal Workflow   | 1         | New             |
| Backend Temporal Activities | 1         | New             |
| Frontend API                | 1         | Modify          |
| Frontend Components         | 2         | Modify          |
| Frontend Page               | 1         | Modify          |
| **Total**                   | ~17 files |                 |

---

## Key Integration Points

### Existing Infrastructure to Reuse

1. **Trigger Execution**: `backend/src/api/routes/triggers/execute.ts`
    - Already handles manual trigger execution
    - Returns executionId immediately

2. **Agent Execution**: `backend/src/api/routes/agents/execute.ts`
    - Handles agent execution with thread creation
    - Returns executionId immediately

3. **Workflow SSE**: `backend/src/api/routes/executions/stream.ts`
    - Uses SSEManager for real-time events
    - Handles node progress, completion, failure

4. **Agent SSE**: `backend/src/api/routes/agents/stream.ts`
    - Streams LLM responses in chunks
    - Handles message completion

5. **File Upload**: `backend/src/services/GCSStorageService.ts`
    - Streaming upload to GCS
    - Signed URL generation

6. **Text Extraction**: `backend/src/services/embeddings/TextExtractor.ts`
    - Extracts text from PDF, DOCX, TXT, HTML, JSON, CSV
    - Fetches and extracts from URLs

7. **Text Chunking**: `backend/src/services/embeddings/TextChunker.ts`
    - Splits text into chunks with overlap
    - Preserves sentence boundaries

8. **Embedding Generation**: `backend/src/services/embeddings/EmbeddingService.ts`
    - OpenAI text-embedding-3-small
    - Batched embedding generation

9. **Document Processing Workflow**: `backend/src/temporal/workflows/document-processor.ts`
    - Reference pattern for attachment processing workflow

---

## Validation & Error Handling

- **Rate Limiting**: 10 submissions/min/IP, 20 uploads/min/IP
- **File Validation**: Max 25MB, allowed types based on form config
- **Execution Timeout**: Use Temporal's built-in timeout handling
- **SSE Reconnection**: Frontend should auto-reconnect on disconnect
- **Orphaned Files**: Consider cleanup job for uploads never submitted

---

## Testing Checklist

### Execution Flow

1. [ ] Publish form → trigger auto-created
2. [ ] Submit form (workflow) → execution starts
3. [ ] Submit form (agent) → execution starts
4. [ ] SSE stream → receives progress events
5. [ ] Execution completes → output displayed
6. [ ] Execution fails → error displayed
7. [ ] Unpublish → trigger deleted

### File Upload & Storage

8. [ ] File upload → uploads to GCS artifacts bucket
9. [ ] Signed URL → valid for 24 hours
10. [ ] Owner can regenerate signed URLs for viewing submissions
11. [ ] Large file (>25MB) → rejected with error

### Embedding Pipeline (RAG)

12. [ ] File attachment → text extracted → chunks created → embeddings stored
13. [ ] URL attachment → fetched → text extracted → chunks created → embeddings stored
14. [ ] Submission query endpoint → returns relevant chunks
15. [ ] Agent/workflow can query submission attachments during execution
16. [ ] Submission delete → chunks deleted (CASCADE)

### Rate Limiting

17. [ ] 10 submissions/min/IP → blocks excessive requests
18. [ ] 20 uploads/min/IP → blocks excessive uploads
