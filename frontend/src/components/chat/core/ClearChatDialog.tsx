/**
 * ClearChatDialog Component
 *
 * Confirmation dialog for clearing chat history.
 * Used across all chat interfaces that support clearing.
 */

import { ConfirmDialog } from "../../common/ConfirmDialog";

interface ClearChatDialogProps {
    /**
     * Whether the dialog is open
     */
    isOpen: boolean;
    /**
     * Callback when dialog should close
     */
    onClose: () => void;
    /**
     * Callback when clear is confirmed
     */
    onConfirm: () => void;
    /**
     * Custom title
     * @default "Clear Chat History"
     */
    title?: string;
    /**
     * Custom message
     * @default "Are you sure you want to clear all chat messages? This action cannot be undone."
     */
    message?: string;
    /**
     * Custom confirm button text
     * @default "Clear"
     */
    confirmText?: string;
    /**
     * Custom cancel button text
     * @default "Cancel"
     */
    cancelText?: string;
}

/**
 * Confirmation dialog for clearing chat history.
 *
 * @example
 * ```tsx
 * const [showClear, setShowClear] = useState(false);
 *
 * <Button onClick={() => setShowClear(true)}>Clear Chat</Button>
 *
 * <ClearChatDialog
 *   isOpen={showClear}
 *   onClose={() => setShowClear(false)}
 *   onConfirm={() => {
 *     clearMessages();
 *     setShowClear(false);
 *   }}
 * />
 * ```
 */
export function ClearChatDialog({
    isOpen,
    onClose,
    onConfirm,
    title = "Clear Chat History",
    message = "Are you sure you want to clear all chat messages? This action cannot be undone.",
    confirmText = "Clear",
    cancelText = "Cancel"
}: ClearChatDialogProps) {
    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={onConfirm}
            title={title}
            message={message}
            confirmText={confirmText}
            cancelText={cancelText}
            variant="default"
        />
    );
}
