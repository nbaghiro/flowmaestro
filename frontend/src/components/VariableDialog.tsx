/**
 * Variable Dialog Component
 * A proper modal dialog for adding variables (replaces ugly browser prompts)
 */

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useState } from "react";
import { Alert } from "./common/Alert";
import { Button } from "./common/Button";
import { Input } from "./common/Input";
import { Select } from "./common/Select";

interface VariableDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (variableName: string, initialValue: unknown) => void;
    title?: string;
    description?: string;
}

export function VariableDialog({
    open,
    onOpenChange,
    onConfirm,
    title = "Add Variable",
    description = "Enter a name and initial value for the variable"
}: VariableDialogProps) {
    const [variableName, setVariableName] = useState("");
    const [initialValue, setInitialValue] = useState("");
    const [valueType, setValueType] = useState<"string" | "number" | "boolean">("string");
    const [error, setError] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!variableName.trim()) {
            setError("Variable name is required");
            return;
        }

        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variableName)) {
            setError(
                "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
            );
            return;
        }

        // Parse value based on type
        let parsedValue: unknown = initialValue;
        if (valueType === "number") {
            const numValue = initialValue === "" ? 0 : Number(initialValue);
            if (isNaN(numValue)) {
                setError("Invalid number");
                return;
            }
            parsedValue = numValue;
        } else if (valueType === "boolean") {
            parsedValue = initialValue === "true" || initialValue === "1";
        }

        // Call parent callback
        onConfirm(variableName, parsedValue);

        // Reset and close
        setVariableName("");
        setInitialValue("");
        setValueType("string");
        setError("");
        onOpenChange(false);
    };

    const handleCancel = () => {
        setVariableName("");
        setInitialValue("");
        setValueType("string");
        setError("");
        onOpenChange(false);
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-in fade-in z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-lg shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 z-50">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
                            <Dialog.Description className="text-sm text-muted-foreground mt-1">
                                {description}
                            </Dialog.Description>
                        </div>
                        <Dialog.Close asChild>
                            <Button variant="icon" aria-label="Close">
                                <X className="w-4 h-4" />
                            </Button>
                        </Dialog.Close>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Variable Name */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Variable Name
                            </label>
                            <Input
                                type="text"
                                value={variableName}
                                onChange={(e) => {
                                    setVariableName(e.target.value);
                                    setError("");
                                }}
                                placeholder="continueAsking"
                                className="font-mono"
                                autoFocus
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Must start with a letter or underscore
                            </p>
                        </div>

                        {/* Value Type */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Value Type</label>
                            <Select
                                value={valueType}
                                onChange={(value) => {
                                    setValueType(value as "string" | "number" | "boolean");
                                    setInitialValue("");
                                }}
                                options={[
                                    { value: "string", label: "Text (String)" },
                                    { value: "number", label: "Number" },
                                    { value: "boolean", label: "Boolean (true/false)" }
                                ]}
                            />
                        </div>

                        {/* Initial Value */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Initial Value
                            </label>
                            {valueType === "boolean" ? (
                                <Select
                                    value={initialValue}
                                    onChange={setInitialValue}
                                    options={[
                                        { value: "true", label: "true" },
                                        { value: "false", label: "false" }
                                    ]}
                                />
                            ) : (
                                <Input
                                    type={valueType === "number" ? "number" : "text"}
                                    value={initialValue}
                                    onChange={(e) => {
                                        setInitialValue(e.target.value);
                                        setError("");
                                    }}
                                    placeholder={valueType === "number" ? "0" : "Initial value..."}
                                    className="font-mono"
                                />
                            )}
                        </div>

                        {/* Error */}
                        {error && <Alert variant="error">{error}</Alert>}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary">
                                Add Variable
                            </Button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
