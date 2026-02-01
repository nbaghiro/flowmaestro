/**
 * FileReadNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileReadNodeConfig } from "../../configs/FileReadNodeConfig";

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
        <div data-testid="output-settings-section">
            <input
                data-testid="output-variable-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    )
}));

describe("FileReadNodeConfig", () => {
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
        it("renders File Path section", () => {
            render(<FileReadNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-file-path")).toBeInTheDocument();
        });

        it("renders Read Settings section", () => {
            render(<FileReadNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-read-settings")).toBeInTheDocument();
        });

        it("renders Output section", () => {
            render(<FileReadNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output")).toBeInTheDocument();
        });

        it("renders path field", () => {
            render(<FileReadNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-path")).toBeInTheDocument();
        });

        it("renders encoding field", () => {
            render(<FileReadNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-encoding")).toBeInTheDocument();
        });

        it("renders max file size field", () => {
            render(<FileReadNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-max-file-size-(mb)")).toBeInTheDocument();
        });

        it("renders output settings section", () => {
            render(<FileReadNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("output-settings-section")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows empty path by default", () => {
            render(<FileReadNodeConfig {...defaultProps} />);
            const input = screen.getByTestId("input");
            expect(input).toHaveValue("");
        });

        it("shows default encoding as utf-8", () => {
            render(<FileReadNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("utf-8");
        });

        it("shows default max size as 1 MB", () => {
            render(<FileReadNodeConfig {...defaultProps} />);
            expect(screen.getByText("1 MB")).toBeInTheDocument();
        });
    });

    describe("Preset Data", () => {
        it("loads existing path from data", () => {
            render(<FileReadNodeConfig {...defaultProps} data={{ path: "data/input.txt" }} />);
            const input = screen.getByTestId("input");
            expect(input).toHaveValue("data/input.txt");
        });

        it("loads existing encoding from data", () => {
            render(<FileReadNodeConfig {...defaultProps} data={{ encoding: "base64" }} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("base64");
        });

        it("loads existing output variable from data", () => {
            render(
                <FileReadNodeConfig {...defaultProps} data={{ outputVariable: "fileContent" }} />
            );
            const outputInput = screen.getByTestId("output-variable-input");
            expect(outputInput).toHaveValue("fileContent");
        });
    });

    describe("Encoding Selection", () => {
        it("provides utf-8, base64, and binary options", () => {
            render(<FileReadNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");

            expect(select).toContainHTML("UTF-8 (Text)");
            expect(select).toContainHTML("Base64");
            expect(select).toContainHTML("Binary");
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when path changes", async () => {
            const user = userEvent.setup();
            render(<FileReadNodeConfig {...defaultProps} />);

            const input = screen.getByTestId("input");
            await user.type(input, "data/file.txt");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.path).toBe("data/file.txt");
        });

        it("calls onUpdate when encoding changes", async () => {
            const user = userEvent.setup();
            render(<FileReadNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "base64");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.encoding).toBe("base64");
        });

        it("does not call onUpdate on initial render", () => {
            render(<FileReadNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays Path label", () => {
            render(<FileReadNodeConfig {...defaultProps} />);
            expect(screen.getByText("Path")).toBeInTheDocument();
        });

        it("displays Encoding label", () => {
            render(<FileReadNodeConfig {...defaultProps} />);
            expect(screen.getByText("Encoding")).toBeInTheDocument();
        });
    });
});
