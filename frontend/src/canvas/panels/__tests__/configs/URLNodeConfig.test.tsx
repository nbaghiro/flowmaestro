/**
 * URLNodeConfig component tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { URLNodeConfig } from "../../configs/URLNodeConfig";

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
    ChevronDown: () => <span data-testid="chevron-down">ChevronDown</span>,
    ChevronUp: () => <span data-testid="chevron-up">ChevronUp</span>,
    HelpCircle: () => <span data-testid="help-circle-icon">HelpCircle</span>,
    Link: () => <span data-testid="link-icon">Link</span>,
    Plus: () => <span data-testid="plus-icon">Plus</span>,
    Settings: () => <span data-testid="settings-icon">Settings</span>,
    SlidersHorizontal: () => <span data-testid="sliders-icon">SlidersHorizontal</span>
}));

describe("URLNodeConfig", () => {
    const mockOnUpdate = vi.fn();

    const defaultProps = {
        nodeId: "node-1",
        data: {},
        onUpdate: mockOnUpdate
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Rendering", () => {
        it("renders the component", () => {
            render(<URLNodeConfig {...defaultProps} />);
            expect(screen.getByText("Default URLs")).toBeInTheDocument();
        });

        it("renders Scraping Options section", () => {
            render(<URLNodeConfig {...defaultProps} />);
            expect(screen.getByText("Scraping Options")).toBeInTheDocument();
        });

        it("renders Chunking Settings section", () => {
            render(<URLNodeConfig {...defaultProps} />);
            expect(screen.getByText("Chunking Settings")).toBeInTheDocument();
        });

        it("renders URL input", () => {
            render(<URLNodeConfig {...defaultProps} />);
            const input = screen.getByPlaceholderText("https://example.com");
            expect(input).toBeInTheDocument();
        });
    });

    describe("Default Values", () => {
        it("shows empty URL list by default", () => {
            render(<URLNodeConfig {...defaultProps} />);
            // Should not show any URL items initially
            const urlInput = screen.getByPlaceholderText("https://example.com");
            expect(urlInput).toHaveValue("");
        });

        it("shows html as default scraping mode", async () => {
            const user = userEvent.setup();
            render(<URLNodeConfig {...defaultProps} />);

            const scrapingButton = screen.getByText("Scraping Options");
            await user.click(scrapingButton);

            const selects = screen.getAllByTestId("select");
            expect(selects[0]).toHaveValue("html");
        });

        it("shows sentence as default chunking algorithm", async () => {
            const user = userEvent.setup();
            render(<URLNodeConfig {...defaultProps} />);

            const chunkingButton = screen.getByText("Chunking Settings");
            await user.click(chunkingButton);

            const selects = screen.getAllByTestId("select");
            // After expanding both sections, chunking select is at index 1
            expect(selects[0]).toHaveValue("sentence");
        });
    });

    describe("URL Management", () => {
        it("can add a valid URL", async () => {
            const user = userEvent.setup();
            render(<URLNodeConfig {...defaultProps} />);

            const input = screen.getByPlaceholderText("https://example.com");
            await user.type(input, "https://test.com");

            const addButton = screen.getByTestId("plus-icon").parentElement;
            await user.click(addButton!);

            await waitFor(() => {
                expect(screen.getByText("https://test.com")).toBeInTheDocument();
            });
        });

        it("can add URL by pressing Enter", async () => {
            const user = userEvent.setup();
            render(<URLNodeConfig {...defaultProps} />);

            const input = screen.getByPlaceholderText("https://example.com");
            await user.type(input, "https://test.com{enter}");

            await waitFor(() => {
                expect(screen.getByText("https://test.com")).toBeInTheDocument();
            });
        });

        it("clears input after adding URL", async () => {
            const user = userEvent.setup();
            render(<URLNodeConfig {...defaultProps} />);

            const input = screen.getByPlaceholderText("https://example.com");
            await user.type(input, "https://test.com{enter}");

            await waitFor(() => {
                expect(input).toHaveValue("");
            });
        });
    });

    describe("Scraping Options", () => {
        it("shows Scraping Mode options", async () => {
            const user = userEvent.setup();
            render(<URLNodeConfig {...defaultProps} />);

            const scrapingButton = screen.getByText("Scraping Options");
            await user.click(scrapingButton);

            const select = screen.getAllByTestId("select")[0];
            expect(select).toContainHTML("Page HTML");
            expect(select).toContainHTML("Text Only");
            expect(select).toContainHTML("Markdown");
        });

        it("shows Scrape Subpages toggle", async () => {
            const user = userEvent.setup();
            render(<URLNodeConfig {...defaultProps} />);

            const scrapingButton = screen.getByText("Scraping Options");
            await user.click(scrapingButton);

            expect(screen.getByText("Scrape Subpages")).toBeInTheDocument();
        });

        it("shows Follow Redirects toggle", async () => {
            const user = userEvent.setup();
            render(<URLNodeConfig {...defaultProps} />);

            const scrapingButton = screen.getByText("Scraping Options");
            await user.click(scrapingButton);

            expect(screen.getByText("Follow Redirects")).toBeInTheDocument();
        });

        it("shows Fetch Timeout slider", async () => {
            const user = userEvent.setup();
            render(<URLNodeConfig {...defaultProps} />);

            const scrapingButton = screen.getByText("Scraping Options");
            await user.click(scrapingButton);

            expect(screen.getByText("Fetch Timeout")).toBeInTheDocument();
            expect(screen.getByText("30")).toBeInTheDocument();
        });
    });

    describe("Chunking Settings", () => {
        it("shows Chunking Algorithm options", async () => {
            const user = userEvent.setup();
            render(<URLNodeConfig {...defaultProps} />);

            const chunkingButton = screen.getByText("Chunking Settings");
            await user.click(chunkingButton);

            const select = screen.getAllByTestId("select")[0];
            expect(select).toContainHTML("Sentence");
            expect(select).toContainHTML("Paragraph");
            expect(select).toContainHTML("Fixed Size");
            expect(select).toContainHTML("Semantic");
        });

        it("shows Chunk Overlap slider", async () => {
            const user = userEvent.setup();
            render(<URLNodeConfig {...defaultProps} />);

            const chunkingButton = screen.getByText("Chunking Settings");
            await user.click(chunkingButton);

            expect(screen.getByText("Chunk Overlap")).toBeInTheDocument();
            expect(screen.getByText("1000")).toBeInTheDocument();
        });

        it("shows Chunk Length slider", async () => {
            const user = userEvent.setup();
            render(<URLNodeConfig {...defaultProps} />);

            const chunkingButton = screen.getByText("Chunking Settings");
            await user.click(chunkingButton);

            expect(screen.getByText("Chunk Length")).toBeInTheDocument();
            expect(screen.getByText("2500")).toBeInTheDocument();
        });

        it("shows Advanced Data Extraction toggle", async () => {
            const user = userEvent.setup();
            render(<URLNodeConfig {...defaultProps} />);

            const chunkingButton = screen.getByText("Chunking Settings");
            await user.click(chunkingButton);

            expect(screen.getByText("Advanced Data Extraction")).toBeInTheDocument();
        });

        it("shows Text in images (OCR) toggle", async () => {
            const user = userEvent.setup();
            render(<URLNodeConfig {...defaultProps} />);

            const chunkingButton = screen.getByText("Chunking Settings");
            await user.click(chunkingButton);

            expect(screen.getByText("Text in images (OCR)")).toBeInTheDocument();
        });
    });

    describe("Preset Data", () => {
        it("loads existing URLs from data", () => {
            render(
                <URLNodeConfig
                    {...defaultProps}
                    data={{ urls: ["https://example.com", "https://test.com"] }}
                />
            );

            expect(screen.getByText("https://example.com")).toBeInTheDocument();
            expect(screen.getByText("https://test.com")).toBeInTheDocument();
        });

        it("loads existing scraping mode from data", async () => {
            const user = userEvent.setup();
            render(<URLNodeConfig {...defaultProps} data={{ scrapingMode: "markdown" }} />);

            const scrapingButton = screen.getByText("Scraping Options");
            await user.click(scrapingButton);

            const select = screen.getAllByTestId("select")[0];
            expect(select).toHaveValue("markdown");
        });

        it("loads existing timeout from data", async () => {
            const user = userEvent.setup();
            render(<URLNodeConfig {...defaultProps} data={{ timeout: 45 }} />);

            const scrapingButton = screen.getByText("Scraping Options");
            await user.click(scrapingButton);

            expect(screen.getByText("45")).toBeInTheDocument();
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when URL is added", async () => {
            const user = userEvent.setup();
            render(<URLNodeConfig {...defaultProps} />);

            const input = screen.getByPlaceholderText("https://example.com");
            await user.type(input, "https://test.com{enter}");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.urls).toContain("https://test.com");
        });

        it("calls onUpdate when scraping mode changes", async () => {
            const user = userEvent.setup();
            render(<URLNodeConfig {...defaultProps} />);

            const scrapingButton = screen.getByText("Scraping Options");
            await user.click(scrapingButton);

            const select = screen.getAllByTestId("select")[0];
            await user.selectOptions(select, "text");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.scrapingMode).toBe("text");
        });

        it("does not call onUpdate on initial render", () => {
            render(<URLNodeConfig {...defaultProps} />);
            expect(mockOnUpdate).not.toHaveBeenCalled();
        });
    });

    describe("URL Removal", () => {
        it("can remove a URL from the list", async () => {
            const user = userEvent.setup();
            render(<URLNodeConfig {...defaultProps} data={{ urls: ["https://example.com"] }} />);

            expect(screen.getByText("https://example.com")).toBeInTheDocument();

            const removeButton = screen.getByText("×");
            await user.click(removeButton);

            await waitFor(() => {
                expect(screen.queryByText("https://example.com")).not.toBeInTheDocument();
            });
        });
    });

    describe("API Documentation Link", () => {
        it("shows link to learn more about API", () => {
            render(<URLNodeConfig {...defaultProps} />);
            expect(screen.getByText("How to fetch URLs via API?")).toBeInTheDocument();
            expect(screen.getByText("Learn more")).toBeInTheDocument();
        });
    });
});
