import { Send, Loader2, Paperclip, X, File as FileIcon } from "lucide-react";
import { useRef, KeyboardEvent, ChangeEvent, useEffect } from "react";
import { ChatMessageAttachment } from "@flowmaestro/shared";

interface MessageInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    placeholder: string;
    isSending: boolean;
    allowFileUpload?: boolean;
    onFileSelect?: (files: FileList) => void;
    attachments?: ChatMessageAttachment[];
    onRemoveAttachment?: (attachmentId: string) => void;
    uploadError?: string | null;
}

export function MessageInput({
    value,
    onChange,
    onSend,
    placeholder,
    isSending,
    allowFileUpload = false,
    onFileSelect,
    attachments = [],
    onRemoveAttachment,
    uploadError
}: MessageInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if ((value.trim() || attachments.length > 0) && !isSending) {
                onSend();
            }
        }
        // Shift+Enter is handled naturally by textarea - it creates a new line
    };

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
    };

    // Auto-resize textarea based on content
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            // Reset height to auto to get the correct scrollHeight
            textarea.style.height = "auto";
            // Set height based on scrollHeight, with a max of 120px (roughly 5 lines)
            const maxHeight = 120;
            textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
        }
    }, [value]);

    const handleFileClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0 && onFileSelect) {
            onFileSelect(e.target.files);
            e.target.value = "";
        }
    };

    const canSend = (value.trim().length > 0 || attachments.length > 0) && !isSending;

    return (
        <div className="border-t border-border px-4 py-3 flex-shrink-0 bg-background">
            {/* Attachments preview */}
            {attachments.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                    {attachments.map((att, index) => (
                        <div
                            key={att.id || index}
                            className="relative flex items-center gap-2 bg-muted p-2 rounded-lg border border-border text-xs flex-shrink-0"
                        >
                            <div className="w-8 h-8 flex items-center justify-center bg-background rounded border border-border">
                                {att.mimeType?.startsWith("image/") ? (
                                    <img
                                        src={att.url || att.downloadUrl}
                                        alt={att.fileName}
                                        className="w-full h-full object-cover rounded"
                                    />
                                ) : (
                                    <FileIcon className="w-4 h-4 text-muted-foreground" />
                                )}
                            </div>
                            <div className="flex flex-col max-w-[120px]">
                                <span className="truncate font-medium">{att.fileName}</span>
                                <span className="text-[10px] text-muted-foreground">
                                    {(att.fileSize ? att.fileSize / 1024 : 0).toFixed(0)}KB
                                </span>
                            </div>
                            <button
                                onClick={() => onRemoveAttachment?.(att.id || "")}
                                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm hover:bg-destructive/90"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload error message */}
            {uploadError && (
                <div className="mb-2 px-3 py-2 text-xs text-red-600 bg-red-50 rounded-lg border border-red-200">
                    {uploadError}
                </div>
            )}

            <div className="flex gap-2 items-center">
                {/* File upload button */}
                {allowFileUpload && (
                    <>
                        <button
                            type="button"
                            onClick={handleFileClick}
                            disabled={isSending}
                            className="flex-shrink-0 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                            aria-label="Attach file"
                        >
                            <Paperclip className="w-5 h-5" />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </>
                )}

                {/* Text input */}
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={isSending}
                    rows={1}
                    className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 resize-none overflow-y-auto"
                    autoComplete="off"
                />

                {/* Send button */}
                <button
                    type="button"
                    onClick={onSend}
                    disabled={!canSend}
                    className="flex-shrink-0 p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Send message"
                >
                    {isSending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Send className="w-5 h-5" />
                    )}
                </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 text-center">
                Press Enter to send • Shift+Enter for new line
            </p>
        </div>
    );
}
