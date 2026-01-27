/**
 * RouterNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RouterNodeConfig } from "../../configs/RouterNodeConfig";

// Mock @flowmaestro/shared
vi.mock("@flowmaestro/shared", () => ({
    getDefaultModelForProvider: (provider: string) => {
        const defaults: Record<string, string> = {
            openai: "gpt-4",
            anthropic: "claude-3-opus"
        };
        return defaults[provider] || "default-model";
    },
    LLM_MODELS_BY_PROVIDER: {
        openai: [
            { value: "gpt-4", label: "GPT-4" },
            { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" }
        ],
        anthropic: [
            { value: "claude-3-opus", label: "Claude 3 Opus" },
            { value: "claude-3-sonnet", label: "Claude 3 Sonnet" }
        ]
    },
    ALL_PROVIDERS: [
        { provider: "openai", displayName: "OpenAI", logoUrl: "/logos/openai.svg" },
        { provider: "anthropic", displayName: "Anthropic", logoUrl: "/logos/anthropic.svg" }
    ]
}));

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
        type,
        placeholder
    }: {
        value: string | number;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        type?: string;
        placeholder?: string;
    }) => (
        <input
            data-testid={`input-${type || "text"}`}
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

vi.mock("../../../../components/common/Slider", () => ({
    Slider: ({
        value,
        onChange,
        min,
        max,
        step
    }: {
        value: number;
        onChange: (value: number) => void;
        min: number;
        max: number;
        step: number;
    }) => (
        <input
            type="range"
            data-testid="slider"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            min={min}
            max={max}
            step={step}
        />
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

vi.mock("../../../../components/connections/dialogs/ProviderConnectionDialog", () => ({
    ProviderConnectionDialog: ({
        isOpen,
        onClose,
        onSelect
    }: {
        isOpen: boolean;
        onClose: () => void;
        onSelect: (provider: string, connectionId: string) => void;
    }) =>
        isOpen ? (
            <div data-testid="provider-dialog">
                <button onClick={onClose}>Close</button>
                <button onClick={() => onSelect("openai", "conn-1")}>Select OpenAI</button>
            </div>
        ) : null
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

vi.mock("../../../../stores/connectionStore", () => ({
    useConnectionStore: () => ({
        connections: [{ id: "conn-1", provider: "openai", name: "OpenAI Key", status: "active" }],
        fetchConnections: vi.fn()
    })
}));

describe("RouterNodeConfig", () => {
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
        it("renders Model Configuration section", () => {
            render(<RouterNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-model-configuration")).toBeInTheDocument();
        });

        it("renders Classification Prompt section", () => {
            render(<RouterNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-classification-prompt")).toBeInTheDocument();
        });

        it("renders Routes section", () => {
            render(<RouterNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-routes")).toBeInTheDocument();
        });

        it("renders Default Route section", () => {
            render(<RouterNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-default-route")).toBeInTheDocument();
        });

        it("renders Output Settings section", () => {
            render(<RouterNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output-settings")).toBeInTheDocument();
        });

        it("renders System Prompt field", () => {
            render(<RouterNodeConfig {...defaultProps} />);
            expect(screen.getByText("System Prompt")).toBeInTheDocument();
        });

        it("renders Input to Classify field", () => {
            render(<RouterNodeConfig {...defaultProps} />);
            expect(screen.getByText("Input to Classify")).toBeInTheDocument();
        });
    });

    describe("Default Routes", () => {
        it("renders default two routes", () => {
            render(<RouterNodeConfig {...defaultProps} />);
            expect(screen.getByText("Route 1")).toBeInTheDocument();
            expect(screen.getByText("Route 2")).toBeInTheDocument();
        });

        it("shows Add Route button", () => {
            render(<RouterNodeConfig {...defaultProps} />);
            expect(screen.getByText("Add Route")).toBeInTheDocument();
        });
    });

    describe("Route Management", () => {
        it("adds a new route when Add Route is clicked", async () => {
            const user = userEvent.setup();
            render(<RouterNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Add Route"));

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            // Verify a route was added by checking update call
            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.routes.length).toBe(3);
        });

        it("removes a route when delete is clicked", async () => {
            const user = userEvent.setup();
            render(
                <RouterNodeConfig
                    {...defaultProps}
                    data={{
                        routes: [
                            { value: "route_1", label: "Route 1" },
                            { value: "route_2", label: "Route 2" },
                            { value: "route_3", label: "Route 3" }
                        ]
                    }}
                />
            );

            // Find and click delete button for a route
            const deleteButtons = screen.getAllByTitle("Remove route");
            await user.click(deleteButtons[0]);

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            // Verify a route was removed by checking update call
            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.routes.length).toBe(2);
        });

        it("does not allow removing routes below minimum of 2", async () => {
            render(<RouterNodeConfig {...defaultProps} />);

            // With only 2 routes, delete buttons should not appear
            expect(screen.queryByTitle("Remove route")).not.toBeInTheDocument();
        });
    });

    describe("Provider Selection", () => {
        it("shows Select or Add Connection button when no provider set", () => {
            render(<RouterNodeConfig {...defaultProps} />);
            expect(screen.getByText("Select or Add Connection")).toBeInTheDocument();
        });

        it("opens provider dialog when Select button is clicked", async () => {
            const user = userEvent.setup();
            render(<RouterNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select or Add Connection"));

            expect(screen.getByTestId("provider-dialog")).toBeInTheDocument();
        });
    });

    describe("Preset Data", () => {
        it("loads existing routes from data", () => {
            render(
                <RouterNodeConfig
                    {...defaultProps}
                    data={{
                        routes: [
                            { value: "custom_1", label: "Custom Route 1" },
                            { value: "custom_2", label: "Custom Route 2" }
                        ]
                    }}
                />
            );
            // Routes are loaded correctly
            expect(screen.getByText("Route 1")).toBeInTheDocument();
            expect(screen.getByText("Route 2")).toBeInTheDocument();
        });

        it("loads existing system prompt from data", () => {
            render(
                <RouterNodeConfig
                    {...defaultProps}
                    data={{ systemPrompt: "You are a classifier" }}
                />
            );
            const textareas = screen.getAllByTestId("textarea");
            expect(textareas[0]).toHaveValue("You are a classifier");
        });

        it("loads existing temperature from data", () => {
            render(<RouterNodeConfig {...defaultProps} data={{ temperature: 0.5 }} />);
            const slider = screen.getByTestId("slider");
            expect(slider).toHaveValue("0.5");
        });
    });

    describe("State Updates", () => {
        it("does not call onUpdate on initial render", () => {
            render(<RouterNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });

        it("calls onUpdate when system prompt changes", async () => {
            const user = userEvent.setup();
            render(<RouterNodeConfig {...defaultProps} />);

            const textareas = screen.getAllByTestId("textarea");
            await user.type(textareas[0], "New system prompt");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.systemPrompt).toContain("New system prompt");
        });
    });

    describe("Temperature Control", () => {
        it("has temperature slider with min 0 and max 1", () => {
            render(<RouterNodeConfig {...defaultProps} />);
            const slider = screen.getByTestId("slider");
            expect(slider).toHaveAttribute("min", "0");
            expect(slider).toHaveAttribute("max", "1");
        });

        it("has default temperature of 0", () => {
            render(<RouterNodeConfig {...defaultProps} />);
            const slider = screen.getByTestId("slider");
            expect(slider).toHaveValue("0");
        });
    });
});
