/**
 * FileDownloadNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileDownloadNodeConfig } from "../../configs/FileDownloadNodeConfig";

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

describe("FileDownloadNodeConfig", () => {
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
        it("renders Download URL section", () => {
            render(<FileDownloadNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-download-url")).toBeInTheDocument();
        });

        it("renders Options section", () => {
            render(<FileDownloadNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-options")).toBeInTheDocument();
        });

        it("renders Output section", () => {
            render(<FileDownloadNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output")).toBeInTheDocument();
        });

        it("renders URL field", () => {
            render(<FileDownloadNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-url")).toBeInTheDocument();
        });

        it("renders filename field", () => {
            render(<FileDownloadNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-filename")).toBeInTheDocument();
        });

        it("renders max file size field", () => {
            render(<FileDownloadNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-max-file-size-(mb)")).toBeInTheDocument();
        });

        it("renders timeout field", () => {
            render(<FileDownloadNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-timeout-(seconds)")).toBeInTheDocument();
        });

        it("renders follow redirects checkbox", () => {
            render(<FileDownloadNodeConfig {...defaultProps} />);
            expect(screen.getByText("Follow Redirects")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows empty URL by default", () => {
            render(<FileDownloadNodeConfig {...defaultProps} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[0]).toHaveValue("");
        });

        it("shows empty filename by default", () => {
            render(<FileDownloadNodeConfig {...defaultProps} />);
            const inputs = screen.getAllByTestId("input");
            expect(inputs[1]).toHaveValue("");
        });

        it("shows default max size as 50 MB", () => {
            render(<FileDownloadNodeConfig {...defaultProps} />);
            expect(screen.getByText("50 MB")).toBeInTheDocument();
        });

        it("shows default timeout as 60s", () => {
            render(<FileDownloadNodeConfig {...defaultProps} />);
            expect(screen.getByText("60s")).toBeInTheDocument();
        });

        it("shows follow redirects enabled by default", () => {
            render(<FileDownloadNodeConfig {...defaultProps} />);
            const checkbox = screen.getByTestId("checkbox");
            expect(checkbox).toBeChecked();
        });
    });

    describe("Preset Data", () => {
        it("loads existing URL from data", () => {
            render(
                <FileDownloadNodeConfig
                    {...defaultProps}
                    data={{ url: "https://example.com/file.pdf" }}
                />
            );
            const inputs = screen.getAllByTestId("input");
            expect(inputs[0]).toHaveValue("https://example.com/file.pdf");
        });

        it("loads existing filename from data", () => {
            render(
                <FileDownloadNodeConfig {...defaultProps} data={{ filename: "download.pdf" }} />
            );
            const inputs = screen.getAllByTestId("input");
            expect(inputs[1]).toHaveValue("download.pdf");
        });

        it("loads followRedirects false from data", () => {
            render(<FileDownloadNodeConfig {...defaultProps} data={{ followRedirects: false }} />);
            const checkbox = screen.getByTestId("checkbox");
            expect(checkbox).not.toBeChecked();
        });

        it("loads existing output variable from data", () => {
            render(
                <FileDownloadNodeConfig
                    {...defaultProps}
                    data={{ outputVariable: "downloadedFile" }}
                />
            );
            const outputInput = screen.getByTestId("output-variable-input");
            expect(outputInput).toHaveValue("downloadedFile");
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when URL changes", async () => {
            const user = userEvent.setup();
            render(<FileDownloadNodeConfig {...defaultProps} />);

            const inputs = screen.getAllByTestId("input");
            await user.type(inputs[0], "https://example.com/file.pdf");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.url).toBe("https://example.com/file.pdf");
        });

        it("calls onUpdate when filename changes", async () => {
            const user = userEvent.setup();
            render(<FileDownloadNodeConfig {...defaultProps} />);

            const inputs = screen.getAllByTestId("input");
            await user.type(inputs[1], "myfile.pdf");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.filename).toBe("myfile.pdf");
        });

        it("does not call onUpdate on initial render", () => {
            render(<FileDownloadNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays URL label", () => {
            render(<FileDownloadNodeConfig {...defaultProps} />);
            expect(screen.getByText("URL")).toBeInTheDocument();
        });

        it("displays Filename label", () => {
            render(<FileDownloadNodeConfig {...defaultProps} />);
            expect(screen.getByText("Filename")).toBeInTheDocument();
        });

        it("displays Max File Size (MB) label", () => {
            render(<FileDownloadNodeConfig {...defaultProps} />);
            expect(screen.getByText("Max File Size (MB)")).toBeInTheDocument();
        });

        it("displays Timeout (seconds) label", () => {
            render(<FileDownloadNodeConfig {...defaultProps} />);
            expect(screen.getByText("Timeout (seconds)")).toBeInTheDocument();
        });
    });
});
