# Code Execution System

This document provides a comprehensive overview of FlowMaestro's code execution system, including architecture, security model, and usage from workflows, agents, and personas.

## Overview

FlowMaestro provides secure code execution capabilities through Docker-based sandboxing. Code can be executed in three languages:

- **Python 3.11** - Full Python environment with data science packages
- **JavaScript (Node.js 20)** - Server-side JavaScript with common utilities
- **Shell (Bash)** - System commands and scripting

Code execution is available through two interfaces:

1. **Workflow Code Nodes** - For visual workflow automation
2. **`code_execute` Builtin Tool** - For agents and personas

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Entry Points                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────┐              ┌─────────────────────┐              │
│   │   Workflow Engine   │              │   Agent / Persona   │              │
│   │   (Code Node)       │              │   (code_execute)    │              │
│   └──────────┬──────────┘              └──────────┬──────────┘              │
│              │                                    │                         │
│              ▼                                    ▼                         │
│   ┌─────────────────────┐              ┌─────────────────────┐              │
│   │  CodeNodeHandler    │              │   codeExecuteTool   │              │
│   │  (code.ts)          │              │   (code-execute/)   │              │
│   └──────────┬──────────┘              └──────────┬──────────┘              │
│              │                                    │                         │
│              │         ┌──────────────────────────┘                         │
│              │         │                                                    │
│              ▼         ▼                                                    │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │                    Security Analysis Layer                      │       │
│   │                    (security.ts - tool only)                    │       │
│   │  • Blocked pattern detection (os.system, subprocess, rm -rf)    │       │
│   │  • Warning pattern detection (network requests)                 │       │
│   │  • Package name validation                                      │       │
│   └──────────────────────────────┬──────────────────────────────────┘       │
│                                  │                                          │
│                                  ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │                    Temporal Activity                            │       │
│   │                    (code-execution.ts)                          │       │
│   │  • Heartbeat reporting for long-running executions              │       │
│   │  • Cancellation handling                                        │       │
│   │  • Session management (create/reuse/cleanup)                    │       │
│   │  • Input file reading from workspace                            │       │
│   │  • Output file saving to workspace                              │       │
│   └──────────────────────────────┬──────────────────────────────────┘       │
│                                  │                                          │
│                                  ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │                    Code Sandbox Module                          │       │
│   │                    (services/code-sandbox/)                     │       │
│   │                                                                 │       │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │       │
│   │  │  docker.ts  │  │ sessions.ts │  │ languages/  │              │       │
│   │  │             │  │             │  │             │              │       │
│   │  │ • Container │  │ • TTL-based │  │ • python.ts │              │       │
│   │  │   lifecycle │  │   session   │  │ • js.ts     │              │       │
│   │  │ • Resource  │  │   store     │  │ • shell.ts  │              │       │
│   │  │   limits    │  │ • Multi-call│  │             │              │       │
│   │  │ • Execution │  │   state     │  │ Code wrap   │              │       │
│   │  │   slots     │  │ • Cleanup   │  │ & parsing   │              │       │
│   │  └─────────────┘  └─────────────┘  └─────────────┘              │       │
│   └──────────────────────────────┬──────────────────────────────────┘       │
│                                  │                                          │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Docker Container                                    │
│                         (flowmaestro/code-sandbox:latest)                   │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │  Security Constraints                                                 │ │
│   │  • Read-only root filesystem                                          │ │
│   │  • No network access (default)                                        │ │
│   │  • Non-root user (sandbox:sandbox)                                    │ │
│   │  • All capabilities dropped                                           │ │
│   │  • No privilege escalation                                            │ │
│   │  • Memory/CPU/PID limits enforced                                     │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│   ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────────┐│
│   │  Python 3.11        │  │  Node.js 20         │  │  Bash Shell          ││
│   │  + pandas, numpy    │  │  + lodash, dayjs    │  │  + coreutils         ││
│   │  + requests, httpx  │  │  + xlsx, cheerio    │  │  + standard utils    ││
│   │  + beautifulsoup    │  │  + mathjs, zod      │  │                      ││
│   │  + pillow, scipy    │  │  + yaml, csv-parse  │  │                      ││
│   └─────────────────────┘  └─────────────────────┘  └──────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## Entry Points

### 1. Workflow Code Nodes

Code nodes in visual workflows execute code as part of automated pipelines.

**Location:** `backend/src/temporal/activities/execution/handlers/logic/code.ts`

**Configuration Schema:**

```typescript
interface CodeNodeConfig {
    language: "javascript" | "python" | "shell";
    code: string;
    timeout?: number; // Default: 30000ms
    memory?: number; // MB, Default: 128
    inputVariables?: string[]; // Variables to inject from context
    outputVariable?: string; // Variable to store result
    allowNetworkAccess?: boolean; // Default: false
}
```

**Usage in Workflow:**

```json
{
    "type": "code",
    "config": {
        "language": "python",
        "code": "result = sum(numbers) / len(numbers)",
        "inputVariables": ["numbers"],
        "outputVariable": "average"
    }
}
```

**Behavior:**

- Creates a new container for each execution
- Injects specified input variables (or entire context)
- Captures `result` variable as output
- Destroys container after execution
- No session support (stateless)

### 2. Agent/Persona `code_execute` Tool

The builtin tool provides code execution for AI agents and personas.

**Location:** `backend/src/services/tools/builtin/code-execute/`

**Input Schema:**

```typescript
interface CodeExecuteInput {
    code: string; // Required: Code to execute
    language: "python" | "javascript" | "shell"; // Required
    timeout?: number; // 1000-300000ms, default 30000
    inputData?: Record<string, unknown>; // Variables to inject
    inputFiles?: Array<{
        path: string; // Workspace file path
        variableName: string; // Variable name for content
    }>;
    outputFiles?: Array<{
        sandboxPath: string; // Path in container
        workspacePath: string; // Destination in workspace
    }>;
    packages?: string[]; // Additional packages to install
    sessionId?: string; // For stateful execution
}
```

**Output:**

```typescript
interface CodeExecuteOutput {
    result: unknown; // Return value (from `result` variable)
    stdout: string; // Console output
    stderr: string; // Error output
    metadata: {
        executionTimeMs: number;
        language: string;
        exitCode?: number;
        sandboxId?: string;
        sessionId?: string;
    };
    savedFiles?: Array<{
        workspacePath: string;
        size: number;
    }>;
    warnings?: string[];
}
```

**Features:**

- Pre-execution security analysis (blocks dangerous patterns)
- Session support for multi-call stateful execution
- File I/O with workspace
- Dynamic package installation
- Credit cost: 5 credits per execution

## Security Model

### Layer 1: Pre-Execution Analysis (Tool Only)

Before code reaches the container, the `code_execute` tool performs static analysis.

**Blocked Patterns (execution denied):**

| Language   | Pattern                         | Reason                              |
| ---------- | ------------------------------- | ----------------------------------- |
| Python     | `os.system()`                   | Arbitrary shell command execution   |
| Python     | `subprocess.*()`                | Arbitrary command execution         |
| Python     | `exec(input())`                 | Code injection from user input      |
| Python     | `__import__('os')`              | Dynamic import of dangerous modules |
| Python     | `shutil.rmtree('/')`            | Root filesystem deletion            |
| JavaScript | `process.exit()`                | Premature process termination       |
| JavaScript | `require('child_process')`      | Arbitrary command execution         |
| JavaScript | `require('fs')`                 | Direct filesystem access            |
| JavaScript | `require('net')`                | Raw socket connections              |
| Shell      | `rm -rf /`                      | Root filesystem deletion            |
| Shell      | `mkfs.*`                        | Filesystem formatting               |
| Shell      | `dd ... of=/dev/sd*`            | Raw disk device writes              |
| Shell      | Fork bomb patterns              | Resource exhaustion                 |
| All        | Data exfiltration via curl/wget | System file exfiltration            |

**Warning Patterns (logged but allowed):**

- HTTP requests (`requests.get`, `fetch`, `curl`)
- File writes (`open(..., 'w')`)
- Network utilities (`nc`)

### Layer 2: Container Isolation

Docker provides the actual security boundary.

**Container Creation (`docker create` flags):**

```bash
docker create \
    --name fm-sandbox-{id} \
    --memory {limit}              # Memory hard limit
    --memory-swap {limit}         # No swap (same as memory)
    --cpus {cores}                # CPU limit
    --pids-limit {max}            # Process limit
    --read-only                   # Read-only root filesystem
    --tmpfs /tmp:rw,noexec,nosuid,size=64m  # Writable temp only
    --security-opt no-new-privileges:true   # No privilege escalation
    --cap-drop ALL                # Drop all Linux capabilities
    --network none                # No network access (default)
    --workdir /sandbox            # Isolated working directory
    flowmaestro/code-sandbox:latest
```

**Security Properties:**

| Property       | Setting                      | Purpose                                |
| -------------- | ---------------------------- | -------------------------------------- |
| Filesystem     | Read-only root               | Prevent persistent modifications       |
| Temp directory | 64MB, noexec                 | Limited writable space, no executables |
| User           | `sandbox:sandbox` (non-root) | No root privileges                     |
| Capabilities   | All dropped                  | No special Linux capabilities          |
| Privileges     | no-new-privileges            | Cannot gain privileges via setuid      |
| Network        | Disabled by default          | No external communication              |
| Memory         | Hard limit (default 256MB)   | Prevent memory exhaustion              |
| CPU            | Limited (default 0.5 cores)  | Prevent CPU exhaustion                 |
| PIDs           | Limited (default 100)        | Prevent fork bombs                     |

### Layer 3: Execution Controls

**Timeout Enforcement:**

- Hard kill (`SIGKILL`) after timeout
- Default: 30 seconds
- Maximum: 5 minutes (300 seconds)

**Output Limits:**

- stdout/stderr truncated at 100KB
- Warning appended when truncated

**Concurrency Control:**

- Maximum 10 concurrent executions per worker
- Queue system for overflow requests
- Prevents resource exhaustion at scale

## Session Management

Sessions allow stateful execution across multiple calls.

**How It Works:**

1. First call with `sessionId`:
    - New container created
    - Session registered with container ID
    - Container kept alive after execution

2. Subsequent calls with same `sessionId`:
    - Existing container reused
    - State preserved (variables, files)
    - Session timestamp updated

3. Session expiration:
    - TTL: 10 minutes of inactivity
    - Cleanup runs every 2 minutes
    - Container destroyed on expiration

**Example: Multi-Step Calculation**

```python
# Call 1: Define data
{
    "code": "data = [1, 2, 3, 4, 5]",
    "language": "python",
    "sessionId": "calc-session-123"
}

# Call 2: Use previously defined data
{
    "code": "result = sum(data) / len(data)",
    "language": "python",
    "sessionId": "calc-session-123"
}
# Returns: { "result": 3.0 }
```

**Session Ownership:**

- Sessions are tied to user ID
- Cross-user session access is denied
- Language must match across calls

## Language Wrappers

Each language has a wrapper that handles input injection and output capture.

### Python Wrapper

```python
import json
import sys
import traceback

# Input injection
_fm_input = json.loads('{...}')
globals().update(_fm_input)

# Execute user code
try:
    exec('''
    # User's code here
    ''')

    # Capture result
    if 'result' in dir():
        print("__FM_RESULT_START__")
        print(json.dumps(result, default=str))
        print("__FM_RESULT_END__")

except Exception as e:
    # Structured error output
    print("__FM_ERROR_START__", file=sys.stderr)
    print(json.dumps({
        "error": str(e),
        "type": type(e).__name__,
        "traceback": traceback.format_exc()
    }), file=sys.stderr)
    print("__FM_ERROR_END__", file=sys.stderr)
    sys.exit(1)
```

### JavaScript Wrapper

```javascript
(async () => {
    const _fmInput = {...};
    Object.assign(globalThis, _fmInput);

    try {
        // User's code here

        if (typeof result !== 'undefined') {
            console.log("__FM_RESULT_START__");
            console.log(JSON.stringify(result));
            console.log("__FM_RESULT_END__");
        }
    } catch (error) {
        console.error("__FM_ERROR_START__");
        console.error(JSON.stringify({
            error: error.message,
            type: error.name,
            stack: error.stack
        }));
        console.error("__FM_ERROR_END__");
        process.exit(1);
    }
})();
```

### Shell Wrapper

```bash
#!/bin/bash
set -e

# Input as environment variables
export VAR1="value1"
export VAR2="value2"

# User's code here

# stdout is the result
```

## Pre-installed Packages

### Python Packages

| Category   | Packages                                        |
| ---------- | ----------------------------------------------- |
| Data       | pandas, numpy, polars                           |
| HTTP       | requests, httpx, aiohttp                        |
| Parsing    | beautifulsoup4, lxml, html5lib                  |
| Files      | openpyxl, xlrd, python-docx, pypdf, python-pptx |
| Scientific | scipy, sympy                                    |
| Date/Time  | pendulum, arrow, python-dateutil                |
| Validation | pydantic                                        |
| Image      | pillow                                          |
| JSON/YAML  | pyyaml, orjson                                  |
| Other      | markdown, csvkit, regex                         |

### JavaScript Packages

| Category   | Packages                                     |
| ---------- | -------------------------------------------- |
| Utilities  | lodash, uuid, slugify, pluralize             |
| Date/Time  | date-fns, dayjs                              |
| Data       | mathjs, decimal.js, big.js                   |
| Parsing    | cheerio, yaml, csv-parse, papaparse, xlsx    |
| XML/HTML   | fast-xml-parser, sanitize-html, he, turndown |
| Validation | validator, zod                               |
| Crypto     | crypto-js                                    |
| Other      | markdown-it, change-case, jsonpath-plus      |

### Runtime Package Installation

Additional packages can be installed at runtime:

```json
{
    "packages": ["scikit-learn", "matplotlib"]
}
```

- Python: Uses `pip install --user --no-cache-dir`
- JavaScript: Uses `npm install --no-save`
- Max install time: 60 seconds
- Package names validated against pattern: `^[a-zA-Z0-9_-]+([=<>][a-zA-Z0-9._-]+)?$`

## Configuration

Environment variables for tuning code execution:

| Variable                        | Default                           | Description                        |
| ------------------------------- | --------------------------------- | ---------------------------------- |
| `CODE_SANDBOX_IMAGE`            | `flowmaestro/code-sandbox:latest` | Docker image name                  |
| `MAX_CONCURRENT_EXECUTIONS`     | `10`                              | Max parallel executions per worker |
| `CODE_SESSION_TTL_MS`           | `600000` (10 min)                 | Session timeout                    |
| `CODE_SANDBOX_MEMORY_BYTES`     | `268435456` (256MB)               | Default memory limit               |
| `CODE_SANDBOX_CPU_CORES`        | `0.5`                             | Default CPU cores                  |
| `CODE_SANDBOX_TIMEOUT_MS`       | `30000`                           | Default execution timeout          |
| `CODE_SANDBOX_MAX_PIDS`         | `100`                             | Max processes per container        |
| `CODE_SANDBOX_MAX_OUTPUT_BYTES` | `102400` (100KB)                  | Max output size                    |

## Worker Infrastructure

The Temporal worker needs Docker access to spawn sandbox containers.

### Option A: Docker Socket Mount (Recommended for Development)

```yaml
# Kubernetes deployment
spec:
    containers:
        - name: worker
          volumeMounts:
              - name: docker-socket
                mountPath: /var/run/docker.sock
    volumes:
        - name: docker-socket
          hostPath:
              path: /var/run/docker.sock
```

### Option B: Docker-in-Docker Sidecar (More Isolated)

```yaml
spec:
    containers:
        - name: worker
          env:
              - name: DOCKER_HOST
                value: tcp://localhost:2375
        - name: dind
          image: docker:dind
          securityContext:
              privileged: true
          volumeMounts:
              - name: docker-storage
                mountPath: /var/lib/docker
    volumes:
        - name: docker-storage
          emptyDir: {}
```

## Error Handling

### Error Types

| Error           | Cause                       | User-Visible Message                                       |
| --------------- | --------------------------- | ---------------------------------------------------------- |
| Security Block  | Dangerous pattern detected  | "Code execution blocked: {pattern description}"            |
| Timeout         | Execution exceeded limit    | "Execution timed out after {ms}ms"                         |
| Package Error   | Package installation failed | "Failed to install packages: {error}"                      |
| Execution Error | Code threw exception        | Language-specific error with traceback                     |
| Session Error   | Language mismatch           | "Session language mismatch: session is {x}, requested {y}" |

### Error Response Format

When execution fails, the tool returns:

```json
{
    "success": false,
    "error": {
        "message": "Code execution blocked: os.system() can execute arbitrary shell commands",
        "code": "SECURITY_BLOCKED",
        "retryable": false
    }
}
```

When code throws an error:

```json
{
    "success": true,
    "data": {
        "result": null,
        "stdout": "",
        "stderr": "TypeError: 'NoneType' object is not subscriptable\n...",
        "metadata": {
            "exitCode": 1,
            "executionTimeMs": 234
        }
    }
}
```

## Usage Examples

### Agent: Data Analysis

```json
{
    "tool": "code_execute",
    "input": {
        "language": "python",
        "code": "import pandas as pd\ndf = pd.DataFrame(data)\nresult = {'mean': df['value'].mean(), 'std': df['value'].std()}",
        "inputData": {
            "data": [
                { "name": "A", "value": 10 },
                { "name": "B", "value": 20 }
            ]
        }
    }
}
```

### Persona: File Processing

```json
{
    "tool": "code_execute",
    "input": {
        "language": "python",
        "code": "import json\ndata = json.loads(raw_data)\nresult = [x for x in data if x['status'] == 'active']",
        "inputFiles": [{ "path": "uploads/data.json", "variableName": "raw_data" }]
    }
}
```

### Workflow: Generate Report

```json
{
    "type": "code",
    "config": {
        "language": "javascript",
        "code": "const _ = require('lodash');\nconst grouped = _.groupBy(records, 'category');\nresult = Object.entries(grouped).map(([k, v]) => ({category: k, count: v.length}));",
        "inputVariables": ["records"],
        "outputVariable": "summary"
    }
}
```

## Monitoring

### Metrics to Track

- `code_execution_duration_ms` - Execution time histogram
- `code_execution_count` - Executions by language, status
- `code_sandbox_containers_active` - Current container count
- `code_sandbox_queue_length` - Queued execution requests
- `code_session_count` - Active sessions by language
- `code_security_blocks` - Blocked executions by pattern

### Logging

Key log events:

```
INFO  Creating sandbox container  {language, limits}
INFO  Container created           {containerName, containerId}
INFO  Session created             {sessionId, containerId, language}
DEBUG Container execution completed {containerName, exitCode, duration}
WARN  Dangerous code blocked      {language, patterns}
ERROR Code execution failed       {error, language, sessionId}
```

## Cleanup

### Automatic Cleanup

- **Session TTL:** Containers destroyed after 10 minutes of inactivity
- **Stale Container Cleanup:** Background job removes containers older than 30 minutes
- **Graceful Shutdown:** All sessions cleaned up on worker shutdown

### Manual Cleanup

```bash
# List sandbox containers
docker ps -a --filter "name=fm-sandbox-"

# Remove all sandbox containers
docker rm -f $(docker ps -a --filter "name=fm-sandbox-" -q)
```

## Building the Sandbox Image

```bash
cd infra/docker/code-sandbox

# Build
docker build -t flowmaestro/code-sandbox:latest .

# Push to registry
docker push flowmaestro/code-sandbox:latest
```

## Testing

### Unit Tests

```bash
# Security analysis
npm test -- --grep "code-execute"

# Language wrappers
npm test -- --grep "code-sandbox"
```

### Integration Tests (requires Docker)

```bash
npm run test:integration -- --grep "code-execution"
```

### Manual Testing

```bash
# Test via agent
curl -X POST http://localhost:3001/api/agents/{id}/execute \
    -H "Authorization: Bearer {token}" \
    -d '{"message": "Calculate the factorial of 10 using Python"}'
```

## Security Considerations

1. **Never run untrusted code outside containers** - All code must go through the sandbox
2. **Review blocked patterns regularly** - Attack techniques evolve
3. **Monitor resource usage** - Watch for abuse patterns
4. **Audit session access** - Log cross-user access attempts
5. **Keep sandbox image updated** - Security patches for Python/Node
6. **Network isolation is critical** - Only enable network when necessary
7. **Package installation risks** - Installed packages could be malicious
