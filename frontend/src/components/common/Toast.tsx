import { CheckCircle2, XCircle, AlertCircle, X } from "lucide-react";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
    isOpen: boolean;
    onClose: () => void;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    /** When true, renders with fixed positioning. When false, relies on parent for positioning. */
    standalone?: boolean;
}

const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />,
    error: <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />,
    info: <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
};

const colors = {
    success: "bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800",
    error: "bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800",
    warning: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800",
    info: "bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800"
};

const textColors = {
    success: "text-green-900 dark:text-green-100",
    error: "text-red-900 dark:text-red-100",
    warning: "text-yellow-900 dark:text-yellow-100",
    info: "text-blue-900 dark:text-blue-100"
};

/**
 * Toast Notification Component
 *
 * Displays temporary notifications for success/error/warning messages.
 *
 * Can be used standalone (with fixed positioning) or within a ToastProvider
 * (where the provider handles positioning).
 *
 * @example
 * // Standalone usage (legacy)
 * <Toast isOpen={true} onClose={handleClose} type="success" title="Done!" standalone />
 *
 * @example
 * // With ToastProvider (recommended)
 * const toast = useToast();
 * toast.success("Task completed!");
 */
export function Toast({
    isOpen,
    onClose,
    type,
    title,
    message,
    duration = 5000,
    standalone = false
}: ToastProps) {
    useEffect(() => {
        if (isOpen && duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);

            return () => clearTimeout(timer);
        }
        return undefined;
    }, [isOpen, duration, onClose]);

    if (!isOpen) return null;

    const toastContent = (
        <div
            className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg ${colors[type]} min-w-[320px] max-w-md`}
        >
            <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>

            <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${textColors[type]}`}>{title}</p>
                {message && (
                    <p className={`mt-1 text-sm ${textColors[type]} opacity-90`}>{message}</p>
                )}
            </div>

            <button
                onClick={onClose}
                className={`flex-shrink-0 ${textColors[type]} opacity-60 hover:opacity-100 transition-opacity`}
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );

    if (standalone) {
        return (
            <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
                {toastContent}
            </div>
        );
    }

    return (
        <div className="animate-in slide-in-from-top-2 fade-in duration-300">{toastContent}</div>
    );
}
