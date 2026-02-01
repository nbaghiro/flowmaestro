/**
 * CodeNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import CodeNode from "../../nodes/CodeNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-code-node-1",
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

interface CodeNodeData {
    label: string;
    status?: NodeExecutionStatus;
    language?: string;
    code?: string;
}

describe("CodeNode", () => {
    const createProps = (data: Partial<CodeNodeData> = {}): NodeProps<CodeNodeData> => ({
        id: "test-code-1",
        type: "code",
        data: {
            label: "Code",
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
            render(<CodeNode {...createProps()} />);
            expect(screen.getByText("Code")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<CodeNode {...createProps({ label: "Data Processor" })} />);
            expect(screen.getByText("Data Processor")).toBeInTheDocument();
        });
    });

    describe("Language Display", () => {
        it("shows default language as javascript", () => {
            render(<CodeNode {...createProps()} />);
            expect(screen.getByText("Language:")).toBeInTheDocument();
            expect(screen.getByText("javascript")).toBeInTheDocument();
        });

        it("shows python language", () => {
            render(<CodeNode {...createProps({ language: "python" })} />);
            expect(screen.getByText("python")).toBeInTheDocument();
        });

        it("capitalizes language display", () => {
            render(<CodeNode {...createProps({ language: "typescript" })} />);
            const langDisplay = screen.getByText("typescript");
            expect(langDisplay).toHaveClass("capitalize");
        });
    });

    describe("Code Status Display", () => {
        it("shows 'No code added' when no code is provided", () => {
            render(<CodeNode {...createProps()} />);
            expect(screen.getByText("No code added")).toBeInTheDocument();
        });

        it("shows 'No code added' when code is empty string", () => {
            render(<CodeNode {...createProps({ code: "" })} />);
            expect(screen.getByText("No code added")).toBeInTheDocument();
        });

        it("shows 'Custom code configured' when code is present", () => {
            render(<CodeNode {...createProps({ code: "return input * 2;" })} />);
            expect(screen.getByText("Custom code configured")).toBeInTheDocument();
        });

        it("shows 'Custom code configured' for multi-line code", () => {
            render(<CodeNode {...createProps({ code: "const x = 1;\nreturn x * 2;" })} />);
            expect(screen.getByText("Custom code configured")).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<CodeNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<CodeNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies logic category styling", () => {
            const { container } = render(<CodeNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-logic-border");
        });
    });

    describe("Supported Languages", () => {
        const languages = ["javascript", "python", "typescript", "ruby", "go"];

        languages.forEach((language) => {
            it(`supports ${language} language`, () => {
                render(<CodeNode {...createProps({ language })} />);
                expect(screen.getByText(language)).toBeInTheDocument();
            });
        });
    });
});
