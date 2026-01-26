/**
 * Vitest test setup file
 * Mocks browser APIs and provides global test utilities
 */

import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

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

// Extend jsdom's window instead of replacing it (preserves DOM classes like Element)
// Store original methods we want to spy on
const originalAddEventListener = window.addEventListener.bind(window);
const originalRemoveEventListener = window.removeEventListener.bind(window);

// Override specific methods for testing
(window as { addEventListener: typeof window.addEventListener }).addEventListener = vi.fn(
    (type: string, handler: EventListener) => {
        if (type === "message") {
            messageHandlers.add(handler as (event: MessageEvent) => void);
        }
        originalAddEventListener(type, handler);
    }
) as typeof window.addEventListener;

(window as { removeEventListener: typeof window.removeEventListener }).removeEventListener = vi.fn(
    (type: string, handler: EventListener) => {
        if (type === "message") {
            messageHandlers.delete(handler as (event: MessageEvent) => void);
        }
        originalRemoveEventListener(type, handler);
    }
) as typeof window.removeEventListener;

// Mock window.open for OAuth popup tests
window.open = vi.fn(() => ({
    closed: false,
    close: vi.fn()
})) as unknown as typeof window.open;

// Mock pointer capture APIs for Radix UI components (jsdom doesn't support these)
Element.prototype.hasPointerCapture = vi.fn(() => false);
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();

// Mock scrollIntoView (jsdom doesn't support this)
Element.prototype.scrollIntoView = vi.fn();

// Mock ResizeObserver (jsdom doesn't support this, needed for Radix UI)
class MockResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}

Object.defineProperty(globalThis, "ResizeObserver", {
    value: MockResizeObserver,
    writable: true
});

// Mock DOMMatrix for React Flow transforms (jsdom doesn't support this)
class MockDOMMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    m11 = 1;
    m12 = 0;
    m13 = 0;
    m14 = 0;
    m21 = 0;
    m22 = 1;
    m23 = 0;
    m24 = 0;
    m31 = 0;
    m32 = 0;
    m33 = 1;
    m34 = 0;
    m41 = 0;
    m42 = 0;
    m43 = 0;
    m44 = 1;
    is2D = true;
    isIdentity = true;

    inverse() {
        return new MockDOMMatrix();
    }
    multiply() {
        return new MockDOMMatrix();
    }
    translate() {
        return new MockDOMMatrix();
    }
    scale() {
        return new MockDOMMatrix();
    }
    rotate() {
        return new MockDOMMatrix();
    }
    transformPoint(point: { x: number; y: number }) {
        return point;
    }
}

Object.defineProperty(globalThis, "DOMMatrix", {
    value: MockDOMMatrix,
    writable: true
});

// Mock getBoundingClientRect with configurable return values for canvas testing
const mockBoundingClientRect = {
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    top: 0,
    right: 800,
    bottom: 600,
    left: 0,
    toJSON: () => ({})
};

Element.prototype.getBoundingClientRect = vi.fn(() => mockBoundingClientRect);

// Mock PointerEvent for React Flow drag interactions
class MockPointerEvent extends MouseEvent {
    pointerId: number;
    width: number;
    height: number;
    pressure: number;
    tangentialPressure: number;
    tiltX: number;
    tiltY: number;
    twist: number;
    pointerType: string;
    isPrimary: boolean;

    constructor(type: string, params: PointerEventInit = {}) {
        super(type, params);
        this.pointerId = params.pointerId ?? 1;
        this.width = params.width ?? 1;
        this.height = params.height ?? 1;
        this.pressure = params.pressure ?? 0;
        this.tangentialPressure = params.tangentialPressure ?? 0;
        this.tiltX = params.tiltX ?? 0;
        this.tiltY = params.tiltY ?? 0;
        this.twist = params.twist ?? 0;
        this.pointerType = params.pointerType ?? "mouse";
        this.isPrimary = params.isPrimary ?? true;
    }

    getCoalescedEvents() {
        return [];
    }
    getPredictedEvents() {
        return [];
    }
}

Object.defineProperty(globalThis, "PointerEvent", {
    value: MockPointerEvent,
    writable: true
});

// Mock matchMedia for responsive hooks
window.matchMedia = vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true)
})) as unknown as typeof window.matchMedia;

// Mock history.replaceState for OAuth tests
window.history.replaceState = vi.fn();

// Create a helper to access window for tests (with spied methods)
const windowMock = {
    ...window,
    history: {
        ...window.history,
        replaceState: window.history.replaceState
    },
    location: window.location
};

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
    // Note: window.location.hash can't be directly reset in jsdom
    // Tests that need specific hash values should use window.location.assign() or set it in the test
});

// Export for test files that need direct access
export { localStorageMock, sessionStorageMock, windowMock, messageHandlers };
