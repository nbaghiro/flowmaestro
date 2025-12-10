import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface AggregateNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

const operationOptions = [
    { value: "sum", label: "Sum" },
    { value: "count", label: "Count" },
    { value: "avg", label: "Average" },
    { value: "min", label: "Minimum" },
    { value: "max", label: "Maximum" },
    { value: "first", label: "First" },
    { value: "last", label: "Last" },
    { value: "custom", label: "Custom (JSONata)" }
];

export function AggregateNodeConfig({ data, onUpdate }: AggregateNodeConfigProps) {
    const [inputArray, setInputArray] = useState((data.inputArray as string) || "");
    const [operation, setOperation] = useState((data.operation as string) || "sum");
    const [field, setField] = useState((data.field as string) || "");
    const [groupBy, setGroupBy] = useState((data.groupBy as string) || "");
    const [customExpression, setCustomExpression] = useState(
        (data.customExpression as string) || ""
    );
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");

    // Sync on open
    useEffect(() => {
        if (data.inputArray) setInputArray(data.inputArray as string);
        if (data.operation) setOperation(data.operation as string);
        if (data.field) setField(data.field as string);
        if (data.groupBy) setGroupBy(data.groupBy as string);
        if (data.customExpression) setCustomExpression(data.customExpression as string);
        if (data.outputVariable) setOutputVariable(data.outputVariable as string);
    }, [data]);

    // Push updates upward
    useEffect(() => {
        onUpdate({
            inputArray,
            operation,
            field,
            groupBy,
            customExpression,
            outputVariable
        });
    }, [inputArray, operation, field, groupBy, customExpression, outputVariable]);

    return (
        <div>
            <FormSection title="Input Array">
                <FormField label="Array Variable" description="Variable reference like ${items}">
                    <Input
                        type="text"
                        className="font-mono"
                        value={inputArray}
                        onChange={(e) => setInputArray(e.target.value)}
                        placeholder="${items}"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Operation">
                <FormField label="Aggregation Type">
                    <Select
                        value={operation}
                        onChange={(v) => setOperation(v as string)}
                        options={operationOptions}
                    />
                </FormField>

                {operation !== "count" && operation !== "custom" && (
                    <FormField label="Field" description="Field to aggregate, e.g. price">
                        <Input
                            type="text"
                            className="font-mono"
                            value={field}
                            onChange={(e) => setField(e.target.value)}
                            placeholder="price"
                        />
                    </FormField>
                )}

                {operation === "custom" && (
                    <FormField
                        label="Custom JSONata Expression"
                        description="Full JSONata expression"
                    >
                        <Input
                            type="text"
                            className="font-mono"
                            value={customExpression}
                            onChange={(e) => setCustomExpression(e.target.value)}
                            placeholder="$sum(items.price)"
                        />
                    </FormField>
                )}
            </FormSection>

            <FormSection title="Grouping">
                <FormField label="Group By Field" description="Optional field to group results">
                    <Input
                        type="text"
                        className="font-mono"
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value)}
                        placeholder="category"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Aggregate"}
                    nodeType="aggregate"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
