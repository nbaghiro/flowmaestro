import * as fs from "fs/promises";
import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import {
    getVariableValue,
    interpolateVariables
} from "../../../../core/utils/interpolate-variables";
import { parseDocumentBuffer, type DocumentParseResult } from "../../../services/document-parsing";

export interface ParseDocumentNodeConfig {
    // Input source
    fileInput: string;
    urlInput?: string;
    base64Input?: string;

    // File type
    fileType?: "docx" | "doc" | "text" | "rtf" | "odt" | "html" | "md";

    // Extraction options
    preserveFormatting: boolean;
    extractImages: boolean;

    // Output configuration
    outputVariable: string;
}

export type ParseDocumentNodeResult = DocumentParseResult;

export async function executeParseDocumentNode(
    config: ParseDocumentNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const { buffer, extensionHint } = await getDocumentBuffer(config, context);
    const result = await parseDocumentBuffer(buffer, {
        preserveFormatting: config.preserveFormatting,
        extractImages: config.extractImages,
        fileTypeHint: config.fileType,
        extensionHint
    });

    const output: JsonObject = {
        [config.outputVariable]: result as unknown as JsonValue
    };

    return output;
}

async function getDocumentBuffer(
    config: ParseDocumentNodeConfig,
    context: JsonObject
): Promise<{ buffer: Buffer; extensionHint?: string }> {
    if (config.urlInput) {
        const url = interpolateVariables(config.urlInput, context);
        const buffer = await downloadFile(url);
        return { buffer, extensionHint: getExtensionFromPath(url) };
    }

    if (config.base64Input) {
        const base64 = interpolateVariables(config.base64Input, context);
        return { buffer: decodeBase64(base64) };
    }

    const variableValue = getVariableValue(config.fileInput, context);

    if (variableValue instanceof Uint8Array) {
        return { buffer: Buffer.from(variableValue) };
    }

    if (typeof variableValue === "string" && variableValue.trim().length > 0) {
        const trimmed = variableValue.trim();

        if (/^https?:\/\//i.test(trimmed)) {
            const buffer = await downloadFile(trimmed);
            return { buffer, extensionHint: getExtensionFromPath(trimmed) };
        }

        if (await fileExists(trimmed)) {
            const buffer = await fs.readFile(trimmed);
            return { buffer, extensionHint: getExtensionFromPath(trimmed) };
        }

        if (isBase64Like(trimmed)) {
            return { buffer: decodeBase64(trimmed) };
        }

        return { buffer: Buffer.from(trimmed, "utf-8") };
    }

    const interpolated = interpolateVariables(config.fileInput, context);
    if (interpolated) {
        const trimmed = interpolated.trim();
        if (await fileExists(trimmed)) {
            const buffer = await fs.readFile(trimmed);
            return { buffer, extensionHint: getExtensionFromPath(trimmed) };
        }
    }

    throw new Error("Parse Document node requires a fileInput, urlInput, or base64Input value");
}

async function downloadFile(url: string): Promise<Buffer> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
            throw new Error(`Failed to download document: HTTP ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } finally {
        clearTimeout(timeoutId);
    }
}

async function fileExists(path: string): Promise<boolean> {
    try {
        await fs.access(path);
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

function getExtensionFromPath(path: string): string | undefined {
    const match = path.match(/\.([a-z0-9]+)(?:[#?].*)?$/i);
    return match ? match[1].toLowerCase() : undefined;
}
