import { useState, useEffect } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";

interface InputNodeConfigProps {
    nodeId?: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const inputTypes = [
    { value: "text", label: "Text" },
    { value: "json", label: "JSON" }
];

export function InputNodeConfig({
    nodeId: _nodeId,
    data,
    onUpdate,
    errors: _errors = []
}: InputNodeConfigProps) {
    const [variableName, setVariableName] = useState((data.variableName as string) || "userInput");
    const [inputType, setInputType] = useState((data.inputType as string) || "text");
    const [description, setDescription] = useState((data.description as string) || "");
    const [value, setValue] = useState((data.value as string) || "");

    useEffect(() => {
        onUpdate({
            variableName,
            inputType,
            description,
            value
        });
    }, [variableName, inputType, description, value]);

    return (
        <>
            <FormSection title="Input Configuration">
                <FormField label="Input Name" description="Variable name for this input">
                    <Input
                        value={variableName}
                        onChange={(e) => setVariableName(e.target.value)}
                        placeholder="userInput"
                    />
                </FormField>

                <FormField label="Input Type">
                    <Select value={inputType} onChange={setInputType} options={inputTypes} />
                </FormField>

                <FormField
                    label="Description"
                    description="Help text for users providing this input"
                >
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter your full name..."
                        rows={3}
                    />
                </FormField>
            </FormSection>

            <FormSection title="Value Settings">
                <FormField
                    label={inputType === "json" ? "Default JSON" : "Default Value"}
                    description="Pre-filled value for this input"
                >
                    <Textarea
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={
                            inputType === "json" ? '{"key": "value"}' : "Enter default value..."
                        }
                        rows={4}
                        className={inputType === "json" ? "font-mono" : ""}
                    />
                </FormField>
            </FormSection>
        </>
    );
}
