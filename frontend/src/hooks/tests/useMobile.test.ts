/**
 * useMobile Hook Tests
 *
 * Tests for mobile viewport detection using renderHook.
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMobile } from "../useMobile";

describe("useMobile", () => {
    let matchMediaListeners: Map<string, (event: MediaQueryListEvent) => void>;
    let currentMatches: boolean;

    beforeEach(() => {
        matchMediaListeners = new Map();
        currentMatches = false;

        // Mock matchMedia with controllable state
        window.matchMedia = vi.fn((query: string) => {
            const mediaQueryList = {
                matches: currentMatches,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(
                    (event: string, handler: (e: MediaQueryListEvent) => void) => {
                        if (event === "change") {
                            matchMediaListeners.set(query, handler);
                        }
                    }
                ),
                removeEventListener: vi.fn((event: string) => {
                    if (event === "change") {
                        matchMediaListeners.delete(query);
                    }
                }),
                dispatchEvent: vi.fn(() => true)
            };
            return mediaQueryList as unknown as MediaQueryList;
        });
    });

    it("returns false initially (SSR-safe default)", () => {
        const { result } = renderHook(() => useMobile());
        expect(result.current).toBe(false);
    });

    it("returns true when viewport matches mobile breakpoint", () => {
        currentMatches = true;
        const { result } = renderHook(() => useMobile());
        expect(result.current).toBe(true);
    });

    it("updates when media query changes from desktop to mobile", () => {
        currentMatches = false;
        const { result } = renderHook(() => useMobile());

        expect(result.current).toBe(false);

        // Simulate viewport change to mobile
        act(() => {
            const listener = matchMediaListeners.get("(max-width: 767px)");
            if (listener) {
                listener({ matches: true } as MediaQueryListEvent);
            }
        });

        expect(result.current).toBe(true);
    });

    it("updates when media query changes from mobile to desktop", () => {
        currentMatches = true;
        const { result } = renderHook(() => useMobile());

        expect(result.current).toBe(true);

        // Simulate viewport change to desktop
        act(() => {
            const listener = matchMediaListeners.get("(max-width: 767px)");
            if (listener) {
                listener({ matches: false } as MediaQueryListEvent);
            }
        });

        expect(result.current).toBe(false);
    });

    it("cleans up event listener on unmount", () => {
        const { unmount } = renderHook(() => useMobile());

        expect(matchMediaListeners.size).toBe(1);

        unmount();

        // The removeEventListener was called (map cleared by our mock)
        expect(matchMediaListeners.size).toBe(0);
    });

    it("uses correct breakpoint (767px = Tailwind md - 1)", () => {
        renderHook(() => useMobile());

        expect(window.matchMedia).toHaveBeenCalledWith("(max-width: 767px)");
    });
});
