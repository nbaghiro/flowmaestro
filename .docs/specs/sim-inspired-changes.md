# FlowMaestro Node System Modernization Spec

> **Status**: Planned (not yet implemented)
> **Created**: 2025-12-16
> **Inspired by**: [SIM Studio Codebase Analysis](./../explorations/sim-codebase-analysis.md)

---

## Executive Summary

This specification outlines a comprehensive modernization of FlowMaestro's node system, drawing inspiration from SIM Studio's mature architecture. The core insight from analyzing SIM is that **separating node definitions from node execution** creates a more maintainable, extensible, and type-safe system.

Currently, FlowMaestro's nodes are defined through a combination of hardcoded switch statements, scattered type definitions, and custom UI components for each node. This approach works but creates several pain points:

- Adding a new node type requires changes in 5+ files
- No validation of node configurations until runtime
- Each node needs a custom React component for its configuration UI
- Control flow (loops, parallel) is partially implemented

SIM Studio solves these problems with a **registry-based architecture** where each node is fully described by a single definition object that includes its schema, UI configuration, and metadata. This spec adapts that pattern for FlowMaestro.

---

## Current State vs Target State

| Component         | Current State                            | Target State                        |
| ----------------- | ---------------------------------------- | ----------------------------------- |
| Node Types        | 18 hardcoded in switch statement         | Dynamic registry with schemas       |
| Config Validation | Manual per executor                      | Zod schemas in shared package       |
| Handler Routing   | Switch in `index.ts` (lines 74-156)      | Handler registry with `canHandle()` |
| Loops             | Executor exists, orchestrator incomplete | Full for/forEach/while/doWhile      |
| Parallel          | Not implemented                          | Branch tracking with concurrency    |
| UI Config         | 17 custom components                     | Dynamic rendering from schemas      |
| LLM Providers     | 5                                        | Extensible (16+ like SIM)           |
| Integrations      | 26                                       | Extensible (127+ like SIM)          |

---

## Phase 1: Node Registry System

### Why a Registry?

The fundamental problem with FlowMaestro's current architecture is that node information is scattered across multiple files:

1. **Frontend** (`NodeLibrary.tsx`) - Static array defining what nodes appear in the sidebar
2. **Frontend** (`WorkflowCanvas.tsx`) - Map of node type to React component
3. **Frontend** (`configs/*.tsx`) - 17 separate config components
4. **Backend** (`node-executors/index.ts`) - Giant switch statement routing to executors
5. **Backend** (`*-executor.ts`) - Individual executor files with their own config interfaces

This means adding a simple new node type (like a "Delay" node) requires touching all 5 areas. A registry centralizes this: **one definition file per node that describes everything about it**.

SIM Studio has 137 nodes managed this way. Each node is a single file that exports a `BlockConfig` object containing the node's type, name, icon, category, Zod schema for validation, UI field definitions, and output types.

### 1.1 Core Type Definitions

The `NodeDefinition` interface is the heart of the registry system. It combines several concerns that are currently spread across the codebase:

**New File:** `shared/src/node-registry/types.ts`

```typescript
import { z } from "zod";

// Categories group nodes in the UI sidebar
export type NodeCategory = "ai" | "logic" | "data" | "connect";

// Field types map to reusable UI components
// This is inspired by SIM's "SubBlockType" which has 39 types
// We start with the essentials and can expand later
export type FieldType =
    | "short-input" // Single-line text input
    | "long-input" // Multi-line textarea
    | "code" // Code editor with syntax highlighting
    | "dropdown" // Select dropdown
    | "slider" // Numeric range slider
    | "checkbox" // Boolean toggle
    | "key-value" // Array of key-value pairs (for headers, params)
    | "connection" // Connection/credential selector
    | "model-selector" // LLM model dropdown (special case of dropdown)
    | "variable-input" // Input that supports ${variable} syntax
    | "file-upload"; // File upload component

// Individual form field - describes one input in the node config UI
export interface FieldDefinition {
    id: string; // Maps to config property name
    type: FieldType; // Which UI component to render
    label: string; // Human-readable label
    description?: string; // Help text shown on hover
    placeholder?: string; // Placeholder text for inputs
    required?: boolean; // Validation: must have value
    defaultValue?: unknown; // Initial value when node created
    options?: Array<{ value: string; label: string }>; // For dropdowns
    min?: number; // For sliders/numbers
    max?: number;
    step?: number;
    language?: string; // For code editor: "javascript", "json", etc.
    rows?: number; // For long-input: textarea rows
    supportsVariables?: boolean; // Show ${} hint, enable variable picker
    dependsOn?: {
        // Conditional visibility
        field: string; // Only show this field when...
        value: unknown; // ...this other field has this value
    };
}

// Fields are grouped into collapsible sections
export interface FieldGroup {
    id: string;
    title: string;
    description?: string;
    fields: FieldDefinition[];
    collapsed?: boolean; // Start collapsed in UI
}

// Describes what a node outputs (for documentation and type hints)
export interface OutputDefinition {
    id: string;
    label: string;
    type: "any" | "string" | "number" | "boolean" | "object" | "array";
    description?: string;
}

// The complete node definition - everything needed to render and execute a node
export interface NodeDefinition {
    type: string; // Unique identifier: "llm", "http", etc.
    name: string; // Display name: "LLM", "HTTP Request"
    description: string; // Short description for UI tooltips
    category: NodeCategory; // Which sidebar section
    icon: string; // Lucide icon name: "Bot", "Globe", etc.
    isControlFlow: boolean; // true for loop, parallel, conditional
    isAsync: boolean; // true for nodes making external calls
    configSchema: z.ZodSchema; // Zod schema for validation
    configFields: FieldGroup[]; // UI field definitions
    outputs: OutputDefinition[]; // What this node produces
    defaultConfig: Record<string, unknown>; // Initial config when created
    handlerType: "standard" | "conditional" | "loop" | "parallel";
}
```

### 1.2 The Registry Class

The registry is a simple singleton that stores node definitions and provides lookup methods. The key insight is `getAllMetadata()` which strips the Zod schema (not serializable) for sending to the frontend.

**New File:** `shared/src/node-registry/registry.ts`

```typescript
import type { NodeDefinition, NodeCategory } from "./types";

class NodeRegistry {
    private nodes: Map<string, NodeDefinition> = new Map();

    // Register a node definition (called at startup)
    register(definition: NodeDefinition): void {
        if (this.nodes.has(definition.type)) {
            console.warn(`Node type "${definition.type}" is already registered, overwriting`);
        }
        this.nodes.set(definition.type, definition);
    }

    // Get a single node definition by type
    get(type: string): NodeDefinition | undefined {
        return this.nodes.get(type);
    }

    // Get all registered nodes
    getAll(): NodeDefinition[] {
        return Array.from(this.nodes.values());
    }

    // Filter by category (for UI sidebar sections)
    getByCategory(category: NodeCategory): NodeDefinition[] {
        return this.getAll().filter((n) => n.category === category);
    }

    // Check if a node type exists
    has(type: string): boolean {
        return this.nodes.has(type);
    }

    // Get metadata without Zod schema (for sending to frontend)
    // Zod schemas contain functions and can't be serialized to JSON
    getAllMetadata(): Array<Omit<NodeDefinition, "configSchema">> {
        return this.getAll().map(({ configSchema, ...rest }) => rest);
    }
}

// Singleton instance - imported throughout the app
export const nodeRegistry = new NodeRegistry();
```

### 1.3 Example Node Definition

Here's what a complete node definition looks like. Notice how it combines what's currently spread across `llm-executor.ts`, `LLMNodeConfig.tsx`, and the `NodeLibrary` array:

**New File:** `shared/src/node-registry/definitions/llm.ts`

```typescript
import { z } from "zod";
import type { NodeDefinition } from "../types";

// Zod schema defines valid configuration
// This replaces the manual validation in the executor
export const llmNodeSchema = z.object({
    provider: z.enum(["openai", "anthropic", "google", "cohere", "huggingface"]),
    model: z.string().min(1),
    connectionId: z.string().optional(),
    systemPrompt: z.string().optional(),
    prompt: z.string().min(1),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().min(1).max(32000).default(1000),
    outputVariable: z.string().optional()
});

// Complete node definition
export const llmNodeDefinition: NodeDefinition = {
    // Identity
    type: "llm",
    name: "LLM",
    description: "Generate text using AI language models",
    category: "ai",
    icon: "Bot",

    // Execution characteristics
    isControlFlow: false, // Not a loop/parallel/conditional
    isAsync: true, // Makes external API calls
    handlerType: "standard",

    // Validation schema
    configSchema: llmNodeSchema,

    // UI Configuration - these field groups appear in the node inspector
    configFields: [
        {
            id: "model-config",
            title: "Model Configuration",
            fields: [
                {
                    id: "connectionId",
                    type: "connection",
                    label: "Provider Connection",
                    description: "Select a configured LLM provider connection",
                    required: true
                },
                {
                    id: "model",
                    type: "model-selector",
                    label: "Model",
                    description: "The model to use for generation",
                    required: true
                }
            ]
        },
        {
            id: "prompts",
            title: "Prompts",
            fields: [
                {
                    id: "systemPrompt",
                    type: "long-input",
                    label: "System Prompt",
                    description: "Instructions that define the AI's behavior",
                    placeholder: "You are a helpful assistant...",
                    rows: 4,
                    supportsVariables: true
                },
                {
                    id: "prompt",
                    type: "long-input",
                    label: "User Prompt",
                    description: "The message to send to the AI",
                    rows: 6,
                    required: true,
                    supportsVariables: true
                }
            ]
        },
        {
            id: "parameters",
            title: "Advanced Parameters",
            collapsed: true, // Hidden by default
            fields: [
                {
                    id: "temperature",
                    type: "slider",
                    label: "Temperature",
                    description: "Higher = more creative, lower = more focused",
                    min: 0,
                    max: 2,
                    step: 0.1,
                    defaultValue: 0.7
                },
                {
                    id: "maxTokens",
                    type: "short-input",
                    label: "Max Tokens",
                    description: "Maximum length of the response",
                    defaultValue: 1000
                }
            ]
        }
    ],

    // What this node produces
    outputs: [
        {
            id: "content",
            label: "Generated Text",
            type: "string",
            description: "The AI's response"
        },
        {
            id: "tokens",
            label: "Token Usage",
            type: "object",
            description: "Input/output token counts"
        }
    ],

    // Initial config when node is added to canvas
    defaultConfig: {
        temperature: 0.7,
        maxTokens: 1000
    }
};
```

### 1.4 Registering All Nodes

At startup, all node definitions are registered. This is the single place where new nodes are "plugged in":

**New File:** `shared/src/node-registry/index.ts`

```typescript
export * from "./types";
export * from "./registry";

import { nodeRegistry } from "./registry";

// Import all node definitions
import { llmNodeDefinition } from "./definitions/llm";
import { httpNodeDefinition } from "./definitions/http";
import { codeNodeDefinition } from "./definitions/code";
import { transformNodeDefinition } from "./definitions/transform";
import { conditionalNodeDefinition } from "./definitions/conditional";
import { loopNodeDefinition } from "./definitions/loop";
import { parallelNodeDefinition } from "./definitions/parallel";
// ... import remaining 11 node definitions

// Register all nodes
// Order doesn't matter - the registry is a map
const definitions = [
    llmNodeDefinition,
    httpNodeDefinition,
    codeNodeDefinition,
    transformNodeDefinition,
    conditionalNodeDefinition,
    loopNodeDefinition,
    parallelNodeDefinition
    // ... remaining definitions
];

definitions.forEach((def) => nodeRegistry.register(def));

// Re-export for convenience
export { nodeRegistry };
```

### Files to Create

- `shared/src/node-registry/types.ts` - Core type definitions
- `shared/src/node-registry/registry.ts` - Registry class
- `shared/src/node-registry/definitions/*.ts` - 18 files, one per node type
- `shared/src/node-registry/index.ts` - Registration and exports

---

## Phase 2: Schema Validation

### Why Validate at the Orchestrator Level?

Currently, each node executor does its own validation (or worse, doesn't validate at all). This leads to:

1. **Inconsistent error messages** - Each executor formats errors differently
2. **Late failures** - Invalid configs only discovered during execution
3. **Duplicate code** - Similar validation logic repeated across executors

By validating the entire workflow before execution starts, we:

- Catch all config errors upfront with consistent formatting
- Fail fast before any nodes execute
- Provide a clear list of what needs fixing

### 2.1 Validation Utilities

These functions use the Zod schemas from the registry to validate node configs:

**New File:** `backend/src/temporal/activities/node-executors/validation.ts`

```typescript
import { nodeRegistry } from "@flowmaestro/shared";
import type { JsonObject, WorkflowDefinition } from "@flowmaestro/shared";
import { ZodError } from "zod";

export interface ValidationResult {
    valid: boolean;
    errors?: Array<{
        nodeId?: string; // Which node has the error
        path: string; // Which field (e.g., "prompt", "temperature")
        message: string; // Human-readable error message
    }>;
}

/**
 * Validate a single node's configuration against its schema.
 * Returns detailed errors if validation fails.
 */
export function validateNodeConfig(nodeType: string, config: JsonObject): ValidationResult {
    const definition = nodeRegistry.get(nodeType);

    // Unknown node type - this shouldn't happen if UI is working correctly
    if (!definition) {
        return {
            valid: false,
            errors: [{ path: "type", message: `Unknown node type: ${nodeType}` }]
        };
    }

    try {
        // Zod's parse() throws on validation failure
        definition.configSchema.parse(config);
        return { valid: true };
    } catch (error) {
        if (error instanceof ZodError) {
            // Transform Zod's error format to our format
            return {
                valid: false,
                errors: error.errors.map((e) => ({
                    path: e.path.join("."), // ["nested", "field"] -> "nested.field"
                    message: e.message
                }))
            };
        }
        // Re-throw unexpected errors
        throw error;
    }
}

/**
 * Validate all nodes in a workflow definition.
 * Returns aggregated errors from all invalid nodes.
 */
export function validateWorkflowDefinition(definition: WorkflowDefinition): ValidationResult {
    const errors: ValidationResult["errors"] = [];

    for (const [nodeId, node] of Object.entries(definition.nodes)) {
        const result = validateNodeConfig(node.type, node.config);
        if (!result.valid && result.errors) {
            // Prefix each error with the node ID for context
            errors.push(
                ...result.errors.map((e) => ({
                    nodeId,
                    path: e.path,
                    message: e.message
                }))
            );
        }
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true };
}
```

### 2.2 Integrate in Orchestrator

Add validation early in the workflow execution, before any nodes run:

**Modify:** `backend/src/temporal/workflows/orchestrator-workflow.ts`

```typescript
// Add near the top, after input validation (~line 90)

// Validate all node configurations before execution
// This catches config errors early with clear error messages
const structureValidation = validateWorkflowDefinition(workflowDefinition);
if (!structureValidation.valid) {
    // Format errors for the user
    const errorDetails = structureValidation.errors
        ?.map((e) => `Node "${e.nodeId}": ${e.path} - ${e.message}`)
        .join("; ");
    const errorMessage = `Workflow validation failed: ${errorDetails}`;

    // Emit failure event and return early
    await emitExecutionFailed({ executionId, error: errorMessage });
    return { success: false, outputs: {}, error: errorMessage };
}

// Continue with execution...
```

---

## Phase 3: Handler Pattern

### Why Replace the Switch Statement?

The current node execution dispatcher in `index.ts` looks like this:

```typescript
switch (nodeType) {
    case "llm":
        return executeLLMNode(config, context);
    case "http":
        return executeHTTPNode(config, context);
    case "code":
        return executeCodeNode(config, context);
    // ... 15 more cases
    default:
        throw new Error(`Unknown node type: ${nodeType}`);
}
```

This has several problems:

1. **Hard to extend** - Adding a node means modifying this file
2. **No separation of concerns** - Control flow nodes (loop, parallel) need special orchestrator handling, but that's not clear from this switch
3. **No polymorphism** - Can't have multiple handlers for the same concept (e.g., different conditional implementations)

The **handler pattern** (used by SIM) creates pluggable handlers that declare which node types they handle. The orchestrator asks each handler "can you handle this?" and delegates to the first one that says yes.

### 3.1 Handler Interface

Each handler is a class that can handle one or more node types:

**New File:** `backend/src/temporal/activities/node-executors/handlers/types.ts`

```typescript
import type { JsonObject, JsonValue } from "@flowmaestro/shared";

/**
 * Context passed to handlers during execution.
 * Contains everything a handler needs to execute a node.
 */
export interface ExecutionContext {
    executionId: string; // For logging and events
    nodeId: string; // Current node being executed
    userId?: string; // For audit trails
    variables: JsonObject; // Accumulated outputs from previous nodes
    globalStore?: Map<string, JsonValue>; // Persistent cross-execution storage

    // Present when executing inside a loop
    loop?: {
        index: number; // 0-based index
        item?: JsonValue; // Current item (for forEach)
        iteration: number; // 1-based count
        total?: number; // Total iterations (if known)
    };

    // Present when executing inside a parallel branch
    parallel?: {
        branchId: string; // Unique branch identifier
        branchIndex: number; // 0-based branch index
        totalBranches: number;
    };
}

/**
 * Result returned by a handler after executing a node.
 */
export interface HandlerResult {
    output: JsonObject; // The node's output (merged into context.variables)

    // For control flow nodes, this tells the orchestrator how to proceed
    controlFlow?: {
        type: "branch" | "loop" | "parallel";
        metadata: JsonObject; // Handler-specific data (iterations, branches, etc.)
    };
}

/**
 * Interface that all handlers must implement.
 * Follows the Chain of Responsibility pattern.
 */
export interface NodeHandler {
    readonly name: string; // For logging: "standard", "loop", etc.
    readonly handledTypes: string[]; // Node types this handler supports

    // Return true if this handler can execute the given node type
    canHandle(nodeType: string): boolean;

    // Execute the node and return results
    execute(
        nodeType: string,
        config: JsonObject,
        context: ExecutionContext
    ): Promise<HandlerResult>;
}
```

### 3.2 Handler Registry

The registry finds the right handler for each node type:

**New File:** `backend/src/temporal/activities/node-executors/handlers/registry.ts`

```typescript
import type { NodeHandler, ExecutionContext, HandlerResult } from "./types";
import type { JsonObject } from "@flowmaestro/shared";

/**
 * Registry of node handlers.
 * Handlers are checked in registration order, first match wins.
 */
class HandlerRegistry {
    private handlers: NodeHandler[] = [];

    /**
     * Register a handler. Order matters - handlers registered first
     * are checked first. Register more specific handlers before generic ones.
     */
    register(handler: NodeHandler): void {
        this.handlers.push(handler);
    }

    /**
     * Find the first handler that can handle this node type.
     */
    findHandler(nodeType: string): NodeHandler | undefined {
        return this.handlers.find((h) => h.canHandle(nodeType));
    }

    /**
     * Execute a node by finding its handler and delegating.
     */
    async execute(
        nodeType: string,
        config: JsonObject,
        context: ExecutionContext
    ): Promise<HandlerResult> {
        const handler = this.findHandler(nodeType);
        if (!handler) {
            throw new Error(
                `No handler registered for node type: ${nodeType}. ` +
                    `Available handlers: ${this.handlers.map((h) => h.name).join(", ")}`
            );
        }
        return handler.execute(nodeType, config, context);
    }
}

export const handlerRegistry = new HandlerRegistry();
```

### 3.3 Standard Handler

This handler wraps all the existing executors. It's a **bridge** between the old executor functions and the new handler interface:

**New File:** `backend/src/temporal/activities/node-executors/handlers/standard-handler.ts`

```typescript
import type { NodeHandler, ExecutionContext, HandlerResult } from "./types";
import type { JsonObject } from "@flowmaestro/shared";
import { validateNodeConfig } from "../validation";

// Import all existing executors - these don't change
import { executeLLMNode } from "../llm-executor";
import { executeHTTPNode } from "../http-executor";
import { executeCodeNode } from "../code-executor";
import { executeTransformNode } from "../transform-executor";
import { executeDatabaseNode } from "../database-executor";
import { executeIntegrationNode } from "../integration-executor";
import { executeEmbeddingsNode } from "../embeddings-executor";
import { executeVisionNode } from "../vision-executor";
import { executeAudioNode } from "../audio-executor";
import { executeKnowledgeBaseQueryNode } from "../kb-query-executor";
import { executeVariableNode } from "../variable-executor";
import { executeOutputNode } from "../output-executor";
import { executeWaitNode } from "../wait-executor";
import { executeEchoNode } from "../echo-executor";
import { executeInputNode } from "../input-executor";

// Map node types to their executor functions
// This replaces the switch statement
const executorMap: Record<
    string,
    (config: JsonObject, context: JsonObject) => Promise<JsonObject>
> = {
    llm: executeLLMNode,
    http: executeHTTPNode,
    code: executeCodeNode,
    transform: executeTransformNode,
    database: executeDatabaseNode,
    integration: executeIntegrationNode,
    embeddings: executeEmbeddingsNode,
    vision: executeVisionNode,
    audio: executeAudioNode,
    "kb-query": executeKnowledgeBaseQueryNode,
    variable: executeVariableNode,
    output: executeOutputNode,
    wait: executeWaitNode,
    echo: executeEchoNode,
    input: executeInputNode
};

/**
 * Standard handler for most node types.
 * Validates config, then delegates to the existing executor function.
 */
export class StandardHandler implements NodeHandler {
    readonly name = "standard";
    readonly handledTypes = Object.keys(executorMap);

    canHandle(nodeType: string): boolean {
        return nodeType in executorMap;
    }

    async execute(
        nodeType: string,
        config: JsonObject,
        context: ExecutionContext
    ): Promise<HandlerResult> {
        // Validate before execution (belt and suspenders - orchestrator also validates)
        const validation = validateNodeConfig(nodeType, config);
        if (!validation.valid) {
            throw new Error(`Invalid config for ${nodeType}: ${JSON.stringify(validation.errors)}`);
        }

        // Delegate to the existing executor
        const executor = executorMap[nodeType];
        const output = await executor(config, context.variables);

        // Standard nodes just return output, no control flow
        return { output };
    }
}
```

### 3.4 Control Flow Handlers

Control flow nodes (loop, parallel, conditional) are special. They don't just execute and return output - they tell the orchestrator **how to modify the execution flow**. This is done via the `controlFlow` property in the result.

**Loop Handler Example:**

```typescript
/**
 * Handles loop nodes. Instead of executing child nodes directly,
 * it returns metadata that tells the orchestrator how to iterate.
 */
export class LoopHandler implements NodeHandler {
    readonly name = "loop";
    readonly handledTypes = ["loop"];

    canHandle(nodeType: string): boolean {
        return nodeType === "loop";
    }

    async execute(
        nodeType: string,
        config: JsonObject,
        context: ExecutionContext
    ): Promise<HandlerResult> {
        const loopConfig = config as LoopConfig;

        // Calculate how many iterations and what items to iterate
        const metadata = this.calculateLoopMetadata(loopConfig, context);

        // Return control flow instructions for the orchestrator
        return {
            output: { loopType: loopConfig.loopType },
            controlFlow: {
                type: "loop",
                metadata: {
                    iterations: metadata.iterations,
                    items: metadata.items,
                    itemVariable: loopConfig.itemVariable || "item",
                    shouldExecute: metadata.iterations > 0
                }
            }
        };
    }

    // ... helper methods
}
```

### 3.5 Registering Handlers

Order matters - more specific handlers should be registered before the generic StandardHandler:

**New File:** `backend/src/temporal/activities/node-executors/handlers/index.ts`

```typescript
export * from "./types";
export * from "./registry";

import { handlerRegistry } from "./registry";
import { StandardHandler } from "./standard-handler";
import { LoopHandler } from "./loop-handler";
import { ParallelHandler } from "./parallel-handler";
import { ConditionalHandler } from "./conditional-handler";

// Register control flow handlers first (more specific)
handlerRegistry.register(new LoopHandler());
handlerRegistry.register(new ParallelHandler());
handlerRegistry.register(new ConditionalHandler());

// Register standard handler last (catches everything else)
handlerRegistry.register(new StandardHandler());

export { handlerRegistry };
```

### 3.6 Updated executeNode Activity

The main `executeNode` function becomes a thin wrapper around the handler registry:

**Modify:** `backend/src/temporal/activities/node-executors/index.ts`

```typescript
import { handlerRegistry, ExecutionContext } from "./handlers";
import type { JsonObject } from "@flowmaestro/shared";

interface ExecuteNodeInput {
    nodeType: string;
    nodeConfig: JsonObject;
    context: JsonObject;
    globalStore?: Map<string, JsonValue>;
    executionId: string;
    nodeId: string;
    userId?: string;
}

/**
 * Execute a single node by delegating to the appropriate handler.
 * This replaces the giant switch statement.
 */
export async function executeNode(input: ExecuteNodeInput): Promise<JsonObject> {
    const { nodeType, nodeConfig, context, globalStore, executionId, nodeId, userId } = input;

    // Build the execution context
    const executionContext: ExecutionContext = {
        executionId,
        nodeId,
        userId,
        variables: context,
        globalStore
    };

    // Delegate to the handler registry
    const result = await handlerRegistry.execute(nodeType, nodeConfig, executionContext);

    // If this is a control flow node, include the metadata for the orchestrator
    if (result.controlFlow) {
        return {
            ...result.output,
            __controlFlow: result.controlFlow // Special key for orchestrator
        };
    }

    return result.output;
}
```

---

## Phase 4: Control Flow in Orchestrator

### How Loop and Parallel Execution Works

The key insight is that loop and parallel nodes don't execute their children directly. Instead:

1. The handler returns **metadata** describing the loop/parallel structure
2. The orchestrator reads this metadata and executes children appropriately
3. Loop variables (`loop.index`, `loop.item`) are injected into the context

This separation allows the orchestrator to maintain proper state, emit progress events, and handle errors at the iteration level.

### 4.1 Loop Execution

Add loop handling to the orchestrator's node execution logic:

```typescript
// In orchestrator-workflow.ts, inside executeNodeAndDependents()

} else if (node.type === "loop") {
  // Execute the loop handler to get iteration metadata
  const loopResult = await executeNode({
    nodeType: node.type,
    nodeConfig: node.config,
    context,
    executionId,
    nodeId,
  });

  const controlFlow = loopResult.__controlFlow;

  if (controlFlow?.type === "loop" && controlFlow.metadata.shouldExecute) {
    const { iterations, items, itemVariable } = controlFlow.metadata;

    // Find edges that connect to the loop body vs completion path
    const bodyEdges = outgoingEdges.get(nodeId)?.filter(e => e.sourceHandle === "body") || [];
    const completeEdges = outgoingEdges.get(nodeId)?.filter(e => e.sourceHandle === "complete") || [];

    // Execute the loop body for each iteration
    for (let i = 0; i < iterations; i++) {
      // Inject loop variables into context
      // These can be referenced as ${loop.index}, ${loop.item}, etc.
      const loopContext = {
        ...context,
        [`loop.index`]: i,              // 0-based
        [`loop.iteration`]: i + 1,      // 1-based
        [`loop.total`]: iterations,
        [`loop.${itemVariable}`]: items?.[i],  // The current item
      };

      // Execute all nodes in the loop body with this iteration's context
      for (const edge of bodyEdges) {
        await executeNodeWithContext(edge.target, loopContext);
      }

      // Emit progress event
      await emitLoopProgress({ executionId, nodeId, iteration: i + 1, total: iterations });
    }

    // After all iterations, execute the completion path
    for (const edge of completeEdges) {
      await executeNodeAndDependents(edge.target);
    }
  }

  executedNodes.add(nodeId);
}
```

### 4.2 Parallel Execution

Parallel execution is similar but runs branches concurrently with controlled concurrency:

```typescript
} else if (node.type === "parallel") {
  const parallelResult = await executeNode({
    nodeType: node.type,
    nodeConfig: node.config,
    context,
    executionId,
    nodeId,
  });

  const controlFlow = parallelResult.__controlFlow;

  if (controlFlow?.type === "parallel") {
    const { branches, maxConcurrency } = controlFlow.metadata;

    const bodyEdges = outgoingEdges.get(nodeId)?.filter(e => e.sourceHandle === "body") || [];
    const mergeEdges = outgoingEdges.get(nodeId)?.filter(e => e.sourceHandle === "merge") || [];

    // Execute branches in batches to control concurrency
    // This prevents overwhelming external APIs
    const branchResults: JsonObject[] = [];

    for (let i = 0; i < branches.length; i += maxConcurrency) {
      const batch = branches.slice(i, i + maxConcurrency);

      // Execute this batch concurrently
      const batchPromises = batch.map(async (branch) => {
        // Inject parallel context variables
        const branchContext = {
          ...context,
          [`parallel.branchId`]: branch.id,
          [`parallel.branchIndex`]: branch.index,
          [`parallel.item`]: branch.item,  // For collection-based parallel
        };

        // Execute branch body
        let branchOutput: JsonObject = {};
        for (const edge of bodyEdges) {
          branchOutput = await executeNodeWithContext(edge.target, branchContext);
        }
        return branchOutput;
      });

      const results = await Promise.all(batchPromises);
      branchResults.push(...results);
    }

    // Store all branch results for use in the merge path
    // Accessible as ${parallelNodeId.results}
    context[`${nodeId}.results`] = branchResults;

    // Execute the merge path (nodes that combine results)
    for (const edge of mergeEdges) {
      await executeNodeAndDependents(edge.target);
    }
  }

  executedNodes.add(nodeId);
}
```

---

## Phase 5: Frontend Dynamic Rendering

### The Problem with Custom Config Components

Currently, every node type has a custom React component for its configuration UI:

- `LLMNodeConfig.tsx`
- `HTTPNodeConfig.tsx`
- `CodeNodeConfig.tsx`
- ... 14 more files

These components share a lot of patterns but can't be easily reused. Adding a new node means writing a new config component from scratch.

### The Solution: Schema-Driven UI

With node definitions containing `configFields`, we can **generate the config UI automatically**. The `DynamicFormRenderer` component reads the field definitions and renders the appropriate inputs.

This is exactly what SIM Studio does with their `SubBlockConfig` system. They have 39 reusable field types that can be composed into any node's config UI.

### 5.1 Dynamic Form Renderer

**New File:** `frontend/src/components/nodes/DynamicFormRenderer.tsx`

```typescript
import React from "react";
import { nodeRegistry } from "@flowmaestro/shared";
import type { FieldGroup, FieldDefinition } from "@flowmaestro/shared";

// Import reusable field components
import { ShortInput } from "./fields/ShortInput";
import { LongInput } from "./fields/LongInput";
import { Dropdown } from "./fields/Dropdown";
import { Slider } from "./fields/Slider";
import { CodeEditor } from "./fields/CodeEditor";
// ... other field components

interface DynamicFormRendererProps {
  nodeType: string;
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}

/**
 * Renders a node's configuration form based on its definition.
 * No custom component needed - the UI is generated from configFields.
 */
export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  nodeType,
  data,
  onUpdate,
}) => {
  const definition = nodeRegistry.get(nodeType);

  if (!definition) {
    return <div className="text-red-500">Unknown node type: {nodeType}</div>;
  }

  const handleFieldChange = (fieldId: string, value: unknown) => {
    onUpdate({ ...data, [fieldId]: value });
  };

  return (
    <div className="space-y-4">
      {definition.configFields.map((group) => (
        <FieldGroupRenderer
          key={group.id}
          group={group}
          data={data}
          onChange={handleFieldChange}
        />
      ))}
    </div>
  );
};

/**
 * Renders a collapsible group of fields.
 */
const FieldGroupRenderer: React.FC<{
  group: FieldGroup;
  data: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
}> = ({ group, data, onChange }) => {
  const [isCollapsed, setIsCollapsed] = React.useState(group.collapsed ?? false);

  return (
    <div className="border rounded-lg">
      <button
        className="w-full p-3 flex justify-between items-center"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h3 className="font-medium">{group.title}</h3>
        <ChevronIcon direction={isCollapsed ? "down" : "up"} />
      </button>

      {!isCollapsed && (
        <div className="p-3 pt-0 space-y-3">
          {group.description && (
            <p className="text-sm text-gray-500">{group.description}</p>
          )}
          {group.fields.map((field) => (
            <FieldRenderer
              key={field.id}
              field={field}
              value={data[field.id]}
              onChange={(value) => onChange(field.id, value)}
              allData={data}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Renders a single field based on its type.
 * Handles conditional visibility via dependsOn.
 */
const FieldRenderer: React.FC<{
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  allData: Record<string, unknown>;  // For dependsOn checks
}> = ({ field, value, onChange, allData }) => {
  // Check conditional visibility
  if (field.dependsOn) {
    const dependentValue = allData[field.dependsOn.field];
    if (dependentValue !== field.dependsOn.value) {
      return null;  // Hide this field
    }
  }

  // Render the appropriate component based on field type
  const commonProps = {
    label: field.label,
    description: field.description,
    placeholder: field.placeholder,
    required: field.required,
    value,
    onChange,
  };

  switch (field.type) {
    case "short-input":
      return <ShortInput {...commonProps} />;

    case "long-input":
      return <LongInput {...commonProps} rows={field.rows} />;

    case "dropdown":
      return <Dropdown {...commonProps} options={field.options || []} />;

    case "slider":
      return (
        <Slider
          {...commonProps}
          min={field.min}
          max={field.max}
          step={field.step}
        />
      );

    case "code":
      return <CodeEditor {...commonProps} language={field.language} />;

    case "checkbox":
      return <Checkbox {...commonProps} />;

    // ... other field types

    default:
      // Fallback to basic input for unknown types
      return <ShortInput {...commonProps} />;
  }
};
```

### 5.2 Updated NodeInspector

The NodeInspector now tries dynamic rendering first, falling back to custom components for complex cases:

```typescript
// In NodeInspector.tsx

import { DynamicFormRenderer } from "../../components/nodes/DynamicFormRenderer";
import { nodeRegistry } from "@flowmaestro/shared";

// Keep custom configs for nodes that need special UI
// (e.g., complex interactions, visual editors)
const customConfigs: Record<string, React.FC<ConfigProps>> = {
  // Only nodes that truly need custom UI go here
  // Most nodes can use dynamic rendering
};

const renderConfig = () => {
  // Check for custom config first (opt-out of dynamic rendering)
  const customConfig = customConfigs[node.type];
  if (customConfig) {
    return customConfig({ data: node.data, onUpdate: handleUpdate });
  }

  // Use dynamic rendering for registry-defined nodes
  if (nodeRegistry.has(node.type)) {
    return (
      <DynamicFormRenderer
        nodeType={node.type}
        data={node.data as Record<string, unknown>}
        onUpdate={handleUpdate}
      />
    );
  }

  return <div className="text-gray-500">No configuration available</div>;
};
```

### 5.3 Updated NodeLibrary

Replace the hardcoded node list with a registry lookup:

```typescript
// In NodeLibrary.tsx

import { nodeRegistry } from "@flowmaestro/shared";
import * as LucideIcons from "lucide-react";

const NodeLibrary: React.FC = () => {
    // Build the library from the registry
    // This automatically includes any new nodes added to the registry
    const nodeLibrary = useMemo(() => {
        return nodeRegistry.getAllMetadata().map((node) => ({
            type: node.type,
            label: node.name,
            icon: LucideIcons[node.icon as keyof typeof LucideIcons] || LucideIcons.Box,
            category: node.category,
            description: node.description
        }));
    }, []);

    // Group by category for the sidebar sections
    const groupedNodes = useMemo(() => {
        return {
            ai: nodeLibrary.filter((n) => n.category === "ai"),
            logic: nodeLibrary.filter((n) => n.category === "logic"),
            data: nodeLibrary.filter((n) => n.category === "data"),
            connect: nodeLibrary.filter((n) => n.category === "connect")
        };
    }, [nodeLibrary]);

    // ... rest of component using groupedNodes
};
```

---

## Phase 6: New Node Definitions

With the registry system in place, adding new nodes is straightforward. Here are the definitions for Loop and Parallel nodes:

### Loop Node

The Loop node supports four iteration modes inspired by SIM's implementation:

- **for**: Fixed number of iterations
- **forEach**: Iterate over an array
- **while**: Continue while condition is true
- **doWhile**: Execute at least once, then check condition

```typescript
export const loopNodeDefinition: NodeDefinition = {
    type: "loop",
    name: "Loop",
    description: "Iterate over items or repeat a fixed number of times",
    category: "logic",
    icon: "Repeat",
    isControlFlow: true,
    isAsync: false,
    configSchema: loopNodeSchema,
    configFields: [
        {
            id: "loop-config",
            title: "Loop Configuration",
            fields: [
                {
                    id: "loopType",
                    type: "dropdown",
                    label: "Loop Type",
                    required: true,
                    description: "How to determine iterations",
                    options: [
                        { value: "for", label: "For (fixed count)" },
                        { value: "forEach", label: "For Each (iterate array)" },
                        { value: "while", label: "While (condition)" },
                        { value: "doWhile", label: "Do While (condition)" }
                    ]
                },
                {
                    id: "iterations",
                    type: "short-input",
                    label: "Iterations",
                    description: "Number of times to repeat",
                    placeholder: "10",
                    dependsOn: { field: "loopType", value: "for" }
                },
                {
                    id: "arrayPath",
                    type: "variable-input",
                    label: "Array Variable",
                    description: "Variable containing the array to iterate",
                    placeholder: "${items}",
                    dependsOn: { field: "loopType", value: "forEach" }
                },
                {
                    id: "condition",
                    type: "short-input",
                    label: "Condition",
                    description: "Continue while this is true",
                    placeholder: "${counter} < 10",
                    dependsOn: { field: "loopType", value: "while" }
                },
                {
                    id: "itemVariable",
                    type: "short-input",
                    label: "Item Variable Name",
                    description: "Name for the current item variable",
                    defaultValue: "item"
                }
            ]
        }
    ],
    outputs: [
        {
            id: "index",
            label: "Current Index",
            type: "number",
            description: "0-based iteration index"
        },
        {
            id: "item",
            label: "Current Item",
            type: "any",
            description: "Current array item (forEach only)"
        },
        {
            id: "iteration",
            label: "Iteration",
            type: "number",
            description: "1-based iteration count"
        }
    ],
    defaultConfig: { loopType: "for", iterations: 5, itemVariable: "item" },
    handlerType: "loop"
};
```

### Parallel Node

The Parallel node executes branches concurrently with controlled concurrency:

```typescript
export const parallelNodeDefinition: NodeDefinition = {
    type: "parallel",
    name: "Parallel",
    description: "Execute branches concurrently for improved performance",
    category: "logic",
    icon: "GitBranch",
    isControlFlow: true,
    isAsync: false,
    configSchema: parallelNodeSchema,
    configFields: [
        {
            id: "parallel-config",
            title: "Parallel Configuration",
            fields: [
                {
                    id: "parallelType",
                    type: "dropdown",
                    label: "Parallel Type",
                    required: true,
                    description: "How to create parallel branches",
                    options: [
                        { value: "collection", label: "Over Collection (one branch per item)" },
                        { value: "count", label: "Fixed Count (N parallel branches)" }
                    ]
                },
                {
                    id: "collectionPath",
                    type: "variable-input",
                    label: "Collection Variable",
                    description: "Variable containing items to process in parallel",
                    placeholder: "${items}",
                    dependsOn: { field: "parallelType", value: "collection" }
                },
                {
                    id: "count",
                    type: "short-input",
                    label: "Number of Branches",
                    description: "How many parallel branches to create",
                    placeholder: "3",
                    dependsOn: { field: "parallelType", value: "count" }
                },
                {
                    id: "maxConcurrency",
                    type: "slider",
                    label: "Max Concurrency",
                    description: "Maximum branches running simultaneously (prevents API overload)",
                    min: 1,
                    max: 20,
                    defaultValue: 5
                }
            ]
        }
    ],
    outputs: [
        {
            id: "results",
            label: "All Branch Results",
            type: "array",
            description: "Array of results from all branches"
        },
        {
            id: "branchIndex",
            label: "Branch Index",
            type: "number",
            description: "Index of current branch (during execution)"
        },
        {
            id: "item",
            label: "Current Item",
            type: "any",
            description: "Current item (collection mode only)"
        }
    ],
    defaultConfig: { parallelType: "count", count: 3, maxConcurrency: 5 },
    handlerType: "parallel"
};
```

---

## Implementation Order

The phases build on each other. Here's the recommended order:

| Step | Phase   | Description                                           | Complexity | Dependencies |
| ---- | ------- | ----------------------------------------------------- | ---------- | ------------ |
| 1    | 1.1-1.2 | Create registry types and class                       | Low        | None         |
| 2    | 1.3-1.4 | Create 18 node definitions with schemas               | Medium     | Step 1       |
| 3    | 2.1-2.2 | Add validation utilities and orchestrator integration | Low        | Step 2       |
| 4    | 3.1-3.5 | Create handler pattern and migrate executors          | Medium     | Step 2       |
| 5    | 4.1-4.2 | Implement loop/parallel in orchestrator               | High       | Step 4       |
| 6    | 6.1-6.2 | Add loop/parallel node definitions                    | Low        | Step 5       |
| 7    | 5.1-5.3 | Frontend dynamic rendering                            | Medium     | Step 2       |

**Recommendation**: Steps 1-4 can be done as a single PR that modernizes the architecture without adding new features. Steps 5-6 add loop/parallel capability. Step 7 can be done independently once step 2 is complete.

---

## Testing Strategy

### Unit Tests

- **Node registry**: Registration, lookup, category filtering
- **Zod schemas**: Valid/invalid configs for each node type
- **Handler routing**: `canHandle()` returns correct results
- **Variable resolver**: All syntax variations (`${var}`, `${obj.prop}`, `${arr[0]}`)

### Integration Tests

- **Full workflow execution**: Execute multi-node workflow with new handler pattern
- **Loop variants**: Test for, forEach, while, doWhile with various configs
- **Parallel execution**: Verify concurrency limits, result aggregation
- **Nested control flow**: Loops containing parallels, parallels containing loops

### E2E Tests

- **Node creation**: Add loop/parallel nodes via UI, verify config form renders
- **Workflow execution**: Execute workflow with control flow, verify WebSocket events
- **Error handling**: Invalid configs show validation errors before execution

---

## Files Summary

### Create (~40 files)

**Shared Package (Node Registry)**:

- `shared/src/node-registry/types.ts`
- `shared/src/node-registry/registry.ts`
- `shared/src/node-registry/index.ts`
- `shared/src/node-registry/definitions/llm.ts`
- `shared/src/node-registry/definitions/http.ts`
- `shared/src/node-registry/definitions/code.ts`
- `shared/src/node-registry/definitions/transform.ts`
- `shared/src/node-registry/definitions/conditional.ts`
- `shared/src/node-registry/definitions/switch.ts`
- `shared/src/node-registry/definitions/loop.ts`
- `shared/src/node-registry/definitions/parallel.ts`
- `shared/src/node-registry/definitions/database.ts`
- `shared/src/node-registry/definitions/integration.ts`
- `shared/src/node-registry/definitions/variable.ts`
- `shared/src/node-registry/definitions/input.ts`
- `shared/src/node-registry/definitions/output.ts`
- `shared/src/node-registry/definitions/wait.ts`
- `shared/src/node-registry/definitions/kb-query.ts`
- `shared/src/node-registry/definitions/embeddings.ts`
- `shared/src/node-registry/definitions/vision.ts`
- `shared/src/node-registry/definitions/audio.ts`

**Backend (Handlers)**:

- `backend/src/temporal/activities/node-executors/validation.ts`
- `backend/src/temporal/activities/node-executors/handlers/types.ts`
- `backend/src/temporal/activities/node-executors/handlers/registry.ts`
- `backend/src/temporal/activities/node-executors/handlers/standard-handler.ts`
- `backend/src/temporal/activities/node-executors/handlers/loop-handler.ts`
- `backend/src/temporal/activities/node-executors/handlers/parallel-handler.ts`
- `backend/src/temporal/activities/node-executors/handlers/conditional-handler.ts`
- `backend/src/temporal/activities/node-executors/handlers/index.ts`

**Frontend (Dynamic UI)**:

- `frontend/src/components/nodes/DynamicFormRenderer.tsx`
- `frontend/src/components/nodes/fields/ShortInput.tsx`
- `frontend/src/components/nodes/fields/LongInput.tsx`
- `frontend/src/components/nodes/fields/Dropdown.tsx`
- `frontend/src/components/nodes/fields/Slider.tsx`
- `frontend/src/components/nodes/fields/Checkbox.tsx`
- `frontend/src/components/nodes/fields/CodeEditor.tsx`
- `frontend/src/components/nodes/fields/ConnectionSelector.tsx`
- `frontend/src/components/nodes/fields/ModelSelector.tsx`
- `frontend/src/components/nodes/fields/VariableInput.tsx`
- `frontend/src/components/nodes/fields/KeyValueEditor.tsx`

### Modify (~8 files)

- `shared/src/index.ts` - Export node registry
- `backend/src/temporal/workflows/orchestrator-workflow.ts` - Add validation, loop/parallel handling
- `backend/src/temporal/activities/node-executors/index.ts` - Use handler registry
- `frontend/src/canvas/panels/NodeInspector.tsx` - Use dynamic rendering
- `frontend/src/canvas/panels/NodeLibrary.tsx` - Use registry for node list

---

## Key Learnings from SIM Studio

1. **Block Registry Pattern** - Centralizing node definitions enables:
    - Single source of truth for each node type
    - Easy addition of new nodes (one file)
    - Type-safe configuration across frontend and backend

2. **SubBlock UI System** - 39 reusable UI component types (we start with 11) means:
    - No custom config components for most nodes
    - Consistent look and feel
    - Faster development of new nodes

3. **Handler Pattern** - Specialized handlers with `canHandle()` routing provides:
    - Clean separation between standard and control flow nodes
    - Extensibility without modifying core code
    - Better testability (handlers can be tested in isolation)

4. **Variable Reference System** - Clean syntax like `<blockId.output>` for:
    - Explicit data flow between nodes
    - Support for nested access and array indices
    - Special context variables (`loop.index`, `parallel.item`)

5. **Control Flow** - Full for/forEach/while/doWhile loops + parallel execution:
    - Orchestrator handles iteration, not the node
    - Proper context injection for each iteration
    - Concurrency control for parallel branches

6. **Integration Breadth** - SIM has 127+ tools, 16+ LLM providers, showing:
    - The registry pattern scales to large numbers of nodes
    - Provider abstraction makes adding new integrations straightforward
    - Good architecture enables rapid feature expansion
