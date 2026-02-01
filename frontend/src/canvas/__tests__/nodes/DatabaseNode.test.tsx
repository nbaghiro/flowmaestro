/**
 * DatabaseNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import DatabaseNode from "../../nodes/DatabaseNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-database-node-1",
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

interface DatabaseNodeData {
    label: string;
    status?: NodeExecutionStatus;
    operation?: string;
    provider?: string;
}

describe("DatabaseNode", () => {
    const createProps = (data: Partial<DatabaseNodeData> = {}): NodeProps<DatabaseNodeData> => ({
        id: "test-database-1",
        type: "database",
        data: {
            label: "Database",
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
            render(<DatabaseNode {...createProps()} />);
            expect(screen.getByText("Database")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<DatabaseNode {...createProps({ label: "User Query" })} />);
            expect(screen.getByText("User Query")).toBeInTheDocument();
        });
    });

    describe("Provider Display", () => {
        it("shows dash when no provider", () => {
            render(<DatabaseNode {...createProps()} />);
            expect(screen.getByText("Type:")).toBeInTheDocument();
            // Use getAllByText since multiple fields may show dashes
            const dashes = screen.getAllByText("—");
            expect(dashes.length).toBeGreaterThan(0);
        });

        it("shows formatted PostgreSQL provider", () => {
            render(<DatabaseNode {...createProps({ provider: "postgresql" })} />);
            expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
        });

        it("shows formatted MySQL provider", () => {
            render(<DatabaseNode {...createProps({ provider: "mysql" })} />);
            expect(screen.getByText("MySQL")).toBeInTheDocument();
        });

        it("shows formatted MongoDB provider", () => {
            render(<DatabaseNode {...createProps({ provider: "mongodb" })} />);
            expect(screen.getByText("MongoDB")).toBeInTheDocument();
        });

        it("shows unknown provider as-is", () => {
            render(<DatabaseNode {...createProps({ provider: "redis" })} />);
            expect(screen.getByText("redis")).toBeInTheDocument();
        });

        it("handles case-insensitive provider names", () => {
            render(<DatabaseNode {...createProps({ provider: "POSTGRESQL" })} />);
            expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
        });
    });

    describe("Operation Display", () => {
        it("shows dash when no operation", () => {
            render(<DatabaseNode {...createProps()} />);
            expect(screen.getByText("Operation:")).toBeInTheDocument();
            // Two dashes: one for Type, one for Operation
            const dashes = screen.getAllByText("—");
            expect(dashes.length).toBe(2);
        });

        it("shows formatted query operation", () => {
            render(<DatabaseNode {...createProps({ operation: "query" })} />);
            expect(screen.getByText("Query")).toBeInTheDocument();
        });

        it("shows formatted insert operation", () => {
            render(<DatabaseNode {...createProps({ operation: "insert" })} />);
            expect(screen.getByText("Insert")).toBeInTheDocument();
        });

        it("shows formatted update operation", () => {
            render(<DatabaseNode {...createProps({ operation: "update" })} />);
            expect(screen.getByText("Update")).toBeInTheDocument();
        });

        it("shows formatted delete operation", () => {
            render(<DatabaseNode {...createProps({ operation: "delete" })} />);
            expect(screen.getByText("Delete")).toBeInTheDocument();
        });

        it("formats operation with underscores", () => {
            render(<DatabaseNode {...createProps({ operation: "find_one" })} />);
            expect(screen.getByText("Find one")).toBeInTheDocument();
        });

        it("formats operation with multiple underscores", () => {
            render(<DatabaseNode {...createProps({ operation: "insert_many_documents" })} />);
            expect(screen.getByText("Insert many documents")).toBeInTheDocument();
        });
    });

    describe("Combined Display", () => {
        it("shows both provider and operation", () => {
            render(
                <DatabaseNode
                    {...createProps({
                        provider: "postgresql",
                        operation: "query"
                    })}
                />
            );
            expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
            expect(screen.getByText("Query")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<DatabaseNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<DatabaseNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies utils category styling", () => {
            const { container } = render(<DatabaseNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-utils-border");
        });
    });

    describe("Selection State", () => {
        it("applies selected styling when selected", () => {
            const { container } = render(<DatabaseNode {...createProps()} selected />);
            expect(container.firstChild).toHaveClass("shadow-node-hover");
        });

        it("does not apply selected styling when not selected", () => {
            const { container } = render(<DatabaseNode {...createProps()} />);
            expect(container.firstChild).not.toHaveClass("shadow-node-hover");
        });
    });

    describe("Common Database Operations", () => {
        it("handles PostgreSQL SELECT query", () => {
            render(
                <DatabaseNode
                    {...createProps({
                        label: "Get Users",
                        provider: "postgresql",
                        operation: "query"
                    })}
                />
            );
            expect(screen.getByText("Get Users")).toBeInTheDocument();
            expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
            expect(screen.getByText("Query")).toBeInTheDocument();
        });

        it("handles MySQL INSERT", () => {
            render(
                <DatabaseNode
                    {...createProps({
                        label: "Create Order",
                        provider: "mysql",
                        operation: "insert"
                    })}
                />
            );
            expect(screen.getByText("Create Order")).toBeInTheDocument();
            expect(screen.getByText("MySQL")).toBeInTheDocument();
            expect(screen.getByText("Insert")).toBeInTheDocument();
        });

        it("handles MongoDB find_one", () => {
            render(
                <DatabaseNode
                    {...createProps({
                        label: "Find Document",
                        provider: "mongodb",
                        operation: "find_one"
                    })}
                />
            );
            expect(screen.getByText("Find Document")).toBeInTheDocument();
            expect(screen.getByText("MongoDB")).toBeInTheDocument();
            expect(screen.getByText("Find one")).toBeInTheDocument();
        });

        it("handles PostgreSQL UPDATE", () => {
            render(
                <DatabaseNode
                    {...createProps({
                        label: "Update Status",
                        provider: "postgresql",
                        operation: "update"
                    })}
                />
            );
            expect(screen.getByText("Update Status")).toBeInTheDocument();
            expect(screen.getByText("Update")).toBeInTheDocument();
        });

        it("handles MongoDB aggregate", () => {
            render(
                <DatabaseNode
                    {...createProps({
                        label: "Sales Report",
                        provider: "mongodb",
                        operation: "aggregate"
                    })}
                />
            );
            expect(screen.getByText("Sales Report")).toBeInTheDocument();
            expect(screen.getByText("Aggregate")).toBeInTheDocument();
        });
    });

    describe("Status Display", () => {
        it("can display with running status", () => {
            const { container } = render(
                <DatabaseNode {...createProps({ status: "executing" })} />
            );
            // Status is passed to BaseNode which handles styling
            expect(container.firstChild).toBeInTheDocument();
        });

        it("can display with error status", () => {
            const { container } = render(<DatabaseNode {...createProps({ status: "failed" })} />);
            expect(container.firstChild).toBeInTheDocument();
        });

        it("can display with success status", () => {
            const { container } = render(
                <DatabaseNode {...createProps({ status: "completed" })} />
            );
            expect(container.firstChild).toBeInTheDocument();
        });
    });
});
