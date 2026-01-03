import { create } from "zustand";
import type {
    FormInterface,
    UpdateFormInterfaceInput,
    FormInterfaceCoverType
} from "@flowmaestro/shared";
import {
    updateFormInterface as updateFormInterfaceAPI,
    publishFormInterface as publishFormInterfaceAPI,
    unpublishFormInterface as unpublishFormInterfaceAPI
} from "../lib/api";
import { logger } from "../lib/logger";

export type FormInterfaceBuilderTab = "design" | "input" | "output" | "settings";

interface FormInterfaceBuilderStore {
    // State
    formInterface: FormInterface | null;
    isDirty: boolean;
    isSaving: boolean;
    isPublishing: boolean;
    activeTab: FormInterfaceBuilderTab;
    error: string | null;

    // Actions
    setFormInterface: (formInterface: FormInterface) => void;
    updateFormInterface: (updates: UpdateFormInterfaceInput) => void;
    setActiveTab: (tab: FormInterfaceBuilderTab) => void;
    save: () => Promise<boolean>;
    publish: () => Promise<boolean>;
    unpublish: () => Promise<boolean>;
    setError: (error: string | null) => void;
    reset: () => void;

    // Cover helpers
    setCover: (type: FormInterfaceCoverType, value: string) => void;
    setIcon: (url: string | null) => void;
}

export const useFormInterfaceBuilderStore = create<FormInterfaceBuilderStore>((set, get) => ({
    // Initial state
    formInterface: null,
    isDirty: false,
    isSaving: false,
    isPublishing: false,
    activeTab: "design",
    error: null,

    // Set the entire form interface (typically on load)
    setFormInterface: (formInterface) => {
        set({
            formInterface,
            isDirty: false,
            error: null
        });
    },

    // Update specific fields
    updateFormInterface: (updates) => {
        const { formInterface: current } = get();
        if (!current) return;

        // Merge updates into current form interface
        const updated: FormInterface = {
            ...current,
            ...updates,
            // Handle optional fields that might be set to undefined
            description:
                updates.description !== undefined ? updates.description : current.description,
            iconUrl: updates.iconUrl !== undefined ? updates.iconUrl : current.iconUrl
        } as FormInterface;

        set({
            formInterface: updated,
            isDirty: true
        });
    },

    // Set active editor tab
    setActiveTab: (tab) => {
        set({ activeTab: tab });
    },

    // Save form interface to backend
    save: async () => {
        const { formInterface } = get();
        if (!formInterface) return false;

        set({ isSaving: true, error: null });

        try {
            const response = await updateFormInterfaceAPI(formInterface.id, {
                name: formInterface.name,
                slug: formInterface.slug,
                title: formInterface.title,
                description: formInterface.description ?? undefined,
                coverType: formInterface.coverType,
                coverValue: formInterface.coverValue,
                iconUrl: formInterface.iconUrl,
                inputPlaceholder: formInterface.inputPlaceholder,
                inputLabel: formInterface.inputLabel,
                allowFileUpload: formInterface.allowFileUpload,
                allowUrlInput: formInterface.allowUrlInput,
                maxFiles: formInterface.maxFiles,
                maxFileSizeMb: formInterface.maxFileSizeMb,
                allowedFileTypes: formInterface.allowedFileTypes,
                submitButtonText: formInterface.submitButtonText,
                submitLoadingText: formInterface.submitLoadingText,
                outputLabel: formInterface.outputLabel,
                showCopyButton: formInterface.showCopyButton,
                showDownloadButton: formInterface.showDownloadButton,
                allowOutputEdit: formInterface.allowOutputEdit
            });

            if (response.success && response.data) {
                set({
                    formInterface: response.data,
                    isDirty: false,
                    isSaving: false
                });
                return true;
            } else {
                set({
                    error: response.error || "Failed to save",
                    isSaving: false
                });
                return false;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to save";
            logger.error("Failed to save form interface", error);
            set({
                error: message,
                isSaving: false
            });
            return false;
        }
    },

    // Publish form interface
    publish: async () => {
        const { formInterface, isDirty, save } = get();
        if (!formInterface) return false;

        // Save first if dirty
        if (isDirty) {
            const saved = await save();
            if (!saved) return false;
        }

        set({ isPublishing: true, error: null });

        try {
            const response = await publishFormInterfaceAPI(formInterface.id);

            if (response.success && response.data) {
                set({
                    formInterface: response.data,
                    isPublishing: false
                });
                return true;
            } else {
                set({
                    error: response.error || "Failed to publish",
                    isPublishing: false
                });
                return false;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to publish";
            logger.error("Failed to publish form interface", error);
            set({
                error: message,
                isPublishing: false
            });
            return false;
        }
    },

    // Unpublish form interface
    unpublish: async () => {
        const { formInterface } = get();
        if (!formInterface) return false;

        set({ isPublishing: true, error: null });

        try {
            const response = await unpublishFormInterfaceAPI(formInterface.id);

            if (response.success && response.data) {
                set({
                    formInterface: response.data,
                    isPublishing: false
                });
                return true;
            } else {
                set({
                    error: response.error || "Failed to unpublish",
                    isPublishing: false
                });
                return false;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to unpublish";
            logger.error("Failed to unpublish form interface", error);
            set({
                error: message,
                isPublishing: false
            });
            return false;
        }
    },

    // Set error message
    setError: (error) => {
        set({ error });
    },

    // Reset store state
    reset: () => {
        set({
            formInterface: null,
            isDirty: false,
            isSaving: false,
            isPublishing: false,
            activeTab: "design",
            error: null
        });
    },

    // Helper: Set cover photo
    setCover: (type, value) => {
        get().updateFormInterface({
            coverType: type,
            coverValue: value
        });
    },

    // Helper: Set icon
    setIcon: (url) => {
        get().updateFormInterface({
            iconUrl: url
        });
    }
}));
