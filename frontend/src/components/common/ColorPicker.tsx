import { Plus, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    disabled?: boolean;
    /** Whether this color is currently selected (shows checkmark) */
    isSelected?: boolean;
}

export function ColorPicker({
    value,
    onChange,
    disabled = false,
    isSelected = false
}: ColorPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const colorInputRef = useRef<HTMLInputElement>(null);

    // Close picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
        return undefined;
    }, [isOpen]);

    const handleButtonClick = () => {
        if (disabled) return;
        setIsOpen(!isOpen);
    };

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    // Determine if showing a custom color (non-empty value that's being used)
    const hasCustomColor = isSelected && value;

    return (
        <div className="relative" ref={containerRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={handleButtonClick}
                className={`w-8 h-8 rounded-lg transition-all flex items-center justify-center border-2 ${
                    hasCustomColor
                        ? "ring-2 ring-offset-2 ring-offset-background border-solid"
                        : "border-dashed border-muted-foreground/50 hover:border-foreground hover:scale-110"
                }`}
                style={
                    hasCustomColor
                        ? {
                              backgroundColor: value,
                              borderColor: value,
                              ["--tw-ring-color" as string]: value
                          }
                        : undefined
                }
                disabled={disabled}
                title="Custom color"
            >
                {hasCustomColor ? (
                    <Check className="w-4 h-4 text-white" />
                ) : (
                    <Plus className="w-4 h-4 text-muted-foreground" />
                )}
            </button>

            {/* Color Picker Popup */}
            {isOpen && (
                <div className="absolute bottom-full right-0 mb-2 p-2 bg-card border border-border rounded-lg shadow-lg z-50">
                    <input
                        ref={colorInputRef}
                        type="color"
                        value={value}
                        onChange={handleColorChange}
                        className="w-32 h-32 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                        style={{
                            // Remove default browser styling
                            WebkitAppearance: "none",
                            MozAppearance: "none",
                            appearance: "none"
                        }}
                    />
                </div>
            )}
        </div>
    );
}
