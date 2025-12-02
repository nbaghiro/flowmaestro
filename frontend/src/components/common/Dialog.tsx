import { X } from "lucide-react";
import { useEffect } from "react";

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children?: React.ReactNode;
    maxWidth?: "sm" | "md" | "lg";
}

/**
 * Custom Dialog Component
 *
 * A reusable modal dialog that replaces browser alerts
 */
export function Dialog({
    isOpen,
    onClose,
    title,
    description,
    children,
    maxWidth = "md"
}: DialogProps) {
    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when dialog is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }

        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const maxWidthClasses = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg"
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Dialog */}
            <div
                className={`relative bg-card border border-border rounded-lg shadow-xl ${maxWidthClasses[maxWidth]} w-full mx-4 animate-in fade-in zoom-in-95 duration-200`}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-200">
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                        {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}
