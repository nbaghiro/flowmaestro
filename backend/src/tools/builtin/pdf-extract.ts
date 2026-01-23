/**
 * PDF Extract Tool
 *
 * Extracts text and metadata from PDF documents using pdf-parse
 */

import { readFile } from "fs/promises";
import { z } from "zod";
import { createServiceLogger } from "../../core/logging";
import type { BuiltInTool, ToolExecutionContext, ToolExecutionResult } from "../types";

const logger = createServiceLogger("PDFExtractTool");

/**
 * Input schema for PDF extraction
 */
export const pdfExtractInputSchema = z.object({
    path: z.string().min(1).describe("Path to the PDF file"),
    extractText: z.boolean().default(true).describe("Extract text content"),
    extractTables: z.boolean().default(false).describe("Extract tables as structured data"),
    extractImages: z.boolean().default(false).describe("Extract embedded images"),
    extractMetadata: z.boolean().default(true).describe("Extract document metadata"),
    pages: z
        .union([
            z.literal("all"),
            z.array(z.number().int().positive()),
            z.object({
                start: z.number().int().min(1),
                end: z.number().int().min(1)
            })
        ])
        .default("all")
        .describe("Pages to extract (all, array of page numbers, or range)"),
    outputFormat: z
        .enum(["text", "markdown", "json"])
        .default("text")
        .describe("Output format for extracted text"),
    preserveLayout: z.boolean().default(false).describe("Try to preserve original layout"),
    password: z.string().optional().describe("Password for encrypted PDFs")
});

export type PDFExtractInput = z.infer<typeof pdfExtractInputSchema>;

/**
 * Extracted table structure
 */
export interface ExtractedTable {
    pageNumber: number;
    tableIndex: number;
    headers: string[];
    rows: string[][];
}

/**
 * Extracted image info
 */
export interface ExtractedImage {
    pageNumber: number;
    imageIndex: number;
    width: number;
    height: number;
    format: string;
    path: string;
}

/**
 * PDF extraction result
 */
export interface PDFExtractOutput {
    text: string;
    pages: Array<{
        pageNumber: number;
        text: string;
        tables?: ExtractedTable[];
        images?: ExtractedImage[];
    }>;
    metadata: {
        title?: string;
        author?: string;
        subject?: string;
        creator?: string;
        producer?: string;
        creationDate?: string;
        modificationDate?: string;
        pageCount: number;
        isEncrypted: boolean;
    };
    tables?: ExtractedTable[];
    images?: ExtractedImage[];
    wordCount: number;
    characterCount: number;
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
 * Filter pages based on configuration
 */
function filterPages(
    allPages: string[],
    pagesConfig: "all" | number[] | { start: number; end: number }
): { pages: string[]; pageNumbers: number[] } {
    if (pagesConfig === "all") {
        return {
            pages: allPages,
            pageNumbers: allPages.map((_, i) => i + 1)
        };
    }

    if (Array.isArray(pagesConfig)) {
        const result: string[] = [];
        const numbers: number[] = [];
        for (const pageNum of pagesConfig) {
            if (pageNum >= 1 && pageNum <= allPages.length) {
                result.push(allPages[pageNum - 1]);
                numbers.push(pageNum);
            }
        }
        return { pages: result, pageNumbers: numbers };
    }

    // Range
    const start = Math.max(0, pagesConfig.start - 1);
    const end = Math.min(allPages.length, pagesConfig.end);
    return {
        pages: allPages.slice(start, end),
        pageNumbers: Array.from({ length: end - start }, (_, i) => start + i + 1)
    };
}

/**
 * Convert text to simple markdown
 */
function textToMarkdown(text: string): string {
    // Split into paragraphs
    const paragraphs = text.split(/\n\s*\n/);
    const mdParts: string[] = [];

    for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        // Check if it looks like a heading (short, starts with caps, no period at end)
        if (
            trimmed.length < 80 &&
            /^[A-Z]/.test(trimmed) &&
            !trimmed.endsWith(".") &&
            !trimmed.includes("  ")
        ) {
            mdParts.push(`## ${trimmed}`);
        } else {
            mdParts.push(trimmed);
        }
    }

    return mdParts.join("\n\n");
}

/**
 * Execute PDF extraction
 */
async function executePDFExtract(
    params: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
        const input = pdfExtractInputSchema.parse(params);

        logger.info(
            {
                path: input.path,
                extractText: input.extractText,
                extractTables: input.extractTables,
                extractImages: input.extractImages,
                traceId: context.traceId
            },
            "Extracting PDF content"
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

        // Read PDF file
        let pdfBuffer: Buffer;
        try {
            pdfBuffer = await readFile(input.path);
        } catch (err) {
            const error = err as NodeJS.ErrnoException;
            if (error.code === "ENOENT") {
                return {
                    success: false,
                    error: {
                        message: `File not found: ${input.path}`,
                        code: "FILE_NOT_FOUND",
                        retryable: false
                    },
                    metadata: { durationMs: Date.now() - startTime }
                };
            }
            throw error;
        }

        // Dynamic import for pdf-parse
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
        const pdfParseModule = (await import("pdf-parse")) as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfParse: (buffer: Buffer, options?: any) => Promise<any> =
            pdfParseModule.default || pdfParseModule;

        // Parse options
        const options: {
            pagerender?: (pageData: {
                pageIndex: number;
                getTextContent: () => Promise<{ items: Array<{ str: string }> }>;
            }) => Promise<string>;
            password?: string;
        } = {};

        // Handle password-protected PDFs
        if (input.password) {
            options.password = input.password;
        }

        // Parse PDF
        let pdfData;
        try {
            pdfData = await pdfParse(pdfBuffer, options);
        } catch (err) {
            const error = err as Error;
            if (error.message.includes("password")) {
                return {
                    success: false,
                    error: {
                        message: "PDF is encrypted. Please provide the correct password.",
                        code: "ENCRYPTED",
                        retryable: false
                    },
                    metadata: { durationMs: Date.now() - startTime }
                };
            }
            throw error;
        }

        // Extract metadata
        const metadata: PDFExtractOutput["metadata"] = {
            title: pdfData.info?.Title || undefined,
            author: pdfData.info?.Author || undefined,
            subject: pdfData.info?.Subject || undefined,
            creator: pdfData.info?.Creator || undefined,
            producer: pdfData.info?.Producer || undefined,
            creationDate: pdfData.info?.CreationDate || undefined,
            modificationDate: pdfData.info?.ModDate || undefined,
            pageCount: pdfData.numpages,
            isEncrypted: false // pdf-parse handles decryption
        };

        // Get text content
        const fullText = pdfData.text || "";

        // Split text by page markers (pdf-parse inserts form feed characters)
        const pageTexts = fullText.split(/\f/).filter((t: string) => t.trim());

        // Ensure we have as many page texts as there are pages
        while (pageTexts.length < pdfData.numpages) {
            pageTexts.push("");
        }

        // Filter pages based on configuration
        const { pages: filteredTexts, pageNumbers } = filterPages(pageTexts, input.pages);

        // Build pages array
        const pages: PDFExtractOutput["pages"] = filteredTexts.map((text, i) => {
            let processedText = text;

            if (input.outputFormat === "markdown") {
                processedText = textToMarkdown(text);
            }

            return {
                pageNumber: pageNumbers[i],
                text: processedText
            };
        });

        // Combine text from filtered pages
        let combinedText = filteredTexts.join("\n\n");

        if (input.outputFormat === "markdown") {
            combinedText = textToMarkdown(combinedText);
        }

        // Calculate stats
        const wordCount = combinedText.split(/\s+/).filter((w) => w.length > 0).length;
        const characterCount = combinedText.length;

        const output: PDFExtractOutput = {
            text: combinedText,
            pages,
            metadata,
            wordCount,
            characterCount
        };

        // Note: pdf-parse doesn't support table extraction natively
        if (input.extractTables) {
            output.tables = [];
            logger.warn(
                { traceId: context.traceId },
                "Table extraction not supported with pdf-parse. Consider using a different library for table extraction."
            );
        }

        // Note: pdf-parse doesn't support image extraction
        if (input.extractImages) {
            output.images = [];
            logger.warn(
                { traceId: context.traceId },
                "Image extraction not supported with pdf-parse. Consider using a different library for image extraction."
            );
        }

        logger.info(
            {
                path: input.path,
                pageCount: metadata.pageCount,
                wordCount,
                traceId: context.traceId
            },
            "PDF extracted successfully"
        );

        return {
            success: true,
            data: output,
            metadata: {
                durationMs: Date.now() - startTime,
                creditCost: 1
            }
        };
    } catch (error) {
        logger.error({ err: error, traceId: context.traceId }, "PDF extraction failed");

        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : "PDF extraction failed",
                retryable: false
            },
            metadata: { durationMs: Date.now() - startTime }
        };
    }
}

/**
 * PDF Extract Tool Definition
 */
export const pdfExtractTool: BuiltInTool = {
    name: "pdf_extract",
    displayName: "Extract PDF Content",
    description:
        "Extract text and metadata from PDF documents. Supports page selection and multiple output formats. Note: Table and image extraction require additional libraries.",
    category: "data",
    riskLevel: "low",
    inputSchema: {
        type: "object",
        properties: {
            path: {
                type: "string",
                description: "Path to the PDF file"
            },
            extractText: {
                type: "boolean",
                description: "Extract text content",
                default: true
            },
            extractTables: {
                type: "boolean",
                description: "Extract tables as structured data (limited support)",
                default: false
            },
            extractImages: {
                type: "boolean",
                description: "Extract embedded images (limited support)",
                default: false
            },
            extractMetadata: {
                type: "boolean",
                description: "Extract document metadata",
                default: true
            },
            pages: {
                oneOf: [
                    { type: "string", enum: ["all"] },
                    { type: "array", items: { type: "number" } },
                    {
                        type: "object",
                        properties: {
                            start: { type: "number" },
                            end: { type: "number" }
                        }
                    }
                ],
                description: "Pages to extract",
                default: "all"
            },
            outputFormat: {
                type: "string",
                enum: ["text", "markdown", "json"],
                description: "Output format for extracted text",
                default: "text"
            },
            preserveLayout: {
                type: "boolean",
                description: "Try to preserve original layout",
                default: false
            },
            password: {
                type: "string",
                description: "Password for encrypted PDFs"
            }
        },
        required: ["path"]
    },
    zodSchema: pdfExtractInputSchema,
    enabledByDefault: true,
    creditCost: 1,
    tags: ["pdf", "extract", "text", "tables", "document"],
    execute: executePDFExtract
};
