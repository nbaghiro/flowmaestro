---
sidebar_position: 1
title: AI & LLM Nodes
---

# AI & LLM Nodes

AI nodes bring the power of large language models and AI capabilities to your workflows. Generate text, analyze images, transcribe audio, create embeddings, and route decisions with AI.

## LLM Node

The core AI node for text generation and reasoning.

<!-- Screenshot: LLM node configuration panel -->

### Providers & Models

| Provider         | Models                                                                         |
| ---------------- | ------------------------------------------------------------------------------ |
| **OpenAI**       | gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, gpt-4o, gpt-4o-mini, o4-mini, o3, o3-mini |
| **Anthropic**    | claude-opus-4-5, claude-sonnet-4-5, claude-haiku-4-5                           |
| **Google**       | gemini-3-pro-preview, gemini-3-flash-preview, gemini-2.5-pro, gemini-2.5-flash |
| **Cohere**       | command-a-03-2025, command-r-plus, command-r                                   |
| **Hugging Face** | Llama-4-Scout, Llama-4-Maverick, Qwen-3-235B, DeepSeek-R1                      |
| **x.ai**         | grok-3, grok-3-fast, grok-2-vision                                             |

### Configuration

```typescript
{
  provider: "openai",
  model: "gpt-4.1",
  systemPrompt: "You are a helpful assistant that...",
  prompt: "{{trigger.body.question}}",
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1.0,
  outputVariable: "llm_response"
}
```

| Field            | Description                             |
| ---------------- | --------------------------------------- |
| `provider`       | AI provider to use                      |
| `model`          | Specific model                          |
| `systemPrompt`   | System instructions (optional)          |
| `prompt`         | User prompt (supports variables)        |
| `temperature`    | Creativity (0-2, lower = deterministic) |
| `maxTokens`      | Maximum response length                 |
| `topP`           | Nucleus sampling parameter              |
| `outputVariable` | Variable name for result                |

### Extended Thinking

Some models support extended thinking/reasoning:

```typescript
{
  provider: "anthropic",
  model: "claude-sonnet-4-5",
  enableThinking: true,
  thinkingBudget: 10000  // Max thinking tokens
}
```

**Supported models:**

- OpenAI: o3, o3-mini, gpt-4.1
- Anthropic: claude-opus-4-5, claude-sonnet-4-5
- Google: gemini-3-pro, gemini-3-flash
- Hugging Face: DeepSeek-R1

### Output

```typescript
{
  response: "The answer to your question is...",
  usage: {
    inputTokens: 150,
    outputTokens: 450,
    totalTokens: 600
  }
}
```

---

## Vision Node

Analyze images with AI vision models.

<!-- Screenshot: Vision node with image analysis -->

### Providers

| Provider      | Models                             |
| ------------- | ---------------------------------- |
| **OpenAI**    | gpt-4o, gpt-4o-mini                |
| **Anthropic** | claude-opus-4-5, claude-sonnet-4-5 |
| **Google**    | gemini-3-pro, gemini-3-flash       |
| **x.ai**      | grok-2-vision                      |

### Operations

| Operation  | Description                          |
| ---------- | ------------------------------------ |
| `analyze`  | Analyze and describe image content   |
| `generate` | Generate images (provider-dependent) |

### Configuration

```typescript
{
  provider: "openai",
  model: "gpt-4o",
  operation: "analyze",
  imageInput: "{{files_node.output.file}}",  // URL or base64
  prompt: "Describe what you see in this image",
  maxTokens: 1000,
  outputVariable: "vision_result"
}
```

### Use Cases

- Product image analysis
- Document OCR and extraction
- Visual quality inspection
- Chart and graph interpretation
- UI screenshot analysis

---

## Audio Input Node (Speech-to-Text)

Transcribe audio to text.

<!-- Screenshot: Audio input node configuration -->

### Providers

| Provider     | Models                       |
| ------------ | ---------------------------- |
| **OpenAI**   | whisper-1                    |
| **Deepgram** | nova-2, nova, enhanced, base |

### Configuration

```typescript
{
  provider: "openai",
  model: "whisper-1",
  inputName: "audio_file",
  language: "en",        // Optional, auto-detected
  punctuate: true,
  diarize: false,        // Speaker identification
  outputVariable: "transcription",
  label: "Upload Audio",
  description: "Audio file to transcribe"
}
```

### Supported Formats

- MP3, MP4, MPEG, MPGA
- WAV, WEBM
- M4A, OGG, FLAC

### Output

```typescript
{
  text: "Hello, this is the transcribed audio...",
  language: "en",
  duration: 45.2,
  segments: [...]  // With timestamps if requested
}
```

---

## Audio Output Node (Text-to-Speech)

Generate speech from text.

### Providers

| Provider       | Voices                                  |
| -------------- | --------------------------------------- |
| **OpenAI**     | alloy, echo, fable, onyx, nova, shimmer |
| **ElevenLabs** | 100+ voices, custom voice cloning       |
| **Deepgram**   | aura, aura-asteria, aura-luna           |

### Configuration

```typescript
{
  provider: "elevenlabs",
  voice: "rachel",
  textInput: "{{llm_node.output.response}}",
  speed: 1.0,
  stability: 0.5,
  similarityBoost: 0.75,
  outputFormat: "mp3",
  returnAsUrl: true,
  outputVariable: "audio_output"
}
```

### Output Options

| Option               | Description                  |
| -------------------- | ---------------------------- |
| `returnAsUrl: true`  | Returns URL to audio file    |
| `returnAsUrl: false` | Returns base64-encoded audio |

---

## Audio Transcription Node

Advanced transcription with more options.

### Configuration

```typescript
{
  audioSource: "{{input.audio_url}}",
  task: "transcribe",      // or "translate"
  language: "en",
  outputFormat: "json",    // text, json, srt, vtt
  timestamps: true,
  prompt: "Technical discussion about...",
  temperature: 0.2,
  outputVariable: "transcript"
}
```

### Tasks

| Task         | Description                         |
| ------------ | ----------------------------------- |
| `transcribe` | Transcribe in original language     |
| `translate`  | Transcribe and translate to English |

---

## Embeddings Node

Generate vector embeddings for semantic search.

### Providers

| Provider   | Models                                         |
| ---------- | ---------------------------------------------- |
| **OpenAI** | text-embedding-3-small, text-embedding-3-large |
| **Cohere** | embed-english-v3.0, embed-multilingual-v3.0    |
| **Google** | text-embedding-004                             |

### Configuration

```typescript
{
  provider: "openai",
  model: "text-embedding-3-small",
  input: "{{node.output.text}}",
  batchMode: false,
  outputVariable: "embeddings"
}
```

### Batch Mode

For multiple texts:

```typescript
{
  batchMode: true,
  input: ["Text 1", "Text 2", "Text 3"]
}
```

### Output

```typescript
{
  embeddings: [0.0123, -0.0456, 0.0789, ...],  // 1536 dimensions
  model: "text-embedding-3-small",
  usage: { totalTokens: 15 }
}
```

---

## Router Node

Use AI to classify inputs and route to different paths.

<!-- Screenshot: Router node with multiple routes -->

### Configuration

```typescript
{
  provider: "openai",
  model: "gpt-4o-mini",
  systemPrompt: "Classify the user's intent",
  prompt: "{{trigger.body.message}}",
  routes: [
    { value: "sales", label: "Sales inquiry" },
    { value: "support", label: "Technical support" },
    { value: "billing", label: "Billing question" },
    { value: "other", label: "Other/unknown" }
  ],
  defaultRoute: "other",
  temperature: 0.3,
  outputVariable: "route"
}
```

### How It Works

1. LLM analyzes the input
2. Classifies into one of the defined routes
3. Workflow branches based on classification

### Output

```typescript
{
  route: "support",
  confidence: 0.92,
  reasoning: "The user mentioned a technical error..."
}
```

### Use Cases

- Intent classification for chatbots
- Ticket routing
- Content categorization
- Lead qualification

---

## Knowledge Base Query Node

Search your knowledge bases with semantic similarity.

### Configuration

```typescript
{
  knowledgeBaseId: "kb_abc123",
  query: "{{user.question}}",
  topK: 5,
  threshold: 0.7,
  outputVariable: "search_results"
}
```

| Field             | Description              |
| ----------------- | ------------------------ |
| `knowledgeBaseId` | Target knowledge base    |
| `query`           | Search query             |
| `topK`            | Number of results        |
| `threshold`       | Minimum similarity (0-1) |

### Output

```typescript
{
  results: [
    {
      content: "Relevant chunk text...",
      score: 0.92,
      metadata: {
        documentId: "doc_123",
        fileName: "guide.pdf",
        pageNumber: 5
      }
    },
    // ... more results
  ],
  totalMatches: 5
}
```

---

## OCR Extraction Node

Extract text from images using OCR.

### Configuration

```typescript
{
  imageSource: "{{input.image_url}}",
  languages: ["en", "es"],
  psm: 3,                  // Page segmentation mode
  outputFormat: "text",    // text, json, hocr
  confidenceThreshold: 0.6,
  preprocessing: {
    deskew: true,
    denoise: true,
    contrast: "auto"
  },
  outputVariable: "ocr_result"
}
```

### Output

```typescript
{
  text: "Extracted text content...",
  confidence: 0.94,
  blocks: [
    {
      text: "Header text",
      bbox: { x: 10, y: 10, width: 200, height: 30 },
      confidence: 0.98
    }
  ]
}
```

---

## Image Generation Node

Generate images with AI.

### Providers

| Provider         | Models                   |
| ---------------- | ------------------------ |
| **OpenAI**       | dall-e-3, dall-e-2       |
| **Replicate**    | flux-pro, flux-schnell   |
| **Stability AI** | stable-diffusion-3, sdxl |
| **FAL**          | Various models           |

### Operations

| Operation          | Description                  |
| ------------------ | ---------------------------- |
| `generate`         | Create new image from prompt |
| `inpaint`          | Edit parts of an image       |
| `outpaint`         | Extend image beyond borders  |
| `upscale`          | Increase image resolution    |
| `removeBackground` | Remove image background      |
| `styleTransfer`    | Apply style to image         |

### Configuration

```typescript
{
  provider: "openai",
  model: "dall-e-3",
  operation: "generate",
  prompt: "A serene mountain landscape at sunset",
  negativePrompt: "blurry, low quality",
  size: "1024x1024",
  quality: "hd",
  style: "vivid",
  n: 1,
  outputFormat: "url",
  outputVariable: "generated_image"
}
```

---

## Video Generation Node

Generate videos with AI.

### Providers

| Provider       | Models        |
| -------------- | ------------- |
| **Google Veo** | veo-2         |
| **Runway**     | gen-3         |
| **Luma**       | dream-machine |
| **Replicate**  | Various       |

### Configuration

```typescript
{
  provider: "runway",
  model: "gen-3",
  prompt: "A cat playing piano",
  imageInput: "{{input.reference_image}}",  // Optional
  duration: 4,
  aspectRatio: "16:9",
  loop: false,
  outputFormat: "mp4",
  outputVariable: "video_output"
}
```

---

## Best Practices

### Model Selection

| Task              | Recommended                                 |
| ----------------- | ------------------------------------------- |
| Complex reasoning | claude-opus-4-5, o3, gpt-4.1                |
| Fast responses    | gpt-4o-mini, claude-haiku-4-5, gemini-flash |
| Vision tasks      | gpt-4o, claude-sonnet-4-5                   |
| Code generation   | claude-sonnet-4-5, gpt-4.1                  |
| Cost-sensitive    | gpt-4o-mini, gemini-flash-lite              |

### Temperature Guidelines

| Use Case          | Temperature |
| ----------------- | ----------- |
| Factual Q&A       | 0.0 - 0.3   |
| Code generation   | 0.2 - 0.4   |
| General assistant | 0.5 - 0.7   |
| Creative writing  | 0.7 - 1.0   |
| Brainstorming     | 0.9 - 1.2   |

### Error Handling

Always handle potential AI failures:

```typescript
// Use conditional node after LLM
condition: "{{llm_node.output.error}} == null";
```

### Cost Optimization

- Use smaller models for simple tasks
- Set appropriate `maxTokens` limits
- Cache responses when possible
- Use embeddings for semantic search vs. LLM comparison
