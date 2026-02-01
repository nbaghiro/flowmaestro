/**
 * HumanReviewNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HumanReviewNodeConfig } from "../../configs/HumanReviewNodeConfig";

// Mock common form components
vi.mock("../../../../components/common/FormField", () => ({
    FormField: ({
        label,
        children
    }: {
        label: string;
        description?: React.ReactNode;
        children: React.ReactNode;
    }) => (
        <div data-testid={`form-field-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            <label>{label}</label>
            {children}
        </div>
    ),
    FormSection: ({ title, children }: { title: string; children: React.ReactNode }) => (
        <div data-testid={`form-section-${title.toLowerCase().replace(/\s+/g, "-")}`}>
            <h3>{title}</h3>
            {children}
        </div>
    )
}));

vi.mock("../../../../components/common/Input", () => ({
    Input: ({
        value,
        onChange,
        type,
        placeholder,
        checked
    }: {
        value?: string | number;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        type?: string;
        placeholder?: string;
        checked?: boolean;
    }) => (
        <input
            data-testid={`input-${type || "text"}`}
            type={type || "text"}
            value={value}
            checked={checked}
            onChange={onChange}
            placeholder={placeholder}
        />
    )
}));

vi.mock("../../../../components/common/Select", () => ({
    Select: ({
        value,
        onChange,
        options
    }: {
        value: string;
        onChange: (value: string) => void;
        options: Array<{ value: string; label: string }>;
    }) => (
        <select data-testid="select" value={value} onChange={(e) => onChange(e.target.value)}>
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    )
}));

vi.mock("../../../../components/common/Textarea", () => ({
    Textarea: ({
        value,
        onChange,
        placeholder,
        rows
    }: {
        value: string;
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
        placeholder?: string;
        rows?: number;
    }) => (
        <textarea
            data-testid="textarea"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
        />
    )
}));

describe("HumanReviewNodeConfig", () => {
    const mockOnUpdate = vi.fn();

    const defaultProps = {
        nodeId: "node-1",
        data: {},
        onUpdate: mockOnUpdate,
        errors: []
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Rendering", () => {
        it("renders Prompt Configuration section", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-prompt-configuration")).toBeInTheDocument();
        });

        it("renders Input Settings section", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-input-settings")).toBeInTheDocument();
        });

        it("renders Validation section", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-validation")).toBeInTheDocument();
        });

        it("renders Preview section", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-preview")).toBeInTheDocument();
        });

        it("renders Prompt field", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(screen.getByText("Prompt")).toBeInTheDocument();
        });

        it("renders Description field", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(screen.getByText("Description")).toBeInTheDocument();
        });

        it("renders Variable Name field", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(screen.getByText("Variable Name")).toBeInTheDocument();
        });

        it("renders Input Type field", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(screen.getByText("Input Type")).toBeInTheDocument();
        });
    });

    describe("Input Types", () => {
        it("shows Text option", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(screen.getByText("Text")).toBeInTheDocument();
        });

        it("shows Number option", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(screen.getByText("Number")).toBeInTheDocument();
        });

        it("shows Boolean option", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(screen.getByText("Boolean")).toBeInTheDocument();
        });

        it("shows JSON option", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(screen.getByText("JSON")).toBeInTheDocument();
        });

        it("has default input type set to text", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("text");
        });
    });

    describe("Text Validation", () => {
        it("shows Validation Pattern field for text input", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(screen.getByText("Validation Pattern (Regex)")).toBeInTheDocument();
        });

        it("shows Quick Presets field for text input", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(screen.getByText("Quick Presets")).toBeInTheDocument();
        });

        it("shows Email preset button", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(screen.getByText("Email")).toBeInTheDocument();
        });

        it("shows Phone preset button", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(screen.getByText("Phone")).toBeInTheDocument();
        });

        it("shows URL preset button", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(screen.getByText("URL")).toBeInTheDocument();
        });
    });

    describe("Number Validation", () => {
        it("shows Minimum Value field for number input", async () => {
            const user = userEvent.setup();
            render(<HumanReviewNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "number");

            expect(screen.getByText("Minimum Value")).toBeInTheDocument();
        });

        it("shows Maximum Value field for number input", async () => {
            const user = userEvent.setup();
            render(<HumanReviewNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "number");

            expect(screen.getByText("Maximum Value")).toBeInTheDocument();
        });
    });

    describe("JSON Validation", () => {
        it("shows JSON Schema field for json input", async () => {
            const user = userEvent.setup();
            render(<HumanReviewNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "json");

            expect(screen.getByText("JSON Schema")).toBeInTheDocument();
        });
    });

    describe("Boolean Validation", () => {
        it("shows automatic validation message for boolean input", async () => {
            const user = userEvent.setup();
            render(<HumanReviewNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "boolean");

            expect(
                screen.getByText(/Boolean inputs are automatically validated/)
            ).toBeInTheDocument();
        });
    });

    describe("Required Field", () => {
        it("shows Required field", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(screen.getByText("Required")).toBeInTheDocument();
        });

        it("has checkbox for required setting", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("input-checkbox")).toBeInTheDocument();
        });

        it("required is checked by default", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            const checkbox = screen.getByTestId("input-checkbox");
            expect(checkbox).toBeChecked();
        });
    });

    describe("Preset Data", () => {
        it("loads existing prompt from data", () => {
            render(
                <HumanReviewNodeConfig {...defaultProps} data={{ prompt: "Enter your name" }} />
            );
            const textareas = screen.getAllByTestId("textarea");
            expect(textareas[0]).toHaveValue("Enter your name");
        });

        it("loads existing variable name from data", () => {
            render(<HumanReviewNodeConfig {...defaultProps} data={{ variableName: "userName" }} />);
            const inputs = screen.getAllByTestId("input-text");
            // Variable name is the second text input (after placeholder, index 1)
            expect(inputs[1]).toHaveValue("userName");
        });

        it("loads existing input type from data", () => {
            render(<HumanReviewNodeConfig {...defaultProps} data={{ inputType: "number" }} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("number");
        });

        it("loads existing required setting from data", () => {
            render(<HumanReviewNodeConfig {...defaultProps} data={{ required: false }} />);
            const checkbox = screen.getByTestId("input-checkbox");
            expect(checkbox).not.toBeChecked();
        });
    });

    describe("State Updates", () => {
        it("does not call onUpdate on initial render", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });

        it("calls onUpdate when prompt changes", async () => {
            const user = userEvent.setup();
            render(<HumanReviewNodeConfig {...defaultProps} />);

            const textareas = screen.getAllByTestId("textarea");
            await user.type(textareas[0], "Enter data");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.prompt).toContain("Enter data");
        });

        it("calls onUpdate when input type changes", async () => {
            const user = userEvent.setup();
            render(<HumanReviewNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "number");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.inputType).toBe("number");
        });

        it("calls onUpdate when required toggles", async () => {
            const user = userEvent.setup();
            render(<HumanReviewNodeConfig {...defaultProps} />);

            const checkbox = screen.getByTestId("input-checkbox");
            await user.click(checkbox);

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.required).toBe(false);
        });
    });

    describe("Preview", () => {
        it("shows workflow access example", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(screen.getByText(/Access in workflow:/)).toBeInTheDocument();
        });

        it("shows pause notice", () => {
            render(<HumanReviewNodeConfig {...defaultProps} />);
            expect(
                screen.getByText(/Workflow will pause until user provides input/)
            ).toBeInTheDocument();
        });
    });
});
