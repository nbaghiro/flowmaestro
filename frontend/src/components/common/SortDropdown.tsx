import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { type SortField, type SortState, type SortFieldConfig } from "../../hooks/useSort";
import { cn } from "../../lib/utils";
import { Button } from "./Button";

interface SortDropdownProps {
    value: SortState;
    onChange: (field: SortField) => void;
    fields: SortFieldConfig[];
    className?: string;
}

export function SortDropdown({ value, onChange, fields, className }: SortDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
        return undefined;
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && isOpen) {
                setIsOpen(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    const handleOptionClick = (field: SortField) => {
        onChange(field);
        // Don't close if clicking the same field (to see direction change)
        if (field !== value.field) {
            setIsOpen(false);
        }
    };

    const currentFieldConfig = fields.find((f) => f.field === value.field);

    return (
        <div ref={dropdownRef} className={cn("relative", className)}>
            <Button
                variant="ghost"
                onClick={() => setIsOpen(!isOpen)}
                title={`Sort by: ${currentFieldConfig?.label || value.field}`}
            >
                <ArrowUpDown className="w-4 h-4" />
            </Button>

            {isOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-lg shadow-lg py-1 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Sort by
                    </div>
                    {fields.map((fieldConfig) => {
                        const isSelected = value.field === fieldConfig.field;
                        const DirectionIcon =
                            isSelected && value.direction === "asc" ? ArrowUp : ArrowDown;

                        return (
                            <button
                                key={fieldConfig.field}
                                onClick={() => handleOptionClick(fieldConfig.field)}
                                className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors",
                                    isSelected
                                        ? "text-primary bg-primary/5"
                                        : "text-foreground hover:bg-muted"
                                )}
                            >
                                <span>{fieldConfig.label}</span>
                                {isSelected && (
                                    <DirectionIcon className="w-3.5 h-3.5 text-primary" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
