# FlowMaestro Examples

Testing and demonstration examples for FlowMaestro features.

## Categories

| Folder                         | Description                                 | Status |
| ------------------------------ | ------------------------------------------- | ------ |
| [`widget/`](./widget/)         | Embeddable chat widget integration examples | Ready  |
| [`public-api/`](./public-api/) | Public API v1 examples (JS, Python, curl)   | Ready  |

## Prerequisites

- **Node.js 18+** - Required for JavaScript/TypeScript examples
- **Python 3.9+** - Required for Python examples
- **FlowMaestro Account** - Sign up at [flowmaestro.ai](https://flowmaestro.ai)
- **API Key** - Create one in Settings > API & Webhooks

## Quick Start

### Public API Examples

Complete examples demonstrating workflow execution, streaming, batch processing, AI agents, semantic search, webhooks, and CLI tools.

```bash
cd examples/public-api

# JavaScript/TypeScript
cd javascript
npm install
cp .env.example .env  # Edit with your API key
npm run 01:basic      # Basic workflow execution
npm run 02:streaming  # Real-time streaming
npm run 07:cli        # CLI tool

# Python
cd python
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your API key
python 01_basic_workflow.py     # Basic workflow
python 02_streaming_execution.py # Streaming
python 07_cli_tool.py list       # CLI tool

# curl
cd curl
cp .env.example .env && source .env
./examples.sh
```

**Available Examples:**

| #   | Example          | Description                             |
| --- | ---------------- | --------------------------------------- |
| 01  | Basic Workflow   | Execute and wait for results            |
| 02  | Streaming        | Real-time progress with SSE             |
| 03  | Batch Processing | Concurrent execution with rate limiting |
| 04  | Agent Chatbot    | Interactive AI conversations            |
| 05  | Semantic Search  | RAG-powered knowledge base queries      |
| 06  | Webhook Receiver | Receive and verify webhooks             |
| 07  | CLI Tool         | Command-line workflow runner            |

### Widget Examples

Test the embeddable chat widget in HTML or React applications:

```bash
cd examples/widget

# Script tag - simplest integration
cd script-tag && npx serve .

# NPM vanilla - ES module usage
cd npm-vanilla && npm install && npm run dev

# React App - full SPA integration
cd react-app && npm install && npm run dev
```

## Environment Configuration

Each example category uses `.env.example` files:

```bash
cp .env.example .env
# Edit .env with your actual values
```

**Required Variables:**

```bash
# API Key (get from Settings > API & Webhooks)
FLOWMAESTRO_API_KEY=fm_live_your_key_here

# Resource IDs (find in the FlowMaestro dashboard)
WORKFLOW_ID=wf_your_workflow_id
AGENT_ID=agent_your_agent_id
KNOWLEDGE_BASE_ID=kb_your_knowledge_base_id
```

## Getting Your API Key

1. Log in to FlowMaestro
2. Navigate to **Settings > API & Webhooks**
3. Click **Create API Key**
4. Select the scopes you need:
    - `workflows:read`, `workflows:execute` - For workflow examples
    - `agents:read`, `agents:execute`, `threads:*` - For agent examples
    - `knowledge-bases:read`, `knowledge-bases:query` - For search examples
5. Copy and securely store the key (shown only once)

## Getting Your Widget Slug

1. Log in to FlowMaestro
2. Navigate to **Chat Interfaces**
3. Create or select a chat interface
4. Click **Publish**
5. Copy the slug from the embed code

## Contributing

When adding new examples:

1. Follow the existing folder structure
2. Include a README.md explaining the example
3. Use `.env.example` for configuration
4. Add clear comments in the code
5. Update this README with the new example

## Related Documentation

- [Public API Reference](/.docs/public-api.md) - Complete API documentation
- [JavaScript SDK](/sdks/javascript) - Official TypeScript/JavaScript SDK
- [Python SDK](/sdks/python) - Official Python SDK
