/**
 * OCRExtractionNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OCRExtractionNodeConfig } from "../../configs/OCRExtractionNodeConfig";

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

describe("OCRExtractionNodeConfig", () => {
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
        it("renders Image Source section", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-image-source")).toBeInTheDocument();
        });

        it("renders OCR Settings section", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-ocr-settings")).toBeInTheDocument();
        });

        it("renders Preprocessing section", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-preprocessing")).toBeInTheDocument();
        });

        it("renders Output section", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output")).toBeInTheDocument();
        });

        it("renders image file field", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-image-file")).toBeInTheDocument();
        });

        it("renders languages field", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-languages")).toBeInTheDocument();
        });

        it("renders page segmentation mode field", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-page-segmentation-mode")).toBeInTheDocument();
        });

        it("renders output format field", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-output-format")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows empty image source by default", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            const input = screen.getByTestId("input");
            expect(input).toHaveValue("");
        });

        it("shows English as default language", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Selected: eng")).toBeInTheDocument();
        });

        it("shows default PSM as Automatic", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("3");
        });

        it("shows default output format as text", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[1]).toHaveValue("text");
        });

        it("shows grayscale enabled by default", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[0]).toBeChecked();
        });

        it("shows denoise disabled by default", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[1]).not.toBeChecked();
        });
    });

    describe("Language Selection", () => {
        it("displays language selection buttons", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            expect(screen.getByText("English")).toBeInTheDocument();
            expect(screen.getByText("Spanish")).toBeInTheDocument();
            expect(screen.getByText("French")).toBeInTheDocument();
        });

        it("can toggle language selection", async () => {
            const user = userEvent.setup();
            render(<OCRExtractionNodeConfig {...defaultProps} />);

            const spanishButton = screen.getByText("Spanish");
            await user.click(spanishButton);

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.languages).toContain("spa");
        });
    });

    describe("Output Format Selection", () => {
        it("provides text, json, tsv, and hocr options", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            const selects = screen.getAllByTestId("select");
            const formatSelect = selects[1];

            expect(formatSelect).toContainHTML("Plain Text");
            expect(formatSelect).toContainHTML("JSON (with bounding boxes)");
            expect(formatSelect).toContainHTML("TSV (Tab-separated)");
            expect(formatSelect).toContainHTML("hOCR (HTML format)");
        });
    });

    describe("Preprocessing Checkboxes", () => {
        it("shows Convert to Grayscale checkbox", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Convert to Grayscale")).toBeInTheDocument();
        });

        it("shows Apply Denoising checkbox", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Apply Denoising")).toBeInTheDocument();
        });

        it("shows Auto-correct Skew checkbox", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Auto-correct Skew")).toBeInTheDocument();
        });

        it("shows Apply Adaptive Thresholding checkbox", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Apply Adaptive Thresholding")).toBeInTheDocument();
        });
    });

    describe("Preset Data", () => {
        it("loads existing image source from data", () => {
            render(
                <OCRExtractionNodeConfig
                    {...defaultProps}
                    data={{ imageSource: "{{imagePath}}" }}
                />
            );
            const input = screen.getByTestId("input");
            expect(input).toHaveValue("{{imagePath}}");
        });

        it("loads existing languages from data", () => {
            render(
                <OCRExtractionNodeConfig {...defaultProps} data={{ languages: ["eng", "fra"] }} />
            );
            expect(screen.getByText("Selected: eng, fra")).toBeInTheDocument();
        });

        it("loads existing output format from data", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} data={{ outputFormat: "json" }} />);
            const selects = screen.getAllByTestId("select");
            expect(selects[1]).toHaveValue("json");
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when image source changes", async () => {
            const user = userEvent.setup();
            render(<OCRExtractionNodeConfig {...defaultProps} />);

            const input = screen.getByTestId("input");
            await user.type(input, "/path/to/image.png");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.imageSource).toBe("/path/to/image.png");
        });

        it("calls onUpdate when output format changes", async () => {
            const user = userEvent.setup();
            render(<OCRExtractionNodeConfig {...defaultProps} />);

            const selects = screen.getAllByTestId("select");
            await user.selectOptions(selects[1], "json");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.outputFormat).toBe("json");
        });

        it("does not call onUpdate on initial render", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays Image File label", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Image File")).toBeInTheDocument();
        });

        it("displays Languages label", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Languages")).toBeInTheDocument();
        });

        it("displays Page Segmentation Mode label", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Page Segmentation Mode")).toBeInTheDocument();
        });

        it("displays Output Format label", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Output Format")).toBeInTheDocument();
        });

        it("displays Confidence Threshold label", () => {
            render(<OCRExtractionNodeConfig {...defaultProps} />);
            expect(screen.getByText("Confidence Threshold")).toBeInTheDocument();
        });
    });
});
