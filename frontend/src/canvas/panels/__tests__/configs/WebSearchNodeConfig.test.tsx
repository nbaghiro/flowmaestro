/**
 * WebSearchNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebSearchNodeConfig } from "../../configs/WebSearchNodeConfig";

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

describe("WebSearchNodeConfig", () => {
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
        it("renders Search Query section", () => {
            render(<WebSearchNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-search-query")).toBeInTheDocument();
        });

        it("renders Search Options section", () => {
            render(<WebSearchNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-search-options")).toBeInTheDocument();
        });

        it("renders Output section", () => {
            render(<WebSearchNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output")).toBeInTheDocument();
        });

        it("renders query field", () => {
            render(<WebSearchNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-query")).toBeInTheDocument();
        });

        it("renders search type field", () => {
            render(<WebSearchNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-search-type")).toBeInTheDocument();
        });

        it("renders max results field", () => {
            render(<WebSearchNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-max-results")).toBeInTheDocument();
        });

        it("renders output settings section", () => {
            render(<WebSearchNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("output-settings-section")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows empty query by default", () => {
            render(<WebSearchNodeConfig {...defaultProps} />);
            const input = screen.getByTestId("input");
            expect(input).toHaveValue("");
        });

        it("shows default search type as general", () => {
            render(<WebSearchNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("general");
        });

        it("shows default max results as 5", () => {
            render(<WebSearchNodeConfig {...defaultProps} />);
            expect(screen.getByText("5")).toBeInTheDocument();
        });
    });

    describe("Search Type Selection", () => {
        it("provides general, news, and images options", () => {
            render(<WebSearchNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");

            expect(select).toContainHTML("General");
            expect(select).toContainHTML("News");
            expect(select).toContainHTML("Images");
        });
    });

    describe("Preset Data", () => {
        it("loads existing query from data", () => {
            render(<WebSearchNodeConfig {...defaultProps} data={{ query: "{{userQuery}}" }} />);
            const input = screen.getByTestId("input");
            expect(input).toHaveValue("{{userQuery}}");
        });

        it("loads existing search type from data", () => {
            render(<WebSearchNodeConfig {...defaultProps} data={{ searchType: "news" }} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("news");
        });

        it("loads existing max results from data", () => {
            render(<WebSearchNodeConfig {...defaultProps} data={{ maxResults: 10 }} />);
            expect(screen.getByText("10")).toBeInTheDocument();
        });

        it("loads existing output variable from data", () => {
            render(
                <WebSearchNodeConfig {...defaultProps} data={{ outputVariable: "searchResults" }} />
            );
            const outputInput = screen.getByTestId("output-variable-input");
            expect(outputInput).toHaveValue("searchResults");
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when query changes", async () => {
            const user = userEvent.setup();
            render(<WebSearchNodeConfig {...defaultProps} />);

            const input = screen.getByTestId("input");
            await user.type(input, "AI news");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.query).toBe("AI news");
        });

        it("calls onUpdate when search type changes", async () => {
            const user = userEvent.setup();
            render(<WebSearchNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "news");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.searchType).toBe("news");
        });

        it("does not call onUpdate on initial render", () => {
            render(<WebSearchNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays Query label", () => {
            render(<WebSearchNodeConfig {...defaultProps} />);
            expect(screen.getByText("Query")).toBeInTheDocument();
        });

        it("displays Search Type label", () => {
            render(<WebSearchNodeConfig {...defaultProps} />);
            expect(screen.getByText("Search Type")).toBeInTheDocument();
        });

        it("displays Max Results label", () => {
            render(<WebSearchNodeConfig {...defaultProps} />);
            expect(screen.getByText("Max Results")).toBeInTheDocument();
        });
    });

    describe("Output Format", () => {
        it("displays output format information", () => {
            render(<WebSearchNodeConfig {...defaultProps} />);
            expect(screen.getByText("Output format:")).toBeInTheDocument();
        });
    });
});
