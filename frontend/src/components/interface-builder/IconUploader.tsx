interface Props {
    value?: string;
    previewUrl?: string;
    onChange: (value: string) => void;
    onFileSelect?: (file: File) => void;
    disabled?: boolean;
}

export function IconUploader({
    value,
    previewUrl,
    onChange,
    onFileSelect,
    disabled = false
}: Props) {
    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold">Icon</h3>

            <div className="flex items-center gap-4">
                <div className="h-12 w-12 overflow-hidden rounded-md border bg-muted flex items-center justify-center">
                    {previewUrl ? (
                        <img
                            src={previewUrl}
                            alt="Interface icon"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <span className="text-xs text-muted-foreground">Icon</span>
                    )}
                </div>

                <div className="flex flex-1 items-center gap-3">
                    <input
                        type="url"
                        value={value ?? ""}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="https://example.com/icon.png"
                        disabled={disabled}
                        className="flex-1 rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                    />

                    {onFileSelect && (
                        <label className="rounded-md border px-3 py-2 text-sm cursor-pointer disabled:opacity-50">
                            <input
                                type="file"
                                accept="image/*"
                                disabled={disabled}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) onFileSelect(file);
                                }}
                                className="hidden"
                            />
                            Upload
                        </label>
                    )}
                </div>
            </div>

            <p className="text-xs text-muted-foreground">
                Icon shown at the top of the public interface.
            </p>
        </div>
    );
}
