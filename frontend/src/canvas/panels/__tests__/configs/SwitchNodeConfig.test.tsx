/**
 * SwitchNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SwitchNodeConfig } from "../../configs/SwitchNodeConfig";

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

describe("SwitchNodeConfig", () => {
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
        it("renders Input section", () => {
            render(<SwitchNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-input")).toBeInTheDocument();
        });

        it("renders Cases section", () => {
            render(<SwitchNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-cases")).toBeInTheDocument();
        });

        it("renders Default Case section", () => {
            render(<SwitchNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-default-case")).toBeInTheDocument();
        });

        it("renders Output Settings section", () => {
            render(<SwitchNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output-settings")).toBeInTheDocument();
        });

        it("renders Input Variable field", () => {
            render(<SwitchNodeConfig {...defaultProps} />);
            expect(screen.getByText("Input Variable")).toBeInTheDocument();
        });

        it("renders Match Type field", () => {
            render(<SwitchNodeConfig {...defaultProps} />);
            expect(screen.getByText("Match Type")).toBeInTheDocument();
        });
    });

    describe("Default State", () => {
        it("renders one default case", () => {
            render(<SwitchNodeConfig {...defaultProps} />);
            expect(screen.getByText("Case 1")).toBeInTheDocument();
        });

        it("shows Add Case button", () => {
            render(<SwitchNodeConfig {...defaultProps} />);
            expect(screen.getByText("Add Case")).toBeInTheDocument();
        });

        it("has default match type set to exact", () => {
            render(<SwitchNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("exact");
        });
    });

    describe("Case Management", () => {
        it("adds a new case when Add Case is clicked", async () => {
            const user = userEvent.setup();
            render(<SwitchNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Add Case"));

            expect(screen.getByText("Case 2")).toBeInTheDocument();
        });

        it("removes a case when delete is clicked", async () => {
            const user = userEvent.setup();
            render(
                <SwitchNodeConfig
                    {...defaultProps}
                    data={{
                        cases: [
                            { value: "case1", label: "Case 1" },
                            { value: "case2", label: "Case 2" }
                        ]
                    }}
                />
            );

            // Find and click delete button
            const deleteButtons = screen.getAllByTitle("Remove case");
            await user.click(deleteButtons[0]);

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });
        });

        it("does not allow removing the last case", () => {
            render(<SwitchNodeConfig {...defaultProps} />);
            // With only 1 case, delete button should not appear
            expect(screen.queryByTitle("Remove case")).not.toBeInTheDocument();
        });
    });

    describe("Match Types", () => {
        it("shows Exact Match option", () => {
            render(<SwitchNodeConfig {...defaultProps} />);
            expect(screen.getByText("Exact Match")).toBeInTheDocument();
        });

        it("shows Contains option", () => {
            render(<SwitchNodeConfig {...defaultProps} />);
            expect(screen.getByText("Contains")).toBeInTheDocument();
        });

        it("shows Regex Pattern option", () => {
            render(<SwitchNodeConfig {...defaultProps} />);
            expect(screen.getByText("Regex Pattern")).toBeInTheDocument();
        });
    });

    describe("Preset Data", () => {
        it("loads existing cases from data", () => {
            render(
                <SwitchNodeConfig
                    {...defaultProps}
                    data={{
                        cases: [
                            { value: "val1", label: "First Case" },
                            { value: "val2", label: "Second Case" }
                        ]
                    }}
                />
            );
            expect(screen.getByText("Case 1")).toBeInTheDocument();
            expect(screen.getByText("Case 2")).toBeInTheDocument();
        });

        it("loads existing input variable from data", () => {
            render(<SwitchNodeConfig {...defaultProps} data={{ inputVariable: "{{status}}" }} />);
            const inputs = screen.getAllByTestId("input-text");
            expect(inputs[0]).toHaveValue("{{status}}");
        });

        it("loads existing match type from data", () => {
            render(<SwitchNodeConfig {...defaultProps} data={{ matchType: "contains" }} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("contains");
        });

        it("loads existing hasDefault from data", () => {
            render(<SwitchNodeConfig {...defaultProps} data={{ hasDefault: false }} />);
            const checkbox = screen.getByTestId("input-checkbox");
            expect(checkbox).not.toBeChecked();
        });
    });

    describe("State Updates", () => {
        it("does not call onUpdate on initial render", () => {
            render(<SwitchNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });

        it("calls onUpdate when input variable changes", async () => {
            const user = userEvent.setup();
            render(<SwitchNodeConfig {...defaultProps} />);

            const inputs = screen.getAllByTestId("input-text");
            await user.type(inputs[0], "myVar");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.inputVariable).toContain("myVar");
        });

        it("calls onUpdate when match type changes", async () => {
            const user = userEvent.setup();
            render(<SwitchNodeConfig {...defaultProps} />);

            const selects = screen.getAllByTestId("select");
            await user.selectOptions(selects[0], "regex");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.matchType).toBe("regex");
        });
    });

    describe("Default Case Toggle", () => {
        it("shows Enable Default field", () => {
            render(<SwitchNodeConfig {...defaultProps} />);
            expect(screen.getByText("Enable Default")).toBeInTheDocument();
        });

        it("has checkbox for enabling default case", () => {
            render(<SwitchNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("input-checkbox")).toBeInTheDocument();
        });

        it("default case is enabled by default", () => {
            render(<SwitchNodeConfig {...defaultProps} />);
            const checkbox = screen.getByTestId("input-checkbox");
            expect(checkbox).toBeChecked();
        });
    });
});
