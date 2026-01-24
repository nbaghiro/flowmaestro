/**
 * Workflow Store Tests
 *
 * Tests for workflow state management including node/edge operations,
 * execution state, and validation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    createMockFetchResponse,
    createMockWorkflowNode,
    createMockWorkflowEdge,
    createMockAuthToken,
    mockFetchOnce
} from "../../lib/tests/test-helpers";
import { useWorkflowStore, INITIAL_NODE_WIDTH, INITIAL_NODE_HEIGHT } from "../workflowStore";
import type { Node, Edge } from "reactflow";

// Reset store before each test
function resetStore() {
    useWorkflowStore.setState({
        nodes: [],
        edges: [],
        selectedNode: null,
        aiGenerated: false,
        aiPrompt: null,
        isExecuting: false,
        executionResult: null,
        executionError: null,
        currentExecution: null,
        nodeValidation: {}
    });
}

describe("workflowStore", () => {
    beforeEach(() => {
        resetStore();
        localStorage.clear();
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        resetStore();
        vi.useRealTimers();
    });

    // ===== Initial State =====
    describe("initial state", () => {
        it("has correct initial state", () => {
            resetStore();
            const state = useWorkflowStore.getState();

            expect(state.nodes).toEqual([]);
            expect(state.edges).toEqual([]);
            expect(state.selectedNode).toBeNull();
            expect(state.aiGenerated).toBe(false);
            expect(state.aiPrompt).toBeNull();
            expect(state.isExecuting).toBe(false);
            expect(state.executionResult).toBeNull();
            expect(state.executionError).toBeNull();
            expect(state.currentExecution).toBeNull();
        });
    });

    // ===== Node Management =====
    describe("node management", () => {
        describe("setNodes", () => {
            it("sets nodes with default dimensions", () => {
                const nodes = [
                    createMockWorkflowNode({ id: "node-1" }),
                    createMockWorkflowNode({ id: "node-2" })
                ] as Node[];

                useWorkflowStore.getState().setNodes(nodes);
                vi.runAllTimers(); // Run validation timer

                const state = useWorkflowStore.getState();
                expect(state.nodes).toHaveLength(2);
                expect(state.nodes[0].style?.width).toBe(INITIAL_NODE_WIDTH);
                expect(state.nodes[0].style?.height).toBe(INITIAL_NODE_HEIGHT);
            });

            it("preserves custom node dimensions", () => {
                const nodes = [
                    createMockWorkflowNode({
                        id: "node-1",
                        style: { width: 400, height: 300 }
                    })
                ] as Node[];

                useWorkflowStore.getState().setNodes(nodes);

                const state = useWorkflowStore.getState();
                expect(state.nodes[0].style?.width).toBe(400);
                expect(state.nodes[0].style?.height).toBe(300);
            });

            it("triggers validation after setting nodes", () => {
                const nodes = [createMockWorkflowNode({ id: "node-1", type: "llm" })] as Node[];

                useWorkflowStore.getState().setNodes(nodes);
                vi.runAllTimers();

                const state = useWorkflowStore.getState();
                expect(state.nodeValidation).toHaveProperty("node-1");
            });
        });

        describe("addNode", () => {
            it("adds node to store", () => {
                const node = createMockWorkflowNode({ id: "new-node" }) as Node;

                useWorkflowStore.getState().addNode(node);

                const state = useWorkflowStore.getState();
                expect(state.nodes).toHaveLength(1);
                expect(state.nodes[0].id).toBe("new-node");
            });

            it("sets default dimensions on added node", () => {
                const node = createMockWorkflowNode({ id: "new-node" }) as Node;

                useWorkflowStore.getState().addNode(node);

                const state = useWorkflowStore.getState();
                expect(state.nodes[0].style?.width).toBe(INITIAL_NODE_WIDTH);
                expect(state.nodes[0].style?.height).toBe(INITIAL_NODE_HEIGHT);
            });

            it("validates node after adding", () => {
                const node = createMockWorkflowNode({
                    id: "new-node",
                    type: "llm"
                }) as Node;

                useWorkflowStore.getState().addNode(node);

                const state = useWorkflowStore.getState();
                expect(state.nodeValidation).toHaveProperty("new-node");
            });
        });

        describe("updateNode", () => {
            it("updates node data", () => {
                const node = createMockWorkflowNode({ id: "node-1" }) as Node;
                useWorkflowStore.getState().addNode(node);

                useWorkflowStore.getState().updateNode("node-1", { label: "Updated" });

                const state = useWorkflowStore.getState();
                expect(state.nodes[0].data.label).toBe("Updated");
            });

            it("preserves existing data when updating", () => {
                const node = createMockWorkflowNode({
                    id: "node-1",
                    data: { label: "Original", config: { key: "value" } }
                }) as Node;
                useWorkflowStore.getState().addNode(node);

                useWorkflowStore.getState().updateNode("node-1", { label: "Updated" });

                const state = useWorkflowStore.getState();
                expect(state.nodes[0].data.config).toEqual({ key: "value" });
            });

            it("re-validates node after update", () => {
                const node = createMockWorkflowNode({
                    id: "node-1",
                    type: "llm"
                }) as Node;
                useWorkflowStore.getState().addNode(node);

                // Update with new config
                useWorkflowStore.getState().updateNode("node-1", {
                    config: { prompt: "test" }
                });

                const state = useWorkflowStore.getState();
                expect(state.nodeValidation).toHaveProperty("node-1");
            });
        });

        describe("updateNodeStyle", () => {
            it("updates node style", () => {
                const node = createMockWorkflowNode({ id: "node-1" }) as Node;
                useWorkflowStore.getState().addNode(node);

                useWorkflowStore.getState().updateNodeStyle("node-1", {
                    width: 500,
                    backgroundColor: "red"
                });

                const state = useWorkflowStore.getState();
                expect(state.nodes[0].style?.width).toBe(500);
                expect(state.nodes[0].style?.backgroundColor).toBe("red");
            });
        });

        describe("deleteNode", () => {
            it("removes node from store", () => {
                useWorkflowStore.setState({
                    nodes: [
                        createMockWorkflowNode({ id: "node-1" }),
                        createMockWorkflowNode({ id: "node-2" })
                    ] as Node[]
                });

                useWorkflowStore.getState().deleteNode("node-1");

                const state = useWorkflowStore.getState();
                expect(state.nodes).toHaveLength(1);
                expect(state.nodes[0].id).toBe("node-2");
            });

            it("removes connected edges when deleting node", () => {
                useWorkflowStore.setState({
                    nodes: [
                        createMockWorkflowNode({ id: "node-1" }),
                        createMockWorkflowNode({ id: "node-2" }),
                        createMockWorkflowNode({ id: "node-3" })
                    ] as Node[],
                    edges: [
                        createMockWorkflowEdge({ id: "e1", source: "node-1", target: "node-2" }),
                        createMockWorkflowEdge({ id: "e2", source: "node-2", target: "node-3" })
                    ] as Edge[]
                });

                useWorkflowStore.getState().deleteNode("node-2");

                const state = useWorkflowStore.getState();
                expect(state.edges).toHaveLength(0);
            });

            it("clears selection when deleting selected node", () => {
                useWorkflowStore.setState({
                    nodes: [createMockWorkflowNode({ id: "node-1" })] as Node[],
                    selectedNode: "node-1"
                });

                useWorkflowStore.getState().deleteNode("node-1");

                expect(useWorkflowStore.getState().selectedNode).toBeNull();
            });

            it("preserves selection when deleting different node", () => {
                useWorkflowStore.setState({
                    nodes: [
                        createMockWorkflowNode({ id: "node-1" }),
                        createMockWorkflowNode({ id: "node-2" })
                    ] as Node[],
                    selectedNode: "node-1"
                });

                useWorkflowStore.getState().deleteNode("node-2");

                expect(useWorkflowStore.getState().selectedNode).toBe("node-1");
            });
        });

        describe("selectNode", () => {
            it("sets selected node", () => {
                useWorkflowStore.getState().selectNode("node-1");

                expect(useWorkflowStore.getState().selectedNode).toBe("node-1");
            });

            it("clears selection when passed null", () => {
                useWorkflowStore.setState({ selectedNode: "node-1" });

                useWorkflowStore.getState().selectNode(null);

                expect(useWorkflowStore.getState().selectedNode).toBeNull();
            });
        });
    });

    // ===== Edge Management =====
    describe("edge management", () => {
        describe("setEdges", () => {
            it("sets edges in store", () => {
                const edges = [
                    createMockWorkflowEdge({ id: "e1" }),
                    createMockWorkflowEdge({ id: "e2" })
                ] as Edge[];

                useWorkflowStore.getState().setEdges(edges);

                expect(useWorkflowStore.getState().edges).toHaveLength(2);
            });
        });

        describe("onEdgesChange", () => {
            it("applies edge changes", () => {
                useWorkflowStore.setState({
                    edges: [
                        createMockWorkflowEdge({ id: "e1", source: "n1", target: "n2" })
                    ] as Edge[]
                });

                useWorkflowStore.getState().onEdgesChange([{ type: "remove", id: "e1" }]);

                expect(useWorkflowStore.getState().edges).toHaveLength(0);
            });
        });
    });

    // ===== Execution State =====
    describe("execution state management", () => {
        describe("startExecution", () => {
            it("initializes execution state", () => {
                useWorkflowStore.getState().startExecution("exec-123", "trigger-456");

                const state = useWorkflowStore.getState();
                expect(state.currentExecution).not.toBeNull();
                expect(state.currentExecution?.id).toBe("exec-123");
                expect(state.currentExecution?.status).toBe("running");
                expect(state.currentExecution?.triggerId).toBe("trigger-456");
                expect(state.currentExecution?.nodeStates.size).toBe(0);
                expect(state.currentExecution?.logs).toHaveLength(0);
            });

            it("sets startedAt timestamp", () => {
                const before = Date.now();
                useWorkflowStore.getState().startExecution("exec-123");
                const after = Date.now();

                const startedAt = useWorkflowStore.getState().currentExecution?.startedAt;
                expect(startedAt).toBeDefined();
                expect(startedAt!.getTime()).toBeGreaterThanOrEqual(before);
                expect(startedAt!.getTime()).toBeLessThanOrEqual(after);
            });
        });

        describe("updateExecutionStatus", () => {
            beforeEach(() => {
                useWorkflowStore.getState().startExecution("exec-123");
            });

            it("updates execution status", () => {
                useWorkflowStore.getState().updateExecutionStatus("paused");

                expect(useWorkflowStore.getState().currentExecution?.status).toBe("paused");
            });

            it("sets completedAt for terminal statuses", () => {
                useWorkflowStore.getState().updateExecutionStatus("completed");

                const state = useWorkflowStore.getState();
                expect(state.currentExecution?.completedAt).not.toBeNull();
                expect(state.currentExecution?.duration).not.toBeNull();
            });

            it("does not set completedAt for non-terminal statuses", () => {
                useWorkflowStore.getState().updateExecutionStatus("paused");

                const state = useWorkflowStore.getState();
                expect(state.currentExecution?.completedAt).toBeNull();
            });

            it("does nothing if no current execution", () => {
                useWorkflowStore.setState({ currentExecution: null });

                // Should not throw
                useWorkflowStore.getState().updateExecutionStatus("completed");
            });
        });

        describe("updateNodeState", () => {
            beforeEach(() => {
                useWorkflowStore.getState().startExecution("exec-123");
            });

            it("updates node execution state", () => {
                useWorkflowStore.getState().updateNodeState("node-1", {
                    status: "running",
                    startedAt: new Date()
                });

                const nodeState = useWorkflowStore
                    .getState()
                    .currentExecution?.nodeStates.get("node-1");
                expect(nodeState?.status).toBe("running");
            });

            it("calculates duration when completed", () => {
                const startedAt = new Date(Date.now() - 1000);

                useWorkflowStore.getState().updateNodeState("node-1", {
                    status: "running",
                    startedAt
                });

                useWorkflowStore.getState().updateNodeState("node-1", {
                    status: "success",
                    completedAt: new Date()
                });

                const nodeState = useWorkflowStore
                    .getState()
                    .currentExecution?.nodeStates.get("node-1");
                expect(nodeState?.duration).toBeGreaterThanOrEqual(1000);
            });

            it("preserves existing state when updating", () => {
                useWorkflowStore.getState().updateNodeState("node-1", {
                    status: "running",
                    startedAt: new Date()
                });

                useWorkflowStore.getState().updateNodeState("node-1", {
                    output: { result: "test" }
                });

                const nodeState = useWorkflowStore
                    .getState()
                    .currentExecution?.nodeStates.get("node-1");
                expect(nodeState?.status).toBe("running");
                expect(nodeState?.output).toEqual({ result: "test" });
            });
        });

        describe("addExecutionLog", () => {
            beforeEach(() => {
                useWorkflowStore.getState().startExecution("exec-123");
            });

            it("adds log entry with generated id and timestamp", () => {
                useWorkflowStore.getState().addExecutionLog({
                    level: "info",
                    message: "Test message",
                    nodeId: "node-1"
                });

                const logs = useWorkflowStore.getState().currentExecution?.logs;
                expect(logs).toHaveLength(1);
                expect(logs![0].id).toMatch(/^log-/);
                expect(logs![0].timestamp).toBeInstanceOf(Date);
                expect(logs![0].message).toBe("Test message");
            });

            it("accumulates multiple logs", () => {
                useWorkflowStore.getState().addExecutionLog({
                    level: "info",
                    message: "First"
                });
                useWorkflowStore.getState().addExecutionLog({
                    level: "error",
                    message: "Second"
                });

                expect(useWorkflowStore.getState().currentExecution?.logs).toHaveLength(2);
            });
        });

        describe("updateVariable", () => {
            beforeEach(() => {
                useWorkflowStore.getState().startExecution("exec-123");
            });

            it("sets variable value", () => {
                useWorkflowStore.getState().updateVariable("result", "Hello");

                const variables = useWorkflowStore.getState().currentExecution?.variables;
                expect(variables?.get("result")).toBe("Hello");
            });

            it("updates existing variable", () => {
                useWorkflowStore.getState().updateVariable("count", 1);
                useWorkflowStore.getState().updateVariable("count", 2);

                expect(useWorkflowStore.getState().currentExecution?.variables.get("count")).toBe(
                    2
                );
            });
        });

        describe("setPauseContext", () => {
            beforeEach(() => {
                useWorkflowStore.getState().startExecution("exec-123");
            });

            it("sets pause context and updates status", () => {
                useWorkflowStore.getState().setPauseContext({
                    reason: "user_input",
                    nodeId: "node-1",
                    pausedAt: Date.now(),
                    variableName: "userInput",
                    inputType: "text"
                });

                const state = useWorkflowStore.getState();
                expect(state.currentExecution?.pauseContext).not.toBeNull();
                expect(state.currentExecution?.status).toBe("paused");
            });

            it("clears pause context when passed null", () => {
                useWorkflowStore.getState().setPauseContext({
                    reason: "user_input",
                    nodeId: "node-1",
                    pausedAt: Date.now(),
                    variableName: "userInput",
                    inputType: "text"
                });

                useWorkflowStore.getState().setPauseContext(null);

                expect(useWorkflowStore.getState().currentExecution?.pauseContext).toBeNull();
            });
        });

        describe("clearExecution", () => {
            it("clears current execution", () => {
                useWorkflowStore.getState().startExecution("exec-123");
                useWorkflowStore.getState().clearExecution();

                expect(useWorkflowStore.getState().currentExecution).toBeNull();
            });
        });
    });

    // ===== Reset Workflow =====
    describe("resetWorkflow", () => {
        it("resets all workflow state", () => {
            // Set up some state
            useWorkflowStore.setState({
                nodes: [createMockWorkflowNode({ id: "node-1" })] as Node[],
                edges: [createMockWorkflowEdge({ id: "e1" })] as Edge[],
                selectedNode: "node-1",
                aiGenerated: true,
                aiPrompt: "Test prompt",
                isExecuting: true,
                executionResult: { result: "test" },
                executionError: "some error",
                nodeValidation: { "node-1": { isValid: true, errors: [] } }
            });
            useWorkflowStore.getState().startExecution("exec-123");

            useWorkflowStore.getState().resetWorkflow();

            const state = useWorkflowStore.getState();
            expect(state.nodes).toHaveLength(0);
            expect(state.edges).toHaveLength(0);
            expect(state.selectedNode).toBeNull();
            expect(state.aiGenerated).toBe(false);
            expect(state.aiPrompt).toBeNull();
            expect(state.isExecuting).toBe(false);
            expect(state.executionResult).toBeNull();
            expect(state.executionError).toBeNull();
            expect(state.currentExecution).toBeNull();
            expect(state.nodeValidation).toEqual({});
        });
    });

    // ===== AI Metadata =====
    describe("setAIMetadata", () => {
        it("sets AI generated flag and prompt", () => {
            useWorkflowStore.getState().setAIMetadata(true, "Generate a workflow");

            const state = useWorkflowStore.getState();
            expect(state.aiGenerated).toBe(true);
            expect(state.aiPrompt).toBe("Generate a workflow");
        });

        it("clears AI metadata", () => {
            useWorkflowStore.setState({ aiGenerated: true, aiPrompt: "test" });

            useWorkflowStore.getState().setAIMetadata(false, null);

            const state = useWorkflowStore.getState();
            expect(state.aiGenerated).toBe(false);
            expect(state.aiPrompt).toBeNull();
        });
    });

    // ===== Validation =====
    describe("validation", () => {
        describe("validateNode", () => {
            it("validates node configuration", () => {
                useWorkflowStore.setState({
                    nodes: [
                        createMockWorkflowNode({
                            id: "node-1",
                            type: "llm",
                            data: { connectionId: "conn-1" }
                        })
                    ] as Node[]
                });

                useWorkflowStore.getState().validateNode("node-1");

                const validation = useWorkflowStore.getState().nodeValidation["node-1"];
                expect(validation).toBeDefined();
            });

            it("does nothing for non-existent node", () => {
                useWorkflowStore.getState().validateNode("nonexistent");

                expect(useWorkflowStore.getState().nodeValidation["nonexistent"]).toBeUndefined();
            });
        });

        describe("validateAllNodes", () => {
            it("validates all nodes", () => {
                useWorkflowStore.setState({
                    nodes: [
                        createMockWorkflowNode({ id: "node-1", type: "llm" }),
                        createMockWorkflowNode({ id: "node-2", type: "http" })
                    ] as Node[]
                });

                useWorkflowStore.getState().validateAllNodes();

                const validation = useWorkflowStore.getState().nodeValidation;
                expect(validation).toHaveProperty("node-1");
                expect(validation).toHaveProperty("node-2");
            });
        });
    });

    // ===== Execute Workflow =====
    describe("executeWorkflow", () => {
        beforeEach(() => {
            localStorage.setItem("auth_token", createMockAuthToken());
            vi.useRealTimers();
        });

        it("sets isExecuting during execution", async () => {
            useWorkflowStore.setState({
                nodes: [createMockWorkflowNode({ id: "node-1", type: "llm" })] as Node[],
                edges: []
            });

            mockFetchOnce(
                createMockFetchResponse({
                    success: true,
                    data: {
                        workflowId: "wf-123",
                        result: { success: true, outputs: {} }
                    }
                })
            );

            const promise = useWorkflowStore.getState().executeWorkflow({});

            expect(useWorkflowStore.getState().isExecuting).toBe(true);

            await promise;

            expect(useWorkflowStore.getState().isExecuting).toBe(false);
        });

        it("stores execution result on success", async () => {
            useWorkflowStore.setState({
                nodes: [createMockWorkflowNode({ id: "node-1", type: "llm" })] as Node[],
                edges: []
            });

            mockFetchOnce(
                createMockFetchResponse({
                    success: true,
                    data: {
                        workflowId: "wf-123",
                        result: { success: true, outputs: { answer: "42" } }
                    }
                })
            );

            await useWorkflowStore.getState().executeWorkflow({});

            const state = useWorkflowStore.getState();
            expect(state.executionResult).toEqual({ success: true, outputs: { answer: "42" } });
            expect(state.executionError).toBeNull();
        });

        it("stores error on failure", async () => {
            useWorkflowStore.setState({
                nodes: [createMockWorkflowNode({ id: "node-1", type: "llm" })] as Node[],
                edges: []
            });

            vi.mocked(fetch).mockRejectedValueOnce(new Error("Execution failed"));

            await useWorkflowStore.getState().executeWorkflow({});

            const state = useWorkflowStore.getState();
            expect(state.executionError).toBe("Execution failed");
            expect(state.isExecuting).toBe(false);
        });

        it("sets error for empty workflow", async () => {
            useWorkflowStore.setState({ nodes: [], edges: [] });

            await useWorkflowStore.getState().executeWorkflow({});

            expect(useWorkflowStore.getState().executionError).toBe("Workflow is empty");
        });

        it("excludes comment nodes from execution", async () => {
            useWorkflowStore.setState({
                nodes: [
                    createMockWorkflowNode({ id: "node-1", type: "llm" }),
                    createMockWorkflowNode({ id: "comment-1", type: "comment" })
                ] as Node[],
                edges: []
            });

            mockFetchOnce(
                createMockFetchResponse({
                    success: true,
                    data: {
                        workflowId: "wf-123",
                        result: { success: true, outputs: {} }
                    }
                })
            );

            await useWorkflowStore.getState().executeWorkflow({});

            const fetchCall = vi.mocked(fetch).mock.calls[0];
            const body = JSON.parse(fetchCall[1]?.body as string);
            expect(body.workflowDefinition.nodes).toHaveLength(1);
            expect(body.workflowDefinition.nodes[0].type).toBe("llm");
        });
    });
});
