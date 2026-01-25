import { useState, useEffect, useRef } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { CodeInput } from "../../../components/CodeInput";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface ConditionalNodeConfigProps {
    nodeId?: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const conditionTypes = [
    { value: "simple", label: "Simple Comparison" },
    { value: "expression", label: "JavaScript Expression" }
];

const operators = [
    { value: "==", label: "Equals (==)" },
    { value: "!=", label: "Not Equals (!=)" },
    { value: ">", label: "Greater Than (>)" },
    { value: "<", label: "Less Than (<)" },
    { value: ">=", label: "Greater or Equal (>=)" },
    { value: "<=", label: "Less or Equal (<=)" },
    { value: "contains", label: "Contains" },
    { value: "startsWith", label: "Starts With" },
    { value: "endsWith", label: "Ends With" },
    { value: "matches", label: "Regex Match" }
];

export function ConditionalNodeConfig({
    data,
    onUpdate,
    errors: _errors = []
}: ConditionalNodeConfigProps) {
    const isInitialMount = useRef(true);
    const [conditionType, setConditionType] = useState((data.conditionType as string) || "simple");
    const [leftValue, setLeftValue] = useState((data.leftValue as string) || "");
    const [operator, setOperator] = useState((data.operator as string) || "==");
    const [rightValue, setRightValue] = useState((data.rightValue as string) || "");
    const [expression, setExpression] = useState((data.expression as string) || "");
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");

    useEffect(() => {
        // Skip the initial mount - don't push unchanged data to store
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        onUpdate({
            conditionType,
            leftValue,
            operator,
            rightValue,
            expression,
            outputVariable
        });
    }, [conditionType, leftValue, operator, rightValue, expression, outputVariable]);

    return (
        <div>
            <FormSection title="Condition Type">
                <FormField label="Type">
                    <Select
                        value={conditionType}
                        onChange={setConditionType}
                        options={conditionTypes}
                    />
                </FormField>
            </FormSection>

            {conditionType === "simple" && (
                <FormSection title="Simple Comparison">
                    <FormField
                        label="Left Value"
                        description="Use {{variableName}} to reference variables"
                    >
                        <Input
                            type="text"
                            value={leftValue}
                            onChange={(e) => setLeftValue(e.target.value)}
                            placeholder="{{variable}} or literal value"
                            className="font-mono"
                        />
                    </FormField>

                    <FormField label="Operator">
                        <Select value={operator} onChange={setOperator} options={operators} />
                    </FormField>

                    <FormField
                        label="Right Value"
                        description="Use {{variableName}} to reference variables"
                    >
                        <Input
                            type="text"
                            value={rightValue}
                            onChange={(e) => setRightValue(e.target.value)}
                            placeholder="{{variable}} or literal value"
                            className="font-mono"
                        />
                    </FormField>
                </FormSection>
            )}

            {conditionType === "expression" && (
                <FormSection title="JavaScript Expression">
                    <FormField
                        label="Expression"
                        description="Write JavaScript that evaluates to true/false. Use {{variableName}} for variables."
                    >
                        <CodeInput
                            value={expression}
                            onChange={setExpression}
                            language="javascript"
                            placeholder="{{var1}} > 10 && {{var2}}.includes('text')"
                            rows={6}
                        />
                    </FormField>

                    <div className="px-3 py-2 bg-amber-500/10 dark:bg-amber-400/20 border border-amber-500/30 dark:border-amber-400/30 text-amber-800 dark:text-amber-400 rounded-lg">
                        <p className="text-xs text-yellow-800">
                            <strong>Examples:</strong>
                            <br />• {"${age} >= 18"}
                            <br />• {"${status} === 'active' && ${score} > 75"}
                            <br />• {"${email}.endsWith('@company.com')"}
                        </p>
                    </div>
                </FormSection>
            )}

            <FormSection title="Branch Info">
                <div className="px-3 py-2 text-xs bg-muted rounded-lg text-muted-foreground">
                    <p>
                        <strong>True Branch:</strong> Connect to nodes that should run when
                        condition is true
                    </p>
                    <p className="mt-2">
                        <strong>False Branch:</strong> Connect to nodes that should run when
                        condition is false
                    </p>
                </div>
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Conditional"}
                    nodeType="conditional"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
