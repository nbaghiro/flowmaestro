/**
 * FormField and FormSection Component Tests
 *
 * Tests for form layout components.
 *
 * BUGS THESE TESTS CATCH:
 *
 * 1. FormField bugs:
 *    - Label not rendered
 *    - Children not rendered
 *    - Error message not shown
 *    - Description not shown
 *    - Error takes precedence over description (both shown)
 *
 * 2. FormSection bugs:
 *    - Title not rendered
 *    - Children not rendered
 *    - Collapse not working
 *    - Default expanded state not respected
 *    - Non-collapsible still has chevron/hover styles
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { FormField, FormSection } from "../FormField";

describe("FormField", () => {
    // ===== Basic Rendering =====
    describe("basic rendering", () => {
        it("renders label", () => {
            render(
                <FormField label="Email">
                    <input type="email" />
                </FormField>
            );

            expect(screen.getByText("Email")).toBeInTheDocument();
        });

        it("renders children", () => {
            render(
                <FormField label="Email">
                    <input type="email" data-testid="email-input" />
                </FormField>
            );

            expect(screen.getByTestId("email-input")).toBeInTheDocument();
        });

        it("label has correct styling", () => {
            render(
                <FormField label="Email">
                    <input />
                </FormField>
            );

            const label = screen.getByText("Email");
            expect(label).toHaveClass("text-sm");
            expect(label).toHaveClass("font-medium");
            expect(label).toHaveClass("text-foreground");
        });
    });

    // ===== Description =====
    describe("description", () => {
        it("renders description when provided", () => {
            render(
                <FormField label="Email" description="We'll never share your email">
                    <input />
                </FormField>
            );

            expect(screen.getByText("We'll never share your email")).toBeInTheDocument();
        });

        it("does not render description when not provided", () => {
            render(
                <FormField label="Email">
                    <input />
                </FormField>
            );

            const container = screen.getByText("Email").closest("div");
            const paragraphs = container?.querySelectorAll("p");
            expect(paragraphs?.length || 0).toBe(0);
        });

        it("description has muted styling", () => {
            render(
                <FormField label="Email" description="Helper text">
                    <input />
                </FormField>
            );

            const description = screen.getByText("Helper text");
            expect(description).toHaveClass("text-xs");
            expect(description).toHaveClass("text-muted-foreground");
        });

        it("renders JSX description", () => {
            render(
                <FormField
                    label="Password"
                    description={
                        <span>
                            Must be <strong>8 characters</strong> minimum
                        </span>
                    }
                >
                    <input type="password" />
                </FormField>
            );

            expect(screen.getByText("8 characters")).toBeInTheDocument();
        });
    });

    // ===== Error State =====
    describe("error state", () => {
        it("renders error message when provided", () => {
            render(
                <FormField label="Email" error="Email is required">
                    <input />
                </FormField>
            );

            expect(screen.getByText("Email is required")).toBeInTheDocument();
        });

        it("error has destructive styling", () => {
            render(
                <FormField label="Email" error="Invalid email">
                    <input />
                </FormField>
            );

            // The text-destructive class is on the parent <p> element
            const errorContainer = screen.getByText("Invalid email").closest("p");
            expect(errorContainer).toHaveClass("text-destructive");
        });

        it("shows error icon", () => {
            render(
                <FormField label="Email" error="Error message">
                    <input />
                </FormField>
            );

            // AlertCircle icon should be rendered
            const errorContainer = screen.getByText("Error message").closest("p");
            const svg = errorContainer?.querySelector("svg");
            expect(svg).toBeInTheDocument();
        });

        it("hides description when error is present", () => {
            render(
                <FormField
                    label="Email"
                    description="We'll never share your email"
                    error="Email is required"
                >
                    <input />
                </FormField>
            );

            expect(screen.getByText("Email is required")).toBeInTheDocument();
            expect(screen.queryByText("We'll never share your email")).not.toBeInTheDocument();
        });

        it("shows description when no error", () => {
            render(
                <FormField label="Email" description="Helper text">
                    <input />
                </FormField>
            );

            expect(screen.getByText("Helper text")).toBeInTheDocument();
        });
    });

    // ===== Integration Tests =====
    describe("integration scenarios", () => {
        it("renders complete form field", () => {
            render(
                <FormField label="Email Address" description="Enter your work email">
                    <input type="email" placeholder="john@company.com" />
                </FormField>
            );

            expect(screen.getByText("Email Address")).toBeInTheDocument();
            expect(screen.getByText("Enter your work email")).toBeInTheDocument();
            expect(screen.getByPlaceholderText("john@company.com")).toBeInTheDocument();
        });

        it("renders field with validation error", () => {
            render(
                <FormField label="Password" error="Password must be at least 8 characters">
                    <input type="password" />
                </FormField>
            );

            expect(screen.getByText("Password")).toBeInTheDocument();
            expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
        });
    });
});

describe("FormSection", () => {
    // ===== Basic Rendering =====
    describe("basic rendering", () => {
        it("renders title", () => {
            render(
                <FormSection title="General Settings">
                    <div>Content</div>
                </FormSection>
            );

            expect(screen.getByText("General Settings")).toBeInTheDocument();
        });

        it("renders children when expanded", () => {
            render(
                <FormSection title="Settings" defaultExpanded={true}>
                    <div>Section content</div>
                </FormSection>
            );

            expect(screen.getByText("Section content")).toBeInTheDocument();
        });

        it("title has uppercase styling", () => {
            render(
                <FormSection title="Settings">
                    <div>Content</div>
                </FormSection>
            );

            const title = screen.getByText("Settings");
            expect(title).toHaveClass("uppercase");
            expect(title).toHaveClass("text-xs");
            expect(title).toHaveClass("font-semibold");
        });
    });

    // ===== Collapse Behavior =====
    describe("collapse behavior", () => {
        it("is expanded by default", () => {
            render(
                <FormSection title="Settings">
                    <div data-testid="content">Content</div>
                </FormSection>
            );

            // Content should be visible
            const content = screen.getByTestId("content");
            expect(content).toBeInTheDocument();
        });

        it("respects defaultExpanded=false", () => {
            render(
                <FormSection title="Settings" defaultExpanded={false}>
                    <div data-testid="content">Content</div>
                </FormSection>
            );

            // Content container should have collapsed styles
            const content = screen.getByTestId("content").closest("div[class*='max-h']");
            expect(content).toHaveClass("max-h-0");
            expect(content).toHaveClass("opacity-0");
        });

        it("toggles on click when collapsible", async () => {
            const user = userEvent.setup();

            render(
                <FormSection title="Settings" collapsible={true} defaultExpanded={true}>
                    <div data-testid="content">Content</div>
                </FormSection>
            );

            const button = screen.getByRole("button");

            // Initially expanded
            let content = screen.getByTestId("content").closest("div[class*='max-h']");
            expect(content).not.toHaveClass("max-h-0");

            // Click to collapse
            await user.click(button);

            content = screen.getByTestId("content").closest("div[class*='max-h']");
            expect(content).toHaveClass("max-h-0");

            // Click to expand
            await user.click(button);

            content = screen.getByTestId("content").closest("div[class*='max-h']");
            expect(content).not.toHaveClass("max-h-0");
        });

        it("shows chevron when collapsible", () => {
            render(
                <FormSection title="Settings" collapsible={true}>
                    <div>Content</div>
                </FormSection>
            );

            const button = screen.getByRole("button");
            const svg = button.querySelector("svg");
            expect(svg).toBeInTheDocument();
        });

        it("does not show chevron when not collapsible", () => {
            render(
                <FormSection title="Settings" collapsible={false}>
                    <div>Content</div>
                </FormSection>
            );

            const button = screen.getByRole("button");
            const svg = button.querySelector("svg");
            expect(svg).not.toBeInTheDocument();
        });

        it("does not toggle when collapsible=false", async () => {
            const user = userEvent.setup();

            render(
                <FormSection title="Settings" collapsible={false} defaultExpanded={true}>
                    <div data-testid="content">Content</div>
                </FormSection>
            );

            const button = screen.getByRole("button");

            // Initially expanded
            let content = screen.getByTestId("content").closest("div[class*='max-h']");
            expect(content).not.toHaveClass("max-h-0");

            // Click should not collapse
            await user.click(button);

            content = screen.getByTestId("content").closest("div[class*='max-h']");
            expect(content).not.toHaveClass("max-h-0");
        });

        it("button is disabled when not collapsible", () => {
            render(
                <FormSection title="Settings" collapsible={false}>
                    <div>Content</div>
                </FormSection>
            );

            const button = screen.getByRole("button");
            expect(button).toBeDisabled();
        });
    });

    // ===== Styling =====
    describe("styling", () => {
        it("has hover styles when collapsible", () => {
            render(
                <FormSection title="Settings" collapsible={true}>
                    <div>Content</div>
                </FormSection>
            );

            const button = screen.getByRole("button");
            expect(button).toHaveClass("cursor-pointer");
            expect(button).toHaveClass("hover:bg-muted/50");
        });

        it("has default cursor when not collapsible", () => {
            render(
                <FormSection title="Settings" collapsible={false}>
                    <div>Content</div>
                </FormSection>
            );

            const button = screen.getByRole("button");
            expect(button).toHaveClass("cursor-default");
        });

        it("has border bottom", () => {
            render(
                <FormSection title="Settings">
                    <div>Content</div>
                </FormSection>
            );

            const section = screen.getByText("Settings").closest("div[class*='border-b']");
            expect(section).toHaveClass("border-b");
            expect(section).toHaveClass("border-border");
        });
    });

    // ===== Integration Tests =====
    describe("integration scenarios", () => {
        it("renders settings section with form fields", () => {
            render(
                <FormSection title="Account Settings">
                    <FormField label="Username">
                        <input type="text" />
                    </FormField>
                    <FormField label="Email">
                        <input type="email" />
                    </FormField>
                </FormSection>
            );

            expect(screen.getByText("Account Settings")).toBeInTheDocument();
            expect(screen.getByText("Username")).toBeInTheDocument();
            expect(screen.getByText("Email")).toBeInTheDocument();
        });

        it("renders multiple collapsible sections", () => {
            render(
                <>
                    <FormSection title="Section 1" defaultExpanded={true}>
                        <div data-testid="content-1">Content 1</div>
                    </FormSection>
                    <FormSection title="Section 2" defaultExpanded={false}>
                        <div data-testid="content-2">Content 2</div>
                    </FormSection>
                </>
            );

            // Section 1 expanded, Section 2 collapsed
            expect(screen.getByTestId("content-1").closest("div[class*='max-h']")).not.toHaveClass(
                "max-h-0"
            );
            expect(screen.getByTestId("content-2").closest("div[class*='max-h']")).toHaveClass(
                "max-h-0"
            );
        });
    });
});
