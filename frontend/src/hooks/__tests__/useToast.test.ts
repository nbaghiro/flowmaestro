/**
 * useToast Hook Tests
 *
 * Tests for the toast notification hook API.
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useToastStore } from "../../stores/toastStore";
import { useToast } from "../useToast";

// Reset store before each test
function resetStore() {
    useToastStore.setState({ toasts: [] });
}

describe("useToast", () => {
    beforeEach(() => {
        resetStore();
    });

    // ===== Hook API =====
    describe("hook API", () => {
        it("returns show, success, error, warning, and info methods", () => {
            const { result } = renderHook(() => useToast());

            expect(typeof result.current.show).toBe("function");
            expect(typeof result.current.success).toBe("function");
            expect(typeof result.current.error).toBe("function");
            expect(typeof result.current.warning).toBe("function");
            expect(typeof result.current.info).toBe("function");
        });
    });

    // ===== show method =====
    describe("show method", () => {
        it("adds toast with specified type", () => {
            const { result } = renderHook(() => useToast());

            act(() => {
                result.current.show("success", "Test message");
            });

            const state = useToastStore.getState();
            expect(state.toasts).toHaveLength(1);
            expect(state.toasts[0].type).toBe("success");
            expect(state.toasts[0].title).toBe("Test message");
        });

        it("passes options to store", () => {
            const { result } = renderHook(() => useToast());

            act(() => {
                result.current.show("info", "Test", {
                    message: "Details",
                    duration: 3000
                });
            });

            const state = useToastStore.getState();
            expect(state.toasts[0].message).toBe("Details");
            expect(state.toasts[0].duration).toBe(3000);
        });
    });

    // ===== success method =====
    describe("success method", () => {
        it("adds success toast", () => {
            const { result } = renderHook(() => useToast());

            act(() => {
                result.current.success("Operation completed");
            });

            const state = useToastStore.getState();
            expect(state.toasts[0].type).toBe("success");
            expect(state.toasts[0].title).toBe("Operation completed");
        });

        it("accepts options", () => {
            const { result } = renderHook(() => useToast());

            act(() => {
                result.current.success("Saved", { message: "All changes saved" });
            });

            const state = useToastStore.getState();
            expect(state.toasts[0].message).toBe("All changes saved");
        });
    });

    // ===== error method =====
    describe("error method", () => {
        it("adds error toast", () => {
            const { result } = renderHook(() => useToast());

            act(() => {
                result.current.error("Failed to save");
            });

            const state = useToastStore.getState();
            expect(state.toasts[0].type).toBe("error");
            expect(state.toasts[0].title).toBe("Failed to save");
        });

        it("accepts options", () => {
            const { result } = renderHook(() => useToast());

            act(() => {
                result.current.error("Network error", { message: "Check connection" });
            });

            const state = useToastStore.getState();
            expect(state.toasts[0].message).toBe("Check connection");
        });
    });

    // ===== warning method =====
    describe("warning method", () => {
        it("adds warning toast", () => {
            const { result } = renderHook(() => useToast());

            act(() => {
                result.current.warning("Check your input");
            });

            const state = useToastStore.getState();
            expect(state.toasts[0].type).toBe("warning");
            expect(state.toasts[0].title).toBe("Check your input");
        });

        it("accepts options", () => {
            const { result } = renderHook(() => useToast());

            act(() => {
                result.current.warning("Warning", { duration: 7000 });
            });

            const state = useToastStore.getState();
            expect(state.toasts[0].duration).toBe(7000);
        });
    });

    // ===== info method =====
    describe("info method", () => {
        it("adds info toast", () => {
            const { result } = renderHook(() => useToast());

            act(() => {
                result.current.info("Processing...");
            });

            const state = useToastStore.getState();
            expect(state.toasts[0].type).toBe("info");
            expect(state.toasts[0].title).toBe("Processing...");
        });

        it("accepts options", () => {
            const { result } = renderHook(() => useToast());

            act(() => {
                result.current.info("Loading", { message: "Please wait", duration: 0 });
            });

            const state = useToastStore.getState();
            expect(state.toasts[0].message).toBe("Please wait");
            expect(state.toasts[0].duration).toBe(0);
        });
    });

    // ===== Multiple toasts =====
    describe("multiple toasts", () => {
        it("can add multiple toasts of different types", () => {
            const { result } = renderHook(() => useToast());

            act(() => {
                result.current.success("Success");
                result.current.error("Error");
                result.current.warning("Warning");
                result.current.info("Info");
            });

            const state = useToastStore.getState();
            expect(state.toasts).toHaveLength(4);
            expect(state.toasts.map((t) => t.type)).toEqual([
                "success",
                "error",
                "warning",
                "info"
            ]);
        });

        it("maintains toast order", () => {
            const { result } = renderHook(() => useToast());

            act(() => {
                result.current.info("First");
                result.current.info("Second");
                result.current.info("Third");
            });

            const state = useToastStore.getState();
            expect(state.toasts.map((t) => t.title)).toEqual(["First", "Second", "Third"]);
        });
    });

    // ===== Multiple hook instances =====
    describe("multiple hook instances", () => {
        it("shares state between hook instances", () => {
            const { result: result1 } = renderHook(() => useToast());
            const { result: result2 } = renderHook(() => useToast());

            act(() => {
                result1.current.success("From hook 1");
            });

            act(() => {
                result2.current.error("From hook 2");
            });

            const state = useToastStore.getState();
            expect(state.toasts).toHaveLength(2);
            expect(state.toasts[0].title).toBe("From hook 1");
            expect(state.toasts[1].title).toBe("From hook 2");
        });
    });
});
