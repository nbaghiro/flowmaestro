/**
 * CodeNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CodeNodeConfig } from "../../configs/CodeNodeConfig";

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
        min,
        max
    }: {
        value: string | number;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        type?: string;
        placeholder?: string;
        min?: number;
        max?: number;
    }) => (
        <input
            data-testid={`input-${type || "text"}`}
            type={type || "text"}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            min={min}
            max={max}
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

describe("CodeNodeConfig", () => {
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
        it("renders Language section", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-language")).toBeInTheDocument();
        });

        it("renders Code section", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-code")).toBeInTheDocument();
        });

        it("renders Resource Limits section", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-resource-limits")).toBeInTheDocument();
        });

        it("renders Input/Output section", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-input/output")).toBeInTheDocument();
        });

        it("renders Output Settings section", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output-settings")).toBeInTheDocument();
        });

        it("renders Programming Language field", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            expect(screen.getByText("Programming Language")).toBeInTheDocument();
        });

        it("renders Code Editor field", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            expect(screen.getByText("Code Editor")).toBeInTheDocument();
        });

        it("renders Timeout field", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            expect(screen.getByText("Timeout (seconds)")).toBeInTheDocument();
        });

        it("renders Memory Limit field", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            expect(screen.getByText("Memory Limit (MB)")).toBeInTheDocument();
        });
    });

    describe("Languages", () => {
        it("shows JavaScript option", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            expect(screen.getByText("JavaScript")).toBeInTheDocument();
        });

        it("shows TypeScript option", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            expect(screen.getByText("TypeScript")).toBeInTheDocument();
        });

        it("shows Python option", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            expect(screen.getByText("Python")).toBeInTheDocument();
        });

        it("has default language set to javascript", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("javascript");
        });
    });

    describe("Default Values", () => {
        it("has default timeout of 30", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            const inputs = screen.getAllByTestId("input-number");
            expect(inputs[0]).toHaveValue(30);
        });

        it("has default memory limit of 256", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            const inputs = screen.getAllByTestId("input-number");
            expect(inputs[1]).toHaveValue(256);
        });

        it("renders code input", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("code-input")).toBeInTheDocument();
        });
    });

    describe("Preset Data", () => {
        it("loads existing language from data", () => {
            render(<CodeNodeConfig {...defaultProps} data={{ language: "python" }} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("python");
        });

        it("loads existing code from data", () => {
            render(<CodeNodeConfig {...defaultProps} data={{ code: "return 42;" }} />);
            const codeInput = screen.getByTestId("code-input");
            expect(codeInput).toHaveValue("return 42;");
        });

        it("loads existing timeout from data", () => {
            render(<CodeNodeConfig {...defaultProps} data={{ timeout: 60 }} />);
            const inputs = screen.getAllByTestId("input-number");
            expect(inputs[0]).toHaveValue(60);
        });

        it("loads existing memory limit from data", () => {
            render(<CodeNodeConfig {...defaultProps} data={{ memoryLimit: 512 }} />);
            const inputs = screen.getAllByTestId("input-number");
            expect(inputs[1]).toHaveValue(512);
        });
    });

    describe("State Updates", () => {
        it("does not call onUpdate on initial render", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });

        it("calls onUpdate when language changes", async () => {
            const user = userEvent.setup();
            render(<CodeNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "python");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.language).toBe("python");
        });

        it("calls onUpdate when code changes", async () => {
            const user = userEvent.setup();
            render(<CodeNodeConfig {...defaultProps} />);

            const codeInput = screen.getByTestId("code-input");
            await user.type(codeInput, "const x = 1;");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.code).toContain("const x = 1;");
        });

        it("calls onUpdate when timeout changes", async () => {
            const user = userEvent.setup();
            render(<CodeNodeConfig {...defaultProps} />);

            const inputs = screen.getAllByTestId("input-number");
            await user.clear(inputs[0]);
            await user.type(inputs[0], "60");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.timeout).toBe(60);
        });
    });

    describe("Code Editor Language", () => {
        it("sets code input language to javascript for javascript", () => {
            render(<CodeNodeConfig {...defaultProps} data={{ language: "javascript" }} />);
            const codeInput = screen.getByTestId("code-input");
            expect(codeInput).toHaveAttribute("data-language", "javascript");
        });

        it("sets code input language to javascript for typescript", () => {
            render(<CodeNodeConfig {...defaultProps} data={{ language: "typescript" }} />);
            const codeInput = screen.getByTestId("code-input");
            expect(codeInput).toHaveAttribute("data-language", "javascript");
        });

        it("sets code input language to python for python", () => {
            render(<CodeNodeConfig {...defaultProps} data={{ language: "python" }} />);
            const codeInput = screen.getByTestId("code-input");
            expect(codeInput).toHaveAttribute("data-language", "python");
        });
    });

    describe("Help Text", () => {
        it("shows available functions info", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            expect(screen.getByText(/Available:/)).toBeInTheDocument();
        });

        it("shows restricted functions info", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            expect(screen.getByText(/Restricted:/)).toBeInTheDocument();
        });

        it("shows input access example", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            expect(screen.getByText("Input Access")).toBeInTheDocument();
        });

        it("shows output info", () => {
            render(<CodeNodeConfig {...defaultProps} />);
            expect(screen.getByText("Output")).toBeInTheDocument();
        });
    });
});
