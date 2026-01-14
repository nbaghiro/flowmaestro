# FlowMaestro CLI

The FlowMaestro CLI (`fm`) provides command-line access to manage workflows, agents, executions, and other resources. It supports OAuth authentication via device flow, interactive agent chat, real-time execution monitoring, and multiple output formats.

## Table of Contents

- [Installation](#installation)
- [Authentication](#authentication)
    - [Device Flow (OAuth)](#device-flow-oauth)
    - [API Key](#api-key)
- [Configuration](#configuration)
- [Global Options](#global-options)
- [Commands](#commands)
    - [Authentication](#authentication-commands)
    - [Workspaces](#workspaces)
    - [Workflows](#workflows)
    - [Executions](#executions)
    - [Agents](#agents)
    - [Threads](#threads)
    - [Knowledge Bases](#knowledge-bases)
    - [Triggers](#triggers)
    - [Webhooks](#webhooks)
    - [API Keys](#api-keys)
- [Output Formats](#output-formats)
- [Examples](#examples)

---

## Installation

The CLI is part of the FlowMaestro monorepo. To install globally:

```bash
# From the repository root
cd cli
npm install
npm run build
npm link
```

This makes the `fm` command available globally.

### Verify Installation

```bash
fm --help
fm --version
```

---

## Authentication

The CLI supports two authentication methods: OAuth device flow (recommended for interactive use) and API key (recommended for CI/CD and scripts).

### Device Flow (OAuth)

The device flow allows you to authenticate via your browser without exposing credentials in the terminal.

```bash
fm login
```

This will:

1. Display a URL and a one-time code
2. Open your browser to the verification page
3. Poll for authorization while you approve in the browser
4. Store credentials securely upon approval

```
Opening browser for authentication...

If the browser doesn't open, visit:
https://app.flowmaestro.io/device

And enter code: ABCD-1234

Waiting for authorization...
```

### API Key

For non-interactive environments (CI/CD, scripts), use API key authentication:

```bash
# Interactive prompt for API key
fm login --api-key

# Or provide via environment variable
export FM_API_KEY=fm_live_xxxxxxxxxxxxx
fm workflows list

# Or use the global flag
fm workflows list --api-key fm_live_xxxxxxxxxxxxx
```

### Logout

Clear stored credentials:

```bash
fm logout

# Clear everything including config
fm logout --all
```

### Check Current User

```bash
fm whoami
```

Output:

```
User: john@example.com
Workspace: My Workspace (ws_abc123)
Auth Method: oauth
```

---

## Configuration

Configuration is stored in `~/.flowmaestro/`:

```
~/.flowmaestro/
├── config.json       # CLI settings
└── credentials.json  # Authentication tokens
```

### Config Commands

```bash
# View a config value
fm config get apiUrl

# Set a config value
fm config set apiUrl https://api.flowmaestro.io

# View all config
fm config get
```

### Available Settings

| Key                   | Description                       | Default                      |
| --------------------- | --------------------------------- | ---------------------------- |
| `apiUrl`              | API server URL                    | `https://api.flowmaestro.io` |
| `defaultWorkspace`    | Default workspace ID              | (none)                       |
| `defaultOutputFormat` | Output format (json, table, yaml) | `table`                      |

---

## Global Options

These options apply to all commands:

| Option              | Alias | Description                               |
| ------------------- | ----- | ----------------------------------------- |
| `--workspace <id>`  | `-w`  | Override the active workspace             |
| `--api-key <key>`   | `-k`  | Override API key for this request         |
| `--output <format>` | `-o`  | Output format: `json`, `table`, or `yaml` |
| `--quiet`           | `-q`  | Suppress non-essential output             |
| `--verbose`         | `-v`  | Enable verbose/debug output               |

Example:

```bash
fm workflows list -w ws_abc123 -o json
```

---

## Commands

### Authentication Commands

#### `fm login`

Authenticate with FlowMaestro.

```bash
# OAuth device flow (recommended)
fm login

# API key authentication
fm login --api-key
```

#### `fm logout`

Log out and clear stored credentials.

```bash
fm logout

# Also clear config
fm logout --all
```

#### `fm whoami`

Display current user and workspace information.

```bash
fm whoami
```

---

### Workspaces

Manage and switch between workspaces.

#### `fm workspace list`

List all workspaces you have access to.

```bash
fm workspace list
fm ws list  # alias
```

#### `fm workspace use <id>`

Switch to a different workspace.

```bash
fm workspace use ws_abc123
fm ws use ws_abc123  # alias
```

---

### Workflows

Manage and execute workflows.

#### `fm workflows list`

List all workflows in the current workspace.

```bash
fm workflows list
fm wf list  # alias

# With pagination
fm workflows list --limit 50 --offset 0
```

#### `fm workflows get <id>`

Get detailed information about a workflow.

```bash
fm workflows get wf_abc123
```

#### `fm workflows run <id>`

Execute a workflow. Supports interactive input prompts or JSON input.

```bash
# Interactive mode - prompts for each input
fm workflows run wf_abc123

# With JSON inputs
fm workflows run wf_abc123 -i '{"topic": "AI news", "count": 10}'

# Wait for completion (blocking)
fm workflows run wf_abc123 --wait
```

---

### Executions

Monitor and manage workflow executions.

#### `fm executions list`

List workflow executions.

```bash
fm executions list
fm exec list  # alias

# Filter by workflow
fm executions list --workflow wf_abc123

# Filter by status
fm executions list --status running
```

#### `fm executions get <id>`

Get execution details including outputs.

```bash
fm executions get exec_abc123
```

#### `fm executions watch <id>`

Stream execution events in real-time via SSE.

```bash
fm executions watch exec_abc123
```

Output:

```
Watching execution exec_abc123...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ trigger           completed  0.1s
▸ http_fetch        completed  1.2s
▸ transform_data    running    ...
○ llm_summarize     pending
○ output            pending

Press Ctrl+C to stop watching
```

#### `fm executions cancel <id>`

Cancel a running execution.

```bash
fm executions cancel exec_abc123

# Skip confirmation
fm executions cancel exec_abc123 --force
```

---

### Agents

Interact with AI agents.

#### `fm agents list`

List all agents in the workspace.

```bash
fm agents list
```

#### `fm agents get <id>`

Get agent details.

```bash
fm agents get agent_abc123
```

#### `fm agents chat <id>`

Start an interactive chat session with an agent.

```bash
fm agents chat agent_abc123
```

Chat commands:

- Type a message and press Enter to send
- `/new` - Start a new conversation thread
- `/thread` - Show current thread ID
- `/clear` - Clear the screen
- `/exit` or `Ctrl+C` - Exit chat

Example session:

```
Starting chat with "Customer Support Agent"
Type '/exit' to end, '/new' for new thread, '/clear' to clear screen
─────────────────────────────────────────

You: What are your hours of operation?

Agent: Our customer support is available 24/7. You can reach us
       anytime via chat, email, or phone.

You: /new
Started new thread: thread_xyz789

You: _
```

---

### Threads

Manage agent conversation threads.

#### `fm threads get <id>`

Get thread details and message history.

```bash
fm threads get thread_abc123
```

#### `fm threads delete <id>`

Delete a conversation thread.

```bash
fm threads delete thread_abc123

# Skip confirmation
fm threads delete thread_abc123 --force
```

---

### Knowledge Bases

Query and manage knowledge bases.

#### `fm kb list`

List all knowledge bases.

```bash
fm kb list
fm knowledge-bases list  # full name
```

#### `fm kb get <id>`

Get knowledge base details.

```bash
fm kb get kb_abc123
```

#### `fm kb query <id> "<query>"`

Perform semantic search on a knowledge base.

```bash
fm kb query kb_abc123 "How do I reset my password?"

# Limit results
fm kb query kb_abc123 "API authentication" --limit 5
```

---

### Triggers

Manage workflow triggers.

#### `fm triggers list`

List all triggers.

```bash
fm triggers list
```

#### `fm triggers run <id>`

Manually execute a trigger.

```bash
fm triggers run trigger_abc123
```

---

### Webhooks

Manage outgoing webhooks.

#### `fm webhooks list`

List all webhooks.

```bash
fm webhooks list
```

#### `fm webhooks get <id>`

Get webhook details.

```bash
fm webhooks get webhook_abc123
```

#### `fm webhooks create`

Create a new webhook (interactive).

```bash
fm webhooks create
```

#### `fm webhooks delete <id>`

Delete a webhook.

```bash
fm webhooks delete webhook_abc123

# Skip confirmation
fm webhooks delete webhook_abc123 --force
```

#### `fm webhooks test <id>`

Send a test payload to a webhook.

```bash
fm webhooks test webhook_abc123
```

---

### API Keys

Manage API keys for programmatic access.

#### `fm api-keys list`

List all API keys (values are masked).

```bash
fm api-keys list
fm keys list  # alias
```

#### `fm api-keys create`

Create a new API key.

```bash
fm api-keys create

# With a name
fm api-keys create --name "CI/CD Pipeline"
```

**Important**: The full API key is only shown once at creation. Store it securely.

#### `fm api-keys revoke <id>`

Revoke an API key.

```bash
fm api-keys revoke key_abc123

# Skip confirmation
fm api-keys revoke key_abc123 --force
```

---

## Output Formats

The CLI supports three output formats:

### Table (default)

Human-readable formatted tables:

```bash
fm workflows list -o table
```

```
┌─────────────┬─────────────────────┬──────────┬─────────────────────┐
│ ID          │ Name                │ Status   │ Created             │
├─────────────┼─────────────────────┼──────────┼─────────────────────┤
│ wf_abc123   │ Email Newsletter    │ active   │ 2024-01-15 10:30 AM │
│ wf_def456   │ Data Pipeline       │ active   │ 2024-01-14 09:15 AM │
└─────────────┴─────────────────────┴──────────┴─────────────────────┘
```

### JSON

Machine-readable JSON output:

```bash
fm workflows list -o json
```

```json
[
    {
        "id": "wf_abc123",
        "name": "Email Newsletter",
        "status": "active",
        "created_at": "2024-01-15T10:30:00.000Z"
    }
]
```

### YAML

YAML format for configuration files:

```bash
fm workflows list -o yaml
```

```yaml
- id: wf_abc123
  name: Email Newsletter
  status: active
  created_at: "2024-01-15T10:30:00.000Z"
```

---

## Examples

### Run a Workflow and Monitor

```bash
# Start the workflow
fm workflows run wf_newsletter -i '{"topic": "AI"}'
# Output: Execution started: exec_abc123

# Watch the execution
fm executions watch exec_abc123
```

### Script: Batch Execute Workflows

```bash
#!/bin/bash
export FM_API_KEY=fm_live_xxxxx

WORKFLOW_ID="wf_abc123"
INPUTS='{"process": true}'

# Start execution
RESULT=$(fm workflows run $WORKFLOW_ID -i "$INPUTS" -o json)
EXEC_ID=$(echo $RESULT | jq -r '.id')

echo "Started execution: $EXEC_ID"

# Poll for completion
while true; do
  STATUS=$(fm executions get $EXEC_ID -o json | jq -r '.status')
  if [[ "$STATUS" == "completed" || "$STATUS" == "failed" ]]; then
    break
  fi
  sleep 5
done

echo "Execution $STATUS"
```

### Interactive Agent Session

```bash
# Start chatting with an agent
fm agents chat agent_support

# The session maintains context across messages
# Use /new to start fresh, /exit to quit
```

### Export Data to File

```bash
# Export workflows to JSON file
fm workflows list -o json > workflows.json

# Export executions to YAML
fm executions list --workflow wf_abc123 -o yaml > executions.yaml
```

---

## Troubleshooting

### Authentication Issues

```bash
# Check current auth status
fm whoami

# Re-authenticate
fm logout
fm login
```

### Connection Errors

```bash
# Verify API URL
fm config get apiUrl

# Test with verbose output
fm workflows list --verbose
```

### Clear All Data

```bash
# Remove all CLI data
rm -rf ~/.flowmaestro
```

---

## See Also

- [Public API Documentation](./.docs/public-api.md)
- [JavaScript SDK](/sdks/javascript)
- [Python SDK](/sdks/python)
