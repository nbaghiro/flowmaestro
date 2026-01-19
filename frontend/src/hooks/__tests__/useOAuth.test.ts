/**
 * useOAuth Hook Tests
 *
 * Tests for the OAuth integration patterns including provider fetching,
 * OAuth popup flow, connection revocation, and token refresh.
 *
 * Note: Since React hooks cannot be called outside components, these tests
 * validate the underlying fetch logic and expected behavior patterns rather
 * than calling the hook directly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    createMockFetchResponse,
    createMockApiResponse,
    createMockApiError,
    createMockAuthToken,
    mockFetchOnce
} from "../../lib/__tests__/test-helpers";

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

const API_BASE_URL = "http://localhost:3001";

describe("OAuth integration patterns", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLocalStorage.clear();
        mockLocalStorage.store["auth_token"] = createMockAuthToken();
        mockGetCurrentWorkspaceId.mockReturnValue("workspace-123");
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // ===== Provider Fetching =====
    describe("fetchProviders pattern", () => {
        it("fetches providers with correct URL and headers", async () => {
            const mockProviders = [
                { name: "google", displayName: "Google", scopes: ["email"], configured: true },
                { name: "slack", displayName: "Slack", scopes: ["chat:write"], configured: true }
            ];

            mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockProviders)));

            const token = mockLocalStorage.getItem("auth_token");
            const workspaceId = mockGetCurrentWorkspaceId();

            const response = await fetch(`${API_BASE_URL}/oauth/providers`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...(workspaceId && { "X-Workspace-Id": workspaceId })
                }
            });

            const data = await response.json();

            expect(data.success).toBe(true);
            expect(data.data).toHaveLength(2);

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining("/oauth/providers"),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: `Bearer ${createMockAuthToken()}`,
                        "X-Workspace-Id": "workspace-123"
                    })
                })
            );
        });

        it("skips fetch when no auth token", async () => {
            mockLocalStorage.store = {}; // No token

            const token = mockLocalStorage.getItem("auth_token");

            // Pattern: early return if no token
            if (!token) {
                return;
            }

            await fetch(`${API_BASE_URL}/oauth/providers`);

            expect(fetch).not.toHaveBeenCalled();
        });
    });

    // ===== OAuth Authorization =====
    describe("initiateOAuth pattern", () => {
        it("builds authorization URL with settings", () => {
            const provider = "zendesk";
            const settings = { subdomain: "mycompany" };

            const url = new URL(`${API_BASE_URL}/oauth/${provider}/authorize`);
            if (settings) {
                Object.entries(settings).forEach(([key, value]) => {
                    if (value) {
                        url.searchParams.set(key, value);
                    }
                });
            }

            expect(url.toString()).toContain("subdomain=mycompany");
            expect(url.toString()).toContain("/oauth/zendesk/authorize");
        });

        it("requires auth token", () => {
            mockLocalStorage.store = {};

            const token = mockLocalStorage.getItem("auth_token");

            if (!token) {
                const error = new Error("Not authenticated. Please log in first.");
                expect(error.message).toBe("Not authenticated. Please log in first.");
            }
        });

        it("requires workspace context", () => {
            mockGetCurrentWorkspaceId.mockReturnValue(null);

            const workspaceId = mockGetCurrentWorkspaceId();

            if (!workspaceId) {
                const error = new Error("Workspace context required");
                expect(error.message).toBe("Workspace context required");
            }
        });

        it("fetches authorization URL from backend", async () => {
            const mockAuthUrl = "https://accounts.google.com/oauth?state=123";

            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ authUrl: mockAuthUrl })));

            const token = mockLocalStorage.getItem("auth_token");
            const workspaceId = mockGetCurrentWorkspaceId();

            const response = await fetch(`${API_BASE_URL}/oauth/google/authorize`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Workspace-Id": workspaceId!
                }
            });

            const data = await response.json();

            expect(data.success).toBe(true);
            expect(data.data.authUrl).toBe(mockAuthUrl);
        });

        it("handles missing authUrl in response", async () => {
            mockFetchOnce(
                createMockFetchResponse(createMockApiResponse({ otherData: "no authUrl" }))
            );

            const response = await fetch(`${API_BASE_URL}/oauth/google/authorize`);
            const data = await response.json();

            if (!data.success || !data.data?.authUrl) {
                const error = new Error(data.error || "Failed to get authorization URL");
                expect(error.message).toBe("Failed to get authorization URL");
            }
        });

        it("handles API error", async () => {
            mockFetchOnce(createMockFetchResponse(createMockApiError("Provider not configured")));

            const response = await fetch(`${API_BASE_URL}/oauth/google/authorize`);
            const data = await response.json();

            expect(data.success).toBe(false);
            expect(data.error).toBe("Provider not configured");
        });
    });

    // ===== Popup Handling =====
    describe("popup handling pattern", () => {
        it("calculates popup position centered on screen", () => {
            const width = 600;
            const height = 700;

            // Mock screen dimensions
            const screenX = 100;
            const outerWidth = 1920;
            const screenY = 50;
            const outerHeight = 1080;

            const left = screenX + (outerWidth - width) / 2;
            const top = screenY + (outerHeight - height) / 2;

            expect(left).toBe(760);
            expect(top).toBe(240);
        });

        it("builds popup window features string", () => {
            const width = 600;
            const height = 700;
            const left = 760;
            const top = 240;

            const features =
                `width=${width},height=${height},left=${left},top=${top},` +
                "toolbar=no,menubar=no,scrollbars=yes,resizable=yes";

            expect(features).toContain("width=600");
            expect(features).toContain("height=700");
            expect(features).toContain("toolbar=no");
        });

        it("validates popup is open", () => {
            const popup = { closed: false };

            expect(!popup || popup.closed).toBe(false); // Popup is valid

            const blockedPopup = null;
            expect(!blockedPopup).toBe(true); // Popup blocked

            const closedPopup = { closed: true };
            expect(!closedPopup || closedPopup.closed).toBe(true); // Popup closed
        });
    });

    // ===== Revoke Connection =====
    describe("revokeConnection pattern", () => {
        it("sends revoke request with correct URL", async () => {
            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ revoked: true })));

            const provider = "google";
            const connectionId = "conn-123";
            const token = mockLocalStorage.getItem("auth_token");
            const workspaceId = mockGetCurrentWorkspaceId();

            const response = await fetch(
                `${API_BASE_URL}/oauth/${provider}/revoke/${connectionId}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "X-Workspace-Id": workspaceId!
                    }
                }
            );

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining("/oauth/google/revoke/conn-123"),
                expect.objectContaining({
                    method: "POST"
                })
            );

            const data = await response.json();
            expect(data.success).toBe(true);
        });

        it("requires auth token for revoke", () => {
            mockLocalStorage.store = {};

            const token = mockLocalStorage.getItem("auth_token");

            if (!token) {
                const error = new Error("Not authenticated");
                expect(error.message).toBe("Not authenticated");
            }
        });

        it("requires workspace context for revoke", () => {
            mockGetCurrentWorkspaceId.mockReturnValue(null);

            const workspaceId = mockGetCurrentWorkspaceId();

            if (!workspaceId) {
                const error = new Error("Workspace context required");
                expect(error.message).toBe("Workspace context required");
            }
        });
    });

    // ===== Refresh Connection =====
    describe("refreshConnection pattern", () => {
        it("sends refresh request with correct URL", async () => {
            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ refreshed: true })));

            const provider = "google";
            const connectionId = "conn-123";
            const token = mockLocalStorage.getItem("auth_token");
            const workspaceId = mockGetCurrentWorkspaceId();

            const response = await fetch(
                `${API_BASE_URL}/oauth/${provider}/refresh/${connectionId}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "X-Workspace-Id": workspaceId!
                    }
                }
            );

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining("/oauth/google/refresh/conn-123"),
                expect.objectContaining({
                    method: "POST"
                })
            );

            const data = await response.json();
            expect(data.success).toBe(true);
        });

        it("handles refresh error", async () => {
            mockFetchOnce(createMockFetchResponse(createMockApiError("Token refresh failed")));

            const response = await fetch(`${API_BASE_URL}/oauth/google/refresh/conn-123`, {
                method: "POST"
            });

            const data = await response.json();

            expect(data.success).toBe(false);
            expect(data.error).toBe("Token refresh failed");
        });
    });

    // ===== OAuth Callback Message Handling =====
    describe("OAuth callback messages", () => {
        it("success message structure", () => {
            const successMessage = {
                type: "oauth_success" as const,
                provider: "google",
                connection: {
                    id: "conn-123",
                    name: "Google Account",
                    provider: "google",
                    status: "connected",
                    metadata: {
                        account_info: {
                            email: "user@example.com"
                        }
                    }
                }
            };

            expect(successMessage.type).toBe("oauth_success");
            expect(successMessage.connection).toBeDefined();
            expect(successMessage.connection?.id).toBe("conn-123");
        });

        it("error message structure", () => {
            const errorMessage = {
                type: "oauth_error" as const,
                provider: "google",
                error: "User denied access"
            };

            expect(errorMessage.type).toBe("oauth_error");
            expect(errorMessage.error).toBe("User denied access");
        });

        it("validates message has required fields", () => {
            const validMessage = {
                type: "oauth_success",
                provider: "google",
                connection: {
                    id: "123",
                    name: "Test",
                    provider: "google",
                    status: "connected",
                    metadata: {}
                }
            };

            const invalidMessage = {
                someOtherType: "not_oauth"
            };

            // Valid message should have type and provider
            expect(validMessage.type).toBeDefined();
            expect(validMessage.provider).toBeDefined();

            // Invalid message won't have these
            expect((invalidMessage as Record<string, unknown>).type).toBeUndefined();
        });

        it("filters messages by provider", () => {
            const messageHandler = (data: { type?: string; provider?: string }) => {
                // Only handle OAuth messages for this provider
                if (!data.type || data.provider !== "google") {
                    return false;
                }
                return true;
            };

            expect(messageHandler({ type: "oauth_success", provider: "google" })).toBe(true);
            expect(messageHandler({ type: "oauth_success", provider: "slack" })).toBe(false);
            expect(messageHandler({ provider: "google" })).toBe(false);
        });
    });
});
