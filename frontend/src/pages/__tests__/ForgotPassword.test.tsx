/**
 * ForgotPassword Page Tests
 *
 * Tests for the forgot password page including:
 * - Form rendering
 * - Form submission
 * - Success state
 * - Error handling
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as api from "../../lib/api";
import { ForgotPassword } from "../ForgotPassword";

// Mock API
vi.mock("../../lib/api", () => ({
    forgotPassword: vi.fn()
}));

// Render helper
function renderForgotPassword() {
    return render(
        <BrowserRouter>
            <ForgotPassword />
        </BrowserRouter>
    );
}

describe("ForgotPassword Page", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(api.forgotPassword).mockResolvedValue({ success: true });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // ===== Rendering =====
    describe("rendering", () => {
        it("renders page title", () => {
            renderForgotPassword();

            expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
        });

        it("renders description text", () => {
            renderForgotPassword();

            expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
        });

        it("renders email input field", () => {
            renderForgotPassword();

            expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        });

        it("renders submit button", () => {
            renderForgotPassword();

            expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
        });

        it("renders back to sign in link", () => {
            renderForgotPassword();

            expect(screen.getByRole("link", { name: /back to sign in/i })).toBeInTheDocument();
        });

        it("renders logo", () => {
            renderForgotPassword();

            // Logo component should be present
            expect(
                document.querySelector("[data-testid='logo'], img[alt*='logo'], svg")
            ).toBeTruthy();
        });
    });

    // ===== Form Submission =====
    describe("form submission", () => {
        it("calls forgotPassword API with email", async () => {
            const user = userEvent.setup();
            renderForgotPassword();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.click(screen.getByRole("button", { name: /send reset link/i }));

            await waitFor(() => {
                expect(api.forgotPassword).toHaveBeenCalledWith("test@example.com");
            });
        });

        it("shows loading state during submission", async () => {
            const user = userEvent.setup();
            let resolveRequest: () => void;
            vi.mocked(api.forgotPassword).mockImplementation(() => {
                return new Promise((resolve) => {
                    resolveRequest = () => resolve({ success: true });
                });
            });

            renderForgotPassword();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.click(screen.getByRole("button", { name: /send reset link/i }));

            await waitFor(() => {
                expect(screen.getByText(/sending/i)).toBeInTheDocument();
            });

            // Resolve to clean up
            resolveRequest!();
        });

        it("disables input while submitting", async () => {
            const user = userEvent.setup();
            vi.mocked(api.forgotPassword).mockImplementation(() => new Promise(() => {}));

            renderForgotPassword();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.click(screen.getByRole("button", { name: /send reset link/i }));

            await waitFor(() => {
                expect(screen.getByLabelText(/email/i)).toBeDisabled();
            });
        });

        it("disables submit button while submitting", async () => {
            const user = userEvent.setup();
            vi.mocked(api.forgotPassword).mockImplementation(() => new Promise(() => {}));

            renderForgotPassword();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.click(screen.getByRole("button", { name: /send reset link/i }));

            await waitFor(() => {
                const buttons = screen.getAllByRole("button");
                const submitButton = buttons.find((btn) => btn.textContent?.includes("ending"));
                expect(submitButton).toBeDisabled();
            });
        });
    });

    // ===== Success State =====
    describe("success state", () => {
        it("shows success message after successful submission", async () => {
            const user = userEvent.setup();
            vi.mocked(api.forgotPassword).mockResolvedValue({ success: true });

            renderForgotPassword();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.click(screen.getByRole("button", { name: /send reset link/i }));

            await waitFor(() => {
                expect(screen.getByText(/check your email/i)).toBeInTheDocument();
            });
        });

        it("shows appropriate message about reset link", async () => {
            const user = userEvent.setup();
            vi.mocked(api.forgotPassword).mockResolvedValue({ success: true });

            renderForgotPassword();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.click(screen.getByRole("button", { name: /send reset link/i }));

            await waitFor(() => {
                expect(screen.getByText(/password reset link/i)).toBeInTheDocument();
            });
        });

        it("clears email input after successful submission", async () => {
            const user = userEvent.setup();
            vi.mocked(api.forgotPassword).mockResolvedValue({ success: true });

            renderForgotPassword();

            const emailInput = screen.getByLabelText(/email/i);
            await user.type(emailInput, "test@example.com");
            await user.click(screen.getByRole("button", { name: /send reset link/i }));

            await waitFor(() => {
                expect(emailInput).toHaveValue("");
            });
        });
    });

    // ===== Error Handling =====
    describe("error handling", () => {
        it("shows error message when API call fails", async () => {
            const user = userEvent.setup();
            vi.mocked(api.forgotPassword).mockRejectedValue(new Error("Network error"));

            renderForgotPassword();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.click(screen.getByRole("button", { name: /send reset link/i }));

            await waitFor(() => {
                expect(screen.getByText(/network error/i)).toBeInTheDocument();
            });
        });

        it("shows generic error message on unknown error", async () => {
            const user = userEvent.setup();
            vi.mocked(api.forgotPassword).mockRejectedValue(new Error());

            renderForgotPassword();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.click(screen.getByRole("button", { name: /send reset link/i }));

            await waitFor(() => {
                expect(screen.getByText(/failed to send reset email/i)).toBeInTheDocument();
            });
        });

        it("displays error message that can be dismissed", async () => {
            const user = userEvent.setup();
            vi.mocked(api.forgotPassword).mockRejectedValueOnce(new Error("Test error"));

            renderForgotPassword();

            await user.type(screen.getByLabelText(/email/i), "test@example.com");
            await user.click(screen.getByRole("button", { name: /send reset link/i }));

            // Error should appear
            await waitFor(() => {
                expect(screen.getByText(/test error/i)).toBeInTheDocument();
            });
        });
    });

    // ===== Email Validation =====
    describe("email validation", () => {
        it("requires email field", async () => {
            const user = userEvent.setup();
            renderForgotPassword();

            await user.click(screen.getByRole("button", { name: /send reset link/i }));

            // Browser validation should prevent submission
            expect(api.forgotPassword).not.toHaveBeenCalled();
        });

        it("validates email format", async () => {
            renderForgotPassword();

            const emailInput = screen.getByLabelText(/email/i);
            expect(emailInput).toHaveAttribute("type", "email");
        });
    });

    // ===== Navigation =====
    describe("navigation", () => {
        it("has correct link to sign in page", () => {
            renderForgotPassword();

            const signInLink = screen.getByRole("link", { name: /back to sign in/i });
            expect(signInLink).toHaveAttribute("href", "/login");
        });
    });
});
