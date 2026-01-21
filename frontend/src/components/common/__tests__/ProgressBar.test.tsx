/**
 * ProgressBar Component Tests
 *
 * Tests for the ProgressBar component used to show progress indicators.
 *
 * BUGS THESE TESTS CATCH:
 *
 * 1. Value calculation bugs:
 *    - Percentage not calculated correctly
 *    - Values > 100 not clamped
 *    - Values < 0 not clamped
 *    - Custom max not respected
 *
 * 2. Variant bugs:
 *    - Wrong color for primary/success/warning/error
 *    - Default variant not applied
 *
 * 3. Size bugs:
 *    - Wrong height for sm/md/lg
 *    - Default size not applied
 *
 * 4. Label bugs:
 *    - Label not shown when showLabel=true
 *    - Label shown when showLabel=false
 *    - Percentage rounding incorrect
 *
 * 5. Accessibility bugs:
 *    - Missing role="progressbar"
 *    - Missing aria-valuenow
 *    - Missing aria-valuemin/max
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProgressBar } from "../ProgressBar";

describe("ProgressBar", () => {
    // ===== Basic Rendering =====
    describe("basic rendering", () => {
        it("renders a progressbar", () => {
            render(<ProgressBar value={50} />);

            expect(screen.getByRole("progressbar")).toBeInTheDocument();
        });

        it("has correct width based on value", () => {
            render(<ProgressBar value={75} />);

            const progressBar = screen.getByRole("progressbar");
            expect(progressBar).toHaveStyle({ width: "75%" });
        });

        it("has rounded corners", () => {
            render(<ProgressBar value={50} />);

            const progressBar = screen.getByRole("progressbar");
            expect(progressBar).toHaveClass("rounded-full");
        });
    });

    // ===== Value Calculation =====
    describe("value calculation", () => {
        it("calculates percentage correctly", () => {
            render(<ProgressBar value={25} />);

            const progressBar = screen.getByRole("progressbar");
            expect(progressBar).toHaveStyle({ width: "25%" });
        });

        it("clamps values over 100", () => {
            render(<ProgressBar value={150} />);

            const progressBar = screen.getByRole("progressbar");
            expect(progressBar).toHaveStyle({ width: "100%" });
        });

        it("clamps values below 0", () => {
            render(<ProgressBar value={-10} />);

            const progressBar = screen.getByRole("progressbar");
            expect(progressBar).toHaveStyle({ width: "0%" });
        });

        it("respects custom max value", () => {
            render(<ProgressBar value={5} max={10} />);

            const progressBar = screen.getByRole("progressbar");
            expect(progressBar).toHaveStyle({ width: "50%" });
        });

        it("handles 0 value", () => {
            render(<ProgressBar value={0} />);

            const progressBar = screen.getByRole("progressbar");
            expect(progressBar).toHaveStyle({ width: "0%" });
        });

        it("handles 100 value", () => {
            render(<ProgressBar value={100} />);

            const progressBar = screen.getByRole("progressbar");
            expect(progressBar).toHaveStyle({ width: "100%" });
        });
    });

    // ===== Variant Tests =====
    describe("variants", () => {
        it("applies primary variant by default", () => {
            render(<ProgressBar value={50} />);

            const progressBar = screen.getByRole("progressbar");
            expect(progressBar).toHaveClass("bg-blue-600");
        });

        it("applies primary variant explicitly", () => {
            render(<ProgressBar value={50} variant="primary" />);

            const progressBar = screen.getByRole("progressbar");
            expect(progressBar).toHaveClass("bg-blue-600");
        });

        it("applies success variant", () => {
            render(<ProgressBar value={50} variant="success" />);

            const progressBar = screen.getByRole("progressbar");
            expect(progressBar).toHaveClass("bg-green-600");
        });

        it("applies warning variant", () => {
            render(<ProgressBar value={50} variant="warning" />);

            const progressBar = screen.getByRole("progressbar");
            expect(progressBar).toHaveClass("bg-amber-600");
        });

        it("applies error variant", () => {
            render(<ProgressBar value={50} variant="error" />);

            const progressBar = screen.getByRole("progressbar");
            expect(progressBar).toHaveClass("bg-red-600");
        });
    });

    // ===== Size Tests =====
    describe("sizes", () => {
        it("applies medium size by default", () => {
            render(<ProgressBar value={50} />);

            // The track container has the height
            const track = screen.getByRole("progressbar").parentElement;
            expect(track).toHaveClass("h-2");
        });

        it("applies small size", () => {
            render(<ProgressBar value={50} size="sm" />);

            const track = screen.getByRole("progressbar").parentElement;
            expect(track).toHaveClass("h-1");
        });

        it("applies medium size explicitly", () => {
            render(<ProgressBar value={50} size="md" />);

            const track = screen.getByRole("progressbar").parentElement;
            expect(track).toHaveClass("h-2");
        });

        it("applies large size", () => {
            render(<ProgressBar value={50} size="lg" />);

            const track = screen.getByRole("progressbar").parentElement;
            expect(track).toHaveClass("h-3");
        });
    });

    // ===== Label Tests =====
    describe("label", () => {
        it("does not show label by default", () => {
            render(<ProgressBar value={50} />);

            expect(screen.queryByText("50%")).not.toBeInTheDocument();
        });

        it("shows label when showLabel is true", () => {
            render(<ProgressBar value={50} showLabel />);

            expect(screen.getByText("50%")).toBeInTheDocument();
        });

        it("rounds percentage in label", () => {
            render(<ProgressBar value={33.333} showLabel />);

            expect(screen.getByText("33%")).toBeInTheDocument();
        });

        it("shows 0% label", () => {
            render(<ProgressBar value={0} showLabel />);

            expect(screen.getByText("0%")).toBeInTheDocument();
        });

        it("shows 100% label", () => {
            render(<ProgressBar value={100} showLabel />);

            expect(screen.getByText("100%")).toBeInTheDocument();
        });

        it("shows clamped label for values over 100", () => {
            render(<ProgressBar value={150} showLabel />);

            expect(screen.getByText("100%")).toBeInTheDocument();
        });
    });

    // ===== Accessibility =====
    describe("accessibility", () => {
        it("has progressbar role", () => {
            render(<ProgressBar value={50} />);

            expect(screen.getByRole("progressbar")).toBeInTheDocument();
        });

        it("has aria-valuenow", () => {
            render(<ProgressBar value={75} />);

            const progressBar = screen.getByRole("progressbar");
            expect(progressBar).toHaveAttribute("aria-valuenow", "75");
        });

        it("has aria-valuemin", () => {
            render(<ProgressBar value={50} />);

            const progressBar = screen.getByRole("progressbar");
            expect(progressBar).toHaveAttribute("aria-valuemin", "0");
        });

        it("has aria-valuemax", () => {
            render(<ProgressBar value={50} />);

            const progressBar = screen.getByRole("progressbar");
            expect(progressBar).toHaveAttribute("aria-valuemax", "100");
        });

        it("has correct aria-valuemax with custom max", () => {
            render(<ProgressBar value={5} max={10} />);

            const progressBar = screen.getByRole("progressbar");
            expect(progressBar).toHaveAttribute("aria-valuemax", "10");
        });
    });

    // ===== Custom className =====
    describe("custom className", () => {
        it("applies custom className to container", () => {
            render(<ProgressBar value={50} className="custom-progress" />);

            // The outer container has the custom class
            const container = screen.getByRole("progressbar").closest(".w-full")?.parentElement;
            expect(container).toHaveClass("custom-progress");
        });
    });

    // ===== Integration Tests =====
    describe("integration scenarios", () => {
        it("renders upload progress", () => {
            render(<ProgressBar value={65} showLabel variant="primary" />);

            expect(screen.getByText("65%")).toBeInTheDocument();
            expect(screen.getByRole("progressbar")).toHaveStyle({ width: "65%" });
        });

        it("renders success completion", () => {
            render(<ProgressBar value={100} variant="success" showLabel />);

            expect(screen.getByText("100%")).toBeInTheDocument();
            const progressBar = screen.getByRole("progressbar");
            expect(progressBar).toHaveClass("bg-green-600");
        });

        it("renders warning threshold", () => {
            render(<ProgressBar value={85} variant="warning" showLabel />);

            expect(screen.getByText("85%")).toBeInTheDocument();
            const progressBar = screen.getByRole("progressbar");
            expect(progressBar).toHaveClass("bg-amber-600");
        });

        it("renders error state (quota exceeded)", () => {
            render(<ProgressBar value={100} variant="error" showLabel />);

            const progressBar = screen.getByRole("progressbar");
            expect(progressBar).toHaveClass("bg-red-600");
        });

        it("renders step progress (2 of 5)", () => {
            render(<ProgressBar value={2} max={5} showLabel />);

            expect(screen.getByText("40%")).toBeInTheDocument();
            expect(screen.getByRole("progressbar")).toHaveStyle({ width: "40%" });
        });
    });
});
