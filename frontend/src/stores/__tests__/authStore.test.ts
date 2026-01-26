/**
 * Auth Store Tests
 *
 * Tests for authentication state management including login, logout,
 * token handling, and OAuth callback processing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    createMockFetchResponse,
    createMockApiResponse,
    createMockApiError,
    createMockUser,
    createMockAuthToken,
    mockFetchOnce
} from "../../lib/__tests__/test-helpers";
import { windowMock } from "../../test-setup";
import { useAuthStore, getAuthState } from "../authStore";

// Reset store before each test
function resetStore() {
    useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        isInitialized: false
    });
}

describe("authStore", () => {
    beforeEach(() => {
        resetStore();
        localStorage.clear();
        vi.clearAllMocks();
        windowMock.location.hash = "";
    });

    afterEach(() => {
        resetStore();
    });

    // ===== Initial State =====
    describe("initial state", () => {
        it("has correct initial state", () => {
            resetStore();
            const state = useAuthStore.getState();

            expect(state.user).toBeNull();
            expect(state.isAuthenticated).toBe(false);
            expect(state.isLoading).toBe(true);
            expect(state.isInitialized).toBe(false);
        });
    });

    // ===== Initialize =====
    describe("initialize", () => {
        it("restores session from valid token", async () => {
            const mockUser = createMockUser();
            localStorage.setItem("auth_token", createMockAuthToken());

            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ user: mockUser })));

            await useAuthStore.getState().initialize();

            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(state.user?.id).toBe("user-123");
            expect(state.isLoading).toBe(false);
            expect(state.isInitialized).toBe(true);
        });

        it("clears invalid token", async () => {
            localStorage.setItem("auth_token", "invalid-token");

            mockFetchOnce(createMockFetchResponse(createMockApiError("Invalid token"), false, 401));

            await useAuthStore.getState().initialize();

            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(false);
            expect(state.user).toBeNull();
            expect(localStorage.getItem("auth_token")).toBeNull();
            expect(state.isInitialized).toBe(true);
        });

        it("handles no stored token", async () => {
            await useAuthStore.getState().initialize();

            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(false);
            expect(state.user).toBeNull();
            expect(state.isLoading).toBe(false);
            expect(state.isInitialized).toBe(true);
        });

        it("prevents double initialization", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());

            mockFetchOnce(
                createMockFetchResponse(createMockApiResponse({ user: createMockUser() }))
            );

            // First initialization
            await useAuthStore.getState().initialize();

            // Second initialization should be a no-op
            await useAuthStore.getState().initialize();

            // fetch should only be called once
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it("handles OAuth callback with token in URL hash", async () => {
            const mockUser = createMockUser();
            const mockToken = createMockAuthToken();

            windowMock.location.hash = `#auth_token=${mockToken}&user_data=${encodeURIComponent(JSON.stringify(mockUser))}`;

            // Mock the refreshUser call
            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ user: mockUser })));

            await useAuthStore.getState().initialize();

            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(state.user?.id).toBe("user-123");
            expect(localStorage.getItem("auth_token")).toBe(mockToken);
            expect(windowMock.history.replaceState).toHaveBeenCalled();
        });

        it("migrates Google OAuth token to auth_token", async () => {
            const mockUser = createMockUser();
            const mockToken = createMockAuthToken();

            // Simulate Google OAuth storing token as "token"
            localStorage.setItem("token", mockToken);
            localStorage.setItem("user", JSON.stringify(mockUser));

            await useAuthStore.getState().initialize();

            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(localStorage.getItem("auth_token")).toBe(mockToken);
            expect(localStorage.getItem("token")).toBeNull();
        });

        it("handles API error during session restoration", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());

            vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

            await useAuthStore.getState().initialize();

            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(false);
            expect(state.user).toBeNull();
            expect(localStorage.getItem("auth_token")).toBeNull();
        });
    });

    // ===== Login =====
    describe("login", () => {
        it("sets user on successful login", async () => {
            const mockUser = createMockUser();
            const mockToken = createMockAuthToken();

            mockFetchOnce(
                createMockFetchResponse(createMockApiResponse({ user: mockUser, token: mockToken }))
            );

            const result = await useAuthStore.getState().login("test@example.com", "password123");

            expect(result.twoFactorRequired).toBe(false);

            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(state.user?.id).toBe("user-123");
            expect(localStorage.getItem("auth_token")).toBe(mockToken);
        });

        it("handles 2FA required response", async () => {
            mockFetchOnce(
                createMockFetchResponse(
                    createMockApiResponse({
                        two_factor_required: true,
                        masked_phone: "***-***-1234"
                    })
                )
            );

            const result = await useAuthStore.getState().login("test@example.com", "password123");

            expect(result.twoFactorRequired).toBe(true);
            expect(result.maskedPhone).toBe("***-***-1234");

            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(false);
        });

        it("completes login with 2FA code", async () => {
            const mockUser = createMockUser();
            const mockToken = createMockAuthToken();

            mockFetchOnce(
                createMockFetchResponse(createMockApiResponse({ user: mockUser, token: mockToken }))
            );

            const result = await useAuthStore
                .getState()
                .login("test@example.com", "password123", "123456");

            expect(result.twoFactorRequired).toBe(false);

            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(true);
        });

        it("throws error on invalid credentials", async () => {
            mockFetchOnce(
                createMockFetchResponse(createMockApiError("Invalid credentials"), false, 401)
            );

            await expect(
                useAuthStore.getState().login("test@example.com", "wrong")
            ).rejects.toThrow("Invalid credentials");

            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(false);
        });

        it("throws error on API failure", async () => {
            mockFetchOnce(createMockFetchResponse(createMockApiError("Login failed"), false, 500));

            await expect(
                useAuthStore.getState().login("test@example.com", "password")
            ).rejects.toThrow("Login failed");
        });
    });

    // ===== Register =====
    describe("register", () => {
        it("sets user on successful registration", async () => {
            const mockUser = createMockUser();
            const mockToken = createMockAuthToken();

            mockFetchOnce(
                createMockFetchResponse(createMockApiResponse({ user: mockUser, token: mockToken }))
            );

            await useAuthStore.getState().register("new@example.com", "password123", "New User");

            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(true);
            expect(state.user?.id).toBe("user-123");
        });

        it("throws error on duplicate email", async () => {
            mockFetchOnce(
                createMockFetchResponse(createMockApiError("Email already registered"), false, 400)
            );

            await expect(
                useAuthStore.getState().register("existing@example.com", "password123")
            ).rejects.toThrow("Email already registered");

            const state = useAuthStore.getState();
            expect(state.isAuthenticated).toBe(false);
        });

        it("throws error when registration response indicates failure", async () => {
            mockFetchOnce(
                createMockFetchResponse({ success: false, error: "Registration failed" })
            );

            await expect(
                useAuthStore.getState().register("test@example.com", "password123")
            ).rejects.toThrow("Registration failed");
        });
    });

    // ===== Logout =====
    describe("logout", () => {
        it("clears user and token", async () => {
            // First set up authenticated state
            useAuthStore.setState({
                user: createMockUser(),
                isAuthenticated: true,
                isLoading: false,
                isInitialized: true
            });
            localStorage.setItem("auth_token", createMockAuthToken());

            useAuthStore.getState().logout();

            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.isAuthenticated).toBe(false);
            expect(localStorage.getItem("auth_token")).toBeNull();
        });

        it("clears isAuthenticated flag", () => {
            useAuthStore.setState({ isAuthenticated: true });

            useAuthStore.getState().logout();

            expect(useAuthStore.getState().isAuthenticated).toBe(false);
        });
    });

    // ===== Refresh User =====
    describe("refreshUser", () => {
        it("updates user data from API", async () => {
            const updatedUser = createMockUser({ name: "Updated Name" });
            localStorage.setItem("auth_token", createMockAuthToken());

            useAuthStore.setState({
                user: createMockUser(),
                isAuthenticated: true,
                isInitialized: true
            });

            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ user: updatedUser })));

            await useAuthStore.getState().refreshUser();

            expect(useAuthStore.getState().user?.name).toBe("Updated Name");
        });

        it("handles refresh failure gracefully", async () => {
            const originalUser = createMockUser();
            localStorage.setItem("auth_token", createMockAuthToken());

            useAuthStore.setState({
                user: originalUser,
                isAuthenticated: true,
                isInitialized: true
            });

            vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

            // Should not throw
            await useAuthStore.getState().refreshUser();

            // User should remain unchanged
            expect(useAuthStore.getState().user?.id).toBe("user-123");
        });
    });

    // ===== setUser =====
    describe("setUser", () => {
        it("sets user and isAuthenticated", () => {
            const mockUser = createMockUser();

            useAuthStore.getState().setUser(mockUser);

            const state = useAuthStore.getState();
            expect(state.user?.id).toBe("user-123");
            expect(state.isAuthenticated).toBe(true);
        });

        it("clears user when passed null", () => {
            useAuthStore.setState({
                user: createMockUser(),
                isAuthenticated: true
            });

            useAuthStore.getState().setUser(null);

            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.isAuthenticated).toBe(false);
        });
    });

    // ===== getAuthState Helper =====
    describe("getAuthState", () => {
        it("returns current auth state", () => {
            const mockUser = createMockUser();
            useAuthStore.setState({
                user: mockUser,
                isAuthenticated: true,
                isInitialized: true
            });

            const state = getAuthState();

            expect(state.user?.id).toBe("user-123");
            expect(state.isAuthenticated).toBe(true);
        });
    });
});
