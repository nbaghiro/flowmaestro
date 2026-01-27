/**
 * EmbeddingsNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmbeddingsNodeConfig } from "../../configs/EmbeddingsNodeConfig";

// Mock @flowmaestro/shared
vi.mock("@flowmaestro/shared", () => ({
    LLM_PROVIDERS: [
        { value: "openai", label: "OpenAI" },
        { value: "anthropic", label: "Anthropic" },
        { value: "cohere", label: "Cohere" }
    ],
    LLM_MODELS_BY_PROVIDER: {
        openai: [
            { value: "text-embedding-3-small", label: "Text Embedding 3 Small" },
            { value: "text-embedding-3-large", label: "Text Embedding 3 Large" },
            { value: "text-embedding-ada-002", label: "Text Embedding Ada" }
        ],
        cohere: [
            { value: "embed-english-v3.0", label: "Embed English v3" },
            { value: "embed-multilingual-v3.0", label: "Embed Multilingual v3" }
        ]
    },
    getDefaultModelForProvider: (provider: string) => {
        const defaults: Record<string, string> = {
            openai: "text-embedding-3-small",
            cohere: "embed-english-v3.0"
        };
        return defaults[provider] || "default-model";
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
        disabled,
        checked
    }: {
        value?: string | number;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        type?: string;
        disabled?: boolean;
        checked?: boolean;
    }) => (
        <input
            data-testid={`input-${type || "text"}`}
            type={type || "text"}
            value={value}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
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
        <input
            data-testid="output-variable"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    )
}));

describe("EmbeddingsNodeConfig", () => {
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
            render(<EmbeddingsNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-model-configuration")).toBeInTheDocument();
        });

        it("renders Input section", () => {
            render(<EmbeddingsNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-input")).toBeInTheDocument();
        });

        it("renders Output Settings section", () => {
            render(<EmbeddingsNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output-settings")).toBeInTheDocument();
        });

        it("renders Provider field", () => {
            render(<EmbeddingsNodeConfig {...defaultProps} />);
            expect(screen.getByText("Provider")).toBeInTheDocument();
        });

        it("renders Model field", () => {
            render(<EmbeddingsNodeConfig {...defaultProps} />);
            expect(screen.getByText("Model")).toBeInTheDocument();
        });

        it("renders Embedding Dimensions field", () => {
            render(<EmbeddingsNodeConfig {...defaultProps} />);
            expect(screen.getByText("Embedding Dimensions")).toBeInTheDocument();
        });

        it("renders Batch Mode field", () => {
            render(<EmbeddingsNodeConfig {...defaultProps} />);
            expect(screen.getByText("Batch Mode")).toBeInTheDocument();
        });
    });

    describe("Providers", () => {
        it("shows OpenAI option", () => {
            render(<EmbeddingsNodeConfig {...defaultProps} />);
            expect(screen.getByText("OpenAI")).toBeInTheDocument();
        });

        it("shows Cohere option", () => {
            render(<EmbeddingsNodeConfig {...defaultProps} />);
            expect(screen.getByText("Cohere")).toBeInTheDocument();
        });

        it("has default provider set to openai", () => {
            render(<EmbeddingsNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("openai");
        });
    });

    describe("Models", () => {
        it("shows embedding models for OpenAI", () => {
            render(<EmbeddingsNodeConfig {...defaultProps} />);
            expect(screen.getByText("Text Embedding 3 Small")).toBeInTheDocument();
        });

        it("has default model for openai", () => {
            render(<EmbeddingsNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[1]).toHaveValue("text-embedding-3-small");
        });
    });

    describe("Batch Mode", () => {
        it("has checkbox for batch mode", () => {
            render(<EmbeddingsNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("input-checkbox")).toBeInTheDocument();
        });

        it("batch mode is disabled by default", () => {
            render(<EmbeddingsNodeConfig {...defaultProps} />);
            const checkbox = screen.getByTestId("input-checkbox");
            expect(checkbox).not.toBeChecked();
        });

        it("shows single text input label when batch mode off", () => {
            render(<EmbeddingsNodeConfig {...defaultProps} />);
            expect(screen.getByText("Text Input")).toBeInTheDocument();
        });

        it("shows batch text input label when batch mode on", () => {
            render(<EmbeddingsNodeConfig {...defaultProps} data={{ batchMode: true }} />);
            expect(screen.getByText("Text Inputs (one per line)")).toBeInTheDocument();
        });
    });

    describe("Preset Data", () => {
        it("loads existing provider from data", () => {
            render(<EmbeddingsNodeConfig {...defaultProps} data={{ provider: "cohere" }} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("cohere");
        });

        it("loads existing model from data", () => {
            render(
                <EmbeddingsNodeConfig
                    {...defaultProps}
                    data={{ provider: "openai", model: "text-embedding-3-large" }}
                />
            );
            const selects = screen.getAllByTestId("select");
            expect(selects[1]).toHaveValue("text-embedding-3-large");
        });

        it("loads existing input from data", () => {
            render(<EmbeddingsNodeConfig {...defaultProps} data={{ input: "Hello world" }} />);
            const textarea = screen.getByTestId("textarea");
            expect(textarea).toHaveValue("Hello world");
        });

        it("loads existing batch mode from data", () => {
            render(<EmbeddingsNodeConfig {...defaultProps} data={{ batchMode: true }} />);
            const checkbox = screen.getByTestId("input-checkbox");
            expect(checkbox).toBeChecked();
        });
    });

    describe("State Updates", () => {
        it("does not call onUpdate on initial render", () => {
            render(<EmbeddingsNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });

        it("calls onUpdate when provider changes", async () => {
            const user = userEvent.setup();
            render(<EmbeddingsNodeConfig {...defaultProps} />);

            const selects = screen.getAllByTestId("select");
            await user.selectOptions(selects[0], "cohere");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.provider).toBe("cohere");
        });

        it("updates model when provider changes", async () => {
            const user = userEvent.setup();
            render(<EmbeddingsNodeConfig {...defaultProps} />);

            const selects = screen.getAllByTestId("select");
            await user.selectOptions(selects[0], "cohere");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.model).toBe("embed-english-v3.0");
        });

        it("calls onUpdate when input changes", async () => {
            const user = userEvent.setup();
            render(<EmbeddingsNodeConfig {...defaultProps} />);

            const textarea = screen.getByTestId("textarea");
            await user.type(textarea, "test text");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.input).toContain("test text");
        });

        it("calls onUpdate when batch mode toggles", async () => {
            const user = userEvent.setup();
            render(<EmbeddingsNodeConfig {...defaultProps} />);

            const checkbox = screen.getByTestId("input-checkbox");
            await user.click(checkbox);

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.batchMode).toBe(true);
        });
    });

    describe("Dimensions Display", () => {
        it("shows dimensions field as disabled", () => {
            render(<EmbeddingsNodeConfig {...defaultProps} />);
            const textInputs = screen.getAllByTestId("input-text");
            // Find the disabled one (dimensions field)
            const dimensionsInput = textInputs.find((input) => input.hasAttribute("disabled"));
            expect(dimensionsInput).toBeDefined();
        });
    });
});
