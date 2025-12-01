import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";

interface VariableNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

const operations = [
    { value: "set", label: "Set Variable" },
    { value: "get", label: "Get Variable" },
    { value: "delete", label: "Delete Variable" }
];

const scopes = [
    { value: "workflow", label: "Workflow (current workflow only)" },
    { value: "global", label: "Global (across workflows)" },
    { value: "temporary", label: "Temporary (this execution only)" }
];

const valueTypes = [
    { value: "auto", label: "Auto-detect" },
    { value: "string", label: "String" },
    { value: "number", label: "Number" },
    { value: "boolean", label: "Boolean" },
    { value: "json", label: "JSON" }
];

export function VariableNodeConfig({ data, onUpdate }: VariableNodeConfigProps) {
    const [operation, setOperation] = useState((data.operation as string) || "set");
    const [variableName, setVariableName] = useState((data.variableName as string) || "");
    const [value, setValue] = useState((data.value as string) || "");
    const [scope, setScope] = useState((data.scope as string) || "workflow");
    const [valueType, setValueType] = useState((data.valueType as string) || "auto");

    useEffect(() => {
        onUpdate({
            operation,
            variableName,
            value,
            scope,
            valueType
        });
    }, [operation, variableName, value, scope, valueType]);

    return (
        <div>
            <FormSection title="Operation">
                <FormField label="Type">
                    <Select value={operation} onChange={setOperation} options={operations} />
                </FormField>
            </FormSection>

            <FormSection title="Variable">
                <FormField label="Variable Name" description="Name of the variable">
                    <Input
                        type="text"
                        value={variableName}
                        onChange={(e) => setVariableName(e.target.value)}
                        placeholder="myVariable"
                        className="font-mono"
                    />
                </FormField>

                <FormField label="Scope">
                    <Select value={scope} onChange={setScope} options={scopes} />
                </FormField>
            </FormSection>

            {operation === "set" && (
                <FormSection title="Value">
                    <FormField label="Value Type">
                        <Select value={valueType} onChange={setValueType} options={valueTypes} />
                    </FormField>

                    <FormField
                        label="Value"
                        description="Literal value or ${variableName} reference"
                    >
                        <Textarea
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={
                                valueType === "json"
                                    ? '{"key": "value"}'
                                    : valueType === "boolean"
                                      ? "true"
                                      : "Value or ${otherVariable}"
                            }
                            rows={valueType === "json" ? 6 : 4}
                            className="font-mono"
                        />
                    </FormField>
                </FormSection>
            )}

            {operation === "get" && (
                <FormSection title="Output">
                    <div className="px-3 py-2 bg-muted rounded-lg text-xs text-muted-foreground">
                        <p>
                            The variable value will be available in the workflow context after this
                            node executes.
                        </p>
                        <p className="mt-2">
                            <strong>Access via:</strong>{" "}
                            <code className="text-foreground">{`\${${variableName || "variableName"}}`}</code>
                        </p>
                    </div>
                </FormSection>
            )}

            {operation === "delete" && (
                <FormSection title="Confirmation">
                    <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-800">
                            <strong>Warning:</strong> This will permanently delete the variable{" "}
                            <code>{variableName || "variableName"}</code> from the {scope} scope.
                        </p>
                    </div>
                </FormSection>
            )}

            <FormSection title="Scope Information">
                <div className="space-y-2 text-xs">
                    <div className="px-3 py-2 bg-muted rounded-lg">
                        <p className="font-semibold text-foreground">Workflow</p>
                        <p className="text-muted-foreground">
                            Variables persist only within the current workflow execution
                        </p>
                    </div>
                    <div className="px-3 py-2 bg-muted rounded-lg">
                        <p className="font-semibold text-foreground">Global</p>
                        <p className="text-muted-foreground">
                            Variables shared across all workflow executions
                        </p>
                    </div>
                    <div className="px-3 py-2 bg-muted rounded-lg">
                        <p className="font-semibold text-foreground">Temporary</p>
                        <p className="text-muted-foreground">
                            Variables exist only during current node execution
                        </p>
                    </div>
                </div>
            </FormSection>
        </div>
    );
}
