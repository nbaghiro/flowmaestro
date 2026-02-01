/**
 * WebBrowseNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebBrowseNodeConfig } from "../../configs/WebBrowseNodeConfig";

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

describe("WebBrowseNodeConfig", () => {
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
        it("renders URL section", () => {
            render(<WebBrowseNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-url")).toBeInTheDocument();
        });

        it("renders Options section", () => {
            render(<WebBrowseNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-options")).toBeInTheDocument();
        });

        it("renders Output section", () => {
            render(<WebBrowseNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output")).toBeInTheDocument();
        });

        it("renders URL field", () => {
            render(<WebBrowseNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-url")).toBeInTheDocument();
        });

        it("renders max content length field", () => {
            render(<WebBrowseNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-max-content-length")).toBeInTheDocument();
        });

        it("renders output settings section", () => {
            render(<WebBrowseNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("output-settings-section")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows empty URL by default", () => {
            render(<WebBrowseNodeConfig {...defaultProps} />);
            const input = screen.getByTestId("input");
            expect(input).toHaveValue("");
        });

        it("shows extract text enabled by default", () => {
            render(<WebBrowseNodeConfig {...defaultProps} />);
            const checkbox = screen.getByTestId("checkbox");
            expect(checkbox).toBeChecked();
        });

        it("shows default max length as 10000", () => {
            render(<WebBrowseNodeConfig {...defaultProps} />);
            expect(screen.getByText("10,000")).toBeInTheDocument();
        });
    });

    describe("Extract Text Checkbox", () => {
        it("shows Extract Text checkbox label", () => {
            render(<WebBrowseNodeConfig {...defaultProps} />);
            expect(screen.getByText("Extract Text (remove HTML tags)")).toBeInTheDocument();
        });
    });

    describe("Preset Data", () => {
        it("loads existing URL from data", () => {
            render(<WebBrowseNodeConfig {...defaultProps} data={{ url: "https://example.com" }} />);
            const input = screen.getByTestId("input");
            expect(input).toHaveValue("https://example.com");
        });

        it("loads extractText false from data", () => {
            render(<WebBrowseNodeConfig {...defaultProps} data={{ extractText: false }} />);
            const checkbox = screen.getByTestId("checkbox");
            expect(checkbox).not.toBeChecked();
        });

        it("loads existing maxLength from data", () => {
            render(<WebBrowseNodeConfig {...defaultProps} data={{ maxLength: 25000 }} />);
            expect(screen.getByText("25,000")).toBeInTheDocument();
        });

        it("loads existing output variable from data", () => {
            render(
                <WebBrowseNodeConfig {...defaultProps} data={{ outputVariable: "pageContent" }} />
            );
            const outputInput = screen.getByTestId("output-variable-input");
            expect(outputInput).toHaveValue("pageContent");
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when URL changes", async () => {
            const user = userEvent.setup();
            render(<WebBrowseNodeConfig {...defaultProps} />);

            const input = screen.getByTestId("input");
            await user.type(input, "https://test.com");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.url).toBe("https://test.com");
        });

        it("calls onUpdate when extract text is toggled", async () => {
            const user = userEvent.setup();
            render(<WebBrowseNodeConfig {...defaultProps} />);

            const checkbox = screen.getByTestId("checkbox");
            await user.click(checkbox);

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.extractText).toBe(false);
        });

        it("does not call onUpdate on initial render", () => {
            render(<WebBrowseNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays URL field", () => {
            render(<WebBrowseNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-url")).toBeInTheDocument();
        });

        it("displays Max Content Length field", () => {
            render(<WebBrowseNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-max-content-length")).toBeInTheDocument();
        });
    });

    describe("Output Format Information", () => {
        it("displays output format info", () => {
            render(<WebBrowseNodeConfig {...defaultProps} />);
            expect(screen.getByText("Output format:")).toBeInTheDocument();
        });
    });
});
