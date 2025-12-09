# Phase 06: Analysis AI Nodes

## Overview

Implement 4 AI analysis nodes: Categorizer, Sentiment Analyzer, Scorer, and AI List Sorter.

---

## Prerequisites

- **Phase 05**: Core AI nodes (uses same executor patterns)

---

## Existing Infrastructure

### Leverage LLM Executor with Structured Output

All analysis nodes should use the existing `executeLLMNode()` with JSON response format:

**File**: `backend/src/temporal/activities/node-executors/llm-executor.ts`

```typescript
// Use temperature: 0 for deterministic analysis results
const result = await executeLLMNode(
    {
        provider: config.provider,
        model: config.model,
        systemPrompt: `You are a classification assistant. Return ONLY valid JSON.`,
        prompt: text,
        temperature: 0 // Deterministic for analysis
    },
    context
);

// Parse structured response
const analysis = JSON.parse(result.text);
```

### Common Pattern for Analysis Nodes

```typescript
// All analysis nodes follow this pattern:
// 1. Build specialized system prompt for the task
// 2. Call executeLLMNode() with temperature 0
// 3. Parse JSON response
// 4. Return structured result with confidence scores
```

---

## Nodes (4)

| Node                   | Description                 | Category    |
| ---------------------- | --------------------------- | ----------- |
| **Categorizer**        | Assign categories from list | ai/using-ai |
| **Sentiment Analyzer** | Return sentiment + score    | ai/using-ai |
| **Scorer**             | Assign numeric scores       | ai/using-ai |
| **AI List Sorter**     | Reorder by AI criteria      | ai/using-ai |

---

## Node Specifications

### Categorizer Node

**Purpose**: Classify content into predefined categories

**Config Interface**:

```typescript
export interface CategorizerNodeConfig {
    provider: string;
    model: string;
    connectionId: string;
    categories: Array<{
        name: string;
        description: string;
    }>;
    multiLabel: boolean;
    confidenceThreshold: number; // 0-1, default 0.7
    includeOther: boolean;
    outputVariable: string;
}
```

**Inputs**: `text` (string)
**Outputs**: `category` (string), `confidence` (number), `allScores` (object)

### Sentiment Analyzer Node

**Purpose**: Analyze emotional tone of text

**Config Interface**:

```typescript
export interface SentimentAnalyzerNodeConfig {
    provider: string;
    model: string;
    connectionId: string;
    granularity: "3-way" | "5-way" | "continuous";
    aspects?: string[]; // e.g., ["product", "service", "delivery"]
    includeEmotions: boolean;
    outputVariable: string;
}

// Output structure
interface SentimentResult {
    sentiment: "positive" | "negative" | "neutral" | "mixed";
    score: number; // -1 to 1
    emotions?: {
        joy: number;
        anger: number;
        sadness: number;
        fear: number;
        surprise: number;
    };
    aspectSentiments?: Record<string, { sentiment: string; score: number }>;
}
```

**Inputs**: `text` (string)
**Outputs**: `sentiment` (positive/neutral/negative), `score` (-1 to 1), `emotions` (object)

### Scorer Node

**Purpose**: Assign numeric scores based on criteria

**Config Interface**:

```typescript
export interface ScorerNodeConfig {
    provider: string;
    model: string;
    connectionId: string;
    criteria: Array<{
        name: string;
        description: string;
        weight: number; // 0-1, defaults to equal weight
    }>;
    scoreRange: {
        min: number;
        max: number;
    };
    requireExplanation: boolean;
    outputVariable: string;
}

// Output structure
interface ScorerResult {
    score: number;
    breakdown: Record<string, number>; // score per criterion
    explanation?: string;
}
```

**Inputs**: `text` (string)
**Outputs**: `score` (number), `breakdown` (object), `explanation` (string)

### AI List Sorter Node

**Purpose**: Sort/rank items using AI judgment

**Config Interface**:

```typescript
export interface AIListSorterNodeConfig {
    provider: string;
    model: string;
    connectionId: string;
    criteria: string; // Natural language: "most relevant to topic X"
    order: "ascending" | "descending";
    limit?: number;
    outputVariable: string;
}

// Output structure
interface AIListSorterResult {
    sorted: unknown[];
    rankings: Array<{
        index: number;
        score: number;
        reasoning: string;
    }>;
}
```

**Inputs**: `items` (array)
**Outputs**: `sorted` (array), `rankings` (array)

---

## Backend Executors

### Categorizer Executor

```typescript
// backend/src/temporal/activities/node-executors/ai/categorizer-executor.ts
import { executeLLMNode } from "../llm-executor";

export async function executeCategorizerNode(
    config: CategorizerNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const text = interpolateVariables(config.inputVariable || "text", context);

    const categoryList = config.categories.map((c) => `- ${c.name}: ${c.description}`).join("\n");

    const systemPrompt = `You are a classification assistant. Classify the given text into one of these categories:

${categoryList}
${config.includeOther ? "- other: Does not fit any category" : ""}

Return JSON: { "category": "name", "confidence": 0.0-1.0, "allScores": { "cat1": 0.9, ... } }
${config.multiLabel ? 'For multi-label, return: { "categories": ["cat1", "cat2"], ... }' : ""}`;

    const result = await executeLLMNode(
        {
            provider: config.provider,
            model: config.model,
            connectionId: config.connectionId,
            systemPrompt,
            prompt: text,
            temperature: 0
        },
        context
    );

    const parsed = JSON.parse(result.text);

    // Filter by confidence threshold
    if (parsed.confidence < config.confidenceThreshold) {
        parsed.category = config.includeOther ? "other" : parsed.category;
    }

    return {
        ...context,
        variables: {
            ...context.variables,
            [config.outputVariable]: parsed
        }
    };
}
```

### Sentiment Analyzer Executor

```typescript
// backend/src/temporal/activities/node-executors/ai/sentiment-analyzer-executor.ts
export async function executeSentimentAnalyzerNode(
    config: SentimentAnalyzerNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const text = interpolateVariables(config.inputVariable || "text", context);

    let outputFormat = `{ "sentiment": "positive|negative|neutral", "score": -1.0 to 1.0 }`;
    if (config.granularity === "5-way") {
        outputFormat = `{ "sentiment": "very_positive|positive|neutral|negative|very_negative", "score": -1.0 to 1.0 }`;
    }
    if (config.includeEmotions) {
        outputFormat += `, "emotions": { "joy": 0-1, "anger": 0-1, "sadness": 0-1, "fear": 0-1, "surprise": 0-1 }`;
    }
    if (config.aspects?.length) {
        outputFormat += `, "aspectSentiments": { "${config.aspects[0]}": { "sentiment": "...", "score": ... } }`;
    }

    const systemPrompt = `Analyze the sentiment of the given text.
Return JSON: ${outputFormat}`;

    const result = await executeLLMNode(
        {
            provider: config.provider,
            model: config.model,
            connectionId: config.connectionId,
            systemPrompt,
            prompt: text,
            temperature: 0
        },
        context
    );

    return {
        ...context,
        variables: {
            ...context.variables,
            [config.outputVariable]: JSON.parse(result.text)
        }
    };
}
```

### Scorer Executor

```typescript
// backend/src/temporal/activities/node-executors/ai/scorer-executor.ts
export async function executeScorerNode(
    config: ScorerNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const text = interpolateVariables(config.inputVariable || "text", context);

    const criteriaList = config.criteria
        .map((c) => `- ${c.name} (weight: ${c.weight}): ${c.description}`)
        .join("\n");

    const systemPrompt = `Score the given text based on these criteria:

${criteriaList}

Score range: ${config.scoreRange.min} to ${config.scoreRange.max}

Return JSON: {
    "score": <weighted average>,
    "breakdown": { "criterion1": <score>, ... }
    ${config.requireExplanation ? ', "explanation": "<why this score>"' : ""}
}`;

    const result = await executeLLMNode(
        {
            provider: config.provider,
            model: config.model,
            connectionId: config.connectionId,
            systemPrompt,
            prompt: text,
            temperature: 0
        },
        context
    );

    return {
        ...context,
        variables: {
            ...context.variables,
            [config.outputVariable]: JSON.parse(result.text)
        }
    };
}
```

### AI List Sorter Executor

```typescript
// backend/src/temporal/activities/node-executors/ai/ai-list-sorter-executor.ts
export async function executeAIListSorterNode(
    config: AIListSorterNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const items = interpolateVariables(config.inputVariable || "items", context);

    const systemPrompt = `Sort the following items based on this criteria: "${config.criteria}"
Order: ${config.order}
${config.limit ? `Return only the top ${config.limit} items.` : ""}

Return JSON: {
    "sorted": [<items in order>],
    "rankings": [{ "index": <original index>, "score": 0-100, "reasoning": "<why>" }]
}`;

    const result = await executeLLMNode(
        {
            provider: config.provider,
            model: config.model,
            connectionId: config.connectionId,
            systemPrompt,
            prompt: JSON.stringify(items, null, 2),
            temperature: 0
        },
        context
    );

    return {
        ...context,
        variables: {
            ...context.variables,
            [config.outputVariable]: JSON.parse(result.text)
        }
    };
}
```

---

## Node Registration

```typescript
// Add to node-registry.ts
registerNode({
    type: "categorizer",
    label: "Categorizer",
    description: "Classify content into predefined categories",
    icon: "Tags",
    category: "ai",
    subcategory: "using-ai",
    keywords: ["classify", "label", "category", "tag", "sort"]
});

registerNode({
    type: "sentiment-analyzer",
    label: "Sentiment Analyzer",
    description: "Analyze emotional tone of text",
    icon: "Heart",
    category: "ai",
    subcategory: "using-ai",
    keywords: ["sentiment", "emotion", "tone", "feeling", "mood"]
});

registerNode({
    type: "scorer",
    label: "Scorer",
    description: "Assign numeric scores based on criteria",
    icon: "Star",
    category: "ai",
    subcategory: "using-ai",
    keywords: ["score", "rate", "evaluate", "grade", "rank"]
});

registerNode({
    type: "ai-list-sorter",
    label: "AI List Sorter",
    description: "Sort items using AI judgment",
    icon: "ArrowUpDown",
    category: "ai",
    subcategory: "using-ai",
    keywords: ["sort", "rank", "order", "prioritize", "arrange"]
});
```

---

## Unit Tests

### Test Pattern

**Pattern B (Mock LLM)**: Mock `executeLLMNode` with canned JSON responses for deterministic testing.

### Files to Create

| Executor          | Test File                                                                  | Pattern |
| ----------------- | -------------------------------------------------------------------------- | ------- |
| Categorizer       | `backend/tests/unit/node-executors/ai/categorizer-executor.test.ts`        | B       |
| SentimentAnalyzer | `backend/tests/unit/node-executors/ai/sentiment-analyzer-executor.test.ts` | B       |
| Scorer            | `backend/tests/unit/node-executors/ai/scorer-executor.test.ts`             | B       |
| AIListSorter      | `backend/tests/unit/node-executors/ai/ai-list-sorter-executor.test.ts`     | B       |

### Mock Setup

```typescript
mockLLM.setJSONResponse(/classification/i, {
    category: "billing",
    confidence: 0.95,
    allScores: { billing: 0.95, technical: 0.03, shipping: 0.02 }
});
```

### Required Test Cases

#### categorizer-executor.test.ts

- `should assign category from defined list`
- `should return confidence scores per category`
- `should support multi-label classification`
- `should fall back to "other" when below threshold`
- `should handle empty category list`

#### sentiment-analyzer-executor.test.ts

- `should return positive/negative/neutral sentiment`
- `should return score in -1 to 1 range`
- `should detect mixed sentiment`
- `should return emotion labels when enabled`
- `should analyze aspect-based sentiment`

#### scorer-executor.test.ts

- `should assign score based on criteria`
- `should return breakdown by criterion`
- `should calculate weighted average`
- `should include explanation when required`
- `should respect score range configuration`

#### ai-list-sorter-executor.test.ts

- `should sort items by semantic criteria`
- `should return rankings with scores`
- `should include reasoning per item`
- `should respect limit configuration`
- `should handle ascending/descending order`

---

## Test Workflow: Feedback Analysis

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│   Input     │───▶│  Sentiment   │───▶│ Categorizer │───▶│   Output    │
│ (reviews)   │    │  Analyzer    │    │ (topic)     │    │ (results)   │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
```

**Test Input**:

```json
[
    "The product is amazing! Best purchase ever.",
    "Terrible customer service, waited 2 hours.",
    "Good value for money, but shipping was slow."
]
```

**Expected Output**:

```json
[
    { "sentiment": "positive", "score": 0.9, "category": "product-quality" },
    { "sentiment": "negative", "score": -0.8, "category": "customer-service" },
    { "sentiment": "mixed", "score": 0.2, "category": "shipping" }
]
```

---

## Files to Create

### Frontend Components

```
frontend/src/canvas/nodes/ai/using-ai/
├── CategorizerNode.tsx
├── SentimentAnalyzerNode.tsx
├── ScorerNode.tsx
├── AIListSorterNode.tsx
├── config/
│   ├── CategorizerNodeConfig.tsx
│   ├── SentimentAnalyzerNodeConfig.tsx
│   ├── ScorerNodeConfig.tsx
│   └── AIListSorterNodeConfig.tsx
└── index.ts
```

### Backend Executors

```
backend/src/temporal/activities/node-executors/ai/
├── categorizer-executor.ts
├── sentiment-analyzer-executor.ts
├── scorer-executor.ts
└── ai-list-sorter-executor.ts
```

---

## How to Deliver

1. Register all 4 nodes in `node-registry.ts`
2. Create frontend node components
3. Create config forms with category/criteria editors
4. Implement backend executors using LLM with structured output
5. Add confidence calibration
6. Test with diverse content types

---

## How to Test

| Test                          | Expected Result               |
| ----------------------------- | ----------------------------- |
| Categorizer with 5 categories | Assigns correct category      |
| Categorizer multi-label       | Returns multiple categories   |
| Sentiment on positive text    | Returns positive + high score |
| Sentiment on negative text    | Returns negative + low score  |
| Scorer with criteria          | Returns score + breakdown     |
| AI List Sorter                | Items reordered by criteria   |

### Unit Tests

```typescript
describe("Categorizer Node", () => {
    it("assigns category from list", async () => {
        const result = await executeCategorizer({
            text: "My credit card charge is wrong",
            categories: ["billing", "technical", "shipping", "other"]
        });
        expect(result.category).toBe("billing");
        expect(result.confidence).toBeGreaterThan(0.8);
    });
});

describe("Sentiment Analyzer", () => {
    it("detects positive sentiment", async () => {
        const result = await executeSentiment({
            text: "I absolutely love this product!"
        });
        expect(result.sentiment).toBe("positive");
        expect(result.score).toBeGreaterThan(0.5);
    });
});
```

---

## Acceptance Criteria

- [ ] Categorizer assigns categories from defined list
- [ ] Categorizer returns confidence scores per category
- [ ] Categorizer supports multi-label classification
- [ ] Sentiment Analyzer returns positive/negative/neutral
- [ ] Sentiment Analyzer returns score (-1 to 1)
- [ ] Sentiment Analyzer optionally returns emotion labels
- [ ] Scorer assigns score based on criteria
- [ ] Scorer provides breakdown by criteria
- [ ] Scorer includes natural language explanation
- [ ] AI List Sorter reorders by semantic criteria
- [ ] All nodes display with AI category styling

---

## Dependencies

These nodes enable content analysis workflows like feedback processing, lead scoring, and content moderation.
