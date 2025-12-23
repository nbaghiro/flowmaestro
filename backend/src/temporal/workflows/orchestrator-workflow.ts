import { proxyActivities } from "@temporalio/workflow";
import type { WorkflowDefinition, WorkflowNode, JsonObject } from "@flowmaestro/shared";
import { SpanType } from "../../core/tracing/span-types";
import type * as activities from "../activities";

// Re-export WorkflowDefinition for use by other workflow files
export type { WorkflowDefinition, WorkflowNode };

const { executeNode, createSpan, endSpan } = proxyActivities<typeof activities>({
    startToCloseTimeout: "10 minutes",
    retry: {
        maximumAttempts: 3,
        backoffCoefficient: 2
    }
});

// Validation activities (fast, retryable)
const { validateInputsActivity, validateOutputsActivity } = proxyActivities<typeof activities>({
    startToCloseTimeout: "30 seconds",
    retry: {
        maximumAttempts: 1 // No retry - validation is deterministic
    }
});

// Event emission activities (non-retryable, fire-and-forget)
const {
    emitExecutionStarted,
    emitExecutionProgress,
    emitExecutionCompleted,
    emitExecutionFailed,
    emitNodeStarted,
    emitNodeCompleted,
    emitNodeFailed
} = proxyActivities<typeof activities>({
    startToCloseTimeout: "5 seconds",
    retry: {
        maximumAttempts: 1 // Don't retry event emissions
    }
});

export interface OrchestratorInput {
    executionId: string;
    workflowDefinition: WorkflowDefinition;
    inputs?: JsonObject;
    userId?: string;
}

export interface OrchestratorResult {
    success: boolean;
    outputs: JsonObject;
    error?: string;
}

/**
 * Main workflow orchestrator - executes a workflow definition
 */
export async function orchestratorWorkflow(input: OrchestratorInput): Promise<OrchestratorResult> {
    const { executionId, workflowDefinition, inputs = {}, userId } = input;
    const { nodes, edges } = workflowDefinition;

    // Get workflow start time
    const workflowStartTime = Date.now();

    // Create WORKFLOW_RUN span for entire workflow execution
    const workflowRunContext = await createSpan({
        traceId: executionId,
        parentSpanId: undefined,
        name: `Workflow: ${workflowDefinition.name || "Unnamed"}`,
        spanType: SpanType.WORKFLOW_RUN,
        entityId: executionId,
        input: {
            workflowName: workflowDefinition.name,
            inputs
        },
        attributes: {
            userId,
            workflowName: workflowDefinition.name,
            nodeCount: Object.keys(nodes).length,
            edgeCount: edges.length
        }
    });
    const workflowRunSpanId = workflowRunContext.spanId;

    // Convert nodes Record to entries for processing
    const nodeEntries = Object.entries(nodes);
    console.log(
        `[Orchestrator] Starting workflow with ${nodeEntries.length} nodes, ${edges.length} edges`
    );

    // Validate inputs if stateSchema is defined
    const inputValidation = await validateInputsActivity({
        workflowDefinition,
        inputs
    });

    if (!inputValidation.success) {
        const errorMessage = inputValidation.error?.message || "Input validation failed";
        console.error(`[Orchestrator] Input validation failed: ${errorMessage}`);

        await emitExecutionFailed({
            executionId,
            error: errorMessage
        });

        // End WORKFLOW_RUN span with error
        await endSpan({
            spanId: workflowRunSpanId,
            error: new Error(errorMessage),
            attributes: {
                failureReason: "input_validation_failed"
            }
        });

        return {
            success: false,
            outputs: {},
            error: errorMessage
        };
    }

    // Emit execution started event
    await emitExecutionStarted({
        executionId,
        workflowName: workflowDefinition.name || "Unnamed Workflow",
        totalNodes: nodeEntries.length
    });

    // Build execution graph
    const nodeMap = new Map<string, WorkflowNode>();
    const outgoingEdges = new Map<string, Array<{ target: string; sourceHandle?: string }>>();
    const incomingEdges = new Map<string, string[]>();

    // Initialize maps from nodes Record
    nodeEntries.forEach(([nodeId, node]) => {
        nodeMap.set(nodeId, node);
        outgoingEdges.set(nodeId, []);
        incomingEdges.set(nodeId, []);
    });

    edges.forEach((edge) => {
        outgoingEdges.get(edge.source)?.push({
            target: edge.target,
            sourceHandle: edge.sourceHandle
        });
        incomingEdges.get(edge.target)?.push(edge.source);
    });

    // Find start nodes (nodes with no incoming edges or input nodes)
    const startNodes = nodeEntries.filter(
        ([nodeId, node]) => node.type === "input" || (incomingEdges.get(nodeId)?.length || 0) === 0
    );

    console.log(`[Orchestrator] Start nodes: ${startNodes.map(([id]) => id).join(", ")}`);

    // Execution context - stores all node outputs and includes userId for authorization
    const context: JsonObject = { ...inputs };
    if (userId) {
        context.userId = userId;
    }
    const executed = new Set<string>();
    const skipped = new Set<string>();
    const errors: Record<string, string> = {};
    // Track which keys in context came from output nodes (for final workflow output)
    const outputNodeKeys = new Set<string>();
    let completedNodeCount = 0;

    // Helper function to recursively mark a node and its descendants as skipped
    function markNodeAsSkipped(nodeId: string): void {
        if (skipped.has(nodeId) || executed.has(nodeId)) {
            return; // Already processed
        }

        // Check if this node has multiple incoming edges (converging node)
        const incomingPaths = incomingEdges.get(nodeId) || [];
        if (incomingPaths.length > 1) {
            // Don't mark converging nodes as skipped
            // They will handle their own execution based on dependency checks
            console.log(
                `[Orchestrator] Not marking ${nodeId} as skipped (converging node with ${incomingPaths.length} incoming paths)`
            );
            return;
        }

        skipped.add(nodeId);
        console.log(`[Orchestrator] Marking ${nodeId} as skipped`);

        // Recursively mark all dependent nodes as skipped
        const dependents = outgoingEdges.get(nodeId) || [];
        for (const edge of dependents) {
            markNodeAsSkipped(edge.target);
        }
    }

    // Execute nodes using a readiness queue (only run when all deps are done/skipped)
    async function executeFromQueue(): Promise<void> {
        const queue: string[] = startNodes.map(([id]) => id);
        const maxIterations = nodeEntries.length * 10;
        let iterations = 0;

        while (queue.length > 0) {
            if (iterations++ > maxIterations) {
                throw new Error("Execution queue exceeded max iterations (possible cycle)");
            }

            const nodeId = queue.shift() as string;
            if (executed.has(nodeId) || skipped.has(nodeId)) {
                continue;
            }

            const node = nodeMap.get(nodeId);
            if (!node) {
                throw new Error(`Node ${nodeId} not found in workflow definition`);
            }

            const dependencies = incomingEdges.get(nodeId) || [];
            const depsDone = dependencies.every(
                (depId) => executed.has(depId) || skipped.has(depId) || errors[depId]
            );

            if (!depsDone) {
                queue.push(nodeId);
                continue;
            }

            // Skip if ALL dependencies failed or were skipped
            if (
                dependencies.length > 0 &&
                dependencies.every((depId) => errors[depId] || skipped.has(depId))
            ) {
                console.log(
                    `[Orchestrator] Skipping ${nodeId} - all dependencies failed or skipped`
                );
                errors[nodeId] = "All dependencies failed or skipped";
                executed.add(nodeId);
                continue;
            }

            console.log(`[Orchestrator] Executing node ${nodeId} (${node.type})`);

            const nodeContext = await createSpan({
                traceId: executionId,
                parentSpanId: workflowRunSpanId,
                name: `Node: ${node.name || nodeId}`,
                spanType: SpanType.NODE_EXECUTION,
                entityId: nodeId,
                input: {
                    nodeId,
                    nodeType: node.type,
                    nodeConfig: node.config
                },
                attributes: {
                    userId,
                    nodeId,
                    nodeType: node.type,
                    nodeName: node.name
                }
            });
            const nodeSpanId = nodeContext.spanId;

            await emitNodeStarted({
                executionId,
                nodeId,
                nodeName: node.name,
                nodeType: node.type
            });

            const nodeStartTime = Date.now();
            let nodeResult: JsonObject | null = null;
            let nodeFailed = false;

            try {
                if (node.type === "input") {
                    if (node.config.inputName && typeof node.config.inputName === "string") {
                        const inputName = node.config.inputName;
                        const inputValue = inputs[inputName];
                        context[inputName] = inputValue;
                        console.log(
                            `[Orchestrator] Input node ${nodeId}: ${inputName} = ${JSON.stringify(inputValue)}`
                        );
                    } else {
                        Object.assign(context, inputs);
                        console.log(
                            `[Orchestrator] Input node ${nodeId}: merged all inputs into context`
                        );
                    }
                } else if (
                    node.type === "conditional" &&
                    typeof node.config === "object" &&
                    node.config !== null &&
                    (node.config as { mode?: string }).mode === "router"
                ) {
                    const result = await executeNode({
                        nodeType: node.type,
                        nodeConfig: node.config,
                        context
                    });

                    Object.assign(context, result);
                    console.log(
                        `[Orchestrator] Node ${nodeId} completed, added keys: ${Object.keys(result).join(", ")}`
                    );
                } else if (node.type === "conditional") {
                    const leftValue =
                        typeof node.config.leftValue === "string" ? node.config.leftValue : "";
                    const rightValue =
                        typeof node.config.rightValue === "string" ? node.config.rightValue : "";
                    const operator =
                        typeof node.config.operator === "string" ? node.config.operator : "==";

                    const interpolate = (str: string): string => {
                        return str.replace(/\$\{([^}]+)\}/g, (_, key) => {
                            const value = context[key.trim()];
                            return value !== undefined ? String(value) : "";
                        });
                    };

                    const leftInterpolated = interpolate(leftValue);
                    const rightInterpolated = interpolate(rightValue);
                    const conditionMet =
                        leftInterpolated.toLowerCase() === rightInterpolated.toLowerCase();
                    const branch = conditionMet ? "true" : "false";

                    console.log(
                        `[Orchestrator] Conditional: "${leftInterpolated}" ${operator} "${rightInterpolated}" = ${conditionMet} (branch: ${branch})`
                    );

                    context.conditionMet = conditionMet;
                    context.branch = branch;
                    context.leftValue = leftInterpolated;
                    context.rightValue = rightInterpolated;
                    context.operator = operator;
                } else {
                    const result = await executeNode({
                        nodeType: node.type,
                        nodeConfig: node.config,
                        context
                    });

                    if (node.type === "output") {
                        Object.keys(result).forEach((key) => outputNodeKeys.add(key));
                        nodeResult = result;
                    }

                    Object.assign(context, result);
                    console.log(
                        `[Orchestrator] Node ${nodeId} completed, added keys: ${Object.keys(result).join(", ")}`
                    );
                }

                const nodeDuration = Date.now() - nodeStartTime;
                const nodeOutput = node.type === "output" && nodeResult ? nodeResult : context;
                await emitNodeCompleted({
                    executionId,
                    nodeId,
                    nodeName: node.name || nodeId,
                    nodeType: node.type,
                    output: nodeOutput,
                    duration: nodeDuration
                });

                await endSpan({
                    spanId: nodeSpanId,
                    output: {
                        nodeType: node.type,
                        success: true
                    },
                    attributes: {
                        durationMs: nodeDuration
                    }
                });

                completedNodeCount++;
                const percentage = Math.round((completedNodeCount / nodeEntries.length) * 100);
                await emitExecutionProgress({
                    executionId,
                    completed: completedNodeCount,
                    total: nodeEntries.length,
                    percentage
                });
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                console.error(`[Orchestrator] Node ${nodeId} failed: ${errorMessage}`);
                errors[nodeId] = errorMessage;
                nodeFailed = true;

                await endSpan({
                    spanId: nodeSpanId,
                    error: error instanceof Error ? error : new Error(errorMessage),
                    attributes: {
                        success: false,
                        failureReason: "node_execution_failed"
                    }
                });

                await emitNodeFailed({
                    executionId,
                    nodeId,
                    nodeName: node.name || nodeId,
                    nodeType: node.type,
                    error: errorMessage
                });
            } finally {
                executed.add(nodeId);
            }

            if (nodeFailed) {
                continue;
            }

            const dependentEdges = outgoingEdges.get(nodeId) || [];

            if (node.type === "conditional") {
                const conditionalMode =
                    typeof node.config === "object" && node.config !== null
                        ? (node.config as { mode?: string }).mode
                        : undefined;

                if (conditionalMode === "router") {
                    const routes = (context.__routeOutputs as string[] | undefined) || [];
                    const routeSet = new Set(routes);
                    console.log(
                        `[Orchestrator] Conditional router ${nodeId} routes: ${
                            routes.length ? routes.join(", ") : "none"
                        }`
                    );

                    for (const edge of dependentEdges) {
                        const shouldExecute = !edge.sourceHandle || routeSet.has(edge.sourceHandle);
                        if (!shouldExecute) {
                            console.log(
                                `[Orchestrator] Marking route ${edge.sourceHandle || "default"} to ${edge.target} as skipped`
                            );
                            markNodeAsSkipped(edge.target);
                        }
                    }

                    for (const edge of dependentEdges) {
                        const shouldExecute = !edge.sourceHandle || routeSet.has(edge.sourceHandle);
                        if (
                            shouldExecute &&
                            !executed.has(edge.target) &&
                            !skipped.has(edge.target)
                        ) {
                            queue.push(edge.target);
                        }
                    }
                } else {
                    const branch = context.branch as string | undefined;
                    console.log(`[Orchestrator] Conditional node ${nodeId} branch: ${branch}`);

                    for (const edge of dependentEdges) {
                        const shouldExecute = !edge.sourceHandle || edge.sourceHandle === branch;
                        if (!shouldExecute) {
                            console.log(
                                `[Orchestrator] Marking ${edge.sourceHandle} branch to ${edge.target} as skipped (branch is ${branch})`
                            );
                            markNodeAsSkipped(edge.target);
                        }
                    }

                    for (const edge of dependentEdges) {
                        const shouldExecute = !edge.sourceHandle || edge.sourceHandle === branch;
                        if (
                            shouldExecute &&
                            !executed.has(edge.target) &&
                            !skipped.has(edge.target)
                        ) {
                            queue.push(edge.target);
                        }
                    }
                }
            } else if (node.type === "router") {
                const routes = (context.__routeOutputs as string[] | undefined) || [];
                const routeSet = new Set(routes);
                console.log(
                    `[Orchestrator] Router node ${nodeId} routes: ${
                        routes.length ? routes.join(", ") : "none"
                    }`
                );

                for (const edge of dependentEdges) {
                    const shouldExecute = !edge.sourceHandle || routeSet.has(edge.sourceHandle);
                    if (!shouldExecute) {
                        console.log(
                            `[Orchestrator] Marking route ${edge.sourceHandle || "default"} to ${edge.target} as skipped`
                        );
                        markNodeAsSkipped(edge.target);
                    }
                }

                for (const edge of dependentEdges) {
                    const shouldExecute = !edge.sourceHandle || routeSet.has(edge.sourceHandle);
                    if (shouldExecute && !executed.has(edge.target) && !skipped.has(edge.target)) {
                        queue.push(edge.target);
                    }
                }
            } else {
                for (const edge of dependentEdges) {
                    if (!executed.has(edge.target) && !skipped.has(edge.target)) {
                        queue.push(edge.target);
                    }
                }
            }
        }
    }

    // Execute from all start nodes
    try {
        await executeFromQueue();

        // Check if there were any errors
        if (Object.keys(errors).length > 0) {
            const errorMessage = `Workflow completed with errors: ${JSON.stringify(errors)}`;

            // Find the first failed node ID
            const failedNodeId = Object.keys(errors)[0];

            // Emit execution failed event
            await emitExecutionFailed({
                executionId,
                error: errorMessage,
                failedNodeId
            });

            // End WORKFLOW_RUN span with error
            await endSpan({
                spanId: workflowRunSpanId,
                error: new Error(errorMessage),
                attributes: {
                    failureReason: "node_execution_errors",
                    failedNodeCount: Object.keys(errors).length,
                    completedNodeCount
                }
            });

            return {
                success: false,
                outputs: context,
                error: errorMessage
            };
        }

        console.log("[Orchestrator] Workflow completed successfully");
        const workflowDuration = Date.now() - workflowStartTime;

        // Validate outputs if stateSchema is defined
        const outputValidation = await validateOutputsActivity({
            workflowDefinition,
            outputs: context
        });

        if (!outputValidation.success) {
            const errorMessage = outputValidation.error?.message || "Output validation failed";
            console.error(`[Orchestrator] Output validation failed: ${errorMessage}`);

            await emitExecutionFailed({
                executionId,
                error: errorMessage
            });

            // End WORKFLOW_RUN span with error
            await endSpan({
                spanId: workflowRunSpanId,
                error: new Error(errorMessage),
                attributes: {
                    failureReason: "output_validation_failed",
                    completedNodeCount
                }
            });

            return {
                success: false,
                outputs: context,
                error: errorMessage
            };
        }

        // Build final outputs: only include keys from output nodes
        // If no output nodes were executed, fall back to full context for backwards compatibility
        const finalOutputs: JsonObject =
            outputNodeKeys.size > 0
                ? (Object.fromEntries(
                      Array.from(outputNodeKeys)
                          .filter((key) => key in context)
                          .map((key) => [key, context[key]])
                  ) as JsonObject)
                : context;

        // Emit execution completed event
        await emitExecutionCompleted({
            executionId,
            outputs: finalOutputs,
            duration: workflowDuration
        });

        // End WORKFLOW_RUN span with success
        await endSpan({
            spanId: workflowRunSpanId,
            output: {
                success: true,
                outputs: finalOutputs
            },
            attributes: {
                durationMs: workflowDuration,
                completedNodeCount,
                totalNodeCount: nodeEntries.length
            }
        });

        return {
            success: true,
            outputs: finalOutputs
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[Orchestrator] Workflow failed: ${errorMessage}`);

        // Emit execution failed event
        await emitExecutionFailed({
            executionId,
            error: errorMessage
        });

        // End WORKFLOW_RUN span with error
        await endSpan({
            spanId: workflowRunSpanId,
            error: error instanceof Error ? error : new Error(errorMessage),
            attributes: {
                failureReason: "workflow_exception",
                completedNodeCount
            }
        });

        return {
            success: false,
            outputs: context,
            error: errorMessage
        };
    }
}
