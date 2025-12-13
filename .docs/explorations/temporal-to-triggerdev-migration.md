# Temporal to Trigger.dev Migration Plan

## Executive Summary

This plan outlines a complete migration from Temporal to self-hosted Trigger.dev for FlowMaestro's workflow orchestration. The migration will simplify the codebase, reduce infrastructure costs, and provide a more developer-friendly async code model while maintaining all existing functionality.

---

## Current State Analysis

### Temporal Usage in FlowMaestro

FlowMaestro uses Temporal for 6 distinct workflow types:

| Workflow                    | Purpose                                                      | Complexity |
| --------------------------- | ------------------------------------------------------------ | ---------- |
| `orchestratorWorkflow`      | Core node-based workflow execution with topological ordering | High       |
| `agentOrchestratorWorkflow` | ReAct-pattern AI agent with streaming and tool execution     | Very High  |
| `triggeredWorkflow`         | Wrapper for schedule/webhook/event-triggered executions      | Medium     |
| `processDocumentWorkflow`   | Document extraction, chunking, and embedding pipeline        | Medium     |
| `userInputWorkflow`         | Pause execution for user input via signals                   | Low        |
| `longRunningTaskWorkflow`   | Extended tasks with heartbeat monitoring                     | Low        |

### Key Temporal Features Used

1. **Activities with Retries** - Node executors with exponential backoff (3 attempts, 2x coefficient)
2. **Signals** - `userInputSignal`, `userMessageSignal` for external input
3. **Queries** - `hasReceivedInput` for state inspection
4. **Continue-as-New** - Agent workflow uses this every 50 iterations to manage history
5. **Workflow Cancellation** - Via `handle.terminate()`
6. **Timeouts** - 10-minute activity timeouts, 5-minute signal waits
7. **Event Emission** - Activities publish to Redis for WebSocket real-time updates

### Infrastructure Footprint

- Temporal Server (docker container)
- Temporal Worker (`orchestrator-worker.ts`)
- PostgreSQL (Temporal's backing store + app data)
- Redis (event pub/sub for WebSocket)

---

## Trigger.dev Concept Mapping

| Temporal Concept             | Trigger.dev Equivalent                                 |
| ---------------------------- | ------------------------------------------------------ |
| Workflow                     | Task                                                   |
| Activity                     | Inline async code or child task                        |
| Signal                       | `wait.forToken()` with `wait.completeToken()`          |
| Query                        | `runs.retrieve()` + metadata                           |
| Continue-as-New              | Not needed (Trigger.dev handles history automatically) |
| proxyActivities with retries | Task retry configuration                               |
| Workflow cancellation        | `runs.cancel()`                                        |
| Heartbeat                    | Automatic (checkpoint-based)                           |
| Event sourcing               | Realtime API + metadata updates                        |

---

## Migration Phases

### Phase 1: Infrastructure Setup

**Goal**: Set up self-hosted Trigger.dev alongside existing Temporal

#### 1.1 Docker Compose Configuration

Create `infra/docker/trigger-dev/docker-compose.yml`:

```yaml
services:
    trigger-webapp:
        image: ghcr.io/triggerdotdev/trigger.dev:latest
        ports:
            - "3030:3000"
        environment:
            - DATABASE_URL=postgresql://...
            - REDIS_URL=redis://...
            - TRIGGER_PROTOCOL=http
            - TRIGGER_DOMAIN=localhost:3030
        depends_on:
            - postgres
            - redis

    trigger-worker:
        image: ghcr.io/triggerdotdev/trigger.dev-worker:latest
        environment:
            - TRIGGER_API_URL=http://trigger-webapp:3000
            - TRIGGER_API_KEY=...
        volumes:
            - /var/run/docker.sock:/var/run/docker.sock
```

#### 1.2 Package Installation

```bash
npm install @trigger.dev/sdk @trigger.dev/react
```

#### 1.3 Trigger.dev Configuration

Create `backend/trigger.config.ts`:

```typescript
import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
    project: "flowmaestro",
    runtime: "node",
    logLevel: "info",
    retries: {
        enabledInDev: true,
        default: {
            maxAttempts: 3,
            factor: 2,
            minTimeoutInMs: 1000,
            maxTimeoutInMs: 60000
        }
    }
});
```

**Files to Create/Modify**:

- `infra/docker/trigger-dev/docker-compose.yml` (new)
- `backend/trigger.config.ts` (new)
- `backend/package.json` (add dependencies)
- `.env` (add TRIGGER\_\* variables)

---

### Phase 2: Core Task Definitions

**Goal**: Rewrite Temporal workflows as Trigger.dev tasks

#### 2.1 Orchestrator Task (Replaces `orchestratorWorkflow`)

Create `backend/src/trigger/tasks/orchestrator.ts`:

```typescript
import { task, metadata } from "@trigger.dev/sdk/v3";
import type { WorkflowDefinition, JsonObject } from "@flowmaestro/shared";

interface OrchestratorPayload {
    executionId: string;
    workflowDefinition: WorkflowDefinition;
    inputs?: JsonObject;
    userId?: string;
}

export const orchestratorTask = task({
    id: "orchestrator",
    maxDuration: 600, // 10 minutes
    retry: { maxAttempts: 3, factor: 2 },

    run: async (payload: OrchestratorPayload) => {
        const { executionId, workflowDefinition, inputs, userId } = payload;

        // Update metadata for real-time tracking
        await metadata.set("status", "running");
        await metadata.set("executionId", executionId);

        // Emit execution started (via metadata, consumed by frontend)
        await metadata.set("event", { type: "started", timestamp: Date.now() });

        // Build execution graph
        const graph = buildExecutionGraph(workflowDefinition);
        const context: JsonObject = { ...inputs };

        // Execute nodes topologically
        for (const node of graph.getExecutionOrder()) {
            await metadata.set("currentNode", node.id);
            await metadata.set("event", {
                type: "node_started",
                nodeId: node.id
            });

            try {
                const result = await executeNode(node, context, userId);
                context[node.id] = result;

                await metadata.append("completedNodes", node.id);
                await metadata.set("event", {
                    type: "node_completed",
                    nodeId: node.id,
                    output: result
                });
            } catch (error) {
                await metadata.set("event", {
                    type: "node_failed",
                    nodeId: node.id,
                    error: error.message
                });
                throw error;
            }
        }

        return { success: true, outputs: context };
    }
});
```

#### 2.2 Agent Orchestrator Task (Replaces `agentOrchestratorWorkflow`)

This is the most complex migration and requires **full feature parity** with the Temporal implementation:

**Features to Migrate**:

- Streaming LLM output via Trigger.dev Realtime Streams
- Signal-based user input via `wait.forToken()`
- Automatic history management (replaces continue-as-new)
- ReAct tool execution loop with span tracking
- Safety checks (PII detection, content moderation)
- Thread persistence with incremental saves
- Multiple LLM provider support (OpenAI, Anthropic, Google, etc.)

Create `backend/src/trigger/tasks/agent-orchestrator.ts`:

```typescript
import { task, wait, metadata, runs } from "@trigger.dev/sdk/v3";

interface AgentPayload {
    executionId: string;
    agentId: string;
    userId: string;
    threadId: string;
    initialMessage?: string;
}

export const agentOrchestratorTask = task({
    id: "agent-orchestrator",
    maxDuration: 3600, // 1 hour max

    run: async (payload: AgentPayload, { ctx }) => {
        const { agentId, userId, threadId, initialMessage } = payload;

        // Load agent config and thread history
        const agent = await getAgentConfig(agentId);
        const messages = await loadThreadHistory(threadId);

        if (initialMessage) {
            messages.push({ role: "user", content: initialMessage });
        }

        let iterations = 0;
        const maxIterations = agent.maxIterations || 100;

        // ReAct loop
        while (iterations < maxIterations) {
            iterations++;
            await metadata.set("iteration", iterations);

            // Call LLM (streaming handled via Realtime Streams)
            const response = await callLLMWithStreaming(agent, messages, ctx);

            messages.push({
                role: "assistant",
                content: response.content,
                tool_calls: response.toolCalls
            });

            // No tool calls = done
            if (!response.toolCalls?.length) {
                // Check if waiting for user input
                if (response.requiresUserInput) {
                    const token = await wait.createToken({
                        timeout: "5m",
                        idempotencyKey: `${payload.executionId}-user-input-${iterations}`
                    });

                    await metadata.set("waitingForInput", true);
                    await metadata.set("inputTokenUrl", token.url);

                    const userInput = await wait.forToken(token);

                    if (userInput.ok) {
                        messages.push({ role: "user", content: userInput.output.message });
                        await metadata.set("waitingForInput", false);
                        continue;
                    } else {
                        // Timeout
                        return {
                            success: false,
                            error: "User input timeout"
                        };
                    }
                }

                break; // Final answer
            }

            // Execute tools
            for (const toolCall of response.toolCalls) {
                await metadata.set("event", {
                    type: "tool_started",
                    tool: toolCall.function.name
                });

                const result = await executeToolCall(toolCall, agent);

                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result)
                });

                await metadata.set("event", {
                    type: "tool_completed",
                    tool: toolCall.function.name
                });
            }

            // Save incremental messages periodically
            if (iterations % 10 === 0) {
                await saveThreadIncremental(threadId, messages);
            }
        }

        // Final save
        await saveThreadIncremental(threadId, messages);

        return {
            success: true,
            iterations,
            finalMessage: messages[messages.length - 1]?.content
        };
    }
});
```

#### 2.3 Triggered Workflow Task (Replaces `triggeredWorkflow`)

```typescript
export const triggeredTask = task({
    id: "triggered-workflow",

    run: async (payload: {
        triggerId: string;
        workflowId: string;
        triggerPayload?: JsonObject;
    }) => {
        // Prepare execution
        const execution = await prepareTriggeredExecution(payload);

        // Trigger orchestrator and wait
        const result = await orchestratorTask.triggerAndWait({
            executionId: execution.id,
            workflowDefinition: execution.workflowDefinition,
            inputs: payload.triggerPayload
        });

        // Complete execution
        await completeTriggeredExecution(execution.id, result);

        return result;
    }
});
```

#### 2.4 Document Processing Task (Replaces `processDocumentWorkflow`)

```typescript
export const processDocumentTask = task({
    id: "process-document",
    maxDuration: 600,

    run: async (payload: ProcessDocumentPayload) => {
        const { documentId, knowledgeBaseId, filePath, fileType } = payload;

        await metadata.set("stage", "extracting");
        const text = await extractText(filePath, fileType);

        await metadata.set("stage", "chunking");
        const chunks = await chunkText(text);

        await metadata.set("stage", "embedding");
        await metadata.set("totalChunks", chunks.length);

        for (let i = 0; i < chunks.length; i++) {
            await generateAndStoreEmbedding(knowledgeBaseId, documentId, chunks[i]);
            await metadata.set("processedChunks", i + 1);
        }

        await markDocumentReady(documentId);

        return { documentId, success: true, chunkCount: chunks.length };
    }
});
```

#### 2.5 Scheduled Tasks (Replaces Temporal scheduler)

```typescript
import { schedules } from "@trigger.dev/sdk/v3";

export const scheduledTriggerTask = schedules.task({
    id: "scheduled-trigger",
    // Cron schedules are attached dynamically via SDK or declaratively

    run: async (payload) => {
        const { scheduleId, externalId } = payload;

        // Look up trigger by external ID
        const trigger = await getTriggerByScheduleId(scheduleId);

        if (trigger) {
            await triggeredTask.trigger({
                triggerId: trigger.id,
                workflowId: trigger.workflowId
            });
        }
    }
});
```

**Files to Create**:

- `backend/src/trigger/tasks/orchestrator.ts`
- `backend/src/trigger/tasks/agent-orchestrator.ts`
- `backend/src/trigger/tasks/triggered.ts`
- `backend/src/trigger/tasks/process-document.ts`
- `backend/src/trigger/tasks/scheduled.ts`
- `backend/src/trigger/tasks/index.ts` (exports all tasks)

---

### Phase 3: Node Executor Migration

**Goal**: Convert Temporal activities to regular async functions

The node executors are already pure functions - they just need minor refactoring to remove Temporal-specific patterns.

#### 3.1 Executor Refactoring

Current location: `backend/src/temporal/activities/node-executors/`
New location: `backend/src/trigger/executors/`

Changes needed:

1. Remove `proxyActivities` wrapper
2. Convert to direct async function calls
3. Keep retry logic at task level (not per-executor)

```typescript
// backend/src/trigger/executors/index.ts
export async function executeNode(
    node: WorkflowNode,
    context: JsonObject,
    userId?: string
): Promise<JsonObject> {
    switch (node.type) {
        case "http":
            return httpExecutor(node.config, context);
        case "llm":
            return llmExecutor(node.config, context, userId);
        case "transform":
            return transformExecutor(node.config, context);
        // ... etc
        default:
            throw new Error(`Unknown node type: ${node.type}`);
    }
}
```

**Files to Move/Refactor**:

- `backend/src/temporal/activities/node-executors/*.ts` → `backend/src/trigger/executors/*.ts`
- Remove Temporal-specific imports and patterns
- Keep business logic unchanged

---

### Phase 4: API Route Migration

**Goal**: Update API routes to use Trigger.dev SDK

#### 4.1 Execute Workflow Route

```typescript
// backend/src/api/routes/workflows/execute.ts
import { tasks } from "@trigger.dev/sdk/v3";
import { orchestratorTask } from "../../../trigger/tasks/orchestrator";

export async function executeWorkflowHandler(request, reply) {
    const { workflowDefinition, inputs } = request.body;
    const executionId = `exec-${Date.now()}-${randomString(6)}`;

    // Trigger task
    const handle = await orchestratorTask.trigger({
        executionId,
        workflowDefinition,
        inputs,
        userId: request.user.id
    });

    // For sync execution, wait for result
    const result = await handle.result();

    reply.send({ executionId, result });
}
```

#### 4.2 Cancel Execution Route

```typescript
// backend/src/api/routes/executions/cancel.ts
import { runs } from "@trigger.dev/sdk/v3";

export async function cancelExecutionHandler(request, reply) {
    const { id } = request.params;

    await runs.cancel(id);

    reply.send({ success: true });
}
```

#### 4.3 Submit User Input Route

```typescript
// backend/src/api/routes/executions/submit-input.ts
import { wait } from "@trigger.dev/sdk/v3";

export async function submitInputHandler(request, reply) {
    const { id } = request.params;
    const { userResponse, tokenId } = request.body;

    await wait.completeToken(tokenId, { message: userResponse });

    reply.send({ success: true });
}
```

**Files to Modify**:

- `backend/src/api/routes/workflows/execute.ts`
- `backend/src/api/routes/executions/cancel.ts`
- `backend/src/api/routes/executions/submit-input.ts`
- `backend/src/api/routes/agents/execute.ts`
- `backend/src/api/routes/agents/send-message.ts`
- `backend/src/api/routes/triggers/execute.ts`
- `backend/src/api/routes/knowledge-bases/upload-document.ts`

---

### Phase 5: Real-Time Updates Migration

**Goal**: Replace Redis pub/sub with Trigger.dev Realtime API

#### 5.1 WebSocket Integration

Current approach: Activities emit to Redis → API server subscribes → WebSocket broadcast

New approach: Frontend subscribes directly to Trigger.dev Realtime API

```typescript
// frontend/src/hooks/useExecutionStatus.ts
import { useRealtimeRun } from "@trigger.dev/react-hooks";

export function useExecutionStatus(runId: string) {
    const { run, error } = useRealtimeRun(runId);

    // run.metadata contains all status updates
    const currentNode = run?.metadata?.currentNode;
    const completedNodes = run?.metadata?.completedNodes || [];
    const event = run?.metadata?.event;

    return {
        status: run?.status,
        currentNode,
        completedNodes,
        event,
        error
    };
}
```

#### 5.2 Streaming LLM Output

```typescript
// frontend/src/hooks/useAgentStream.ts
import { useRealtimeRunWithStreams } from "@trigger.dev/react-hooks";

export function useAgentStream(runId: string) {
    const { run, streams } = useRealtimeRunWithStreams(runId, {
        accessToken: publicAccessToken
    });

    // streams.llmOutput contains streaming tokens
    const [fullResponse, setFullResponse] = useState("");

    useEffect(() => {
        if (streams.llmOutput) {
            for await (const chunk of streams.llmOutput) {
                setFullResponse((prev) => prev + chunk);
            }
        }
    }, [streams.llmOutput]);

    return { run, fullResponse };
}
```

#### 5.3 Remove Redis Event Bus

After migration, the Redis event bus for workflow events will be fully removed:

- `backend/src/shared/utils/redis-event-bus.ts` - DELETE
- `backend/src/temporal/activities/orchestration-events.ts` - DELETE
- `backend/src/api/routes/websocket.ts` - Remove workflow event subscriptions

Redis is still needed for:

- Session storage
- Caching
- Rate limiting

But no longer for real-time workflow events.

**Files to Modify**:

- `frontend/src/lib/websocket.ts` → Replace with Trigger.dev hooks
- `frontend/src/hooks/useExecution*.ts` → Use `useRealtimeRun`
- `backend/src/api/routes/websocket.ts` → Simplify or remove workflow events

---

### Phase 6: Scheduled Tasks Migration

**Goal**: Migrate cron triggers from custom scheduler to Trigger.dev schedules

#### 6.1 Declarative Schedules

For workflows with fixed schedules:

```typescript
// backend/src/trigger/tasks/scheduled.ts
export const dailyReportTask = schedules.task({
    id: "daily-report",
    cron: {
        pattern: "0 9 * * *",
        timezone: "America/New_York"
    },
    run: async () => {
        // Generate report
    }
});
```

#### 6.2 Dynamic Schedules (Per-User)

For user-defined triggers:

```typescript
// backend/src/api/routes/triggers/create.ts
import { schedules } from "@trigger.dev/sdk/v3";

export async function createTriggerHandler(request, reply) {
    const { workflowId, cronExpression, timezone } = request.body;

    // Create imperative schedule
    const schedule = await schedules.create({
        task: "triggered-workflow",
        cron: cronExpression,
        timezone,
        externalId: `trigger-${triggerId}`, // Links back to our trigger record
        deduplicationKey: triggerId
    });

    // Store schedule ID in trigger record
    await TriggerRepository.update(triggerId, {
        scheduleId: schedule.id
    });

    reply.send({ success: true });
}
```

**Files to Modify/Create**:

- `backend/src/trigger/tasks/scheduled.ts`
- `backend/src/api/routes/triggers/create.ts`
- `backend/src/api/routes/triggers/update.ts`
- `backend/src/api/routes/triggers/delete.ts` (cleanup schedule)
- Remove `backend/src/temporal/services/scheduler.ts`

---

### Phase 7: Observability Migration

**Goal**: Replace custom span system with Trigger.dev dashboard + OpenTelemetry

#### 7.1 Span Replacement

Trigger.dev provides built-in run visualization. For custom spans:

```typescript
// Use metadata for custom tracking
await metadata.set("span", {
    type: "model_generation",
    startTime: Date.now(),
    model: "gpt-4"
});

// ... do work ...

await metadata.set("span", {
    ...metadata.current().span,
    endTime: Date.now(),
    tokens: { input: 100, output: 50 }
});
```

#### 7.2 OpenTelemetry Integration (Optional)

For detailed tracing:

```typescript
// trigger.config.ts
import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
    project: "flowmaestro",
    telemetry: {
        exporters: [
            {
                type: "otlp",
                endpoint: process.env.OTEL_ENDPOINT
            }
        ]
    }
});
```

**Files to Evaluate**:

- `backend/src/temporal/activities/span-activities.ts` - May be simplified
- `backend/src/temporal/services/span-service.ts` - Review if still needed
- `backend/src/storage/repositories/SpanRepository.ts` - Keep for historical data

---

### Phase 8: Testing & Validation

#### 8.1 Unit Tests

Update test mocks:

```typescript
// tests/tasks/orchestrator.test.ts
import { orchestratorTask } from "../../src/trigger/tasks/orchestrator";

describe("orchestratorTask", () => {
    it("executes workflow nodes in order", async () => {
        const result = await orchestratorTask.run({
            executionId: "test-1",
            workflowDefinition: mockWorkflow,
            inputs: { value: 1 }
        });

        expect(result.success).toBe(true);
    });
});
```

#### 8.2 Integration Tests

Test against self-hosted Trigger.dev:

```typescript
// tests/integration/workflow-execution.test.ts
import { tasks } from "@trigger.dev/sdk/v3";

describe("Workflow Execution", () => {
    it("executes end-to-end", async () => {
        const handle = await orchestratorTask.trigger({
            executionId: "test-integration",
            workflowDefinition: sampleWorkflow,
            inputs: {}
        });

        const result = await handle.result();
        expect(result.success).toBe(true);
    });
});
```

---

### Phase 9: Infrastructure Cleanup

**Goal**: Remove Temporal infrastructure after successful migration

#### 9.1 Files to Delete

```
backend/src/temporal/
├── client.ts                           # DELETE
├── workflows.bundle.ts                 # DELETE
├── workflows/
│   ├── orchestrator-workflow.ts        # DELETE
│   ├── agent-orchestrator-workflow.ts  # DELETE
│   ├── triggered-workflow.ts           # DELETE
│   ├── process-document-workflow.ts    # DELETE
│   ├── user-input-workflow.ts          # DELETE
│   └── long-running-task-workflow.ts   # DELETE
├── activities/
│   ├── index.ts                        # DELETE (after migrating utilities)
│   ├── orchestration-events.ts         # DELETE
│   └── node-executors/                 # MOVE to trigger/executors
├── workers/
│   └── orchestrator-worker.ts          # DELETE
└── services/
    └── scheduler.ts                    # DELETE
```

#### 9.2 Docker Compose Updates

Remove from `docker-compose.yml`:

- `temporal` service
- `temporal-admin-tools` service
- `temporal-ui` service

Add:

- `trigger-webapp` service
- `trigger-worker` service

#### 9.3 Environment Variables

Remove:

- `TEMPORAL_ADDRESS`

Add:

- `TRIGGER_API_URL`
- `TRIGGER_API_KEY`
- `TRIGGER_SECRET_KEY`

---

## File Change Summary

### New Files (19)

| File                                              | Purpose                           |
| ------------------------------------------------- | --------------------------------- |
| `infra/docker/trigger-dev/docker-compose.yml`     | Trigger.dev self-hosted setup     |
| `backend/trigger.config.ts`                       | Trigger.dev project configuration |
| `backend/src/trigger/tasks/orchestrator.ts`       | Main workflow execution task      |
| `backend/src/trigger/tasks/agent-orchestrator.ts` | AI agent ReAct task               |
| `backend/src/trigger/tasks/triggered.ts`          | Trigger wrapper task              |
| `backend/src/trigger/tasks/process-document.ts`   | Document processing task          |
| `backend/src/trigger/tasks/scheduled.ts`          | Scheduled/cron tasks              |
| `backend/src/trigger/tasks/index.ts`              | Task exports                      |
| `backend/src/trigger/executors/index.ts`          | Node executor router              |
| `backend/src/trigger/executors/http.ts`           | HTTP executor                     |
| `backend/src/trigger/executors/llm.ts`            | LLM executor                      |
| `backend/src/trigger/executors/transform.ts`      | Transform executor                |
| `backend/src/trigger/executors/*.ts`              | Other executors (migrated)        |
| `frontend/src/hooks/useExecutionStatus.ts`        | Realtime run hook                 |
| `frontend/src/hooks/useAgentStream.ts`            | Streaming hook                    |

### Modified Files (12)

| File                                                        | Changes                           |
| ----------------------------------------------------------- | --------------------------------- |
| `backend/package.json`                                      | Add @trigger.dev/sdk              |
| `frontend/package.json`                                     | Add @trigger.dev/react-hooks      |
| `backend/src/api/routes/workflows/execute.ts`               | Use Trigger.dev SDK               |
| `backend/src/api/routes/executions/cancel.ts`               | Use runs.cancel()                 |
| `backend/src/api/routes/executions/submit-input.ts`         | Use wait.completeToken()          |
| `backend/src/api/routes/agents/execute.ts`                  | Trigger agent task                |
| `backend/src/api/routes/agents/send-message.ts`             | Use wait.completeToken()          |
| `backend/src/api/routes/triggers/*.ts`                      | Use schedules API                 |
| `backend/src/api/routes/knowledge-bases/upload-document.ts` | Trigger document task             |
| `docker-compose.yml`                                        | Replace Temporal with Trigger.dev |
| `.env` / `.env.example`                                     | Update environment variables      |

### Deleted Files (15+)

All files under `backend/src/temporal/` except utilities that are moved.

---

## Risk Assessment & Mitigations

### Risk 1: Self-Hosted Complexity

**Risk**: Trigger.dev self-hosting is marked as "legacy v3 guide" with caveats
**Mitigation**:

- Start with cloud during development/testing
- Evaluate self-hosted stability before production deployment
- Consider hybrid: cloud for dev, self-hosted for prod

### Risk 2: Continue-as-New Replacement

**Risk**: Agent workflow relies on continue-as-new for history management
**Mitigation**: Trigger.dev handles this automatically via checkpointing. Test with long-running agent conversations to verify.

### Risk 3: Signal Timing

**Risk**: `wait.forToken()` may have different timing semantics than Temporal signals
**Mitigation**:

- Add explicit timeouts to all token waits
- Implement token URL storage in database for recovery
- Test edge cases (multiple rapid signals, timeout recovery)

### Risk 4: Real-Time Update Latency

**Risk**: Switching from Redis pub/sub to Trigger.dev Realtime may change latency characteristics
**Mitigation**:

- Benchmark latency during testing phase
- Use Trigger.dev Streams for high-frequency data (LLM tokens)
- Implement client-side buffering if needed for smooth UI updates

---

## Estimated Effort

| Phase                    | Complexity | Dependencies |
| ------------------------ | ---------- | ------------ |
| Phase 1: Infrastructure  | Low        | None         |
| Phase 2: Core Tasks      | High       | Phase 1      |
| Phase 3: Node Executors  | Medium     | Phase 2      |
| Phase 4: API Routes      | Medium     | Phases 2, 3  |
| Phase 5: Real-Time       | Medium     | Phase 4      |
| Phase 6: Scheduled Tasks | Low        | Phase 2      |
| Phase 7: Observability   | Low        | Phase 4      |
| Phase 8: Testing         | Medium     | All above    |
| Phase 9: Cleanup         | Low        | Phase 8      |

---

## Success Criteria

1. All existing workflow types execute correctly
2. Real-time updates work in frontend
3. Scheduled triggers execute on time
4. Agent streaming works end-to-end
5. User input flow completes successfully
6. Document processing pipeline works
7. Cancellation terminates running tasks
8. No regression in execution reliability
