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

// Chart Generation
export {
    ChartGenerationNodeHandler,
    createChartGenerationNodeHandler,
    type ChartGenerationNodeConfig,
    type ChartGenerationNodeResult
} from "./chart-generation";

// Spreadsheet Generation
export {
    SpreadsheetGenerationNodeHandler,
    createSpreadsheetGenerationNodeHandler,
    type SpreadsheetGenerationNodeConfig,
    type SpreadsheetGenerationNodeResult
} from "./spreadsheet-generation";

// PDF Generation
export {
    PdfGenerationNodeHandler,
    createPdfGenerationNodeHandler,
    type PdfGenerationNodeConfig,
    type PdfGenerationNodeResult
} from "./pdf-generation";

// Screenshot Capture
export {
    ScreenshotCaptureNodeHandler,
    createScreenshotCaptureNodeHandler,
    type ScreenshotCaptureNodeConfig,
    type ScreenshotCaptureNodeResult
} from "./screenshot-capture";

// File Write
export {
    FileWriteNodeHandler,
    createFileWriteNodeHandler,
    type FileWriteNodeConfig,
    type FileWriteNodeResult
} from "./file-write";
