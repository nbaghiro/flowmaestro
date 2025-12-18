import * as fs from "fs/promises";
import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import {
    getVariableValue,
    interpolateVariables
} from "../../../../core/utils/interpolate-variables";
import { parsePdfDocument, type PdfParseResult } from "../../../services/document-parsing";

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

export type ParsePdfNodeResult = PdfParseResult;

export async function executeParsePdfNode(
    config: ParsePdfNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const pdfBuffer = await getPdfBuffer(config, context);
    validatePdfSignature(pdfBuffer);
    const result = await parsePdfDocument(pdfBuffer, {
        ocrEnabled: config.ocrEnabled,
        ocrLanguage: config.ocrLanguage,
        extractTables: config.extractTables,
        pageRange: config.pageRange
    });

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

function validatePdfSignature(buffer: Buffer): void {
    const signature = buffer.slice(0, 5).toString("ascii");
    if (!signature.startsWith("%PDF-")) {
        throw new Error("Parse PDF: input is not a valid PDF file");
    }
}
