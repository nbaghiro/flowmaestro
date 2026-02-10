/**
 * ChatInput Component
 *
 * Unified chat input with send button and keyboard handling.
 * Supports both single-line input and multi-line textarea modes.
 */

import { Send, Loader2 } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import { cn } from "../../../lib/utils";
import { Button } from "../../common/Button";
import { Input } from "../../common/Input";

interface ChatInputProps {
    /**
     * Current input value
     */
    value: string;
    /**
     * Callback when input value changes
     */
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    /**
     * Callback when send button is clicked or Enter is pressed
     */
    onSend: () => void;
    /**
     * Callback for key press events (typically from useChatInput hook)
     */
    onKeyPress: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    /**
     * Placeholder text
     * @default "Type a message..."
     */
    placeholder?: string;
    /**
     * Whether input is disabled (e.g., during streaming)
     * @default false
     */
    disabled?: boolean;
    /**
     * Whether to show loading indicator on send button
     * @default false
     */
    isLoading?: boolean;
    /**
     * Use textarea instead of input for multi-line
     * @default false
     */
    multiline?: boolean;
    /**
     * Additional class name for the container
     */
    className?: string;
    /**
     * Additional class name for the input
     */
    inputClassName?: string;
    /**
     * Helper text below the input
     */
    helperText?: ReactNode;
    /**
     * Custom send button content
     */
    sendButtonContent?: ReactNode;
    /**
     * Additional content before the input (e.g., file upload button)
     */
    startContent?: ReactNode;
    /**
     * Additional content after the send button
     */
    endContent?: ReactNode;
}

/**
 * Unified chat input component used across all chat interfaces.
 *
 * @example
 * ```tsx
 * const { value, onChange, onKeyPress, handleSend, canSend } = useChatInput({
 *   onSend: sendMessage,
 *   disabled: isStreaming
 * });
 *
 * return (
 *   <ChatInput
 *     value={value}
 *     onChange={onChange}
 *     onSend={handleSend}
 *     onKeyPress={onKeyPress}
 *     disabled={!canSend}
 *     isLoading={isStreaming}
 *     placeholder="Ask about your workflow..."
 *     helperText="Press Enter to send"
 *   />
 * );
 * ```
 */
export const ChatInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, ChatInputProps>(
    (
        {
            value,
            onChange,
            onSend,
            onKeyPress,
            placeholder = "Type a message...",
            disabled = false,
            isLoading = false,
            multiline = false,
            className,
            inputClassName,
            helperText,
            sendButtonContent,
            startContent,
            endContent
        },
        ref
    ) => {
        const canSend = value.trim().length > 0 && !disabled;

        const inputClasses = cn(
            "flex-1 px-4 py-3 rounded-lg",
            "bg-muted border border-border",
            "text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary",
            "disabled:opacity-50",
            inputClassName
        );

        return (
            <div className={cn("border-t border-border p-4 flex-shrink-0", className)}>
                <div className="flex gap-2">
                    {startContent}
                    {multiline ? (
                        <textarea
                            ref={ref as React.Ref<HTMLTextAreaElement>}
                            value={value}
                            onChange={onChange}
                            onKeyDown={
                                onKeyPress as React.KeyboardEventHandler<HTMLTextAreaElement>
                            }
                            placeholder={placeholder}
                            disabled={disabled}
                            rows={1}
                            className={cn(inputClasses, "resize-none min-h-[48px]")}
                        />
                    ) : (
                        <Input
                            ref={ref as React.Ref<HTMLInputElement>}
                            type="text"
                            value={value}
                            onChange={onChange}
                            onKeyPress={onKeyPress as React.KeyboardEventHandler<HTMLInputElement>}
                            placeholder={placeholder}
                            disabled={disabled}
                            className={inputClasses}
                        />
                    )}
                    <Button
                        variant="primary"
                        onClick={onSend}
                        disabled={!canSend}
                        className="px-4 py-3"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : sendButtonContent ? (
                            sendButtonContent
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </Button>
                    {endContent}
                </div>
                {helperText && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">{helperText}</p>
                )}
            </div>
        );
    }
);

ChatInput.displayName = "ChatInput";
