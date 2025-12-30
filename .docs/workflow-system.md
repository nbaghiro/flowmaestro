# FlowMaestro Workflows System

Complete guide to the FlowMaestro workflow system, including node types, execution engine, triggers, AI generation, and the agent workflow node.

---

## Table of Contents

1. [Overview](#overview)
2. [Workflow Execution System](#workflow-execution-system)
3. [Node Types Catalog](#node-types-catalog)
4. [Workflow Triggers](#workflow-triggers)
5. [AI Workflow Generation](#ai-workflow-generation)
6. [Agent Workflow Node](#agent-workflow-node)
7. [Variable Interpolation](#variable-interpolation)
8. [Workflow Canvas UI](#workflow-canvas-ui)

---

## Overview

FlowMaestro workflows are visual, node-based automations that enable users to:

- Build complex AI-powered workflows using a React Flow canvas
- Execute workflows durably using Temporal as the orchestration engine
- Integrate with multiple LLM providers (OpenAI, Anthropic, Google, Cohere)
- Trigger workflows via schedules, webhooks, or events
- Monitor real-time execution through WebSocket connections
- Generate workflows from natural language using AI

### Key Features

- **20+ Node Types**: LLM, HTTP, Transform, Conditional, Loop, Vision, Audio, Database, Router, Trigger, and more
- **Durable Execution**: Workflows survive system failures through Temporal's persistent execution model
- **Trigger System**: Schedule (cron), webhook, event, and manual triggers
- **AI Generation**: Create workflows from natural language descriptions
- **Agent Integration**: Special node type for AI agent execution within workflows
- **Real-time Updates**: WebSocket-based live execution monitoring
- **Variable System**: Context management and variable interpolation across nodes

---

## Workflow Execution System

### Temporal Orchestration

FlowMaestro uses [Temporal](https://temporal.io) as its workflow orchestration engine, providing:

- **Durable execution**: Workflows survive process crashes and restarts
- **Automatic retries**: Failed activities retry with exponential backoff
- **Timeout handling**: Configurable timeouts for activities and workflows
- **Visibility**: Complete execution history and state inspection
- **Scalability**: Distribute work across multiple workers

### Execution Flow

```
1. User triggers workflow (manual, schedule, webhook, or event)
   ↓
2. Backend creates execution record in database
   ↓
3. Temporal starts orchestratorWorkflow
   ↓
4. 4-Stage Builder constructs executable graph:
   - PathConstructor: BFS reachability from trigger
   - LoopConstructor: Insert loop sentinels
   - NodeConstructor: Expand parallel branches
   - EdgeConstructor: Wire typed edges
   ↓
5. Handler Registry finds handler for each node type
   ↓
6. Nodes execute via handlers, returning signals for flow control
   ↓
7. Signals control branching, loops, and pause/resume
   ↓
8. Context updated immutably after each node
   ↓
9. Execution completes, results stored in database
   ↓
10. SSE/WebSocket events notify frontend of progress
```

### Orchestrator Workflow

**File**: `/backend/src/temporal/workflows/orchestrator-workflow.ts`

The orchestrator workflow is the core execution engine that:

1. **Builds executable graph** using the 4-stage builder
2. **Manages execution queue** with priority-based node ordering
3. **Executes nodes via handler registry** with signal-based flow control
4. **Manages immutable context** (all node outputs available to downstream nodes)
5. **Handles pause/resume** through snapshot persistence
6. **Handles errors and retries** through Temporal's built-in mechanisms

**Key Implementation**:

```typescript
export async function orchestratorWorkflow(input: OrchestratorInput): Promise<OrchestratorResult> {
    const { workflowDefinition, inputs = {}, executionId } = input;

    // Build executable graph using 4-stage builder
    const graph = buildWorkflow(workflowDefinition);

    // Initialize immutable context
    let context = createContext(inputs);

    // Process execution queue
    while (!graph.queue.isEmpty()) {
        const nodeId = graph.queue.dequeue();
        const node = graph.nodes.get(nodeId);

        // Execute node via handler registry
        const output = await executeNodeActivity({
            nodeId,
            nodeType: node.type,
            nodeConfig: node.config,
            context: context.snapshot()
        });

        // Update context immutably
        context = storeNodeOutput(context, nodeId, output.result);

        // Process handler signals
        if (output.signals?.pause) {
            // Save snapshot and pause workflow
            await saveSnapshot(executionId, context, graph.queue);
            await condition(() => resumeSignalReceived);
            context = restoreContext(resumeData);
        }

        if (output.signals?.selectedRoute) {
            // Skip branches not selected
            graph.queue.skipBranches(output.signals.branchesToSkip);
        }

        if (output.signals?.isTerminal) {
            break; // End workflow
        }
    }

    return {
        success: true,
        outputs: context.getAllOutputs()
    };
}
```

**Signal-Based Flow Control**:

Handlers return structured signals that control workflow execution:

```typescript
interface ExecutionSignals {
    pause?: boolean; // Pause for human input
    pauseContext?: PauseContext;
    selectedRoute?: string; // Branch selection (conditional/switch/router)
    branchesToSkip?: string[]; // Skip unselected branches
    loopMetadata?: LoopMetadata;
    isTerminal?: boolean; // End workflow (output node)
}
```

### Handler Pattern

Each node type is implemented as a handler class that extends `BaseNodeHandler`:

- **Zod Validation**: Config validated with type-safe schemas
- **Timeout configuration**: `startToCloseTimeout` (default: 10 minutes)
- **Retry policy**: 3 attempts with exponential backoff
- **Signal returns**: Flow control via structured signals

**Handler Structure**:

```typescript
// Location: backend/src/temporal/activities/execution/handlers/ai/llm.ts

export class LLMNodeHandler extends BaseNodeHandler {
    readonly name = "LLMNodeHandler";
    readonly supportedNodeTypes = ["llm"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        // 1. Validate config with Zod schema
        const config = validateOrThrow(LLMNodeConfigSchema, input.nodeConfig, "LLM");

        // 2. Get credentials via connection service
        const connection = await this.getConnection(config.connectionId);

        // 3. Interpolate variables in prompt
        const prompt = interpolateVariables(config.prompt, input.context);

        // 4. Call LLM with retry logic
        const result = await this.callLLM(config.provider, config.model, prompt, connection);

        // 5. Return result with metrics via helper
        return this.success(
            { [config.outputVariable]: result.content },
            { tokens: result.usage, durationMs: result.duration }
        );
    }
}
```

**Handler Registry**:

```typescript
// Location: backend/src/temporal/activities/execution/registry.ts

// Auto-registration on module load
registerHandler(createLLMNodeHandler(), "ai", 10);
registerHandler(createRouterNodeHandler(), "ai", 14);
registerHandler(createConditionalNodeHandler(), "logic", 40);
registerHandler(createGenericNodeHandler(), "generic", 999); // fallback

// First-match lookup with caching
const handler = findHandler("llm"); // Returns LLMNodeHandler
```

---

## Node Types Catalog

FlowMaestro supports 20+ node types for building comprehensive workflows.

### 1. LLM Node (type: "llm")

**Purpose**: Text generation using large language models

**Providers**: OpenAI, Anthropic, Google, Cohere

**Configuration**:

```json
{
  "provider": "openai" | "anthropic" | "google" | "cohere",
  "model": "string",
  "credentialId": "string (REQUIRED)",
  "prompt": "string (supports variable interpolation: ${variableName})",
  "systemPrompt": "string (optional)",
  "temperature": "number (0-1, default: 0.7)",
  "maxTokens": "number (default: 1000)",
  "outputVariable": "string (optional - wraps output in named variable)"
}
```

**Common Use Cases**:

- Text summarization
- Content generation
- Question answering
- Data extraction
- Classification
- Translation

**Example**:

```json
{
    "type": "llm",
    "label": "Summarize Article",
    "config": {
        "provider": "openai",
        "model": "gpt-4",
        "credentialId": "${userCredentialId}",
        "prompt": "Summarize the following article in 3 bullet points:\n\n${article}",
        "temperature": 0.5,
        "maxTokens": 500
    }
}
```

---

### 2. HTTP Node (type: "http")

**Purpose**: Make HTTP requests to external APIs

**Methods**: GET, POST, PUT, DELETE, PATCH

**Configuration**:

```json
{
  "method": "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  "url": "string (supports variable interpolation)",
  "headers": "Record<string, string>",
  "body": "any (for POST/PUT/PATCH)",
  "queryParams": "Record<string, string>",
  "credentialId": "string (optional - for API key auth)",
  "timeout": "number (ms, default: 30000)"
}
```

**Example**:

```json
{
    "type": "http",
    "label": "Fetch News Articles",
    "config": {
        "method": "GET",
        "url": "https://newsapi.org/v2/top-headlines",
        "queryParams": {
            "country": "us",
            "category": "technology"
        },
        "credentialId": "${newsApiCredentialId}"
    }
}
```

---

### 3. Conditional Node (type: "conditional")

**Purpose**: Branch workflow based on conditions

**Outputs**: Two handles - "true" and "false"

**Configuration**:

```json
{
  "condition": "string (JavaScript expression or simple comparison)",
  "leftValue": "any (supports variable interpolation)",
  "operator": "==" | "!=" | ">" | "<" | ">=" | "<=" | "contains" | "startsWith" | "endsWith",
  "rightValue": "any",
  "mode": "simple" | "expression" (default: "simple")"
}
```

**Example (Simple)**:

```json
{
    "type": "conditional",
    "label": "Check Status Code",
    "config": {
        "mode": "simple",
        "leftValue": "${response.status}",
        "operator": "==",
        "rightValue": 200
    }
}
```

**Example (Expression)**:

```json
{
    "type": "conditional",
    "label": "Validate Response",
    "config": {
        "mode": "expression",
        "condition": "${response.data.length} > 0 && ${response.status} === 200"
    }
}
```

---

### 4. Transform Node (type: "transform")

**Purpose**: Transform, filter, or extract data

**Methods**: JSONPath, templates, filters

**Configuration**:

```json
{
  "mode": "jsonpath" | "template" | "filter",
  "jsonPath": "string (for jsonpath mode)",
  "template": "string (for template mode)",
  "filterExpression": "string (for filter mode)",
  "outputVariable": "string (optional)"
}
```

**Example (JSONPath)**:

```json
{
    "type": "transform",
    "label": "Extract Article Titles",
    "config": {
        "mode": "jsonpath",
        "jsonPath": "$.articles[*].title",
        "outputVariable": "titles"
    }
}
```

**Example (Template)**:

```json
{
    "type": "transform",
    "label": "Format Output",
    "config": {
        "mode": "template",
        "template": "Summary for ${article.title}:\n\n${summary}"
    }
}
```

---

### 5. Loop Node (type: "loop")

**Purpose**: Iterate over arrays/lists

**Behavior**: Executes connected nodes for each item

**Configuration**:

```json
{
    "items": "string (variable reference to array, e.g., ${articles})",
    "itemVariable": "string (variable name for current item, default: item)",
    "indexVariable": "string (variable name for index, default: index)",
    "maxConcurrency": "number (default: 1 for sequential, >1 for parallel)"
}
```

**Example**:

```json
{
    "type": "loop",
    "label": "Process Each Article",
    "config": {
        "items": "${articles}",
        "itemVariable": "article",
        "indexVariable": "i",
        "maxConcurrency": 3
    }
}
```

---

### 6. Vision Node (type: "vision")

**Purpose**: Image generation and analysis

**Configuration**:

```json
{
  "mode": "generate" | "analyze",
  "provider": "openai" | "replicate",
  "credentialId": "string (REQUIRED)",
  "prompt": "string (for generation)",
  "imageUrl": "string (for analysis)",
  "size": "256x256" | "512x512" | "1024x1024",
  "model": "string"
}
```

---

### 7. Audio Node (type: "audio")

**Purpose**: Speech-to-text and text-to-speech

**Configuration**:

```json
{
  "mode": "transcribe" | "synthesize",
  "provider": "openai" | "google",
  "credentialId": "string (REQUIRED)",
  "audioUrl": "string (for transcription)",
  "text": "string (for synthesis)",
  "voice": "string",
  "language": "string"
}
```

---

### 8. Input Node (type: "input")

**Purpose**: Accept user input at workflow start

**Configuration**:

```json
{
  "inputType": "text" | "number" | "file" | "choice",
  "label": "string",
  "placeholder": "string",
  "required": "boolean",
  "defaultValue": "any",
  "choices": "string[] (for choice type)",
  "variable": "string (variable name to store input)"
}
```

**Example**:

```json
{
    "type": "input",
    "label": "Enter Topic",
    "config": {
        "inputType": "text",
        "label": "What topic should I search for?",
        "placeholder": "e.g., artificial intelligence",
        "required": true,
        "variable": "topic"
    }
}
```

---

### 9. Output Node (type: "output")

**Purpose**: Display results to user

**Configuration**:

```json
{
  "format": "text" | "json" | "markdown" | "html",
  "value": "string (variable reference or template)",
  "label": "string"
}
```

**Example**:

```json
{
    "type": "output",
    "label": "Show Results",
    "config": {
        "format": "markdown",
        "value": "${formattedResults}",
        "label": "Search Results"
    }
}
```

---

### 10. Switch Node (type: "switch")

**Purpose**: Multiple conditional branches

**Outputs**: Multiple named handles based on cases

**Configuration**:

```json
{
    "value": "string (variable to evaluate)",
    "cases": "Array<{ match: any, output: string }>",
    "defaultOutput": "string"
}
```

---

### 11. Code Node (type: "code")

**Purpose**: Execute custom JavaScript or Python

**Configuration**:

```json
{
  "language": "javascript" | "python",
  "code": "string",
  "inputs": "Record<string, any>",
  "outputVariable": "string"
}
```

---

### 12. Wait Node (type: "wait")

**Purpose**: Delay workflow execution

**Configuration**:

```json
{
  "duration": "number (milliseconds)",
  "unit": "ms" | "seconds" | "minutes"
}
```

---

### 13. Database Node (type: "database")

**Purpose**: Query SQL/NoSQL databases

**Configuration**:

```json
{
  "databaseType": "postgres" | "mysql" | "mongodb",
  "credentialId": "string (REQUIRED)",
  "query": "string",
  "parameters": "Record<string, any>"
}
```

---

### 14. Integration Node (type: "integration")

**Purpose**: Connect to third-party services

**Configuration**:

```json
{
  "service": "slack" | "email" | "googlesheets",
  "action": "string (service-specific)",
  "credentialId": "string (REQUIRED)",
  "config": "Record<string, any> (service-specific)"
}
```

---

### 15. Embeddings Node (type: "embeddings")

**Purpose**: Generate vector embeddings for semantic search

**Configuration**:

```json
{
  "provider": "openai" | "cohere",
  "model": "string",
  "credentialId": "string (REQUIRED)",
  "text": "string"
}
```

---

### 16. Variable Node (type: "variable")

**Purpose**: Set or get workflow-level variables

**Configuration**:

```json
{
  "operation": "set" | "get",
  "variableName": "string",
  "value": "any (for set operation)"
}
```

---

### 17. Router Node (type: "router")

**Purpose**: LLM-based classification into predefined routes

**Outputs**: Multiple named handles based on routes (like Switch, but AI-powered)

**Configuration**:

```json
{
  "provider": "openai" | "anthropic" | "google",
  "model": "string",
  "connectionId": "string (REQUIRED)",
  "systemPrompt": "string (optional)",
  "prompt": "string (classification prompt with {{variable}} interpolation)",
  "routes": [
    { "value": "route_id", "label": "Display Label", "description": "When to use" }
  ],
  "defaultRoute": "string (optional - fallback route)",
  "temperature": "number (default: 0 for deterministic)",
  "outputVariable": "string"
}
```

**Example**:

```json
{
    "type": "router",
    "label": "Classify Intent",
    "config": {
        "provider": "openai",
        "model": "gpt-4o",
        "connectionId": "${openaiConnectionId}",
        "prompt": "Classify the following user message: {{userMessage}}",
        "routes": [
            { "value": "support", "label": "Support", "description": "Customer support requests" },
            { "value": "sales", "label": "Sales", "description": "Sales inquiries" },
            { "value": "feedback", "label": "Feedback", "description": "Product feedback" }
        ],
        "defaultRoute": "support",
        "outputVariable": "classification"
    }
}
```

---

### 18. Trigger Node (type: "trigger")

**Purpose**: Visual entry point for schedule/webhook/manual triggers

**Outputs**: Single output handle (workflow entry point, no input)

**Configuration**:

```json
{
  "triggerType": "schedule" | "webhook" | "manual" | "event",
  "enabled": "boolean",
  "cronExpression": "string (for schedule)",
  "timezone": "string (for schedule)",
  "webhookMethod": "POST" | "GET" | "PUT" | "DELETE" | "ANY",
  "authType": "none" | "api_key" | "hmac" | "bearer"
}
```

**Note**: The Trigger node is metadata-only on the canvas. Actual trigger registration is handled by the backend via `/api/triggers` endpoints.

---

## Workflow Triggers

FlowMaestro workflows can be triggered automatically via schedules, webhooks, or events, in addition to manual execution.

### Trigger Types

1. **Schedule Triggers**: Time-based execution using cron expressions
2. **Webhook Triggers**: HTTP-triggered workflows from external services
3. **Event Triggers**: Internal event-driven execution
4. **Manual Triggers**: On-demand execution by users

### Database Schema

The trigger system uses three database tables:

**workflow_triggers**:

- Stores trigger configuration (type, config, enabled status)
- Links to workflows via `workflow_id`
- Tracks execution metadata (last run, next run, execution count)
- Stores webhook secrets and Temporal schedule IDs

**trigger_executions**:

- Links triggers to workflow executions
- Stores trigger payload for debugging
- Creates audit trail of trigger activations

**webhook_logs**:

- Comprehensive audit log for webhook requests
- Captures request/response details, processing time
- Records IP addresses and user agents for security monitoring

### Schedule Triggers

Schedule triggers leverage Temporal's scheduling infrastructure for reliable, distributed cron-based execution.

**Features**:

- Standard cron expressions (e.g., `"0 9 * * *"` for daily at 9 AM)
- Full timezone support (schedule relative to any timezone)
- Overlap policy (buffer one execution, drop subsequent)
- Catchup window (1 minute - retroactively trigger missed executions)
- Manual trigger capability (test schedules outside normal cadence)
- Automatic sync on startup (schedules persist across server restarts)

**Creating a Schedule Trigger**:

```bash
POST /api/triggers
Authorization: Bearer <token>

{
  "workflowId": "uuid",
  "name": "Daily Report Generator",
  "triggerType": "schedule",
  "enabled": true,
  "config": {
    "cronExpression": "0 9 * * *",
    "timezone": "America/New_York"
  }
}
```

**Data Flow**:

```
1. User creates schedule trigger via API
   ↓
2. TriggerRepository saves to database
   ↓
3. SchedulerService registers with Temporal
   ↓
4. Temporal executes on cron schedule
   ↓
5. triggeredWorkflow starts
   ↓
6. prepareTriggeredExecution fetches workflow & creates execution
   ↓
7. orchestratorWorkflow executes the workflow
   ↓
8. completeTriggeredExecution updates execution status
   ↓
9. Results stored in database
```

### Webhook Triggers

Webhook triggers enable external services to initiate workflow execution through HTTP requests.

**Features**:

- Unique webhook URL for each trigger (`/api/webhooks/{triggerId}`)
- Four authentication types:
    - **None**: For trusted internal networks
    - **API Key**: Secret key in headers
    - **HMAC Signature**: Cryptographic request signing (GitHub/Stripe pattern)
    - **Bearer Token**: Token-based authentication
- HTTP method validation (GET, POST, PUT, DELETE, PATCH)
- Origin whitelisting for CORS protection
- Comprehensive request/response logging
- Asynchronous execution (202 Accepted response)

**Creating a Webhook Trigger**:

```bash
POST /api/triggers
Authorization: Bearer <token>

{
  "workflowId": "uuid",
  "name": "GitHub Push Webhook",
  "triggerType": "webhook",
  "enabled": true,
  "config": {
    "method": "POST",
    "authType": "hmac",
    "requireSignature": true,
    "allowedOrigins": ["https://github.com"],
    "responseFormat": "json"
  }
}

# Response includes webhook_secret for HMAC signing
```

**Calling a Webhook**:

```bash
POST /api/webhooks/{triggerId}
X-Signature: sha256=<hmac-signature>
Content-Type: application/json

{
  "event": "push",
  "repository": "flowmaestro",
  "branch": "main"
}

# Returns:
{
  "success": true,
  "executionId": "uuid",
  "message": "Workflow execution started"
}
```

**Data Flow**:

```
1. External service sends HTTP request to /api/webhooks/{triggerId}
   ↓
2. WebhookService validates trigger (enabled, auth, method, origin)
   ↓
3. Creates webhook log entry
   ↓
4. Starts triggeredWorkflow via Temporal
   ↓
5. Returns 202 Accepted immediately
   ↓
6. Workflow executes asynchronously
```

### Security Features

**Webhook Authentication**:

- HMAC-SHA256 signature verification with timing-safe comparison
- Unique secret per trigger for granular revocation
- Bearer token and API key support

**Authorization**:

- Trigger management requires JWT authentication
- Webhook receiver intentionally public (auth via webhook mechanisms)

**Origin Validation**:

- CORS origin whitelisting
- Reject requests from unauthorized domains

**Audit Trail**:

- Complete webhook request/response logging
- Execution tracking (link executions to triggers)
- IP address and user agent capture

### Trigger API Endpoints

**Trigger Management**:

- `POST /api/triggers` - Create trigger (registers with Temporal if schedule)
- `GET /api/triggers` - List triggers (filter by workflowId or type)
- `GET /api/triggers/:id` - Get trigger (includes live schedule info from Temporal)
- `PUT /api/triggers/:id` - Update trigger (syncs with Temporal)
- `DELETE /api/triggers/:id` - Delete trigger (removes from Temporal)

**Webhook Receiver**:

- `ANY /api/webhooks/:triggerId` - Public endpoint for webhook requests
    - Returns 202 Accepted with execution ID
    - Error codes: 404 (not found), 403 (origin blocked), 401 (auth failed), 405 (method mismatch), 500 (internal error)

---

## AI Workflow Generation

FlowMaestro can generate complete, executable workflows from natural language descriptions using AI.

### User Flow

1. User clicks magic wand icon (positioned left of Test/Trigger buttons)
2. Dialog opens with prompt textarea and credential selector
3. User enters description (e.g., "Fetch news from API and summarize with AI")
4. User selects preferred LLM credential (OpenAI, Anthropic, etc.)
5. Backend calls LLM with system prompt + user request
6. LLM returns structured JSON workflow
7. Frontend validates, auto-layouts nodes, and adds to canvas
8. User can immediately test or refine the workflow

### System Prompt Strategy

The system prompt (~3000-4000 tokens) consists of four parts:

**1. Role & Objective**:

```
You are an expert workflow automation designer for FlowMaestro, a visual workflow builder.

Your task: Convert user's natural language descriptions into complete, executable workflow definitions.

Output Format: Valid JSON with nodes array, edges array, and metadata.

Rules:
- Create workflows that are practical and executable
- Generate a concise workflow name (3-6 words)
- Use smart defaults for all configurations
- Generate descriptive labels for each node
- Ensure proper node connections (edges)
- Include necessary error handling (conditional nodes)
- Keep workflows simple but complete
- Always specify credentialId for nodes requiring auth
```

**2. Node Catalog**: Complete specifications for all 16 node types (see [Node Types Catalog](#node-types-catalog) section)

**3. Edge Connection Rules**:

- Node IDs: "node-0", "node-1", "node-2", etc.
- Source handles: "output" (most nodes), "true"/"false" (conditional), case names (switch)
- Target handles: "input"
- Entry point: First node in execution order

**4. Output JSON Schema**:

```json
{
    "nodes": [
        {
            "id": "node-0",
            "type": "input|llm|http|...",
            "label": "User-friendly name",
            "config": {
                /* node-specific config */
            }
        }
    ],
    "edges": [
        {
            "source": "node-0",
            "target": "node-1",
            "sourceHandle": "output",
            "targetHandle": "input"
        }
    ],
    "metadata": {
        "name": "Concise workflow name (3-6 words)",
        "entryNodeId": "node-0",
        "description": "Brief description"
    }
}
```

### Example: API + AI Summarization

**User Input**:

> "Fetch latest tech news from NewsAPI and summarize each article with GPT-4"

**Generated Workflow**:

- **Node 0**: HTTP node to fetch news
- **Node 1**: Transform node to extract articles
- **Node 2**: Loop node to process each article
- **Node 3**: LLM node to summarize
- **Node 4**: Output node to display summaries

**Flow**: HTTP → Transform → Loop → LLM → Output

### Auto-Layout Algorithm

When nodes are generated, they're positioned automatically:

1. **Start Position**: Entry node at (100, 300)
2. **Build Dependency Graph**: Analyze edges
3. **Topological Sort**: Order nodes by execution flow
4. **Level Assignment**: Use BFS to assign depth levels
5. **Position Calculation**:
    - x = level × 250
    - y = 300 + (nodeInLevel × 150)
6. **Special Handling**:
    - Conditional: True branch up, false branch down
    - Loop: Stack iterations vertically
    - Parallel branches: Fan out vertically

### Implementation

**Backend**:

- `/api/workflows/generate` - POST endpoint
- `/services/workflow-generator.ts` - Prompt building and LLM call
- Uses `executeLLMNode` with user credentials

**Frontend**:

- `AIGenerateButton.tsx` - Magic wand button
- `AIGenerateDialog.tsx` - Prompt input modal
- `workflow-layout.ts` - Auto-layout algorithm
- `workflowStore.ts` - State management

---

## Agent Workflow Node

The Agent workflow node (type: "agent") enables AI agents to be executed as part of workflows, combining the power of conversational AI with structured automation.

**Purpose**: Execute AI agent conversations within workflows

**Configuration**:

```json
{
    "agentId": "string (REQUIRED - ID of configured agent)",
    "input": "string (user message, supports variable interpolation)",
    "conversationId": "string (optional - continue existing conversation)",
    "streamResponse": "boolean (default: false - stream tokens in real-time)",
    "outputVariable": "string (optional - variable name for agent response)"
}
```

**Features**:

- Execute any configured agent from the agent builder
- Pass workflow variables as agent input
- Continue multi-turn conversations
- Stream responses in real-time
- Access agent tools (workflows, functions, knowledge bases, MCP)
- Memory management (buffer, summary, vector)

**Example**:

```json
{
    "type": "agent",
    "label": "Research Assistant",
    "config": {
        "agentId": "research-agent-uuid",
        "input": "Research the following topic: ${topic}",
        "streamResponse": true,
        "outputVariable": "researchResults"
    }
}
```

**Use Cases**:

- Content analysis and generation within workflows
- Dynamic decision-making based on AI reasoning
- Complex research tasks with tool usage
- Multi-step agent interactions
- Knowledge base queries

For complete agent system documentation, see [agents.md](./agents.md).

---

## Variable Interpolation

FlowMaestro supports powerful variable interpolation throughout workflows.

### Syntax

- **Basic**: `${variableName}`
- **Nested paths**: `${response.data.items[0].title}`
- **Array access**: `${articles[0]}`
- **Object properties**: `${user.email}`

### Execution Context

Each node receives an execution context containing:

- **Workflow inputs**: Initial variables passed at execution start
- **Previous node outputs**: All upstream node results
- **Loop variables**: Current item and index (when inside loop)
- **Special variables**: `${executionId}`, `${workflowId}`, `${userId}`

### Variable Scoping

- **Global scope**: Workflow-level variables accessible to all nodes
- **Node scope**: Node-specific output variables
- **Loop scope**: Item and index variables only available within loop

### Example Context Flow

```
Workflow starts with: { topic: "AI" }
↓
Node 1 (HTTP): Fetches data
Context: { topic: "AI", httpResponse: {...} }
↓
Node 2 (Transform): Extracts titles
Context: { topic: "AI", httpResponse: {...}, titles: [...] }
↓
Node 3 (LLM): Uses ${titles} in prompt
Context: { topic: "AI", httpResponse: {...}, titles: [...], summary: "..." }
```

---

## Workflow Canvas UI

The FlowMaestro workflow builder provides an intuitive visual interface powered by React Flow.

### Canvas Features

- **Drag & Drop**: Add nodes from sidebar
- **Visual Connections**: Click and drag to create edges
- **Node Configuration**: Click node to open config panel
- **Real-time Validation**: Highlight missing connections or configs
- **Auto-Layout**: Organize nodes automatically
- **Zoom & Pan**: Navigate large workflows
- **Minimap**: Overview of entire workflow

### Workflow Actions

**Top Bar Actions**:

- **Save**: Persist workflow definition
- **Test**: Execute workflow with test inputs
- **Trigger**: Configure triggers (schedule/webhook)
- **AI Generate**: Magic wand for AI-powered generation
- **Settings**: Workflow metadata and configuration

**Context Menu** (right-click node):

- **Edit**: Open configuration panel
- **Duplicate**: Copy node with config
- **Delete**: Remove node and connections
- **Test Node**: Execute single node with mock data

### Execution Monitoring

During execution, the canvas shows:

- **Node status**: Pending (gray), Running (blue), Success (green), Error (red)
- **Progress indicator**: Animated border for active nodes
- **Execution logs**: Expandable panel with detailed logs
- **Variable inspector**: View execution context at any point
- **Real-time updates**: WebSocket-powered live updates

### Keyboard Shortcuts

- **Ctrl/Cmd + S**: Save workflow
- **Ctrl/Cmd + Z**: Undo
- **Ctrl/Cmd + Y**: Redo
- **Delete**: Remove selected nodes
- **Ctrl/Cmd + D**: Duplicate selected nodes
- **Ctrl/Cmd + A**: Select all nodes
- **Space**: Pan mode

---

## Best Practices

### Workflow Design

1. **Start Simple**: Begin with 3-7 nodes, add complexity gradually
2. **Error Handling**: Use conditional nodes to check API responses
3. **Descriptive Labels**: Use action-oriented names ("Fetch User Data" not "HTTP Node")
4. **Variable Naming**: Use clear, consistent names (`userEmail` not `e`)
5. **Modular Design**: Break complex workflows into reusable sub-workflows

### Performance Optimization

1. **Parallel Execution**: Design for independent nodes to run concurrently
2. **Loop Concurrency**: Use `maxConcurrency` in loops for parallel processing
3. **Timeout Configuration**: Set appropriate timeouts for external API calls
4. **Credential Caching**: Reuse credentials across nodes
5. **Context Size**: Avoid storing large data in context, use references

### Testing Strategy

1. **Test Incrementally**: Test each node before connecting the full workflow
2. **Mock Data**: Use test inputs to validate node configurations
3. **Error Scenarios**: Test with invalid inputs and API failures
4. **Edge Cases**: Test with empty arrays, null values, missing fields
5. **Load Testing**: Test loops with large datasets

---

## API Reference

### Execute Workflow

```bash
POST /api/workflows/:id/execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "inputs": {
    "topic": "artificial intelligence",
    "maxResults": 10
  }
}

# Response
{
  "success": true,
  "data": {
    "executionId": "uuid",
    "workflowId": "uuid",
    "status": "running",
    "startedAt": "2025-01-15T10:30:00Z"
  }
}
```

### Get Execution Status

```bash
GET /api/executions/:id
Authorization: Bearer <token>

# Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "workflowId": "uuid",
    "status": "completed",
    "outputs": { /* execution results */ },
    "startedAt": "2025-01-15T10:30:00Z",
    "completedAt": "2025-01-15T10:32:15Z",
    "duration": 135000
  }
}
```

### Cancel Execution

```bash
POST /api/executions/:id/cancel
Authorization: Bearer <token>

# Response
{
  "success": true,
  "message": "Execution cancelled"
}
```

---

## Related Documentation

- **[agents.md](./agents.md)**: Complete agent system documentation
- **[integrations.md](./integrations.md)**: OAuth, API keys, and MCP connections
- **[temporal.md](./temporal.md)**: Temporal orchestration and workers
- **[websocket.md](./websocket.md)**: Real-time execution updates
- **[testing.md](./testing.md)**: Integration testing strategies

---

## Summary

FlowMaestro's workflow system provides:

1. **Powerful Execution Engine**: Temporal-based durable execution with automatic retries
2. **Handler Registry Pattern**: Extensible node handlers with priority-based routing
3. **Signal-Based Flow Control**: Rich signals for branching, loops, and pause/resume
4. **4-Stage Workflow Builder**: Deterministic graph construction with loop/parallel support
5. **Rich Node Library**: 20+ node types including Router (AI classification) and Trigger
6. **Flexible Triggers**: Schedule, webhook, event, and manual execution
7. **AI-Powered Generation**: Create workflows from natural language
8. **Agent Integration**: Execute AI agents within structured workflows
9. **Real-time Monitoring**: SSE/WebSocket-based live execution updates
10. **Visual Builder**: Intuitive drag-and-drop interface with React Flow

The system enables users to build sophisticated AI-powered automations without writing code, while providing the flexibility and power of a programmatic workflow engine.

### Architecture Highlights

| Component        | Location                                                | Purpose                             |
| ---------------- | ------------------------------------------------------- | ----------------------------------- |
| Core Module      | `backend/src/temporal/core/`                            | Types, schemas, services, utilities |
| Handler Registry | `backend/src/temporal/activities/execution/registry.ts` | Priority-based handler lookup       |
| Workflow Builder | `backend/src/temporal/activities/execution/builder.ts`  | 4-stage graph construction          |
| Node Handlers    | `backend/src/temporal/activities/execution/handlers/`   | Per-node-type execution logic       |
| Context Service  | `backend/src/temporal/core/services/context.ts`         | Immutable context operations        |
| Snapshot Service | `backend/src/temporal/core/services/snapshot.ts`        | Pause/resume persistence            |
