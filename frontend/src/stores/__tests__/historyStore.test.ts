/**
 * History Store Tests
 *
 * Tests for undo/redo functionality in the workflow builder.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the workflow store
vi.mock("../workflowStore", () => ({
    useWorkflowStore: {
        getState: vi.fn(() => ({
            nodes: [],
            edges: [],
            selectedNode: null
        })),
        setState: vi.fn(),
        subscribe: vi.fn(() => vi.fn())
    }
}));

import { useHistoryStore, historyInternal, initializeHistoryTracking } from "../historyStore";
import { useWorkflowStore } from "../workflowStore";

// Create mock snapshots
function createMockSnapshot(overrides?: Record<string, unknown>) {
    return {
        nodes: [
            {
                id: "node-1",
                type: "llm",
                position: { x: 100, y: 100 },
                data: { label: "Test Node" }
            }
        ],
        edges: [],
        selectedNode: null,
        ...overrides
    };
}

// Reset store before each test
function resetStore() {
    useHistoryStore.setState({
        past: [],
        future: []
    });
    historyInternal.isApplyingHistory = false;
    historyInternal.lastSnapshot = null;
}

describe("historyStore", () => {
    beforeEach(() => {
        resetStore();
        vi.clearAllMocks();
    });

    afterEach(() => {
        resetStore();
    });

    // ===== Initial State =====
    describe("initial state", () => {
        it("has correct initial state", () => {
            resetStore();
            const state = useHistoryStore.getState();

            expect(state.past).toEqual([]);
            expect(state.future).toEqual([]);
        });

        it("starts with canUndo false", () => {
            resetStore();
            expect(useHistoryStore.getState().canUndo()).toBe(false);
        });

        it("starts with canRedo false", () => {
            resetStore();
            expect(useHistoryStore.getState().canRedo()).toBe(false);
        });
    });

    // ===== Push =====
    describe("push", () => {
        it("adds snapshot to past", () => {
            const snapshot = createMockSnapshot();

            useHistoryStore.getState().push(snapshot);

            const state = useHistoryStore.getState();
            expect(state.past).toHaveLength(1);
            expect(state.past[0]).toEqual(snapshot);
        });

        it("clears future on new action", () => {
            useHistoryStore.setState({
                past: [createMockSnapshot()],
                future: [createMockSnapshot({ selectedNode: "node-2" })]
            });

            useHistoryStore.getState().push(createMockSnapshot({ selectedNode: "node-3" }));

            const state = useHistoryStore.getState();
            expect(state.future).toEqual([]);
        });

        it("maintains history order", () => {
            const snapshot1 = createMockSnapshot({ selectedNode: "node-1" });
            const snapshot2 = createMockSnapshot({ selectedNode: "node-2" });
            const snapshot3 = createMockSnapshot({ selectedNode: "node-3" });

            useHistoryStore.getState().push(snapshot1);
            useHistoryStore.getState().push(snapshot2);
            useHistoryStore.getState().push(snapshot3);

            const state = useHistoryStore.getState();
            expect(state.past).toHaveLength(3);
            expect(state.past[0].selectedNode).toBe("node-1");
            expect(state.past[2].selectedNode).toBe("node-3");
        });
    });

    // ===== Undo =====
    describe("undo", () => {
        it("restores previous state", () => {
            const previousSnapshot = createMockSnapshot({ selectedNode: "node-1" });
            const currentSnapshot = createMockSnapshot({ selectedNode: "node-2" });

            useHistoryStore.setState({ past: [previousSnapshot] });

            // Mock current workflow state
            vi.mocked(useWorkflowStore.getState).mockReturnValue({
                nodes: currentSnapshot.nodes,
                edges: currentSnapshot.edges,
                selectedNode: currentSnapshot.selectedNode
            } as ReturnType<typeof useWorkflowStore.getState>);

            useHistoryStore.getState().undo();

            // Should have called setState on workflow store
            expect(useWorkflowStore.setState).toHaveBeenCalled();

            const state = useHistoryStore.getState();
            expect(state.past).toHaveLength(0);
            expect(state.future).toHaveLength(1);
        });

        it("does nothing when past is empty", () => {
            useHistoryStore.getState().undo();

            expect(useWorkflowStore.setState).not.toHaveBeenCalled();
        });

        it("moves current state to future", () => {
            const snapshot1 = createMockSnapshot({ selectedNode: "node-1" });
            useHistoryStore.setState({ past: [snapshot1] });

            vi.mocked(useWorkflowStore.getState).mockReturnValue({
                nodes: [],
                edges: [],
                selectedNode: "current"
            } as unknown as ReturnType<typeof useWorkflowStore.getState>);

            useHistoryStore.getState().undo();

            const state = useHistoryStore.getState();
            expect(state.future[0].selectedNode).toBe("current");
        });

        it("sets isApplyingHistory during undo", () => {
            const snapshot = createMockSnapshot();
            useHistoryStore.setState({ past: [snapshot] });

            let capturedIsApplying = false;
            vi.mocked(useWorkflowStore.setState).mockImplementation(() => {
                capturedIsApplying = historyInternal.isApplyingHistory;
            });

            useHistoryStore.getState().undo();

            expect(capturedIsApplying).toBe(true);
            expect(historyInternal.isApplyingHistory).toBe(false);
        });
    });

    // ===== Redo =====
    describe("redo", () => {
        it("restores next state", () => {
            const futureSnapshot = createMockSnapshot({ selectedNode: "node-future" });

            useHistoryStore.setState({ future: [futureSnapshot] });

            vi.mocked(useWorkflowStore.getState).mockReturnValue({
                nodes: [],
                edges: [],
                selectedNode: "current"
            } as unknown as ReturnType<typeof useWorkflowStore.getState>);

            useHistoryStore.getState().redo();

            expect(useWorkflowStore.setState).toHaveBeenCalled();

            const state = useHistoryStore.getState();
            expect(state.future).toHaveLength(0);
            expect(state.past).toHaveLength(1);
        });

        it("does nothing when future is empty", () => {
            useHistoryStore.getState().redo();

            expect(useWorkflowStore.setState).not.toHaveBeenCalled();
        });

        it("moves current state to past", () => {
            const futureSnapshot = createMockSnapshot();
            useHistoryStore.setState({ future: [futureSnapshot] });

            vi.mocked(useWorkflowStore.getState).mockReturnValue({
                nodes: [],
                edges: [],
                selectedNode: "current"
            } as unknown as ReturnType<typeof useWorkflowStore.getState>);

            useHistoryStore.getState().redo();

            const state = useHistoryStore.getState();
            expect(state.past[0].selectedNode).toBe("current");
        });

        it("sets isApplyingHistory during redo", () => {
            const snapshot = createMockSnapshot();
            useHistoryStore.setState({ future: [snapshot] });

            let capturedIsApplying = false;
            vi.mocked(useWorkflowStore.setState).mockImplementation(() => {
                capturedIsApplying = historyInternal.isApplyingHistory;
            });

            useHistoryStore.getState().redo();

            expect(capturedIsApplying).toBe(true);
            expect(historyInternal.isApplyingHistory).toBe(false);
        });
    });

    // ===== Clear =====
    describe("clear", () => {
        it("clears all history", () => {
            useHistoryStore.setState({
                past: [createMockSnapshot(), createMockSnapshot()],
                future: [createMockSnapshot()]
            });
            historyInternal.lastSnapshot = createMockSnapshot();

            useHistoryStore.getState().clear();

            const state = useHistoryStore.getState();
            expect(state.past).toEqual([]);
            expect(state.future).toEqual([]);
            expect(historyInternal.lastSnapshot).toBeNull();
        });
    });

    // ===== canUndo / canRedo =====
    describe("canUndo/canRedo", () => {
        it("canUndo returns true when past has items", () => {
            useHistoryStore.setState({ past: [createMockSnapshot()] });
            expect(useHistoryStore.getState().canUndo()).toBe(true);
        });

        it("canUndo returns false when past is empty", () => {
            useHistoryStore.setState({ past: [] });
            expect(useHistoryStore.getState().canUndo()).toBe(false);
        });

        it("canRedo returns true when future has items", () => {
            useHistoryStore.setState({ future: [createMockSnapshot()] });
            expect(useHistoryStore.getState().canRedo()).toBe(true);
        });

        it("canRedo returns false when future is empty", () => {
            useHistoryStore.setState({ future: [] });
            expect(useHistoryStore.getState().canRedo()).toBe(false);
        });
    });

    // ===== Undo/Redo Workflow =====
    describe("undo/redo workflow", () => {
        it("supports multiple undos and redos", () => {
            // Build up history
            useHistoryStore.getState().push(createMockSnapshot({ selectedNode: "state-1" }));
            useHistoryStore.getState().push(createMockSnapshot({ selectedNode: "state-2" }));
            useHistoryStore.getState().push(createMockSnapshot({ selectedNode: "state-3" }));

            expect(useHistoryStore.getState().past).toHaveLength(3);
            expect(useHistoryStore.getState().canUndo()).toBe(true);

            // Mock current state for undos
            vi.mocked(useWorkflowStore.getState).mockReturnValue({
                nodes: [],
                edges: [],
                selectedNode: "state-4"
            } as unknown as ReturnType<typeof useWorkflowStore.getState>);

            // Undo multiple times
            useHistoryStore.getState().undo();
            expect(useHistoryStore.getState().past).toHaveLength(2);
            expect(useHistoryStore.getState().future).toHaveLength(1);

            useHistoryStore.getState().undo();
            expect(useHistoryStore.getState().past).toHaveLength(1);
            expect(useHistoryStore.getState().future).toHaveLength(2);

            // Redo
            useHistoryStore.getState().redo();
            expect(useHistoryStore.getState().past).toHaveLength(2);
            expect(useHistoryStore.getState().future).toHaveLength(1);
        });
    });
});

// ===== History Internal State =====
describe("historyInternal", () => {
    beforeEach(() => {
        historyInternal.isApplyingHistory = false;
        historyInternal.lastSnapshot = null;
    });

    it("tracks isApplyingHistory flag", () => {
        expect(historyInternal.isApplyingHistory).toBe(false);

        historyInternal.isApplyingHistory = true;
        expect(historyInternal.isApplyingHistory).toBe(true);
    });

    it("tracks lastSnapshot", () => {
        expect(historyInternal.lastSnapshot).toBeNull();

        const snapshot = createMockSnapshot();
        historyInternal.lastSnapshot = snapshot;
        expect(historyInternal.lastSnapshot).toEqual(snapshot);
    });
});

// ===== Initialize History Tracking =====
describe("initializeHistoryTracking", () => {
    beforeEach(() => {
        resetStore();
        vi.clearAllMocks();
    });

    it("returns unsubscribe function", () => {
        const unsubscribe = initializeHistoryTracking();
        expect(typeof unsubscribe).toBe("function");
    });

    it("subscribes to workflow store", () => {
        initializeHistoryTracking();
        expect(useWorkflowStore.subscribe).toHaveBeenCalled();
    });

    it("resets lastSnapshot on init", () => {
        historyInternal.lastSnapshot = createMockSnapshot();

        initializeHistoryTracking();

        expect(historyInternal.lastSnapshot).toBeNull();
    });
});
