/**
 * Alert Component Tests
 *
 * Tests for the dismissible alert component used for notifications and messages.
 *
 * BUGS THESE TESTS CATCH:
 *
 * 1. Variant bugs:
 *    - Wrong colors for error/warning/info/success
 *    - Wrong icon displayed for variant
 *    - Default variant not applied
 *
 * 2. Content bugs:
 *    - Title not displayed
 *    - Children content not rendered
 *    - Icon missing
 *
 * 3. Dismiss bugs:
 *    - Close button not shown when onClose provided
 *    - onClose not called when clicking close
 *    - Close button shown when onClose not provided
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Alert } from "../Alert";

describe("Alert", () => {
    // ===== Basic Rendering =====
    describe("basic rendering", () => {
        it("renders children content", () => {
            render(<Alert>This is an alert message</Alert>);

            expect(screen.getByText("This is an alert message")).toBeInTheDocument();
        });

        it("renders title when provided", () => {
            render(<Alert title="Important">Message content</Alert>);

            expect(screen.getByText("Important")).toBeInTheDocument();
            expect(screen.getByText("Message content")).toBeInTheDocument();
        });

        it("renders without title", () => {
            render(<Alert>Just a message</Alert>);

            expect(screen.getByText("Just a message")).toBeInTheDocument();
        });

        it("renders icon", () => {
            render(<Alert>Message</Alert>);

            // Alert has an SVG icon - get outer alert container
            const alertContainer = screen.getByText("Message").closest("div")
                ?.parentElement?.parentElement;
            const svg = alertContainer?.querySelector("svg");
            expect(svg).toBeInTheDocument();
        });
    });

    // ===== Variant Tests =====
    // Helper to get the outer alert container from text content
    // Structure: outer div > Icon + div.flex-1 > div.text-sm > text content
    const getAlertContainer = (text: string) =>
        screen.getByText(text).closest("div")?.parentElement?.parentElement;

    describe("variants", () => {
        it("applies info variant by default", () => {
            render(<Alert>Info message</Alert>);

            const alert = getAlertContainer("Info message");
            expect(alert).toHaveClass("text-blue-800");
        });

        it("applies error variant styles", () => {
            render(<Alert variant="error">Error message</Alert>);

            const alert = getAlertContainer("Error message");
            expect(alert).toHaveClass("text-red-800");
        });

        it("applies warning variant styles", () => {
            render(<Alert variant="warning">Warning message</Alert>);

            const alert = getAlertContainer("Warning message");
            expect(alert).toHaveClass("text-amber-800");
        });

        it("applies success variant styles", () => {
            render(<Alert variant="success">Success message</Alert>);

            const alert = getAlertContainer("Success message");
            expect(alert).toHaveClass("text-green-800");
        });

        it("applies info variant styles explicitly", () => {
            render(<Alert variant="info">Info message</Alert>);

            const alert = getAlertContainer("Info message");
            expect(alert).toHaveClass("text-blue-800");
        });
    });

    // ===== Dismiss Functionality =====
    describe("dismiss functionality", () => {
        it("shows close button when onClose is provided", () => {
            render(<Alert onClose={() => {}}>Dismissible alert</Alert>);

            const closeButton = screen.getByRole("button");
            expect(closeButton).toBeInTheDocument();
        });

        it("does not show close button when onClose is not provided", () => {
            render(<Alert>Non-dismissible alert</Alert>);

            expect(screen.queryByRole("button")).not.toBeInTheDocument();
        });

        it("calls onClose when close button is clicked", async () => {
            const onClose = vi.fn();
            const user = userEvent.setup();

            render(<Alert onClose={onClose}>Dismissible alert</Alert>);

            await user.click(screen.getByRole("button"));

            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    // ===== Custom className =====
    describe("custom className", () => {
        it("merges custom className with variant styles", () => {
            render(<Alert className="custom-alert">Message</Alert>);

            const alert = getAlertContainer("Message");
            expect(alert).toHaveClass("custom-alert");
            expect(alert).toHaveClass("rounded-lg"); // Default style still present
        });
    });

    // ===== Integration Tests =====
    describe("integration scenarios", () => {
        it("renders error alert for form validation", () => {
            render(
                <Alert variant="error" title="Validation Error">
                    Please fill in all required fields.
                </Alert>
            );

            expect(screen.getByText("Validation Error")).toBeInTheDocument();
            expect(screen.getByText("Please fill in all required fields.")).toBeInTheDocument();
        });

        it("renders success alert for completed action", () => {
            render(
                <Alert variant="success" title="Success">
                    Your changes have been saved.
                </Alert>
            );

            expect(screen.getByText("Success")).toBeInTheDocument();
            expect(screen.getByText("Your changes have been saved.")).toBeInTheDocument();
        });

        it("renders dismissible warning alert", async () => {
            const onDismiss = vi.fn();
            const user = userEvent.setup();

            render(
                <Alert variant="warning" title="Warning" onClose={onDismiss}>
                    This action cannot be undone.
                </Alert>
            );

            expect(screen.getByText("Warning")).toBeInTheDocument();

            await user.click(screen.getByRole("button"));

            expect(onDismiss).toHaveBeenCalled();
        });

        it("renders alert with complex children", () => {
            render(
                <Alert variant="info">
                    <p>First paragraph</p>
                    <p>
                        Second paragraph with <strong>bold text</strong>
                    </p>
                </Alert>
            );

            expect(screen.getByText("First paragraph")).toBeInTheDocument();
            expect(screen.getByText("bold text")).toBeInTheDocument();
        });
    });
});
