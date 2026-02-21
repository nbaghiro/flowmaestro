# AI SDK Architecture

Internal documentation for the `@flowmaestro/ai-sdk` package.

## Overview

The AI SDK provides a unified interface for AI operations across multiple providers. It's used both internally by FlowMaestro's backend (workflow nodes, agents, tools) and externally by customers who want to use FlowMaestro's multi-provider AI capabilities directly.

## Package Location

```
sdks/ai-sdk/
├── src/
│   ├── AIClient.ts          # Main entry point
│   ├── types.ts             # Core type definitions
│   ├── index.ts             # Public exports
│   ├── __tests__/           # AIClient tests + fixtures
│   ├── capabilities/        # Capability implementations
│   ├── providers/           # Provider implementations
│   ├── streaming/           # WebSocket streaming clients (Deepgram, ElevenLabs)
│   └── core/                # Shared infrastructure
├── package.json
├── tsconfig.json
├── tsup.config.ts           # Build config (CJS + ESM + DTS)
└── vitest.config.ts         # Test config
```

## Architecture

### Layer 1: AIClient

The `AIClient` class is the main entry point. It:

- Accepts configuration (provider API keys, auth resolver, retry config)
- Initializes the `ProviderRegistry`
- Exposes capability namespaces: `text`, `embedding`, `image`, `video`, `vision`, `speech`

```typescript
const ai = new AIClient({
    providers: { openai: { apiKey: "..." } },
    authResolver: async (provider, connectionId) => { ... }
});

await ai.text.complete({ provider: "openai", model: "gpt-4", prompt: "..." });
```

### Layer 2: Capabilities

Each capability (`TextCapability`, `EmbeddingCapability`, etc.) provides:

- A unified interface for that capability type
- Provider-agnostic request/response types
- Automatic retry handling
- Provider resolution via the registry

Capabilities don't implement provider-specific logic - they delegate to providers.

```typescript
// capabilities/text/index.ts
export class TextCapability {
    async complete(request: TextCompletionRequest): Promise<TextCompletionResponse> {
        const provider = this.registry.getTextProvider(request.provider);
        const apiKey = await this.registry.resolveApiKey(request.provider, request.connectionId);
        return withRetry(() => provider.complete(request, apiKey), this.retryConfig);
    }
}
```

### Layer 3: Providers

Providers implement the actual API calls to each service:

```typescript
// providers/text/openai.ts
export class OpenAITextProvider implements TextCompletionProvider {
    async complete(request: TextCompletionRequest, apiKey: string): Promise<TextCompletionResponse> {
        const openai = new OpenAI({ apiKey });
        const response = await openai.chat.completions.create({ ... });
        return this.mapResponse(response);
    }
}
```

Each provider:

- Implements a capability-specific interface
- Handles provider-specific request/response mapping
- Uses the official provider SDK when available

### Layer 4: Core Infrastructure

Shared utilities used across the SDK:

| Module            | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `core/auth.ts`    | API key resolution (env vars, config, auth resolver) |
| `core/retry.ts`   | Retry with exponential backoff                       |
| `core/polling.ts` | Async job polling (for video generation, etc.)       |
| `core/errors.ts`  | Typed error classes                                  |
| `core/logger.ts`  | Logger interface and implementations                 |

## Provider Registry

The `ProviderRegistry` manages provider instances and API key resolution:

```typescript
class ProviderRegistry {
    // Provider factories (lazy instantiation)
    private textProviders: Map<AIProvider, () => TextCompletionProvider>;

    // API key resolution priority:
    // 1. Auth resolver (connectionId-based)
    // 2. Provider config (explicit apiKey)
    // 3. Environment variables
    async resolveApiKey(provider: AIProvider, connectionId?: string): Promise<string>;
}
```

## Integration with FlowMaestro Backend

The backend uses the AI SDK through `backend/src/core/ai.ts`:

```typescript
// backend/src/core/ai.ts
import { AIClient } from "@flowmaestro/ai-sdk";

let aiClientInstance: AIClient | null = null;

export function getAIClient(): AIClient {
    if (!aiClientInstance) {
        aiClientInstance = new AIClient({
            providers: buildProvidersConfig(), // From env vars
            authResolver: flowMaestroAuthResolver // Connection-based auth
        });
    }
    return aiClientInstance;
}
```

### FlowMaestro Auth Resolver

The auth resolver integrates with the Connection system:

```typescript
const flowMaestroAuthResolver: AuthResolver = async (provider, connectionId) => {
    if (!connectionId) return null;

    const connection = await connectionRepo.findByIdWithData(connectionId);
    if (!connection || connection.status !== "active") return null;

    if (isApiKeyData(connection.data)) {
        return connection.data.api_key;
    }
    if (isOAuth2TokenData(connection.data)) {
        return connection.data.access_token;
    }
    return null;
};
```

## Consumers

### Backend Consumers

| Location                                  | Usage                                  |
| ----------------------------------------- | -------------------------------------- |
| `temporal/.../handlers/ai/llm.ts`         | LLM node execution                     |
| `temporal/.../handlers/ai/embeddings.ts`  | Embeddings node execution              |
| `temporal/.../handlers/ai/router.ts`      | Router node (LLM classification)       |
| `services/embeddings/EmbeddingService.ts` | Knowledge base embeddings              |
| `tools/builtin/audio-transcribe.ts`       | Whisper transcription tool             |
| `tools/builtin/text-to-speech.ts`         | TTS tool                               |
| `tools/builtin/image-generate.ts`         | Image generation tool                  |
| `services/voice/VoiceSession.ts`          | Realtime voice (Deepgram + ElevenLabs) |

### Realtime Streaming

The `DeepgramStreamClient` and `ElevenLabsStreamClient` in `streaming/` are WebSocket-based clients for real-time audio. They're separate from providers because they're stateful (maintain persistent connections) and event-driven rather than request/response:

```
Voice Session Flow:
1. Client connects via WebSocket
2. VoiceSession creates DeepgramStreamClient (STT)
3. User audio → Deepgram → transcripts
4. Transcripts → Agent workflow → LLM response tokens
5. Response tokens → ElevenLabsStreamClient (TTS)
6. TTS audio → Client WebSocket
```

## Error Handling

All errors extend `AIError`:

```typescript
class AIError extends Error {
    provider?: AIProvider;
    statusCode?: number;
    retryable: boolean;
}

class RateLimitError extends AIError {
    retryAfterMs?: number;
}

class AuthenticationError extends AIError {}
class ProviderUnavailableError extends AIError {}
class ModelNotFoundError extends AIError {}
class ValidationError extends AIError {}
class TimeoutError extends AIError {}
class ContentFilterError extends AIError {}
class InsufficientQuotaError extends AIError {}
```

## Testing

Tests use Vitest and are located alongside source files:

```bash
# Run all tests
npm test --workspace=@flowmaestro/ai-sdk

# Run specific test file
npm test --workspace=@flowmaestro/ai-sdk -- src/capabilities/text/__tests__/TextCapability.test.ts
```

Test fixtures are in `src/__tests__/fixtures/`.

## Building

The SDK builds to CJS, ESM, and TypeScript declarations:

```bash
npm run build --workspace=@flowmaestro/ai-sdk
```

Output:

- `dist/index.js` - CommonJS
- `dist/index.mjs` - ES Modules
- `dist/index.d.ts` - TypeScript declarations

## Adding a New Provider

1. Create provider implementation in `providers/<capability>/<provider>.ts`
2. Implement the capability interface (e.g., `TextCompletionProvider`)
3. Register in `AIClient.registerProviders()`
4. Add env var mapping in `core/auth.ts` (`PROVIDER_ENV_VARS`)
5. Export from `index.ts`
6. Add tests
7. Update documentation

## Adding a New Capability

1. Create capability folder in `capabilities/<name>/`
2. Define types in `capabilities/<name>/types.ts`
3. Implement capability class in `capabilities/<name>/index.ts`
4. Define provider interface in `providers/base.ts`
5. Add capability to `AIClient` constructor
6. Export from `index.ts`
7. Add tests
8. Update documentation

## CI/CD

The AI SDK has its own test job in CI:

```yaml
test-sdk-ai:
    name: Test SDK (AI)
    runs-on: ubuntu-latest
    steps:
        - name: Run AI SDK tests
          run: npm test --workspace=@flowmaestro/ai-sdk
```

## Dependencies

External:

- `openai` - OpenAI SDK
- `@anthropic-ai/sdk` - Anthropic SDK
- `@google/generative-ai` - Google Generative AI SDK
- `cohere-ai` - Cohere SDK
- `ws` - WebSocket client (for Deepgram/ElevenLabs)

Internal:

- No FlowMaestro internal dependencies (standalone package)
