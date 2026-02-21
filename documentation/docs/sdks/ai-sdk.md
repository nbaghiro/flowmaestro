---
sidebar_position: 4
title: AI SDK
---

# AI SDK

Unified AI SDK for multi-provider AI operations. Supports text completion, embeddings, image generation, video generation, vision analysis, and speech (TTS/STT) across multiple providers with a single consistent API.

## Installation

```bash
npm install @flowmaestro/ai-sdk
```

Or with yarn:

```bash
yarn add @flowmaestro/ai-sdk
```

## Quick Start

```typescript
import { AIClient } from "@flowmaestro/ai-sdk";

// Initialize with provider API keys
const ai = new AIClient({
    providers: {
        openai: { apiKey: process.env.OPENAI_API_KEY },
        anthropic: { apiKey: process.env.ANTHROPIC_API_KEY }
    }
});

// Text completion
const response = await ai.text.complete({
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
    prompt: "Explain quantum computing in simple terms"
});

console.log(response.text);
```

## Features

- **Multi-provider support**: OpenAI, Anthropic, Google, Cohere, Hugging Face, Replicate, Stability AI, Runway, Luma, ElevenLabs, xAI, and FAL
- **Unified interface**: Same API across all providers for each capability
- **Type-safe**: Full TypeScript support with comprehensive types
- **Streaming**: Native async iterator support for streaming responses
- **Extended thinking**: Support for reasoning models (Claude's thinking mode, OpenAI o1/o3)
- **Auto-retry**: Configurable retry logic with exponential backoff
- **Realtime streaming**: WebSocket clients for Deepgram (STT) and ElevenLabs (TTS)
- **Multi-tenant auth**: Custom auth resolver for connection-based authentication

## Capabilities

### Text Completion

```typescript
// Non-streaming
const response = await ai.text.complete({
    provider: "openai",
    model: "gpt-4.1",
    systemPrompt: "You are a helpful assistant",
    prompt: "What is the meaning of life?",
    maxTokens: 1000,
    temperature: 0.7
});

console.log(response.text);
console.log("Tokens used:", response.metadata.usage?.totalTokens);
```

#### Streaming

```typescript
const stream = await ai.text.stream({
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
    prompt: "Write a short story about a robot"
});

for await (const token of stream) {
    process.stdout.write(token);
}

const finalResponse = await stream.getResponse();
console.log("\nTokens used:", finalResponse.metadata.usage?.totalTokens);
```

#### Extended Thinking (Claude)

```typescript
const thinkingResponse = await ai.text.complete({
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
    prompt: "Solve this complex math problem...",
    thinking: {
        enabled: true,
        budgetTokens: 4096
    }
});

console.log("Thinking:", thinkingResponse.thinking);
console.log("Answer:", thinkingResponse.text);
```

### Embeddings

```typescript
const embeddings = await ai.embedding.generate({
    provider: "openai",
    model: "text-embedding-3-small",
    input: ["Hello world", "Goodbye world"],
    dimensions: 1536
});

console.log("Embedding dimensions:", embeddings.dimensions);
console.log("First embedding:", embeddings.embeddings[0]);
```

### Image Generation

```typescript
const image = await ai.image.generate({
    provider: "openai",
    model: "dall-e-3",
    prompt: "A futuristic cityscape at sunset",
    size: "1024x1024",
    quality: "hd"
});

console.log("Image URL:", image.images[0].url);
```

### Vision Analysis

```typescript
const analysis = await ai.vision.analyze({
    provider: "openai",
    model: "gpt-4o",
    imageInput: "https://example.com/image.jpg",
    prompt: "Describe what you see in this image"
});

console.log(analysis.analysis);
```

### Speech (TTS/STT)

```typescript
// Text to Speech
const audio = await ai.speech.synthesize({
    provider: "elevenlabs",
    model: "eleven_turbo_v2_5",
    text: "Hello, how are you?",
    voice: "21m00Tcm4TlvDq8ikWAM"
});

// Speech to Text
const transcription = await ai.speech.transcribe({
    provider: "openai",
    model: "whisper-1",
    audioInput: "/path/to/audio.mp3",
    timestamps: true
});

console.log(transcription.text);
```

### Video Generation

```typescript
const video = await ai.video.generate({
    provider: "runway",
    model: "gen3a_turbo",
    prompt: "A cat walking through a garden",
    duration: 5,
    aspectRatio: "16:9"
});

console.log("Video URL:", video.url);
```

## Realtime Streaming

For real-time voice applications, the SDK provides WebSocket-based streaming clients.

### Deepgram (Speech-to-Text)

```typescript
import { DeepgramStreamClient } from "@flowmaestro/ai-sdk";

const deepgram = new DeepgramStreamClient({
    apiKey: process.env.DEEPGRAM_API_KEY,
    deepgram: {
        model: "nova-2",
        language: "en-US",
        sampleRate: 16000,
        endpointing: 500
    }
});

deepgram.setOnTranscript((text, isFinal, speechFinal) => {
    if (isFinal) {
        console.log("Final transcript:", text);
    }
    if (speechFinal) {
        console.log("User finished speaking");
    }
});

deepgram.setOnError((error) => console.error("Error:", error));

await deepgram.connect();

// Send audio data (raw PCM)
deepgram.sendAudio(audioBuffer);

// Or base64 encoded
deepgram.sendBase64Audio(base64AudioData);

await deepgram.close();
```

### ElevenLabs (Text-to-Speech Streaming)

```typescript
import { ElevenLabsStreamClient } from "@flowmaestro/ai-sdk";

const elevenlabs = new ElevenLabsStreamClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
    elevenlabs: {
        voiceId: "21m00Tcm4TlvDq8ikWAM",
        modelId: "eleven_turbo_v2_5",
        stability: 0.5,
        similarityBoost: 0.75
    }
});

elevenlabs.setOnAudioChunk((base64Audio) => {
    // Handle audio chunk (e.g., play or stream to client)
    const audioBuffer = Buffer.from(base64Audio, "base64");
});

elevenlabs.setOnComplete(() => {
    console.log("Speech synthesis complete");
});

await elevenlabs.connect();

// Stream text incrementally (great for LLM token streaming)
elevenlabs.streamText("Hello, ");
elevenlabs.streamText("how are you today?");
elevenlabs.endText(); // Signal end of input

await elevenlabs.close();
```

## Configuration

### Environment Variables

The SDK automatically reads API keys from environment variables:

| Provider     | Environment Variable |
| ------------ | -------------------- |
| OpenAI       | OPENAI_API_KEY       |
| Anthropic    | ANTHROPIC_API_KEY    |
| Google       | GOOGLE_API_KEY       |
| Cohere       | COHERE_API_KEY       |
| Hugging Face | HUGGINGFACE_API_KEY  |
| Replicate    | REPLICATE_API_KEY    |
| Stability AI | STABILITY_API_KEY    |
| FAL          | FAL_API_KEY          |
| Runway       | RUNWAY_API_KEY       |
| Luma         | LUMA_API_KEY         |
| ElevenLabs   | ELEVENLABS_API_KEY   |
| xAI          | XAI_API_KEY          |
| Deepgram     | DEEPGRAM_API_KEY     |

### Custom Auth Resolver

For multi-tenant applications, provide a custom auth resolver to dynamically resolve API keys:

```typescript
const ai = new AIClient({
    authResolver: async (provider, connectionId) => {
        // Look up API key from your database
        const connection = await db.connections.findById(connectionId);
        return connection?.apiKey ?? null;
    }
});

// Use with connectionId
const response = await ai.text.complete({
    provider: "openai",
    model: "gpt-4.1",
    prompt: "Hello!",
    connectionId: "user-connection-123"
});
```

### Retry Configuration

```typescript
const ai = new AIClient({
    providers: { openai: { apiKey: "..." } },
    retry: {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        retryableStatuses: [429, 503, 529]
    }
});
```

### Custom Logger

```typescript
const ai = new AIClient({
    providers: { openai: { apiKey: "..." } },
    debug: true, // Use console logger
    // Or provide custom logger:
    logger: {
        debug: (msg, ctx) => myLogger.debug(msg, ctx),
        info: (msg, ctx) => myLogger.info(msg, ctx),
        warn: (msg, ctx) => myLogger.warn(msg, ctx),
        error: (msg, err, ctx) => myLogger.error(msg, err, ctx)
    }
});
```

## Supported Providers

### Text Completion

| Provider     | Models                                |
| ------------ | ------------------------------------- |
| OpenAI       | GPT-4.1, GPT-4 Turbo, GPT-3.5, o1, o3 |
| Anthropic    | Claude 3, Claude 3.5, Claude 4        |
| Google       | Gemini Pro, Gemini Ultra              |
| Cohere       | Command, Command-R                    |
| Hugging Face | Various open-source models            |
| xAI          | Grok                                  |

### Embeddings

| Provider | Models                                         |
| -------- | ---------------------------------------------- |
| OpenAI   | text-embedding-3-small, text-embedding-3-large |
| Cohere   | embed-v3, embed-multilingual-v3                |
| Google   | text-embedding                                 |

### Image Generation

| Provider     | Models                      |
| ------------ | --------------------------- |
| OpenAI       | DALL-E 3, DALL-E 2          |
| Stability AI | Stable Diffusion 3, SDXL    |
| Replicate    | Various community models    |
| FAL          | Fast Stable Diffusion, Flux |

### Video Generation

| Provider     | Models                   |
| ------------ | ------------------------ |
| Runway       | Gen-3 Alpha              |
| Google       | Veo                      |
| Luma         | Dream Machine            |
| Replicate    | Various community models |
| FAL          | Various models           |
| Stability AI | Stable Video Diffusion   |

### Vision Analysis

| Provider  | Models               |
| --------- | -------------------- |
| OpenAI    | GPT-4 Vision, GPT-4o |
| Anthropic | Claude Vision        |
| Google    | Gemini Vision        |

### Speech

| Provider   | Capabilities       |
| ---------- | ------------------ |
| OpenAI     | Whisper (STT), TTS |
| ElevenLabs | TTS (streaming)    |
| Deepgram   | STT (streaming)    |

## Error Handling

```typescript
import {
    AIError,
    AuthenticationError,
    RateLimitError,
    ProviderUnavailableError,
    ModelNotFoundError,
    ValidationError,
    TimeoutError,
    ContentFilterError,
    InsufficientQuotaError
} from "@flowmaestro/ai-sdk";

try {
    const response = await ai.text.complete({ ... });
} catch (error) {
    if (error instanceof RateLimitError) {
        console.log("Rate limited, retry after:", error.retryAfterMs, "ms");
    } else if (error instanceof AuthenticationError) {
        console.log("Invalid API key for:", error.provider);
    } else if (error instanceof ProviderUnavailableError) {
        console.log("Provider temporarily unavailable:", error.provider);
    } else if (error instanceof ContentFilterError) {
        console.log("Content filtered:", error.message);
    } else if (error instanceof AIError) {
        console.log("AI error:", error.message, "Provider:", error.provider);
    }
}
```

## TypeScript Support

The SDK is written in TypeScript and exports comprehensive types:

```typescript
import type {
    AIProvider,
    AIClientConfig,
    TextCompletionRequest,
    TextCompletionResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    ImageGenerationRequest,
    ImageGenerationResponse,
    VideoGenerationRequest,
    VideoGenerationResponse,
    VisionAnalysisRequest,
    VisionAnalysisResponse,
    TranscriptionRequest,
    TranscriptionResponse,
    TTSRequest,
    TTSResponse,
    TokenUsage,
    RetryConfig
} from "@flowmaestro/ai-sdk";
```

## Architecture

The SDK is organized into:

- **AIClient**: Main entry point that exposes capability namespaces
- **Capabilities**: `text`, `embedding`, `image`, `video`, `vision`, `speech` - unified interfaces
- **Providers**: Provider-specific implementations (OpenAI, Anthropic, etc.)
- **Core**: Shared utilities (auth, retry, polling, logging, errors)

```
@flowmaestro/ai-sdk
├── AIClient           # Main client class
├── capabilities/      # Capability implementations
│   ├── text/         # Text completion
│   ├── embedding/    # Vector embeddings
│   ├── image/        # Image generation
│   ├── video/        # Video generation
│   ├── vision/       # Image analysis
│   └── speech/       # TTS/STT + realtime streaming
├── providers/        # Provider implementations
│   ├── text/        # OpenAI, Anthropic, Google, etc.
│   ├── embedding/   # OpenAI, Cohere, Google
│   ├── image/       # OpenAI, Stability, Replicate, FAL
│   ├── video/       # Runway, Luma, Google, etc.
│   ├── vision/      # OpenAI, Anthropic, Google
│   └── speech/      # OpenAI, ElevenLabs
└── core/            # Shared infrastructure
    ├── auth.ts      # API key resolution
    ├── retry.ts     # Retry with backoff
    ├── polling.ts   # Async job polling
    ├── errors.ts    # Error classes
    └── logger.ts    # Logging utilities
```
