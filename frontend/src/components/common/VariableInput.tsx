/**
 * Variable Input Component
 * Enhanced text input with variable autocomplete and picker button.
 * Supports both single-line and multiline modes.
 */

import { Variable } from "lucide-react";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { cn } from "../../lib/utils";
import {
    getAvailableVariables,
    filterVariables,
    type AvailableVariable
} from "../../lib/variableRegistry";
import { useWorkflowStore } from "../../stores/workflowStore";
import { VariablePicker } from "./VariablePicker";

interface VariableInputProps {
    /** Current input value */
    value: string;
    /** Callback when value changes */
    onChange: (value: string) => void;
    /** ID of the node being configured (for variable discovery) */
    nodeId: string;
    /** Placeholder text */
    placeholder?: string;
    /** Use multiline textarea instead of single-line input */
    multiline?: boolean;
    /** Number of rows for multiline mode */
    rows?: number;
    /** Additional CSS classes */
    className?: string;
    /** Whether the input is disabled */
    disabled?: boolean;
    /** Whether there's an error */
    error?: boolean;
}

interface AutocompleteDropdownProps {
    variables: AvailableVariable[];
    selectedIndex: number;
    onSelect: (path: string) => void;
    position: { top: number; left: number };
}

function AutocompleteDropdown({
    variables,
    selectedIndex,
    onSelect,
    position
}: AutocompleteDropdownProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Scroll selected item into view
    useEffect(() => {
        if (dropdownRef.current) {
            const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: "nearest" });
            }
        }
    }, [selectedIndex]);

    if (variables.length === 0) {
        return (
            <div
                className="absolute z-50 w-64 bg-card border border-border rounded-lg shadow-lg p-3"
                style={{ top: position.top, left: position.left }}
            >
                <p className="text-sm text-muted-foreground">No matching variables</p>
            </div>
        );
    }

    return (
        <div
            ref={dropdownRef}
            className="absolute z-50 w-72 max-h-48 overflow-y-auto bg-card border border-border rounded-lg shadow-lg"
            style={{
                top: position.top,
                left: position.left,
                scrollbarWidth: "thin",
                scrollbarColor: "hsl(var(--border)) transparent"
            }}
        >
            {variables.map((variable, index) => (
                <button
                    key={variable.path}
                    type="button"
                    className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-left text-sm",
                        "hover:bg-muted/50 transition-colors",
                        index === selectedIndex && "bg-primary/10"
                    )}
                    onClick={() => onSelect(variable.path)}
                    onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                >
                    <Variable className="w-3 h-3 text-primary flex-shrink-0" />
                    <span className="font-mono text-xs truncate flex-1">{variable.path}</span>
                    <span className="text-xs text-muted-foreground">{variable.type}</span>
                </button>
            ))}
        </div>
    );
}

export function VariableInput({
    value,
    onChange,
    nodeId,
    placeholder,
    multiline = false,
    rows = 4,
    className,
    disabled = false,
    error = false
}: VariableInputProps) {
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [braceStartIndex, setBraceStartIndex] = useState(-1);

    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const { nodes, edges } = useWorkflowStore();

    // Get all available variables
    const allVariables = useMemo(() => {
        return getAvailableVariables(nodeId, nodes, edges);
    }, [nodeId, nodes, edges]);

    // Filter variables by search query
    const filteredVariables = useMemo(() => {
        const filtered = filterVariables(allVariables, searchQuery);
        return filtered.slice(0, 10); // Limit to 10 suggestions
    }, [allVariables, searchQuery]);

    // Reset selected index when filtered list changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [filteredVariables.length]);

    // Calculate autocomplete position
    const updateAutocompletePosition = useCallback(() => {
        if (!inputRef.current || !containerRef.current) return;

        const inputRect = inputRef.current.getBoundingClientRect();

        // Position below the input
        setAutocompletePosition({
            top: inputRect.height + 4,
            left: 0
        });
    }, []);

    // Handle input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart || 0;

        onChange(newValue);

        // Check if user just typed {{ or is typing after {{
        const textBefore = newValue.substring(0, cursorPos);
        const lastDoubleBraceIndex = textBefore.lastIndexOf("{{");

        if (lastDoubleBraceIndex !== -1) {
            const textAfterBrace = textBefore.substring(lastDoubleBraceIndex + 2);

            // Check if there's a closing }} between {{ and cursor
            if (!textAfterBrace.includes("}}")) {
                // We're inside a variable reference, show autocomplete
                setSearchQuery(textAfterBrace);
                setBraceStartIndex(lastDoubleBraceIndex);
                setShowAutocomplete(true);
                updateAutocompletePosition();
                return;
            }
        }

        // Not inside a variable reference
        setShowAutocomplete(false);
        setSearchQuery("");
        setBraceStartIndex(-1);
    };

    // Handle variable selection (from autocomplete or picker)
    const handleVariableSelect = useCallback(
        (variablePath: string) => {
            if (!inputRef.current) return;

            let newValue: string;
            let newCursorPos: number;

            if (showAutocomplete && braceStartIndex !== -1) {
                // Replace from {{ to current cursor position
                const cursorPos = inputRef.current.selectionStart || 0;
                const beforeBrace = value.substring(0, braceStartIndex);
                const afterCursor = value.substring(cursorPos);

                newValue = `${beforeBrace}{{${variablePath}}}${afterCursor}`;
                newCursorPos = beforeBrace.length + variablePath.length + 4; // After }}
            } else {
                // Insert at cursor position (from picker)
                const cursorPos = inputRef.current.selectionStart || value.length;
                const before = value.substring(0, cursorPos);
                const after = value.substring(cursorPos);

                newValue = `${before}{{${variablePath}}}${after}`;
                newCursorPos = cursorPos + variablePath.length + 4;
            }

            onChange(newValue);
            setShowAutocomplete(false);
            setSearchQuery("");
            setBraceStartIndex(-1);

            // Restore focus and cursor position
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
                }
            }, 0);
        },
        [value, onChange, showAutocomplete, braceStartIndex]
    );

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showAutocomplete || filteredVariables.length === 0) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setSelectedIndex((i) => Math.min(i + 1, filteredVariables.length - 1));
                break;
            case "ArrowUp":
                e.preventDefault();
                setSelectedIndex((i) => Math.max(i - 1, 0));
                break;
            case "Enter":
            case "Tab":
                if (filteredVariables[selectedIndex]) {
                    e.preventDefault();
                    handleVariableSelect(filteredVariables[selectedIndex].path);
                }
                break;
            case "Escape":
                e.preventDefault();
                setShowAutocomplete(false);
                break;
        }
    };

    // Handle blur - close autocomplete with delay (allows clicking dropdown)
    const handleBlur = () => {
        setTimeout(() => {
            setShowAutocomplete(false);
        }, 200);
    };

    // Handle focus - recheck for autocomplete state
    const handleFocus = () => {
        if (inputRef.current) {
            const cursorPos = inputRef.current.selectionStart || 0;
            const textBefore = value.substring(0, cursorPos);
            const lastDoubleBraceIndex = textBefore.lastIndexOf("{{");

            if (lastDoubleBraceIndex !== -1) {
                const textAfterBrace = textBefore.substring(lastDoubleBraceIndex + 2);
                if (!textAfterBrace.includes("}}")) {
                    setSearchQuery(textAfterBrace);
                    setBraceStartIndex(lastDoubleBraceIndex);
                    setShowAutocomplete(true);
                    updateAutocompletePosition();
                }
            }
        }
    };

    const inputClasses = cn(
        "w-full flex-1 px-3 py-2 text-sm bg-card border rounded-lg text-foreground font-mono",
        "placeholder:text-muted-foreground",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        error ? "border-destructive focus:ring-destructive" : "border-border",
        multiline && "resize-none",
        className
    );

    const InputComponent = multiline ? "textarea" : "input";

    return (
        <div ref={containerRef} className="relative flex gap-2 items-stretch">
            {/* Input Field */}
            <div className="flex-1 relative flex">
                <InputComponent
                    ref={inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    onFocus={handleFocus}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={multiline ? rows : undefined}
                    className={inputClasses}
                />

                {/* Autocomplete Dropdown */}
                {showAutocomplete && (
                    <AutocompleteDropdown
                        variables={filteredVariables}
                        selectedIndex={selectedIndex}
                        onSelect={handleVariableSelect}
                        position={autocompletePosition}
                    />
                )}
            </div>

            {/* Variable Picker Button */}
            <VariablePicker nodeId={nodeId} onSelect={handleVariableSelect} disabled={disabled} />
        </div>
    );
}
