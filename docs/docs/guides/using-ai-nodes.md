---
sidebar_position: 4
title: Using AI Nodes
---

# Using AI Nodes

Leverage LLMs and AI in your workflows.

## LLM Node

The most commonly used AI node for text generation.

### Basic Configuration

```yaml
model: gpt-4
systemPrompt: "You are a helpful assistant"
userMessage: "{{trigger.body.question}}"
temperature: 0.7
maxTokens: 500
```

### Options

- **Temperature** — Creativity (0 = deterministic, 1 = creative)
- **Max Tokens** — Response length limit
- **JSON Mode** — Force JSON output

### Example: Content Summarizer

```yaml
model: gpt-4
systemPrompt: |
    You are a content summarizer.
    Summarize the provided text in 3 bullet points.
userMessage: "{{http_request.output.body}}"
temperature: 0.3
```

## Vision Node

Analyze images with AI.

```yaml
model: gpt-4-vision
image: "{{trigger.body.imageUrl}}"
prompt: "Describe what you see in this image"
```

## Best Practices

- **Choose the right model** — GPT-4 for complex reasoning, GPT-3.5 for simple tasks
- **Optimize prompts** — Be specific about output format
- **Handle errors** — Add retry logic for rate limits

:::warning
AI nodes have usage costs based on tokens processed. Use GPT-3.5 when GPT-4 isn't needed.
:::
