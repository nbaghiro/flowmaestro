/**
 * HTTPNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HTTPNodeConfig } from "../../configs/HTTPNodeConfig";

// Mock common form components
vi.mock("../../../../components/common/FormField", () => ({
    FormField: ({
        label,
        description,
        error,
        children
    }: {
        label: string;
        description?: string;
        error?: string;
        children: React.ReactNode;
    }) => (
        <div data-testid={`form-field-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            <label>{label}</label>
            {description && <span className="description">{description}</span>}
            {error && <span className="error">{error}</span>}
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
        min,
        max
    }: {
        value: string | number;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder?: string;
        type?: string;
        min?: number;
        max?: number;
        className?: string;
    }) => (
        <input
            data-testid={`input-${type || "text"}`}
            type={type || "text"}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            min={min}
            max={max}
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

vi.mock("../../../../components/common/Button", () => ({
    Button: ({
        children,
        onClick,
        variant
    }: {
        children: React.ReactNode;
        onClick?: () => void;
        variant?: string;
        className?: string;
    }) => (
        <button data-testid={`button-${variant || "default"}`} onClick={onClick}>
            {children}
        </button>
    )
}));

vi.mock("../../../../components/common/VariableInput", () => ({
    VariableInput: ({
        value,
        onChange,
        placeholder,
        multiline
    }: {
        nodeId: string;
        value: string;
        onChange: (value: string) => void;
        placeholder?: string;
        multiline?: boolean;
        rows?: number;
    }) =>
        multiline ? (
            <textarea
                data-testid="variable-input-multiline"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
        ) : (
            <input
                data-testid="variable-input"
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
        <input
            data-testid="output-variable"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    )
}));

describe("HTTPNodeConfig", () => {
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
        it("renders Request section", () => {
            render(<HTTPNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-request")).toBeInTheDocument();
        });

        it("renders Headers section", () => {
            render(<HTTPNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-headers")).toBeInTheDocument();
        });

        it("renders Authentication section", () => {
            render(<HTTPNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-authentication")).toBeInTheDocument();
        });

        it("renders Settings section", () => {
            render(<HTTPNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-settings")).toBeInTheDocument();
        });

        it("renders Output Settings section", () => {
            render(<HTTPNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output-settings")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows default method as GET", () => {
            render(<HTTPNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("GET");
        });

        it("shows default timeout as 30", () => {
            render(<HTTPNodeConfig {...defaultProps} />);
            const numberInputs = screen.getAllByTestId("input-number");
            expect(numberInputs[0]).toHaveValue(30);
        });

        it("shows default retry count as 3", () => {
            render(<HTTPNodeConfig {...defaultProps} />);
            const numberInputs = screen.getAllByTestId("input-number");
            expect(numberInputs[1]).toHaveValue(3);
        });

        it("shows default auth type as none", () => {
            render(<HTTPNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[1]).toHaveValue("none");
        });
    });

    describe("Preset Data", () => {
        it("loads existing method from data", () => {
            render(<HTTPNodeConfig {...defaultProps} data={{ method: "POST" }} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("POST");
        });

        it("loads existing URL from data", () => {
            render(<HTTPNodeConfig {...defaultProps} data={{ url: "https://api.test.com" }} />);
            const urlInput = screen.getByTestId("variable-input");
            expect(urlInput).toHaveValue("https://api.test.com");
        });

        it("loads existing timeout from data", () => {
            render(<HTTPNodeConfig {...defaultProps} data={{ timeout: 60 }} />);
            const numberInputs = screen.getAllByTestId("input-number");
            expect(numberInputs[0]).toHaveValue(60);
        });
    });

    describe("HTTP Methods", () => {
        it("provides all HTTP method options", () => {
            render(<HTTPNodeConfig {...defaultProps} />);
            const methodSelect = screen.getAllByTestId("select")[0];

            expect(methodSelect).toContainHTML("GET");
            expect(methodSelect).toContainHTML("POST");
            expect(methodSelect).toContainHTML("PUT");
            expect(methodSelect).toContainHTML("PATCH");
            expect(methodSelect).toContainHTML("DELETE");
        });

        it("shows body section for POST method", () => {
            render(<HTTPNodeConfig {...defaultProps} data={{ method: "POST" }} />);

            expect(screen.getByTestId("form-section-request-body")).toBeInTheDocument();
        });

        it("shows body section for PUT method", () => {
            render(<HTTPNodeConfig {...defaultProps} data={{ method: "PUT" }} />);
            expect(screen.getByTestId("form-section-request-body")).toBeInTheDocument();
        });

        it("shows body section for PATCH method", () => {
            render(<HTTPNodeConfig {...defaultProps} data={{ method: "PATCH" }} />);
            expect(screen.getByTestId("form-section-request-body")).toBeInTheDocument();
        });

        it("does not show body section for GET method", () => {
            render(<HTTPNodeConfig {...defaultProps} data={{ method: "GET" }} />);
            expect(screen.queryByTestId("form-section-request-body")).not.toBeInTheDocument();
        });

        it("does not show body section for DELETE method", () => {
            render(<HTTPNodeConfig {...defaultProps} data={{ method: "DELETE" }} />);
            expect(screen.queryByTestId("form-section-request-body")).not.toBeInTheDocument();
        });
    });

    describe("Authentication Types", () => {
        it("provides all auth type options", () => {
            render(<HTTPNodeConfig {...defaultProps} />);
            const authSelect = screen.getAllByTestId("select")[1];

            expect(authSelect).toContainHTML("None");
            expect(authSelect).toContainHTML("Basic Auth");
            expect(authSelect).toContainHTML("Bearer Token");
            expect(authSelect).toContainHTML("API Key");
        });

        it("hides credentials field when auth type is none", () => {
            render(<HTTPNodeConfig {...defaultProps} data={{ authType: "none" }} />);
            expect(screen.queryByTestId("form-field-credentials")).not.toBeInTheDocument();
        });

        it("shows credentials field when auth type is basic", () => {
            render(<HTTPNodeConfig {...defaultProps} data={{ authType: "basic" }} />);
            expect(screen.getByTestId("form-field-credentials")).toBeInTheDocument();
        });

        it("shows credentials field when auth type is bearer", () => {
            render(<HTTPNodeConfig {...defaultProps} data={{ authType: "bearer" }} />);
            expect(screen.getByTestId("form-field-credentials")).toBeInTheDocument();
        });
    });

    describe("Headers Management", () => {
        it("renders Add Header button", () => {
            render(<HTTPNodeConfig {...defaultProps} />);
            expect(screen.getByText("Add Header")).toBeInTheDocument();
        });

        it("adds new header row when Add Header is clicked", async () => {
            const user = userEvent.setup();
            render(<HTTPNodeConfig {...defaultProps} />);

            // Count initial text inputs (header name and value)
            const initialTextInputs = screen.getAllByTestId("input-text");

            await user.click(screen.getByText("Add Header"));

            const afterTextInputs = screen.getAllByTestId("input-text");
            expect(afterTextInputs.length).toBeGreaterThan(initialTextInputs.length);
        });
    });

    describe("Query Parameters", () => {
        it("shows Query Parameters section for GET method", () => {
            render(<HTTPNodeConfig {...defaultProps} data={{ method: "GET" }} />);
            expect(screen.getByTestId("form-section-query-parameters")).toBeInTheDocument();
        });

        it("renders Add Query Parameter button", () => {
            render(<HTTPNodeConfig {...defaultProps} data={{ method: "GET" }} />);
            expect(screen.getByText("Add Query Parameter")).toBeInTheDocument();
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when method changes", async () => {
            const user = userEvent.setup();
            render(<HTTPNodeConfig {...defaultProps} />);

            const methodSelect = screen.getAllByTestId("select")[0];
            await user.selectOptions(methodSelect, "POST");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.method).toBe("POST");
        });

        it("calls onUpdate when URL changes", async () => {
            const user = userEvent.setup();
            render(<HTTPNodeConfig {...defaultProps} />);

            const urlInput = screen.getByTestId("variable-input");
            await user.type(urlInput, "https://api.test.com");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.url).toContain("https://api.test.com");
        });

        it("does not call onUpdate on initial render", () => {
            render(<HTTPNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Validation Errors", () => {
        it("displays URL error when provided", () => {
            render(
                <HTTPNodeConfig
                    {...defaultProps}
                    errors={[{ field: "url", message: "URL is required", severity: "error" }]}
                />
            );

            expect(screen.getByText("URL is required")).toBeInTheDocument();
        });
    });

    describe("Body Types", () => {
        it("provides all body type options for POST method", () => {
            render(<HTTPNodeConfig {...defaultProps} data={{ method: "POST" }} />);
            const selects = screen.getAllByTestId("select");
            const bodyTypeSelect = selects[selects.length - 1]; // Last select is body type

            expect(bodyTypeSelect).toContainHTML("JSON");
            expect(bodyTypeSelect).toContainHTML("Form Data");
            expect(bodyTypeSelect).toContainHTML("Raw");
        });
    });
});
