/**
 * AudioTranscriptionNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudioTranscriptionNodeConfig } from "../../configs/AudioTranscriptionNodeConfig";

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
        checked,
        maxLength
    }: {
        value?: string;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder?: string;
        type?: string;
        checked?: boolean;
        maxLength?: number;
    }) => (
        <input
            data-testid={type === "checkbox" ? "checkbox" : "input"}
            type={type || "text"}
            value={value}
            checked={checked}
            onChange={onChange}
            placeholder={placeholder}
            maxLength={maxLength}
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

describe("AudioTranscriptionNodeConfig", () => {
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
        it("renders Audio Source section", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-audio-source")).toBeInTheDocument();
        });

        it("renders Model Settings section", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-model-settings")).toBeInTheDocument();
        });

        it("renders Output Options section", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output-options")).toBeInTheDocument();
        });

        it("renders Advanced section", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-advanced")).toBeInTheDocument();
        });

        it("renders Output section", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output")).toBeInTheDocument();
        });

        it("renders Audio File field", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-audio-file")).toBeInTheDocument();
        });

        it("renders Model field", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-model")).toBeInTheDocument();
        });

        it("renders Task field", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-task")).toBeInTheDocument();
        });

        it("renders Language field", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-language")).toBeInTheDocument();
        });

        it("renders Output Format field", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-output-format")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows empty audio source by default", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[0]).toHaveValue("");
        });

        it("shows whisper-1 as default model", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("whisper-1");
        });

        it("shows transcribe as default task", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[1]).toHaveValue("transcribe");
        });

        it("shows auto-detect as default language", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[2]).toHaveValue("");
        });

        it("shows text as default output format", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[3]).toHaveValue("text");
        });
    });

    describe("Task Selection", () => {
        it("provides transcribe and translate options", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            const taskSelect = screen.getAllByTestId("select")[1];

            expect(taskSelect).toContainHTML("Transcribe (Original Language)");
            expect(taskSelect).toContainHTML("Translate to English");
        });
    });

    describe("Output Format Selection", () => {
        it("provides text, json, srt, and vtt options", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            const formatSelect = screen.getAllByTestId("select")[3];

            expect(formatSelect).toContainHTML("Plain Text");
            expect(formatSelect).toContainHTML("JSON (with metadata)");
            expect(formatSelect).toContainHTML("SRT (Subtitles)");
            expect(formatSelect).toContainHTML("VTT (Web Subtitles)");
        });
    });

    describe("Language Selection", () => {
        it("provides language options", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            const languageSelect = screen.getAllByTestId("select")[2];

            expect(languageSelect).toContainHTML("Auto-detect");
            expect(languageSelect).toContainHTML("English");
            expect(languageSelect).toContainHTML("Spanish");
            expect(languageSelect).toContainHTML("French");
        });
    });

    describe("Preset Data", () => {
        it("loads existing audioSource from data", () => {
            render(
                <AudioTranscriptionNodeConfig
                    {...defaultProps}
                    data={{ audioSource: "/audio.mp3" }}
                />
            );
            const inputs = screen.getAllByTestId("input");
            expect(inputs[0]).toHaveValue("/audio.mp3");
        });

        it("loads existing model from data", () => {
            render(
                <AudioTranscriptionNodeConfig {...defaultProps} data={{ model: "whisper-1" }} />
            );
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("whisper-1");
        });

        it("loads existing task from data", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} data={{ task: "translate" }} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[1]).toHaveValue("translate");
        });

        it("loads existing language from data", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} data={{ language: "es" }} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[2]).toHaveValue("es");
        });

        it("loads existing outputFormat from data", () => {
            render(
                <AudioTranscriptionNodeConfig {...defaultProps} data={{ outputFormat: "srt" }} />
            );
            const selects = screen.getAllByTestId("select");
            expect(selects[3]).toHaveValue("srt");
        });

        it("loads existing outputVariable from data", () => {
            render(
                <AudioTranscriptionNodeConfig
                    {...defaultProps}
                    data={{ outputVariable: "transcript" }}
                />
            );
            const outputInput = screen.getByTestId("output-variable-input");
            expect(outputInput).toHaveValue("transcript");
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when audioSource changes", async () => {
            const user = userEvent.setup();
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);

            const inputs = screen.getAllByTestId("input");
            await user.type(inputs[0], "/path/to/audio.mp3");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.audioSource).toBe("/path/to/audio.mp3");
        });

        it("calls onUpdate when task changes", async () => {
            const user = userEvent.setup();
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);

            const taskSelect = screen.getAllByTestId("select")[1];
            await user.selectOptions(taskSelect, "translate");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.task).toBe("translate");
        });

        it("does not call onUpdate on initial render", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays Audio File label", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Audio File")).toBeInTheDocument();
        });

        it("displays Model label", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Model")).toBeInTheDocument();
        });

        it("displays Task label", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Task")).toBeInTheDocument();
        });

        it("displays Language label", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Language")).toBeInTheDocument();
        });

        it("displays Output Format label", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Output Format")).toBeInTheDocument();
        });
    });

    describe("Advanced Section", () => {
        it("shows Prompt field", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-prompt")).toBeInTheDocument();
        });

        it("shows Temperature field", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-temperature")).toBeInTheDocument();
        });
    });

    describe("Timestamps Checkbox", () => {
        it("shows Include Word-Level Timestamps checkbox", () => {
            render(<AudioTranscriptionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Include Word-Level Timestamps")).toBeInTheDocument();
        });
    });
});
