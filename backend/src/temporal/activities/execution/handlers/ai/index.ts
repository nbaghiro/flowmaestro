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

// Audio
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
