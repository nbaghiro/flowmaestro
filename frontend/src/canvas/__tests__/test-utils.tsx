/**
 * Canvas-specific test utilities
 *
 * Provides helpers for testing React Flow canvas components including:
 * - Rendering with React Flow context
 * - Creating mock node data for all node types
 * - Mock workflow store setup
 */

import { render, RenderOptions, RenderResult } from "@testing-library/react";
import React from "react";
import { vi } from "vitest";
import { ReactFlowProvider, resetMockState, setMockNodeId } from "./__mocks__/reactflow";
import type { NodeProps } from "reactflow";

// Re-export testing library utilities
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";

/**
 * Mock workflow store state
 */
interface MockWorkflowStoreState {
    nodes: unknown[];
    edges: unknown[];
    selectedNode: string | null;
    nodeValidation: Record<string, { errors: Array<{ field: string; message: string }> }>;
    workflowValidation: Array<{ nodeId: string; message: string }>;
    currentExecution: {
        nodeStates: Map<string, { status: string; duration?: number; error?: string }>;
    } | null;
}

/**
 * Default workflow store state for tests
 */
const defaultWorkflowStoreState: MockWorkflowStoreState = {
    nodes: [],
    edges: [],
    selectedNode: null,
    nodeValidation: {},
    workflowValidation: [],
    currentExecution: null
};

// Store state that can be modified by tests
let mockStoreState = { ...defaultWorkflowStoreState };

/**
 * Set mock workflow store state for tests
 */
export function setMockWorkflowStoreState(state: Partial<MockWorkflowStoreState>): void {
    mockStoreState = { ...defaultWorkflowStoreState, ...state };
}

/**
 * Reset mock workflow store state
 */
export function resetMockWorkflowStoreState(): void {
    mockStoreState = { ...defaultWorkflowStoreState };
}

/**
 * Get current mock workflow store state
 */
export function getMockWorkflowStoreState(): MockWorkflowStoreState {
    return mockStoreState;
}

/**
 * Mock workflow store hook
 * Use vi.mock to replace the real store in your test files
 */
export const createMockWorkflowStore = () => {
    const updateNode = vi.fn();
    const updateNodeStyle = vi.fn();
    const selectNode = vi.fn();
    const addNode = vi.fn();
    const removeNode = vi.fn();
    const setEdges = vi.fn();

    return {
        ...mockStoreState,
        updateNode,
        updateNodeStyle,
        selectNode,
        addNode,
        removeNode,
        setEdges,
        INITIAL_NODE_WIDTH: 260,
        INITIAL_NODE_HEIGHT: 120
    };
};

/**
 * Wrapper component that provides React Flow context
 */
interface WrapperProps {
    children: React.ReactNode;
}

function ReactFlowWrapper({ children }: WrapperProps): React.ReactElement {
    return <ReactFlowProvider>{children}</ReactFlowProvider>;
}

/**
 * Custom render function that wraps components in React Flow context
 */
export function renderWithReactFlow(
    ui: React.ReactElement,
    options?: Omit<RenderOptions, "wrapper">
): RenderResult {
    return render(ui, { wrapper: ReactFlowWrapper, ...options });
}

/**
 * Base node data interface
 */
interface BaseNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    connectorLayout?: "horizontal" | "vertical";
}

/**
 * Create mock node data for LLM node
 */
export function createMockLLMNodeData(overrides?: Record<string, unknown>): BaseNodeData & {
    provider: string;
    model: string;
    prompt: string;
    connectionId?: string;
} {
    return {
        label: "LLM",
        status: "idle",
        provider: "openai",
        model: "gpt-4",
        prompt: "Test prompt",
        ...overrides
    };
}

/**
 * Create mock node data for Conditional node
 */
export function createMockConditionalNodeData(overrides?: Record<string, unknown>): BaseNodeData & {
    condition: string;
    conditionType: string;
} {
    return {
        label: "Conditional",
        status: "idle",
        condition: "{{ value }} > 10",
        conditionType: "expression",
        ...overrides
    };
}

/**
 * Create mock node data for Input node
 */
export function createMockInputNodeData(overrides?: Record<string, unknown>): BaseNodeData & {
    inputType: string;
    outputVariable: string;
} {
    return {
        label: "Input",
        status: "idle",
        inputType: "text",
        outputVariable: "input",
        ...overrides
    };
}

/**
 * Create mock node data for Output node
 */
export function createMockOutputNodeData(overrides?: Record<string, unknown>): BaseNodeData & {
    outputVariable: string;
} {
    return {
        label: "Output",
        status: "idle",
        outputVariable: "result",
        ...overrides
    };
}

/**
 * Create mock node data for Code node
 */
export function createMockCodeNodeData(overrides?: Record<string, unknown>): BaseNodeData & {
    language: string;
    code: string;
    outputVariable: string;
} {
    return {
        label: "Code",
        status: "idle",
        language: "javascript",
        code: "return input * 2;",
        outputVariable: "result",
        ...overrides
    };
}

/**
 * Create mock node data for HTTP node
 */
export function createMockHTTPNodeData(overrides?: Record<string, unknown>): BaseNodeData & {
    method: string;
    url: string;
    outputVariable: string;
} {
    return {
        label: "HTTP",
        status: "idle",
        method: "GET",
        url: "https://api.example.com/data",
        outputVariable: "response",
        ...overrides
    };
}

/**
 * Create mock node data for Integration node
 */
export function createMockIntegrationNodeData(overrides?: Record<string, unknown>): BaseNodeData & {
    provider: string;
    operation: string;
    connectionId?: string;
} {
    return {
        label: "Integration",
        status: "idle",
        provider: "slack",
        operation: "send_message",
        ...overrides
    };
}

/**
 * Create mock node data for Loop node
 */
export function createMockLoopNodeData(overrides?: Record<string, unknown>): BaseNodeData & {
    iteratorVariable: string;
    itemVariable: string;
    indexVariable: string;
} {
    return {
        label: "Loop",
        status: "idle",
        iteratorVariable: "items",
        itemVariable: "item",
        indexVariable: "index",
        ...overrides
    };
}

/**
 * Create mock node data for Router node
 */
export function createMockRouterNodeData(overrides?: Record<string, unknown>): BaseNodeData & {
    routes: Array<{ id: string; label: string; description: string }>;
} {
    return {
        label: "Router",
        status: "idle",
        routes: [
            { id: "route-1", label: "Route A", description: "First route" },
            { id: "route-2", label: "Route B", description: "Second route" }
        ],
        ...overrides
    };
}

/**
 * Create mock node data for Switch node
 */
export function createMockSwitchNodeData(overrides?: Record<string, unknown>): BaseNodeData & {
    variable: string;
    cases: Array<{ id: string; value: string; label: string }>;
} {
    return {
        label: "Switch",
        status: "idle",
        variable: "status",
        cases: [
            { id: "case-1", value: "active", label: "Active" },
            { id: "case-2", value: "inactive", label: "Inactive" }
        ],
        ...overrides
    };
}

/**
 * Create mock node data for Transform node
 */
export function createMockTransformNodeData(overrides?: Record<string, unknown>): BaseNodeData & {
    transformType: string;
    expression: string;
    outputVariable: string;
} {
    return {
        label: "Transform",
        status: "idle",
        transformType: "jsonpath",
        expression: "$.data.items",
        outputVariable: "transformed",
        ...overrides
    };
}

/**
 * Create mock node data for Wait node
 */
export function createMockWaitNodeData(overrides?: Record<string, unknown>): BaseNodeData & {
    duration: number;
    unit: string;
} {
    return {
        label: "Wait",
        status: "idle",
        duration: 5,
        unit: "seconds",
        ...overrides
    };
}

/**
 * Create mock node data for Database node
 */
export function createMockDatabaseNodeData(overrides?: Record<string, unknown>): BaseNodeData & {
    connectionType: string;
    query: string;
    outputVariable: string;
} {
    return {
        label: "Database",
        status: "idle",
        connectionType: "postgresql",
        query: "SELECT * FROM users",
        outputVariable: "users",
        ...overrides
    };
}

/**
 * Create mock node data for any node type
 */
export function createMockNodeData(
    type: string,
    overrides?: Record<string, unknown>
): Record<string, unknown> {
    const baseData = {
        label: type.charAt(0).toUpperCase() + type.slice(1),
        status: "idle" as const
    };

    switch (type) {
        case "llm":
            return createMockLLMNodeData(overrides) as unknown as Record<string, unknown>;
        case "conditional":
            return createMockConditionalNodeData(overrides) as unknown as Record<string, unknown>;
        case "input":
            return createMockInputNodeData(overrides) as unknown as Record<string, unknown>;
        case "output":
            return createMockOutputNodeData(overrides) as unknown as Record<string, unknown>;
        case "code":
            return createMockCodeNodeData(overrides) as unknown as Record<string, unknown>;
        case "http":
            return createMockHTTPNodeData(overrides) as unknown as Record<string, unknown>;
        case "integration":
            return createMockIntegrationNodeData(overrides) as unknown as Record<string, unknown>;
        case "loop":
            return createMockLoopNodeData(overrides) as unknown as Record<string, unknown>;
        case "router":
            return createMockRouterNodeData(overrides) as unknown as Record<string, unknown>;
        case "switch":
            return createMockSwitchNodeData(overrides) as unknown as Record<string, unknown>;
        case "transform":
            return createMockTransformNodeData(overrides) as unknown as Record<string, unknown>;
        case "wait":
            return createMockWaitNodeData(overrides) as unknown as Record<string, unknown>;
        case "database":
            return createMockDatabaseNodeData(overrides) as unknown as Record<string, unknown>;
        default:
            return { ...baseData, ...overrides };
    }
}

/**
 * Create mock node props for testing node components
 */
export function createMockNodeProps<T extends Record<string, unknown>>(
    type: string,
    data: T,
    overrides?: Partial<NodeProps<T>>
): NodeProps<T> {
    return {
        id: `test-${type}-1`,
        type,
        data,
        selected: false,
        isConnectable: true,
        xPos: 100,
        yPos: 100,
        dragging: false,
        zIndex: 1,
        ...overrides
    };
}

/**
 * Create a mock edge for testing
 */
export function createMockEdge(overrides?: Record<string, unknown>) {
    return {
        id: "edge-1",
        source: "node-1",
        target: "node-2",
        sourceHandle: "output",
        targetHandle: "input",
        type: "custom",
        selected: false,
        ...overrides
    };
}

/**
 * Create mock edge props for testing CustomEdge
 */
export function createMockEdgeProps(overrides?: Record<string, unknown>) {
    return {
        id: "edge-1",
        source: "node-1",
        target: "node-2",
        sourceX: 100,
        sourceY: 50,
        targetX: 300,
        targetY: 50,
        sourcePosition: "right" as const,
        targetPosition: "left" as const,
        selected: false,
        markerEnd: undefined,
        ...overrides
    };
}

/**
 * Simulate drag start event with React Flow data
 */
export function createDragStartEvent(nodeType: string): Partial<React.DragEvent> {
    const dataTransfer = {
        setData: vi.fn(),
        getData: vi.fn(() => nodeType),
        effectAllowed: "move"
    };

    return {
        dataTransfer: dataTransfer as unknown as DataTransfer,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
    };
}

/**
 * Simulate drop event for adding nodes to canvas
 */
export function createDropEvent(
    nodeType: string,
    position: { clientX: number; clientY: number }
): Partial<React.DragEvent> {
    const dataTransfer = {
        getData: vi.fn(() => nodeType),
        effectAllowed: "move"
    };

    return {
        dataTransfer: dataTransfer as unknown as DataTransfer,
        clientX: position.clientX,
        clientY: position.clientY,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
    };
}

/**
 * Setup before each test - reset all mock state
 */
export function setupCanvasTest(): void {
    resetMockState();
    resetMockWorkflowStoreState();
    setMockNodeId("test-node-1");
}

/**
 * Common mock setup for workflow store
 * Usage: vi.mock("../../stores/workflowStore", () => createWorkflowStoreMock())
 */
export function createWorkflowStoreMock() {
    return {
        useWorkflowStore: vi.fn((selector?: (state: unknown) => unknown) => {
            const store = createMockWorkflowStore();
            if (selector) {
                return selector(store);
            }
            return store;
        }),
        INITIAL_NODE_WIDTH: 260,
        INITIAL_NODE_HEIGHT: 120
    };
}

/**
 * Wait for async React Flow updates
 */
export async function waitForReactFlow(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
}
