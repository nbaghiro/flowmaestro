import { create } from "zustand";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastData {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastStore {
    toasts: ToastData[];
    addToast: (
        type: ToastType,
        title: string,
        options?: { message?: string; duration?: number }
    ) => void;
    removeToast: (id: string) => void;
}

let toastId = 0;

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],

    addToast: (type, title, options) => {
        const id = `toast-${++toastId}`;
        const toast: ToastData = { id, type, title, ...options };
        set((state) => ({ toasts: [...state.toasts, toast] }));
    },

    removeToast: (id) => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }
}));
