# Phase 10: Analysis AI Nodes

## Overview

Implement 4 AI analysis nodes: Categorizer, Sentiment Analyzer, Scorer, and AI List Sorter.

---

## Prerequisites

- **Phase 09**: Core AI nodes (uses same executor patterns)

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

**Config**:

- Categories list (name + description each)
- Multi-label (allow multiple categories)
- Include confidence threshold
- "Other" category option

**Inputs**: `text` (string)
**Outputs**: `category` (string), `confidence` (number), `allScores` (object)

### Sentiment Analyzer Node

**Purpose**: Analyze emotional tone of text

**Config**:

- Granularity: 3-way / 5-way / continuous
- Aspects to analyze (optional)
- Include emotion labels

**Inputs**: `text` (string)
**Outputs**: `sentiment` (positive/neutral/negative), `score` (-1 to 1), `emotions` (object)

### Scorer Node

**Purpose**: Assign numeric scores based on criteria

**Config**:

- Scoring criteria (list of factors)
- Score range (0-100, 1-10, etc.)
- Weights per criteria (optional)
- Explanation required

**Inputs**: `text` (string)
**Outputs**: `score` (number), `breakdown` (object), `explanation` (string)

### AI List Sorter Node

**Purpose**: Sort/rank items using AI judgment

**Config**:

- Sorting criteria (natural language)
- Order: ascending / descending
- Limit results (optional)

**Inputs**: `items` (array)
**Outputs**: `sorted` (array), `rankings` (array)

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
