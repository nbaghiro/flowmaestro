/**
 * TemplateOutputNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TemplateOutputNodeConfig } from "../../configs/TemplateOutputNodeConfig";

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
        value: string;
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

// Mock ReactMarkdown
vi.mock("react-markdown", () => ({
    default: ({ children }: { children: string }) => (
        <div data-testid="markdown-preview">{children}</div>
    )
}));

vi.mock("remark-gfm", () => ({
    default: () => {}
}));

describe("TemplateOutputNodeConfig", () => {
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
        it("renders Output Configuration section", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-output-configuration")).toBeInTheDocument();
        });

        it("renders Markdown Template section", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-markdown-template")).toBeInTheDocument();
        });

        it("renders Preview section", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-preview")).toBeInTheDocument();
        });

        it("renders Usage Notes section", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-section-usage-notes")).toBeInTheDocument();
        });

        it("renders output name field", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-output-name")).toBeInTheDocument();
        });

        it("renders output format field", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-output-format")).toBeInTheDocument();
        });

        it("renders description field", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-description")).toBeInTheDocument();
        });

        it("renders template content field", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("form-field-template-content")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows default output name as templateOutput", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            const input = screen.getByTestId("input");
            expect(input).toHaveValue("templateOutput");
        });

        it("shows default output format as markdown", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("markdown");
        });

        it("shows empty description by default", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            const textareas = screen.getAllByTestId("textarea");
            expect(textareas[0]).toHaveValue("");
        });

        it("shows empty template by default", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            const textareas = screen.getAllByTestId("textarea");
            expect(textareas[1]).toHaveValue("");
        });
    });

    describe("Output Format Selection", () => {
        it("provides markdown and html options", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            const select = screen.getByTestId("select");

            expect(select).toContainHTML("Markdown");
            expect(select).toContainHTML("HTML");
        });
    });

    describe("Preset Data", () => {
        it("loads existing output name from data", () => {
            render(
                <TemplateOutputNodeConfig {...defaultProps} data={{ outputName: "customOutput" }} />
            );
            const input = screen.getByTestId("input");
            expect(input).toHaveValue("customOutput");
        });

        it("loads existing output format from data", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} data={{ outputFormat: "html" }} />);
            const select = screen.getByTestId("select");
            expect(select).toHaveValue("html");
        });

        it("loads existing description from data", () => {
            render(
                <TemplateOutputNodeConfig
                    {...defaultProps}
                    data={{ description: "My template output" }}
                />
            );
            const textareas = screen.getAllByTestId("textarea");
            expect(textareas[0]).toHaveValue("My template output");
        });

        it("loads existing template from data", () => {
            render(
                <TemplateOutputNodeConfig
                    {...defaultProps}
                    data={{ template: "# Hello {{name}}" }}
                />
            );
            const textareas = screen.getAllByTestId("textarea");
            expect(textareas[1]).toHaveValue("# Hello {{name}}");
        });
    });

    describe("Preview", () => {
        it("renders markdown preview", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
        });

        it("shows toggle button for preview", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Hide")).toBeInTheDocument();
        });

        it("can toggle preview visibility", async () => {
            const user = userEvent.setup();
            render(<TemplateOutputNodeConfig {...defaultProps} />);

            const toggleButton = screen.getByText("Hide");
            await user.click(toggleButton);

            expect(screen.getByText("Show")).toBeInTheDocument();
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when output name changes", async () => {
            const user = userEvent.setup();
            render(<TemplateOutputNodeConfig {...defaultProps} />);

            const input = screen.getByTestId("input");
            await user.clear(input);
            await user.type(input, "newOutput");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.outputName).toBe("newOutput");
        });

        it("calls onUpdate when output format changes", async () => {
            const user = userEvent.setup();
            render(<TemplateOutputNodeConfig {...defaultProps} />);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "html");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.outputFormat).toBe("html");
        });

        it("calls onUpdate when template changes", async () => {
            const user = userEvent.setup();
            render(<TemplateOutputNodeConfig {...defaultProps} />);

            const textareas = screen.getAllByTestId("textarea");
            await user.type(textareas[1], "# Welcome");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.template).toContain("# Welcome");
        });

        it("does not call onUpdate on initial render", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("Field Labels", () => {
        it("displays Output Name label", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Output Name")).toBeInTheDocument();
        });

        it("displays Output Format label", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Output Format")).toBeInTheDocument();
        });

        it("displays Description label", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Description")).toBeInTheDocument();
        });

        it("displays Template Content label", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Template Content")).toBeInTheDocument();
        });
    });

    describe("Variable Syntax Information", () => {
        it("displays variable syntax info", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            expect(screen.getByText("Variable Syntax:")).toBeInTheDocument();
        });
    });

    describe("Usage Notes", () => {
        it("displays usage notes", () => {
            render(<TemplateOutputNodeConfig {...defaultProps} />);
            expect(
                screen.getByText(/Template Output renders markdown templates/)
            ).toBeInTheDocument();
        });
    });
});
