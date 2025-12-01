import { Info } from "lucide-react";
import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";

interface InputNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

const inputTypes = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "boolean", label: "Boolean" },
    { value: "json", label: "JSON" },
    { value: "file", label: "File" }
];

// Common validation patterns
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

export function InputNodeConfig({ data, onUpdate }: InputNodeConfigProps) {
    const [inputName, setInputName] = useState((data.inputName as string) || "");
    const [inputType, setInputType] = useState((data.inputType as string) || "text");
    const [description, setDescription] = useState((data.description as string) || "");
    const [defaultValue, setDefaultValue] = useState((data.defaultValue as string) || "");
    const [required, setRequired] = useState((data.required as boolean) ?? true);
    const [validation, setValidation] = useState((data.validation as string) || "");
    const [minValue, setMinValue] = useState((data.minValue as string) || "");
    const [maxValue, setMaxValue] = useState((data.maxValue as string) || "");

    useEffect(() => {
        onUpdate({
            inputName,
            inputType,
            description,
            defaultValue,
            required,
            validation,
            ...(inputType === "number" && { minValue, maxValue })
        });
    }, [inputName, inputType, description, defaultValue, required, validation, minValue, maxValue]);

    const handlePresetClick = (pattern: string) => {
        setValidation(pattern);
    };

    return (
        <div>
            <FormSection title="Input Configuration">
                <FormField label="Input Name" description="Variable name for this input">
                    <Input
                        type="text"
                        value={inputName}
                        onChange={(e) => setInputName(e.target.value)}
                        placeholder="userName"
                        className="font-mono"
                    />
                </FormField>

                <FormField label="Input Type">
                    <Select value={inputType} onChange={setInputType} options={inputTypes} />
                </FormField>

                <FormField
                    label="Description"
                    description="Help text for users providing this input"
                >
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter your full name..."
                        rows={3}
                    />
                </FormField>
            </FormSection>

            <FormSection title="Value Settings">
                <FormField
                    label="Default Value"
                    description="Used when input is not provided (only applies if not required)"
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
                    label="Value is Mandatory"
                    description={
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <div>
                                <strong>Checked:</strong> Workflow execution fails if value not
                                provided
                                <br />
                                <strong>Unchecked:</strong> Workflow uses default value or continues
                                without this input
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
                        <span className="text-sm font-medium">This input must be provided</span>
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

                {/* File - basic info */}
                {inputType === "file" && (
                    <div className="px-3 py-2 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">
                            File inputs accept file uploads. Additional validation can be configured
                            for file types and size limits.
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
                            {`\${${inputName || "inputName"}}`}
                        </code>
                    </div>

                    {required && (
                        <div className="flex items-center gap-1 text-orange-600">
                            <span className="font-bold">⚠</span>
                            <span>Required input - must be provided</span>
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
