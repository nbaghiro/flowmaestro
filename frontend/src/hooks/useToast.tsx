import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { Toast, ToastType } from "../components/common/Toast";

interface ToastData {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextValue {
    showToast: (
        type: ToastType,
        title: string,
        options?: { message?: string; duration?: number }
    ) => void;
    success: (title: string, options?: { message?: string; duration?: number }) => void;
    error: (title: string, options?: { message?: string; duration?: number }) => void;
    warning: (title: string, options?: { message?: string; duration?: number }) => void;
    info: (title: string, options?: { message?: string; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastData[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback(
        (type: ToastType, title: string, options?: { message?: string; duration?: number }) => {
            const id = `toast-${++toastId}`;
            setToasts((prev) => [...prev, { id, type, title, ...options }]);
        },
        []
    );

    const success = useCallback(
        (title: string, options?: { message?: string; duration?: number }) => {
            showToast("success", title, options);
        },
        [showToast]
    );

    const error = useCallback(
        (title: string, options?: { message?: string; duration?: number }) => {
            showToast("error", title, options);
        },
        [showToast]
    );

    const warning = useCallback(
        (title: string, options?: { message?: string; duration?: number }) => {
            showToast("warning", title, options);
        },
        [showToast]
    );

    const info = useCallback(
        (title: string, options?: { message?: string; duration?: number }) => {
            showToast("info", title, options);
        },
        [showToast]
    );

    const value = useMemo(
        () => ({ showToast, success, error, warning, info }),
        [showToast, success, error, warning, info]
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            {/* Render toasts in a portal-like container */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        isOpen={true}
                        onClose={() => removeToast(toast.id)}
                        type={toast.type}
                        title={toast.title}
                        message={toast.message}
                        duration={toast.duration}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextValue {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
