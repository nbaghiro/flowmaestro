import { useEffect, useState } from "react";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";

interface ParseDocumentNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

const fileTypes = [
    { value: "auto", label: "Auto-detect" },
    { value: "docx", label: "DOCX" },
    { value: "doc", label: "DOC" },
    { value: "text", label: "Text" },
    { value: "rtf", label: "RTF" },
    { value: "odt", label: "ODT" },
    { value: "html", label: "HTML" },
    { value: "md", label: "Markdown" }
];

export function ParseDocumentNodeConfig({ data, onUpdate }: ParseDocumentNodeConfigProps) {
    const [fileInput, setFileInput] = useState((data.fileInput as string) || "");
    const [urlInput, setUrlInput] = useState((data.urlInput as string) || "");
    const [base64Input, setBase64Input] = useState((data.base64Input as string) || "");
    const [fileType, setFileType] = useState((data.fileType as string) || "auto");
    const [preserveFormatting, setPreserveFormatting] = useState(
        (data.preserveFormatting as boolean) ?? false
    );
    const [extractImages, setExtractImages] = useState((data.extractImages as boolean) ?? false);
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");

    useEffect(() => {
        onUpdate({
            fileInput,
            urlInput,
            base64Input,
            fileType: fileType === "auto" ? undefined : fileType,
            preserveFormatting,
            extractImages,
            outputVariable
        });
    }, [
        fileInput,
        urlInput,
        base64Input,
        fileType,
        preserveFormatting,
        extractImages,
        outputVariable
    ]);

    return (
        <div>
            <FormSection title="Input">
                <FormField
                    label="File Input"
                    description="Reference an uploaded file or variable, e.g. ${uploadedDoc}"
                >
                    <Input
                        type="text"
                        value={fileInput}
                        onChange={(e) => setFileInput(e.target.value)}
                        placeholder="${uploadedDoc}"
                        className="font-mono"
                    />
                </FormField>

                <FormField
                    label="URL (optional)"
                    description="Download document from URL; supports ${variable} interpolation"
                >
                    <Input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://example.com/document.docx"
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
                        placeholder="data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,AAAB..."
                        rows={3}
                        className="font-mono"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Parsing">
                <FormField label="File Type" description="Override auto-detection if needed">
                    <Select value={fileType} onChange={setFileType} options={fileTypes} />
                </FormField>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-foreground">Preserve Formatting</p>
                        <p className="text-xs text-muted-foreground">
                            Keep headings, lists, and HTML output
                        </p>
                    </div>
                    <input
                        type="checkbox"
                        checked={preserveFormatting}
                        onChange={(e) => setPreserveFormatting(e.target.checked)}
                        className="h-4 w-4"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-foreground">Extract Images</p>
                        <p className="text-xs text-muted-foreground">Include embedded images</p>
                    </div>
                    <input
                        type="checkbox"
                        checked={extractImages}
                        onChange={(e) => setExtractImages(e.target.checked)}
                        className="h-4 w-4"
                    />
                </div>
            </FormSection>

            <FormSection title="Output">
                <FormField label="Output Variable" description="Stores parsed result JSON">
                    <Input
                        type="text"
                        value={outputVariable}
                        onChange={(e) => setOutputVariable(e.target.value)}
                        placeholder="documentResult"
                        className="font-mono"
                    />
                </FormField>
            </FormSection>
        </div>
    );
}

export default ParseDocumentNodeConfig;
