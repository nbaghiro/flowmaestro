/**
 * Outputs Execution Module
 *
 * Barrel exports for all output node handlers.
 * Handles workflow output collection and external actions.
 */

// Output
export {
    executeOutputNode,
    OutputNodeHandler,
    createOutputNodeHandler,
    type OutputNodeConfig,
    type OutputNodeResult
} from "./output";

// Action
export {
    executeActionNode,
    ActionNodeHandler,
    createActionNodeHandler,
    type ActionNodeConfig,
    type ActionNodeResult
} from "./action";

// Audio Output (TTS)
export {
    AudioOutputNodeHandler,
    createAudioOutputNodeHandler,
    type AudioOutputNodeConfig,
    type AudioOutputNodeResult
} from "./audio-output";

// Template Output
export {
    executeTemplateOutputNode,
    TemplateOutputNodeHandler,
    createTemplateOutputNodeHandler,
    type TemplateOutputNodeConfig,
    type TemplateOutputNodeResult
} from "./template-output";
