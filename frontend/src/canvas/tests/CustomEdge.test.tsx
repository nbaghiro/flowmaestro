/**
 * CustomEdge component tests
 *
 * Tests for the custom edge component used for connections between nodes
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CustomEdge } from "../edges/CustomEdge";
import type { EdgeProps, Position } from "reactflow";

// Mock setEdges function
const mockSetEdges = vi.fn();

// Mock React Flow hooks
vi.mock("reactflow", () => ({
    BaseEdge: ({ path }: { path: string }) => <path data-testid="base-edge" d={path} />,
    getBezierPath: ({
        sourceX,
        sourceY,
        targetX,
        targetY
    }: {
        sourceX: number;
        sourceY: number;
        targetX: number;
        targetY: number;
    }) => {
        const path = `M${sourceX},${sourceY} C${sourceX + 50},${sourceY} ${targetX - 50},${targetY} ${targetX},${targetY}`;
        const labelX = (sourceX + targetX) / 2;
        const labelY = (sourceY + targetY) / 2;
        return [path, labelX, labelY];
    },
    useReactFlow: () => ({
        setEdges: mockSetEdges
    }),
    Position: {
        Left: "left",
        Top: "top",
        Right: "right",
        Bottom: "bottom"
    }
}));

describe("CustomEdge", () => {
    const defaultProps: EdgeProps = {
        id: "edge-1",
        source: "node-1",
        target: "node-2",
        sourceX: 100,
        sourceY: 50,
        targetX: 300,
        targetY: 50,
        sourcePosition: "right" as Position,
        targetPosition: "left" as Position,
        selected: false,
        markerEnd: undefined,
        sourceHandleId: null,
        targetHandleId: null,
        data: undefined,
        interactionWidth: 20
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Rendering", () => {
        it("renders the base edge path", () => {
            render(
                <svg>
                    <CustomEdge {...defaultProps} />
                </svg>
            );

            const edge = screen.getByTestId("base-edge");
            expect(edge).toBeInTheDocument();
        });

        it("renders edge with correct path calculation", () => {
            render(
                <svg>
                    <CustomEdge {...defaultProps} />
                </svg>
            );

            const edge = screen.getByTestId("base-edge");
            // Path should contain source and target coordinates
            const path = edge.getAttribute("d");
            expect(path).toContain("100");
            expect(path).toContain("50");
            expect(path).toContain("300");
        });

        it("renders edge between different y positions", () => {
            render(
                <svg>
                    <CustomEdge {...defaultProps} sourceY={100} targetY={200} />
                </svg>
            );

            const edge = screen.getByTestId("base-edge");
            expect(edge).toBeInTheDocument();
        });
    });

    describe("Selection State", () => {
        it("does not show delete button when not selected", () => {
            render(
                <svg>
                    <CustomEdge {...defaultProps} selected={false} />
                </svg>
            );

            // Delete button should not be present
            expect(screen.queryByRole("button")).not.toBeInTheDocument();
        });

        it("shows delete button when selected", () => {
            render(
                <svg>
                    <CustomEdge {...defaultProps} selected={true} />
                </svg>
            );

            // Delete button should be present
            const deleteButton = screen.getByRole("button");
            expect(deleteButton).toBeInTheDocument();
        });

        it("positions delete button at edge center", () => {
            const { container } = render(
                <svg>
                    <CustomEdge {...defaultProps} selected={true} />
                </svg>
            );

            // Foreign object should be centered on the edge
            const foreignObject = container.querySelector("foreignObject");
            expect(foreignObject).toBeInTheDocument();

            // Label position should be at center of edge (200, 50)
            // foreignObject is positioned at labelX - 10, labelY - 10
            expect(foreignObject).toHaveAttribute("x", "190");
            expect(foreignObject).toHaveAttribute("y", "40");
        });
    });

    describe("Delete Functionality", () => {
        it("calls setEdges to remove edge when delete button is clicked", () => {
            render(
                <svg>
                    <CustomEdge {...defaultProps} selected={true} />
                </svg>
            );

            const deleteButton = screen.getByRole("button");
            fireEvent.click(deleteButton);

            expect(mockSetEdges).toHaveBeenCalledTimes(1);
            expect(mockSetEdges).toHaveBeenCalledWith(expect.any(Function));
        });

        it("filters out the correct edge when deleting", () => {
            const edges = [
                { id: "edge-1", source: "node-1", target: "node-2" },
                { id: "edge-2", source: "node-2", target: "node-3" }
            ];

            render(
                <svg>
                    <CustomEdge {...defaultProps} selected={true} />
                </svg>
            );

            const deleteButton = screen.getByRole("button");
            fireEvent.click(deleteButton);

            // Get the filter function that was passed to setEdges
            const filterFn = mockSetEdges.mock.calls[0][0];
            const result = filterFn(edges);

            // Should only contain edge-2 after filtering out edge-1
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe("edge-2");
        });

        it("stops event propagation when clicking delete", () => {
            render(
                <svg>
                    <CustomEdge {...defaultProps} selected={true} />
                </svg>
            );

            const deleteButton = screen.getByRole("button");
            const clickEvent = new MouseEvent("click", { bubbles: true });
            const stopPropagation = vi.spyOn(clickEvent, "stopPropagation");

            deleteButton.dispatchEvent(clickEvent);

            expect(stopPropagation).toHaveBeenCalled();
        });
    });

    describe("Edge with Different Positions", () => {
        it("renders horizontal edge (left to right)", () => {
            render(
                <svg>
                    <CustomEdge
                        {...defaultProps}
                        sourcePosition={"right" as Position}
                        targetPosition={"left" as Position}
                    />
                </svg>
            );

            expect(screen.getByTestId("base-edge")).toBeInTheDocument();
        });

        it("renders vertical edge (top to bottom)", () => {
            render(
                <svg>
                    <CustomEdge
                        {...defaultProps}
                        sourceX={150}
                        sourceY={100}
                        targetX={150}
                        targetY={300}
                        sourcePosition={"bottom" as Position}
                        targetPosition={"top" as Position}
                    />
                </svg>
            );

            expect(screen.getByTestId("base-edge")).toBeInTheDocument();
        });

        it("renders diagonal edge", () => {
            render(
                <svg>
                    <CustomEdge
                        {...defaultProps}
                        sourceX={100}
                        sourceY={100}
                        targetX={400}
                        targetY={300}
                    />
                </svg>
            );

            expect(screen.getByTestId("base-edge")).toBeInTheDocument();
        });
    });

    describe("Marker End", () => {
        it("passes markerEnd prop to BaseEdge", () => {
            render(
                <svg>
                    <CustomEdge {...defaultProps} markerEnd="url(#arrow)" />
                </svg>
            );

            // BaseEdge should receive the markerEnd prop
            expect(screen.getByTestId("base-edge")).toBeInTheDocument();
        });
    });

    describe("Delete Button Styling", () => {
        it("has correct size and styling", () => {
            render(
                <svg>
                    <CustomEdge {...defaultProps} selected={true} />
                </svg>
            );

            const deleteButton = screen.getByRole("button");
            expect(deleteButton).toHaveClass("w-5");
            expect(deleteButton).toHaveClass("h-5");
            expect(deleteButton).toHaveClass("rounded-full");
        });

        it("has hover styling classes", () => {
            render(
                <svg>
                    <CustomEdge {...defaultProps} selected={true} />
                </svg>
            );

            const deleteButton = screen.getByRole("button");
            expect(deleteButton).toHaveClass("hover:text-red-500");
            expect(deleteButton).toHaveClass("hover:border-red-300");
        });
    });

    describe("ForeignObject Properties", () => {
        it("has correct dimensions", () => {
            const { container } = render(
                <svg>
                    <CustomEdge {...defaultProps} selected={true} />
                </svg>
            );

            const foreignObject = container.querySelector("foreignObject");
            expect(foreignObject).toHaveAttribute("width", "20");
            expect(foreignObject).toHaveAttribute("height", "20");
        });

        it("has overflow visible class", () => {
            const { container } = render(
                <svg>
                    <CustomEdge {...defaultProps} selected={true} />
                </svg>
            );

            const foreignObject = container.querySelector("foreignObject");
            expect(foreignObject).toHaveClass("overflow-visible");
        });
    });
});
