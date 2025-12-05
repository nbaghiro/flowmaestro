# Agent Thread Token Counting Specification

## Overview

Add real-time token counting with cost estimates to agent thread chats. Display in thread header: "1,234 tokens ($0.05)", updating live as the agent responds.

## Architecture

FlowMaestro already captures token usage from LLM API calls (OpenAI, Anthropic) and stores it in `execution_spans` table with automatic cost calculation via the span-based observability system. This spec aggregates token data at the thread level and streams updates to the UI.

### Design Decisions

- **Token Aggregation:** Query all `MODEL_GENERATION` spans for the thread after each LLM call, update `thread.metadata.tokenUsage`
- **Storage:** Use existing `thread.metadata` JSONB field (no schema changes needed)
- **Real-time Updates:** Emit new `thread:tokens:updated` streaming event via existing Redis/SSE infrastructure
- **Cost Calculation:** Leverage existing `CostCalculator` with pricing database for all models
- **Historical Threads:** Lazy calculation on-demand (fallback to querying spans if metadata empty)

## Data Structures

### Thread Metadata Structure

```typescript
// Thread.metadata JSONB field
{
  tokenUsage: {
    promptTokens: number,
    completionTokens: number,
    totalTokens: number,
    totalCost: number,          // USD
    lastUpdatedAt: string,       // ISO timestamp
    executionCount: number       // How many executions contributed
  }
}
```

### New Streaming Event Type

```typescript
export interface TokensUpdatedEvent extends BaseStreamingEvent {
    type: "thread:tokens:updated";
    tokenUsage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        totalCost: number;
        lastUpdatedAt: string;
    };
}
```

### Type Definitions

```typescript
// shared/src/index.ts or backend/src/storage/models/Thread.ts
export interface ThreadTokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    totalCost: number;
    lastUpdatedAt: string;
    executionCount: number;
}

export interface ThreadMetadata extends JsonObject {
    tokenUsage?: ThreadTokenUsage;
}
```

## Implementation

### 1. Backend - Token Aggregation Activity

**File:** `backend/src/temporal/activities/agent/thread-activities.ts`

Add `updateThreadTokens()` activity that:

1. Queries all `MODEL_GENERATION` spans for the thread's executions
2. Aggregates token counts and costs from span attributes
3. Updates `thread.metadata.tokenUsage` with JSONB merge
4. Emits `thread:tokens:updated` streaming event

```typescript
export async function updateThreadTokens(input: {
    threadId: string;
    executionId: string;
}): Promise<void> {
    const { threadId, executionId } = input;

    // Query all MODEL_GENERATION spans for this thread
    const result = await db.query<{
        prompt_tokens: string;
        completion_tokens: string;
        total_tokens: string;
        total_cost: string;
        execution_count: string;
    }>(
        `
        SELECT
            COALESCE(SUM((s.attributes->>'promptTokens')::int), 0) as prompt_tokens,
            COALESCE(SUM((s.attributes->>'completionTokens')::int), 0) as completion_tokens,
            COALESCE(SUM((s.attributes->>'totalTokens')::int), 0) as total_tokens,
            COALESCE(SUM((s.attributes->>'totalCost')::numeric), 0) as total_cost,
            COUNT(DISTINCT e.id) as execution_count
        FROM flowmaestro.execution_spans s
        INNER JOIN flowmaestro.agent_executions e ON s.trace_id = e.id
        WHERE e.thread_id = $1
          AND s.span_type = 'model_generation'
          AND s.attributes ? 'totalTokens'
        `,
        [threadId]
    );

    const tokenUsage = {
        promptTokens: parseInt(result.rows[0].prompt_tokens, 10),
        completionTokens: parseInt(result.rows[0].completion_tokens, 10),
        totalTokens: parseInt(result.rows[0].total_tokens, 10),
        totalCost: parseFloat(result.rows[0].total_cost),
        lastUpdatedAt: new Date().toISOString(),
        executionCount: parseInt(result.rows[0].execution_count, 10)
    };

    // Update thread metadata
    await db.query(
        `
        UPDATE flowmaestro.threads
        SET metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{tokenUsage}',
            $2::jsonb
        )
        WHERE id = $1
        `,
        [threadId, JSON.stringify(tokenUsage)]
    );

    console.log(
        `[ThreadTokens] Updated thread ${threadId}: ${tokenUsage.totalTokens} tokens ` +
            `(${tokenUsage.executionCount} executions, $${tokenUsage.totalCost.toFixed(4)})`
    );

    // Emit streaming event
    await emitTokensUpdated({
        threadId,
        executionId,
        tokenUsage
    });
}
```

**Export:** Add to `backend/src/temporal/activities/index.ts`

---

### 2. Backend - Streaming Event Emitter

**File:** `backend/src/temporal/activities/agent/streaming-events.ts`

Add function to publish token update events to Redis:

```typescript
export async function emitTokensUpdated(input: {
    threadId: string;
    executionId: string;
    tokenUsage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        totalCost: number;
        lastUpdatedAt: string;
    };
}): Promise<void> {
    const event: TokensUpdatedEvent = {
        type: "thread:tokens:updated",
        timestamp: Date.now(),
        threadId: input.threadId,
        executionId: input.executionId,
        tokenUsage: input.tokenUsage
    };

    await publishWithRetry(input.threadId, event);
    console.log(
        `[Streaming] Tokens updated: ${input.tokenUsage.totalTokens} total ` +
            `(thread: ${input.threadId})`
    );
}
```

Publishes to Redis channel: `thread:{threadId}`

---

### 3. Backend - Workflow Integration

**File:** `backend/src/temporal/workflows/agent-orchestrator-workflow.ts`

#### a) Proxy the new activity (around line 20-35)

```typescript
const {
    getAgentConfig,
    callLLM,
    executeToolCall,
    saveThreadIncremental,
    validateInput,
    validateOutput,
    createSpan,
    endSpan,
    updateThreadTokens // ADD THIS
} = proxyActivities<typeof activities>({
    startToCloseTimeout: "10 minutes",
    retry: {
        maximumAttempts: 3,
        backoffCoefficient: 2
    }
});
```

#### b) Call after LLM response (after line ~394, after `endSpan()` with token usage)

```typescript
// End MODEL_GENERATION span with success and token usage
await endSpan({
    spanId: modelGenSpanId,
    output: {
        content: llmResponse.content,
        hasToolCalls: !!(llmResponse.tool_calls && llmResponse.tool_calls.length > 0)
    },
    attributes: {
        responseLength: llmResponse.content.length,
        toolCallCount: llmResponse.tool_calls?.length || 0,
        // Token usage for cost tracking
        ...(llmResponse.usage && {
            promptTokens: llmResponse.usage.promptTokens,
            completionTokens: llmResponse.usage.completionTokens,
            totalTokens: llmResponse.usage.totalTokens
        })
    }
});

// NEW: Update thread token count after each LLM call
if (llmResponse.usage) {
    try {
        await updateThreadTokens({
            threadId,
            executionId
        });
    } catch (error) {
        console.error("[Agent] Failed to update thread tokens:", error);
        // Don't fail execution, just log error
    }
}
```

---

### 4. Shared - Streaming Event Types

**File:** `shared/src/types/streaming-events.ts`

Add new event type and update unions:

```typescript
export interface TokensUpdatedEvent extends BaseStreamingEvent {
    type: "thread:tokens:updated";
    tokenUsage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        totalCost: number;
        lastUpdatedAt: string;
    };
}

// Update type union
export type StreamingEventType =
    | "thread:message:start"
    | "thread:message:token"
    | "thread:message:complete"
    | "thread:message:error"
    | "thread:thinking"
    | "thread:tool:started"
    | "thread:tool:completed"
    | "thread:tool:failed"
    | "thread:tokens:updated"; // ADD THIS

// Update event union
export type ThreadStreamingEvent =
    | MessageStartEvent
    | MessageTokenEvent
    | MessageCompleteEvent
    | MessageErrorEvent
    | ThinkingEvent
    | ToolStartedEvent
    | ToolCompletedEvent
    | ToolFailedEvent
    | TokensUpdatedEvent; // ADD THIS
```

---

### 5. Backend - Repository Helper (Optional)

**File:** `backend/src/storage/repositories/ThreadRepository.ts`

Add helper method for lazy token calculation:

```typescript
/**
 * Get thread token usage from metadata, with fallback to querying spans
 * for threads that don't have metadata populated yet
 */
async getTokenUsage(threadId: string): Promise<{
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    totalCost: number;
} | null> {
    const thread = await this.findById(threadId);
    if (!thread) {
        return null;
    }

    // Check metadata first (cached value)
    const metadata = thread.metadata as ThreadMetadata;
    if (metadata.tokenUsage) {
        return {
            promptTokens: metadata.tokenUsage.promptTokens,
            completionTokens: metadata.tokenUsage.completionTokens,
            totalTokens: metadata.tokenUsage.totalTokens,
            totalCost: metadata.tokenUsage.totalCost
        };
    }

    // Fallback: Query spans directly (for old threads)
    const result = await db.query<{
        prompt_tokens: string;
        completion_tokens: string;
        total_tokens: string;
        total_cost: string;
    }>(
        `
        SELECT
            COALESCE(SUM((s.attributes->>'promptTokens')::int), 0) as prompt_tokens,
            COALESCE(SUM((s.attributes->>'completionTokens')::int), 0) as completion_tokens,
            COALESCE(SUM((s.attributes->>'totalTokens')::int), 0) as total_tokens,
            COALESCE(SUM((s.attributes->>'totalCost')::numeric), 0) as total_cost
        FROM flowmaestro.execution_spans s
        INNER JOIN flowmaestro.agent_executions e ON s.trace_id = e.id
        WHERE e.thread_id = $1
          AND s.span_type = 'model_generation'
          AND s.attributes ? 'totalTokens'
        `,
        [threadId]
    );

    return {
        promptTokens: parseInt(result.rows[0].prompt_tokens, 10),
        completionTokens: parseInt(result.rows[0].completion_tokens, 10),
        totalTokens: parseInt(result.rows[0].total_tokens, 10),
        totalCost: parseFloat(result.rows[0].total_cost)
    };
}
```

---

### 6. Frontend - API Client Updates

**File:** `frontend/src/lib/api.ts`

#### a) Update StreamingCallbacks interface

```typescript
export interface StreamingCallbacks {
    onConnected?: () => void;
    onToken?: (token: string) => void;
    onMessage?: (message: ThreadMessage) => void;
    onToolCallStarted?: (data: { toolName: string; arguments: JsonObject }) => void;
    onToolCallCompleted?: (data: { toolName: string; result: JsonObject }) => void;
    onToolCallFailed?: (data: { toolName: string; error: string }) => void;
    onCompleted?: (data: { finalMessage: string; iterations: number }) => void;
    onError?: (error: string) => void;
    onTokensUpdated?: (data: {
        // ADD THIS
        tokenUsage: {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
            totalCost: number;
            lastUpdatedAt: string;
        };
    }) => void;
}
```

#### b) Add event listener in streamAgentExecution()

```typescript
// Add this event listener alongside existing ones
eventSource.addEventListener("thread:tokens:updated", (event) => {
    const data = JSON.parse(event.data);
    callbacks.onTokensUpdated?.(data);
});
```

---

### 7. Frontend - ThreadChat Component

**File:** `frontend/src/components/agents/ThreadChat.tsx`

#### a) Add state (after line ~46)

```typescript
const [tokenUsage, setTokenUsage] = useState<{
    totalTokens: number;
    totalCost: number;
} | null>(null);
```

#### b) Load initial token count (in useEffect after line ~69)

```typescript
useEffect(() => {
    const loadMessages = async () => {
        try {
            const response = await api.getThreadMessages(thread.id);
            if (response.success && response.data.messages) {
                setMessages(response.data.messages);
            }

            // Load initial token usage from thread metadata
            if (thread.metadata?.tokenUsage) {
                setTokenUsage({
                    totalTokens: thread.metadata.tokenUsage.totalTokens,
                    totalCost: thread.metadata.tokenUsage.totalCost
                });
            }
        } catch (error) {
            console.error("Failed to load thread messages:", error);
            setMessages([]);
        }
    };

    loadMessages();
}, [thread.id, thread.metadata]);
```

#### c) Handle streaming updates (add to SSE callbacks ~line 218)

```typescript
const cleanup = streamAgentExecution(agent.id, executionId, {
    onConnected: () => {
        /* ... */
    },
    onToken: (token: string) => {
        /* ... */
    },
    // ... other callbacks
    onTokensUpdated: (data) => {
        // ADD THIS
        setTokenUsage({
            totalTokens: data.tokenUsage.totalTokens,
            totalCost: data.tokenUsage.totalCost
        });
    }
});
```

#### d) Update header UI (modify lines 292-297)

```typescript
<div>
    <p className="text-sm font-medium text-foreground">
        {thread.title || `Thread ${thread.id.slice(0, 8)}`}
    </p>
    <p className="text-xs text-muted-foreground">
        {currentExecution && currentExecution.thread_id === thread.id
            ? "Active conversation"
            : "Ready to continue"}
        {tokenUsage && tokenUsage.totalTokens > 0 && (
            <>
                {" • "}
                {tokenUsage.totalTokens.toLocaleString()} tokens
                {tokenUsage.totalCost > 0 && (
                    <> (${tokenUsage.totalCost.toFixed(4)})</>
                )}
            </>
        )}
    </p>
</div>
```

---

### 8. Frontend - AgentChat Component

**File:** `frontend/src/components/agents/AgentChat.tsx`

Apply identical changes as ThreadChat:

1. Add `tokenUsage` state (after line ~46)
2. Load from thread metadata (in useEffect after line ~75-111)
3. Handle `onTokensUpdated` callback (in SSE setup ~line 220)
4. Display in header (modify lines 342-344)

The header display code is the same as ThreadChat:

```typescript
<p className="text-xs text-muted-foreground">
    {currentExecution
        ? "Active thread"
        : "Ready to chat"}
    {tokenUsage && tokenUsage.totalTokens > 0 && (
        <>
            {" • "}
            {tokenUsage.totalTokens.toLocaleString()} tokens
            {tokenUsage.totalCost > 0 && (
                <> (${tokenUsage.totalCost.toFixed(4)})</>
            )}
        </>
    )}
</p>
```

---

## Data Flow

```
1. User sends message to agent
2. Workflow calls LLM (OpenAI/Anthropic)
3. LLM returns usage: { promptTokens, completionTokens, totalTokens }
4. Span created with token usage → execution_spans table
5. SpanService auto-calculates cost → span.attributes.totalCost
6. updateThreadTokens() activity:
   - Queries all MODEL_GENERATION spans for thread
   - Aggregates tokens and costs
   - Updates thread.metadata.tokenUsage
   - Emits thread:tokens:updated event
7. Redis pub/sub forwards event to SSE clients
8. Frontend receives event → updates header in real-time
```

## Edge Cases

### Missing Token Usage from LLM

Some LLM calls might not return token usage (errors, unsupported models).

**Solution:** Check `if (llmResponse.usage)` before calling `updateThreadTokens()`. Skip gracefully.

### Old Threads Without Metadata

Threads created before this feature won't have `metadata.tokenUsage`.

**Solution:** `ThreadRepository.getTokenUsage()` falls back to querying spans. Lazy calculation on first access.

### Concurrent Executions

Multiple executions in the same thread running simultaneously.

**Solution:** Query aggregates ALL spans for the thread (idempotent). Last write wins (acceptable).

### Zero Tokens

Non-LLM executions or threads with no spans.

**Solution:** Query returns 0 tokens. UI checks `totalTokens > 0` before displaying.

### Cost Calculation Failures

Model not in pricing table, cost calculation fails.

**Solution:** If `totalCost` is 0 or undefined, display tokens only: "1,234 tokens"

---

## Files to Modify

### Backend (5 files)

1. `backend/src/temporal/activities/agent/thread-activities.ts` - Add `updateThreadTokens()` function
2. `backend/src/temporal/activities/agent/streaming-events.ts` - Add `emitTokensUpdated()` function
3. `backend/src/temporal/workflows/agent-orchestrator-workflow.ts` - Proxy activity, call after LLM
4. `backend/src/temporal/activities/index.ts` - Export new activity
5. `backend/src/storage/repositories/ThreadRepository.ts` - Add `getTokenUsage()` helper (optional)

### Shared (2 files)

6. `shared/src/types/streaming-events.ts` - Add `TokensUpdatedEvent`, update unions
7. `shared/src/index.ts` or `backend/src/storage/models/Thread.ts` - Add `ThreadTokenUsage` interface

### Frontend (3 files)

8. `frontend/src/lib/api.ts` - Add `onTokensUpdated` callback, add event listener
9. `frontend/src/components/agents/ThreadChat.tsx` - State, loading, streaming, UI
10. `frontend/src/components/agents/AgentChat.tsx` - Same changes as ThreadChat

---

## Key Implementation Notes

- **No schema changes required** - Uses existing `thread.metadata` JSONB field
- **Leverages existing infrastructure** - Span-based observability, Redis/SSE streaming
- **Incremental updates** - Token count updates after each LLM call, not batched
- **Real-time** - Streams to UI via existing SSE infrastructure
- **Backward compatible** - Old threads fallback to querying spans on-demand
- **Error resilient** - Token update failures don't block workflow execution
