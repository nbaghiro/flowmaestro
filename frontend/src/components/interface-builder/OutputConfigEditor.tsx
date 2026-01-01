interface Props {
    outputLabel: string;
    onOutputLabelChange: (value: string) => void;

    showCopyButton: boolean;
    onShowCopyButtonChange: (value: boolean) => void;

    showDownloadButton: boolean;
    onShowDownloadButtonChange: (value: boolean) => void;

    allowOutputEdit: boolean;
    onAllowOutputEditChange: (value: boolean) => void;
}

export function OutputConfigEditor({
    outputLabel,
    onOutputLabelChange,
    showCopyButton,
    onShowCopyButtonChange,
    showDownloadButton,
    onShowDownloadButtonChange,
    allowOutputEdit,
    onAllowOutputEditChange
}: Props) {
    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold">Output</h3>

            <div className="space-y-1">
                <label className="text-sm font-medium">Output label</label>
                <input
                    value={outputLabel}
                    onChange={(e) => onOutputLabelChange(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                />
            </div>

            <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2 text-sm">
                    <input
                        id="show-copy-button"
                        type="checkbox"
                        checked={showCopyButton}
                        onChange={(e) => onShowCopyButtonChange(e.target.checked)}
                    />
                    <span className="leading-none">Show copy button</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <input
                        id="show-download-button"
                        type="checkbox"
                        checked={showDownloadButton}
                        onChange={(e) => onShowDownloadButtonChange(e.target.checked)}
                    />
                    <span className="leading-none">Show download button</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <input
                        id="allow-output-edit"
                        type="checkbox"
                        checked={allowOutputEdit}
                        onChange={(e) => onAllowOutputEditChange(e.target.checked)}
                    />
                    <span className="leading-none">Allow output editing</span>
                </div>
            </div>
        </div>
    );
}
