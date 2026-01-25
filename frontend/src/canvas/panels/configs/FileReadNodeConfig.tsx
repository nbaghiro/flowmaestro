/**
 * File Read Node Configuration Panel
 */

import { useState, useEffect, useRef } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface FileReadNodeConfigProps {
    nodeId: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const ENCODING_OPTIONS = [
    { value: "utf-8", label: "UTF-8 (Text)" },
    { value: "base64", label: "Base64" },
    { value: "binary", label: "Binary" }
];

export function FileReadNodeConfig({ data, onUpdate, errors = [] }: FileReadNodeConfigProps) {
    const isInitialMount = useRef(true);
    const getError = (field: string) => errors.find((e) => e.field === field)?.message;
    const [path, setPath] = useState<string>((data.path as string) || "");
    const [encoding, setEncoding] = useState<string>((data.encoding as string) || "utf-8");
    const [maxSize, setMaxSize] = useState<number>((data.maxSize as number) || 1);
    const [outputVariable, setOutputVariable] = useState<string>(
        (data.outputVariable as string) || ""
    );

    useEffect(() => {
        // Skip the initial mount - don't push unchanged data to store
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        onUpdate({ path, encoding, maxSize: maxSize * 1024 * 1024, outputVariable });
    }, [path, encoding, maxSize, outputVariable]);

    return (
        <>
            <FormSection title="File Path">
                <FormField
                    label="Path"
                    description="File path relative to workspace. Use {{variableName}} for dynamic paths."
                    error={getError("path")}
                >
                    <Input
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                        placeholder="data/input.txt or {{filePath}}"
                    />
                </FormField>
            </FormSection>
            <FormSection title="Read Settings">
                <FormField label="Encoding">
                    <Select value={encoding} onChange={setEncoding} options={ENCODING_OPTIONS} />
                </FormField>
                <FormField
                    label="Max File Size (MB)"
                    description="Maximum file size to read (1-10)"
                >
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min="1"
                            max="10"
                            step="1"
                            value={maxSize}
                            onChange={(e) => setMaxSize(parseInt(e.target.value))}
                            className="flex-1"
                        />
                        <span className="text-sm font-mono w-10">{maxSize} MB</span>
                    </div>
                </FormField>
            </FormSection>
            <FormSection title="Output">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "File Content"}
                    nodeType="fileRead"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
                <div className="px-3 py-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                    <strong>Output format:</strong>
                    <pre className="mt-1 overflow-x-auto">
                        {
                            '{\n  path: "data/input.txt",\n  content: "file contents...",\n  encoding: "utf-8",\n  size: 1234\n}'
                        }
                    </pre>
                </div>
            </FormSection>
        </>
    );
}
