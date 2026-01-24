/**
 * PDF Extract Node Configuration Panel
 *
 * Configuration for extracting text and metadata from PDF documents.
 */

import { useState, useEffect } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface PdfExtractNodeConfigProps {
    nodeId: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const OUTPUT_FORMAT_OPTIONS = [
    { value: "text", label: "Plain Text" },
    { value: "markdown", label: "Markdown" },
    { value: "json", label: "JSON" }
];

export function PdfExtractNodeConfig({ data, onUpdate, errors = [] }: PdfExtractNodeConfigProps) {
    const getError = (field: string) => errors.find((e) => e.field === field)?.message;

    const [path, setPath] = useState<string>((data.path as string) || "");
    const [extractText, setExtractText] = useState<boolean>((data.extractText as boolean) ?? true);
    const [extractMetadata, setExtractMetadata] = useState<boolean>(
        (data.extractMetadata as boolean) ?? true
    );
    const [outputFormat, setOutputFormat] = useState<string>(
        (data.outputFormat as string) || "text"
    );
    const [pageStart, setPageStart] = useState<string>((data.pageStart as string) || "");
    const [pageEnd, setPageEnd] = useState<string>((data.pageEnd as string) || "");
    const [password, setPassword] = useState<string>((data.password as string) || "");
    const [outputVariable, setOutputVariable] = useState<string>(
        (data.outputVariable as string) || ""
    );

    useEffect(() => {
        onUpdate({
            path,
            extractText,
            extractMetadata,
            outputFormat,
            pageStart: pageStart ? parseInt(pageStart) : undefined,
            pageEnd: pageEnd ? parseInt(pageEnd) : undefined,
            password: password || undefined,
            outputVariable
        });
    }, [
        path,
        extractText,
        extractMetadata,
        outputFormat,
        pageStart,
        pageEnd,
        password,
        outputVariable
    ]);

    return (
        <>
            <FormSection title="PDF File">
                <FormField
                    label="Path"
                    description="PDF file path. Use {{variableName}} for dynamic paths."
                    error={getError("path")}
                >
                    <Input
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                        placeholder="documents/report.pdf or {{filePath}}"
                    />
                </FormField>
            </FormSection>
            <FormSection title="Extraction Options">
                <label className="flex items-center gap-2 cursor-pointer">
                    <Input
                        type="checkbox"
                        checked={extractText}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setExtractText(e.target.checked)
                        }
                        className="w-4 h-4"
                    />
                    <span className="text-sm">Extract Text Content</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <Input
                        type="checkbox"
                        checked={extractMetadata}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setExtractMetadata(e.target.checked)
                        }
                        className="w-4 h-4"
                    />
                    <span className="text-sm">Extract Metadata</span>
                </label>
                <FormField label="Output Format">
                    <Select
                        value={outputFormat}
                        onChange={setOutputFormat}
                        options={OUTPUT_FORMAT_OPTIONS}
                    />
                </FormField>
            </FormSection>
            <FormSection title="Page Range (Optional)">
                <div className="grid grid-cols-2 gap-3">
                    <FormField label="Start Page">
                        <Input
                            type="number"
                            value={pageStart}
                            onChange={(e) => setPageStart(e.target.value)}
                            placeholder="1"
                            min={1}
                        />
                    </FormField>
                    <FormField label="End Page">
                        <Input
                            type="number"
                            value={pageEnd}
                            onChange={(e) => setPageEnd(e.target.value)}
                            placeholder="All"
                            min={1}
                        />
                    </FormField>
                </div>
            </FormSection>
            <FormSection title="Security">
                <FormField label="Password" description="PDF password if encrypted">
                    <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password if required"
                    />
                </FormField>
            </FormSection>
            <FormSection title="Output">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Extracted PDF"}
                    nodeType="pdfExtract"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </>
    );
}
