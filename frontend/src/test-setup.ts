/**
 * Vitest test setup file
 * Mocks browser APIs and provides global test utilities
 */

import { vi } from "vitest";

// Mock localStorage
const localStorageMock = {
    store: {} as Record<string, string>,
    getItem(key: string) {
        return this.store[key] || null;
    },
    setItem(key: string, value: string) {
        this.store[key] = value;
    },
    removeItem(key: string) {
        delete this.store[key];
    },
    clear() {
        this.store = {};
    }
};

// Mock sessionStorage
const sessionStorageMock = {
    store: {} as Record<string, string>,
    getItem(key: string) {
        return this.store[key] || null;
    },
    setItem(key: string, value: string) {
        this.store[key] = value;
    },
    removeItem(key: string) {
        delete this.store[key];
    },
    clear() {
        this.store = {};
    }
};

// Apply mocks to global
Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    writable: true
});

Object.defineProperty(globalThis, "sessionStorage", {
    value: sessionStorageMock,
    writable: true
});

// Mock navigator
Object.defineProperty(globalThis, "navigator", {
    value: {
        userAgent: "vitest",
        sendBeacon: vi.fn(() => true)
    },
    writable: true
});

// Mock EventSource for SSE tests
export class MockEventSource {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSED = 2;

    url: string;
    readyState: number = MockEventSource.CONNECTING;
    onopen: ((event: Event) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;

    private listeners: Map<string, Set<(event: Event) => void>> = new Map();
    private _shouldAutoConnect = true;

    constructor(url: string) {
        this.url = url;
        // Auto-connect after a microtask
        if (this._shouldAutoConnect) {
            Promise.resolve().then(() => {
                if (this.readyState !== MockEventSource.CLOSED) {
                    this.simulateOpen();
                }
            });
        }
    }

    addEventListener(type: string, listener: (event: Event) => void): void {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type)!.add(listener);
    }

    removeEventListener(type: string, listener: (event: Event) => void): void {
        this.listeners.get(type)?.delete(listener);
    }

    close(): void {
        this.readyState = MockEventSource.CLOSED;
    }

    // Test helpers
    simulateOpen(): void {
        this.readyState = MockEventSource.OPEN;
        const event = new Event("open");
        this.onopen?.(event);
    }

    simulateError(): void {
        this.readyState = MockEventSource.CLOSED;
        const event = new Event("error");
        this.onerror?.(event);
    }

    simulateMessage(type: string, data: unknown, lastEventId?: string): void {
        const event = new MessageEvent(type, {
            data: typeof data === "string" ? data : JSON.stringify(data),
            lastEventId
        });

        // Dispatch to specific listeners
        const handlers = this.listeners.get(type);
        if (handlers) {
            handlers.forEach((handler) => handler(event));
        }

        // Also dispatch to onmessage if it's a generic message
        if (type === "message" && this.onmessage) {
            this.onmessage(event);
        }
    }
}

// Apply EventSource mock globally
Object.defineProperty(globalThis, "EventSource", {
    value: MockEventSource,
    writable: true
});

// Message event handlers for OAuth tests
const messageHandlers: Set<(event: MessageEvent) => void> = new Set();

// Mock window with full functionality
const windowMock = {
    location: {
        pathname: "/test",
        href: "http://localhost:3000/test",
        hash: "",
        origin: "http://localhost:3000"
    },
    history: {
        replaceState: vi.fn()
    },
    addEventListener: vi.fn((type: string, handler: (event: Event) => void) => {
        if (type === "message") {
            messageHandlers.add(handler as (event: MessageEvent) => void);
        }
    }),
    removeEventListener: vi.fn((type: string, handler: (event: Event) => void) => {
        if (type === "message") {
            messageHandlers.delete(handler as (event: MessageEvent) => void);
        }
    }),
    open: vi.fn(() => ({
        closed: false,
        close: vi.fn()
    })),
    postMessage: vi.fn((message: unknown) => {
        // Simulate message event to all handlers
        const event = new MessageEvent("message", {
            data: message,
            origin: "http://localhost:3000"
        });
        messageHandlers.forEach((handler) => handler(event));
    }),
    screenX: 0,
    screenY: 0,
    outerWidth: 1024,
    outerHeight: 768
};

Object.defineProperty(globalThis, "window", {
    value: windowMock,
    writable: true
});

// Mock fetch
globalThis.fetch = vi.fn(() =>
    Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(""),
        headers: new Headers()
    } as Response)
);

// Mock import.meta.env
Object.defineProperty(import.meta, "env", {
    value: {
        VITE_API_URL: "http://localhost:3001",
        MODE: "test"
    },
    writable: true
});

// Reset mocks before each test
beforeEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
    messageHandlers.clear();
    vi.clearAllMocks();
    // Reset window.location.hash
    windowMock.location.hash = "";
});

// Export for test files that need direct access
export { localStorageMock, sessionStorageMock, windowMock, messageHandlers };
