/**
 * @flowmaestro/ai-sdk
 *
 * Unified AI SDK for multi-provider AI operations.
 * Supports text completion, embeddings, image generation, video generation,
 * vision analysis, and speech (TTS/STT) across multiple providers.
 *
 * @example
 * ```typescript
 * import { AIClient } from "@flowmaestro/ai-sdk";
 *
 * const ai = new AIClient({
 *   providers: {
 *     openai: { apiKey: process.env.OPENAI_API_KEY },
 *     anthropic: { apiKey: process.env.ANTHROPIC_API_KEY }
 *   }
 * });
 *
 * // Text completion
 * const response = await ai.text.complete({
 *   provider: "anthropic",
 *   model: "claude-sonnet-4-5-20250929",
 *   prompt: "Explain quantum computing"
 * });
 *
 * // Streaming
 * for await (const token of await ai.text.stream({
 *   provider: "openai",
 *   model: "gpt-4.1",
 *   prompt: "Write a story"
 * })) {
 *   process.stdout.write(token);
 * }
 *
 * // Image generation
 * const image = await ai.image.generate({
 *   provider: "openai",
 *   model: "dall-e-3",
 *   prompt: "A futuristic city"
 * });
 * ```
 */

// =============================================================================
// Main Client
// =============================================================================

export { AIClient } from "./AIClient";

// =============================================================================
// Core Types
// =============================================================================

export type {
    AIProvider,
    ProviderConfig,
    AIClientConfig,
    AuthResolver,
    AILogger,
    RetryConfig,
    PollConfig,
    PollStatus,
    PollResult,
    TokenUsage,
    ResponseMetadata,
    ProviderErrorDetails,
    Message,
    MessageRole,
    ImageSize,
    AspectRatio,
    ImageQuality,
    ImageStyle,
    ImageOutputFormat,
    ImageOperation,
    VideoOutputFormat,
    AudioFormat,
    VisionDetail,
    EmbeddingTaskType,
    TruncationStrategy
} from "./types";

// =============================================================================
// Text Capability
// =============================================================================

export { TextCapability } from "./capabilities/text/index";
export type {
    TextCompletionRequest,
    TextCompletionResponse,
    TextCompletionStream,
    StreamingCallbacks,
    ThinkingConfig
} from "./capabilities/text/types";

// =============================================================================
// Embedding Capability
// =============================================================================

export { EmbeddingCapability } from "./capabilities/embedding/index";
export type { EmbeddingRequest, EmbeddingResponse } from "./capabilities/embedding/types";

// =============================================================================
// Image Capability
// =============================================================================

export { ImageCapability } from "./capabilities/image/index";
export type {
    ImageGenerationRequest,
    ImageGenerationResponse,
    GeneratedImage
} from "./capabilities/image/types";

// =============================================================================
// Video Capability
// =============================================================================

export { VideoCapability } from "./capabilities/video/index";
export type {
    VideoGenerationRequest,
    VideoGenerationResponse,
    VideoGenerationStatus
} from "./capabilities/video/types";

// =============================================================================
// Vision Capability
// =============================================================================

export { VisionCapability } from "./capabilities/vision/index";
export type { VisionAnalysisRequest, VisionAnalysisResponse } from "./capabilities/vision/types";

// =============================================================================
// Speech Capability
// =============================================================================

export { SpeechCapability } from "./capabilities/speech/index";
export type {
    TranscriptionRequest,
    TranscriptionResponse,
    TranscriptionSegment,
    TranscriptionWord,
    TimestampGranularity,
    TTSRequest,
    TTSResponse
} from "./capabilities/speech/types";

// =============================================================================
// Streaming Clients (WebSocket-based realtime audio)
// =============================================================================

export { DeepgramStreamClient } from "./providers/speech/deepgram";
export type { DeepgramStreamClientConfig } from "./providers/speech/deepgram";
export { ElevenLabsStreamClient } from "./providers/speech/elevenlabs";
export type { ElevenLabsStreamClientConfig } from "./providers/speech/elevenlabs";
export type {
    DeepgramConfig,
    ElevenLabsConfig,
    DeepgramStreamConfig,
    ElevenLabsStreamConfig,
    DeepgramResponse,
    ElevenLabsResponse,
    TranscriptHandler,
    AudioChunkHandler,
    ErrorHandler,
    StreamErrorHandler,
    StreamClientConfig
} from "./providers/speech/types";
export {
    DEFAULT_DEEPGRAM_CONFIG,
    DEFAULT_ELEVENLABS_CONFIG,
    DEFAULT_DEEPGRAM_STREAM_CONFIG,
    DEFAULT_ELEVENLABS_STREAM_CONFIG
} from "./providers/speech/types";

// =============================================================================
// Error Classes
// =============================================================================

export {
    AIError,
    AuthenticationError,
    RateLimitError,
    ProviderUnavailableError,
    ModelNotFoundError,
    ValidationError,
    TimeoutError,
    ContentFilterError,
    InsufficientQuotaError
} from "./core/errors";

// =============================================================================
// Core Utilities
// =============================================================================

export { withRetry, isRetryableError, DEFAULT_RETRY_CONFIG } from "./core/retry";
export { pollUntilComplete, createPollFn, DEFAULT_POLL_CONFIG } from "./core/polling";
export { resolveApiKey, hasApiKey, getConfiguredProviders, PROVIDER_ENV_VARS } from "./core/auth";
export { consoleLogger, silentLogger, createPrefixedLogger } from "./core/logger";

// =============================================================================
// Provider Registry
// =============================================================================

export { ProviderRegistry } from "./providers/registry";
export type { ProviderRegistryConfig, ProviderFactory } from "./providers/registry";
export type {
    TextCompletionProvider,
    EmbeddingProvider,
    ImageGenerationProvider,
    VideoGenerationProvider,
    VisionProvider,
    SpeechProvider,
    BaseProvider,
    CapabilityType,
    ProviderTypeMap
} from "./providers/base";
export { AbstractProvider } from "./providers/base";

// =============================================================================
// Text Providers
// =============================================================================

export { OpenAITextProvider } from "./providers/text/openai";
export { AnthropicTextProvider } from "./providers/text/anthropic";
export { GoogleTextProvider } from "./providers/text/google";
export { CohereTextProvider } from "./providers/text/cohere";
export { HuggingFaceTextProvider } from "./providers/text/huggingface";
export { XAITextProvider } from "./providers/text/xai";

// =============================================================================
// Embedding Providers
// =============================================================================

export { OpenAIEmbeddingProvider } from "./providers/embedding/openai";
export { CohereEmbeddingProvider } from "./providers/embedding/cohere";
export { GoogleEmbeddingProvider } from "./providers/embedding/google";

// =============================================================================
// Image Providers
// =============================================================================

export { OpenAIImageProvider } from "./providers/image/openai";
export { ReplicateImageProvider } from "./providers/image/replicate";
export { StabilityImageProvider } from "./providers/image/stability";
export { FALImageProvider } from "./providers/image/fal";

// =============================================================================
// Video Providers
// =============================================================================

export { ReplicateVideoProvider } from "./providers/video/replicate";
export { GoogleVideoProvider } from "./providers/video/google";
export { RunwayVideoProvider } from "./providers/video/runway";
export { LumaVideoProvider } from "./providers/video/luma";
export { FALVideoProvider } from "./providers/video/fal";
export { StabilityVideoProvider } from "./providers/video/stability";

// =============================================================================
// Vision Providers
// =============================================================================

export { OpenAIVisionProvider } from "./providers/vision/openai";
export { AnthropicVisionProvider } from "./providers/vision/anthropic";
export { GoogleVisionProvider } from "./providers/vision/google";

// =============================================================================
// Speech Providers
// =============================================================================

export { OpenAISpeechProvider } from "./providers/speech/openai";
export { ElevenLabsSpeechProvider } from "./providers/speech/elevenlabs";
export { DeepgramSpeechProvider } from "./providers/speech/deepgram";
