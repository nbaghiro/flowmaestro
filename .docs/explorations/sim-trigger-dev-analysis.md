# Trigger.dev Setup Analysis

## Overview

Trigger.dev is integrated as a background job processing system for asynchronous workflow execution, webhooks, schedules, document processing, and notification delivery.

## Configuration

### Main Config (`apps/sim/trigger.config.ts`)

```typescript
export default defineConfig({
  project: env.TRIGGER_PROJECT_ID!,
  runtime: 'node',
  logLevel: 'log',
  maxDuration: 600,           // 10 minutes max per task
  retries: {
    enabledInDev: false,
    default: { maxAttempts: 1 },
  },
  dirs: ['./background'],     // Task definitions location
  build: {
    extensions: [additionalPackages({ packages: ['unpdf'] })],
  },
})
```

### Environment Variables (`apps/sim/lib/core/config/env.ts`)

| Variable | Purpose |
|----------|---------|
| `TRIGGER_PROJECT_ID` | Trigger.dev project identifier |
| `TRIGGER_SECRET_KEY` | Authentication key for Trigger.dev |
| `TRIGGER_DEV_ENABLED` | Server-side toggle for async jobs |
| `NEXT_PUBLIC_TRIGGER_DEV_ENABLED` | Client-side UI gate |

### Feature Flag (`apps/sim/lib/core/config/feature-flags.ts:51`)

```typescript
export const isTriggerDevEnabled = isTruthy(env.TRIGGER_DEV_ENABLED)
```

---

## Background Tasks

All task definitions are in `apps/sim/background/`:

### 1. Workflow Execution (`workflow-execution.ts`)

**Task ID:** `workflow-execution`

```typescript
export const workflowExecutionTask = task({
  id: 'workflow-execution',
  run: executeWorkflowJob,
})
```

**Payload:**
- `workflowId`, `userId`, `input`, `triggerType`, `metadata`

**Triggered from:** `apps/sim/app/api/workflows/[id]/execute/route.ts:256`
- When `X-Execution-Mode: async` header is set
- Uses `tasks.trigger('workflow-execution', payload)`

---

### 2. Webhook Execution (`webhook-execution.ts`)

**Task ID:** `webhook-execution`

```typescript
export const webhookExecution = task({
  id: 'webhook-execution',
  retry: { maxAttempts: 1 },
  run: async (payload) => executeWebhookJob(payload),
})
```

**Payload:**
- `webhookId`, `workflowId`, `userId`, `provider`, `body`, `headers`, `path`, `blockId`, `testMode`, `executionTarget`, `credentialId`

**Triggered from:** `apps/sim/lib/webhooks/processor.ts:711`
- All incoming webhook requests when `isTriggerDevEnabled` is true
- Falls back to direct execution if disabled

---

### 3. Schedule Execution (`schedule-execution.ts`)

**Task ID:** `schedule-execution`

```typescript
export const scheduleExecution = task({
  id: 'schedule-execution',
  retry: { maxAttempts: 1 },
  run: async (payload) => executeScheduleJob(payload),
})
```

**Payload:**
- `scheduleId`, `workflowId`, `blockId`, `cronExpression`, `lastRanAt`, `failedCount`, `now`, `scheduledFor`

**Features:**
- Handles consecutive failure tracking (max 10 failures before disable)
- Calculates next run time from cron expressions
- Supports various error code handling (401, 403, 404, 429, 402)

**Triggered from:** `apps/sim/app/api/schedules/execute/route.ts:73`

---

### 4. Knowledge/Document Processing (`knowledge-processing.ts`)

**Task ID:** `knowledge-process-document`

```typescript
export const processDocument = task({
  id: 'knowledge-process-document',
  maxDuration: env.KB_CONFIG_MAX_DURATION || 600,
  retry: {
    maxAttempts: env.KB_CONFIG_MAX_ATTEMPTS || 3,
    factor: env.KB_CONFIG_RETRY_FACTOR || 2,
    minTimeoutInMs: env.KB_CONFIG_MIN_TIMEOUT || 1000,
    maxTimeoutInMs: env.KB_CONFIG_MAX_TIMEOUT || 10000,
  },
  queue: {
    concurrencyLimit: env.KB_CONFIG_CONCURRENCY_LIMIT || 20,
    name: 'document-processing-queue',
  },
  run: async (payload) => { /* ... */ },
})
```

**Features:**
- Configurable retry with exponential backoff
- Queue-based with concurrency limit (default 20)
- Dedicated queue name for document processing

**Triggered from:** `apps/sim/lib/knowledge/documents/service.ts:502`

---

### 5. Workspace Notification Delivery (`workspace-notification-delivery.ts`)

**Task ID:** `workspace-notification-delivery`

```typescript
export const workspaceNotificationDeliveryTask = task({
  id: 'workspace-notification-delivery',
  retry: { maxAttempts: 1 },
  run: async (params) => executeNotificationDelivery(params),
})
```

**Payload:**
- `deliveryId`, `subscriptionId`, `notificationType` (webhook/email/slack), `log`, `alertConfig`

**Features:**
- Supports webhook, email, and Slack delivery
- Application-level retry (5 attempts with jitter)
- Builds rich notification payloads with rate limits and usage data

**Triggered from:**
- `apps/sim/lib/logs/events.ts:144` (workflow completion events)
- `apps/sim/lib/notifications/inactivity-polling.ts:122` (inactivity alerts)

---

## API Endpoints

### Job Status API (`apps/sim/app/api/jobs/[jobId]/route.ts`)

Retrieves task status from Trigger.dev using `runs.retrieve(taskId)`:

| Trigger.dev Status | Mapped Status |
|-------------------|---------------|
| QUEUED, WAITING_FOR_DEPLOY | queued |
| EXECUTING, RESCHEDULED, FROZEN | processing |
| COMPLETED | completed |
| CANCELED | cancelled |
| FAILED, CRASHED, INTERRUPTED, SYSTEM_FAILURE, EXPIRED | failed |

---

## Execution Flow

### Async Workflow Execution

```
Client → POST /api/workflows/[id]/execute (X-Execution-Mode: async)
       → checkHybridAuth → preprocessExecution
       → tasks.trigger('workflow-execution', payload)
       ← 202 Accepted { jobId, statusUrl }

Client → GET /api/jobs/[jobId]
       → runs.retrieve(taskId)
       ← { status, output, metadata }
```

### Webhook Processing

```
External Service → POST /api/webhooks/trigger/[path]
                 → parseWebhookBody → findWebhookAndWorkflow
                 → verifyProviderAuth → checkWebhookPreprocessing
                 → if isTriggerDevEnabled:
                     tasks.trigger('webhook-execution', payload)
                   else:
                     executeWebhookJob(payload) directly
                 ← 200/202 (provider-specific response)
```

---

## Dependencies

From `apps/sim/package.json`:
- `@trigger.dev/sdk`: 4.1.2 (runtime)
- `@trigger.dev/build`: 4.1.2 (dev/build)

---

## Fallback Behavior

When `TRIGGER_DEV_ENABLED` is `false`:
- Webhooks execute directly via `executeWebhookJob()` (`processor.ts:718`)
- Async workflow execution returns 400 error with message to enable Trigger.dev
- Schedules and document processing likely fall back similarly
