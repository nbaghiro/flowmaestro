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

    // Execute nodes in topological order
    async function executeNodeAndDependents(nodeId: string): Promise<void> {
        if (executed.has(nodeId) || skipped.has(nodeId)) {
            return;
        }

        // Mark as executed immediately to prevent circular dependency infinite recursion
        executed.add(nodeId);

        const node = nodeMap.get(nodeId);
        if (!node) {
            throw new Error(`Node ${nodeId} not found in workflow definition`);
        }

        // Wait for all dependencies to complete
        const dependencies = incomingEdges.get(nodeId) || [];
        for (const depId of dependencies) {
            if (!executed.has(depId) && !skipped.has(depId)) {
                await executeNodeAndDependents(depId);
            }
        }

        // Skip if ALL dependencies failed or were skipped
        // (For converging nodes from conditional branches, at least one path must succeed)
        if (
            dependencies.length > 0 &&
            dependencies.every((depId) => errors[depId] || skipped.has(depId))
        ) {
            console.log(`[Orchestrator] Skipping ${nodeId} - all dependencies failed or skipped`);
            errors[nodeId] = "All dependencies failed or skipped";
            return;
        }

        console.log(`[Orchestrator] Executing node ${nodeId} (${node.type})`);

        // Create NODE_EXECUTION span for this node
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

        // Emit node started event
        await emitNodeStarted({
            executionId,
            nodeId,
            nodeName: node.name,
            nodeType: node.type
        });

        const nodeStartTime = Date.now();

        try {
            // Handle input nodes specially
            if (node.type === "input") {
                if (node.config.inputName && typeof node.config.inputName === "string") {
                    // Named input - store specific input value
                    const inputName = node.config.inputName;
                    const inputValue = inputs[inputName];
                    context[inputName] = inputValue;
                    console.log(
                        `[Orchestrator] Input node ${nodeId}: ${inputName} = ${JSON.stringify(inputValue)}`
                    );
                } else {
                    // No input name specified - this is the workflow entry point, merge all inputs
                    Object.assign(context, inputs);
                    console.log(
                        `[Orchestrator] Input node ${nodeId}: merged all inputs into context`
                    );
                }
            } else if (node.type === "conditional") {
                // Handle conditional nodes in the orchestrator (not via activity)
                // Import and execute conditional logic inline
                const leftValue =
                    typeof node.config.leftValue === "string" ? node.config.leftValue : "";
                const rightValue =
                    typeof node.config.rightValue === "string" ? node.config.rightValue : "";
                const operator =
                    typeof node.config.operator === "string" ? node.config.operator : "==";

                // Simple variable interpolation for conditional
                const interpolate = (str: string): string => {
                    return str.replace(/\$\{([^}]+)\}/g, (_, key) => {
                        const value = context[key.trim()];
                        return value !== undefined ? String(value) : "";
                    });
                };

                const leftInterpolated = interpolate(leftValue);
                const rightInterpolated = interpolate(rightValue);

                // Simple equality check (case-insensitive for strings)
                const conditionMet =
                    leftInterpolated.toLowerCase() === rightInterpolated.toLowerCase();
                const branch = conditionMet ? "true" : "false";

                console.log(
                    `[Orchestrator] Conditional: "${leftInterpolated}" ${operator} "${rightInterpolated}" = ${conditionMet} (branch: ${branch})`
                );

                // Store result in context
                context.conditionMet = conditionMet;
                context.branch = branch;
                context.leftValue = leftInterpolated;
                context.rightValue = rightInterpolated;
                context.operator = operator;
            } else {
                // Execute the node using the activity
                const result = await executeNode({
                    nodeType: node.type,
                    nodeConfig: node.config,
                    context
                });

                // Merge result into context
                Object.assign(context, result);
                console.log(
                    `[Orchestrator] Node ${nodeId} completed, added keys: ${Object.keys(result).join(", ")}`
                );
            }

            // Emit node completed event
            const nodeDuration = Date.now() - nodeStartTime;
            await emitNodeCompleted({
                executionId,
                nodeId,
                nodeName: node.name || nodeId,
                nodeType: node.type,
                output: context,
                duration: nodeDuration
            });

            // End NODE_EXECUTION span with success
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

            // Update progress
            completedNodeCount++;
            const percentage = Math.round((completedNodeCount / nodeEntries.length) * 100);
            await emitExecutionProgress({
                executionId,
                completed: completedNodeCount,
                total: nodeEntries.length,
                percentage
            });

            // Execute dependent nodes
            const dependentEdges = outgoingEdges.get(nodeId) || [];

            // Handle conditional branching
            if (node.type === "conditional") {
                // Get the branch result from context
                const branch = context.branch as string | undefined;
                console.log(`[Orchestrator] Conditional node ${nodeId} branch: ${branch}`);

                // PHASE 1: Mark all skipped branches FIRST (synchronous)
                // This prevents race condition where converging nodes try to pull skipped dependencies
                for (const edge of dependentEdges) {
                    const shouldExecute = !edge.sourceHandle || edge.sourceHandle === branch;
                    if (!shouldExecute) {
                        console.log(
                            `[Orchestrator] Marking ${edge.sourceHandle} branch to ${edge.target} as skipped (branch is ${branch})`
                        );
                        markNodeAsSkipped(edge.target);
                    }
                }

                // PHASE 2: Execute active branches AFTER all skipping is complete
                for (const edge of dependentEdges) {
                    const shouldExecute = !edge.sourceHandle || edge.sourceHandle === branch;
                    if (shouldExecute) {
                        console.log(
                            `[Orchestrator] Following ${edge.sourceHandle || "unconditional"} branch to ${edge.target}`
                        );
                        await executeNodeAndDependents(edge.target);
                    }
                }
            } else {
                // Normal execution - execute all dependent nodes
                for (const edge of dependentEdges) {
                    await executeNodeAndDependents(edge.target);
                }
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error(`[Orchestrator] Node ${nodeId} failed: ${errorMessage}`);
            errors[nodeId] = errorMessage;

            // End NODE_EXECUTION span with error
            await endSpan({
                spanId: nodeSpanId,
                error: error instanceof Error ? error : new Error(errorMessage),
                attributes: {
                    success: false,
                    failureReason: "node_execution_failed"
                }
            });

            // Emit node failed event
            await emitNodeFailed({
                executionId,
                nodeId,
                nodeName: node.name || nodeId,
                nodeType: node.type,
                error: errorMessage
            });

            // Don't execute dependents if this node failed (already marked as executed at start)
        }
    }

    // Execute from all start nodes
    try {
        for (const [startNodeId] of startNodes) {
            await executeNodeAndDependents(startNodeId);
        }

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

        // Emit execution completed event
        await emitExecutionCompleted({
            executionId,
            outputs: context,
            duration: workflowDuration
        });

        // End WORKFLOW_RUN span with success
        await endSpan({
            spanId: workflowRunSpanId,
            output: {
                success: true,
                outputs: context
            },
            attributes: {
                durationMs: workflowDuration,
                completedNodeCount,
                totalNodeCount: nodeEntries.length
            }
        });

        return {
            success: true,
            outputs: context
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
