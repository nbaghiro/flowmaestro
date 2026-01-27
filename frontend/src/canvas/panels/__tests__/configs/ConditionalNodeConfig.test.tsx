/**
 * ConditionalNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConditionalNodeConfig } from "../../configs/ConditionalNodeConfig";

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
        placeholder
    }: {
        value: string | number;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        type?: string;
        placeholder?: string;
    }) => (
        <input
            data-testid={`input-${type || "text"}`}
            type={type || "text"}
            value={value}
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

describe("ConditionalNodeConfig", () => {
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
        it("renders Condition Type section", () => {
            render(<ConditionalNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-condition-type")).toBeInTheDocument();
        });

        it("renders Simple Comparison section by default", () => {
            render(<ConditionalNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-simple-comparison")).toBeInTheDocument();
        });

        it("renders Branch Info section", () => {
            render(<ConditionalNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-branch-info")).toBeInTheDocument();
        });

        it("renders Output Settings section", () => {
            render(<ConditionalNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output-settings")).toBeInTheDocument();
        });
    });

    describe("Condition Types", () => {
        it("shows Simple Comparison option", () => {
            render(<ConditionalNodeConfig {...defaultProps} />);
            // "Simple Comparison" appears both as an option and as a section title
            const elements = screen.getAllByText("Simple Comparison");
            expect(elements.length).toBeGreaterThanOrEqual(1);
        });

        it("shows JavaScript Expression option", () => {
            render(<ConditionalNodeConfig {...defaultProps} />);
            expect(screen.getByText("JavaScript Expression")).toBeInTheDocument();
        });

        it("has default condition type set to simple", () => {
            render(<ConditionalNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("simple");
        });
    });

    describe("Simple Comparison Mode", () => {
        it("shows Left Value field", () => {
            render(<ConditionalNodeConfig {...defaultProps} />);
            expect(screen.getByText("Left Value")).toBeInTheDocument();
        });

        it("shows Operator field", () => {
            render(<ConditionalNodeConfig {...defaultProps} />);
            expect(screen.getByText("Operator")).toBeInTheDocument();
        });

        it("shows Right Value field", () => {
            render(<ConditionalNodeConfig {...defaultProps} />);
            expect(screen.getByText("Right Value")).toBeInTheDocument();
        });

        it("has default operator set to equals", () => {
            render(<ConditionalNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            // Second select is the operator
            expect(selects[1]).toHaveValue("==");
        });
    });

    describe("Operators", () => {
        it("shows Equals operator", () => {
            render(<ConditionalNodeConfig {...defaultProps} />);
            expect(screen.getByText("Equals (==)")).toBeInTheDocument();
        });

        it("shows Not Equals operator", () => {
            render(<ConditionalNodeConfig {...defaultProps} />);
            expect(screen.getByText("Not Equals (!=)")).toBeInTheDocument();
        });

        it("shows Greater Than operator", () => {
            render(<ConditionalNodeConfig {...defaultProps} />);
            expect(screen.getByText("Greater Than (>)")).toBeInTheDocument();
        });

        it("shows Less Than operator", () => {
            render(<ConditionalNodeConfig {...defaultProps} />);
            expect(screen.getByText("Less Than (<)")).toBeInTheDocument();
        });

        it("shows Contains operator", () => {
            render(<ConditionalNodeConfig {...defaultProps} />);
            expect(screen.getByText("Contains")).toBeInTheDocument();
        });

        it("shows Regex Match operator", () => {
            render(<ConditionalNodeConfig {...defaultProps} />);
            expect(screen.getByText("Regex Match")).toBeInTheDocument();
        });
    });

    describe("JavaScript Expression Mode", () => {
        it("shows Expression section when expression type selected", async () => {
            const user = userEvent.setup();
            render(<ConditionalNodeConfig {...defaultProps} />);

            const selects = screen.getAllByTestId("select");
            await user.selectOptions(selects[0], "expression");

            expect(screen.getByTestId("form-section-javascript-expression")).toBeInTheDocument();
        });

        it("shows code input for expression", async () => {
            const user = userEvent.setup();
            render(<ConditionalNodeConfig {...defaultProps} />);

            const selects = screen.getAllByTestId("select");
            await user.selectOptions(selects[0], "expression");

            expect(screen.getByTestId("code-input")).toBeInTheDocument();
        });

        it("hides simple comparison when expression type selected", async () => {
            const user = userEvent.setup();
            render(<ConditionalNodeConfig {...defaultProps} />);

            const selects = screen.getAllByTestId("select");
            await user.selectOptions(selects[0], "expression");

            expect(screen.queryByTestId("form-section-simple-comparison")).not.toBeInTheDocument();
        });
    });

    describe("Preset Data", () => {
        it("loads existing left value from data", () => {
            render(<ConditionalNodeConfig {...defaultProps} data={{ leftValue: "{{count}}" }} />);
            const inputs = screen.getAllByTestId("input-text");
            expect(inputs[0]).toHaveValue("{{count}}");
        });

        it("loads existing operator from data", () => {
            render(<ConditionalNodeConfig {...defaultProps} data={{ operator: ">" }} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[1]).toHaveValue(">");
        });

        it("loads existing right value from data", () => {
            render(<ConditionalNodeConfig {...defaultProps} data={{ rightValue: "100" }} />);
            const inputs = screen.getAllByTestId("input-text");
            expect(inputs[1]).toHaveValue("100");
        });

        it("loads existing expression from data", () => {
            render(
                <ConditionalNodeConfig
                    {...defaultProps}
                    data={{
                        conditionType: "expression",
                        expression: "{{a}} > {{b}} && {{c}} === 'active'"
                    }}
                />
            );
            expect(screen.getByTestId("code-input")).toHaveValue(
                "{{a}} > {{b}} && {{c}} === 'active'"
            );
        });
    });

    describe("State Updates", () => {
        it("does not call onUpdate on initial render", () => {
            render(<ConditionalNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });

        it("calls onUpdate when left value changes", async () => {
            const user = userEvent.setup();
            render(<ConditionalNodeConfig {...defaultProps} />);

            const inputs = screen.getAllByTestId("input-text");
            await user.type(inputs[0], "myValue");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.leftValue).toContain("myValue");
        });

        it("calls onUpdate when operator changes", async () => {
            const user = userEvent.setup();
            render(<ConditionalNodeConfig {...defaultProps} />);

            const selects = screen.getAllByTestId("select");
            await user.selectOptions(selects[1], ">=");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.operator).toBe(">=");
        });

        it("calls onUpdate when condition type changes", async () => {
            const user = userEvent.setup();
            render(<ConditionalNodeConfig {...defaultProps} />);

            const selects = screen.getAllByTestId("select");
            await user.selectOptions(selects[0], "expression");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.conditionType).toBe("expression");
        });
    });

    describe("Branch Info", () => {
        it("shows True Branch description", () => {
            render(<ConditionalNodeConfig {...defaultProps} />);
            expect(screen.getByText(/True Branch/)).toBeInTheDocument();
        });

        it("shows False Branch description", () => {
            render(<ConditionalNodeConfig {...defaultProps} />);
            expect(screen.getByText(/False Branch/)).toBeInTheDocument();
        });
    });
});
