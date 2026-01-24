/**
 * File Write Node Configuration Panel
 */

import { useState, useEffect } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface FileWriteNodeConfigProps {
    nodeId: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const ENCODING_OPTIONS = [
    { value: "utf-8", label: "UTF-8 (Text)" },
    { value: "base64", label: "Base64" }
];

export function FileWriteNodeConfig({ data, onUpdate, errors = [] }: FileWriteNodeConfigProps) {
    const getError = (field: string) => errors.find((e) => e.field === field)?.message;
    const [path, setPath] = useState<string>((data.path as string) || "");
    const [content, setContent] = useState<string>((data.content as string) || "");
    const [encoding, setEncoding] = useState<string>((data.encoding as string) || "utf-8");
    const [createDirectories, setCreateDirectories] = useState<boolean>(
        (data.createDirectories as boolean) ?? true
    );
    const [overwrite, setOverwrite] = useState<boolean>((data.overwrite as boolean) ?? true);
    const [outputVariable, setOutputVariable] = useState<string>(
        (data.outputVariable as string) || ""
    );

    useEffect(() => {
        onUpdate({ path, content, encoding, createDirectories, overwrite, outputVariable });
    }, [path, content, encoding, createDirectories, overwrite, outputVariable]);

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
                        placeholder="output/result.txt or {{outputPath}}"
                    />
                </FormField>
            </FormSection>
            <FormSection title="Content">
                <FormField
                    label="Content"
                    description="Content to write. Use {{variableName}} for dynamic content."
                    error={getError("content")}
                >
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="{{processedData}} or static content..."
                        rows={6}
                        className="font-mono text-sm"
                    />
                </FormField>
            </FormSection>
            <FormSection title="Write Settings">
                <FormField label="Encoding">
                    <Select value={encoding} onChange={setEncoding} options={ENCODING_OPTIONS} />
                </FormField>
                <label className="flex items-center gap-2 cursor-pointer">
                    <Input
                        type="checkbox"
                        checked={createDirectories}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCreateDirectories(e.target.checked)
                        }
                        className="w-4 h-4"
                    />
                    <span className="text-sm">Create Parent Directories if Needed</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <Input
                        type="checkbox"
                        checked={overwrite}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setOverwrite(e.target.checked)
                        }
                        className="w-4 h-4"
                    />
                    <span className="text-sm">Overwrite Existing File</span>
                </label>
            </FormSection>
            <FormSection title="Output">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Written File"}
                    nodeType="fileWrite"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
                <div className="px-3 py-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                    <strong>Output format:</strong>
                    <pre className="mt-1 overflow-x-auto">
                        {
                            '{\n  path: "output/result.txt",\n  fullPath: "/workspace/output/result.txt",\n  size: 1234,\n  created: true\n}'
                        }
                    </pre>
                </div>
            </FormSection>
        </>
    );
}
