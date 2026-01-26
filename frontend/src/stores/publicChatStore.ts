import { create } from "zustand";
import type {
    PublicChatInterface,
    PublicChatMessage,
    ChatSessionResponse,
    ChatMessageAttachment
} from "@flowmaestro/shared";
import {
    getPublicChatInterface,
    createChatSession,
    getChatSessionMessages,
    sendChatMessage as sendChatMessageAPI
} from "../lib/api";
import { logger } from "../lib/logger";

// Local storage key prefix for persistence tokens
const PERSISTENCE_TOKEN_PREFIX = "flowmaestro_chat_";

interface PublicChatStore {
    // Interface config (loaded from slug)
    chatInterface: PublicChatInterface | null;
    isLoadingInterface: boolean;

    // Session state
    session: ChatSessionResponse | null;
    isCreatingSession: boolean;

    // Messages
    messages: PublicChatMessage[];
    isLoadingMessages: boolean;

    // Input state
    inputValue: string;
    isSending: boolean;

    // Widget state (for embedded widget)
    isWidgetOpen: boolean;

    // Error handling
    error: string | null;

    // Actions - Interface
    loadInterface: (slug: string) => Promise<boolean>;

    // Actions - Session
    initSession: (slug: string) => Promise<boolean>;

    // Actions - Messages
    loadMessages: () => Promise<boolean>;
    sendMessage: (message: string, attachments?: ChatMessageAttachment[]) => Promise<boolean>;
    addLocalMessage: (message: PublicChatMessage) => void;
    updateMessageContent: (messageId: string, content: string, isStreaming?: boolean) => void;
    uploadFile: (
        file: File
    ) => Promise<{ success: boolean; data: ChatMessageAttachment; error?: string }>;

    // Actions - Input
    setInputValue: (value: string) => void;

    // Actions - Widget
    toggleWidget: () => void;
    openWidget: () => void;
    closeWidget: () => void;

    // Actions - Error
    setError: (error: string | null) => void;

    // Actions - Cleanup
    reset: () => void;
}

// Helper to get persistence token based on persistence type
function getPersistenceToken(
    slug: string,
    persistenceType: "session" | "local_storage"
): string | null {
    try {
        const storage = persistenceType === "session" ? sessionStorage : localStorage;
        return storage.getItem(`${PERSISTENCE_TOKEN_PREFIX}${slug}`);
    } catch {
        return null;
    }
}

// Helper to save persistence token based on persistence type
function savePersistenceToken(
    slug: string,
    token: string,
    persistenceType: "session" | "local_storage"
): void {
    try {
        const storage = persistenceType === "session" ? sessionStorage : localStorage;
        storage.setItem(`${PERSISTENCE_TOKEN_PREFIX}${slug}`, token);
    } catch {
        // Storage not available
    }
}

// Helper to generate a simple browser fingerprint
function generateBrowserFingerprint(): string {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillText("fingerprint", 2, 2);
    }

    const components = [
        navigator.userAgent,
        navigator.language,
        screen.colorDepth,
        screen.width,
        screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL()
    ];

    // Simple hash
    let hash = 0;
    const str = components.join("|");
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }

    return Math.abs(hash).toString(36);
}

export const usePublicChatStore = create<PublicChatStore>((set, get) => ({
    // Initial state
    chatInterface: null,
    isLoadingInterface: false,
    session: null,
    isCreatingSession: false,
    messages: [],
    isLoadingMessages: false,
    inputValue: "",
    isSending: false,
    isWidgetOpen: false,
    error: null,

    // Load chat interface configuration by slug
    loadInterface: async (slug) => {
        set({ isLoadingInterface: true, error: null });

        try {
            const response = await getPublicChatInterface(slug);

            if (response.success && response.data) {
                set({
                    chatInterface: response.data,
                    isLoadingInterface: false,
                    // Set initial widget state from config
                    isWidgetOpen: response.data.widgetInitialState === "expanded"
                });
                return true;
            } else {
                set({
                    error: response.error || "Chat interface not found",
                    isLoadingInterface: false
                });
                return false;
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to load chat interface";
            logger.error("Failed to load public chat interface", error);
            set({
                error: message,
                isLoadingInterface: false
            });
            return false;
        }
    },

    // Initialize or resume a chat session
    initSession: async (slug) => {
        const { chatInterface } = get();
        if (!chatInterface) {
            set({ error: "Chat interface not loaded" });
            return false;
        }

        set({ isCreatingSession: true, error: null });

        try {
            // Check for existing persistence token (both session and local_storage types)
            const persistenceToken = getPersistenceToken(slug, chatInterface.persistenceType);

            const response = await createChatSession(slug, {
                browserFingerprint: generateBrowserFingerprint(),
                referrer: document.referrer || undefined,
                persistenceToken: persistenceToken || undefined
            });

            if (response.success && response.data) {
                const session = response.data;

                // Save persistence token if provided (to sessionStorage or localStorage)
                if (session.persistenceToken) {
                    savePersistenceToken(
                        slug,
                        session.persistenceToken,
                        chatInterface.persistenceType
                    );
                }

                // Load existing messages if resuming
                const existingMessages = session.existingMessages || [];

                set({
                    session,
                    messages: existingMessages,
                    isCreatingSession: false
                });

                return true;
            } else {
                set({
                    error: response.error || "Failed to create session",
                    isCreatingSession: false
                });
                return false;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to create session";
            logger.error("Failed to create chat session", error);
            set({
                error: message,
                isCreatingSession: false
            });
            return false;
        }
    },

    // Load message history for current session
    loadMessages: async () => {
        const { session, chatInterface } = get();
        if (!session || !chatInterface) return false;

        set({ isLoadingMessages: true, error: null });

        try {
            const response = await getChatSessionMessages(chatInterface.slug, session.sessionToken);

            if (response.success && response.data) {
                set({
                    messages: response.data.messages,
                    isLoadingMessages: false
                });
                return true;
            } else {
                set({
                    error: response.error || "Failed to load messages",
                    isLoadingMessages: false
                });
                return false;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load messages";
            logger.error("Failed to load chat messages", error);
            set({
                error: message,
                isLoadingMessages: false
            });
            return false;
        }
    },

    // Send a message
    sendMessage: async (message, attachments = []) => {
        const { session, chatInterface, messages } = get();
        if (!session || !chatInterface) {
            set({ error: "Session not initialized" });
            return false;
        }

        if (!message.trim() && attachments.length === 0) {
            return false;
        }

        set({ isSending: true, error: null });

        // Optimistically add user message
        const userMessage: PublicChatMessage = {
            id: `temp_${Date.now()}`,
            role: "user",
            content: message.trim(),
            timestamp: new Date().toISOString(),
            attachments: attachments.map((a) => ({
                fileName: a.fileName || "unknown",
                fileSize: a.fileSize || 0,
                mimeType: a.mimeType || "application/octet-stream",
                url: a.url || ""
            }))
        };

        set({
            messages: [...messages, userMessage],
            inputValue: ""
        });

        try {
            const response = await sendChatMessageAPI(chatInterface.slug, {
                sessionToken: session.sessionToken,
                message: message.trim(),
                attachments
            });

            if (response.success && response.data) {
                const currentSession = get().session;

                // Update session with threadId if this was the first message
                if (currentSession && response.data.threadId && !currentSession.threadId) {
                    set({
                        session: {
                            ...currentSession,
                            threadId: response.data.threadId
                        }
                    });
                }

                // Keep user message as-is, add placeholder for assistant response
                // The SSE stream will populate the assistant message
                set({
                    isSending: false
                });

                // Stream connection will be established by ChatContainer
                // when it detects threadId is now available

                return true;
            } else {
                // Remove optimistic message on failure
                const revertedMessages = get().messages.filter((m) => m.id !== userMessage.id);
                set({
                    messages: revertedMessages,
                    error: response.error || "Failed to send message",
                    isSending: false
                });
                return false;
            }
        } catch (error) {
            // Remove optimistic message on failure
            const revertedMessages = get().messages.filter((m) => m.id !== userMessage.id);
            const errorMessage = error instanceof Error ? error.message : "Failed to send message";
            logger.error("Failed to send chat message", error);
            set({
                messages: revertedMessages,
                error: errorMessage,
                isSending: false
            });
            return false;
        }
    },

    // Upload a file
    uploadFile: async (file: File) => {
        const { session, chatInterface } = get();
        if (!session || !chatInterface) {
            throw new Error("Session not initialized");
        }

        // Import dynamically to avoid circular dependency issues if any
        const { uploadChatInterfaceFile } = await import("../lib/api");

        return await uploadChatInterfaceFile(chatInterface.slug, session.sessionToken, file);
    },

    // Add a local message (for SSE streaming in Phase 2)
    addLocalMessage: (message) => {
        const { messages } = get();
        // Check if message with same ID already exists (deduplication)
        if (messages.some((m) => m.id === message.id)) {
            // If streaming update (same ID), replace or update content?
            // Usually streaming sends chunks.
            // If it's a new full message, add it.
            // If we are accumulating tokens, we need a different action: updateMessageContent
            return;
        }
        set({ messages: [...messages, message] });
    },

    // Update existing message (e.g. streaming tokens)
    updateMessageContent: (messageId, content, _isStreaming = false) => {
        const { messages } = get();
        set({
            messages: messages.map((m) =>
                m.id === messageId
                    ? { ...m, content: m.content + content } // Append content
                    : m
            )
        });
    },

    // Update input value
    setInputValue: (value) => {
        set({ inputValue: value });
    },

    // Widget controls
    toggleWidget: () => {
        set((state) => ({ isWidgetOpen: !state.isWidgetOpen }));
    },

    openWidget: () => {
        set({ isWidgetOpen: true });
    },

    closeWidget: () => {
        set({ isWidgetOpen: false });
    },

    // Set error
    setError: (error) => {
        set({ error });
    },

    // Reset all state
    reset: () => {
        set({
            chatInterface: null,
            isLoadingInterface: false,
            session: null,
            isCreatingSession: false,
            messages: [],
            isLoadingMessages: false,
            inputValue: "",
            isSending: false,
            isWidgetOpen: false,
            error: null
        });
    }
}));
