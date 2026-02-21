/**
 * PDF Generation Tool
 *
 * Generates PDF documents from markdown or HTML content using Puppeteer/Chromium
 */

import { mkdir, stat } from "fs/promises";
import { join } from "path";
import { z } from "zod";
import { createServiceLogger } from "../../../core/logging";
import type { BuiltInTool, ToolExecutionContext, ToolExecutionResult } from "../types";

const logger = createServiceLogger("PDFGenerateTool");

/**
 * Page size options
 */
export type PageSize = "a4" | "letter" | "legal";

/**
 * Page orientation
 */
export type PageOrientation = "portrait" | "landscape";

/**
 * Input schema for PDF generation
 */
export const pdfGenerateInputSchema = z.object({
    content: z.string().min(1).max(500000).describe("Content to convert to PDF (Markdown or HTML)"),
    format: z
        .enum(["markdown", "html"])
        .default("markdown")
        .describe("Format of the input content"),
    filename: z.string().min(1).max(255).default("document.pdf").describe("Output filename"),
    pageSize: z.enum(["a4", "letter", "legal"]).default("a4").describe("Page size"),
    orientation: z.enum(["portrait", "landscape"]).default("portrait").describe("Page orientation"),
    margins: z
        .object({
            top: z.number().default(20),
            right: z.number().default(20),
            bottom: z.number().default(20),
            left: z.number().default(20)
        })
        .optional()
        .describe("Page margins in millimeters"),
    headerText: z.string().optional().describe("Header text for each page"),
    footerText: z.string().optional().describe("Footer text for each page"),
    includePageNumbers: z.boolean().default(true).describe("Include page numbers in footer")
});

export type PDFGenerateInput = z.infer<typeof pdfGenerateInputSchema>;

/**
 * PDF generation result
 */
export interface PDFGenerateOutput {
    filename: string;
    path: string;
    size: number;
    pageCount: number;
}

/**
 * Simple markdown to HTML converter
 */
function markdownToHtml(markdown: string): string {
    let html = markdown;

    // Headers
    html = html.replace(/^######\s+(.*)$/gm, "<h6>$1</h6>");
    html = html.replace(/^#####\s+(.*)$/gm, "<h5>$1</h5>");
    html = html.replace(/^####\s+(.*)$/gm, "<h4>$1</h4>");
    html = html.replace(/^###\s+(.*)$/gm, "<h3>$1</h3>");
    html = html.replace(/^##\s+(.*)$/gm, "<h2>$1</h2>");
    html = html.replace(/^#\s+(.*)$/gm, "<h1>$1</h1>");

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/___(.+?)___/g, "<strong><em>$1</em></strong>");
    html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
    html = html.replace(/_(.+?)_/g, "<em>$1</em>");

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>");
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Lists
    html = html.replace(/^\s*[-*]\s+(.*)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");
    html = html.replace(/^\s*\d+\.\s+(.*)$/gm, "<li>$1</li>");

    // Blockquotes
    html = html.replace(/^>\s+(.*)$/gm, "<blockquote>$1</blockquote>");

    // Horizontal rules
    html = html.replace(/^---+$/gm, "<hr>");
    html = html.replace(/^\*\*\*+$/gm, "<hr>");

    // Paragraphs (wrap remaining text)
    html = html.replace(/^(?!<[a-z]|$)(.+)$/gm, "<p>$1</p>");

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, "");

    return html;
}

/**
 * Generate styled HTML document
 */
function generateHtmlDocument(input: PDFGenerateInput): string {
    const margins = input.margins || { top: 20, right: 20, bottom: 20, left: 20 };
    const htmlContent = input.format === "markdown" ? markdownToHtml(input.content) : input.content;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {
            size: ${input.pageSize} ${input.orientation};
            margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }
        h1 { font-size: 2em; }
        h2 { font-size: 1.5em; }
        h3 { font-size: 1.25em; }
        h4 { font-size: 1.1em; }
        h5 { font-size: 1em; }
        h6 { font-size: 0.9em; }
        code {
            background: #f4f4f4;
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 0.9em;
        }
        pre {
            background: #f4f4f4;
            padding: 1em;
            border-radius: 5px;
            overflow-x: auto;
        }
        pre code {
            background: none;
            padding: 0;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background: #f4f4f4;
        }
        blockquote {
            border-left: 4px solid #ddd;
            margin: 1em 0;
            padding-left: 1em;
            color: #666;
        }
        a {
            color: #0066cc;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        ul, ol {
            padding-left: 2em;
        }
        li {
            margin: 0.5em 0;
        }
        hr {
            border: none;
            border-top: 1px solid #ddd;
            margin: 2em 0;
        }
        p {
            margin: 1em 0;
        }
    </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
}

/**
 * Generate PDF using Puppeteer
 */
async function generatePdf(
    input: PDFGenerateInput,
    outputDir: string
): Promise<{ path: string; filename: string; size: number; pageCount: number }> {
    // Dynamic import for optional dependency
    const { chromium } = await import("playwright");

    const filename = input.filename.endsWith(".pdf") ? input.filename : `${input.filename}.pdf`;
    const outputPath = join(outputDir, filename);
    const margins = input.margins || { top: 20, right: 20, bottom: 20, left: 20 };

    // Generate HTML content
    const htmlContent = generateHtmlDocument(input);

    // Launch browser
    const browser = await chromium.launch({ headless: true });

    try {
        const page = await browser.newPage();

        // Set HTML content
        await page.setContent(htmlContent, { waitUntil: "networkidle" });

        const isLandscape = input.orientation === "landscape";

        // Build header/footer templates
        const headerTemplate = input.headerText
            ? `<div style="font-size: 10px; text-align: center; width: 100%; padding: 0 20px;">${input.headerText}</div>`
            : "<span></span>";

        const footerParts = [];
        if (input.footerText) {
            footerParts.push(input.footerText);
        }
        if (input.includePageNumbers) {
            footerParts.push(
                'Page <span class="pageNumber"></span> of <span class="totalPages"></span>'
            );
        }
        const footerTemplate =
            footerParts.length > 0
                ? `<div style="font-size: 10px; text-align: center; width: 100%; padding: 0 20px;">${footerParts.join(" | ")}</div>`
                : "<span></span>";

        // Generate PDF
        await page.pdf({
            path: outputPath,
            format: input.pageSize.toUpperCase() as "A4" | "Letter" | "Legal",
            landscape: isLandscape,
            margin: {
                top: `${margins.top}mm`,
                right: `${margins.right}mm`,
                bottom: `${margins.bottom}mm`,
                left: `${margins.left}mm`
            },
            displayHeaderFooter: !!(
                input.headerText ||
                input.footerText ||
                input.includePageNumbers
            ),
            headerTemplate,
            footerTemplate,
            printBackground: true
        });

        // Get page count (rough estimate based on content length)
        // A more accurate method would be to read the PDF
        const pageCount = Math.max(1, Math.ceil(input.content.length / 3000));

        return { path: outputPath, filename, size: 0, pageCount };
    } finally {
        await browser.close();
    }
}

/**
 * Execute PDF generation
 */
async function executePDFGenerate(
    params: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
        // Validate input
        const input = pdfGenerateInputSchema.parse(params);

        logger.info(
            {
                contentLength: input.content.length,
                format: input.format,
                filename: input.filename,
                traceId: context.traceId
            },
            "Generating PDF"
        );

        // Determine output directory
        const outputDir = context.traceId ? `/tmp/fm-workspace/${context.traceId}` : "/tmp";

        // Ensure output directory exists
        try {
            await mkdir(outputDir, { recursive: true });
        } catch {
            // Directory may already exist
        }

        // Generate the PDF
        const result = await generatePdf(input, outputDir);

        // Get final file stats
        const stats = await stat(result.path);

        const output: PDFGenerateOutput = {
            filename: result.filename,
            path: result.path,
            size: stats.size,
            pageCount: result.pageCount
        };

        logger.info(
            {
                path: output.path,
                size: output.size,
                pageCount: output.pageCount,
                traceId: context.traceId
            },
            "PDF generated successfully"
        );

        return {
            success: true,
            data: output,
            metadata: {
                durationMs: Date.now() - startTime,
                creditCost: 2 // PDF generation costs credits
            }
        };
    } catch (error) {
        logger.error({ err: error, traceId: context.traceId }, "PDF generation failed");

        // Check for missing playwright dependency
        if (error instanceof Error && error.message.includes("playwright")) {
            return {
                success: false,
                error: {
                    message:
                        "PDF generation requires Playwright. Install with: npm install playwright && npx playwright install chromium",
                    code: "MISSING_DEPENDENCY",
                    retryable: false
                },
                metadata: { durationMs: Date.now() - startTime }
            };
        }

        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : "PDF generation failed",
                retryable: false
            },
            metadata: {
                durationMs: Date.now() - startTime
            }
        };
    }
}

/**
 * PDF Generate Tool Definition
 */
export const pdfGenerateTool: BuiltInTool = {
    name: "pdf_generate",
    displayName: "Generate PDF",
    description:
        "Generate a PDF document from Markdown or HTML content. Use this to create reports, documents, or any content that needs to be shared as a PDF.",
    category: "media",
    riskLevel: "medium",
    inputSchema: {
        type: "object",
        properties: {
            content: {
                type: "string",
                description: "Content to convert to PDF (Markdown or HTML)",
                minLength: 1,
                maxLength: 500000
            },
            format: {
                type: "string",
                enum: ["markdown", "html"],
                description: "Format of the input content",
                default: "markdown"
            },
            filename: {
                type: "string",
                description: "Output filename",
                default: "document.pdf"
            },
            pageSize: {
                type: "string",
                enum: ["a4", "letter", "legal"],
                description: "Page size",
                default: "a4"
            },
            orientation: {
                type: "string",
                enum: ["portrait", "landscape"],
                description: "Page orientation",
                default: "portrait"
            },
            margins: {
                type: "object",
                properties: {
                    top: { type: "number", default: 20 },
                    right: { type: "number", default: 20 },
                    bottom: { type: "number", default: 20 },
                    left: { type: "number", default: 20 }
                },
                description: "Page margins in millimeters"
            },
            headerText: {
                type: "string",
                description: "Header text for each page"
            },
            footerText: {
                type: "string",
                description: "Footer text for each page"
            },
            includePageNumbers: {
                type: "boolean",
                description: "Include page numbers in footer",
                default: true
            }
        },
        required: ["content"]
    },
    zodSchema: pdfGenerateInputSchema,
    enabledByDefault: true,
    creditCost: 2,
    tags: ["pdf", "document", "report", "export"],
    execute: executePDFGenerate
};
