import { X } from "lucide-react";
import { useEffect } from "react";

type DialogSize =
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "6xl"
    | "7xl"
    | "full";

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children?: React.ReactNode;
    size?: DialogSize;
    /** Custom header element - if provided, title/description are ignored */
    header?: React.ReactNode;
    /** Footer element for action buttons */
    footer?: React.ReactNode;
    /** Whether to show the close button in header */
    showCloseButton?: boolean;
    /** Additional class names for the dialog container */
    className?: string;
    /** Whether clicking backdrop closes the dialog */
    closeOnBackdropClick?: boolean;
    /** Max height constraint (enables scrolling) */
    maxHeight?: string;
}

const sizeClasses: Record<DialogSize, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
    full: "max-w-[95vw]"
};

/**
 * Custom Dialog Component
 *
 * A reusable modal dialog that replaces browser alerts.
 * Supports custom headers, footers, and various size options.
 */
export function Dialog({
    isOpen,
    onClose,
    title,
    description,
    children,
    size = "md",
    header,
    footer,
    showCloseButton = true,
    className = "",
    closeOnBackdropClick = true,
    maxHeight = "90vh"
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

    const handleBackdropClick = () => {
        if (closeOnBackdropClick) {
            onClose();
        }
    };

    const showHeader = header || title;

    return (
        <div className="fixed inset-0 !m-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 !m-0 bg-black/60 backdrop-blur-sm"
                onClick={handleBackdropClick}
            />

            {/* Dialog */}
            <div
                className={`
                    relative bg-card border border-border/50 rounded-lg shadow-2xl
                    ${sizeClasses[size]} w-full mx-4
                    animate-in fade-in zoom-in-95 duration-200
                    flex flex-col
                    ${className}
                `}
                style={{ maxHeight }}
            >
                {/* Header */}
                {showHeader && (
                    <div className="flex items-start justify-between p-6 pb-4 border-b border-border flex-shrink-0">
                        {header ? (
                            header
                        ) : (
                            <div className="flex-1">
                                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                                {description && (
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {description}
                                    </p>
                                )}
                            </div>
                        )}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="ml-4 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">{children}</div>

                {/* Footer */}
                {footer && (
                    <div className="p-6 pt-4 border-t border-border flex-shrink-0">{footer}</div>
                )}
            </div>
        </div>
    );
}
