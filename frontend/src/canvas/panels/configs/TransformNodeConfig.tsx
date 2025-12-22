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

const operationOptions = [
    { value: "map", label: "Map / Transform" },
    { value: "filter", label: "Filter" },
    { value: "aggregate", label: "Aggregate" },
    { value: "deduplicate", label: "Deduplicate" }
];

export function TransformNodeConfig({ data, onUpdate }: TransformNodeConfigProps) {
    const [mode, setMode] = useState((data.mode as string) || "javascript");
    const [inputData, setInputData] = useState((data.inputData as string) || "");
    const [expression, setExpression] = useState((data.expression as string) || "");
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");
    const [operation, setOperation] = useState((data.operation as string) || "map");
    const [operationType, setOperationType] = useState((data.operationType as string) || "count");
    const [field, setField] = useState((data.field as string) || "");
    const [groupBy, setGroupBy] = useState((data.groupBy as string) || "");
    const [keyFields, setKeyFields] = useState<string[]>((data.keyFields as string[]) || []);
    const [keep, setKeep] = useState<"first" | "last">((data.keep as "first" | "last") || "first");
    const [caseSensitive, setCaseSensitive] = useState(
        data.caseSensitive !== undefined ? Boolean(data.caseSensitive) : true
    );

    // Sync with external updates (loading saved workflows)
    useEffect(() => {
        if (data.mode) setMode(data.mode as string);
        if (data.inputData) setInputData(data.inputData as string);
        if (data.expression) setExpression(data.expression as string);
        if (data.outputVariable) setOutputVariable(data.outputVariable as string);
        if (data.operation) setOperation(data.operation as string);
        if (data.operationType) setOperationType(data.operationType as string);
        if (data.field) setField(data.field as string);
        if (data.groupBy) setGroupBy(data.groupBy as string);
        if (data.keyFields) setKeyFields(data.keyFields as string[]);
        if (data.keep) setKeep(data.keep as "first" | "last");
        if (data.caseSensitive !== undefined) setCaseSensitive(Boolean(data.caseSensitive));
    }, [
        data.mode,
        data.inputData,
        data.expression,
        data.outputVariable,
        data.operation,
        data.operationType,
        data.field,
        data.groupBy,
        data.keyFields,
        data.keep,
        data.caseSensitive
    ]);

    useEffect(() => {
        onUpdate({
            mode,
            inputData,
            expression,
            outputVariable,
            operation,
            operationType,
            field,
            groupBy,
            keyFields,
            keep,
            caseSensitive
        });
    }, [
        operation,
        inputData,
        expression,
        operationType,
        field,
        groupBy,
        keyFields,
        keep,
        caseSensitive,
        outputVariable
    ]);

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

            <FormSection title="Operation">
                <FormField label="Operation">
                    <Select value={operation} onChange={setOperation} options={operationOptions} />
                </FormField>
            </FormSection>

            {operation === "aggregate" && (
                <FormSection title="Aggregate Settings">
                    <FormField label="Operation">
                        <Select
                            value={operationType}
                            onChange={setOperationType}
                            options={[
                                { value: "count", label: "Count" },
                                { value: "sum", label: "Sum" },
                                { value: "avg", label: "Average" },
                                { value: "min", label: "Min" },
                                { value: "max", label: "Max" },
                                { value: "first", label: "First" },
                                { value: "last", label: "Last" }
                            ]}
                        />
                    </FormField>

                    <FormField label="Field (optional)">
                        <Input
                            value={field}
                            onChange={(e) => setField(e.target.value)}
                            placeholder="price"
                            className="font-mono"
                        />
                    </FormField>

                    <FormField label="Group By (optional)">
                        <Input
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value)}
                            placeholder="category"
                            className="font-mono"
                        />
                    </FormField>
                </FormSection>
            )}

            {operation === "deduplicate" && (
                <FormSection title="Deduplicate Settings">
                    <FormField label="Key Fields (comma separated)">
                        <Input
                            value={keyFields.join(",")}
                            onChange={(e) =>
                                setKeyFields(
                                    e.target.value
                                        .split(",")
                                        .map((s) => s.trim())
                                        .filter(Boolean)
                                )
                            }
                            placeholder="id,email"
                            className="font-mono"
                        />
                    </FormField>

                    <FormField label="Keep">
                        <Select
                            value={keep}
                            onChange={(v) => setKeep(v as "first" | "last")}
                            options={[
                                { value: "first", label: "First" },
                                { value: "last", label: "Last" }
                            ]}
                        />
                    </FormField>
                </FormSection>
            )}

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
