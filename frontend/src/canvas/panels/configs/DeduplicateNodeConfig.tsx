import { useState, useEffect } from "react";
import { FormField, FormSection } from "@/components/common/FormField";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { OutputSettingsSection } from "@/components/OutputSettingsSection";

interface DeduplicateNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

const keepOptions = [
    { value: "first", label: "Keep First Occurrence" },
    { value: "last", label: "Keep Last Occurrence" }
];

export function DeduplicateNodeConfig({ data, onUpdate }: DeduplicateNodeConfigProps) {
    const [inputArray, setInputArray] = useState((data.inputArray as string) || "");
    const [keyFields, setKeyFields] = useState<string[]>((data.keyFields as string[]) || []);
    const [keep, setKeep] = useState<"first" | "last">((data.keep as "first" | "last") || "first");
    const [caseSensitive, setCaseSensitive] = useState((data.caseSensitive as boolean) ?? false);
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");
    const [duplicatesVariable, setDuplicatesVariable] = useState(
        (data.duplicatesVariable as string) || ""
    );

    // Sync when loading an existing workflow
    useEffect(() => {
        if (data.inputArray) setInputArray(data.inputArray as string);
        if (data.keyFields) setKeyFields(data.keyFields as string[]);
        if (data.keep) setKeep(data.keep as "first" | "last");
        if (data.caseSensitive !== undefined) setCaseSensitive(data.caseSensitive as boolean);
        if (data.outputVariable) setOutputVariable(data.outputVariable as string);
        if (data.duplicatesVariable) setDuplicatesVariable(data.duplicatesVariable as string);
    }, [data]);

    // Push updates upward
    useEffect(() => {
        onUpdate({
            inputArray,
            keyFields,
            keep,
            caseSensitive,
            outputVariable,
            duplicatesVariable
        });
    }, [inputArray, keyFields, keep, caseSensitive, outputVariable, duplicatesVariable]);

    return (
        <div>
            <FormSection title="Input">
                <FormField label="Input Array" description="Variable reference like ${items}">
                    <Input
                        type="text"
                        className="font-mono"
                        value={inputArray}
                        onChange={(e) => setInputArray(e.target.value)}
                        placeholder="${items}"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Key Fields">
                <FormField
                    label="Fields to Deduplicate By"
                    description="Comma separated, e.g. email or firstname,lastname"
                >
                    <Input
                        type="text"
                        className="font-mono"
                        value={keyFields.join(", ")}
                        onChange={(e) =>
                            setKeyFields(
                                e.target.value
                                    .split(",")
                                    .map((k) => k.trim())
                                    .filter(Boolean)
                            )
                        }
                        placeholder="email"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Deduplication Settings">
                <FormField label="Keep">
                    <Select
                        value={keep}
                        onChange={(v) => setKeep(v as "first" | "last")}
                        options={keepOptions}
                    />
                </FormField>

                <FormField label="Case Sensitive Comparison">
                    <Input
                        type="checkbox"
                        checked={caseSensitive}
                        onChange={(e) => setCaseSensitive(e.target.checked)}
                    />
                </FormField>
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Deduplicate"}
                    nodeType="deduplicate"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />

                <FormField
                    label="Duplicates Variable"
                    description="Optional variable to store duplicates"
                >
                    <Input
                        type="text"
                        className="font-mono"
                        value={duplicatesVariable}
                        onChange={(e) => setDuplicatesVariable(e.target.value)}
                        placeholder="duplicates"
                    />
                </FormField>
            </FormSection>
        </div>
    );
}
