# Phase 08: Agent Nodes

## Overview

Implement 4 agent nodes: Run Agent, Agent Chat, Agent Handoff, and Human-in-the-Loop.

---

## Prerequisites

- **Phase 05**: Core AI nodes (LLM execution)

---

## Existing Infrastructure

### Agent Runtime Already Exists

**File**: `backend/src/temporal/activities/agent/agent-activities.ts`

```typescript
// Agent execution framework exists - agents can use MCP tools
// The agent builder already demonstrates tool calling patterns
```

### Agent Repository

**File**: `backend/src/storage/repositories/AgentRepository.ts`

```typescript
// Store and retrieve agent configurations
const agent = await agentRepository.findById(agentId);
const tools = await agentRepository.getAgentTools(agentId);
```

### MCP Tool Execution

**File**: `backend/src/integrations/`

```typescript
// Agents can call integration tools via MCP protocol
// Operations are auto-wrapped as MCP tools (see Phase 17-19)
```

### Temporal for Long-Running Agents

```typescript
// Use Temporal workflows for agent execution
// Supports pause/resume for Human-in-the-Loop
// Automatic timeout handling
```

---

## Nodes (4)

| Node                  | Description              | Category  |
| --------------------- | ------------------------ | --------- |
| **Run Agent**         | Execute agent with tools | ai/agents |
| **Agent Chat**        | Multi-turn conversation  | ai/agents |
| **Agent Handoff**     | Transfer between agents  | ai/agents |
| **Human-in-the-Loop** | Pause for human review   | ai/agents |

---

## Node Specifications

### Run Agent Node

**Purpose**: Execute an agent with tool access

**Config**:

- Agent selection (from workspace agents)
- Tools to enable
- Max iterations
- Timeout
- Output format

**Inputs**: `task` (string), `context` (optional)
**Outputs**: `result` (any), `toolCalls` (array), `reasoning` (string)

### Agent Chat Node

**Purpose**: Enable multi-turn conversation with agent

**Config**:

- Agent selection
- System prompt
- Memory: conversation / summary / none
- Max turns

**Inputs**: `message` (string), `history` (optional)
**Outputs**: `response` (string), `history` (array), `toolCalls` (array)

### Agent Handoff Node

**Purpose**: Transfer conversation context between agents

**Config**:

- Target agent
- Context to transfer: full / summary / specific fields
- Handoff message template

**Inputs**: `context` (object), `reason` (string)
**Outputs**: `success` (boolean), `newAgentId` (string)

### Human-in-the-Loop Node

**Purpose**: Pause workflow for human decision

**Config**:

- Notification channels: email / Slack / in-app
- Assignees (users or roles)
- Actions: approve/reject / custom buttons
- Timeout action
- Escalation rules

**Inputs**: `data` (any), `message` (string)
**Outputs**: `decision` (string), `reviewer` (object), `comments` (string)

---

## Unit Tests

### Test Pattern

**Pattern B (Mock LLM)**: Mock agent execution and LLM calls for deterministic testing.

### Files to Create

| Executor  | Test File                                                          | Pattern |
| --------- | ------------------------------------------------------------------ | ------- |
| RunAgent  | `backend/tests/unit/node-executors/ai/run-agent-executor.test.ts`  | B       |
| AgentChat | `backend/tests/unit/node-executors/ai/agent-chat-executor.test.ts` | B       |
| Handoff   | `backend/tests/unit/node-executors/ai/handoff-executor.test.ts`    | B       |
| HITL      | `backend/tests/unit/node-executors/ai/hitl-executor.test.ts`       | B + C   |

### Required Test Cases

#### run-agent-executor.test.ts

- `should execute agent with given prompt`
- `should provide access to configured tools`
- `should return agent output and trace`
- `should respect max iterations limit`
- `should timeout after configured duration`
- `should handle agent errors gracefully`

#### agent-chat-executor.test.ts

- `should continue existing conversation`
- `should maintain message history`
- `should support multi-turn interactions`
- `should preserve context variables`

#### handoff-executor.test.ts

- `should transfer to target agent`
- `should pass context to new agent`
- `should return handoff reasoning`
- `should support conditional handoffs`

#### hitl-executor.test.ts

- `should pause execution awaiting human input`
- `should notify assigned reviewer`
- `should resume with human decision`
- `should timeout with default action`
- `should support custom action buttons`

---

## Test Workflow: Research Agent

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│   Input     │───▶│  Run Agent   │───▶│   Ask AI    │───▶│   Output    │
│ (question)  │    │ (web search) │    │ (synthesize)│    │ (report)    │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
```

**Test Input**: "What are the latest developments in AI agents?"
**Expected**: Agent searches web, returns structured findings

---

## Files to Create

### Frontend Components

```
frontend/src/canvas/nodes/ai/agents/
├── RunAgentNode.tsx
├── AgentChatNode.tsx
├── AgentHandoffNode.tsx
├── HumanInTheLoopNode.tsx
├── config/
│   ├── RunAgentNodeConfig.tsx
│   ├── AgentChatNodeConfig.tsx
│   ├── AgentHandoffNodeConfig.tsx
│   └── HumanInTheLoopNodeConfig.tsx
└── index.ts
```

### Backend Components

```
backend/src/temporal/activities/node-executors/ai/
├── run-agent-executor.ts
├── agent-chat-executor.ts
├── agent-handoff-executor.ts
└── human-in-loop-executor.ts

backend/src/services/human-review/
├── review-manager.ts
├── notification-service.ts
└── escalation-service.ts
```

---

## How to Deliver

1. Register all 4 nodes in `node-registry.ts`
2. Create frontend node components
3. Create config forms with agent selector
4. Implement agent execution runtime
5. Implement tool calling framework
6. Create human review UI and notification system
7. Implement timeout and escalation logic
8. Test agent tool execution

---

## How to Test

| Test                      | Expected Result                    |
| ------------------------- | ---------------------------------- |
| Run Agent with web search | Agent searches and returns results |
| Agent Chat multi-turn     | Conversation history maintained    |
| Agent Handoff             | Context transferred to new agent   |
| Human-in-Loop approve     | Workflow resumes on approval       |
| Human-in-Loop timeout     | Escalation triggered               |

### Integration Tests

```typescript
describe("Run Agent Node", () => {
    it("executes agent with tools", async () => {
        const result = await executeRunAgent({
            agentId: "researcher",
            task: "Find the capital of France",
            tools: ["web_search"]
        });
        expect(result.result).toContain("Paris");
        expect(result.toolCalls.length).toBeGreaterThan(0);
    });
});

describe("Human-in-the-Loop", () => {
    it("pauses and waits for approval", async () => {
        const execution = await startHumanReview({
            data: { amount: 5000 },
            message: "Approve expense?"
        });
        expect(execution.status).toBe("waiting");

        await submitReview(execution.id, { decision: "approve" });
        const result = await getExecutionResult(execution.id);
        expect(result.decision).toBe("approve");
    });
});
```

---

## Acceptance Criteria

- [ ] Run Agent executes with selected tools
- [ ] Run Agent respects max iterations
- [ ] Run Agent returns tool call history
- [ ] Agent Chat maintains conversation history
- [ ] Agent Chat supports memory modes
- [ ] Agent Handoff transfers context completely
- [ ] Human-in-Loop pauses workflow
- [ ] Human-in-Loop sends notifications
- [ ] Human-in-Loop supports multiple actions
- [ ] Human-in-Loop handles timeout/escalation
- [ ] All nodes display with AI category styling

---

## Dependencies

These nodes enable autonomous agent workflows with human oversight.

Enables:

- **Phase 13**: KB Chat uses Agent Chat pattern
- **Phase 15**: Approval Gate uses similar pause mechanism
