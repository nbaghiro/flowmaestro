/**
 * SpreadsheetGenerationNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SpreadsheetGenerationNodeConfig } from "../../configs/SpreadsheetGenerationNodeConfig";

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

describe("SpreadsheetGenerationNodeConfig", () => {
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
        it("renders Format section", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-format")).toBeInTheDocument();
        });

        it("renders Data Source section", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-data-source")).toBeInTheDocument();
        });

        it("renders Styling section when xlsx format", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-styling")).toBeInTheDocument();
        });

        it("renders Output section", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output")).toBeInTheDocument();
        });

        it("renders output format field", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-output-format")).toBeInTheDocument();
        });

        it("renders filename field", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-filename")).toBeInTheDocument();
        });

        it("renders data field", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-data")).toBeInTheDocument();
        });

        it("renders sheet name field when xlsx format", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-sheet-name")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows default format as xlsx", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("xlsx");
        });

        it("shows default filename as spreadsheet", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[0]).toHaveValue("spreadsheet");
        });

        it("shows default sheet name as Sheet1", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[1]).toHaveValue("Sheet1");
        });

        it("shows header bold enabled by default", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[0]).toBeChecked();
        });

        it("shows freeze header enabled by default", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[2]).toBeChecked();
        });

        it("shows alternate rows disabled by default", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[1]).not.toBeChecked();
        });
    });

    describe("Format Selection", () => {
        it("provides xlsx and csv options", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");

            expect(select).toContainHTML("Excel (.xlsx)");
            expect(select).toContainHTML("CSV (.csv)");
        });

        it("hides Styling section when csv is selected", async () => {
            const user = userEvent.setup();
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "csv");

            expect(screen.queryByTestId("form-section-styling")).not.toBeInTheDocument();
        });

        it("hides Sheet Name field when csv is selected", async () => {
            const user = userEvent.setup();
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "csv");

            expect(screen.queryByTestId("form-field-sheet-name")).not.toBeInTheDocument();
        });
    });

    describe("Styling Options", () => {
        it("shows Bold Header Row checkbox", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByText("Bold Header Row")).toBeInTheDocument();
        });

        it("shows Alternate Row Colors checkbox", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByText("Alternate Row Colors")).toBeInTheDocument();
        });

        it("shows Freeze Header Row checkbox", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByText("Freeze Header Row")).toBeInTheDocument();
        });

        it("shows Header Background field", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-header-background")).toBeInTheDocument();
        });

        it("shows Header Text field", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-header-text")).toBeInTheDocument();
        });
    });

    describe("Preset Data", () => {
        it("loads existing format from data", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} data={{ format: "csv" }} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("csv");
        });

        it("loads existing filename from data", () => {
            render(
                <SpreadsheetGenerationNodeConfig {...defaultProps} data={{ filename: "report" }} />
            );
            const inputs = screen.getAllByTestId("input");
            expect(inputs[0]).toHaveValue("report");
        });

        it("loads existing data source from data", () => {
            render(
                <SpreadsheetGenerationNodeConfig
                    {...defaultProps}
                    data={{ dataSource: "{{rows}}" }}
                />
            );
            const textarea = screen.getByTestId("textarea");
            expect(textarea).toHaveValue("{{rows}}");
        });

        it("loads existing sheet name from data", () => {
            render(
                <SpreadsheetGenerationNodeConfig {...defaultProps} data={{ sheetName: "Data" }} />
            );
            const inputs = screen.getAllByTestId("input");
            expect(inputs[1]).toHaveValue("Data");
        });

        it("loads header bold false from data", () => {
            render(
                <SpreadsheetGenerationNodeConfig {...defaultProps} data={{ headerBold: false }} />
            );
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[0]).not.toBeChecked();
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when format changes", async () => {
            const user = userEvent.setup();
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "csv");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.format).toBe("csv");
        });

        it("calls onUpdate when filename changes", async () => {
            const user = userEvent.setup();
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);

            const inputs = screen.getAllByTestId("input");
            await user.clear(inputs[0]);
            await user.type(inputs[0], "myreport");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.filename).toBe("myreport");
        });

        it("calls onUpdate when data source changes", async () => {
            const user = userEvent.setup();
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);

            const textarea = screen.getByTestId("textarea");
            await user.type(textarea, "rows");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.dataSource).toContain("rows");
        });

        it("does not call onUpdate on initial render", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays Output Format field", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-output-format")).toBeInTheDocument();
        });

        it("displays Filename field", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-filename")).toBeInTheDocument();
        });

        it("displays Data field", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-data")).toBeInTheDocument();
        });

        it("displays Sheet Name field when xlsx", () => {
            render(<SpreadsheetGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-sheet-name")).toBeInTheDocument();
        });
    });
});
