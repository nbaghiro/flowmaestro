/**
 * PdfExtractNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PdfExtractNodeConfig } from "../../configs/PdfExtractNodeConfig";

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
        value?: string | number;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder?: string;
        type?: string;
        checked?: boolean;
    }) => (
        <input
            data-testid={
                type === "checkbox" ? "checkbox" : type === "password" ? "password-input" : "input"
            }
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
        <div data-testid="output-settings-section">
            <input
                data-testid="output-variable-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    )
}));

describe("PdfExtractNodeConfig", () => {
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
        it("renders PDF File section", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-pdf-file")).toBeInTheDocument();
        });

        it("renders Extraction Options section", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-extraction-options")).toBeInTheDocument();
        });

        it("renders Page Range section", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-page-range-(optional)")).toBeInTheDocument();
        });

        it("renders Security section", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-security")).toBeInTheDocument();
        });

        it("renders Output section", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output")).toBeInTheDocument();
        });

        it("renders path field", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-path")).toBeInTheDocument();
        });

        it("renders output format field", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-output-format")).toBeInTheDocument();
        });

        it("renders start page field", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-start-page")).toBeInTheDocument();
        });

        it("renders end page field", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-end-page")).toBeInTheDocument();
        });

        it("renders password field", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-password")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows empty path by default", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[0]).toHaveValue("");
        });

        it("shows default output format as text", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("text");
        });

        it("shows extract text enabled by default", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[0]).toBeChecked();
        });

        it("shows extract metadata enabled by default", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[1]).toBeChecked();
        });
    });

    describe("Extraction Checkboxes", () => {
        it("shows Extract Text Content checkbox", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            expect(screen.getByText("Extract Text Content")).toBeInTheDocument();
        });

        it("shows Extract Metadata checkbox", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            expect(screen.getByText("Extract Metadata")).toBeInTheDocument();
        });
    });

    describe("Output Format Selection", () => {
        it("provides text, markdown, and json options", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");

            expect(select).toContainHTML("Plain Text");
            expect(select).toContainHTML("Markdown");
            expect(select).toContainHTML("JSON");
        });
    });

    describe("Preset Data", () => {
        it("loads existing path from data", () => {
            render(<PdfExtractNodeConfig {...defaultProps} data={{ path: "docs/report.pdf" }} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[0]).toHaveValue("docs/report.pdf");
        });

        it("loads existing output format from data", () => {
            render(<PdfExtractNodeConfig {...defaultProps} data={{ outputFormat: "markdown" }} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("markdown");
        });

        it("loads extractText false from data", () => {
            render(<PdfExtractNodeConfig {...defaultProps} data={{ extractText: false }} />);
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[0]).not.toBeChecked();
        });

        it("loads extractMetadata false from data", () => {
            render(<PdfExtractNodeConfig {...defaultProps} data={{ extractMetadata: false }} />);
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[1]).not.toBeChecked();
        });

        it("loads existing output variable from data", () => {
            render(
                <PdfExtractNodeConfig {...defaultProps} data={{ outputVariable: "pdfContent" }} />
            );
            const outputInput = screen.getByTestId("output-variable-input");
            expect(outputInput).toHaveValue("pdfContent");
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when path changes", async () => {
            const user = userEvent.setup();
            render(<PdfExtractNodeConfig {...defaultProps} />);

            const inputs = screen.getAllByTestId("input");
            await user.type(inputs[0], "docs/file.pdf");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.path).toBe("docs/file.pdf");
        });

        it("calls onUpdate when output format changes", async () => {
            const user = userEvent.setup();
            render(<PdfExtractNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "json");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.outputFormat).toBe("json");
        });

        it("does not call onUpdate on initial render", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays Path label", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            expect(screen.getByText("Path")).toBeInTheDocument();
        });

        it("displays Output Format label", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            expect(screen.getByText("Output Format")).toBeInTheDocument();
        });

        it("displays Start Page label", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            expect(screen.getByText("Start Page")).toBeInTheDocument();
        });

        it("displays End Page label", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            expect(screen.getByText("End Page")).toBeInTheDocument();
        });

        it("displays Password label", () => {
            render(<PdfExtractNodeConfig {...defaultProps} />);
            expect(screen.getByText("Password")).toBeInTheDocument();
        });
    });
});
