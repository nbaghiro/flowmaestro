/**
 * Card Component Tests
 *
 * Tests for the Card component and its sub-components (CardHeader, CardBody, CardFooter).
 *
 * BUGS THESE TESTS CATCH:
 *
 * 1. Variant bugs:
 *    - Hover effects not applied
 *    - Interactive cursor/border not applied
 *    - Default variant not applied
 *
 * 2. Structure bugs:
 *    - CardHeader, CardBody, CardFooter not rendering
 *    - Margins/padding incorrect between sections
 *    - Border not applied to CardFooter
 *
 * 3. Styling bugs:
 *    - Custom className not merged
 *    - Border/rounded corners missing
 *    - Background color not applied
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Card, CardHeader, CardBody, CardFooter } from "../Card";

describe("Card", () => {
    // ===== Basic Rendering =====
    describe("basic rendering", () => {
        it("renders children content", () => {
            render(<Card>Card content</Card>);

            expect(screen.getByText("Card content")).toBeInTheDocument();
        });

        it("renders as a div element", () => {
            render(<Card data-testid="card">Content</Card>);

            const card = screen.getByTestId("card");
            expect(card.tagName).toBe("DIV");
        });

        it("applies base styles", () => {
            render(<Card data-testid="card">Content</Card>);

            const card = screen.getByTestId("card");
            expect(card).toHaveClass("bg-card");
            expect(card).toHaveClass("border");
            expect(card).toHaveClass("border-border");
            expect(card).toHaveClass("rounded-lg");
            expect(card).toHaveClass("p-5");
        });
    });

    // ===== Variant Tests =====
    describe("variants", () => {
        it("applies default variant by default", () => {
            render(<Card data-testid="card">Content</Card>);

            const card = screen.getByTestId("card");
            // Default variant has no additional classes
            expect(card).toHaveClass("bg-card");
        });

        it("applies default variant explicitly", () => {
            render(
                <Card data-testid="card" variant="default">
                    Content
                </Card>
            );

            const card = screen.getByTestId("card");
            expect(card).toHaveClass("bg-card");
        });

        it("applies hover variant styles", () => {
            render(
                <Card data-testid="card" variant="hover">
                    Content
                </Card>
            );

            const card = screen.getByTestId("card");
            expect(card).toHaveClass("hover:shadow-md");
            expect(card).toHaveClass("transition-shadow");
        });

        it("applies interactive variant styles", () => {
            render(
                <Card data-testid="card" variant="interactive">
                    Content
                </Card>
            );

            const card = screen.getByTestId("card");
            expect(card).toHaveClass("hover:border-primary");
            expect(card).toHaveClass("hover:shadow-md");
            expect(card).toHaveClass("transition-all");
            expect(card).toHaveClass("cursor-pointer");
        });
    });

    // ===== Custom className =====
    describe("custom className", () => {
        it("merges custom className with default styles", () => {
            render(
                <Card data-testid="card" className="custom-card">
                    Content
                </Card>
            );

            const card = screen.getByTestId("card");
            expect(card).toHaveClass("custom-card");
            expect(card).toHaveClass("bg-card"); // Base class still present
        });

        it("allows style overrides via className", () => {
            render(
                <Card data-testid="card" className="p-10">
                    Content
                </Card>
            );

            const card = screen.getByTestId("card");
            expect(card).toHaveClass("p-10");
        });
    });

    // ===== HTML Attributes =====
    describe("HTML attributes", () => {
        it("passes through native div props", () => {
            render(
                <Card data-testid="card" aria-label="Main card" title="Card title">
                    Content
                </Card>
            );

            const card = screen.getByTestId("card");
            expect(card).toHaveAttribute("aria-label", "Main card");
            expect(card).toHaveAttribute("title", "Card title");
        });

        it("supports onClick handler", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();

            render(
                <Card data-testid="card" onClick={onClick} variant="interactive">
                    Clickable Card
                </Card>
            );

            await user.click(screen.getByTestId("card"));

            expect(onClick).toHaveBeenCalledTimes(1);
        });
    });
});

describe("CardHeader", () => {
    it("renders children content", () => {
        render(<CardHeader>Header Content</CardHeader>);

        expect(screen.getByText("Header Content")).toBeInTheDocument();
    });

    it("applies margin bottom", () => {
        render(<CardHeader data-testid="header">Header</CardHeader>);

        const header = screen.getByTestId("header");
        expect(header).toHaveClass("mb-3");
    });

    it("merges custom className", () => {
        render(
            <CardHeader data-testid="header" className="custom-header">
                Header
            </CardHeader>
        );

        const header = screen.getByTestId("header");
        expect(header).toHaveClass("custom-header");
        expect(header).toHaveClass("mb-3");
    });
});

describe("CardBody", () => {
    it("renders children content", () => {
        render(<CardBody>Body Content</CardBody>);

        expect(screen.getByText("Body Content")).toBeInTheDocument();
    });

    it("merges custom className", () => {
        render(
            <CardBody data-testid="body" className="custom-body">
                Body
            </CardBody>
        );

        const body = screen.getByTestId("body");
        expect(body).toHaveClass("custom-body");
    });
});

describe("CardFooter", () => {
    it("renders children content", () => {
        render(<CardFooter>Footer Content</CardFooter>);

        expect(screen.getByText("Footer Content")).toBeInTheDocument();
    });

    it("applies margin top and border", () => {
        render(<CardFooter data-testid="footer">Footer</CardFooter>);

        const footer = screen.getByTestId("footer");
        expect(footer).toHaveClass("mt-3");
        expect(footer).toHaveClass("pt-3");
        expect(footer).toHaveClass("border-t");
        expect(footer).toHaveClass("border-border");
    });

    it("merges custom className", () => {
        render(
            <CardFooter data-testid="footer" className="custom-footer">
                Footer
            </CardFooter>
        );

        const footer = screen.getByTestId("footer");
        expect(footer).toHaveClass("custom-footer");
        expect(footer).toHaveClass("mt-3");
    });
});

describe("Card composition", () => {
    it("renders complete card with all sections", () => {
        render(
            <Card data-testid="card">
                <CardHeader data-testid="header">
                    <h2>Card Title</h2>
                </CardHeader>
                <CardBody data-testid="body">
                    <p>Card content goes here</p>
                </CardBody>
                <CardFooter data-testid="footer">
                    <button>Action</button>
                </CardFooter>
            </Card>
        );

        expect(screen.getByTestId("card")).toBeInTheDocument();
        expect(screen.getByTestId("header")).toBeInTheDocument();
        expect(screen.getByTestId("body")).toBeInTheDocument();
        expect(screen.getByTestId("footer")).toBeInTheDocument();
        expect(screen.getByText("Card Title")).toBeInTheDocument();
        expect(screen.getByText("Card content goes here")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
    });

    it("renders interactive card for clickable content", async () => {
        const onClick = vi.fn();
        const user = userEvent.setup();

        render(
            <Card variant="interactive" onClick={onClick} data-testid="card">
                <CardHeader>Workflow Name</CardHeader>
                <CardBody>Click to open</CardBody>
            </Card>
        );

        const card = screen.getByTestId("card");
        expect(card).toHaveClass("cursor-pointer");

        await user.click(card);
        expect(onClick).toHaveBeenCalled();
    });
});
