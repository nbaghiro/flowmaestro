/**
 * PdfGenerationNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PdfGenerationNodeConfig } from "../../configs/PdfGenerationNodeConfig";

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

describe("PdfGenerationNodeConfig", () => {
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
        it("renders Content section", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-content")).toBeInTheDocument();
        });

        it("renders Page Settings section", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-page-settings")).toBeInTheDocument();
        });

        it("renders Margins section", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-margins")).toBeInTheDocument();
        });

        it("renders Header & Footer section", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-header-&-footer")).toBeInTheDocument();
        });

        it("renders Output section", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output")).toBeInTheDocument();
        });

        it("renders format field", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-format")).toBeInTheDocument();
        });

        it("renders content field", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-content")).toBeInTheDocument();
        });

        it("renders filename field", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-filename")).toBeInTheDocument();
        });

        it("renders page size field", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-page-size")).toBeInTheDocument();
        });

        it("renders orientation field", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-orientation")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows empty content by default", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            const textarea = screen.getByTestId("textarea");
            expect(textarea).toHaveValue("");
        });

        it("shows default format as markdown", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("markdown");
        });

        it("shows default filename as document", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[0]).toHaveValue("document");
        });

        it("shows default page size as a4", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[1]).toHaveValue("a4");
        });

        it("shows default orientation as portrait", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[2]).toHaveValue("portrait");
        });

        it("shows page numbers disabled by default", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            const checkbox = screen.getByTestId("checkbox");
            expect(checkbox).not.toBeChecked();
        });
    });

    describe("Format Selection", () => {
        it("provides markdown and html options", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            const select = screen.getAllByTestId("select")[0];

            expect(select).toContainHTML("Markdown");
            expect(select).toContainHTML("HTML");
        });
    });

    describe("Page Size Selection", () => {
        it("provides a4, letter, and legal options", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            const select = screen.getAllByTestId("select")[1];

            expect(select).toContainHTML("A4");
            expect(select).toContainHTML("Letter");
            expect(select).toContainHTML("Legal");
        });
    });

    describe("Orientation Selection", () => {
        it("provides portrait and landscape options", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            const select = screen.getAllByTestId("select")[2];

            expect(select).toContainHTML("Portrait");
            expect(select).toContainHTML("Landscape");
        });
    });

    describe("Margins", () => {
        it("shows default margin values", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            const inputs = screen.getAllByTestId("input");
            // Margins are inputs 1-4 (after filename)
            expect(inputs[1]).toHaveValue("20mm");
            expect(inputs[2]).toHaveValue("20mm");
            expect(inputs[3]).toHaveValue("20mm");
            expect(inputs[4]).toHaveValue("20mm");
        });
    });

    describe("Preset Data", () => {
        it("loads existing content from data", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} data={{ content: "# My Report" }} />);
            const textarea = screen.getByTestId("textarea");
            expect(textarea).toHaveValue("# My Report");
        });

        it("loads existing format from data", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} data={{ format: "html" }} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("html");
        });

        it("loads existing filename from data", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} data={{ filename: "report" }} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[0]).toHaveValue("report");
        });

        it("loads existing page size from data", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} data={{ pageSize: "letter" }} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[1]).toHaveValue("letter");
        });

        it("loads includePageNumbers true from data", () => {
            render(
                <PdfGenerationNodeConfig {...defaultProps} data={{ includePageNumbers: true }} />
            );
            const checkbox = screen.getByTestId("checkbox");
            expect(checkbox).toBeChecked();
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when content changes", async () => {
            const user = userEvent.setup();
            render(<PdfGenerationNodeConfig {...defaultProps} />);

            const textarea = screen.getByTestId("textarea");
            await user.type(textarea, "# Title");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.content).toContain("# Title");
        });

        it("calls onUpdate when format changes", async () => {
            const user = userEvent.setup();
            render(<PdfGenerationNodeConfig {...defaultProps} />);

            const selects = screen.getAllByTestId("select");
            await user.selectOptions(selects[0], "html");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.format).toBe("html");
        });

        it("does not call onUpdate on initial render", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays Format field", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-format")).toBeInTheDocument();
        });

        it("displays Content field", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-content")).toBeInTheDocument();
        });

        it("displays Filename field", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-filename")).toBeInTheDocument();
        });

        it("displays Page Size field", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-page-size")).toBeInTheDocument();
        });

        it("displays Orientation field", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-orientation")).toBeInTheDocument();
        });

        it("displays Header Text field", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-header-text")).toBeInTheDocument();
        });

        it("displays Footer Text field", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-footer-text")).toBeInTheDocument();
        });
    });

    describe("Include Page Numbers", () => {
        it("shows Include Page Numbers checkbox", () => {
            render(<PdfGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByText("Include Page Numbers")).toBeInTheDocument();
        });
    });
});
