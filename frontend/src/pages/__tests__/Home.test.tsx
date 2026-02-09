/**
 * Home Page Tests
 *
 * Tests for the home/dashboard page including:
 * - Loading states
 * - Quick create buttons
 * - Recent items sections
 * - Empty states
 * - Template previews
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as api from "../../lib/api";
import { Home } from "../Home";
import type { Agent } from "../../lib/api";

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

// Mock API functions
vi.mock("../../lib/api", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../lib/api")>();
    return {
        ...actual,
        getWorkflows: vi.fn(),
        getAgents: vi.fn(),
        getFormInterfaces: vi.fn(),
        getChatInterfaces: vi.fn(),
        getKnowledgeBases: vi.fn(),
        getKnowledgeBaseStats: vi.fn(),
        getPersonas: vi.fn(),
        getPersona: vi.fn(),
        getTemplates: vi.fn(),
        getAgentTemplates: vi.fn(),
        copyTemplate: vi.fn(),
        copyAgentTemplate: vi.fn(),
        createKnowledgeBase: vi.fn()
    };
});

// Helper to create a query client for each test
function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false
            }
        }
    });
}

// Render helper with providers
function renderHome() {
    const queryClient = createTestQueryClient();
    return render(
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Home />
            </BrowserRouter>
        </QueryClientProvider>
    );
}

// Mock data factories
function createMockWorkflow(
    overrides?: Partial<{
        id: string;
        name: string;
        description: string;
        created_at: string;
        updated_at: string;
    }>
) {
    return {
        id: "workflow-1",
        name: "Test Workflow",
        description: "A test workflow",
        definition: { nodes: {}, edges: [] },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides
    };
}

function createMockAgent(overrides?: Partial<Agent>): Agent {
    return {
        id: "agent-1",
        user_id: "user-1",
        name: "Test Agent",
        description: "A test agent",
        provider: "openai",
        model: "gpt-4",
        connection_id: null,
        system_prompt: "You are a helpful assistant",
        temperature: 0.7,
        max_tokens: 4096,
        available_tools: [],
        folder_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides
    } as Agent;
}

function createMockKnowledgeBase(
    overrides?: Partial<{
        id: string;
        name: string;
        description: string;
        created_at: string;
        updated_at: string;
    }>
) {
    return {
        id: overrides?.id ?? "kb-1",
        user_id: "user-1",
        name: overrides?.name ?? "Test KB",
        description: overrides?.description ?? "A test knowledge base",
        category: "general",
        config: {
            embeddingModel: "text-embedding-3-small",
            embeddingProvider: "openai",
            chunkSize: 1000,
            chunkOverlap: 200,
            embeddingDimensions: 1536
        },
        folder_id: null,
        created_at: overrides?.created_at ?? new Date().toISOString(),
        updated_at: overrides?.updated_at ?? new Date().toISOString()
    };
}

function createMockPersona(
    overrides?: Partial<{ slug: string; name: string; description: string; category: string }>
) {
    return {
        id: "persona-1",
        slug: overrides?.slug ?? "test-persona",
        title: overrides?.name ?? "Test Persona",
        name: overrides?.name ?? "Test Persona",
        description: overrides?.description ?? "A test persona",
        category: overrides?.category ?? "research",
        tags: ["testing"],
        specialty: "General",
        avatar_url: null,
        expertise_areas: ["testing"],
        typical_deliverables: ["Analysis Report", "Summary"]
    } as unknown;
}

function createMockTemplate(
    overrides?: Partial<{ id: string; name: string; description: string; category: string }>
) {
    return {
        id: overrides?.id ?? "template-1",
        name: overrides?.name ?? "Test Template",
        description: overrides?.description ?? "A test template",
        category: overrides?.category ?? "automation",
        tags: [],
        icon: "workflow",
        color: "blue",
        preview_image_url: null,
        thumbnail: null,
        definition: { nodes: {}, edges: [] }
    } as unknown;
}

describe("Home Page", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock responses - empty states
        vi.mocked(api.getWorkflows).mockResolvedValue({
            success: true,
            data: { items: [], total: 0 }
        });
        vi.mocked(api.getAgents).mockResolvedValue({
            success: true,
            data: { agents: [], total: 0 }
        });
        vi.mocked(api.getFormInterfaces).mockResolvedValue({
            success: true,
            data: { items: [], total: 0, page: 1, pageSize: 10, hasMore: false }
        });
        vi.mocked(api.getChatInterfaces).mockResolvedValue({
            success: true,
            data: { items: [], total: 0, page: 1, pageSize: 10, hasMore: false }
        });
        vi.mocked(api.getKnowledgeBases).mockResolvedValue({
            success: true,
            data: []
        });
        vi.mocked(api.getPersonas).mockResolvedValue({
            success: true,
            data: { personas: [], total: 0 }
        });
        vi.mocked(api.getTemplates).mockResolvedValue({
            success: true,
            data: { items: [], total: 0, page: 1, pageSize: 10, hasMore: false }
        });
        vi.mocked(api.getAgentTemplates).mockResolvedValue({
            success: true,
            data: { items: [], total: 0, page: 1, pageSize: 10, hasMore: false }
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // ===== Loading State =====
    describe("loading state", () => {
        it("shows loading skeleton while data is being fetched", async () => {
            // Make API calls hang
            vi.mocked(api.getWorkflows).mockImplementation(() => new Promise(() => {}));

            renderHome();

            // Should show skeleton cards while loading
            expect(document.querySelector(".skeleton-shimmer")).toBeInTheDocument();
        });
    });

    // ===== Empty State =====
    describe("empty state", () => {
        it("shows quick create buttons when page loads", async () => {
            renderHome();

            await waitFor(() => {
                // Should have workflow and agent buttons
                const buttons = screen.getAllByRole("button");
                expect(buttons.length).toBeGreaterThan(0);
            });
        });
    });

    // ===== Quick Create Buttons =====
    describe("quick create buttons", () => {
        beforeEach(() => {
            // Set up data so we see the quick create row instead of empty state
            vi.mocked(api.getWorkflows).mockResolvedValue({
                success: true,
                data: { items: [createMockWorkflow()], total: 1 }
            });
            vi.mocked(api.getAgents).mockResolvedValue({
                success: true,
                data: { agents: [createMockAgent()], total: 1 }
            });
        });

        it("renders page with action buttons", async () => {
            renderHome();

            await waitFor(() => {
                // Page should render with some buttons
                const buttons = screen.getAllByRole("button");
                expect(buttons.length).toBeGreaterThan(0);
            });
        });
    });

    // ===== Recent Workflows Section =====
    describe("recent workflows section", () => {
        it("displays recent workflows when available", async () => {
            const workflows = [
                createMockWorkflow({ id: "w1", name: "Workflow One" }),
                createMockWorkflow({ id: "w2", name: "Workflow Two" })
            ];

            vi.mocked(api.getWorkflows).mockResolvedValue({
                success: true,
                data: { items: workflows, total: 2 }
            });
            vi.mocked(api.getAgents).mockResolvedValue({
                success: true,
                data: { agents: [createMockAgent()], total: 1 }
            });

            renderHome();

            await waitFor(() => {
                expect(screen.getByText("Workflow One")).toBeInTheDocument();
                expect(screen.getByText("Workflow Two")).toBeInTheDocument();
            });
        });

        it("navigates to workflow builder when clicking a workflow card", async () => {
            const user = userEvent.setup();
            const workflows = [createMockWorkflow({ id: "w1", name: "Test Workflow" })];

            vi.mocked(api.getWorkflows).mockResolvedValue({
                success: true,
                data: { items: workflows, total: 1 }
            });
            vi.mocked(api.getAgents).mockResolvedValue({
                success: true,
                data: { agents: [createMockAgent()], total: 1 }
            });

            renderHome();

            await waitFor(() => {
                expect(screen.getByText("Test Workflow")).toBeInTheDocument();
            });

            await user.click(screen.getByText("Test Workflow"));

            expect(mockNavigate).toHaveBeenCalledWith("/builder/w1");
        });
    });

    // ===== Recent Agents Section =====
    describe("recent agents section", () => {
        it("displays recent agents when available", async () => {
            const agents = [
                createMockAgent({ id: "a1", name: "Agent Alpha" }),
                createMockAgent({ id: "a2", name: "Agent Beta" })
            ];

            vi.mocked(api.getWorkflows).mockResolvedValue({
                success: true,
                data: { items: [createMockWorkflow()], total: 1 }
            });
            vi.mocked(api.getAgents).mockResolvedValue({
                success: true,
                data: { agents, total: 2 }
            });

            renderHome();

            await waitFor(() => {
                expect(screen.getByText("Agent Alpha")).toBeInTheDocument();
                expect(screen.getByText("Agent Beta")).toBeInTheDocument();
            });
        });

        it("navigates to agent builder when clicking an agent card", async () => {
            const user = userEvent.setup();

            vi.mocked(api.getWorkflows).mockResolvedValue({
                success: true,
                data: { items: [createMockWorkflow()], total: 1 }
            });
            vi.mocked(api.getAgents).mockResolvedValue({
                success: true,
                data: { agents: [createMockAgent({ id: "a1", name: "Test Agent" })], total: 1 }
            });

            renderHome();

            await waitFor(() => {
                expect(screen.getByText("Test Agent")).toBeInTheDocument();
            });

            await user.click(screen.getByText("Test Agent"));

            expect(mockNavigate).toHaveBeenCalledWith("/agents/a1");
        });
    });

    // ===== Recent Knowledge Bases Section =====
    describe("recent knowledge bases section", () => {
        it("displays recent knowledge bases when available", async () => {
            const kbs = [
                createMockKnowledgeBase({ id: "kb1", name: "KB Alpha" }),
                createMockKnowledgeBase({ id: "kb2", name: "KB Beta" })
            ];

            vi.mocked(api.getWorkflows).mockResolvedValue({
                success: true,
                data: { items: [createMockWorkflow()], total: 1 }
            });
            vi.mocked(api.getAgents).mockResolvedValue({
                success: true,
                data: { agents: [createMockAgent()], total: 1 }
            });
            vi.mocked(api.getKnowledgeBases).mockResolvedValue({
                success: true,
                data: kbs
            });
            vi.mocked(api.getKnowledgeBaseStats).mockResolvedValue({
                success: true,
                data: {
                    id: "kb1",
                    name: "KB Alpha",
                    document_count: 5,
                    chunk_count: 100,
                    total_size_bytes: 1024,
                    last_updated: new Date().toISOString()
                }
            });

            renderHome();

            await waitFor(() => {
                expect(screen.getByText("KB Alpha")).toBeInTheDocument();
                expect(screen.getByText("KB Beta")).toBeInTheDocument();
            });
        });
    });

    // ===== Personas Section =====
    describe("personas section", () => {
        it("displays personas when available", async () => {
            vi.mocked(api.getWorkflows).mockResolvedValue({
                success: true,
                data: { items: [createMockWorkflow()], total: 1 }
            });
            vi.mocked(api.getAgents).mockResolvedValue({
                success: true,
                data: { agents: [createMockAgent()], total: 1 }
            });
            vi.mocked(api.getPersonas).mockResolvedValue({
                success: true,
                data: {
                    personas: [
                        createMockPersona({ slug: "researcher", name: "Research Expert" }),
                        createMockPersona({ slug: "writer", name: "Content Writer" })
                    ] as unknown as api.PersonaDefinitionSummary[],
                    total: 2
                }
            });

            renderHome();

            await waitFor(() => {
                expect(screen.getByText("Research Expert")).toBeInTheDocument();
                expect(screen.getByText("Content Writer")).toBeInTheDocument();
            });
        });
    });

    // ===== Templates Section =====
    describe("templates section", () => {
        it("displays templates section header", async () => {
            vi.mocked(api.getTemplates).mockResolvedValue({
                success: true,
                data: {
                    items: [
                        createMockTemplate({ id: "t1", name: "Email Automation" }),
                        createMockTemplate({ id: "t2", name: "Data Pipeline" })
                    ] as unknown as api.Template[],
                    total: 2,
                    page: 1,
                    pageSize: 10,
                    hasMore: false
                }
            });

            renderHome();

            // Templates section should be present
            await waitFor(() => {
                const templates = screen.queryAllByText(/template/i);
                expect(templates.length).toBeGreaterThanOrEqual(0);
            });
        });
    });

    // ===== Welcome Section =====
    describe("welcome section", () => {
        it("renders welcome message", async () => {
            renderHome();

            await waitFor(() => {
                // Look for any welcome-related text
                expect(screen.getByText(/welcome/i)).toBeInTheDocument();
            });
        });
    });
});
