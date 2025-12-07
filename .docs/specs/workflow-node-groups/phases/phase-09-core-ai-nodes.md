# Phase 09: Core AI Nodes

## Overview

Implement 4 fundamental AI nodes: Ask AI, Extract Data, Summarizer, and Translator.

---

## Prerequisites

- **Phase 08**: File Processing nodes (Parse PDF for document input)

---

## Existing Infrastructure

### LLM Executor Already Exists

**File**: `backend/src/temporal/activities/node-executors/llm-executor.ts`

```typescript
// Complete multi-provider LLM executor with streaming support
export interface LLMNodeConfig {
    provider: "openai" | "anthropic" | "google" | "cohere" | "huggingface";
    model: string;
    connectionId?: string; // Uses connection or env var
    systemPrompt?: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    outputVariable?: string;
}

export interface LLMNodeResult {
    text: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
    provider: string;
}

export async function executeLLMNode(
    config: LLMNodeConfig,
    context: JsonObject,
    callbacks?: LLMExecutionCallbacks
): Promise<JsonObject>;
```

### Connection Repository for API Keys

**File**: `backend/src/storage/repositories/ConnectionRepository.ts`

```typescript
// API keys are stored securely in connections
const connection = await connectionRepository.findByIdWithData(connectionId);
const apiKey = (connection.data as ApiKeyData).api_key;
```

### Variable Interpolation

**File**: `backend/src/temporal/activities/node-executors/utils.ts`

```typescript
import { interpolateVariables } from "./utils";

// Use in prompts: "Summarize: ${documentText}"
const userPrompt = interpolateVariables(config.prompt, context);
```

### Retry with Exponential Backoff

The LLM executor already includes retry logic for rate limits and overload errors:

```typescript
// Automatically retries on 429, 503, 529 status codes
// Handles Anthropic overload_error, rate_limit_error
// Uses exponential backoff: 1s → 2s → 4s (max 10s)
```

---

## Nodes (4)

| Node             | Description                    | Category    |
| ---------------- | ------------------------------ | ----------- |
| **Ask AI**       | General chat completion        | ai/using-ai |
| **Extract Data** | Pull structured data from text | ai/using-ai |
| **Summarizer**   | Condense text to length        | ai/using-ai |
| **Translator**   | Translate between languages    | ai/using-ai |

---

## Node Specifications

### Ask AI Node

**Purpose**: Send prompts to AI models and get responses. This is the primary node for all AI interactions.

**Config**:

```typescript
interface AskAINodeConfig {
    // Provider & Model (reuses LLMNodeConfig)
    provider: "openai" | "anthropic" | "google" | "cohere" | "huggingface";
    model: string;
    connectionId?: string;

    // Prompts
    systemPrompt?: string; // System message for context
    prompt: string; // User prompt with ${variable} interpolation

    // Generation settings
    temperature?: number; // 0-2, default 0.7
    maxTokens?: number; // Default 1000
    topP?: number; // Default 1

    // Response format
    responseFormat?: "text" | "json";
    jsonSchema?: JsonSchema; // If responseFormat is "json"

    // Output
    outputVariable: string;
}
```

**Frontend Component**:

```typescript
// frontend/src/canvas/nodes/AskAINode.tsx
function AskAINode({ id, data, selected }: NodeProps<AskAINodeData>) {
    return (
        <>
            <BaseNode
                id={id}
                icon={Bot}
                label={data.label || "Ask AI"}
                category="ai"
                selected={selected}
                configPreview={
                    data.model
                        ? `${data.provider}: ${data.model}`
                        : "Configure model"
                }
                inputs={[
                    { name: "prompt", type: "string" },
                    { name: "context", type: "object" }
                ]}
                outputs={[
                    { name: "response", type: "string" },
                    { name: "usage", type: "object" }
                ]}
            />
            <NodeConfigWrapper nodeId={id} title="Ask AI" category="ai">
                <AskAINodeConfig data={data} onUpdate={(cfg) => updateNode(id, cfg)} />
            </NodeConfigWrapper>
        </>
    );
}
```

**Backend**: Uses existing `executeLLMNode()` directly.

**Inputs**: `prompt` (string), `context` (optional)
**Outputs**: `response` (string), `usage` (object)

### Extract Data Node

**Purpose**: Extract structured data from unstructured text using AI with schema enforcement

**Config**:

```typescript
interface ExtractDataNodeConfig {
    // Provider settings (inherits from Ask AI)
    provider: "openai" | "anthropic" | "google";
    model: string;
    connectionId?: string;

    // Input
    inputText: string; // "${documentText}" or inline text

    // Output schema definition
    schemaMode: "fields" | "jsonSchema";

    // For schemaMode: "fields"
    fields?: Array<{
        name: string; // "invoiceNumber"
        type: "string" | "number" | "boolean" | "date" | "array";
        description: string; // "The invoice number, usually starts with INV-"
        required: boolean;
    }>;

    // For schemaMode: "jsonSchema"
    jsonSchema?: JsonSchema;

    // Extraction behavior
    strictMode: boolean; // Fail if required fields missing
    includeConfidence: boolean; // Return confidence per field

    // Output
    outputVariable: string;
}
```

**Backend Executor**:

```typescript
// backend/src/temporal/activities/node-executors/extract-data-executor.ts
export async function executeExtractDataNode(
    config: ExtractDataNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const inputText = interpolateVariables(config.inputText, context);

    // Build system prompt for structured extraction
    const systemPrompt = `You are a data extraction assistant. Extract the following fields from the text.
Return ONLY valid JSON matching this schema: ${JSON.stringify(config.jsonSchema || buildSchemaFromFields(config.fields))}
If a field cannot be found, ${config.strictMode ? "respond with an error" : "use null"}.`;

    const result = await executeLLMNode(
        {
            provider: config.provider,
            model: config.model,
            connectionId: config.connectionId,
            systemPrompt,
            prompt: `Extract data from:\n\n${inputText}`,
            temperature: 0, // Deterministic for extraction
            maxTokens: 2000
        },
        context
    );

    const extracted = JSON.parse(result.text);

    return {
        [config.outputVariable]: extracted,
        confidence: config.includeConfidence ? calculateFieldConfidence(extracted) : undefined
    };
}
```

**Inputs**: `text` (string)
**Outputs**: `data` (object), `confidence` (number)

### Summarizer Node

**Purpose**: Condense long text into summaries with configurable length and style

**Config**:

```typescript
interface SummarizerNodeConfig {
    // Provider settings
    provider: "openai" | "anthropic" | "google";
    model: string;
    connectionId?: string;

    // Input
    inputText: string; // "${documentText}"

    // Summary configuration
    lengthMode: "short" | "medium" | "long" | "custom";
    customLength?: number; // Word count if lengthMode is "custom"
    style: "paragraph" | "bullets" | "keyPoints" | "executive";

    // Optional focus
    focusAreas?: string[]; // ["financials", "risks", "recommendations"]

    // Output
    outputVariable: string;
}
```

**Backend Executor**:

```typescript
// backend/src/temporal/activities/node-executors/summarizer-executor.ts
export async function executeSummarizerNode(
    config: SummarizerNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const inputText = interpolateVariables(config.inputText, context);

    const lengthGuide = {
        short: "about 50 words",
        medium: "about 150 words",
        long: "about 300 words",
        custom: `exactly ${config.customLength} words`
    }[config.lengthMode];

    const styleGuide = {
        paragraph: "as flowing paragraphs",
        bullets: "as bullet points",
        keyPoints: "as numbered key points with brief explanations",
        executive: "as an executive summary with headline, key findings, and recommendations"
    }[config.style];

    const focusGuide = config.focusAreas?.length
        ? `Focus especially on: ${config.focusAreas.join(", ")}.`
        : "";

    const systemPrompt = `You are a professional summarizer. Create a summary ${lengthGuide}, formatted ${styleGuide}. ${focusGuide}`;

    const result = await executeLLMNode(
        {
            provider: config.provider,
            model: config.model,
            connectionId: config.connectionId,
            systemPrompt,
            prompt: `Summarize the following text:\n\n${inputText}`,
            temperature: 0.3,
            maxTokens: 1000
        },
        context
    );

    // Parse key points if style supports it
    const keyPoints =
        config.style === "bullets" || config.style === "keyPoints"
            ? extractBulletPoints(result.text)
            : undefined;

    return {
        [config.outputVariable]: {
            summary: result.text,
            keyPoints,
            wordCount: result.text.split(/\s+/).length
        }
    };
}
```

**Inputs**: `text` (string)
**Outputs**: `summary` (string), `keyPoints` (array)

### Translator Node

**Purpose**: Translate text between languages with optional glossary support

**Config**:

```typescript
interface TranslatorNodeConfig {
    // Provider settings
    provider: "openai" | "anthropic" | "google";
    model: string;
    connectionId?: string;

    // Input
    inputText: string; // "${userMessage}"

    // Translation settings
    sourceLanguage: "auto" | string; // ISO code or "auto"
    targetLanguage: string; // ISO code: "en", "es", "fr", etc.

    // Options
    preserveFormatting: boolean; // Keep markdown, HTML, etc.
    formalityLevel?: "formal" | "informal" | "neutral";

    // Custom terminology
    glossary?: Array<{
        source: string; // "API"
        target: string; // "API" (keep as-is)
    }>;

    // Output
    outputVariable: string;
}
```

**Backend Executor**:

```typescript
// backend/src/temporal/activities/node-executors/translator-executor.ts
export async function executeTranslatorNode(
    config: TranslatorNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const inputText = interpolateVariables(config.inputText, context);

    const glossaryGuide = config.glossary?.length
        ? `Use these translations for specific terms:\n${config.glossary.map((g) => `- "${g.source}" → "${g.target}"`).join("\n")}`
        : "";

    const formalityGuide = config.formalityLevel
        ? `Use ${config.formalityLevel} language register.`
        : "";

    const formatGuide = config.preserveFormatting
        ? "Preserve all formatting, markdown, and HTML tags exactly."
        : "";

    const systemPrompt = `You are a professional translator. Translate to ${getLanguageName(config.targetLanguage)}. ${formalityGuide} ${formatGuide} ${glossaryGuide}
Return ONLY the translation, no explanations.`;

    const result = await executeLLMNode(
        {
            provider: config.provider,
            model: config.model,
            connectionId: config.connectionId,
            systemPrompt,
            prompt: inputText,
            temperature: 0.2, // Low for accurate translation
            maxTokens: 4000 // Allow for longer texts
        },
        context
    );

    // Detect source language if auto
    const detectedLanguage =
        config.sourceLanguage === "auto" ? await detectLanguage(inputText) : config.sourceLanguage;

    return {
        [config.outputVariable]: {
            translated: result.text,
            detectedLanguage,
            targetLanguage: config.targetLanguage
        }
    };
}
```

**Inputs**: `text` (string)
**Outputs**: `translated` (string), `detectedLanguage` (string)

---

## Unit Tests

### Test Pattern

**Pattern B (Mock LLM)**: Mock `executeLLMNode` with canned responses for deterministic testing.

### Files to Create

| Executor    | Test File                                                            | Pattern |
| ----------- | -------------------------------------------------------------------- | ------- |
| AskAI       | `backend/tests/unit/node-executors/ai/ask-ai-executor.test.ts`       | B       |
| ExtractData | `backend/tests/unit/node-executors/ai/extract-data-executor.test.ts` | B       |
| Summarizer  | `backend/tests/unit/node-executors/ai/summarizer-executor.test.ts`   | B       |
| Translator  | `backend/tests/unit/node-executors/ai/translator-executor.test.ts`   | B       |

### Mock Setup

```typescript
import { MockLLMProvider } from "../../../mocks/llm-provider.mock";

let mockLLM: MockLLMProvider;
beforeEach(() => {
    mockLLM = new MockLLMProvider();
    jest.spyOn(llmExecutor, "executeLLMNode").mockImplementation(mockLLM.getMockExecutor());
});
```

### Required Test Cases

#### ask-ai-executor.test.ts

- `should send prompt to LLM and return response`
- `should interpolate variables in prompt template`
- `should include system prompt when configured`
- `should respect temperature setting`
- `should handle streaming responses`
- `should use specified provider and model`

#### extract-data-executor.test.ts

- `should extract fields according to schema`
- `should return structured JSON response`
- `should handle missing optional fields`
- `should validate extracted data types`
- `should throw on extraction failure`

#### summarizer-executor.test.ts

- `should summarize text to target length`
- `should preserve key points`
- `should handle different formats (bullets, paragraph)`
- `should respect maxLength configuration`
- `should handle very long input text`

#### translator-executor.test.ts

- `should translate text to target language`
- `should auto-detect source language`
- `should preserve formatting`
- `should return detected language in result`
- `should handle unsupported language pairs`

---

## Test Workflow: Multi-Language Support Ticket

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│   Input     │───▶│  Translator  │───▶│   Ask AI    │───▶│   Output    │
│ (Spanish)   │    │ (→ English)  │    │ (classify)  │    │ (category)  │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
```

**Test Input**:

```
"Hola, tengo un problema con mi factura. El monto es incorrecto."
```

**Expected**:

1. Translator outputs: "Hello, I have a problem with my invoice. The amount is incorrect."
2. Ask AI classifies: "billing" category

---

## Files to Create

### Frontend Components

```
frontend/src/canvas/nodes/ai/using-ai/
├── AskAINode.tsx
├── ExtractDataNode.tsx
├── SummarizerNode.tsx
├── TranslatorNode.tsx
├── config/
│   ├── AskAINodeConfig.tsx
│   ├── ExtractDataNodeConfig.tsx
│   ├── SummarizerNodeConfig.tsx
│   └── TranslatorNodeConfig.tsx
└── index.ts
```

### Backend Executors

```
backend/src/temporal/activities/node-executors/ai/
├── ask-ai-executor.ts
├── extract-data-executor.ts
├── summarizer-executor.ts
└── translator-executor.ts
```

---

## Node Registration

```typescript
// frontend/src/config/node-registrations/core-ai.ts
import { registerNode } from "../node-registry";

registerNode({
    type: "askAi",
    label: "Ask AI",
    description: "Send prompts to AI models and get responses",
    category: "ai",
    subcategory: "using-ai",
    icon: "Bot",
    keywords: ["llm", "gpt", "claude", "chat", "prompt", "ai", "ask"]
});

registerNode({
    type: "extractData",
    label: "Extract Data",
    description: "Extract structured data from unstructured text",
    category: "ai",
    subcategory: "using-ai",
    icon: "FileSearch",
    keywords: ["extract", "parse", "schema", "structured", "json", "fields"]
});

registerNode({
    type: "summarizer",
    label: "Summarizer",
    description: "Condense long text into summaries",
    category: "ai",
    subcategory: "using-ai",
    icon: "ListCollapse",
    keywords: ["summary", "condense", "tldr", "brief", "shorten"]
});

registerNode({
    type: "translator",
    label: "Translator",
    description: "Translate text between languages",
    category: "ai",
    subcategory: "using-ai",
    icon: "Languages",
    keywords: ["translate", "language", "localize", "spanish", "french", "i18n"]
});
```

---

## How to Deliver

1. Register all 4 nodes in `node-registry.ts` (see Node Registration above)
2. Create frontend node components with AI category styling (blue gradient)
3. Create config forms with model selector dropdown
4. Leverage existing `executeLLMNode()` - no new provider code needed
5. Implement specialized executors that wrap `executeLLMNode()` with specific prompts
6. Add token usage tracking (already included in LLMNodeResult)
7. Test with real API calls using connection credentials

---

## How to Test

| Test                     | Expected Result            |
| ------------------------ | -------------------------- |
| Ask AI with GPT-4        | Coherent response returned |
| Ask AI with Claude       | Coherent response returned |
| Extract Data with schema | Structured JSON extracted  |
| Summarizer short mode    | ~50 word summary           |
| Translator ES→EN         | Accurate translation       |
| Invalid model            | Clear error message        |

### API Integration Tests

```typescript
describe("Ask AI Node", () => {
    it("returns response from OpenAI", async () => {
        const result = await executeAskAI({
            provider: "openai",
            model: "gpt-4",
            prompt: "What is 2+2?",
            temperature: 0
        });
        expect(result.response).toContain("4");
    });
});

describe("Extract Data Node", () => {
    it("extracts structured data", async () => {
        const result = await executeExtractData({
            text: "John Smith, john@example.com, works at Acme Inc",
            schema: {
                name: "string",
                email: "string",
                company: "string"
            }
        });
        expect(result.data.name).toBe("John Smith");
        expect(result.data.email).toBe("john@example.com");
    });
});
```

---

## Acceptance Criteria

- [ ] Ask AI supports OpenAI, Anthropic, Google providers
- [ ] Ask AI shows model selector with available models
- [ ] Ask AI displays token usage after execution
- [ ] Extract Data generates JSON matching schema
- [ ] Extract Data shows confidence scores
- [ ] Summarizer respects target length
- [ ] Summarizer supports multiple output styles
- [ ] Translator detects source language
- [ ] Translator supports 50+ languages
- [ ] All nodes display with AI category styling (blue)
- [ ] All nodes track and display token usage

---

## Dependencies

These nodes are the foundation for all AI-powered workflows.

Enables:

- **Phase 10**: Analysis nodes build on AI executor
- **Phase 17**: KB Chat uses Ask AI pattern
