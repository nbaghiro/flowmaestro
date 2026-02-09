import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, XCircle, AlertCircle, X } from "lucide-react";
import { useToastStore, ToastType } from "../../stores/toastStore";

const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />,
    error: <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />,
    info: <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
};

const colors: Record<ToastType, string> = {
    success: "bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800",
    error: "bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800",
    warning: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800",
    info: "bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800"
};

const textColors: Record<ToastType, string> = {
    success: "text-green-900 dark:text-green-100",
    error: "text-red-900 dark:text-red-100",
    warning: "text-yellow-900 dark:text-yellow-100",
    info: "text-blue-900 dark:text-blue-100"
};

export function Toaster() {
    const { toasts, removeToast } = useToastStore();

    return (
        <ToastPrimitive.Provider swipeDirection="right">
            {toasts.map((toast) => (
                <ToastPrimitive.Root
                    key={toast.id}
                    open={true}
                    onOpenChange={(open) => {
                        if (!open) {
                            removeToast(toast.id);
                        }
                    }}
                    duration={toast.duration ?? 5000}
                    className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg min-w-[320px] max-w-md ${colors[toast.type]} data-[state=open]:animate-in data-[state=open]:slide-in-from-top-2 data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:fade-out data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] duration-300`}
                >
                    <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>

                    <div className="flex-1 min-w-0">
                        <ToastPrimitive.Title
                            className={`font-medium text-sm ${textColors[toast.type]}`}
                        >
                            {toast.title}
                        </ToastPrimitive.Title>
                        {toast.message && (
                            <ToastPrimitive.Description
                                className={`mt-1 text-sm ${textColors[toast.type]} opacity-90`}
                            >
                                {toast.message}
                            </ToastPrimitive.Description>
                        )}
                    </div>

                    <ToastPrimitive.Close
                        className={`flex-shrink-0 ${textColors[toast.type]} opacity-60 hover:opacity-100 transition-opacity`}
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </ToastPrimitive.Close>
                </ToastPrimitive.Root>
            ))}
            <ToastPrimitive.Viewport className="fixed top-4 right-4 z-50 flex flex-col gap-2 outline-none" />
        </ToastPrimitive.Provider>
    );
}
