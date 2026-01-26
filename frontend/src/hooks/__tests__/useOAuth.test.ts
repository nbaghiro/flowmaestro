/**
 * useOAuth Hook Tests
 *
 * Tests for the OAuth integration hook using renderHook.
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createMockFetchResponse,
    createMockApiResponse,
    createMockApiError,
    createMockAuthToken,
    mockFetchOnce
} from "../../lib/__tests__/test-helpers";
import { useOAuth } from "../useOAuth";

// Mock the workspace store
const mockGetCurrentWorkspaceId = vi.fn(() => "workspace-123");
vi.mock("../../stores/workspaceStore", () => ({
    getCurrentWorkspaceId: () => mockGetCurrentWorkspaceId()
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

describe("useOAuth", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        localStorage.setItem("auth_token", createMockAuthToken());
        mockGetCurrentWorkspaceId.mockReturnValue("workspace-123");
    });

    // ===== Initial State =====
    describe("initial state", () => {
        it("starts with loading false", () => {
            const { result } = renderHook(() => useOAuth());

            expect(result.current.loading).toBe(false);
        });

        it("starts with empty providers", () => {
            const { result } = renderHook(() => useOAuth());

            expect(result.current.providers).toEqual([]);
        });

        it("exposes all expected methods", () => {
            const { result } = renderHook(() => useOAuth());

            expect(typeof result.current.fetchProviders).toBe("function");
            expect(typeof result.current.initiateOAuth).toBe("function");
            expect(typeof result.current.revokeConnection).toBe("function");
            expect(typeof result.current.refreshConnection).toBe("function");
        });
    });

    // ===== fetchProviders =====
    describe("fetchProviders", () => {
        it("fetches and sets providers", async () => {
            const mockProviders = [
                { name: "google", displayName: "Google", scopes: ["email"], configured: true },
                { name: "slack", displayName: "Slack", scopes: ["chat:write"], configured: true }
            ];

            mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockProviders)));

            const { result } = renderHook(() => useOAuth());

            await act(async () => {
                await result.current.fetchProviders();
            });

            expect(result.current.providers).toHaveLength(2);
            expect(result.current.providers[0].name).toBe("google");
        });

        it("includes workspace header in request", async () => {
            mockFetchOnce(createMockFetchResponse(createMockApiResponse([])));

            const { result } = renderHook(() => useOAuth());

            await act(async () => {
                await result.current.fetchProviders();
            });

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining("/oauth/providers"),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        "X-Workspace-Id": "workspace-123"
                    })
                })
            );
        });

        it("does nothing when no auth token", async () => {
            localStorage.clear();

            const { result } = renderHook(() => useOAuth());

            await act(async () => {
                await result.current.fetchProviders();
            });

            expect(fetch).not.toHaveBeenCalled();
            expect(result.current.providers).toEqual([]);
        });

        it("handles fetch error gracefully", async () => {
            vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

            const { result } = renderHook(() => useOAuth());

            // Should not throw
            await act(async () => {
                await result.current.fetchProviders();
            });

            expect(result.current.providers).toEqual([]);
        });
    });

    // ===== initiateOAuth =====
    describe("initiateOAuth", () => {
        it("throws when not authenticated", async () => {
            localStorage.clear();

            const { result } = renderHook(() => useOAuth());

            await expect(
                act(async () => {
                    await result.current.initiateOAuth("google");
                })
            ).rejects.toThrow("Not authenticated");
        });

        it("throws when no workspace context", async () => {
            mockGetCurrentWorkspaceId.mockReturnValue(null as unknown as string);

            const { result } = renderHook(() => useOAuth());

            await expect(
                act(async () => {
                    await result.current.initiateOAuth("google");
                })
            ).rejects.toThrow("Workspace context required");
        });

        it("includes settings in authorization URL", async () => {
            mockFetchOnce(
                createMockFetchResponse(
                    createMockApiResponse({ authUrl: "https://oauth.example.com/auth" })
                )
            );

            // Mock window.open to return a mock popup
            const mockPopup = { closed: false, close: vi.fn() };
            window.open = vi.fn(() => mockPopup) as unknown as typeof window.open;

            const { result } = renderHook(() => useOAuth());

            // Start OAuth but don't wait (it will hang waiting for callback)
            result.current.initiateOAuth("zendesk", { subdomain: "mycompany" }).catch(() => {});

            // Check the URL was constructed correctly
            await waitFor(() => {
                expect(fetch).toHaveBeenCalledWith(
                    expect.stringContaining("subdomain=mycompany"),
                    expect.any(Object)
                );
            });

            // Clean up - simulate error to resolve promise
            mockPopup.closed = true;
        });

        it("sets loading to true during OAuth flow", async () => {
            mockFetchOnce(
                createMockFetchResponse(
                    createMockApiResponse({ authUrl: "https://oauth.example.com/auth" })
                )
            );

            const mockPopup = { closed: false, close: vi.fn() };
            window.open = vi.fn(() => mockPopup) as unknown as typeof window.open;

            const { result } = renderHook(() => useOAuth());

            // Start OAuth flow (don't await - it blocks waiting for callback)
            act(() => {
                result.current.initiateOAuth("google").catch(() => {});
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(true);
            });

            // Cleanup
            mockPopup.closed = true;
        });

        it("throws when popup is blocked", async () => {
            mockFetchOnce(
                createMockFetchResponse(
                    createMockApiResponse({ authUrl: "https://oauth.example.com/auth" })
                )
            );

            // Mock window.open returning null (blocked popup)
            window.open = vi.fn(() => null) as unknown as typeof window.open;

            const { result } = renderHook(() => useOAuth());

            await expect(
                act(async () => {
                    await result.current.initiateOAuth("google");
                })
            ).rejects.toThrow("Failed to open popup");
        });

        it("throws when authorization URL fetch fails", async () => {
            mockFetchOnce(
                createMockFetchResponse(createMockApiError("Provider not configured"), false, 400)
            );

            const { result } = renderHook(() => useOAuth());

            await expect(
                act(async () => {
                    await result.current.initiateOAuth("google");
                })
            ).rejects.toThrow("Provider not configured");
        });
    });

    // ===== revokeConnection =====
    describe("revokeConnection", () => {
        it("revokes connection successfully", async () => {
            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ success: true })));

            const { result } = renderHook(() => useOAuth());

            await act(async () => {
                await result.current.revokeConnection("google", "conn-123");
            });

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining("/oauth/google/revoke/conn-123"),
                expect.objectContaining({
                    method: "POST"
                })
            );
        });

        it("throws when not authenticated", async () => {
            localStorage.clear();

            const { result } = renderHook(() => useOAuth());

            await expect(
                act(async () => {
                    await result.current.revokeConnection("google", "conn-123");
                })
            ).rejects.toThrow("Not authenticated");
        });

        it("throws when no workspace context", async () => {
            mockGetCurrentWorkspaceId.mockReturnValue(null as unknown as string);

            const { result } = renderHook(() => useOAuth());

            await expect(
                act(async () => {
                    await result.current.revokeConnection("google", "conn-123");
                })
            ).rejects.toThrow("Workspace context required");
        });

        it("throws on revoke failure", async () => {
            mockFetchOnce(
                createMockFetchResponse(createMockApiError("Connection not found"), false, 404)
            );

            const { result } = renderHook(() => useOAuth());

            await expect(
                act(async () => {
                    await result.current.revokeConnection("google", "conn-123");
                })
            ).rejects.toThrow("Connection not found");
        });
    });

    // ===== refreshConnection =====
    describe("refreshConnection", () => {
        it("refreshes connection successfully", async () => {
            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ success: true })));

            const { result } = renderHook(() => useOAuth());

            await act(async () => {
                await result.current.refreshConnection("google", "conn-123");
            });

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining("/oauth/google/refresh/conn-123"),
                expect.objectContaining({
                    method: "POST"
                })
            );
        });

        it("throws when not authenticated", async () => {
            localStorage.clear();

            const { result } = renderHook(() => useOAuth());

            await expect(
                act(async () => {
                    await result.current.refreshConnection("google", "conn-123");
                })
            ).rejects.toThrow("Not authenticated");
        });

        it("throws on refresh failure", async () => {
            mockFetchOnce(createMockFetchResponse(createMockApiError("Token expired"), false, 400));

            const { result } = renderHook(() => useOAuth());

            await expect(
                act(async () => {
                    await result.current.refreshConnection("google", "conn-123");
                })
            ).rejects.toThrow("Token expired");
        });
    });
});
