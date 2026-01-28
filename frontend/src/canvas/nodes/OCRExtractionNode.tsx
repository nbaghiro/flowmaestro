/**
 * OCR Extraction Node Component
 *
 * Extracts text from images using Tesseract OCR.
 * Uses the ocr_extract builtin tool.
 */

import { ScanText } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import { BaseNode } from "./BaseNode";

interface OCRExtractionNodeData {
    label: string;
    status?: NodeExecutionStatus;
    languages?: string[];
    outputFormat?: string;
    confidenceThreshold?: number;
}

const LANGUAGE_LABELS: Record<string, string> = {
    eng: "English",
    spa: "Spanish",
    fra: "French",
    deu: "German",
    ita: "Italian",
    por: "Portuguese",
    chi_sim: "Chinese (Simplified)",
    chi_tra: "Chinese (Traditional)",
    jpn: "Japanese",
    kor: "Korean",
    ara: "Arabic",
    rus: "Russian"
};

function OCRExtractionNode({ data, selected }: NodeProps<OCRExtractionNodeData>) {
    const languages = data.languages || ["eng"];
    const outputFormat = data.outputFormat || "text";
    const primaryLang = languages[0] || "eng";

    return (
        <BaseNode
            icon={ScanText}
            label={data.label || "OCR"}
            status={data.status}
            category="ai"
            selected={selected}
        >
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Language:</span>
                    <span className="text-xs font-medium text-foreground">
                        {LANGUAGE_LABELS[primaryLang] || primaryLang}
                        {languages.length > 1 && ` +${languages.length - 1}`}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Output:</span>
                    <span className="text-xs font-medium text-foreground capitalize">
                        {outputFormat}
                    </span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(OCRExtractionNode);
