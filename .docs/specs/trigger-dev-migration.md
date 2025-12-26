# Trigger.dev Migration Spec

## Executive Summary

This document outlines the migration of FlowMaestro's workflow execution engine from **Temporal** to **Trigger.dev**. Trigger.dev v3/v4 offers a TypeScript-native approach to durable execution with simpler infrastructure, built-in realtime streaming, and checkpoint-based resource efficiency.

**Key Decision: Replace Temporal with Trigger.dev**

| Aspect                   | Temporal (Current)                    | Trigger.dev (Proposed)           |
| ------------------------ | ------------------------------------- | -------------------------------- |
| **Language**             | Multi-language (Go, Java, TS, Python) | TypeScript-first                 |
| **Infrastructure**       | Temporal Server + Workers             | Single supervisor (Docker/K8s)   |
| **Durability**           | Event sourcing + replay               | Checkpoint-restore system        |
| **Streaming**            | Manual (Redis pub/sub)                | Built-in Realtime API            |
| **LLM Support**          | Manual implementation                 | Native AI SDK integration        |
| **Self-hosting**         | Complex (multiple services)           | Simple (Docker Compose or Helm)  |
| **Developer Experience** | Steep learning curve                  | TypeScript-native, lower barrier |

---

## Why Trigger.dev?

### 1. Simpler Infrastructure

**Temporal** requires:

- Temporal Server (Go binary)
- PostgreSQL for persistence
- Elasticsearch (optional, for visibility)
- Worker processes (multiple)
- Understanding of determinism constraints

**Trigger.dev** requires:

- Single supervisor process
- PostgreSQL
- Redis
- Built-in container registry and object storage

### 2. Checkpoint-Restore vs Event Sourcing

**Temporal's Model:**

- Records every event in workflow history
- Replays entire history on worker restart
- Requires deterministic code (no side effects)
- History grows unbounded for long-running workflows

**Trigger.dev's Model:**

- Checkpoints task state at wait points
- Resumes from last checkpoint (no replay)
- No determinism constraints
- Efficient for long-running tasks with waits

### 3. Native Realtime & LLM Streaming

Trigger.dev provides built-in realtime APIs that eliminate the need for our custom Redis pub/sub implementation:

```typescript
// Subscribe to run updates from frontend
const { run, error } = useRealtimeRun(runId);

// Stream LLM responses directly to frontend
const stream = await streams.pipe("llm-output", result.textStream);
```

### 4. TypeScript-Native Developer Experience

- Tasks are just TypeScript functions
- No workflow/activity split required
- Type-safe payloads and results
- Subtasks with `triggerAndWait()`
- Batch processing with `batchTriggerAndWait()`

---

## Trigger.dev Core Concepts

### Tasks (Replaces Temporal Workflows + Activities)

```typescript
import { task } from "@trigger.dev/sdk/v3";

export const executeWorkflow = task({
    id: "execute-workflow",
    retry: {
        maxAttempts: 3,
        factor: 2,
        minTimeoutInMs: 1000,
        maxTimeoutInMs: 30000
    },
    queue: {
        concurrencyLimit: 10
    },
    run: async (payload: WorkflowExecutionPayload) => {
        // Long-running code - no timeouts
        const result = await executeNodes(payload);
        return result;
    }
});
```

### Subtasks (Replaces Temporal Child Workflows)

```typescript
export const parentTask = task({
    id: "orchestrator",
    run: async (payload: WorkflowPayload) => {
        // Trigger subtask and wait for result
        const result = await executeNode.triggerAndWait({
            nodeId: "node-1",
            config: payload.nodes["node-1"]
        });

        // Result is checkpointed - parent doesn't consume resources while waiting
        return result;
    }
});

export const executeNode = task({
    id: "execute-node",
    run: async (payload: NodePayload) => {
        // Execute single node
        return await runNodeLogic(payload);
    }
});
```

### Wait Functions (Replaces Temporal Signals/Timers)

```typescript
import { wait } from "@trigger.dev/sdk/v3";

export const approvalWorkflow = task({
    id: "approval-workflow",
    run: async (payload: ApprovalPayload) => {
        // Wait for a duration (checkpointed, no resource consumption)
        await wait.for({ hours: 24 });

        // Wait until a specific time
        await wait.until({ date: payload.deadline });

        // Wait for external event via waitpoint token
        const approval = await wait.forToken<ApprovalResult>({
            id: `approval-${payload.id}`,
            timeout: { days: 7 }
        });

        return approval;
    }
});
```

### Batch Processing (Replaces Temporal Promise.all)

```typescript
export const parallelExecution = task({
    id: "parallel-execution",
    run: async (payload: { nodes: NodeConfig[] }) => {
        // Execute all nodes in parallel, wait for all results
        const results = await executeNode.batchTriggerAndWait(
            payload.nodes.map((node) => ({ payload: node }))
        );

        return results;
    }
});
```

### Realtime Streaming (Replaces Redis Pub/Sub)

```typescript
import { task, runs, metadata, streams } from "@trigger.dev/sdk/v3";

export const llmNode = task({
    id: "llm-node",
    run: async (payload: LLMPayload) => {
        // Update run metadata for frontend
        await metadata.set("status", "generating");
        await metadata.set("nodeId", payload.nodeId);

        // Stream LLM response directly to frontend
        const result = await openai.chat.completions.create({
            model: "gpt-4",
            messages: payload.messages,
            stream: true
        });

        // Pipe stream to Trigger.dev Realtime
        const stream = await streams.pipe("llm-response", result);

        await metadata.set("status", "complete");
        return stream.text;
    }
});
```

**Frontend consumption:**

```typescript
import { useRealtimeRunWithStreams } from "@trigger.dev/react-hooks";

function WorkflowExecution({ runId }: { runId: string }) {
    const { run, streams } = useRealtimeRunWithStreams(runId, {
        accessToken: publicAccessToken
    });

    const llmStream = streams["llm-response"];

    return (
        <div>
            <p>Status: {run?.metadata?.status}</p>
            <p>Output: {llmStream?.text}</p>
        </div>
    );
}
```

---

## Mapping Temporal Concepts to Trigger.dev

| Temporal Concept     | Trigger.dev Equivalent           | Notes                             |
| -------------------- | -------------------------------- | --------------------------------- |
| **Workflow**         | `task()`                         | Top-level orchestration task      |
| **Activity**         | `task()` (subtask)               | Called via `triggerAndWait()`     |
| **Child Workflow**   | Subtask with `triggerAndWait()`  | Same as activities                |
| **Signal**           | `wait.forToken()`                | Waitpoints for external events    |
| **Query**            | `runs.retrieve()` + metadata     | Get run state anytime             |
| **Timer**            | `wait.for()` / `wait.until()`    | Checkpointed, no resources used   |
| **Continue-as-new**  | Not needed                       | Checkpoints prevent history bloat |
| **Retry Policy**     | `retry: { maxAttempts, factor }` | Per-task configuration            |
| **Task Queue**       | `queue: { concurrencyLimit }`    | Per-task or shared queues         |
| **Worker**           | Supervisor                       | Automatic, managed by Trigger.dev |
| **Workflow History** | Run with checkpoints             | Visible in dashboard              |

---

## Migration Architecture

### Current Temporal Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Server (Fastify)                     │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                   Temporal Client                            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Orchestrator │  │    Agent     │  │  UserInput   │       │
│  │   Workflow   │  │   Workflow   │  │   Workflow   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                │                    │              │
│         ▼                ▼                    ▼              │
│  ┌──────────────────────────────────────────────────┐       │
│  │              Activities (Node Executors)          │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
└────────────────┬────────────────────────────────────────────┘
                 │
         ┌───────┴───────┐
         ▼               ▼
┌──────────────┐  ┌──────────────┐
│   Temporal   │  │    Redis     │
│   Server     │  │  (Events)    │
└──────────────┘  └──────────────┘
```

### Proposed Trigger.dev Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Server (Fastify)                     │
│  + Trigger.dev SDK for triggering tasks                      │
│  + Public access tokens for frontend realtime                │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                   Trigger.dev Tasks                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ executeWorkflow │ │ executeNode │  │  llmNode    │       │
│  │     (task)   │  │   (subtask)  │  │  (subtask)   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                                                    │
│         │  triggerAndWait() / batchTriggerAndWait()         │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────┐       │
│  │              Node Handler Tasks                   │       │
│  │  (HTTP, Transform, Logic, Integration, etc.)     │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
└────────────────┬────────────────────────────────────────────┘
                 │
         ┌───────┴───────┐
         ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Trigger.dev │  │  PostgreSQL  │  │    Redis     │
│  Supervisor  │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Implementation Plan

### Phase 1: Setup & Infrastructure

**Goal:** Set up Trigger.dev infrastructure alongside existing Temporal.

| Task                               | Files                       | Effort |
| ---------------------------------- | --------------------------- | ------ |
| Add Trigger.dev SDK dependency     | `backend/package.json`      | S      |
| Create Trigger.dev config          | `backend/trigger.config.ts` | S      |
| Add Trigger.dev to Docker Compose  | `docker-compose.yml`        | M      |
| Create trigger directory structure | `backend/src/trigger/`      | S      |
| Configure development environment  | `.env`, `backend/.env`      | S      |

**New Directory Structure:**

```
backend/src/trigger/
├── trigger.config.ts          # Trigger.dev configuration
├── tasks/
│   ├── workflow-executor.ts   # Main orchestration task
│   ├── node-executor.ts       # Individual node execution
│   ├── node-handlers/         # Handler tasks by type
│   │   ├── llm-handler.ts
│   │   ├── http-handler.ts
│   │   ├── transform-handler.ts
│   │   ├── logic-handler.ts
│   │   └── integration-handler.ts
│   └── utilities/
│       ├── context-manager.ts
│       └── variable-resolver.ts
└── index.ts                   # Export all tasks
```

---

### Phase 2: Core Task Implementation

**Goal:** Implement workflow and node execution tasks.

#### 2.1 Workflow Executor Task

```typescript
// backend/src/trigger/tasks/workflow-executor.ts
import { task, wait, metadata, runs } from "@trigger.dev/sdk/v3";
import { buildExecutionPlan } from "./utilities/execution-planner";

export const executeWorkflow = task({
    id: "execute-workflow",
    retry: { maxAttempts: 3 },
    run: async (payload: WorkflowExecutionPayload) => {
        const { workflowId, definition, inputs, executionId } = payload;

        // Set initial metadata for frontend
        await metadata.set("executionId", executionId);
        await metadata.set("status", "running");
        await metadata.set("completedNodes", []);

        // Build execution plan (same as Temporal version)
        const plan = buildExecutionPlan(definition);
        const context = new ContextManager(inputs);

        // Execute nodes in parallel batches
        for (const batch of plan.executionOrder) {
            // Execute batch in parallel
            const results = await executeNode.batchTriggerAndWait(
                batch.map((nodeId) => ({
                    payload: {
                        nodeId,
                        config: definition.nodes.find((n) => n.id === nodeId),
                        context: context.getSnapshot()
                    }
                }))
            );

            // Update context with results
            for (const result of results) {
                if (result.ok) {
                    context.setNodeOutput(result.output.nodeId, result.output.data);
                    await metadata.append("completedNodes", result.output.nodeId);
                } else {
                    // Handle error routing
                    await handleNodeError(result.error, nodeId, definition);
                }
            }
        }

        await metadata.set("status", "completed");
        return context.getFinalOutputs();
    }
});
```

#### 2.2 Node Executor Task

```typescript
// backend/src/trigger/tasks/node-executor.ts
import { task, metadata, streams } from "@trigger.dev/sdk/v3";
import { getHandler } from "./node-handlers/registry";

export const executeNode = task({
    id: "execute-node",
    retry: { maxAttempts: 2 },
    run: async (payload: NodeExecutionPayload) => {
        const { nodeId, config, context } = payload;

        await metadata.set("nodeId", nodeId);
        await metadata.set("nodeType", config.type);
        await metadata.set("status", "executing");

        const startTime = Date.now();

        // Get appropriate handler for node type
        const handler = getHandler(config.type);

        // Execute with streaming support for LLM nodes
        const result = await handler.execute({
            config,
            context,
            streams // Pass streams for LLM handlers
        });

        const duration = Date.now() - startTime;

        await metadata.set("status", "completed");
        await metadata.set("duration", duration);

        return {
            nodeId,
            success: result.success,
            data: result.data,
            error: result.error,
            signals: result.signals,
            tokenUsage: result.tokenUsage
        };
    }
});
```

---

### Phase 3: Node Handlers

**Goal:** Implement type-specific node handlers as tasks.

| Task                         | Files                                                            | Effort |
| ---------------------------- | ---------------------------------------------------------------- | ------ |
| Handler registry             | `backend/src/trigger/tasks/node-handlers/registry.ts`            | S      |
| LLM handler (with streaming) | `backend/src/trigger/tasks/node-handlers/llm-handler.ts`         | L      |
| HTTP handler                 | `backend/src/trigger/tasks/node-handlers/http-handler.ts`        | M      |
| Transform handler            | `backend/src/trigger/tasks/node-handlers/transform-handler.ts`   | M      |
| Logic handler                | `backend/src/trigger/tasks/node-handlers/logic-handler.ts`       | M      |
| Integration handler          | `backend/src/trigger/tasks/node-handlers/integration-handler.ts` | L      |

#### LLM Handler with Streaming

```typescript
// backend/src/trigger/tasks/node-handlers/llm-handler.ts
import { streams } from "@trigger.dev/sdk/v3";
import OpenAI from "openai";

export class LLMHandler implements NodeHandler {
    async execute(input: HandlerInput): Promise<HandlerOutput> {
        const { config, context } = input;
        const openai = new OpenAI();

        const response = await openai.chat.completions.create({
            model: config.model || "gpt-4",
            messages: resolveMessages(config.messages, context),
            stream: true
        });

        // Pipe stream to frontend via Trigger.dev Realtime
        const stream = await streams.pipe(`llm-${config.nodeId}`, response);

        return {
            success: true,
            data: { text: stream.text },
            tokenUsage: {
                input: stream.usage?.prompt_tokens || 0,
                output: stream.usage?.completion_tokens || 0,
                model: config.model
            }
        };
    }
}
```

---

### Phase 4: Pause/Resume with Waitpoints

**Goal:** Implement human-in-the-loop approval workflows.

```typescript
// backend/src/trigger/tasks/pause-handler.ts
import { task, wait } from "@trigger.dev/sdk/v3";

export const pauseNode = task({
    id: "pause-node",
    run: async (payload: PausePayload) => {
        const { nodeId, reason, timeout, expectedSchema } = payload;

        // Create waitpoint for external input
        const userInput = await wait.forToken<UserInputResult>({
            id: `pause-${nodeId}-${Date.now()}`,
            timeout: timeout || { days: 7 }
        });

        // Validate input against expected schema if provided
        if (expectedSchema) {
            validateInput(userInput, expectedSchema);
        }

        return {
            nodeId,
            success: true,
            data: userInput
        };
    }
});
```

**Resume from API:**

```typescript
// backend/src/api/routes/executions/resume.ts
import { waitpoint } from "@trigger.dev/sdk/v3";

export async function resumeExecutionHandler(request: FastifyRequest, reply: FastifyReply) {
    const { executionId, nodeId, input } = request.body;

    // Complete the waitpoint with user input
    await waitpoint.complete(`pause-${nodeId}`, input);

    reply.send({ success: true });
}
```

---

### Phase 5: API Integration & Frontend

**Goal:** Integrate Trigger.dev with existing API and update frontend for realtime.

#### API Trigger Endpoint

```typescript
// backend/src/api/routes/workflows/execute.ts
import { executeWorkflow } from "../../trigger/tasks/workflow-executor";

export async function executeWorkflowHandler(request: FastifyRequest, reply: FastifyReply) {
    const { workflowId } = request.params;
    const { inputs } = request.body;
    const userId = request.user.id;

    // Load workflow definition
    const workflow = await workflowRepo.findById(workflowId, userId);

    // Create execution record
    const execution = await executionRepo.create({
        workflowId,
        userId,
        inputs,
        status: "pending"
    });

    // Trigger the workflow task
    const handle = await executeWorkflow.trigger({
        workflowId,
        executionId: execution.id,
        definition: workflow.definition,
        inputs
    });

    // Create public access token for frontend realtime
    const publicToken = await runs.createPublicToken(handle.id);

    reply.send({
        success: true,
        data: {
            executionId: execution.id,
            runId: handle.id,
            publicToken
        }
    });
}
```

#### Frontend Realtime Hook

```typescript
// frontend/src/hooks/useWorkflowExecution.ts
import { useRealtimeRunWithStreams } from "@trigger.dev/react-hooks";

export function useWorkflowExecution(runId: string, publicToken: string) {
    const { run, streams, error } = useRealtimeRunWithStreams(runId, {
        accessToken: publicToken
    });

    return {
        status: run?.metadata?.status,
        completedNodes: run?.metadata?.completedNodes || [],
        currentNode: run?.metadata?.nodeId,
        llmStreams: Object.entries(streams).filter(([key]) => key.startsWith("llm-")),
        error,
        isComplete: run?.status === "COMPLETED",
        isFailed: run?.status === "FAILED",
        output: run?.output
    };
}
```

---

### Phase 6: Migration & Cleanup

**Goal:** Migrate existing executions and remove Temporal.

| Task                         | Files                                                     | Effort |
| ---------------------------- | --------------------------------------------------------- | ------ |
| Create migration script      | `backend/scripts/migrate-to-trigger.ts`                   | M      |
| Update execution repository  | `backend/src/storage/repositories/ExecutionRepository.ts` | M      |
| Remove Temporal dependencies | `backend/package.json`                                    | S      |
| Remove Temporal code         | `backend/src/temporal/`                                   | M      |
| Update Docker Compose        | `docker-compose.yml`                                      | S      |
| Update documentation         | `.docs/`                                                  | M      |

---

## Self-Hosting Options

### Docker Compose (Recommended for Development)

```yaml
# docker-compose.yml additions
services:
    trigger:
        image: ghcr.io/triggerdotdev/trigger.dev:v4
        environment:
            - DATABASE_URL=postgresql://postgres:password@postgres:5432/trigger
            - REDIS_URL=redis://redis:6379
            - TRIGGER_SECRET=your-secret-key
        ports:
            - "3040:3000"
        depends_on:
            - postgres
            - redis
```

### Kubernetes (Production)

Use the official Helm chart:

```bash
helm repo add triggerdotdev https://charts.trigger.dev
helm install trigger triggerdotdev/trigger \
  --set postgres.enabled=true \
  --set redis.enabled=true
```

---

## Benefits of Migration

### 1. Simplified Infrastructure

- Remove Temporal Server (complex Go binary)
- Single supervisor process
- Built-in container registry

### 2. Better Developer Experience

- Pure TypeScript, no determinism constraints
- Type-safe payloads and results
- Easier debugging (no replay complexity)

### 3. Native Realtime & Streaming

- Eliminate custom Redis pub/sub code
- Built-in LLM streaming to frontend
- React hooks for realtime updates

### 4. Cost Efficiency

- Checkpointed waits don't consume resources
- No compute charges during `wait.for()` or subtask waits
- More efficient for long-running workflows

### 5. Simpler Pause/Resume

- Waitpoints for external events
- No need for signal handlers
- Simple API to complete waitpoints

---

## Trade-offs & Considerations

| Consideration                | Impact                             | Mitigation                                       |
| ---------------------------- | ---------------------------------- | ------------------------------------------------ |
| **Multi-language support**   | Trigger.dev is TypeScript-only     | FlowMaestro is already TypeScript                |
| **Self-hosting checkpoints** | Not available (cloud feature)      | Use cloud for production, or accept longer waits |
| **Maturity**                 | Trigger.dev is newer than Temporal | Active development, strong community             |
| **Visibility/debugging**     | Different UI than Temporal         | Trigger.dev dashboard is comprehensive           |
| **Event sourcing**           | No replay, checkpoint-based        | Checkpoints are sufficient for our use case      |

---

## Migration Timeline

### Week 1: Setup

- [ ] Add Trigger.dev dependencies
- [ ] Configure Docker Compose
- [ ] Create trigger directory structure

### Week 2-3: Core Implementation

- [ ] Implement workflow executor task
- [ ] Implement node executor task
- [ ] Create node handler registry

### Week 3-4: Handlers & Streaming

- [ ] Implement all node handlers
- [ ] Add LLM streaming support
- [ ] Implement pause/resume with waitpoints

### Week 4-5: Integration

- [ ] Update API endpoints
- [ ] Add frontend realtime hooks
- [ ] Create public access token flow

### Week 5-6: Migration & Cleanup

- [ ] Migrate existing workflows
- [ ] Remove Temporal code
- [ ] Update documentation

---

## Success Criteria

1. **Functionality**: All existing workflows execute correctly
2. **Performance**: Comparable or better execution times
3. **Streaming**: LLM responses stream to frontend in realtime
4. **Pause/Resume**: Human-in-the-loop workflows work correctly
5. **Observability**: Full visibility in Trigger.dev dashboard
6. **Infrastructure**: Simplified deployment (single supervisor)

---

## References

- [Trigger.dev Documentation](https://trigger.dev/docs)
- [How Trigger.dev Works](https://trigger.dev/docs/how-it-works)
- [Trigger.dev v3 Announcement](https://trigger.dev/blog/v3-announcement)
- [Self-hosting with Docker](https://trigger.dev/blog/self-hosting-trigger-dev-v4-docker)
- [Self-hosting with Kubernetes](https://trigger.dev/blog/self-hosting-trigger-dev-v4-kubernetes)
- [Realtime Streams](https://trigger.dev/docs/realtime/streams)
- [Wait Functions](https://trigger.dev/docs/wait-for)
- [Triggering Tasks](https://trigger.dev/docs/triggering)
- [Temporal vs Trigger.dev Comparison](https://medium.com/@matthieumordrel/the-ultimate-guide-to-typescript-orchestration-temporal-vs-trigger-dev-vs-inngest-and-beyond-29e1147c8f2d)
- [Trigger.dev GitHub](https://github.com/triggerdotdev/trigger.dev)
