import mammoth from "mammoth";

export type DocumentFileType = "docx" | "doc" | "text" | "rtf" | "odt" | "html" | "md";

export interface DocumentParseOptions {
    preserveFormatting: boolean;
    extractImages: boolean;
    fileTypeHint?: DocumentFileType;
    extensionHint?: string;
}

export interface DocumentParseResult {
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

export function detectDocumentType(buffer: Buffer, extensionHint?: string): DocumentFileType {
    if (extensionHint) {
        const normalized = extensionHint.toLowerCase();
        const extMap: Record<string, DocumentFileType> = {
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

export async function parseDocumentBuffer(
    buffer: Buffer,
    options: DocumentParseOptions
): Promise<DocumentParseResult> {
    const fileType = options.fileTypeHint || detectDocumentType(buffer, options.extensionHint);

    switch (fileType) {
        case "docx":
            return parseDocx(buffer, options);
        case "html":
            return parseHtml(buffer, options);
        case "md":
        case "text":
        case "doc":
        case "rtf":
        case "odt":
            return parsePlainText(buffer, fileType);
        default:
            return parsePlainText(buffer, "text");
    }
}

async function parseDocx(
    buffer: Buffer,
    options: DocumentParseOptions
): Promise<DocumentParseResult> {
    const images: DocumentParseResult["images"] = [];
    let imageIndex = 0;

    const mammothOptions: Record<string, unknown> = {};

    if (options.extractImages) {
        mammothOptions.convertImage = mammoth.images.imgElement(async (image) => {
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

    const extracted = options.preserveFormatting
        ? await mammoth.convertToHtml({ buffer }, mammothOptions)
        : await mammoth.extractRawText({ buffer });

    const html = options.preserveFormatting ? extracted.value : undefined;
    const text = options.preserveFormatting ? stripHtml(extracted.value) : extracted.value;

    return buildResult({
        text,
        html,
        sections: parseSections(options.preserveFormatting ? html || text : text),
        images: options.extractImages ? images : undefined,
        fileType: "docx"
    });
}

function parseHtml(buffer: Buffer, options: DocumentParseOptions): DocumentParseResult {
    const html = buffer.toString("utf-8");
    const text = stripHtml(html);

    return buildResult({
        text,
        html: options.preserveFormatting ? html : undefined,
        sections: parseSections(options.preserveFormatting ? html : text),
        fileType: "html"
    });
}

function parsePlainText(buffer: Buffer, fileType: string): DocumentParseResult {
    const text = buffer.toString("utf-8");
    return buildResult({
        text,
        sections: parseSections(text),
        fileType: fileType || "text"
    });
}

function parseSections(content: string): DocumentParseResult["sections"] {
    if (!content || content.trim().length === 0) {
        return [];
    }

    let normalized = content.replace(/<\/(p|div|br|li)>/gi, "\n");
    normalized = normalized.replace(/<\/h([1-6])>/gi, "\n");

    const sections: DocumentParseResult["sections"] = [];
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
    sections: DocumentParseResult["sections"];
    images?: DocumentParseResult["images"];
    fileType: string;
}): DocumentParseResult {
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
