/**
 * OutputNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OutputNodeConfig } from "../../configs/OutputNodeConfig";

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
        placeholder,
        type
    }: {
        value: string;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder?: string;
        type?: string;
    }) => (
        <input
            data-testid="input"
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

describe("OutputNodeConfig", () => {
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
        it("renders Output Configuration section", () => {
            render(<OutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output-configuration")).toBeInTheDocument();
        });

        it("renders Value section", () => {
            render(<OutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-value")).toBeInTheDocument();
        });

        it("renders Preview section", () => {
            render(<OutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-preview")).toBeInTheDocument();
        });

        it("renders Usage Notes section", () => {
            render(<OutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-usage-notes")).toBeInTheDocument();
        });

        it("renders output name field", () => {
            render(<OutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-output-name")).toBeInTheDocument();
        });

        it("renders format field", () => {
            render(<OutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-format")).toBeInTheDocument();
        });

        it("renders description field", () => {
            render(<OutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-description")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows default output name as 'result'", () => {
            render(<OutputNodeConfig {...defaultProps} />);
            const input = screen.getAllByTestId("input")[0];
            expect(input).toHaveValue("result");
        });

        it("shows default format as json", () => {
            render(<OutputNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("json");
        });

        it("shows empty description by default", () => {
            render(<OutputNodeConfig {...defaultProps} />);
            const textareas = screen.getAllByTestId("textarea");
            expect(textareas[0]).toHaveValue("");
        });
    });

    describe("Preset Data", () => {
        it("loads existing output name from data", () => {
            render(<OutputNodeConfig {...defaultProps} data={{ outputName: "customOutput" }} />);
            const input = screen.getAllByTestId("input")[0];
            expect(input).toHaveValue("customOutput");
        });

        it("loads existing format from data", () => {
            render(<OutputNodeConfig {...defaultProps} data={{ format: "string" }} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("string");
        });

        it("loads existing description from data", () => {
            render(
                <OutputNodeConfig
                    {...defaultProps}
                    data={{ description: "My output description" }}
                />
            );
            const textareas = screen.getAllByTestId("textarea");
            expect(textareas[0]).toHaveValue("My output description");
        });

        it("loads existing value from data", () => {
            render(<OutputNodeConfig {...defaultProps} data={{ value: "{{myVariable}}" }} />);
            const textareas = screen.getAllByTestId("textarea");
            expect(textareas[1]).toHaveValue("{{myVariable}}");
        });
    });

    describe("Format Selection", () => {
        it("provides json, string, number, and boolean options", () => {
            render(<OutputNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");

            expect(select).toContainHTML("JSON");
            expect(select).toContainHTML("String");
            expect(select).toContainHTML("Number");
            expect(select).toContainHTML("Boolean");
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when output name changes", async () => {
            const user = userEvent.setup();
            render(<OutputNodeConfig {...defaultProps} />);

            const input = screen.getAllByTestId("input")[0];
            await user.clear(input);
            await user.type(input, "newOutput");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.outputName).toBe("newOutput");
        });

        it("calls onUpdate when format changes", async () => {
            const user = userEvent.setup();
            render(<OutputNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "number");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.format).toBe("number");
        });

        it("calls onUpdate when value changes", async () => {
            const user = userEvent.setup();
            render(<OutputNodeConfig {...defaultProps} />);

            const textareas = screen.getAllByTestId("textarea");
            await user.type(textareas[1], "myValue");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.value).toContain("myValue");
        });

        it("does not call onUpdate on initial render", () => {
            render(<OutputNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays Output Name field", () => {
            render(<OutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-output-name")).toBeInTheDocument();
        });

        it("displays Format field", () => {
            render(<OutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-format")).toBeInTheDocument();
        });

        it("displays Description field", () => {
            render(<OutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-description")).toBeInTheDocument();
        });

        it("displays Output Value field", () => {
            render(<OutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-output-value")).toBeInTheDocument();
        });
    });
});
