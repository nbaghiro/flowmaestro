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

// Mock window.location
Object.defineProperty(globalThis, "window", {
    value: {
        location: {
            pathname: "/test",
            href: "http://localhost:3000/test"
        },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
    },
    writable: true
});

// Mock fetch
globalThis.fetch = vi.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
    } as Response)
);

// Reset mocks before each test
beforeEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
    vi.clearAllMocks();
});
