import { Send, Loader2, Paperclip } from "lucide-react";
import { useRef, KeyboardEvent, ChangeEvent } from "react";

interface MessageInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    placeholder: string;
    isSending: boolean;
    allowFileUpload?: boolean;
    onFileSelect?: (files: FileList) => void;
}

export function MessageInput({
    value,
    onChange,
    onSend,
    placeholder,
    isSending,
    allowFileUpload = false,
    onFileSelect
}: MessageInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim() && !isSending) {
                onSend();
            }
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    const handleFileClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0 && onFileSelect) {
            onFileSelect(e.target.files);
            e.target.value = "";
        }
    };

    const canSend = value.trim().length > 0 && !isSending;

    return (
        <div className="border-t border-border px-4 py-3 flex-shrink-0">
            <div className="flex gap-2 items-center">
                {/* File upload button */}
                {allowFileUpload && (
                    <>
                        <button
                            type="button"
                            onClick={handleFileClick}
                            className="flex-shrink-0 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={isSending}
                    className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
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
