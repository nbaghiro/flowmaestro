/**
 * Chat Interface Builder Store Tests
 *
 * Tests for chat interface builder state management including
 * CRUD operations, save/publish, and suggested prompts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the API module
vi.mock("../../lib/api", () => ({
    updateChatInterface: vi.fn(),
    publishChatInterface: vi.fn(),
    unpublishChatInterface: vi.fn()
}));

// Mock the logger
vi.mock("../../lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
    }
}));

import { updateChatInterface, publishChatInterface, unpublishChatInterface } from "../../lib/api";
import { useChatInterfaceBuilderStore } from "../chatInterfaceBuilderStore";

// Mock data factory
function createMockChatInterface(overrides?: Record<string, unknown>) {
    const defaults = {
        id: "chat-123",
        workflowId: "workflow-123",
        workspaceId: "workspace-123",
        name: "Test Chat",
        slug: "test-chat",
        title: "Test Chat Interface",
        description: "A test chat interface",
        coverType: "color" as const,
        coverValue: "#3B82F6",
        iconUrl: null,
        primaryColor: "#3B82F6",
        fontFamily: "Inter",
        borderRadius: "md",
        welcomeMessage: "Hello!",
        placeholderText: "Type a message...",
        suggestedPrompts: [],
        allowFileUpload: false,
        maxFiles: 3,
        maxFileSizeMb: 10,
        allowedFileTypes: [],
        persistenceType: "session" as const,
        sessionTimeoutMinutes: 30,
        widgetPosition: "bottom-right" as const,
        widgetButtonIcon: "chat",
        widgetButtonText: "Chat",
        widgetInitialState: "collapsed" as const,
        rateLimitMessages: 10,
        rateLimitWindowSeconds: 60,
        isPublished: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    return { ...defaults, ...overrides };
}

// Reset store before each test
function resetStore() {
    useChatInterfaceBuilderStore.setState({
        chatInterface: null,
        isDirty: false,
        isSaving: false,
        isPublishing: false,
        activeTab: "design",
        error: null
    });
}

describe("chatInterfaceBuilderStore", () => {
    beforeEach(() => {
        resetStore();
        vi.clearAllMocks();
    });

    afterEach(() => {
        resetStore();
    });

    // ===== Initial State =====
    describe("initial state", () => {
        it("has correct initial state", () => {
            resetStore();
            const state = useChatInterfaceBuilderStore.getState();

            expect(state.chatInterface).toBeNull();
            expect(state.isDirty).toBe(false);
            expect(state.isSaving).toBe(false);
            expect(state.isPublishing).toBe(false);
            expect(state.activeTab).toBe("design");
            expect(state.error).toBeNull();
        });
    });

    // ===== Set Chat Interface =====
    describe("setChatInterface", () => {
        it("sets chat interface and clears dirty state", () => {
            const mockInterface = createMockChatInterface();

            useChatInterfaceBuilderStore.setState({ isDirty: true, error: "old error" });
            useChatInterfaceBuilderStore.getState().setChatInterface(mockInterface);

            const state = useChatInterfaceBuilderStore.getState();
            expect(state.chatInterface).toEqual(mockInterface);
            expect(state.isDirty).toBe(false);
            expect(state.error).toBeNull();
        });
    });

    // ===== Update Chat Interface =====
    describe("updateChatInterface", () => {
        it("updates chat interface fields", () => {
            useChatInterfaceBuilderStore.setState({
                chatInterface: createMockChatInterface()
            });

            useChatInterfaceBuilderStore.getState().updateChatInterface({
                name: "Updated Name",
                title: "Updated Title"
            });

            const state = useChatInterfaceBuilderStore.getState();
            expect(state.chatInterface?.name).toBe("Updated Name");
            expect(state.chatInterface?.title).toBe("Updated Title");
            expect(state.isDirty).toBe(true);
        });

        it("does nothing when no chat interface loaded", () => {
            useChatInterfaceBuilderStore.getState().updateChatInterface({
                name: "Test"
            });

            expect(useChatInterfaceBuilderStore.getState().chatInterface).toBeNull();
        });

        it("preserves existing fields", () => {
            useChatInterfaceBuilderStore.setState({
                chatInterface: createMockChatInterface({ description: "Original" })
            });

            useChatInterfaceBuilderStore.getState().updateChatInterface({
                name: "Updated"
            });

            expect(useChatInterfaceBuilderStore.getState().chatInterface?.description).toBe(
                "Original"
            );
        });
    });

    // ===== Active Tab =====
    describe("setActiveTab", () => {
        it("sets active tab", () => {
            useChatInterfaceBuilderStore.getState().setActiveTab("chat");
            expect(useChatInterfaceBuilderStore.getState().activeTab).toBe("chat");

            useChatInterfaceBuilderStore.getState().setActiveTab("widget");
            expect(useChatInterfaceBuilderStore.getState().activeTab).toBe("widget");

            useChatInterfaceBuilderStore.getState().setActiveTab("settings");
            expect(useChatInterfaceBuilderStore.getState().activeTab).toBe("settings");
        });
    });

    // ===== Save =====
    describe("save", () => {
        it("saves chat interface successfully", async () => {
            const mockInterface = createMockChatInterface();
            useChatInterfaceBuilderStore.setState({
                chatInterface: mockInterface,
                isDirty: true
            });

            vi.mocked(updateChatInterface).mockResolvedValue({
                success: true,
                data: { ...mockInterface, name: "Saved" }
            });

            const result = await useChatInterfaceBuilderStore.getState().save();

            expect(result).toBe(true);
            const state = useChatInterfaceBuilderStore.getState();
            expect(state.chatInterface?.name).toBe("Saved");
            expect(state.isDirty).toBe(false);
            expect(state.isSaving).toBe(false);
        });

        it("returns false when no chat interface", async () => {
            const result = await useChatInterfaceBuilderStore.getState().save();
            expect(result).toBe(false);
        });

        it("handles save error", async () => {
            useChatInterfaceBuilderStore.setState({
                chatInterface: createMockChatInterface()
            });

            vi.mocked(updateChatInterface).mockRejectedValue(new Error("Save failed"));

            const result = await useChatInterfaceBuilderStore.getState().save();

            expect(result).toBe(false);
            const state = useChatInterfaceBuilderStore.getState();
            expect(state.error).toBe("Save failed");
            expect(state.isSaving).toBe(false);
        });

        it("handles unsuccessful response", async () => {
            useChatInterfaceBuilderStore.setState({
                chatInterface: createMockChatInterface()
            });

            vi.mocked(updateChatInterface).mockResolvedValue({
                success: false,
                error: "Validation error"
            });

            const result = await useChatInterfaceBuilderStore.getState().save();

            expect(result).toBe(false);
            expect(useChatInterfaceBuilderStore.getState().error).toBe("Validation error");
        });
    });

    // ===== Publish =====
    describe("publish", () => {
        it("publishes chat interface successfully", async () => {
            const mockInterface = createMockChatInterface({ isPublished: false });
            useChatInterfaceBuilderStore.setState({
                chatInterface: mockInterface,
                isDirty: false
            });

            vi.mocked(publishChatInterface).mockResolvedValue({
                success: true,
                data: { ...mockInterface, isPublished: true }
            });

            const result = await useChatInterfaceBuilderStore.getState().publish();

            expect(result).toBe(true);
            expect(useChatInterfaceBuilderStore.getState().chatInterface?.isPublished).toBe(true);
        });

        it("saves before publishing if dirty", async () => {
            const mockInterface = createMockChatInterface();
            useChatInterfaceBuilderStore.setState({
                chatInterface: mockInterface,
                isDirty: true
            });

            vi.mocked(updateChatInterface).mockResolvedValue({
                success: true,
                data: mockInterface
            });
            vi.mocked(publishChatInterface).mockResolvedValue({
                success: true,
                data: { ...mockInterface, isPublished: true }
            });

            await useChatInterfaceBuilderStore.getState().publish();

            expect(updateChatInterface).toHaveBeenCalled();
            expect(publishChatInterface).toHaveBeenCalled();
        });

        it("returns false if save fails", async () => {
            useChatInterfaceBuilderStore.setState({
                chatInterface: createMockChatInterface(),
                isDirty: true
            });

            vi.mocked(updateChatInterface).mockResolvedValue({
                success: false,
                error: "Save failed"
            });

            const result = await useChatInterfaceBuilderStore.getState().publish();

            expect(result).toBe(false);
            expect(publishChatInterface).not.toHaveBeenCalled();
        });

        it("handles publish error", async () => {
            useChatInterfaceBuilderStore.setState({
                chatInterface: createMockChatInterface(),
                isDirty: false
            });

            vi.mocked(publishChatInterface).mockRejectedValue(new Error("Publish failed"));

            const result = await useChatInterfaceBuilderStore.getState().publish();

            expect(result).toBe(false);
            expect(useChatInterfaceBuilderStore.getState().error).toBe("Publish failed");
        });
    });

    // ===== Unpublish =====
    describe("unpublish", () => {
        it("unpublishes chat interface successfully", async () => {
            const mockInterface = createMockChatInterface({ isPublished: true });
            useChatInterfaceBuilderStore.setState({
                chatInterface: mockInterface
            });

            vi.mocked(unpublishChatInterface).mockResolvedValue({
                success: true,
                data: { ...mockInterface, isPublished: false }
            });

            const result = await useChatInterfaceBuilderStore.getState().unpublish();

            expect(result).toBe(true);
            expect(useChatInterfaceBuilderStore.getState().chatInterface?.isPublished).toBe(false);
        });

        it("handles unpublish error", async () => {
            useChatInterfaceBuilderStore.setState({
                chatInterface: createMockChatInterface()
            });

            vi.mocked(unpublishChatInterface).mockRejectedValue(new Error("Unpublish failed"));

            const result = await useChatInterfaceBuilderStore.getState().unpublish();

            expect(result).toBe(false);
            expect(useChatInterfaceBuilderStore.getState().error).toBe("Unpublish failed");
        });
    });

    // ===== Error Handling =====
    describe("setError", () => {
        it("sets error", () => {
            useChatInterfaceBuilderStore.getState().setError("Some error");
            expect(useChatInterfaceBuilderStore.getState().error).toBe("Some error");
        });

        it("clears error with null", () => {
            useChatInterfaceBuilderStore.setState({ error: "Old error" });
            useChatInterfaceBuilderStore.getState().setError(null);
            expect(useChatInterfaceBuilderStore.getState().error).toBeNull();
        });
    });

    // ===== Reset =====
    describe("reset", () => {
        it("resets all state", () => {
            useChatInterfaceBuilderStore.setState({
                chatInterface: createMockChatInterface(),
                isDirty: true,
                isSaving: true,
                isPublishing: true,
                activeTab: "settings",
                error: "some error"
            });

            useChatInterfaceBuilderStore.getState().reset();

            const state = useChatInterfaceBuilderStore.getState();
            expect(state.chatInterface).toBeNull();
            expect(state.isDirty).toBe(false);
            expect(state.isSaving).toBe(false);
            expect(state.isPublishing).toBe(false);
            expect(state.activeTab).toBe("design");
            expect(state.error).toBeNull();
        });
    });

    // ===== Cover Helpers =====
    describe("setCover", () => {
        it("sets cover type and value", () => {
            useChatInterfaceBuilderStore.setState({
                chatInterface: createMockChatInterface()
            });

            useChatInterfaceBuilderStore.getState().setCover("gradient", "linear-gradient(...)");

            const state = useChatInterfaceBuilderStore.getState();
            expect(state.chatInterface?.coverType).toBe("gradient");
            expect(state.chatInterface?.coverValue).toBe("linear-gradient(...)");
            expect(state.isDirty).toBe(true);
        });
    });

    describe("setIcon", () => {
        it("sets icon URL", () => {
            useChatInterfaceBuilderStore.setState({
                chatInterface: createMockChatInterface()
            });

            useChatInterfaceBuilderStore.getState().setIcon("https://example.com/icon.png");

            expect(useChatInterfaceBuilderStore.getState().chatInterface?.iconUrl).toBe(
                "https://example.com/icon.png"
            );
        });

        it("clears icon with null", () => {
            useChatInterfaceBuilderStore.setState({
                chatInterface: createMockChatInterface({ iconUrl: "https://example.com/icon.png" })
            });

            useChatInterfaceBuilderStore.getState().setIcon(null);

            expect(useChatInterfaceBuilderStore.getState().chatInterface?.iconUrl).toBeNull();
        });
    });

    // ===== Suggested Prompts =====
    describe("suggested prompts", () => {
        it("adds suggested prompt", () => {
            useChatInterfaceBuilderStore.setState({
                chatInterface: createMockChatInterface({ suggestedPrompts: [] })
            });

            useChatInterfaceBuilderStore.getState().addSuggestedPrompt({
                text: "Help me with...",
                icon: "help"
            });

            const prompts = useChatInterfaceBuilderStore.getState().chatInterface?.suggestedPrompts;
            expect(prompts).toHaveLength(1);
            expect(prompts?.[0].text).toBe("Help me with...");
        });

        it("removes suggested prompt by index", () => {
            useChatInterfaceBuilderStore.setState({
                chatInterface: createMockChatInterface({
                    suggestedPrompts: [
                        { text: "First", icon: "1" },
                        { text: "Second", icon: "2" },
                        { text: "Third", icon: "3" }
                    ]
                })
            });

            useChatInterfaceBuilderStore.getState().removeSuggestedPrompt(1);

            const prompts = useChatInterfaceBuilderStore.getState().chatInterface?.suggestedPrompts;
            expect(prompts).toHaveLength(2);
            expect(prompts?.[0].text).toBe("First");
            expect(prompts?.[1].text).toBe("Third");
        });

        it("updates suggested prompt at index", () => {
            useChatInterfaceBuilderStore.setState({
                chatInterface: createMockChatInterface({
                    suggestedPrompts: [{ text: "Original", icon: "old" }]
                })
            });

            useChatInterfaceBuilderStore.getState().updateSuggestedPrompt(0, {
                text: "Updated",
                icon: "new"
            });

            const prompts = useChatInterfaceBuilderStore.getState().chatInterface?.suggestedPrompts;
            expect(prompts?.[0].text).toBe("Updated");
            expect(prompts?.[0].icon).toBe("new");
        });

        it("reorders suggested prompts", () => {
            useChatInterfaceBuilderStore.setState({
                chatInterface: createMockChatInterface({
                    suggestedPrompts: [
                        { text: "A", icon: "a" },
                        { text: "B", icon: "b" },
                        { text: "C", icon: "c" }
                    ]
                })
            });

            useChatInterfaceBuilderStore.getState().reorderSuggestedPrompts([
                { text: "C", icon: "c" },
                { text: "A", icon: "a" },
                { text: "B", icon: "b" }
            ]);

            const prompts = useChatInterfaceBuilderStore.getState().chatInterface?.suggestedPrompts;
            expect(prompts?.[0].text).toBe("C");
            expect(prompts?.[1].text).toBe("A");
            expect(prompts?.[2].text).toBe("B");
        });
    });
});
