import { Check, Plus } from "lucide-react";
import { useState, useEffect, useRef, FormEvent } from "react";
import { FOLDER_COLORS, type Folder } from "@flowmaestro/shared";
import { Alert } from "../common/Alert";
import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";
import { Input } from "../common/Input";

interface CreateFolderDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, color: string) => Promise<void>;
    /** If provided, the dialog is in edit mode */
    folder?: Folder | null;
}

export function CreateFolderDialog({ isOpen, onClose, onSubmit, folder }: CreateFolderDialogProps) {
    const [name, setName] = useState("");
    const [color, setColor] = useState<string>(FOLDER_COLORS[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [showCustomColorPicker, setShowCustomColorPicker] = useState(false);
    const [customColor, setCustomColor] = useState("#6366f1");
    const colorPickerRef = useRef<HTMLDivElement>(null);

    const isEditMode = !!folder;
    const isCustomColor = !FOLDER_COLORS.includes(color as (typeof FOLDER_COLORS)[number]);

    // Initialize form when folder changes or dialog opens
    useEffect(() => {
        if (isOpen) {
            if (folder) {
                setName(folder.name);
                setColor(folder.color);
                // If folder has a custom color, set it
                if (!FOLDER_COLORS.includes(folder.color as (typeof FOLDER_COLORS)[number])) {
                    setCustomColor(folder.color);
                }
            } else {
                setName("");
                setColor(FOLDER_COLORS[0]);
            }
            setError("");
            setShowCustomColorPicker(false);
        }
    }, [isOpen, folder]);

    // Close color picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
                setShowCustomColorPicker(false);
            }
        };

        if (showCustomColorPicker) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
        return undefined;
    }, [showCustomColorPicker]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");

        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("Folder name is required");
            return;
        }

        if (trimmedName.length > 100) {
            setError("Folder name must be 100 characters or less");
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(trimmedName, color);
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save folder");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setName("");
            setColor(FOLDER_COLORS[0]);
            setError("");
            onClose();
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            title={isEditMode ? "Edit Folder" : "Create New Folder"}
            size="sm"
            closeOnBackdropClick={!isSubmitting}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <Alert variant="error">{error}</Alert>}

                <div>
                    <label
                        htmlFor="folder-name"
                        className="block text-sm font-medium text-foreground mb-1.5"
                    >
                        Folder Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                        id="folder-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Customer Projects"
                        required
                        maxLength={100}
                        disabled={isSubmitting}
                        autoFocus
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                        {name.length}/100 characters
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Color</label>
                    <div className="flex flex-wrap gap-2">
                        {FOLDER_COLORS.map((folderColor) => (
                            <button
                                key={folderColor}
                                type="button"
                                onClick={() => setColor(folderColor)}
                                className={`w-8 h-8 rounded-lg transition-all flex items-center justify-center ${
                                    color === folderColor
                                        ? "ring-2 ring-offset-2 ring-offset-background"
                                        : "hover:scale-110"
                                }`}
                                style={{
                                    backgroundColor: folderColor,
                                    // Use CSS custom property for dynamic ring color
                                    ["--tw-ring-color" as string]: folderColor
                                }}
                                disabled={isSubmitting}
                                title={folderColor}
                            >
                                {color === folderColor && <Check className="w-4 h-4 text-white" />}
                            </button>
                        ))}

                        {/* Custom Color Button */}
                        <div className="relative" ref={colorPickerRef}>
                            <button
                                type="button"
                                onClick={() => setShowCustomColorPicker(!showCustomColorPicker)}
                                className={`w-8 h-8 rounded-lg transition-all flex items-center justify-center border-2 border-dashed ${
                                    isCustomColor
                                        ? "ring-2 ring-offset-2 ring-offset-background"
                                        : "border-muted-foreground/50 hover:border-foreground hover:scale-110"
                                }`}
                                style={
                                    isCustomColor
                                        ? {
                                              backgroundColor: color,
                                              borderStyle: "solid",
                                              borderColor: color,
                                              ["--tw-ring-color" as string]: color
                                          }
                                        : undefined
                                }
                                disabled={isSubmitting}
                                title="Custom color"
                            >
                                {isCustomColor ? (
                                    <Check className="w-4 h-4 text-white" />
                                ) : (
                                    <Plus className="w-4 h-4 text-muted-foreground" />
                                )}
                            </button>

                            {/* Color Picker Popup - opens above to avoid dialog cutoff */}
                            {showCustomColorPicker && (
                                <div className="absolute bottom-full right-0 mb-2 p-3 bg-card border border-border rounded-lg shadow-lg z-50">
                                    <label className="block text-xs text-muted-foreground mb-2">
                                        Custom Color
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={customColor}
                                            onChange={(e) => {
                                                setCustomColor(e.target.value);
                                                setColor(e.target.value);
                                            }}
                                            className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                                        />
                                        <Input
                                            type="text"
                                            value={customColor}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setCustomColor(val);
                                                if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                                                    setColor(val);
                                                }
                                            }}
                                            placeholder="#6366f1"
                                            className="w-24 text-sm"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="w-full mt-2"
                                        onClick={() => setShowCustomColorPicker(false)}
                                    >
                                        Done
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Preview */}
                <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Preview</p>
                    <div className="flex bg-card border border-border rounded-lg overflow-hidden">
                        {/* Left color accent bar */}
                        <div className="w-1 flex-shrink-0" style={{ backgroundColor: color }} />
                        <div className="flex items-center gap-3 p-3">
                            <svg
                                className="w-5 h-5 text-muted-foreground"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                />
                            </svg>
                            <span className="font-medium text-foreground">
                                {name.trim() || "Folder Name"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isSubmitting || !name.trim()}
                        loading={isSubmitting}
                    >
                        {isSubmitting
                            ? isEditMode
                                ? "Saving..."
                                : "Creating..."
                            : isEditMode
                              ? "Save Changes"
                              : "Create Folder"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
