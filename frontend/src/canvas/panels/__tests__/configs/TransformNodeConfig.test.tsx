/**
 * TransformNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransformNodeConfig } from "../../configs/TransformNodeConfig";

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
        placeholder,
        language
    }: {
        value: string;
        onChange: (value: string) => void;
        placeholder?: string;
        language?: string;
        rows?: number;
    }) => (
        <textarea
            data-testid="code-input"
            data-language={language}
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

describe("TransformNodeConfig", () => {
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
        it("renders Operation section", () => {
            render(<TransformNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-operation")).toBeInTheDocument();
        });

        it("renders Input section", () => {
            render(<TransformNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-input")).toBeInTheDocument();
        });

        it("renders Transformation section by default", () => {
            render(<TransformNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-transformation")).toBeInTheDocument();
        });

        it("renders Output Settings section", () => {
            render(<TransformNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output-settings")).toBeInTheDocument();
        });

        it("renders Transform Type field", () => {
            render(<TransformNodeConfig {...defaultProps} />);
            expect(screen.getByText("Transform Type")).toBeInTheDocument();
        });

        it("renders Input Data field", () => {
            render(<TransformNodeConfig {...defaultProps} />);
            expect(screen.getByText("Input Data")).toBeInTheDocument();
        });
    });

    describe("Operations", () => {
        it("shows Passthrough option", () => {
            render(<TransformNodeConfig {...defaultProps} />);
            expect(screen.getByText("Passthrough (no transformation)")).toBeInTheDocument();
        });

        it("shows Map option", () => {
            render(<TransformNodeConfig {...defaultProps} />);
            expect(screen.getByText("Map (transform each item)")).toBeInTheDocument();
        });

        it("shows Filter option", () => {
            render(<TransformNodeConfig {...defaultProps} />);
            expect(screen.getByText("Filter (select items)")).toBeInTheDocument();
        });

        it("shows Reduce option", () => {
            render(<TransformNodeConfig {...defaultProps} />);
            expect(screen.getByText("Reduce (aggregate)")).toBeInTheDocument();
        });

        it("shows Sort option", () => {
            render(<TransformNodeConfig {...defaultProps} />);
            expect(screen.getByText("Sort")).toBeInTheDocument();
        });

        it("shows Merge option", () => {
            render(<TransformNodeConfig {...defaultProps} />);
            expect(screen.getByText("Merge objects/arrays")).toBeInTheDocument();
        });

        it("shows Extract option", () => {
            render(<TransformNodeConfig {...defaultProps} />);
            expect(screen.getByText("Extract properties")).toBeInTheDocument();
        });

        it("shows Custom JSONata option", () => {
            render(<TransformNodeConfig {...defaultProps} />);
            expect(screen.getByText("Custom JSONata")).toBeInTheDocument();
        });

        it("has default operation set to map", () => {
            render(<TransformNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("map");
        });
    });

    describe("Passthrough Mode", () => {
        it("hides Transformation section when passthrough selected", async () => {
            const user = userEvent.setup();
            render(<TransformNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "passthrough");

            expect(screen.queryByTestId("form-section-transformation")).not.toBeInTheDocument();
        });

        it("shows passthrough description", async () => {
            const user = userEvent.setup();
            render(<TransformNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "passthrough");

            expect(screen.getByText(/Pass input data through unchanged/)).toBeInTheDocument();
        });
    });

    describe("Custom JSONata Mode", () => {
        it("shows JSONata expression label in custom mode", async () => {
            const user = userEvent.setup();
            render(<TransformNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "custom");

            expect(screen.getByText("JSONata Expression")).toBeInTheDocument();
        });

        it("shows JSONata examples in custom mode", async () => {
            const user = userEvent.setup();
            render(<TransformNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "custom");

            expect(screen.getByText(/JSONata Examples:/)).toBeInTheDocument();
        });

        it("sets code input language to jsonata for custom", async () => {
            const user = userEvent.setup();
            render(<TransformNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "custom");

            const codeInput = screen.getByTestId("code-input");
            expect(codeInput).toHaveAttribute("data-language", "jsonata");
        });
    });

    describe("Preset Data", () => {
        it("loads existing operation from data", () => {
            render(<TransformNodeConfig {...defaultProps} data={{ operation: "filter" }} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("filter");
        });

        it("loads existing input data from data", () => {
            render(<TransformNodeConfig {...defaultProps} data={{ inputData: "myArray" }} />);
            const input = screen.getByTestId("input-text");
            expect(input).toHaveValue("myArray");
        });

        it("loads existing expression from data", () => {
            render(
                <TransformNodeConfig
                    {...defaultProps}
                    data={{ expression: "item => item.value > 10" }}
                />
            );
            const codeInput = screen.getByTestId("code-input");
            expect(codeInput).toHaveValue("item => item.value > 10");
        });
    });

    describe("State Updates", () => {
        it("does not call onUpdate on initial render", () => {
            render(<TransformNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });

        it("calls onUpdate when operation changes", async () => {
            const user = userEvent.setup();
            render(<TransformNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "filter");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.operation).toBe("filter");
        });

        it("calls onUpdate when input data changes", async () => {
            const user = userEvent.setup();
            render(<TransformNodeConfig {...defaultProps} />);

            const input = screen.getByTestId("input-text");
            await user.type(input, "myData");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.inputData).toContain("myData");
        });

        it("calls onUpdate when expression changes", async () => {
            const user = userEvent.setup();
            render(<TransformNodeConfig {...defaultProps} />);

            const codeInput = screen.getByTestId("code-input");
            await user.type(codeInput, "x => x * 2");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.expression).toContain("x => x * 2");
        });
    });

    describe("Code Editor", () => {
        it("renders code input for expression", () => {
            render(<TransformNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("code-input")).toBeInTheDocument();
        });

        it("sets code input language to javascript by default", () => {
            render(<TransformNodeConfig {...defaultProps} />);
            const codeInput = screen.getByTestId("code-input");
            expect(codeInput).toHaveAttribute("data-language", "javascript");
        });
    });
});
