# Phase 14: Trigger Nodes

## Overview

Implement 6 trigger nodes that start workflows: Schedule, Webhook, On New Email, On New File, On New Row, On New Message.

---

## Prerequisites

- **Phase 06**: Flow Control nodes (triggers connect to them)

---

## Existing Infrastructure

### Temporal Schedules for Cron

**File**: `backend/src/temporal/`

```typescript
// Temporal has built-in schedule support
import { ScheduleClient } from "@temporalio/client";

const client = new ScheduleClient({ connection });
await client.create({
    scheduleId: `workflow-${workflowId}-schedule`,
    spec: {
        cronExpressions: [config.cronExpression]
    },
    action: {
        type: "startWorkflow",
        workflowType: "orchestratorWorkflow",
        args: [{ workflowId, triggeredBy: "schedule" }]
    }
});
```

### Webhook Routes

**File**: `backend/src/api/routes/webhooks/`

```typescript
// Add webhook endpoint
// POST /api/webhooks/:webhookId
app.post("/api/webhooks/:webhookId", async (request, reply) => {
    const { webhookId } = request.params;
    const workflow = await findWorkflowByWebhookId(webhookId);

    // Trigger workflow execution
    await workflowClient.start(orchestratorWorkflow, {
        args: [
            {
                workflowId: workflow.id,
                triggeredBy: "webhook",
                triggerData: request.body
            }
        ]
    });
});
```

### Integration Providers for Polling

**File**: `backend/src/integrations/providers/`

```typescript
// Use existing providers for email/file/row triggers:
// - gmail/GmailProvider.ts - fetch emails
// - google-drive/GoogleDriveProvider.ts - list files
// - google-sheets/GoogleSheetsProvider.ts - read rows
// - slack/SlackProvider.ts - fetch messages
```

### Connection Repository

**File**: `backend/src/storage/repositories/ConnectionRepository.ts`

```typescript
// Triggers need account connections
const connection = await connectionRepository.findByIdWithData(connectionId);
// Use connection credentials for email/drive/sheets access
```

---

## Nodes (6)

| Node               | Description           | Category            |
| ------------------ | --------------------- | ------------------- |
| **Schedule**       | Cron-based triggers   | automation/triggers |
| **Webhook**        | HTTP request triggers | automation/triggers |
| **On New Email**   | Email inbox triggers  | automation/triggers |
| **On New File**    | File system triggers  | automation/triggers |
| **On New Row**     | Spreadsheet triggers  | automation/triggers |
| **On New Message** | Chat message triggers | automation/triggers |

---

## Node Specifications

### Schedule Trigger

**Config**:

- Type: cron expression / interval
- Cron: "0 9 \* \* 1-5" (9am weekdays)
- Interval: every N minutes/hours
- Timezone
- Start/end dates

**Outputs**: `timestamp`, `runNumber`

### Webhook Trigger

**Config**:

- Webhook URL (auto-generated)
- Custom path (optional)
- HTTP methods: POST, GET, PUT
- Signature validation
- Expected headers

**Outputs**: `body`, `headers`, `params`

### On New Email Trigger

**Config**:

- Account connection
- Filters: from, to, subject, folder, has attachment
- Poll interval
- Mark as read option

**Outputs**: `email`, `from`, `subject`, `body`, `attachments`

### On New File Trigger

**Config**:

- Storage: Google Drive / Dropbox / S3
- Folder path
- File type filter
- Poll interval

**Outputs**: `file`, `name`, `path`, `size`, `mimeType`

### On New Row Trigger

**Config**:

- Source: Sheets / Airtable / Notion / Database
- Source ID and name
- Sheet/table name
- Filters (optional)

**Outputs**: `row`, `rowIndex`, `timestamp`

### On New Message Trigger

**Config**:

- Platform: Slack / Discord / Teams
- Channel filter
- Mention filter (@bot)
- Keyword filter

**Outputs**: `message`, `author`, `channel`, `timestamp`

---

## Unit Tests

### Test Pattern

**Pattern C (Mock Services)**: Mock Temporal scheduler and webhook endpoints.

### Files to Create

| Executor     | Test File                                                                   | Pattern |
| ------------ | --------------------------------------------------------------------------- | ------- |
| Schedule     | `backend/tests/unit/node-executors/triggers/schedule-executor.test.ts`      | C       |
| Webhook      | `backend/tests/unit/node-executors/triggers/webhook-executor.test.ts`       | C       |
| EmailTrigger | `backend/tests/unit/node-executors/triggers/email-trigger-executor.test.ts` | C       |
| SlackTrigger | `backend/tests/unit/node-executors/triggers/slack-trigger-executor.test.ts` | C       |

### Required Test Cases

#### schedule-executor.test.ts

- `should register cron schedule with Temporal`
- `should parse cron expression correctly`
- `should respect timezone configuration`
- `should trigger workflow at scheduled time`
- `should handle invalid cron expressions`

#### webhook-executor.test.ts

- `should generate unique webhook URL`
- `should validate webhook secret`
- `should parse JSON payload`
- `should parse form-encoded payload`
- `should reject invalid signatures`

#### email-trigger-executor.test.ts

- `should parse incoming email`
- `should filter by sender/subject`
- `should extract attachments`
- `should handle MIME parsing`

#### slack-trigger-executor.test.ts

- `should verify Slack signature`
- `should filter by channel/mention`
- `should extract message content`
- `should handle thread replies`

---

## Test Workflow: Scheduled Report

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  Schedule   │───▶│ [processing] │───▶│   Output    │
│ (8am daily) │    │    nodes     │    │ (report)    │
└─────────────┘    └──────────────┘    └─────────────┘
```

**Test**: Set schedule to run in 1 minute
**Expected**: Workflow triggers at scheduled time

---

## Backend Architecture

### Trigger Scheduler

```typescript
// backend/src/triggers/scheduler.ts
class TriggerScheduler {
    registerTrigger(registration: TriggerRegistration): Promise<void>;
    unregisterTrigger(workflowId: string, nodeId: string): Promise<void>;

    // Specific handlers
    registerCronTrigger(config): Promise<void>; // Uses Temporal schedules
    registerWebhook(config): Promise<void>; // Generates URL
    registerPoller(config): Promise<void>; // Email/file/row polling
}
```

### Webhook Endpoint

```typescript
// POST /api/webhooks/:webhookId
// Validates signature, triggers workflow
```

---

## Files to Create

### Frontend Components

```
frontend/src/canvas/nodes/automation/triggers/
├── ScheduleTriggerNode.tsx
├── WebhookTriggerNode.tsx
├── EmailTriggerNode.tsx
├── FileTriggerNode.tsx
├── RowTriggerNode.tsx
├── MessageTriggerNode.tsx
├── config/
│   └── [config files for each]
└── index.ts
```

### Backend

```
backend/src/triggers/
├── scheduler.ts
├── cron-handler.ts
├── webhook-handler.ts
├── email-poller.ts
├── file-poller.ts
├── row-poller.ts
└── message-poller.ts
```

---

## How to Deliver

1. Register all 6 nodes in `node-registry.ts`
2. Create frontend trigger node components
3. Create config forms with connection UI
4. Implement Trigger Scheduler service
5. Create webhook endpoint handler
6. Implement polling services for email/file/row
7. Integrate with Temporal for scheduling
8. Test each trigger type

---

## How to Test

| Test                  | Expected Result                  |
| --------------------- | -------------------------------- |
| Schedule every minute | Workflow fires on schedule       |
| Webhook POST          | Workflow triggers with body      |
| Webhook signature     | Invalid signature rejected       |
| Email with filter     | Only matching emails trigger     |
| New file in folder    | Workflow triggers with file data |
| New row in sheet      | Workflow triggers with row data  |

### Integration Tests

```typescript
describe("Schedule Trigger", () => {
    it("fires on cron schedule", async () => {
        const workflow = await createWorkflow({
            trigger: { type: "schedule", cron: "* * * * *" } // every minute
        });

        // Wait for trigger
        await waitFor(70000);

        const executions = await getWorkflowExecutions(workflow.id);
        expect(executions.length).toBeGreaterThan(0);
    });
});

describe("Webhook Trigger", () => {
    it("triggers on POST", async () => {
        const workflow = await createWorkflow({
            trigger: { type: "webhook" }
        });

        const response = await fetch(workflow.webhookUrl, {
            method: "POST",
            body: JSON.stringify({ test: true })
        });

        expect(response.ok).toBe(true);
        // Verify workflow started
    });
});
```

---

## Acceptance Criteria

- [ ] Schedule fires on cron time
- [ ] Schedule supports timezone
- [ ] Webhook generates unique URL
- [ ] Webhook validates signatures when configured
- [ ] Webhook accepts POST/GET/PUT as configured
- [ ] Email trigger fires on matching emails
- [ ] Email trigger respects folder/filter settings
- [ ] File trigger detects new files in folder
- [ ] Row trigger detects new spreadsheet rows
- [ ] Message trigger detects Slack/Discord messages
- [ ] All triggers display with Automation category styling
- [ ] Triggers have "Trigger" badge instead of category

---

## Dependencies

Triggers are the entry point for all automated workflows.

Required for:

- **Phase 15-16**: Reader nodes often follow triggers
