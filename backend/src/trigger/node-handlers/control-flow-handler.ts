import { BaseNodeHandler, NodeHandlerInput, NodeHandlerOutput } from "./types";
import type { JsonObject, JsonValue } from "@flowmaestro/shared";

/**
 * ControlFlowHandler - Handles control flow nodes.
 *
 * Supported node types:
 * - loop-start: Start of a loop (for, forEach, while)
 * - loop-end: End of a loop
 * - parallel-start: Start of parallel branches
 * - parallel-end: End of parallel branches (merge)
 * - wait: Wait for a duration
 * - pause: Pause for human input
 * - delay: Delay execution
 * - stop: Stop workflow execution
 * - goto: Jump to another node
 */
export class ControlFlowHandler extends BaseNodeHandler {
    protected nodeTypes = [
        "loop-start",
        "loop-end",
        "parallel-start",
        "parallel-end",
        "wait",
        "pause",
        "delay",
        "stop",
        "goto"
    ];

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();

        try {
            let result: NodeHandlerOutput;

            switch (input.nodeType) {
                case "loop-start":
                    result = await this.executeLoopStart(input);
                    break;
                case "loop-end":
                    result = await this.executeLoopEnd(input);
                    break;
                case "parallel-start":
                    result = await this.executeParallelStart(input);
                    break;
                case "parallel-end":
                    result = await this.executeParallelEnd(input);
                    break;
                case "wait":
                case "delay":
                    result = await this.executeWait(input);
                    break;
                case "pause":
                    result = await this.executePause(input);
                    break;
                case "stop":
                    result = await this.executeStop(input);
                    break;
                case "goto":
                    result = await this.executeGoto(input);
                    break;
                default:
                    result = this.success({ passthrough: true });
            }

            // Add duration metadata
            if (result.metadata) {
                result.metadata.durationMs = Date.now() - startTime;
            } else {
                result.metadata = { durationMs: Date.now() - startTime };
            }

            return result;
        } catch (error) {
            return this.failure(
                error instanceof Error ? error.message : String(error),
                { activateErrorPort: true }
            );
        }
    }

    /**
     * Execute loop-start node.
     * Sets up loop context for iteration.
     */
    private async executeLoopStart(
        input: NodeHandlerInput
    ): Promise<NodeHandlerOutput> {
        const { config, context } = input;
        const loopType = (config.loopType as string) || "forEach";

        let items: unknown[] = [];
        let iterations = 0;

        switch (loopType) {
            case "forEach": {
                // Iterate over array
                const source = this.resolveValue(config.source, context);
                if (Array.isArray(source)) {
                    items = source;
                    iterations = source.length;
                }
                break;
            }
            case "for": {
                // Fixed number of iterations
                const start = (config.start as number) || 0;
                const end = (config.end as number) || 0;
                const step = (config.step as number) || 1;
                iterations = Math.max(0, Math.ceil((end - start) / step));
                items = Array.from({ length: iterations }, (_, i) => start + i * step);
                break;
            }
            case "while": {
                // While loop - condition checked at loop-end
                // Return with initial state
                break;
            }
        }

        // Get current iteration from loop context
        const currentIndex = context.loopContext?.index ?? 0;
        const currentItem = items[currentIndex];

        // Check if loop should continue
        if (currentIndex >= iterations && loopType !== "while") {
            return {
                success: true,
                data: {
                    loopComplete: true,
                    iterations: currentIndex
                },
                signals: {
                    loopControl: "break"
                }
            };
        }

        return {
            success: true,
            data: {
                index: currentIndex,
                item: currentItem as JsonValue,
                total: iterations,
                hasMore: currentIndex < iterations - 1
            }
        };
    }

    /**
     * Execute loop-end node.
     * Determines whether to continue or break the loop.
     */
    private async executeLoopEnd(
        input: NodeHandlerInput
    ): Promise<NodeHandlerOutput> {
        const { config, context } = input;
        const loopType = (config.loopType as string) || "forEach";

        // Check for break condition
        if (config.breakCondition) {
            const shouldBreak = this.evaluateCondition(
                config.breakCondition as string,
                context
            );
            if (shouldBreak) {
                return {
                    success: true,
                    data: {
                        loopComplete: true,
                        reason: "break condition met"
                    },
                    signals: {
                        loopControl: "break"
                    }
                };
            }
        }

        // For while loops, check the while condition
        if (loopType === "while") {
            const condition = config.condition as string;
            if (condition) {
                const shouldContinue = this.evaluateCondition(condition, context);
                if (!shouldContinue) {
                    return {
                        success: true,
                        data: {
                            loopComplete: true,
                            reason: "while condition false"
                        },
                        signals: {
                            loopControl: "break"
                        }
                    };
                }
            }
        }

        // Continue to next iteration
        return {
            success: true,
            data: {
                continue: true,
                currentIndex: context.loopContext?.index ?? 0
            },
            signals: {
                loopControl: "continue"
            }
        };
    }

    /**
     * Execute parallel-start node.
     * Sets up parallel branch context.
     */
    private async executeParallelStart(
        input: NodeHandlerInput
    ): Promise<NodeHandlerOutput> {
        const { config, context } = input;
        const branchCount = (config.branchCount as number) || 2;
        const currentBranch = context.parallelContext?.branchIndex ?? 0;

        return {
            success: true,
            data: {
                branchIndex: currentBranch,
                totalBranches: branchCount,
                isFirstBranch: currentBranch === 0,
                isLastBranch: currentBranch === branchCount - 1
            }
        };
    }

    /**
     * Execute parallel-end node.
     * Merges results from parallel branches.
     */
    private async executeParallelEnd(
        input: NodeHandlerInput
    ): Promise<NodeHandlerOutput> {
        const { config, context } = input;
        const sources = (config.sources as string[]) || [];
        const mergeStrategy = (config.mergeStrategy as string) || "array";

        // Collect outputs from source nodes
        const branchOutputs: JsonObject[] = [];
        for (const source of sources) {
            const output = context.nodeOutputs[source];
            if (output) {
                branchOutputs.push(output);
            }
        }

        let merged: JsonValue;
        switch (mergeStrategy) {
            case "array":
                merged = branchOutputs;
                break;
            case "object":
                merged = Object.assign({}, ...branchOutputs) as JsonObject;
                break;
            case "first":
                merged = branchOutputs[0] || null;
                break;
            case "last":
                merged = branchOutputs[branchOutputs.length - 1] || null;
                break;
            default:
                merged = branchOutputs;
        }

        return {
            success: true,
            data: {
                merged,
                branchCount: branchOutputs.length
            }
        };
    }

    /**
     * Execute wait/delay node.
     */
    private async executeWait(
        input: NodeHandlerInput
    ): Promise<NodeHandlerOutput> {
        const { config } = input;
        const duration = (config.duration as number) || 0;
        const unit = (config.unit as string) || "ms";

        // Convert to milliseconds
        let durationMs = duration;
        switch (unit) {
            case "s":
            case "seconds":
                durationMs = duration * 1000;
                break;
            case "m":
            case "minutes":
                durationMs = duration * 60 * 1000;
                break;
            case "h":
            case "hours":
                durationMs = duration * 60 * 60 * 1000;
                break;
        }

        // Wait for the specified duration
        await new Promise((resolve) => setTimeout(resolve, durationMs));

        return {
            success: true,
            data: {
                waited: durationMs,
                unit: "ms"
            }
        };
    }

    /**
     * Execute pause node.
     * Pauses workflow for human input.
     */
    private async executePause(
        input: NodeHandlerInput
    ): Promise<NodeHandlerOutput> {
        const { config, nodeId } = input;
        const reason = (config.reason as string) || "Waiting for user input";
        const expectedInput = config.inputSchema as JsonObject | undefined;

        // Generate a unique waitpoint ID
        const waitpointId = `pause-${nodeId}-${Date.now()}`;

        return this.pause(waitpointId, reason, expectedInput);
    }

    /**
     * Execute stop node.
     * Terminates workflow execution.
     */
    private async executeStop(
        input: NodeHandlerInput
    ): Promise<NodeHandlerOutput> {
        const { config } = input;
        const reason = (config.reason as string) || "Workflow stopped";
        const success = config.success !== false;

        return {
            success,
            data: {
                stopped: true,
                reason
            },
            signals: {
                isTerminal: true
            }
        };
    }

    /**
     * Execute goto node.
     * Routes to a specific node.
     */
    private async executeGoto(
        input: NodeHandlerInput
    ): Promise<NodeHandlerOutput> {
        const { config } = input;
        const targetNode = config.target as string;

        if (!targetNode) {
            throw new Error("Target node is required for goto");
        }

        return this.route(targetNode, {
            goto: targetNode
        });
    }

    /**
     * Resolve a value from config or context.
     */
    private resolveValue(
        value: unknown,
        context: NodeHandlerInput["context"]
    ): unknown {
        if (typeof value !== "string") {
            return value;
        }

        // Check if it's a variable reference
        if (value.startsWith("{{") && value.endsWith("}}")) {
            const path = value.slice(2, -2).trim();
            return this.resolvePath(path, context);
        }

        return value;
    }

    /**
     * Resolve a dot-notation path to a value.
     */
    private resolvePath(
        path: string,
        context: NodeHandlerInput["context"]
    ): unknown {
        const parts = path.split(".");
        const root = parts[0];

        let value: unknown;

        if (root === "inputs") {
            value = context.inputs;
        } else if (root === "variables" || root === "var") {
            value = context.workflowVariables;
        } else if (root === "loop" && context.loopContext) {
            value = context.loopContext;
        } else if (root === "parallel" && context.parallelContext) {
            value = context.parallelContext;
        } else if (context.nodeOutputs[root]) {
            value = context.nodeOutputs[root];
        } else {
            return undefined;
        }

        // Navigate remaining path
        for (let i = 1; i < parts.length && value != null; i++) {
            value = (value as Record<string, unknown>)[parts[i]];
        }

        return value;
    }

    /**
     * Evaluate a condition expression.
     */
    private evaluateCondition(
        condition: string,
        context: NodeHandlerInput["context"]
    ): boolean {
        try {
            const evalContext = {
                inputs: context.inputs,
                outputs: context.nodeOutputs,
                variables: context.workflowVariables,
                loop: context.loopContext,
                parallel: context.parallelContext
            };

            const fn = new Function(
                "ctx",
                `const { inputs, outputs, variables, loop, parallel } = ctx; return ${condition}`
            );
            return Boolean(fn(evalContext));
        } catch {
            return false;
        }
    }
}
