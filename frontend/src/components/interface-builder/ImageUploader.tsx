import { useRef } from "react";

interface Props {
    value?: string;
    onChange: (value: string) => void;
    onFileSelect?: (file: File) => void;
    disabled?: boolean;
}

export function ImageUploader({ value, onChange, onFileSelect, disabled = false }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        onChange(url);
        onFileSelect?.(file);
    }
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">Upload image</label>

            <div className="flex items-center gap-4">
                <div className="h-16 w-24 overflow-hidden rounded-md border border-border bg-muted flex items-center justify-center">
                    {value ? (
                        <img
                            src={value}
                            alt="Cover preview"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <span className="text-xs text-muted-foreground">No image</span>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={disabled}
                        className="hidden"
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled}
                        className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground disabled:opacity-50"
                    >
                        Choose image
                    </button>
                </div>
            </div>

            <p className="text-xs text-muted-foreground">
                Image will be used as the cover background.
            </p>
        </div>
    );
}
