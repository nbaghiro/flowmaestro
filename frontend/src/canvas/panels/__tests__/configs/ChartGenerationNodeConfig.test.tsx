/**
 * ChartGenerationNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChartGenerationNodeConfig } from "../../configs/ChartGenerationNodeConfig";

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

describe("ChartGenerationNodeConfig", () => {
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
        it("renders Chart Type section", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-chart-type")).toBeInTheDocument();
        });

        it("renders Data Source section", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-data-source")).toBeInTheDocument();
        });

        it("renders Chart Options section", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-chart-options")).toBeInTheDocument();
        });

        it("renders Output section", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output")).toBeInTheDocument();
        });

        it("renders chart type field", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-chart-type")).toBeInTheDocument();
        });

        it("renders data source field", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-data-source")).toBeInTheDocument();
        });

        it("renders labels field", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-labels")).toBeInTheDocument();
        });

        it("renders title field", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-title")).toBeInTheDocument();
        });

        it("renders theme field", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-theme")).toBeInTheDocument();
        });

        it("renders legend position field", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-legend-position")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows default chart type as bar", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("bar");
        });

        it("shows default theme as light", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[1]).toHaveValue("light");
        });

        it("shows default legend position as top", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[2]).toHaveValue("top");
        });

        it("shows default width as 800", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            const inputs = screen.getAllByTestId("input");
            // Find the width input (after title, subtitle, labels)
            const widthInput = inputs.find((i) => i.getAttribute("value") === "800");
            expect(widthInput).toBeInTheDocument();
        });

        it("shows default height as 600", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            const inputs = screen.getAllByTestId("input");
            const heightInput = inputs.find((i) => i.getAttribute("value") === "600");
            expect(heightInput).toBeInTheDocument();
        });

        it("shows grid lines enabled by default", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[0]).toBeChecked();
        });

        it("shows data values disabled by default", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[1]).not.toBeChecked();
        });
    });

    describe("Chart Type Selection", () => {
        it("provides multiple chart type options", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            const select = screen.getAllByTestId("select")[0];

            expect(select).toContainHTML("Bar Chart");
            expect(select).toContainHTML("Line Chart");
            expect(select).toContainHTML("Pie Chart");
            expect(select).toContainHTML("Scatter Plot");
            expect(select).toContainHTML("Area Chart");
            expect(select).toContainHTML("Donut Chart");
        });

        it("hides axis labels for pie chart", async () => {
            const user = userEvent.setup();
            render(<ChartGenerationNodeConfig {...defaultProps} />);

            const select = screen.getAllByTestId("select")[0];
            await user.selectOptions(select, "pie");

            expect(screen.queryByTestId("form-field-x-axis-label")).not.toBeInTheDocument();
            expect(screen.queryByTestId("form-field-y-axis-label")).not.toBeInTheDocument();
        });

        it("shows axis labels for bar chart", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} data={{ chartType: "bar" }} />);
            expect(screen.getByTestId("form-field-x-axis-label")).toBeInTheDocument();
            expect(screen.getByTestId("form-field-y-axis-label")).toBeInTheDocument();
        });
    });

    describe("Theme Selection", () => {
        it("provides light and dark theme options", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            const themeSelect = selects[1];

            expect(themeSelect).toContainHTML("Light");
            expect(themeSelect).toContainHTML("Dark");
        });
    });

    describe("Legend Position Selection", () => {
        it("provides position options", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            const legendSelect = selects[2];

            expect(legendSelect).toContainHTML("Top");
            expect(legendSelect).toContainHTML("Bottom");
            expect(legendSelect).toContainHTML("Left");
            expect(legendSelect).toContainHTML("Right");
            expect(legendSelect).toContainHTML("Hidden");
        });
    });

    describe("Preset Data", () => {
        it("loads existing chart type from data", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} data={{ chartType: "line" }} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("line");
        });

        it("loads existing title from data", () => {
            render(
                <ChartGenerationNodeConfig {...defaultProps} data={{ title: "Sales Report" }} />
            );
            // inputs[0] is Labels, inputs[1] is Title
            const inputs = screen.getAllByTestId("input");
            expect(inputs[1]).toHaveValue("Sales Report");
        });

        it("loads existing data source from data", () => {
            render(
                <ChartGenerationNodeConfig
                    {...defaultProps}
                    data={{ dataSource: "{{datasets}}" }}
                />
            );
            const textarea = screen.getByTestId("textarea");
            expect(textarea).toHaveValue("{{datasets}}");
        });

        it("loads existing theme from data", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} data={{ theme: "dark" }} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[1]).toHaveValue("dark");
        });

        it("loads showGrid false from data", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} data={{ showGrid: false }} />);
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[0]).not.toBeChecked();
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when chart type changes", async () => {
            const user = userEvent.setup();
            render(<ChartGenerationNodeConfig {...defaultProps} />);

            const select = screen.getAllByTestId("select")[0];
            await user.selectOptions(select, "line");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.chartType).toBe("line");
        });

        it("calls onUpdate when title changes", async () => {
            const user = userEvent.setup();
            render(<ChartGenerationNodeConfig {...defaultProps} />);

            // inputs[0] is Labels, inputs[1] is Title
            const inputs = screen.getAllByTestId("input");
            await user.type(inputs[1], "My Chart");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.title).toContain("My Chart");
        });

        it("does not call onUpdate on initial render", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays Chart Type field", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-chart-type")).toBeInTheDocument();
        });

        it("displays Data Source field", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-data-source")).toBeInTheDocument();
        });

        it("displays Labels field", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-labels")).toBeInTheDocument();
        });

        it("displays Title field", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-title")).toBeInTheDocument();
        });

        it("displays Theme field", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-theme")).toBeInTheDocument();
        });

        it("displays Legend Position field", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-legend-position")).toBeInTheDocument();
        });

        it("displays Filename field", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-filename")).toBeInTheDocument();
        });
    });

    describe("Checkbox Labels", () => {
        it("displays Show Grid Lines label", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByText("Show Grid Lines")).toBeInTheDocument();
        });

        it("displays Show Data Values label", () => {
            render(<ChartGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByText("Show Data Values")).toBeInTheDocument();
        });
    });
});
