/**
 * PersonaInstanceView Page Tests
 *
 * Tests for the persona instance viewer page including:
 * - Instance status display
 * - Message history
 * - Send message input
 * - Cancel/complete actions
 * - Progress indicators
 * - Deliverables
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePersonaStore } from "../../stores/personaStore";
import { PersonaInstanceView } from "../PersonaInstanceView";
import type { PersonaInstance, PersonaCategory } from "../../lib/api";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ id: "instance-123" })
    };
});

// Mock stores
vi.mock("../../stores/personaStore");

// Mock data factory
function createMockPersonaInstance(
    overrides?: Partial<{
        id: string;
        status: PersonaInstance["status"];
        task_description: string;
        task_title: string;
        persona_slug: string;
        persona_name: string;
        messages: Array<{ role: string; content: string }>;
        progress: PersonaInstance["progress"];
        deliverables: PersonaInstance["deliverables"];
        duration_seconds: number;
        accumulated_cost_credits: number;
    }>
): PersonaInstance {
    return {
        id: overrides?.id ?? "instance-123",
        status: overrides?.status ?? "running",
        task_description: overrides?.task_description ?? "Test task description",
        task_title: overrides?.task_title ?? "Test Task",
        persona_slug: overrides?.persona_slug ?? "researcher",
        // Component uses persona.name, not persona_name
        persona: {
            name: overrides?.persona_name ?? "Research Expert",
            slug: overrides?.persona_slug ?? "researcher",
            category: "research",
            avatar_url: null
        },
        messages: overrides?.messages ?? [],
        progress: overrides?.progress ?? {
            current_step: 1,
            current_step_name: "Processing",
            total_steps: 5,
            percentage: 20,
            message: "Processing...",
            steps: []
        },
        deliverables: overrides?.deliverables ?? [],
        duration_seconds: overrides?.duration_seconds ?? 120,
        accumulated_cost_credits: overrides?.accumulated_cost_credits ?? 50,
        max_duration_hours: 2,
        max_cost_credits: 500,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        additional_context: {}
    } as unknown as PersonaInstance;
}

// Create base persona store state for mocking
function createPersonaStoreState(overrides?: {
    currentInstance?: PersonaInstance | null;
    isLoadingInstances?: boolean;
    instancesError?: string | null;
    sendMessage?: ReturnType<typeof vi.fn>;
}) {
    return {
        currentInstance: overrides?.currentInstance ?? null,
        isLoadingInstances: overrides?.isLoadingInstances ?? false,
        instancesError: overrides?.instancesError ?? null,
        fetchInstance: vi.fn(),
        sendMessage: overrides?.sendMessage ?? vi.fn().mockResolvedValue(undefined),
        cancelInstance: vi.fn().mockResolvedValue(undefined),
        completeInstance: vi.fn().mockResolvedValue(undefined),
        deleteInstance: vi.fn().mockResolvedValue(undefined),
        instances: [],
        fetchInstances: vi.fn(),
        createInstance: vi.fn(),
        personasByCategory: {} as Record<PersonaCategory, unknown[]>,
        isLoadingPersonas: false,
        personasError: null,
        fetchPersonasByCategory: vi.fn(),
        needsAttentionCount: 0,
        fetchNeedsAttentionCount: vi.fn()
    } as unknown as ReturnType<typeof usePersonaStore>;
}

// Helper to reset stores
function resetStores(personaStoreOverrides?: Parameters<typeof createPersonaStoreState>[0]) {
    vi.mocked(usePersonaStore).mockReturnValue(createPersonaStoreState(personaStoreOverrides));
}

// Render helper
function renderPersonaInstanceView() {
    return render(
        <BrowserRouter>
            <PersonaInstanceView />
        </BrowserRouter>
    );
}

describe("PersonaInstanceView Page", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStores();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // ===== Loading State =====
    describe("loading state", () => {
        it("shows loading spinner while instance is being fetched", () => {
            resetStores({ isLoadingInstances: true, currentInstance: null });

            renderPersonaInstanceView();

            expect(document.querySelector(".animate-spin")).toBeInTheDocument();
        });
    });

    // ===== Error State =====
    describe("error state", () => {
        it("shows error message when there is an error", () => {
            resetStores({
                isLoadingInstances: false,
                instancesError: "Failed to load instance",
                currentInstance: null
            });

            renderPersonaInstanceView();

            expect(screen.getByText(/error loading task/i)).toBeInTheDocument();
            expect(screen.getByText(/failed to load instance/i)).toBeInTheDocument();
        });

        it("shows back to tasks link on error", () => {
            resetStores({
                isLoadingInstances: false,
                instancesError: "Failed to load",
                currentInstance: null
            });

            renderPersonaInstanceView();

            expect(screen.getByText(/back to tasks/i)).toBeInTheDocument();
        });
    });

    // ===== Not Found State =====
    describe("not found state", () => {
        it("shows not found message when instance does not exist", () => {
            resetStores({
                isLoadingInstances: false,
                instancesError: null,
                currentInstance: null
            });

            renderPersonaInstanceView();

            expect(screen.getByText(/task not found/i)).toBeInTheDocument();
        });
    });

    // ===== Instance Display =====
    describe("instance display", () => {
        it("displays persona name and task title", () => {
            resetStores({
                isLoadingInstances: false,
                currentInstance: createMockPersonaInstance({
                    persona_name: "Research Expert",
                    task_title: "My Test Task"
                })
            });

            renderPersonaInstanceView();

            expect(screen.getByText("Research Expert")).toBeInTheDocument();
            expect(screen.getByText("My Test Task")).toBeInTheDocument();
        });

        it("displays instance status badge", () => {
            resetStores({
                isLoadingInstances: false,
                currentInstance: createMockPersonaInstance({ status: "running" })
            });

            renderPersonaInstanceView();

            expect(screen.getByText(/running/i)).toBeInTheDocument();
        });

        it("displays task description", () => {
            resetStores({
                isLoadingInstances: false,
                currentInstance: createMockPersonaInstance({
                    task_description: "This is the task I want done"
                })
            });

            renderPersonaInstanceView();

            expect(screen.getByText("This is the task I want done")).toBeInTheDocument();
        });
    });

    // ===== Status Display =====
    describe("status display", () => {
        const statusCases = [
            { status: "initializing", label: /initializing/i },
            { status: "running", label: /running/i }
        ];

        statusCases.forEach(({ status, label }) => {
            it(`displays ${status} status correctly`, () => {
                resetStores({
                    isLoadingInstances: false,
                    currentInstance: createMockPersonaInstance({
                        status: status as PersonaInstance["status"]
                    })
                });

                renderPersonaInstanceView();

                // May have multiple elements, just need at least one
                const elements = screen.getAllByText(label);
                expect(elements.length).toBeGreaterThan(0);
            });
        });
    });

    // ===== Metrics Display =====
    describe("metrics display", () => {
        it("displays duration", () => {
            resetStores({
                isLoadingInstances: false,
                currentInstance: createMockPersonaInstance({ duration_seconds: 3660 }) // 1h 1m
            });

            renderPersonaInstanceView();

            expect(screen.getByText(/duration:/i)).toBeInTheDocument();
            expect(screen.getByText(/1h 1m/i)).toBeInTheDocument();
        });

        it("displays accumulated cost", () => {
            resetStores({
                isLoadingInstances: false,
                currentInstance: createMockPersonaInstance({ accumulated_cost_credits: 123 })
            });

            renderPersonaInstanceView();

            expect(screen.getByText(/cost:/i)).toBeInTheDocument();
            expect(screen.getByText(/123.*credits/i)).toBeInTheDocument();
        });
    });

    // ===== Progress Display =====
    describe("progress display", () => {
        it("displays progress bar with percentage", () => {
            resetStores({
                isLoadingInstances: false,
                currentInstance: createMockPersonaInstance({
                    progress: {
                        current_step: 3,
                        current_step_name: "Analyzing",
                        total_steps: 10,
                        percentage: 30,
                        message: undefined,
                        steps: []
                    }
                })
            });

            renderPersonaInstanceView();

            expect(screen.getByText(/step 3 of 10/i)).toBeInTheDocument();
            expect(screen.getByText(/30%/i)).toBeInTheDocument();
        });

        it("displays progress message when available", () => {
            resetStores({
                isLoadingInstances: false,
                currentInstance: createMockPersonaInstance({
                    progress: {
                        current_step: 1,
                        current_step_name: "Processing",
                        total_steps: 5,
                        percentage: 20,
                        message: "Analyzing documents...",
                        steps: []
                    }
                })
            });

            renderPersonaInstanceView();

            expect(screen.getByText("Analyzing documents...")).toBeInTheDocument();
        });
    });

    // ===== Messages Display =====
    describe("messages display", () => {
        it("displays conversation messages", () => {
            resetStores({
                isLoadingInstances: false,
                currentInstance: createMockPersonaInstance({
                    messages: [
                        { role: "user", content: "Hello there" },
                        { role: "assistant", content: "Hi! How can I help?" }
                    ]
                })
            });

            renderPersonaInstanceView();

            expect(screen.getByText("Hello there")).toBeInTheDocument();
            expect(screen.getByText("Hi! How can I help?")).toBeInTheDocument();
        });
    });

    // ===== Message Input =====
    describe("message input", () => {
        it("shows message input for active instances", () => {
            resetStores({
                isLoadingInstances: false,
                currentInstance: createMockPersonaInstance({ status: "running" })
            });

            renderPersonaInstanceView();

            expect(screen.getByPlaceholderText(/send a message/i)).toBeInTheDocument();
        });

        it("hides message input for terminal instances", () => {
            resetStores({
                isLoadingInstances: false,
                currentInstance: createMockPersonaInstance({ status: "completed" })
            });

            renderPersonaInstanceView();

            expect(screen.queryByPlaceholderText(/send a message/i)).not.toBeInTheDocument();
        });

        it("allows typing in message input", async () => {
            const user = userEvent.setup();

            resetStores({
                isLoadingInstances: false,
                currentInstance: createMockPersonaInstance({ status: "running" })
            });

            renderPersonaInstanceView();

            const input = screen.getByPlaceholderText(/send a message/i);
            await user.type(input, "My message");

            expect(input).toHaveValue("My message");
        });

        it("disables submit button when message is empty", () => {
            resetStores({
                isLoadingInstances: false,
                currentInstance: createMockPersonaInstance({ status: "running" })
            });

            renderPersonaInstanceView();

            // Find the submit button (has Send icon)
            const buttons = screen.getAllByRole("button");
            const submitButton = buttons.find((btn) => btn.closest("form"));

            expect(submitButton).toBeDisabled();
        });
    });

    // ===== Action Buttons =====
    describe("action buttons", () => {
        it("shows cancel button for active instances", () => {
            resetStores({
                isLoadingInstances: false,
                currentInstance: createMockPersonaInstance({ status: "running" })
            });

            renderPersonaInstanceView();

            expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
        });

        it("has clickable cancel button", async () => {
            const user = userEvent.setup();

            resetStores({
                isLoadingInstances: false,
                currentInstance: createMockPersonaInstance({ status: "running" })
            });

            renderPersonaInstanceView();

            const cancelButton = screen.getByRole("button", { name: /cancel/i });
            expect(cancelButton).toBeInTheDocument();

            // Clicking should not throw
            await user.click(cancelButton);
        });

        it("shows delete button for terminal instances", () => {
            resetStores({
                isLoadingInstances: false,
                currentInstance: createMockPersonaInstance({ status: "completed" })
            });

            renderPersonaInstanceView();

            // Delete button is an icon button
            const deleteButton = document.querySelector('[class*="hover:text-red"]');
            expect(deleteButton).toBeInTheDocument();
        });

        it("shows continue work button for terminal instances", () => {
            resetStores({
                isLoadingInstances: false,
                currentInstance: createMockPersonaInstance({ status: "completed" })
            });

            renderPersonaInstanceView();

            expect(screen.getByRole("button", { name: /continue work/i })).toBeInTheDocument();
        });
    });

    // ===== Deliverables =====
    describe("deliverables", () => {
        it("renders instance view with deliverables area", () => {
            resetStores({
                isLoadingInstances: false,
                currentInstance: createMockPersonaInstance()
            });

            renderPersonaInstanceView();

            // Instance should render - check for task title
            expect(screen.getByText("Test Task")).toBeInTheDocument();
        });

        it("shows no deliverables message when empty", () => {
            resetStores({
                isLoadingInstances: false,
                currentInstance: createMockPersonaInstance({ deliverables: [] })
            });

            renderPersonaInstanceView();

            expect(screen.getByText(/no deliverables yet/i)).toBeInTheDocument();
        });

        it("displays deliverables count when available", () => {
            resetStores({
                isLoadingInstances: false,
                currentInstance: createMockPersonaInstance({
                    deliverables: [
                        { id: "d1", type: "text", name: "Report", content: "Content" },
                        { id: "d2", type: "text", name: "Summary", content: "Summary content" }
                    ] as unknown as PersonaInstance["deliverables"]
                })
            });

            renderPersonaInstanceView();

            expect(screen.getByText("2")).toBeInTheDocument();
        });
    });

    // ===== Navigation =====
    describe("navigation", () => {
        it("renders navigation elements", () => {
            resetStores({
                isLoadingInstances: false,
                currentInstance: createMockPersonaInstance()
            });

            renderPersonaInstanceView();

            // Page should render with buttons
            const buttons = screen.getAllByRole("button");
            expect(buttons.length).toBeGreaterThan(0);
        });
    });
});
