import { useState, useEffect, type ChangeEvent } from "react";
import { FormField, FormSection } from "../../../../components/common/FormField";
import { Input } from "../../../../components/common/Input";
import { Select } from "../../../../components/common/Select";
import { Textarea } from "../../../../components/common/Textarea";

interface OutputNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

const formats = [
    { value: "json", label: "JSON" },
    { value: "text", label: "Text Template" },
    { value: "file", label: "File" }
];

export function OutputNodeConfig({ data, onUpdate }: OutputNodeConfigProps) {
    const [outputVariable, setOutputVariable] = useState(
        (data.outputVariable as string) || "output"
    );
    const [template, setTemplate] = useState((data.template as string) || "");
    const [fieldsRaw, setFieldsRaw] = useState((data.fields as string[])?.join(", ") || "");
    const [format, setFormat] = useState((data.format as string) || "json");
    const [description, setDescription] = useState((data.description as string) || "");

    useEffect(() => {
        const fields = fieldsRaw
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean);

        onUpdate({
            outputVariable,
            template,
            fields,
            format,
            description
        });
    }, [outputVariable, template, fieldsRaw, format, description]);

    return (
        <div>
            <FormSection title="Output Settings">
                <FormField
                    label="Output Variable"
                    description="Name used in final workflow results"
                >
                    <Input
                        type="text"
                        value={outputVariable}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setOutputVariable(e.target.value)
                        }
                        placeholder="output"
                        className="font-mono"
                    />
                </FormField>

                <FormField label="Format">
                    <Select value={format} onChange={setFormat} options={formats} />
                </FormField>

                {format === "json" && (
                    <FormField label="Fields" description="Comma-separated list of context fields">
                        <Input
                            type="text"
                            value={fieldsRaw}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setFieldsRaw(e.target.value)
                            }
                            placeholder="user, score, result"
                            className="font-mono"
                        />
                    </FormField>
                )}

                {format === "text" && (
                    <FormField label="Template" description="Supports ${variable} interpolation">
                        <Textarea
                            value={template}
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                                setTemplate(e.target.value)
                            }
                            placeholder="Hello ${user.name}, your score is ${score}"
                            rows={6}
                            className="font-mono"
                        />
                    </FormField>
                )}

                <FormField label="Description (optional)">
                    <Textarea
                        value={description}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                            setDescription(e.target.value)
                        }
                        placeholder="What this output represents..."
                        rows={3}
                    />
                </FormField>
            </FormSection>

            <FormSection title="Preview">
                <code className="text-xs block font-mono text-foreground bg-muted p-3 rounded-lg">
                    {"{"}
                    <br />
                    {"  "}"{outputVariable}":{" "}
                    {format === "json"
                        ? fieldsRaw
                            ? `{ ${fieldsRaw} }`
                            : "{ full context }"
                        : format === "text"
                          ? '"Rendered text..."'
                          : '"File contents..."'}
                    <br />
                    {"}"}
                </code>
            </FormSection>
        </div>
    );
}
