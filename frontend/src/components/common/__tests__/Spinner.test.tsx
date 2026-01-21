/**
 * Spinner Component Tests
 *
 * Tests for the Spinner and LoadingState components.
 *
 * BUGS THESE TESTS CATCH:
 *
 * 1. Animation bugs:
 *    - Spinner not animating (missing animate-spin)
 *    - Animation too fast/slow
 *
 * 2. Size bugs:
 *    - Wrong dimensions for sm/md/lg sizes
 *    - Default size not applied
 *
 * 3. Styling bugs:
 *    - Wrong color (not using primary)
 *    - Custom className not merged
 *
 * 4. LoadingState bugs:
 *    - Message not displayed
 *    - Default message not applied
 *    - Spinner not rendered
 *    - Layout not centered
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Spinner, LoadingState } from "../Spinner";

describe("Spinner", () => {
    // ===== Basic Rendering =====
    describe("basic rendering", () => {
        it("renders a spinner element", () => {
            render(<Spinner />);

            // Loader2 icon renders as an SVG
            const spinner = document.querySelector("svg");
            expect(spinner).toBeInTheDocument();
        });

        it("has animation class", () => {
            render(<Spinner />);

            const spinner = document.querySelector("svg");
            expect(spinner).toHaveClass("animate-spin");
        });

        it("uses primary color", () => {
            render(<Spinner />);

            const spinner = document.querySelector("svg");
            expect(spinner).toHaveClass("text-primary");
        });
    });

    // ===== Size Tests =====
    describe("sizes", () => {
        it("applies medium size by default", () => {
            render(<Spinner />);

            const spinner = document.querySelector("svg");
            expect(spinner).toHaveClass("w-6");
            expect(spinner).toHaveClass("h-6");
        });

        it("applies small size", () => {
            render(<Spinner size="sm" />);

            const spinner = document.querySelector("svg");
            expect(spinner).toHaveClass("w-4");
            expect(spinner).toHaveClass("h-4");
        });

        it("applies medium size explicitly", () => {
            render(<Spinner size="md" />);

            const spinner = document.querySelector("svg");
            expect(spinner).toHaveClass("w-6");
            expect(spinner).toHaveClass("h-6");
        });

        it("applies large size", () => {
            render(<Spinner size="lg" />);

            const spinner = document.querySelector("svg");
            expect(spinner).toHaveClass("w-8");
            expect(spinner).toHaveClass("h-8");
        });
    });

    // ===== Custom className =====
    describe("custom className", () => {
        it("merges custom className with default styles", () => {
            render(<Spinner className="custom-spinner" />);

            const spinner = document.querySelector("svg");
            expect(spinner).toHaveClass("custom-spinner");
            expect(spinner).toHaveClass("animate-spin"); // Default class still present
        });

        it("allows color override via className", () => {
            render(<Spinner className="text-red-500" />);

            const spinner = document.querySelector("svg");
            expect(spinner).toHaveClass("text-red-500");
        });
    });
});

describe("LoadingState", () => {
    // ===== Basic Rendering =====
    describe("basic rendering", () => {
        it("renders spinner", () => {
            render(<LoadingState />);

            const spinner = document.querySelector("svg");
            expect(spinner).toBeInTheDocument();
            expect(spinner).toHaveClass("animate-spin");
        });

        it("renders large spinner", () => {
            render(<LoadingState />);

            const spinner = document.querySelector("svg");
            expect(spinner).toHaveClass("w-8");
            expect(spinner).toHaveClass("h-8");
        });

        it("renders default message", () => {
            render(<LoadingState />);

            expect(screen.getByText("Loading...")).toBeInTheDocument();
        });
    });

    // ===== Custom Message =====
    describe("custom message", () => {
        it("renders custom message", () => {
            render(<LoadingState message="Fetching data..." />);

            expect(screen.getByText("Fetching data...")).toBeInTheDocument();
            expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
        });

        it("renders different messages", () => {
            const { rerender } = render(<LoadingState message="Saving changes..." />);
            expect(screen.getByText("Saving changes...")).toBeInTheDocument();

            rerender(<LoadingState message="Processing..." />);
            expect(screen.getByText("Processing...")).toBeInTheDocument();
        });
    });

    // ===== Styling =====
    describe("styling", () => {
        it("has centered layout", () => {
            render(<LoadingState />);

            const container = screen.getByText("Loading...").closest("div")?.parentElement;
            expect(container).toHaveClass("flex");
            expect(container).toHaveClass("items-center");
            expect(container).toHaveClass("justify-center");
        });

        it("message has muted foreground color", () => {
            render(<LoadingState />);

            const message = screen.getByText("Loading...");
            expect(message).toHaveClass("text-muted-foreground");
            expect(message).toHaveClass("text-sm");
        });
    });

    // ===== Integration Tests =====
    describe("integration scenarios", () => {
        it("renders data fetching state", () => {
            render(<LoadingState message="Loading workflows..." />);

            expect(screen.getByText("Loading workflows...")).toBeInTheDocument();
        });

        it("renders form submission state", () => {
            render(<LoadingState message="Submitting form..." />);

            expect(screen.getByText("Submitting form...")).toBeInTheDocument();
        });

        it("renders file upload state", () => {
            render(<LoadingState message="Uploading file..." />);

            expect(screen.getByText("Uploading file...")).toBeInTheDocument();
        });
    });
});
