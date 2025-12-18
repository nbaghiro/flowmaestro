import Tesseract from "tesseract.js";

export interface OcrResult {
    text: string;
}

export async function runOcr(buffer: Buffer, language = "eng"): Promise<OcrResult> {
    const result = await Tesseract.recognize(buffer, language);
    const text = result.data?.text || "";

    return { text };
}
