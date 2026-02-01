/**
 * SharedMemoryNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SharedMemoryNodeConfig } from "../../configs/SharedMemoryNodeConfig";

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

vi.mock("../../../../components/common/Checkbox", () => ({
    Checkbox: ({
        checked,
        onCheckedChange,
        label
    }: {
        checked: boolean;
        onCheckedChange: (checked: boolean) => void;
        label?: string;
    }) => (
        <label data-testid="checkbox-label">
            <input
                data-testid="checkbox"
                type="checkbox"
                checked={checked}
                onChange={(e) => onCheckedChange(e.target.checked)}
            />
            {label && <span>{label}</span>}
        </label>
    )
}));

describe("SharedMemoryNodeConfig", () => {
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
        it("renders Operation section", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-operation")).toBeInTheDocument();
        });

        it("renders About Shared Memory section", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-about-shared-memory")).toBeInTheDocument();
        });

        it("renders type field", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-type")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows default operation as store", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("store");
        });

        it("shows Store Configuration section by default", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-store-configuration")).toBeInTheDocument();
        });

        it("shows semantic search enabled by default", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} />);
            const checkbox = screen.getByTestId("checkbox");
            expect(checkbox).toBeChecked();
        });
    });

    describe("Operation Selection", () => {
        it("provides store and search options", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");

            expect(select).toContainHTML("Store");
            expect(select).toContainHTML("Search");
        });

        it("shows Search Configuration section when search is selected", async () => {
            const user = userEvent.setup();
            render(<SharedMemoryNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "search");

            expect(screen.getByTestId("form-section-search-configuration")).toBeInTheDocument();
        });

        it("hides Store Configuration section when search is selected", async () => {
            const user = userEvent.setup();
            render(<SharedMemoryNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "search");

            expect(
                screen.queryByTestId("form-section-store-configuration")
            ).not.toBeInTheDocument();
        });
    });

    describe("Store Mode", () => {
        it("shows Key field", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} data={{ operation: "store" }} />);
            expect(screen.getByTestId("form-field-key")).toBeInTheDocument();
        });

        it("shows Value field", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} data={{ operation: "store" }} />);
            expect(screen.getByTestId("form-field-value")).toBeInTheDocument();
        });

        it("shows Searchable field", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} data={{ operation: "store" }} />);
            expect(screen.getByTestId("form-field-searchable")).toBeInTheDocument();
        });

        it("shows Access section", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} data={{ operation: "store" }} />);
            expect(screen.getByTestId("form-section-access")).toBeInTheDocument();
        });

        it("loads existing key from data", () => {
            render(
                <SharedMemoryNodeConfig
                    {...defaultProps}
                    data={{ operation: "store", key: "myKey" }}
                />
            );
            const inputs = screen.getAllByTestId("input");
            expect(inputs[0]).toHaveValue("myKey");
        });

        it("loads existing value from data", () => {
            render(
                <SharedMemoryNodeConfig
                    {...defaultProps}
                    data={{ operation: "store", value: "{{llm_node.response}}" }}
                />
            );
            const textarea = screen.getByTestId("textarea");
            expect(textarea).toHaveValue("{{llm_node.response}}");
        });
    });

    describe("Search Mode", () => {
        it("shows Search Query field", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} data={{ operation: "search" }} />);
            expect(screen.getByTestId("form-field-search-query")).toBeInTheDocument();
        });

        it("shows Max Results field", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} data={{ operation: "search" }} />);
            expect(screen.getByTestId("form-field-max-results")).toBeInTheDocument();
        });

        it("shows Similarity Threshold field", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} data={{ operation: "search" }} />);
            expect(screen.getByTestId("form-field-similarity-threshold")).toBeInTheDocument();
        });

        it("shows default topK of 5", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} data={{ operation: "search" }} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[0]).toHaveValue(5);
        });

        it("shows default similarity threshold of 0.7", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} data={{ operation: "search" }} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[1]).toHaveValue(0.7);
        });

        it("loads existing search query from data", () => {
            render(
                <SharedMemoryNodeConfig
                    {...defaultProps}
                    data={{ operation: "search", searchQuery: "find users" }}
                />
            );
            const textarea = screen.getByTestId("textarea");
            expect(textarea).toHaveValue("find users");
        });
    });

    describe("Preset Data", () => {
        it("loads existing operation from data", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} data={{ operation: "search" }} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("search");
        });

        it("loads enableSemanticSearch false from data", () => {
            render(
                <SharedMemoryNodeConfig
                    {...defaultProps}
                    data={{ operation: "store", enableSemanticSearch: false }}
                />
            );
            const checkbox = screen.getByTestId("checkbox");
            expect(checkbox).not.toBeChecked();
        });

        it("loads existing topK from data", () => {
            render(
                <SharedMemoryNodeConfig
                    {...defaultProps}
                    data={{ operation: "search", topK: 10 }}
                />
            );
            const inputs = screen.getAllByTestId("input");
            expect(inputs[0]).toHaveValue(10);
        });

        it("loads existing similarityThreshold from data", () => {
            render(
                <SharedMemoryNodeConfig
                    {...defaultProps}
                    data={{ operation: "search", similarityThreshold: 0.9 }}
                />
            );
            const inputs = screen.getAllByTestId("input");
            expect(inputs[1]).toHaveValue(0.9);
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when operation changes", async () => {
            const user = userEvent.setup();
            render(<SharedMemoryNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "search");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.operation).toBe("search");
        });

        it("calls onUpdate when key changes in store mode", async () => {
            const user = userEvent.setup();
            render(<SharedMemoryNodeConfig {...defaultProps} />);

            const inputs = screen.getAllByTestId("input");
            await user.type(inputs[0], "newKey");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.key).toBe("newKey");
        });

        it("calls onUpdate when semantic search is toggled", async () => {
            const user = userEvent.setup();
            render(<SharedMemoryNodeConfig {...defaultProps} />);

            const checkbox = screen.getByTestId("checkbox");
            await user.click(checkbox);

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.enableSemanticSearch).toBe(false);
        });

        it("does not call onUpdate on initial render", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays Type label", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} />);
            expect(screen.getByText("Type")).toBeInTheDocument();
        });

        it("displays Key label in store mode", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} data={{ operation: "store" }} />);
            expect(screen.getByText("Key")).toBeInTheDocument();
        });

        it("displays Value label in store mode", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} data={{ operation: "store" }} />);
            expect(screen.getByText("Value")).toBeInTheDocument();
        });

        it("displays Searchable label in store mode", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} data={{ operation: "store" }} />);
            expect(screen.getByText("Searchable")).toBeInTheDocument();
        });

        it("displays Search Query label in search mode", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} data={{ operation: "search" }} />);
            expect(screen.getByText("Search Query")).toBeInTheDocument();
        });

        it("displays Max Results label in search mode", () => {
            render(<SharedMemoryNodeConfig {...defaultProps} data={{ operation: "search" }} />);
            expect(screen.getByText("Max Results")).toBeInTheDocument();
        });
    });
});
