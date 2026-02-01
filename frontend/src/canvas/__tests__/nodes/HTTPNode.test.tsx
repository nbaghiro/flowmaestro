/**
 * HTTPNode component tests
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import HTTPNode from "../../nodes/HTTPNode";
import type { NodeProps } from "reactflow";

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    Handle: ({ type, id }: { type: string; id?: string }) => (
        <div data-testid={`handle-${type}-${id || "default"}`} />
    ),
    Position: { Left: "left", Top: "top", Right: "right", Bottom: "bottom" },
    useNodeId: () => "test-http-node-1",
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

interface HTTPNodeData {
    label: string;
    status?: NodeExecutionStatus;
    method?: string;
    url?: string;
}

describe("HTTPNode", () => {
    const createProps = (data: Partial<HTTPNodeData> = {}): NodeProps<HTTPNodeData> => ({
        id: "test-http-1",
        type: "http",
        data: {
            label: "HTTP",
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
            render(<HTTPNode {...createProps()} />);
            expect(screen.getByText("HTTP")).toBeInTheDocument();
        });

        it("renders with custom label", () => {
            render(<HTTPNode {...createProps({ label: "Fetch Users" })} />);
            expect(screen.getByText("Fetch Users")).toBeInTheDocument();
        });
    });

    describe("Method Display", () => {
        it("shows default method as GET", () => {
            render(<HTTPNode {...createProps()} />);
            expect(screen.getByText("Method:")).toBeInTheDocument();
            expect(screen.getByText("GET")).toBeInTheDocument();
        });

        it("shows POST method", () => {
            render(<HTTPNode {...createProps({ method: "POST" })} />);
            expect(screen.getByText("POST")).toBeInTheDocument();
        });

        it("shows PUT method", () => {
            render(<HTTPNode {...createProps({ method: "PUT" })} />);
            expect(screen.getByText("PUT")).toBeInTheDocument();
        });

        it("shows DELETE method", () => {
            render(<HTTPNode {...createProps({ method: "DELETE" })} />);
            expect(screen.getByText("DELETE")).toBeInTheDocument();
        });

        it("shows PATCH method", () => {
            render(<HTTPNode {...createProps({ method: "PATCH" })} />);
            expect(screen.getByText("PATCH")).toBeInTheDocument();
        });

        it("displays method in monospace font", () => {
            render(<HTTPNode {...createProps({ method: "GET" })} />);
            const methodDisplay = screen.getByText("GET");
            expect(methodDisplay).toHaveClass("font-mono");
        });
    });

    describe("URL Display", () => {
        it("shows default URL", () => {
            render(<HTTPNode {...createProps()} />);
            expect(screen.getByText("https://api.example.com")).toBeInTheDocument();
        });

        it("shows custom URL", () => {
            render(
                <HTTPNode {...createProps({ url: "https://jsonplaceholder.typicode.com/posts" })} />
            );
            expect(
                screen.getByText("https://jsonplaceholder.typicode.com/posts")
            ).toBeInTheDocument();
        });

        it("displays URL in monospace font", () => {
            render(<HTTPNode {...createProps({ url: "https://test.com" })} />);
            const urlDisplay = screen.getByText("https://test.com");
            expect(urlDisplay).toHaveClass("font-mono");
        });

        it("truncates long URLs", () => {
            const { container } = render(
                <HTTPNode
                    {...createProps({
                        url: "https://very-long-domain.example.com/api/v1/very/long/path/to/resource"
                    })}
                />
            );
            const urlElement = container.querySelector(".truncate");
            expect(urlElement).toBeInTheDocument();
        });
    });

    describe("Handles", () => {
        it("renders input handle", () => {
            render(<HTTPNode {...createProps()} />);
            expect(screen.getByTestId("handle-target-input")).toBeInTheDocument();
        });

        it("renders output handle", () => {
            render(<HTTPNode {...createProps()} />);
            expect(screen.getByTestId("handle-source-output")).toBeInTheDocument();
        });
    });

    describe("Category", () => {
        it("applies utils category styling", () => {
            const { container } = render(<HTTPNode {...createProps()} />);
            expect(container.firstChild).toHaveClass("category-utils-border");
        });
    });

    describe("All HTTP Methods", () => {
        const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

        methods.forEach((method) => {
            it(`supports ${method} method`, () => {
                render(<HTTPNode {...createProps({ method })} />);
                expect(screen.getByText(method)).toBeInTheDocument();
            });
        });
    });
});
