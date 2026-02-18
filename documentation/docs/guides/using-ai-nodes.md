---
sidebar_position: 4
title: Using AI Nodes
---

# Using AI Nodes

Leverage LLMs and AI capabilities in your workflows.

## LLM Node

The most commonly used AI node for text generation.

### Basic Configuration

```typescript
{
  provider: "openai",
  model: "gpt-4.1",
  systemPrompt: "You are a helpful assistant",
  userMessage: "{{trigger.body.question}}",
  temperature: 0.7,
  maxTokens: 500
}
```

### Supported Providers

| Provider         | Models                                               | Best For                          |
| ---------------- | ---------------------------------------------------- | --------------------------------- |
| **OpenAI**       | gpt-4.1, gpt-4o, gpt-4o-mini, o3-mini                | General purpose, function calling |
| **Anthropic**    | claude-opus-4-5, claude-sonnet-4-5, claude-haiku-4-5 | Instruction following, safety     |
| **Google**       | gemini-2.0-flash, gemini-2.0-pro                     | Multi-modal, large context        |
| **Cohere**       | command-r-plus, command-r                            | Retrieval, enterprise             |
| **x.ai**         | grok-3, grok-3-mini                                  | Reasoning, analysis               |
| **Hugging Face** | Various                                              | Open source, specialized          |

### Options

| Option             | Description                                       | Default |
| ------------------ | ------------------------------------------------- | ------- |
| **Temperature**    | Creativity (0 = deterministic, 2 = very creative) | 0.7     |
| **Max Tokens**     | Response length limit                             | 4096    |
| **JSON Mode**      | Force structured JSON output                      | false   |
| **Stop Sequences** | Tokens that stop generation                       | []      |

### Example: Content Summarizer

```typescript
{
  provider: "anthropic",
  model: "claude-sonnet-4-5",
  systemPrompt: `You are a content summarizer.
    Summarize the provided text in 3 bullet points.
    Be concise but capture key information.`,
  userMessage: "{{http_request.output.body}}",
  temperature: 0.3
}
```

---

## Extended Thinking

Enable deep reasoning for complex tasks with models that support extended thinking.

### Supported Models

| Model             | Provider  | Thinking Capability |
| ----------------- | --------- | ------------------- |
| claude-opus-4-5   | Anthropic | Extended thinking   |
| claude-sonnet-4-5 | Anthropic | Extended thinking   |
| o3                | OpenAI    | Extended thinking   |
| o3-mini           | OpenAI    | Reasoning mode      |
| grok-3            | x.ai      | Extended thinking   |

### Configuration

```typescript
{
  provider: "anthropic",
  model: "claude-sonnet-4-5",
  extendedThinking: {
    enabled: true,
    budgetTokens: 10000,  // Max tokens for thinking
    showThinking: false    // Include thinking in output
  },
  userMessage: "Analyze this complex problem: {{input.problem}}"
}
```

### When to Use

Extended thinking is ideal for:

- **Complex reasoning** — Multi-step logic problems
- **Code analysis** — Understanding large codebases
- **Research synthesis** — Combining multiple sources
- **Strategic planning** — Business decisions

### Example: Code Review

```typescript
{
  provider: "openai",
  model: "o3",
  extendedThinking: { enabled: true, budgetTokens: 8000 },
  systemPrompt: `You are a senior code reviewer.
    Analyze the code for bugs, security issues, and improvements.
    Think through each issue carefully.`,
  userMessage: "Review this code:\n{{input.code}}"
}
```

---

## Vision Node

Analyze images with AI.

### Basic Configuration

```typescript
{
  provider: "openai",
  model: "gpt-4o",
  image: "{{trigger.body.imageUrl}}",
  prompt: "Describe what you see in this image"
}
```

### Image Sources

```typescript
// URL
{
    image: "https://example.com/image.jpg";
}

// Base64
{
    image: "{{screenshot.output.base64}}";
}

// File upload
{
    image: "{{trigger.files[0].url}}";
}
```

### Multiple Images

```typescript
{
  model: "gpt-4o",
  images: [
    "{{input.image1}}",
    "{{input.image2}}"
  ],
  prompt: "Compare these two images and describe the differences"
}
```

### Example: Product Analysis

```typescript
{
  provider: "anthropic",
  model: "claude-sonnet-4-5",
  image: "{{trigger.body.productImage}}",
  prompt: `Analyze this product image:
    1. Identify the product type
    2. List visible features
    3. Estimate quality level
    4. Suggest improvements`,
  outputVariable: "product_analysis"
}
```

---

## Audio Nodes

### Speech-to-Text (STT)

Convert audio to text:

```typescript
{
  type: "audio_input",
  provider: "openai",
  model: "whisper-1",
  audio: "{{trigger.files[0].url}}",
  language: "en",
  outputVariable: "transcription"
}
```

**Supported formats:** mp3, mp4, mpeg, mpga, m4a, wav, webm

**Options:**
| Option | Description |
|--------|-------------|
| `language` | ISO language code (auto-detect if omitted) |
| `timestamps` | Include word-level timestamps |
| `diarization` | Identify different speakers |

### Text-to-Speech (TTS)

Convert text to audio:

```typescript
{
  type: "audio_output",
  provider: "openai",
  model: "tts-1-hd",
  text: "{{llm.output.content}}",
  voice: "alloy",
  outputFormat: "mp3",
  outputVariable: "audio_file"
}
```

**Available voices:** alloy, echo, fable, onyx, nova, shimmer

### Example: Voice Assistant Pipeline

```
[Audio Input] → [STT] → [LLM] → [TTS] → [Audio Output]
```

```typescript
// STT: Transcribe user speech
{
  type: "audio_input",
  audio: "{{trigger.audio}}",
  outputVariable: "user_speech"
}

// LLM: Generate response
{
  type: "llm",
  userMessage: "{{user_speech.text}}",
  outputVariable: "response"
}

// TTS: Convert to speech
{
  type: "audio_output",
  text: "{{response.content}}",
  voice: "nova",
  outputVariable: "reply_audio"
}
```

---

## Router Node

Intelligently route workflows based on content analysis.

### Configuration

```typescript
{
  type: "router",
  input: "{{trigger.body.message}}",
  routes: [
    {
      name: "billing",
      description: "Questions about billing, payments, invoices",
      destination: "billing_workflow"
    },
    {
      name: "technical",
      description: "Technical support, bugs, errors",
      destination: "tech_support_workflow"
    },
    {
      name: "sales",
      description: "Pricing, plans, upgrades",
      destination: "sales_workflow"
    }
  ],
  defaultRoute: "general_support",
  confidenceThreshold: 0.7
}
```

### How It Works

1. Router analyzes the input text
2. Classifies intent using LLM
3. Routes to matching destination
4. Falls back to default if confidence < threshold

### Example: Support Ticket Router

```typescript
{
  type: "router",
  input: "{{trigger.body.subject}}: {{trigger.body.description}}",
  model: "gpt-4o-mini",  // Faster model for classification
  routes: [
    {
      name: "urgent",
      description: "Service outages, critical bugs, security issues",
      destination: "urgent_escalation",
      priority: 1
    },
    {
      name: "bug_report",
      description: "Bug reports, error messages, unexpected behavior",
      destination: "engineering_queue"
    },
    {
      name: "feature_request",
      description: "New feature ideas, suggestions, improvements",
      destination: "product_backlog"
    }
  ],
  outputVariable: "routing_decision"
}
```

### Accessing Routing Results

```typescript
{
    {
        routing_decision.route;
    }
} // Selected route name
{
    {
        routing_decision.confidence;
    }
} // Confidence score (0-1)
{
    {
        routing_decision.reasoning;
    }
} // Why this route was chosen
```

---

## Embeddings Node

Generate vector embeddings for semantic search.

```typescript
{
  type: "embeddings",
  provider: "openai",
  model: "text-embedding-3-small",
  input: "{{trigger.body.text}}",
  outputVariable: "embedding"
}
```

**Use for:**

- Storing content in vector databases
- Semantic similarity search
- Document clustering

---

## Best Practices

### Model Selection

| Task                  | Recommended Model             |
| --------------------- | ----------------------------- |
| Simple classification | gpt-4o-mini, claude-haiku-4-5 |
| Complex reasoning     | claude-opus-4-5, o3           |
| Code generation       | claude-sonnet-4-5, gpt-4.1    |
| Vision tasks          | gpt-4o, claude-sonnet-4-5     |
| Fast responses        | gpt-4o-mini, claude-haiku-4-5 |

### Prompt Optimization

- Be specific about output format
- Use examples for consistency
- Set clear boundaries
- Test with varied inputs

### Error Handling

Add retry logic for rate limits:

```typescript
{
  retryPolicy: {
    maxRetries: 3,
    retryableErrors: ["RATE_LIMIT", "TIMEOUT"],
    backoffMs: 1000
  }
}
```

### Cost Management

- Use smaller models when possible
- Set max_tokens appropriately
- Cache common responses
- Monitor usage in dashboard

---

## Next Steps

- [Node Types Reference](../core-concepts/workflows/nodes/ai-nodes) — All AI node details
- [Error Handling](../core-concepts/workflows/error-handling) — Robust workflows
- [Building RAG Agent](./building-rag-agent) — Knowledge-powered AI
