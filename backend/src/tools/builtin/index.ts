/**
 * Built-in Tools Registry
 *
 * Exports all built-in tools and provides a registry for tool lookup
 */

// Import all built-in tools
import { audioTranscribeTool } from "./audio-transcribe";
import { chartGenerateTool } from "./chart-generate";
import { fileDownloadTool } from "./file-download";
import { fileReadTool } from "./file-read";
import { fileWriteTool } from "./file-write";
import { imageGenerateTool } from "./image-generate";
import { ocrExtractTool } from "./ocr-extract";
import { pdfExtractTool } from "./pdf-extract";
import { pdfGenerateTool } from "./pdf-generate";
import { screenshotCaptureTool } from "./screenshot-capture";
import { spreadsheetGenerateTool } from "./spreadsheet-generate";
import { textToSpeechTool } from "./text-to-speech";
import { webBrowseTool } from "./web-browse";
import { webSearchTool } from "./web-search";
import type { BuiltInTool, ToolCategory } from "../types";

/**
 * All built-in tools
 *
 * Note: code_execute and data_analyze tools have been removed as they require
 * a sandboxed code execution environment (E2B) to run safely. They can be
 * re-added when E2B integration is implemented.
 */
export const builtInTools: BuiltInTool[] = [
    // Web tools
    webSearchTool,
    webBrowseTool,
    screenshotCaptureTool,

    // File tools
    fileReadTool,
    fileWriteTool,
    fileDownloadTool,

    // Data tools
    chartGenerateTool,
    spreadsheetGenerateTool,
    pdfExtractTool,

    // Media tools
    imageGenerateTool,
    pdfGenerateTool,
    audioTranscribeTool,
    ocrExtractTool,
    textToSpeechTool
];

/**
 * Built-in tool registry map for quick lookup
 */
const toolRegistry = new Map<string, BuiltInTool>(builtInTools.map((tool) => [tool.name, tool]));

/**
 * Get a built-in tool by name
 */
export function getBuiltInTool(name: string): BuiltInTool | undefined {
    return toolRegistry.get(name);
}

/**
 * Get all built-in tools
 */
export function getAllBuiltInTools(): BuiltInTool[] {
    return [...builtInTools];
}

/**
 * Get built-in tools by category
 */
export function getBuiltInToolsByCategory(category: ToolCategory): BuiltInTool[] {
    return builtInTools.filter((tool) => tool.category === category);
}

/**
 * Get built-in tools that are enabled by default
 */
export function getDefaultBuiltInTools(): BuiltInTool[] {
    return builtInTools.filter((tool) => tool.enabledByDefault);
}

/**
 * Get built-in tools by risk level
 */
export function getBuiltInToolsByRiskLevel(
    riskLevel: "none" | "low" | "medium" | "high"
): BuiltInTool[] {
    return builtInTools.filter((tool) => tool.riskLevel === riskLevel);
}

/**
 * Check if a tool name is a built-in tool
 */
export function isBuiltInToolName(name: string): boolean {
    return toolRegistry.has(name);
}

// Re-export individual tools for direct import
export { audioTranscribeTool } from "./audio-transcribe";
export { chartGenerateTool } from "./chart-generate";
export { fileDownloadTool } from "./file-download";
export { fileReadTool } from "./file-read";
export { fileWriteTool } from "./file-write";
export { imageGenerateTool } from "./image-generate";
export { ocrExtractTool } from "./ocr-extract";
export { pdfExtractTool } from "./pdf-extract";
export { pdfGenerateTool } from "./pdf-generate";
export { screenshotCaptureTool } from "./screenshot-capture";
export { spreadsheetGenerateTool } from "./spreadsheet-generate";
export { textToSpeechTool } from "./text-to-speech";
export { webBrowseTool } from "./web-browse";
export { webSearchTool } from "./web-search";

// Re-export input types for direct use in workflows
export type { AudioTranscribeInput } from "./audio-transcribe";
export type { ChartGenerateInput } from "./chart-generate";
export type { FileDownloadInput } from "./file-download";
export type { FileReadInput } from "./file-read";
export type { FileWriteInput } from "./file-write";
export type { ImageGenerateInput } from "./image-generate";
export type { OCRExtractInput } from "./ocr-extract";
export type { PDFExtractInput } from "./pdf-extract";
export type { PDFGenerateInput } from "./pdf-generate";
export type { ScreenshotCaptureInput } from "./screenshot-capture";
export type { SpreadsheetGenerateInput } from "./spreadsheet-generate";
export type { TextToSpeechInput } from "./text-to-speech";
export type { WebBrowseInput } from "./web-browse";
export type { WebSearchInput } from "./web-search";
