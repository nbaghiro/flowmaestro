import { create } from "zustand";
import type {
    ChatInterface,
    UpdateChatInterfaceInput,
    ChatInterfaceCoverType,
    ChatInterfaceSuggestedPrompt
} from "@flowmaestro/shared";
import {
    updateChatInterface as updateChatInterfaceAPI,
    publishChatInterface as publishChatInterfaceAPI,
    unpublishChatInterface as unpublishChatInterfaceAPI
} from "../lib/api";
import { logger } from "../lib/logger";

export type ChatInterfaceBuilderTab = "design" | "chat" | "widget" | "settings";

interface ChatInterfaceBuilderStore {
    // State
    chatInterface: ChatInterface | null;
    isDirty: boolean;
    isSaving: boolean;
    isPublishing: boolean;
    activeTab: ChatInterfaceBuilderTab;
    error: string | null;

    // Actions
    setChatInterface: (chatInterface: ChatInterface) => void;
    updateChatInterface: (updates: UpdateChatInterfaceInput) => void;
    setActiveTab: (tab: ChatInterfaceBuilderTab) => void;
    save: () => Promise<boolean>;
    publish: () => Promise<boolean>;
    unpublish: () => Promise<boolean>;
    setError: (error: string | null) => void;
    reset: () => void;

    // Cover helpers
    setCover: (type: ChatInterfaceCoverType, value: string) => void;
    setIcon: (url: string | null) => void;

    // Suggested prompts helpers
    addSuggestedPrompt: (prompt: ChatInterfaceSuggestedPrompt) => void;
    removeSuggestedPrompt: (index: number) => void;
    updateSuggestedPrompt: (index: number, prompt: ChatInterfaceSuggestedPrompt) => void;
    reorderSuggestedPrompts: (prompts: ChatInterfaceSuggestedPrompt[]) => void;
}

export const useChatInterfaceBuilderStore = create<ChatInterfaceBuilderStore>((set, get) => ({
    // Initial state
    chatInterface: null,
    isDirty: false,
    isSaving: false,
    isPublishing: false,
    activeTab: "design",
    error: null,

    // Set the entire chat interface (typically on load)
    setChatInterface: (chatInterface) => {
        set({
            chatInterface,
            isDirty: false,
            error: null
        });
    },

    // Update specific fields
    updateChatInterface: (updates) => {
        const { chatInterface: current } = get();
        if (!current) return;

        // Merge updates into current chat interface
        const updated: ChatInterface = {
            ...current,
            ...updates,
            // Handle optional fields that might be set to undefined
            description:
                updates.description !== undefined ? updates.description : current.description,
            iconUrl: updates.iconUrl !== undefined ? updates.iconUrl : current.iconUrl,
            widgetButtonText:
                updates.widgetButtonText !== undefined
                    ? updates.widgetButtonText
                    : current.widgetButtonText
        } as ChatInterface;

        set({
            chatInterface: updated,
            isDirty: true
        });
    },

    // Set active editor tab
    setActiveTab: (tab) => {
        set({ activeTab: tab });
    },

    // Save chat interface to backend
    save: async () => {
        const { chatInterface } = get();
        if (!chatInterface) return false;

        set({ isSaving: true, error: null });

        try {
            const response = await updateChatInterfaceAPI(chatInterface.id, {
                name: chatInterface.name,
                slug: chatInterface.slug,
                title: chatInterface.title,
                description: chatInterface.description ?? undefined,
                coverType: chatInterface.coverType,
                coverValue: chatInterface.coverValue,
                iconUrl: chatInterface.iconUrl,
                primaryColor: chatInterface.primaryColor,
                fontFamily: chatInterface.fontFamily,
                borderRadius: chatInterface.borderRadius,
                welcomeMessage: chatInterface.welcomeMessage,
                placeholderText: chatInterface.placeholderText,
                suggestedPrompts: chatInterface.suggestedPrompts,
                allowFileUpload: chatInterface.allowFileUpload,
                maxFiles: chatInterface.maxFiles,
                maxFileSizeMb: chatInterface.maxFileSizeMb,
                allowedFileTypes: chatInterface.allowedFileTypes,
                persistenceType: chatInterface.persistenceType,
                sessionTimeoutMinutes: chatInterface.sessionTimeoutMinutes,
                widgetPosition: chatInterface.widgetPosition,
                widgetButtonIcon: chatInterface.widgetButtonIcon,
                widgetButtonText: chatInterface.widgetButtonText,
                widgetInitialState: chatInterface.widgetInitialState,
                rateLimitMessages: chatInterface.rateLimitMessages,
                rateLimitWindowSeconds: chatInterface.rateLimitWindowSeconds
            });

            if (response.success && response.data) {
                set({
                    chatInterface: response.data,
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
            logger.error("Failed to save chat interface", error);
            set({
                error: message,
                isSaving: false
            });
            return false;
        }
    },

    // Publish chat interface
    publish: async () => {
        const { chatInterface, isDirty, save } = get();
        if (!chatInterface) return false;

        // Save first if dirty
        if (isDirty) {
            const saved = await save();
            if (!saved) return false;
        }

        set({ isPublishing: true, error: null });

        try {
            const response = await publishChatInterfaceAPI(chatInterface.id);

            if (response.success && response.data) {
                set({
                    chatInterface: response.data,
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
            logger.error("Failed to publish chat interface", error);
            set({
                error: message,
                isPublishing: false
            });
            return false;
        }
    },

    // Unpublish chat interface
    unpublish: async () => {
        const { chatInterface } = get();
        if (!chatInterface) return false;

        set({ isPublishing: true, error: null });

        try {
            const response = await unpublishChatInterfaceAPI(chatInterface.id);

            if (response.success && response.data) {
                set({
                    chatInterface: response.data,
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
            logger.error("Failed to unpublish chat interface", error);
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
            chatInterface: null,
            isDirty: false,
            isSaving: false,
            isPublishing: false,
            activeTab: "design",
            error: null
        });
    },

    // Helper: Set cover photo
    setCover: (type, value) => {
        get().updateChatInterface({
            coverType: type,
            coverValue: value
        });
    },

    // Helper: Set icon
    setIcon: (url) => {
        get().updateChatInterface({
            iconUrl: url
        });
    },

    // Helper: Add a suggested prompt
    addSuggestedPrompt: (prompt) => {
        const { chatInterface } = get();
        if (!chatInterface) return;

        const updatedPrompts = [...chatInterface.suggestedPrompts, prompt];
        get().updateChatInterface({
            suggestedPrompts: updatedPrompts
        });
    },

    // Helper: Remove a suggested prompt
    removeSuggestedPrompt: (index) => {
        const { chatInterface } = get();
        if (!chatInterface) return;

        const updatedPrompts = chatInterface.suggestedPrompts.filter((_, i) => i !== index);
        get().updateChatInterface({
            suggestedPrompts: updatedPrompts
        });
    },

    // Helper: Update a suggested prompt
    updateSuggestedPrompt: (index, prompt) => {
        const { chatInterface } = get();
        if (!chatInterface) return;

        const updatedPrompts = [...chatInterface.suggestedPrompts];
        updatedPrompts[index] = prompt;
        get().updateChatInterface({
            suggestedPrompts: updatedPrompts
        });
    },

    // Helper: Reorder suggested prompts (for drag-and-drop)
    reorderSuggestedPrompts: (prompts) => {
        get().updateChatInterface({
            suggestedPrompts: prompts
        });
    }
}));
