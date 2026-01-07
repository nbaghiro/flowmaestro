/**
 * Task Planner Integration Tests (Planning Pattern)
 *
 * Tests for planning workflows that decompose complex tasks:
 * - Task decomposition into subtasks
 * - Dependency analysis between subtasks
 * - Sequential and parallel subtask execution
 * - Progress tracking and aggregation
 * - Dynamic replanning on failure
 * - Resource allocation and scheduling
 */

import type { JsonObject } from "@flowmaestro/shared";
import type {
    BuiltWorkflow,
    ExecutableNode,
    TypedEdge
} from "../../../src/temporal/activities/execution/types";

// ============================================================================
// TYPES
// ============================================================================

interface Subtask {
    id: string;
    name: string;
    description: string;
    dependencies: string[];
    estimatedComplexity: "low" | "medium" | "high";
    status: "pending" | "in_progress" | "completed" | "failed";
    result?: JsonObject;
}

interface TaskPlan {
    goal: string;
    subtasks: Subtask[];
    executionOrder: string[][];
    totalSteps: number;
    estimatedComplexity: "low" | "medium" | "high";
}

interface ExecutionProgress {
    completed: number;
    total: number;
    percentage: number;
    currentSubtask: string | null;
    results: Record<string, JsonObject>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a task planning workflow
 * Input -> Decompose -> [Execute Subtasks] -> Aggregate -> Output
 */
function createTaskPlannerWorkflow(options: {
    maxSubtasks?: number;
    allowParallel?: boolean;
    enableReplanning?: boolean;
}): BuiltWorkflow {
    const { maxSubtasks = 10, allowParallel = true, enableReplanning = true } = options;
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    // Input node (complex task description)
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "ComplexTask",
        config: { name: "task" },
        depth: 0,
        dependencies: [],
        dependents: ["Decompose"]
    });

    // Decompose node (LLM breaks down task)
    nodes.set("Decompose", {
        id: "Decompose",
        type: "llm",
        name: "TaskDecomposer",
        config: {
            provider: "openai",
            model: "gpt-4",
            systemPrompt: `You are a task planning expert. Break down complex tasks into actionable subtasks.
                          For each subtask, identify dependencies on other subtasks.
                          Return a JSON with subtasks array, each having: id, name, description, dependencies[].`,
            prompt: "Decompose this task into subtasks:\n\n{{Input.task}}",
            outputFormat: "json",
            maxSubtasks
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["AnalyzeDependencies"]
    });

    // Analyze Dependencies node
    nodes.set("AnalyzeDependencies", {
        id: "AnalyzeDependencies",
        type: "transform",
        name: "DependencyAnalyzer",
        config: {
            operation: "topological_sort",
            allowParallel,
            inputField: "subtasks"
        },
        depth: 2,
        dependencies: ["Decompose"],
        dependents: ["ExecuteSubtasks"]
    });

    // Execute Subtasks node (loop)
    nodes.set("ExecuteSubtasks", {
        id: "ExecuteSubtasks",
        type: "loop",
        name: "SubtaskExecutor",
        config: {
            iterateOver: "{{AnalyzeDependencies.executionOrder}}",
            maxIterations: maxSubtasks,
            allowParallel,
            enableReplanning
        },
        depth: 3,
        dependencies: ["AnalyzeDependencies"],
        dependents: ["Aggregate"]
    });

    // Aggregate node
    nodes.set("Aggregate", {
        id: "Aggregate",
        type: "transform",
        name: "ResultAggregator",
        config: {
            operation: "aggregate",
            inputField: "subtaskResults"
        },
        depth: 4,
        dependencies: ["ExecuteSubtasks"],
        dependents: ["Output"]
    });

    // Output node
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 5,
        dependencies: ["Aggregate"],
        dependents: []
    });

    // Create edges
    const edgeDefs = [
        ["Input", "Decompose"],
        ["Decompose", "AnalyzeDependencies"],
        ["AnalyzeDependencies", "ExecuteSubtasks"],
        ["ExecuteSubtasks", "Aggregate"],
        ["Aggregate", "Output"]
    ];

    for (const [source, target] of edgeDefs) {
        edges.set(`${source}-${target}`, {
            id: `${source}-${target}`,
            source,
            target,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [
            ["Input"],
            ["Decompose"],
            ["AnalyzeDependencies"],
            ["ExecuteSubtasks"],
            ["Aggregate"],
            ["Output"]
        ],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Decompose a complex task into subtasks
 */
function decomposeTask(
    goal: string,
    decomposer: (
        goal: string
    ) => Array<{ name: string; description: string; dependencies: string[] }>
): TaskPlan {
    const rawSubtasks = decomposer(goal);

    const subtasks: Subtask[] = rawSubtasks.map((st, i) => ({
        id: `subtask_${i + 1}`,
        name: st.name,
        description: st.description,
        dependencies: st.dependencies,
        estimatedComplexity:
            st.description.length > 100 ? "high" : st.description.length > 50 ? "medium" : "low",
        status: "pending"
    }));

    // Topological sort for execution order
    const executionOrder = topologicalSort(subtasks);

    // Calculate overall complexity
    const complexityScores = { low: 1, medium: 2, high: 3 };
    const avgComplexity =
        subtasks.reduce((sum, st) => sum + complexityScores[st.estimatedComplexity], 0) /
        subtasks.length;
    const estimatedComplexity: "low" | "medium" | "high" =
        avgComplexity < 1.5 ? "low" : avgComplexity < 2.5 ? "medium" : "high";

    return {
        goal,
        subtasks,
        executionOrder,
        totalSteps: subtasks.length,
        estimatedComplexity
    };
}

/**
 * Topological sort for dependency-based execution order
 */
function topologicalSort(subtasks: Subtask[]): string[][] {
    const result: string[][] = [];
    const completed = new Set<string>();
    const remaining = new Map(subtasks.map((st) => [st.id, st]));

    while (remaining.size > 0) {
        // Find all tasks whose dependencies are satisfied
        const ready: string[] = [];
        for (const [id, subtask] of remaining) {
            const depsReady = subtask.dependencies.every((dep) => completed.has(dep));
            if (depsReady) {
                ready.push(id);
            }
        }

        if (ready.length === 0 && remaining.size > 0) {
            // Circular dependency - force progress
            const first = remaining.keys().next().value;
            if (first) ready.push(first);
        }

        // Add ready tasks to current level and mark as completed
        result.push(ready);
        for (const id of ready) {
            completed.add(id);
            remaining.delete(id);
        }
    }

    return result;
}

/**
 * Execute a task plan
 */
async function executePlan(
    plan: TaskPlan,
    executor: (subtask: Subtask, context: Record<string, JsonObject>) => Promise<JsonObject>,
    options: {
        allowParallel?: boolean;
        onProgress?: (progress: ExecutionProgress) => void;
        onSubtaskComplete?: (subtaskId: string, result: JsonObject) => void;
        onSubtaskFailed?: (subtaskId: string, error: string) => void;
    } = {}
): Promise<{
    success: boolean;
    results: Record<string, JsonObject>;
    failedSubtasks: string[];
    progress: ExecutionProgress;
}> {
    const { allowParallel = true, onProgress, onSubtaskComplete, onSubtaskFailed } = options;

    const results: Record<string, JsonObject> = {};
    const failedSubtasks: string[] = [];
    const subtaskMap = new Map(plan.subtasks.map((st) => [st.id, st]));

    let completedCount = 0;

    for (const level of plan.executionOrder) {
        if (allowParallel) {
            // Execute all tasks in this level in parallel
            const levelResults = await Promise.allSettled(
                level.map(async (subtaskId) => {
                    const subtask = subtaskMap.get(subtaskId);
                    if (!subtask) throw new Error(`Subtask ${subtaskId} not found`);

                    subtask.status = "in_progress";

                    try {
                        const result = await executor(subtask, results);
                        subtask.status = "completed";
                        subtask.result = result;
                        results[subtaskId] = result;
                        completedCount++;

                        if (onSubtaskComplete) {
                            onSubtaskComplete(subtaskId, result);
                        }

                        return { subtaskId, result };
                    } catch (error) {
                        subtask.status = "failed";
                        failedSubtasks.push(subtaskId);

                        if (onSubtaskFailed) {
                            onSubtaskFailed(
                                subtaskId,
                                error instanceof Error ? error.message : "Unknown error"
                            );
                        }

                        throw error;
                    }
                })
            );

            // Check for failures
            for (const result of levelResults) {
                if (result.status === "rejected") {
                    // Continue execution even if some subtasks fail
                }
            }
        } else {
            // Execute sequentially
            for (const subtaskId of level) {
                const subtask = subtaskMap.get(subtaskId);
                if (!subtask) continue;

                subtask.status = "in_progress";

                try {
                    const result = await executor(subtask, results);
                    subtask.status = "completed";
                    subtask.result = result;
                    results[subtaskId] = result;
                    completedCount++;

                    if (onSubtaskComplete) {
                        onSubtaskComplete(subtaskId, result);
                    }
                } catch (error) {
                    subtask.status = "failed";
                    failedSubtasks.push(subtaskId);

                    if (onSubtaskFailed) {
                        onSubtaskFailed(
                            subtaskId,
                            error instanceof Error ? error.message : "Unknown error"
                        );
                    }
                }

                if (onProgress) {
                    onProgress({
                        completed: completedCount,
                        total: plan.totalSteps,
                        percentage: (completedCount / plan.totalSteps) * 100,
                        currentSubtask: subtaskId,
                        results
                    });
                }
            }
        }
    }

    const progress: ExecutionProgress = {
        completed: completedCount,
        total: plan.totalSteps,
        percentage: (completedCount / plan.totalSteps) * 100,
        currentSubtask: null,
        results
    };

    return {
        success: failedSubtasks.length === 0,
        results,
        failedSubtasks,
        progress
    };
}

/**
 * Simulate replanning when a subtask fails
 */
function replan(
    originalPlan: TaskPlan,
    failedSubtaskId: string,
    replanner: (
        plan: TaskPlan,
        failedId: string
    ) => Array<{ name: string; description: string; dependencies: string[] }>
): TaskPlan {
    const alternativeSubtasks = replanner(originalPlan, failedSubtaskId);

    // Replace failed subtask with alternatives
    const newSubtasks = originalPlan.subtasks.filter((st) => st.id !== failedSubtaskId);

    const additionalSubtasks: Subtask[] = alternativeSubtasks.map((st, i) => ({
        id: `alt_${failedSubtaskId}_${i + 1}`,
        name: st.name,
        description: st.description,
        dependencies: st.dependencies.map((dep) =>
            dep === failedSubtaskId ? `alt_${failedSubtaskId}_${i}` : dep
        ),
        estimatedComplexity: "medium",
        status: "pending"
    }));

    const allSubtasks = [...newSubtasks, ...additionalSubtasks];
    const executionOrder = topologicalSort(allSubtasks);

    return {
        ...originalPlan,
        subtasks: allSubtasks,
        executionOrder,
        totalSteps: allSubtasks.length
    };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Task Planner (Planning Pattern)", () => {
    describe("task decomposition", () => {
        it("should decompose complex task into subtasks", () => {
            const plan = decomposeTask("Build a web application", () => [
                {
                    name: "Setup project",
                    description: "Initialize project structure",
                    dependencies: []
                },
                {
                    name: "Create database",
                    description: "Setup PostgreSQL schema",
                    dependencies: ["subtask_1"]
                },
                {
                    name: "Build API",
                    description: "Implement REST endpoints",
                    dependencies: ["subtask_2"]
                },
                {
                    name: "Create frontend",
                    description: "Build React UI",
                    dependencies: ["subtask_3"]
                },
                { name: "Deploy", description: "Deploy to production", dependencies: ["subtask_4"] }
            ]);

            expect(plan.subtasks.length).toBe(5);
            expect(plan.goal).toBe("Build a web application");
            expect(plan.totalSteps).toBe(5);
        });

        it("should identify dependencies between subtasks", () => {
            const plan = decomposeTask("Data pipeline", () => [
                { name: "Extract", description: "Extract data from source", dependencies: [] },
                {
                    name: "Transform",
                    description: "Clean and transform data",
                    dependencies: ["subtask_1"]
                },
                { name: "Load", description: "Load into warehouse", dependencies: ["subtask_2"] }
            ]);

            expect(plan.subtasks[1].dependencies).toContain("subtask_1");
            expect(plan.subtasks[2].dependencies).toContain("subtask_2");
        });

        it("should handle tasks with parallel subtasks", () => {
            const plan = decomposeTask("Parallel processing", () => [
                { name: "Init", description: "Initialize", dependencies: [] },
                { name: "Process A", description: "Process stream A", dependencies: ["subtask_1"] },
                { name: "Process B", description: "Process stream B", dependencies: ["subtask_1"] },
                {
                    name: "Merge",
                    description: "Merge results",
                    dependencies: ["subtask_2", "subtask_3"]
                }
            ]);

            // Process A and B should be in same execution level
            expect(plan.executionOrder[1]).toContain("subtask_2");
            expect(plan.executionOrder[1]).toContain("subtask_3");
        });

        it("should estimate task complexity", () => {
            const simplePlan = decomposeTask("Simple task", () => [
                { name: "Step 1", description: "Quick step", dependencies: [] },
                { name: "Step 2", description: "Another quick step", dependencies: [] }
            ]);

            const complexPlan = decomposeTask("Complex task", () => [
                {
                    name: "Research",
                    description:
                        "Conduct extensive research including literature review, expert interviews, and data analysis across multiple domains",
                    dependencies: []
                },
                {
                    name: "Analysis",
                    description:
                        "Perform comprehensive analysis using multiple methodologies including quantitative and qualitative approaches",
                    dependencies: ["subtask_1"]
                }
            ]);

            expect(simplePlan.estimatedComplexity).toBe("low");
            expect(complexPlan.estimatedComplexity).toBe("high");
        });
    });

    describe("execution order", () => {
        it("should determine correct execution order from dependencies", () => {
            const plan = decomposeTask("Sequential task", () => [
                { name: "A", description: "First", dependencies: [] },
                { name: "B", description: "Second", dependencies: ["subtask_1"] },
                { name: "C", description: "Third", dependencies: ["subtask_2"] }
            ]);

            expect(plan.executionOrder).toEqual([["subtask_1"], ["subtask_2"], ["subtask_3"]]);
        });

        it("should group independent subtasks for parallel execution", () => {
            const plan = decomposeTask("Parallel task", () => [
                { name: "A", description: "Independent A", dependencies: [] },
                { name: "B", description: "Independent B", dependencies: [] },
                {
                    name: "C",
                    description: "Depends on both",
                    dependencies: ["subtask_1", "subtask_2"]
                }
            ]);

            expect(plan.executionOrder[0]).toContain("subtask_1");
            expect(plan.executionOrder[0]).toContain("subtask_2");
            expect(plan.executionOrder[1]).toContain("subtask_3");
        });

        it("should handle diamond dependencies", () => {
            const plan = decomposeTask("Diamond pattern", () => [
                { name: "Start", description: "Initial", dependencies: [] },
                { name: "Left", description: "Left branch", dependencies: ["subtask_1"] },
                { name: "Right", description: "Right branch", dependencies: ["subtask_1"] },
                { name: "End", description: "Merge", dependencies: ["subtask_2", "subtask_3"] }
            ]);

            // Left and Right should be parallel
            expect(plan.executionOrder[1].length).toBe(2);
            // End should come after both
            expect(plan.executionOrder[2]).toContain("subtask_4");
        });
    });

    describe("plan execution", () => {
        it("should execute all subtasks in order", async () => {
            const plan = decomposeTask("Execute task", () => [
                { name: "Step 1", description: "First", dependencies: [] },
                { name: "Step 2", description: "Second", dependencies: ["subtask_1"] },
                { name: "Step 3", description: "Third", dependencies: ["subtask_2"] }
            ]);

            const executionOrder: string[] = [];

            const result = await executePlan(
                plan,
                async (subtask) => {
                    executionOrder.push(subtask.id);
                    return { completed: true, subtaskName: subtask.name };
                },
                { allowParallel: false }
            );

            expect(result.success).toBe(true);
            expect(executionOrder).toEqual(["subtask_1", "subtask_2", "subtask_3"]);
        });

        it("should execute parallel subtasks concurrently", async () => {
            const plan = decomposeTask("Parallel execute", () => [
                { name: "Init", description: "Initialize", dependencies: [] },
                { name: "A", description: "Parallel A", dependencies: ["subtask_1"] },
                { name: "B", description: "Parallel B", dependencies: ["subtask_1"] },
                {
                    name: "Finish",
                    description: "Complete",
                    dependencies: ["subtask_2", "subtask_3"]
                }
            ]);

            const startTimes: Record<string, number> = {};

            const result = await executePlan(
                plan,
                async (subtask) => {
                    startTimes[subtask.id] = Date.now();
                    await new Promise((resolve) => setTimeout(resolve, 10));
                    return { completed: true };
                },
                { allowParallel: true }
            );

            expect(result.success).toBe(true);

            // A and B should start at approximately the same time
            const timeDiff = Math.abs(startTimes["subtask_2"] - startTimes["subtask_3"]);
            expect(timeDiff).toBeLessThan(50); // Allow some variance
        });

        it("should track progress during execution", async () => {
            const plan = decomposeTask("Progress task", () => [
                { name: "1", description: "First", dependencies: [] },
                { name: "2", description: "Second", dependencies: ["subtask_1"] },
                { name: "3", description: "Third", dependencies: ["subtask_2"] }
            ]);

            const progressUpdates: number[] = [];

            await executePlan(plan, async () => ({ done: true }), {
                allowParallel: false,
                onProgress: (progress) => {
                    progressUpdates.push(progress.percentage);
                }
            });

            expect(progressUpdates).toContain(33.33333333333333);
            expect(progressUpdates).toContain(66.66666666666666);
            expect(progressUpdates).toContain(100);
        });

        it("should aggregate results from all subtasks", async () => {
            const plan = decomposeTask("Aggregate task", () => [
                { name: "Fetch users", description: "Get users", dependencies: [] },
                { name: "Fetch orders", description: "Get orders", dependencies: [] },
                {
                    name: "Generate report",
                    description: "Create report",
                    dependencies: ["subtask_1", "subtask_2"]
                }
            ]);

            const result = await executePlan(
                plan,
                async (subtask, previousResults): Promise<JsonObject> => {
                    if (subtask.name === "Fetch users") {
                        return { users: [{ id: 1 }, { id: 2 }] };
                    }
                    if (subtask.name === "Fetch orders") {
                        return { orders: [{ id: 101 }, { id: 102 }] };
                    }
                    return {
                        report: {
                            userCount:
                                (previousResults["subtask_1"]?.users as unknown[])?.length || 0,
                            orderCount:
                                (previousResults["subtask_2"]?.orders as unknown[])?.length || 0
                        }
                    };
                }
            );

            expect(result.results["subtask_1"]).toHaveProperty("users");
            expect(result.results["subtask_2"]).toHaveProperty("orders");
            expect(result.results["subtask_3"]).toHaveProperty("report");
        });
    });

    describe("failure handling", () => {
        it("should track failed subtasks", async () => {
            const plan = decomposeTask("Failing task", () => [
                { name: "OK", description: "Succeeds", dependencies: [] },
                { name: "Fail", description: "Will fail", dependencies: ["subtask_1"] },
                { name: "After", description: "After fail", dependencies: ["subtask_2"] }
            ]);

            const result = await executePlan(plan, async (subtask) => {
                if (subtask.name === "Fail") {
                    throw new Error("Subtask failed");
                }
                return { success: true };
            });

            expect(result.success).toBe(false);
            expect(result.failedSubtasks).toContain("subtask_2");
        });

        it("should continue execution after non-blocking failure", async () => {
            const plan = decomposeTask("Continue after fail", () => [
                { name: "A", description: "Independent A", dependencies: [] },
                { name: "B", description: "Independent B (fails)", dependencies: [] },
                { name: "C", description: "Depends on A only", dependencies: ["subtask_1"] }
            ]);

            const result = await executePlan(plan, async (subtask) => {
                if (subtask.name === "B") {
                    throw new Error("B failed");
                }
                return { success: true };
            });

            // C should still execute since it only depends on A
            expect(result.results["subtask_3"]).toEqual({ success: true });
            expect(result.failedSubtasks).toContain("subtask_2");
        });

        it("should call onSubtaskFailed callback", async () => {
            const plan = decomposeTask("Callback test", () => [
                { name: "Fail", description: "Will fail", dependencies: [] }
            ]);

            const failedIds: string[] = [];

            await executePlan(
                plan,
                async () => {
                    throw new Error("Task error");
                },
                {
                    onSubtaskFailed: (id) => failedIds.push(id)
                }
            );

            expect(failedIds).toContain("subtask_1");
        });
    });

    describe("replanning", () => {
        it("should create alternative plan when subtask fails", () => {
            const originalPlan = decomposeTask("Original", () => [
                { name: "Fetch", description: "Fetch data", dependencies: [] },
                { name: "Process", description: "Process data", dependencies: ["subtask_1"] }
            ]);

            const newPlan = replan(originalPlan, "subtask_1", () => [
                { name: "Fetch from cache", description: "Try cache first", dependencies: [] },
                {
                    name: "Fetch from backup",
                    description: "Use backup source",
                    dependencies: ["alt_subtask_1_1"]
                }
            ]);

            expect(newPlan.subtasks.length).toBe(3); // Original Process + 2 alternatives
            expect(newPlan.subtasks.some((st) => st.id.startsWith("alt_"))).toBe(true);
        });

        it("should maintain dependency chain after replanning", () => {
            const originalPlan = decomposeTask("Chain", () => [
                { name: "A", description: "First", dependencies: [] },
                { name: "B", description: "Second", dependencies: ["subtask_1"] },
                { name: "C", description: "Third", dependencies: ["subtask_2"] }
            ]);

            const newPlan = replan(originalPlan, "subtask_2", () => [
                { name: "B1", description: "Alternative B step 1", dependencies: ["subtask_1"] },
                { name: "B2", description: "Alternative B step 2", dependencies: ["subtask_2"] }
            ]);

            // C should now depend on the new alternatives
            expect(newPlan.executionOrder.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe("workflow structure", () => {
        it("should create valid task planner workflow structure", () => {
            const workflow = createTaskPlannerWorkflow({
                maxSubtasks: 5,
                allowParallel: true,
                enableReplanning: true
            });

            // Verify workflow structure
            expect(workflow.nodes.size).toBe(6);
            expect(workflow.edges.size).toBe(5);

            // Verify node types
            expect(workflow.nodes.get("Input")?.type).toBe("input");
            expect(workflow.nodes.get("Decompose")?.type).toBe("llm");
            expect(workflow.nodes.get("AnalyzeDependencies")?.type).toBe("transform");
            expect(workflow.nodes.get("ExecuteSubtasks")?.type).toBe("loop");
            expect(workflow.nodes.get("Aggregate")?.type).toBe("transform");
            expect(workflow.nodes.get("Output")?.type).toBe("output");

            // Verify execution levels
            expect(workflow.executionLevels.length).toBe(6);
            expect(workflow.executionLevels[0]).toContain("Input");
            expect(workflow.executionLevels[1]).toContain("Decompose");

            // Verify dependencies
            expect(workflow.nodes.get("Decompose")?.dependencies).toContain("Input");
            expect(workflow.nodes.get("ExecuteSubtasks")?.dependencies).toContain(
                "AnalyzeDependencies"
            );
        });

        it("should configure workflow options correctly", () => {
            const workflow = createTaskPlannerWorkflow({
                maxSubtasks: 20,
                allowParallel: false,
                enableReplanning: false
            });

            const executeNode = workflow.nodes.get("ExecuteSubtasks");
            expect(executeNode?.config.maxIterations).toBe(20);
            expect(executeNode?.config.allowParallel).toBe(false);
            expect(executeNode?.config.enableReplanning).toBe(false);
        });
    });

    describe("real-world scenarios", () => {
        it("should plan software development project", async () => {
            const plan = decomposeTask("Build e-commerce website", () => [
                { name: "Requirements", description: "Gather requirements", dependencies: [] },
                {
                    name: "Design",
                    description: "Create UI/UX designs",
                    dependencies: ["subtask_1"]
                },
                {
                    name: "Database",
                    description: "Design database schema",
                    dependencies: ["subtask_1"]
                },
                { name: "Backend", description: "Implement API", dependencies: ["subtask_3"] },
                {
                    name: "Frontend",
                    description: "Build UI",
                    dependencies: ["subtask_2", "subtask_4"]
                },
                {
                    name: "Integration",
                    description: "Integrate components",
                    dependencies: ["subtask_4", "subtask_5"]
                },
                { name: "Testing", description: "QA testing", dependencies: ["subtask_6"] },
                {
                    name: "Deployment",
                    description: "Deploy to production",
                    dependencies: ["subtask_7"]
                }
            ]);

            const result = await executePlan(plan, async (subtask) => ({
                completed: true,
                subtask: subtask.name,
                timestamp: new Date().toISOString()
            }));

            expect(result.success).toBe(true);
            expect(Object.keys(result.results).length).toBe(8);
        });

        it("should plan data migration project", async () => {
            const plan = decomposeTask("Migrate database to new system", () => [
                {
                    name: "Analyze source",
                    description: "Analyze source database",
                    dependencies: []
                },
                { name: "Analyze target", description: "Analyze target system", dependencies: [] },
                {
                    name: "Map schema",
                    description: "Create schema mapping",
                    dependencies: ["subtask_1", "subtask_2"]
                },
                {
                    name: "Create scripts",
                    description: "Write migration scripts",
                    dependencies: ["subtask_3"]
                },
                {
                    name: "Test migration",
                    description: "Test on sample data",
                    dependencies: ["subtask_4"]
                },
                {
                    name: "Backup source",
                    description: "Full backup of source",
                    dependencies: ["subtask_5"]
                },
                {
                    name: "Execute migration",
                    description: "Run migration",
                    dependencies: ["subtask_6"]
                },
                {
                    name: "Validate",
                    description: "Validate migrated data",
                    dependencies: ["subtask_7"]
                }
            ]);

            // First two tasks should be parallel
            expect(plan.executionOrder[0]).toContain("subtask_1");
            expect(plan.executionOrder[0]).toContain("subtask_2");
            expect(plan.totalSteps).toBe(8);
        });

        it("should plan content creation workflow", async () => {
            const plan = decomposeTask("Create marketing campaign", () => [
                { name: "Research", description: "Market research", dependencies: [] },
                { name: "Strategy", description: "Define strategy", dependencies: ["subtask_1"] },
                { name: "Copy", description: "Write copy", dependencies: ["subtask_2"] },
                { name: "Design", description: "Create visuals", dependencies: ["subtask_2"] },
                {
                    name: "Review",
                    description: "Internal review",
                    dependencies: ["subtask_3", "subtask_4"]
                },
                { name: "Revise", description: "Make revisions", dependencies: ["subtask_5"] },
                { name: "Approve", description: "Final approval", dependencies: ["subtask_6"] },
                { name: "Launch", description: "Launch campaign", dependencies: ["subtask_7"] }
            ]);

            const completionCallbacks: string[] = [];

            await executePlan(plan, async (_subtask) => ({ status: "done" }), {
                onSubtaskComplete: (id) => completionCallbacks.push(id)
            });

            expect(completionCallbacks.length).toBe(8);
        });

        it("should handle research task with uncertainty", async () => {
            const plan = decomposeTask("Research competitor landscape", () => [
                {
                    name: "Identify competitors",
                    description: "List main competitors",
                    dependencies: []
                },
                {
                    name: "Analyze pricing",
                    description: "Study pricing models",
                    dependencies: ["subtask_1"]
                },
                {
                    name: "Analyze features",
                    description: "Compare features",
                    dependencies: ["subtask_1"]
                },
                {
                    name: "Analyze marketing",
                    description: "Review marketing strategies",
                    dependencies: ["subtask_1"]
                },
                {
                    name: "Synthesize",
                    description: "Create summary report",
                    dependencies: ["subtask_2", "subtask_3", "subtask_4"]
                }
            ]);

            // Three analysis tasks should be parallel
            expect(plan.executionOrder[1].length).toBe(3);

            const result = await executePlan(plan, async (subtask) => ({
                findings: `Findings for ${subtask.name}`,
                confidence: 0.85
            }));

            expect(result.success).toBe(true);
            expect(Object.keys(result.results).length).toBe(5);
        });
    });
});
