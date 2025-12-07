# Phase 25: Subflows

## Overview

Enable complete workflows to be embedded as nodes within other workflows, allowing workflow reuse and composition at scale.

---

## Prerequisites

- **Phase 24**: Custom Nodes (similar composition pattern)
- **Phase 06**: Flow Control Nodes (Input/Output nodes define interface)

---

## Existing Infrastructure

### Workflow Repository

**File**: `backend/src/storage/repositories/WorkflowRepository.ts`

```typescript
export class WorkflowRepository {
    async create(input: CreateWorkflowInput): Promise<WorkflowModel>;
    async findById(id: string): Promise<WorkflowModel | null>;
    async findByUserId(
        userId: string,
        options?
    ): Promise<{ workflows: WorkflowModel[]; total: number }>;
    async update(id: string, input: UpdateWorkflowInput): Promise<WorkflowModel | null>;
}

// Add interface and is_subflow fields to support subflow functionality
```

### Orchestrator Workflow

**File**: `backend/src/temporal/workflows/orchestrator-workflow.ts`

```typescript
import { proxyActivities } from "@temporalio/workflow";
import type { WorkflowDefinition, JsonObject } from "@flowmaestro/shared";

export interface OrchestratorInput {
    executionId: string;
    workflowDefinition: WorkflowDefinition;
    inputs?: JsonObject;
    userId?: string;
}

export async function orchestratorWorkflow(input: OrchestratorInput): Promise<OrchestratorResult>;

// Subflows execute as Temporal child workflows using this orchestrator
```

### Temporal Child Workflows

```typescript
// Use Temporal's executeChild for proper parent-child workflow relationship
import { executeChild } from "@temporalio/workflow";

// Child workflows:
// - Inherit parent workflow's trace context
// - Can be cancelled when parent is cancelled
// - Support timeout and retry policies
// - Return results to parent workflow
```

### Node Registry

**File**: `backend/src/shared/registry/node-registry.ts`

```typescript
// Subflow nodes are dynamically registered based on workflows marked as subflows
// Node type: "subflow-{workflowId}"
// Category: "subflow"
```

---

## Deliverables (No Nodes)

| Item              | Description                        |
| ----------------- | ---------------------------------- |
| Subflow Interface | Define workflow inputs/outputs     |
| Subflow Node      | Embed workflow as a node           |
| Subflow Execution | Run embedded workflow via Temporal |

---

## Subflow Concept

Subflows are complete workflows that can be called from other workflows:

```
┌─────────────────────────────────────────────────────────────────┐
│ Subflow: "Manager Approval"                                     │
├─────────────────────────────────────────────────────────────────┤
│ Inputs:                                                         │
│ - request_type: string                                          │
│ - requester: string                                             │
│ - details: object                                               │
│                                                                 │
│ Full Workflow:                                                  │
│ ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │
│ │ Send Request │───▶│ Approval     │───▶│ Notify       │        │
│ │ Email        │    │ Gate         │    │ Result       │        │
│ └──────────────┘    └──────────────┘    └──────────────┘        │
│                                                                 │
│ Output: { approved: boolean, approver: string, timestamp }      │
└─────────────────────────────────────────────────────────────────┘
```

Usage in different workflows:

```
Expense Workflow:
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Webhook     │───▶│ Manager      │───▶│ QuickBooks  │
│ (expense)   │    │ Approval     │    │ (if approved│
│             │    │ [Subflow]    │    │             │
└─────────────┘    └──────────────┘    └─────────────┘

PTO Workflow:
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Slack /pto  │───▶│ Manager      │───▶│ BambooHR    │
│             │    │ Approval     │    │ (if approved│
│             │    │ [Subflow]    │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
```

---

## Data Model

```typescript
// Subflows use existing Workflow type with interface metadata

export interface WorkflowInterface {
    inputs: Array<{
        name: string;
        type: string;
        required: boolean;
        description?: string;
    }>;
    outputs: Array<{
        name: string;
        type: string;
        description?: string;
    }>;
}

// Workflows can be marked as "usable as subflow"
export interface Workflow {
    // ... existing fields
    interface?: WorkflowInterface;
    isSubflow: boolean;
}
```

---

## Unit Tests

### Test Pattern

**Pattern A (Pure Logic)**: Test subflow execution, input/output mapping, and interface validation.

### Files to Create

| Component        | Test File                                                             | Pattern |
| ---------------- | --------------------------------------------------------------------- | ------- |
| SubflowExecutor  | `backend/tests/unit/node-executors/subflows/subflow-executor.test.ts` | A       |
| SubflowInterface | `backend/tests/unit/subflows/subflow-interface.test.ts`               | A       |

### Required Test Cases

#### subflow-executor.test.ts

- `should execute referenced workflow as child`
- `should map inputs to subflow context`
- `should return outputs to parent context`
- `should handle subflow errors`
- `should support recursive subflows (with depth limit)`
- `should track execution hierarchy`

#### subflow-interface.test.ts

- `should validate input schema compliance`
- `should validate output schema compliance`
- `should detect version mismatches`
- `should generate interface from workflow`
- `should support optional inputs with defaults`

---

## Test Workflow: Approval Reuse

```
Parent Workflow (Expense Request):
┌─────────────┐    ┌────────────────────┐    ┌─────────────┐
│ Webhook     │───▶│ Manager Approval   │───▶│ Router      │
│             │    │ [Subflow]          │    │             │
│ expense:    │    │                    │    │ approved?   │
│ $500        │    │ Input: expense     │    │             │
└─────────────┘    │ Output: approved   │    └─────────────┘
                   └────────────────────┘          │
                                             ┌─────┴─────┐
                                             ▼           ▼
                                          ┌─────┐    ┌─────┐
                                          │ Yes │    │ No  │
                                          └─────┘    └─────┘
```

**Test**: Create approval subflow → Use in expense workflow → Verify subflow executes

---

## Files to Create

### Frontend

```
frontend/src/canvas/nodes/subflow/
├── SubflowNode.tsx
├── SubflowNodeConfig.tsx
└── index.ts

frontend/src/components/workflow/
└── WorkflowInterfaceEditor.tsx
```

### Backend

```
backend/src/temporal/activities/
└── subflow-executor.ts

backend/src/api/routes/workflows/
└── interface.ts  (add endpoint)
```

---

## Database Schema

```sql
-- backend/migrations/XXXXXXXXXX_add-subflow-support.sql

-- Add interface column to workflows for subflows
ALTER TABLE flowmaestro.workflows ADD COLUMN IF NOT EXISTS interface JSONB;
ALTER TABLE flowmaestro.workflows ADD COLUMN IF NOT EXISTS is_subflow BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_workflows_subflow ON flowmaestro.workflows(user_id, is_subflow)
WHERE deleted_at IS NULL AND is_subflow = TRUE;

-- Comment on columns
COMMENT ON COLUMN flowmaestro.workflows.interface IS 'Input/output schema for workflows used as subflows';
COMMENT ON COLUMN flowmaestro.workflows.is_subflow IS 'Whether this workflow can be embedded in other workflows';
```

---

## Complete TypeScript Interfaces

```typescript
// shared/src/types/workflow.ts (extend existing types)

export interface WorkflowInterfaceField {
    name: string;
    type: "string" | "number" | "boolean" | "object" | "array" | "any";
    required: boolean;
    description?: string;
    default?: unknown;
}

export interface WorkflowInterface {
    inputs: WorkflowInterfaceField[];
    outputs: WorkflowInterfaceField[];
}

// Extend existing WorkflowModel
export interface WorkflowModel {
    id: string;
    name: string;
    description: string | null;
    definition: WorkflowDefinition;
    userId: string;
    version: number;
    aiGenerated: boolean;
    aiPrompt: string | null;
    // New subflow fields
    interface?: WorkflowInterface;
    isSubflow: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// shared/src/types/subflow.ts

export interface SubflowNodeConfig {
    workflowId: string;
    inputMappings: Record<string, string | { type: "static"; value: unknown }>;
    outputVariable?: string;
}

export interface SubflowNodeData {
    workflowId: string;
    workflowName: string;
    workflowInterface: WorkflowInterface;
    inputMappings: Record<string, unknown>;
}

export interface SubflowExecutionResult {
    success: boolean;
    outputs: Record<string, unknown>;
    executionId: string;
    duration: number;
    error?: string;
}
```

---

## Backend Repository Updates

```typescript
// backend/src/storage/repositories/WorkflowRepository.ts (additions)

export class WorkflowRepository {
    // Existing methods...

    /**
     * Find all workflows that can be used as subflows
     */
    async findSubflows(
        userId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{ workflows: WorkflowModel[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const [countResult, workflowsResult] = await Promise.all([
            db.query<{ count: string }>(
                `
                SELECT COUNT(*) as count
                FROM flowmaestro.workflows
                WHERE user_id = $1 AND is_subflow = TRUE AND deleted_at IS NULL
            `,
                [userId]
            ),
            db.query<WorkflowRow>(
                `
                SELECT * FROM flowmaestro.workflows
                WHERE user_id = $1 AND is_subflow = TRUE AND deleted_at IS NULL
                ORDER BY name ASC
                LIMIT $2 OFFSET $3
            `,
                [userId, limit, offset]
            )
        ]);

        return {
            workflows: workflowsResult.rows.map((row) => this.mapRow(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * Enable/disable workflow as subflow
     */
    async setSubflowStatus(
        id: string,
        isSubflow: boolean,
        workflowInterface?: WorkflowInterface
    ): Promise<WorkflowModel | null> {
        const result = await db.query<WorkflowRow>(
            `
            UPDATE flowmaestro.workflows
            SET is_subflow = $2,
                interface = $3,
                updated_at = NOW()
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING *
        `,
            [id, isSubflow, workflowInterface ? JSON.stringify(workflowInterface) : null]
        );

        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    // Update mapRow to include new fields
    private mapRow(row: WorkflowRow): WorkflowModel {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            definition:
                typeof row.definition === "string" ? JSON.parse(row.definition) : row.definition,
            userId: row.user_id,
            version: row.version,
            aiGenerated: row.ai_generated,
            aiPrompt: row.ai_prompt,
            interface: row.interface
                ? typeof row.interface === "string"
                    ? JSON.parse(row.interface)
                    : row.interface
                : undefined,
            isSubflow: row.is_subflow ?? false,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
}
```

---

## Subflow Executor

```typescript
// backend/src/temporal/activities/node-executors/subflow-executor.ts

import type { JsonObject, WorkflowDefinition } from "@flowmaestro/shared";
import { WorkflowRepository } from "../../storage/repositories/WorkflowRepository";
import { executeChild } from "@temporalio/workflow";
import type { SubflowNodeConfig, SubflowExecutionResult } from "@flowmaestro/shared";

const workflowRepo = new WorkflowRepository();

export async function executeSubflowNode(
    config: SubflowNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const { workflowId, inputMappings } = config;
    const startTime = Date.now();

    // Load subflow workflow
    const workflow = await workflowRepo.findById(workflowId);
    if (!workflow) {
        throw new Error(`Subflow workflow ${workflowId} not found`);
    }

    if (!workflow.isSubflow) {
        throw new Error(`Workflow ${workflowId} is not enabled as a subflow`);
    }

    if (!workflow.interface) {
        throw new Error(`Subflow ${workflowId} has no interface defined`);
    }

    // Build input values from mappings
    const inputValues: JsonObject = {};
    for (const inputDef of workflow.interface.inputs) {
        const mapping = inputMappings[inputDef.name];

        if (mapping === undefined) {
            if (inputDef.required && inputDef.default === undefined) {
                throw new Error(
                    `Required input "${inputDef.name}" not mapped for subflow "${workflow.name}"`
                );
            }
            inputValues[inputDef.name] = inputDef.default;
            continue;
        }

        // Handle static vs. dynamic mappings
        if (typeof mapping === "object" && mapping !== null && "type" in mapping) {
            if ((mapping as { type: string }).type === "static") {
                inputValues[inputDef.name] = (mapping as { value: unknown }).value;
            }
        } else {
            // Dynamic mapping - resolve from context
            inputValues[inputDef.name] = resolveMapping(context, mapping as string);
        }
    }

    // Generate unique execution ID for child workflow
    const parentExecutionId = (context.executionId as string) || "unknown";
    const nodeId = (context.nodeId as string) || "subflow";
    const childExecutionId = `${parentExecutionId}-subflow-${workflowId}-${nodeId}-${Date.now()}`;

    // Execute subflow as Temporal child workflow
    const result = await executeChild("orchestratorWorkflow", {
        workflowId: childExecutionId,
        args: [
            {
                executionId: childExecutionId,
                workflowDefinition: workflow.definition,
                inputs: inputValues,
                userId: context.userId as string,
                parentContext: {
                    workflowId: parentExecutionId,
                    nodeId
                }
            }
        ],
        // Child workflow options
        taskQueue: "workflow-orchestrator",
        // Inherit parent cancellation
        cancellationType: "WAIT_CANCELLATION_COMPLETED",
        // Allow parent to continue if child fails
        parentClosePolicy: "REQUEST_CANCEL"
    });

    const duration = Date.now() - startTime;

    if (!result.success) {
        throw new Error(`Subflow "${workflow.name}" failed: ${result.error}`);
    }

    // Map outputs according to interface
    const outputs: Record<string, unknown> = {};
    for (const outputDef of workflow.interface.outputs) {
        if (outputDef.name in result.outputs) {
            outputs[outputDef.name] = result.outputs[outputDef.name];
        }
    }

    const executionResult: SubflowExecutionResult = {
        success: true,
        outputs,
        executionId: childExecutionId,
        duration
    };

    if (config.outputVariable) {
        return { [config.outputVariable]: executionResult } as unknown as JsonObject;
    }

    // Return outputs directly to parent context
    return {
        ...outputs,
        _subflow: {
            executionId: childExecutionId,
            duration,
            workflowName: workflow.name
        }
    } as unknown as JsonObject;
}

function resolveMapping(context: JsonObject, path: string): unknown {
    if (!path) return undefined;

    // Handle special prefixes
    if (path.startsWith("$.")) {
        path = path.substring(2);
    }

    return path.split(".").reduce((current, key) => {
        if (current === null || current === undefined) return undefined;
        if (typeof current !== "object") return undefined;
        return (current as Record<string, unknown>)[key];
    }, context as unknown);
}
```

---

## API Routes

```typescript
// backend/src/api/routes/workflows/interface.ts

import type { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { WorkflowRepository } from "../../../storage/repositories/WorkflowRepository";

const interfaceFieldSchema = z.object({
    name: z.string().min(1).max(50),
    type: z.enum(["string", "number", "boolean", "object", "array", "any"]),
    required: z.boolean(),
    description: z.string().optional(),
    default: z.unknown().optional()
});

const setSubflowSchema = z.object({
    isSubflow: z.boolean(),
    interface: z
        .object({
            inputs: z.array(interfaceFieldSchema),
            outputs: z.array(interfaceFieldSchema)
        })
        .optional()
});

export async function setWorkflowSubflowHandler(
    request: FastifyRequest<{ Params: { workflowId: string } }>,
    reply: FastifyReply
): Promise<void> {
    const { workflowId } = request.params;
    const body = setSubflowSchema.parse(request.body);
    const userId = request.user.id;

    const workflowRepo = new WorkflowRepository();

    // Verify ownership
    const workflow = await workflowRepo.findById(workflowId);
    if (!workflow) {
        return reply.code(404).send({ success: false, error: "Workflow not found" });
    }

    if (workflow.userId !== userId) {
        return reply.code(403).send({ success: false, error: "Access denied" });
    }

    // Validate interface if enabling as subflow
    if (body.isSubflow && !body.interface) {
        return reply.code(400).send({
            success: false,
            error: "Interface definition required when enabling as subflow"
        });
    }

    const updated = await workflowRepo.setSubflowStatus(workflowId, body.isSubflow, body.interface);

    reply.send({
        success: true,
        data: updated
    });
}

// backend/src/api/routes/workflows/subflows.ts

export async function listSubflowsHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user.id;
    const { limit, offset } = request.query as { limit?: number; offset?: number };

    const workflowRepo = new WorkflowRepository();
    const result = await workflowRepo.findSubflows(userId, { limit, offset });

    reply.send({
        success: true,
        data: result.workflows.map((w) => ({
            id: w.id,
            name: w.name,
            description: w.description,
            interface: w.interface,
            version: w.version,
            updatedAt: w.updatedAt
        })),
        pagination: {
            total: result.total,
            limit: limit || 50,
            offset: offset || 0
        }
    });
}
```

---

## Frontend Components

```typescript
// frontend/src/components/workflow/WorkflowInterfaceEditor.tsx

import React from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import type { WorkflowInterface, WorkflowInterfaceField } from "@flowmaestro/shared";

interface WorkflowInterfaceEditorProps {
    value: WorkflowInterface;
    onChange: (value: WorkflowInterface) => void;
}

export const WorkflowInterfaceEditor: React.FC<WorkflowInterfaceEditorProps> = ({
    value,
    onChange
}) => {
    const addInput = () => {
        onChange({
            ...value,
            inputs: [...value.inputs, { name: "", type: "string", required: false }]
        });
    };

    const addOutput = () => {
        onChange({
            ...value,
            outputs: [...value.outputs, { name: "", type: "string", required: false }]
        });
    };

    const updateInput = (index: number, field: Partial<WorkflowInterfaceField>) => {
        const newInputs = [...value.inputs];
        newInputs[index] = { ...newInputs[index], ...field };
        onChange({ ...value, inputs: newInputs });
    };

    const updateOutput = (index: number, field: Partial<WorkflowInterfaceField>) => {
        const newOutputs = [...value.outputs];
        newOutputs[index] = { ...newOutputs[index], ...field };
        onChange({ ...value, outputs: newOutputs });
    };

    const removeInput = (index: number) => {
        onChange({ ...value, inputs: value.inputs.filter((_, i) => i !== index) });
    };

    const removeOutput = (index: number) => {
        onChange({ ...value, outputs: value.outputs.filter((_, i) => i !== index) });
    };

    return (
        <div className="space-y-6">
            {/* Inputs Section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium">Inputs</Label>
                    <Button size="sm" variant="outline" onClick={addInput}>
                        <Plus className="h-4 w-4 mr-1" /> Add Input
                    </Button>
                </div>
                <div className="space-y-2">
                    {value.inputs.map((input, index) => (
                        <InterfaceFieldRow
                            key={index}
                            field={input}
                            onChange={(field) => updateInput(index, field)}
                            onRemove={() => removeInput(index)}
                        />
                    ))}
                    {value.inputs.length === 0 && (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            No inputs defined
                        </p>
                    )}
                </div>
            </div>

            {/* Outputs Section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium">Outputs</Label>
                    <Button size="sm" variant="outline" onClick={addOutput}>
                        <Plus className="h-4 w-4 mr-1" /> Add Output
                    </Button>
                </div>
                <div className="space-y-2">
                    {value.outputs.map((output, index) => (
                        <InterfaceFieldRow
                            key={index}
                            field={output}
                            onChange={(field) => updateOutput(index, field)}
                            onRemove={() => removeOutput(index)}
                        />
                    ))}
                    {value.outputs.length === 0 && (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            No outputs defined
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

const InterfaceFieldRow: React.FC<{
    field: WorkflowInterfaceField;
    onChange: (field: Partial<WorkflowInterfaceField>) => void;
    onRemove: () => void;
}> = ({ field, onChange, onRemove }) => (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
        <Input
            value={field.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Field name"
            className="flex-1"
        />
        <Select value={field.type} onValueChange={(type) => onChange({ type: type as WorkflowInterfaceField["type"] })}>
            <SelectTrigger className="w-28">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="string">String</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="object">Object</SelectItem>
                <SelectItem value="array">Array</SelectItem>
                <SelectItem value="any">Any</SelectItem>
            </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
            <Switch
                checked={field.required}
                onCheckedChange={(required) => onChange({ required })}
            />
            <Label className="text-xs">Req</Label>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
    </div>
);
```

---

## Subflow Node Component

```typescript
// frontend/src/canvas/nodes/subflow/SubflowNode.tsx
export const SubflowNode: React.FC<NodeProps<SubflowNodeData>> = (props) => {
    const { id, data } = props;

    return (
        <>
            <BaseNode
                {...props}
                data={{
                    icon: "GitBranch",
                    label: data.workflowName || "Subflow",
                    category: "subflow",
                    configPreview: data.workflowInterface ? (
                        <span className="text-xs">
                            {data.workflowInterface.inputs.length} in →{" "}
                            {data.workflowInterface.outputs.length} out
                        </span>
                    ) : (
                        <span className="text-muted-foreground">Select workflow</span>
                    ),
                    inputs: data.workflowInterface?.inputs || [],
                    outputs: data.workflowInterface?.outputs || []
                }}
            />
            <NodeConfigWrapper nodeId={id} title="Subflow" category="subflow">
                <SubflowNodeConfig nodeId={id} data={data} />
            </NodeConfigWrapper>
        </>
    );
};
```

---

## Subflow Executor

```typescript
// backend/src/temporal/activities/subflow-executor.ts
export async function executeSubflow(
    context: ActivityContext,
    config: SubflowExecutionConfig
): Promise<ActivityContext> {
    const { workflowId, inputValues } = config;

    // Load subflow workflow
    const workflow = await WorkflowRepository.findById(workflowId);
    if (!workflow || !workflow.isSubflow) {
        throw new Error(`Subflow ${workflowId} not found`);
    }

    // Start subflow as child workflow in Temporal
    const childHandle = await startChild("executeWorkflow", {
        workflowId: `${context.workflowId}-subflow-${workflowId}-${Date.now()}`,
        args: [
            {
                workflowDefinitionId: workflowId,
                inputVariables: inputValues,
                parentContext: {
                    workflowId: context.workflowId,
                    nodeId: config.nodeId
                }
            }
        ]
    });

    // Wait for subflow completion
    const result = await childHandle.result();

    // Return subflow outputs
    return {
        ...context,
        variables: {
            ...context.variables,
            ...result.outputs
        }
    };
}
```

---

## How to Deliver

1. Add migration for interface and is_subflow columns on workflows
2. Create WorkflowInterfaceEditor component
3. Add "Enable as Subflow" toggle in workflow settings
4. Create SubflowNode component
5. Create SubflowNodeConfig with workflow selector
6. Add "Subflows" section to Node Library
7. Implement subflow-executor using Temporal child workflows
8. Handle subflow input/output mapping
9. Test subflow creation and interface definition
10. Test subflow embedding and execution

---

## How to Test

| Test                       | Expected Result                 |
| -------------------------- | ------------------------------- |
| Enable workflow as subflow | is_subflow flag set             |
| Define interface inputs    | Input schema saved              |
| Define interface outputs   | Output schema saved             |
| Subflow in library         | Shows under "Subflows" section  |
| Drag to parent workflow    | Node shows with interface       |
| Configure input mapping    | Values map from parent context  |
| Execute subflow            | Child workflow runs in Temporal |
| Subflow completion         | Outputs returned to parent      |
| Nested subflows            | Subflow can call other subflows |

### Integration Tests

```typescript
describe("Subflow", () => {
    it("marks workflow as subflow", async () => {
        const result = await api.updateWorkflow(workflowId, {
            isSubflow: true,
            interface: {
                inputs: [{ name: "request", type: "object", required: true }],
                outputs: [{ name: "approved", type: "boolean" }]
            }
        });
        expect(result.isSubflow).toBe(true);
    });

    it("executes subflow as child workflow", async () => {
        const result = await executeWorkflow({
            nodes: [
                { type: "input", data: { request: { amount: 500 } } },
                { type: `subflow-${approvalWorkflowId}`, data: {} },
                { type: "output" }
            ]
        });
        expect(result.outputs.approved).toBeDefined();
    });

    it("handles nested subflows", async () => {
        // Parent → Subflow A → Subflow B
        const result = await executeWorkflow(nestedSubflowWorkflow);
        expect(result.success).toBe(true);
    });
});
```

---

## Acceptance Criteria

- [ ] User can mark workflow as "usable as subflow"
- [ ] User can define workflow interface (inputs/outputs)
- [ ] Interface editor validates required fields
- [ ] Subflows appear in Node Library under "Subflows"
- [ ] Subflow node shows input/output interface from definition
- [ ] Subflow node allows mapping inputs from parent context
- [ ] Subflow executes as Temporal child workflow
- [ ] Subflow outputs are available in parent workflow
- [ ] Subflow errors propagate to parent correctly
- [ ] Nested subflows work (subflow calling subflow)
- [ ] Subflow versioning handled correctly

---

## Real-Life Example: Manager Approval Subflow

**Business Need**: Multiple workflows need consistent manager approval

**Subflow Interface**:

- Name: "Manager Approval"
- Inputs: request_type, requester_name, requester_email, details, amount
- Outputs: approved, approver_name, decision_timestamp, comments

**Internal Workflow**:

```
Input → Transform (build message) → Slack (notify) → Approval Gate → Output
```

**Usage**:

- Expense workflow: Uses subflow for expense approvals
- PTO workflow: Uses same subflow for time off requests
- Purchase workflow: Uses same subflow for purchase orders

**Impact**: Single place to update approval logic, consistent behavior across all request types

---

## Dependencies

This is the final phase. It enables powerful workflow composition and reuse patterns.
