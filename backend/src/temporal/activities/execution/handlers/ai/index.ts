/**
 * AI Execution Module
 *
 * Barrel exports for all AI node executors and handlers.
 */

// LLM
export {
    executeLLMNode,
    LLMNodeHandler,
    createLLMNodeHandler,
    type LLMNodeConfig,
    type LLMNodeResult,
    type LLMExecutionCallbacks
} from "./llm";

// Vision
export {
    executeVisionNode,
    VisionNodeHandler,
    createVisionNodeHandler,
    type VisionNodeConfig,
    type VisionNodeResult
} from "./vision";

// Audio (Legacy - use audioInput/audioOutput handlers instead)
// This handler is kept for backwards compatibility with existing workflows.
// New workflows should use AudioInputNodeHandler (STT) and AudioOutputNodeHandler (TTS).
export {
    executeAudioNode,
    AudioNodeHandler,
    createAudioNodeHandler,
    type AudioNodeConfig,
    type AudioNodeResult
} from "./audio";

// Embeddings
export {
    executeEmbeddingsNode,
    EmbeddingsNodeHandler,
    createEmbeddingsNodeHandler,
    type EmbeddingsNodeConfig,
    type EmbeddingsNodeResult
} from "./embeddings";

// Router
export {
    executeRouterNode,
    RouterNodeHandler,
    createRouterNodeHandler,
    type RouterNodeConfig,
    type RouterNodeResult
} from "./router";

// Knowledge Base Query
export {
    executeKnowledgeBaseQueryNode,
    KnowledgeBaseQueryNodeHandler,
    createKnowledgeBaseQueryNodeHandler,
    type KnowledgeBaseQueryNodeConfig,
    type KnowledgeBaseQueryNodeResult
} from "./kb-query";

// Audio Transcription
export {
    AudioTranscriptionNodeHandler,
    createAudioTranscriptionNodeHandler,
    type AudioTranscriptionNodeConfig,
    type AudioTranscriptionNodeResult
} from "./audio-transcription";

// OCR Extraction
export {
    OCRExtractionNodeHandler,
    createOCRExtractionNodeHandler,
    type OCRExtractionNodeConfig,
    type OCRExtractionNodeResult
} from "./ocr-extraction";
