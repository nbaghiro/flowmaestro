/**
 * KnowledgeBaseQueryNodeConfig component tests
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { KnowledgeBaseQueryNodeConfig } from "../../configs/KnowledgeBaseQueryNodeConfig";

// Mock the API
vi.mock("../../../../lib/api", () => ({
    getKnowledgeBases: vi.fn(() =>
        Promise.resolve({
            data: [
                { id: "kb-1", name: "Product Documentation" },
                { id: "kb-2", name: "Customer FAQs" }
            ]
        })
    )
}));

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
        <input
            data-testid="output-variable"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    )
}));

// Helper to wrap component with QueryClientProvider
function renderWithQueryClient(ui: React.ReactElement) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false
            }
        }
    });
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("KnowledgeBaseQueryNodeConfig", () => {
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
        it("renders Knowledge Base section", async () => {
            renderWithQueryClient(<KnowledgeBaseQueryNodeConfig {...defaultProps} />);
            await waitFor(() => {
                expect(screen.getByTestId("form-section-knowledge-base")).toBeInTheDocument();
            });
        });

        it("renders Query section", async () => {
            renderWithQueryClient(<KnowledgeBaseQueryNodeConfig {...defaultProps} />);
            await waitFor(() => {
                expect(screen.getByTestId("form-section-query")).toBeInTheDocument();
            });
        });

        it("renders Output section", async () => {
            renderWithQueryClient(<KnowledgeBaseQueryNodeConfig {...defaultProps} />);
            await waitFor(() => {
                expect(screen.getByTestId("form-section-output")).toBeInTheDocument();
            });
        });

        it("renders Select Knowledge Base field", async () => {
            renderWithQueryClient(<KnowledgeBaseQueryNodeConfig {...defaultProps} />);
            await waitFor(() => {
                expect(screen.getByText("Select Knowledge Base")).toBeInTheDocument();
            });
        });

        it("renders Query Text field", async () => {
            renderWithQueryClient(<KnowledgeBaseQueryNodeConfig {...defaultProps} />);
            await waitFor(() => {
                expect(screen.getByText("Query Text")).toBeInTheDocument();
            });
        });
    });

    describe("Knowledge Base Selection", () => {
        it("shows available knowledge bases in select", async () => {
            renderWithQueryClient(<KnowledgeBaseQueryNodeConfig {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText("Product Documentation")).toBeInTheDocument();
            });
            expect(screen.getByText("Customer FAQs")).toBeInTheDocument();
        });

        it("shows placeholder option in select", async () => {
            renderWithQueryClient(<KnowledgeBaseQueryNodeConfig {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText("Select a knowledge base...")).toBeInTheDocument();
            });
        });
    });

    describe("Output Information", () => {
        it("shows results output info", async () => {
            renderWithQueryClient(<KnowledgeBaseQueryNodeConfig {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText(/Array of all matches/)).toBeInTheDocument();
            });
        });

        it("shows topResult output info", async () => {
            renderWithQueryClient(<KnowledgeBaseQueryNodeConfig {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText(/Best match/)).toBeInTheDocument();
            });
        });

        it("shows combinedText output info", async () => {
            renderWithQueryClient(<KnowledgeBaseQueryNodeConfig {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText(/Formatted text for prompts/)).toBeInTheDocument();
            });
        });

        it("shows count output info", async () => {
            renderWithQueryClient(<KnowledgeBaseQueryNodeConfig {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText(/Number of results/)).toBeInTheDocument();
            });
        });
    });

    describe("Preset Data", () => {
        it("loads existing knowledge base ID from data", async () => {
            renderWithQueryClient(
                <KnowledgeBaseQueryNodeConfig
                    {...defaultProps}
                    data={{ knowledgeBaseId: "kb-1" }}
                />
            );

            await waitFor(() => {
                const select = screen.getByTestId("select");
                expect(select).toHaveValue("kb-1");
            });
        });

        it("loads existing query text from data", async () => {
            renderWithQueryClient(
                <KnowledgeBaseQueryNodeConfig
                    {...defaultProps}
                    data={{ queryText: "What is the return policy?" }}
                />
            );

            await waitFor(() => {
                const textarea = screen.getByTestId("textarea");
                expect(textarea).toHaveValue("What is the return policy?");
            });
        });
    });

    describe("State Updates", () => {
        it("calls onUpdate when KB data loads", async () => {
            renderWithQueryClient(<KnowledgeBaseQueryNodeConfig {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByTestId("select")).toBeInTheDocument();
            });

            // onUpdate is called once after KB data loads due to the useEffect dependency
            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });
        });

        it("calls onUpdate when knowledge base changes", async () => {
            const user = userEvent.setup();
            renderWithQueryClient(<KnowledgeBaseQueryNodeConfig {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText("Product Documentation")).toBeInTheDocument();
            });

            const select = screen.getByTestId("select");
            await user.selectOptions(select, "kb-1");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.knowledgeBaseId).toBe("kb-1");
        });

        it("calls onUpdate when query text changes", async () => {
            const user = userEvent.setup();
            renderWithQueryClient(<KnowledgeBaseQueryNodeConfig {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByTestId("textarea")).toBeInTheDocument();
            });

            const textarea = screen.getByTestId("textarea");
            await user.type(textarea, "How does this work?");

            await waitFor(() => {
                expect(mockOnUpdate).toHaveBeenCalled();
            });

            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.queryText).toContain("How does this work?");
        });
    });

    describe("Tips", () => {
        it("shows variable usage tip", async () => {
            renderWithQueryClient(<KnowledgeBaseQueryNodeConfig {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText(/Use variables like/)).toBeInTheDocument();
            });
        });
    });
});
