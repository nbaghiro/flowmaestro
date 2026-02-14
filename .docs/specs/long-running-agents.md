# Personas: Long-Running Agent System

---

## Overview

The Personas feature provides autonomous AI agents that work on complex, multi-hour tasks in the background. Unlike regular agents that require continuous user interaction, Personas operate autonomously with configurable human oversight through an approval system.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Autonomous Execution** | Works independently for hours after initial goal-setting |
| **Approval Workflow** | Pauses for user approval on risky actions |
| **Deliverable Tracking** | Produces structured outputs (reports, code, data) |
| **Real-time Progress** | WebSocket streaming of status and progress |
| **Cost & Duration Limits** | Configurable safeguards for resource usage |
| **Clarification Phase** | Optional Q&A before starting work |
| **Connection Management** | Per-instance integration access grants |

---

## Architecture

### System Components

```
+-----------------------------------------------------------------------+
|                         PERSONAS ARCHITECTURE                         |
+-----------------------------------------------------------------------+
|                                                                       |
|  +----------------+    +----------------+    +---------------------+  |
|  |    Frontend    |<-->|    Backend     |<-->| Temporal Workflows  |  |
|  |    (React)     |    |   (Fastify)    |    | (Persona Orch.)     |  |
|  +----------------+    +----------------+    +---------------------+  |
|         |                     |                       |               |
|         | WebSocket           | PostgreSQL            | Activities    |
|         | (SSE)               | Redis                 |               |
|         v                     v                       v               |
|  +----------------+    +----------------+    +---------------------+  |
|  |   Real-time    |    |    Storage     |    |   LLM Execution     |  |
|  |    Updates     |    |     Layer      |    |    Tool Calls       |  |
|  +----------------+    +----------------+    +---------------------+  |
|                                                                       |
+-----------------------------------------------------------------------+
```

### Design Decision: Temporal Signals (Not E2B Sandboxes)

The original specification proposed E2B sandboxes for isolated execution. After analysis, we implemented a **Temporal-only approach** using workflow signals:

| Aspect | Original Plan (E2B) | Implemented (Temporal) |
|--------|---------------------|------------------------|
| **Execution** | Agent loop in E2B sandbox | Agent loop in Temporal workflow |
| **Approval Wait** | Sandbox paused ($0/hour) | Workflow waits via `condition()` |
| **Signals** | HTTP to sandbox → Temporal | Direct Temporal workflow signals |
| **Isolation** | Firecracker microVM | Temporal worker isolation |
| **Complexity** | High (sandbox management) | Low (standard Temporal patterns) |

**Rationale:**
1. **No arbitrary code execution** - Personas execute controlled tool calls, not user-provided code
2. **Simpler architecture** - No external sandbox service dependency
3. **Faster iteration** - No 150ms sandbox startup per execution
4. **Sufficient for MVP** - Temporal workers handle concurrent executions well

---

## Database Schema

### Tables Overview

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `persona_definitions` | Pre-built AI persona configurations | name, slug, system_prompt, tools, autonomy_level |
| `persona_instances` | User-initiated background tasks | status, task_description, execution_id, thread_id |
| `persona_instance_messages` | Conversation history | role, content, metadata |
| `persona_instance_deliverables` | Output artifacts | name, type, content, file_url |
| `persona_instance_activity` | Activity/progress log | type, message, step_index |
| `persona_task_templates` | Reusable task patterns | task_template, variables, usage_count |
| `persona_instance_connections` | Integration grants | connection_id, granted_scopes |
| `persona_approval_requests` | Approval workflow records | action_type, risk_level, status |

### Persona Definitions

Pre-built AI persona configurations (seeded, not user-created):

```sql
CREATE TABLE persona_definitions (
    id UUID PRIMARY KEY,

    -- Identity
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255),
    description TEXT,
    avatar_url TEXT,

    -- Categorization
    category VARCHAR(50) NOT NULL,  -- research, content, development, data, operations, business, proposals
    tags TEXT[],
    expertise_areas TEXT[],

    -- Example content
    example_tasks TEXT[],
    typical_deliverables JSONB,

    -- Agent configuration
    system_prompt TEXT NOT NULL,
    model VARCHAR(100) DEFAULT 'claude-sonnet-4-20250514',
    provider VARCHAR(50) DEFAULT 'anthropic',
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 4096,
    max_iterations INTEGER DEFAULT 200,

    -- Tools and permissions
    default_tools JSONB NOT NULL DEFAULT '[]',
    connection_requirements JSONB DEFAULT '[]',

    -- Autonomy settings
    autonomy_level VARCHAR(50) DEFAULT 'approve_high_risk',  -- full_auto, approve_high_risk, approve_all
    tool_risk_overrides JSONB DEFAULT '{}',

    -- Defaults for instances
    default_max_cost_credits DECIMAL(10,2),
    default_max_duration_hours DECIMAL(5,2),

    -- Discovery
    featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',  -- active, beta, deprecated

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Persona Instances

User-initiated background task instances:

```sql
CREATE TABLE persona_instances (
    id UUID PRIMARY KEY,

    -- Relationships
    persona_definition_id UUID REFERENCES persona_definitions(id),
    user_id UUID NOT NULL REFERENCES users(id),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),

    -- Task definition
    task_title VARCHAR(255),
    task_description TEXT NOT NULL,
    additional_context TEXT,

    -- Execution tracking
    thread_id UUID REFERENCES agent_threads(id),
    execution_id VARCHAR(255),

    -- Status (8-state machine)
    status VARCHAR(50) DEFAULT 'initializing',
    -- initializing, clarifying, running, waiting_approval, completed, cancelled, failed, timeout

    -- Completion tracking
    completion_reason VARCHAR(50),
    -- success, max_duration, max_cost, cancelled, failed, user_completed
    duration_seconds INTEGER,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Cost tracking
    accumulated_cost_credits DECIMAL(10,2) DEFAULT 0,
    max_cost_credits DECIMAL(10,2),
    iteration_count INTEGER DEFAULT 0,
    max_iterations INTEGER,

    -- Duration limits
    max_duration_hours DECIMAL(5,2),

    -- Progress tracking
    progress JSONB,  -- {current_step, completed_steps[], remaining_steps[], percentage, message}

    -- Clarification phase
    clarification_complete BOOLEAN DEFAULT false,
    clarification_exchange_count INTEGER DEFAULT 0,
    clarification_max_exchanges INTEGER DEFAULT 3,
    clarification_skipped BOOLEAN DEFAULT false,

    -- Continuation support
    parent_instance_id UUID REFERENCES persona_instances(id),
    continuation_count INTEGER DEFAULT 0,

    -- Approval tracking
    pending_approval_id UUID,

    -- Sandbox (reserved for future E2B integration)
    sandbox_id VARCHAR(255),
    sandbox_state VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

### Approval Requests

Approval workflow for risky tool executions:

```sql
CREATE TABLE persona_approval_requests (
    id UUID PRIMARY KEY,
    instance_id UUID NOT NULL REFERENCES persona_instances(id) ON DELETE CASCADE,

    -- Action details
    action_type VARCHAR(50) NOT NULL,
    -- tool_call, file_write, external_api, send_message, cost_threshold
    tool_name VARCHAR(255),
    action_description TEXT NOT NULL,
    action_arguments JSONB DEFAULT '{}',

    -- Risk assessment
    risk_level VARCHAR(20) NOT NULL,  -- low, medium, high
    estimated_cost_credits DECIMAL(10,2),

    -- Context for user decision
    agent_context TEXT,
    alternatives TEXT,

    -- Response tracking
    status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, denied, expired
    responded_by UUID REFERENCES users(id),
    responded_at TIMESTAMPTZ,
    response_note TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);
```

---

## Instance Status State Machine

```
                         PERSONA INSTANCE LIFECYCLE
    +-----------------------------------------------------------------------+
    |                                                                       |
    |  +----------------+                                                   |
    |  |  initializing  |                                                   |
    |  +-------+--------+                                                   |
    |          |                                                            |
    |          v                                                            |
    |  +----------------+     skip       +----------------+                 |
    |  |   clarifying   |--------------->|    running     |<-----------+    |
    |  +-------+--------+                +-------+--------+            |    |
    |          |                                 |                     |    |
    |          | clarification_complete          |                     |    |
    |          +-------------------------------->|                     |    |
    |                                            |                     |    |
    |                      +---------------------+---------------------+    |
    |                      |                     |                     |    |
    |                      v                     v                     v    |
    |            +-----------------+    +------------+    +----------+      |
    |            | waiting_approval|    | completed  |    |  failed  |      |
    |            +--------+--------+    +------------+    +----------+      |
    |                     |                                                 |
    |           approve/deny                                                |
    |                     +------------------------------------------------>+
    |                                                                       |
    |  Additional terminal states: cancelled, timeout                       |
    |                                                                       |
    +-----------------------------------------------------------------------+
```

---

## API Endpoints

### Persona Definitions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/personas` | List all personas with filtering |
| `GET` | `/api/personas/categories` | Gallery view grouped by category |
| `GET` | `/api/personas/:slug` | Get single persona details |
| `GET` | `/api/personas/:slug/templates` | List templates for persona |
| `POST` | `/api/personas/:slug/templates/:templateId/generate` | Generate task from template |
| `GET` | `/api/personas/:slug/available-connections` | Get grantable connections |

### Persona Instances

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/persona-instances` | Create new instance |
| `GET` | `/api/persona-instances` | List instances with filtering |
| `GET` | `/api/persona-instances/dashboard` | Three-part dashboard view |
| `GET` | `/api/persona-instances/count` | Badge count |
| `GET` | `/api/persona-instances/:id` | Get instance details |
| `DELETE` | `/api/persona-instances/:id` | Delete instance |

### Instance Actions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/persona-instances/:id/message` | Send message to running instance |
| `POST` | `/api/persona-instances/:id/cancel` | Cancel running instance |
| `POST` | `/api/persona-instances/:id/complete` | User-initiated completion |
| `POST` | `/api/persona-instances/:id/continue` | Continue work on completed instance |
| `POST` | `/api/persona-instances/:id/skip-clarification` | Skip clarification phase |

### Connections

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/persona-instances/:id/connections` | List granted connections |
| `POST` | `/api/persona-instances/:id/connections` | Grant connection to instance |
| `DELETE` | `/api/persona-instances/:id/connections/:connectionId` | Revoke connection |

### Deliverables

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/persona-instances/:id/deliverables` | List deliverables |
| `GET` | `/api/persona-instances/:id/deliverables/:deliverableId` | Get full deliverable |
| `GET` | `/api/persona-instances/:id/deliverables/:deliverableId/download` | Download as file |
| `DELETE` | `/api/persona-instances/:id/deliverables/:deliverableId` | Delete deliverable |

### Approvals

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/persona-instances/approvals` | List workspace approvals |
| `GET` | `/api/persona-instances/approvals/count` | Pending approval count |
| `GET` | `/api/persona-instances/:id/approvals` | Approvals for specific instance |
| `POST` | `/api/persona-instances/:id/approvals/:approvalId/approve` | Approve action |
| `POST` | `/api/persona-instances/:id/approvals/:approvalId/deny` | Deny action |

---

## Temporal Workflow

### Persona Orchestrator

The `personaOrchestratorWorkflow` handles the full persona lifecycle:

```typescript
interface PersonaOrchestratorInput {
    executionId: string;
    personaInstanceId: string;
    userId: string;
    workspaceId: string;
    threadId: string;
    initialMessage?: string;
    skipClarification?: boolean;

    // For continue-as-new
    serializedThread?: SerializedThread;
    iterations?: number;
    accumulatedCredits?: number;
    clarificationComplete?: boolean;
}
```

### Workflow Signals

| Signal | Purpose | Payload |
|--------|---------|---------|
| `personaUserMessageSignal` | User messages during execution | `string` (message content) |
| `skipClarificationSignal` | Skip clarification phase | none |
| `cancelPersonaSignal` | Graceful cancellation | none |
| `personaApprovalResponseSignal` | Approval decisions | `PersonaApprovalResponsePayload` |

### Signal Handlers

```typescript
// Approval response signal
export const personaApprovalResponseSignal = defineSignal<[PersonaApprovalResponsePayload]>(
    "personaApprovalResponse"
);

interface PersonaApprovalResponsePayload {
    approval_id: string;
    decision: "approved" | "denied";
    note?: string;
    responded_at: number;
}

// In workflow
setHandler(personaApprovalResponseSignal, (payload) => {
    approvalResponse = payload;
});
```

### LLM Response Signals (JSON Blocks)

Personas communicate progress and completion via JSON blocks in their responses:

```markdown
```workflow-signal
{
    "type": "progress",
    "current_step": "Analyzing competitor pricing",
    "completed_steps": ["Research phase", "Data collection"],
    "remaining_steps": ["Analysis", "Report generation"],
    "percentage": 45,
    "message": "Halfway through the analysis"
}
```
```

**Signal Types:**

| Type | Purpose | Key Fields |
|------|---------|------------|
| `progress` | Step tracking | current_step, completed_steps[], percentage |
| `deliverable` | Output created | name, type, content, description |
| `complete` | Task finished | summary, deliverables_created[], key_findings[] |
| `clarification_complete` | Ready to start | summary, key_requirements[], ready |

---

## Approval System

### Autonomy Levels

| Level | Safe Actions | Risky Actions | Use Case |
|-------|--------------|---------------|----------|
| `full_auto` | Execute | Execute | Trusted tasks with no external impact |
| `approve_high_risk` | Execute | Request approval | Default - balance autonomy with safety |
| `approve_all` | Request approval | Request approval | Maximum oversight |

### Risk Classification

Tools are classified by risk level:

**Low Risk (Auto-execute):**
- `web_search`, `web_browse`, `web_scrape`
- `knowledge_base_query`, `read_file`, `list_files`
- `search_memory`, `thread_memory`, `data_analysis`

**Medium Risk:**
- `screenshot_capture`

**High Risk (Approval required):**
- `write_file`, `delete_file`
- `send_email`, `send_message`
- `create_task`, `update_task`
- `create_issue`, `create_pr`, `post_comment`

**High Risk Providers:**
- Slack, Discord, Telegram
- GitHub, GitLab
- Jira, Linear, Notion, Asana, Trello

### Approval Flow

```
+-------------+    +-------------+    +-------------+    +-------------+
| Tool Call   |--->| Check Risk  |--->|   Create    |--->|  Wait for   |
| Requested   |    | & Autonomy  |    |  Approval   |    |   Signal    |
+-------------+    +------+------+    |   Request   |    | (up to 7d)  |
                          |           +-------------+    +------+------+
                          |                                     |
                   (no approval needed)                         |
                          |                              +------+------+
                          v                              |             |
                   +-------------+              +----------+   +----------+
                   |   Execute   |              | Approved |   |  Denied  |
                   |    Tool     |              |  Execute |   |   Skip   |
                   +-------------+              +----------+   +----------+
```

---

## Reasoning Loop

The core of persona execution is an autonomous reasoning loop that iteratively works toward the configured goal and deliverables. This section details how the loop operates.

### Loop Architecture

```
                         PERSONA REASONING LOOP

    +-------------------+
    |   Check Limits    |  Duration, cost, iteration limits
    +---------+---------+
              |
              v
    +-------------------+
    |   Check Signals   |  User messages, cancellation
    +---------+---------+
              |
              v (every 50 iterations)
    +-------------------+
    |  Continue-as-New  |  Summarize context, restart workflow
    +---------+---------+
              |
              v
    +-------------------+
    |     Call LLM      |  Pass messages + available tools
    +---------+---------+
              |
              +-------------------+-------------------+
              |                   |                   |
              v                   v                   v
    +-----------------+  +-----------------+  +-----------------+
    |  Parse Signals  |  |  Process Tools  |  | Check Complete  |
    |  (progress,     |  |  (with approval |  | (explicit or    |
    |   deliverables) |  |   if needed)    |  |  implicit)      |
    +--------+--------+  +--------+--------+  +--------+--------+
             |                    |                    |
             v                    v                    |
    +-----------------+  +-----------------+           |
    | Update Progress |  |   Add Tool     |            |
    | Create Outputs  |  |    Results     |            |
    +--------+--------+  +--------+--------+           |
             |                    |                    |
             +--------------------+                    |
                       |                               |
                       v                               v
              +-----------------+            +-----------------+
              | Next Iteration  |            |    Complete     |
              +--------+--------+            +-----------------+
                       |
                       +---> (loop back to Check Limits)
```

### Iteration Steps

Each iteration follows this sequence:

**1. Pre-Iteration Checks**
```typescript
// Check duration limit
if (Date.now() - workflowStartTime > maxDurationMs) {
    return { status: "timeout", reason: "max_duration" };
}

// Check cancellation signal
if (cancellationRequested) {
    return { status: "cancelled" };
}

// Check for pending user messages
if (pendingUserMessages.length > 0) {
    // Add user messages to conversation context
    messageState.messages.push(...pendingUserMessages);
}
```

**2. Continue-as-New (Every 50 Iterations)**

To prevent Temporal history size limits and maintain performance, the workflow restarts itself periodically:

```typescript
if (currentIterations % 50 === 0) {
    // Summarize conversation to preserve context
    const summarizedMessages = await summarizeThreadContext({
        messages: messageState.messages,
        maxMessages: persona.memory_config.max_messages,
        personaName: persona.name
    });

    // Restart workflow with compressed state
    return continueAsNew({
        serializedThread: summarizedState,
        iterations: currentIterations,
        accumulatedCredits,
        toolFailureCounts
    });
}
```

**3. LLM Call**

The LLM receives the full conversation history and available tools:

```typescript
const llmResponse = await callLLM({
    model: persona.model,
    provider: persona.provider,
    messages: messageState.messages,  // Full context
    tools: availableTools,            // Filtered by failure count
    temperature: persona.temperature,
    maxTokens: persona.max_tokens
});

// Track credit usage
accumulatedCredits += calculateLLMCredits(llmResponse.usage);

// Check cost limit
if (accumulatedCredits > persona.max_cost_credits) {
    return { status: "failed", reason: "max_cost" };
}
```

**4. Response Parsing**

The LLM response is parsed for workflow signals and tool calls:

```typescript
const parsedResponse = parsePersonaResponse(llmResponse.content);

// Handle progress signals -> update instance progress
for (const progressSignal of parsedResponse.progressSignals) {
    await updatePersonaInstanceProgress({ progress: progressSignal });
}

// Handle deliverable signals -> create output artifacts
for (const deliverableSignal of parsedResponse.deliverableSignals) {
    await createPersonaDeliverable({
        name: deliverableSignal.name,
        type: deliverableSignal.deliverable_type,
        content: deliverableSignal.content
    });
}

// Check for completion signal
if (parsedResponse.completionSignal) {
    return { status: "completed", reason: "success" };
}
```

**5. Tool Execution**

Each tool call goes through approval check and execution:

```typescript
for (const toolCall of llmResponse.tool_calls) {
    // Check if approval required
    if (checkToolRequiresApproval(toolDef, autonomyLevel)) {
        // Create approval request and wait (see Approval System)
        const decision = await waitForApproval(toolCall);

        if (decision === "denied") {
            // Add denial to context, continue to next tool
            messageState.messages.push({
                role: "tool",
                content: { error: "Action denied", suggestion: "Try alternative" }
            });
            continue;
        }
    }

    // Execute tool
    try {
        const result = await executeToolCall(toolCall);
        messageState.messages.push({ role: "tool", content: result });
        toolFailureCounts.delete(toolCall.name);  // Reset on success
    } catch (error) {
        // Track failures, blacklist after 3 consecutive failures
        const failures = toolFailureCounts.get(toolCall.name) + 1;
        toolFailureCounts.set(toolCall.name, failures);

        messageState.messages.push({
            role: "tool",
            content: {
                error: error.message,
                is_blacklisted: failures >= 3,
                suggestion: failures >= 3
                    ? "Tool disabled, use alternative"
                    : "You may retry"
            }
        });
    }
}
```

**6. Implicit Completion Detection**

If the LLM responds without tools or signals multiple times, the system prompts it:

```typescript
if (!hasToolCalls && !hasSignals) {
    consecutiveNoToolResponses++;

    if (consecutiveNoToolResponses >= 3) {
        // Force completion after 3 empty responses
        return { status: "completed", reason: "success" };
    }

    // Inject reminder
    messageState.messages.push({
        role: "system",
        content: "You responded without tools or signals. If done, include a completion signal. Otherwise, continue working."
    });
}
```

### System Prompt Structure

The persona system prompt guides autonomous behavior:

```
## Persona Identity
{persona.system_prompt}  // Role, expertise, personality

## Current Task
{instance.task_description}

## Additional Context
- Knowledge bases available: {count}
- Files provided: {count}

## Expected Deliverables
- **Report** (markdown): Competitive analysis document
- **Data** (csv): Pricing comparison matrix

## Workflow Communication

You communicate workflow state via JSON signal blocks:

### Progress Updates
```workflow-signal
{
    "type": "progress",
    "current_step": "Analyzing competitor websites",
    "completed_steps": ["Gathered requirements"],
    "remaining_steps": ["Create report"],
    "percentage": 40
}
```

### Creating Deliverables
```workflow-signal
{
    "type": "deliverable",
    "name": "competitive-analysis",
    "deliverable_type": "markdown",
    "content": "# Analysis\n\n...",
    "description": "Competitor landscape analysis"
}
```

### Task Completion
```workflow-signal
{
    "type": "complete",
    "summary": "Completed competitive analysis",
    "deliverables_created": ["competitive-analysis"],
    "key_findings": ["Competitor X has 40% market share"]
}
```

**Rules:**
1. Include multiple signals in one response if needed
2. Always include explanatory text alongside signals
3. Continue using tools for actual work
4. Only signal complete when ALL work is done
5. Every response should include tool calls OR a completion signal
```

### Tool Failure Handling

Tools that fail repeatedly are blacklisted:

| Failures | Behavior |
|----------|----------|
| 1 | Retry allowed, error message to LLM |
| 2 | Warning, suggest alternative |
| 3+ | Tool removed from available tools |

The LLM receives informative error messages to adapt:

```json
{
    "error": "API rate limit exceeded",
    "failure_count": 2,
    "max_failures": 3,
    "suggestion": "Tool failed (attempt 2/3). You may retry or try a different approach."
}
```

### Memory Management

Long conversations are compressed via summarization:

```typescript
async function summarizeThreadContext(messages, maxMessages) {
    // Keep system message
    // Keep last N messages
    // Summarize middle messages via LLM
    // Return compressed history
}
```

This preserves:
- Original task context
- Recent conversation
- Key decisions and findings
- Deliverable references

---

### Workflow Implementation

```typescript
// Check if tool requires approval
const requiresApproval = checkToolRequiresApproval(
    toolDef,
    persona.autonomy_level || "full_auto",
    persona.tool_risk_overrides || {}
);

if (requiresApproval) {
    // Create approval request in database
    const { approvalId } = await createPersonaApprovalRequest({
        instanceId: personaInstanceId,
        actionType: "tool_call",
        toolName: toolCall.name,
        actionDescription: generateToolDescription(toolCall.name, toolCall.arguments),
        riskLevel: getToolRiskLevel(toolDef)
    });

    // Emit WebSocket notification
    await emitApprovalNeeded({ instanceId, approvalId, ... });

    // Wait for user decision (up to 7 days)
    pendingApprovalId = approvalId;
    approvalResponse = null;

    const gotApproval = await condition(
        () => approvalResponse !== null || cancellationRequested,
        "7 days"
    );

    if (approvalResponse?.decision === "approved") {
        // Execute the tool
    } else {
        // Skip tool, inform agent of denial
    }
}
```

---

## Activities

### Core Execution Activities

| Activity | Purpose | Timeout |
|----------|---------|---------|
| `getPersonaConfig` | Load persona definition with tools | 30 min |
| `callLLM` | LLM inference | 30 min |
| `executeToolCall` | Tool execution | 30 min |
| `saveThreadIncremental` | Persist conversation | 30 min |
| `validateInput` | Safety validation | 30 min |
| `validateOutput` | Output validation | 30 min |

### Persona-Specific Activities

| Activity | Purpose | Timeout |
|----------|---------|---------|
| `updatePersonaInstanceProgress` | Track iterations/credits | 2 min |
| `updatePersonaInstanceStatus` | Status transitions | 2 min |
| `updatePersonaClarificationState` | Clarification tracking | 2 min |
| `addPersonaMessage` | Store conversation message | 2 min |
| `createPersonaDeliverable` | Save output artifact | 2 min |
| `summarizeThreadContext` | Compress long conversations | 2 min |

### Approval Activities

| Activity | Purpose | Timeout |
|----------|---------|---------|
| `createPersonaApprovalRequest` | Create approval record | 30 sec |
| `emitApprovalNeeded` | WebSocket notification | 10 sec |
| `emitApprovalResolved` | Completion notification | 10 sec |
| `clearPendingApproval` | Cleanup after resolution | 30 sec |

### Event Emission Activities

| Activity | Purpose | Timeout |
|----------|---------|---------|
| `emitPersonaStarted` | Instance started | 10 sec |
| `emitPersonaProgress` | Progress update | 10 sec |
| `emitPersonaDeliverable` | Deliverable created | 10 sec |
| `emitPersonaCompleted` | Instance completed | 10 sec |
| `emitPersonaFailed` | Instance failed | 10 sec |

---

## WebSocket Events

Real-time events published to `persona:${instanceId}:events`:

| Event Type | When | Key Data |
|------------|------|----------|
| `persona:instance:started` | Execution begins | instanceId |
| `persona:instance:progress` | Progress update | progress object |
| `persona:instance:approval_needed` | Approval required | approval details |
| `persona:instance:approval_resolved` | User responded | decision |
| `persona:instance:deliverable` | Output created | deliverable info |
| `persona:instance:completed` | Task finished | summary |
| `persona:instance:failed` | Error occurred | error message |
| `persona:instance:message` | New message | role, content |

---

## Shared Types

All types are defined in `@flowmaestro/shared`:

```typescript
// Autonomy and risk
export type PersonaAutonomyLevel = "full_auto" | "approve_high_risk" | "approve_all";
export type PersonaApprovalRequestRiskLevel = "low" | "medium" | "high";
export type PersonaApprovalRequestStatus = "pending" | "approved" | "denied" | "expired";
export type PersonaApprovalActionType =
    | "tool_call" | "file_write" | "external_api" | "send_message" | "cost_threshold";

// Instance states
export type PersonaInstanceStatus =
    | "initializing" | "clarifying" | "running" | "waiting_approval"
    | "completed" | "cancelled" | "failed" | "timeout";

export type PersonaInstanceCompletionReason =
    | "success" | "max_duration" | "max_cost" | "cancelled" | "failed" | "user_completed";

// Categories
export type PersonaCategory =
    | "research" | "content" | "development" | "data"
    | "operations" | "business" | "proposals";

// Deliverable types
export type DeliverableType =
    | "markdown" | "csv" | "json" | "pdf" | "code" | "image" | "html";
```

---

## Repository Layer

### PersonaDefinitionRepository

```typescript
class PersonaDefinitionRepository {
    create(data): Promise<PersonaDefinitionModel>
    findById(id): Promise<PersonaDefinitionModel | null>
    findBySlug(slug): Promise<PersonaDefinitionModel | null>
    findAll(options): Promise<PersonaDefinitionModel[]>
    findGroupedByCategory(): Promise<Map<string, PersonaDefinitionModel[]>>
    update(id, data): Promise<PersonaDefinitionModel>
    upsertBySlug(slug, data): Promise<PersonaDefinitionModel>
}
```

### PersonaInstanceRepository

```typescript
class PersonaInstanceRepository {
    create(data): Promise<PersonaInstanceModel>
    findById(id): Promise<PersonaInstanceModel | null>
    findByIdAndWorkspaceId(id, workspaceId): Promise<PersonaInstanceModel | null>
    findByUserId(userId, options): Promise<PersonaInstanceModel[]>
    getDashboard(workspaceId): Promise<PersonaInstanceDashboard>
    countNeedsAttention(workspaceId): Promise<number>
    update(id, data): Promise<PersonaInstanceModel>
    updateStatus(id, status, completionReason?): Promise<PersonaInstanceModel>
    incrementProgress(id, credits, iterations): Promise<void>
    incrementClarificationExchange(id): Promise<void>
    skipClarification(id): Promise<void>
    delete(id): Promise<void>
}
```

### PersonaApprovalRequestRepository

```typescript
class PersonaApprovalRequestRepository {
    create(data): Promise<PersonaApprovalRequestModel>
    findById(id): Promise<PersonaApprovalRequestModel | null>
    findPendingByInstanceId(instanceId): Promise<PersonaApprovalRequestModel[]>
    findByInstanceId(instanceId): Promise<PersonaApprovalRequestModel[]>
    findPendingByWorkspaceId(workspaceId, options): Promise<PersonaApprovalRequestSummary[]>
    countPendingByWorkspaceId(workspaceId): Promise<number>
    update(id, data): Promise<PersonaApprovalRequestModel>
    expirePendingBefore(date): Promise<number>
    cancelPendingByInstanceId(instanceId): Promise<void>
}
```

---

## Dashboard

The dashboard API returns a three-part view optimized for the UI:

```typescript
interface PersonaInstanceDashboard {
    needs_attention: PersonaInstanceSummary[];  // Pending approvals + recent completions (24h)
    running: PersonaInstanceSummary[];          // Currently executing
    recent_completed: PersonaInstanceSummary[]; // Completed outside 24h window
}
```

---

## Templates

Task templates enable reusable patterns with variable substitution:

```typescript
interface PersonaTaskTemplate {
    id: string;
    persona_definition_id: string;
    name: string;
    description: string;

    // Template with {{variable}} placeholders
    task_template: string;

    // Variable definitions
    variables: PersonaInputField[];

    // Suggested defaults
    suggested_duration_hours: number;
    suggested_max_cost: number;

    // Analytics
    usage_count: number;
}

interface PersonaInputField {
    name: string;
    label: string;
    type: "text" | "textarea" | "select" | "multiselect" | "tags" | "number" | "checkbox";
    required: boolean;
    default_value?: string;
    options?: string[];
    placeholder?: string;
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
    };
}
```

---

## Continuation Support

Personas can continue work on completed instances:

```typescript
// Continue endpoint creates a new instance linked to parent
POST /api/persona-instances/:id/continue
{
    "additional_instructions": "Focus on the recommendations section"
}

// New instance tracks lineage
{
    parent_instance_id: "original-instance-id",
    continuation_count: 1
}
```

---

## Cost and Duration Limits

### Configuration

```typescript
interface PersonaLimits {
    max_cost_credits: number;      // Stop if accumulated cost exceeds
    max_duration_hours: number;    // Stop if elapsed time exceeds
    max_iterations: number;        // Stop after N reasoning cycles
}
```

### Enforcement

- Credits are tracked per iteration via `incrementProgress` activity
- Duration is checked against `started_at` timestamp
- When limits are reached:
  - Save current deliverables
  - Mark completion_reason as `max_cost` or `max_duration`
  - Transition to `completed` status

---

## Clarification Phase

Optional Q&A before starting autonomous work:

1. Instance starts in `clarifying` status
2. Persona asks clarifying questions
3. User provides answers via message signal
4. Detected via `clarification_complete` workflow signal or max exchanges reached
5. Transitions to `running` status

**Configuration:**
- `clarification_max_exchanges`: Limit before auto-proceeding (default: 3)
- `clarification_skipped`: User can skip via `/skip-clarification` endpoint

---

## File Structure

```
backend/
├── migrations/
│   ├── 1730000000040_create-persona-definitions-and-instances.sql
│   ├── 1730000000041_create-persona-v2-tables.sql
│   ├── 1730000000043_create-persona-task-templates.sql
│   ├── 1730000000044_add-persona-instance-continuation.sql
│   ├── 1730000000045_add-persona-clarification-fields.sql
│   ├── 1730000000046_create-persona-instance-connections.sql
│   └── 1730000000057_create-persona-approval-requests.sql
├── src/
│   ├── api/routes/
│   │   ├── personas/
│   │   │   ├── index.ts
│   │   │   ├── list.ts
│   │   │   ├── get.ts
│   │   │   └── templates.ts
│   │   └── persona-instances/
│   │       ├── index.ts
│   │       ├── create.ts
│   │       ├── list.ts
│   │       ├── get.ts
│   │       ├── message.ts
│   │       ├── cancel.ts
│   │       ├── complete.ts
│   │       ├── continue.ts
│   │       ├── skip-clarification.ts
│   │       ├── connections.ts
│   │       ├── deliverables.ts
│   │       ├── approvals.ts
│   │       ├── dashboard.ts
│   │       └── stream.ts
│   ├── storage/
│   │   ├── models/
│   │   │   ├── PersonaDefinition.ts
│   │   │   ├── PersonaInstance.ts
│   │   │   ├── PersonaApprovalRequest.ts
│   │   │   └── PersonaTaskTemplate.ts
│   │   └── repositories/
│   │       ├── PersonaDefinitionRepository.ts
│   │       ├── PersonaInstanceRepository.ts
│   │       ├── PersonaApprovalRequestRepository.ts
│   │       ├── PersonaInstanceMessageRepository.ts
│   │       ├── PersonaInstanceDeliverableRepository.ts
│   │       ├── PersonaInstanceConnectionRepository.ts
│   │       └── PersonaTaskTemplateRepository.ts
│   └── temporal/
│       ├── workflows/
│       │   ├── persona-orchestrator.ts
│       │   └── persona-signals.ts
│       └── activities/
│           └── personas/
│               ├── index.ts
│               ├── persona.ts
│               ├── events.ts
│               └── approvals.ts
shared/
└── src/
    └── persona.ts  # All shared types
```

---

## Summary

The Personas feature provides a complete solution for autonomous, long-running AI tasks with:

- **8 database tables** for comprehensive data modeling
- **20+ API endpoints** for full CRUD and actions
- **Temporal workflow** with signal-based communication
- **Approval system** with configurable autonomy levels
- **Real-time updates** via WebSocket events
- **Template system** for reusable task patterns
- **Connection management** for integration access control
- **Cost and duration limits** with enforcement
- **Clarification phase** for goal refinement
- **Continuation support** for iterative work

The implementation prioritizes simplicity (Temporal-only, no E2B) while providing enterprise-grade features for background task execution with human oversight.
