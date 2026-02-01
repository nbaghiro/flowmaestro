/**
 * FileWriteNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileWriteNodeConfig } from "../../configs/FileWriteNodeConfig";

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
        type,
        checked
    }: {
        value?: string;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder?: string;
        type?: string;
        checked?: boolean;
    }) => (
        <input
            data-testid={type === "checkbox" ? "checkbox" : "input"}
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

describe("FileWriteNodeConfig", () => {
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
            render(<FileWriteNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-file-path")).toBeInTheDocument();
        });

        it("renders Content section", () => {
            render(<FileWriteNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-content")).toBeInTheDocument();
        });

        it("renders Write Settings section", () => {
            render(<FileWriteNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-write-settings")).toBeInTheDocument();
        });

        it("renders Output section", () => {
            render(<FileWriteNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output")).toBeInTheDocument();
        });

        it("renders path field", () => {
            render(<FileWriteNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-path")).toBeInTheDocument();
        });

        it("renders content field", () => {
            render(<FileWriteNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-content")).toBeInTheDocument();
        });

        it("renders encoding field", () => {
            render(<FileWriteNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-encoding")).toBeInTheDocument();
        });

        it("renders create directories checkbox", () => {
            render(<FileWriteNodeConfig {...defaultProps} />);
            expect(screen.getByText("Create Parent Directories if Needed")).toBeInTheDocument();
        });

        it("renders overwrite checkbox", () => {
            render(<FileWriteNodeConfig {...defaultProps} />);
            expect(screen.getByText("Overwrite Existing File")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows empty path by default", () => {
            render(<FileWriteNodeConfig {...defaultProps} />);
            const input = screen.getByTestId("input");
            expect(input).toHaveValue("");
        });

        it("shows empty content by default", () => {
            render(<FileWriteNodeConfig {...defaultProps} />);
            const textarea = screen.getByTestId("textarea");
            expect(textarea).toHaveValue("");
        });

        it("shows default encoding as utf-8", () => {
            render(<FileWriteNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("utf-8");
        });

        it("shows create directories enabled by default", () => {
            render(<FileWriteNodeConfig {...defaultProps} />);
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[0]).toBeChecked();
        });

        it("shows overwrite enabled by default", () => {
            render(<FileWriteNodeConfig {...defaultProps} />);
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[1]).toBeChecked();
        });
    });

    describe("Preset Data", () => {
        it("loads existing path from data", () => {
            render(<FileWriteNodeConfig {...defaultProps} data={{ path: "output/result.txt" }} />);
            const input = screen.getByTestId("input");
            expect(input).toHaveValue("output/result.txt");
        });

        it("loads existing content from data", () => {
            render(
                <FileWriteNodeConfig {...defaultProps} data={{ content: "{{processedData}}" }} />
            );
            const textarea = screen.getByTestId("textarea");
            expect(textarea).toHaveValue("{{processedData}}");
        });

        it("loads existing encoding from data", () => {
            render(<FileWriteNodeConfig {...defaultProps} data={{ encoding: "base64" }} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("base64");
        });

        it("loads createDirectories false from data", () => {
            render(<FileWriteNodeConfig {...defaultProps} data={{ createDirectories: false }} />);
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[0]).not.toBeChecked();
        });

        it("loads overwrite false from data", () => {
            render(<FileWriteNodeConfig {...defaultProps} data={{ overwrite: false }} />);
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[1]).not.toBeChecked();
        });
    });

    describe("Encoding Selection", () => {
        it("provides utf-8 and base64 options", () => {
            render(<FileWriteNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");

            expect(select).toContainHTML("UTF-8 (Text)");
            expect(select).toContainHTML("Base64");
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when path changes", async () => {
            const user = userEvent.setup();
            render(<FileWriteNodeConfig {...defaultProps} />);

            const input = screen.getByTestId("input");
            await user.type(input, "output/file.txt");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.path).toBe("output/file.txt");
        });

        it("calls onUpdate when content changes", async () => {
            const user = userEvent.setup();
            render(<FileWriteNodeConfig {...defaultProps} />);

            const textarea = screen.getByTestId("textarea");
            await user.type(textarea, "Hello world");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.content).toBe("Hello world");
        });

        it("calls onUpdate when encoding changes", async () => {
            const user = userEvent.setup();
            render(<FileWriteNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "base64");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.encoding).toBe("base64");
        });

        it("does not call onUpdate on initial render", () => {
            render(<FileWriteNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays Path field", () => {
            render(<FileWriteNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-path")).toBeInTheDocument();
        });

        it("displays Content field", () => {
            render(<FileWriteNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-content")).toBeInTheDocument();
        });

        it("displays Encoding field", () => {
            render(<FileWriteNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-encoding")).toBeInTheDocument();
        });
    });
});
