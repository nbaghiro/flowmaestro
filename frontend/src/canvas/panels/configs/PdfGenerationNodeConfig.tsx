/**
 * PDF Generation Node Configuration Panel
 *
 * Configuration for generating PDF documents from markdown or HTML.
 */

import { useState, useEffect } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface PdfGenerationNodeConfigProps {
    nodeId: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const FORMAT_OPTIONS = [
    { value: "markdown", label: "Markdown" },
    { value: "html", label: "HTML" }
];

const PAGE_SIZE_OPTIONS = [
    { value: "a4", label: "A4" },
    { value: "letter", label: "Letter" },
    { value: "legal", label: "Legal" }
];

const ORIENTATION_OPTIONS = [
    { value: "portrait", label: "Portrait" },
    { value: "landscape", label: "Landscape" }
];

export function PdfGenerationNodeConfig({
    data,
    onUpdate,
    errors = []
}: PdfGenerationNodeConfigProps) {
    const getError = (field: string) => errors.find((e) => e.field === field)?.message;

    // Content
    const [content, setContent] = useState<string>((data.content as string) || "");
    const [format, setFormat] = useState<string>((data.format as string) || "markdown");

    // Page settings
    const [filename, setFilename] = useState<string>((data.filename as string) || "document");
    const [pageSize, setPageSize] = useState<string>((data.pageSize as string) || "a4");
    const [orientation, setOrientation] = useState<string>(
        (data.orientation as string) || "portrait"
    );

    // Margins
    const [marginTop, setMarginTop] = useState<string>((data.marginTop as string) || "20mm");
    const [marginRight, setMarginRight] = useState<string>((data.marginRight as string) || "20mm");
    const [marginBottom, setMarginBottom] = useState<string>(
        (data.marginBottom as string) || "20mm"
    );
    const [marginLeft, setMarginLeft] = useState<string>((data.marginLeft as string) || "20mm");

    // Header/Footer
    const [headerText, setHeaderText] = useState<string>((data.headerText as string) || "");
    const [footerText, setFooterText] = useState<string>((data.footerText as string) || "");
    const [includePageNumbers, setIncludePageNumbers] = useState<boolean>(
        (data.includePageNumbers as boolean) ?? false
    );

    // Output
    const [outputVariable, setOutputVariable] = useState<string>(
        (data.outputVariable as string) || ""
    );

    // Update parent on state change
    useEffect(() => {
        onUpdate({
            content,
            format,
            filename,
            pageSize,
            orientation,
            marginTop,
            marginRight,
            marginBottom,
            marginLeft,
            headerText,
            footerText,
            includePageNumbers,
            outputVariable
        });
    }, [
        content,
        format,
        filename,
        pageSize,
        orientation,
        marginTop,
        marginRight,
        marginBottom,
        marginLeft,
        headerText,
        footerText,
        includePageNumbers,
        outputVariable
    ]);

    return (
        <>
            <FormSection title="Content">
                <FormField label="Format" error={getError("format")}>
                    <Select value={format} onChange={setFormat} options={FORMAT_OPTIONS} />
                </FormField>

                <FormField
                    label="Content"
                    description="Markdown or HTML content. Use {{variableName}} for dynamic content."
                    error={getError("content")}
                >
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="# Report Title\n\n{{reportContent}}"
                        rows={8}
                        className="font-mono text-sm"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Page Settings">
                <FormField label="Filename" description="Output filename without extension">
                    <Input
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                        placeholder="document"
                    />
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                    <FormField label="Page Size">
                        <Select
                            value={pageSize}
                            onChange={setPageSize}
                            options={PAGE_SIZE_OPTIONS}
                        />
                    </FormField>

                    <FormField label="Orientation">
                        <Select
                            value={orientation}
                            onChange={setOrientation}
                            options={ORIENTATION_OPTIONS}
                        />
                    </FormField>
                </div>
            </FormSection>

            <FormSection title="Margins">
                <div className="grid grid-cols-2 gap-3">
                    <FormField label="Top">
                        <Input
                            value={marginTop}
                            onChange={(e) => setMarginTop(e.target.value)}
                            placeholder="20mm"
                        />
                    </FormField>
                    <FormField label="Right">
                        <Input
                            value={marginRight}
                            onChange={(e) => setMarginRight(e.target.value)}
                            placeholder="20mm"
                        />
                    </FormField>
                    <FormField label="Bottom">
                        <Input
                            value={marginBottom}
                            onChange={(e) => setMarginBottom(e.target.value)}
                            placeholder="20mm"
                        />
                    </FormField>
                    <FormField label="Left">
                        <Input
                            value={marginLeft}
                            onChange={(e) => setMarginLeft(e.target.value)}
                            placeholder="20mm"
                        />
                    </FormField>
                </div>
            </FormSection>

            <FormSection title="Header & Footer">
                <FormField label="Header Text">
                    <Input
                        value={headerText}
                        onChange={(e) => setHeaderText(e.target.value)}
                        placeholder="Optional header text"
                    />
                </FormField>

                <FormField label="Footer Text">
                    <Input
                        value={footerText}
                        onChange={(e) => setFooterText(e.target.value)}
                        placeholder="Optional footer text"
                    />
                </FormField>

                <label className="flex items-center gap-2 cursor-pointer">
                    <Input
                        type="checkbox"
                        checked={includePageNumbers}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setIncludePageNumbers(e.target.checked)
                        }
                        className="w-4 h-4"
                    />
                    <span className="text-sm">Include Page Numbers</span>
                </label>
            </FormSection>

            <FormSection title="Output">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Generated PDF"}
                    nodeType="pdfGeneration"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </>
    );
}
