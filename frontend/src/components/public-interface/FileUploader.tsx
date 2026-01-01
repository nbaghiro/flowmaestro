import type { ChangeEvent } from "react";

interface Props {
    files: File[];
    onChange: (files: File[]) => void;
    maxFiles?: number;
    accept?: string;
    disabled?: boolean;
}

export function FileUploader({ files, onChange, maxFiles, accept, disabled = false }: Props) {
    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        const nextFiles = Array.from(event.target.files ?? []);
        const limited = maxFiles ? nextFiles.slice(0, maxFiles) : nextFiles;
        onChange(limited);
    }

    return (
        <div className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
            <label className="block text-sm font-medium text-foreground">Files</label>
            <input
                type="file"
                multiple={Boolean(maxFiles ? maxFiles > 1 : true)}
                accept={accept}
                disabled={disabled}
                onChange={handleChange}
                className="mt-2 w-full text-sm"
            />
            {files.length > 0 && (
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {files.map((file) => (
                        <div key={file.name}>{file.name}</div>
                    ))}
                </div>
            )}
            {disabled && <div className="mt-2 text-xs">(disabled)</div>}
        </div>
    );
}
