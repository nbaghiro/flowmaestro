# Credits System Specification

This document provides a comprehensive overview of FlowMaestro's credits system, including database schema, service architecture, API endpoints, and integration with workflow/agent orchestrators.

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Shared Types](#shared-types)
4. [CreditService](#creditservice)
5. [WorkspaceCreditRepository](#workspacecreditrepository)
6. [API Routes](#api-routes)
7. [Temporal Credit Activities](#temporal-credit-activities)
8. [Workflow Orchestrator Integration](#workflow-orchestrator-integration)
9. [Agent Orchestrator Integration](#agent-orchestrator-integration)
10. [Credit Calculation Formulas](#credit-calculation-formulas)
11. [Design Decisions](#design-decisions)

---

## Overview

The credits system provides usage-based billing at the workspace level. Key features:

- **Workspace-scoped**: Credits are shared across all workspace members
- **Reservation-based**: Credits are reserved before execution to prevent overspending
- **Transparent tracking**: Full audit trail with per-node/per-call breakdown
- **Grace period**: Allows small overdrafts (<10%) to prevent blocking for rounding errors
- **Multi-balance**: Separate subscription, purchased, and bonus credit pools

### Credit Flow

```
API Request → Estimate → Check Credits → Reserve (with 20% buffer) →
Execute (track per-node/per-call) → Finalize (actual amount, release excess)
```

---

## Database Schema

### Workspace Credits Table

```sql
CREATE TABLE workspace_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Balances by type (for expiration tracking)
    subscription_balance INTEGER NOT NULL DEFAULT 0,
    purchased_balance INTEGER NOT NULL DEFAULT 0,
    bonus_balance INTEGER NOT NULL DEFAULT 0,

    -- Reserved credits (during active executions)
    reserved INTEGER NOT NULL DEFAULT 0,

    -- Expiration tracking
    subscription_expires_at TIMESTAMP,

    -- Lifetime statistics
    lifetime_allocated INTEGER NOT NULL DEFAULT 0,
    lifetime_purchased INTEGER NOT NULL DEFAULT 0,
    lifetime_used INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT unique_workspace_credits UNIQUE(workspace_id),
    CONSTRAINT chk_subscription_balance CHECK (subscription_balance >= 0),
    CONSTRAINT chk_purchased_balance CHECK (purchased_balance >= 0),
    CONSTRAINT chk_bonus_balance CHECK (bonus_balance >= 0),
    CONSTRAINT chk_reserved CHECK (reserved >= 0)
);
```

### Available Credits Function

```sql
CREATE OR REPLACE FUNCTION get_available_credits(ws_id UUID)
RETURNS INTEGER AS $$
    SELECT GREATEST(0,
        COALESCE(subscription_balance, 0) +
        COALESCE(purchased_balance, 0) +
        COALESCE(bonus_balance, 0) -
        COALESCE(reserved, 0)
    )
    FROM flowmaestro.workspace_credits
    WHERE workspace_id = ws_id;
$$ LANGUAGE SQL STABLE;
```

### Credit Transactions Table

```sql
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),  -- NULL for system operations

    -- Transaction details
    amount INTEGER NOT NULL,              -- positive=credit, negative=debit
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,

    -- Operation tracking
    operation_type VARCHAR(100),          -- 'workflow_execution' | 'agent_execution'
    operation_id UUID,                    -- Reference to execution ID
    description TEXT,
    metadata JSONB DEFAULT '{}',

    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_transaction_type CHECK (transaction_type IN
        ('subscription', 'purchase', 'usage', 'refund', 'bonus', 'expiration'))
);

-- Indexes
CREATE INDEX idx_credit_transactions_workspace ON credit_transactions(workspace_id);
CREATE INDEX idx_credit_transactions_created ON credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX idx_credit_transactions_operation ON credit_transactions(operation_type, operation_id);
```

---

## Shared Types

**Location:** `shared/src/workspace.ts`

### CreditBalance

```typescript
export interface CreditBalance {
    available: number; // Total available credits
    subscription: number; // Subscription balance
    purchased: number; // Purchased balance
    bonus: number; // Bonus balance
    reserved: number; // Currently reserved credits
    subscriptionExpiresAt: string | null; // ISO string
    usedThisMonth: number; // Credits used in current month
    usedAllTime: number; // Lifetime usage
}
```

### CreditTransaction

```typescript
export type CreditTransactionType =
    | "subscription"
    | "purchase"
    | "usage"
    | "refund"
    | "bonus"
    | "expiration";

export interface CreditTransaction {
    id: string;
    workspaceId: string;
    userId: string | null;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    transactionType: CreditTransactionType;
    operationType: string | null;
    operationId: string | null;
    description: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
}
```

### CreditEstimate

```typescript
export interface CreditEstimate {
    totalCredits: number;
    breakdown: CreditBreakdownItem[];
    confidence: "estimate" | "exact";
}

export interface CreditBreakdownItem {
    nodeId?: string;
    nodeType?: string;
    credits: number;
    description: string;
}
```

### Workspace Plan Limits

```typescript
export const WORKSPACE_LIMITS = {
    free: {
        monthly_credits: 100,
        max_workflows: 5,
        max_agents: 2,
        max_knowledge_bases: 1,
        max_kb_chunks: 100,
        max_members: 1,
        max_connections: 5,
        execution_history_days: 7
    },
    pro: {
        monthly_credits: 2500,
        max_workflows: 50,
        max_agents: 20,
        max_knowledge_bases: 10,
        max_kb_chunks: 5000,
        max_members: 5,
        max_connections: 25,
        execution_history_days: 30
    },
    team: {
        monthly_credits: 10000,
        max_workflows: -1, // unlimited
        max_agents: -1,
        max_knowledge_bases: 50,
        max_kb_chunks: 50000,
        max_members: -1,
        max_connections: -1,
        execution_history_days: 90
    }
} as const;
```

### Credit Packs

```typescript
export const CREDIT_PACKS: CreditPack[] = [
    { id: "starter", credits: 500, priceInCents: 500, label: "Starter", savingsPercent: 0 },
    { id: "growth", credits: 2500, priceInCents: 2250, label: "Growth", savingsPercent: 10 },
    { id: "scale", credits: 10000, priceInCents: 8000, label: "Scale", savingsPercent: 20 },
    {
        id: "enterprise",
        credits: 50000,
        priceInCents: 35000,
        label: "Enterprise",
        savingsPercent: 30
    }
];
```

---

## CreditService

**Location:** `backend/src/services/workspace/CreditService.ts`

### LLM Pricing Table

Per 1 million tokens in USD:

| Model                      | Input  | Output |
| -------------------------- | ------ | ------ |
| **OpenAI**                 |        |        |
| gpt-4o                     | $2.50  | $10.00 |
| gpt-4o-mini                | $0.15  | $0.60  |
| gpt-4-turbo                | $10.00 | $30.00 |
| gpt-4                      | $30.00 | $60.00 |
| gpt-3.5-turbo              | $0.50  | $1.50  |
| **Anthropic**              |        |        |
| claude-3-5-sonnet-20241022 | $3.00  | $15.00 |
| claude-3-opus-20240229     | $15.00 | $75.00 |
| claude-3-sonnet-20240229   | $3.00  | $15.00 |
| claude-3-haiku-20240307    | $0.25  | $1.25  |
| **Google**                 |        |        |
| gemini-1.5-pro             | $1.25  | $5.00  |
| gemini-1.5-flash           | $0.075 | $0.30  |
| gemini-2.0-flash-exp       | $0.10  | $0.40  |
| **Groq**                   |        |        |
| llama-3.1-70b-versatile    | $0.59  | $0.79  |
| llama-3.1-8b-instant       | $0.05  | $0.08  |
| mixtral-8x7b-32768         | $0.24  | $0.24  |
| **Default (fallback)**     | $1.00  | $3.00  |

### Node Cost Table

Flat credits per execution:

| Node Type                   | Credits |
| --------------------------- | ------- |
| **Free Nodes**              |         |
| trigger_manual              | 0       |
| trigger_schedule            | 0       |
| trigger_webhook             | 0       |
| variable                    | 0       |
| output                      | 0       |
| condition                   | 0       |
| merge                       | 0       |
| delay                       | 0       |
| **Data Processing**         |         |
| data_transform              | 1       |
| http_request                | 2       |
| code_execution              | 3       |
| database_query              | 3       |
| **Knowledge Base**          |         |
| knowledge_search            | 5       |
| knowledge_index             | 10      |
| **Image Generation**        |         |
| image_generation_stable     | 30      |
| image_generation_dalle      | 50      |
| image_generation_midjourney | 100     |
| **Default (unknown)**       | 1       |

### Credit Value Constants

```typescript
const CREDIT_VALUE_USD = 0.01; // 1 credit = $0.01 USD
const MARGIN = 1.2; // 20% margin on costs
```

### Method Signatures

```typescript
class CreditService {
    // Balance & Availability
    async getBalance(workspaceId: string): Promise<CreditBalance | null>;
    async hasEnoughCredits(workspaceId: string, amount: number): Promise<boolean>;

    // Reservation Lifecycle
    async reserveCredits(workspaceId: string, estimatedAmount: number): Promise<boolean>;
    async releaseCredits(workspaceId: string, amount: number): Promise<void>;
    async finalizeCredits(
        workspaceId: string,
        userId: string | null,
        reservedAmount: number,
        actualAmount: number,
        operationType: string,
        operationId?: string,
        description?: string
    ): Promise<void>;

    // Calculations
    calculateLLMCredits(model: string, inputTokens: number, outputTokens: number): number;
    calculateNodeCredits(nodeType: string): number;
    async estimateWorkflowCredits(workflowDefinition: {
        nodes: Array<{ id: string; type: string; data?: Record<string, unknown> }>;
    }): Promise<CreditEstimate>;

    // Credit Additions
    async addSubscriptionCredits(
        workspaceId: string,
        amount: number,
        expiresAt: Date
    ): Promise<void>;
    async addPurchasedCredits(
        workspaceId: string,
        userId: string,
        amount: number,
        packId: string
    ): Promise<void>;
    async addBonusCredits(workspaceId: string, amount: number, reason: string): Promise<void>;

    // Transaction History
    async getTransactions(
        workspaceId: string,
        options?: { limit?: number; offset?: number }
    ): Promise<CreditTransaction[]>;
}
```

---

## WorkspaceCreditRepository

**Location:** `backend/src/storage/repositories/WorkspaceCreditRepository.ts`

### Core Operations

```typescript
class WorkspaceCreditRepository {
    // CRUD
    async create(input: CreateWorkspaceCreditsInput): Promise<WorkspaceCreditsModel>;
    async findByWorkspaceId(workspaceId: string): Promise<WorkspaceCreditsModel | null>;
    async update(
        workspaceId: string,
        input: UpdateWorkspaceCreditsInput
    ): Promise<WorkspaceCreditsModel | null>;

    // Balance
    async getAvailableCredits(workspaceId: string): Promise<number>;
    async getBalance(workspaceId: string): Promise<CreditBalance | null>;

    // Reservations
    async addReservation(workspaceId: string, amount: number): Promise<void>;
    async releaseReservation(workspaceId: string, amount: number): Promise<void>;

    // Deductions (order: subscription → bonus → purchased)
    async deductCredits(
        workspaceId: string,
        amount: number
    ): Promise<{
        subscription: number;
        purchased: number;
        bonus: number;
    }>;

    // Additions
    async addSubscriptionCredits(
        workspaceId: string,
        amount: number,
        expiresAt: Date
    ): Promise<void>;
    async addPurchasedCredits(workspaceId: string, amount: number): Promise<void>;
    async addBonusCredits(workspaceId: string, amount: number): Promise<void>;

    // Transactions
    async createTransaction(input: CreateCreditTransactionInput): Promise<CreditTransactionModel>;
    async getTransactions(
        workspaceId: string,
        options?: { limit?; offset?; type? }
    ): Promise<CreditTransactionModel[]>;
    async getUsedThisMonth(workspaceId: string): Promise<number>;
}
```

### Deduction Priority Order

Credits are deducted in this order to protect purchased credits:

1. **Subscription credits** - Monthly allocation (expires, use first)
2. **Bonus credits** - Promotions/referrals (may expire)
3. **Purchased credits** - One-time purchases (no expiration)

---

## API Routes

**Base Path:** `/workspaces/:workspaceId/credits`

### GET `/balance`

Get current credit balance for the workspace.

**Request:**

```http
GET /workspaces/abc123/credits/balance
Authorization: Bearer <token>
```

**Response:**

```json
{
    "success": true,
    "data": {
        "available": 450,
        "subscription": 100,
        "purchased": 300,
        "bonus": 50,
        "reserved": 0,
        "subscriptionExpiresAt": "2025-02-14T00:00:00Z",
        "usedThisMonth": 150,
        "usedAllTime": 350
    }
}
```

### POST `/estimate`

Estimate credit cost for a workflow execution.

**Request:**

```json
POST /workspaces/abc123/credits/estimate

{
    "workflowDefinition": {
        "nodes": [
            { "id": "node1", "type": "trigger_manual" },
            { "id": "node2", "type": "llm", "data": { "model": "gpt-4o" } },
            { "id": "node3", "type": "http_request" },
            { "id": "node4", "type": "output" }
        ]
    }
}
```

**Response:**

```json
{
    "success": true,
    "data": {
        "estimate": {
            "totalCredits": 252,
            "breakdown": [
                {
                    "nodeId": "node1",
                    "nodeType": "trigger_manual",
                    "credits": 0,
                    "description": "trigger_manual execution"
                },
                {
                    "nodeId": "node2",
                    "nodeType": "llm",
                    "credits": 250,
                    "description": "llm execution"
                },
                {
                    "nodeId": "node3",
                    "nodeType": "http_request",
                    "credits": 2,
                    "description": "http_request execution"
                },
                {
                    "nodeId": "node4",
                    "nodeType": "output",
                    "credits": 0,
                    "description": "output execution"
                }
            ],
            "confidence": "estimate"
        },
        "currentBalance": 450,
        "hasEnoughCredits": true
    }
}
```

**Note:** LLM nodes estimate ~500 input + ~200 output tokens per call.

### GET `/transactions`

Get transaction history with pagination.

**Request:**

```http
GET /workspaces/abc123/credits/transactions?limit=50&offset=0
Authorization: Bearer <token>
```

**Response:**

```json
{
    "success": true,
    "data": [
        {
            "id": "txn_1",
            "workspaceId": "abc123",
            "userId": "user_1",
            "amount": -125,
            "balanceBefore": 575,
            "balanceAfter": 450,
            "transactionType": "usage",
            "operationType": "workflow_execution",
            "operationId": "exec_123",
            "description": "Workflow: Customer Data Pipeline",
            "metadata": {
                "executionId": "exec_123",
                "executionType": "workflow",
                "workflowName": "Customer Data Pipeline",
                "nodeBreakdown": [
                    { "nodeId": "llm_call", "credits": 120 },
                    { "nodeId": "http_req", "credits": 5 }
                ],
                "durationMs": 15000,
                "estimatedCredits": 150,
                "actualCredits": 125
            },
            "createdAt": "2025-01-14T10:30:00Z"
        }
    ]
}
```

**Query Parameters:**

- `limit` (optional, default=50, max=100)
- `offset` (optional, default=0)

### Middleware

All credit routes require:

- `authMiddleware` - JWT token verification
- `workspaceContextMiddleware` - Load workspace context
- `requirePermission("view")` - Minimum "view" permission

---

## Temporal Credit Activities

**Location:** `backend/src/temporal/activities/credits.ts`

### Activity Input Types

```typescript
interface CheckCreditsInput {
    workspaceId: string;
    estimatedCredits: number;
}

interface ShouldAllowExecutionInput {
    workspaceId: string;
    estimatedCredits: number;
}

interface ReserveCreditsInput {
    workspaceId: string;
    estimatedCredits: number;
}

interface FinalizeCreditsInput {
    workspaceId: string;
    userId: string | null;
    reservedAmount: number;
    actualAmount: number;
    operationType: "workflow_execution" | "agent_execution";
    operationId: string;
    description: string;
    metadata?: Record<string, unknown>;
}

interface ReleaseCreditsInput {
    workspaceId: string;
    amount: number;
}

interface CalculateLLMCreditsInput {
    model: string;
    inputTokens: number;
    outputTokens: number;
}

interface CalculateNodeCreditsInput {
    nodeType: string;
}

interface EstimateWorkflowCreditsInput {
    workflowDefinition: {
        nodes:
            | Array<{ id: string; type: string; data?: Record<string, unknown> }>
            | Record<string, { type: string; data?: Record<string, unknown> }>;
    };
}
```

### Activity Functions

| Function                  | Description                                        |
| ------------------------- | -------------------------------------------------- |
| `checkCredits`            | Check if workspace has sufficient credits          |
| `shouldAllowExecution`    | Check with 10% grace period for near-zero balances |
| `getCreditsBalance`       | Get current balance                                |
| `reserveCredits`          | Reserve credits before execution                   |
| `releaseCredits`          | Release reserved credits (on cancellation)         |
| `finalizeCredits`         | Finalize actual usage and record transaction       |
| `calculateLLMCredits`     | Calculate credits from token usage                 |
| `calculateNodeCredits`    | Get flat cost for node type                        |
| `estimateWorkflowCredits` | Estimate total workflow credits                    |

### Activity Configuration

```typescript
// Credit activities use validation timeout (fast operations)
{
    startToCloseTimeout: "30 seconds",
    retry: {
        maximumAttempts: 3,
        backoffCoefficient: 2
    }
}
```

---

## Workflow Orchestrator Integration

**Location:** `backend/src/temporal/workflows/workflow-orchestrator.ts`

### Workflow Input

```typescript
interface OrchestratorInput {
    executionId: string;
    workflowDefinition: WorkflowDefinition;
    inputs?: JsonObject;
    userId?: string;
    workspaceId?: string; // Required for credit tracking
    skipCreditCheck?: boolean; // For system/internal executions
}
```

### Credit Lifecycle in Workflow

#### Phase 0: Credit Check & Reservation

```typescript
if (!skipCreditCheck && workspaceId) {
    // 1. Estimate credits (20% buffer)
    const estimate = await estimateWorkflowCredits({ workflowDefinition });
    const estimatedCredits = Math.ceil(estimate.totalCredits * 1.2);

    // 2. Check with grace period
    const allowed = await shouldAllowExecution({ workspaceId, estimatedCredits });
    if (!allowed) {
        return { success: false, error: "Insufficient credits" };
    }

    // 3. Reserve credits
    const reserved = await reserveCredits({ workspaceId, estimatedCredits });
    if (!reserved) {
        return { success: false, error: "Failed to reserve credits" };
    }

    reservedCredits = estimatedCredits;
}
```

#### Phase 4: Track Per-Node Usage

```typescript
// After each node execution
if (!skipCreditCheck && workspaceId) {
    let nodeCredit = 0;

    if (result.metrics?.tokenUsage) {
        // LLM nodes: calculate from actual token usage
        nodeCredit = await calculateLLMCredits({
            model: result.metrics.tokenUsage.model || "default",
            inputTokens: result.metrics.tokenUsage.promptTokens || 0,
            outputTokens: result.metrics.tokenUsage.completionTokens || 0
        });
    } else {
        // Other nodes: flat rate by type
        nodeCredit = await calculateNodeCredits({ nodeType: result.nodeType });
    }

    nodeCredits.set(result.nodeId, nodeCredit);
    accumulatedCredits += nodeCredit;
}
```

#### Phase 5: Finalization

**On Success:**

```typescript
await finalizeCredits({
    workspaceId,
    userId: userId || null,
    reservedAmount: reservedCredits,
    actualAmount: accumulatedCredits,
    operationType: "workflow_execution",
    operationId: executionId,
    description: `Workflow: ${workflowName}`,
    metadata: {
        executionId,
        executionType: "workflow",
        workflowName,
        nodeBreakdown: Array.from(nodeCredits.entries()),
        durationMs: Date.now() - startTime,
        estimatedCredits: reservedCredits,
        actualCredits: accumulatedCredits
    }
});
```

**On Failure:**

```typescript
if (accumulatedCredits > 0) {
    // Partial work done - charge for actual usage
    await finalizeCredits({
        workspaceId,
        userId: userId || null,
        reservedAmount: reservedCredits,
        actualAmount: accumulatedCredits,
        operationType: "workflow_execution",
        operationId: executionId,
        description: `Workflow: ${workflowName} (failed)`,
        metadata: { ...metadata, failureReason: error }
    });
} else {
    // No work done - release full reservation
    await releaseCredits({ workspaceId, amount: reservedCredits });
}
```

---

## Agent Orchestrator Integration

**Location:** `backend/src/temporal/workflows/agent-orchestrator.ts`

### Agent Input

```typescript
interface AgentOrchestratorInput {
    executionId: string;
    agentId: string;
    userId: string;
    threadId: string;
    initialMessage?: string;
    connectionId?: string;
    model?: string;
    serializedThread?: SerializedThread;
    iterations?: number;
    workspaceId?: string; // Required for credit tracking
    skipCreditCheck?: boolean; // For system/internal executions
    accumulatedCredits?: number; // Preserved across continue-as-new
    reservedCredits?: number; // Preserved across continue-as-new
}
```

### Credit Lifecycle in Agent

#### Initial Setup (Iteration 0 Only)

```typescript
if (iterations === 0 && !skipCreditCheck && workspaceId) {
    // Estimate: ~50 credits per iteration × max_iterations × 1.2 buffer
    const estimatedCredits = Math.ceil(agent.max_iterations * 50 * 1.2);

    const allowed = await shouldAllowExecution({ workspaceId, estimatedCredits });
    if (!allowed) {
        return { success: false, error: "Insufficient credits" };
    }

    const reserved = await reserveCredits({ workspaceId, estimatedCredits });
    reservedCredits = estimatedCredits;
}
```

#### Per LLM Call Tracking

```typescript
// After each LLM call
if (!skipCreditCheck && workspaceId && llmResponse.usage) {
    const callCredits = await calculateLLMCredits({
        model: input.model || agent.model,
        inputTokens: llmResponse.usage.promptTokens,
        outputTokens: llmResponse.usage.completionTokens
    });
    accumulatedCredits += callCredits;
}
```

#### Continue-as-New (Every 50 Iterations)

```typescript
return continueAsNew<typeof agentOrchestratorWorkflow>({
    executionId,
    agentId,
    userId,
    threadId,
    serializedThread: summarizedState,
    iterations: currentIterations,
    // Preserve credit state across continue-as-new
    workspaceId,
    skipCreditCheck,
    accumulatedCredits,
    reservedCredits
});
```

#### Finalization

Credit finalization happens on ALL exit paths:

| Exit Reason            | Finalization                             |
| ---------------------- | ---------------------------------------- |
| Success                | Finalize with actual accumulated credits |
| LLM call failed        | Finalize with partial credits (if any)   |
| User input timeout     | Finalize with partial credits            |
| Safety check blocked   | Finalize with partial credits            |
| Max iterations reached | Finalize with accumulated credits        |

**Example (Success):**

```typescript
await finalizeCredits({
    workspaceId,
    userId,
    reservedAmount: reservedCredits,
    actualAmount: accumulatedCredits,
    operationType: "agent_execution",
    operationId: executionId,
    description: `Agent: ${agent.name}`,
    metadata: {
        agentId,
        agentName: agent.name,
        threadId,
        iterations: currentIterations,
        success: true
    }
});
```

---

## Credit Calculation Formulas

### LLM Credits

```
inputCostUSD  = (inputTokens / 1,000,000) × modelPricing.input
outputCostUSD = (outputTokens / 1,000,000) × modelPricing.output
totalCostUSD  = inputCostUSD + outputCostUSD
credits       = ceil((totalCostUSD / 0.01) × 1.2)
credits       = max(1, credits)  // minimum 1 credit
```

**Example:** GPT-4o with 1000 input + 500 output tokens:

```
inputCost  = (1000 / 1,000,000) × 2.50 = $0.0025
outputCost = (500 / 1,000,000) × 10.00 = $0.005
totalCost  = $0.0075
credits    = ceil((0.0075 / 0.01) × 1.2) = ceil(0.9) = 1 credit
```

### Node Credits

Flat rate lookup from `NODE_COSTS` table. Unknown nodes default to 1 credit.

### Workflow Estimation

For LLM/agent nodes, estimates:

- ~500 input tokens
- ~200 output tokens

All other nodes use flat rates from `NODE_COSTS`.

---

## Design Decisions

### 1. Reservation-Based Model

Credits are **reserved** before execution starts, preventing overspending in concurrent scenarios.

**Flow:**

1. Estimate cost with 20% buffer
2. Reserve estimated amount (soft-locks credits)
3. Execute and track actual usage
4. Finalize: deduct actual, release excess reservation

### 2. Grace Period (10% Shortfall)

Allows execution if shortfall is <10% of estimated cost. This prevents blocking for:

- Rounding errors
- Small estimation inaccuracies
- Near-zero balance edge cases

```typescript
const shortfallPercent = (shortfall / estimatedCredits) * 100;
return shortfallPercent < 10;
```

### 3. Partial Failure Charging

On failure, charge only for work completed:

- If no work done → release full reservation
- If partial work done → finalize with actual usage

### 4. Transaction Metadata

Rich audit trail with:

- Execution ID and type
- Workflow/agent name
- Per-node/per-call breakdown
- Duration and timing
- Estimated vs actual comparison

### 5. Multi-Tenancy at Workspace Level

- Credits are workspace-scoped, not user-scoped
- All workspace members share the same credit pool
- Transaction history shows which user triggered each operation

### 6. Deduction Priority

Credits deducted in order: **subscription → bonus → purchased**

This protects purchased credits (which don't expire) by using expirable credits first.

---

## File Reference

| Component            | Location                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| Database Schema      | `migrations/1730000000038_create-workspaces.sql`                         |
| Shared Types         | `shared/src/workspace.ts`                                                |
| CreditService        | `backend/src/services/workspace/CreditService.ts`                        |
| Repository           | `backend/src/storage/repositories/WorkspaceCreditRepository.ts`          |
| API Routes           | `backend/src/api/routes/workspaces/credits/`                             |
| Temporal Activities  | `backend/src/temporal/activities/credits.ts`                             |
| Activity Exports     | `backend/src/temporal/activities/index.ts`                               |
| Workflow Integration | `backend/src/temporal/workflows/workflow-orchestrator.ts`                |
| Agent Integration    | `backend/src/temporal/workflows/agent-orchestrator.ts`                   |
| Error Types          | `backend/src/api/middleware/error-handler.ts` (InsufficientCreditsError) |
