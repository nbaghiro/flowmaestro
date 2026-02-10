/**
 * ClearChatButton Component
 *
 * Button with integrated confirmation dialog for clearing chat.
 * Encapsulates the common pattern of button + dialog state.
 */

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { cn } from "../../../lib/utils";
import { ClearChatDialog } from "./ClearChatDialog";

interface ClearChatButtonProps {
    /**
     * Callback when clear is confirmed
     */
    onClear: () => void;
    /**
     * Whether button is disabled
     * @default false
     */
    disabled?: boolean;
    /**
     * Additional class name for the button
     */
    className?: string;
    /**
     * Button title/tooltip
     * @default "Clear chat history"
     */
    title?: string;
}

/**
 * Clear chat button with integrated confirmation dialog.
 *
 * @example
 * ```tsx
 * <ClearChatButton
 *   onClear={clearMessages}
 *   disabled={messages.length === 0 || isStreaming}
 * />
 * ```
 */
export function ClearChatButton({
    onClear,
    disabled = false,
    className,
    title = "Clear chat history"
}: ClearChatButtonProps) {
    const [showConfirm, setShowConfirm] = useState(false);

    const handleConfirm = () => {
        onClear();
        setShowConfirm(false);
    };

    return (
        <>
            <button
                onClick={() => setShowConfirm(true)}
                disabled={disabled}
                className={cn(
                    "p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors",
                    "disabled:opacity-30 disabled:cursor-not-allowed",
                    className
                )}
                title={title}
            >
                <RotateCcw className="w-4 h-4" />
            </button>

            <ClearChatDialog
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleConfirm}
            />
        </>
    );
}
