/**
 * ImageGenerationNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImageGenerationNodeConfig } from "../../configs/ImageGenerationNodeConfig";

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
        min,
        max
    }: {
        value?: string | number;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder?: string;
        type?: string;
        min?: number;
        max?: number;
    }) => (
        <input
            data-testid="input"
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

vi.mock("../../../../components/connections/dialogs/ProviderConnectionDialog", () => ({
    ProviderConnectionDialog: ({
        isOpen,
        onSelect,
        onClose
    }: {
        isOpen: boolean;
        onSelect: (provider: string, connectionId: string) => void;
        onClose: () => void;
    }) =>
        isOpen ? (
            <div data-testid="provider-connection-dialog">
                <button onClick={() => onSelect("openai", "conn-1")}>Select OpenAI</button>
                <button onClick={onClose}>Close</button>
            </div>
        ) : null
}));

vi.mock("../../../../stores/connectionStore", () => ({
    useConnectionStore: () => ({
        connections: [
            {
                id: "conn-1",
                provider: "openai",
                name: "My OpenAI",
                status: "active"
            }
        ],
        fetchConnections: vi.fn()
    })
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
    Plus: () => <span data-testid="plus-icon">Plus</span>
}));

// Mock shared module
vi.mock("@flowmaestro/shared", () => ({
    IMAGE_GENERATION_PROVIDERS: [{ value: "openai", label: "OpenAI" }],
    getImageGenerationModelsForProvider: (provider: string) => {
        if (provider === "openai") {
            return [
                { value: "dall-e-3", label: "DALL-E 3" },
                { value: "dall-e-2", label: "DALL-E 2" }
            ];
        }
        return [];
    },
    getDefaultImageGenerationModel: (provider: string) => {
        if (provider === "openai") return "dall-e-3";
        return "";
    },
    findImageGenerationModelByValue: (model: string) => {
        if (model === "dall-e-3") return { supportsNegativePrompt: false };
        return null;
    },
    getImageSizeOptionsForProvider: (provider: string) => {
        if (provider === "openai") {
            return [
                { value: "1024x1024", label: "1024x1024" },
                { value: "1792x1024", label: "1792x1024" }
            ];
        }
        return [];
    },
    IMAGE_QUALITY_OPTIONS: [
        { value: "standard", label: "Standard" },
        { value: "hd", label: "HD" }
    ],
    IMAGE_STYLE_OPTIONS: [
        { value: "vivid", label: "Vivid" },
        { value: "natural", label: "Natural" }
    ],
    IMAGE_ASPECT_RATIO_OPTIONS: [
        { value: "1:1", label: "1:1" },
        { value: "16:9", label: "16:9" }
    ],
    IMAGE_OUTPUT_FORMAT_OPTIONS: [
        { value: "url", label: "URL" },
        { value: "base64", label: "Base64" }
    ],
    ALL_PROVIDERS: [
        {
            provider: "openai",
            displayName: "OpenAI",
            logoUrl: "https://example.com/openai.png"
        }
    ],
    getOperationsForProvider: () => [{ value: "generate", label: "Generate" }],
    UPSCALE_FACTOR_OPTIONS: [
        { value: 2, label: "2x" },
        { value: 4, label: "4x" }
    ]
}));

describe("ImageGenerationNodeConfig", () => {
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
        it("renders Provider & Model section", () => {
            render(<ImageGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-provider-&-model")).toBeInTheDocument();
        });

        it("renders Image Generation section", () => {
            render(<ImageGenerationNodeConfig {...defaultProps} />);
            expect(
                screen.getByTestId("form-section-image-generation") ||
                    screen.getByTestId("form-section-edit-settings")
            ).toBeInTheDocument();
        });

        it("renders Output Settings section", () => {
            render(<ImageGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output-settings")).toBeInTheDocument();
        });

        it("renders Image Provider Connection field", () => {
            render(<ImageGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-image-provider-connection")).toBeInTheDocument();
        });

        it("renders Prompt field", () => {
            render(<ImageGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-prompt")).toBeInTheDocument();
        });

        it("renders Output Format field", () => {
            render(<ImageGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-output-format")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows empty prompt by default", () => {
            render(<ImageGenerationNodeConfig {...defaultProps} />);
            const textarea = screen.getByTestId("textarea");
            expect(textarea).toHaveValue("");
        });

        it("shows url as default output format", () => {
            render(<ImageGenerationNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("url");
        });
    });

    describe("Provider Selection", () => {
        it("shows Select or Add Connection button when no provider", () => {
            render(<ImageGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByText("Select or Add Connection")).toBeInTheDocument();
        });

        it("opens provider dialog when clicking Select or Add Connection", async () => {
            const user = userEvent.setup();
            render(<ImageGenerationNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select or Add Connection"));

            expect(screen.getByTestId("provider-connection-dialog")).toBeInTheDocument();
        });

        it("shows provider info when provider is selected", () => {
            render(
                <ImageGenerationNodeConfig
                    {...defaultProps}
                    data={{ provider: "openai", connectionId: "conn-1" }}
                />
            );

            expect(screen.getByText("OpenAI")).toBeInTheDocument();
            expect(screen.getByText("My OpenAI")).toBeInTheDocument();
        });
    });

    describe("Model Selection", () => {
        it("shows model selector when provider is selected", () => {
            render(
                <ImageGenerationNodeConfig
                    {...defaultProps}
                    data={{ provider: "openai", connectionId: "conn-1", model: "dall-e-3" }}
                />
            );

            expect(screen.getByTestId("form-field-model")).toBeInTheDocument();
        });
    });

    describe("Preset Data", () => {
        it("loads existing provider from data", () => {
            render(
                <ImageGenerationNodeConfig
                    {...defaultProps}
                    data={{ provider: "openai", connectionId: "conn-1" }}
                />
            );

            expect(screen.getByText("OpenAI")).toBeInTheDocument();
        });

        it("loads existing prompt from data", () => {
            render(
                <ImageGenerationNodeConfig
                    {...defaultProps}
                    data={{ prompt: "A beautiful sunset" }}
                />
            );

            const textarea = screen.getByTestId("textarea");
            expect(textarea).toHaveValue("A beautiful sunset");
        });

        it("loads existing outputFormat from data", () => {
            render(
                <ImageGenerationNodeConfig {...defaultProps} data={{ outputFormat: "base64" }} />
            );

            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("base64");
        });

        it("loads existing outputVariable from data", () => {
            render(
                <ImageGenerationNodeConfig
                    {...defaultProps}
                    data={{ outputVariable: "generatedImage" }}
                />
            );

            const outputInput = screen.getByTestId("output-variable-input");
            expect(outputInput).toHaveValue("generatedImage");
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when prompt changes", async () => {
            const user = userEvent.setup();
            render(<ImageGenerationNodeConfig {...defaultProps} />);

            const textarea = screen.getByTestId("textarea");
            await user.type(textarea, "A cat");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.prompt).toContain("A cat");
        });

        it("calls onUpdate when output format changes", async () => {
            const user = userEvent.setup();
            render(<ImageGenerationNodeConfig {...defaultProps} />);

            const selects = screen.getAllByTestId("select");
            await user.selectOptions(selects[0], "base64");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.outputFormat).toBe("base64");
        });

        it("does not call onUpdate on initial render", () => {
            render(<ImageGenerationNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays Image Provider Connection label", () => {
            render(<ImageGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByText("Image Provider Connection")).toBeInTheDocument();
        });

        it("displays Prompt label", () => {
            render(<ImageGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByText("Prompt")).toBeInTheDocument();
        });

        it("displays Output Format label", () => {
            render(<ImageGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByText("Output Format")).toBeInTheDocument();
        });
    });

    describe("DALL-E 3 Specific Options", () => {
        it("shows Quality field when dall-e-3 is selected", () => {
            render(
                <ImageGenerationNodeConfig
                    {...defaultProps}
                    data={{ provider: "openai", connectionId: "conn-1", model: "dall-e-3" }}
                />
            );

            expect(screen.getByTestId("form-field-quality")).toBeInTheDocument();
        });

        it("shows Style field when dall-e-3 is selected", () => {
            render(
                <ImageGenerationNodeConfig
                    {...defaultProps}
                    data={{ provider: "openai", connectionId: "conn-1", model: "dall-e-3" }}
                />
            );

            expect(screen.getByTestId("form-field-style")).toBeInTheDocument();
        });
    });

    describe("Image Settings Section", () => {
        it("shows Image Settings section when provider is selected", () => {
            render(
                <ImageGenerationNodeConfig
                    {...defaultProps}
                    data={{ provider: "openai", connectionId: "conn-1", model: "dall-e-3" }}
                />
            );

            expect(screen.getByTestId("form-section-image-settings")).toBeInTheDocument();
        });
    });
});
