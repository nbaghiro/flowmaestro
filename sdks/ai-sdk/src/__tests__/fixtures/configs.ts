/**
 * Test configurations and fixtures
 */

import type {
    AIClientConfig,
    ProviderConfig,
    RetryConfig,
    PollConfig,
    AILogger
} from "../../types";

// ============================================================================
// API Keys for Testing
// ============================================================================

export const TEST_API_KEYS = {
    openai: "test-openai-api-key-123",
    anthropic: "test-anthropic-api-key-456",
    google: "test-google-api-key-789",
    cohere: "test-cohere-api-key-abc",
    huggingface: "test-hf-api-key-def",
    replicate: "test-replicate-api-key-ghi",
    stabilityai: "test-stability-api-key-jkl",
    fal: "test-fal-api-key-mno",
    runway: "test-runway-api-key-pqr",
    luma: "test-luma-api-key-stu",
    elevenlabs: "test-elevenlabs-api-key-vwx",
    xai: "test-xai-api-key-yz"
} as const;

// ============================================================================
// Provider Configurations
// ============================================================================

export const testOpenAIConfig: ProviderConfig = {
    apiKey: TEST_API_KEYS.openai,
    defaultModel: "gpt-4.1"
};

export const testAnthropicConfig: ProviderConfig = {
    apiKey: TEST_API_KEYS.anthropic,
    defaultModel: "claude-sonnet-4-5-20250929"
};

export const testGoogleConfig: ProviderConfig = {
    apiKey: TEST_API_KEYS.google,
    defaultModel: "gemini-pro"
};

export const allProvidersConfig: Partial<Record<string, ProviderConfig>> = {
    openai: testOpenAIConfig,
    anthropic: testAnthropicConfig,
    google: testGoogleConfig,
    cohere: { apiKey: TEST_API_KEYS.cohere },
    huggingface: { apiKey: TEST_API_KEYS.huggingface },
    replicate: { apiKey: TEST_API_KEYS.replicate },
    stabilityai: { apiKey: TEST_API_KEYS.stabilityai },
    fal: { apiKey: TEST_API_KEYS.fal },
    runway: { apiKey: TEST_API_KEYS.runway },
    luma: { apiKey: TEST_API_KEYS.luma },
    elevenlabs: { apiKey: TEST_API_KEYS.elevenlabs },
    xai: { apiKey: TEST_API_KEYS.xai }
};

// ============================================================================
// Client Configurations
// ============================================================================

export const minimalClientConfig: AIClientConfig = {
    providers: {
        openai: testOpenAIConfig
    }
};

export const fullClientConfig: AIClientConfig = {
    providers: allProvidersConfig,
    debug: false,
    timeoutMs: 30000,
    retry: {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
        retryableStatuses: [429, 503, 529]
    },
    polling: {
        maxAttempts: 10,
        intervalMs: 100,
        backoffMultiplier: 1.5,
        maxIntervalMs: 1000
    }
};

// ============================================================================
// Retry and Polling Configurations
// ============================================================================

export const fastRetryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 10,
    maxDelayMs: 100,
    backoffMultiplier: 2,
    retryableStatuses: [429, 503, 529]
};

export const noRetryConfig: RetryConfig = {
    maxRetries: 0,
    initialDelayMs: 10,
    maxDelayMs: 100,
    backoffMultiplier: 2,
    retryableStatuses: [429, 503, 529]
};

export const fastPollConfig: PollConfig = {
    maxAttempts: 5,
    intervalMs: 10,
    backoffMultiplier: 1.5,
    maxIntervalMs: 100
};

// ============================================================================
// Test Loggers
// ============================================================================

export const silentTestLogger: AILogger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {}
};

export const captureTestLogger = () => {
    const logs: Array<{
        level: string;
        message: string;
        context?: Record<string, unknown>;
        error?: Error;
    }> = [];

    const logger: AILogger = {
        debug(message: string, context?: Record<string, unknown>) {
            logs.push({ level: "debug", message, context });
        },
        info(message: string, context?: Record<string, unknown>) {
            logs.push({ level: "info", message, context });
        },
        warn(message: string, context?: Record<string, unknown>) {
            logs.push({ level: "warn", message, context });
        },
        error(message: string, error?: Error, context?: Record<string, unknown>) {
            logs.push({ level: "error", message, error, context });
        }
    };

    return { logger, logs };
};

// ============================================================================
// Request Fixtures
// ============================================================================

export const testTextCompletionRequest = {
    model: "gpt-4.1",
    prompt: "Hello, how are you?",
    maxTokens: 100,
    temperature: 0.7
};

export const testTextCompletionRequestWithMessages = {
    model: "claude-sonnet-4-5-20250929",
    prompt: [
        { role: "user" as const, content: "Hello!" },
        { role: "assistant" as const, content: "Hi there!" },
        { role: "user" as const, content: "How are you?" }
    ],
    maxTokens: 100
};

export const testTextCompletionRequestWithThinking = {
    model: "claude-sonnet-4-5-20250929",
    prompt: "Solve this math problem: 2 + 2",
    thinking: {
        enabled: true,
        budgetTokens: 4096
    }
};

export const testEmbeddingRequest = {
    model: "text-embedding-3-small",
    input: "This is a test sentence for embedding."
};

export const testEmbeddingRequestMultiple = {
    model: "text-embedding-3-small",
    input: ["First sentence", "Second sentence", "Third sentence"]
};

export const testImageGenerationRequest = {
    model: "dall-e-3",
    prompt: "A beautiful sunset over mountains",
    size: "1024x1024" as const,
    quality: "hd" as const
};

export const testVideoGenerationRequest = {
    model: "gen-3",
    prompt: "A serene forest scene with birds flying",
    aspectRatio: "16:9" as const
};

export const testVisionAnalysisRequest = {
    model: "gpt-4-vision-preview",
    image: "https://example.com/image.jpg",
    prompt: "Describe what you see in this image"
};

export const testSpeechSynthesisRequest = {
    model: "tts-1-hd",
    text: "Hello, this is a test of text to speech.",
    voice: "alloy"
};

export const testTranscriptionRequest = {
    model: "whisper-1",
    audio: Buffer.from("fake audio data"),
    language: "en"
};
