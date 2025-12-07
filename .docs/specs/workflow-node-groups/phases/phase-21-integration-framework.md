# Phase 21: Integration Framework

## Overview

Create the workflow IntegrationNode component that leverages the **existing integration provider system**. The backend already has 25+ providers with operations auto-wrapped as MCP tools - this phase focuses on exposing them in the workflow canvas.

---

## Prerequisites

- **Phase 05**: Node Library (for displaying integrations)

---

## Existing Infrastructure (Already Built)

The following infrastructure **already exists** and should be reused:

### Backend Integration System

```
backend/src/integrations/
├── core/
│   ├── BaseProvider.ts          # Abstract base class for all providers
│   ├── ProviderRegistry.ts      # Manages provider instances with lazy loading
│   ├── ExecutionRouter.ts       # Routes operations (workflow=direct API, agent=MCP)
│   ├── schema-utils.ts          # Converts Zod schemas to JSON Schema
│   └── types.ts                 # TypeScript type definitions
│
└── providers/                   # 25+ providers already implemented
    ├── slack/
    │   ├── SlackProvider.ts
    │   ├── client/SlackClient.ts
    │   ├── mcp/SlackMCPAdapter.ts  # Auto-wraps operations as MCP tools
    │   └── operations/
    │       ├── sendMessage.ts
    │       └── listChannels.ts
    ├── gmail/
    ├── hubspot/
    ├── notion/
    ├── github/
    └── ... (20+ more)
```

### How Operations Become MCP Tools (Already Working)

```typescript
// Operations are defined with Zod schemas
export const sendMessageOperation: OperationDefinition = {
    id: "sendMessage",
    name: "Send Message",
    description: "Send a message to a Slack channel",
    inputSchema: z.object({
        channel: z.string(),
        text: z.string(),
        thread_ts: z.string().optional()
    }),
    inputSchemaJSON: toJSONSchema(schema) // Auto-converted for MCP
};

// MCP Adapter auto-wraps ALL operations
class SlackMCPAdapter {
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `slack_${op.id}`, // e.g., "slack_sendMessage"
            description: op.description,
            inputSchema: op.inputSchemaJSON
        }));
    }
}
```

### Agent Usage (Already Working)

```typescript
// Agents can already use integration tools via:
// GET /api/connections/:id/mcp-tools - Returns all MCP tools for a connection
// Tools are executed via ExecutionRouter.executeMCPTool()
```

---

## Deliverables (This Phase)

| Item                   | Description                                         |
| ---------------------- | --------------------------------------------------- |
| IntegrationNode        | Generic workflow node for any provider              |
| IntegrationNodeConfig  | Config panel with connection/operation selection    |
| Operation Parameter UI | Dynamic form based on operation schema              |
| Node Library Section   | "Integrations" category showing connected providers |

---

## Architecture

### Workflow Execution Path (Use Direct API)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Workflow Execution                           │
│                                                                 │
│  IntegrationNode                                                │
│       │                                                         │
│       ▼                                                         │
│  integration-executor.ts                                        │
│       │                                                         │
│       ▼                                                         │
│  ExecutionRouter.execute(provider, operation, params, context)  │
│       │                                                         │
│       ▼  (context.mode === "workflow")                          │
│  Provider.executeOperation()  ← Direct API (high performance)   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Execution Path (Use MCP - Already Implemented)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Agent Execution                              │
│                                                                 │
│  Agent decides to use tool                                      │
│       │                                                         │
│       ▼                                                         │
│  executeToolCall() → executeMCPToolCall()                       │
│       │                                                         │
│       ▼                                                         │
│  ExecutionRouter.executeMCPTool(provider, toolName, params)     │
│       │                                                         │
│       ▼                                                         │
│  Provider.executeMCPTool() → MCPAdapter.executeTool()           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Create

### Frontend - IntegrationNode

```
frontend/src/canvas/nodes/
├── IntegrationNode.tsx          # Generic integration node component
└── integration/
    └── IntegrationNodeConfig.tsx  # Config panel
```

### Backend - Workflow Executor

```
backend/src/temporal/activities/node-executors/
└── integration-executor.ts      # Execute integration operations
```

---

## IntegrationNode Component

```typescript
// frontend/src/canvas/nodes/IntegrationNode.tsx
export interface IntegrationNodeData {
    connectionId?: string;
    provider?: string;
    operation?: string;
    parameters?: Record<string, unknown>;
    outputVariable?: string;
}

export const IntegrationNode: React.FC<NodeProps<IntegrationNodeData>> = (props) => {
    const { id, data } = props;

    // Get provider info for display
    const providerInfo = ALL_PROVIDERS.find(p => p.provider === data.provider);

    return (
        <>
            <BaseNode
                {...props}
                data={{
                    icon: providerInfo?.logoUrl || "Plug",
                    label: providerInfo?.name || "Integration",
                    category: "integration",
                    configPreview: data.operation ? (
                        <span className="text-xs">{data.operation}</span>
                    ) : (
                        <span className="text-muted-foreground">Select operation</span>
                    )
                }}
            />
            <NodeConfigWrapper nodeId={id} title="Integration" category="integration">
                <IntegrationNodeConfig nodeId={id} data={data} />
            </NodeConfigWrapper>
        </>
    );
};
```

---

## IntegrationNodeConfig Component

```typescript
// frontend/src/canvas/nodes/integration/IntegrationNodeConfig.tsx
export const IntegrationNodeConfig: React.FC<{
    nodeId: string;
    data: IntegrationNodeData;
}> = ({ nodeId, data }) => {
    const { data: connections } = useQuery({
        queryKey: ["connections"],
        queryFn: () => api.getConnections()
    });

    const { data: operations } = useQuery({
        queryKey: ["connection-operations", data.connectionId],
        queryFn: () => api.getConnectionOperations(data.connectionId!),
        enabled: !!data.connectionId
    });

    return (
        <div className="space-y-4">
            {/* Connection Selector */}
            <Select
                label="Connection"
                value={data.connectionId}
                onChange={(id) => updateNodeData(nodeId, { connectionId: id })}
                options={connections?.map(c => ({
                    value: c.id,
                    label: c.name,
                    icon: <ProviderLogo provider={c.provider} />
                }))}
            />

            {/* Operation Selector */}
            {data.connectionId && (
                <Select
                    label="Operation"
                    value={data.operation}
                    onChange={(op) => updateNodeData(nodeId, { operation: op })}
                    options={operations?.map(op => ({
                        value: op.id,
                        label: op.name,
                        description: op.description
                    }))}
                />
            )}

            {/* Dynamic Parameters Form */}
            {data.operation && (
                <DynamicParameterForm
                    schema={operations?.find(o => o.id === data.operation)?.inputSchema}
                    values={data.parameters}
                    onChange={(params) => updateNodeData(nodeId, { parameters: params })}
                />
            )}

            {/* Output Variable */}
            <Input
                label="Output Variable"
                value={data.outputVariable || "integrationResult"}
                onChange={(v) => updateNodeData(nodeId, { outputVariable: v })}
            />
        </div>
    );
};
```

---

## Integration Executor

```typescript
// backend/src/temporal/activities/node-executors/integration-executor.ts
import { ExecutionRouter } from "../../../integrations/core/ExecutionRouter";
import { providerRegistry } from "../../../integrations/registry";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";

const executionRouter = new ExecutionRouter(providerRegistry);

export async function executeIntegrationNode(
    config: IntegrationNodeConfig,
    context: ActivityContext
): Promise<ActivityContext> {
    const connectionRepo = new ConnectionRepository();

    // Load connection with decrypted credentials
    const connection = await connectionRepo.findByIdWithData(config.connectionId);
    if (!connection) {
        throw new Error(`Connection ${config.connectionId} not found`);
    }

    // Resolve parameter values from context
    const resolvedParams = resolveVariables(config.parameters, context.variables);

    // Execute via ExecutionRouter (uses direct API for workflows)
    const result = await executionRouter.execute(
        connection.provider,
        config.operation,
        resolvedParams,
        connection,
        { mode: "workflow", workflowId: context.workflowId, nodeId: config.nodeId }
    );

    if (!result.success) {
        throw new Error(result.error?.message || "Integration operation failed");
    }

    // Return updated context with result
    return {
        ...context,
        variables: {
            ...context.variables,
            [config.outputVariable || "integrationResult"]: result.data
        }
    };
}
```

---

## API Endpoints Needed

```typescript
// GET /api/connections/:id/operations
// Returns available operations for a connection's provider
// Uses: provider.getOperations()

// Already exists:
// GET /api/connections/:id/mcp-tools (for agents)
```

---

## How to Deliver

1. Create IntegrationNode component
2. Create IntegrationNodeConfig with connection/operation selectors
3. Add DynamicParameterForm component for schema-based forms
4. Create integration-executor using ExecutionRouter
5. Add API endpoint for getting connection operations
6. Register IntegrationNode in node registry
7. Add "Integrations" category to Node Library
8. Test with existing providers (Slack, Gmail, etc.)

---

## How to Test

| Test                          | Expected Result                         |
| ----------------------------- | --------------------------------------- |
| Select connection             | Shows connected accounts                |
| Select operation              | Shows available operations for provider |
| Configure parameters          | Dynamic form based on schema            |
| Execute Slack sendMessage     | Message posted to channel               |
| Execute Gmail search          | Emails returned in context              |
| Execute HubSpot createContact | Contact created in CRM                  |

### Integration Tests

```typescript
describe("IntegrationNode Executor", () => {
    it("executes Slack sendMessage via direct API", async () => {
        const result = await executeIntegrationNode(
            {
                connectionId: slackConnectionId,
                operation: "sendMessage",
                parameters: { channel: "general", text: "Hello" },
                outputVariable: "slackResult"
            },
            context
        );

        expect(result.variables.slackResult.ok).toBe(true);
    });

    it("resolves variables in parameters", async () => {
        const result = await executeIntegrationNode(
            {
                connectionId: slackConnectionId,
                operation: "sendMessage",
                parameters: {
                    channel: "{{leadChannel}}",
                    text: "New lead: {{leadName}}"
                },
                outputVariable: "notification"
            },
            {
                ...context,
                variables: { leadChannel: "sales", leadName: "John" }
            }
        );

        expect(result.variables.notification.ok).toBe(true);
    });
});
```

---

## Acceptance Criteria

- [ ] IntegrationNode renders with provider logo
- [ ] Connection selector shows user's connected accounts
- [ ] Operation selector shows provider's available operations
- [ ] Parameter form generates dynamically from operation schema
- [ ] Parameters support variable interpolation (`{{varName}}`)
- [ ] Executor uses ExecutionRouter with workflow context
- [ ] Direct API path used for performance (not MCP)
- [ ] Results stored in output variable
- [ ] Errors propagate correctly with provider context

---

## Key Points

1. **Use existing providers** - Don't create new MCP servers
2. **Use ExecutionRouter** - Handles workflow vs agent routing
3. **Direct API for workflows** - MCP is for agents only
4. **Dynamic UI from schemas** - Operations define their own input schemas
5. **Connection-based** - Users select from their connected accounts
