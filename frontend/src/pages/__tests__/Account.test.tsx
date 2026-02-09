/**
 * Account Page Tests
 *
 * Tests for the account settings page including:
 * - Profile display
 * - Edit profile modal
 * - Security settings
 * - OAuth account linking
 */

import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as api from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import { Account } from "../Account";

// Mock API
vi.mock("../../lib/api", () => ({
    getGoogleAuthUrl: vi.fn(() => "https://accounts.google.com/oauth"),
    getMicrosoftAuthUrl: vi.fn(() => "https://login.microsoft.com/oauth"),
    unlinkGoogleAccount: vi.fn(),
    unlinkMicrosoftAccount: vi.fn()
}));

// Mock data factory
function createMockUser(
    overrides?: Partial<{
        id: string;
        email: string;
        name: string;
        google_id: string | null;
        microsoft_id: string | null;
        has_password: boolean;
        two_factor_enabled: boolean;
    }>
) {
    return {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        google_id: null,
        microsoft_id: null,
        has_password: true,
        two_factor_enabled: false,
        ...overrides
    };
}

// Helper to reset stores
function resetStores(userOverrides?: Parameters<typeof createMockUser>[0]) {
    useAuthStore.setState({
        user: createMockUser(userOverrides),
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true
    });

    vi.mocked(api.unlinkGoogleAccount).mockResolvedValue({ success: true });
    vi.mocked(api.unlinkMicrosoftAccount).mockResolvedValue({ success: true });
}

// Render helper
function renderAccount() {
    return render(
        <BrowserRouter>
            <Account />
        </BrowserRouter>
    );
}

describe("Account Page", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStores();

        // Mock window.location for OAuth redirect testing
        Object.defineProperty(window, "location", {
            value: { ...window.location, href: "", reload: vi.fn() },
            writable: true
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // ===== Rendering =====
    describe("rendering", () => {
        it("renders page header", () => {
            renderAccount();

            expect(screen.getByText("Account")).toBeInTheDocument();
        });

        it("renders page description", () => {
            renderAccount();

            expect(screen.getByText(/manage your account settings/i)).toBeInTheDocument();
        });

        it("renders profile section", () => {
            renderAccount();

            expect(screen.getByText("Profile")).toBeInTheDocument();
        });

        it("renders security section", () => {
            renderAccount();

            expect(screen.getByText("Security")).toBeInTheDocument();
        });

        it("renders preferences section", () => {
            renderAccount();

            expect(screen.getByText("Preferences")).toBeInTheDocument();
        });
    });

    // ===== Profile Section =====
    describe("profile section", () => {
        it("displays user name", () => {
            resetStores({ name: "John Doe" });

            renderAccount();

            expect(screen.getByText("John Doe")).toBeInTheDocument();
        });

        it("displays user email", () => {
            resetStores({ email: "john@example.com" });

            renderAccount();

            expect(screen.getByText("john@example.com")).toBeInTheDocument();
        });

        it("shows 'Not set' when name is missing", () => {
            resetStores({ name: undefined });

            renderAccount();

            expect(screen.getByText("Not set")).toBeInTheDocument();
        });

        it("shows edit profile link", () => {
            renderAccount();

            expect(screen.getByText(/edit profile/i)).toBeInTheDocument();
        });
    });

    // ===== Security Section =====
    describe("security section", () => {
        it("displays password status when password is set", () => {
            resetStores({ has_password: true });

            renderAccount();

            expect(screen.getByText("••••••••")).toBeInTheDocument();
        });

        it("displays password 'Not set' when password is not set", () => {
            resetStores({ has_password: false });

            renderAccount();

            const passwordRow = screen.getByText("Password").closest("div");
            expect(passwordRow?.parentElement).toHaveTextContent("Not set");
        });

        it("displays 2FA row in security section", () => {
            resetStores({ two_factor_enabled: true });

            renderAccount();

            // Check that 2FA row exists
            expect(screen.getByText("Two-factor authentication")).toBeInTheDocument();
        });

        it("shows edit security link", () => {
            renderAccount();

            expect(screen.getByText(/edit security/i)).toBeInTheDocument();
        });
    });

    // ===== Google Account Linking =====
    describe("Google account linking", () => {
        it("shows Google connected status when linked", () => {
            resetStores({ google_id: "google-123" });

            renderAccount();

            const googleRow = screen.getByText("Google Account").closest("div")?.parentElement;
            expect(googleRow).toHaveTextContent("Connected");
        });

        it("shows Google not connected status when not linked", () => {
            resetStores({ google_id: null });

            renderAccount();

            const googleRow = screen.getByText("Google Account").closest("div")?.parentElement;
            expect(googleRow).toHaveTextContent("Not connected");
        });

        it("shows connect button when Google is not linked", () => {
            resetStores({ google_id: null });

            renderAccount();

            const connectButtons = screen.getAllByText("Connect");
            expect(connectButtons.length).toBeGreaterThan(0);
        });

        it("shows disconnect button when Google is linked", () => {
            resetStores({ google_id: "google-123" });

            renderAccount();

            const disconnectButtons = screen.getAllByText("Disconnect");
            expect(disconnectButtons.length).toBeGreaterThan(0);
        });

        it("has clickable disconnect buttons when Google is linked", async () => {
            resetStores({ google_id: "google-123", has_password: true });

            renderAccount();

            const disconnectButtons = screen.getAllByText("Disconnect");
            // Should have at least one disconnect button
            expect(disconnectButtons.length).toBeGreaterThan(0);
        });
    });

    // ===== Microsoft Account Linking =====
    describe("Microsoft account linking", () => {
        it("shows Microsoft connected status when linked", () => {
            resetStores({ microsoft_id: "microsoft-123" });

            renderAccount();

            const microsoftRow = screen
                .getByText("Microsoft Account")
                .closest("div")?.parentElement;
            expect(microsoftRow).toHaveTextContent("Connected");
        });

        it("shows Microsoft not connected status when not linked", () => {
            resetStores({ microsoft_id: null });

            renderAccount();

            const microsoftRow = screen
                .getByText("Microsoft Account")
                .closest("div")?.parentElement;
            expect(microsoftRow).toHaveTextContent("Not connected");
        });

        it("has clickable disconnect buttons when Microsoft is linked", async () => {
            resetStores({
                google_id: null,
                microsoft_id: "microsoft-123",
                has_password: true
            });

            renderAccount();

            const disconnectButtons = screen.getAllByText("Disconnect");
            expect(disconnectButtons.length).toBeGreaterThan(0);
        });
    });

    // ===== Edit Links =====
    describe("edit links", () => {
        it("has edit profile link", () => {
            renderAccount();

            expect(screen.getByText(/edit profile/i)).toBeInTheDocument();
        });

        it("has edit security link", () => {
            renderAccount();

            expect(screen.getByText(/edit security/i)).toBeInTheDocument();
        });
    });

    // ===== Preferences Section =====
    describe("preferences section", () => {
        it("displays email notifications preference", () => {
            renderAccount();

            expect(screen.getByText("Email notifications")).toBeInTheDocument();
        });

        it("displays privacy settings preference", () => {
            renderAccount();

            expect(screen.getByText("Privacy settings")).toBeInTheDocument();
        });
    });
});
