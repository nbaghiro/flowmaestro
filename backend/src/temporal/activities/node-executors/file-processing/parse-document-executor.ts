import * as fs from "fs/promises";
import mammoth from "mammoth";
import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import {
    getVariableValue,
    interpolateVariables
} from "../../../../core/utils/interpolate-variables";

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

export interface ParseDocumentNodeResult {
    text: string;
    html?: string;
    sections: Array<{
        type: "heading" | "paragraph" | "list" | "table";
        level?: number;
        content: string;
    }>;
    images?: Array<{
        id: string;
        contentType: string;
        base64: string;
    }>;
    metadata: {
        wordCount: number;
        characterCount: number;
        fileType: string;
    };
}

export async function executeParseDocumentNode(
    config: ParseDocumentNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const { buffer, extensionHint } = await getDocumentBuffer(config, context);
    const fileType = config.fileType || detectFileType(buffer, extensionHint);

    let result: ParseDocumentNodeResult;

    switch (fileType) {
        case "docx":
            result = await parseDocx(buffer, config);
            break;
        case "html":
            result = parseHtml(buffer, config);
            break;
        case "md":
        case "text":
        case "doc":
        case "rtf":
        case "odt":
            result = parsePlainText(buffer, fileType);
            break;
        default:
            result = parsePlainText(buffer, "text");
            break;
    }

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

function detectFileType(
    buffer: Buffer,
    extensionHint?: string
): ParseDocumentNodeConfig["fileType"] {
    if (extensionHint) {
        const normalized = extensionHint.toLowerCase();
        const extMap: Record<string, ParseDocumentNodeConfig["fileType"]> = {
            txt: "text",
            text: "text",
            docx: "docx",
            doc: "doc",
            rtf: "rtf",
            odt: "odt",
            html: "html",
            htm: "html",
            md: "md",
            markdown: "md"
        };
        if (extMap[normalized]) {
            return extMap[normalized];
        }
    }

    const asString = buffer.toString("utf-8").trimStart();

    if (asString.startsWith("<!doctype html") || asString.startsWith("<html")) {
        return "html";
    }

    if (asString.startsWith("{\\rtf")) {
        return "rtf";
    }

    if (buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
        return "docx";
    }

    return "text";
}

async function parseDocx(
    buffer: Buffer,
    config: ParseDocumentNodeConfig
): Promise<ParseDocumentNodeResult> {
    const images: ParseDocumentNodeResult["images"] = [];
    let imageIndex = 0;

    const options: Record<string, unknown> = {};

    if (config.extractImages) {
        options.convertImage = mammoth.images.imgElement(async (image) => {
            const imgBuffer = await image.read();
            const base64 = imgBuffer.toString("base64");
            imageIndex += 1;

            images.push({
                id: `image-${imageIndex}`,
                contentType: image.contentType,
                base64
            });

            return {
                src: `data:${image.contentType};base64,${base64}`
            };
        });
    }

    const extracted = config.preserveFormatting
        ? await mammoth.convertToHtml({ buffer }, options)
        : await mammoth.extractRawText({ buffer });

    const html = config.preserveFormatting ? extracted.value : undefined;
    const text = config.preserveFormatting ? stripHtml(extracted.value) : extracted.value;

    return buildResult({
        text,
        html,
        sections: parseSections(config.preserveFormatting ? html || text : text),
        images: config.extractImages ? images : undefined,
        fileType: "docx"
    });
}

function parseHtml(buffer: Buffer, config: ParseDocumentNodeConfig): ParseDocumentNodeResult {
    const html = buffer.toString("utf-8");
    const text = stripHtml(html);

    return buildResult({
        text,
        html: config.preserveFormatting ? html : undefined,
        sections: parseSections(config.preserveFormatting ? html : text),
        fileType: "html"
    });
}

function parsePlainText(buffer: Buffer, fileType: string): ParseDocumentNodeResult {
    const text = buffer.toString("utf-8");
    return buildResult({
        text,
        sections: parseSections(text),
        fileType: fileType || "text"
    });
}

function parseSections(content: string): ParseDocumentNodeResult["sections"] {
    if (!content || content.trim().length === 0) {
        return [];
    }

    // Normalize HTML line breaks to aid simple parsing
    let normalized = content.replace(/<\/(p|div|br|li)>/gi, "\n");
    normalized = normalized.replace(/<\/h([1-6])>/gi, "\n");

    // Simple parsing for headings/lists in markdown or HTML
    const sections: ParseDocumentNodeResult["sections"] = [];

    const lines = normalized.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const mdHeading = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (mdHeading) {
            sections.push({
                type: "heading",
                level: mdHeading[1].length,
                content: mdHeading[2].trim()
            });
            continue;
        }

        if (/^[-*+]\s+/.test(trimmed)) {
            sections.push({ type: "list", content: trimmed.replace(/^[-*+]\s+/, "") });
            continue;
        }

        const htmlHeading = trimmed.match(/^<h([1-6])[^>]*>(.*?)<\/h\1>$/i);
        if (htmlHeading) {
            sections.push({
                type: "heading",
                level: Number(htmlHeading[1]),
                content: stripHtml(htmlHeading[2]).trim()
            });
            continue;
        }

        if (/^<li[^>]*>/.test(trimmed)) {
            sections.push({ type: "list", content: stripHtml(trimmed) });
            continue;
        }

        sections.push({ type: "paragraph", content: stripHtml(trimmed) });
    }

    return sections;
}

function stripHtml(value: string): string {
    return value
        .replace(/<\/?[^>]+(>|$)/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function buildResult(input: {
    text: string;
    html?: string;
    sections: ParseDocumentNodeResult["sections"];
    images?: ParseDocumentNodeResult["images"];
    fileType: string;
}): ParseDocumentNodeResult {
    const wordCount = input.text ? input.text.trim().split(/\s+/).length : 0;
    const characterCount = input.text ? input.text.length : 0;

    return {
        text: input.text,
        html: input.html,
        sections: input.sections,
        images: input.images,
        metadata: {
            wordCount,
            characterCount,
            fileType: input.fileType
        }
    };
}
