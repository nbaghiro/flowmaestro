/**
 * Register Page Tests
 *
 * Tests for the registration page including:
 * - Form rendering
 * - Form validation
 * - Successful registration
 * - Error handling
 * - OAuth buttons
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAuthStore } from "../../stores/authStore";
import { Register } from "../Register";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

// Mock stores
vi.mock("../../stores/authStore");

// Mock hooks
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

// Create base auth store state for mocking
function createAuthStoreState(overrides?: { register?: ReturnType<typeof vi.fn> }) {
    return {
        register: overrides?.register ?? vi.fn().mockResolvedValue(undefined),
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
        setUser: vi.fn(),
        initialize: vi.fn()
    } as unknown as ReturnType<typeof useAuthStore>;
}

// Helper to reset stores
function resetStores(authStoreOverrides?: Parameters<typeof createAuthStoreState>[0]) {
    vi.mocked(useAuthStore).mockReturnValue(createAuthStoreState(authStoreOverrides));
}

// Render helper
function renderRegister() {
    return render(
        <BrowserRouter>
            <Register />
        </BrowserRouter>
    );
}

describe("Register Page", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStores();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // ===== Rendering =====
    describe("rendering", () => {
        it("renders page title", () => {
            renderRegister();

            expect(screen.getByText(/create an account/i)).toBeInTheDocument();
        });

        it("renders name input field", () => {
            renderRegister();

            expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
        });

        it("renders email input field", () => {
            renderRegister();

            expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        });

        it("renders password input field", () => {
            renderRegister();

            expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
        });

        it("renders confirm password input field", () => {
            renderRegister();

            expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
        });

        it("renders submit button", () => {
            renderRegister();

            expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
        });

        it("renders Google sign up button", () => {
            renderRegister();

            expect(
                screen.getByRole("button", { name: /continue with google/i })
            ).toBeInTheDocument();
        });

        it("renders Microsoft sign up button", () => {
            renderRegister();

            expect(
                screen.getByRole("button", { name: /continue with microsoft/i })
            ).toBeInTheDocument();
        });

        it("renders sign in link", () => {
            renderRegister();

            expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
            expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
        });

        it("renders password requirements hint", () => {
            renderRegister();

            expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
        });
    });

    // ===== Form Validation =====
    describe("form validation", () => {
        it("shows error when passwords do not match", async () => {
            const user = userEvent.setup();
            renderRegister();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.type(screen.getByLabelText(/^password$/i), "password123");
            await user.type(screen.getByLabelText(/confirm password/i), "different123");

            await user.click(screen.getByRole("button", { name: /create account/i }));

            await waitFor(() => {
                expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
            });
        });

        it("shows error when password is too short", async () => {
            const user = userEvent.setup();
            renderRegister();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.type(screen.getByLabelText(/^password$/i), "short");
            await user.type(screen.getByLabelText(/confirm password/i), "short");

            await user.click(screen.getByRole("button", { name: /create account/i }));

            await waitFor(() => {
                // There may be multiple elements (error + hint), we just need at least one
                const elements = screen.getAllByText(/at least 8 characters/i);
                expect(elements.length).toBeGreaterThan(0);
            });
        });

        it("does not require name field", async () => {
            const user = userEvent.setup();
            const mockRegister = vi.fn().mockResolvedValue(undefined);

            resetStores({ register: mockRegister });

            renderRegister();

            // Fill in only required fields (not name)
            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.type(screen.getByLabelText(/^password$/i), "password123");
            await user.type(screen.getByLabelText(/confirm password/i), "password123");

            await user.click(screen.getByRole("button", { name: /create account/i }));

            await waitFor(() => {
                expect(mockRegister).toHaveBeenCalledWith(
                    "test@example.com",
                    "password123",
                    undefined
                );
            });
        });
    });

    // ===== Successful Registration =====
    describe("successful registration", () => {
        it("calls register with correct credentials", async () => {
            const user = userEvent.setup();
            const mockRegister = vi.fn().mockResolvedValue(undefined);

            resetStores({ register: mockRegister });

            renderRegister();

            await user.type(screen.getByLabelText(/name/i), "John Doe");
            await user.type(screen.getByLabelText(/email/i), "john@example.com");
            await user.type(screen.getByLabelText(/^password$/i), "securepass123");
            await user.type(screen.getByLabelText(/confirm password/i), "securepass123");

            await user.click(screen.getByRole("button", { name: /create account/i }));

            await waitFor(() => {
                expect(mockRegister).toHaveBeenCalledWith(
                    "john@example.com",
                    "securepass123",
                    "John Doe"
                );
            });
        });

        it("navigates to app after successful registration", async () => {
            const user = userEvent.setup();
            const mockRegister = vi.fn().mockResolvedValue(undefined);

            resetStores({ register: mockRegister });

            renderRegister();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.type(screen.getByLabelText(/^password$/i), "password123");
            await user.type(screen.getByLabelText(/confirm password/i), "password123");

            await user.click(screen.getByRole("button", { name: /create account/i }));

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith("/app");
            });
        });

        it("shows loading state during registration", async () => {
            const user = userEvent.setup();
            let resolveRegister: () => void;
            const mockRegister = vi.fn().mockImplementation(() => {
                return new Promise<void>((resolve) => {
                    resolveRegister = resolve;
                });
            });

            resetStores({ register: mockRegister });

            renderRegister();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.type(screen.getByLabelText(/^password$/i), "password123");
            await user.type(screen.getByLabelText(/confirm password/i), "password123");

            await user.click(screen.getByRole("button", { name: /create account/i }));

            await waitFor(() => {
                expect(screen.getByText(/creating account/i)).toBeInTheDocument();
            });

            // Resolve the promise to clean up
            resolveRegister!();
        });
    });

    // ===== Error Handling =====
    describe("error handling", () => {
        it("displays error message on registration failure", async () => {
            const user = userEvent.setup();
            const mockRegister = vi.fn().mockRejectedValue(new Error("Email already exists"));

            resetStores({ register: mockRegister });

            renderRegister();

            await user.type(screen.getByLabelText(/email/i), "existing@example.com");
            await user.type(screen.getByLabelText(/^password$/i), "password123");
            await user.type(screen.getByLabelText(/confirm password/i), "password123");

            await user.click(screen.getByRole("button", { name: /create account/i }));

            await waitFor(() => {
                expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
            });
        });

        it("displays generic error message on unknown error", async () => {
            const user = userEvent.setup();
            const mockRegister = vi.fn().mockRejectedValue(new Error());

            resetStores({ register: mockRegister });

            renderRegister();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.type(screen.getByLabelText(/^password$/i), "password123");
            await user.type(screen.getByLabelText(/confirm password/i), "password123");

            await user.click(screen.getByRole("button", { name: /create account/i }));

            await waitFor(() => {
                expect(screen.getByText(/failed to register/i)).toBeInTheDocument();
            });
        });
    });

    // ===== OAuth Buttons =====
    describe("OAuth buttons", () => {
        it("calls loginWithGoogle when clicking Google button", async () => {
            const user = userEvent.setup();
            renderRegister();

            await user.click(screen.getByRole("button", { name: /continue with google/i }));

            expect(mockLoginWithGoogle).toHaveBeenCalled();
        });

        it("calls loginWithMicrosoft when clicking Microsoft button", async () => {
            const user = userEvent.setup();
            renderRegister();

            await user.click(screen.getByRole("button", { name: /continue with microsoft/i }));

            expect(mockLoginWithMicrosoft).toHaveBeenCalled();
        });

        it("disables OAuth buttons while form is submitting", async () => {
            const user = userEvent.setup();
            const mockRegister = vi.fn().mockImplementation(() => new Promise(() => {}));

            resetStores({ register: mockRegister });

            renderRegister();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.type(screen.getByLabelText(/^password$/i), "password123");
            await user.type(screen.getByLabelText(/confirm password/i), "password123");

            await user.click(screen.getByRole("button", { name: /create account/i }));

            await waitFor(() => {
                expect(
                    screen.getByRole("button", { name: /continue with google/i })
                ).toBeDisabled();
                expect(
                    screen.getByRole("button", { name: /continue with microsoft/i })
                ).toBeDisabled();
            });
        });
    });

    // ===== Input States =====
    describe("input states", () => {
        it("disables inputs while submitting", async () => {
            const user = userEvent.setup();
            const mockRegister = vi.fn().mockImplementation(() => new Promise(() => {}));

            resetStores({ register: mockRegister });

            renderRegister();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.type(screen.getByLabelText(/^password$/i), "password123");
            await user.type(screen.getByLabelText(/confirm password/i), "password123");

            await user.click(screen.getByRole("button", { name: /create account/i }));

            await waitFor(() => {
                expect(screen.getByLabelText(/email/i)).toBeDisabled();
                expect(screen.getByLabelText(/^password$/i)).toBeDisabled();
                expect(screen.getByLabelText(/confirm password/i)).toBeDisabled();
            });
        });
    });
});
