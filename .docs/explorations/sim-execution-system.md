# Sim Studio Execution System - Complete Technical Reference

## Overview

This document provides an exhaustive technical reference for the Sim Studio execution system, covering:
1. DAG Executor architecture and execution flow
2. Block handlers with line-by-line code traces
3. Tool execution system (127+ integrations)
4. Memory and conversation management

---

# Part 1: DAG Executor Architecture

## Key Files

| Component | Location |
|-----------|----------|
| DAG Builder | `/apps/sim/executor/dag/builder.ts` |
| Path Constructor | `/apps/sim/executor/dag/construction/paths.ts` |
| Node Constructor | `/apps/sim/executor/dag/construction/nodes.ts` |
| Edge Constructor | `/apps/sim/executor/dag/construction/edges.ts` |
| Loop Constructor | `/apps/sim/executor/dag/construction/loops.ts` |
| Execution Engine | `/apps/sim/executor/execution/engine.ts` |
| Edge Manager | `/apps/sim/executor/execution/edge-manager.ts` |
| Block Executor | `/apps/sim/executor/execution/block-executor.ts` |

## DAG Construction Pipeline

```
Workflow JSON
    ↓
1. PathConstructor.execute()
   - Find trigger block (START_TRIGGER, STARTER, or root)
   - BFS to find all reachable blocks
   - Returns Set<string> of reachable block IDs
    ↓
2. LoopConstructor.execute()
   - Create sentinel pairs for each loop
   - Sentinel START: "loop-{loopId}-sentinel-start"
   - Sentinel END: "loop-{loopId}-sentinel-end"
    ↓
3. NodeConstructor.execute()
   - Create DAGNode for each reachable block
   - Expand parallel blocks into branch nodes: "blockId₍0₎", "blockId₍1₎"
   - Skip metadata-only blocks (LOOP, PARALLEL, NOTE)
    ↓
4. EdgeConstructor.execute()
   - Wire edges with source/target handles
   - Condition edges: "condition-{conditionId}"
   - Router edges: "router-{targetBlockId}"
   - Loop edges: LOOP_CONTINUE, LOOP_EXIT
    ↓
DAG { nodes: Map<string, DAGNode>, loopConfigs, parallelConfigs }
```

## DAGNode Structure

```typescript
interface DAGNode {
  id: string
  block: SerializedBlock
  incomingEdges: Set<string>
  outgoingEdges: Map<string, DAGEdge>
  metadata: {
    isLoopNode?: boolean
    loopId?: string
    isSentinel?: boolean
    sentinelType?: 'start' | 'end'
    isParallelBranch?: boolean
    parallelId?: string
    branchIndex?: number
    branchTotal?: number
    originalBlockId?: string
  }
}
```

## Execution Engine Loop

```typescript
// ExecutionEngine.run()
while (hasWork()) {
  const nodeId = this.dequeue()
  const promise = this.executeNodeAsync(nodeId)
  this.trackExecution(promise)
  await this.waitForAnyExecution()
}
```

## Edge Activation Logic

```typescript
shouldActivateEdge(edge, output) {
  const handle = edge.sourceHandle

  // Loop control
  if (output.selectedRoute === 'loop_exit') return handle === 'loop_exit'
  if (output.selectedRoute === 'loop_continue') return handle === 'loop_continue'

  // Condition: match selectedOption
  if (handle.startsWith('condition-')) {
    return output.selectedOption === handle.substring(10)
  }

  // Router: match selectedRoute
  if (handle.startsWith('router-')) {
    return output.selectedRoute === handle.substring(7)
  }

  // Error/success edges
  if (handle === 'error') return !!output.error
  if (handle === 'source') return !output.error

  return true
}
```

## Loop Orchestration

### Loop Types

| Type | Initialization | Condition |
|------|---------------|-----------|
| `for` | `maxIterations` from config | `loop.index < maxIterations` |
| `forEach` | `items` resolved from reference | `loop.index < items.length` |
| `while` | User-defined condition | Checked before each iteration |
| `doWhile` | User-defined condition | Checked after first iteration |

### Loop Variables

```
<loop.index>        → Current iteration (0-based)
<loop.iteration>    → Alias for index
<loop.item>         → Current forEach item
<loop.items>        → All forEach items
```

### Sentinel Control Flow

```
[Incoming] → [Sentinel Start] → [Loop Body] → [Sentinel End]
                                                    │
                          ┌─ shouldContinue=true ───┤
                          ↓                         ↓
                [Restore Edges]          shouldContinue=false
                          ↓                         ↓
                [Sentinel Start] ←────────  [Loop Exit Edge]
```

## Parallel Orchestration

### Parallel Types

| Type | Description |
|------|-------------|
| `collection` | Create branch per item in distribution array |
| `count` | Fixed number of branches |

### Branch Naming

```
Base: "agent-123"  →  "agent-123₍0₎", "agent-123₍1₎", ...
```

### Parallel Variables

```
<parallel.index>       → Current branch index
<parallel.currentItem> → Item at current branch
<parallel.items>       → All distribution items
```

---

# Part 2: Block Handlers Deep Dive

## Handler Registry (First Match Wins)

**File:** `/apps/sim/executor/handlers/registry.ts`

```typescript
createBlockHandlers(): BlockHandler[] {
  return [
    new TriggerBlockHandler(),       // Workflow initialization
    new FunctionBlockHandler(),      // Code execution (JS/Python)
    new ApiBlockHandler(),           // HTTP requests
    new ConditionBlockHandler(),     // Boolean branching
    new RouterBlockHandler(),        // LLM-powered routing
    new ResponseBlockHandler(),      // API response formatting
    new HumanInTheLoopBlockHandler(),// Pause/resume
    new AgentBlockHandler(),         // LLM with tools
    new VariablesBlockHandler(),     // Variable management
    new WorkflowBlockHandler(),      // Child workflow execution
    new WaitBlockHandler(),          // Time delays
    new EvaluatorBlockHandler(),     // Metric evaluation
    new GenericBlockHandler(),       // Fallback (always matches)
  ]
}
```

## AgentBlockHandler

**File:** `/apps/sim/executor/handlers/agent/agent-handler.ts` (1,280 lines)

### Execute Flow (Lines 33-67)

```
execute(ctx, block, inputs)
  │
  ├─ Step 1: Parse response format (line 38)
  │   └─ validateResponseFormat() normalizes schema
  │
  ├─ Step 2: Get model & provider (lines 39-40)
  │   └─ Determines providerId from model string
  │
  ├─ Step 3: Format tools (line 41)
  │   └─ formatTools() → custom, MCP, block tools
  │
  ├─ Step 4: Determine streaming config (line 42)
  │
  ├─ Step 5: Build messages (line 43)
  │   ├─ Fetch memory history
  │   ├─ Process legacy memories
  │   ├─ Add new messages array
  │   ├─ Ensure system message at position 0
  │   └─ Persist user messages before execution
  │
  ├─ Step 6: Build provider request (lines 45-54)
  │
  ├─ Step 7: Execute provider request (lines 56-62)
  │   └─ Server vs browser execution path
  │
  ├─ Step 8: Persist response to memory (line 64)
  │
  └─ Step 9: Return result
```

### Tool Preparation Pipeline (Lines 118-157)

**Three-Tier System:**

1. **Custom Tools** (lines 159-234):
   - Fetch schema from database or store
   - Filter schema for LLM visibility
   - Create `executeFunction` that calls `executeTool('function_execute')`

2. **MCP Tools** (lines 308-601):
   - Cached schema path (lines 356-418): No server call needed
   - Discovery fallback (lines 423-471): Batch by server, discover schemas

3. **Block Tools** (lines 603-615):
   - `transformBlockTool()` wraps workflow blocks as tools

### Message Building (Lines 633-708)

```typescript
buildMessages(ctx, inputs, blockId) {
  // 1. Fetch memory (line 642)
  if (memoryType !== 'none') {
    messages.push(...await memoryService.fetchMemoryMessages())
  }

  // 2. Process legacy memories (line 648)

  // 3. Add messages array (line 652)

  // 4. Handle system prompt (line 679) - ensure position 0

  // 5. Handle user prompt (line 684)

  // 6. Persist user message before execution (line 702)
}
```

### Streaming Response (Lines 978-1027)

```typescript
handleStreamingResponse(response) {
  // Extract execution metadata from X-Execution-Data header
  const executionDataHeader = response.headers.get('X-Execution-Data')

  return {
    stream: response.body,  // ReadableStream
    execution: {
      success, output, error, isStreaming: true
    }
  }
}
```

## ConditionBlockHandler

**File:** `/apps/sim/executor/handlers/condition/condition-handler.ts` (230 lines)

### Execute Flow (Lines 69-120)

```typescript
execute(ctx, block, inputs) {
  // 1. Parse conditions array
  const conditions = JSON.parse(inputs.conditions)

  // 2. Find source block
  const sourceBlockId = getSourceBlock(block.id)

  // 3. Build evaluation context with previous output
  const evalContext = ctx.blockStates.get(sourceBlockId).output

  // 4. Evaluate conditions sequentially
  const { selectedConnection, selectedCondition } =
    evaluateConditions(conditions, evalContext)

  // 5. Record decision
  ctx.decisions.condition.set(blockId, selectedCondition.id)

  // 6. Return selected path
  return {
    selectedPath: { blockId, blockType, blockTitle },
    selectedOption: selectedCondition.id
  }
}
```

### JavaScript Evaluation Pattern (Lines 38-42)

```typescript
// Critical pattern using 'with' statement
const conditionMet = new Function(
  'context',
  `with(context) { return ${resolvedConditionValue} }`
)(evalContext)

// Example:
// evalContext = { count: 5, active: true }
// expression = "count > 3 && active"
// Result: true
```

## FunctionBlockHandler

**File:** `/apps/sim/executor/handlers/function/function-handler.ts` (55 lines)

### Execute Flow (Lines 17-53)

```typescript
execute(ctx, block, inputs) {
  // 1. Collect code
  const code = Array.isArray(inputs.code)
    ? inputs.code.map(c => c.content).join('\n')
    : inputs.code

  // 2. Collect block data for variable access
  const { blockData, blockNameMapping } = collectBlockData(ctx)

  // 3. Execute via tool system
  const result = await executeTool('function_execute', {
    code,
    language: inputs.language || 'JavaScript',
    timeout: inputs.timeout || 30000,
    envVars: ctx.environmentVariables,
    workflowVariables: ctx.workflowVariables,
    blockData,
    blockNameMapping,
    _context: { workflowId, workspaceId }
  })

  return result.output
}
```

## RouterBlockHandler

**File:** `/apps/sim/executor/handlers/router/router-handler.ts` (156 lines)

### Execute Flow (Lines 22-121)

```typescript
execute(ctx, block, inputs) {
  // 1. Get target blocks
  const targetBlocks = getTargetBlocks(block.id)

  // 2. Generate system prompt with available paths
  const systemPrompt = generateRouterPrompt(inputs.prompt, targetBlocks)

  // 3. Call LLM with low temperature
  const response = await fetch('/api/providers', {
    body: JSON.stringify({
      provider: providerId,
      model: routerConfig.model,
      systemPrompt,
      temperature: 0.0,  // Deterministic routing
    })
  })

  // 4. Parse routing decision
  const chosenBlock = targetBlocks.find(
    b => b.id === response.content.trim().toLowerCase()
  )

  // 5. Return selected path
  return {
    selectedPath: { blockId, blockType, blockTitle },
    selectedRoute: chosenBlock.id
  }
}
```

## GenericBlockHandler

**File:** `/apps/sim/executor/handlers/generic/generic-handler.ts` (149 lines)

### Execute Flow (Lines 15-147)

```typescript
execute(ctx, block, inputs) {
  // 1. Detect MCP tools
  const isMcp = block.config.tool.startsWith('mcp-')

  // 2. Get tool config
  const tool = getTool(block.config.tool)

  // 3. Apply block-specific parameter transforms
  const finalInputs = blockConfig.tools.config?.params?.(inputs) ?? inputs

  // 4. Execute tool
  const result = await executeTool(block.config.tool, {
    ...finalInputs,
    _context: { workflowId, workspaceId, executionId }
  })

  // 5. Extract cost metadata
  return {
    ...result.output,
    cost: result.output.cost
  }
}
```

---

# Part 3: Tool Execution System

## Architecture Overview

**Key Files:**

| Component | Location | Lines |
|-----------|----------|-------|
| Main Executor | `/apps/sim/tools/index.ts` | 173-1114 |
| Tool Registry | `/apps/sim/tools/registry.ts` | 36,433 |
| Tool Types | `/apps/sim/tools/types.ts` | 1-139 |
| Parameter Utils | `/apps/sim/tools/params.ts` | 1-400+ |

## Tool Discovery Mechanisms

### 1. Built-in Tools Registry

```typescript
// /apps/sim/tools/registry.ts
export const tools: Record<string, ToolConfig> = {
  slack_send_message: { ... },
  github_create_issue: { ... },
  // 127+ integrations
}
```

### 2. Custom Tools

- Client-side: `useCustomToolsStore.getState()` (Zustand)
- Server-side: `/api/tools/custom` endpoint
- Async retrieval: `getToolAsync(toolId, workflowId)`

### 3. MCP Tools

- Prefixed with `mcp-` in tool IDs
- Discovery: `/api/mcp/tools/discover`
- Execution: `/api/mcp/tools/execute`

## executeTool() Entry Point

**File:** `/apps/sim/tools/index.ts` (lines 173-482)

```typescript
export async function executeTool(
  toolId: string,
  params: Record<string, any>,
  skipProxy = false,
  skipPostProcess = false,
  executionContext?: ExecutionContext
): Promise<ToolResponse>
```

### Execution Decision Tree

```
executeTool(toolId, params)
    │
    ├─ toolId.startsWith('mcp-') → executeMcpTool() (line 196)
    │
    ├─ toolId.startsWith('custom_') → getToolAsync() (line 191)
    │
    └─ Built-in → getTool(toolId) (line 199)
```

### Three Execution Paths

1. **Direct Execution** (line 305):
   - Tool has `directExecution` callback
   - No HTTP needed (computational tools)

2. **Internal Routes** (line 345):
   - Routes starting with `/api/`
   - Calls `handleInternalRequest()`

3. **External APIs** (line 379):
   - All other routes
   - Calls `handleProxyRequest()`

## Tool Configuration Structure

```typescript
interface ToolConfig {
  id: string                    // e.g., 'github_create_issue'
  name: string
  description: string
  version: string
  params: Record<string, ParamSchema>
  outputs?: Record<string, OutputSchema>
  oauth?: OAuthConfig

  request: {
    url: string | ((params) => string)
    method: HttpMethod | ((params) => HttpMethod)
    headers: (params) => Record<string, string>
    body?: (params) => Record<string, any>
  }

  postProcess?: (result, params, executeTool) => Promise<ToolResponse>
  transformResponse?: (response: Response) => Promise<ToolResponse>
  directExecution?: (params) => Promise<ToolResponse>
}
```

## Parameter Visibility System

```typescript
type ParameterVisibility =
  | 'user-or-llm'  // User or LLM must provide
  | 'user-only'    // Only user provides
  | 'llm-only'     // Only LLM generates
  | 'hidden'       // Never shown
```

### Schema Filtering for LLM

```typescript
// Removes user-provided parameters from LLM schema
const filteredSchema = filterSchemaForLLM(
  schema.function.parameters,
  userProvidedParams
)
```

### Parameter Merging

```typescript
// User params take precedence
const mergedParams = mergeToolParameters(userProvidedParams, llmParams)
```

## MCP Tool Execution

**File:** `/apps/sim/tools/index.ts` (lines 914-1114)

```typescript
async function executeMcpTool(toolId, params) {
  // 1. Parse tool ID: "mcp-<serverId>-<toolName>"
  const { serverId, toolName } = parseMcpToolId(toolId)

  // 2. Filter system parameters
  const args = filterSystemParams(params)

  // 3. Execute via API
  const result = await fetch('/api/mcp/tools/execute', {
    method: 'POST',
    body: JSON.stringify({
      serverId,
      toolName,
      arguments: args,
      workflowId,
      workspaceId
    })
  })

  return result.output
}
```

## Tool Response Structure

```typescript
interface ToolResponse {
  success: boolean
  output: Record<string, any>
  error?: string
  timing?: {
    startTime: string    // ISO timestamp
    endTime: string
    duration: number     // milliseconds
  }
}
```

---

# Part 4: Memory and Conversation System

## Memory Types

| Type | Description |
|------|-------------|
| `'none'` | No memory persistence (default) |
| `'conversation'` | Full history with context window limit |
| `'sliding_window'` | Keep last N messages |
| `'sliding_window_tokens'` | Keep within N tokens |

## Database Schema

**File:** `/packages/db/schema.ts` (lines 947-973)

```sql
CREATE TABLE "memory" (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflow(id),
  key TEXT NOT NULL,          -- Format: conversationId:blockId
  data JSONB NOT NULL,        -- Array of messages
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,

  UNIQUE (workflow_id, key)   -- Compound unique constraint
)
```

## Memory Key Format

```
conversationId:blockId
Example: "user-123:agent-block-1"
```

## Memory Service

**File:** `/apps/sim/executor/handlers/agent/memory.ts` (663 lines)

### fetchMemoryMessages()

```typescript
async fetchMemoryMessages(ctx, inputs, blockId) {
  if (memoryType === 'none') return []

  const memoryKey = buildMemoryKey(conversationId, blockId)
  let messages = await fetchFromMemoryAPI(workflowId, memoryKey)

  switch (memoryType) {
    case 'conversation':
      return applyContextWindowLimit(messages, model)
    case 'sliding_window':
      return applySlidingWindow(messages, windowSize)
    case 'sliding_window_tokens':
      return applySlidingWindowByTokens(messages, maxTokens, model)
  }
}
```

### Sliding Window (Messages)

**Lines 194-210:**

```typescript
applySlidingWindow(messages, windowSize) {
  // 1. Separate system from conversation messages
  const systemMessages = messages.filter(m => m.role === 'system')
  const conversationMessages = messages.filter(m => m.role !== 'system')

  // 2. Keep last N conversation messages
  const recentMessages = conversationMessages.slice(-windowSize)

  // 3. Preserve first system message at position 0
  return [systemMessages[0], ...recentMessages]
}
```

### Sliding Window (Tokens)

**Lines 220-273:**

```typescript
applySlidingWindowByTokens(messages, maxTokens, model) {
  const systemMessages = messages.filter(m => m.role === 'system')
  const conversationMessages = messages.filter(m => m.role !== 'system')

  let currentTokenCount = 0
  const result = []

  // Iterate backwards (newest first)
  for (let i = conversationMessages.length - 1; i >= 0; i--) {
    const msg = conversationMessages[i]
    const tokens = getAccurateTokenCount(msg.content, model)

    if (currentTokenCount + tokens <= maxTokens) {
      result.unshift(msg)
      currentTokenCount += tokens
    } else {
      break
    }
  }

  // Guarantee at least 1 message
  if (result.length === 0 && conversationMessages.length > 0) {
    result.push(conversationMessages[conversationMessages.length - 1])
  }

  return [systemMessages[0], ...result]
}
```

### Context Window Limit

**Lines 281-376:**

```typescript
applyContextWindowLimit(messages, model) {
  // 1. Get model's context window from PROVIDER_DEFINITIONS
  const contextWindow = getModelContextWindow(model)

  // 2. Calculate max tokens (90% of context window)
  const maxTokens = Math.floor(contextWindow * 0.9)

  // 3. Count system message tokens first
  const systemTokens = countTokens(systemMessages)
  const remainingTokens = maxTokens - systemTokens

  // 4. Fill with conversation messages (newest first)
  // Same backward iteration pattern
}
```

## Atomic Memory Persistence

**Lines 556-596:**

```sql
-- PostgreSQL atomic append pattern
INSERT INTO memory (id, workflowId, key, data, createdAt, updatedAt)
VALUES (..., ..., ..., [message], now, now)
ON CONFLICT (workflowId, key)
  DO UPDATE SET
    data = memory.data || [message]::jsonb,  -- JSONB concatenation
    updatedAt = now
```

**Key Feature:** Uses PostgreSQL JSONB `||` operator for race-condition-free appends.

## Complete Memory Flow

```
Agent Execution Start
    │
    ├─ buildMessages()
    │   │
    │   ├─ fetchMemoryMessages()
    │   │   └─ SELECT data FROM memory WHERE key = 'convId:blockId'
    │   │       └─ Apply sliding window if configured
    │   │
    │   ├─ Add new messages from input
    │   │
    │   └─ persistUserMessage()  ← BEFORE execution
    │       └─ Atomic append user message
    │
    ├─ LLM Execution
    │
    └─ persistResponseToMemory()  ← AFTER execution
        └─ Atomic append assistant message
```

## Memory API Routes

**File:** `/apps/sim/app/api/memory/route.ts`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/memory` | Search memories |
| POST | `/api/memory` | Create/append (atomic UPSERT) |
| DELETE | `/api/memory` | Delete by pattern |
| GET | `/api/memory/[id]` | Get specific memory |
| PUT | `/api/memory/[id]` | Update specific memory |
| DELETE | `/api/memory/[id]` | Delete specific memory |

---

# Part 5: Variable Resolution System

## Resolution Order

```typescript
resolvers = [
  new LoopResolver(workflow),      // <loop.*>
  new ParallelResolver(workflow),  // <parallel.*>
  new WorkflowResolver(variables), // <variable.*>
  new EnvResolver(),               // {{ENV_VAR}}
  new BlockResolver(workflow),     // <blockId.path>
]
```

## Reference Syntax

| Pattern | Example | Description |
|---------|---------|-------------|
| `<blockId.path>` | `<agent1.content>` | Block output reference |
| `<loop.index>` | - | Loop iteration index |
| `<loop.item>` | - | Current forEach item |
| `<parallel.index>` | - | Current branch index |
| `<parallel.currentItem>` | - | Current parallel item |
| `<variable.name>` | `<variable.userId>` | Workflow variable |
| `{{ENV_VAR}}` | `{{API_KEY}}` | Environment variable |

---

# Part 6: Execution Flow Summary

```
┌─────────────────────────────────────────────────────────┐
│                    TRIGGER EVENT                        │
│    (API/Webhook/Schedule/Chat/Manual)                   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                 DAG CONSTRUCTION                        │
│  PathConstructor → LoopConstructor →                    │
│  NodeConstructor → EdgeConstructor                      │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              EXECUTION CONTEXT SETUP                    │
│  - VariableResolver with all resolvers                  │
│  - LoopOrchestrator / ParallelOrchestrator             │
│  - BlockExecutor with handler registry                  │
│  - EdgeManager for activation logic                     │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│             QUEUE-BASED EXECUTION                       │
│  while (hasWork()):                                     │
│    node = dequeue()                                     │
│    handler = findHandler(node.block)                    │
│    inputs = resolver.resolveInputs(params)              │
│    output = handler.execute(ctx, block, inputs)         │
│    readyNodes = edgeManager.processOutgoingEdges(node)  │
│    queue.addAll(readyNodes)                             │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   RESULT                                │
│  - Success: final output + logs + metadata              │
│  - Paused: snapshot for resume                          │
│  - Error: detailed error with context                   │
└─────────────────────────────────────────────────────────┘
```

---

# Critical Code Patterns

## 1. JavaScript Condition Evaluation

```typescript
new Function('context', `with(context) { return ${expression} }`)(evalContext)
```

## 2. Atomic JSONB Append

```sql
data = memory.data || [message]::jsonb
```

## 3. Handler Selection (First Match)

```typescript
handlers.find(h => h.canHandle(block))
```

## 4. Edge Activation by Handle

```typescript
edge.sourceHandle === `condition-${conditionId}`
edge.sourceHandle === `router-${targetBlockId}`
```

## 5. Memory Key Isolation

```
key = `${conversationId}:${blockId}`
```

---

# File Index

| Category | File | Purpose |
|----------|------|---------|
| **DAG** | `/executor/dag/builder.ts` | DAG construction |
| **DAG** | `/executor/dag/construction/paths.ts` | Reachability analysis |
| **DAG** | `/executor/dag/construction/nodes.ts` | Node creation |
| **DAG** | `/executor/dag/construction/edges.ts` | Edge wiring |
| **DAG** | `/executor/dag/construction/loops.ts` | Sentinel creation |
| **Execution** | `/executor/execution/engine.ts` | Main execution loop |
| **Execution** | `/executor/execution/block-executor.ts` | Block execution |
| **Execution** | `/executor/execution/edge-manager.ts` | Edge activation |
| **Handlers** | `/executor/handlers/registry.ts` | Handler registration |
| **Handlers** | `/executor/handlers/agent/agent-handler.ts` | LLM execution |
| **Handlers** | `/executor/handlers/condition/condition-handler.ts` | Branching |
| **Handlers** | `/executor/handlers/router/router-handler.ts` | LLM routing |
| **Handlers** | `/executor/handlers/function/function-handler.ts` | Code execution |
| **Handlers** | `/executor/handlers/generic/generic-handler.ts` | Tool fallback |
| **Tools** | `/tools/index.ts` | Tool executor |
| **Tools** | `/tools/registry.ts` | Tool definitions |
| **Tools** | `/tools/params.ts` | Parameter handling |
| **Memory** | `/executor/handlers/agent/memory.ts` | Memory service |
| **Memory** | `/app/api/memory/route.ts` | Memory API |
| **Orchestrators** | `/executor/orchestrators/loop.ts` | Loop control |
| **Orchestrators** | `/executor/orchestrators/parallel.ts` | Parallel control |
| **Variables** | `/executor/variables/resolver.ts` | Reference resolution |

---

# Part 7: Handler Communication Patterns

The execution engine and block handlers communicate through a **signal-based protocol**. Handlers don't directly control execution flow—instead, they return special flags in their output that the engine interprets. This keeps handlers simple and focused on their specific logic while the engine manages orchestration.

## Control Signal Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    HANDLER → ENGINE SIGNALS                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Handler executes and returns output object                    │
│                    │                                           │
│                    ▼                                           │
│  ┌─────────────────────────────────────────────┐               │
│  │            Engine Signal Detection          │               │
│  └─────────────────────────────────────────────┘               │
│                    │                                           │
│       ┌────────────┼────────────┬──────────────┐               │
│       ▼            ▼            ▼              ▼               │
│  __pauseExecution  __activateErrorPort  __isTerminal  normal   │
│       │            │            │              │               │
│       ▼            ▼            ▼              ▼               │
│  Serialize     Route to      Mark branch   Continue to         │
│  state &       error edge    complete      next nodes          │
│  halt          (don't fail)                                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

This pattern provides several benefits:

1. **Pause without blocking**: Handlers can request execution pause (for human approval, long waits) without holding server resources. The engine serializes state and releases all resources.

2. **Error as routing**: Instead of failing workflows on errors, handlers can route to error-handling branches. This enables retry logic, fallbacks, and graceful degradation.

3. **Workflow composition**: Sub-workflows execute through the same engine, with recursion detection preventing infinite loops.

## Handler Types and Their Signals

**Human-in-the-Loop** handlers return `__pauseExecution: true` when they need human input. The engine captures the entire execution state, stores it in the database, and terminates. When approval arrives (via webhook or UI), the system loads the snapshot and continues.

**API handlers** can return `__activateErrorPort: true` on HTTP failures. Instead of failing the workflow, the engine activates edges connected to the error port, allowing error-handling logic to run.

**Response handlers** return `__isTerminal: true` to indicate their branch is complete. For webhook-triggered workflows, the response handler's output becomes the HTTP response.

**Workflow handlers** (sub-workflow execution) track an execution stack. Before calling a child workflow, they check if it would create a cycle (A calls B calls A). This prevents infinite recursion in workflow composition.

---

# Part 8: Provider Abstraction Layer

Sim Studio supports 16+ LLM providers through a unified abstraction layer. This allows workflows to switch between providers without code changes and enables features like automatic failover and cost optimization.

## Provider Request Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                  PROVIDER REQUEST FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Agent Block needs LLM completion                               │
│            │                                                    │
│            ▼                                                    │
│  ┌──────────────────────┐                                       │
│  │  1. Resolve API Key  │  User key → Workspace key → Platform  │
│  └──────────┬───────────┘                                       │
│             │                                                   │
│             ▼                                                   │
│  ┌──────────────────────┐                                       │
│  │  2. Transform        │  Unified format → Provider-specific   │
│  │     Request          │  (OpenAI, Anthropic, Google differ)   │
│  └──────────┬───────────┘                                       │
│             │                                                   │
│             ▼                                                   │
│  ┌──────────────────────┐                                       │
│  │  3. Execute with     │  Retry on 429/5xx with exponential    │
│  │     Retry Logic      │  backoff and jitter                   │
│  └──────────┬───────────┘                                       │
│             │                                                   │
│             ▼                                                   │
│  ┌──────────────────────┐                                       │
│  │  4. Transform        │  Provider response → Unified format   │
│  │     Response         │  (content, tool_calls, usage)         │
│  └──────────┬───────────┘                                       │
│             │                                                   │
│             ▼                                                   │
│  ┌──────────────────────┐                                       │
│  │  5. Calculate Cost   │  tokens × model pricing from registry │
│  └──────────┬───────────┘                                       │
│             │                                                   │
│             ▼                                                   │
│  ┌──────────────────────┐                                       │
│  │  6. Record Usage     │  Insert record + update aggregates    │
│  └──────────────────────┘  + check budget limits                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## API Key Resolution Strategy

The system uses a fallback chain for API keys, enabling both self-hosted and managed deployments:

```typescript
// Priority order for resolving API keys
async function resolveApiKey(provider, workspaceId) {
  // 1. User's key from block configuration (highest priority)
  // 2. Workspace-level credential (user's own keys)
  // 3. Platform key (managed service with rate limiting)
}
```

This allows users to bring their own keys for lower costs while providing platform keys as fallback for quick onboarding.

## Cost Tracking

Every LLM call records token usage and cost. The system maintains both detailed records (for analytics) and aggregates (for real-time budget checking). When a workspace exceeds its budget limit, the system can notify admins or pause workflows.

The cost calculation uses a central model registry that stores pricing per model:

```typescript
cost = (inputTokens / 1000) * model.inputCostPer1k
     + (outputTokens / 1000) * model.outputCostPer1k
```

---

# Part 9: Error Handling Philosophy

Sim Studio treats errors as **routing decisions rather than failures**. When a block encounters an error, the system doesn't automatically fail the workflow—instead, it checks if the block has an error port and routes accordingly.

## Error Flow Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                     ERROR HANDLING FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Block throws exception or returns error                        │
│            │                                                    │
│            ▼                                                    │
│  ┌──────────────────────┐                                       │
│  │ Capture Error Context│  Block ID, inputs (sanitized),        │
│  │ (for debugging)      │  stack trace, timestamp               │
│  └──────────┬───────────┘                                       │
│             │                                                   │
│             ▼                                                   │
│  ┌──────────────────────┐                                       │
│  │ Does block have      │                                       │
│  │ error port?          │                                       │
│  └──────────┬───────────┘                                       │
│             │                                                   │
│      ┌──────┴──────┐                                            │
│      │             │                                            │
│     YES           NO                                            │
│      │             │                                            │
│      ▼             ▼                                            │
│  Activate      Propagate                                        │
│  error edge    failure                                          │
│      │             │                                            │
│      ▼             ▼                                            │
│  Continue      Deactivate all                                   │
│  error-        downstream nodes                                 │
│  handling      Mark execution                                   │
│  branch        as failed                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

This approach enables sophisticated error recovery patterns:

- **Retry with different model**: On provider error, route to a fallback LLM
- **Human escalation**: On repeated failures, pause for human review
- **Graceful degradation**: Return cached/default response instead of failing
- **Error logging**: Route to logging block before completing

## Streaming Architecture

When LLM responses stream, the system faces a challenge: we need to deliver tokens to the user in real-time while also tracking usage for billing. The solution uses **stream tee** combined with a **metadata header**.

```
┌─────────────────────────────────────────────────────────────────┐
│                    STREAMING DUAL-CONSUMPTION                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  LLM Response (SSE stream)                                      │
│            │                                                    │
│            ▼                                                    │
│  ┌──────────────────────┐                                       │
│  │    Stream Tee        │  Split into two identical streams     │
│  └──────────┬───────────┘                                       │
│             │                                                   │
│      ┌──────┴──────┐                                            │
│      │             │                                            │
│      ▼             ▼                                            │
│  Client        Background                                       │
│  Stream        Consumer                                         │
│      │             │                                            │
│      ▼             ▼                                            │
│  Real-time     Count output                                     │
│  token         tokens, record                                   │
│  delivery      usage & cost                                     │
│                                                                 │
│  X-Execution-Data header carries metadata                       │
│  (blockId, inputTokens, executionId)                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

The metadata header is sent at the start of the response with known information (input tokens, block ID). Output token count is computed after the stream completes.

---

# Part 10: Execution Persistence & Resume

Workflows can run for hours, days, or weeks—waiting for human approval, scheduled events, or external triggers. The system cannot hold server resources for this duration, so it implements **execution snapshots** that serialize the entire state to the database.

## Pause/Resume Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PAUSE/RESUME FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PAUSE (when handler signals __pauseExecution)                  │
│                                                                 │
│  Running Execution                                              │
│        │                                                        │
│        ▼                                                        │
│  ┌─────────────────────────────────────────┐                    │
│  │ Serialize Execution State               │                    │
│  │                                         │                    │
│  │ • Completed nodes list                  │                    │
│  │ • Pending nodes (in queue when paused)  │                    │
│  │ • All block outputs so far              │                    │
│  │ • Workflow variables                    │                    │
│  │ • Loop/parallel progress                │                    │
│  │ • Pause reason & paused block ID        │                    │
│  └────────────────┬────────────────────────┘                    │
│                   │                                             │
│                   ▼                                             │
│  ┌─────────────────────────────────────────┐                    │
│  │ Store snapshot in database              │                    │
│  │ Update execution status = 'paused'      │                    │
│  │ Release all server resources            │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                 │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ (time passes) ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─     │
│                                                                 │
│  RESUME (triggered by webhook, schedule, or UI)                 │
│                                                                 │
│  Resume Trigger (with optional data)                            │
│        │                                                        │
│        ▼                                                        │
│  ┌─────────────────────────────────────────┐                    │
│  │ Load snapshot from database             │                    │
│  └────────────────┬────────────────────────┘                    │
│                   │                                             │
│                   ▼                                             │
│  ┌─────────────────────────────────────────┐                    │
│  │ Rebuild Execution Context               │                    │
│  │                                         │                    │
│  │ • Reconstruct DAG from workflow         │                    │
│  │ • Restore block states                  │                    │
│  │ • Restore variables & orchestrators     │                    │
│  │ • Inject resume data into paused block  │                    │
│  └────────────────┬────────────────────────┘                    │
│                   │                                             │
│                   ▼                                             │
│  ┌─────────────────────────────────────────┐                    │
│  │ Continue execution from pending queue   │                    │
│  │ (picks up exactly where it left off)    │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## What Gets Serialized

The snapshot must capture everything needed to continue execution:

1. **DAG Progress**: Which nodes completed, which are pending, which edges are active
2. **Block Outputs**: Every completed block's output (needed for variable references)
3. **Mutable State**: Workflow variables that may have been modified during execution
4. **Orchestrator State**: Loop iteration index, parallel branch completion status
5. **Pause Context**: Why we paused and which block triggered it

This enables seamless continuation—the resumed workflow behaves exactly as if it never paused.

## Trigger Entry Points

Workflows can start from multiple sources, each providing different context:

```
┌─────────────────────────────────────────────────────────────────┐
│                      TRIGGER SOURCES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │ Webhook │  │Schedule │  │  Chat   │  │ Manual  │             │
│  │ (HTTP)  │  │ (Cron)  │  │  (UI)   │  │(Button) │             │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘             │
│       │            │            │            │                  │
│       ▼            ▼            ▼            ▼                  │
│  payload,     scheduledTime,  message,     (no extra            │
│  headers,     cronExpression  conversationId context)           │
│  query params                                                   │
│       │            │            │            │                  │
│       └────────────┴────────────┴────────────┘                  │
│                         │                                       │
│                         ▼                                       │
│              ┌─────────────────────┐                            │
│              │ TriggerData object  │                            │
│              │ passed to execution │                            │
│              └──────────┬──────────┘                            │
│                         │                                       │
│                         ▼                                       │
│              ┌─────────────────────┐                            │
│              │ Trigger block       │                            │
│              │ outputs this data   │                            │
│              │ for downstream use  │                            │
│              └─────────────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

The Trigger block acts as the workflow's entry point—it doesn't perform logic, just exposes the trigger data (webhook payload, chat message, etc.) as outputs that downstream blocks can reference.
