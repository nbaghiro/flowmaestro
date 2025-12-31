/**
 * LLM Response Fixtures
 *
 * Pre-built mock responses for LLM providers (OpenAI, Anthropic, etc.)
 * Use these fixtures to simulate LLM behavior in tests without making actual API calls.
 */

import type { JsonObject } from "@flowmaestro/shared";

// ============================================================================
// TYPES
// ============================================================================

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface ChatCompletion {
    id: string;
    text: string;
    model: string;
    provider: string;
    usage: TokenUsage;
    finishReason: string;
    created: number;
}

export interface StreamingChunk {
    id: string;
    delta: string;
    finishReason: string | null;
    created: number;
}

export interface EmbeddingResponse {
    embeddings: number[][];
    model: string;
    usage: { totalTokens: number };
}

export interface ImageGenerationResponse {
    urls: string[];
    model: string;
    created: number;
}

export interface TranscriptionResponse {
    text: string;
    language: string;
    duration: number;
}

// ============================================================================
// CHAT COMPLETION FIXTURES
// ============================================================================

/**
 * Create a basic chat completion response
 */
export function createChatCompletion(
    text: string,
    options: {
        model?: string;
        provider?: string;
        promptTokens?: number;
        completionTokens?: number;
        finishReason?: string;
    } = {}
): ChatCompletion {
    const {
        model = "gpt-4",
        provider = "openai",
        promptTokens = 10,
        completionTokens = Math.ceil(text.split(" ").length * 1.5),
        finishReason = "stop"
    } = options;

    return {
        id: `chatcmpl-${Date.now()}`,
        text,
        model,
        provider,
        usage: {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens
        },
        finishReason,
        created: Date.now()
    };
}

/**
 * Common pre-built chat completions for testing
 */
export const chatCompletions = {
    simple: createChatCompletion("This is a simple response."),

    greeting: createChatCompletion("Hello! How can I help you today?"),

    json: createChatCompletion('{"status": "success", "data": {"id": 1, "name": "Test"}}'),

    code: createChatCompletion(`\`\`\`javascript
function hello(name) {
    return \`Hello, \${name}!\`;
}
\`\`\``),

    list: createChatCompletion(`Here are the items:
1. First item
2. Second item
3. Third item`),

    longResponse: createChatCompletion("This is a much longer response. ".repeat(100), {
        completionTokens: 500
    }),

    empty: createChatCompletion(""),

    withFunctionCall: createChatCompletion("I'll help you with that.", {
        finishReason: "function_call"
    }),

    truncated: createChatCompletion("This response was cut off because it reached the maximum", {
        finishReason: "length"
    })
};

// ============================================================================
// STREAMING FIXTURES
// ============================================================================

/**
 * Create streaming chunks from a complete response
 */
export function createStreamingChunks(text: string, chunkSize: number = 10): StreamingChunk[] {
    const chunks: StreamingChunk[] = [];
    const id = `stream-${Date.now()}`;
    const created = Date.now();

    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push({
            id,
            delta: text.slice(i, i + chunkSize),
            finishReason: null,
            created
        });
    }

    // Final chunk with finish reason
    chunks.push({
        id,
        delta: "",
        finishReason: "stop",
        created
    });

    return chunks;
}

/**
 * Pre-built streaming chunk sequences
 */
export const streamingSequences = {
    simple: createStreamingChunks("This is a streamed response.", 5),

    longStream: createStreamingChunks(
        "This is a much longer streamed response that simulates real LLM output.",
        10
    ),

    codeStream: createStreamingChunks(
        `\`\`\`python
def greet(name):
    print(f"Hello, {name}!")
\`\`\``,
        15
    )
};

// ============================================================================
// EMBEDDING FIXTURES
// ============================================================================

/**
 * Create an embedding vector of specified dimension
 */
export function createEmbedding(dimension: number = 1536): number[] {
    return Array.from({ length: dimension }, () => Math.random() * 2 - 1);
}

/**
 * Create an embedding response
 */
export function createEmbeddingResponse(
    texts: string[],
    options: {
        dimension?: number;
        model?: string;
    } = {}
): EmbeddingResponse {
    const { dimension = 1536, model = "text-embedding-3-small" } = options;

    return {
        embeddings: texts.map(() => createEmbedding(dimension)),
        model,
        usage: { totalTokens: texts.reduce((sum, t) => sum + t.split(" ").length, 0) }
    };
}

/**
 * Pre-built embedding responses
 */
export const embeddings = {
    single: createEmbeddingResponse(["Test text"]),

    batch: createEmbeddingResponse(["First document", "Second document", "Third document"]),

    smallDimension: createEmbeddingResponse(["Test"], { dimension: 384 }),

    largeBatch: createEmbeddingResponse(Array.from({ length: 100 }, (_, i) => `Document ${i}`))
};

// ============================================================================
// IMAGE GENERATION FIXTURES
// ============================================================================

/**
 * Create an image generation response
 */
export function createImageGenerationResponse(
    count: number = 1,
    options: {
        model?: string;
        baseUrl?: string;
    } = {}
): ImageGenerationResponse {
    const { model = "dall-e-3", baseUrl = "https://example.com/images" } = options;

    return {
        urls: Array.from({ length: count }, (_, i) => `${baseUrl}/image-${i}-${Date.now()}.png`),
        model,
        created: Date.now()
    };
}

/**
 * Pre-built image generation responses
 */
export const imageGenerations = {
    single: createImageGenerationResponse(1),

    multiple: createImageGenerationResponse(4),

    dalle2: createImageGenerationResponse(1, { model: "dall-e-2" })
};

// ============================================================================
// TRANSCRIPTION FIXTURES
// ============================================================================

/**
 * Create a transcription response
 */
export function createTranscriptionResponse(
    text: string,
    options: {
        language?: string;
        duration?: number;
    } = {}
): TranscriptionResponse {
    const { language = "en", duration = text.split(" ").length * 0.5 } = options;

    return {
        text,
        language,
        duration
    };
}

/**
 * Pre-built transcription responses
 */
export const transcriptions = {
    simple: createTranscriptionResponse("Hello, this is a test transcription."),

    long: createTranscriptionResponse(
        "This is a much longer transcription that might come from a longer audio file. " +
            "It contains multiple sentences and simulates a real-world transcription result.",
        { duration: 30 }
    ),

    multilingual: createTranscriptionResponse("Bonjour, comment allez-vous?", { language: "fr" })
};

// ============================================================================
// ERROR RESPONSE FIXTURES
// ============================================================================

export interface LLMErrorResponse {
    type: string;
    message: string;
    code?: string;
    param?: string;
    retryable: boolean;
}

/**
 * Create an error response
 */
export function createErrorResponse(
    type: string,
    message: string,
    options: {
        code?: string;
        param?: string;
        retryable?: boolean;
    } = {}
): LLMErrorResponse {
    return {
        type,
        message,
        code: options.code,
        param: options.param,
        retryable: options.retryable ?? false
    };
}

/**
 * Common error responses
 */
export const errors = {
    rateLimitExceeded: createErrorResponse(
        "rate_limit_error",
        "Rate limit exceeded. Please retry after 60 seconds.",
        { code: "rate_limit_exceeded", retryable: true }
    ),

    invalidApiKey: createErrorResponse("authentication_error", "Invalid API key provided.", {
        code: "invalid_api_key",
        retryable: false
    }),

    modelNotFound: createErrorResponse(
        "invalid_request_error",
        "The model `gpt-5` does not exist.",
        { code: "model_not_found", param: "model", retryable: false }
    ),

    contextLengthExceeded: createErrorResponse(
        "invalid_request_error",
        "This model's maximum context length is 4096 tokens.",
        { code: "context_length_exceeded", retryable: false }
    ),

    serverError: createErrorResponse(
        "server_error",
        "The server had an error processing your request.",
        { code: "server_error", retryable: true }
    ),

    timeout: createErrorResponse("timeout_error", "Request timed out.", {
        code: "timeout",
        retryable: true
    }),

    contentFilter: createErrorResponse(
        "content_filter_error",
        "Your request was rejected as a result of our safety system.",
        { code: "content_filter", retryable: false }
    )
};

// ============================================================================
// PROVIDER-SPECIFIC FORMATS
// ============================================================================

/**
 * Format response as OpenAI API response
 */
export function toOpenAIFormat(completion: ChatCompletion): JsonObject {
    return {
        id: completion.id,
        object: "chat.completion",
        created: Math.floor(completion.created / 1000),
        model: completion.model,
        choices: [
            {
                index: 0,
                message: {
                    role: "assistant",
                    content: completion.text
                },
                finish_reason: completion.finishReason
            }
        ],
        usage: {
            prompt_tokens: completion.usage.promptTokens,
            completion_tokens: completion.usage.completionTokens,
            total_tokens: completion.usage.totalTokens
        }
    };
}

/**
 * Format response as Anthropic API response
 */
export function toAnthropicFormat(completion: ChatCompletion): JsonObject {
    return {
        id: completion.id,
        type: "message",
        role: "assistant",
        content: [
            {
                type: "text",
                text: completion.text
            }
        ],
        model: completion.model,
        stop_reason: completion.finishReason === "stop" ? "end_turn" : completion.finishReason,
        usage: {
            input_tokens: completion.usage.promptTokens,
            output_tokens: completion.usage.completionTokens
        }
    };
}

/**
 * Format response as internal LLM node output
 */
export function toLLMNodeOutput(completion: ChatCompletion): JsonObject {
    return {
        text: completion.text,
        model: completion.model,
        provider: completion.provider,
        usage: completion.usage,
        finishReason: completion.finishReason
    };
}

// ============================================================================
// SCENARIO-SPECIFIC FIXTURES
// ============================================================================

/**
 * Create a lead scoring response
 */
export function createLeadScoringResponse(score: number): ChatCompletion {
    return createChatCompletion(
        JSON.stringify({
            score,
            reasoning: score > 70 ? "High engagement potential" : "Needs more nurturing",
            nextAction: score > 70 ? "schedule_call" : "send_nurture_email"
        }),
        { model: "gpt-4" }
    );
}

/**
 * Create a content generation response
 */
export function createContentGenerationResponse(
    topic: string,
    type: "outline" | "section" | "full"
): ChatCompletion {
    const content =
        type === "outline"
            ? `# ${topic}\n\n1. Introduction\n2. Main Points\n3. Conclusion`
            : type === "section"
              ? `## Section about ${topic}\n\nThis is detailed content about ${topic}.`
              : `# Complete article about ${topic}\n\nFull content here...`;

    return createChatCompletion(content, {
        completionTokens: content.length / 4
    });
}

/**
 * Create a classification response
 */
export function createClassificationResponse(category: string, confidence: number): ChatCompletion {
    return createChatCompletion(
        JSON.stringify({
            category,
            confidence,
            alternatives: []
        })
    );
}
