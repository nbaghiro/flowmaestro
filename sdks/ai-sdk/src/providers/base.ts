/**
 * Base provider interfaces and abstract classes
 */

import type { EmbeddingRequest, EmbeddingResponse } from "../capabilities/embedding/types";
import type { ImageGenerationRequest, ImageGenerationResponse } from "../capabilities/image/types";
import type {
    TranscriptionRequest,
    TranscriptionResponse,
    TTSRequest,
    TTSResponse
} from "../capabilities/speech/types";
import type {
    TextCompletionRequest,
    TextCompletionResponse,
    TextCompletionStream
} from "../capabilities/text/types";
import type { VideoGenerationRequest, VideoGenerationResponse } from "../capabilities/video/types";
import type { VisionAnalysisRequest, VisionAnalysisResponse } from "../capabilities/vision/types";
import type { AIProvider, AILogger, ImageOperation } from "../types";

// ============================================================================
// BASE PROVIDER INTERFACE
// ============================================================================

/**
 * Base provider interface
 */
export interface BaseProvider {
    /** Provider identifier */
    readonly provider: AIProvider;
    /** Supported models */
    readonly supportedModels: string[];

    /** Check if this provider supports a specific model */
    supportsModel(model: string): boolean;
}

/**
 * Abstract base class for provider adapters
 */
export abstract class AbstractProvider implements BaseProvider {
    abstract readonly provider: AIProvider;
    abstract readonly supportedModels: string[];

    protected readonly logger: AILogger;

    constructor(logger: AILogger) {
        this.logger = logger;
    }

    supportsModel(model: string): boolean {
        return this.supportedModels.some(
            (supported) => model === supported || model.startsWith(supported) || supported === "*"
        );
    }
}

// ============================================================================
// CAPABILITY-SPECIFIC PROVIDER INTERFACES
// ============================================================================

/**
 * Text completion provider interface
 */
export interface TextCompletionProvider extends BaseProvider {
    /**
     * Generate text completion (non-streaming)
     */
    complete(request: TextCompletionRequest, apiKey: string): Promise<TextCompletionResponse>;

    /**
     * Generate streaming text completion
     */
    stream(request: TextCompletionRequest, apiKey: string): Promise<TextCompletionStream>;

    /**
     * Check if model supports extended thinking
     */
    supportsThinking(model: string): boolean;
}

/**
 * Embedding provider interface
 */
export interface EmbeddingProvider extends BaseProvider {
    /**
     * Generate embeddings
     */
    embed(request: EmbeddingRequest, apiKey: string): Promise<EmbeddingResponse>;
}

/**
 * Image generation provider interface
 */
export interface ImageGenerationProvider extends BaseProvider {
    /**
     * Generate or edit image
     */
    generate(request: ImageGenerationRequest, apiKey: string): Promise<ImageGenerationResponse>;

    /**
     * Check if provider supports a specific operation
     */
    supportsOperation(operation: ImageOperation): boolean;
}

/**
 * Video generation provider interface
 */
export interface VideoGenerationProvider extends BaseProvider {
    /**
     * Generate video
     */
    generate(request: VideoGenerationRequest, apiKey: string): Promise<VideoGenerationResponse>;

    /**
     * Check if model supports image input (I2V)
     */
    supportsImageInput(model: string): boolean;
}

/**
 * Vision analysis provider interface
 */
export interface VisionProvider extends BaseProvider {
    /**
     * Analyze image
     */
    analyze(request: VisionAnalysisRequest, apiKey: string): Promise<VisionAnalysisResponse>;
}

/**
 * Speech provider interface
 */
export interface SpeechProvider extends BaseProvider {
    /**
     * Transcribe audio to text
     */
    transcribe(request: TranscriptionRequest, apiKey: string): Promise<TranscriptionResponse>;

    /**
     * Convert text to speech
     */
    textToSpeech(request: TTSRequest, apiKey: string): Promise<TTSResponse>;

    /**
     * Check if provider supports transcription
     */
    supportsTranscription(): boolean;

    /**
     * Check if provider supports text-to-speech
     */
    supportsTTS(): boolean;
}

// ============================================================================
// CAPABILITY TYPE
// ============================================================================

/**
 * Capability types
 */
export type CapabilityType = "text" | "embedding" | "image" | "video" | "vision" | "speech";

/**
 * Provider type map
 */
export type ProviderTypeMap = {
    text: TextCompletionProvider;
    embedding: EmbeddingProvider;
    image: ImageGenerationProvider;
    video: VideoGenerationProvider;
    vision: VisionProvider;
    speech: SpeechProvider;
};
