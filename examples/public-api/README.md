# FlowMaestro Public API Examples

Complete examples demonstrating the FlowMaestro Public API in JavaScript/TypeScript, Python, and curl.

## Overview

These examples cover the most common integration patterns:

| #   | Example             | Description                              |
| --- | ------------------- | ---------------------------------------- |
| 01  | Basic Workflow      | Execute a workflow and wait for results  |
| 02  | Streaming Execution | Real-time progress tracking with SSE     |
| 03  | Batch Processing    | Process multiple items concurrently      |
| 04  | Agent Chatbot       | Interactive AI agent conversations       |
| 05  | Semantic Search     | RAG-powered knowledge base queries       |
| 06  | Webhook Receiver    | Receive and verify webhook notifications |
| 07  | CLI Tool            | Command-line workflow runner             |

## Quick Start

### JavaScript/TypeScript

```bash
cd javascript
npm install
cp .env.example .env
# Edit .env with your API key

npm run 01:basic        # Basic workflow
npm run 02:streaming    # Streaming execution
npm run 07:cli          # CLI tool
```

### Python

```bash
cd python
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API key

python 01_basic_workflow.py     # Basic workflow
python 02_streaming_execution.py # Streaming execution
python 07_cli_tool.py list       # CLI tool
```

### curl

```bash
cd curl
cp .env.example .env
# Edit .env with your API key
source .env

./examples.sh
```

## Prerequisites

### Getting Your API Key

1. Log in to FlowMaestro
2. Navigate to **Settings > API & Webhooks**
3. Click **Create API Key**
4. Select the scopes you need:
    - **Workflow Automation**: `workflows:read`, `workflows:execute`, `executions:read`
    - **Agent Integration**: `agents:read`, `agents:execute`, `threads:read`, `threads:write`
    - **RAG/Search**: `knowledge-bases:read`, `knowledge-bases:query`
5. Copy and securely store the key (shown only once)

### Getting Resource IDs

Find your workflow, agent, and knowledge base IDs in the FlowMaestro dashboard:

- **Workflow ID**: Workflow Builder > Select workflow > Copy ID from URL or settings
- **Agent ID**: Agents > Select agent > Copy ID from URL or settings
- **Knowledge Base ID**: Knowledge Bases > Select KB > Copy ID from URL or settings

## Environment Configuration

Each language folder contains a `.env.example` file. Copy it to `.env` and fill in your values:

```bash
# Required
FLOWMAESTRO_API_KEY=fm_live_your_api_key_here

# Optional (defaults to production)
FLOWMAESTRO_BASE_URL=https://api.flowmaestro.io

# Example-specific resource IDs
WORKFLOW_ID=wf_your_workflow_id
AGENT_ID=agent_your_agent_id
KNOWLEDGE_BASE_ID=kb_your_knowledge_base_id
```

## Example Details

### 01 - Basic Workflow Execution

The simplest integration pattern. Shows how to:

- Fetch workflow details and understand required inputs
- Execute a workflow with custom inputs
- Poll for completion
- Retrieve and display results

**Use case**: Backend automation, scheduled jobs, API integrations

### 02 - Streaming Execution

Real-time progress tracking using Server-Sent Events. Shows how to:

- Execute a workflow
- Connect to the SSE stream
- Display progress as nodes complete
- Handle terminal events

**Use case**: Live progress UIs, long-running workflows

### 03 - Batch Processing

Process multiple items through a workflow. Shows how to:

- Execute workflows concurrently with rate limiting
- Handle rate limit errors with exponential backoff
- Track progress across all items
- Collect results and errors

**Use case**: Data processing, bulk operations, ETL pipelines

### 04 - Agent Chatbot

Build conversational interfaces. Shows how to:

- Create conversation threads
- Send messages and receive responses
- Maintain conversation history
- Handle special commands

**Use case**: Customer support, chatbots, conversational UIs

### 05 - Semantic Search

Use knowledge bases for RAG. Shows how to:

- List and select knowledge bases
- Perform semantic queries
- Display ranked results with similarity scores
- Format results for end users

**Use case**: Documentation search, RAG pipelines, Q&A systems

### 06 - Webhook Receiver

Set up a server to receive webhook notifications. Shows how to:

- Create an HTTP server (Express/Flask)
- Verify webhook signatures
- Route events to handlers
- Process different event types

**Use case**: Event-driven architectures, notifications, integrations

### 07 - CLI Tool

A complete command-line interface. Shows how to:

- Parse command-line arguments
- Implement multiple subcommands
- Collect user input interactively
- Display formatted output

**Use case**: DevOps automation, developer tools, scripts

## Documentation

- [Public API Reference](/.docs/public-api.md) - Complete API documentation
- [JavaScript SDK](/sdks/javascript) - SDK source and README
- [Python SDK](/sdks/python) - SDK source and README
