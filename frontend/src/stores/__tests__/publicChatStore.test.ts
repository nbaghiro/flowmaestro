/**
 * Public Chat Store Tests
 *
 * Tests for public chat interface state management including
 * interface loading, session management, messages, and widget state.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the API module
vi.mock("../../lib/api", () => ({
    getPublicChatInterface: vi.fn(),
    createChatSession: vi.fn(),
    getChatSessionMessages: vi.fn(),
    sendChatMessage: vi.fn()
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

// Mock localStorage
const mockLocalStorageStore: Record<string, string> = {};
const mockLocalStorage = {
    store: mockLocalStorageStore,
    getItem: vi.fn((key: string): string | null => mockLocalStorageStore[key] || null),
    setItem: vi.fn((key: string, value: string): void => {
        mockLocalStorageStore[key] = value;
    }),
    removeItem: vi.fn((key: string): void => {
        delete mockLocalStorageStore[key];
    }),
    clear: vi.fn((): void => {
        Object.keys(mockLocalStorageStore).forEach((key) => delete mockLocalStorageStore[key]);
    })
};
Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage });

// Mock document for fingerprint generation
Object.defineProperty(globalThis, "document", {
    value: {
        createElement: vi.fn(() => ({
            getContext: vi.fn(() => ({
                textBaseline: "",
                font: "",
                fillText: vi.fn()
            })),
            toDataURL: vi.fn(() => "mock-canvas-data")
        })),
        referrer: "https://example.com"
    },
    writable: true
});

import {
    getPublicChatInterface,
    createChatSession,
    getChatSessionMessages,
    sendChatMessage
} from "../../lib/api";
import { usePublicChatStore } from "../publicChatStore";

// Mock data factories
function createMockChatInterface(overrides?: Record<string, unknown>) {
    const defaults = {
        id: "interface-123",
        slug: "test-chat",
        title: "Test Chat",
        description: null,
        coverType: "color" as const,
        coverValue: "#3B82F6",
        iconUrl: null,
        primaryColor: "#3B82F6",
        fontFamily: "Inter",
        borderRadius: 8,
        welcomeMessage: "Hello! How can I help you today?",
        placeholderText: "Type a message...",
        suggestedPrompts: [],
        allowFileUpload: false,
        maxFiles: 5,
        maxFileSizeMb: 10,
        allowedFileTypes: [],
        persistenceType: "session" as const,
        widgetPosition: "bottom-right" as const,
        widgetButtonIcon: "chat",
        widgetButtonText: null,
        widgetInitialState: "collapsed" as const
    };
    return { ...defaults, ...overrides };
}

function createMockSession(overrides?: Record<string, unknown>) {
    const defaults = {
        sessionId: "session-123",
        sessionToken: "token-abc",
        threadId: null,
        persistenceToken: "persist-xyz",
        existingMessages: []
    };
    return { ...defaults, ...overrides };
}

function createMockMessage(overrides?: Record<string, unknown>) {
    const defaults = {
        id: "msg-123",
        role: "user" as const,
        content: "Hello!",
        timestamp: new Date().toISOString()
    };
    return { ...defaults, ...overrides };
}

// Reset store before each test
function resetStore() {
    usePublicChatStore.setState({
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

describe("publicChatStore", () => {
    beforeEach(() => {
        resetStore();
        vi.clearAllMocks();
        mockLocalStorage.clear();
    });

    afterEach(() => {
        resetStore();
    });

    // ===== Initial State =====
    describe("initial state", () => {
        it("has correct initial state", () => {
            resetStore();
            const state = usePublicChatStore.getState();

            expect(state.chatInterface).toBeNull();
            expect(state.isLoadingInterface).toBe(false);
            expect(state.session).toBeNull();
            expect(state.isCreatingSession).toBe(false);
            expect(state.messages).toEqual([]);
            expect(state.isLoadingMessages).toBe(false);
            expect(state.inputValue).toBe("");
            expect(state.isSending).toBe(false);
            expect(state.isWidgetOpen).toBe(false);
            expect(state.error).toBeNull();
        });
    });

    // ===== Load Interface =====
    describe("loadInterface", () => {
        it("loads interface successfully", async () => {
            const mockInterface = createMockChatInterface();

            vi.mocked(getPublicChatInterface).mockResolvedValue({
                success: true,
                data: mockInterface
            });

            const result = await usePublicChatStore.getState().loadInterface("test-chat");

            expect(result).toBe(true);
            const state = usePublicChatStore.getState();
            expect(state.chatInterface).toEqual(mockInterface);
            expect(state.isLoadingInterface).toBe(false);
            expect(state.error).toBeNull();
        });

        it("sets loading state during fetch", async () => {
            vi.mocked(getPublicChatInterface).mockImplementation(async () => {
                expect(usePublicChatStore.getState().isLoadingInterface).toBe(true);
                return { success: true, data: createMockChatInterface() };
            });

            await usePublicChatStore.getState().loadInterface("test-chat");
        });

        it("sets widget open when widgetInitialState is expanded", async () => {
            const mockInterface = createMockChatInterface({
                widgetInitialState: "expanded"
            });

            vi.mocked(getPublicChatInterface).mockResolvedValue({
                success: true,
                data: mockInterface
            });

            await usePublicChatStore.getState().loadInterface("test-chat");

            expect(usePublicChatStore.getState().isWidgetOpen).toBe(true);
        });

        it("handles load error", async () => {
            vi.mocked(getPublicChatInterface).mockRejectedValue(new Error("Network error"));

            const result = await usePublicChatStore.getState().loadInterface("test-chat");

            expect(result).toBe(false);
            const state = usePublicChatStore.getState();
            expect(state.error).toBe("Network error");
            expect(state.isLoadingInterface).toBe(false);
        });

        it("handles unsuccessful response", async () => {
            vi.mocked(getPublicChatInterface).mockResolvedValue({
                success: false,
                data: null as unknown as ReturnType<typeof createMockChatInterface>,
                error: "Interface not found"
            });

            const result = await usePublicChatStore.getState().loadInterface("test-chat");

            expect(result).toBe(false);
            expect(usePublicChatStore.getState().error).toBe("Interface not found");
        });
    });

    // ===== Init Session =====
    describe("initSession", () => {
        it("creates session successfully", async () => {
            const mockInterface = createMockChatInterface();
            const mockSession = createMockSession();

            usePublicChatStore.setState({ chatInterface: mockInterface });

            vi.mocked(createChatSession).mockResolvedValue({
                success: true,
                data: mockSession
            });

            const result = await usePublicChatStore.getState().initSession("test-chat");

            expect(result).toBe(true);
            const state = usePublicChatStore.getState();
            expect(state.session).toEqual(mockSession);
            expect(state.isCreatingSession).toBe(false);
        });

        it("requires chatInterface to be loaded", async () => {
            const result = await usePublicChatStore.getState().initSession("test-chat");

            expect(result).toBe(false);
            expect(usePublicChatStore.getState().error).toBe("Chat interface not loaded");
        });

        it("loads existing messages when resuming", async () => {
            const existingMessages = [
                createMockMessage({ id: "msg-1", content: "Hello" }),
                createMockMessage({ id: "msg-2", role: "assistant", content: "Hi there!" })
            ];

            usePublicChatStore.setState({
                chatInterface: createMockChatInterface()
            });

            vi.mocked(createChatSession).mockResolvedValue({
                success: true,
                data: createMockSession({ existingMessages })
            });

            await usePublicChatStore.getState().initSession("test-chat");

            expect(usePublicChatStore.getState().messages).toHaveLength(2);
        });

        it("saves persistence token for local_storage type", async () => {
            usePublicChatStore.setState({
                chatInterface: createMockChatInterface({
                    persistenceType: "local_storage"
                })
            });

            vi.mocked(createChatSession).mockResolvedValue({
                success: true,
                data: createMockSession({ persistenceToken: "persist-123" })
            });

            await usePublicChatStore.getState().initSession("test-chat");

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                "flowmaestro_chat_test-chat",
                "persist-123"
            );
        });

        it("handles session creation error", async () => {
            usePublicChatStore.setState({
                chatInterface: createMockChatInterface()
            });

            vi.mocked(createChatSession).mockRejectedValue(new Error("Session error"));

            const result = await usePublicChatStore.getState().initSession("test-chat");

            expect(result).toBe(false);
            expect(usePublicChatStore.getState().error).toBe("Session error");
        });
    });

    // ===== Load Messages =====
    describe("loadMessages", () => {
        it("loads messages successfully", async () => {
            const mockMessages = [
                createMockMessage({ id: "msg-1" }),
                createMockMessage({ id: "msg-2", role: "assistant" })
            ];

            usePublicChatStore.setState({
                chatInterface: createMockChatInterface(),
                session: createMockSession()
            });

            vi.mocked(getChatSessionMessages).mockResolvedValue({
                success: true,
                data: { messages: mockMessages, sessionId: "session-123", messageCount: 2 }
            });

            const result = await usePublicChatStore.getState().loadMessages();

            expect(result).toBe(true);
            expect(usePublicChatStore.getState().messages).toHaveLength(2);
        });

        it("returns false without session", async () => {
            const result = await usePublicChatStore.getState().loadMessages();
            expect(result).toBe(false);
        });

        it("handles load error", async () => {
            usePublicChatStore.setState({
                chatInterface: createMockChatInterface(),
                session: createMockSession()
            });

            vi.mocked(getChatSessionMessages).mockRejectedValue(new Error("Load failed"));

            const result = await usePublicChatStore.getState().loadMessages();

            expect(result).toBe(false);
            expect(usePublicChatStore.getState().error).toBe("Load failed");
        });
    });

    // ===== Send Message =====
    describe("sendMessage", () => {
        beforeEach(() => {
            usePublicChatStore.setState({
                chatInterface: createMockChatInterface(),
                session: createMockSession()
            });
        });

        it("sends message successfully with optimistic update", async () => {
            vi.mocked(sendChatMessage).mockResolvedValue({
                success: true,
                data: { executionId: "exec-123", threadId: "thread-123", status: "running" }
            });

            const result = await usePublicChatStore.getState().sendMessage("Hello!");

            expect(result).toBe(true);
            const state = usePublicChatStore.getState();
            expect(state.messages).toHaveLength(1);
            expect(state.messages[0].content).toBe("Hello!");
            expect(state.messages[0].id).toMatch(/^temp_\d+$/); // Temp ID until SSE updates
            expect(state.isSending).toBe(false);
        });

        it("clears input value after sending", async () => {
            usePublicChatStore.setState({ inputValue: "Hello!" });

            vi.mocked(sendChatMessage).mockResolvedValue({
                success: true,
                data: { executionId: "exec-123", threadId: "thread-123", status: "running" }
            });

            await usePublicChatStore.getState().sendMessage("Hello!");

            expect(usePublicChatStore.getState().inputValue).toBe("");
        });

        it("returns false for empty message", async () => {
            const result = await usePublicChatStore.getState().sendMessage("   ");
            expect(result).toBe(false);
            expect(sendChatMessage).not.toHaveBeenCalled();
        });

        it("requires session to be initialized", async () => {
            usePublicChatStore.setState({ session: null });

            const result = await usePublicChatStore.getState().sendMessage("Hello!");

            expect(result).toBe(false);
            expect(usePublicChatStore.getState().error).toBe("Session not initialized");
        });

        it("reverts optimistic update on failure", async () => {
            vi.mocked(sendChatMessage).mockRejectedValue(new Error("Send failed"));

            await usePublicChatStore.getState().sendMessage("Hello!");

            const state = usePublicChatStore.getState();
            expect(state.messages).toHaveLength(0); // Message reverted
            expect(state.error).toBe("Send failed");
        });

        it("reverts on unsuccessful response", async () => {
            vi.mocked(sendChatMessage).mockResolvedValue({
                success: false,
                data: null as unknown as { executionId: string; threadId: string; status: string },
                error: "Rate limited"
            });

            await usePublicChatStore.getState().sendMessage("Hello!");

            expect(usePublicChatStore.getState().messages).toHaveLength(0);
            expect(usePublicChatStore.getState().error).toBe("Rate limited");
        });
    });

    // ===== Add Local Message =====
    describe("addLocalMessage", () => {
        it("adds message to list", () => {
            const message = createMockMessage();

            usePublicChatStore.getState().addLocalMessage(message);

            expect(usePublicChatStore.getState().messages).toHaveLength(1);
            expect(usePublicChatStore.getState().messages[0]).toEqual(message);
        });

        it("appends to existing messages", () => {
            usePublicChatStore.setState({
                messages: [createMockMessage({ id: "existing" })]
            });

            usePublicChatStore.getState().addLocalMessage(createMockMessage({ id: "new-msg" }));

            expect(usePublicChatStore.getState().messages).toHaveLength(2);
        });
    });

    // ===== Input State =====
    describe("setInputValue", () => {
        it("updates input value", () => {
            usePublicChatStore.getState().setInputValue("Hello world");
            expect(usePublicChatStore.getState().inputValue).toBe("Hello world");
        });
    });

    // ===== Widget State =====
    describe("widget controls", () => {
        it("toggles widget", () => {
            expect(usePublicChatStore.getState().isWidgetOpen).toBe(false);

            usePublicChatStore.getState().toggleWidget();
            expect(usePublicChatStore.getState().isWidgetOpen).toBe(true);

            usePublicChatStore.getState().toggleWidget();
            expect(usePublicChatStore.getState().isWidgetOpen).toBe(false);
        });

        it("opens widget", () => {
            usePublicChatStore.getState().openWidget();
            expect(usePublicChatStore.getState().isWidgetOpen).toBe(true);
        });

        it("closes widget", () => {
            usePublicChatStore.setState({ isWidgetOpen: true });
            usePublicChatStore.getState().closeWidget();
            expect(usePublicChatStore.getState().isWidgetOpen).toBe(false);
        });
    });

    // ===== Error Handling =====
    describe("setError", () => {
        it("sets error", () => {
            usePublicChatStore.getState().setError("Something went wrong");
            expect(usePublicChatStore.getState().error).toBe("Something went wrong");
        });

        it("clears error with null", () => {
            usePublicChatStore.setState({ error: "Some error" });
            usePublicChatStore.getState().setError(null);
            expect(usePublicChatStore.getState().error).toBeNull();
        });
    });

    // ===== Reset =====
    describe("reset", () => {
        it("resets all state", () => {
            usePublicChatStore.setState({
                chatInterface: createMockChatInterface(),
                isLoadingInterface: true,
                session: createMockSession(),
                isCreatingSession: true,
                messages: [createMockMessage()],
                isLoadingMessages: true,
                inputValue: "test",
                isSending: true,
                isWidgetOpen: true,
                error: "some error"
            });

            usePublicChatStore.getState().reset();

            const state = usePublicChatStore.getState();
            expect(state.chatInterface).toBeNull();
            expect(state.isLoadingInterface).toBe(false);
            expect(state.session).toBeNull();
            expect(state.isCreatingSession).toBe(false);
            expect(state.messages).toEqual([]);
            expect(state.isLoadingMessages).toBe(false);
            expect(state.inputValue).toBe("");
            expect(state.isSending).toBe(false);
            expect(state.isWidgetOpen).toBe(false);
            expect(state.error).toBeNull();
        });
    });
});
