/**
 * Mock API responses for tests
 */

// ============================================================================
// OpenAI Responses
// ============================================================================

export const mockOpenAICompletion = {
    id: "chatcmpl-123abc",
    object: "chat.completion",
    created: 1677858242,
    model: "gpt-4.1",
    choices: [
        {
            index: 0,
            message: {
                role: "assistant",
                content: "Hello! How can I help you today?"
            },
            finish_reason: "stop"
        }
    ],
    usage: {
        prompt_tokens: 10,
        completion_tokens: 9,
        total_tokens: 19
    }
};

export const mockOpenAICompletionWithReasoning = {
    ...mockOpenAICompletion,
    model: "o3-mini",
    usage: {
        prompt_tokens: 10,
        completion_tokens: 50,
        total_tokens: 60,
        completion_tokens_details: {
            reasoning_tokens: 40
        }
    }
};

export const mockOpenAIStreamChunks = [
    { id: "chatcmpl-123", choices: [{ delta: { role: "assistant" }, index: 0 }] },
    { id: "chatcmpl-123", choices: [{ delta: { content: "Hello" }, index: 0 }] },
    { id: "chatcmpl-123", choices: [{ delta: { content: "!" }, index: 0 }] },
    {
        id: "chatcmpl-123",
        choices: [{ delta: {}, index: 0, finish_reason: "stop" }],
        usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 }
    }
];

export const mockOpenAIEmbedding = {
    object: "list",
    data: [
        {
            object: "embedding",
            embedding: new Array(1536).fill(0).map(() => Math.random() * 2 - 1),
            index: 0
        }
    ],
    model: "text-embedding-3-small",
    usage: {
        prompt_tokens: 5,
        total_tokens: 5
    }
};

export const mockOpenAIImageGeneration = {
    created: 1677858242,
    data: [
        {
            url: "https://example.com/generated-image.png",
            revised_prompt: "A beautiful sunset over mountains with vibrant colors"
        }
    ]
};

// ============================================================================
// Anthropic Responses
// ============================================================================

export const mockAnthropicCompletion = {
    id: "msg_01XFDUDYJgAACzvnptvVoYEL",
    type: "message",
    role: "assistant",
    content: [
        {
            type: "text",
            text: "Hello! How can I assist you today?"
        }
    ],
    model: "claude-sonnet-4-5-20250929",
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
        input_tokens: 12,
        output_tokens: 10
    }
};

export const mockAnthropicCompletionWithThinking = {
    ...mockAnthropicCompletion,
    content: [
        {
            type: "thinking",
            thinking: "Let me think about how to respond to this greeting..."
        },
        {
            type: "text",
            text: "Hello! How can I assist you today?"
        }
    ],
    usage: {
        input_tokens: 12,
        output_tokens: 50
    }
};

export const mockAnthropicStreamEvents = [
    { type: "message_start", message: { id: "msg_123", usage: { input_tokens: 10 } } },
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Hello" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "!" } },
    { type: "content_block_stop", index: 0 },
    { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 5 } },
    { type: "message_stop" }
];

// ============================================================================
// Google Responses
// ============================================================================

export const mockGoogleCompletion = {
    candidates: [
        {
            content: {
                parts: [{ text: "Hello! How can I help you?" }],
                role: "model"
            },
            finishReason: "STOP",
            safetyRatings: []
        }
    ],
    usageMetadata: {
        promptTokenCount: 8,
        candidatesTokenCount: 7,
        totalTokenCount: 15
    }
};

export const mockGoogleEmbedding = {
    embedding: {
        values: new Array(768).fill(0).map(() => Math.random() * 2 - 1)
    }
};

// ============================================================================
// Cohere Responses
// ============================================================================

export const mockCohereCompletion = {
    id: "abc123",
    text: "Hello! How can I help you today?",
    finish_reason: "COMPLETE",
    meta: {
        tokens: {
            input_tokens: 10,
            output_tokens: 8
        }
    }
};

export const mockCohereEmbedding = {
    id: "abc123",
    embeddings: [new Array(1024).fill(0).map(() => Math.random() * 2 - 1)],
    meta: {
        billed_units: {
            input_tokens: 5
        }
    }
};

// ============================================================================
// Image/Video Generation Responses
// ============================================================================

export const mockStabilityImageGeneration = {
    artifacts: [
        {
            base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            seed: 12345,
            finishReason: "SUCCESS"
        }
    ]
};

export const mockReplicatePrediction = {
    id: "pred_123",
    status: "succeeded",
    output: ["https://example.com/video.mp4"],
    metrics: {
        predict_time: 45.2
    }
};

export const mockReplicatePredictionPending = {
    id: "pred_123",
    status: "processing",
    output: null
};

export const mockRunwayGeneration = {
    id: "gen_123",
    status: "SUCCEEDED",
    output: ["https://example.com/runway-video.mp4"]
};

export const mockLumaGeneration = {
    id: "luma_123",
    state: "completed",
    assets: {
        video: "https://example.com/luma-video.mp4"
    }
};

// ============================================================================
// Speech Responses
// ============================================================================

export const mockOpenAISpeechSynthesis = new ArrayBuffer(1024);

export const mockOpenAITranscription = {
    text: "Hello, this is a transcription test.",
    task: "transcribe",
    language: "english",
    duration: 5.5,
    words: [
        { word: "Hello,", start: 0.0, end: 0.5 },
        { word: "this", start: 0.6, end: 0.8 },
        { word: "is", start: 0.9, end: 1.0 },
        { word: "a", start: 1.1, end: 1.2 },
        { word: "transcription", start: 1.3, end: 2.0 },
        { word: "test.", start: 2.1, end: 2.5 }
    ]
};

// ============================================================================
// Deepgram Responses
// ============================================================================

export const mockDeepgramTranscript = {
    type: "Results",
    channel_index: [0, 1],
    duration: 2.5,
    start: 0,
    is_final: true,
    speech_final: false,
    channel: {
        alternatives: [
            {
                transcript: "Hello, how are you?",
                confidence: 0.98,
                words: [
                    { word: "Hello", start: 0.0, end: 0.4, confidence: 0.99 },
                    { word: "how", start: 0.5, end: 0.7, confidence: 0.97 },
                    { word: "are", start: 0.8, end: 0.9, confidence: 0.98 },
                    { word: "you", start: 1.0, end: 1.2, confidence: 0.99 }
                ]
            }
        ]
    }
};

export const mockDeepgramMetadata = {
    type: "Metadata",
    metadata: {
        request_id: "req_123",
        model_info: {
            name: "nova-2",
            version: "1.0"
        }
    }
};

export const mockDeepgramError = {
    type: "Error",
    error: {
        code: "INVALID_AUDIO",
        message: "Invalid audio format"
    }
};

// ============================================================================
// ElevenLabs Responses
// ============================================================================

export const mockElevenLabsAudioChunk = {
    audio: "SGVsbG8gV29ybGQh", // Base64 encoded audio
    isFinal: false
};

export const mockElevenLabsFinalChunk = {
    audio: "RmluYWwgY2h1bms=",
    isFinal: true,
    normalizedAlignment: {
        char_start_times_ms: [0, 100, 200],
        chars_durations_ms: [80, 80, 100],
        chars: ["H", "e", "y"]
    }
};

export const mockElevenLabsError = {
    error: {
        message: "Voice not found",
        code: "VOICE_NOT_FOUND"
    }
};

// ============================================================================
// Error Responses
// ============================================================================

export const mockRateLimitError = {
    error: {
        message: "Rate limit exceeded",
        type: "rate_limit_error",
        code: "rate_limit_exceeded"
    }
};

export const mockAuthenticationError = {
    error: {
        message: "Invalid API key",
        type: "authentication_error",
        code: "invalid_api_key"
    }
};

export const mockOverloadedError = {
    error: {
        message: "The server is currently overloaded",
        type: "overloaded_error",
        code: "overloaded"
    }
};

export const mockContentFilterError = {
    error: {
        message: "Content blocked by safety filter",
        type: "content_filter",
        code: "content_policy_violation"
    }
};
