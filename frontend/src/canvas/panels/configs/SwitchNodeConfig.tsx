import { Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface SwitchNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const matchTypes = [
    { value: "exact", label: "Exact Match" },
    { value: "contains", label: "Contains" },
    { value: "regex", label: "Regex Pattern" }
];

interface SwitchCase {
    value: string;
    label: string;
}

export function SwitchNodeConfig({ data, onUpdate, errors: _errors = [] }: SwitchNodeConfigProps) {
    const [inputVariable, setInputVariable] = useState((data.inputVariable as string) || "");
    const [matchType, setMatchType] = useState((data.matchType as string) || "exact");
    const [cases, setCases] = useState<SwitchCase[]>(
        (data.cases as SwitchCase[]) || [{ value: "", label: "Case 1" }]
    );
    const [hasDefault, setHasDefault] = useState((data.hasDefault as boolean) ?? true);
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");

    useEffect(() => {
        onUpdate({
            inputVariable,
            matchType,
            cases,
            hasDefault,
            outputVariable
        });
    }, [inputVariable, matchType, cases, hasDefault, outputVariable]);

    const addCase = () => {
        setCases([...cases, { value: "", label: `Case ${cases.length + 1}` }]);
    };

    const removeCase = (index: number) => {
        if (cases.length > 1) {
            setCases(cases.filter((_, i) => i !== index));
        }
    };

    const updateCase = (index: number, field: keyof SwitchCase, value: string) => {
        const updated = [...cases];
        updated[index] = { ...updated[index], [field]: value };
        setCases(updated);
    };

    return (
        <div>
            <FormSection title="Input">
                <FormField label="Input Variable" description="Variable to match against cases">
                    <Input
                        type="text"
                        value={inputVariable}
                        onChange={(e) => setInputVariable(e.target.value)}
                        placeholder="{{variableName}}"
                        className="font-mono"
                    />
                </FormField>

                <FormField label="Match Type">
                    <Select value={matchType} onChange={setMatchType} options={matchTypes} />
                </FormField>
            </FormSection>

            <FormSection title="Cases">
                {cases.map((switchCase, index) => (
                    <div
                        key={index}
                        className="space-y-2 p-3 border border-border rounded-lg bg-muted/30"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Case {index + 1}
                            </span>
                            {cases.length > 1 && (
                                <button
                                    onClick={() => removeCase(index)}
                                    className="p-1 hover:bg-red-50 rounded transition-colors"
                                    title="Remove case"
                                >
                                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                </button>
                            )}
                        </div>

                        <FormField label="Match Value">
                            <Input
                                type="text"
                                value={switchCase.value}
                                onChange={(e) => updateCase(index, "value", e.target.value)}
                                placeholder={
                                    matchType === "regex" ? "^pattern.*$" : "value to match"
                                }
                                className="font-mono"
                            />
                        </FormField>

                        <FormField label="Label">
                            <Input
                                type="text"
                                value={switchCase.label}
                                onChange={(e) => updateCase(index, "label", e.target.value)}
                                placeholder="Case label"
                            />
                        </FormField>
                    </div>
                ))}

                <button
                    onClick={addCase}
                    className="w-full px-3 py-2 text-sm border border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Case
                </button>
            </FormSection>

            <FormSection title="Default Case">
                <FormField label="Enable Default" description="Run if no cases match">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <Input
                            type="checkbox"
                            checked={hasDefault}
                            onChange={(e) => setHasDefault(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm">Enable default case</span>
                    </label>
                </FormField>
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Switch"}
                    nodeType="switch"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
