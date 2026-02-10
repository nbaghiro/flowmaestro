/**
 * Personas Page Tests
 *
 * Tests for the personas catalog page including:
 * - Persona grid display
 * - Category filtering
 * - Search functionality
 * - Detail modal
 * - Launch dialog
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as api from "../../lib/api";
import { usePersonaStore } from "../../stores/personaStore";
import { Personas } from "../Personas";
import type { PersonaCategory, PersonaDefinitionSummary, PersonaDefinition } from "../../lib/api";

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

// Mock stores
vi.mock("../../stores/personaStore");

// Mock API
vi.mock("../../lib/api", () => ({
    getPersona: vi.fn()
}));

// Mock data factory
function createMockPersonaSummary(
    overrides?: Partial<{
        id: string;
        slug: string;
        name: string;
        description: string;
        category: PersonaCategory;
        expertise_areas: string[];
    }>
): PersonaDefinitionSummary {
    const slug = overrides?.slug ?? "test-persona";
    return {
        id: overrides?.id ?? `persona-${slug}`,
        slug,
        name: overrides?.name ?? "Test Persona",
        description: overrides?.description ?? "A test persona description",
        category: overrides?.category ?? ("research" as PersonaCategory),
        expertise_areas: overrides?.expertise_areas ?? ["testing", "analysis"],
        typical_deliverables: ["Analysis Report", "Summary Document"],
        avatar_url: null
    } as unknown as PersonaDefinitionSummary;
}

function createMockPersonaFull(
    overrides?: Partial<{
        slug: string;
        name: string;
        description: string;
        category: PersonaCategory;
    }>
) {
    const slug = overrides?.slug ?? "test-persona";
    return {
        id: `persona-${slug}`,
        slug,
        name: overrides?.name ?? "Test Persona",
        description: overrides?.description ?? "A test persona description",
        category: overrides?.category ?? ("research" as PersonaCategory),
        expertise_areas: ["testing"],
        typical_deliverables: ["Analysis Report", "Summary Document"],
        full_description: "Full description here",
        capabilities: ["Can do this", "Can do that"],
        example_tasks: ["Example task 1", "Example task 2"],
        inputs: [],
        outputs: [],
        agent_config: {},
        avatar_url: null
    } as unknown;
}

// Create base persona store state for mocking
function createPersonaStoreState(overrides?: {
    personasByCategory?: Record<PersonaCategory, PersonaDefinitionSummary[]>;
    isLoadingPersonas?: boolean;
    personasError?: string | null;
    needsAttentionCount?: number;
}) {
    const emptyCategories: Record<PersonaCategory, PersonaDefinitionSummary[]> = {
        research: [],
        content: [],
        development: [],
        data: [],
        operations: [],
        business: [],
        proposals: []
    };

    return {
        personasByCategory: overrides?.personasByCategory ?? emptyCategories,
        isLoadingPersonas: overrides?.isLoadingPersonas ?? false,
        personasError: overrides?.personasError ?? null,
        fetchPersonasByCategory: vi.fn(),
        needsAttentionCount: overrides?.needsAttentionCount ?? 0,
        fetchNeedsAttentionCount: vi.fn(),
        customAvatars: {},
        currentInstance: null,
        instances: [],
        isLoadingInstances: false,
        instancesError: null,
        fetchInstances: vi.fn(),
        fetchInstance: vi.fn(),
        sendMessage: vi.fn(),
        cancelInstance: vi.fn(),
        completeInstance: vi.fn(),
        deleteInstance: vi.fn(),
        createInstance: vi.fn()
    } as unknown as ReturnType<typeof usePersonaStore>;
}

// Helper to reset stores
function resetStores(personaStoreOverrides?: Parameters<typeof createPersonaStoreState>[0]) {
    vi.mocked(usePersonaStore).mockReturnValue(createPersonaStoreState(personaStoreOverrides));

    vi.mocked(api.getPersona).mockResolvedValue({
        success: true,
        data: createMockPersonaFull() as unknown as PersonaDefinition
    });
}

// Render helper
function renderPersonas() {
    return render(
        <BrowserRouter>
            <Personas />
        </BrowserRouter>
    );
}

describe("Personas Page", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStores();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // ===== Rendering =====
    describe("rendering", () => {
        it("renders page header with title", () => {
            renderPersonas();

            expect(screen.getByText("Personas")).toBeInTheDocument();
        });

        it("renders page description", () => {
            renderPersonas();

            expect(screen.getByText(/pre-built ai specialists/i)).toBeInTheDocument();
        });

        it("renders search input", () => {
            renderPersonas();

            expect(screen.getByPlaceholderText(/search personas/i)).toBeInTheDocument();
        });

        it("renders category filter dropdown", () => {
            renderPersonas();

            expect(screen.getByText(/all categories/i)).toBeInTheDocument();
        });

        it("renders My Active Tasks button", () => {
            renderPersonas();

            expect(screen.getByRole("button", { name: /my active tasks/i })).toBeInTheDocument();
        });
    });

    // ===== Loading State =====
    describe("loading state", () => {
        it("shows loading skeleton while personas are being fetched", () => {
            resetStores({ isLoadingPersonas: true });

            renderPersonas();

            expect(document.querySelector(".skeleton-shimmer")).toBeInTheDocument();
        });
    });

    // ===== Empty State =====
    describe("empty state", () => {
        it("shows no personas message when no personas exist", () => {
            renderPersonas();

            expect(screen.getByText(/no personas found/i)).toBeInTheDocument();
        });
    });

    // ===== Persona List =====
    describe("persona list", () => {
        it("displays personas by category", () => {
            const personasByCategory: Record<PersonaCategory, PersonaDefinitionSummary[]> = {
                research: [
                    createMockPersonaSummary({
                        slug: "researcher",
                        name: "Research Expert",
                        category: "research"
                    })
                ],
                content: [
                    createMockPersonaSummary({
                        slug: "writer",
                        name: "Content Writer",
                        category: "content"
                    })
                ],
                development: [],
                data: [],
                operations: [],
                business: [],
                proposals: []
            };

            resetStores({ personasByCategory, isLoadingPersonas: false });

            renderPersonas();

            expect(screen.getByText("Research Expert")).toBeInTheDocument();
            expect(screen.getByText("Content Writer")).toBeInTheDocument();
        });

        it("displays category headers", () => {
            const personasByCategory: Record<PersonaCategory, PersonaDefinitionSummary[]> = {
                research: [createMockPersonaSummary({ category: "research" })],
                content: [],
                development: [],
                data: [],
                operations: [],
                business: [],
                proposals: []
            };

            resetStores({ personasByCategory, isLoadingPersonas: false });

            renderPersonas();

            expect(screen.getByText(/research & analysis/i)).toBeInTheDocument();
        });
    });

    // ===== Search =====
    describe("search functionality", () => {
        it("filters personas based on search query", async () => {
            const user = userEvent.setup();
            const personasByCategory: Record<PersonaCategory, PersonaDefinitionSummary[]> = {
                research: [
                    createMockPersonaSummary({
                        slug: "alpha",
                        name: "Alpha Researcher",
                        category: "research"
                    }),
                    createMockPersonaSummary({
                        slug: "beta",
                        name: "Beta Analyst",
                        category: "research"
                    })
                ],
                content: [],
                development: [],
                data: [],
                operations: [],
                business: [],
                proposals: []
            };

            resetStores({ personasByCategory, isLoadingPersonas: false });

            renderPersonas();

            expect(screen.getByText("Alpha Researcher")).toBeInTheDocument();
            expect(screen.getByText("Beta Analyst")).toBeInTheDocument();

            const searchInput = screen.getByPlaceholderText(/search personas/i);
            await user.type(searchInput, "Alpha");

            await waitFor(() => {
                expect(screen.getByText("Alpha Researcher")).toBeInTheDocument();
                expect(screen.queryByText("Beta Analyst")).not.toBeInTheDocument();
            });
        });

        it("searches by expertise areas", async () => {
            const user = userEvent.setup();
            const personasByCategory: Record<PersonaCategory, PersonaDefinitionSummary[]> = {
                research: [
                    createMockPersonaSummary({
                        slug: "expert",
                        name: "Expert",
                        expertise_areas: ["machine learning"]
                    })
                ],
                content: [],
                development: [],
                data: [],
                operations: [],
                business: [],
                proposals: []
            };

            resetStores({ personasByCategory, isLoadingPersonas: false });

            renderPersonas();

            const searchInput = screen.getByPlaceholderText(/search personas/i);
            await user.type(searchInput, "machine learning");

            await waitFor(() => {
                expect(screen.getByText("Expert")).toBeInTheDocument();
            });
        });

        it("shows no results when search has no matches", async () => {
            const user = userEvent.setup();
            const personasByCategory: Record<PersonaCategory, PersonaDefinitionSummary[]> = {
                research: [createMockPersonaSummary()],
                content: [],
                development: [],
                data: [],
                operations: [],
                business: [],
                proposals: []
            };

            resetStores({ personasByCategory, isLoadingPersonas: false });

            renderPersonas();

            const searchInput = screen.getByPlaceholderText(/search personas/i);
            await user.type(searchInput, "nonexistent123xyz");

            await waitFor(() => {
                expect(screen.getByText(/no personas found/i)).toBeInTheDocument();
            });
        });
    });

    // ===== Category Filter =====
    describe("category filter", () => {
        it("renders category dropdown with All Categories option", () => {
            const personasByCategory: Record<PersonaCategory, PersonaDefinitionSummary[]> = {
                research: [createMockPersonaSummary({ name: "Researcher", category: "research" })],
                content: [createMockPersonaSummary({ name: "Writer", category: "content" })],
                development: [],
                data: [],
                operations: [],
                business: [],
                proposals: []
            };

            resetStores({ personasByCategory, isLoadingPersonas: false });

            renderPersonas();

            // Verify all personas shown initially (all categories mode)
            expect(screen.getByText("Researcher")).toBeInTheDocument();
            expect(screen.getByText("Writer")).toBeInTheDocument();
            expect(screen.getByText(/all categories/i)).toBeInTheDocument();
        });
    });

    // ===== Detail Modal =====
    describe("detail modal", () => {
        it("opens detail modal when clicking a persona card", async () => {
            const user = userEvent.setup();
            const personasByCategory: Record<PersonaCategory, PersonaDefinitionSummary[]> = {
                research: [createMockPersonaSummary({ slug: "test", name: "Test Persona" })],
                content: [],
                development: [],
                data: [],
                operations: [],
                business: [],
                proposals: []
            };

            resetStores({ personasByCategory, isLoadingPersonas: false });

            renderPersonas();

            await user.click(screen.getByText("Test Persona"));

            await waitFor(() => {
                expect(api.getPersona).toHaveBeenCalledWith("test");
            });
        });

        it("fetches full persona data when opening modal", async () => {
            const user = userEvent.setup();
            const personasByCategory: Record<PersonaCategory, PersonaDefinitionSummary[]> = {
                research: [createMockPersonaSummary({ slug: "detail-test", name: "Detail Test" })],
                content: [],
                development: [],
                data: [],
                operations: [],
                business: [],
                proposals: []
            };

            resetStores({ personasByCategory, isLoadingPersonas: false });

            vi.mocked(api.getPersona).mockResolvedValue({
                success: true,
                data: createMockPersonaFull({
                    slug: "detail-test",
                    name: "Detail Test"
                }) as unknown as PersonaDefinition
            });

            renderPersonas();

            await user.click(screen.getByText("Detail Test"));

            await waitFor(() => {
                expect(api.getPersona).toHaveBeenCalledWith("detail-test");
            });
        });
    });

    // ===== Navigation =====
    describe("navigation", () => {
        it("navigates to persona instances when clicking My Active Tasks", async () => {
            const user = userEvent.setup();
            renderPersonas();

            await user.click(screen.getByRole("button", { name: /my active tasks/i }));

            expect(mockNavigate).toHaveBeenCalledWith("/persona-instances");
        });

        it("shows needs attention badge when count is greater than 0", () => {
            resetStores({ needsAttentionCount: 5 });

            renderPersonas();

            expect(screen.getByText("5")).toBeInTheDocument();
        });
    });

    // ===== Error State =====
    describe("error state", () => {
        it("displays error message when there is an error", () => {
            resetStores({ isLoadingPersonas: false, personasError: "Failed to load personas" });

            renderPersonas();

            expect(screen.getByText(/failed to load personas/i)).toBeInTheDocument();
        });
    });
});
