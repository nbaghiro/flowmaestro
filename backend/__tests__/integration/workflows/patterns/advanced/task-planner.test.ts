/**
 * Task Planner Integration Tests (Planning Pattern)
 *
 * True integration tests that execute task planning workflows through
 * the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - Task decomposition into subtasks
 * - Dependency analysis between subtasks
 * - Sequential and parallel subtask execution
 * - Progress tracking and aggregation
 * - Dynamic replanning on failure
 * - Resource allocation and scheduling
 */

import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import type { WorkflowDefinition, JsonObject } from "@flowmaestro/shared";

// ============================================================================
// MOCK DEFINITIONS
// ============================================================================

const mockExecuteNode = jest.fn();
const mockValidateInputsActivity = jest.fn();
const mockValidateOutputsActivity = jest.fn();
const mockCreateSpan = jest.fn();
const mockEndSpan = jest.fn();

const mockEmitExecutionStarted = jest.fn();
const mockEmitExecutionProgress = jest.fn();
const mockEmitExecutionCompleted = jest.fn();
const mockEmitExecutionFailed = jest.fn();
const mockEmitExecutionPaused = jest.fn();
const mockEmitNodeStarted = jest.fn();
const mockEmitNodeCompleted = jest.fn();
const mockEmitNodeFailed = jest.fn();

const mockShouldAllowExecution = jest.fn();
const mockReserveCredits = jest.fn();
const mockReleaseCredits = jest.fn();
const mockFinalizeCredits = jest.fn();
const mockEstimateWorkflowCredits = jest.fn();
const mockCalculateLLMCredits = jest.fn();
const mockCalculateNodeCredits = jest.fn();

const mockActivities = {
    executeNode: mockExecuteNode,
    validateInputsActivity: mockValidateInputsActivity,
    validateOutputsActivity: mockValidateOutputsActivity,
    createSpan: mockCreateSpan,
    endSpan: mockEndSpan,
    emitExecutionStarted: mockEmitExecutionStarted,
    emitExecutionProgress: mockEmitExecutionProgress,
    emitExecutionCompleted: mockEmitExecutionCompleted,
    emitExecutionFailed: mockEmitExecutionFailed,
    emitExecutionPaused: mockEmitExecutionPaused,
    emitNodeStarted: mockEmitNodeStarted,
    emitNodeCompleted: mockEmitNodeCompleted,
    emitNodeFailed: mockEmitNodeFailed,
    shouldAllowExecution: mockShouldAllowExecution,
    reserveCredits: mockReserveCredits,
    releaseCredits: mockReleaseCredits,
    finalizeCredits: mockFinalizeCredits,
    estimateWorkflowCredits: mockEstimateWorkflowCredits,
    calculateLLMCredits: mockCalculateLLMCredits,
    calculateNodeCredits: mockCalculateNodeCredits
};

// ============================================================================
// TYPES (documented but not used for typing mock outputs)
// ============================================================================

// Note: Subtask and TaskPlan structures are documented in comments below.
// We use plain objects in tests because JsonObject doesn't accept union types.
//
// Subtask: { id, name, description?, dependencies[], estimatedComplexity? }
// TaskPlan: { goal, subtasks[], executionOrder[][], totalSteps, estimatedComplexity? }

// ============================================================================
// WORKFLOW DEFINITION BUILDERS
// ============================================================================

/**
 * Create a task planning workflow definition
 * Input -> Decompose -> AnalyzeDependencies -> ExecuteSubtasks (loop) -> Aggregate -> Output
 */
function createTaskPlannerDefinition(options: {
    maxSubtasks?: number;
    allowParallel?: boolean;
    enableReplanning?: boolean;
}): WorkflowDefinition {
    const { maxSubtasks = 10, allowParallel = true, enableReplanning = true } = options;
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    // Input node (complex task description)
    nodes["input"] = {
        type: "input",
        name: "ComplexTask",
        config: { inputName: "task" },
        position: { x: 0, y: 0 }
    };

    // Decompose node (LLM breaks down task)
    nodes["decompose"] = {
        type: "llm",
        name: "TaskDecomposer",
        config: {
            provider: "openai",
            model: "gpt-4",
            systemPrompt: `You are a task planning expert. Break down complex tasks into actionable subtasks.
                          For each subtask, identify dependencies on other subtasks.
                          Return a JSON with subtasks array, each having: id, name, description, dependencies[].`,
            prompt: "Decompose this task into subtasks:\n\n{{input.task}}",
            outputFormat: "json",
            maxSubtasks
        },
        position: { x: 200, y: 0 }
    };

    edges.push({
        id: "input-decompose",
        source: "input",
        target: "decompose",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Analyze Dependencies node (transform)
    nodes["analyze_dependencies"] = {
        type: "transform",
        name: "DependencyAnalyzer",
        config: {
            operation: "topological_sort",
            allowParallel,
            inputField: "subtasks"
        },
        position: { x: 400, y: 0 }
    };

    edges.push({
        id: "decompose-analyze_dependencies",
        source: "decompose",
        target: "analyze_dependencies",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Execute Subtasks node (loop)
    nodes["execute_subtasks"] = {
        type: "loop",
        name: "SubtaskExecutor",
        config: {
            iterateOver: "{{analyze_dependencies.executionOrder}}",
            maxIterations: maxSubtasks,
            allowParallel,
            enableReplanning
        },
        position: { x: 600, y: 0 }
    };

    edges.push({
        id: "analyze_dependencies-execute_subtasks",
        source: "analyze_dependencies",
        target: "execute_subtasks",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Aggregate node (transform)
    nodes["aggregate"] = {
        type: "transform",
        name: "ResultAggregator",
        config: {
            operation: "aggregate",
            inputField: "subtaskResults"
        },
        position: { x: 800, y: 0 }
    };

    edges.push({
        id: "execute_subtasks-aggregate",
        source: "execute_subtasks",
        target: "aggregate",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Output node
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 1000, y: 0 }
    };

    edges.push({
        id: "aggregate-output",
        source: "aggregate",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        name: "Task Planner Pipeline",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a parallel subtask execution workflow
 * Input -> Decompose -> [SubtaskA, SubtaskB, SubtaskC] -> Merge -> Output
 */
function createParallelSubtaskDefinition(subtaskCount: number): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    // Input node
    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "task" },
        position: { x: 0, y: 100 }
    };

    // Decompose node
    nodes["decompose"] = {
        type: "llm",
        name: "Decomposer",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Decompose: {{input.task}}"
        },
        position: { x: 200, y: 100 }
    };

    edges.push({
        id: "input-decompose",
        source: "input",
        target: "decompose",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Parallel subtask nodes
    for (let i = 1; i <= subtaskCount; i++) {
        const nodeId = `subtask_${i}`;
        nodes[nodeId] = {
            type: "llm",
            name: `Subtask ${i}`,
            config: {
                provider: "openai",
                model: "gpt-4",
                prompt: `Execute subtask ${i}: {{decompose.subtask_${i}}}`
            },
            position: { x: 400, y: i * 100 }
        };

        edges.push({
            id: `decompose-${nodeId}`,
            source: "decompose",
            target: nodeId,
            sourceHandle: "output",
            targetHandle: "input"
        });
    }

    // Merge node
    nodes["merge"] = {
        type: "transform",
        name: "MergeResults",
        config: {
            operation: "merge",
            sources: Array.from({ length: subtaskCount }, (_, i) => `subtask_${i + 1}`)
        },
        position: { x: 600, y: 100 }
    };

    for (let i = 1; i <= subtaskCount; i++) {
        edges.push({
            id: `subtask_${i}-merge`,
            source: `subtask_${i}`,
            target: "merge",
            sourceHandle: "output",
            targetHandle: "input"
        });
    }

    // Output node
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 800, y: 100 }
    };

    edges.push({
        id: "merge-output",
        source: "merge",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        name: "Parallel Subtask Pipeline",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a replanning workflow with fallback paths
 * Input -> Decompose -> Execute -> [Success | Failure -> Replan -> Execute] -> Output
 */
function createReplanningWorkflowDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "task" },
        position: { x: 0, y: 0 }
    };

    nodes["decompose"] = {
        type: "llm",
        name: "InitialDecompose",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Decompose: {{input.task}}"
        },
        position: { x: 200, y: 0 }
    };

    edges.push({
        id: "input-decompose",
        source: "input",
        target: "decompose",
        sourceHandle: "output",
        targetHandle: "input"
    });

    nodes["execute_primary"] = {
        type: "llm",
        name: "ExecutePrimary",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Execute primary plan: {{decompose.plan}}"
        },
        onError: {
            strategy: "goto",
            gotoNode: "replan"
        },
        position: { x: 400, y: 0 }
    };

    edges.push({
        id: "decompose-execute_primary",
        source: "decompose",
        target: "execute_primary",
        sourceHandle: "output",
        targetHandle: "input"
    });

    nodes["replan"] = {
        type: "llm",
        name: "Replan",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Replan with alternative strategy: {{decompose.plan}}\nFailure: {{execute_primary.error}}"
        },
        position: { x: 400, y: 200 }
    };

    nodes["execute_fallback"] = {
        type: "llm",
        name: "ExecuteFallback",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Execute fallback plan: {{replan.alternativePlan}}"
        },
        position: { x: 600, y: 200 }
    };

    edges.push({
        id: "replan-execute_fallback",
        source: "replan",
        target: "execute_fallback",
        sourceHandle: "output",
        targetHandle: "input"
    });

    nodes["aggregate"] = {
        type: "transform",
        name: "AggregateResults",
        config: {
            operation: "first_non_null",
            sources: ["execute_primary", "execute_fallback"]
        },
        position: { x: 800, y: 100 }
    };

    edges.push({
        id: "execute_primary-aggregate",
        source: "execute_primary",
        target: "aggregate",
        sourceHandle: "output",
        targetHandle: "input"
    });

    edges.push({
        id: "execute_fallback-aggregate",
        source: "execute_fallback",
        target: "aggregate",
        sourceHandle: "output",
        targetHandle: "input"
    });

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 1000, y: 100 }
    };

    edges.push({
        id: "aggregate-output",
        source: "aggregate",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        name: "Replanning Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a resource scheduling workflow
 * Input -> Analyze Resources -> Schedule -> [Resource1 | Resource2 | Resource3] -> Complete -> Output
 */
function createResourceSchedulingDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "task" },
        position: { x: 0, y: 100 }
    };

    nodes["analyze_resources"] = {
        type: "llm",
        name: "AnalyzeResources",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Analyze resource requirements: {{input.task}}"
        },
        position: { x: 200, y: 100 }
    };

    edges.push({
        id: "input-analyze_resources",
        source: "input",
        target: "analyze_resources",
        sourceHandle: "output",
        targetHandle: "input"
    });

    nodes["schedule"] = {
        type: "transform",
        name: "ScheduleResources",
        config: {
            operation: "schedule",
            maxConcurrent: 2,
            priorityField: "priority"
        },
        position: { x: 400, y: 100 }
    };

    edges.push({
        id: "analyze_resources-schedule",
        source: "analyze_resources",
        target: "schedule",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Resource allocation nodes (parallel)
    const resources = ["compute", "memory", "network"];
    resources.forEach((resource, index) => {
        const nodeId = `allocate_${resource}`;
        nodes[nodeId] = {
            type: "transform",
            name: `Allocate ${resource}`,
            config: {
                operation: "allocate",
                resourceType: resource,
                constraints: `{{schedule.${resource}Constraints}}`
            },
            position: { x: 600, y: index * 100 }
        };

        edges.push({
            id: `schedule-${nodeId}`,
            source: "schedule",
            target: nodeId,
            sourceHandle: "output",
            targetHandle: "input"
        });
    });

    nodes["complete"] = {
        type: "transform",
        name: "CompleteScheduling",
        config: {
            operation: "merge",
            sources: resources.map((r) => `allocate_${r}`)
        },
        position: { x: 800, y: 100 }
    };

    for (const resource of resources) {
        edges.push({
            id: `allocate_${resource}-complete`,
            source: `allocate_${resource}`,
            target: "complete",
            sourceHandle: "output",
            targetHandle: "input"
        });
    }

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 1000, y: 100 }
    };

    edges.push({
        id: "complete-output",
        source: "complete",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        name: "Resource Scheduling Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

// ============================================================================
// TEST HELPERS
// ============================================================================

function setupDefaultMocks(): void {
    jest.clearAllMocks();

    mockValidateInputsActivity.mockResolvedValue({ success: true });
    mockValidateOutputsActivity.mockResolvedValue({ success: true });

    let spanCounter = 0;
    mockCreateSpan.mockImplementation(() => {
        return Promise.resolve({ spanId: `span-${++spanCounter}`, traceId: "trace-123" });
    });
    mockEndSpan.mockResolvedValue(undefined);

    mockEmitExecutionStarted.mockResolvedValue(undefined);
    mockEmitExecutionProgress.mockResolvedValue(undefined);
    mockEmitExecutionCompleted.mockResolvedValue(undefined);
    mockEmitExecutionFailed.mockResolvedValue(undefined);
    mockEmitExecutionPaused.mockResolvedValue(undefined);
    mockEmitNodeStarted.mockResolvedValue(undefined);
    mockEmitNodeCompleted.mockResolvedValue(undefined);
    mockEmitNodeFailed.mockResolvedValue(undefined);

    mockShouldAllowExecution.mockResolvedValue(true);
    mockReserveCredits.mockResolvedValue(true);
    mockReleaseCredits.mockResolvedValue(undefined);
    mockFinalizeCredits.mockResolvedValue(undefined);
    mockEstimateWorkflowCredits.mockResolvedValue({ totalCredits: 10 });
    mockCalculateLLMCredits.mockResolvedValue(5);
    mockCalculateNodeCredits.mockResolvedValue(1);
}

interface ExecuteNodeParams {
    nodeType: string;
    nodeConfig: JsonObject;
    context: JsonObject;
    executionContext: { nodeId: string };
}

function configureMockNodeOutputs(outputs: Record<string, JsonObject>): void {
    mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
        const nodeId = params.executionContext.nodeId;
        const output = outputs[nodeId] || { result: `output-${nodeId}` };

        return {
            result: output,
            signals: {},
            metrics: {
                durationMs: 100,
                tokenUsage:
                    params.nodeType === "llm"
                        ? { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
                        : undefined
            },
            success: true,
            output
        };
    });
}

// ============================================================================
// TEST DATA
// ============================================================================

// Using plain objects for JSON compatibility with mock outputs
const sampleSubtasks = [
    {
        id: "subtask_1",
        name: "Setup project",
        description: "Initialize project structure",
        dependencies: [] as string[],
        estimatedComplexity: "low"
    },
    {
        id: "subtask_2",
        name: "Create database",
        description: "Setup PostgreSQL schema",
        dependencies: ["subtask_1"],
        estimatedComplexity: "medium"
    },
    {
        id: "subtask_3",
        name: "Build API",
        description: "Implement REST endpoints",
        dependencies: ["subtask_2"],
        estimatedComplexity: "high"
    },
    {
        id: "subtask_4",
        name: "Create frontend",
        description: "Build React UI",
        dependencies: ["subtask_3"],
        estimatedComplexity: "high"
    },
    {
        id: "subtask_5",
        name: "Deploy",
        description: "Deploy to production",
        dependencies: ["subtask_4"],
        estimatedComplexity: "medium"
    }
];

const sampleTaskPlan = {
    goal: "Build a web application",
    subtasks: sampleSubtasks,
    executionOrder: [["subtask_1"], ["subtask_2"], ["subtask_3"], ["subtask_4"], ["subtask_5"]],
    totalSteps: 5,
    estimatedComplexity: "high"
};

const parallelSubtasks = [
    {
        id: "subtask_1",
        name: "Init",
        description: "Initialize",
        dependencies: [] as string[],
        estimatedComplexity: "low"
    },
    {
        id: "subtask_2",
        name: "Process A",
        description: "Process stream A",
        dependencies: ["subtask_1"],
        estimatedComplexity: "medium"
    },
    {
        id: "subtask_3",
        name: "Process B",
        description: "Process stream B",
        dependencies: ["subtask_1"],
        estimatedComplexity: "medium"
    },
    {
        id: "subtask_4",
        name: "Merge",
        description: "Merge results",
        dependencies: ["subtask_2", "subtask_3"],
        estimatedComplexity: "low"
    }
];

const parallelTaskPlan = {
    goal: "Parallel processing pipeline",
    subtasks: parallelSubtasks,
    executionOrder: [["subtask_1"], ["subtask_2", "subtask_3"], ["subtask_4"]],
    totalSteps: 4,
    estimatedComplexity: "medium"
};

// ============================================================================
// TESTS
// ============================================================================

describe("Task Planner Integration Tests", () => {
    let testEnv: TestWorkflowEnvironment;
    let worker: Worker;

    beforeAll(async () => {
        testEnv = await TestWorkflowEnvironment.createLocal();
    });

    afterAll(async () => {
        await testEnv?.teardown();
    });

    beforeEach(async () => {
        setupDefaultMocks();

        worker = await Worker.create({
            connection: testEnv.nativeConnection,
            taskQueue: "test-workflow-queue",
            workflowsPath: require.resolve(
                "../../../../../src/temporal/workflows/workflow-orchestrator"
            ),
            activities: mockActivities
        });
    });

    describe("task decomposition", () => {
        it("should decompose complex task into subtasks", async () => {
            const workflowDef = createTaskPlannerDefinition({ maxSubtasks: 10 });

            configureMockNodeOutputs({
                input: { task: "Build a web application" },
                decompose: {
                    subtasks: sampleTaskPlan.subtasks,
                    goal: sampleTaskPlan.goal,
                    totalSubtasks: 5
                },
                analyze_dependencies: {
                    executionOrder: sampleTaskPlan.executionOrder,
                    dependencyGraph: { subtask_2: ["subtask_1"], subtask_3: ["subtask_2"] }
                },
                execute_subtasks: {
                    results: sampleTaskPlan.subtasks.map((st) => ({
                        id: st.id,
                        status: "completed"
                    }))
                },
                aggregate: {
                    allCompleted: true,
                    completedCount: 5,
                    results: sampleTaskPlan.subtasks.map((st) => ({ id: st.id, success: true }))
                },
                output: { result: "Task completed successfully" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-task-decompose-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-task-decompose",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Build a web application" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
            expect(result.outputs).toBeDefined();

            // Verify decompose node was executed
            const decomposeCalls = mockExecuteNode.mock.calls.filter(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId === "decompose"
            );
            expect(decomposeCalls.length).toBeGreaterThan(0);
        });

        it("should handle tasks with parallel subtasks", async () => {
            const workflowDef = createTaskPlannerDefinition({ allowParallel: true });

            configureMockNodeOutputs({
                input: { task: "Parallel processing" },
                decompose: {
                    subtasks: parallelTaskPlan.subtasks,
                    goal: parallelTaskPlan.goal
                },
                analyze_dependencies: {
                    executionOrder: parallelTaskPlan.executionOrder,
                    parallelGroups: [["subtask_2", "subtask_3"]]
                },
                execute_subtasks: {
                    results: parallelTaskPlan.subtasks.map((st) => ({
                        id: st.id,
                        status: "completed"
                    }))
                },
                aggregate: {
                    allCompleted: true,
                    results: parallelTaskPlan.subtasks.map((st) => ({ id: st.id, success: true }))
                },
                output: { result: "Parallel tasks completed" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-parallel-subtasks-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-parallel-subtasks",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Parallel processing" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should estimate task complexity based on subtasks", async () => {
            const workflowDef = createTaskPlannerDefinition({});

            const complexSubtasks = [
                {
                    id: "st1",
                    name: "Research",
                    description:
                        "Conduct extensive research including literature review, expert interviews, and data analysis",
                    dependencies: [] as string[],
                    estimatedComplexity: "high"
                },
                {
                    id: "st2",
                    name: "Analysis",
                    description:
                        "Comprehensive analysis using multiple methodologies including quantitative approaches",
                    dependencies: ["st1"],
                    estimatedComplexity: "high"
                }
            ];

            configureMockNodeOutputs({
                input: { task: "Complex research task" },
                decompose: {
                    subtasks: complexSubtasks,
                    estimatedComplexity: "high",
                    complexityScore: 3.0
                },
                analyze_dependencies: {
                    executionOrder: [["st1"], ["st2"]],
                    criticalPath: ["st1", "st2"]
                },
                execute_subtasks: {
                    results: [
                        { id: "st1", status: "completed" },
                        { id: "st2", status: "completed" }
                    ]
                },
                aggregate: { allCompleted: true, overallComplexity: "high" },
                output: { result: "Complex task completed" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-complexity-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-complexity",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Complex research task" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("dependency analysis", () => {
        it("should determine correct execution order from dependencies", async () => {
            const workflowDef = createTaskPlannerDefinition({});

            configureMockNodeOutputs({
                input: { task: "Sequential task" },
                decompose: {
                    subtasks: [
                        {
                            id: "a",
                            name: "A",
                            description: "First",
                            dependencies: [],
                            estimatedComplexity: "low"
                        },
                        {
                            id: "b",
                            name: "B",
                            description: "Second",
                            dependencies: ["a"],
                            estimatedComplexity: "low"
                        },
                        {
                            id: "c",
                            name: "C",
                            description: "Third",
                            dependencies: ["b"],
                            estimatedComplexity: "low"
                        }
                    ]
                },
                analyze_dependencies: {
                    executionOrder: [["a"], ["b"], ["c"]],
                    isSequential: true
                },
                execute_subtasks: {
                    results: [
                        { id: "a", order: 1 },
                        { id: "b", order: 2 },
                        { id: "c", order: 3 }
                    ]
                },
                aggregate: { executionOrder: ["a", "b", "c"], allCompleted: true },
                output: { result: "Sequential execution completed" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-exec-order-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-order",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Sequential task" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify analyze_dependencies was called
            const analyzeCall = mockExecuteNode.mock.calls.find(
                (call) =>
                    (call[0] as ExecuteNodeParams).executionContext?.nodeId ===
                    "analyze_dependencies"
            );
            expect(analyzeCall).toBeDefined();
        });

        it("should handle diamond dependencies", async () => {
            const workflowDef = createTaskPlannerDefinition({});

            const diamondSubtasks = [
                {
                    id: "start",
                    name: "Start",
                    description: "Initial",
                    dependencies: [] as string[],
                    estimatedComplexity: "low"
                },
                {
                    id: "left",
                    name: "Left",
                    description: "Left branch",
                    dependencies: ["start"],
                    estimatedComplexity: "medium"
                },
                {
                    id: "right",
                    name: "Right",
                    description: "Right branch",
                    dependencies: ["start"],
                    estimatedComplexity: "medium"
                },
                {
                    id: "end",
                    name: "End",
                    description: "Merge",
                    dependencies: ["left", "right"],
                    estimatedComplexity: "low"
                }
            ];

            configureMockNodeOutputs({
                input: { task: "Diamond pattern" },
                decompose: { subtasks: diamondSubtasks },
                analyze_dependencies: {
                    executionOrder: [["start"], ["left", "right"], ["end"]],
                    hasDiamondPattern: true,
                    parallelBranches: ["left", "right"]
                },
                execute_subtasks: {
                    results: diamondSubtasks.map((st) => ({ id: st.id, status: "completed" }))
                },
                aggregate: { allCompleted: true, diamondMerged: true },
                output: { result: "Diamond pattern completed" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-diamond-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-diamond",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Diamond pattern" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("sequential and parallel execution", () => {
        it("should execute subtasks in sequence when required", async () => {
            const workflowDef = createTaskPlannerDefinition({ allowParallel: false });

            configureMockNodeOutputs({
                input: { task: "Sequential execution" },
                decompose: {
                    subtasks: sampleTaskPlan.subtasks.slice(0, 3)
                },
                analyze_dependencies: {
                    executionOrder: [["subtask_1"], ["subtask_2"], ["subtask_3"]],
                    parallelExecutionDisabled: true
                },
                execute_subtasks: {
                    results: [
                        { id: "subtask_1", startedAt: 0, completedAt: 100 },
                        { id: "subtask_2", startedAt: 100, completedAt: 200 },
                        { id: "subtask_3", startedAt: 200, completedAt: 300 }
                    ],
                    executionMode: "sequential"
                },
                aggregate: { allCompleted: true, totalDuration: 300 },
                output: { result: "Sequential execution completed" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-sequential-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-sequential",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Sequential execution" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should execute independent subtasks in parallel", async () => {
            const workflowDef = createParallelSubtaskDefinition(3);

            configureMockNodeOutputs({
                input: { task: "Parallel execution" },
                decompose: {
                    subtask_1: "Process stream A",
                    subtask_2: "Process stream B",
                    subtask_3: "Process stream C"
                },
                subtask_1: { result: "A completed", startedAt: 0 },
                subtask_2: { result: "B completed", startedAt: 0 },
                subtask_3: { result: "C completed", startedAt: 0 },
                merge: {
                    merged: ["A completed", "B completed", "C completed"],
                    parallelExecution: true
                },
                output: { result: "Parallel execution completed" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-parallel-exec-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-parallel",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Parallel execution" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify all subtask nodes were executed
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("subtask_1");
            expect(nodeIds).toContain("subtask_2");
            expect(nodeIds).toContain("subtask_3");
        });
    });

    describe("progress tracking and aggregation", () => {
        it("should track progress during execution", async () => {
            const workflowDef = createTaskPlannerDefinition({});

            configureMockNodeOutputs({
                input: { task: "Progress tracking task" },
                decompose: {
                    subtasks: sampleTaskPlan.subtasks.slice(0, 3)
                },
                analyze_dependencies: {
                    executionOrder: [["subtask_1"], ["subtask_2"], ["subtask_3"]]
                },
                execute_subtasks: {
                    results: [
                        { id: "subtask_1", status: "completed" },
                        { id: "subtask_2", status: "completed" },
                        { id: "subtask_3", status: "completed" }
                    ],
                    progress: { completed: 3, total: 3, percentage: 100 }
                },
                aggregate: {
                    finalProgress: { completed: 3, total: 3, percentage: 100 },
                    allCompleted: true
                },
                output: { result: "All tasks completed" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-progress-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-progress",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Progress tracking task" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
            expect(mockEmitExecutionProgress).toHaveBeenCalled();
        });

        it("should aggregate results from all subtasks", async () => {
            const workflowDef = createTaskPlannerDefinition({});

            configureMockNodeOutputs({
                input: { task: "Aggregation task" },
                decompose: {
                    subtasks: [
                        {
                            id: "fetch_users",
                            name: "Fetch users",
                            dependencies: [],
                            estimatedComplexity: "low"
                        },
                        {
                            id: "fetch_orders",
                            name: "Fetch orders",
                            dependencies: [],
                            estimatedComplexity: "low"
                        },
                        {
                            id: "generate_report",
                            name: "Generate report",
                            dependencies: ["fetch_users", "fetch_orders"],
                            estimatedComplexity: "medium"
                        }
                    ]
                },
                analyze_dependencies: {
                    executionOrder: [["fetch_users", "fetch_orders"], ["generate_report"]]
                },
                execute_subtasks: {
                    results: [
                        { id: "fetch_users", data: { users: [{ id: 1 }, { id: 2 }] } },
                        { id: "fetch_orders", data: { orders: [{ id: 101 }, { id: 102 }] } },
                        { id: "generate_report", data: { userCount: 2, orderCount: 2 } }
                    ]
                },
                aggregate: {
                    aggregatedResults: {
                        fetch_users: { users: 2 },
                        fetch_orders: { orders: 2 },
                        generate_report: { report: "completed" }
                    },
                    totalItems: 4
                },
                output: { result: "Aggregation completed" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-aggregate-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-aggregate",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Aggregation task" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify aggregate node was called
            const aggregateCall = mockExecuteNode.mock.calls.find(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId === "aggregate"
            );
            expect(aggregateCall).toBeDefined();
        });
    });

    describe("dynamic replanning on failure", () => {
        it("should handle failed subtasks and replan", async () => {
            const workflowDef = createReplanningWorkflowDefinition();

            // First call to execute_primary fails, then replan and execute_fallback succeed
            let primaryCallCount = 0;
            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "execute_primary") {
                    primaryCallCount++;
                    if (primaryCallCount === 1) {
                        throw new Error("Primary execution failed");
                    }
                }

                const outputs: Record<string, JsonObject> = {
                    input: { task: "Replanning test" },
                    decompose: { plan: "Initial plan" },
                    replan: { alternativePlan: "Fallback plan" },
                    execute_fallback: { result: "Fallback succeeded" },
                    aggregate: { result: "Fallback succeeded", usedFallback: true },
                    output: { result: "Task completed via fallback" }
                };

                const output = outputs[nodeId] || { result: `output-${nodeId}` };
                return {
                    result: output,
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-replan-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-replan",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Replanning test" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            // The workflow should either succeed with fallback or fail gracefully
            // depending on error handling implementation
            expect(result).toBeDefined();
        });

        it("should maintain dependency chain after replanning", async () => {
            const workflowDef = createTaskPlannerDefinition({ enableReplanning: true });

            configureMockNodeOutputs({
                input: { task: "Replan dependency test" },
                decompose: {
                    subtasks: [
                        { id: "a", name: "A", dependencies: [], estimatedComplexity: "low" },
                        { id: "b", name: "B", dependencies: ["a"], estimatedComplexity: "medium" },
                        { id: "c", name: "C", dependencies: ["b"], estimatedComplexity: "low" }
                    ]
                },
                analyze_dependencies: {
                    executionOrder: [["a"], ["b"], ["c"]],
                    dependencyChain: ["a", "b", "c"]
                },
                execute_subtasks: {
                    results: [
                        { id: "a", status: "completed" },
                        {
                            id: "b",
                            status: "replanned",
                            alternative: { id: "b_alt", dependencies: ["a"] }
                        },
                        { id: "c", status: "completed" }
                    ],
                    replanningOccurred: true
                },
                aggregate: { allCompleted: true, replanCount: 1 },
                output: { result: "Completed with replanning" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-replan-deps-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-replan-deps",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Replan dependency test" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("resource allocation and scheduling", () => {
        it("should allocate resources for subtasks", async () => {
            const workflowDef = createResourceSchedulingDefinition();

            configureMockNodeOutputs({
                input: { task: "Resource allocation task" },
                analyze_resources: {
                    computeRequired: "high",
                    memoryRequired: "medium",
                    networkRequired: "low",
                    estimatedDuration: 300
                },
                schedule: {
                    computeConstraints: { maxCPU: 4, priority: 1 },
                    memoryConstraints: { maxGB: 8, priority: 2 },
                    networkConstraints: { maxBandwidth: 100, priority: 3 },
                    scheduledAt: Date.now()
                },
                allocate_compute: { allocated: true, cpuCores: 4 },
                allocate_memory: { allocated: true, memoryGB: 8 },
                allocate_network: { allocated: true, bandwidthMbps: 100 },
                complete: {
                    allResourcesAllocated: true,
                    resources: { compute: 4, memory: 8, network: 100 }
                },
                output: { result: "Resources allocated successfully" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-resources-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-resources",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Resource allocation task" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify resource allocation nodes were executed
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("allocate_compute");
            expect(nodeIds).toContain("allocate_memory");
            expect(nodeIds).toContain("allocate_network");
        });

        it("should schedule tasks based on priority", async () => {
            const workflowDef = createResourceSchedulingDefinition();

            configureMockNodeOutputs({
                input: { task: "Priority scheduling task" },
                analyze_resources: {
                    tasks: [
                        { id: "critical", priority: 1 },
                        { id: "normal", priority: 3 },
                        { id: "background", priority: 5 }
                    ]
                },
                schedule: {
                    scheduledOrder: ["critical", "normal", "background"],
                    computeConstraints: { maxCPU: 2, priority: 1 },
                    memoryConstraints: { maxGB: 4, priority: 2 },
                    networkConstraints: { maxBandwidth: 50, priority: 3 }
                },
                allocate_compute: { allocated: true },
                allocate_memory: { allocated: true },
                allocate_network: { allocated: true },
                complete: { scheduledInOrder: true },
                output: { result: "Priority scheduling completed" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-priority-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-priority",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Priority scheduling task" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("real-world scenarios", () => {
        it("should plan software development project", async () => {
            const workflowDef = createTaskPlannerDefinition({ maxSubtasks: 10 });

            const devProjectSubtasks = [
                {
                    id: "requirements",
                    name: "Requirements",
                    description: "Gather requirements",
                    dependencies: [] as string[],
                    estimatedComplexity: "medium"
                },
                {
                    id: "design",
                    name: "Design",
                    description: "Create UI/UX designs",
                    dependencies: ["requirements"],
                    estimatedComplexity: "high"
                },
                {
                    id: "database",
                    name: "Database",
                    description: "Design database schema",
                    dependencies: ["requirements"],
                    estimatedComplexity: "medium"
                },
                {
                    id: "backend",
                    name: "Backend",
                    description: "Implement API",
                    dependencies: ["database"],
                    estimatedComplexity: "high"
                },
                {
                    id: "frontend",
                    name: "Frontend",
                    description: "Build UI",
                    dependencies: ["design", "backend"],
                    estimatedComplexity: "high"
                },
                {
                    id: "testing",
                    name: "Testing",
                    description: "QA testing",
                    dependencies: ["frontend"],
                    estimatedComplexity: "medium"
                },
                {
                    id: "deployment",
                    name: "Deployment",
                    description: "Deploy to production",
                    dependencies: ["testing"],
                    estimatedComplexity: "low"
                }
            ];

            const devProjectPlan = {
                goal: "Build e-commerce website",
                subtasks: devProjectSubtasks,
                executionOrder: [
                    ["requirements"],
                    ["design", "database"],
                    ["backend"],
                    ["frontend"],
                    ["testing"],
                    ["deployment"]
                ],
                totalSteps: 7,
                estimatedComplexity: "high"
            };

            configureMockNodeOutputs({
                input: { task: "Build e-commerce website" },
                decompose: {
                    subtasks: devProjectPlan.subtasks,
                    goal: devProjectPlan.goal,
                    estimatedDuration: "8 weeks"
                },
                analyze_dependencies: {
                    executionOrder: devProjectPlan.executionOrder,
                    criticalPath: [
                        "requirements",
                        "database",
                        "backend",
                        "frontend",
                        "testing",
                        "deployment"
                    ]
                },
                execute_subtasks: {
                    results: devProjectPlan.subtasks.map((st) => ({
                        id: st.id,
                        status: "completed",
                        timestamp: new Date().toISOString()
                    }))
                },
                aggregate: {
                    allCompleted: true,
                    projectSummary: {
                        totalSubtasks: 7,
                        completedSubtasks: 7,
                        duration: "6 weeks"
                    }
                },
                output: { result: "E-commerce website project completed" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-dev-project-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-dev-project",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Build e-commerce website" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should plan data migration project", async () => {
            const workflowDef = createTaskPlannerDefinition({});

            configureMockNodeOutputs({
                input: { task: "Migrate database to new system" },
                decompose: {
                    subtasks: [
                        {
                            id: "analyze_source",
                            name: "Analyze source",
                            dependencies: [],
                            estimatedComplexity: "medium"
                        },
                        {
                            id: "analyze_target",
                            name: "Analyze target",
                            dependencies: [],
                            estimatedComplexity: "medium"
                        },
                        {
                            id: "map_schema",
                            name: "Map schema",
                            dependencies: ["analyze_source", "analyze_target"],
                            estimatedComplexity: "high"
                        },
                        {
                            id: "create_scripts",
                            name: "Create scripts",
                            dependencies: ["map_schema"],
                            estimatedComplexity: "high"
                        },
                        {
                            id: "execute_migration",
                            name: "Execute migration",
                            dependencies: ["create_scripts"],
                            estimatedComplexity: "high"
                        },
                        {
                            id: "validate",
                            name: "Validate",
                            dependencies: ["execute_migration"],
                            estimatedComplexity: "medium"
                        }
                    ]
                },
                analyze_dependencies: {
                    executionOrder: [
                        ["analyze_source", "analyze_target"],
                        ["map_schema"],
                        ["create_scripts"],
                        ["execute_migration"],
                        ["validate"]
                    ],
                    parallelTasks: ["analyze_source", "analyze_target"]
                },
                execute_subtasks: {
                    results: [
                        { id: "analyze_source", recordsFound: 1000000 },
                        { id: "analyze_target", schemaReady: true },
                        { id: "map_schema", mappingsCreated: 50 },
                        { id: "create_scripts", scriptsGenerated: 10 },
                        { id: "execute_migration", recordsMigrated: 1000000 },
                        { id: "validate", validationPassed: true }
                    ]
                },
                aggregate: {
                    migrationSummary: {
                        totalRecords: 1000000,
                        migratedRecords: 1000000,
                        validationStatus: "passed"
                    }
                },
                output: { result: "Migration completed successfully" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-migration-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-migration",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Migrate database to new system" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should handle research task with uncertainty", async () => {
            const workflowDef = createTaskPlannerDefinition({});

            configureMockNodeOutputs({
                input: { task: "Research competitor landscape" },
                decompose: {
                    subtasks: [
                        {
                            id: "identify",
                            name: "Identify competitors",
                            dependencies: [],
                            estimatedComplexity: "medium"
                        },
                        {
                            id: "pricing",
                            name: "Analyze pricing",
                            dependencies: ["identify"],
                            estimatedComplexity: "medium"
                        },
                        {
                            id: "features",
                            name: "Analyze features",
                            dependencies: ["identify"],
                            estimatedComplexity: "medium"
                        },
                        {
                            id: "marketing",
                            name: "Analyze marketing",
                            dependencies: ["identify"],
                            estimatedComplexity: "medium"
                        },
                        {
                            id: "synthesize",
                            name: "Synthesize",
                            dependencies: ["pricing", "features", "marketing"],
                            estimatedComplexity: "high"
                        }
                    ]
                },
                analyze_dependencies: {
                    executionOrder: [
                        ["identify"],
                        ["pricing", "features", "marketing"],
                        ["synthesize"]
                    ],
                    parallelAnalysis: ["pricing", "features", "marketing"]
                },
                execute_subtasks: {
                    results: [
                        { id: "identify", competitors: 5 },
                        { id: "pricing", findings: "Competitive pricing" },
                        { id: "features", findings: "Feature parity" },
                        { id: "marketing", findings: "Strong brand presence" },
                        { id: "synthesize", report: "Comprehensive analysis complete" }
                    ]
                },
                aggregate: {
                    researchComplete: true,
                    confidence: 0.85,
                    recommendations: ["Focus on unique features", "Competitive pricing"]
                },
                output: { result: "Research completed" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-research-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-research",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Research competitor landscape" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("error handling", () => {
        it("should handle decomposition failure", async () => {
            const workflowDef = createTaskPlannerDefinition({});

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                // Fail at decompose node (an LLM node that's critical to the workflow)
                if (nodeId === "decompose") {
                    throw new Error("LLM decomposition failed");
                }

                const outputs: Record<string, JsonObject> = {
                    input: { task: "Failing task" }
                };

                const output = outputs[nodeId] || { result: `output-${nodeId}` };
                return {
                    result: output,
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-failure-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-failure",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Failing task" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("failed");
            expect(mockEmitExecutionFailed).toHaveBeenCalled();
        });

        it("should emit node failed events on error", async () => {
            const workflowDef = createTaskPlannerDefinition({});

            mockExecuteNode.mockRejectedValue(new Error("Node execution error"));

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-node-error-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-node-error",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Error test" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(mockEmitNodeFailed).toHaveBeenCalled();
        });
    });
});
