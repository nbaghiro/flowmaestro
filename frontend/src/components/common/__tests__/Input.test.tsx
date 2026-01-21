/**
 * Input Component Tests
 *
 * Tests for the core Input component used in forms throughout the app.
 *
 * BUGS THESE TESTS CATCH:
 *
 * 1. Value handling bugs:
 *    - onChange not called when typing
 *    - Value not displayed in input
 *    - Controlled input not updating
 *
 * 2. Error state bugs:
 *    - Error styling not applied (red border missing)
 *    - Focus ring wrong color in error state
 *    - Error state not visually distinct
 *
 * 3. Disabled state bugs:
 *    - Input still editable when disabled
 *    - Disabled styling not applied
 *    - Focus possible when disabled
 *
 * 4. Range input bugs:
 *    - Range slider not rendering correctly
 *    - Range using wrong styling (text input styles)
 *
 * 5. Accessibility bugs:
 *    - Focus ring missing
 *    - Placeholder not visible
 *    - Label association broken
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, it, expect, vi } from "vitest";
import { Input } from "../Input";

describe("Input", () => {
    // ===== Basic Rendering =====
    describe("basic rendering", () => {
        it("renders an input element", () => {
            render(<Input />);

            expect(screen.getByRole("textbox")).toBeInTheDocument();
        });

        it("renders as text input by default", () => {
            render(<Input />);

            // HTML inputs default to text type (getByRole "textbox" confirms this)
            const input = screen.getByRole("textbox");
            expect(input).toBeInTheDocument();
        });

        it("forwards ref to input element", () => {
            const ref = createRef<HTMLInputElement>();
            render(<Input ref={ref} />);

            expect(ref.current).toBeInstanceOf(HTMLInputElement);
        });

        it("passes through native input props", () => {
            render(
                <Input
                    name="email"
                    id="email-input"
                    autoComplete="email"
                    maxLength={100}
                    aria-label="Email address"
                />
            );

            const input = screen.getByRole("textbox");
            expect(input).toHaveAttribute("name", "email");
            expect(input).toHaveAttribute("id", "email-input");
            expect(input).toHaveAttribute("autocomplete", "email");
            expect(input).toHaveAttribute("maxlength", "100");
            expect(input).toHaveAttribute("aria-label", "Email address");
        });
    });

    // ===== Value Handling =====
    describe("value handling", () => {
        it("displays value prop", () => {
            render(<Input value="test@example.com" onChange={() => {}} />);

            const input = screen.getByRole("textbox");
            expect(input).toHaveValue("test@example.com");
        });

        it("calls onChange when user types", async () => {
            const onChange = vi.fn();
            const user = userEvent.setup();

            render(<Input onChange={onChange} />);

            await user.type(screen.getByRole("textbox"), "hello");

            expect(onChange).toHaveBeenCalled();
            // Called once for each character
            expect(onChange).toHaveBeenCalledTimes(5);
        });

        it("passes event to onChange handler", async () => {
            const onChange = vi.fn();
            const user = userEvent.setup();

            render(<Input onChange={onChange} />);

            await user.type(screen.getByRole("textbox"), "a");

            expect(onChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    target: expect.objectContaining({ value: "a" })
                })
            );
        });

        it("works as controlled input", async () => {
            const React = await import("react");
            const { useState } = React;

            const ControlledWrapper = () => {
                const [value, setValue] = useState("");
                return <Input value={value} onChange={(e) => setValue(e.target.value)} />;
            };

            const user = userEvent.setup();
            render(<ControlledWrapper />);

            const input = screen.getByRole("textbox");
            await user.type(input, "hello");

            expect(input).toHaveValue("hello");
        });

        it("works as uncontrolled input with defaultValue", async () => {
            const user = userEvent.setup();
            render(<Input defaultValue="initial" />);

            const input = screen.getByRole("textbox");
            expect(input).toHaveValue("initial");

            await user.clear(input);
            await user.type(input, "changed");

            expect(input).toHaveValue("changed");
        });
    });

    // ===== Placeholder =====
    describe("placeholder", () => {
        it("displays placeholder text", () => {
            render(<Input placeholder="Enter your email" />);

            const input = screen.getByPlaceholderText("Enter your email");
            expect(input).toBeInTheDocument();
        });

        it("applies placeholder styling", () => {
            render(<Input placeholder="Enter your email" />);

            const input = screen.getByRole("textbox");
            expect(input).toHaveClass("placeholder:text-muted-foreground");
        });
    });

    // ===== Error State =====
    describe("error state", () => {
        it("applies error border styling", () => {
            render(<Input error />);

            const input = screen.getByRole("textbox");
            expect(input).toHaveClass("border-destructive");
        });

        it("applies error focus ring styling", () => {
            render(<Input error />);

            const input = screen.getByRole("textbox");
            expect(input).toHaveClass("focus:ring-destructive");
        });

        it("does not have error styling when error is false", () => {
            render(<Input error={false} />);

            const input = screen.getByRole("textbox");
            expect(input).not.toHaveClass("border-destructive");
            expect(input).toHaveClass("border-border");
        });

        it("does not have error styling by default", () => {
            render(<Input />);

            const input = screen.getByRole("textbox");
            expect(input).not.toHaveClass("border-destructive");
            expect(input).toHaveClass("border-border");
        });
    });

    // ===== Disabled State =====
    describe("disabled state", () => {
        it("applies disabled attribute", () => {
            render(<Input disabled />);

            const input = screen.getByRole("textbox");
            expect(input).toBeDisabled();
        });

        it("applies disabled styling", () => {
            render(<Input disabled />);

            const input = screen.getByRole("textbox");
            expect(input).toHaveClass("disabled:opacity-50");
            expect(input).toHaveClass("disabled:cursor-not-allowed");
        });

        it("prevents user input when disabled", async () => {
            const onChange = vi.fn();
            const user = userEvent.setup();

            render(<Input disabled onChange={onChange} value="" />);

            const input = screen.getByRole("textbox");
            await user.type(input, "hello");

            expect(onChange).not.toHaveBeenCalled();
        });
    });

    // ===== Input Types =====
    describe("input types", () => {
        it("renders email type", () => {
            render(<Input type="email" />);

            const input = document.querySelector('input[type="email"]');
            expect(input).toBeInTheDocument();
        });

        it("renders password type", () => {
            render(<Input type="password" />);

            const input = document.querySelector('input[type="password"]');
            expect(input).toBeInTheDocument();
        });

        it("renders number type", () => {
            render(<Input type="number" />);

            const input = screen.getByRole("spinbutton");
            expect(input).toBeInTheDocument();
        });

        it("renders search type", () => {
            render(<Input type="search" />);

            const input = screen.getByRole("searchbox");
            expect(input).toBeInTheDocument();
        });
    });

    // ===== Range Input =====
    describe("range input", () => {
        it("renders range slider", () => {
            render(<Input type="range" />);

            const slider = screen.getByRole("slider");
            expect(slider).toBeInTheDocument();
        });

        it("applies range-specific styling", () => {
            render(<Input type="range" />);

            const slider = screen.getByRole("slider");
            expect(slider).toHaveClass("appearance-none");
            expect(slider).toHaveClass("cursor-pointer");
        });

        it("does not apply text input styling to range", () => {
            render(<Input type="range" />);

            const slider = screen.getByRole("slider");
            // Range inputs should not have text input padding
            expect(slider).not.toHaveClass("px-3");
            expect(slider).not.toHaveClass("py-2");
        });

        it("supports min, max, and step props for range", () => {
            render(<Input type="range" min={0} max={100} step={5} />);

            const slider = screen.getByRole("slider");
            expect(slider).toHaveAttribute("min", "0");
            expect(slider).toHaveAttribute("max", "100");
            expect(slider).toHaveAttribute("step", "5");
        });

        it("applies disabled styling to range", () => {
            render(<Input type="range" disabled />);

            const slider = screen.getByRole("slider");
            expect(slider).toBeDisabled();
            expect(slider).toHaveClass("disabled:opacity-50");
        });
    });

    // ===== Custom className =====
    describe("custom className", () => {
        it("merges custom className with default styles", () => {
            render(<Input className="custom-class" />);

            const input = screen.getByRole("textbox");
            expect(input).toHaveClass("custom-class");
            expect(input).toHaveClass("w-full"); // Still has default class
        });

        it("allows style overrides via className", () => {
            render(<Input className="w-1/2" />);

            const input = screen.getByRole("textbox");
            expect(input).toHaveClass("w-1/2");
        });
    });

    // ===== Accessibility =====
    describe("accessibility", () => {
        it("has focus ring for keyboard navigation", () => {
            render(<Input />);

            const input = screen.getByRole("textbox");
            expect(input).toHaveClass("focus:ring-2");
            expect(input).toHaveClass("focus:ring-primary");
        });

        it("is focusable with keyboard", async () => {
            const user = userEvent.setup();
            render(<Input />);

            await user.tab();

            const input = screen.getByRole("textbox");
            expect(input).toHaveFocus();
        });

        it("associates with label via id", () => {
            render(
                <>
                    <label htmlFor="email-input">Email</label>
                    <Input id="email-input" />
                </>
            );

            const input = screen.getByLabelText("Email");
            expect(input).toBeInTheDocument();
        });

        it("supports aria-describedby for error messages", () => {
            render(
                <>
                    <Input error aria-describedby="error-msg" />
                    <span id="error-msg">This field is required</span>
                </>
            );

            const input = screen.getByRole("textbox");
            expect(input).toHaveAttribute("aria-describedby", "error-msg");
        });
    });

    // ===== Integration Tests =====
    describe("integration scenarios", () => {
        it("works in a form submission", async () => {
            const onSubmit = vi.fn((e) => e.preventDefault());
            const user = userEvent.setup();

            render(
                <form onSubmit={onSubmit}>
                    <Input name="email" defaultValue="test@example.com" />
                    <button type="submit">Submit</button>
                </form>
            );

            await user.click(screen.getByRole("button", { name: "Submit" }));

            expect(onSubmit).toHaveBeenCalled();
        });

        it("shows error state for invalid input", () => {
            render(
                <div>
                    <Input error aria-invalid="true" />
                    <span className="text-destructive">Invalid email</span>
                </div>
            );

            const input = screen.getByRole("textbox");
            expect(input).toHaveAttribute("aria-invalid", "true");
            expect(input).toHaveClass("border-destructive");
        });

        it("clears input on form reset", async () => {
            const user = userEvent.setup();

            render(
                <form>
                    <Input defaultValue="initial" />
                    <button type="reset">Reset</button>
                </form>
            );

            const input = screen.getByRole("textbox");
            await user.clear(input);
            await user.type(input, "changed");
            expect(input).toHaveValue("changed");

            await user.click(screen.getByRole("button", { name: "Reset" }));
            expect(input).toHaveValue("initial");
        });
    });
});
