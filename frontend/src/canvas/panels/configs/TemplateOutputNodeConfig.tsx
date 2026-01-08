import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";

interface TemplateOutputNodeConfigProps {
    nodeId?: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const formats = [
    { value: "markdown", label: "Markdown" },
    { value: "html", label: "HTML" }
];

export function TemplateOutputNodeConfig({
    data,
    onUpdate,
    errors = []
}: TemplateOutputNodeConfigProps) {
    const getError = (field: string) => errors.find((e) => e.field === field)?.message;

    const [outputName, setOutputName] = useState((data.outputName as string) || "templateOutput");
    const [template, setTemplate] = useState((data.template as string) || "");
    const [outputFormat, setOutputFormat] = useState((data.outputFormat as string) || "markdown");
    const [description, setDescription] = useState((data.description as string) || "");
    const [showPreview, setShowPreview] = useState(true);

    useEffect(() => {
        onUpdate({
            outputName,
            template,
            outputFormat,
            description
        });
    }, [outputName, template, outputFormat, description]);

    // Sample preview with placeholder replacements shown as-is
    const previewContent = useMemo(() => {
        // Show the template with variable placeholders visible
        return template || "*No template content*";
    }, [template]);

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
                        placeholder="templateOutput"
                        className="font-mono"
                    />
                </FormField>

                <FormField label="Output Format">
                    <Select value={outputFormat} onChange={setOutputFormat} options={formats} />
                </FormField>

                <FormField label="Description" description="Optional description for this output">
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description of what this template outputs..."
                        rows={2}
                    />
                </FormField>
            </FormSection>

            <FormSection title="Markdown Template">
                <FormField
                    label="Template Content"
                    description="Write your markdown template. Use {{variableName}} for variable interpolation."
                    error={getError("template")}
                >
                    <Textarea
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                        placeholder={
                            "# Hello {{name}}\n\nWelcome to **FlowMaestro**!\n\nYour order summary:\n- Product: {{product.name}}\n- Price: {{product.price}}\n- Quantity: {{quantity}}\n\nThank you for your purchase!"
                        }
                        rows={12}
                        className="font-mono text-sm"
                    />
                </FormField>

                <div className="px-3 py-2 bg-blue-500/10 dark:bg-blue-400/20 border border-blue-500/30 dark:border-blue-400/30 text-blue-800 dark:text-blue-400 rounded-lg">
                    <p className="text-xs">
                        <strong>Variable Syntax:</strong>
                        <br />
                        {"• {{variableName}} - Reference a variable"}
                        <br />
                        {"• {{user.name}} - Access nested properties"}
                        <br />
                        {"• {{items[0].title}} - Access array elements"}
                    </p>
                </div>
            </FormSection>

            <FormSection title="Preview">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">
                        Live preview (variables shown as placeholders)
                    </span>
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="text-xs text-primary hover:underline"
                    >
                        {showPreview ? "Hide" : "Show"}
                    </button>
                </div>
                {showPreview && (
                    <div className="px-3 py-3 bg-muted rounded-lg border border-border max-h-64 overflow-auto">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {previewContent}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
            </FormSection>

            <FormSection title="Usage Notes">
                <div className="px-3 py-2 bg-muted rounded-lg text-xs text-muted-foreground space-y-2">
                    <p>
                        {"• "}Template Output renders markdown templates with variable interpolation
                    </p>
                    <p>{"• "}Output can be Markdown (raw) or HTML (converted)</p>
                    <p>{"• "}This is a terminal node - it has no output connection</p>
                    <p>{"• "}The result is included in the workflow execution output</p>
                </div>
            </FormSection>
        </div>
    );
}
