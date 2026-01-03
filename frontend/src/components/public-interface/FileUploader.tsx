import { X } from "lucide-react";
import { useState, type ChangeEvent, type DragEvent } from "react";

interface Props {
    files: File[];
    onChange: (files: File[]) => void;
    maxFiles?: number;
    accept?: string;
    disabled?: boolean;
}

export function FileUploader({ files, onChange, maxFiles, accept, disabled = false }: Props) {
    const [isDragging, setIsDragging] = useState(false);

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        const nextFiles = Array.from(event.target.files ?? []);
        processFiles(nextFiles);
    }

    function processFiles(fileList: File[]) {
        if (!fileList || fileList.length === 0) return;

        // Combine existing files with new files
        const combined = [...files, ...fileList];

        // Limit to maxFiles if specified, otherwise use all files
        const limited = maxFiles ? combined.slice(0, maxFiles) : combined;
        onChange(limited);
    }

    function handleDragEnter(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
            setIsDragging(true);
        }
    }

    function handleDragLeave(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }

    function handleDragOver(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (disabled) return;

        const droppedFiles = Array.from(e.dataTransfer.files);
        processFiles(droppedFiles);
    }

    function formatFileSize(bytes: number): string {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    }

    return (
        <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Files</label>
            <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`rounded-lg border-2 border-dashed p-6 transition-colors ${
                    isDragging
                        ? "border-primary bg-primary/5"
                        : "border-input bg-muted/30 hover:border-ring"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
                <label className="flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center justify-center text-center">
                        <svg
                            className={`mb-3 h-10 w-10 transition-colors ${
                                isDragging ? "text-primary" : "text-muted-foreground"
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                        </svg>
                        <p className="mb-1 text-sm font-medium text-foreground">
                            {isDragging ? (
                                <span className="text-primary">Drop files here</span>
                            ) : (
                                <>
                                    <span className="text-primary">Click to upload</span> or drag
                                    and drop
                                </>
                            )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {maxFiles && maxFiles > 1
                                ? `Up to ${maxFiles} files`
                                : "Single file upload"}
                        </p>
                    </div>
                    <input
                        type="file"
                        multiple={!maxFiles || maxFiles > 1}
                        accept={accept}
                        disabled={disabled}
                        onChange={handleChange}
                        className="hidden"
                    />
                </label>
            </div>
            {files.length > 0 && (
                <div className="mt-3 space-y-2 rounded-lg border bg-muted/30 p-3">
                    <div className="text-xs font-medium text-foreground">
                        {files.length} {files.length === 1 ? "file" : "files"} selected
                    </div>
                    <div className="space-y-1.5">
                        {files.map((file, index) => (
                            <div
                                key={`${file.name}-${index}`}
                                className="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-2 text-xs"
                            >
                                <span className="truncate font-medium text-foreground flex-1 min-w-0">
                                    {file.name}
                                </span>
                                <span className="shrink-0 text-muted-foreground">
                                    {formatFileSize(file.size)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newFiles = files.filter((_, i) => i !== index);
                                        onChange(newFiles);
                                    }}
                                    disabled={disabled}
                                    className="shrink-0 ml-2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label={`Remove ${file.name}`}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
