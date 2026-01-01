interface Props {
    allowFileUpload: boolean;
    onAllowFileUploadChange: (value: boolean) => void;

    allowUrlInput: boolean;
    onAllowUrlInputChange: (value: boolean) => void;

    maxFiles: number;
    onMaxFilesChange: (value: number) => void;
}

export function ContextConfigEditor({
    allowFileUpload,
    onAllowFileUploadChange,
    allowUrlInput,
    onAllowUrlInputChange,
    maxFiles,
    onMaxFilesChange
}: Props) {
    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold">Context</h3>

            <p className="text-xs text-muted-foreground">
                Control whether users can provide additional context with their message.
            </p>

            <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2 text-sm">
                    <input
                        id="allow-file-context"
                        type="checkbox"
                        checked={allowFileUpload}
                        onChange={(e) => onAllowFileUploadChange(e.target.checked)}
                    />
                    <span className="leading-none">Allow file upload</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <input
                        id="allow-url-context"
                        type="checkbox"
                        checked={allowUrlInput}
                        onChange={(e) => onAllowUrlInputChange(e.target.checked)}
                    />
                    <span className="leading-none">Allow URL input</span>
                </div>
            </div>

            {allowFileUpload && (
                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium">Max files</label>
                    <input
                        type="number"
                        min={1}
                        value={maxFiles}
                        onChange={(e) => onMaxFilesChange(Number(e.target.value))}
                        className="w-24 rounded-md border px-3 py-2 text-sm"
                    />
                </div>
            )}
        </div>
    );
}
