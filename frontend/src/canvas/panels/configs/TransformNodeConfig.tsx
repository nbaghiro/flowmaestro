import { useState, useEffect } from "react";
import { CodeInput } from "../../../components/CodeInput";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface TransformNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

const operations = [
    { value: "map", label: "Map (transform each item)" },
    { value: "filter", label: "Filter (select items)" },
    { value: "reduce", label: "Reduce (aggregate)" },
    { value: "sort", label: "Sort" },
    { value: "merge", label: "Merge objects/arrays" },
    { value: "extract", label: "Extract properties" },
    { value: "custom", label: "Custom JSONata" }
];

export function TransformNodeConfig({ data, onUpdate }: TransformNodeConfigProps) {
    const [operation, setOperation] = useState((data.operation as string) || "map");
    const [inputData, setInputData] = useState((data.inputData as string) || "");
    const [expression, setExpression] = useState((data.expression as string) || "");
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");

    // Sync state when data prop changes (e.g., loading from database)
    useEffect(() => {
        if (data.operation) setOperation(data.operation as string);
        if (data.inputData) setInputData(data.inputData as string);
        if (data.expression) setExpression(data.expression as string);
        if (data.outputVariable) setOutputVariable(data.outputVariable as string);
    }, [data.operation, data.inputData, data.expression, data.outputVariable]);

    useEffect(() => {
        onUpdate({
            operation,
            inputData,
            expression,
            outputVariable
        });
    }, [operation, inputData, expression, outputVariable]);

    const getPlaceholder = () => {
        switch (operation) {
            case "map":
                return "item => ({ ...item, newField: item.oldField * 2 })";
            case "filter":
                return "item => item.value > 10";
            case "reduce":
                return "(acc, item) => acc + item.value";
            case "sort":
                return "(a, b) => a.value - b.value";
            case "merge":
                return "[${array1}, ${array2}] or {...${obj1}, ...${obj2}}";
            case "extract":
                return "item.property.nested";
            case "custom":
                return "$map(items, function($item) { $item.price * 1.1 })";
            default:
                return "";
        }
    };

    const getDescription = () => {
        switch (operation) {
            case "map":
                return "Transform each item in an array";
            case "filter":
                return "Filter items based on a condition";
            case "reduce":
                return "Aggregate array into a single value";
            case "sort":
                return "Sort array items";
            case "merge":
                return "Combine multiple objects or arrays";
            case "extract":
                return "Extract specific properties from objects";
            case "custom":
                return "Use JSONata query language for complex transformations";
            default:
                return "";
        }
    };

    return (
        <div>
            <FormSection title="Operation">
                <FormField label="Transform Type">
                    <Select value={operation} onChange={setOperation} options={operations} />
                </FormField>

                <div className="px-3 py-2 bg-blue-500/10 dark:bg-blue-400/20 border border-blue-500/30 dark:border-blue-400/30 text-blue-800 dark:text-blue-400 rounded-lg">
                    <p className="text-xs text-blue-800">{getDescription()}</p>
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

            <FormSection title="Transformation">
                <FormField
                    label={operation === "custom" ? "JSONata Expression" : "Expression"}
                    description={
                        operation === "custom"
                            ? "JSONata query"
                            : "JavaScript expression or function"
                    }
                >
                    <CodeInput
                        value={expression}
                        onChange={setExpression}
                        language={operation === "custom" ? "jsonata" : "javascript"}
                        placeholder={getPlaceholder()}
                        rows={operation === "custom" ? 8 : 6}
                    />
                </FormField>

                {operation === "custom" && (
                    <div className="px-3 py-2 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-2">
                            <strong>JSONata Examples:</strong>
                        </p>
                        <code className="text-xs block mb-1">
                            $map(items, function($i) {"{"}$i.name{"}"}){" "}
                            <span className="text-muted-foreground">// Extract names</span>
                        </code>
                        <code className="text-xs block mb-1">
                            items[price &gt; 100]{" "}
                            <span className="text-muted-foreground">// Filter by price</span>
                        </code>
                        <code className="text-xs block">
                            $sum(items.price){" "}
                            <span className="text-muted-foreground">// Sum prices</span>
                        </code>
                    </div>
                )}
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
