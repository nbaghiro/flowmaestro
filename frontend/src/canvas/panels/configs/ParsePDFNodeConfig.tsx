import { useEffect, useState } from "react";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Textarea } from "../../../components/common/Textarea";

interface ParsePDFNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

export function ParsePDFNodeConfig({ data, onUpdate }: ParsePDFNodeConfigProps) {
    const [fileInput, setFileInput] = useState((data.fileInput as string) || "");
    const [urlInput, setUrlInput] = useState((data.urlInput as string) || "");
    const [base64Input, setBase64Input] = useState((data.base64Input as string) || "");
    const [ocrEnabled, setOcrEnabled] = useState((data.ocrEnabled as boolean) ?? false);
    const [ocrLanguage, setOcrLanguage] = useState((data.ocrLanguage as string) || "eng");
    const [extractTables, setExtractTables] = useState((data.extractTables as boolean) ?? false);
    const [pageStart, setPageStart] = useState<number | undefined>(
        typeof data.pageRange === "object"
            ? (data.pageRange as { start?: number }).start
            : undefined
    );
    const [pageEnd, setPageEnd] = useState<number | undefined>(
        typeof data.pageRange === "object" ? (data.pageRange as { end?: number }).end : undefined
    );
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");

    useEffect(() => {
        onUpdate({
            fileInput,
            urlInput,
            base64Input,
            ocrEnabled,
            ocrLanguage,
            extractTables,
            pageRange: {
                start: pageStart,
                end: pageEnd
            },
            outputVariable
        });
    }, [
        fileInput,
        urlInput,
        base64Input,
        ocrEnabled,
        ocrLanguage,
        extractTables,
        pageStart,
        pageEnd,
        outputVariable
    ]);

    return (
        <div>
            <FormSection title="Input">
                <FormField
                    label="File Input"
                    description="Reference an uploaded file or variable, e.g. ${uploadedFile}"
                >
                    <Input
                        type="text"
                        value={fileInput}
                        onChange={(e) => setFileInput(e.target.value)}
                        placeholder="${uploadedFile}"
                        className="font-mono"
                    />
                </FormField>

                <FormField
                    label="URL (optional)"
                    description="Download PDF from URL; supports ${variable} interpolation"
                >
                    <Input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://example.com/document.pdf"
                        className="font-mono"
                    />
                </FormField>

                <FormField
                    label="Base64 (optional)"
                    description="Provide base64 content or data URI; supports ${variable} interpolation"
                >
                    <Textarea
                        value={base64Input}
                        onChange={(e) => setBase64Input(e.target.value)}
                        placeholder="data:application/pdf;base64,JVBERi0xLjQK..."
                        rows={3}
                        className="font-mono"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Extraction">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-foreground">Enable OCR</p>
                        <p className="text-xs text-muted-foreground">
                            Use OCR when text extraction is sparse
                        </p>
                    </div>
                    <input
                        type="checkbox"
                        checked={ocrEnabled}
                        onChange={(e) => setOcrEnabled(e.target.checked)}
                        className="h-4 w-4"
                    />
                </div>

                <FormField label="OCR Language" description="Tesseract language code (e.g., eng)">
                    <Input
                        type="text"
                        value={ocrLanguage}
                        onChange={(e) => setOcrLanguage(e.target.value)}
                        placeholder="eng"
                        className="font-mono"
                        disabled={!ocrEnabled}
                    />
                </FormField>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-foreground">Extract Tables</p>
                        <p className="text-xs text-muted-foreground">Include empty table slots</p>
                    </div>
                    <input
                        type="checkbox"
                        checked={extractTables}
                        onChange={(e) => setExtractTables(e.target.checked)}
                        className="h-4 w-4"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <FormField label="Page Start" description="Optional start page (1-indexed)">
                        <Input
                            type="number"
                            min={1}
                            value={pageStart ?? ""}
                            onChange={(e) =>
                                setPageStart(e.target.value ? Number(e.target.value) : undefined)
                            }
                            placeholder="1"
                        />
                    </FormField>
                    <FormField label="Page End" description="Optional end page">
                        <Input
                            type="number"
                            min={1}
                            value={pageEnd ?? ""}
                            onChange={(e) =>
                                setPageEnd(e.target.value ? Number(e.target.value) : undefined)
                            }
                            placeholder="All"
                        />
                    </FormField>
                </div>
            </FormSection>

            <FormSection title="Output">
                <FormField label="Output Variable" description="Stores parsed result JSON">
                    <Input
                        type="text"
                        value={outputVariable}
                        onChange={(e) => setOutputVariable(e.target.value)}
                        placeholder="pdfResult"
                        className="font-mono"
                    />
                </FormField>
            </FormSection>
        </div>
    );
}

export default ParsePDFNodeConfig;
