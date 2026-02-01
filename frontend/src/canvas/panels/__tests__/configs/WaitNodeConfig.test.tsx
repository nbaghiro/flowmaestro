/**
 * WaitNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WaitNodeConfig } from "../../configs/WaitNodeConfig";

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
        value?: string | number;
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

vi.mock("../../../../components/CodeInput", () => ({
    CodeInput: ({
        value,
        onChange,
        placeholder
    }: {
        value: string;
        onChange: (value: string) => void;
        placeholder?: string;
        language?: string;
        rows?: number;
    }) => (
        <textarea
            data-testid="code-input"
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
        <div data-testid="output-settings-section">
            <input
                data-testid="output-variable-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    )
}));

describe("WaitNodeConfig", () => {
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
        it("renders Wait Type section", () => {
            render(<WaitNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-wait-type")).toBeInTheDocument();
        });

        it("renders Output Settings section", () => {
            render(<WaitNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output-settings")).toBeInTheDocument();
        });

        it("renders type field", () => {
            render(<WaitNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-type")).toBeInTheDocument();
        });

        it("renders output settings section", () => {
            render(<WaitNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("output-settings-section")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows default wait type as duration", () => {
            render(<WaitNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("duration");
        });

        it("shows Duration section by default", () => {
            render(<WaitNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-duration")).toBeInTheDocument();
        });

        it("shows default duration of 5", () => {
            render(<WaitNodeConfig {...defaultProps} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[0]).toHaveValue(5);
        });

        it("shows default unit as seconds", () => {
            render(<WaitNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[1]).toHaveValue("seconds");
        });
    });

    describe("Wait Type Selection", () => {
        it("provides duration, until, and condition options", () => {
            render(<WaitNodeConfig {...defaultProps} />);
            const select = screen.getAllByTestId("select")[0];

            expect(select).toContainHTML("Fixed Duration");
            expect(select).toContainHTML("Until Timestamp");
            expect(select).toContainHTML("Until Condition");
        });

        it("shows Until Timestamp section when until is selected", async () => {
            const user = userEvent.setup();
            render(<WaitNodeConfig {...defaultProps} />);

            const select = screen.getAllByTestId("select")[0];
            await user.selectOptions(select, "until");

            expect(screen.getByTestId("form-section-until-timestamp")).toBeInTheDocument();
        });

        it("shows Until Condition section when condition is selected", async () => {
            const user = userEvent.setup();
            render(<WaitNodeConfig {...defaultProps} />);

            const select = screen.getAllByTestId("select")[0];
            await user.selectOptions(select, "condition");

            expect(screen.getByTestId("form-section-until-condition")).toBeInTheDocument();
        });
    });

    describe("Duration Mode", () => {
        it("shows Wait For field", () => {
            render(<WaitNodeConfig {...defaultProps} data={{ waitType: "duration" }} />);
            expect(screen.getByTestId("form-field-wait-for")).toBeInTheDocument();
        });

        it("provides seconds, minutes, hours, days units", () => {
            render(<WaitNodeConfig {...defaultProps} data={{ waitType: "duration" }} />);
            const selects = screen.getAllByTestId("select");
            const unitSelect = selects[1];

            expect(unitSelect).toContainHTML("Seconds");
            expect(unitSelect).toContainHTML("Minutes");
            expect(unitSelect).toContainHTML("Hours");
            expect(unitSelect).toContainHTML("Days");
        });
    });

    describe("Until Timestamp Mode", () => {
        it("shows Timestamp field when until mode selected", () => {
            render(<WaitNodeConfig {...defaultProps} data={{ waitType: "until" }} />);
            expect(screen.getByTestId("form-field-timestamp")).toBeInTheDocument();
        });

        it("loads existing timestamp from data", () => {
            render(
                <WaitNodeConfig
                    {...defaultProps}
                    data={{ waitType: "until", timestamp: "2024-12-31T23:59:59Z" }}
                />
            );
            const input = screen.getByTestId("input");
            expect(input).toHaveValue("2024-12-31T23:59:59Z");
        });
    });

    describe("Until Condition Mode", () => {
        it("shows Condition field when condition mode selected", () => {
            render(<WaitNodeConfig {...defaultProps} data={{ waitType: "condition" }} />);
            expect(screen.getByTestId("form-field-condition")).toBeInTheDocument();
        });

        it("shows Polling Interval field when condition mode selected", () => {
            render(<WaitNodeConfig {...defaultProps} data={{ waitType: "condition" }} />);
            expect(screen.getByTestId("form-field-polling-interval-(seconds)")).toBeInTheDocument();
        });

        it("loads existing condition from data", () => {
            render(
                <WaitNodeConfig
                    {...defaultProps}
                    data={{ waitType: "condition", condition: "${status} === 'complete'" }}
                />
            );
            const codeInput = screen.getByTestId("code-input");
            expect(codeInput).toHaveValue("${status} === 'complete'");
        });

        it("shows default polling interval of 5 seconds", () => {
            render(<WaitNodeConfig {...defaultProps} data={{ waitType: "condition" }} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[0]).toHaveValue(5);
        });
    });

    describe("Preset Data", () => {
        it("loads existing wait type from data", () => {
            render(<WaitNodeConfig {...defaultProps} data={{ waitType: "until" }} />);
            const select = screen.getAllByTestId("select")[0];
            expect(select).toHaveValue("until");
        });

        it("loads existing duration from data", () => {
            render(
                <WaitNodeConfig {...defaultProps} data={{ waitType: "duration", duration: 10 }} />
            );
            const inputs = screen.getAllByTestId("input");
            expect(inputs[0]).toHaveValue(10);
        });

        it("loads existing unit from data", () => {
            render(
                <WaitNodeConfig
                    {...defaultProps}
                    data={{ waitType: "duration", unit: "minutes" }}
                />
            );
            const selects = screen.getAllByTestId("select");
            expect(selects[1]).toHaveValue("minutes");
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when wait type changes", async () => {
            const user = userEvent.setup();
            render(<WaitNodeConfig {...defaultProps} />);

            const select = screen.getAllByTestId("select")[0];
            await user.selectOptions(select, "until");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.waitType).toBe("until");
        });

        it("calls onUpdate when duration changes", async () => {
            const user = userEvent.setup();
            render(<WaitNodeConfig {...defaultProps} />);

            const inputs = screen.getAllByTestId("input");
            await user.clear(inputs[0]);
            await user.type(inputs[0], "15");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.duration).toBe(15);
        });

        it("does not call onUpdate on initial render", () => {
            render(<WaitNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays Type label", () => {
            render(<WaitNodeConfig {...defaultProps} />);
            expect(screen.getByText("Type")).toBeInTheDocument();
        });

        it("displays Wait For label in duration mode", () => {
            render(<WaitNodeConfig {...defaultProps} data={{ waitType: "duration" }} />);
            expect(screen.getByText("Wait For")).toBeInTheDocument();
        });

        it("displays Timestamp label in until mode", () => {
            render(<WaitNodeConfig {...defaultProps} data={{ waitType: "until" }} />);
            expect(screen.getByText("Timestamp")).toBeInTheDocument();
        });

        it("displays Condition label in condition mode", () => {
            render(<WaitNodeConfig {...defaultProps} data={{ waitType: "condition" }} />);
            expect(screen.getByText("Condition")).toBeInTheDocument();
        });
    });
});
