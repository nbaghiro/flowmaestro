/**
 * LoopNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoopNodeConfig } from "../../configs/LoopNodeConfig";

// Mock common form components
vi.mock("../../../../components/common/FormField", () => ({
    FormField: ({
        label,
        description,
        children
    }: {
        label: string;
        description?: string;
        children: React.ReactNode;
    }) => (
        <div data-testid={`form-field-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            <label>{label}</label>
            {description && <span className="description">{description}</span>}
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
        disabled
    }: {
        value: string | number;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        type?: string;
        placeholder?: string;
        disabled?: boolean;
    }) => (
        <input
            data-testid={`input-${type || "text"}`}
            type={type || "text"}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
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

vi.mock("../../../../components/CodeInput", () => ({
    CodeInput: ({
        value,
        onChange,
        placeholder
    }: {
        value: string;
        onChange: (value: string) => void;
        placeholder?: string;
        language?: string;
        rows?: number;
    }) => (
        <textarea
            data-testid="code-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
        />
    )
}));

vi.mock("../../../../components/OutputSettingsSection", () => ({
    OutputSettingsSection: ({
        value,
        onChange
    }: {
        nodeName: string;
        nodeType: string;
        value: string;
        onChange: (value: string) => void;
    }) => (
        <input
            data-testid="output-variable"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    )
}));

vi.mock("../../../../components/VariableDialog", () => ({
    VariableDialog: ({
        open,
        onOpenChange,
        onConfirm
    }: {
        open: boolean;
        onOpenChange: (open: boolean) => void;
        onConfirm: (name: string, value: unknown) => void;
        title?: string;
        description?: string;
    }) =>
        open ? (
            <div data-testid="variable-dialog">
                <button onClick={() => onOpenChange(false)}>Close</button>
                <button onClick={() => onConfirm("myVar", true)}>Add Variable</button>
            </div>
        ) : null
}));

describe("LoopNodeConfig", () => {
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
        it("renders Loop Type section", () => {
            render(<LoopNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-loop-type")).toBeInTheDocument();
        });

        it("renders Safety Limits section", () => {
            render(<LoopNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-safety-limits")).toBeInTheDocument();
        });

        it("renders Loop Body section", () => {
            render(<LoopNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-loop-body")).toBeInTheDocument();
        });

        it("renders Output Settings section", () => {
            render(<LoopNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output-settings")).toBeInTheDocument();
        });

        it("renders Type field", () => {
            render(<LoopNodeConfig {...defaultProps} />);
            expect(screen.getByText("Type")).toBeInTheDocument();
        });

        it("renders Max Iterations field", () => {
            render(<LoopNodeConfig {...defaultProps} />);
            expect(screen.getByText("Max Iterations")).toBeInTheDocument();
        });
    });

    describe("Loop Types", () => {
        it("shows For Each option", () => {
            render(<LoopNodeConfig {...defaultProps} />);
            expect(screen.getByText("For Each (iterate over array)")).toBeInTheDocument();
        });

        it("shows While option", () => {
            render(<LoopNodeConfig {...defaultProps} />);
            expect(screen.getByText("While (condition-based)")).toBeInTheDocument();
        });

        it("shows Times option", () => {
            render(<LoopNodeConfig {...defaultProps} />);
            expect(screen.getByText("Times (fixed count)")).toBeInTheDocument();
        });

        it("has default loop type set to forEach", () => {
            render(<LoopNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("forEach");
        });
    });

    describe("For Each Configuration", () => {
        it("shows For Each Configuration section by default", () => {
            render(<LoopNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-for-each-configuration")).toBeInTheDocument();
        });

        it("shows Array Variable field", () => {
            render(<LoopNodeConfig {...defaultProps} />);
            expect(screen.getByText("Array Variable")).toBeInTheDocument();
        });

        it("shows Item Variable Name field", () => {
            render(<LoopNodeConfig {...defaultProps} />);
            expect(screen.getByText("Item Variable Name")).toBeInTheDocument();
        });

        it("shows Index Variable Name field", () => {
            render(<LoopNodeConfig {...defaultProps} />);
            expect(screen.getByText("Index Variable Name")).toBeInTheDocument();
        });

        it("has default item variable of 'item'", () => {
            render(<LoopNodeConfig {...defaultProps} />);
            const inputs = screen.getAllByTestId("input-text");
            // Item variable is the second text input
            expect(inputs[1]).toHaveValue("item");
        });

        it("has default index variable of 'index'", () => {
            render(<LoopNodeConfig {...defaultProps} />);
            const inputs = screen.getAllByTestId("input-text");
            // Index variable is the third text input
            expect(inputs[2]).toHaveValue("index");
        });
    });

    describe("While Configuration", () => {
        it("shows While Configuration section when while type selected", async () => {
            const user = userEvent.setup();
            render(<LoopNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "while");

            expect(screen.getByTestId("form-section-while-configuration")).toBeInTheDocument();
        });

        it("shows Condition field for while loop", async () => {
            const user = userEvent.setup();
            render(<LoopNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "while");

            expect(screen.getByText("Condition")).toBeInTheDocument();
        });

        it("shows Initial Variables section for while loop", async () => {
            const user = userEvent.setup();
            render(<LoopNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "while");

            expect(screen.getByTestId("form-section-initial-variables")).toBeInTheDocument();
        });

        it("shows Add Initial Variable button", async () => {
            const user = userEvent.setup();
            render(<LoopNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "while");

            expect(screen.getByText("Add Initial Variable")).toBeInTheDocument();
        });

        it("hides For Each section when while type selected", async () => {
            const user = userEvent.setup();
            render(<LoopNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "while");

            expect(
                screen.queryByTestId("form-section-for-each-configuration")
            ).not.toBeInTheDocument();
        });
    });

    describe("Times Configuration", () => {
        it("shows Times Configuration section when times type selected", async () => {
            const user = userEvent.setup();
            render(<LoopNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "times");

            expect(screen.getByTestId("form-section-times-configuration")).toBeInTheDocument();
        });

        it("shows Count field for times loop", async () => {
            const user = userEvent.setup();
            render(<LoopNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "times");

            expect(screen.getByText("Count")).toBeInTheDocument();
        });

        it("has default count of 10", async () => {
            const user = userEvent.setup();
            render(<LoopNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "times");

            const numberInputs = screen.getAllByTestId("input-number");
            // Count is the first number input in times mode
            expect(numberInputs[0]).toHaveValue(10);
        });
    });

    describe("Preset Data", () => {
        it("loads existing loop type from data", () => {
            render(<LoopNodeConfig {...defaultProps} data={{ loopType: "times" }} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("times");
        });

        it("loads existing max iterations from data", () => {
            render(<LoopNodeConfig {...defaultProps} data={{ maxIterations: 500 }} />);
            const numberInputs = screen.getAllByTestId("input-number");
            // Max iterations is the only number input for forEach (first one)
            expect(numberInputs[0]).toHaveValue(500);
        });

        it("loads existing count from data for times loop", () => {
            render(<LoopNodeConfig {...defaultProps} data={{ loopType: "times", count: 25 }} />);
            const numberInputs = screen.getAllByTestId("input-number");
            // Count is the first number input in times mode
            expect(numberInputs[0]).toHaveValue(25);
        });
    });

    describe("State Updates", () => {
        it("does not call onUpdate on initial render", () => {
            render(<LoopNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });

        it("calls onUpdate when loop type changes", async () => {
            const user = userEvent.setup();
            render(<LoopNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "times");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.loopType).toBe("times");
        });

        it("calls onUpdate when max iterations changes", async () => {
            const user = userEvent.setup();
            render(<LoopNodeConfig {...defaultProps} />);

            const numberInputs = screen.getAllByTestId("input-number");
            // Max iterations is the only number input for forEach
            await user.clear(numberInputs[0]);
            await user.type(numberInputs[0], "500");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.maxIterations).toBe(500);
        });
    });

    describe("Default Values", () => {
        it("has default max iterations of 1000", () => {
            render(<LoopNodeConfig {...defaultProps} />);
            const numberInputs = screen.getAllByTestId("input-number");
            // Max iterations is the only number input for forEach
            expect(numberInputs[0]).toHaveValue(1000);
        });
    });
});
