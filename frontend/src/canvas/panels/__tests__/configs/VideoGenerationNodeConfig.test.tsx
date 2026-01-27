/**
 * VideoGenerationNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { VideoGenerationNodeConfig } from "../../configs/VideoGenerationNodeConfig";

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
                <button onClick={() => onSelect("luma", "conn-1")}>Select Luma</button>
                <button onClick={onClose}>Close</button>
            </div>
        ) : null
}));

vi.mock("../../../../stores/connectionStore", () => ({
    useConnectionStore: () => ({
        connections: [
            {
                id: "conn-1",
                provider: "luma",
                name: "My Luma",
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
    VIDEO_GENERATION_PROVIDERS: [{ value: "luma", label: "Luma AI" }],
    getVideoGenerationModelsForProvider: (provider: string) => {
        if (provider === "luma") {
            return [{ value: "ray-2", label: "Ray 2" }];
        }
        return [];
    },
    getDefaultVideoGenerationModel: (provider: string) => {
        if (provider === "luma") return "ray-2";
        return "";
    },
    findVideoGenerationModelByValue: (model: string) => {
        if (model === "ray-2")
            return {
                maxDuration: 10,
                maxResolution: "1080p",
                supportsImageInput: true,
                supportsAudio: false
            };
        return null;
    },
    modelSupportsImageInput: (model: string) => model === "ray-2",
    VIDEO_ASPECT_RATIO_OPTIONS: [
        { value: "16:9", label: "16:9" },
        { value: "9:16", label: "9:16" },
        { value: "1:1", label: "1:1" }
    ],
    getVideoDurationOptionsForProvider: (provider: string) => {
        if (provider === "luma") {
            return [
                { value: 5, label: "5 seconds" },
                { value: 10, label: "10 seconds" }
            ];
        }
        return [];
    },
    VIDEO_OUTPUT_FORMAT_OPTIONS: [
        { value: "url", label: "URL" },
        { value: "base64", label: "Base64" }
    ],
    ALL_PROVIDERS: [
        {
            provider: "luma",
            displayName: "Luma AI",
            logoUrl: "https://example.com/luma.png"
        }
    ]
}));

describe("VideoGenerationNodeConfig", () => {
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
            render(<VideoGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-provider-&-model")).toBeInTheDocument();
        });

        it("renders Video Generation section", () => {
            render(<VideoGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-video-generation")).toBeInTheDocument();
        });

        it("renders Output Settings section", () => {
            render(<VideoGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output-settings")).toBeInTheDocument();
        });

        it("renders Video Provider Connection field", () => {
            render(<VideoGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-video-provider-connection")).toBeInTheDocument();
        });

        it("renders Prompt field", () => {
            render(<VideoGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-prompt")).toBeInTheDocument();
        });

        it("renders Output Format field", () => {
            render(<VideoGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-output-format")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows empty prompt by default", () => {
            render(<VideoGenerationNodeConfig {...defaultProps} />);
            const textarea = screen.getByTestId("textarea");
            expect(textarea).toHaveValue("");
        });

        it("shows url as default output format", () => {
            render(<VideoGenerationNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("url");
        });
    });

    describe("Provider Selection", () => {
        it("shows Select or Add Connection button when no provider", () => {
            render(<VideoGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByText("Select or Add Connection")).toBeInTheDocument();
        });

        it("opens provider dialog when clicking Select or Add Connection", async () => {
            const user = userEvent.setup();
            render(<VideoGenerationNodeConfig {...defaultProps} />);

            await user.click(screen.getByText("Select or Add Connection"));

            expect(screen.getByTestId("provider-connection-dialog")).toBeInTheDocument();
        });

        it("shows provider info when provider is selected", () => {
            render(
                <VideoGenerationNodeConfig
                    {...defaultProps}
                    data={{ provider: "luma", connectionId: "conn-1" }}
                />
            );

            expect(screen.getByText("Luma AI")).toBeInTheDocument();
            expect(screen.getByText("My Luma")).toBeInTheDocument();
        });
    });

    describe("Model Selection", () => {
        it("shows model selector when provider is selected", () => {
            render(
                <VideoGenerationNodeConfig
                    {...defaultProps}
                    data={{ provider: "luma", connectionId: "conn-1", model: "ray-2" }}
                />
            );

            expect(screen.getByTestId("form-field-model")).toBeInTheDocument();
        });

        it("shows model info when model is selected", () => {
            render(
                <VideoGenerationNodeConfig
                    {...defaultProps}
                    data={{ provider: "luma", connectionId: "conn-1", model: "ray-2" }}
                />
            );

            expect(screen.getByText("Max Duration: 10s")).toBeInTheDocument();
            expect(screen.getByText("Max Resolution: 1080p")).toBeInTheDocument();
        });
    });

    describe("Preset Data", () => {
        it("loads existing provider from data", () => {
            render(
                <VideoGenerationNodeConfig
                    {...defaultProps}
                    data={{ provider: "luma", connectionId: "conn-1" }}
                />
            );

            expect(screen.getByText("Luma AI")).toBeInTheDocument();
        });

        it("loads existing prompt from data", () => {
            render(
                <VideoGenerationNodeConfig
                    {...defaultProps}
                    data={{ prompt: "A drone flying over mountains" }}
                />
            );

            const textarea = screen.getByTestId("textarea");
            expect(textarea).toHaveValue("A drone flying over mountains");
        });

        it("loads existing outputFormat from data", () => {
            render(
                <VideoGenerationNodeConfig {...defaultProps} data={{ outputFormat: "base64" }} />
            );

            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("base64");
        });

        it("loads existing outputVariable from data", () => {
            render(
                <VideoGenerationNodeConfig
                    {...defaultProps}
                    data={{ outputVariable: "generatedVideo" }}
                />
            );

            const outputInput = screen.getByTestId("output-variable-input");
            expect(outputInput).toHaveValue("generatedVideo");
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when prompt changes", async () => {
            const user = userEvent.setup();
            render(<VideoGenerationNodeConfig {...defaultProps} />);

            const textarea = screen.getByTestId("textarea");
            await user.type(textarea, "Flying car");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.prompt).toContain("Flying car");
        });

        it("calls onUpdate when output format changes", async () => {
            const user = userEvent.setup();
            render(<VideoGenerationNodeConfig {...defaultProps} />);

            const selects = screen.getAllByTestId("select");
            await user.selectOptions(selects[0], "base64");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.outputFormat).toBe("base64");
        });

        it("does not call onUpdate on initial render", () => {
            render(<VideoGenerationNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays Video Provider Connection label", () => {
            render(<VideoGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByText("Video Provider Connection")).toBeInTheDocument();
        });

        it("displays Prompt label", () => {
            render(<VideoGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByText("Prompt")).toBeInTheDocument();
        });

        it("displays Output Format label", () => {
            render(<VideoGenerationNodeConfig {...defaultProps} />);
            expect(screen.getByText("Output Format")).toBeInTheDocument();
        });
    });

    describe("Video Settings Section", () => {
        it("shows Video Settings section when provider is selected", () => {
            render(
                <VideoGenerationNodeConfig
                    {...defaultProps}
                    data={{ provider: "luma", connectionId: "conn-1", model: "ray-2" }}
                />
            );

            expect(screen.getByTestId("form-section-video-settings")).toBeInTheDocument();
        });

        it("shows Duration field when provider is selected", () => {
            render(
                <VideoGenerationNodeConfig
                    {...defaultProps}
                    data={{ provider: "luma", connectionId: "conn-1", model: "ray-2" }}
                />
            );

            expect(screen.getByTestId("form-field-duration")).toBeInTheDocument();
        });

        it("shows Aspect Ratio field when provider is selected", () => {
            render(
                <VideoGenerationNodeConfig
                    {...defaultProps}
                    data={{ provider: "luma", connectionId: "conn-1", model: "ray-2" }}
                />
            );

            expect(screen.getByTestId("form-field-aspect-ratio")).toBeInTheDocument();
        });
    });

    describe("Image Input", () => {
        it("shows Image Input field when model supports it", () => {
            render(
                <VideoGenerationNodeConfig
                    {...defaultProps}
                    data={{ provider: "luma", connectionId: "conn-1", model: "ray-2" }}
                />
            );

            expect(screen.getByTestId("form-field-image-input-(optional)")).toBeInTheDocument();
        });
    });
});
