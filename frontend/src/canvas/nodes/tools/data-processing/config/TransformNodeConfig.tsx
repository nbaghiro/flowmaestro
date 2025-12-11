import { useState, useEffect } from "react";
import { CodeInput } from "@/components/CodeInput";
import { FormField, FormSection } from "@/components/common/FormField";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { OutputSettingsSection } from "@/components/OutputSettingsSection";

interface TransformNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

const modeOptions = [
    { value: "javascript", label: "JavaScript Expression" },
    { value: "jsonata", label: "JSONata Query" },
    { value: "template", label: "Template String" }
];

export function TransformNodeConfig({ data, onUpdate }: TransformNodeConfigProps) {
    const [mode, setMode] = useState((data.mode as string) || "javascript");
    const [inputData, setInputData] = useState((data.inputData as string) || "");
    const [expression, setExpression] = useState((data.expression as string) || "");
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");

    // Sync with external updates (loading saved workflows)
    useEffect(() => {
        if (data.mode) setMode(data.mode as string);
        if (data.inputData) setInputData(data.inputData as string);
        if (data.expression) setExpression(data.expression as string);
        if (data.outputVariable) setOutputVariable(data.outputVariable as string);
    }, [data.mode, data.inputData, data.expression, data.outputVariable]);

    useEffect(() => {
        onUpdate({
            mode,
            inputData,
            expression,
            outputVariable
        });
    }, [mode, inputData, expression, outputVariable]);

    const getPlaceholder = () => {
        if (mode === "javascript") return "item => ({ ...item })";
        if (mode === "template") return "Hello ${user.name}";
        if (mode === "jsonata") return "$map(items, function($i){$i.name})";
        return "";
    };

    const getDescription = () => {
        if (mode === "javascript") return "Use JavaScript expressions or arrow functions";
        if (mode === "template") return "Use ${variable} interpolation to build strings";
        if (mode === "jsonata") return "Use JSONata for advanced data querying";
        return "";
    };

    return (
        <div>
            <FormSection title="Transform Mode">
                <FormField label="Mode">
                    <Select value={mode} onChange={setMode} options={modeOptions} />
                </FormField>

                <div className="px-3 py-2 bg-blue-500/10 dark:bg-blue-400/20 border border-blue-500/30 dark:border-blue-400/30 text-blue-800 dark:text-blue-400 rounded-lg">
                    <p className="text-xs">{getDescription()}</p>
                </div>
            </FormSection>

            <FormSection title="Input">
                <FormField label="Input Data" description="Variable reference to transform">
                    <Input
                        type="text"
                        value={inputData}
                        onChange={(e) => setInputData(e.target.value)}
                        placeholder="${arrayVariable}"
                        className="font-mono"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Expression">
                <FormField
                    label={
                        mode === "jsonata"
                            ? "JSONata Expression"
                            : mode === "template"
                              ? "Template"
                              : "JavaScript Expression"
                    }
                >
                    <CodeInput
                        value={expression}
                        onChange={setExpression}
                        language={mode === "jsonata" ? "jsonata" : "javascript"}
                        placeholder={getPlaceholder()}
                        rows={8}
                    />
                </FormField>
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Transform"}
                    nodeType="transform"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
