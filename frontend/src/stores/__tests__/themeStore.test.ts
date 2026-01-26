/**
 * Theme Store Tests
 *
 * Tests for theme state management including light/dark/system modes
 * and DOM manipulation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock localStorage
const mockLocalStorage = {
    store: {} as Record<string, string>,
    getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage.store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
        delete mockLocalStorage.store[key];
    }),
    clear: vi.fn(() => {
        mockLocalStorage.store = {};
    })
};
Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage });

// Mock document.documentElement
const mockClassList = {
    classes: new Set<string>(),
    add: vi.fn((cls: string) => mockClassList.classes.add(cls)),
    remove: vi.fn((cls: string) => mockClassList.classes.delete(cls)),
    contains: vi.fn((cls: string) => mockClassList.classes.has(cls))
};

Object.defineProperty(globalThis, "document", {
    value: {
        documentElement: {
            classList: mockClassList
        }
    },
    writable: true
});

// Mock matchMedia
let mockDarkModePreference = false;
const mockMediaQueryListeners: Array<() => void> = [];
const mockMatchMedia = vi.fn(() => ({
    matches: mockDarkModePreference,
    addEventListener: vi.fn((_event: string, handler: () => void) => {
        mockMediaQueryListeners.push(handler);
    }),
    removeEventListener: vi.fn()
}));
Object.defineProperty(globalThis, "window", {
    value: {
        matchMedia: mockMatchMedia
    },
    writable: true
});

import { useThemeStore } from "../themeStore";

// Reset store before each test
function resetStore() {
    useThemeStore.setState({
        theme: "light",
        effectiveTheme: "light"
    });
}

describe("themeStore", () => {
    beforeEach(() => {
        resetStore();
        vi.clearAllMocks();
        mockLocalStorage.clear();
        mockClassList.classes.clear();
        mockDarkModePreference = false;
        mockMediaQueryListeners.length = 0;
    });

    afterEach(() => {
        resetStore();
    });

    // ===== Initial State =====
    describe("initial state", () => {
        it("has correct initial state", () => {
            resetStore();
            const state = useThemeStore.getState();

            expect(state.theme).toBe("light");
            expect(state.effectiveTheme).toBe("light");
        });
    });

    // ===== setTheme =====
    describe("setTheme", () => {
        it("sets theme to light", () => {
            useThemeStore.getState().setTheme("light");

            const state = useThemeStore.getState();
            expect(state.theme).toBe("light");
            expect(state.effectiveTheme).toBe("light");
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "light");
        });

        it("sets theme to dark", () => {
            useThemeStore.getState().setTheme("dark");

            const state = useThemeStore.getState();
            expect(state.theme).toBe("dark");
            expect(state.effectiveTheme).toBe("dark");
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "dark");
        });

        it("sets theme to system with light preference", () => {
            mockDarkModePreference = false;

            useThemeStore.getState().setTheme("system");

            const state = useThemeStore.getState();
            expect(state.theme).toBe("system");
            expect(state.effectiveTheme).toBe("light");
        });

        it("sets theme to system with dark preference", () => {
            mockDarkModePreference = true;

            useThemeStore.getState().setTheme("system");

            const state = useThemeStore.getState();
            expect(state.theme).toBe("system");
            expect(state.effectiveTheme).toBe("dark");
        });

        it("adds dark class to DOM for dark theme", () => {
            useThemeStore.getState().setTheme("dark");

            expect(mockClassList.add).toHaveBeenCalledWith("dark");
        });

        it("removes dark class from DOM for light theme", () => {
            mockClassList.classes.add("dark");

            useThemeStore.getState().setTheme("light");

            expect(mockClassList.remove).toHaveBeenCalledWith("dark");
        });

        it("persists theme to localStorage", () => {
            useThemeStore.getState().setTheme("dark");

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "dark");
        });
    });

    // ===== initializeTheme =====
    describe("initializeTheme", () => {
        it("loads saved theme from localStorage", () => {
            mockLocalStorage.store["theme"] = "dark";

            useThemeStore.getState().initializeTheme();

            const state = useThemeStore.getState();
            expect(state.theme).toBe("dark");
            expect(state.effectiveTheme).toBe("dark");
        });

        it("defaults to light when no saved theme", () => {
            useThemeStore.getState().initializeTheme();

            const state = useThemeStore.getState();
            expect(state.theme).toBe("light");
            expect(state.effectiveTheme).toBe("light");
        });

        it("applies theme to DOM immediately", () => {
            mockLocalStorage.store["theme"] = "dark";

            useThemeStore.getState().initializeTheme();

            expect(mockClassList.add).toHaveBeenCalledWith("dark");
        });

        it("loads system theme and respects dark preference", () => {
            mockLocalStorage.store["theme"] = "system";
            mockDarkModePreference = true;

            useThemeStore.getState().initializeTheme();

            const state = useThemeStore.getState();
            expect(state.theme).toBe("system");
            expect(state.effectiveTheme).toBe("dark");
        });

        it("loads system theme and respects light preference", () => {
            mockLocalStorage.store["theme"] = "system";
            mockDarkModePreference = false;

            useThemeStore.getState().initializeTheme();

            const state = useThemeStore.getState();
            expect(state.theme).toBe("system");
            expect(state.effectiveTheme).toBe("light");
        });

        it("registers listener for system theme changes", () => {
            mockLocalStorage.store["theme"] = "system";

            useThemeStore.getState().initializeTheme();

            expect(mockMatchMedia).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
        });
    });

    // ===== Theme Switching =====
    describe("theme switching", () => {
        it("switches from light to dark", () => {
            useThemeStore.getState().setTheme("light");
            expect(useThemeStore.getState().effectiveTheme).toBe("light");

            useThemeStore.getState().setTheme("dark");
            expect(useThemeStore.getState().effectiveTheme).toBe("dark");
        });

        it("switches from dark to light", () => {
            useThemeStore.getState().setTheme("dark");
            expect(useThemeStore.getState().effectiveTheme).toBe("dark");

            useThemeStore.getState().setTheme("light");
            expect(useThemeStore.getState().effectiveTheme).toBe("light");
        });

        it("switches from specific to system", () => {
            mockDarkModePreference = true;

            useThemeStore.getState().setTheme("light");
            expect(useThemeStore.getState().effectiveTheme).toBe("light");

            useThemeStore.getState().setTheme("system");
            expect(useThemeStore.getState().effectiveTheme).toBe("dark");
        });

        it("switches from system to specific", () => {
            mockDarkModePreference = true;

            useThemeStore.getState().setTheme("system");
            expect(useThemeStore.getState().effectiveTheme).toBe("dark");

            useThemeStore.getState().setTheme("light");
            expect(useThemeStore.getState().effectiveTheme).toBe("light");
        });
    });
});
