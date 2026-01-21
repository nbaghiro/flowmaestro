/**
 * Badge Component Tests
 *
 * Tests for the Badge component used for status indicators, labels, and tags.
 *
 * BUGS THESE TESTS CATCH:
 *
 * 1. Variant bugs:
 *    - Wrong colors for success/error/warning/info/primary/purple/pro
 *    - Default variant not applied
 *    - Variant classes overwriting each other
 *
 * 2. Size bugs:
 *    - Wrong padding/text size for sm/md
 *    - Default size not applied when none specified
 *
 * 3. Content bugs:
 *    - Children not rendered
 *    - Text content not visible
 *
 * 4. Styling bugs:
 *    - Custom className not merged
 *    - Custom className overwriting core styles
 *    - Missing rounded corners or font-medium
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "../Badge";

describe("Badge", () => {
    // ===== Basic Rendering =====
    describe("basic rendering", () => {
        it("renders children text", () => {
            render(<Badge>Status</Badge>);

            expect(screen.getByText("Status")).toBeInTheDocument();
        });

        it("renders as a span element", () => {
            render(<Badge>Test</Badge>);

            const badge = screen.getByText("Test");
            expect(badge.tagName).toBe("SPAN");
        });

        it("applies base styles", () => {
            render(<Badge>Test</Badge>);

            const badge = screen.getByText("Test");
            expect(badge).toHaveClass("inline-flex");
            expect(badge).toHaveClass("items-center");
            expect(badge).toHaveClass("rounded");
            expect(badge).toHaveClass("font-medium");
        });

        it("renders complex children", () => {
            render(
                <Badge>
                    <span>Icon</span> Text
                </Badge>
            );

            expect(screen.getByText("Icon")).toBeInTheDocument();
            expect(screen.getByText(/Text/)).toBeInTheDocument();
        });
    });

    // ===== Variant Tests =====
    describe("variants", () => {
        it("applies default variant by default", () => {
            render(<Badge>Default</Badge>);

            const badge = screen.getByText("Default");
            expect(badge).toHaveClass("bg-muted");
            expect(badge).toHaveClass("text-muted-foreground");
        });

        it("applies default variant explicitly", () => {
            render(<Badge variant="default">Default</Badge>);

            const badge = screen.getByText("Default");
            expect(badge).toHaveClass("bg-muted");
            expect(badge).toHaveClass("text-muted-foreground");
        });

        it("applies primary variant styles", () => {
            render(<Badge variant="primary">Primary</Badge>);

            const badge = screen.getByText("Primary");
            expect(badge).toHaveClass("bg-primary/10");
            expect(badge).toHaveClass("text-primary");
        });

        it("applies success variant styles", () => {
            render(<Badge variant="success">Success</Badge>);

            const badge = screen.getByText("Success");
            expect(badge).toHaveClass("text-green-700");
        });

        it("applies warning variant styles", () => {
            render(<Badge variant="warning">Warning</Badge>);

            const badge = screen.getByText("Warning");
            expect(badge).toHaveClass("text-amber-700");
        });

        it("applies error variant styles", () => {
            render(<Badge variant="error">Error</Badge>);

            const badge = screen.getByText("Error");
            expect(badge).toHaveClass("text-red-700");
        });

        it("applies info variant styles", () => {
            render(<Badge variant="info">Info</Badge>);

            const badge = screen.getByText("Info");
            expect(badge).toHaveClass("text-blue-700");
        });

        it("applies purple variant styles", () => {
            render(<Badge variant="purple">Purple</Badge>);

            const badge = screen.getByText("Purple");
            expect(badge).toHaveClass("text-purple-700");
        });

        it("applies pro variant styles", () => {
            render(<Badge variant="pro">Pro</Badge>);

            const badge = screen.getByText("Pro");
            expect(badge).toHaveClass("text-amber-700");
        });
    });

    // ===== Size Tests =====
    describe("sizes", () => {
        it("applies medium size by default", () => {
            render(<Badge>Medium</Badge>);

            const badge = screen.getByText("Medium");
            expect(badge).toHaveClass("px-2");
            expect(badge).toHaveClass("py-1");
            expect(badge).toHaveClass("text-sm");
        });

        it("applies small size styles", () => {
            render(<Badge size="sm">Small</Badge>);

            const badge = screen.getByText("Small");
            expect(badge).toHaveClass("px-1.5");
            expect(badge).toHaveClass("py-0.5");
            expect(badge).toHaveClass("text-xs");
        });

        it("applies medium size styles explicitly", () => {
            render(<Badge size="md">Medium</Badge>);

            const badge = screen.getByText("Medium");
            expect(badge).toHaveClass("px-2");
            expect(badge).toHaveClass("py-1");
            expect(badge).toHaveClass("text-sm");
        });
    });

    // ===== Custom className Tests =====
    describe("custom className", () => {
        it("merges custom className with variant classes", () => {
            render(<Badge className="custom-badge">Test</Badge>);

            const badge = screen.getByText("Test");
            expect(badge).toHaveClass("custom-badge");
            expect(badge).toHaveClass("rounded"); // Base class still present
        });

        it("allows style overrides via className", () => {
            render(<Badge className="bg-pink-500">Test</Badge>);

            const badge = screen.getByText("Test");
            expect(badge).toHaveClass("bg-pink-500");
        });
    });

    // ===== HTML Attributes =====
    describe("HTML attributes", () => {
        it("passes through native span props", () => {
            render(
                <Badge data-testid="my-badge" aria-label="Status badge" title="Badge tooltip">
                    Test
                </Badge>
            );

            const badge = screen.getByTestId("my-badge");
            expect(badge).toHaveAttribute("aria-label", "Status badge");
            expect(badge).toHaveAttribute("title", "Badge tooltip");
        });

        it("supports onClick handler", async () => {
            const { default: userEvent } = await import("@testing-library/user-event");
            const user = userEvent.setup();
            let clicked = false;

            render(<Badge onClick={() => (clicked = true)}>Clickable</Badge>);

            await user.click(screen.getByText("Clickable"));

            expect(clicked).toBe(true);
        });
    });

    // ===== Integration Tests =====
    describe("integration scenarios", () => {
        it("renders status badge for workflow state", () => {
            render(<Badge variant="success">Running</Badge>);

            const badge = screen.getByText("Running");
            expect(badge).toHaveClass("text-green-700");
        });

        it("renders error badge for failed state", () => {
            render(<Badge variant="error">Failed</Badge>);

            const badge = screen.getByText("Failed");
            expect(badge).toHaveClass("text-red-700");
        });

        it("renders small badge for compact UI", () => {
            render(
                <Badge variant="info" size="sm">
                    New
                </Badge>
            );

            const badge = screen.getByText("New");
            expect(badge).toHaveClass("text-xs");
            expect(badge).toHaveClass("text-blue-700");
        });

        it("renders pro badge for premium features", () => {
            render(
                <Badge variant="pro" size="sm">
                    PRO
                </Badge>
            );

            const badge = screen.getByText("PRO");
            expect(badge).toHaveClass("text-amber-700");
            expect(badge).toHaveClass("text-xs");
        });
    });
});
