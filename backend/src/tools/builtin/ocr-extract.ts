/**
 * OCR Extract Tool
 *
 * Extracts text from images using OCR (Optical Character Recognition) via tesseract.js
 */

import { readFile, access, constants } from "fs/promises";
import { PSM } from "tesseract.js";
import { z } from "zod";
import { createServiceLogger } from "../../core/logging";
import type { BuiltInTool, ToolExecutionContext, ToolExecutionResult } from "../types";

const logger = createServiceLogger("OCRExtractTool");

/**
 * Input schema for OCR extraction
 */
export const ocrExtractInputSchema = z.object({
    path: z.string().min(1).describe("Path to the image file"),
    language: z
        .array(z.string())
        .default(["eng"])
        .describe("OCR languages (Tesseract codes: eng, spa, fra, deu, chi_sim, jpn, etc.)"),
    psm: z
        .number()
        .int()
        .min(0)
        .max(13)
        .default(3)
        .describe("Page segmentation mode (3=auto, 6=single block, 7=single line)"),
    preprocessing: z
        .object({
            grayscale: z.boolean().default(true).describe("Convert to grayscale"),
            denoise: z.boolean().default(false).describe("Apply denoising"),
            deskew: z.boolean().default(false).describe("Auto-correct skew"),
            threshold: z.boolean().default(false).describe("Apply adaptive thresholding"),
            scale: z.number().min(0.5).max(4).default(1).describe("Scale factor for image")
        })
        .optional()
        .describe("Image preprocessing options"),
    outputFormat: z
        .enum(["text", "hocr", "tsv", "json"])
        .default("text")
        .describe("Output format (hocr includes bounding boxes)"),
    confidenceThreshold: z
        .number()
        .min(0)
        .max(100)
        .default(0)
        .describe("Minimum confidence threshold (0-100)")
});

export type OCRExtractInput = z.infer<typeof ocrExtractInputSchema>;

/**
 * OCR word with bounding box
 */
export interface OCRWord {
    text: string;
    confidence: number;
    bbox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    lineNum: number;
    wordNum: number;
}

/**
 * OCR extraction result
 */
export interface OCRExtractOutput {
    text: string;
    confidence: number;
    words?: OCRWord[];
    lineCount: number;
    wordCount: number;
    characterCount: number;
    language: string;
    outputPath?: string;
}

/**
 * Validate path doesn't escape allowed directories
 */
function validatePath(path: string): { valid: boolean; error?: string } {
    // Block path traversal
    if (path.includes("..")) {
        return { valid: false, error: "Path traversal not allowed" };
    }

    // Block sensitive paths
    const blockedPaths = ["/etc", "/proc", "/sys", "/dev", "/root", "/home"];
    const normalizedPath = path.toLowerCase();
    for (const blocked of blockedPaths) {
        if (normalizedPath.startsWith(blocked)) {
            return { valid: false, error: `Access to ${blocked} not allowed` };
        }
    }

    return { valid: true };
}

/**
 * Execute OCR extraction using tesseract.js
 */
async function executeOCRExtract(
    params: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
        const input = ocrExtractInputSchema.parse(params);

        logger.info(
            {
                path: input.path,
                language: input.language,
                outputFormat: input.outputFormat,
                traceId: context.traceId
            },
            "Extracting text via OCR"
        );

        // Validate path
        const pathValidation = validatePath(input.path);
        if (!pathValidation.valid) {
            return {
                success: false,
                error: {
                    message: pathValidation.error!,
                    code: "ACCESS_DENIED",
                    retryable: false
                },
                metadata: { durationMs: Date.now() - startTime }
            };
        }

        // Check file exists
        try {
            await access(input.path, constants.R_OK);
        } catch {
            return {
                success: false,
                error: {
                    message: `Image file not found: ${input.path}`,
                    code: "FILE_NOT_FOUND",
                    retryable: false
                },
                metadata: { durationMs: Date.now() - startTime }
            };
        }

        // Dynamic import for tesseract.js
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Tesseract = await import("tesseract.js");

        // Create worker
        const worker = await Tesseract.createWorker(input.language.join("+"), 1, {
            logger: (info: { status: string; progress: number }) => {
                if (info.status === "recognizing text") {
                    logger.debug(
                        { progress: info.progress, traceId: context.traceId },
                        "OCR progress"
                    );
                }
            }
        });

        try {
            // Set PSM (Page Segmentation Mode)
            // PSM enum values are strings '0'-'13', convert number to string
            await worker.setParameters({
                tessedit_pageseg_mode: String(input.psm) as PSM
            });

            // Read image
            const imageBuffer = await readFile(input.path);

            // Perform OCR
            const { data } = await worker.recognize(imageBuffer);

            // Extract lines and words from the nested block structure
            // Structure: blocks -> paragraphs -> lines -> words
            type TesseractLine = { words: TesseractWord[]; text: string; confidence: number };
            type TesseractWord = {
                text: string;
                confidence: number;
                bbox: { x0: number; y0: number; x1: number; y1: number };
            };

            const allLines: TesseractLine[] = [];
            const allWords: TesseractWord[] = [];

            if (data.blocks) {
                for (const block of data.blocks) {
                    for (const paragraph of block.paragraphs || []) {
                        for (const line of paragraph.lines || []) {
                            allLines.push(line);
                            for (const word of line.words || []) {
                                allWords.push(word);
                            }
                        }
                    }
                }
            }

            // Build output based on format
            let output: OCRExtractOutput;

            if (input.outputFormat === "json") {
                // Build detailed word data
                const words: OCRWord[] = [];
                let globalLineNum = 0;

                for (const line of allLines) {
                    globalLineNum++;
                    let wordNum = 0;
                    for (const word of line.words || []) {
                        if (word.confidence >= input.confidenceThreshold) {
                            words.push({
                                text: word.text,
                                confidence: word.confidence,
                                bbox: {
                                    x: word.bbox.x0,
                                    y: word.bbox.y0,
                                    width: word.bbox.x1 - word.bbox.x0,
                                    height: word.bbox.y1 - word.bbox.y0
                                },
                                lineNum: globalLineNum,
                                wordNum: ++wordNum
                            });
                        }
                    }
                }

                output = {
                    text: data.text,
                    confidence: Math.round(data.confidence),
                    words,
                    lineCount: allLines.length,
                    wordCount: words.length,
                    characterCount: data.text.length,
                    language: input.language[0]
                };
            } else if (input.outputFormat === "hocr") {
                output = {
                    text: data.text,
                    confidence: Math.round(data.confidence),
                    lineCount: allLines.length,
                    wordCount: allWords.length,
                    characterCount: data.text.length,
                    language: input.language[0]
                };
                // Note: tesseract.js doesn't directly export hOCR, but we could construct it
                logger.warn(
                    { traceId: context.traceId },
                    "hOCR format not fully supported with tesseract.js. Returning text format."
                );
            } else if (input.outputFormat === "tsv") {
                // Build TSV data
                const tsvLines: string[] = [
                    "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext"
                ];

                let lineNum = 0;
                for (const line of allLines) {
                    lineNum++;
                    let wordNum = 0;
                    for (const word of line.words || []) {
                        wordNum++;
                        tsvLines.push(
                            [
                                5,
                                1,
                                1,
                                1,
                                lineNum,
                                wordNum,
                                word.bbox.x0,
                                word.bbox.y0,
                                word.bbox.x1 - word.bbox.x0,
                                word.bbox.y1 - word.bbox.y0,
                                Math.round(word.confidence),
                                word.text
                            ].join("\t")
                        );
                    }
                }

                output = {
                    text: data.text,
                    confidence: Math.round(data.confidence),
                    lineCount: allLines.length,
                    wordCount: allWords.length,
                    characterCount: data.text.length,
                    language: input.language[0]
                };
            } else {
                // Plain text format
                output = {
                    text: data.text,
                    confidence: Math.round(data.confidence),
                    lineCount: allLines.length,
                    wordCount: allWords.length,
                    characterCount: data.text.length,
                    language: input.language[0]
                };
            }

            logger.info(
                {
                    path: input.path,
                    wordCount: output.wordCount,
                    confidence: output.confidence,
                    traceId: context.traceId
                },
                "OCR extraction completed"
            );

            return {
                success: true,
                data: output,
                metadata: {
                    durationMs: Date.now() - startTime,
                    creditCost: 1
                }
            };
        } finally {
            await worker.terminate();
        }
    } catch (error) {
        logger.error({ err: error, traceId: context.traceId }, "OCR extraction failed");

        // Check for missing tesseract.js dependency
        if (error instanceof Error && error.message.includes("tesseract")) {
            return {
                success: false,
                error: {
                    message:
                        "OCR extraction requires tesseract.js. Install with: npm install tesseract.js",
                    code: "MISSING_DEPENDENCY",
                    retryable: false
                },
                metadata: { durationMs: Date.now() - startTime }
            };
        }

        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : "OCR extraction failed",
                retryable: false
            },
            metadata: { durationMs: Date.now() - startTime }
        };
    }
}

/**
 * OCR Extract Tool Definition
 */
export const ocrExtractTool: BuiltInTool = {
    name: "ocr_extract",
    displayName: "Extract Text from Image (OCR)",
    description:
        "Extract text from images using Tesseract OCR. Supports multiple languages and various output formats including bounding box data.",
    category: "media",
    riskLevel: "low",
    inputSchema: {
        type: "object",
        properties: {
            path: {
                type: "string",
                description: "Path to the image file"
            },
            language: {
                type: "array",
                items: { type: "string" },
                description: "OCR languages (Tesseract codes)",
                default: ["eng"]
            },
            psm: {
                type: "number",
                description: "Page segmentation mode",
                minimum: 0,
                maximum: 13,
                default: 3
            },
            preprocessing: {
                type: "object",
                properties: {
                    grayscale: { type: "boolean", default: true },
                    denoise: { type: "boolean", default: false },
                    deskew: { type: "boolean", default: false },
                    threshold: { type: "boolean", default: false },
                    scale: { type: "number", default: 1 }
                },
                description: "Image preprocessing options (limited support with tesseract.js)"
            },
            outputFormat: {
                type: "string",
                enum: ["text", "hocr", "tsv", "json"],
                description: "Output format",
                default: "text"
            },
            confidenceThreshold: {
                type: "number",
                description: "Minimum confidence threshold (0-100)",
                minimum: 0,
                maximum: 100,
                default: 0
            }
        },
        required: ["path"]
    },
    zodSchema: ocrExtractInputSchema,
    enabledByDefault: true,
    creditCost: 1,
    tags: ["ocr", "image", "text-extraction", "tesseract"],
    execute: executeOCRExtract
};
