import * as fs from "fs/promises";
import * as pdf from "pdf-parse";
import Tesseract from "tesseract.js";
import type { JsonArray, JsonObject, JsonValue } from "@flowmaestro/shared";
import {
    getVariableValue,
    interpolateVariables
} from "../../../../core/utils/interpolate-variables";

export interface ParsePdfNodeConfig {
    // Input source
    fileInput: string;
    urlInput?: string;
    base64Input?: string;

    // Extraction options
    ocrEnabled: boolean;
    ocrLanguage?: string;
    extractTables: boolean;
    pageRange?: { start?: number; end?: number };

    // Output configuration
    outputVariable: string;
}

export interface ParsePdfNodeResult {
    text: string;
    pages: Array<{
        pageNumber: number;
        text: string;
        tables?: JsonArray[];
    }>;
    metadata: {
        title?: string;
        author?: string;
        creationDate?: string;
        pageCount: number;
    };
}

type PdfParseFn = (
    dataBuffer: Buffer,
    options?: Record<string, unknown>
) => Promise<{
    text: string;
    info?: {
        Title?: string;
        Author?: string;
        CreationDate?: string;
    };
    numpages: number;
}>;

const OCR_TEXT_THRESHOLD = 100;

export async function executeParsePdfNode(
    config: ParsePdfNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const pdfBuffer = await getPdfBuffer(config, context);
    const pageTexts: string[] = [];
    let pageIndex = 0;

    const parsed = await (pdf as unknown as PdfParseFn)(pdfBuffer, {
        pagerender: async (pageData: {
            getTextContent: () => Promise<{ items: Array<{ str: string }> }>;
        }) => {
            pageIndex += 1;
            const textContent = await pageData.getTextContent();
            const text = textContent.items.map((item) => item.str).join(" ");
            pageTexts[pageIndex - 1] = text;
            return text;
        }
    });

    const pagesBeforeRange = pageTexts.map((text, idx) => ({
        pageNumber: idx + 1,
        text
    }));

    let pages = applyPageRange(pagesBeforeRange, config.pageRange);
    let extractedText =
        pages.length > 0 ? pages.map((page) => page.text).join("\n\n") : parsed.text || "";

    if (config.ocrEnabled && extractedText.trim().length < OCR_TEXT_THRESHOLD) {
        const ocrResult = await Tesseract.recognize(pdfBuffer, config.ocrLanguage || "eng");
        const ocrText = ocrResult.data?.text || "";
        const ocrPages = buildPagesFromOcrText(ocrText, config.pageRange);

        extractedText = ocrText;
        if (ocrPages.length > 0) {
            pages = ocrPages;
        } else if (pages.length === 0) {
            pages = [
                {
                    pageNumber: Math.max(1, config.pageRange?.start ?? 1),
                    text: ocrText
                }
            ];
        }
    }

    const result: ParsePdfNodeResult = {
        text: extractedText,
        pages: config.extractTables ? pages.map((page) => ({ ...page, tables: [] })) : pages,
        metadata: {
            title: parsed.info?.Title,
            author: parsed.info?.Author,
            creationDate: parsed.info?.CreationDate,
            pageCount: parsed.numpages || pages.length
        }
    };

    const output: JsonObject = {
        [config.outputVariable]: result as unknown as JsonValue
    };

    return output;
}

async function getPdfBuffer(config: ParsePdfNodeConfig, context: JsonObject): Promise<Buffer> {
    if (config.urlInput) {
        const url = interpolateVariables(config.urlInput, context);
        return downloadPdf(url);
    }

    if (config.base64Input) {
        const base64 = interpolateVariables(config.base64Input, context);
        return decodeBase64(base64);
    }

    const variableValue = getVariableValue(config.fileInput, context);
    if (variableValue instanceof Uint8Array) {
        return Buffer.from(variableValue);
    }

    if (typeof variableValue === "string" && variableValue.trim().length > 0) {
        return loadFromStringValue(variableValue);
    }

    const interpolatedPath = interpolateVariables(config.fileInput, context);
    if (interpolatedPath) {
        return loadFromStringValue(interpolatedPath);
    }

    throw new Error("Parse PDF node requires a fileInput, urlInput, or base64Input value");
}

async function downloadPdf(url: string): Promise<Buffer> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(url, {
            headers: { "User-Agent": "FlowMaestro/1.0" },
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`Failed to download PDF: HTTP ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } finally {
        clearTimeout(timeoutId);
    }
}

async function loadFromStringValue(value: string): Promise<Buffer> {
    const trimmed = value.trim();

    if (/^https?:\/\//i.test(trimmed)) {
        return downloadPdf(trimmed);
    }

    if (await fileExists(trimmed)) {
        return fs.readFile(trimmed);
    }

    if (isBase64Like(trimmed)) {
        return decodeBase64(trimmed);
    }

    throw new Error("Unable to resolve PDF input from provided string");
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch (_error) {
        return false;
    }
}

function isBase64Like(value: string): boolean {
    if (value.startsWith("data:")) {
        return true;
    }

    const normalized = value.replace(/\s+/g, "");
    return (
        normalized.length > 100 &&
        normalized.length % 4 === 0 &&
        /^[A-Za-z0-9+/=]+$/.test(normalized)
    );
}

function decodeBase64(value: string): Buffer {
    const normalized = value.startsWith("data:")
        ? value.substring(value.indexOf(",") + 1)
        : value.replace(/\s+/g, "");

    return Buffer.from(normalized, "base64");
}

function applyPageRange(
    pages: ParsePdfNodeResult["pages"],
    pageRange?: { start?: number; end?: number }
): ParsePdfNodeResult["pages"] {
    if (!pageRange) {
        return pages;
    }

    const start = Math.max(1, pageRange.start ?? 1);
    const end = pageRange.end && pageRange.end > 0 ? pageRange.end : undefined;

    return pages.filter((page) => page.pageNumber >= start && (!end || page.pageNumber <= end));
}

function buildPagesFromOcrText(
    text: string,
    pageRange?: { start?: number; end?: number }
): ParsePdfNodeResult["pages"] {
    const segments = text
        .split(/\f+/)
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0);

    if (segments.length === 0) {
        return [];
    }

    const start = Math.max(1, pageRange?.start ?? 1);
    const end = pageRange?.end && pageRange.end > 0 ? pageRange.end : undefined;

    return segments.reduce<ParsePdfNodeResult["pages"]>((acc, segment, idx) => {
        const pageNumber = start + idx;
        if (end && pageNumber > end) {
            return acc;
        }
        acc.push({ pageNumber, text: segment });
        return acc;
    }, []);
}
