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

**Config Interface**:

```typescript
export interface CompareModelsNodeConfig {
    models: Array<{
        provider: string;
        model: string;
        connectionId: string;
        label?: string; // Display name for comparison
    }>;
    evaluationCriteria: "quality" | "speed" | "cost" | "custom";
    customEvaluator?: string; // Natural language criteria for "custom"
    returnMode: "best" | "all" | "ranked";
    votingMode?: "none" | "majority" | "consensus";
    timeout?: number; // Per-model timeout in ms
    outputVariable: string;
}

// Output structure
interface CompareModelsResult {
    results: Array<{
        model: string;
        provider: string;
        response: string;
        latencyMs: number;
        tokens: { prompt: number; completion: number };
        cost: number;
        score?: number;
    }>;
    winner?: {
        model: string;
        provider: string;
        response: string;
        reasoning: string;
    };
    comparison: {
        fastestModel: string;
        cheapestModel: string;
        bestQualityModel?: string;
        totalCost: number;
        totalLatencyMs: number;
    };
}
```

**Inputs**: `prompt` (string), `context` (optional)
**Outputs**: `results` (array), `winner` (object), `comparison` (object)

### Model Router Node

**Purpose**: Intelligently route to best model based on task

**Config Interface**:

```typescript
export interface ModelRouterNodeConfig {
    availableModels: Array<{
        provider: string;
        model: string;
        connectionId: string;
        capability: number; // 1-10 scale
        costPer1kTokens: number;
        maxTokens: number;
        specialties?: string[]; // e.g., ["code", "math", "creative"]
    }>;
    routingCriteria: "complexity" | "cost" | "quality" | "speed" | "custom";
    customRules?: string; // Natural language routing rules
    complexityAnalysis: boolean; // Pre-analyze prompt complexity
    fallbackModel: {
        provider: string;
        model: string;
        connectionId: string;
    };
    outputVariable: string;
}

// Output structure
interface ModelRouterResult {
    response: string;
    selectedModel: {
        provider: string;
        model: string;
    };
    reasoning: string;
    metrics: {
        promptComplexity?: number;
        estimatedTokens: number;
        actualCost: number;
        latencyMs: number;
    };
}
```

**Inputs**: `prompt` (string), `requirements` (optional)
**Outputs**: `response` (string), `selectedModel` (string), `reasoning` (string)

---

## Backend Executors

### Compare Models Executor

```typescript
// backend/src/temporal/activities/node-executors/ai/compare-models-executor.ts
import { executeLLMNode } from "../llm-executor";
import { MODEL_PRICING } from "../../../shared/model-pricing";

export async function executeCompareModelsNode(
    config: CompareModelsNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const prompt = interpolateVariables(config.inputVariable || "prompt", context);

    // Execute all models in parallel
    const startTime = Date.now();
    const results = await Promise.all(
        config.models.map(async (model) => {
            const modelStart = Date.now();
            try {
                const result = await executeLLMNode(
                    {
                        provider: model.provider,
                        model: model.model,
                        connectionId: model.connectionId,
                        prompt,
                        timeout: config.timeout
                    },
                    context
                );

                const latencyMs = Date.now() - modelStart;
                const pricing = MODEL_PRICING[`${model.provider}/${model.model}`];
                const cost = pricing
                    ? (result.usage.promptTokens * pricing.input +
                          result.usage.completionTokens * pricing.output) /
                      1000
                    : 0;

                return {
                    model: model.model,
                    provider: model.provider,
                    label: model.label || model.model,
                    response: result.text,
                    latencyMs,
                    tokens: {
                        prompt: result.usage.promptTokens,
                        completion: result.usage.completionTokens
                    },
                    cost,
                    error: null
                };
            } catch (error) {
                return {
                    model: model.model,
                    provider: model.provider,
                    label: model.label || model.model,
                    response: null,
                    latencyMs: Date.now() - modelStart,
                    tokens: { prompt: 0, completion: 0 },
                    cost: 0,
                    error: error.message
                };
            }
        })
    );

    // Filter successful results
    const successfulResults = results.filter((r) => !r.error);

    // Determine winner based on criteria
    let winner = null;
    if (config.returnMode !== "all" && successfulResults.length > 0) {
        winner = await selectWinner(successfulResults, config, context);
    }

    // Build comparison summary
    const comparison = {
        fastestModel: successfulResults.reduce((a, b) => (a.latencyMs < b.latencyMs ? a : b))
            ?.model,
        cheapestModel: successfulResults.reduce((a, b) => (a.cost < b.cost ? a : b))?.model,
        bestQualityModel: winner?.model,
        totalCost: successfulResults.reduce((sum, r) => sum + r.cost, 0),
        totalLatencyMs: Date.now() - startTime
    };

    return {
        ...context,
        variables: {
            ...context.variables,
            [config.outputVariable]: { results, winner, comparison }
        }
    };
}

async function selectWinner(
    results: ModelResult[],
    config: CompareModelsNodeConfig,
    context: JsonObject
): Promise<{ model: string; provider: string; response: string; reasoning: string }> {
    if (config.evaluationCriteria === "speed") {
        const fastest = results.reduce((a, b) => (a.latencyMs < b.latencyMs ? a : b));
        return { ...fastest, reasoning: "Fastest response time" };
    }

    if (config.evaluationCriteria === "cost") {
        const cheapest = results.reduce((a, b) => (a.cost < b.cost ? a : b));
        return { ...cheapest, reasoning: "Lowest cost" };
    }

    // For quality/custom, use LLM to evaluate
    const evaluatorPrompt = `Compare these responses and select the best one.
Criteria: ${config.customEvaluator || "Overall quality, accuracy, and helpfulness"}

${results.map((r, i) => `Response ${i + 1} (${r.label}):\n${r.response}`).join("\n\n---\n\n")}

Return JSON: { "winnerIndex": 0-${results.length - 1}, "reasoning": "why this is best" }`;

    const evaluation = await executeLLMNode(
        {
            provider: "openai",
            model: "gpt-4",
            prompt: evaluatorPrompt,
            temperature: 0
        },
        context
    );

    const parsed = JSON.parse(evaluation.text);
    const winner = results[parsed.winnerIndex];
    return { ...winner, reasoning: parsed.reasoning };
}
```

### Model Router Executor

````typescript
// backend/src/temporal/activities/node-executors/ai/model-router-executor.ts
export async function executeModelRouterNode(
    config: ModelRouterNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const prompt = interpolateVariables(config.inputVariable || "prompt", context);

    let selectedModel = config.fallbackModel;
    let reasoning = "Using fallback model";
    let complexity = 0;

    // Analyze prompt complexity if enabled
    if (config.complexityAnalysis) {
        complexity = await analyzeComplexity(prompt, context);
    }

    // Select model based on criteria
    switch (config.routingCriteria) {
        case "complexity":
            selectedModel = selectByComplexity(config.availableModels, complexity);
            reasoning = `Selected based on complexity score ${complexity.toFixed(2)}`;
            break;

        case "cost":
            selectedModel = config.availableModels.reduce((a, b) =>
                a.costPer1kTokens < b.costPer1kTokens ? a : b
            );
            reasoning = "Selected cheapest available model";
            break;

        case "quality":
            selectedModel = config.availableModels.reduce((a, b) =>
                a.capability > b.capability ? a : b
            );
            reasoning = "Selected highest capability model";
            break;

        case "custom":
            const selection = await routeWithCustomRules(prompt, config, context);
            selectedModel = selection.model;
            reasoning = selection.reasoning;
            break;
    }

    // Execute the selected model
    const startTime = Date.now();
    const result = await executeLLMNode(
        {
            provider: selectedModel.provider,
            model: selectedModel.model,
            connectionId: selectedModel.connectionId,
            prompt
        },
        context
    );

    return {
        ...context,
        variables: {
            ...context.variables,
            [config.outputVariable]: {
                response: result.text,
                selectedModel: {
                    provider: selectedModel.provider,
                    model: selectedModel.model
                },
                reasoning,
                metrics: {
                    promptComplexity: complexity,
                    estimatedTokens: result.usage.totalTokens,
                    actualCost: calculateCost(result.usage, selectedModel),
                    latencyMs: Date.now() - startTime
                }
            }
        }
    };
}

async function analyzeComplexity(prompt: string, context: JsonObject): Promise<number> {
    // Quick heuristics for complexity
    const wordCount = prompt.split(/\s+/).length;
    const hasCode = /```/.test(prompt);
    const hasMath = /[\d+\-*/^=]/.test(prompt);
    const questionCount = (prompt.match(/\?/g) || []).length;

    // Base complexity on heuristics (0-1 scale)
    let complexity = Math.min(wordCount / 500, 1) * 0.3;
    if (hasCode) complexity += 0.3;
    if (hasMath) complexity += 0.2;
    complexity += Math.min(questionCount * 0.1, 0.2);

    return Math.min(complexity, 1);
}

function selectByComplexity(
    models: ModelRouterNodeConfig["availableModels"],
    complexity: number
): ModelInfo {
    // Map complexity to capability requirement
    const requiredCapability = Math.ceil(complexity * 10);

    // Find cheapest model that meets capability requirement
    const eligible = models.filter((m) => m.capability >= requiredCapability);
    if (eligible.length === 0) {
        return models.reduce((a, b) => (a.capability > b.capability ? a : b));
    }
    return eligible.reduce((a, b) => (a.costPer1kTokens < b.costPer1kTokens ? a : b));
}
````

---

## Node Registration

```typescript
// Add to node-registry.ts
registerNode({
    type: "compare-models",
    label: "Compare Models",
    description: "Run prompt across multiple models and compare results",
    icon: "GitCompare",
    category: "ai",
    subcategory: "advanced-ai",
    keywords: ["compare", "benchmark", "evaluate", "models", "test"]
});

registerNode({
    type: "model-router",
    label: "Model Router",
    description: "Intelligently route to best model for task",
    icon: "Route",
    category: "ai",
    subcategory: "advanced-ai",
    keywords: ["route", "select", "choose", "model", "optimize"]
});
```

---

## Unit Tests

### Test Pattern

**Pattern B (Mock LLM)**: Mock multiple LLM providers for parallel execution testing.

### Files to Create

| Executor      | Test File                                                              | Pattern |
| ------------- | ---------------------------------------------------------------------- | ------- |
| CompareModels | `backend/tests/unit/node-executors/ai/compare-models-executor.test.ts` | B       |
| ModelRouter   | `backend/tests/unit/node-executors/ai/model-router-executor.test.ts`   | B       |

### Mock Setup

```typescript
// Mock multiple providers returning different responses
mockLLM.setResponse("openai/gpt-4", "Response from GPT-4");
mockLLM.setResponse("anthropic/claude-3", "Response from Claude");
```

### Required Test Cases

#### compare-models-executor.test.ts

- `should execute prompt across all configured models`
- `should return responses with latency metrics`
- `should calculate cost per model response`
- `should select winner based on speed criteria`
- `should select winner based on cost criteria`
- `should use LLM evaluator for quality criteria`
- `should handle partial failures gracefully`
- `should respect per-model timeout`

#### model-router-executor.test.ts

- `should analyze prompt complexity`
- `should route simple queries to cheaper models`
- `should route complex queries to capable models`
- `should respect cost optimization criteria`
- `should use fallback model on routing failure`
- `should explain routing decision`
- `should consider model specialties`

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
