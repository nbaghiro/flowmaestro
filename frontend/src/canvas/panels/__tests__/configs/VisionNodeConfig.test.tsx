/**
 * VisionNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { VisionNodeConfig } from "../../configs/VisionNodeConfig";

// Mock @flowmaestro/shared
vi.mock("@flowmaestro/shared", () => ({
    LLM_PROVIDERS: [
        { value: "openai", label: "OpenAI" },
        { value: "anthropic", label: "Anthropic" }
    ],
    getDefaultModelForProvider: (provider: string) => {
        const defaults: Record<string, string> = {
            openai: "gpt-4-vision-preview",
            anthropic: "claude-3-opus"
        };
        return defaults[provider] || "default-model";
    },
    getTemperatureMaxForProvider: (provider: string) => {
        const maxTemps: Record<string, number> = {
            openai: 2.0,
            anthropic: 1.0
        };
        return maxTemps[provider] || 2.0;
    }
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
        placeholder,
        min,
        max
    }: {
        value: string | number;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        type?: string;
        placeholder?: string;
        min?: number;
        max?: number;
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

vi.mock("../../../../components/common/LLMModelSelect", () => ({
    LLMModelSelect: ({
        value,
        onChange
    }: {
        provider: string;
        value: string;
        onChange: (value: string) => void;
    }) => (
        <select data-testid="model-select" value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="gpt-4-vision-preview">GPT-4 Vision</option>
            <option value="claude-3-opus">Claude 3 Opus</option>
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
        <input
            data-testid="output-variable"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    )
}));

describe("VisionNodeConfig", () => {
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
            render(<VisionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-operation")).toBeInTheDocument();
        });

        it("renders Model Configuration section", () => {
            render(<VisionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-model-configuration")).toBeInTheDocument();
        });

        it("renders Parameters section", () => {
            render(<VisionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-parameters")).toBeInTheDocument();
        });

        it("renders Output Settings section", () => {
            render(<VisionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output-settings")).toBeInTheDocument();
        });

        it("renders Provider field", () => {
            render(<VisionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Provider")).toBeInTheDocument();
        });

        it("renders Model field", () => {
            render(<VisionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Model")).toBeInTheDocument();
        });
    });

    describe("Operations", () => {
        it("shows Analyze Image option", () => {
            render(<VisionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Analyze Image")).toBeInTheDocument();
        });

        it("shows Generate Image option", () => {
            render(<VisionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Generate Image")).toBeInTheDocument();
        });

        it("has default operation set to analyze", () => {
            render(<VisionNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("analyze");
        });
    });

    describe("Analyze Mode", () => {
        it("shows Input section for analyze operation", () => {
            render(<VisionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-input")).toBeInTheDocument();
        });

        it("shows Image Source field", () => {
            render(<VisionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Image Source")).toBeInTheDocument();
        });

        it("shows Analysis Prompt field", () => {
            render(<VisionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Analysis Prompt")).toBeInTheDocument();
        });
    });

    describe("Generate Mode", () => {
        it("shows Generation section when generate operation selected", async () => {
            const user = userEvent.setup();
            render(<VisionNodeConfig {...defaultProps} />);

            const selects = screen.getAllByTestId("select");
            await user.selectOptions(selects[0], "generate");

            expect(screen.getByTestId("form-section-generation")).toBeInTheDocument();
        });

        it("shows Image Description field in generate mode", async () => {
            const user = userEvent.setup();
            render(<VisionNodeConfig {...defaultProps} />);

            const selects = screen.getAllByTestId("select");
            await user.selectOptions(selects[0], "generate");

            expect(screen.getByText("Image Description")).toBeInTheDocument();
        });

        it("hides Input section in generate mode", async () => {
            const user = userEvent.setup();
            render(<VisionNodeConfig {...defaultProps} />);

            const selects = screen.getAllByTestId("select");
            await user.selectOptions(selects[0], "generate");

            expect(screen.queryByTestId("form-section-input")).not.toBeInTheDocument();
        });
    });

    describe("Parameters", () => {
        it("shows Temperature field", () => {
            render(<VisionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Temperature")).toBeInTheDocument();
        });

        it("shows Max Tokens field", () => {
            render(<VisionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Max Tokens")).toBeInTheDocument();
        });

        it("has default temperature of 0.7", () => {
            render(<VisionNodeConfig {...defaultProps} />);
            const slider = screen.getByTestId("slider");
            expect(slider).toHaveValue("0.7");
        });

        it("has default max tokens of 1000", () => {
            render(<VisionNodeConfig {...defaultProps} />);
            const input = screen.getByTestId("input-number");
            expect(input).toHaveValue(1000);
        });
    });

    describe("Preset Data", () => {
        it("loads existing operation from data", () => {
            render(<VisionNodeConfig {...defaultProps} data={{ operation: "generate" }} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("generate");
        });

        it("loads existing provider from data", () => {
            render(<VisionNodeConfig {...defaultProps} data={{ provider: "anthropic" }} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[1]).toHaveValue("anthropic");
        });

        it("loads existing prompt from data", () => {
            render(<VisionNodeConfig {...defaultProps} data={{ prompt: "Describe this image" }} />);
            const textareas = screen.getAllByTestId("textarea");
            expect(textareas[0]).toHaveValue("Describe this image");
        });

        it("loads existing temperature from data", () => {
            render(<VisionNodeConfig {...defaultProps} data={{ temperature: 0.5 }} />);
            const slider = screen.getByTestId("slider");
            expect(slider).toHaveValue("0.5");
        });

        it("loads existing max tokens from data", () => {
            render(<VisionNodeConfig {...defaultProps} data={{ maxTokens: 2000 }} />);
            const input = screen.getByTestId("input-number");
            expect(input).toHaveValue(2000);
        });
    });

    describe("State Updates", () => {
        it("does not call onUpdate on initial render", () => {
            render(<VisionNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });

        it("calls onUpdate when operation changes", async () => {
            const user = userEvent.setup();
            render(<VisionNodeConfig {...defaultProps} />);

            const selects = screen.getAllByTestId("select");
            await user.selectOptions(selects[0], "generate");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.operation).toBe("generate");
        });

        it("calls onUpdate when prompt changes", async () => {
            const user = userEvent.setup();
            render(<VisionNodeConfig {...defaultProps} />);

            const textareas = screen.getAllByTestId("textarea");
            await user.type(textareas[0], "Analyze this");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.prompt).toContain("Analyze this");
        });
    });

    describe("Model Select", () => {
        it("renders model select", () => {
            render(<VisionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("model-select")).toBeInTheDocument();
        });
    });
});
