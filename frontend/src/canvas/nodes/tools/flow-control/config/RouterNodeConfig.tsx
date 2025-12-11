import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { CodeInput } from "@/components/CodeInput";
import { FormField, FormSection } from "@/components/common/FormField";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";

interface RouterCondition {
    name: string;
    expression: string;
    description?: string;
}

interface RouterNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

const evaluationModes = [
    { value: "first", label: "Stop at first match" },
    { value: "all", label: "Send to all matches" }
];

export function RouterNodeConfig({ data, onUpdate }: RouterNodeConfigProps) {
    const [conditions, setConditions] = useState<RouterCondition[]>(
        Array.isArray(data.conditions)
            ? (data.conditions as RouterCondition[]).map((cond, index) => ({
                  name: cond?.name || `Condition ${index + 1}`,
                  expression: cond?.expression || "",
                  description: cond?.description || ""
              }))
            : [
                  {
                      name: "matchA",
                      expression: 'data.type === "A"',
                      description: "Example condition"
                  }
              ]
    );
    const [defaultOutput, setDefaultOutput] = useState((data.defaultOutput as string) || "default");
    const [evaluationMode, setEvaluationMode] = useState<"first" | "all">(
        (data.evaluationMode as "first" | "all") || "first"
    );

    useEffect(() => {
        onUpdate({
            conditions,
            defaultOutput: defaultOutput.trim() || "default",
            evaluationMode
        });
    }, [conditions, defaultOutput, evaluationMode]);

    const updateCondition = (index: number, key: keyof RouterCondition, value: string) => {
        setConditions((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [key]: value };
            return next;
        });
    };

    const addCondition = () => {
        setConditions((prev) => [
            ...prev,
            {
                name: `route${prev.length + 1}`,
                expression: "",
                description: ""
            }
        ]);
    };

    const removeCondition = (index: number) => {
        setConditions((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <div>
            <FormSection title="Routing Behavior">
                <FormField
                    label="Evaluation Mode"
                    description="Choose whether to stop at the first match or send data to every matching branch."
                >
                    <Select
                        value={evaluationMode}
                        onChange={(value) => setEvaluationMode(value as "first" | "all")}
                        options={evaluationModes}
                    />
                </FormField>

                <FormField
                    label="Default Output"
                    description="Fallback output name when no conditions match."
                >
                    <Input
                        value={defaultOutput}
                        onChange={(e) => setDefaultOutput(e.target.value)}
                        onBlur={() => setDefaultOutput((current) => current.trim() || "default")}
                        placeholder="default"
                        className="font-mono"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Conditions">
                <div className="px-3 py-2 text-xs bg-muted rounded-lg text-muted-foreground">
                    Expressions run against workflow context. Examples:
                    <div className="mt-1.5 space-y-1 font-mono">
                        <div>data.type === "A"</div>
                        <div>score &gt;= 80 && status !== "rejected"</div>
                        <div>items.length &gt; 0</div>
                    </div>
                </div>

                {conditions.map((cond, index) => (
                    <div
                        key={`${cond.name}-${index}`}
                        className="space-y-2 p-3 border border-border rounded-lg bg-muted/30"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Condition {index + 1}
                            </span>
                            <button
                                type="button"
                                onClick={() => removeCondition(index)}
                                className="p-1 hover:bg-red-50 rounded transition-colors"
                                title="Remove condition"
                            >
                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            </button>
                        </div>

                        <FormField label="Output Handle Name" description="Used as the route name.">
                            <Input
                                value={cond.name}
                                onChange={(e) => updateCondition(index, "name", e.target.value)}
                                placeholder="urgent"
                                className="font-mono"
                            />
                        </FormField>

                        <FormField
                            label="Expression"
                            description="JavaScript expression that returns true/false."
                        >
                            <CodeInput
                                value={cond.expression}
                                onChange={(value) => updateCondition(index, "expression", value)}
                                language="javascript"
                                placeholder="data.type === 'urgent' && score > 80"
                                rows={4}
                            />
                        </FormField>

                        <FormField label="Description (optional)">
                            <Input
                                value={cond.description}
                                onChange={(e) =>
                                    updateCondition(index, "description", e.target.value)
                                }
                                placeholder="Explain when this route triggers"
                            />
                        </FormField>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addCondition}
                    className="w-full px-3 py-2 text-sm border border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Condition
                </button>
            </FormSection>
        </div>
    );
}

export default RouterNodeConfig;
