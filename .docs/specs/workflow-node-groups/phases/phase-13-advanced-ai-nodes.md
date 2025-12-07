# Phase 13: Advanced AI Nodes

## Overview

Implement 2 advanced AI nodes: Compare Models and Model Router.

---

## Prerequisites

- **Phase 09**: Core AI nodes (multi-provider support)

---

## Existing Infrastructure

### Multi-Provider LLM Executor

**File**: `backend/src/temporal/activities/node-executors/llm-executor.ts`

```typescript
// Already supports 5 providers - perfect for comparison
const providers = ["openai", "anthropic", "google", "cohere", "huggingface"];

// Execute in parallel for comparison
const results = await Promise.all(
    models.map((model) =>
        executeLLMNode(
            {
                provider: model.provider,
                model: model.name,
                prompt: config.prompt,
                connectionId: model.connectionId
            },
            context
        )
    )
);
```

### Model Cost Tracking

```typescript
// LLMNodeResult already includes usage data
interface LLMNodeResult {
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

// Calculate cost based on model pricing table
const cost = calculateCost(result.usage, modelPricing[model]);
```

### Model Capabilities Database

Consider adding model metadata for intelligent routing:

```typescript
// Model capability/pricing info for routing decisions
const modelInfo = {
    "gpt-4": { capability: 10, costPer1k: 0.03, maxTokens: 128000 },
    "gpt-3.5-turbo": { capability: 7, costPer1k: 0.002, maxTokens: 16385 },
    "claude-3-opus": { capability: 10, costPer1k: 0.015, maxTokens: 200000 }
};
```

---

## Nodes (2)

| Node               | Description                       | Category       |
| ------------------ | --------------------------------- | -------------- |
| **Compare Models** | Run prompt across multiple models | ai/advanced-ai |
| **Model Router**   | Select best model for task        | ai/advanced-ai |

---

## Node Specifications

### Compare Models Node

**Purpose**: Send same prompt to multiple models and compare results

**Config**:

- Models to compare (2-4 models)
- Evaluation criteria: quality / speed / cost / custom
- Return: best / all / ranked
- Voting mode (optional)

**Inputs**: `prompt` (string), `context` (optional)
**Outputs**: `results` (array), `winner` (object), `comparison` (object)

### Model Router Node

**Purpose**: Intelligently route to best model based on task

**Config**:

- Available models (with cost/capability info)
- Routing criteria: complexity / topic / length / cost
- Fallback model
- Custom routing rules

**Inputs**: `prompt` (string), `requirements` (optional)
**Outputs**: `response` (string), `selectedModel` (string), `reasoning` (string)

---

## Test Workflow: Model Comparison

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────┐
│   Input     │───▶│  Compare Models  │───▶│   Output    │
│ (prompt)    │    │ (GPT-4, Claude)  │    │ (comparison)│
└─────────────┘    └──────────────────┘    └─────────────┘
```

**Test Input**: "Explain quantum computing in simple terms"
**Expected**: Both model responses + comparison analysis

---

## Files to Create

### Frontend Components

```
frontend/src/canvas/nodes/ai/advanced-ai/
├── CompareModelsNode.tsx
├── ModelRouterNode.tsx
├── config/
│   ├── CompareModelsNodeConfig.tsx
│   └── ModelRouterNodeConfig.tsx
└── index.ts
```

### Backend Executors

```
backend/src/temporal/activities/node-executors/ai/
├── compare-models-executor.ts
└── model-router-executor.ts
```

---

## How to Deliver

1. Register both nodes in `node-registry.ts`
2. Create frontend node components
3. Create config forms with model multi-select
4. Implement parallel model execution
5. Implement comparison/evaluation logic
6. Implement routing intelligence
7. Track cost per model call
8. Test with multiple providers

---

## How to Test

| Test                     | Expected Result                |
| ------------------------ | ------------------------------ |
| Compare GPT-4 vs Claude  | Both responses returned        |
| Compare with "best" mode | Winner selected with reasoning |
| Router simple query      | Routes to cheaper model        |
| Router complex query     | Routes to capable model        |
| Router with cost limit   | Respects budget constraint     |

### Integration Tests

```typescript
describe("Compare Models Node", () => {
    it("compares multiple models", async () => {
        const result = await executeCompareModels({
            prompt: "What is 2+2?",
            models: ["gpt-4", "claude-3-sonnet"],
            returnMode: "all"
        });
        expect(result.results).toHaveLength(2);
        expect(result.results[0].model).toBe("gpt-4");
        expect(result.results[1].model).toBe("claude-3-sonnet");
    });
});

describe("Model Router Node", () => {
    it("routes based on complexity", async () => {
        const simple = await executeModelRouter({
            prompt: "What is 2+2?",
            criteria: "cost-optimized"
        });
        expect(simple.selectedModel).toBe("gpt-3.5-turbo");

        const complex = await executeModelRouter({
            prompt: "Analyze the philosophical implications of...",
            criteria: "quality-optimized"
        });
        expect(complex.selectedModel).toBe("gpt-4");
    });
});
```

---

## Acceptance Criteria

- [ ] Compare Models sends prompt to all selected models
- [ ] Compare Models returns all responses with timing/cost
- [ ] Compare Models can auto-select winner
- [ ] Compare Models supports custom evaluation criteria
- [ ] Model Router analyzes prompt complexity
- [ ] Model Router considers cost constraints
- [ ] Model Router explains routing decision
- [ ] Model Router has fallback on failure
- [ ] Both nodes track and display costs
- [ ] Both nodes display with AI category styling

---

## Dependencies

These nodes enable cost optimization and quality assurance for AI workflows.
