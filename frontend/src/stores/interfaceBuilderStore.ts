import { create } from "zustand";
import type { FormInterface, UpdateFormInterfaceInput } from "@flowmaestro/shared";
import * as api from "@/lib/api";

interface InterfaceBuilderStore {
    // State
    interface: FormInterface | null;
    isDirty: boolean;
    isSaving: boolean;
    isPublishing: boolean;
    activeTab: "design" | "input" | "output" | "settings";

    // Actions
    setInterface: (iface: FormInterface) => void;
    updateInterface: (updates: UpdateFormInterfaceInput) => void;
    setActiveTab: (tab: InterfaceBuilderStore["activeTab"]) => void;
    save: () => Promise<void>;
    publish: () => Promise<void>;
    unpublish: () => Promise<void>;
    reset: () => void;
}

export const useInterfaceBuilderStore = create<InterfaceBuilderStore>((set, get) => ({
    interface: null,
    isDirty: false,
    isSaving: false,
    isPublishing: false,
    activeTab: "design",

    setInterface: (iface) => set({ interface: iface, isDirty: false }),

    updateInterface: (updates) => {
        const { interface: current } = get();
        if (!current) return;

        set({
            interface: { ...current, ...updates },
            isDirty: true
        });
    },

    setActiveTab: (tab) => set({ activeTab: tab }),

    save: async () => {
        const { interface: iface } = get();
        if (!iface) return;

        set({ isSaving: true });
        try {
            await api.updateFormInterface(iface.id, {
                name: iface.name,
                slug: iface.slug,
                title: iface.title,
                description: iface.description ?? undefined,
                coverType: iface.coverType,
                coverValue: iface.coverValue,
                iconUrl: iface.iconUrl ?? undefined,
                inputPlaceholder: iface.inputPlaceholder,
                inputLabel: iface.inputLabel,
                allowFileUpload: iface.allowFileUpload,
                allowUrlInput: iface.allowUrlInput,
                maxFiles: iface.maxFiles,
                submitButtonText: iface.submitButtonText,
                outputLabel: iface.outputLabel,
                showCopyButton: iface.showCopyButton,
                showDownloadButton: iface.showDownloadButton,
                allowOutputEdit: iface.allowOutputEdit
            });
            set({ isDirty: false });
        } finally {
            set({ isSaving: false });
        }
    },

    publish: async () => {
        const { interface: iface } = get();
        if (!iface) return;

        set({ isPublishing: true });
        try {
            const updated = await api.publishFormInterface(iface.id);
            set({ interface: updated, isDirty: false });
        } finally {
            set({ isPublishing: false });
        }
    },

    unpublish: async () => {
        const { interface: iface } = get();
        if (!iface) return;

        const updated = await api.unpublishFormInterface(iface.id);
        set({ interface: updated });
    },

    reset: () =>
        set({
            interface: null,
            isDirty: false,
            isSaving: false,
            isPublishing: false,
            activeTab: "design"
        })
}));
