# Phase 24: Custom Nodes

## Overview

Enable users to create reusable custom nodes that encapsulate multiple workflow steps into a single drag-and-drop component.

---

## Prerequisites

- **Phase 06**: Flow Control Nodes (custom nodes wrap other nodes)
- **Phase 05**: Node Library (custom nodes appear in library)
- **Phase 23**: Additional Integrations (all node types available)

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

// Custom nodes store their internal workflow similar to workflow definitions
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

// Custom node execution reuses this orchestrator with the internal workflow definition
```

### Node Executor Pattern

**File**: `backend/src/temporal/activities/index.ts`

```typescript
// All node types are executed via executeNode activity
// Custom node executor dispatches to orchestratorWorkflow with internal definition

export async function executeNode(
    executionId: string,
    node: WorkflowNode,
    context: JsonObject
): Promise<JsonObject>;
```

### Node Library Store

**File**: `frontend/src/stores/nodeLibraryStore.ts`

```typescript
// Custom nodes will be added to the node library under "Custom" category
// Need to fetch user's custom nodes and merge with built-in nodes
```

### BaseNode Component

**File**: `frontend/src/canvas/nodes/BaseNode.tsx`

```typescript
// Custom nodes use BaseNode with "custom" category styling
// Shows special badge indicating it's a user-created node
```

---

## Deliverables (No Nodes)

| Item                  | Description                            |
| --------------------- | -------------------------------------- |
| Custom Node Creator   | UI to define custom nodes              |
| Custom Node Library   | Display user's custom nodes in sidebar |
| Custom Node Execution | Run custom node's internal flow        |

---

## Custom Node Concept

Custom nodes encapsulate multiple workflow steps into a single reusable node:

```
┌─────────────────────────────────────────────────────────────────┐
│ Custom Node: "Enrich Company"                                   │
├─────────────────────────────────────────────────────────────────┤
│ Inputs: domain (string)                                         │
│                                                                 │
│ Internal Flow:                                                  │
│ ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │
│ │ HTTP         │───▶│ HTTP         │───▶│ Ask AI       │        │
│ │ (Clearbit)   │    │ (LinkedIn)   │    │ (summarize)  │        │
│ └──────────────┘    └──────────────┘    └──────────────┘        │
│                                                                 │
│ Outputs: { name, industry, size, funding, summary }             │
└─────────────────────────────────────────────────────────────────┘
```

When used:

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Webhook     │───▶│ Enrich       │───▶│ Salesforce  │
│ (signup)    │    │ Company      │    │ Create Lead │
│             │    │ [Custom]     │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
```

---

## Data Model

```typescript
// shared/src/types/custom-node.ts
export interface CustomNodeDefinition {
    id: string;
    userId: string;
    name: string;
    description: string;
    icon: string;
    color?: string;

    // Input/Output interface
    inputs: Array<{
        name: string;
        type: "string" | "number" | "boolean" | "object" | "array" | "any";
        required: boolean;
        default?: unknown;
        description?: string;
    }>;
    outputs: Array<{
        name: string;
        type: string;
        description?: string;
    }>;

    // Internal implementation
    internalWorkflow: {
        nodes: WorkflowNode[];
        edges: WorkflowEdge[];
    };

    // Mappings
    inputMappings: Record<string, string>;
    outputMappings: Record<string, string>;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    version: number;
    isPublished: boolean;
}
```

---

## Test Workflow: Company Enrichment

```
┌─────────────┐    ┌────────────────────┐    ┌─────────────┐
│ Input       │───▶│ Enrich Company     │───▶│ Output      │
│             │    │ [Custom Node]      │    │             │
│ domain:     │    │                    │    │ enriched    │
│ "acme.com"  │    │ Internal:          │    │ data        │
└─────────────┘    │ HTTP → HTTP → AI   │    └─────────────┘
                   └────────────────────┘
```

**Test**: Create custom node → Use in workflow → Verify internal flow executes

---

## Files to Create

### Frontend

```
frontend/src/canvas/nodes/custom/
├── CustomNodeNode.tsx
├── CustomNodeConfig.tsx
└── index.ts

frontend/src/pages/
├── CustomNodeCreator.tsx
└── CustomNodeList.tsx

frontend/src/components/
└── InterfaceFieldList.tsx
```

### Backend

```
backend/src/storage/
├── repositories/
│   └── CustomNodeRepository.ts
└── models/
    └── CustomNode.ts

backend/src/temporal/activities/
└── custom-node-executor.ts

backend/src/api/routes/custom-nodes/
├── create.ts
├── list.ts
├── get.ts
├── update.ts
└── delete.ts
```

---

## Database Schema

```sql
-- backend/migrations/XXXXXXXXXX_create-custom-nodes.sql

CREATE TABLE IF NOT EXISTS flowmaestro.custom_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'Box',
    color VARCHAR(20),
    inputs JSONB NOT NULL DEFAULT '[]',
    outputs JSONB NOT NULL DEFAULT '[]',
    internal_workflow JSONB NOT NULL,
    input_mappings JSONB NOT NULL DEFAULT '{}',
    output_mappings JSONB NOT NULL DEFAULT '{}',
    version INTEGER NOT NULL DEFAULT 1,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_custom_nodes_user ON flowmaestro.custom_nodes(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_custom_nodes_published ON flowmaestro.custom_nodes(is_published) WHERE deleted_at IS NULL;
```

---

## Complete TypeScript Interfaces

```typescript
// shared/src/types/custom-node.ts

import type { WorkflowNode, WorkflowEdge } from "./workflow";

export interface CustomNodeField {
    name: string;
    type: "string" | "number" | "boolean" | "object" | "array" | "any";
    required: boolean;
    default?: unknown;
    description?: string;
    validation?: {
        pattern?: string;
        min?: number;
        max?: number;
        enum?: unknown[];
    };
}

export interface CustomNodeDefinition {
    id: string;
    userId: string;
    name: string;
    description: string;
    icon: string;
    color?: string;

    // Input/Output interface
    inputs: CustomNodeField[];
    outputs: CustomNodeField[];

    // Internal implementation
    internalWorkflow: {
        nodes: Record<string, WorkflowNode>;
        edges: WorkflowEdge[];
    };

    // Mappings from custom node inputs to internal node variables
    inputMappings: Record<string, string>; // { "domain": "input_0.domain" }
    // Mappings from internal node outputs to custom node outputs
    outputMappings: Record<string, string>; // { "enriched": "transform_1.result" }

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    version: number;
    isPublished: boolean;
}

export interface CreateCustomNodeInput {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    inputs: CustomNodeField[];
    outputs: CustomNodeField[];
    internalWorkflow: CustomNodeDefinition["internalWorkflow"];
    inputMappings: Record<string, string>;
    outputMappings: Record<string, string>;
}

export interface UpdateCustomNodeInput {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    inputs?: CustomNodeField[];
    outputs?: CustomNodeField[];
    internalWorkflow?: CustomNodeDefinition["internalWorkflow"];
    inputMappings?: Record<string, string>;
    outputMappings?: Record<string, string>;
    isPublished?: boolean;
}
```

---

## Backend Repository

```typescript
// backend/src/storage/repositories/CustomNodeRepository.ts

import type { JsonValue } from "@flowmaestro/shared";
import { db } from "../database";
import type {
    CustomNodeDefinition,
    CreateCustomNodeInput,
    UpdateCustomNodeInput
} from "@flowmaestro/shared";

interface CustomNodeRow {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    icon: string;
    color: string | null;
    inputs: JsonValue;
    outputs: JsonValue;
    internal_workflow: JsonValue;
    input_mappings: JsonValue;
    output_mappings: JsonValue;
    version: number;
    is_published: boolean;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export class CustomNodeRepository {
    async create(userId: string, input: CreateCustomNodeInput): Promise<CustomNodeDefinition> {
        const result = await db.query<CustomNodeRow>(
            `
            INSERT INTO flowmaestro.custom_nodes
            (user_id, name, description, icon, color, inputs, outputs,
             internal_workflow, input_mappings, output_mappings)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `,
            [
                userId,
                input.name,
                input.description || null,
                input.icon || "Box",
                input.color || null,
                JSON.stringify(input.inputs),
                JSON.stringify(input.outputs),
                JSON.stringify(input.internalWorkflow),
                JSON.stringify(input.inputMappings),
                JSON.stringify(input.outputMappings)
            ]
        );

        return this.mapRow(result.rows[0]);
    }

    async findById(id: string): Promise<CustomNodeDefinition | null> {
        const result = await db.query<CustomNodeRow>(
            `
            SELECT * FROM flowmaestro.custom_nodes
            WHERE id = $1 AND deleted_at IS NULL
        `,
            [id]
        );

        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByUserId(
        userId: string,
        options: { limit?: number; offset?: number; includeUnpublished?: boolean } = {}
    ): Promise<{ customNodes: CustomNodeDefinition[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;
        const publishedClause = options.includeUnpublished ? "" : "AND is_published = TRUE";

        const [countResult, nodesResult] = await Promise.all([
            db.query<{ count: string }>(
                `
                SELECT COUNT(*) as count FROM flowmaestro.custom_nodes
                WHERE user_id = $1 AND deleted_at IS NULL ${publishedClause}
            `,
                [userId]
            ),
            db.query<CustomNodeRow>(
                `
                SELECT * FROM flowmaestro.custom_nodes
                WHERE user_id = $1 AND deleted_at IS NULL ${publishedClause}
                ORDER BY name ASC
                LIMIT $2 OFFSET $3
            `,
                [userId, limit, offset]
            )
        ]);

        return {
            customNodes: nodesResult.rows.map((row) => this.mapRow(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    async update(id: string, input: UpdateCustomNodeInput): Promise<CustomNodeDefinition | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        const fields = [
            "name",
            "description",
            "icon",
            "color",
            "inputs",
            "outputs",
            "internal_workflow",
            "input_mappings",
            "output_mappings",
            "is_published"
        ] as const;

        for (const field of fields) {
            if (input[field as keyof UpdateCustomNodeInput] !== undefined) {
                const dbField = field.replace(/([A-Z])/g, "_$1").toLowerCase();
                updates.push(`${dbField} = $${paramIndex++}`);
                const value = input[field as keyof UpdateCustomNodeInput];
                values.push(typeof value === "object" ? JSON.stringify(value) : value);
            }
        }

        if (updates.length === 0) return this.findById(id);

        updates.push(`version = version + 1`);
        updates.push(`updated_at = NOW()`);
        values.push(id);

        const result = await db.query<CustomNodeRow>(
            `
            UPDATE flowmaestro.custom_nodes
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex} AND deleted_at IS NULL
            RETURNING *
        `,
            values
        );

        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async delete(id: string): Promise<boolean> {
        const result = await db.query(
            `
            UPDATE flowmaestro.custom_nodes
            SET deleted_at = NOW()
            WHERE id = $1 AND deleted_at IS NULL
        `,
            [id]
        );

        return (result.rowCount ?? 0) > 0;
    }

    private mapRow(row: CustomNodeRow): CustomNodeDefinition {
        return {
            id: row.id,
            userId: row.user_id,
            name: row.name,
            description: row.description || "",
            icon: row.icon,
            color: row.color || undefined,
            inputs: row.inputs as CustomNodeDefinition["inputs"],
            outputs: row.outputs as CustomNodeDefinition["outputs"],
            internalWorkflow: row.internal_workflow as CustomNodeDefinition["internalWorkflow"],
            inputMappings: row.input_mappings as Record<string, string>,
            outputMappings: row.output_mappings as Record<string, string>,
            version: row.version,
            isPublished: row.is_published,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
}
```

---

## Backend Executor

```typescript
// backend/src/temporal/activities/node-executors/custom-node-executor.ts

import type { JsonObject, WorkflowDefinition } from "@flowmaestro/shared";
import { CustomNodeRepository } from "../../storage/repositories/CustomNodeRepository";
import { executeChild } from "@temporalio/workflow";
import { interpolateVariables } from "./utils";

const customNodeRepo = new CustomNodeRepository();

export interface CustomNodeConfig {
    customNodeId: string;
    inputValues: Record<string, unknown>;
    outputVariable?: string;
}

export async function executeCustomNode(
    config: CustomNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const { customNodeId, inputValues } = config;

    // Load custom node definition
    const customNode = await customNodeRepo.findById(customNodeId);
    if (!customNode) {
        throw new Error(`Custom node ${customNodeId} not found`);
    }

    // Validate required inputs
    for (const input of customNode.inputs) {
        if (input.required && inputValues[input.name] === undefined) {
            throw new Error(
                `Required input "${input.name}" not provided for custom node "${customNode.name}"`
            );
        }
    }

    // Apply input mappings to create initial context for internal workflow
    const internalContext: JsonObject = {};
    for (const [inputName, mapping] of Object.entries(customNode.inputMappings)) {
        const value = inputValues[inputName];
        setNestedValue(internalContext, mapping, value);
    }

    // Convert internal workflow to WorkflowDefinition format
    const internalWorkflowDef: WorkflowDefinition = {
        name: `${customNode.name}_internal`,
        nodes: customNode.internalWorkflow.nodes,
        edges: customNode.internalWorkflow.edges,
        stateSchema: {}
    };

    // Execute internal workflow as child workflow
    const executionId = `custom-${customNodeId}-${Date.now()}`;
    const result = await executeChild("orchestratorWorkflow", {
        workflowId: executionId,
        args: [
            {
                executionId,
                workflowDefinition: internalWorkflowDef,
                inputs: internalContext,
                userId: context.userId as string
            }
        ]
    });

    if (!result.success) {
        throw new Error(`Custom node "${customNode.name}" execution failed: ${result.error}`);
    }

    // Extract outputs using output mappings
    const outputs: Record<string, unknown> = {};
    for (const [outputName, mapping] of Object.entries(customNode.outputMappings)) {
        outputs[outputName] = getNestedValue(result.outputs, mapping);
    }

    if (config.outputVariable) {
        return { [config.outputVariable]: outputs } as unknown as JsonObject;
    }
    return outputs as unknown as JsonObject;
}

function setNestedValue(obj: JsonObject, path: string, value: unknown): void {
    const parts = path.split(".");
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
        if (!(parts[i] in current)) {
            current[parts[i]] = {};
        }
        current = current[parts[i]] as JsonObject;
    }

    current[parts[parts.length - 1]] = value;
}

function getNestedValue(obj: JsonObject, path: string): unknown {
    return path.split(".").reduce((current, key) => {
        return current && typeof current === "object"
            ? (current as Record<string, unknown>)[key]
            : undefined;
    }, obj as unknown);
}
```

---

## API Routes

```typescript
// backend/src/api/routes/custom-nodes/create.ts

import type { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { CustomNodeRepository } from "../../../storage/repositories/CustomNodeRepository";

const customNodeFieldSchema = z.object({
    name: z.string().min(1).max(50),
    type: z.enum(["string", "number", "boolean", "object", "array", "any"]),
    required: z.boolean(),
    default: z.unknown().optional(),
    description: z.string().optional()
});

const createCustomNodeSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    inputs: z.array(customNodeFieldSchema),
    outputs: z.array(customNodeFieldSchema),
    internalWorkflow: z.object({
        nodes: z.record(z.unknown()),
        edges: z.array(z.unknown())
    }),
    inputMappings: z.record(z.string()),
    outputMappings: z.record(z.string())
});

export async function createCustomNodeHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const body = createCustomNodeSchema.parse(request.body);
    const userId = request.user.id;

    const customNodeRepo = new CustomNodeRepository();
    const customNode = await customNodeRepo.create(userId, body);

    reply.code(201).send({
        success: true,
        data: customNode
    });
}

// backend/src/api/routes/custom-nodes/list.ts

export async function listCustomNodesHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user.id;
    const { limit, offset, includeUnpublished } = request.query as {
        limit?: number;
        offset?: number;
        includeUnpublished?: boolean;
    };

    const customNodeRepo = new CustomNodeRepository();
    const result = await customNodeRepo.findByUserId(userId, {
        limit,
        offset,
        includeUnpublished: includeUnpublished ?? true
    });

    reply.send({
        success: true,
        data: result.customNodes,
        pagination: {
            total: result.total,
            limit: limit || 50,
            offset: offset || 0
        }
    });
}
```

---

## Frontend Custom Node Component

```typescript
// frontend/src/canvas/nodes/custom/CustomNodeNode.tsx

import React from "react";
import type { NodeProps } from "reactflow";
import { BaseNode } from "../BaseNode";
import { NodeConfigWrapper } from "../NodeConfigWrapper";
import { CustomNodeConfig } from "./config/CustomNodeConfig";
import type { CustomNodeDefinition } from "@flowmaestro/shared";
import * as LucideIcons from "lucide-react";

interface CustomNodeNodeData {
    customNodeDefinition: CustomNodeDefinition;
    inputValues: Record<string, unknown>;
}

export const CustomNodeNode: React.FC<NodeProps<CustomNodeNodeData>> = (props) => {
    const { id, data } = props;
    const { customNodeDefinition, inputValues } = data;

    // Dynamically get icon
    const IconComponent = (LucideIcons as Record<string, React.FC<{ className?: string }>>)[
        customNodeDefinition.icon
    ] || LucideIcons.Box;

    return (
        <>
            <BaseNode
                {...props}
                data={{
                    icon: customNodeDefinition.icon,
                    label: customNodeDefinition.name,
                    category: "custom",
                    configPreview: (
                        <span className="text-xs text-muted-foreground">
                            {customNodeDefinition.inputs.length} in →{" "}
                            {customNodeDefinition.outputs.length} out
                        </span>
                    ),
                    inputs: customNodeDefinition.inputs.map(i => ({
                        name: i.name,
                        type: i.type,
                        required: i.required
                    })),
                    outputs: customNodeDefinition.outputs.map(o => ({
                        name: o.name,
                        type: o.type
                    }))
                }}
            />
            <NodeConfigWrapper nodeId={id} title={customNodeDefinition.name} category="custom">
                <CustomNodeConfig
                    nodeId={id}
                    customNode={customNodeDefinition}
                    inputValues={inputValues}
                />
            </NodeConfigWrapper>
        </>
    );
};
```

---

## How to Deliver

1. Create database migration for custom_nodes table
2. Create CustomNode model and repository
3. Create API endpoints for CRUD operations
4. Create CustomNodeCreator page with embedded canvas
5. Create InterfaceFieldList component for input/output definition
6. Create CustomNodeNode component
7. Add "Your Custom Nodes" section to Node Library
8. Implement custom-node-executor in Temporal
9. Test custom node creation flow
10. Test custom node execution

---

## How to Test

| Test                   | Expected Result                   |
| ---------------------- | --------------------------------- |
| Create custom node     | Node saved with internal workflow |
| Define inputs          | Input fields configurable         |
| Define outputs         | Output fields configurable        |
| Build internal flow    | Canvas saves nodes/edges          |
| Custom node in library | Shows under "Your Custom Nodes"   |
| Drag to workflow       | Node appears with custom styling  |
| Execute custom node    | Internal flow runs correctly      |
| Input mapping          | Values passed to internal nodes   |
| Output mapping         | Results available in parent flow  |

### Integration Tests

```typescript
describe("Custom Node", () => {
    it("creates custom node", async () => {
        const result = await api.createCustomNode({
            name: "Enrich Company",
            inputs: [{ name: "domain", type: "string", required: true }],
            outputs: [{ name: "enriched", type: "object" }],
            internalWorkflow: { nodes: [...], edges: [...] }
        });
        expect(result.id).toBeDefined();
    });

    it("executes custom node", async () => {
        const result = await executeWorkflow({
            nodes: [
                { type: "input", data: { domain: "acme.com" } },
                { type: `custom-${customNodeId}`, data: {} },
                { type: "output" }
            ]
        });
        expect(result.outputs.enriched).toHaveProperty("name");
    });
});
```

---

## Acceptance Criteria

- [ ] User can create custom node with name, icon, description
- [ ] User can define typed inputs with required/optional flags
- [ ] User can define typed outputs
- [ ] User can build internal workflow using full canvas
- [ ] Custom node appears in Node Library under "Your Custom Nodes"
- [ ] Custom node can be dragged to any workflow
- [ ] Custom node shows Custom category styling
- [ ] Custom node executes internal workflow correctly
- [ ] Input values map to internal workflow variables
- [ ] Output values map from internal workflow to parent
- [ ] Custom node versioning works correctly
- [ ] Custom node can be edited and updated

---

## Real-Life Example: Company Enrichment Node

**Business Need**: Multiple workflows need to enrich company data from domains

**Custom Node**:

- Name: "Enrich Company"
- Icon: Building
- Inputs: domain (string, required), include_social (boolean)
- Outputs: name, industry, size, funding, summary

**Internal Flow**:

```
HTTP (Clearbit) → HTTP (LinkedIn) → Ask AI (summarize) → Transform (merge)
```

**Usage**: Any workflow needing company data just drags in "Enrich Company" node

---

## Dependencies

This phase enables powerful workflow composition through reusable custom nodes.
