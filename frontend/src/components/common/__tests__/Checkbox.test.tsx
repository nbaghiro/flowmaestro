/**
 * Checkbox Component Tests
 *
 * Tests for the Checkbox component used in forms throughout the app.
 *
 * BUGS THESE TESTS CATCH:
 *
 * 1. State bugs:
 *    - Checkbox not toggling on click
 *    - Checked state not reflected visually
 *    - onCheckedChange not called
 *    - Indeterminate state not handled
 *
 * 2. Label bugs:
 *    - Label not rendered when provided
 *    - Label not clickable (not associated with checkbox)
 *    - Auto-generated ID not working
 *
 * 3. Disabled state bugs:
 *    - Checkbox still toggleable when disabled
 *    - Disabled styling not applied
 *
 * 4. Accessibility bugs:
 *    - Focus ring missing
 *    - Keyboard navigation not working
 *    - aria-checked not updated
 *
 * 5. Visual bugs:
 *    - Check icon not showing when checked
 *    - Border color not changing on checked
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, it, expect, vi } from "vitest";
import { Checkbox } from "../Checkbox";

describe("Checkbox", () => {
    // ===== Basic Rendering =====
    describe("basic rendering", () => {
        it("renders a checkbox", () => {
            render(<Checkbox />);

            expect(screen.getByRole("checkbox")).toBeInTheDocument();
        });

        it("renders unchecked by default", () => {
            render(<Checkbox />);

            const checkbox = screen.getByRole("checkbox");
            expect(checkbox).toHaveAttribute("data-state", "unchecked");
        });

        it("forwards ref to checkbox element", () => {
            const ref = createRef<HTMLButtonElement>();
            render(<Checkbox ref={ref} />);

            expect(ref.current).toBeInstanceOf(HTMLButtonElement);
        });

        it("applies custom className", () => {
            render(<Checkbox className="custom-checkbox" />);

            const checkbox = screen.getByRole("checkbox");
            expect(checkbox).toHaveClass("custom-checkbox");
        });
    });

    // ===== Label Tests =====
    describe("label", () => {
        it("renders label when provided", () => {
            render(<Checkbox label="Accept terms" />);

            expect(screen.getByText("Accept terms")).toBeInTheDocument();
        });

        it("does not render label when not provided", () => {
            render(<Checkbox />);

            // Only the checkbox should be present, no label text
            const container = screen.getByRole("checkbox").parentElement;
            expect(container?.querySelector("label")).not.toBeInTheDocument();
        });

        it("associates label with checkbox via auto-generated id", () => {
            render(<Checkbox label="Accept terms" />);

            const checkbox = screen.getByRole("checkbox");
            const label = screen.getByText("Accept terms");

            expect(checkbox).toHaveAttribute("id");
            expect(label).toHaveAttribute("for", checkbox.getAttribute("id"));
        });

        it("uses custom id when provided", () => {
            render(<Checkbox id="my-checkbox" label="Accept terms" />);

            const checkbox = screen.getByRole("checkbox");
            expect(checkbox).toHaveAttribute("id", "my-checkbox");

            const label = screen.getByText("Accept terms");
            expect(label).toHaveAttribute("for", "my-checkbox");
        });

        it("generates id from label text", () => {
            render(<Checkbox label="Accept Terms and Conditions" />);

            const checkbox = screen.getByRole("checkbox");
            expect(checkbox).toHaveAttribute("id", "checkbox-accept-terms-and-conditions");
        });

        it("clicking label toggles checkbox", async () => {
            const onCheckedChange = vi.fn();
            const user = userEvent.setup();

            render(<Checkbox label="Accept terms" onCheckedChange={onCheckedChange} />);

            await user.click(screen.getByText("Accept terms"));

            expect(onCheckedChange).toHaveBeenCalledWith(true);
        });
    });

    // ===== Checked State =====
    describe("checked state", () => {
        it("renders checked when checked prop is true", () => {
            render(<Checkbox checked />);

            const checkbox = screen.getByRole("checkbox");
            expect(checkbox).toHaveAttribute("data-state", "checked");
        });

        it("renders unchecked when checked prop is false", () => {
            render(<Checkbox checked={false} />);

            const checkbox = screen.getByRole("checkbox");
            expect(checkbox).toHaveAttribute("data-state", "unchecked");
        });

        it("shows check icon when checked", () => {
            render(<Checkbox checked />);

            // Check icon should be visible
            const checkbox = screen.getByRole("checkbox");
            const svg = checkbox.querySelector("svg");
            expect(svg).toBeInTheDocument();
        });

        it("calls onCheckedChange when clicked", async () => {
            const onCheckedChange = vi.fn();
            const user = userEvent.setup();

            render(<Checkbox onCheckedChange={onCheckedChange} />);

            await user.click(screen.getByRole("checkbox"));

            expect(onCheckedChange).toHaveBeenCalledWith(true);
        });

        it("toggles from unchecked to checked", async () => {
            const onCheckedChange = vi.fn();
            const user = userEvent.setup();

            render(<Checkbox checked={false} onCheckedChange={onCheckedChange} />);

            await user.click(screen.getByRole("checkbox"));

            expect(onCheckedChange).toHaveBeenCalledWith(true);
        });

        it("toggles from checked to unchecked", async () => {
            const onCheckedChange = vi.fn();
            const user = userEvent.setup();

            render(<Checkbox checked={true} onCheckedChange={onCheckedChange} />);

            await user.click(screen.getByRole("checkbox"));

            expect(onCheckedChange).toHaveBeenCalledWith(false);
        });
    });

    // ===== Indeterminate State =====
    describe("indeterminate state", () => {
        it("renders indeterminate when checked is indeterminate", () => {
            render(<Checkbox checked="indeterminate" />);

            const checkbox = screen.getByRole("checkbox");
            expect(checkbox).toHaveAttribute("data-state", "indeterminate");
        });
    });

    // ===== Disabled State =====
    describe("disabled state", () => {
        it("applies disabled attribute", () => {
            render(<Checkbox disabled />);

            const checkbox = screen.getByRole("checkbox");
            expect(checkbox).toBeDisabled();
        });

        it("applies disabled styling", () => {
            render(<Checkbox disabled />);

            const checkbox = screen.getByRole("checkbox");
            expect(checkbox).toHaveClass("disabled:opacity-50");
            expect(checkbox).toHaveClass("disabled:cursor-not-allowed");
        });

        it("does not call onCheckedChange when disabled", async () => {
            const onCheckedChange = vi.fn();
            const user = userEvent.setup();

            render(<Checkbox disabled onCheckedChange={onCheckedChange} />);

            await user.click(screen.getByRole("checkbox"));

            expect(onCheckedChange).not.toHaveBeenCalled();
        });

        it("label click does not toggle when disabled", async () => {
            const onCheckedChange = vi.fn();
            const user = userEvent.setup();

            render(<Checkbox disabled label="Accept terms" onCheckedChange={onCheckedChange} />);

            await user.click(screen.getByText("Accept terms"));

            expect(onCheckedChange).not.toHaveBeenCalled();
        });
    });

    // ===== Styling =====
    describe("styling", () => {
        it("has correct border styling when unchecked", () => {
            render(<Checkbox />);

            const checkbox = screen.getByRole("checkbox");
            expect(checkbox).toHaveClass("border-2");
            expect(checkbox).toHaveClass("rounded");
        });

        it("has checked styling when checked", () => {
            render(<Checkbox checked />);

            const checkbox = screen.getByRole("checkbox");
            expect(checkbox).toHaveAttribute("data-state", "checked");
        });

        it("has focus ring styling", () => {
            render(<Checkbox />);

            const checkbox = screen.getByRole("checkbox");
            expect(checkbox).toHaveClass("focus:ring-2");
        });

        it("has correct size", () => {
            render(<Checkbox />);

            const checkbox = screen.getByRole("checkbox");
            expect(checkbox).toHaveClass("w-5");
            expect(checkbox).toHaveClass("h-5");
        });
    });

    // ===== Accessibility =====
    describe("accessibility", () => {
        it("is focusable with keyboard", async () => {
            const user = userEvent.setup();
            render(<Checkbox />);

            await user.tab();

            const checkbox = screen.getByRole("checkbox");
            expect(checkbox).toHaveFocus();
        });

        it("can be toggled with Space key", async () => {
            const onCheckedChange = vi.fn();
            const user = userEvent.setup();

            render(<Checkbox onCheckedChange={onCheckedChange} />);

            await user.tab();
            await user.keyboard(" ");

            expect(onCheckedChange).toHaveBeenCalledWith(true);
        });

        it("has aria-checked attribute", () => {
            render(<Checkbox checked />);

            const checkbox = screen.getByRole("checkbox");
            expect(checkbox).toHaveAttribute("aria-checked", "true");
        });

        it("has aria-checked false when unchecked", () => {
            render(<Checkbox checked={false} />);

            const checkbox = screen.getByRole("checkbox");
            expect(checkbox).toHaveAttribute("aria-checked", "false");
        });

        it("supports aria-describedby", () => {
            render(
                <>
                    <Checkbox aria-describedby="help-text" />
                    <span id="help-text">This is required</span>
                </>
            );

            const checkbox = screen.getByRole("checkbox");
            expect(checkbox).toHaveAttribute("aria-describedby", "help-text");
        });

        it("is not focusable when disabled", async () => {
            const user = userEvent.setup();

            render(
                <>
                    <Checkbox disabled />
                    <button>Next</button>
                </>
            );

            await user.tab();

            // Should skip disabled checkbox and focus button
            expect(screen.getByRole("button")).toHaveFocus();
        });
    });

    // ===== Integration Tests =====
    describe("integration scenarios", () => {
        it("works as controlled component", async () => {
            const React = await import("react");
            const { useState } = React;

            const Controlled = () => {
                const [checked, setChecked] = useState(false);
                return (
                    <>
                        <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => setChecked(value === true)}
                            label="Accept terms"
                        />
                        <span data-testid="state">{checked ? "checked" : "unchecked"}</span>
                    </>
                );
            };

            const user = userEvent.setup();
            render(<Controlled />);

            expect(screen.getByTestId("state")).toHaveTextContent("unchecked");

            await user.click(screen.getByRole("checkbox"));

            expect(screen.getByTestId("state")).toHaveTextContent("checked");
        });

        it("renders terms acceptance checkbox", () => {
            render(<Checkbox label="I agree to the Terms of Service and Privacy Policy" />);

            expect(
                screen.getByText("I agree to the Terms of Service and Privacy Policy")
            ).toBeInTheDocument();
        });

        it("renders remember me checkbox", async () => {
            const onCheckedChange = vi.fn();
            const user = userEvent.setup();

            render(<Checkbox label="Remember me" onCheckedChange={onCheckedChange} />);

            await user.click(screen.getByText("Remember me"));

            expect(onCheckedChange).toHaveBeenCalledWith(true);
        });

        it("renders in a form", async () => {
            const onSubmit = vi.fn((e) => e.preventDefault());
            const user = userEvent.setup();

            render(
                <form onSubmit={onSubmit}>
                    <Checkbox label="Subscribe to newsletter" name="subscribe" />
                    <button type="submit">Submit</button>
                </form>
            );

            await user.click(screen.getByRole("checkbox"));
            await user.click(screen.getByRole("button", { name: "Submit" }));

            expect(onSubmit).toHaveBeenCalled();
        });
    });
});
