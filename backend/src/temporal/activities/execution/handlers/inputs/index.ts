/**
 * Inputs Execution Module
 *
 * Barrel exports for all input node handlers.
 * Handles collection of workflow inputs at start.
 */

// Input
export {
    InputNodeHandler,
    createInputNodeHandler,
    type InputNodeConfig,
    type InputNodeResult
} from "./input";

// Files
export { FilesNodeHandler, createFilesNodeHandler, type FilesNodeConfig } from "./files";

// URL
export {
    URLNodeHandler,
    createURLNodeHandler,
    type URLNodeConfig,
    type URLNodeResult,
    type FetchedURL
} from "./url";

// Audio Input (STT)
export {
    AudioInputNodeHandler,
    createAudioInputNodeHandler,
    type AudioInputNodeConfig,
    type AudioInputNodeResult,
    type AudioInputData
} from "./audio-input";
