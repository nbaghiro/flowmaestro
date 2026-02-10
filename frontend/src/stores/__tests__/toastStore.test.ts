/**
 * Toast Store Tests
 *
 * Tests for toast notification state management using Zustand.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useToastStore } from "../toastStore";

// Reset store before each test
function resetStore() {
    useToastStore.setState({ toasts: [] });
}

describe("toastStore", () => {
    beforeEach(() => {
        resetStore();
    });

    // ===== Initial State =====
    describe("initial state", () => {
        it("has empty toasts array", () => {
            const state = useToastStore.getState();
            expect(state.toasts).toEqual([]);
        });
    });

    // ===== addToast =====
    describe("addToast", () => {
        it("adds a toast with required fields", () => {
            useToastStore.getState().addToast("success", "Operation completed");

            const state = useToastStore.getState();
            expect(state.toasts).toHaveLength(1);
            expect(state.toasts[0].type).toBe("success");
            expect(state.toasts[0].title).toBe("Operation completed");
            expect(state.toasts[0].id).toMatch(/^toast-\d+$/);
        });

        it("adds a toast with message option", () => {
            useToastStore.getState().addToast("error", "Failed", { message: "Network error" });

            const state = useToastStore.getState();
            expect(state.toasts[0].message).toBe("Network error");
        });

        it("adds a toast with duration option", () => {
            useToastStore.getState().addToast("info", "Processing", { duration: 10000 });

            const state = useToastStore.getState();
            expect(state.toasts[0].duration).toBe(10000);
        });

        it("adds a toast with all options", () => {
            useToastStore.getState().addToast("warning", "Check input", {
                message: "Some fields are missing",
                duration: 8000
            });

            const state = useToastStore.getState();
            expect(state.toasts[0].type).toBe("warning");
            expect(state.toasts[0].title).toBe("Check input");
            expect(state.toasts[0].message).toBe("Some fields are missing");
            expect(state.toasts[0].duration).toBe(8000);
        });

        it("adds multiple toasts", () => {
            useToastStore.getState().addToast("success", "First");
            useToastStore.getState().addToast("error", "Second");
            useToastStore.getState().addToast("info", "Third");

            const state = useToastStore.getState();
            expect(state.toasts).toHaveLength(3);
            expect(state.toasts[0].title).toBe("First");
            expect(state.toasts[1].title).toBe("Second");
            expect(state.toasts[2].title).toBe("Third");
        });

        it("generates unique IDs for each toast", () => {
            useToastStore.getState().addToast("success", "First");
            useToastStore.getState().addToast("success", "Second");

            const state = useToastStore.getState();
            expect(state.toasts[0].id).not.toBe(state.toasts[1].id);
        });

        it("supports all toast types", () => {
            useToastStore.getState().addToast("success", "Success");
            useToastStore.getState().addToast("error", "Error");
            useToastStore.getState().addToast("warning", "Warning");
            useToastStore.getState().addToast("info", "Info");

            const state = useToastStore.getState();
            expect(state.toasts.map((t) => t.type)).toEqual([
                "success",
                "error",
                "warning",
                "info"
            ]);
        });
    });

    // ===== removeToast =====
    describe("removeToast", () => {
        it("removes a toast by ID", () => {
            useToastStore.getState().addToast("success", "First");
            useToastStore.getState().addToast("error", "Second");

            const state = useToastStore.getState();
            const toastToRemove = state.toasts[0];

            useToastStore.getState().removeToast(toastToRemove.id);

            const newState = useToastStore.getState();
            expect(newState.toasts).toHaveLength(1);
            expect(newState.toasts[0].title).toBe("Second");
        });

        it("does nothing when removing non-existent ID", () => {
            useToastStore.getState().addToast("success", "First");

            useToastStore.getState().removeToast("non-existent-id");

            const state = useToastStore.getState();
            expect(state.toasts).toHaveLength(1);
        });

        it("removes correct toast from middle", () => {
            useToastStore.getState().addToast("success", "First");
            useToastStore.getState().addToast("error", "Second");
            useToastStore.getState().addToast("info", "Third");

            const state = useToastStore.getState();
            const middleToast = state.toasts[1];

            useToastStore.getState().removeToast(middleToast.id);

            const newState = useToastStore.getState();
            expect(newState.toasts).toHaveLength(2);
            expect(newState.toasts[0].title).toBe("First");
            expect(newState.toasts[1].title).toBe("Third");
        });

        it("can remove all toasts one by one", () => {
            useToastStore.getState().addToast("success", "First");
            useToastStore.getState().addToast("error", "Second");

            const state = useToastStore.getState();
            const ids = state.toasts.map((t) => t.id);

            ids.forEach((id) => useToastStore.getState().removeToast(id));

            const newState = useToastStore.getState();
            expect(newState.toasts).toHaveLength(0);
        });
    });

    // ===== Edge Cases =====
    describe("edge cases", () => {
        it("handles empty title", () => {
            useToastStore.getState().addToast("info", "");

            const state = useToastStore.getState();
            expect(state.toasts[0].title).toBe("");
        });

        it("handles undefined options", () => {
            useToastStore.getState().addToast("success", "Test", undefined);

            const state = useToastStore.getState();
            expect(state.toasts[0].message).toBeUndefined();
            expect(state.toasts[0].duration).toBeUndefined();
        });

        it("handles empty options object", () => {
            useToastStore.getState().addToast("success", "Test", {});

            const state = useToastStore.getState();
            expect(state.toasts[0].message).toBeUndefined();
            expect(state.toasts[0].duration).toBeUndefined();
        });
    });
});
