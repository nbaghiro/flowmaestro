# Chat Interfaces - Phase 2 Implementation Plan

## Overview

Phase 2 adds execution integration to Chat Interfaces, enabling public chats (widget, embed, standalone) to connect to the existing agent thread system. This builds on Phase 1 (builder UI, sessions, public URLs).

**Key Differences from Form Interfaces:**

- **Agent-only** (no workflow support)
- **Multi-turn conversation** (not single input/output)
- **Three embed types**: Widget bubble, Iframe embed, Full-page (`/c/:slug`, `/embed/:slug`, widget JS)
- **Session-based persistence** (thread linked to session)
- **Existing thread system integration** (reuse `threads` + `agent_messages` tables)

**User Preferences:**

- **File handling**: Full RAG pipeline (extract, chunk, embed for semantic search)
- **Upload timing**: Immediate upload on file selection

---

## Architecture Summary

```
Chat Message Flow:
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ User sends   │────►│ Public API   │────►│ Agent        │
│ message      │     │ (session)    │     │ Orchestrator │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │             ┌──────▼──────┐             │
       │             │ Thread      │◄────────────┘
       │             │ (existing)  │
       │             └─────────────┘
       │                    │
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│ SSE Stream   │◄────│ Redis PubSub │
│ (tokens)     │     │ Events       │
└──────────────┘     └──────────────┘

Session-Thread Relationship:
┌─────────────────┐       ┌─────────────┐       ┌─────────────┐
│ chat_interface_ │──────►│   threads   │──────►│agent_messages│
│ sessions        │       │  (existing) │       │  (existing)  │
│ (thread_id FK)  │       └─────────────┘       └─────────────┘
└─────────────────┘
```

### Key Integration Points

1. **Session → Thread Link**: `chat_interface_sessions.thread_id` already references `threads(id)`
2. **Message Storage**: Use existing `agent_messages` table (no new table needed)
3. **SSE Streaming**: Use Redis Pub/Sub pattern from `agents/stream.ts`
4. **Agent Execution**: Reuse `agentOrchestratorWorkflow` with thread context

---

## Implementation Steps

### Step 1: Database Migration - Execution & Embedding Tables

**File**: `backend/migrations/XXXXXX_chat-interface-phase2.sql`

```sql
-- Add execution tracking to sessions
ALTER TABLE chat_interface_sessions
ADD COLUMN current_execution_id VARCHAR(255),
ADD COLUMN execution_status VARCHAR(50) DEFAULT 'idle';
-- execution_status: idle, running, completed, failed

-- Index for execution lookups
CREATE INDEX idx_chat_sessions_execution_id
ON chat_interface_sessions(current_execution_id)
WHERE current_execution_id IS NOT NULL;

-- =====================================================
-- MESSAGE ATTACHMENT CHUNKS TABLE (for RAG)
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_interface_message_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_interface_sessions(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,

    -- Source info
    source_type VARCHAR(20) NOT NULL,  -- 'file' | 'url'
    source_name VARCHAR(500),          -- filename or URL
    source_index INTEGER,              -- index in attachments array

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
CREATE INDEX idx_chat_message_chunks_session_id
ON chat_interface_message_chunks(session_id);

CREATE INDEX idx_chat_message_chunks_thread_id
ON chat_interface_message_chunks(thread_id);

-- Vector similarity index (HNSW for fast approximate search)
CREATE INDEX idx_chat_message_chunks_embedding
ON chat_interface_message_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Note**: Messages still use existing `agent_messages` table via `thread_id`. The chunks table stores embeddings for RAG queries during agent execution.

---

### Step 2: Shared Types - Add Execution Types

**File**: `shared/src/chat-interface.ts` (additions)

```typescript
// Add to ChatInterfaceSession
export interface ChatInterfaceSession {
    // ... existing fields
    currentExecutionId?: string;
    executionStatus: "idle" | "running" | "completed" | "failed";
}

// Message sending input
export interface SendChatMessageInput {
    message: string;
    attachments?: ChatMessageAttachment[];
}

// Attachment types
export interface ChatMessageAttachment {
    type: "file" | "url";
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    gcsUri?: string;
    downloadUrl?: string;
    url?: string;
}

// Send message response
export interface SendChatMessageResponse {
    executionId: string;
    threadId: string;
}
```

---

### Step 3: Backend - Upgrade Rate Limiter to Redis

**File**: `backend/src/api/middleware/chatInterfaceRateLimiter.ts` (rewrite)

Current: In-memory Map (doesn't scale to multi-instance)
New: Redis-based with session keys

```typescript
// Key pattern: chat-rate:{interfaceId}:{sessionToken}
// Use sliding window algorithm
// Default: 10 messages per minute per session
// Configurable per interface via rate_limit_messages, rate_limit_window_seconds

import { redis } from "../../services/redis";

export async function checkChatRateLimit(
    interfaceId: string,
    sessionToken: string,
    limit: number = 10,
    windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: number }>;
```

---

### Step 4: Backend - Send Message Endpoint (Core Execution)

**File**: `backend/src/api/routes/public/chat-interfaces.ts` (modify)

Update `POST /api/public/chat-interfaces/:slug/messages` to trigger agent execution:

```typescript
// Flow:
// 1. Validate session exists and is active
// 2. Get interface and agent
// 3. Check rate limit (Redis-based)
// 4. Get or create thread for this session
// 5. Load thread history for context
// 6. Create execution record
// 7. Update session with execution ID
// 8. Start Temporal workflow (agentOrchestratorWorkflow)
// 9. Increment message counts
// 10. Return { executionId, threadId, status: "running" }
```

**Key Implementation:**

```typescript
// Get or create thread for this session
let threadId = session.threadId;
if (!threadId) {
    const thread = await threadRepo.create({
        userId: chatInterface.userId, // Agent owner's ID
        agentId: agent.id,
        title: `Chat: ${chatInterface.name}`,
        metadata: {
            source: "chat_interface",
            interfaceId: chatInterface.id,
            sessionId: session.id
        }
    });
    threadId = thread.id;
    await sessionRepo.updateThreadId(session.id, threadId);
}

// Load thread history
const threadMessages = await executionRepo.getMessagesByThread(threadId);

// Create execution and start workflow
const execution = await executionRepo.create({
    agentId: agent.id,
    userId: chatInterface.userId,
    threadId,
    status: "running",
    threadHistory: threadMessages
});

await temporalClient.workflow.start(agentOrchestratorWorkflow, {
    taskQueue: "agent-queue",
    workflowId: `agent-execution-${execution.id}`,
    args: [
        {
            executionId: execution.id,
            agentId: agent.id,
            userId: chatInterface.userId,
            threadId,
            initialMessage: message,
            source: "chat_interface",
            interfaceId: chatInterface.id,
            sessionToken
        }
    ]
});
```

---

### Step 5: Backend - SSE Stream Endpoint

**File**: `backend/src/api/routes/public/chat-interface-stream.ts` (new)

`GET /api/public/chat-interfaces/:slug/stream`

Public SSE endpoint for streaming agent responses (same pattern as `agents/stream.ts`):

```typescript
// 1. Validate session
// 2. Verify interface matches
// 3. Set SSE headers
// 4. Send connected event
// 5. Subscribe to Redis channels for agent events:
//    - agent:events:token
//    - agent:events:message
//    - agent:events:tool_call_started/completed/failed
//    - agent:events:execution:completed/failed
// 6. Filter events by executionId/threadId
// 7. Keep-alive heartbeat (15s)
// 8. Auto-close on completion
```

---

### Step 6: Backend - Get Message History

**File**: `backend/src/api/routes/public/chat-interfaces.ts` (modify)

Update `GET /api/public/chat-interfaces/:slug/sessions/:token/messages`:

```typescript
// Current Phase 1: Returns empty array
// Phase 2: Returns actual thread messages

// 1. Validate session
// 2. If no thread yet, return empty
// 3. Get messages from thread via executionRepo.getMessagesByThread(threadId)
// 4. Transform to public format (id, role, content, timestamp, toolCalls)
```

---

### Step 7: Backend - File Upload Endpoint

**File**: `backend/src/api/routes/public/chat-interface-files.ts` (new)

`POST /api/public/chat-interfaces/:slug/upload`

```typescript
// Rate limited: 20 uploads/min/session
// Max file size: From interface config (default 10MB)
// Allowed types: From interface config
// Storage: GCS artifacts bucket (PRIVATE) with signed URLs

const gcsService = getArtifactsStorageService();
const fileName = `chat-attachments/${chatInterface.id}/${session.id}/${Date.now()}_${filename}`;

const gcsUri = await gcsService.uploadBuffer(fileBuffer, {
    fileName,
    contentType: data.mimetype
});

// Signed URL valid for 24 hours
const signedUrl = await gcsService.getSignedDownloadUrl(gcsUri, 86400);

return { gcsUri, downloadUrl: signedUrl, filename, size, mimeType };
```

---

### Step 8: Backend - Repository Updates

**File**: `backend/src/storage/repositories/ChatInterfaceSessionRepository.ts` (modify)

Add methods:

```typescript
// Update execution tracking
async updateExecutionStatus(sessionId: string, executionId: string | null, status: string): Promise<void>

// Get session with execution info
async findBySessionTokenWithExecution(token: string): Promise<SessionWithExecution | null>
```

---

### Step 9: Backend - Message Chunks Repository

**File**: `backend/src/storage/repositories/ChatInterfaceMessageChunkRepository.ts` (new)

```typescript
export class ChatInterfaceMessageChunkRepository {
    // Create chunks with embeddings
    async createChunks(sessionId: string, threadId: string, chunks: MessageChunk[]): Promise<void>;

    // Vector similarity search within session
    async searchSimilar(params: {
        session_id: string;
        query_embedding: number[];
        top_k?: number;
        similarity_threshold?: number;
    }): Promise<MessageChunkSearchResult[]>;

    // Delete all chunks for a session
    async deleteBySessionId(sessionId: string): Promise<void>;
}
```

---

### Step 10: Backend - Attachment Processing (on message send)

When a message with attachments is sent, process them inline before agent execution:

**File**: `backend/src/api/routes/public/chat-interfaces.ts` (in message handler)

```typescript
// After creating thread but before starting agent execution:
if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
        if (attachment.type === "file" && attachment.gcsUri) {
            // Download, extract, chunk, embed, store
            await processFileAttachment({
                sessionId: session.id,
                threadId,
                file: attachment,
                userId: chatInterface.userId
            });
        } else if (attachment.type === "url" && attachment.url) {
            // Fetch, extract, chunk, embed, store
            await processUrlAttachment({
                sessionId: session.id,
                threadId,
                url: attachment,
                userId: chatInterface.userId
            });
        }
    }
}
```

**Note**: Processing is synchronous before agent execution starts, so embeddings are available for RAG queries during execution.

---

### Step 11: Backend - Attachment Query Endpoint

**File**: `backend/src/api/routes/public/chat-interface-query.ts` (new)

`POST /api/public/chat-interfaces/:slug/query`

Query embeddings during agent execution:

```typescript
// Request: { sessionToken: string, query: string }
// Response: { results: [{ content, similarity, source }] }

// Validates session, generates query embedding, searches chunks
```

---

### Step 12: Frontend API - Add Execution Functions

**File**: `frontend/src/lib/api.ts` (additions)

```typescript
// Send message (triggers execution)
export async function sendChatInterfaceMessage(
    slug: string,
    sessionToken: string,
    message: string,
    attachments?: ChatMessageAttachment[]
): Promise<ApiResponse<SendChatMessageResponse>>;

// Stream execution (SSE)
export function streamChatInterfaceExecution(
    slug: string,
    sessionToken: string,
    callbacks: {
        onToken: (token: string) => void;
        onMessage: (message: ThreadMessage) => void;
        onToolCall: (toolCall: ToolCallEvent) => void;
        onCompleted: (result: CompletionResult) => void;
        onError: (error: Error) => void;
    }
): () => void; // Returns cleanup function

// Upload file (no auth, session-based)
export async function uploadChatInterfaceFile(
    slug: string,
    sessionToken: string,
    file: File
): Promise<ApiResponse<FileUploadResponse>>;

// Get message history
export async function getChatInterfaceMessages(
    slug: string,
    sessionToken: string
): Promise<ApiResponse<{ messages: PublicChatMessage[] }>>;
```

---

### Step 13: Frontend - Public Chat Store Update

**File**: `frontend/src/stores/publicChatStore.ts` (modify)

```typescript
interface PublicChatState {
    // Session
    sessionToken: string | null;
    threadId: string | null;
    slug: string | null;

    // Messages
    messages: PublicChatMessage[];
    streamingMessage: string;

    // Execution
    isExecuting: boolean;
    currentExecutionId: string | null;

    // File uploads
    pendingAttachments: ChatMessageAttachment[];
    uploadingFiles: Set<string>;

    // Actions
    initSession: (slug: string) => Promise<void>;
    sendMessage: (message: string) => Promise<void>;
    uploadFile: (file: File) => Promise<void>;
    removeAttachment: (index: number) => void;
    loadMessageHistory: () => Promise<void>;

    // SSE handling
    appendToken: (token: string) => void;
    finalizeMessage: (message: PublicChatMessage) => void;
}
```

Key flow:

1. `sendMessage` → adds user message to UI immediately
2. Calls API → receives executionId
3. Opens SSE stream → accumulates tokens
4. On completion → replaces streaming message with final

---

### Step 14: Frontend - Chat Components Update

**File**: `frontend/src/components/chat/public/MessageInput.tsx` (modify)

Add:

- File upload button (if `allowFileUpload`)
- Pending attachments display
- Upload progress indicators
- Disable input while executing

**File**: `frontend/src/components/chat/public/ChatMessage.tsx` (modify)

Add:

- Streaming message display (typing indicator)
- Attachment rendering
- Tool call status display

**File**: `frontend/src/components/chat/public/ChatContainer.tsx` (modify)

Add:

- SSE connection management
- Message history loading on mount
- Reconnection on disconnect
- Error state handling

---

### Step 15: Frontend - Widget Integration

**File**: `frontend/src/components/chat/widget/WidgetPanel.tsx` (modify)

Ensure widget panel uses same execution flow:

- Same store integration
- Same SSE streaming
- Compact UI for widget size

---

## File Summary

| Category            | Files     | Type                        |
| ------------------- | --------- | --------------------------- |
| Migration           | 1         | New                         |
| Shared Types        | 1         | Modify                      |
| Backend Routes      | 4         | 3 New, 1 Modify             |
| Backend Middleware  | 1         | Rewrite                     |
| Backend Repository  | 2         | 1 New, 1 Modify             |
| Backend Services    | 1         | New (attachment processing) |
| Frontend API        | 1         | Modify                      |
| Frontend Store      | 1         | Modify                      |
| Frontend Components | 4         | Modify                      |
| **Total**           | ~16 files |                             |

---

## Key Integration Points

### Existing Infrastructure to Reuse

1. **Agent Execution**: `backend/src/api/routes/agents/execute.ts`
    - Already handles thread context, tool execution
    - Pass `source: "chat_interface"` for tracking

2. **Agent Orchestrator Workflow**: `backend/src/temporal/workflows/agent-orchestrator.ts`
    - Handles full agent execution with tool calls
    - Already supports thread history

3. **Thread Repository**: `backend/src/storage/repositories/ThreadRepository.ts`
    - Create thread on first message
    - Load thread messages for context

4. **Agent Execution Repository**: `backend/src/storage/repositories/AgentExecutionRepository.ts`
    - `getMessagesByThread()` for history
    - `create()` for new executions

5. **Redis Event Bus**: `backend/src/services/events/RedisEventBus.ts`
    - Same pattern as `agents/stream.ts`
    - Subscribe to `agent:events:*` channels

6. **GCS Storage**: `backend/src/services/GCSStorageService.ts`
    - `getArtifactsStorageService()` for file uploads
    - `getSignedDownloadUrl()` for temporary access

7. **Text Extraction**: `backend/src/services/embeddings/TextExtractor.ts`
    - Extracts text from PDF, DOCX, TXT, HTML, JSON, CSV
    - Fetches and extracts from URLs

8. **Text Chunking**: `backend/src/services/embeddings/TextChunker.ts`
    - Splits text into chunks with overlap
    - Preserves sentence boundaries

9. **Embedding Generation**: `backend/src/services/embeddings/EmbeddingService.ts`
    - OpenAI text-embedding-3-small
    - Batched embedding generation

---

## Validation & Error Handling

- **Rate Limiting**: 10 messages/min/session (Redis-based, configurable)
- **File Upload**: 20 uploads/min/session, max size from config
- **Session Validation**: Check session exists and is active
- **Interface Validation**: Verify session belongs to interface
- **Execution Timeout**: Use Temporal's built-in timeout
- **SSE Reconnection**: Frontend auto-reconnect on disconnect

---

## Testing Checklist

### Session & Thread Integration

1. [ ] Create session → no thread initially
2. [ ] First message → thread created, linked to session
3. [ ] Session resume → same thread, message history loaded
4. [ ] Multiple sessions → separate threads per session

### Message Flow

5. [ ] Send message → execution starts
6. [ ] SSE stream → receives tokens
7. [ ] Message completes → stored in thread
8. [ ] Second message → includes first as context
9. [ ] Rate limit exceeded → 429 with retry-after

### File Upload

10. [ ] Upload file → stored in GCS artifacts
11. [ ] Signed URL → valid for 24 hours
12. [ ] File attached to message → visible in agent context
13. [ ] File type rejected → clear error

### Embed Types

14. [ ] Full page (`/c/:slug`) → works with execution
15. [ ] Iframe embed (`/embed/:slug`) → works with execution
16. [ ] Widget bubble → works with execution

### Embedding Pipeline (RAG)

17. [ ] File attachment → text extracted → chunks created → embeddings stored
18. [ ] URL attachment → fetched → text extracted → chunks created → embeddings stored
19. [ ] Query endpoint → returns relevant chunks by similarity
20. [ ] Agent can query attachment embeddings during execution
21. [ ] Session delete → chunks deleted (CASCADE)

### Error Handling

22. [ ] Session expired → clear error, prompt to refresh
23. [ ] Execution fails → error displayed, can retry
24. [ ] SSE disconnect → auto-reconnect
