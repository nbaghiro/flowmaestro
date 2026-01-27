/**
 * AudioOutputNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudioOutputNodeConfig } from "../../configs/AudioOutputNodeConfig";

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
    FormSection: ({
        title,
        children,
        defaultExpanded
    }: {
        title: string;
        children: React.ReactNode;
        defaultExpanded?: boolean;
    }) => (
        <div
            data-testid={`form-section-${title.toLowerCase().replace(/\s+/g, "-")}`}
            data-expanded={defaultExpanded}
        >
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
            data-testid="slider"
            type="range"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            min={min}
            max={max}
            step={step}
        />
    )
}));

describe("AudioOutputNodeConfig", () => {
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
        it("renders TTS Provider section", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-tts-provider")).toBeInTheDocument();
        });

        it("renders Text Input section", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-text-input")).toBeInTheDocument();
        });

        it("renders Voice Settings section", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-voice-settings")).toBeInTheDocument();
        });

        it("renders Output Settings section", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output-settings")).toBeInTheDocument();
        });

        it("renders Provider field", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-provider")).toBeInTheDocument();
        });

        it("renders Model field", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-model")).toBeInTheDocument();
        });

        it("renders Voice field for OpenAI", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-voice")).toBeInTheDocument();
        });

        it("renders Text to Synthesize field", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-text-to-synthesize")).toBeInTheDocument();
        });

        it("renders Output Format field", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-output-format")).toBeInTheDocument();
        });

        it("renders Output Variable field", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-output-variable")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows openai as default provider", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("openai");
        });

        it("shows tts-1 as default model", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[1]).toHaveValue("tts-1");
        });

        it("shows alloy as default voice", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[2]).toHaveValue("alloy");
        });

        it("shows empty text input by default", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            const textarea = screen.getByTestId("textarea");
            expect(textarea).toHaveValue("");
        });

        it("shows mp3 as default output format", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[3]).toHaveValue("mp3");
        });

        it("shows audioOutput as default output variable", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            const input = screen.getByTestId("input");
            expect(input).toHaveValue("audioOutput");
        });
    });

    describe("Provider Selection", () => {
        it("provides openai, elevenlabs, and deepgram options", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            const select = screen.getAllByTestId("select")[0];

            expect(select).toContainHTML("OpenAI TTS");
            expect(select).toContainHTML("ElevenLabs");
            expect(select).toContainHTML("Deepgram Aura");
        });

        it("changes model when provider changes to elevenlabs", async () => {
            const user = userEvent.setup();
            render(<AudioOutputNodeConfig {...defaultProps} />);

            const providerSelect = screen.getAllByTestId("select")[0];
            await user.selectOptions(providerSelect, "elevenlabs");

            await waitFor(() => {
                const modelSelect = screen.getAllByTestId("select")[1];
                expect(modelSelect).toHaveValue("eleven_multilingual_v2");
            });
        });
    });

    describe("Voice Options", () => {
        it("shows OpenAI voices", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            const voiceSelect = screen.getAllByTestId("select")[2];

            expect(voiceSelect).toContainHTML("Alloy");
            expect(voiceSelect).toContainHTML("Echo");
            expect(voiceSelect).toContainHTML("Nova");
        });
    });

    describe("Output Format", () => {
        it("provides mp3, wav, and opus options", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            const formatSelect = screen.getAllByTestId("select")[3];

            expect(formatSelect).toContainHTML("MP3");
            expect(formatSelect).toContainHTML("WAV");
            expect(formatSelect).toContainHTML("Opus");
        });
    });

    describe("Preset Data", () => {
        it("loads existing provider from data", () => {
            render(<AudioOutputNodeConfig {...defaultProps} data={{ provider: "elevenlabs" }} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("elevenlabs");
        });

        it("loads existing model from data", () => {
            render(<AudioOutputNodeConfig {...defaultProps} data={{ model: "tts-1-hd" }} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[1]).toHaveValue("tts-1-hd");
        });

        it("loads existing voice from data", () => {
            render(<AudioOutputNodeConfig {...defaultProps} data={{ voice: "nova" }} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[2]).toHaveValue("nova");
        });

        it("loads existing textInput from data", () => {
            render(<AudioOutputNodeConfig {...defaultProps} data={{ textInput: "Hello world" }} />);
            const textarea = screen.getByTestId("textarea");
            expect(textarea).toHaveValue("Hello world");
        });

        it("loads existing outputFormat from data", () => {
            render(<AudioOutputNodeConfig {...defaultProps} data={{ outputFormat: "wav" }} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[3]).toHaveValue("wav");
        });

        it("loads existing outputVariable from data", () => {
            render(<AudioOutputNodeConfig {...defaultProps} data={{ outputVariable: "speech" }} />);
            const input = screen.getByTestId("input");
            expect(input).toHaveValue("speech");
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when provider changes", async () => {
            const user = userEvent.setup();
            render(<AudioOutputNodeConfig {...defaultProps} />);

            const providerSelect = screen.getAllByTestId("select")[0];
            await user.selectOptions(providerSelect, "deepgram");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.provider).toBe("deepgram");
        });

        it("calls onUpdate when textInput changes", async () => {
            const user = userEvent.setup();
            render(<AudioOutputNodeConfig {...defaultProps} />);

            const textarea = screen.getByTestId("textarea");
            await user.type(textarea, "Test speech");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.textInput).toContain("Test speech");
        });

        it("does not call onUpdate on initial render", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays Provider label", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Provider")).toBeInTheDocument();
        });

        it("displays Model label", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Model")).toBeInTheDocument();
        });

        it("displays Voice label", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Voice")).toBeInTheDocument();
        });

        it("displays Text to Synthesize label", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Text to Synthesize")).toBeInTheDocument();
        });

        it("displays Output Format label", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Output Format")).toBeInTheDocument();
        });

        it("displays Output Variable label", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Output Variable")).toBeInTheDocument();
        });
    });

    describe("Return as URL Checkbox", () => {
        it("shows Return as URL checkbox", () => {
            render(<AudioOutputNodeConfig {...defaultProps} />);
            expect(
                screen.getByText("Return as URL (recommended for large files)")
            ).toBeInTheDocument();
        });
    });
});
