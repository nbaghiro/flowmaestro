/**
 * ScreenshotCaptureNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScreenshotCaptureNodeConfig } from "../../configs/ScreenshotCaptureNodeConfig";

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
        value?: string | number;
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

describe("ScreenshotCaptureNodeConfig", () => {
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
        it("renders URL section", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-url")).toBeInTheDocument();
        });

        it("renders Viewport section", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-viewport")).toBeInTheDocument();
        });

        it("renders Image Settings section", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-image-settings")).toBeInTheDocument();
        });

        it("renders Capture Options section", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-capture-options")).toBeInTheDocument();
        });

        it("renders Output section", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output")).toBeInTheDocument();
        });

        it("renders URL field", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-url")).toBeInTheDocument();
        });

        it("renders width field", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-width-(px)")).toBeInTheDocument();
        });

        it("renders height field", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-height-(px)")).toBeInTheDocument();
        });

        it("renders format field", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-format")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows empty URL by default", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[0]).toHaveValue("");
        });

        it("shows default width as 1280", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[1]).toHaveValue(1280);
        });

        it("shows default height as 720", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[2]).toHaveValue(720);
        });

        it("shows default format as png", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("png");
        });

        it("shows full page disabled by default", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[0]).not.toBeChecked();
        });

        it("shows dark mode disabled by default", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[1]).not.toBeChecked();
        });
    });

    describe("Format Selection", () => {
        it("provides png, jpeg, and webp options", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");

            expect(select).toContainHTML("PNG");
            expect(select).toContainHTML("JPEG");
            expect(select).toContainHTML("WebP");
        });

        it("hides quality slider when png is selected", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            expect(screen.queryByTestId("form-field-quality")).not.toBeInTheDocument();
        });

        it("shows quality slider when jpeg is selected", async () => {
            const user = userEvent.setup();
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "jpeg");

            expect(screen.getByTestId("form-field-quality")).toBeInTheDocument();
        });
    });

    describe("Capture Options", () => {
        it("shows Capture Full Page checkbox", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            expect(screen.getByText("Capture Full Page")).toBeInTheDocument();
        });

        it("shows Dark Mode checkbox", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            expect(screen.getByText("Dark Mode")).toBeInTheDocument();
        });
    });

    describe("Preset Data", () => {
        it("loads existing URL from data", () => {
            render(
                <ScreenshotCaptureNodeConfig
                    {...defaultProps}
                    data={{ url: "https://example.com" }}
                />
            );
            const inputs = screen.getAllByTestId("input");
            expect(inputs[0]).toHaveValue("https://example.com");
        });

        it("loads existing width from data", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} data={{ width: 1920 }} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[1]).toHaveValue(1920);
        });

        it("loads existing height from data", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} data={{ height: 1080 }} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[2]).toHaveValue(1080);
        });

        it("loads existing format from data", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} data={{ format: "jpeg" }} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("jpeg");
        });

        it("loads fullPage true from data", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} data={{ fullPage: true }} />);
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[0]).toBeChecked();
        });

        it("loads darkMode true from data", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} data={{ darkMode: true }} />);
            const checkboxes = screen.getAllByTestId("checkbox");
            expect(checkboxes[1]).toBeChecked();
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when URL changes", async () => {
            const user = userEvent.setup();
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);

            const inputs = screen.getAllByTestId("input");
            await user.type(inputs[0], "https://test.com");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.url).toBe("https://test.com");
        });

        it("calls onUpdate when format changes", async () => {
            const user = userEvent.setup();
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "webp");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.format).toBe("webp");
        });

        it("does not call onUpdate on initial render", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays URL field", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-url")).toBeInTheDocument();
        });

        it("displays Width (px) label", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            expect(screen.getByText("Width (px)")).toBeInTheDocument();
        });

        it("displays Height (px) label", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            expect(screen.getByText("Height (px)")).toBeInTheDocument();
        });

        it("displays Format label", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            expect(screen.getByText("Format")).toBeInTheDocument();
        });

        it("displays Delay (ms) label", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            expect(screen.getByText("Delay (ms)")).toBeInTheDocument();
        });

        it("displays CSS Selector label", () => {
            render(<ScreenshotCaptureNodeConfig {...defaultProps} />);
            expect(screen.getByText("CSS Selector")).toBeInTheDocument();
        });
    });
});
