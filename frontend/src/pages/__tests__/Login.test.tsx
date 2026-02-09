/**
 * Login Page Tests
 *
 * Tests for the login page including:
 * - Form validation
 * - Successful login flow
 * - Failed login handling
 * - Two-factor authentication flow
 * - OAuth button behavior
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAuthStore } from "../../stores/authStore";
import { Login } from "../Login";

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

// Mock OAuth hooks
const mockLoginWithGoogle = vi.fn();
const mockLoginWithMicrosoft = vi.fn();

vi.mock("../../hooks/useGoogleAuth", () => ({
    useGoogleAuth: () => ({
        loginWithGoogle: mockLoginWithGoogle,
        isLoading: false
    })
}));

vi.mock("../../hooks/useMicrosoftAuth", () => ({
    useMicrosoftAuth: () => ({
        loginWithMicrosoft: mockLoginWithMicrosoft,
        isLoading: false
    })
}));

// Helper to reset auth store
function resetAuthStore() {
    useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true
    });
}

// Render helper with router
function renderLogin() {
    return render(
        <BrowserRouter>
            <Login />
        </BrowserRouter>
    );
}

describe("Login Page", () => {
    beforeEach(() => {
        resetAuthStore();
        vi.clearAllMocks();
    });

    afterEach(() => {
        resetAuthStore();
    });

    // ===== Rendering =====
    describe("rendering", () => {
        it("renders login form with email and password fields", () => {
            renderLogin();

            expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
        });

        it("renders OAuth buttons", () => {
            renderLogin();

            expect(
                screen.getByRole("button", { name: /continue with google/i })
            ).toBeInTheDocument();
            expect(
                screen.getByRole("button", { name: /continue with microsoft/i })
            ).toBeInTheDocument();
        });

        it("renders register link", () => {
            renderLogin();

            expect(screen.getByRole("link", { name: /sign up/i })).toBeInTheDocument();
        });

        it("renders forgot password link", () => {
            renderLogin();

            expect(screen.getByRole("link", { name: /forgot password/i })).toBeInTheDocument();
        });
    });

    // ===== Form Validation =====
    describe("form validation", () => {
        it("requires email field", async () => {
            renderLogin();

            const emailInput = screen.getByLabelText(/email/i);
            expect(emailInput).toBeRequired();
        });

        it("requires password field", async () => {
            renderLogin();

            const passwordInput = screen.getByLabelText(/password/i);
            expect(passwordInput).toBeRequired();
        });

        it("email input has correct type", () => {
            renderLogin();

            const emailInput = screen.getByLabelText(/email/i);
            expect(emailInput).toHaveAttribute("type", "email");
        });

        it("password input has correct type", () => {
            renderLogin();

            const passwordInput = screen.getByLabelText(/password/i);
            expect(passwordInput).toHaveAttribute("type", "password");
        });
    });

    // ===== Successful Login =====
    describe("successful login", () => {
        it("calls login with email and password", async () => {
            const user = userEvent.setup();
            const mockLogin = vi.fn().mockResolvedValue({ twoFactorRequired: false });
            useAuthStore.setState({ login: mockLogin } as never);

            renderLogin();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.type(screen.getByLabelText(/password/i), "Password123!");
            await user.click(screen.getByRole("button", { name: /sign in/i }));

            await waitFor(() => {
                expect(mockLogin).toHaveBeenCalledWith(
                    "test@example.com",
                    "Password123!",
                    undefined
                );
            });
        });

        it("navigates to /app on successful login", async () => {
            const user = userEvent.setup();
            const mockLogin = vi.fn().mockResolvedValue({ twoFactorRequired: false });
            useAuthStore.setState({ login: mockLogin } as never);

            renderLogin();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.type(screen.getByLabelText(/password/i), "Password123!");
            await user.click(screen.getByRole("button", { name: /sign in/i }));

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith("/app");
            });
        });

        it("shows loading state during login", async () => {
            const user = userEvent.setup();
            // Create a promise that we control
            let resolveLogin: (value: unknown) => void;
            const loginPromise = new Promise((resolve) => {
                resolveLogin = resolve;
            });
            const mockLogin = vi.fn().mockReturnValue(loginPromise);
            useAuthStore.setState({ login: mockLogin } as never);

            renderLogin();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.type(screen.getByLabelText(/password/i), "Password123!");
            await user.click(screen.getByRole("button", { name: /sign in/i }));

            // Check for loading state
            expect(screen.getByRole("button", { name: /signing in/i })).toBeInTheDocument();

            // Resolve the login
            resolveLogin!({ twoFactorRequired: false });
        });
    });

    // ===== Failed Login =====
    describe("failed login", () => {
        it("displays error message on login failure", async () => {
            const user = userEvent.setup();
            const mockLogin = vi.fn().mockRejectedValue(new Error("Invalid credentials"));
            useAuthStore.setState({ login: mockLogin } as never);

            renderLogin();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.type(screen.getByLabelText(/password/i), "wrongpassword");
            await user.click(screen.getByRole("button", { name: /sign in/i }));

            await waitFor(() => {
                expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
            });
        });

        it("does not navigate on login failure", async () => {
            const user = userEvent.setup();
            const mockLogin = vi.fn().mockRejectedValue(new Error("Invalid credentials"));
            useAuthStore.setState({ login: mockLogin } as never);

            renderLogin();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.type(screen.getByLabelText(/password/i), "wrongpassword");
            await user.click(screen.getByRole("button", { name: /sign in/i }));

            await waitFor(() => {
                expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
            });

            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it("shows generic error message when error has no message", async () => {
            const user = userEvent.setup();
            const mockLogin = vi.fn().mockRejectedValue(new Error());
            useAuthStore.setState({ login: mockLogin } as never);

            renderLogin();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.type(screen.getByLabelText(/password/i), "wrongpassword");
            await user.click(screen.getByRole("button", { name: /sign in/i }));

            await waitFor(() => {
                expect(screen.getByText(/failed to login/i)).toBeInTheDocument();
            });
        });
    });

    // ===== Two-Factor Authentication =====
    describe("two-factor authentication", () => {
        it("shows 2FA code input when required", async () => {
            const user = userEvent.setup();
            const mockLogin = vi.fn().mockResolvedValue({
                twoFactorRequired: true,
                maskedPhone: "***-***-1234"
            });
            useAuthStore.setState({ login: mockLogin } as never);

            renderLogin();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.type(screen.getByLabelText(/password/i), "Password123!");
            await user.click(screen.getByRole("button", { name: /sign in/i }));

            await waitFor(() => {
                expect(screen.getByText(/\*\*\*-\*\*\*-1234/)).toBeInTheDocument();
                expect(screen.getByPlaceholderText("123456")).toBeInTheDocument();
            });
        });

        it("shows verify code button after 2FA triggered", async () => {
            const user = userEvent.setup();
            const mockLogin = vi.fn().mockResolvedValue({
                twoFactorRequired: true,
                maskedPhone: "***-***-1234"
            });
            useAuthStore.setState({ login: mockLogin } as never);

            renderLogin();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.type(screen.getByLabelText(/password/i), "Password123!");
            await user.click(screen.getByRole("button", { name: /sign in/i }));

            await waitFor(() => {
                expect(screen.getByRole("button", { name: /verify code/i })).toBeInTheDocument();
            });
        });

        it("disables email and password fields after 2FA triggered", async () => {
            const user = userEvent.setup();
            const mockLogin = vi.fn().mockResolvedValue({
                twoFactorRequired: true,
                maskedPhone: "***-***-1234"
            });
            useAuthStore.setState({ login: mockLogin } as never);

            renderLogin();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.type(screen.getByLabelText(/password/i), "Password123!");
            await user.click(screen.getByRole("button", { name: /sign in/i }));

            await waitFor(() => {
                expect(screen.getByLabelText(/email/i)).toBeDisabled();
                expect(screen.getByLabelText(/password/i)).toBeDisabled();
            });
        });

        it("submits 2FA code with credentials", async () => {
            const user = userEvent.setup();
            const mockLogin = vi
                .fn()
                .mockResolvedValueOnce({
                    twoFactorRequired: true,
                    maskedPhone: "***-***-1234"
                })
                .mockResolvedValueOnce({ twoFactorRequired: false });
            useAuthStore.setState({ login: mockLogin } as never);

            renderLogin();

            // First submit - trigger 2FA
            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.type(screen.getByLabelText(/password/i), "Password123!");
            await user.click(screen.getByRole("button", { name: /sign in/i }));

            await waitFor(() => {
                expect(screen.getByPlaceholderText("123456")).toBeInTheDocument();
            });

            // Enter and submit 2FA code
            await user.type(screen.getByPlaceholderText("123456"), "123456");
            await user.click(screen.getByRole("button", { name: /verify code/i }));

            await waitFor(() => {
                expect(mockLogin).toHaveBeenLastCalledWith(
                    "test@example.com",
                    "Password123!",
                    "123456"
                );
            });
        });

        it("allows switching to backup code mode", async () => {
            const user = userEvent.setup();
            const mockLogin = vi.fn().mockResolvedValue({
                twoFactorRequired: true,
                maskedPhone: "***-***-1234"
            });
            useAuthStore.setState({ login: mockLogin } as never);

            renderLogin();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.type(screen.getByLabelText(/password/i), "Password123!");
            await user.click(screen.getByRole("button", { name: /sign in/i }));

            await waitFor(() => {
                expect(screen.getByText(/use a backup code/i)).toBeInTheDocument();
            });

            await user.click(screen.getByText(/use a backup code/i));

            expect(screen.getByPlaceholderText("XXXX-XXXX-XXXX")).toBeInTheDocument();
            expect(screen.getByText(/use sms code instead/i)).toBeInTheDocument();
        });
    });

    // ===== OAuth Buttons =====
    describe("OAuth buttons", () => {
        it("calls loginWithGoogle when Google button clicked", async () => {
            const user = userEvent.setup();
            renderLogin();

            await user.click(screen.getByRole("button", { name: /continue with google/i }));

            expect(mockLoginWithGoogle).toHaveBeenCalled();
        });

        it("calls loginWithMicrosoft when Microsoft button clicked", async () => {
            const user = userEvent.setup();
            renderLogin();

            await user.click(screen.getByRole("button", { name: /continue with microsoft/i }));

            expect(mockLoginWithMicrosoft).toHaveBeenCalled();
        });

        it("disables OAuth buttons during form submission", async () => {
            const user = userEvent.setup();
            let resolveLogin: (value: unknown) => void;
            const loginPromise = new Promise((resolve) => {
                resolveLogin = resolve;
            });
            const mockLogin = vi.fn().mockReturnValue(loginPromise);
            useAuthStore.setState({ login: mockLogin } as never);

            renderLogin();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.type(screen.getByLabelText(/password/i), "Password123!");
            await user.click(screen.getByRole("button", { name: /sign in/i }));

            // OAuth buttons should be disabled during loading
            expect(screen.getByRole("button", { name: /continue with google/i })).toBeDisabled();
            expect(screen.getByRole("button", { name: /continue with microsoft/i })).toBeDisabled();

            // Resolve the login
            resolveLogin!({ twoFactorRequired: false });
        });
    });

    // ===== Navigation Links =====
    describe("navigation links", () => {
        it("has correct register link href", () => {
            renderLogin();

            const registerLink = screen.getByRole("link", { name: /sign up/i });
            expect(registerLink).toHaveAttribute("href", "/register");
        });

        it("has correct forgot password link href", () => {
            renderLogin();

            const forgotLink = screen.getByRole("link", { name: /forgot password/i });
            expect(forgotLink).toHaveAttribute("href", "/forgot-password");
        });
    });
});
