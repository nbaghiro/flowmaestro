import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface FilterNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

const modeOptions = [
    { value: "keep", label: "Keep Matching Items" },
    { value: "remove", label: "Remove Matching Items" }
];

export function FilterNodeConfig({ data, onUpdate }: FilterNodeConfigProps) {
    const [inputArray, setInputArray] = useState((data.inputArray as string) || "");
    const [expression, setExpression] = useState((data.expression as string) || "");
    const [mode, setMode] = useState<"keep" | "remove">((data.mode as "keep" | "remove") || "keep");
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");
    const [removedVariable, setRemovedVariable] = useState((data.removedVariable as string) || "");

    // Sync when loading a workflow
    useEffect(() => {
        if (data.inputArray) setInputArray(data.inputArray as string);
        if (data.expression) setExpression(data.expression as string);
        if (data.mode) setMode(data.mode as "keep" | "remove");
        if (data.outputVariable) setOutputVariable(data.outputVariable as string);
        if (data.removedVariable) setRemovedVariable(data.removedVariable as string);
    }, [data]);

    // Push updates upward
    useEffect(() => {
        onUpdate({
            inputArray,
            expression,
            mode,
            outputVariable,
            removedVariable
        });
    }, [inputArray, expression, mode, outputVariable, removedVariable]);

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

            <FormSection title="Filter Expression">
                <FormField
                    label="Expression"
                    description='Boolean expression such as: item.status = "active"'
                >
                    <Input
                        type="text"
                        className="font-mono"
                        value={expression}
                        onChange={(e) => setExpression(e.target.value)}
                        placeholder="item.price &gt; 50"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Filter Mode">
                <FormField label="Mode">
                    <Select
                        value={mode}
                        onChange={(v) => setMode(v as "keep" | "remove")}
                        options={modeOptions}
                    />
                </FormField>
            </FormSection>

            <FormSection title="Output">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Filter"}
                    nodeType="filter"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />

                <FormField
                    label="Removed Items Variable"
                    description="Optional variable to store removed items"
                >
                    <Input
                        type="text"
                        value={removedVariable}
                        onChange={(e) => setRemovedVariable(e.target.value)}
                        className="font-mono"
                        placeholder="removedItems"
                    />
                </FormField>
            </FormSection>
        </div>
    );
}
