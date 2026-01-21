/**
 * Textarea Component Tests
 *
 * Tests for the Textarea component used for multi-line text input in forms.
 *
 * BUGS THESE TESTS CATCH:
 *
 * 1. Value handling bugs:
 *    - onChange not called when typing
 *    - Value not displayed in textarea
 *    - Controlled textarea not updating
 *
 * 2. Error state bugs:
 *    - Error styling not applied (red border missing)
 *    - Focus ring wrong color in error state
 *    - Error state not visually distinct
 *
 * 3. Disabled state bugs:
 *    - Textarea still editable when disabled
 *    - Disabled styling not applied
 *
 * 4. Accessibility bugs:
 *    - Focus ring missing
 *    - Placeholder not visible
 *    - Label association broken
 *
 * 5. Styling bugs:
 *    - resize not disabled (should be resize-none)
 *    - Missing rounded corners
 *    - Custom className not merged
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, it, expect, vi } from "vitest";
import { Textarea } from "../Textarea";

describe("Textarea", () => {
    // ===== Basic Rendering =====
    describe("basic rendering", () => {
        it("renders a textarea element", () => {
            render(<Textarea />);

            expect(screen.getByRole("textbox")).toBeInTheDocument();
        });

        it("forwards ref to textarea element", () => {
            const ref = createRef<HTMLTextAreaElement>();
            render(<Textarea ref={ref} />);

            expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
        });

        it("passes through native textarea props", () => {
            render(
                <Textarea
                    name="description"
                    id="desc-input"
                    rows={5}
                    cols={50}
                    maxLength={500}
                    aria-label="Description"
                />
            );

            const textarea = screen.getByRole("textbox");
            expect(textarea).toHaveAttribute("name", "description");
            expect(textarea).toHaveAttribute("id", "desc-input");
            expect(textarea).toHaveAttribute("rows", "5");
            expect(textarea).toHaveAttribute("cols", "50");
            expect(textarea).toHaveAttribute("maxlength", "500");
            expect(textarea).toHaveAttribute("aria-label", "Description");
        });

        it("has resize-none by default", () => {
            render(<Textarea />);

            const textarea = screen.getByRole("textbox");
            expect(textarea).toHaveClass("resize-none");
        });
    });

    // ===== Value Handling =====
    describe("value handling", () => {
        it("displays value prop", () => {
            render(<Textarea value="Hello world" onChange={() => {}} />);

            const textarea = screen.getByRole("textbox");
            expect(textarea).toHaveValue("Hello world");
        });

        it("calls onChange when user types", async () => {
            const onChange = vi.fn();
            const user = userEvent.setup();

            render(<Textarea onChange={onChange} />);

            await user.type(screen.getByRole("textbox"), "hello");

            expect(onChange).toHaveBeenCalled();
            expect(onChange).toHaveBeenCalledTimes(5);
        });

        it("passes event to onChange handler", async () => {
            const onChange = vi.fn();
            const user = userEvent.setup();

            render(<Textarea onChange={onChange} />);

            await user.type(screen.getByRole("textbox"), "a");

            expect(onChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    target: expect.objectContaining({ value: "a" })
                })
            );
        });

        it("works as controlled textarea", async () => {
            const React = await import("react");
            const { useState } = React;

            const ControlledTextarea = () => {
                const [value, setValue] = useState("");
                return <Textarea value={value} onChange={(e) => setValue(e.target.value)} />;
            };

            const user = userEvent.setup();
            render(<ControlledTextarea />);

            const textarea = screen.getByRole("textbox");
            await user.type(textarea, "hello world");

            expect(textarea).toHaveValue("hello world");
        });

        it("works as uncontrolled textarea with defaultValue", async () => {
            const user = userEvent.setup();
            render(<Textarea defaultValue="initial" />);

            const textarea = screen.getByRole("textbox");
            expect(textarea).toHaveValue("initial");

            await user.clear(textarea);
            await user.type(textarea, "changed");

            expect(textarea).toHaveValue("changed");
        });

        it("handles multiline input", async () => {
            const user = userEvent.setup();
            render(<Textarea />);

            const textarea = screen.getByRole("textbox");
            await user.type(textarea, "line1{enter}line2{enter}line3");

            expect(textarea).toHaveValue("line1\nline2\nline3");
        });
    });

    // ===== Placeholder =====
    describe("placeholder", () => {
        it("displays placeholder text", () => {
            render(<Textarea placeholder="Enter description..." />);

            const textarea = screen.getByPlaceholderText("Enter description...");
            expect(textarea).toBeInTheDocument();
        });

        it("applies placeholder styling", () => {
            render(<Textarea placeholder="Enter description..." />);

            const textarea = screen.getByRole("textbox");
            expect(textarea).toHaveClass("placeholder:text-muted-foreground");
        });
    });

    // ===== Error State =====
    describe("error state", () => {
        it("applies error border styling", () => {
            render(<Textarea error />);

            const textarea = screen.getByRole("textbox");
            expect(textarea).toHaveClass("border-destructive");
        });

        it("applies error focus ring styling", () => {
            render(<Textarea error />);

            const textarea = screen.getByRole("textbox");
            expect(textarea).toHaveClass("focus:ring-destructive");
        });

        it("does not have error styling when error is false", () => {
            render(<Textarea error={false} />);

            const textarea = screen.getByRole("textbox");
            expect(textarea).not.toHaveClass("border-destructive");
            expect(textarea).toHaveClass("border-border");
        });

        it("does not have error styling by default", () => {
            render(<Textarea />);

            const textarea = screen.getByRole("textbox");
            expect(textarea).not.toHaveClass("border-destructive");
            expect(textarea).toHaveClass("border-border");
        });
    });

    // ===== Disabled State =====
    describe("disabled state", () => {
        it("applies disabled attribute", () => {
            render(<Textarea disabled />);

            const textarea = screen.getByRole("textbox");
            expect(textarea).toBeDisabled();
        });

        it("applies disabled styling", () => {
            render(<Textarea disabled />);

            const textarea = screen.getByRole("textbox");
            expect(textarea).toHaveClass("disabled:opacity-50");
            expect(textarea).toHaveClass("disabled:cursor-not-allowed");
        });

        it("prevents user input when disabled", async () => {
            const onChange = vi.fn();
            const user = userEvent.setup();

            render(<Textarea disabled onChange={onChange} value="" />);

            const textarea = screen.getByRole("textbox");
            await user.type(textarea, "hello");

            expect(onChange).not.toHaveBeenCalled();
        });
    });

    // ===== Styling =====
    describe("styling", () => {
        it("has full width by default", () => {
            render(<Textarea />);

            const textarea = screen.getByRole("textbox");
            expect(textarea).toHaveClass("w-full");
        });

        it("has rounded corners", () => {
            render(<Textarea />);

            const textarea = screen.getByRole("textbox");
            expect(textarea).toHaveClass("rounded-lg");
        });

        it("has correct padding", () => {
            render(<Textarea />);

            const textarea = screen.getByRole("textbox");
            expect(textarea).toHaveClass("px-3");
            expect(textarea).toHaveClass("py-2");
        });

        it("has correct text size", () => {
            render(<Textarea />);

            const textarea = screen.getByRole("textbox");
            expect(textarea).toHaveClass("text-sm");
        });
    });

    // ===== Custom className =====
    describe("custom className", () => {
        it("merges custom className with default styles", () => {
            render(<Textarea className="custom-textarea" />);

            const textarea = screen.getByRole("textbox");
            expect(textarea).toHaveClass("custom-textarea");
            expect(textarea).toHaveClass("w-full"); // Default class still present
        });

        it("allows style overrides via className", () => {
            render(<Textarea className="resize-y" />);

            const textarea = screen.getByRole("textbox");
            expect(textarea).toHaveClass("resize-y");
        });
    });

    // ===== Accessibility =====
    describe("accessibility", () => {
        it("has focus ring for keyboard navigation", () => {
            render(<Textarea />);

            const textarea = screen.getByRole("textbox");
            expect(textarea).toHaveClass("focus:ring-2");
            expect(textarea).toHaveClass("focus:ring-primary");
        });

        it("is focusable with keyboard", async () => {
            const user = userEvent.setup();
            render(<Textarea />);

            await user.tab();

            const textarea = screen.getByRole("textbox");
            expect(textarea).toHaveFocus();
        });

        it("associates with label via id", () => {
            render(
                <>
                    <label htmlFor="desc-input">Description</label>
                    <Textarea id="desc-input" />
                </>
            );

            const textarea = screen.getByLabelText("Description");
            expect(textarea).toBeInTheDocument();
        });

        it("supports aria-describedby for error messages", () => {
            render(
                <>
                    <Textarea error aria-describedby="error-msg" />
                    <span id="error-msg">This field is required</span>
                </>
            );

            const textarea = screen.getByRole("textbox");
            expect(textarea).toHaveAttribute("aria-describedby", "error-msg");
        });

        it("supports aria-invalid for error state", () => {
            render(<Textarea error aria-invalid="true" />);

            const textarea = screen.getByRole("textbox");
            expect(textarea).toHaveAttribute("aria-invalid", "true");
        });
    });

    // ===== Integration Tests =====
    describe("integration scenarios", () => {
        it("works in a form submission", async () => {
            const onSubmit = vi.fn((e) => e.preventDefault());
            const user = userEvent.setup();

            render(
                <form onSubmit={onSubmit}>
                    <Textarea name="description" defaultValue="Test description" />
                    <button type="submit">Submit</button>
                </form>
            );

            await user.click(screen.getByRole("button", { name: "Submit" }));

            expect(onSubmit).toHaveBeenCalled();
        });

        it("shows error state for invalid input", () => {
            render(
                <div>
                    <Textarea error aria-invalid="true" />
                    <span className="text-destructive">Description is required</span>
                </div>
            );

            const textarea = screen.getByRole("textbox");
            expect(textarea).toHaveAttribute("aria-invalid", "true");
            expect(textarea).toHaveClass("border-destructive");
        });

        it("renders description textarea with placeholder", () => {
            render(
                <Textarea placeholder="Enter a detailed description of your workflow..." rows={4} />
            );

            const textarea = screen.getByPlaceholderText(
                "Enter a detailed description of your workflow..."
            );
            expect(textarea).toHaveAttribute("rows", "4");
        });

        it("renders notes textarea with character limit", async () => {
            const user = userEvent.setup();

            render(<Textarea maxLength={100} placeholder="Add notes (max 100 chars)" />);

            const textarea = screen.getByRole("textbox");
            await user.type(textarea, "This is a note");

            expect(textarea).toHaveAttribute("maxlength", "100");
            expect(textarea).toHaveValue("This is a note");
        });

        it("clears textarea on form reset", async () => {
            const user = userEvent.setup();

            render(
                <form>
                    <Textarea defaultValue="initial" />
                    <button type="reset">Reset</button>
                </form>
            );

            const textarea = screen.getByRole("textbox");
            await user.clear(textarea);
            await user.type(textarea, "changed");
            expect(textarea).toHaveValue("changed");

            await user.click(screen.getByRole("button", { name: "Reset" }));
            expect(textarea).toHaveValue("initial");
        });
    });
});
