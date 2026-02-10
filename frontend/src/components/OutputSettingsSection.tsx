/**
 * Output Settings Section Component
 * Reusable component for configuring node output variable storage
 */

import { AlertCircle, HelpCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "./common/Input";
import { Tooltip } from "./common/Tooltip";

interface OutputSettingsSectionProps {
    nodeName: string;
    nodeType: string;
    value?: string;
    onChange: (value: string) => void;
}

/**
 * Generate a suggested variable name from node name
 */
function generateVariableSuggestion(nodeName: string): string {
    // Convert to camelCase and remove special characters
    return nodeName
        .trim()
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .split(/\s+/)
        .map((word, index) => {
            const lower = word.toLowerCase();
            return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join("");
}

/**
 * Validate variable name (alphanumeric + underscore only)
 */
function isValidVariableName(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

export function OutputSettingsSection({
    nodeName,
    nodeType,
    value,
    onChange
}: OutputSettingsSectionProps) {
    const [enabled, setEnabled] = useState(!!value);
    const [variableName, setVariableName] = useState(value || "");
    const [error, setError] = useState<string | null>(null);

    const suggestion = generateVariableSuggestion(nodeName || nodeType);

    // Update parent when value changes
    useEffect(() => {
        if (enabled && variableName) {
            onChange(variableName);
        } else {
            onChange("");
        }
    }, [enabled, variableName, onChange]);

    // Validate on change
    useEffect(() => {
        if (variableName && !isValidVariableName(variableName)) {
            setError(
                "Variable name must start with letter/underscore and contain only letters, numbers, and underscores"
            );
        } else {
            setError(null);
        }
    }, [variableName]);

    const handleToggle = (checked: boolean) => {
        setEnabled(checked);
        if (checked && !variableName) {
            setVariableName(suggestion);
        }
    };

    const handleUseSuggestion = () => {
        setVariableName(suggestion);
    };

    return (
        <div className="space-y-3">
            {/* Enable/Disable Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
                <Input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleToggle(e.target.checked)
                    }
                    className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                />
                <span className="text-sm font-medium">Store output in variable</span>
            </label>

            {enabled && (
                <>
                    {/* Variable Name Input */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-1.5 text-sm font-medium">
                            Variable Name
                            <Tooltip
                                content={
                                    <span>
                                        Reference in other nodes:{" "}
                                        <code className="font-mono bg-muted px-1 rounded">
                                            {`{{${variableName || "variableName"}}}`}
                                        </code>
                                    </span>
                                }
                                position="right"
                            >
                                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                            </Tooltip>
                        </label>
                        <Input
                            type="text"
                            value={variableName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setVariableName(e.target.value)
                            }
                            placeholder="Enter variable name..."
                            className="font-mono"
                        />

                        {error && (
                            <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10 dark:bg-red-400/20 border border-red-500/30 dark:border-red-400/30 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                <span className="text-xs text-red-700 dark:text-red-400">
                                    {error}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Suggestion */}
                    {variableName !== suggestion && (
                        <button
                            onClick={handleUseSuggestion}
                            className="text-xs text-primary hover:text-primary/80 hover:underline"
                        >
                            💡 Use suggestion: <code className="font-mono">{suggestion}</code>
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
