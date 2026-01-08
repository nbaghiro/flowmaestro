import { useState, useEffect } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";

interface OutputNodeConfigProps {
    nodeId?: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const formats = [
    { value: "json", label: "JSON" },
    { value: "string", label: "String" },
    { value: "number", label: "Number" },
    { value: "boolean", label: "Boolean" }
];

export function OutputNodeConfig({
    nodeId: _nodeId,
    data,
    onUpdate,
    errors = []
}: OutputNodeConfigProps) {
    const getError = (field: string) => errors.find((e) => e.field === field)?.message;
    const [outputName, setOutputName] = useState((data.outputName as string) || "result");
    const [value, setValue] = useState((data.value as string) || "");
    const [format, setFormat] = useState((data.format as string) || "json");
    const [description, setDescription] = useState((data.description as string) || "");

    useEffect(() => {
        onUpdate({
            outputName,
            value,
            format,
            description
        });
    }, [outputName, value, format, description]);

    return (
        <div>
            <FormSection title="Output Configuration">
                <FormField
                    label="Output Name"
                    description="Name for this output in workflow results"
                    error={getError("outputName")}
                >
                    <Input
                        type="text"
                        value={outputName}
                        onChange={(e) => setOutputName(e.target.value)}
                        placeholder="result"
                        className="font-mono"
                    />
                </FormField>

                <FormField label="Format">
                    <Select value={format} onChange={setFormat} options={formats} />
                </FormField>

                <FormField label="Description" description="Optional description for this output">
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description of what this output contains..."
                        rows={3}
                    />
                </FormField>
            </FormSection>

            <FormSection title="Value">
                <FormField
                    label="Output Value"
                    description="Value to output (supports {{variableName}} references)"
                    error={getError("value")}
                >
                    <Textarea
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={
                            format === "json"
                                ? '{\n  "key": "{{variableName}}",\n  "processed": true\n}'
                                : "{{variableName}}"
                        }
                        rows={format === "json" ? 8 : 4}
                        className="font-mono"
                    />
                </FormField>

                <div className="px-3 py-2 bg-blue-500/10 dark:bg-blue-400/20 border border-blue-500/30 dark:border-blue-400/30 text-blue-800 dark:text-blue-400 rounded-lg">
                    <p className="text-xs text-blue-800">
                        <strong>Examples:</strong>
                        <br />• {"{{llmResponse}}"} - Reference a variable
                        <br />• {"{{user.name}}"} - Access nested properties
                        <br />• {'{{...{{object}}, extra: "value"}}'} - Merge objects
                    </p>
                </div>
            </FormSection>

            <FormSection title="Preview">
                <div className="px-3 py-2 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">
                        <strong>Workflow result will include:</strong>
                    </p>
                    <code className="text-xs block font-mono text-foreground">
                        {"{"}
                        <br />
                        {"  "}"{outputName || "outputName"}":{" "}
                        {format === "json"
                            ? "{...}"
                            : format === "number"
                              ? "123"
                              : format === "boolean"
                                ? "true"
                                : '"..."'}
                        <br />
                        {"}"}
                    </code>
                </div>
            </FormSection>

            <FormSection title="Usage Notes">
                <div className="px-3 py-2 bg-muted rounded-lg text-xs text-muted-foreground space-y-2">
                    <p>• Output nodes define the final results returned by the workflow</p>
                    <p>• Multiple output nodes can be used to return different values</p>
                    <p>• Outputs are accessible via the workflow execution API</p>
                </div>
            </FormSection>
        </div>
    );
}
