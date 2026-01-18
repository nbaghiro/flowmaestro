# Long-Running Agents: Complete Product & Technical Specification

> **Status**: Draft Specification
> **Version**: 1.0
> **Created**: January 2026
> **Last Updated**: January 2026
> **Authors**: Engineering Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Specification](#product-specification)
    - [User Personas & Use Cases](#user-personas--use-cases)
    - [Core Concepts](#core-concepts)
    - [User Flows](#user-flows)
    - [UI/UX Specifications](#uiux-specifications)
    - [Agent Configuration](#agent-configuration)
    - [Notification System](#notification-system)
    - [Edge Cases & Error Handling](#edge-cases--error-handling)
3. [Technical Specification](#technical-specification)
    - [Architecture Overview](#architecture-overview)
    - [Database Schema](#database-schema)
    - [API Specifications](#api-specifications)
    - [WebSocket Events](#websocket-events)
    - [Temporal Workflow Changes](#temporal-workflow-changes)
    - [Frontend Implementation](#frontend-implementation)
4. [Implementation Plan](#implementation-plan)
5. [Testing Strategy](#testing-strategy)
6. [Migration & Rollout](#migration--rollout)
7. [Future Considerations](#future-considerations)

---

# Executive Summary

## Problem Statement

Current FlowMaestro agents are limited to short interactions:

- **5-minute timeout** when waiting for user input
- **100 iteration limit** (~30-60 minutes of work)
- **No approval mechanism** for risky actions
- **No deliverable tracking** for produced artifacts

Users need agents that can work autonomously for hours on complex tasks like research, content creation, code development, and data processing.

## Solution

Implement "Guided Autonomy" - a model where agents:

1. Work **autonomously** on safe actions (reading, searching, analyzing, drafting)
2. **Pause indefinitely** when needing approval for risky actions
3. **Notify users** via in-app and integrations when approval is needed
4. **Produce deliverables** as tangible output artifacts
5. Respect **configurable limits** (duration, cost, iterations)

## Success Metrics

| Metric                   | Current             | Target                   |
| ------------------------ | ------------------- | ------------------------ |
| Max agent runtime        | ~1 hour             | 8+ hours                 |
| User response window     | 5 minutes           | Unlimited                |
| Tasks requiring approval | 0% (all or nothing) | Configurable per tool    |
| Deliverable tracking     | None                | Full artifact management |

---

# Product Specification

## User Personas & Use Cases

### Persona 1: Research Analyst (Sarah)

**Background**: Marketing manager who needs competitive intelligence

**Use Case**: "Analyze our top 5 competitors and produce a comprehensive report"

**Workflow**:

1. Sarah describes the task to her "Research Agent"
2. Agent clarifies: competitors, aspects to analyze, data sources
3. Agent works for 2-3 hours: web searches, KB queries, analysis
4. Agent pauses to ask: "Can I query this paid API?" (costs $2)
5. Sarah approves 3 hours later when she checks her notifications
6. Agent produces: `competitive-report.md`, `pricing-matrix.csv`, `market-share-chart.png`
7. Sarah reviews deliverables and requests revisions
8. Agent finalizes and delivers

### Persona 2: Software Developer (Marcus)

**Background**: Backend engineer who needs code refactoring help

**Use Case**: "Refactor the authentication module to use the new session pattern"

**Workflow**:

1. Marcus describes the refactoring goal
2. Agent explores codebase, understands current patterns
3. Agent drafts changes across 15 files
4. Agent pauses: "Ready to create a PR with these changes"
5. Marcus reviews the diff, approves
6. Agent creates PR, links to deliverables
7. Marcus reviews final PR in GitHub

### Persona 3: Data Analyst (Priya)

**Background**: Business analyst who needs regular data exports

**Use Case**: "Generate monthly sales report with regional breakdowns"

**Workflow**:

1. Priya configures agent with data sources and report template
2. Agent queries databases, processes data, generates visualizations
3. Agent pauses: "Ready to write 15 files to /exports folder"
4. Priya approves batch file operations
5. Agent produces deliverables and notifies completion

---

## Core Concepts

### 1. Guided Autonomy

The fundamental operating model for long-running agents:

```
+------------------+     +------------------+     +------------------+
|   SAFE ACTIONS   | --> | APPROVAL NEEDED  | --> |    APPROVED      |
|   (Autonomous)   |     |    (Paused)      |     |   (Continues)    |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        v                        v
  - Web search            - External APIs          - Execute action
  - Read files            - Write files            - Continue work
  - Query KB              - Send messages
  - Analyze data          - Spend credits
  - Draft content         - Irreversible ops
```

### 2. Approval Requests

When an agent needs to perform a risky action, it creates an **Approval Request**:

| Field          | Description                                                              |
| -------------- | ------------------------------------------------------------------------ |
| Action Type    | What category: `tool_call`, `file_write`, `external_api`, `send_message` |
| Tool Name      | Which tool: `slack_send_message`, `github_create_pr`, etc.               |
| Description    | Human-readable: "Send summary to #marketing channel"                     |
| Risk Level     | `low`, `medium`, `high` based on impact                                  |
| Estimated Cost | Credits/money this action will consume                                   |
| Context        | Why the agent wants to do this                                           |
| Arguments      | The actual parameters to be used                                         |

### 3. Deliverables

Tangible artifacts produced by agents:

| Type      | Examples                        | Storage                           |
| --------- | ------------------------------- | --------------------------------- |
| Documents | Reports, analysis, summaries    | Inline (DB) or file storage       |
| Code      | Source files, patches, PRs      | File storage or external (GitHub) |
| Data      | CSV exports, JSON, spreadsheets | File storage                      |
| Media     | Charts, diagrams, images        | File storage                      |

### 4. Execution States

```
                    +---> WAITING_APPROVAL ---> APPROVED --+
                    |                                      |
STARTING --> RUNNING ---> COMPLETED                        |
                    |                                      |
                    +---> FAILED                           |
                    |                                      |
                    +---> CANCELLED                        |
                    |                                      |
                    +---> TIMEOUT (duration/cost limit) <--+
```

---

## User Flows

### Flow 1: Starting a Long-Running Task

```
User                          System                         Agent
  |                              |                              |
  |-- "Analyze competitors" ---->|                              |
  |                              |-- Create thread ------------>|
  |                              |-- Start execution ---------->|
  |                              |                              |
  |<---- "I have questions:" ----|<---- Clarifying questions ---|
  |                              |                              |
  |-- Answers questions -------->|-- Forward to agent --------->|
  |                              |                              |
  |<---- "Starting work..." -----|<---- Confirm goal ----------|
  |                              |                              |
  |                              |    [Agent works autonomously]|
  |                              |                              |
  |<---- Progress updates -------|<---- Streaming status -------|
```

### Flow 2: Approval Request

```
User                          System                         Agent
  |                              |                              |
  |                              |    [Agent needs approval]    |
  |                              |                              |
  |                              |<-- Create ApprovalRequest ---|
  |                              |                              |
  |<-- In-app notification ------|                              |
  |<-- Slack notification -------|                              |
  |                              |                              |
  |    [User reviews later]      |    [Agent waits indefinitely]|
  |                              |                              |
  |-- Click "Approve" ---------->|                              |
  |                              |-- Signal workflow ---------->|
  |                              |                              |
  |<---- "Continuing..." --------|<---- Resume execution -------|
```

### Flow 3: Denial and Recovery

```
User                          System                         Agent
  |                              |                              |
  |-- Click "Deny" + reason ---->|                              |
  |                              |-- Signal workflow ---------->|
  |                              |                              |
  |                              |<-- Add denial to context ----|
  |                              |                              |
  |<---- "I'll try another" -----|<---- LLM decides next step --|
  |                              |                              |
  |                              |    [Agent continues work     |
  |                              |     with alternative approach]|
```

### Flow 4: Deliverable Creation

```
User                          System                         Agent
  |                              |                              |
  |                              |<-- Tool: create_deliverable -|
  |                              |                              |
  |                              |-- Store in DB/file storage --|
  |                              |                              |
  |<-- "Deliverable ready" ------|<-- Emit event ---------------|
  |                              |                              |
  |-- View deliverables -------->|                              |
  |                              |-- Fetch from storage ------->|
  |<---- Display artifacts ------|                              |
```

### Flow 5: Timeout/Limit Reached

```
User                          System                         Agent
  |                              |                              |
  |                              |    [Duration limit reached]  |
  |                              |                              |
  |                              |<-- Save current state -------|
  |                              |<-- Create final deliverables-|
  |                              |                              |
  |<-- "Time limit reached" -----|<-- Emit completion event ----|
  |                              |                              |
  |-- Review partial work ------>|                              |
  |                              |                              |
  |    [Option to continue       |                              |
  |     with new execution]      |                              |
```

---

## UI/UX Specifications

### 1. Agent Configuration Panel

When creating/editing an agent, users configure long-running behavior:

```
+------------------------------------------------------------------+
| Agent Settings                                                    |
+------------------------------------------------------------------+
|                                                                   |
| AUTONOMY & APPROVALS                                              |
| ----------------------------------------------------------------- |
|                                                                   |
| Autonomy Level:                                                   |
| [v] Approve high-risk actions (Recommended)                       |
|     Agent pauses for external APIs, file writes, and costly       |
|     operations. Works autonomously on safe actions.               |
|                                                                   |
| [ ] Full autonomy                                                 |
|     Agent executes all actions without asking. Use with caution.  |
|                                                                   |
| [ ] Approve at milestones                                         |
|     Agent pauses at major phase transitions for review.           |
|                                                                   |
| [ ] Approve all actions                                           |
|     Agent asks before every significant action.                   |
|                                                                   |
| ----------------------------------------------------------------- |
|                                                                   |
| EXECUTION LIMITS                                                  |
| ----------------------------------------------------------------- |
|                                                                   |
| Maximum Duration:                                                 |
| +--------------------------------------------------+              |
| | 4 hours                                     [v]  |              |
| +--------------------------------------------------+              |
| Options: 30 min, 1 hour, 2 hours, 4 hours, 8 hours, No limit      |
|                                                                   |
| Maximum Cost:                                                     |
| +--------------------------------------------------+              |
| | 100 credits                                 [v]  |              |
| +--------------------------------------------------+              |
| Agent will stop if accumulated cost exceeds this limit.           |
|                                                                   |
| Maximum Iterations:                                               |
| +--------------------------------------------------+              |
| | 500                                         [v]  |              |
| +--------------------------------------------------+              |
| Number of reasoning cycles before stopping.                       |
|                                                                   |
| ----------------------------------------------------------------- |
|                                                                   |
| TOOL RISK OVERRIDES                                               |
| ----------------------------------------------------------------- |
|                                                                   |
| Override default risk levels for specific tools:                  |
|                                                                   |
| | Tool                  | Default Risk | Your Setting |           |
| |-----------------------|--------------|--------------|           |
| | slack_send_message    | High         | [High    v]  |           |
| | github_create_pr      | High         | [Safe    v]  |           |
| | web_search            | Safe         | [Safe    v]  |           |
| | write_file            | High         | [High    v]  |           |
|                                                                   |
| [+ Add override]                                                  |
|                                                                   |
+-------------------------------------------------------------------+
```

### 2. Thread View (During Execution)

Enhanced thread view showing agent status and approval requests:

```
+-------------------------------------------------------------------+
| Research Agent - Competitive Analysis                    [Cancel] |
+-------------------------------------------------------------------+
| Status: RUNNING                        Duration: 1h 23m           |
| Progress: 45/~200 iterations           Cost: 23 credits           |
+-------------------------------------------------------------------+
|                                                                   |
| [9:00 AM] You                                                     |
| Analyze our top 5 competitors: Acme, Beta, Gamma, Delta, Echo.    |
| Focus on pricing, features, and market position. Produce a        |
| comprehensive report in Markdown format.                          |
|                                                                   |
| [9:01 AM] Research Agent                                          |
| I'll analyze these 5 competitors across pricing, features, and    |
| market position. I'll use web search and your knowledge base.     |
| Estimated time: 2-3 hours.                                        |
|                                                                   |
| [9:05 AM] Research Agent                                          |
| Starting with Acme Corp. Found their pricing page and 3 recent    |
| reviews. Analyzing...                                             |
|                                                                   |
| [9:45 AM] Research Agent                                          |
| Completed analysis of Acme and Beta. Moving to Gamma.             |
|                                                                   |
| [10:23 AM] Research Agent                                         |
| +---------------------------------------------------------------+ |
| | APPROVAL NEEDED                                               | |
| |                                                               | |
| | I'd like to query the Crunchbase API to get funding data for  | |
| | Delta Corp. This will provide accurate funding history.       | |
| |                                                               | |
| | ACTION: Query Crunchbase API                                  | |
| | COST: ~5 credits                                              | |
| | RISK: Medium (external paid API)                              | |
| |                                                               | |
| | +------------+  +----------+  +---------------+               | |
| | |  Approve   |  |   Deny   |  | View Details  |               | |
| | +------------+  +----------+  +---------------+               | |
| +---------------------------------------------------------------+ |
|                                                                   |
| [Waiting for your response...]                                    |
|                                                                   |
+-------------------------------------------------------------------+
| Type a message...                                          [Send] |
+-------------------------------------------------------------------+
```

### 3. Approval Queue (Global View)

Accessible from main navigation - shows all pending approvals:

```
+-------------------------------------------------------------------+
| Pending Approvals (3)                           [Settings] [Help] |
+-------------------------------------------------------------------+
|                                                                   |
| FILTER: [All Agents v]  [All Risk Levels v]  [Sort: Oldest First] |
|                                                                   |
+-------------------------------------------------------------------+
|                                                                   |
| +---------------------------------------------------------------+ |
| | Research Agent                                 Waiting 2h 15m | |
| | Thread: Competitive Analysis                                  | |
| |                                                               | |
| | Wants to: Query Crunchbase API for Delta Corp funding data    | |
| | Risk: MEDIUM    Cost: ~5 credits                              | |
| |                                                               | |
| | +------------+  +----------+  +---------------+               | |
| | |  Approve   |  |   Deny   |  | View Context  |               | |
| | +------------+  +----------+  +---------------+               | |
| +---------------------------------------------------------------+ |
|                                                                   |
| +---------------------------------------------------------------+ |
| | Code Assistant                                    Waiting 45m | |
| | Thread: Auth Module Refactor                                  | |
| |                                                               | |
| | Wants to: Create pull request with 15 file changes            | |
| | Risk: HIGH    Cost: 0 credits                                 | |
| |                                                               | |
| | +------------+  +----------+  +---------------+               | |
| | |  Approve   |  |   Deny   |  | View Diff     |               | |
| | +------------+  +----------+  +---------------+               | |
| +---------------------------------------------------------------+ |
|                                                                   |
| +---------------------------------------------------------------+ |
| | Data Export Agent                                 Waiting 10m | |
| | Thread: Monthly Sales Report                                  | |
| |                                                               | |
| | Wants to: Write 15 files to /exports/2026-01/                 | |
| | Risk: MEDIUM    Cost: 0 credits                               | |
| |                                                               | |
| | +---------------+  +---------------+  +----------+            | |
| | | Approve All   |  | Review Each   |  |   Deny   |            | |
| | +---------------+  +---------------+  +----------+            | |
| +---------------------------------------------------------------+ |
|                                                                   |
+-------------------------------------------------------------------+
```

### 4. Approval Detail Modal

When user clicks "View Details" or "View Context":

```
+-------------------------------------------------------------------+
| Approval Request Details                                     [X]  |
+-------------------------------------------------------------------+
|                                                                   |
| AGENT: Research Agent                                             |
| THREAD: Competitive Analysis                                      |
| WAITING: 2 hours 15 minutes                                       |
|                                                                   |
+-------------------------------------------------------------------+
| ACTION DETAILS                                                    |
+-------------------------------------------------------------------+
|                                                                   |
| Type: External API Call                                           |
| Tool: crunchbase_query                                            |
| Risk Level: MEDIUM                                                |
| Estimated Cost: 5 credits                                         |
|                                                                   |
| Description:                                                      |
| Query the Crunchbase API to retrieve funding history and investor |
| information for Delta Corp. This will provide accurate data for   |
| the competitive analysis report.                                  |
|                                                                   |
| Arguments:                                                        |
| +---------------------------------------------------------------+ |
| | {                                                             | |
| |   "company_name": "Delta Corp",                               | |
| |   "fields": ["funding_rounds", "investors", "total_funding"], | |
| |   "include_news": false                                       | |
| | }                                                             | |
| +---------------------------------------------------------------+ |
|                                                                   |
+-------------------------------------------------------------------+
| CONTEXT (What agent has done so far)                              |
+-------------------------------------------------------------------+
|                                                                   |
| - Completed analysis of Acme Corp (pricing, features, reviews)    |
| - Completed analysis of Beta Inc (pricing, features, reviews)     |
| - Completed analysis of Gamma Ltd (pricing, features, reviews)    |
| - Started analysis of Delta Corp                                  |
| - Found Delta's website and basic info via web search             |
| - Unable to find reliable funding data via public sources         |
| - Proposing to use Crunchbase API for accurate funding info       |
|                                                                   |
+-------------------------------------------------------------------+
| ALTERNATIVES (if denied)                                          |
+-------------------------------------------------------------------+
|                                                                   |
| If you deny this request, I will:                                 |
| - Use estimated funding data from news articles (less accurate)   |
| - Note in the report that exact funding figures are unavailable   |
| - Continue with the remaining competitors                         |
|                                                                   |
+-------------------------------------------------------------------+
|                                                                   |
| Add a note (optional):                                            |
| +---------------------------------------------------------------+ |
| |                                                               | |
| +---------------------------------------------------------------+ |
|                                                                   |
| +-------------------+  +-------------------+                      |
| |      Approve      |  |       Deny        |                      |
| +-------------------+  +-------------------+                      |
|                                                                   |
+-------------------------------------------------------------------+
```

### 5. Deliverables View

Accessible from agent detail page or thread:

```
+-------------------------------------------------------------------+
| Deliverables                                   [Download All ZIP] |
+-------------------------------------------------------------------+
|                                                                   |
| FILTER: [All Types v]  [All Agents v]  [Last 30 days v]           |
|                                                                   |
+-------------------------------------------------------------------+
|                                                                   |
| Competitive Analysis                             Completed 2h ago |
| Agent: Research Agent                                             |
| +---------------------------------------------------------------+ |
| |                                                               | |
| | +-- competitive-report.md                           12.4 KB   | |
| | |   Comprehensive analysis of 5 competitors                   | |
| | |   [Preview] [Download] [Copy to Clipboard]                  | |
| | |                                                             | |
| | +-- pricing-comparison.csv                           2.1 KB   | |
| | |   Pricing matrix across all competitors                     | |
| | |   [Preview] [Download] [Open in Sheets]                     | |
| | |                                                             | |
| | +-- market-share-chart.png                          156 KB    | |
| |     Market share visualization                                | |
| |     [Preview] [Download]                                      | |
| |                                                               | |
| +---------------------------------------------------------------+ |
|                                                                   |
| Auth Module Refactor                               In Progress    |
| Agent: Code Assistant                                             |
| +---------------------------------------------------------------+ |
| |                                                               | |
| | +-- refactored-files.patch                         45.2 KB    | |
| | |   Unified diff of all changes (draft)                       | |
| | |   [Preview Diff] [Download]                                 | |
| | |                                                             | |
| | +-- [Pending: Pull Request]                                   | |
| |     Waiting for approval to create PR                         | |
| |                                                               | |
| +---------------------------------------------------------------+ |
|                                                                   |
+-------------------------------------------------------------------+
```

### 6. Navigation Badge

Main navigation shows pending approval count:

```
+-------------------------------------------------------------------+
|  FlowMaestro    |  Workflows  |  Agents (3)  |  KBs  |  Settings  |
+-------------------------------------------------------------------+
                              ^
                              |
                        Badge showing 3
                        pending approvals
```

---

## Agent Configuration

### Configuration Schema

```typescript
interface AgentLongRunningConfig {
    // Autonomy settings
    autonomy_level: "full" | "approve_high_risk" | "approve_milestones" | "approve_all";

    // Execution limits
    max_duration_hours: number; // 0 = no limit, max 24
    max_cost_credits: number; // 0 = no limit
    max_iterations: number; // Default 500 for long-running

    // Tool risk overrides
    tool_risk_overrides: {
        [tool_name: string]: "safe" | "approval_required";
    };

    // Notification preferences (per-agent)
    notifications: {
        slack_channel_id?: string; // Optional Slack channel for approvals
        email_on_completion: boolean;
        email_on_approval_needed: boolean;
    };
}
```

### Default Risk Classifications

| Tool Category       | Tool Examples                                          | Default Risk      |
| ------------------- | ------------------------------------------------------ | ----------------- |
| **Read Operations** | `web_search`, `read_file`, `query_kb`, `search_memory` | Safe              |
| **Internal Write**  | `update_working_memory`, `create_deliverable`          | Safe              |
| **External Write**  | `slack_send_message`, `email_send`, `github_create_pr` | Approval Required |
| **File System**     | `write_file`, `delete_file`, `move_file`               | Approval Required |
| **Paid APIs**       | `crunchbase_query`, `clearbit_enrich`                  | Approval Required |
| **Database**        | `db_insert`, `db_update`, `db_delete`                  | Approval Required |

### Autonomy Level Behaviors

| Level                | Safe Actions     | Risky Actions    | Milestone Pauses        |
| -------------------- | ---------------- | ---------------- | ----------------------- |
| `full`               | Auto-execute     | Auto-execute     | No                      |
| `approve_high_risk`  | Auto-execute     | Request approval | No                      |
| `approve_milestones` | Auto-execute     | Auto-execute     | Yes (phase transitions) |
| `approve_all`        | Request approval | Request approval | No                      |

---

## Notification System

### In-App Notifications

Real-time notifications via WebSocket:

```typescript
interface ApprovalNotification {
    type: "approval_needed";
    approval_id: string;
    agent_id: string;
    agent_name: string;
    thread_id: string;
    thread_title: string;
    action_summary: string;
    risk_level: "low" | "medium" | "high";
    estimated_cost: number | null;
    created_at: string;
}
```

**Display Behavior**:

- Toast notification appears in bottom-right
- Badge count updates on Agents nav item
- Notification persists until dismissed or actioned
- Click opens approval detail modal

### Slack Integration (Future Phase)

```
+-------------------------------------------------------------------+
| FlowMaestro Agent needs your approval              [View in App]  |
+-------------------------------------------------------------------+
|                                                                   |
| Research Agent is waiting for approval in "Competitive Analysis"  |
|                                                                   |
| ACTION: Query Crunchbase API for Delta Corp funding data          |
| RISK: Medium    COST: ~5 credits                                  |
|                                                                   |
| The agent wants to query an external API to get accurate funding  |
| information for your competitive analysis report.                 |
|                                                                   |
| +------------+  +----------+                                      |
| |  Approve   |  |   Deny   |                                      |
| +------------+  +----------+                                      |
|                                                                   |
+-------------------------------------------------------------------+
```

---

## Edge Cases & Error Handling

### Edge Case 1: Approval Request Expires

**Scenario**: User never responds to approval request

**Behavior**:

- Approval requests do NOT auto-expire by default
- Agent remains paused indefinitely
- User can configure auto-deny after N hours (optional setting)
- Admin can bulk-expire old requests

**UI**: Show "Waiting X days" with option to cancel execution

### Edge Case 2: User Cancels During Approval Wait

**Scenario**: User clicks "Cancel Execution" while agent is waiting

**Behavior**:

- Agent receives cancel signal
- Current work is saved as draft deliverables
- Approval request is marked as "expired"
- Status changes to "cancelled"

### Edge Case 3: Duration Limit During Approval Wait

**Scenario**: Agent hits max_duration_hours while waiting for approval

**Behavior**:

- Wait time DOES count toward duration limit
- When limit reached: save state, mark approval as "expired", complete execution
- Deliverables produced so far are preserved

### Edge Case 4: Cost Limit Approached

**Scenario**: Agent is close to max_cost_credits

**Behavior**:

- At 80% of limit: emit warning event
- Agent sees warning in context: "Approaching cost limit"
- Agent can request approval for remaining budget
- At 100%: stop execution, save deliverables

### Edge Case 5: Multiple Pending Approvals

**Scenario**: Agent requests approval for 3 tool calls in one iteration

**Behavior**:

- Create 3 separate ApprovalRequests
- All must be approved/denied before continuing
- User can approve/deny individually or batch
- Partial approval: approved tools execute, denied skip

### Edge Case 6: Tool Execution Fails After Approval

**Scenario**: User approves, but tool call fails (API error, timeout)

**Behavior**:

- Error added to agent context
- Agent decides next step (retry, alternative, skip)
- No re-approval needed for retry of same action
- New approval needed if agent tries different approach

### Edge Case 7: User Sends Message During Agent Work

**Scenario**: User types message while agent is autonomously working

**Behavior**:

- Message queued via existing signal mechanism
- Agent processes at next iteration
- Can interrupt/redirect agent's work
- Agent acknowledges and adapts

### Edge Case 8: Connection Lost During Long Execution

**Scenario**: User closes browser, loses connection for hours

**Behavior**:

- Agent continues working (Temporal durability)
- Approval requests persist in database
- User sees current state when reconnecting
- WebSocket reconnection restores real-time updates

---

# Technical Specification

## Architecture Overview

### System Components

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|    Frontend      |<--->|    Backend       |<--->|    Temporal      |
|    (React)       |     |    (Fastify)     |     |    (Workflows)   |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        |                        |                        |
        v                        v                        v
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|    WebSocket     |     |    PostgreSQL    |     |    Redis         |
|    (Socket.IO)   |     |    (Database)    |     |    (Events)      |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
```

### Data Flow for Approval

```
1. Agent (Temporal) detects risky tool call
2. Agent calls createApprovalRequest activity
3. Activity inserts ApprovalRequest in PostgreSQL
4. Activity publishes notification via Redis pub/sub
5. Backend receives Redis event
6. Backend emits WebSocket event to user
7. Frontend displays notification/badge
8. User clicks Approve in UI
9. Frontend calls POST /api/approvals/:id/approve
10. Backend validates and signals Temporal workflow
11. Workflow receives signal, continues execution
12. Backend updates ApprovalRequest status
```

---

## Database Schema

### New Tables

#### `approval_requests`

```sql
CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationships
    execution_id UUID NOT NULL REFERENCES agent_executions(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,

    -- Action details
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'tool_call', 'file_write', 'external_api', 'send_message', 'batch_operation'
    )),
    tool_name VARCHAR(255),
    action_description TEXT NOT NULL,
    action_arguments JSONB NOT NULL DEFAULT '{}',

    -- Risk assessment
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    estimated_cost_credits DECIMAL(10, 2),

    -- Context
    agent_context TEXT,  -- Summary of what agent has done so far
    alternatives TEXT,   -- What agent will do if denied

    -- State
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'denied', 'expired', 'cancelled'
    )),

    -- Response
    responded_by UUID REFERENCES users(id),
    responded_at TIMESTAMPTZ,
    response_note TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,  -- Optional auto-expiry

    -- Indexes
    CONSTRAINT fk_execution FOREIGN KEY (execution_id) REFERENCES agent_executions(id)
);

CREATE INDEX idx_approval_requests_user_status ON approval_requests(user_id, status);
CREATE INDEX idx_approval_requests_workspace_status ON approval_requests(workspace_id, status);
CREATE INDEX idx_approval_requests_execution ON approval_requests(execution_id);
CREATE INDEX idx_approval_requests_created_at ON approval_requests(created_at DESC);
```

#### `deliverables`

```sql
CREATE TABLE deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationships
    execution_id UUID REFERENCES agent_executions(id) ON DELETE SET NULL,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,

    -- Deliverable info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'document', 'code', 'data', 'media', 'other'
    )),
    mime_type VARCHAR(100),

    -- Storage
    storage_type VARCHAR(20) NOT NULL CHECK (storage_type IN (
        'inline', 'file', 'external'
    )),
    content TEXT,                    -- For inline storage (< 1MB)
    file_path VARCHAR(500),          -- For file storage
    file_size_bytes BIGINT,
    external_url VARCHAR(1000),      -- For external storage (GitHub PR, etc.)
    external_metadata JSONB,         -- External system IDs, etc.

    -- State
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'final', 'archived'
    )),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Indexes
    CONSTRAINT check_storage CHECK (
        (storage_type = 'inline' AND content IS NOT NULL) OR
        (storage_type = 'file' AND file_path IS NOT NULL) OR
        (storage_type = 'external' AND external_url IS NOT NULL)
    )
);

CREATE INDEX idx_deliverables_user ON deliverables(user_id);
CREATE INDEX idx_deliverables_workspace ON deliverables(workspace_id);
CREATE INDEX idx_deliverables_agent ON deliverables(agent_id);
CREATE INDEX idx_deliverables_execution ON deliverables(execution_id);
CREATE INDEX idx_deliverables_created_at ON deliverables(created_at DESC);
```

### Schema Modifications

#### `agents` table additions

```sql
ALTER TABLE agents ADD COLUMN autonomy_level VARCHAR(30)
    NOT NULL DEFAULT 'approve_high_risk'
    CHECK (autonomy_level IN ('full', 'approve_high_risk', 'approve_milestones', 'approve_all'));

ALTER TABLE agents ADD COLUMN max_duration_hours DECIMAL(5, 2)
    NOT NULL DEFAULT 4.0
    CHECK (max_duration_hours >= 0 AND max_duration_hours <= 24);

ALTER TABLE agents ADD COLUMN max_cost_credits INTEGER
    NOT NULL DEFAULT 100
    CHECK (max_cost_credits >= 0);

ALTER TABLE agents ADD COLUMN tool_risk_overrides JSONB
    NOT NULL DEFAULT '{}';

ALTER TABLE agents ADD COLUMN long_running_notifications JSONB
    NOT NULL DEFAULT '{"email_on_completion": false, "email_on_approval_needed": false}';
```

#### `agent_executions` table additions

```sql
ALTER TABLE agent_executions ADD COLUMN started_at TIMESTAMPTZ;
ALTER TABLE agent_executions ADD COLUMN duration_limit_at TIMESTAMPTZ;
ALTER TABLE agent_executions ADD COLUMN accumulated_cost_credits DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE agent_executions ADD COLUMN pending_approval_id UUID REFERENCES approval_requests(id);
ALTER TABLE agent_executions ADD COLUMN completion_reason VARCHAR(50)
    CHECK (completion_reason IN (
        'success', 'max_iterations', 'max_duration', 'max_cost',
        'cancelled', 'failed', 'approval_timeout'
    ));
```

---

## API Specifications

### Approval Endpoints

#### List Pending Approvals

```
GET /api/approvals
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (default: "pending") |
| agent_id | UUID | Filter by agent |
| limit | number | Results per page (default: 20) |
| offset | number | Pagination offset |

**Response**:

```json
{
    "success": true,
    "data": {
        "approvals": [
            {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "execution_id": "...",
                "agent_id": "...",
                "agent_name": "Research Agent",
                "thread_id": "...",
                "thread_title": "Competitive Analysis",
                "action_type": "tool_call",
                "tool_name": "crunchbase_query",
                "action_description": "Query Crunchbase API for Delta Corp funding data",
                "risk_level": "medium",
                "estimated_cost_credits": 5,
                "status": "pending",
                "created_at": "2026-01-18T10:23:00Z",
                "waiting_duration_seconds": 8100
            }
        ],
        "total": 3,
        "has_more": false
    }
}
```

#### Get Approval Details

```
GET /api/approvals/:id
```

**Response**:

```json
{
    "success": true,
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "execution_id": "...",
        "agent_id": "...",
        "agent_name": "Research Agent",
        "thread_id": "...",
        "thread_title": "Competitive Analysis",
        "action_type": "tool_call",
        "tool_name": "crunchbase_query",
        "action_description": "Query Crunchbase API for Delta Corp funding data",
        "action_arguments": {
            "company_name": "Delta Corp",
            "fields": ["funding_rounds", "investors", "total_funding"]
        },
        "risk_level": "medium",
        "estimated_cost_credits": 5,
        "agent_context": "Completed analysis of Acme, Beta, Gamma. Started Delta...",
        "alternatives": "If denied, will use estimated data from news articles.",
        "status": "pending",
        "created_at": "2026-01-18T10:23:00Z"
    }
}
```

#### Approve Request

```
POST /api/approvals/:id/approve
```

**Request Body**:

```json
{
    "note": "Optional note explaining approval"
}
```

**Response**:

```json
{
    "success": true,
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "status": "approved",
        "responded_at": "2026-01-18T12:38:00Z"
    }
}
```

**Side Effects**:

- Updates ApprovalRequest status to "approved"
- Signals Temporal workflow with approval
- Emits WebSocket event to update UI

#### Deny Request

```
POST /api/approvals/:id/deny
```

**Request Body**:

```json
{
    "note": "Reason for denial (shown to agent)"
}
```

**Response**:

```json
{
    "success": true,
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "status": "denied",
        "responded_at": "2026-01-18T12:38:00Z"
    }
}
```

#### Batch Approve/Deny

```
POST /api/approvals/batch
```

**Request Body**:

```json
{
    "approval_ids": ["id1", "id2", "id3"],
    "decision": "approved",
    "note": "Batch approval for data export"
}
```

### Deliverable Endpoints

#### List Deliverables

```
GET /api/deliverables
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| agent_id | UUID | Filter by agent |
| execution_id | UUID | Filter by execution |
| type | string | Filter by type |
| status | string | Filter by status |
| limit | number | Results per page |
| offset | number | Pagination offset |

**Response**:

```json
{
    "success": true,
    "data": {
        "deliverables": [
            {
                "id": "...",
                "name": "competitive-report.md",
                "description": "Comprehensive analysis of 5 competitors",
                "type": "document",
                "mime_type": "text/markdown",
                "storage_type": "inline",
                "file_size_bytes": 12700,
                "status": "final",
                "execution_id": "...",
                "agent_name": "Research Agent",
                "created_at": "2026-01-18T12:30:00Z"
            }
        ],
        "total": 10
    }
}
```

#### Get Deliverable Content

```
GET /api/deliverables/:id/content
```

**Response**:

- For `inline`: Returns content in response body
- For `file`: Returns file download
- For `external`: Returns redirect to external URL

#### Download All (ZIP)

```
GET /api/deliverables/download?execution_id=...
```

Returns ZIP file containing all deliverables for an execution.

### Agent Execution Modifications

#### Cancel Execution

```
POST /api/agents/:id/executions/:execution_id/cancel
```

**Response**:

```json
{
    "success": true,
    "data": {
        "execution_id": "...",
        "status": "cancelled",
        "deliverables_preserved": 3
    }
}
```

---

## WebSocket Events

### New Events

#### `approval:needed`

Emitted when agent needs approval:

```typescript
{
    event: "approval:needed",
    data: {
        approval_id: string;
        execution_id: string;
        agent_id: string;
        agent_name: string;
        thread_id: string;
        thread_title: string;
        action_type: string;
        tool_name: string;
        action_description: string;
        risk_level: "low" | "medium" | "high";
        estimated_cost_credits: number | null;
        created_at: string;
    }
}
```

#### `approval:resolved`

Emitted when approval is approved/denied:

```typescript
{
    event: "approval:resolved",
    data: {
        approval_id: string;
        execution_id: string;
        status: "approved" | "denied";
        responded_at: string;
    }
}
```

#### `deliverable:created`

Emitted when agent creates a deliverable:

```typescript
{
    event: "deliverable:created",
    data: {
        deliverable_id: string;
        execution_id: string;
        agent_id: string;
        name: string;
        type: string;
        status: "draft" | "final";
    }
}
```

#### `execution:limit_warning`

Emitted when approaching limits:

```typescript
{
    event: "execution:limit_warning",
    data: {
        execution_id: string;
        warning_type: "duration" | "cost" | "iterations";
        current_value: number;
        limit_value: number;
        percentage: number;  // e.g., 80
    }
}
```

---

## Temporal Workflow Changes

### Modified Workflow: `agentOrchestratorWorkflow`

**File**: `backend/src/temporal/workflows/agent-orchestrator.ts`

#### New Imports and Signals

```typescript
import {
    defineSignal,
    setHandler,
    condition,
    proxyActivities,
    continueAsNew
} from "@temporalio/workflow";

// New signals
export const approvalSignal = defineSignal<[string, "approved" | "denied", string?]>("approval");
export const cancelSignal = defineSignal("cancel");

// Existing signal
export const userMessageSignal = defineSignal<[string]>("userMessage");
```

#### New Activities

```typescript
// Proxy for approval activities
const {
    createApprovalRequest,
    updateApprovalRequest,
    emitApprovalNeeded,
    createDeliverable,
    updateDeliverable
} = proxyActivities<typeof approvalActivities>({
    startToCloseTimeout: "30 seconds",
    retry: RETRY_POLICIES.DEFAULT
});
```

#### Workflow Input Modifications

```typescript
interface AgentOrchestratorInput {
    // ... existing fields

    // New fields
    startedAt?: number; // For continue-as-new to track original start
    accumulatedCostCredits?: number; // For continue-as-new to track costs
}
```

#### Main Loop Modifications

```typescript
export async function agentOrchestratorWorkflow(
    input: AgentOrchestratorInput
): Promise<AgentOrchestratorOutput> {
    const {
        executionId,
        agentId,
        userId,
        workspaceId,
        threadId
        // ...
    } = input;

    // Track execution start time
    const executionStartTime = input.startedAt || Date.now();
    let accumulatedCost = input.accumulatedCostCredits || 0;

    // Calculate duration limit
    const maxDurationMs = agent.max_duration_hours * 60 * 60 * 1000;

    // Cancel handling
    let cancelRequested = false;
    setHandler(cancelSignal, () => {
        cancelRequested = true;
    });

    // Approval handling
    let pendingApprovalResolve: ((result: ApprovalResult) => void) | null = null;
    let pendingApprovalId: string | null = null;

    setHandler(approvalSignal, (approvalId, decision, note) => {
        if (pendingApprovalId === approvalId && pendingApprovalResolve) {
            pendingApprovalResolve({ decision, note });
            pendingApprovalResolve = null;
            pendingApprovalId = null;
        }
    });

    // Main loop
    while (currentIterations < maxIterations) {
        // Check cancel
        if (cancelRequested) {
            await saveCurrentState();
            return { success: false, reason: "cancelled" };
        }

        // Check duration limit
        const elapsedMs = Date.now() - executionStartTime;
        if (maxDurationMs > 0 && elapsedMs >= maxDurationMs) {
            await saveCurrentState();
            return { success: true, reason: "max_duration" };
        }

        // Check cost limit
        if (agent.max_cost_credits > 0 && accumulatedCost >= agent.max_cost_credits) {
            await saveCurrentState();
            return { success: false, reason: "max_cost" };
        }

        // ... existing LLM call logic ...

        // Tool execution with approval
        for (const toolCall of llmResponse.tool_calls) {
            const tool = findTool(agent.available_tools, toolCall.name);

            // Determine if approval needed
            const needsApproval = shouldRequireApproval(
                tool,
                agent.autonomy_level,
                agent.tool_risk_overrides
            );

            if (needsApproval) {
                // Create approval request
                const approval = await createApprovalRequest({
                    executionId,
                    agentId,
                    userId,
                    workspaceId,
                    threadId,
                    actionType: "tool_call",
                    toolName: toolCall.name,
                    actionDescription: generateToolDescription(tool, toolCall.arguments),
                    actionArguments: toolCall.arguments,
                    riskLevel: tool.risk_level || "medium",
                    estimatedCost: estimateToolCost(tool),
                    agentContext: summarizeContext(messageState.messages),
                    alternatives: "If denied, I will try an alternative approach."
                });

                // Emit notification
                await emitApprovalNeeded({
                    approvalId: approval.id,
                    executionId,
                    agentName: agent.name,
                    threadId,
                    actionDescription: approval.action_description,
                    riskLevel: approval.risk_level
                });

                // Wait for approval (indefinitely)
                pendingApprovalId = approval.id;
                const approvalResult = await new Promise<ApprovalResult>((resolve) => {
                    pendingApprovalResolve = resolve;
                });

                if (approvalResult.decision === "denied") {
                    // Add denial to context
                    messageState.messages.push({
                        id: `system-denial-${Date.now()}`,
                        role: "system",
                        content:
                            `Your request to use "${toolCall.name}" was denied by the user. ` +
                            `Reason: ${approvalResult.note || "No reason provided"}. ` +
                            `Please try an alternative approach or continue without this action.`,
                        timestamp: new Date()
                    });

                    // Update approval status
                    await updateApprovalRequest(approval.id, "denied", approvalResult.note);

                    continue; // Skip this tool call
                }

                // Update approval status
                await updateApprovalRequest(approval.id, "approved", approvalResult.note);
            }

            // Execute tool (either approved or safe)
            const result = await executeToolCall(toolCall);

            // Track cost
            if (result.cost_credits) {
                accumulatedCost += result.cost_credits;
            }

            // ... rest of tool result handling ...
        }

        // Continue-as-new check (pass accumulated state)
        if (currentIterations % CONTINUE_AS_NEW_THRESHOLD === 0) {
            await continueAsNew<typeof agentOrchestratorWorkflow>({
                ...input,
                startedAt: executionStartTime,
                accumulatedCostCredits: accumulatedCost,
                iterations: currentIterations,
                serializedMessages: messageState
            });
        }

        currentIterations++;
    }

    return { success: true, reason: "max_iterations" };
}
```

#### Helper Functions

```typescript
function shouldRequireApproval(
    tool: Tool,
    autonomyLevel: string,
    overrides: Record<string, string>
): boolean {
    // Check user override first
    if (overrides[tool.name]) {
        return overrides[tool.name] === "approval_required";
    }

    // Then check autonomy level
    switch (autonomyLevel) {
        case "full":
            return false;
        case "approve_all":
            return true;
        case "approve_milestones":
            return false; // Milestones handled separately
        case "approve_high_risk":
        default:
            return tool.risk_level === "approval_required" || tool.risk_level === "high";
    }
}

function generateToolDescription(tool: Tool, args: object): string {
    // Generate human-readable description of what tool will do
    // This is shown to user in approval request
    switch (tool.name) {
        case "slack_send_message":
            return `Send message to Slack channel ${args.channel}`;
        case "github_create_pr":
            return `Create pull request in ${args.repo}: "${args.title}"`;
        case "write_file":
            return `Write file to ${args.path} (${args.content.length} bytes)`;
        default:
            return `Execute ${tool.name} with provided arguments`;
    }
}
```

### New Activities

**File**: `backend/src/temporal/activities/agents/approvals.ts`

```typescript
import { ApprovalRepository } from "../../../storage/repositories/ApprovalRepository";
import { redis } from "../../../shared/redis";

export interface CreateApprovalRequestInput {
    executionId: string;
    agentId: string;
    userId: string;
    workspaceId: string;
    threadId: string;
    actionType: string;
    toolName: string;
    actionDescription: string;
    actionArguments: object;
    riskLevel: string;
    estimatedCost: number | null;
    agentContext: string;
    alternatives: string;
}

export async function createApprovalRequest(
    input: CreateApprovalRequestInput
): Promise<ApprovalRequest> {
    const repo = new ApprovalRepository();

    const approval = await repo.create({
        execution_id: input.executionId,
        agent_id: input.agentId,
        user_id: input.userId,
        workspace_id: input.workspaceId,
        thread_id: input.threadId,
        action_type: input.actionType,
        tool_name: input.toolName,
        action_description: input.actionDescription,
        action_arguments: input.actionArguments,
        risk_level: input.riskLevel,
        estimated_cost_credits: input.estimatedCost,
        agent_context: input.agentContext,
        alternatives: input.alternatives,
        status: "pending"
    });

    return approval;
}

export async function updateApprovalRequest(
    approvalId: string,
    status: "approved" | "denied",
    note?: string
): Promise<void> {
    const repo = new ApprovalRepository();

    await repo.update(approvalId, {
        status,
        response_note: note,
        responded_at: new Date()
    });
}

export async function emitApprovalNeeded(input: {
    approvalId: string;
    executionId: string;
    agentName: string;
    threadId: string;
    actionDescription: string;
    riskLevel: string;
}): Promise<void> {
    // Publish to Redis for WebSocket distribution
    await redis.publish(
        "agent:approval:needed",
        JSON.stringify({
            type: "approval:needed",
            ...input,
            timestamp: new Date().toISOString()
        })
    );
}
```

**File**: `backend/src/temporal/activities/agents/deliverables.ts`

```typescript
import { DeliverableRepository } from "../../../storage/repositories/DeliverableRepository";
import { redis } from "../../../shared/redis";
import { writeFile } from "fs/promises";
import { join } from "path";

export interface CreateDeliverableInput {
    executionId: string;
    agentId: string;
    userId: string;
    workspaceId: string;
    threadId: string;
    name: string;
    description: string;
    type: "document" | "code" | "data" | "media" | "other";
    mimeType: string;
    content: string;
    status?: "draft" | "final";
}

const MAX_INLINE_SIZE = 1024 * 1024; // 1MB

export async function createDeliverable(input: CreateDeliverableInput): Promise<Deliverable> {
    const repo = new DeliverableRepository();

    let storageType: "inline" | "file";
    let filePath: string | null = null;
    let inlineContent: string | null = null;

    // Decide storage type based on size
    if (input.content.length <= MAX_INLINE_SIZE) {
        storageType = "inline";
        inlineContent = input.content;
    } else {
        storageType = "file";
        // Store in file system
        const filename = `${input.executionId}/${Date.now()}-${input.name}`;
        filePath = join(process.env.DELIVERABLES_PATH || "/data/deliverables", filename);
        await writeFile(filePath, input.content);
    }

    const deliverable = await repo.create({
        execution_id: input.executionId,
        agent_id: input.agentId,
        user_id: input.userId,
        workspace_id: input.workspaceId,
        thread_id: input.threadId,
        name: input.name,
        description: input.description,
        type: input.type,
        mime_type: input.mimeType,
        storage_type: storageType,
        content: inlineContent,
        file_path: filePath,
        file_size_bytes: input.content.length,
        status: input.status || "draft"
    });

    // Emit event
    await redis.publish(
        "agent:deliverable:created",
        JSON.stringify({
            type: "deliverable:created",
            deliverable_id: deliverable.id,
            execution_id: input.executionId,
            agent_id: input.agentId,
            name: input.name,
            type: input.type,
            status: deliverable.status
        })
    );

    return deliverable;
}
```

---

## Frontend Implementation

### New Stores

**File**: `frontend/src/stores/approvalStore.ts`

```typescript
import { create } from "zustand";
import { api } from "../lib/api";

interface ApprovalRequest {
    id: string;
    execution_id: string;
    agent_id: string;
    agent_name: string;
    thread_id: string;
    thread_title: string;
    action_type: string;
    tool_name: string;
    action_description: string;
    action_arguments: object;
    risk_level: "low" | "medium" | "high";
    estimated_cost_credits: number | null;
    agent_context: string;
    alternatives: string;
    status: string;
    created_at: string;
    waiting_duration_seconds: number;
}

interface ApprovalStore {
    pendingApprovals: ApprovalRequest[];
    loading: boolean;
    error: string | null;

    fetchPendingApprovals: () => Promise<void>;
    approveRequest: (id: string, note?: string) => Promise<void>;
    denyRequest: (id: string, note?: string) => Promise<void>;
    addApproval: (approval: ApprovalRequest) => void;
    removeApproval: (id: string) => void;
}

export const useApprovalStore = create<ApprovalStore>((set, get) => ({
    pendingApprovals: [],
    loading: false,
    error: null,

    fetchPendingApprovals: async () => {
        set({ loading: true, error: null });
        try {
            const response = await api.getApprovals({ status: "pending" });
            set({ pendingApprovals: response.approvals, loading: false });
        } catch (error) {
            set({ error: error.message, loading: false });
        }
    },

    approveRequest: async (id: string, note?: string) => {
        await api.approveRequest(id, note);
        set((state) => ({
            pendingApprovals: state.pendingApprovals.filter((a) => a.id !== id)
        }));
    },

    denyRequest: async (id: string, note?: string) => {
        await api.denyRequest(id, note);
        set((state) => ({
            pendingApprovals: state.pendingApprovals.filter((a) => a.id !== id)
        }));
    },

    addApproval: (approval: ApprovalRequest) => {
        set((state) => ({
            pendingApprovals: [approval, ...state.pendingApprovals]
        }));
    },

    removeApproval: (id: string) => {
        set((state) => ({
            pendingApprovals: state.pendingApprovals.filter((a) => a.id !== id)
        }));
    }
}));
```

**File**: `frontend/src/stores/deliverableStore.ts`

```typescript
import { create } from "zustand";
import { api } from "../lib/api";

interface Deliverable {
    id: string;
    name: string;
    description: string;
    type: string;
    mime_type: string;
    file_size_bytes: number;
    status: string;
    execution_id: string;
    agent_name: string;
    created_at: string;
}

interface DeliverableStore {
    deliverables: Deliverable[];
    loading: boolean;

    fetchDeliverables: (filters?: object) => Promise<void>;
    addDeliverable: (deliverable: Deliverable) => void;
}

export const useDeliverableStore = create<DeliverableStore>((set) => ({
    deliverables: [],
    loading: false,

    fetchDeliverables: async (filters) => {
        set({ loading: true });
        const response = await api.getDeliverables(filters);
        set({ deliverables: response.deliverables, loading: false });
    },

    addDeliverable: (deliverable: Deliverable) => {
        set((state) => ({
            deliverables: [deliverable, ...state.deliverables]
        }));
    }
}));
```

### New Components

#### `ApprovalQueue.tsx`

```typescript
import React from "react";
import { useApprovalStore } from "../../stores/approvalStore";
import { ApprovalCard } from "./ApprovalCard";

export const ApprovalQueue: React.FC = () => {
    const { pendingApprovals, loading, fetchPendingApprovals } = useApprovalStore();

    React.useEffect(() => {
        fetchPendingApprovals();
    }, []);

    if (loading) {
        return <div>Loading approvals...</div>;
    }

    if (pendingApprovals.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                No pending approvals
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {pendingApprovals.map((approval) => (
                <ApprovalCard key={approval.id} approval={approval} />
            ))}
        </div>
    );
};
```

#### `ApprovalCard.tsx`

```typescript
import React from "react";
import { useApprovalStore } from "../../stores/approvalStore";
import { formatDistanceToNow } from "date-fns";
import { Dialog } from "../common/Dialog";

interface ApprovalCardProps {
    approval: ApprovalRequest;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({ approval }) => {
    const { approveRequest, denyRequest } = useApprovalStore();
    const [showDetail, setShowDetail] = React.useState(false);
    const [denyNote, setDenyNote] = React.useState("");
    const [showDenyDialog, setShowDenyDialog] = React.useState(false);

    const handleApprove = async () => {
        await approveRequest(approval.id);
    };

    const handleDeny = async () => {
        await denyRequest(approval.id, denyNote);
        setShowDenyDialog(false);
    };

    const riskColors = {
        low: "bg-green-100 text-green-800",
        medium: "bg-yellow-100 text-yellow-800",
        high: "bg-red-100 text-red-800"
    };

    return (
        <div className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-medium">{approval.agent_name}</h3>
                    <p className="text-sm text-gray-500">{approval.thread_title}</p>
                </div>
                <span className="text-sm text-gray-400">
                    Waiting {formatDistanceToNow(new Date(approval.created_at))}
                </span>
            </div>

            <p className="mt-2">{approval.action_description}</p>

            <div className="mt-2 flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs ${riskColors[approval.risk_level]}`}>
                    {approval.risk_level.toUpperCase()}
                </span>
                {approval.estimated_cost_credits && (
                    <span className="text-sm text-gray-500">
                        ~{approval.estimated_cost_credits} credits
                    </span>
                )}
            </div>

            <div className="mt-4 flex gap-2">
                <button
                    onClick={handleApprove}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Approve
                </button>
                <button
                    onClick={() => setShowDenyDialog(true)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                    Deny
                </button>
                <button
                    onClick={() => setShowDetail(true)}
                    className="px-4 py-2 text-blue-600 hover:underline"
                >
                    View Details
                </button>
            </div>

            {/* Deny Dialog */}
            <Dialog
                isOpen={showDenyDialog}
                onClose={() => setShowDenyDialog(false)}
                title="Deny Request"
            >
                <p className="mb-4">
                    Provide a reason for denying this request (optional):
                </p>
                <textarea
                    value={denyNote}
                    onChange={(e) => setDenyNote(e.target.value)}
                    className="w-full border rounded p-2"
                    rows={3}
                    placeholder="The agent will see this reason..."
                />
                <div className="mt-4 flex justify-end gap-2">
                    <button
                        onClick={() => setShowDenyDialog(false)}
                        className="px-4 py-2 bg-gray-200 rounded"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDeny}
                        className="px-4 py-2 bg-red-600 text-white rounded"
                    >
                        Deny Request
                    </button>
                </div>
            </Dialog>

            {/* Detail Dialog */}
            <ApprovalDetailDialog
                approval={approval}
                isOpen={showDetail}
                onClose={() => setShowDetail(false)}
            />
        </div>
    );
};
```

### WebSocket Integration

**File**: `frontend/src/lib/websocket.ts` (modifications)

```typescript
// Add handlers for new events
websocket.on("approval:needed", (data) => {
    const approvalStore = useApprovalStore.getState();
    approvalStore.addApproval(data);

    // Show toast notification
    toast.info(`${data.agent_name} needs your approval`, {
        description: data.action_description,
        action: {
            label: "View",
            onClick: () => navigate(`/approvals/${data.approval_id}`)
        }
    });
});

websocket.on("approval:resolved", (data) => {
    const approvalStore = useApprovalStore.getState();
    approvalStore.removeApproval(data.approval_id);
});

websocket.on("deliverable:created", (data) => {
    const deliverableStore = useDeliverableStore.getState();
    deliverableStore.addDeliverable(data);

    toast.success(`New deliverable: ${data.name}`);
});
```

---

# Implementation Plan

## Phase 1: Foundation (Week 1-2)

### Deliverables

- [ ] Database migrations for new tables
- [ ] ApprovalRequest model and repository
- [ ] Deliverable model and repository
- [ ] Agent model schema updates
- [ ] Shared TypeScript types

### Key Files

```
backend/src/storage/models/ApprovalRequest.ts
backend/src/storage/models/Deliverable.ts
backend/src/storage/repositories/ApprovalRepository.ts
backend/src/storage/repositories/DeliverableRepository.ts
backend/src/storage/migrations/XXXXXX_add_long_running_tables.sql
shared/src/approval.ts
shared/src/deliverable.ts
```

## Phase 2: Temporal Workflow (Week 2-3)

### Deliverables

- [ ] Approval activities
- [ ] Deliverable activities
- [ ] Modified agent orchestrator workflow
- [ ] Signal handlers for approval/cancel
- [ ] Duration and cost limit enforcement

### Key Files

```
backend/src/temporal/activities/agents/approvals.ts
backend/src/temporal/activities/agents/deliverables.ts
backend/src/temporal/workflows/agent-orchestrator.ts (major changes)
backend/src/temporal/core/constants.ts (new timeout constants)
```

## Phase 3: Backend API (Week 3-4)

### Deliverables

- [ ] Approval endpoints (list, detail, approve, deny, batch)
- [ ] Deliverable endpoints (list, content, download)
- [ ] Agent execution modifications (cancel)
- [ ] WebSocket event handlers

### Key Files

```
backend/src/api/routes/approvals/index.ts
backend/src/api/routes/approvals/list.ts
backend/src/api/routes/approvals/approve.ts
backend/src/api/routes/approvals/deny.ts
backend/src/api/routes/deliverables/index.ts
backend/src/api/routes/deliverables/list.ts
backend/src/api/routes/deliverables/content.ts
```

## Phase 4: Frontend (Week 4-5)

### Deliverables

- [ ] Approval store
- [ ] Deliverable store
- [ ] Approval queue page
- [ ] Approval card component
- [ ] Approval detail modal
- [ ] Deliverables list component
- [ ] Agent configuration panel updates
- [ ] Navigation badge for pending approvals
- [ ] WebSocket event handlers

### Key Files

```
frontend/src/stores/approvalStore.ts
frontend/src/stores/deliverableStore.ts
frontend/src/pages/ApprovalsPage.tsx
frontend/src/components/approvals/ApprovalQueue.tsx
frontend/src/components/approvals/ApprovalCard.tsx
frontend/src/components/approvals/ApprovalDetailModal.tsx
frontend/src/components/deliverables/DeliverablesList.tsx
frontend/src/components/agents/AgentConfigPanel.tsx (modifications)
```

## Phase 5: Testing & Polish (Week 5-6)

### Deliverables

- [ ] Integration tests for approval flow
- [ ] Integration tests for deliverable creation
- [ ] E2E tests for user flows
- [ ] Performance testing for long executions
- [ ] Documentation updates

---

# Testing Strategy

## Unit Tests

### Approval Repository

```typescript
describe("ApprovalRepository", () => {
    it("should create approval request", async () => {});
    it("should update approval status", async () => {});
    it("should list pending approvals for user", async () => {});
    it("should filter by workspace", async () => {});
});
```

### Workflow Approval Logic

```typescript
describe("shouldRequireApproval", () => {
    it("should require approval for high-risk tools with approve_high_risk level", () => {});
    it("should not require approval with full autonomy", () => {});
    it("should respect user overrides", () => {});
    it("should require approval for all with approve_all level", () => {});
});
```

## Integration Tests

### Approval Flow

```typescript
describe("Approval Flow", () => {
    it("should pause workflow when approval needed", async () => {
        // 1. Start agent execution with high-risk tool
        // 2. Verify ApprovalRequest created
        // 3. Verify workflow is waiting
        // 4. Send approval signal
        // 5. Verify workflow continues
    });

    it("should handle denial gracefully", async () => {
        // 1. Start agent execution
        // 2. Deny approval
        // 3. Verify denial message in context
        // 4. Verify agent continues with alternative
    });
});
```

### Duration Limits

```typescript
describe("Duration Limits", () => {
    it("should stop execution when duration limit reached", async () => {
        // 1. Create agent with max_duration_hours: 0.01 (36 seconds)
        // 2. Start execution
        // 3. Wait for limit
        // 4. Verify execution stopped with reason "max_duration"
    });
});
```

## E2E Tests

```typescript
describe("Long-Running Agent E2E", () => {
    it("should complete full approval workflow from UI", async () => {
        // 1. Navigate to agent
        // 2. Start execution with risky action
        // 3. Wait for approval notification
        // 4. Click approve button
        // 5. Verify execution continues
        // 6. Verify deliverable appears
    });
});
```

---

# Migration & Rollout

## Database Migration

```sql
-- Migration: add_long_running_tables

BEGIN;

-- Create approval_requests table
CREATE TABLE approval_requests (...);

-- Create deliverables table
CREATE TABLE deliverables (...);

-- Alter agents table
ALTER TABLE agents ADD COLUMN autonomy_level VARCHAR(30) NOT NULL DEFAULT 'approve_high_risk';
ALTER TABLE agents ADD COLUMN max_duration_hours DECIMAL(5, 2) NOT NULL DEFAULT 4.0;
ALTER TABLE agents ADD COLUMN max_cost_credits INTEGER NOT NULL DEFAULT 100;
ALTER TABLE agents ADD COLUMN tool_risk_overrides JSONB NOT NULL DEFAULT '{}';

-- Alter agent_executions table
ALTER TABLE agent_executions ADD COLUMN started_at TIMESTAMPTZ;
ALTER TABLE agent_executions ADD COLUMN accumulated_cost_credits DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE agent_executions ADD COLUMN completion_reason VARCHAR(50);

COMMIT;
```

## Feature Flag Rollout

```typescript
// Phase 1: Internal testing (1 week)
const LONG_RUNNING_ENABLED = process.env.LONG_RUNNING_BETA === "true";

// Phase 2: Beta users (2 weeks)
const LONG_RUNNING_ENABLED = user.isBetaTester || process.env.LONG_RUNNING_BETA === "true";

// Phase 3: General availability
const LONG_RUNNING_ENABLED = true;
```

## Backward Compatibility

- Existing agents continue to work unchanged (default config)
- New fields have sensible defaults
- Old executions (without approval) still queryable
- Gradual migration of existing tools to risk classification

---

# Future Considerations

## Phase 2 Features (Not in Scope)

1. **Slack/Teams Integration**
    - Interactive approval buttons in Slack
    - Thread updates for execution progress

2. **Pause/Resume**
    - User can pause running execution
    - Resume from checkpoint later

3. **Scheduled Agents**
    - Run agents on schedule (daily, weekly)
    - Auto-approve certain actions for scheduled runs

4. **Message Summarization**
    - Summarize long conversation history
    - Reduce context window usage

5. **Multi-Agent Coordination**
    - Long-running orchestrator spawning sub-agents
    - Shared approval queues

6. **Cost Prediction**
    - ML-based cost estimation
    - Budget recommendations

---

# Appendix

## Glossary

| Term                 | Definition                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------- |
| **Guided Autonomy**  | Operating model where agents work independently on safe actions but pause for risky ones |
| **Approval Request** | A record tracking a risky action that needs user approval                                |
| **Deliverable**      | A tangible artifact produced by an agent (document, code, data)                          |
| **Risk Level**       | Classification of how risky an action is (low/medium/high)                               |
| **Autonomy Level**   | User setting for how much independence an agent has                                      |

## References

- [Temporal Workflow Documentation](https://docs.temporal.io)
- [FlowMaestro Architecture Guide](./architecture.md)
- [Agent Architecture](./agent-architecture.md)
