import { Info } from "lucide-react";
import { useState, useEffect } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";

interface HumanReviewNodeConfigProps {
    nodeId?: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const inputTypes = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "boolean", label: "Boolean" },
    { value: "json", label: "JSON" }
];

// Common validation patterns for text inputs
const validationPresets = {
    email: {
        pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
        label: "Email",
        description: "Valid email address"
    },
    phone: {
        pattern: "^\\+?[1-9]\\d{1,14}$",
        label: "Phone",
        description: "International phone number"
    },
    url: {
        pattern: "^https?://.*",
        label: "URL",
        description: "Web URL (http/https)"
    },
    alphanumeric: {
        pattern: "^[A-Za-z0-9]+$",
        label: "Alphanumeric",
        description: "Letters and numbers only"
    },
    numbersOnly: {
        pattern: "^\\d+$",
        label: "Numbers Only",
        description: "Digits only"
    }
};

export function HumanReviewNodeConfig({
    data,
    onUpdate,
    errors: _errors = []
}: HumanReviewNodeConfigProps) {
    const [prompt, setPrompt] = useState((data.prompt as string) || "");
    const [description, setDescription] = useState((data.description as string) || "");
    const [variableName, setVariableName] = useState((data.variableName as string) || "");
    const [inputType, setInputType] = useState((data.inputType as string) || "text");
    const [placeholder, setPlaceholder] = useState((data.placeholder as string) || "");
    const [defaultValue, setDefaultValue] = useState((data.defaultValue as string) || "");
    const [required, setRequired] = useState((data.required as boolean) ?? true);
    const [validation, setValidation] = useState((data.validation as string) || "");
    const [minValue, setMinValue] = useState((data.minValue as string) || "");
    const [maxValue, setMaxValue] = useState((data.maxValue as string) || "");

    useEffect(() => {
        onUpdate({
            prompt,
            description,
            variableName,
            inputType,
            placeholder,
            defaultValue,
            required,
            validation,
            outputVariable: variableName, // Auto-derive from variableName
            ...(inputType === "number" && { minValue, maxValue })
        });
    }, [
        prompt,
        description,
        variableName,
        inputType,
        placeholder,
        defaultValue,
        required,
        validation,
        minValue,
        maxValue
    ]);

    const handlePresetClick = (pattern: string) => {
        setValidation(pattern);
    };

    return (
        <div>
            <FormSection title="Prompt Configuration">
                <FormField
                    label="Prompt"
                    description="Message shown to the user when input is requested"
                >
                    <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Please enter your name..."
                        rows={3}
                    />
                </FormField>

                <FormField label="Description" description="Additional help text for the user">
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="This will be used for personalization..."
                        rows={2}
                    />
                </FormField>

                <FormField label="Placeholder" description="Placeholder text in the input field">
                    <Input
                        type="text"
                        value={placeholder}
                        onChange={(e) => setPlaceholder(e.target.value)}
                        placeholder="e.g., John Doe"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Input Settings">
                <FormField label="Variable Name" description="Name to store the user's input">
                    <Input
                        type="text"
                        value={variableName}
                        onChange={(e) => setVariableName(e.target.value)}
                        placeholder="userInput"
                        className="font-mono"
                    />
                </FormField>

                <FormField label="Input Type">
                    <Select value={inputType} onChange={setInputType} options={inputTypes} />
                </FormField>

                <FormField
                    label="Default Value"
                    description="Used if user skips input (only if not required)"
                >
                    <Input
                        type="text"
                        value={defaultValue}
                        onChange={(e) => setDefaultValue(e.target.value)}
                        placeholder={inputType === "json" ? '{"key": "value"}' : "Default value..."}
                        className="font-mono"
                    />
                </FormField>

                <FormField
                    label="Required"
                    description={
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <div>
                                <strong>Checked:</strong> User must provide input to continue
                                <br />
                                <strong>Unchecked:</strong> User can skip with default value
                            </div>
                        </div>
                    }
                >
                    <label className="flex items-center gap-2 cursor-pointer">
                        <Input
                            type="checkbox"
                            checked={required}
                            onChange={(e) => setRequired(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm font-medium">User must provide input</span>
                    </label>
                </FormField>
            </FormSection>

            <FormSection title="Validation">
                {/* Text validation with regex */}
                {inputType === "text" && (
                    <>
                        <FormField
                            label="Validation Pattern (Regex)"
                            description="Regular expression to validate input format"
                        >
                            <Input
                                type="text"
                                value={validation}
                                onChange={(e) => setValidation(e.target.value)}
                                placeholder="^[A-Za-z\\s]+$"
                                className="font-mono"
                            />
                        </FormField>

                        <FormField label="Quick Presets">
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(validationPresets).map(([key, preset]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => handlePresetClick(preset.pattern)}
                                        className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 border border-border rounded-md transition-colors"
                                        title={preset.description}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Click a preset to apply common validation patterns
                            </p>
                        </FormField>

                        {validation && (
                            <div className="px-3 py-2 bg-blue-500/10 dark:bg-blue-400/20 border border-blue-500/30 dark:border-blue-400/30 text-blue-800 dark:text-blue-400 rounded-lg">
                                <p className="text-xs text-blue-800">
                                    <strong>Pattern:</strong>{" "}
                                    <code className="font-mono">{validation}</code>
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* Number validation with min/max */}
                {inputType === "number" && (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Minimum Value" description="Smallest allowed number">
                                <Input
                                    type="number"
                                    value={minValue}
                                    onChange={(e) => setMinValue(e.target.value)}
                                    placeholder="e.g., 0"
                                />
                            </FormField>

                            <FormField label="Maximum Value" description="Largest allowed number">
                                <Input
                                    type="number"
                                    value={maxValue}
                                    onChange={(e) => setMaxValue(e.target.value)}
                                    placeholder="e.g., 100"
                                />
                            </FormField>
                        </div>

                        {(minValue || maxValue) && (
                            <div className="px-3 py-2 bg-blue-500/10 dark:bg-blue-400/20 border border-blue-500/30 dark:border-blue-400/30 text-blue-800 dark:text-blue-400 rounded-lg">
                                <p className="text-xs text-blue-800">
                                    <strong>Range:</strong> {minValue || "−∞"} to {maxValue || "+∞"}
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* JSON schema validation */}
                {inputType === "json" && (
                    <>
                        <FormField
                            label="JSON Schema"
                            description="Optional JSON schema for validation"
                        >
                            <Textarea
                                value={validation}
                                onChange={(e) => setValidation(e.target.value)}
                                placeholder={'{"type": "object", "properties": {...}}'}
                                rows={6}
                                className="font-mono"
                            />
                        </FormField>

                        <div className="px-3 py-2 bg-blue-500/10 dark:bg-blue-400/20 border border-blue-500/30 dark:border-blue-400/30 text-blue-800 dark:text-blue-400 rounded-lg">
                            <p className="text-xs text-blue-800">
                                Use JSON Schema format to define structure and validation rules
                            </p>
                        </div>
                    </>
                )}

                {/* Boolean - no validation needed */}
                {inputType === "boolean" && (
                    <div className="px-3 py-2 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">
                            Boolean inputs are automatically validated (true/false only)
                        </p>
                    </div>
                )}
            </FormSection>

            <FormSection title="Preview">
                <div className="px-3 py-2 bg-muted rounded-lg text-xs space-y-2">
                    <div>
                        <p className="text-muted-foreground mb-1">
                            <strong>Access in workflow:</strong>
                        </p>
                        <code className="text-foreground font-mono">
                            {`\${${variableName || "variableName"}}`}
                        </code>
                    </div>

                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
                        <span className="font-bold">⏸</span>
                        <span>Workflow will pause until user provides input</span>
                    </div>

                    {required && (
                        <div className="flex items-center gap-1 text-orange-600">
                            <span className="font-bold">⚠</span>
                            <span>Required - user must provide input to continue</span>
                        </div>
                    )}

                    {!required && defaultValue && (
                        <div className="flex items-center gap-1 text-blue-600">
                            <span className="font-bold">ℹ</span>
                            <span>Optional with default: {defaultValue}</span>
                        </div>
                    )}
                </div>
            </FormSection>
        </div>
    );
}
