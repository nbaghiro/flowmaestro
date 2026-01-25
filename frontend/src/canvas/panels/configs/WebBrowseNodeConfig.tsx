/**
 * Web Browse Node Configuration Panel
 *
 * Configuration for fetching and extracting web page content.
 */

import { useState, useEffect, useRef } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface WebBrowseNodeConfigProps {
    nodeId: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

export function WebBrowseNodeConfig({ data, onUpdate, errors = [] }: WebBrowseNodeConfigProps) {
    const isInitialMount = useRef(true);
    const getError = (field: string) => errors.find((e) => e.field === field)?.message;

    // URL
    const [url, setUrl] = useState<string>((data.url as string) || "");

    // Options
    const [extractText, setExtractText] = useState<boolean>((data.extractText as boolean) ?? true);
    const [maxLength, setMaxLength] = useState<number>((data.maxLength as number) || 10000);

    // Output
    const [outputVariable, setOutputVariable] = useState<string>(
        (data.outputVariable as string) || ""
    );

    // Update parent on state change
    useEffect(() => {
        // Skip the initial mount - don't push unchanged data to store
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        onUpdate({
            url,
            extractText,
            maxLength,
            outputVariable
        });
    }, [url, extractText, maxLength, outputVariable]);

    return (
        <>
            <FormSection title="URL">
                <FormField
                    label="URL"
                    description="Web page URL to fetch. Use {{variableName}} for dynamic URLs."
                    error={getError("url")}
                >
                    <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com or {{pageUrl}}"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Options">
                <label className="flex items-center gap-2 cursor-pointer">
                    <Input
                        type="checkbox"
                        checked={extractText}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setExtractText(e.target.checked)
                        }
                        className="w-4 h-4"
                    />
                    <span className="text-sm">Extract Text (remove HTML tags)</span>
                </label>

                <FormField
                    label="Max Content Length"
                    description="Maximum characters to return (100-50000)"
                >
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min="100"
                            max="50000"
                            step="100"
                            value={maxLength}
                            onChange={(e) => setMaxLength(parseInt(e.target.value))}
                            className="flex-1"
                        />
                        <span className="text-sm font-mono w-16">{maxLength.toLocaleString()}</span>
                    </div>
                </FormField>
            </FormSection>

            <FormSection title="Output">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Page Content"}
                    nodeType="webBrowse"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />

                <div className="px-3 py-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                    <strong>Output format:</strong>
                    <pre className="mt-1 overflow-x-auto">
                        {`{
  url: "https://...",
  content: "page content...",
  contentType: "text/html",
  contentLength: 12345
}`}
                    </pre>
                </div>
            </FormSection>
        </>
    );
}
