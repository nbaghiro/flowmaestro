/**
 * FilesNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FilesNodeConfig } from "../../configs/FilesNodeConfig";

// Mock common form components
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

vi.mock("../../../../components/common/Tooltip", () => ({
    Tooltip: ({ content, children }: { content: string; children: React.ReactNode }) => (
        <div data-testid="tooltip" data-content={content}>
            {children}
        </div>
    )
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
    ChevronDown: () => <span data-testid="chevron-down">v</span>,
    ChevronUp: () => <span data-testid="chevron-up">^</span>,
    FileText: () => <span data-testid="file-text-icon">F</span>,
    HelpCircle: () => <span data-testid="help-circle-icon">?</span>,
    Settings: () => <span data-testid="settings-icon">S</span>,
    Upload: () => <span data-testid="upload-icon">U</span>
}));

describe("FilesNodeConfig", () => {
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
        it("renders the component", () => {
            render(<FilesNodeConfig {...defaultProps} />);
            expect(screen.getByText("Default Files")).toBeInTheDocument();
        });

        it("renders Settings section", () => {
            render(<FilesNodeConfig {...defaultProps} />);
            // Settings appears as button text in collapsible
            const buttons = screen.getAllByRole("button");
            const settingsButton = buttons.find((b) => b.textContent?.includes("Settings"));
            expect(settingsButton).toBeDefined();
        });

        it("renders upload description", () => {
            render(<FilesNodeConfig {...defaultProps} />);
            expect(screen.getByText("Upload files to your knowledge base")).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows sentence as default chunking algorithm", async () => {
            const user = userEvent.setup();
            render(<FilesNodeConfig {...defaultProps} />);

            // Find and click Settings button
            const buttons = screen.getAllByRole("button");
            const settingsButton = buttons.find((b) => b.textContent?.includes("Settings"));
            expect(settingsButton).toBeDefined();
            await user.click(settingsButton!);

            const select = screen.getByTestId("select");
            expect(select).toHaveValue("sentence");
        });

        it("shows default chunk overlap as 1000", async () => {
            const user = userEvent.setup();
            render(<FilesNodeConfig {...defaultProps} />);

            const buttons = screen.getAllByRole("button");
            const settingsButton = buttons.find((b) => b.textContent?.includes("Settings"));
            await user.click(settingsButton!);

            expect(screen.getByText("Chunk Overlap")).toBeInTheDocument();
            expect(screen.getByText("1000")).toBeInTheDocument();
        });

        it("shows default chunk length as 2500", async () => {
            const user = userEvent.setup();
            render(<FilesNodeConfig {...defaultProps} />);

            const buttons = screen.getAllByRole("button");
            const settingsButton = buttons.find((b) => b.textContent?.includes("Settings"));
            await user.click(settingsButton!);

            expect(screen.getByText("Chunk Length")).toBeInTheDocument();
            expect(screen.getByText("2500")).toBeInTheDocument();
        });
    });

    describe("Collapsible Sections", () => {
        it("Default Files section is expanded by default", () => {
            render(<FilesNodeConfig {...defaultProps} />);
            expect(screen.getByText("Upload files to your knowledge base")).toBeInTheDocument();
        });

        it("Settings section can be expanded", async () => {
            const user = userEvent.setup();
            render(<FilesNodeConfig {...defaultProps} />);

            const buttons = screen.getAllByRole("button");
            const settingsButton = buttons.find((b) => b.textContent?.includes("Settings"));
            await user.click(settingsButton!);

            expect(screen.getByText("Chunking Algorithm")).toBeInTheDocument();
        });
    });

    describe("Chunking Algorithm Selection", () => {
        it("provides chunking options", async () => {
            const user = userEvent.setup();
            render(<FilesNodeConfig {...defaultProps} />);

            const buttons = screen.getAllByRole("button");
            const settingsButton = buttons.find((b) => b.textContent?.includes("Settings"));
            await user.click(settingsButton!);

            const select = screen.getByTestId("select");
            expect(select).toContainHTML("Sentence");
            expect(select).toContainHTML("Paragraph");
            expect(select).toContainHTML("Fixed Size");
            expect(select).toContainHTML("Semantic");
        });
    });

    describe("Toggle Settings", () => {
        it("shows Advanced Data Extraction setting", async () => {
            const user = userEvent.setup();
            render(<FilesNodeConfig {...defaultProps} />);

            const buttons = screen.getAllByRole("button");
            const settingsButton = buttons.find((b) => b.textContent?.includes("Settings"));
            await user.click(settingsButton!);

            expect(screen.getByText("Advanced Data Extraction")).toBeInTheDocument();
        });

        it("shows Text in images (OCR) setting", async () => {
            const user = userEvent.setup();
            render(<FilesNodeConfig {...defaultProps} />);

            const buttons = screen.getAllByRole("button");
            const settingsButton = buttons.find((b) => b.textContent?.includes("Settings"));
            await user.click(settingsButton!);

            expect(screen.getByText("Text in images (OCR)")).toBeInTheDocument();
        });
    });

    describe("Preset Data", () => {
        it("loads existing chunking algorithm from data", async () => {
            const user = userEvent.setup();
            render(<FilesNodeConfig {...defaultProps} data={{ chunkingAlgorithm: "paragraph" }} />);

            const buttons = screen.getAllByRole("button");
            const settingsButton = buttons.find((b) => b.textContent?.includes("Settings"));
            await user.click(settingsButton!);

            const select = screen.getByTestId("select");
            expect(select).toHaveValue("paragraph");
        });

        it("loads existing chunk overlap from data", async () => {
            const user = userEvent.setup();
            render(<FilesNodeConfig {...defaultProps} data={{ chunkOverlap: 500 }} />);

            const buttons = screen.getAllByRole("button");
            const settingsButton = buttons.find((b) => b.textContent?.includes("Settings"));
            await user.click(settingsButton!);

            expect(screen.getByText("500")).toBeInTheDocument();
        });

        it("loads existing chunk size from data", async () => {
            const user = userEvent.setup();
            render(<FilesNodeConfig {...defaultProps} data={{ chunkSize: 3000 }} />);

            const buttons = screen.getAllByRole("button");
            const settingsButton = buttons.find((b) => b.textContent?.includes("Settings"));
            await user.click(settingsButton!);

            expect(screen.getByText("3000")).toBeInTheDocument();
        });

        it("loads existing uploaded files from data", () => {
            render(
                <FilesNodeConfig
                    {...defaultProps}
                    data={{
                        uploadedFiles: [{ name: "test.pdf", type: "pdf" }]
                    }}
                />
            );

            expect(screen.getByText("test.pdf")).toBeInTheDocument();
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when chunking algorithm changes", async () => {
            const user = userEvent.setup();
            render(<FilesNodeConfig {...defaultProps} />);

            const buttons = screen.getAllByRole("button");
            const settingsButton = buttons.find((b) => b.textContent?.includes("Settings"));
            await user.click(settingsButton!);

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "paragraph");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.chunkingAlgorithm).toBe("paragraph");
        });

        it("does not call onUpdate on initial render", () => {
            render(<FilesNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("API Documentation Link", () => {
        it("shows link to learn more about API", () => {
            render(<FilesNodeConfig {...defaultProps} />);
            expect(screen.getByText("How to manage documents via API?")).toBeInTheDocument();
            expect(screen.getByText("Learn more")).toBeInTheDocument();
        });
    });

    describe("File Removal", () => {
        it("can remove uploaded file", async () => {
            const user = userEvent.setup();
            render(
                <FilesNodeConfig
                    {...defaultProps}
                    data={{
                        uploadedFiles: [{ name: "test.pdf", type: "pdf" }]
                    }}
                />
            );

            expect(screen.getByText("test.pdf")).toBeInTheDocument();

            const removeButton = screen.getByText("×");
            await user.click(removeButton);

            await waitFor(() => {
                expect(screen.queryByText("test.pdf")).not.toBeInTheDocument();
            });
        });
    });
});
