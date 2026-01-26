/**
 * React Flow mock for unit testing canvas components
 *
 * This mock provides isolated unit tests without React Flow's DOM requirements.
 * It mocks all React Flow components and hooks used by the canvas system.
 */

import React from "react";
import { vi } from "vitest";

// Position enum
export enum Position {
    Left = "left",
    Top = "top",
    Right = "right",
    Bottom = "bottom"
}

// Connection mode
export enum ConnectionMode {
    Strict = "strict",
    Loose = "loose"
}

// MarkerType enum
export enum MarkerType {
    Arrow = "arrow",
    ArrowClosed = "arrowclosed"
}

// Mock Handle component
interface HandleProps {
    type: "source" | "target";
    position: Position;
    id?: string;
    className?: string;
    style?: React.CSSProperties;
    isConnectable?: boolean;
    onConnect?: (params: unknown) => void;
}

export const Handle: React.FC<HandleProps> = ({ type, position, id, className }) => (
    <div
        data-testid={`handle-${type}-${id || "default"}`}
        data-type={type}
        data-position={position}
        data-handleid={id}
        className={className}
    />
);

// Mock ReactFlow component
interface ReactFlowProps {
    nodes?: unknown[];
    edges?: unknown[];
    children?: React.ReactNode;
    onNodesChange?: (changes: unknown[]) => void;
    onEdgesChange?: (changes: unknown[]) => void;
    onConnect?: (params: unknown) => void;
    onNodeClick?: (event: React.MouseEvent, node: unknown) => void;
    onPaneClick?: (event: React.MouseEvent) => void;
    onDrop?: (event: React.DragEvent) => void;
    onDragOver?: (event: React.DragEvent) => void;
    nodeTypes?: Record<string, React.ComponentType>;
    edgeTypes?: Record<string, React.ComponentType>;
    connectionMode?: ConnectionMode;
    fitView?: boolean;
    className?: string;
}

export const ReactFlow: React.FC<ReactFlowProps> = ({ children, className }) => (
    <div data-testid="react-flow" className={className}>
        {children}
    </div>
);

// Mock Provider
interface ReactFlowProviderProps {
    children: React.ReactNode;
}

export const ReactFlowProvider: React.FC<ReactFlowProviderProps> = ({ children }) => (
    <div data-testid="react-flow-provider">{children}</div>
);

// Mock BaseEdge component
interface BaseEdgeProps {
    path: string;
    markerEnd?: string;
    style?: React.CSSProperties;
    className?: string;
}

export const BaseEdge: React.FC<BaseEdgeProps> = ({ path, markerEnd }) => (
    <path data-testid="base-edge" d={path} markerEnd={markerEnd} />
);

// Mock getBezierPath function
interface GetBezierPathParams {
    sourceX: number;
    sourceY: number;
    sourcePosition?: Position;
    targetX: number;
    targetY: number;
    targetPosition?: Position;
    curvature?: number;
}

export const getBezierPath = ({
    sourceX,
    sourceY,
    targetX,
    targetY
}: GetBezierPathParams): [string, number, number] => {
    const path = `M${sourceX},${sourceY} C${sourceX + 50},${sourceY} ${targetX - 50},${targetY} ${targetX},${targetY}`;
    const labelX = (sourceX + targetX) / 2;
    const labelY = (sourceY + targetY) / 2;
    return [path, labelX, labelY];
};

// Mock useReactFlow hook
interface ReactFlowInstance {
    getNodes: () => unknown[];
    getEdges: () => unknown[];
    setNodes: (nodesOrUpdater: unknown[] | ((nodes: unknown[]) => unknown[])) => void;
    setEdges: (edgesOrUpdater: unknown[] | ((edges: unknown[]) => unknown[])) => void;
    addNodes: (nodes: unknown[]) => void;
    addEdges: (edges: unknown[]) => void;
    fitView: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    getViewport: () => { x: number; y: number; zoom: number };
    setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
    project: (position: { x: number; y: number }) => { x: number; y: number };
    screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
}

// Shared state for tests to manipulate
let mockNodes: unknown[] = [];
let mockEdges: unknown[] = [];

export const setMockNodes = (nodes: unknown[]) => {
    mockNodes = nodes;
};

export const setMockEdges = (edges: unknown[]) => {
    mockEdges = edges;
};

export const resetMockState = () => {
    mockNodes = [];
    mockEdges = [];
};

export const useReactFlow = vi.fn(
    (): ReactFlowInstance => ({
        getNodes: () => mockNodes,
        getEdges: () => mockEdges,
        setNodes: vi.fn((nodesOrUpdater) => {
            if (typeof nodesOrUpdater === "function") {
                mockNodes = nodesOrUpdater(mockNodes);
            } else {
                mockNodes = nodesOrUpdater;
            }
        }),
        setEdges: vi.fn((edgesOrUpdater) => {
            if (typeof edgesOrUpdater === "function") {
                mockEdges = edgesOrUpdater(mockEdges);
            } else {
                mockEdges = edgesOrUpdater;
            }
        }),
        addNodes: vi.fn((nodes) => {
            mockNodes = [...mockNodes, ...nodes];
        }),
        addEdges: vi.fn((edges) => {
            mockEdges = [...mockEdges, ...edges];
        }),
        fitView: vi.fn(),
        zoomIn: vi.fn(),
        zoomOut: vi.fn(),
        getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
        setViewport: vi.fn(),
        project: (position) => position,
        screenToFlowPosition: (position) => position
    })
);

// Mock useNodes hook
export const useNodes = vi.fn(() => mockNodes);

// Mock useEdges hook
export const useEdges = vi.fn(() => mockEdges);

// Mock useNodeId hook
let mockNodeId: string | null = "test-node-1";

export const setMockNodeId = (id: string | null) => {
    mockNodeId = id;
};

export const useNodeId = vi.fn(() => mockNodeId);

// Mock useStore hook for viewport changes
interface StoreState {
    transform: [number, number, number];
    width: number;
    height: number;
}

const defaultStoreState: StoreState = {
    transform: [0, 0, 1],
    width: 800,
    height: 600
};

export const useStore = vi.fn((selector: (state: StoreState) => unknown): unknown => {
    return selector(defaultStoreState);
});

// Mock useUpdateNodeInternals hook
export const useUpdateNodeInternals = vi.fn(() => vi.fn());

// Mock useOnSelectionChange hook
export const useOnSelectionChange = vi.fn();

// Mock useKeyPress hook
export const useKeyPress = vi.fn(() => false);

// Mock applyNodeChanges and applyEdgeChanges
export const applyNodeChanges = vi.fn((_changes: unknown[], nodes: unknown[]) => nodes);

export const applyEdgeChanges = vi.fn((_changes: unknown[], edges: unknown[]) => edges);

// Mock addEdge helper
export const addEdge = vi.fn((edge: unknown, edges: unknown[]) => [...edges, edge]);

// Mock Panel component
interface PanelProps {
    position?:
        | "top-left"
        | "top-right"
        | "bottom-left"
        | "bottom-right"
        | "top-center"
        | "bottom-center";
    children?: React.ReactNode;
    className?: string;
}

export const Panel: React.FC<PanelProps> = ({ children, className }) => (
    <div data-testid="react-flow-panel" className={className}>
        {children}
    </div>
);

// Mock Background component
interface BackgroundProps {
    variant?: "dots" | "lines" | "cross";
    gap?: number;
    size?: number;
    color?: string;
    className?: string;
}

export const Background: React.FC<BackgroundProps> = ({ variant = "dots" }) => (
    <div data-testid="react-flow-background" data-variant={variant} />
);

// Mock Controls component
interface ControlsProps {
    className?: string;
    showZoom?: boolean;
    showFitView?: boolean;
    showInteractive?: boolean;
}

export const Controls: React.FC<ControlsProps> = ({ className }) => (
    <div data-testid="react-flow-controls" className={className} />
);

// Mock MiniMap component
interface MiniMapProps {
    className?: string;
    nodeColor?: string | ((node: unknown) => string);
    maskColor?: string;
}

export const MiniMap: React.FC<MiniMapProps> = ({ className }) => (
    <div data-testid="react-flow-minimap" className={className} />
);

// Edge types
export type Edge = {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    type?: string;
    selected?: boolean;
    data?: unknown;
};

// Node types
export type Node<T = unknown> = {
    id: string;
    type?: string;
    position: { x: number; y: number };
    data: T;
    selected?: boolean;
    style?: React.CSSProperties;
};

// Edge props type
export type EdgeProps = {
    id: string;
    source: string;
    target: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    sourcePosition: Position;
    targetPosition: Position;
    selected?: boolean;
    markerEnd?: string;
    data?: unknown;
};

// Node props type
export type NodeProps<T = unknown> = {
    id: string;
    type?: string;
    data: T;
    selected?: boolean;
    isConnectable?: boolean;
    xPos?: number;
    yPos?: number;
    dragging?: boolean;
    zIndex?: number;
};

// Default export as ReactFlow
export default ReactFlow;
