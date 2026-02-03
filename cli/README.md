# FlowMaestro CLI

```
  ███████╗██╗      ██████╗ ██╗    ██╗███╗   ███╗ █████╗ ███████╗███████╗████████╗██████╗  ██████╗
  ██╔════╝██║     ██╔═══██╗██║    ██║████╗ ████║██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗
  █████╗  ██║     ██║   ██║██║ █╗ ██║██╔████╔██║███████║█████╗  ███████╗   ██║   ██████╔╝██║   ██║
  ██╔══╝  ██║     ██║   ██║██║███╗██║██║╚██╔╝██║██╔══██║██╔══╝  ╚════██║   ██║   ██╔══██╗██║   ██║
  ██║     ███████╗╚██████╔╝╚███╔███╔╝██║ ╚═╝ ██║██║  ██║███████╗███████║   ██║   ██║  ██║╚██████╔╝
  ╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝
```

Command-line interface for managing workflows, agents, and automations.

## Installation

```bash
# From the monorepo root
npm install

# Build the CLI
cd cli && npm run build

# Link globally (optional)
npm link
```

## Authentication

```bash
# OAuth device flow (recommended)
fm login

# API key authentication
fm login --api-key
```

Credentials are stored in `~/.flowmaestro/` with secure file permissions.

## Commands

| Command         | Alias  | Description                        |
| --------------- | ------ | ---------------------------------- |
| `fm login`      |        | Authenticate with FlowMaestro      |
| `fm logout`     |        | Clear stored credentials           |
| `fm whoami`     |        | Display current user and workspace |
| `fm config`     |        | Manage CLI configuration           |
| `fm workspace`  | `ws`   | Switch between workspaces          |
| `fm workflows`  | `wf`   | List, view, and run workflows      |
| `fm executions` | `exec` | Monitor and manage executions      |
| `fm agents`     |        | Interact with AI agents            |
| `fm threads`    |        | Manage conversation threads        |
| `fm kb`         |        | Query knowledge bases              |
| `fm triggers`   |        | Manage workflow triggers           |
| `fm webhooks`   |        | Create and manage webhooks         |
| `fm api-keys`   | `keys` | Manage API keys                    |

## Usage Examples

### Workflows

```bash
# List all workflows
fm workflows list

# Run a workflow
fm workflows run <workflow-id>

# Run with input variables
fm workflows run <id> --input '{"key": "value"}'
```

### Executions

```bash
# List recent executions
fm executions list

# Watch execution in real-time
fm executions watch <execution-id>

# Cancel a running execution
fm executions cancel <execution-id>
```

### Agents

```bash
# List available agents
fm agents list

# Start interactive chat
fm agents chat <agent-id>
```

### Knowledge Bases

```bash
# Search a knowledge base
fm kb query <kb-id> "search query"
```

## Global Options

| Option                  | Description                            |
| ----------------------- | -------------------------------------- |
| `-w, --workspace <id>`  | Override workspace ID                  |
| `-k, --api-key <key>`   | Override API key                       |
| `-o, --output <format>` | Output format: `table`, `json`, `yaml` |
| `-q, --quiet`           | Suppress non-essential output          |
| `-v, --verbose`         | Show debug information                 |

## Output Formats

```bash
# Table format (default)
fm workflows list

# JSON output
fm workflows list -o json

# YAML output
fm workflows list -o yaml
```

## Environment Variables

| Variable       | Description                |
| -------------- | -------------------------- |
| `FM_API_URL`   | Override API endpoint      |
| `FM_WORKSPACE` | Default workspace ID       |
| `FM_API_KEY`   | API key for authentication |

## Configuration

```bash
# View all settings
fm config get

# Set default output format
fm config set defaultOutputFormat json

# Show config file location
fm config path
```

Configuration is stored in `~/.flowmaestro/config.json`.

## Development

```bash
# Watch mode
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests
npm test
```

## Requirements

- Node.js 22+
- npm 9+
