import { useToastStore, ToastType } from "../stores/toastStore";

interface ToastOptions {
    message?: string;
    duration?: number;
}

/**
 * Hook to show toast notifications from any component.
 *
 * @example
 * function MyComponent() {
 *     const toast = useToast();
 *
 *     const handleSave = async () => {
 *         try {
 *             await saveData();
 *             toast.success("Saved successfully");
 *         } catch (error) {
 *             toast.error("Failed to save", { message: error.message });
 *         }
 *     };
 * }
 *
 * @example
 * // With additional options
 * toast.info("Processing...", { duration: 10000 }); // 10 second duration
 * toast.warning("Check your input", { message: "Some fields are missing" });
 */
export function useToast() {
    const addToast = useToastStore((state) => state.addToast);

    return {
        show: (type: ToastType, title: string, options?: ToastOptions) =>
            addToast(type, title, options),
        success: (title: string, options?: ToastOptions) => addToast("success", title, options),
        error: (title: string, options?: ToastOptions) => addToast("error", title, options),
        warning: (title: string, options?: ToastOptions) => addToast("warning", title, options),
        info: (title: string, options?: ToastOptions) => addToast("info", title, options)
    };
}
