/**
 * InputNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { InputNodeConfig } from "../../configs/InputNodeConfig";

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
        placeholder
    }: {
        value: string;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder?: string;
    }) => <input data-testid="input" value={value} onChange={onChange} placeholder={placeholder} />
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
        rows,
        className
    }: {
        value: string;
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
        placeholder?: string;
        rows?: number;
        className?: string;
    }) => (
        <textarea
            data-testid="textarea"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            className={className}
        />
    )
}));

describe("InputNodeConfig", () => {
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
        it("renders Input Configuration section", () => {
            render(<InputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-input-configuration")).toBeInTheDocument();
        });

        it("renders Value Settings section", () => {
            render(<InputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-value-settings")).toBeInTheDocument();
        });

        it("renders input name field", () => {
            render(<InputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-input-name")).toBeInTheDocument();
        });

        it("renders input type field", () => {
            render(<InputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-input-type")).toBeInTheDocument();
        });

        it("renders description field", () => {
            render(<InputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-description")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows default variable name", () => {
            render(<InputNodeConfig {...defaultProps} />);
            const input = screen.getAllByTestId("input")[0];
            expect(input).toHaveValue("userInput");
        });

        it("shows default input type as text", () => {
            render(<InputNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("text");
        });
    });

    describe("Preset Data", () => {
        it("loads existing variable name from data", () => {
            render(<InputNodeConfig {...defaultProps} data={{ variableName: "myCustomVar" }} />);
            const input = screen.getAllByTestId("input")[0];
            expect(input).toHaveValue("myCustomVar");
        });

        it("loads existing input type from data", () => {
            render(<InputNodeConfig {...defaultProps} data={{ inputType: "json" }} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("json");
        });

        it("loads existing description from data", () => {
            render(
                <InputNodeConfig {...defaultProps} data={{ description: "Enter your email" }} />
            );
            const textareas = screen.getAllByTestId("textarea");
            expect(textareas[0]).toHaveValue("Enter your email");
        });

        it("loads existing value from data", () => {
            render(<InputNodeConfig {...defaultProps} data={{ value: "default content" }} />);
            const textareas = screen.getAllByTestId("textarea");
            expect(textareas[1]).toHaveValue("default content");
        });
    });

    describe("Input Type Selection", () => {
        it("provides text and json options", () => {
            render(<InputNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");

            expect(select).toContainHTML("Text");
            expect(select).toContainHTML("JSON");
        });

        it("changes placeholder when input type changes", async () => {
            const user = userEvent.setup();
            render(<InputNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "json");

            // The value textarea should update placeholder
            const textareas = screen.getAllByTestId("textarea");
            expect(textareas[1]).toHaveAttribute("placeholder", '{"key": "value"}');
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when variable name changes", async () => {
            const user = userEvent.setup();
            render(<InputNodeConfig {...defaultProps} />);

            const input = screen.getAllByTestId("input")[0];
            await user.clear(input);
            await user.type(input, "newVar");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.variableName).toBe("newVar");
        });

        it("calls onUpdate when input type changes", async () => {
            const user = userEvent.setup();
            render(<InputNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "json");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.inputType).toBe("json");
        });

        it("calls onUpdate when description changes", async () => {
            const user = userEvent.setup();
            render(<InputNodeConfig {...defaultProps} />);

            const textareas = screen.getAllByTestId("textarea");
            await user.type(textareas[0], "New description");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.description).toContain("New description");
        });

        it("does not call onUpdate on initial render", () => {
            render(<InputNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays Input Name label", () => {
            render(<InputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Input Name")).toBeInTheDocument();
        });

        it("displays Input Type label", () => {
            render(<InputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Input Type")).toBeInTheDocument();
        });

        it("displays Description label", () => {
            render(<InputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Description")).toBeInTheDocument();
        });
    });
});
