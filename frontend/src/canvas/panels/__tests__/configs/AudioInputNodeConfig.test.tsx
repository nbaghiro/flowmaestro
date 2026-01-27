/**
 * AudioInputNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudioInputNodeConfig } from "../../configs/AudioInputNodeConfig";

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

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
    Mic: () => <span data-testid="mic-icon">Mic</span>,
    Square: () => <span data-testid="square-icon">Square</span>,
    Upload: () => <span data-testid="upload-icon">Upload</span>
}));

describe("AudioInputNodeConfig", () => {
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
        it("renders STT Provider section", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-stt-provider")).toBeInTheDocument();
        });

        it("renders Audio Source section", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-audio-source")).toBeInTheDocument();
        });

        it("renders Transcription Settings section", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-transcription-settings")).toBeInTheDocument();
        });

        it("renders Output section", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output")).toBeInTheDocument();
        });

        it("renders Provider field", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-provider")).toBeInTheDocument();
        });

        it("renders Model field", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-model")).toBeInTheDocument();
        });

        it("renders Input Parameter Name field", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-input-parameter-name")).toBeInTheDocument();
        });

        it("renders Language field", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-language")).toBeInTheDocument();
        });

        it("renders Output Variable field", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-output-variable")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows openai as default provider", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("openai");
        });

        it("shows whisper-1 as default model", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[1]).toHaveValue("whisper-1");
        });

        it("shows auto as default language", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[2]).toHaveValue("auto");
        });

        it("shows default input name as audio", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[0]).toHaveValue("audio");
        });

        it("shows default output variable as transcription", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[1]).toHaveValue("transcription");
        });
    });

    describe("Provider Selection", () => {
        it("provides openai and deepgram options", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            const select = screen.getAllByTestId("select")[0];

            expect(select).toContainHTML("OpenAI Whisper");
            expect(select).toContainHTML("Deepgram");
        });

        it("changes model when provider changes", async () => {
            const user = userEvent.setup();
            render(<AudioInputNodeConfig {...defaultProps} />);

            const providerSelect = screen.getAllByTestId("select")[0];
            await user.selectOptions(providerSelect, "deepgram");

            await waitFor(() => {
                const modelSelect = screen.getAllByTestId("select")[1];
                expect(modelSelect).toHaveValue("nova-2");
            });
        });
    });

    describe("Deepgram-specific Options", () => {
        it("shows punctuation option when deepgram is selected", async () => {
            const user = userEvent.setup();
            render(<AudioInputNodeConfig {...defaultProps} />);

            const providerSelect = screen.getAllByTestId("select")[0];
            await user.selectOptions(providerSelect, "deepgram");

            expect(screen.getByText("Enable punctuation")).toBeInTheDocument();
        });

        it("shows diarization option when deepgram is selected", async () => {
            const user = userEvent.setup();
            render(<AudioInputNodeConfig {...defaultProps} />);

            const providerSelect = screen.getAllByTestId("select")[0];
            await user.selectOptions(providerSelect, "deepgram");

            expect(screen.getByText("Enable diarization")).toBeInTheDocument();
        });
    });

    describe("Preset Data", () => {
        it("loads existing provider from data", () => {
            render(<AudioInputNodeConfig {...defaultProps} data={{ provider: "deepgram" }} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("deepgram");
        });

        it("loads existing model from data", () => {
            render(
                <AudioInputNodeConfig
                    {...defaultProps}
                    data={{ provider: "deepgram", model: "nova" }}
                />
            );
            const selects = screen.getAllByTestId("select");
            expect(selects[1]).toHaveValue("nova");
        });

        it("loads existing language from data", () => {
            render(<AudioInputNodeConfig {...defaultProps} data={{ language: "es" }} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[2]).toHaveValue("es");
        });

        it("loads existing inputName from data", () => {
            render(<AudioInputNodeConfig {...defaultProps} data={{ inputName: "audioFile" }} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[0]).toHaveValue("audioFile");
        });

        it("loads existing outputVariable from data", () => {
            render(<AudioInputNodeConfig {...defaultProps} data={{ outputVariable: "text" }} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[1]).toHaveValue("text");
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when provider changes", async () => {
            const user = userEvent.setup();
            render(<AudioInputNodeConfig {...defaultProps} />);

            const providerSelect = screen.getAllByTestId("select")[0];
            await user.selectOptions(providerSelect, "deepgram");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.provider).toBe("deepgram");
        });

        it("calls onUpdate when inputName changes", async () => {
            const user = userEvent.setup();
            render(<AudioInputNodeConfig {...defaultProps} />);

            const inputs = screen.getAllByTestId("input");
            await user.clear(inputs[0]);
            await user.type(inputs[0], "myAudio");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.inputName).toBe("myAudio");
        });

        it("does not call onUpdate on initial render", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays Provider label", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Provider")).toBeInTheDocument();
        });

        it("displays Model label", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Model")).toBeInTheDocument();
        });

        it("displays Input Parameter Name label", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Input Parameter Name")).toBeInTheDocument();
        });

        it("displays Language label", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Language")).toBeInTheDocument();
        });

        it("displays Output Variable label", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Output Variable")).toBeInTheDocument();
        });
    });

    describe("Test Recording Section", () => {
        it("shows Record Audio button", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Record Audio")).toBeInTheDocument();
        });

        it("shows Upload file button", () => {
            render(<AudioInputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Upload file")).toBeInTheDocument();
        });
    });
});
