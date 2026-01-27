/**
 * SwitchNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SwitchNode from "../../nodes/SwitchNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-switch-node-1",
    useStore: (selector: (state: { transform: number[] }) => unknown) =>
        selector({ transform: [0, 0, 1] }),
    useUpdateNodeInternals: () => vi.fn()
}));

// Mock workflow store
vi.mock("../../../stores/workflowStore", () => ({
    useWorkflowStore: vi.fn((selector?: (state: unknown) => unknown) => {
        const state = {
            currentExecution: null,
            selectedNode: null,
            nodeValidation: {},
            workflowValidation: [],
            nodes: [],
            updateNode: vi.fn(),
            updateNodeStyle: vi.fn()
        };
        return selector ? selector(state) : state;
    }),
    INITIAL_NODE_WIDTH: 260,
    INITIAL_NODE_HEIGHT: 120
}));

// Mock validation components
vi.mock("../../../components/execution/modals/NodeExecutionPopover", () => ({
    NodeExecutionPopover: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock("../../../components/validation/NodeValidationBadge", () => ({
    NodeValidationBadge: () => null,
    getNodeValidationBorderStyle: () => ({
        hasIssues: false,
        borderClass: "",
        leftBorderColor: undefined
    })
}));

interface SwitchNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    variable?: string;
    cases?: Array<{ value: string; label: string }>;
}

describe("SwitchNode", () => {
    const createProps = (data: Partial<SwitchNodeData> = {}): NodeProps<SwitchNodeData> => ({
        id: "test-switch-1",
        type: "switch",
        data: {
            label: "Switch",
            ...data
        },
        selected: false,
        isConnectable: true,
        xPos: 100,
        yPos: 100,
        dragging: false,
        zIndex: 1
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Rendering", () => {
        it("renders with default label", () => {
            render(<SwitchNode {...createProps()} />);
            expect(screen.getByText("Switch")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<SwitchNode {...createProps({ label: "Status Handler" })} />);
            expect(screen.getByText("Status Handler")).toBeInTheDocument();
        });
    });

    describe("Variable Display", () => {
        it("shows default variable placeholder", () => {
            render(<SwitchNode {...createProps()} />);
            expect(screen.getByText("${value}")).toBeInTheDocument();
        });

        it("shows custom variable", () => {
            render(<SwitchNode {...createProps({ variable: "{{status}}" })} />);
            expect(screen.getByText("{{status}}")).toBeInTheDocument();
        });

        it("shows variable with complex expression", () => {
            render(<SwitchNode {...createProps({ variable: "{{response.data.type}}" })} />);
            expect(screen.getByText("{{response.data.type}}")).toBeInTheDocument();
        });
    });

    describe("Case Count Display", () => {
        it("shows default case count (3 cases)", () => {
            render(<SwitchNode {...createProps()} />);
            expect(screen.getByText("3 cases")).toBeInTheDocument();
        });

        it("shows correct count with 2 cases", () => {
            render(
                <SwitchNode
                    {...createProps({
                        cases: [
                            { value: "active", label: "Active" },
                            { value: "inactive", label: "Inactive" }
                        ]
                    })}
                />
            );
            expect(screen.getByText("2 cases")).toBeInTheDocument();
        });

        it("shows singular 'case' for 1 case", () => {
            render(
                <SwitchNode
                    {...createProps({
                        cases: [{ value: "only", label: "Only Case" }]
                    })}
                />
            );
            expect(screen.getByText("1 case")).toBeInTheDocument();
        });

        it("shows correct count with 4 cases", () => {
            render(
                <SwitchNode
                    {...createProps({
                        cases: [
                            { value: "pending", label: "Pending" },
                            { value: "approved", label: "Approved" },
                            { value: "rejected", label: "Rejected" },
                            { value: "expired", label: "Expired" }
                        ]
                    })}
                />
            );
            expect(screen.getByText("4 cases")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<SwitchNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-default")).toBeInTheDocument();
        });

        it("renders output handles for cases with values", () => {
            render(
                <SwitchNode
                    {...createProps({
                        cases: [
                            { value: "active", label: "Active" },
                            { value: "inactive", label: "Inactive" }
                        ]
                    })}
                />
            );
            expect(screen.getByTestId("handle-source-active")).toBeInTheDocument();
            expect(screen.getByTestId("handle-source-inactive")).toBeInTheDocument();
        });

        it("renders handles with fallback IDs for empty values", () => {
            render(
                <SwitchNode
                    {...createProps({
                        cases: [
                            { value: "", label: "Case 1" },
                            { value: "", label: "Case 2" }
                        ]
                    })}
                />
            );
            // When value is empty, handle ID falls back to case-{index}
            expect(screen.getByTestId("handle-source-case-0")).toBeInTheDocument();
            expect(screen.getByTestId("handle-source-case-1")).toBeInTheDocument();
        });

        it("limits displayed cases to 4", () => {
            render(
                <SwitchNode
                    {...createProps({
                        cases: [
                            { value: "c1", label: "Case 1" },
                            { value: "c2", label: "Case 2" },
                            { value: "c3", label: "Case 3" },
                            { value: "c4", label: "Case 4" },
                            { value: "c5", label: "Case 5" }
                        ]
                    })}
                />
            );
            expect(screen.getByTestId("handle-source-c1")).toBeInTheDocument();
            expect(screen.getByTestId("handle-source-c4")).toBeInTheDocument();
            expect(screen.queryByTestId("handle-source-c5")).not.toBeInTheDocument();
        });
    });

    describe("Default Cases", () => {
        it("shows default placeholder cases when no cases configured", () => {
            render(<SwitchNode {...createProps({ cases: [] })} />);
            // Empty cases array falls back to default placeholders
            expect(screen.getByText("3 cases")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies logic category styling", () => {
            const { container } = render(<SwitchNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-logic-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<SwitchNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });

        it("does not apply selected styling when not selected", () => {
            const { container } = render(<SwitchNode {...createProps()} />);
            expect(container.firstChild).not.toHaveClass("shadow-node-hover");
        });
    });

    describe("Complex Scenarios", () => {
        it("handles HTTP status code routing", () => {
            render(
                <SwitchNode
                    {...createProps({
                        label: "HTTP Status Handler",
                        variable: "{{response.status}}",
                        cases: [
                            { value: "200", label: "Success" },
                            { value: "400", label: "Bad Request" },
                            { value: "500", label: "Server Error" }
                        ]
                    })}
                />
            );
            expect(screen.getByText("HTTP Status Handler")).toBeInTheDocument();
            expect(screen.getByText("{{response.status}}")).toBeInTheDocument();
            expect(screen.getByText("3 cases")).toBeInTheDocument();
        });

        it("handles boolean-like cases", () => {
            render(
                <SwitchNode
                    {...createProps({
                        variable: "{{user.isAdmin}}",
                        cases: [
                            { value: "true", label: "Admin" },
                            { value: "false", label: "User" }
                        ]
                    })}
                />
            );
            expect(screen.getByText("{{user.isAdmin}}")).toBeInTheDocument();
            expect(screen.getByText("2 cases")).toBeInTheDocument();
        });
    });
});
