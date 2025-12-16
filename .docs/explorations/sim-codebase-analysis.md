# Sim Studio - Comprehensive Codebase Analysis

## Executive Summary

**Sim Studio** is a sophisticated, production-ready visual AI workflow builder platform that enables users to design, deploy, and execute complex AI agent workflows through a canvas-based interface. It's built with modern technologies and follows enterprise-grade architectural patterns.

| Metric                    | Value |
| ------------------------- | ----- |
| **TypeScript/TSX Files**  | 3,426 |
| **Test Files**            | 88    |
| **Block Definitions**     | 137   |
| **Tool Integrations**     | 127+  |
| **Database Migrations**   | 124   |
| **Database Schema Lines** | 1,598 |
| **LLM Providers**         | 16+   |

---

## Technology Stack

### Core Framework

| Component       | Technology           | Version |
| --------------- | -------------------- | ------- |
| Framework       | Next.js (App Router) | 16.0.9  |
| Runtime         | React                | 19.2.1  |
| Language        | TypeScript           | 5.7.3   |
| Package Manager | Bun                  | 1.3.3   |
| Monorepo        | Turborepo            | 2.6.3   |

### Database & Storage

| Component     | Technology               |
| ------------- | ------------------------ |
| Primary DB    | PostgreSQL with pgvector |
| ORM           | Drizzle ORM              |
| Cache         | Redis                    |
| File Storage  | AWS S3 / Azure Blob      |
| Vector Search | pgvector (HNSW index)    |

### Frontend

| Component        | Technology            |
| ---------------- | --------------------- |
| UI Library       | shadcn/ui + Radix UI  |
| Styling          | Tailwind CSS 3.4.1    |
| State Management | Zustand + React Query |
| Workflow Canvas  | ReactFlow 11.11.4     |
| Animations       | Framer Motion 12.5.0  |

### Backend Services

| Component       | Technology         |
| --------------- | ------------------ |
| Authentication  | Better-Auth 1.3.12 |
| Real-time       | Socket.IO 4.8.1    |
| Background Jobs | Trigger.dev 4.1.2  |
| Code Execution  | E2B Sandbox        |

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                         SIM STUDIO                         │
├────────────────────────────────────────────────────────────┤
│  FRONTEND (Next.js App Router)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Workflow     │  │ Knowledge    │  │ Chat         │      │
│  │ Canvas       │  │ Base UI      │  │ Interface    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├────────────────────────────────────────────────────────────┤
│  STATE MANAGEMENT                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Zustand      │  │ React Query  │  │ Socket.IO    │      │
│  │ (23 stores)  │  │ (caching)    │  │ (real-time)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├────────────────────────────────────────────────────────────┤
│  API LAYER (Next.js API Routes)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ /api/v1/*    │  │ /api/        │  │ /api/        │      │
│  │ Public API   │  │ workflows/*  │  │ tools/*      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├────────────────────────────────────────────────────────────┤
│  EXECUTION ENGINE                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ DAG          │  │ Block        │  │ Variable     │      │
│  │ Executor     │  │ Handlers     │  │ Resolver     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├────────────────────────────────────────────────────────────┤
│  INTEGRATIONS                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 16+ LLM      │  │ 127+ Tool    │  │ 19+ Trigger  │      │
│  │ Providers    │  │ Integrations │  │ Types        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├────────────────────────────────────────────────────────────┤
│  DATA LAYER                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PostgreSQL   │  │ Redis        │  │ S3/Azure     │      │
│  │ + pgvector   │  │ Cache        │  │ Storage      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
sim/
├── apps/
│   ├── sim/                    # Main Next.js application
│   │   ├── app/                # App Router (pages + API routes)
│   │   │   ├── api/            # 41+ API route handlers
│   │   │   ├── (auth)/         # Authentication pages
│   │   │   ├── (landing)/      # Marketing pages
│   │   │   ├── workspace/      # Main workspace UI
│   │   │   └── chat/           # Chat interface
│   │   ├── blocks/             # Workflow block definitions (137 blocks)
│   │   ├── components/         # React components (shadcn-based)
│   │   ├── executor/           # DAG execution engine
│   │   │   ├── dag/            # DAG builder & executor
│   │   │   ├── handlers/       # Block-specific handlers (13)
│   │   │   └── orchestrators/  # Loop/parallel orchestration
│   │   ├── hooks/              # 28+ custom React hooks
│   │   ├── lib/                # 26+ utility modules
│   │   ├── providers/          # LLM provider implementations
│   │   ├── socket-server/      # Real-time WebSocket server
│   │   ├── stores/             # 23+ Zustand stores
│   │   ├── tools/              # 127+ tool integrations
│   │   └── triggers/           # 19+ trigger types
│   └── docs/                   # Documentation site (Fumadocs)
├── packages/
│   ├── db/                     # Database schema & migrations
│   │   ├── schema.ts           # Drizzle ORM schema (1,598 lines)
│   │   └── migrations/         # 124 SQL migrations
│   ├── ts-sdk/                 # TypeScript SDK
│   ├── python-sdk/             # Python SDK
│   └── cli/                    # NPX CLI package
├── docker/                     # Docker configurations
└── helm/                       # Kubernetes Helm charts
```

---

## Core Features

### 1. Visual Workflow Builder

- **ReactFlow-based canvas** for drag-and-drop workflow design
- **137 pre-built blocks** covering agents, tools, conditionals, loops
- **Real-time collaboration** via Socket.IO
- **AI Copilot** for generating and modifying workflows

### 2. AI Agent System

- **Multi-provider support**: OpenAI, Anthropic, Google, Mistral, Groq, Azure, Cerebras, xAI
- **Local model support**: Ollama, vLLM
- **Tool calling**: Agents can invoke any of the 127+ integrated tools
- **Structured outputs**: JSON Schema-based response formats
- **Memory management**: Conversation context persistence

### 3. Execution Engine

- **DAG-based execution**: Directed Acyclic Graph for workflow orchestration
- **Control flow**: Loops (for, forEach, while), parallel execution, conditionals
- **Human-in-the-loop**: Pause/resume workflows for human approval
- **Streaming**: Real-time SSE streaming for long-running operations
- **Snapshots**: Execution state persistence for resumability

### 4. Knowledge Base

- **Vector embeddings**: pgvector with HNSW indexing
- **Semantic search**: RAG (Retrieval-Augmented Generation) support
- **Document processing**: PDF, DOCX, TXT, HTML, etc.
- **Chunking strategies**: Configurable chunk size and overlap

### 5. Triggers & Webhooks

| Type      | Examples                                     |
| --------- | -------------------------------------------- |
| API       | REST endpoints for workflow execution        |
| Webhooks  | GitHub, Slack, Stripe, Linear, HubSpot, etc. |
| Schedules | Cron-based scheduling with timezone support  |
| Chat      | Interactive chat interfaces                  |
| Polling   | Gmail, Airtable, Calendly, Google Forms      |

---

## Workflow Blocks System

### Overview

The Sim workflow system is built on a flexible block-based architecture with **137 block definitions** and **13 dedicated execution handlers**. The system uses a plugin-like registration pattern where block definitions declare configuration and capabilities, while handlers implement execution logic.

### Block Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      BLOCK SYSTEM                              │
├────────────────────────────────────────────────────────────────┤
│  BLOCK DEFINITIONS (/blocks/blocks/)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ BlockConfig  │  │ SubBlocks    │  │ Tools        │          │
│  │ (type, name) │  │ (UI config)  │  │ (access)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├────────────────────────────────────────────────────────────────┤
│  BLOCK REGISTRY (/blocks/registry.ts)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ getBlock() | getBlockByToolName() | getAllBlocks()       │  │
│  └──────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────┤
│  EXECUTION HANDLERS (/executor/handlers/)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ AgentHandler │  │ Function     │  │ Condition    │          │
│  │              │  │ Handler      │  │ Handler      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ RouterHandler│  │ APIHandler   │  │ Generic      │          │
│  │              │  │              │  │ Handler      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────────────────────────────────────────┘
```

### Core Type Definitions

Location: `/apps/sim/blocks/types.ts`

#### BlockConfig Interface

```typescript
interface BlockConfig<T extends ToolResponse = ToolResponse> {
    type: string; // Unique block identifier
    name: string; // Display name
    description: string; // Short description
    longDescription?: string; // Detailed documentation
    bestPractices?: string; // Usage guidelines
    docsLink?: string; // Documentation link
    category: "blocks" | "tools" | "triggers";
    bgColor: string; // UI color (CSS variable or hex)
    icon: BlockIcon; // React component icon
    subBlocks: SubBlockConfig[]; // Configuration UI elements
    triggerAllowed?: boolean; // Can be used as trigger
    authMode?: AuthMode; // Auth method (OAuth, ApiKey, BotToken)
    hideFromToolbar?: boolean; // Hide from UI
    tools: {
        access: string[]; // Tool IDs this block can use
        config?: {
            tool: (params) => string; // Dynamic tool selection
            params?: (params) => Record<string, any>; // Parameter transformation
        };
    };
    inputs: Record<string, ParamConfig>; // Input parameter definitions
    outputs: Record<string, OutputFieldDefinition>; // Output field definitions
}
```

#### SubBlockConfig Interface (UI Configuration)

```typescript
interface SubBlockConfig {
    id: string; // Unique within block
    title?: string; // Display label
    type: SubBlockType; // UI component type (39 types)
    mode?: "basic" | "advanced" | "both" | "trigger";
    required?: boolean | ConditionalRequired; // Validation rule
    defaultValue?: any; // Initial value
    options?: StaticOptions | DynamicOptions; // Dropdown/select options
    condition?: ConditionalLogic; // Show/hide rule
    hidden?: boolean; // Always hidden
    placeholder?: string; // Input hint
    password?: boolean; // Password field
    wandConfig?: AIAssistanceConfig; // AI code generation
    dependsOn?: string[] | { all?: string[]; any?: string[] };
}
```

#### SubBlockType Enum (39 UI Component Types)

```typescript
type SubBlockType =
    | "short-input" // Single-line text input
    | "long-input" // Multi-line text area
    | "dropdown" // Static select dropdown
    | "combobox" // Searchable dropdown with text input
    | "slider" // Range slider
    | "table" // Key-value grid
    | "code" // Code editor with syntax highlighting
    | "switch" // Toggle button
    | "checkbox-list" // Multiple checkboxes
    | "grouped-checkbox-list" // Grouped checkboxes with select all
    | "file-upload" // File uploader
    | "file-selector" // Browse files from cloud services
    | "folder-selector" // Browse folders
    | "project-selector" // Select from workspace projects
    | "channel-selector" // Select from service channels
    | "document-selector" // Select from knowledge documents
    | "oauth-input" // Credential/account selector
    | "tool-input" // Embedded tool configuration
    | "condition-input" // Conditional logic builder
    | "eval-input" // Expression evaluator
    | "time-input" // Time picker
    | "schedule-save" // Schedule configuration
    | "trigger-save" // Trigger validation and save
    | "webhook-config" // Webhook endpoint configuration
    | "input-format" // JSON schema builder for inputs
    | "response-format" // JSON schema builder for responses
    | "input-mapping" // Map parent variables to child inputs
    | "variables-input" // Set workflow-scoped variables
    | "messages-input" // LLM message history with roles
    | "mcp-server-selector" // MCP server selection
    | "mcp-tool-selector" // MCP tool selection
    | "mcp-dynamic-args" // Dynamic MCP arguments
    | "workflow-selector" // Child workflow selection
    | "workflow-input-mapper" // Map variables to child workflow
    | "knowledge-base-selector"
    | "knowledge-tag-filters"
    | "document-tag-entry"
    | "text"; // Read-only text display
```

### Complete Block Inventory (137 Blocks)

#### Core Control Blocks (14)

| Block                 | Type ID             | Description                                         | Handler                      |
| --------------------- | ------------------- | --------------------------------------------------- | ---------------------------- |
| **Agent**             | `agent`             | LLM inference with tools, memory, structured output | `AgentBlockHandler`          |
| **Condition**         | `condition`         | Branch based on JavaScript expressions              | `ConditionBlockHandler`      |
| **Function**          | `function`          | Execute custom JavaScript/Python code               | `FunctionBlockHandler`       |
| **Router**            | `router`            | LLM-powered intelligent path selection              | `RouterBlockHandler`         |
| **API**               | `api`               | HTTP requests (GET, POST, PUT, DELETE, PATCH)       | `ApiBlockHandler`            |
| **Response**          | `response`          | Send structured API responses                       | `ResponseBlockHandler`       |
| **Variables**         | `variables`         | Set workflow-scoped variables                       | `VariablesBlockHandler`      |
| **Wait**              | `wait`              | Time delay (seconds/minutes, max 10 min)            | `WaitBlockHandler`           |
| **Human in the Loop** | `human_in_the_loop` | Pause/resume for human approval                     | `HumanInTheLoopBlockHandler` |
| **Workflow**          | `workflow`          | Execute child workflows                             | `WorkflowBlockHandler`       |
| **Evaluator**         | `evaluator`         | LLM-based metric evaluation                         | `EvaluatorBlockHandler`      |
| **Parallel**          | `parallel`          | Concurrent branch execution                         | Orchestrator (metadata-only) |
| **Loop**              | `loop`              | Iteration (for, forEach, while, doWhile)            | Orchestrator (metadata-only) |
| **Note**              | `note`              | Canvas annotations                                  | None (metadata-only)         |

#### Trigger Blocks (7)

| Block               | Type ID           | Description                |
| ------------------- | ----------------- | -------------------------- |
| **Start**           | `starter`         | Manual workflow start      |
| **Start Trigger**   | `start_trigger`   | New trigger initialization |
| **Manual**          | `manual_trigger`  | Legacy manual trigger      |
| **API Trigger**     | `api_trigger`     | HTTP webhook trigger       |
| **Chat Trigger**    | `chat_trigger`    | Chat message trigger       |
| **Input Trigger**   | `input_trigger`   | Input form trigger         |
| **Schedule**        | `schedule`        | Cron/schedule trigger      |
| **Webhook**         | `webhook`         | Generic webhook            |
| **Generic Webhook** | `generic_webhook` | Custom webhook endpoint    |

#### Integration Blocks (116+)

**Communication (13)**

- `slack` - Messages, reactions, canvases
- `discord` - Messages, embeds, roles, channels
- `telegram` - Messages, media
- `whatsapp` - WhatsApp Business messaging
- `microsoft_teams` - Teams messages, channels
- `gmail` - Email send, read, search
- `outlook` - Outlook email operations
- `sendgrid` - Email campaigns
- `mailgun` - Transactional email
- `mailchimp` - Email marketing
- `twilio` - SMS messages
- `twilio_voice` - Voice calls
- `smtp` - Direct SMTP email

**CRM & Sales (8)**

- `hubspot` - Contacts, deals, companies
- `salesforce` - Records, objects, queries
- `pipedrive` - Deals, contacts, activities
- `intercom` - Customer messaging
- `linkedin` - Profile interactions
- `apollo` - B2B data enrichment
- `wealthbox` - Financial CRM
- `hunter` - Email finder

**Project Management (9)**

- `jira` - Issues, sprints, projects
- `asana` - Tasks, projects, sections
- `linear` - Issues, projects, cycles
- `trello` - Cards, boards, lists
- `notion` - Pages, databases
- `microsoft_planner` - Tasks, plans
- `incidentio` - Incident management
- `confluence` - Documentation, spaces
- `github` - Repos, issues, PRs, actions

**Productivity & Documents (12)**

- `google_sheets` - Rows, formulas, ranges
- `google_docs` - Documents, content
- `google_slides` - Presentations
- `google_drive` - Files, folders
- `google_calendar` - Events, scheduling
- `google_form` - Form responses
- `google_groups` - Group messaging
- `google_vault` - Archive access
- `microsoft_excel` - Spreadsheets
- `onedrive` - File storage
- `dropbox` - File operations
- `sharepoint` - Team sites, documents

**Databases (9)**

- `postgresql` - SQL queries
- `mysql` - SQL queries
- `dynamodb` - Items, scans, queries
- `mongodb` - Documents, aggregations
- `neo4j` - Cypher queries, nodes
- `elasticsearch` - Search, aggregations
- `qdrant` - Vector similarity
- `pinecone` - Vector embeddings
- `supabase` - Postgres + realtime

**E-Commerce & Finance (5)**

- `shopify` - Products, orders, customers
- `stripe` - Payments, subscriptions, invoices
- `polymarket` - Prediction markets
- `kalshi` - Trading contracts
- `typeform` - Forms, responses

**Analytics & Monitoring (6)**

- `posthog` - Event tracking, analytics
- `datadog` - Monitoring, logs, metrics
- `sentry` - Error tracking
- `grafana` - Metrics, dashboards
- `calendly` - Meeting scheduling

**Research & Web (14)**

- `exa` - Semantic web search
- `tavily` - AI research assistant
- `perplexity` - AI-powered search
- `firecrawl` - Web scraping
- `browser_use` - Browser automation
- `stagehand` - Browser interaction
- `wikipedia` - Article retrieval
- `arxiv` - Research papers
- `reddit` - Posts, comments
- `youtube` - Videos, channels
- `duckduckgo` - Web search
- `serper` - Google search API
- `linkup` - Link search
- `jina` - Text extraction

**Development & Code (5)**

- `github` - Full GitHub API
- `gitlab` - Projects, CI/CD
- `cursor` - IDE integration
- `mcp` - Model Context Protocol
- `openai` - Direct OpenAI API

**AI/ML Services (10)**

- `huggingface` - Model inference
- `vision` - Image analysis
- `image_generator` - DALL-E, Flux
- `video_generator` - Video generation
- `translate` - Translation services
- `elevenlabs` - Text-to-speech
- `stt` - Speech recognition
- `tts` - Text-to-speech
- `thinking` - Reasoning blocks
- `guardrails` - Content moderation

**Data Processing (5)**

- `airtable` - Databases, records
- `clay` - Data enrichment
- `apify` - Web scraping actors
- `mistral_parse` - Document parsing
- `ahrefs` - SEO data

**Cloud Infrastructure (6)**

- `s3` - AWS S3 object storage
- `rds` - AWS RDS databases
- `sqs` - AWS SQS queues
- `ssh` - Server commands
- `sftp` - Secure file transfer
- `google` - Google Cloud services

**Memory & Knowledge (5)**

- `memory` - Workflow memory
- `mem0` - Long-term memory service
- `knowledge` - Knowledge base queries
- `zep` - Memory service
- `file` - File operations

**Other Services (14)**

- `rss` - RSS feed parsing
- `resend` - Email API
- `wordpress` - CMS operations
- `webflow` - Website builder
- `zendesk` - Support tickets
- `x` - Twitter/X interactions
- `spotify` - Music API
- `zoom` - Video conferencing
- `search` - Generic search
- `workflow_input` - Child workflow inputs

### Block Execution Handlers

Location: `/apps/sim/executor/handlers/`

The handler registry creates 13 specialized handlers:

```typescript
export function createBlockHandlers(): BlockHandler[] {
    return [
        new TriggerBlockHandler(), // Workflow initialization
        new FunctionBlockHandler(), // Code execution (JS/Python)
        new ApiBlockHandler(), // HTTP requests
        new ConditionBlockHandler(), // Boolean branching
        new RouterBlockHandler(), // LLM-powered routing
        new ResponseBlockHandler(), // API response formatting
        new HumanInTheLoopBlockHandler(), // Pause/resume
        new AgentBlockHandler(), // LLM with tools
        new VariablesBlockHandler(), // Variable management
        new WorkflowBlockHandler(), // Child workflow execution
        new WaitBlockHandler(), // Time delays
        new EvaluatorBlockHandler(), // Metric evaluation
        new GenericBlockHandler() // Fallback for integrations
    ];
}
```

#### Handler Interface

```typescript
interface BlockHandler {
    canHandle(block: SerializedBlock): boolean;
    execute(
        ctx: ExecutionContext,
        block: SerializedBlock,
        inputs: Record<string, any>
    ): Promise<BlockOutput | StreamingExecution>;
}
```

### Key Handler Details

#### AgentBlockHandler

- **Location**: `/executor/handlers/agent/`
- **Features**:
    - Multi-provider LLM support (OpenAI, Anthropic, Google, etc.)
    - Tool calling with block tools, custom tools, and MCP
    - Memory management (conversation, sliding window messages/tokens)
    - Structured output via JSON Schema
    - Streaming token output
    - Token counting and cost calculation

#### FunctionBlockHandler

- **Location**: `/executor/handlers/function/`
- **Features**:
    - JavaScript execution (local VM or E2B sandbox)
    - Python execution (E2B sandbox only)
    - Variable access via `<blockName.output>` and `{{ENV_VAR}}`
    - Automatic import detection for sandbox routing

#### ConditionBlockHandler

- **Location**: `/executor/handlers/condition/`
- **Features**:
    - JavaScript expression evaluation
    - Multiple conditions with else clause
    - Full access to block outputs in scope
    - Decision path tracking for analytics

#### RouterBlockHandler

- **Location**: `/executor/handlers/router/`
- **Features**:
    - LLM-powered intelligent routing
    - System prompt describes available paths
    - Temperature control for consistency
    - Returns selected block ID

### Variable Reference System

Location: `/apps/sim/executor/constants.ts`

```typescript
const REFERENCE = {
    START: "<",
    END: ">",
    PATH_DELIMITER: ".",
    ENV_VAR_START: "{{",
    ENV_VAR_END: "}}",
    PREFIX: {
        LOOP: "loop",
        PARALLEL: "parallel",
        VARIABLE: "variable"
    }
};
```

#### Reference Types

| Syntax                   | Description            | Example                     |
| ------------------------ | ---------------------- | --------------------------- |
| `<blockId.output>`       | Block output reference | `<agent1.content>`          |
| `<blockId.nested.path>`  | Nested property access | `<api1.data.users[0].name>` |
| `<loop.index>`           | Current loop index     | `<loop.index>`              |
| `<loop.item>`            | Current loop item      | `<loop.item>`               |
| `<loop.iteration>`       | Loop iteration count   | `<loop.iteration>`          |
| `<parallel.index>`       | Parallel branch index  | `<parallel.index>`          |
| `<parallel.currentItem>` | Current parallel item  | `<parallel.currentItem>`    |
| `<variable.name>`        | Workflow variable      | `<variable.userId>`         |
| `{{ENV_VAR}}`            | Environment variable   | `{{API_KEY}}`               |

### Control Flow Constants

```typescript
const EDGE = {
    CONDITION_PREFIX: "condition-",
    CONDITION_TRUE: "condition-true",
    CONDITION_FALSE: "condition-false",
    ROUTER_PREFIX: "router-",
    LOOP_CONTINUE: "loop_continue",
    LOOP_EXIT: "loop_exit",
    ERROR: "error",
    DEFAULT: "default"
};

const LOOP = {
    TYPE: {
        FOR: "for",
        FOR_EACH: "forEach",
        WHILE: "while",
        DO_WHILE: "doWhile"
    }
};

const PARALLEL = {
    TYPE: {
        COLLECTION: "collection", // Execute for each item
        COUNT: "count" // Execute N times
    },
    BRANCH: {
        PREFIX: "₍",
        SUFFIX: "₎"
    }
};
```

### Block Configuration Examples

#### Agent Block (with tools and memory)

```typescript
export const AgentBlock: BlockConfig = {
  type: 'agent',
  name: 'Agent',
  description: 'Build an agent',
  category: 'blocks',
  bgColor: 'var(--brand-primary-hex)',
  icon: AgentIcon,
  subBlocks: [
    { id: 'messages', type: 'messages-input' },
    { id: 'model', type: 'combobox', required: true, defaultValue: 'claude-sonnet-4-5' },
    { id: 'tools', type: 'tool-input', defaultValue: [] },
    { id: 'apiKey', type: 'short-input', password: true },
    { id: 'memoryType', type: 'dropdown', options: [...] },
    { id: 'conversationId', type: 'short-input', condition: { field: 'memoryType', value: [...] } },
    { id: 'temperature', type: 'slider', min: 0, max: 2 },
    { id: 'responseFormat', type: 'code', language: 'json', wandConfig: { enabled: true } },
  ],
  tools: {
    access: ['openai_chat', 'anthropic_chat', 'google_chat', ...],
    config: {
      tool: (params) => getAllModelProviders()[params.model],
      params: (params) => ({ ...params, tools: transformedTools }),
    },
  },
  inputs: {
    messages: { type: 'json' },
    model: { type: 'string' },
    tools: { type: 'json' },
    responseFormat: { type: 'json' },
  },
  outputs: {
    content: { type: 'string', description: 'Generated response' },
    model: { type: 'string' },
    tokens: { type: 'any' },
    toolCalls: { type: 'any' },
  },
}
```

#### Condition Block

```typescript
export const ConditionBlock: BlockConfig = {
    type: "condition",
    name: "Condition",
    description: "Add a condition",
    bgColor: "#FF752F",
    category: "blocks",
    subBlocks: [{ id: "conditions", type: "condition-input" }],
    tools: { access: [] },
    outputs: {
        content: { type: "string" },
        conditionResult: { type: "boolean" },
        selectedPath: { type: "json" },
        selectedConditionId: { type: "string" }
    }
};
```

#### Function Block (with AI code generation)

```typescript
export const FunctionBlock: BlockConfig = {
    type: "function",
    name: "Function",
    description: "Run custom logic",
    bgColor: "#FF402F",
    category: "blocks",
    subBlocks: [
        { id: "language", type: "dropdown", options: ["JavaScript", "Python"] },
        {
            id: "code",
            type: "code",
            wandConfig: {
                enabled: true,
                maintainHistory: true,
                prompt: "...detailed code generation prompt...",
                generationType: "javascript-function-body"
            }
        }
    ],
    tools: { access: ["function_execute"] },
    outputs: {
        result: { type: "json" },
        stdout: { type: "string" }
    }
};
```

### Conditional Display & Dependencies

#### Condition Syntax

```typescript
condition: {
  field: 'operation',           // Check this field
  value: 'send',                // If equals this value
  not?: true,                   // Negate the check
  and?: {                       // Additional AND condition
    field: 'authMethod',
    value: 'oauth',
  }
}

// Multiple values (OR)
condition: {
  field: 'operation',
  value: ['send', 'update', 'delete'],  // Match any
}
```

#### Field Dependencies

```typescript
// Simple: all fields must have values (AND logic)
dependsOn: ['credential', 'botToken']

// Complex: AND/OR logic
dependsOn: {
  all: ['authMethod'],           // ALL must be set
  any: ['credential', 'botToken'] // At least ONE must be set
}
```

### Wand Configuration (AI Assistance)

```typescript
wandConfig: {
  enabled: true,
  prompt: 'Custom generation prompt...',
  generationType: 'javascript-function-body',
  placeholder: 'Describe what you want...',
  maintainHistory: true,
}

// Available generationTypes:
'javascript-function-body'   // JS function body
'typescript-function-body'   // TS function body
'json-schema'                // JSON Schema definition
'json-object'                // Raw JSON object
'system-prompt'              // LLM system prompt
'custom-tool-schema'         // Custom tool schema
'sql-query'                  // SQL query
'postgrest'                  // PostgREST query
'mongodb-filter'             // MongoDB filter
'mongodb-pipeline'           // MongoDB aggregation
'neo4j-cypher'               // Neo4j Cypher query
```

### Metadata-Only Blocks

Some blocks don't execute directly but modify workflow structure:

```typescript
const METADATA_ONLY_BLOCK_TYPES = [
    BlockType.LOOP, // Handled by LoopOrchestrator
    BlockType.PARALLEL, // Handled by ParallelOrchestrator
    BlockType.NOTE // Canvas annotation only
];
```

### Execution Flow

```
1. Trigger Detection (API/Webhook/Schedule/Chat/Manual)
         │
2. Workflow Retrieval & DAG Construction
         │
3. ExecutionContext Creation
         │
4. Queue-based Block Execution
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Serial    Parallel
Blocks    Branches
    │         │
    └────┬────┘
         │
5. Variable Resolution
   (<blockId.output>, <loop.index>, {{ENV_VAR}})
         │
6. Handler Selection (canHandle → execute)
         │
7. Tool/LLM Invocation
         │
8. State Snapshots (for pause/resume)
         │
9. Logging & Cost Tracking
         │
10. Output Aggregation
```

---

## Database Schema (45+ tables)

### Core Entities

```
User ──┬── Workspace ──┬── Workflow ──┬── WorkflowBlocks
       │               │              ├── WorkflowEdges
       │               │              ├── WorkflowSchedule
       │               │              ├── Webhook
       │               │              ├── Chat
       │               │              └── WorkflowExecutionLogs
       │               │
       │               ├── KnowledgeBase ──┬── Document
       │               │                   └── Embedding
       │               │
       │               └── WorkspaceFile
       │
       ├── Organization ── Member
       ├── Session
       ├── Account (OAuth)
       ├── ApiKey
       ├── UserStats (billing)
       └── Subscription
```

---

## State Management

### Zustand Stores (23+)

- **WorkflowStore**: Workflow blocks, edges, selection state
- **ExecutionStore**: Running executions, console output
- **PanelStore**: UI panel widths, tabs
- **ProvidersStore**: LLM provider configurations
- **EnvironmentStore**: Environment variables
- **ConsoleStore**: Debug console state

### React Query

- **30s stale time** for server state caching
- **Query key factories** for cache invalidation
- **Optimistic updates** for better UX

---

## Deployment Options

| Method             | Description                 |
| ------------------ | --------------------------- |
| **Cloud**          | Hosted at sim.ai            |
| **Docker Compose** | `docker-compose.prod.yml`   |
| **Kubernetes**     | Helm charts in `/helm/sim/` |
| **NPX CLI**        | `npx simstudio`             |
| **Dev Container**  | VS Code Remote Containers   |

### Docker Services

- **simstudio**: Main Next.js app (port 3000)
- **realtime**: Socket.IO server (port 3002)
- **migrations**: Database migration runner
- **db**: PostgreSQL with pgvector

---

## Testing

- **Framework**: Vitest 3.0.8
- **88 test files** covering:
    - API routes
    - Executor handlers
    - Block logic
    - Utility functions
    - Socket server

---

## Security Features

- **Rate limiting**: Subscription-tier aware
- **Input validation**: Zod schemas throughout
- **Environment encryption**: Sensitive values encrypted at rest
- **CSP headers**: Content Security Policy in middleware
- **OAuth**: Multi-provider with account linking
- **API keys**: Personal and workspace-level authentication

---

## Notable Architectural Patterns

1. **Provider Abstraction**: All LLM calls go through unified `executeProviderRequest()` with cost tracking
2. **Variable Resolution**: Powerful templating with `<blockId.output>`, `<loop.index>`, `{{ENV_VAR}}`
3. **Idempotency**: Request deduplication via `idempotencyKey` table
4. **Feature Flags**: Granular control via environment variables
5. **Pause/Resume**: Full execution state serialization for human-in-the-loop
6. **Block Registration**: Plugin-like pattern with separate definition and execution
7. **Handler Chain**: Ordered handler list with `canHandle()` routing

---

## Code Quality

- **Strict TypeScript**: Full type coverage
- **Biome**: Formatting and linting
- **Husky + lint-staged**: Pre-commit hooks
- **TSDoc**: Documentation standard (per CLAUDE.md)
- **Logger**: Centralized logging (no console.log)

---

This is a mature, well-architected platform with enterprise-grade features, extensive integrations, and production-ready deployment options. The block system demonstrates excellent separation of concerns with declarative configuration and pluggable execution handlers.
