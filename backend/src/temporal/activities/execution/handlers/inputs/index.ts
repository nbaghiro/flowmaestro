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

// Web Search
export {
    WebSearchNodeHandler,
    createWebSearchNodeHandler,
    type WebSearchNodeConfig,
    type WebSearchNodeResult
} from "./web-search";

// Web Browse
export {
    WebBrowseNodeHandler,
    createWebBrowseNodeHandler,
    type WebBrowseNodeConfig,
    type WebBrowseNodeResult
} from "./web-browse";

// PDF Extract
export {
    PdfExtractNodeHandler,
    createPdfExtractNodeHandler,
    type PdfExtractNodeConfig,
    type PdfExtractNodeResult
} from "./pdf-extract";

// File Download
export {
    FileDownloadNodeHandler,
    createFileDownloadNodeHandler,
    type FileDownloadNodeConfig,
    type FileDownloadNodeResult
} from "./file-download";

// File Read
export {
    FileReadNodeHandler,
    createFileReadNodeHandler,
    type FileReadNodeConfig,
    type FileReadNodeResult
} from "./file-read";
