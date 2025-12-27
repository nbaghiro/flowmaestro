# E2B Sandbox Integration Spec

## Overview

Replace the current VM2 (JavaScript) and child-process (Python) code execution with E2B cloud-based sandboxed execution. E2B provides isolated Firecracker VMs with ~150ms startup, supporting JavaScript, TypeScript, and Python with automatic package support.

## Key Decisions

- **Full replacement** - Remove VM2/child-process, use E2B for all code execution
- **Basic execution** - Input/output, stdout/stderr capture, timeout handling
- **System-level API key** - Single `E2B_API_KEY` in backend environment

---

## Implementation Steps

### 1. Install E2B SDK

**File:** `backend/package.json`

```bash
npm install @e2b/code-interpreter
```

### 2. Add E2B API Key to Secrets

**File:** `infra/pulumi/Pulumi.production.yaml`

Add new secret definition:

```json
{
    "name": "e2b-api-key",
    "envVar": "E2B_API_KEY",
    "category": "service",
    "deployments": ["worker"],
    "required": true,
    "description": "E2B sandbox API key for code execution"
}
```

Then run `pulumi up` and `setup-secrets-gcp.sh` to provision.

### 3. Rewrite Code Node Executor

**File:** `backend/src/trigger/node-executors/integrations/code.ts`

Replace the entire implementation:

```typescript
import { Sandbox } from "@e2b/code-interpreter";
import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { CodeExecutionError, ValidationError } from "../../shared/errors";
import { createActivityLogger } from "../../shared/logger";

const logger = createActivityLogger({ nodeType: "Code" });

export interface CodeNodeConfig {
    language: "javascript" | "python";
    code: string;
    timeout?: number; // Max execution time in ms (default: 30000)
    inputVariables?: string[]; // Variables to pass from context
    outputVariable?: string;
}

export interface CodeNodeResult {
    language: string;
    output: JsonValue;
    stdout?: string;
    stderr?: string;
    logs?: string[];
    metadata?: {
        executionTime: number;
        sandboxId?: string;
    };
}

export async function executeCodeNode(
    config: CodeNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const startTime = Date.now();

    // Validate language
    if (!["javascript", "python"].includes(config.language)) {
        throw new ValidationError(`Unsupported language: ${config.language}`, "language");
    }

    logger.info("Creating E2B sandbox", { language: config.language });

    let sandbox: Sandbox | null = null;

    try {
        // Create sandbox (auto-reads E2B_API_KEY from env)
        sandbox = await Sandbox.create({
            timeoutMs: config.timeout || 30000
        });

        // Prepare input variables
        const inputVars: JsonObject = {};
        if (config.inputVariables?.length) {
            for (const varName of config.inputVariables) {
                if (varName in context) {
                    inputVars[varName] = context[varName];
                }
            }
        } else {
            // Pass entire context if no specific variables specified
            Object.assign(inputVars, context);
        }

        // Build code with input injection
        const wrappedCode = wrapCodeWithInputs(config.code, inputVars, config.language);

        // Execute code
        logger.info("Executing code in E2B sandbox", {
            language: config.language,
            sandboxId: sandbox.sandboxId
        });

        const execution = await sandbox.runCode(wrappedCode, {
            language: config.language === "javascript" ? "js" : "python"
        });

        // Process results
        const result: CodeNodeResult = {
            language: config.language,
            output: parseOutput(execution),
            stdout: execution.logs?.stdout?.map((l) => l.line).join("\n"),
            stderr: execution.logs?.stderr?.map((l) => l.line).join("\n"),
            logs: [
                ...(execution.logs?.stdout?.map((l) => l.line) || []),
                ...(execution.logs?.stderr?.map((l) => `ERROR: ${l.line}`) || [])
            ],
            metadata: {
                executionTime: Date.now() - startTime,
                sandboxId: sandbox.sandboxId
            }
        };

        // Handle execution errors
        if (execution.error) {
            throw new CodeExecutionError(
                `${execution.error.name}: ${execution.error.value}\n${execution.error.traceback}`,
                config.language
            );
        }

        logger.info("Code execution completed", {
            executionTime: result.metadata?.executionTime,
            hasOutput: result.output !== null
        });

        if (config.outputVariable) {
            return { [config.outputVariable]: result } as unknown as JsonObject;
        }
        return result as unknown as JsonObject;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("E2B execution failed", new Error(errorMessage));
        throw new CodeExecutionError(errorMessage, config.language);
    } finally {
        // Always cleanup sandbox
        if (sandbox) {
            await sandbox.kill().catch((err) => {
                logger.warn("Failed to kill sandbox", { error: err.message });
            });
        }
    }
}

function wrapCodeWithInputs(
    code: string,
    inputs: JsonObject,
    language: "javascript" | "python"
): string {
    const inputJson = JSON.stringify(inputs);

    if (language === "javascript") {
        return `
const __inputs = ${inputJson};
Object.assign(globalThis, __inputs);

// User code
${code}
`;
    } else {
        // Python
        return `
import json

__inputs = json.loads('''${inputJson.replace(/'/g, "\\'")}''')
globals().update(__inputs)

# User code
${code}
`;
    }
}

function parseOutput(execution: { text?: string; results?: unknown[] }): JsonValue {
    // Try to get structured result first
    if (execution.results?.length) {
        const lastResult = execution.results[execution.results.length - 1];
        if (typeof lastResult === "object" && lastResult !== null && "text" in lastResult) {
            try {
                return JSON.parse((lastResult as { text: string }).text);
            } catch {
                return (lastResult as { text: string }).text;
            }
        }
        return lastResult as JsonValue;
    }

    // Fall back to text output
    if (execution.text) {
        try {
            return JSON.parse(execution.text);
        } catch {
            return execution.text;
        }
    }

    return null;
}
```

### 4. Update Code Node Schema (Optional Enhancement)

**File:** `shared/src/nodes/schemas/logic.ts`

Remove `memory`, `allowNetworkAccess`, `allowFileSystemAccess` fields since E2B handles these:

```typescript
export const CodeNodeConfigSchema = z.object({
    language: z.enum(["javascript", "python"], {
        required_error: "Programming language is required"
    }),
    code: z.string().min(1, "Code is required"),
    timeout: z.number().int().positive().max(300000).optional().default(30000),
    inputVariables: z.array(z.string()).optional().default([]),
    outputVariable: OutputVariableSchema
});
```

### 5. Remove VM2 Dependency

**File:** `backend/package.json`

```bash
npm uninstall vm2
```

### 6. Update Environment Configuration

**File:** `backend/.env.example`

Add:

```
E2B_API_KEY=e2b_xxx
```

### 7. Add E2B Configuration Helper (Optional)

**File:** `backend/src/shared/config/e2b.ts`

```typescript
export const e2bConfig = {
    apiKey: process.env.E2B_API_KEY,
    defaultTimeout: 30000,
    maxTimeout: 300000 // 5 minutes max
};

export function validateE2BConfig(): void {
    if (!e2bConfig.apiKey) {
        throw new Error("E2B_API_KEY environment variable is required");
    }
}
```

---

## Files to Modify

| File                                                      | Action                                    |
| --------------------------------------------------------- | ----------------------------------------- |
| `backend/package.json`                                    | Add `@e2b/code-interpreter`, remove `vm2` |
| `backend/src/trigger/node-executors/integrations/code.ts` | Complete rewrite                          |
| `shared/src/nodes/schemas/logic.ts`                       | Simplify CodeNodeConfigSchema             |
| `infra/pulumi/Pulumi.production.yaml`                     | Add E2B API key secret                    |
| `backend/.env.example`                                    | Add E2B_API_KEY                           |

---

## E2B SDK Reference

```typescript
import { Sandbox } from "@e2b/code-interpreter";

// Create sandbox (~150ms startup)
const sandbox = await Sandbox.create({ timeoutMs: 30000 });

// Run code
const execution = await sandbox.runCode(code, {
    language: "js" | "ts" | "python"
});

// Execution result structure
execution.text; // Text representation of last result
execution.results; // Array of Result objects with mime types
execution.logs.stdout; // Array of { line, timestamp }
execution.logs.stderr; // Array of { line, timestamp, error: true }
execution.error; // { name, value, traceback } if error occurred

// Run terminal commands
await sandbox.commands.run("npm install axios");

// Always cleanup
await sandbox.kill();
```

---

## Testing Checklist

1. JavaScript execution with input variables
2. Python execution with input variables
3. Timeout enforcement (30s default)
4. Error handling (syntax errors, runtime errors)
5. stdout/stderr capture
6. Large output handling
7. Context variable interpolation

---

## Rollout Strategy

1. Deploy backend with E2B integration to staging
2. Test all workflow templates that use code nodes
3. Monitor E2B usage/costs in dashboard
4. Deploy to production with feature flag if needed
5. Remove VM2 fallback after validation period

---

## Cost Considerations

- E2B charges ~$0.05/hour per 1 vCPU sandbox
- Default 5-minute sandbox lifetime
- Hobby tier: 20 concurrent sandboxes, $100 free credits
- Pro tier: $150/month, 24-hour sessions, more concurrency

---

## Sources

- [E2B Documentation](https://e2b.dev/docs)
- [E2B Code Interpreter SDK](https://github.com/e2b-dev/code-interpreter)
- [E2B Pricing](https://e2b.dev/pricing)
- [JavaScript/TypeScript Support](https://e2b.dev/docs/code-interpreting/supported-languages/javascript)
