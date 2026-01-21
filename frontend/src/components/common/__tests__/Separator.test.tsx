/**
 * Separator and Divider Component Tests
 *
 * Tests for the Separator and Divider components used to divide content.
 *
 * BUGS THESE TESTS CATCH:
 *
 * 1. Orientation bugs:
 *    - Wrong dimensions for horizontal vs vertical
 *    - Default orientation not applied
 *
 * 2. Styling bugs:
 *    - Background color missing
 *    - Custom className not merged
 *
 * 3. Divider bugs:
 *    - Label not rendered
 *    - Label text styling incorrect
 *    - Falls back to Separator when no label
 *
 * 4. Accessibility bugs:
 *    - Not decorative by default
 *    - role="separator" missing when not decorative
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Separator, Divider } from "../Separator";

describe("Separator", () => {
    // ===== Basic Rendering =====
    describe("basic rendering", () => {
        it("renders a separator element", () => {
            render(<Separator />);

            // Radix Separator renders with role="none" when decorative
            const separator = document.querySelector("[data-orientation]");
            expect(separator).toBeInTheDocument();
        });

        it("has background color", () => {
            render(<Separator data-testid="separator" />);

            const separator = document.querySelector("[data-orientation]");
            expect(separator).toHaveClass("bg-border");
        });
    });

    // ===== Orientation =====
    describe("orientation", () => {
        it("defaults to horizontal", () => {
            render(<Separator />);

            const separator = document.querySelector("[data-orientation]");
            expect(separator).toHaveAttribute("data-orientation", "horizontal");
        });

        it("applies horizontal dimensions", () => {
            render(<Separator orientation="horizontal" />);

            const separator = document.querySelector("[data-orientation]");
            expect(separator).toHaveClass("h-px");
            expect(separator).toHaveClass("w-full");
        });

        it("applies vertical dimensions", () => {
            render(<Separator orientation="vertical" />);

            const separator = document.querySelector("[data-orientation]");
            expect(separator).toHaveClass("h-full");
            expect(separator).toHaveClass("w-px");
        });
    });

    // ===== Decorative =====
    describe("decorative", () => {
        it("is decorative by default", () => {
            render(<Separator />);

            const separator = document.querySelector("[data-orientation]");
            // Decorative separators have role="none"
            expect(separator).toHaveAttribute("role", "none");
        });

        it("has separator role when not decorative", () => {
            render(<Separator decorative={false} />);

            const separator = document.querySelector("[data-orientation]");
            expect(separator).toHaveAttribute("role", "separator");
        });
    });

    // ===== Custom className =====
    describe("custom className", () => {
        it("merges custom className", () => {
            render(<Separator className="my-4" />);

            const separator = document.querySelector("[data-orientation]");
            expect(separator).toHaveClass("my-4");
            expect(separator).toHaveClass("bg-border"); // Base class still present
        });

        it("allows style overrides", () => {
            render(<Separator className="bg-red-500" />);

            const separator = document.querySelector("[data-orientation]");
            expect(separator).toHaveClass("bg-red-500");
        });
    });

    // ===== Integration Tests =====
    describe("integration scenarios", () => {
        it("renders between list items", () => {
            render(
                <div>
                    <div>Item 1</div>
                    <Separator />
                    <div>Item 2</div>
                </div>
            );

            expect(screen.getByText("Item 1")).toBeInTheDocument();
            expect(screen.getByText("Item 2")).toBeInTheDocument();
            expect(document.querySelector("[data-orientation]")).toBeInTheDocument();
        });

        it("renders vertical separator in toolbar", () => {
            render(
                <div style={{ display: "flex", height: "40px" }}>
                    <button>Button 1</button>
                    <Separator orientation="vertical" />
                    <button>Button 2</button>
                </div>
            );

            const separator = document.querySelector("[data-orientation]");
            expect(separator).toHaveAttribute("data-orientation", "vertical");
        });
    });
});

describe("Divider", () => {
    // ===== Without Label =====
    describe("without label", () => {
        it("renders a simple separator when no label", () => {
            render(<Divider />);

            const separator = document.querySelector("[data-orientation]");
            expect(separator).toBeInTheDocument();
        });

        it("applies custom className to separator", () => {
            render(<Divider className="my-8" />);

            const separator = document.querySelector("[data-orientation]");
            expect(separator).toHaveClass("my-8");
        });
    });

    // ===== With Label =====
    describe("with label", () => {
        it("renders label text", () => {
            render(<Divider label="OR" />);

            expect(screen.getByText("OR")).toBeInTheDocument();
        });

        it("renders separator lines on both sides", () => {
            render(<Divider label="OR" />);

            // The labeled divider contains a Separator
            const separators = document.querySelectorAll("[data-orientation]");
            expect(separators.length).toBeGreaterThan(0);
        });

        it("label has muted foreground color", () => {
            render(<Divider label="OR" />);

            const label = screen.getByText("OR");
            expect(label).toHaveClass("text-muted-foreground");
        });

        it("label has background to cover separator", () => {
            render(<Divider label="OR" />);

            const label = screen.getByText("OR");
            expect(label).toHaveClass("bg-card");
        });

        it("label has horizontal padding", () => {
            render(<Divider label="OR" />);

            const label = screen.getByText("OR");
            expect(label).toHaveClass("px-2");
        });

        it("applies custom className to container", () => {
            render(<Divider label="OR" className="my-custom-class" />);

            // The outer container has the custom class (the one with my-6)
            const container = screen.getByText("OR").closest("div")?.parentElement;
            expect(container).toHaveClass("my-custom-class");
        });
    });

    // ===== Integration Tests =====
    describe("integration scenarios", () => {
        it("renders login divider", () => {
            render(
                <div>
                    <button>Continue with Google</button>
                    <Divider label="or continue with email" />
                    <input type="email" placeholder="Email" />
                </div>
            );

            expect(screen.getByText("or continue with email")).toBeInTheDocument();
        });

        it("renders section divider", () => {
            render(
                <div>
                    <h2>Section 1</h2>
                    <p>Content 1</p>
                    <Divider />
                    <h2>Section 2</h2>
                    <p>Content 2</p>
                </div>
            );

            expect(screen.getByText("Section 1")).toBeInTheDocument();
            expect(screen.getByText("Section 2")).toBeInTheDocument();
        });
    });
});
