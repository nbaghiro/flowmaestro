import { PDFParse } from "pdf-parse";
import type { JsonArray } from "@flowmaestro/shared";
import { runOcr } from "./ocr-service";

export interface PdfParseOptions {
    ocrEnabled: boolean;
    ocrLanguage?: string;
    extractTables: boolean;
    pageRange?: { start?: number; end?: number };
}

export interface PdfPage {
    pageNumber: number;
    text: string;
    tables?: JsonArray[];
}

export interface PdfParseResult {
    text: string;
    pages: PdfPage[];
    metadata: {
        title?: string;
        author?: string;
        creationDate?: string;
        pageCount: number;
    };
}

const OCR_TEXT_THRESHOLD = 100;
const DEFAULT_PDF_OPTIONS = {
    disableWorker: true,
    disableStream: true,
    disableAutoFetch: true,
    useWasm: false,
    useWorkerFetch: false,
    verbosity: 0
} as const;

export async function parsePdfDocument(
    pdfBuffer: Buffer,
    options: PdfParseOptions
): Promise<PdfParseResult> {
    const parser = new PDFParse({
        ...DEFAULT_PDF_OPTIONS,
        data: new Uint8Array(pdfBuffer)
    });

    try {
        const info = await parser.getInfo();
        const totalPages = info.total;
        const partial = buildPageSelection(options.pageRange, totalPages);

        const textResult = await parser.getText({
            partial,
            pageJoiner: "\n\n",
            itemJoiner: " ",
            lineEnforce: true
        });

        let pages: PdfPage[] = textResult.pages.map((page) => ({
            pageNumber: page.num,
            text: page.text
        }));

        let extractedText = textResult.text;

        if (options.ocrEnabled && extractedText.trim().length < OCR_TEXT_THRESHOLD) {
            const ocrResult = await runOcr(pdfBuffer, options.ocrLanguage || "eng");
            const ocrPages = buildPagesFromOcrText(ocrResult.text, options.pageRange);

            extractedText = ocrResult.text;
            pages = ocrPages.length > 0 ? ocrPages : pages;
        }

        return {
            text: extractedText,
            pages: options.extractTables ? pages.map((p) => ({ ...p, tables: [] })) : pages,
            metadata: {
                title: info.info?.Title,
                author: info.info?.Author,
                creationDate: info.info?.CreationDate,
                pageCount: totalPages
            }
        };
    } finally {
        await parser.destroy().catch(() => undefined);
    }
}

function buildPagesFromOcrText(
    text: string,
    pageRange?: { start?: number; end?: number }
): PdfPage[] {
    const segments = text
        .split(/\f+/)
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0);

    if (segments.length === 0) {
        return [];
    }

    const start = Math.max(1, pageRange?.start ?? 1);
    const end = pageRange?.end && pageRange.end > 0 ? pageRange.end : undefined;

    return segments.reduce<PdfPage[]>((acc, segment, idx) => {
        const pageNumber = start + idx;
        if (end && pageNumber > end) {
            return acc;
        }
        acc.push({ pageNumber, text: segment });
        return acc;
    }, []);
}

function buildPageSelection(
    pageRange: { start?: number; end?: number } | undefined,
    totalPages: number
): number[] | undefined {
    if (!pageRange) {
        return undefined;
    }

    const start = Math.max(1, pageRange.start ?? 1);
    const end = Math.min(
        totalPages,
        pageRange.end && pageRange.end > 0 ? pageRange.end : totalPages
    );
    if (start > end) {
        return undefined;
    }

    const pages: number[] = [];
    for (let page = start; page <= end; page += 1) {
        pages.push(page);
    }

    return pages;
}
