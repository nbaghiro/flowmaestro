---
sidebar_position: 3
title: Node Types
---

# Node Types

Nodes are the building blocks of FlowMaestro workflows. Each node performs a specific function, from AI generation to data transformation to external integrations.

## Node Categories

FlowMaestro provides **47+ built-in node types** organized into five categories:

### AI & LLM Nodes

Bring AI capabilities to your workflows:

| Node                                                                   | Description                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------ |
| [**LLM**](./nodes/ai-nodes#llm-node)                                   | Generate text with GPT, Claude, Gemini, and more |
| [**Vision**](./nodes/ai-nodes#vision-node)                             | Analyze images with AI                           |
| [**Audio Input**](./nodes/ai-nodes#audio-input-node-speech-to-text)    | Transcribe speech to text                        |
| [**Audio Output**](./nodes/ai-nodes#audio-output-node-text-to-speech)  | Generate speech from text                        |
| [**Embeddings**](./nodes/ai-nodes#embeddings-node)                     | Create vector embeddings                         |
| [**Router**](./nodes/ai-nodes#router-node)                             | AI-powered classification and routing            |
| [**Knowledge Base Query**](./nodes/ai-nodes#knowledge-base-query-node) | Semantic search over documents                   |
| [**OCR**](./nodes/ai-nodes#ocr-extraction-node)                        | Extract text from images                         |
| [**Image Generation**](./nodes/ai-nodes#image-generation-node)         | Generate images with DALL-E, Stable Diffusion    |
| [**Video Generation**](./nodes/ai-nodes#video-generation-node)         | Generate videos with Runway, Luma                |

[View all AI nodes](./nodes/ai-nodes)

### Logic & Control Nodes

Control workflow execution flow:

| Node                                                        | Description                              |
| ----------------------------------------------------------- | ---------------------------------------- |
| [**Conditional**](./nodes/logic-nodes#conditional-node)     | Branch based on conditions               |
| [**Switch**](./nodes/logic-nodes#switch-node)               | Multi-way routing                        |
| [**Loop**](./nodes/logic-nodes#loop-node)                   | Iterate over arrays or repeat operations |
| [**Wait**](./nodes/logic-nodes#wait-node)                   | Pause execution                          |
| [**Human Review**](./nodes/logic-nodes#human-review-node)   | Pause for human input/approval           |
| [**Transform**](./nodes/logic-nodes#transform-node)         | Map, filter, reduce, and transform data  |
| [**Shared Memory**](./nodes/logic-nodes#shared-memory-node) | Store and retrieve workflow data         |
| [**Code**](./nodes/logic-nodes#code-node)                   | Execute custom JavaScript or Python      |

[View all logic nodes](./nodes/logic-nodes)

### Data Nodes

Handle input, output, and data operations:

| Node                                                           | Description                      |
| -------------------------------------------------------------- | -------------------------------- |
| [**Files**](./nodes/data-nodes#files-node)                     | Accept file uploads              |
| [**URL**](./nodes/data-nodes#url-node)                         | Fetch and process web content    |
| [**Output**](./nodes/data-nodes#output-node)                   | Collect workflow outputs         |
| [**Template Output**](./nodes/data-nodes#template-output-node) | Render templates with variables  |
| [**HTTP**](./nodes/data-nodes#http-node)                       | Make API requests                |
| [**Database**](./nodes/data-nodes#database-node)               | Query PostgreSQL, MySQL, MongoDB |
| [**Web Search**](./nodes/data-nodes#web-search-node)           | Search the web                   |

[View all data nodes](./nodes/data-nodes)

### Integration Nodes

Connect to external services:

| Category                                                                  | Examples                               |
| ------------------------------------------------------------------------- | -------------------------------------- |
| [**Communication**](./nodes/integration-nodes#communication-20-providers) | Slack, Discord, Email, WhatsApp, Teams |
| [**E-commerce**](./nodes/integration-nodes#e-commerce-11-providers)       | Shopify, Stripe, WooCommerce           |
| [**CRM**](./nodes/integration-nodes#crm--sales-8-providers)               | HubSpot, Salesforce, Pipedrive         |
| [**Productivity**](./nodes/integration-nodes#productivity-16-providers)   | Google Sheets, Notion, Airtable        |
| [**Social Media**](./nodes/integration-nodes#social-media-11-providers)   | Instagram, LinkedIn, X (Twitter)       |
| [**Development**](./nodes/integration-nodes#development-27-providers)     | GitHub, Jira, Linear                   |

[View all integrations](./nodes/integration-nodes)

### Built-in Tools

Generate documents and visualizations:

| Node                                                                       | Description                          |
| -------------------------------------------------------------------------- | ------------------------------------ |
| [**Chart Generation**](./nodes/builtin-tools#chart-generation)             | Create charts (bar, line, pie, etc.) |
| [**Spreadsheet Generation**](./nodes/builtin-tools#spreadsheet-generation) | Create Excel/CSV files               |
| [**PDF Generation**](./nodes/builtin-tools#pdf-generation)                 | Create PDF documents                 |
| [**Screenshot Capture**](./nodes/builtin-tools#screenshot-capture)         | Capture web page screenshots         |
| [**File Operations**](./nodes/builtin-tools#file-operations)               | Read, write, manage files            |

[View all built-in tools](./nodes/builtin-tools)

## Node Anatomy

Every node has:

- **Inputs** — Data flowing into the node
- **Configuration** — Node-specific settings
- **Outputs** — Data produced by the node
- **Output Variable** — Name to reference results downstream

## Using Nodes

### Adding Nodes

1. Click the **+** button or drag from the node palette
2. Select the node type
3. Connect to other nodes by dragging between ports

### Configuring Nodes

1. Click a node to select it
2. Use the side panel to configure settings
3. Reference variables with `{{variable}}` syntax

### Connecting Nodes

- Drag from an output port to an input port
- Multiple outputs can fan out to different nodes
- Multiple inputs can merge into one node

## Variable Access

Reference data from any previous node:

```
{{node_name.output}}           // Full output
{{node_name.output.field}}     // Specific field
{{node_name.output[0]}}        // Array index
{{trigger.body}}               // Trigger data
{{env.API_KEY}}                // Environment variable
```

## Node Output Variable

Each node stores its result in an output variable:

```typescript
{
    outputVariable: "result_name";
}
```

Reference downstream: `{{result_name}}`

## Next Steps

- [AI & LLM Nodes](./nodes/ai-nodes) — Work with language models
- [Logic Nodes](./nodes/logic-nodes) — Control flow and transformations
- [Data Nodes](./nodes/data-nodes) — Handle input and output
- [Integration Nodes](./nodes/integration-nodes) — Connect to services
- [Built-in Tools](./nodes/builtin-tools) — Generate documents and charts
