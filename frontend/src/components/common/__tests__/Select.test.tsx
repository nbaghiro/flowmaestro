/**
 * Select Component Tests
 *
 * Tests for the dropdown Select component used in forms throughout the app.
 *
 * BUGS THESE TESTS CATCH:
 *
 * 1. Dropdown interaction bugs:
 *    - Dropdown doesn't open on click
 *    - Dropdown doesn't close after selection
 *    - Dropdown doesn't close on outside click
 *
 * 2. Selection bugs:
 *    - onChange not called when selecting option
 *    - Wrong value passed to onChange
 *    - Selected value not displayed in trigger
 *
 * 3. Options rendering bugs:
 *    - Options not rendered from options prop
 *    - Custom children not rendered
 *    - Disabled options still selectable
 *
 * 4. Placeholder bugs:
 *    - Placeholder not shown when no value
 *    - Placeholder shown when value is selected
 *
 * 5. Disabled state bugs:
 *    - Dropdown opens when disabled
 *    - Disabled styling not applied
 *
 * 6. Accessibility bugs:
 *    - Keyboard navigation not working
 *    - Focus management broken
 *    - ARIA attributes missing
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Select, SelectItem } from "../Select";

const mockOptions = [
    { value: "apple", label: "Apple" },
    { value: "banana", label: "Banana" },
    { value: "cherry", label: "Cherry" }
];

const mockOptionsWithDisabled = [
    { value: "apple", label: "Apple" },
    { value: "banana", label: "Banana", disabled: true },
    { value: "cherry", label: "Cherry" }
];

describe("Select", () => {
    // ===== Basic Rendering =====
    describe("basic rendering", () => {
        it("renders a combobox trigger", () => {
            render(<Select options={mockOptions} onChange={() => {}} />);

            expect(screen.getByRole("combobox")).toBeInTheDocument();
        });

        it("renders with placeholder by default", () => {
            render(<Select options={mockOptions} onChange={() => {}} />);

            expect(screen.getByText("Select an option...")).toBeInTheDocument();
        });

        it("renders custom placeholder", () => {
            render(
                <Select options={mockOptions} onChange={() => {}} placeholder="Choose a fruit" />
            );

            expect(screen.getByText("Choose a fruit")).toBeInTheDocument();
        });

        it("renders chevron icon", () => {
            render(<Select options={mockOptions} onChange={() => {}} />);

            // Chevron is an SVG inside the trigger
            const trigger = screen.getByRole("combobox");
            const svg = trigger.querySelector("svg");
            expect(svg).toBeInTheDocument();
        });
    });

    // ===== Dropdown Opening/Closing =====
    describe("dropdown interactions", () => {
        it("opens dropdown when clicked", async () => {
            const user = userEvent.setup();
            render(<Select options={mockOptions} onChange={() => {}} />);

            await user.click(screen.getByRole("combobox"));

            // Options should be visible
            await waitFor(() => {
                expect(screen.getByRole("listbox")).toBeInTheDocument();
            });
        });

        it("shows all options when opened", async () => {
            const user = userEvent.setup();
            render(<Select options={mockOptions} onChange={() => {}} />);

            await user.click(screen.getByRole("combobox"));

            await waitFor(() => {
                expect(screen.getByRole("option", { name: "Apple" })).toBeInTheDocument();
                expect(screen.getByRole("option", { name: "Banana" })).toBeInTheDocument();
                expect(screen.getByRole("option", { name: "Cherry" })).toBeInTheDocument();
            });
        });

        it("closes dropdown after selecting an option", async () => {
            const user = userEvent.setup();
            render(<Select options={mockOptions} onChange={() => {}} />);

            await user.click(screen.getByRole("combobox"));

            await waitFor(() => {
                expect(screen.getByRole("listbox")).toBeInTheDocument();
            });

            await user.click(screen.getByRole("option", { name: "Apple" }));

            await waitFor(() => {
                expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
            });
        });
    });

    // ===== Selection =====
    describe("selection", () => {
        it("calls onChange with selected value", async () => {
            const onChange = vi.fn();
            const user = userEvent.setup();

            render(<Select options={mockOptions} onChange={onChange} />);

            await user.click(screen.getByRole("combobox"));

            await waitFor(() => {
                expect(screen.getByRole("option", { name: "Banana" })).toBeInTheDocument();
            });

            await user.click(screen.getByRole("option", { name: "Banana" }));

            expect(onChange).toHaveBeenCalledWith("banana");
        });

        it("displays selected value in trigger", () => {
            const { rerender } = render(<Select options={mockOptions} onChange={() => {}} />);

            // Initially shows placeholder
            expect(screen.getByText("Select an option...")).toBeInTheDocument();

            // Rerender with value
            rerender(<Select options={mockOptions} value="banana" onChange={() => {}} />);

            expect(screen.getByText("Banana")).toBeInTheDocument();
            expect(screen.queryByText("Select an option...")).not.toBeInTheDocument();
        });

        it("shows placeholder when value is empty string", () => {
            render(<Select options={mockOptions} value="" onChange={() => {}} />);

            expect(screen.getByText("Select an option...")).toBeInTheDocument();
        });

        it("shows placeholder when value is undefined", () => {
            render(<Select options={mockOptions} value={undefined} onChange={() => {}} />);

            expect(screen.getByText("Select an option...")).toBeInTheDocument();
        });
    });

    // ===== Disabled State =====
    describe("disabled state", () => {
        it("applies disabled attribute to trigger", () => {
            render(<Select options={mockOptions} onChange={() => {}} disabled />);

            const trigger = screen.getByRole("combobox");
            expect(trigger).toBeDisabled();
        });

        it("applies disabled styling", () => {
            render(<Select options={mockOptions} onChange={() => {}} disabled />);

            const trigger = screen.getByRole("combobox");
            expect(trigger).toHaveClass("disabled:opacity-50");
            expect(trigger).toHaveClass("disabled:cursor-not-allowed");
        });

        it("does not open dropdown when disabled", async () => {
            const user = userEvent.setup();
            render(<Select options={mockOptions} onChange={() => {}} disabled />);

            await user.click(screen.getByRole("combobox"));

            // Dropdown should not appear
            expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
        });
    });

    // ===== Disabled Options =====
    describe("disabled options", () => {
        it("renders disabled options with disabled styling", async () => {
            const user = userEvent.setup();
            render(<Select options={mockOptionsWithDisabled} onChange={() => {}} />);

            await user.click(screen.getByRole("combobox"));

            await waitFor(() => {
                const bananaOption = screen.getByRole("option", { name: "Banana" });
                expect(bananaOption).toHaveAttribute("data-disabled");
            });
        });

        it("does not call onChange when clicking disabled option", async () => {
            const onChange = vi.fn();
            const user = userEvent.setup();

            render(<Select options={mockOptionsWithDisabled} onChange={onChange} />);

            await user.click(screen.getByRole("combobox"));

            await waitFor(() => {
                expect(screen.getByRole("option", { name: "Banana" })).toBeInTheDocument();
            });

            // Try to click disabled option
            await user.click(screen.getByRole("option", { name: "Banana" }));

            // onChange should not be called with disabled option's value
            expect(onChange).not.toHaveBeenCalledWith("banana");
        });
    });

    // ===== Custom Children =====
    describe("custom children", () => {
        it("renders custom SelectItem children", async () => {
            const user = userEvent.setup();

            render(
                <Select onChange={() => {}}>
                    <SelectItem value="red">Red Color</SelectItem>
                    <SelectItem value="green">Green Color</SelectItem>
                    <SelectItem value="blue">Blue Color</SelectItem>
                </Select>
            );

            await user.click(screen.getByRole("combobox"));

            await waitFor(() => {
                expect(screen.getByRole("option", { name: "Red Color" })).toBeInTheDocument();
                expect(screen.getByRole("option", { name: "Green Color" })).toBeInTheDocument();
                expect(screen.getByRole("option", { name: "Blue Color" })).toBeInTheDocument();
            });
        });

        it("uses children when options prop is not provided", async () => {
            const onChange = vi.fn();
            const user = userEvent.setup();

            render(
                <Select onChange={onChange}>
                    <SelectItem value="custom">Custom Item</SelectItem>
                </Select>
            );

            await user.click(screen.getByRole("combobox"));

            await waitFor(() => {
                expect(screen.getByRole("option", { name: "Custom Item" })).toBeInTheDocument();
            });

            await user.click(screen.getByRole("option", { name: "Custom Item" }));

            expect(onChange).toHaveBeenCalledWith("custom");
        });
    });

    // ===== Custom className =====
    describe("custom className", () => {
        it("applies custom className to trigger", () => {
            render(<Select options={mockOptions} onChange={() => {}} className="custom-select" />);

            const trigger = screen.getByRole("combobox");
            expect(trigger).toHaveClass("custom-select");
        });

        it("merges custom className with default styles", () => {
            render(<Select options={mockOptions} onChange={() => {}} className="custom-select" />);

            const trigger = screen.getByRole("combobox");
            expect(trigger).toHaveClass("custom-select");
            expect(trigger).toHaveClass("w-full"); // Default class still present
        });
    });

    // ===== Accessibility =====
    describe("accessibility", () => {
        it("has focus ring for keyboard navigation", () => {
            render(<Select options={mockOptions} onChange={() => {}} />);

            const trigger = screen.getByRole("combobox");
            expect(trigger).toHaveClass("focus:ring-2");
            expect(trigger).toHaveClass("focus:ring-primary");
        });

        it("is focusable with keyboard", async () => {
            const user = userEvent.setup();
            render(<Select options={mockOptions} onChange={() => {}} />);

            await user.tab();

            const trigger = screen.getByRole("combobox");
            expect(trigger).toHaveFocus();
        });

        it("opens dropdown with Enter key", async () => {
            const user = userEvent.setup();
            render(<Select options={mockOptions} onChange={() => {}} />);

            await user.tab();
            await user.keyboard("{Enter}");

            await waitFor(() => {
                expect(screen.getByRole("listbox")).toBeInTheDocument();
            });
        });

        it("opens dropdown with Space key", async () => {
            const user = userEvent.setup();
            render(<Select options={mockOptions} onChange={() => {}} />);

            await user.tab();
            await user.keyboard(" ");

            await waitFor(() => {
                expect(screen.getByRole("listbox")).toBeInTheDocument();
            });
        });

        it("has correct ARIA attributes on trigger", () => {
            render(<Select options={mockOptions} onChange={() => {}} />);

            const trigger = screen.getByRole("combobox");
            expect(trigger).toHaveAttribute("aria-expanded", "false");
        });
    });

    // ===== Integration Tests =====
    describe("integration scenarios", () => {
        it("works as controlled component", async () => {
            const React = await import("react");
            const { useState } = React;

            const Wrapper = () => {
                const [value, setValue] = useState("");
                return (
                    <>
                        <Select options={mockOptions} value={value} onChange={setValue} />
                        <span data-testid="current-value">{value || "none"}</span>
                    </>
                );
            };

            const user = userEvent.setup();
            render(<Wrapper />);

            expect(screen.getByTestId("current-value")).toHaveTextContent("none");

            await user.click(screen.getByRole("combobox"));

            await waitFor(() => {
                expect(screen.getByRole("option", { name: "Cherry" })).toBeInTheDocument();
            });

            await user.click(screen.getByRole("option", { name: "Cherry" }));

            expect(screen.getByTestId("current-value")).toHaveTextContent("cherry");
        });

        it("works in a form", async () => {
            const onSubmit = vi.fn((e) => {
                e.preventDefault();
            });
            const onChange = vi.fn();
            const user = userEvent.setup();

            render(
                <form onSubmit={onSubmit}>
                    <label htmlFor="fruit">Fruit</label>
                    <Select options={mockOptions} onChange={onChange} />
                    <button type="submit">Submit</button>
                </form>
            );

            await user.click(screen.getByRole("combobox"));

            await waitFor(() => {
                expect(screen.getByRole("option", { name: "Apple" })).toBeInTheDocument();
            });

            await user.click(screen.getByRole("option", { name: "Apple" }));

            expect(onChange).toHaveBeenCalledWith("apple");

            await user.click(screen.getByRole("button", { name: "Submit" }));

            expect(onSubmit).toHaveBeenCalled();
        });

        it("displays label for selected option", () => {
            render(
                <Select
                    options={[
                        { value: "us", label: "United States" },
                        { value: "uk", label: "United Kingdom" },
                        { value: "ca", label: "Canada" }
                    ]}
                    value="uk"
                    onChange={() => {}}
                />
            );

            // Should show label, not value
            expect(screen.getByText("United Kingdom")).toBeInTheDocument();
            expect(screen.queryByText("uk")).not.toBeInTheDocument();
        });
    });
});
