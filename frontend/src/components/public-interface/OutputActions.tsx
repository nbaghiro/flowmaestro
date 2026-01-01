interface Props {
    showCopy?: boolean;
    showDownload?: boolean;
    allowEdit?: boolean;
}

export function OutputActions({ showCopy = true, showDownload = true, allowEdit = false }: Props) {
    return (
        <div className="flex items-center gap-2 pt-2">
            {showCopy && (
                <button
                    type="button"
                    disabled
                    className="rounded-md border px-3 py-1 text-xs text-muted-foreground disabled:opacity-50"
                >
                    Copy
                </button>
            )}

            {showDownload && (
                <button
                    type="button"
                    disabled
                    className="rounded-md border px-3 py-1 text-xs text-muted-foreground disabled:opacity-50"
                >
                    Download
                </button>
            )}

            {allowEdit && (
                <button
                    type="button"
                    disabled
                    className="rounded-md border px-3 py-1 text-xs text-muted-foreground disabled:opacity-50"
                >
                    Edit
                </button>
            )}
        </div>
    );
}
