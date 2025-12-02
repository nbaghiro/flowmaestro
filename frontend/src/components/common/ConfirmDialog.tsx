import { AlertTriangle } from "lucide-react";
import { Dialog } from "./Dialog";

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "default";
}

/**
 * Confirmation Dialog Component
 *
 * Replaces window.confirm() with a custom dialog
 */
export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "default"
}: ConfirmDialogProps) {
    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
            <div className="space-y-4">
                {/* Warning Icon for danger variant */}
                {variant === "danger" && (
                    <div className="flex justify-center">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                )}

                {/* Message */}
                <p className="text-sm text-gray-600 text-center">{message}</p>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-card border border-gray-300 rounded-lg hover:bg-muted/30 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                            variant === "danger"
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-primary hover:bg-primary/90"
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </Dialog>
    );
}
