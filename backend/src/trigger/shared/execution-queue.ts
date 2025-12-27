import type { ExecutionPlan, ExecutableNode } from "../workflow-builder/types";

/**
 * ExecutionQueue - Manages parallel execution of workflow nodes.
 *
 * Features:
 * - Tracks completed and failed nodes
 * - Returns batches of nodes ready for execution (all dependencies satisfied)
 * - Handles error port routing (failed nodes can still allow dependents to run)
 * - Supports execution level ordering
 */
export class ExecutionQueue {
    private plan: ExecutionPlan;
    private completed: Set<string> = new Set();
    private failed: Set<string> = new Set();
    private inProgress: Set<string> = new Set();
    private skipped: Set<string> = new Set();

    constructor(plan: ExecutionPlan) {
        this.plan = plan;
    }

    /**
     * Check if there is more work to be done.
     */
    hasWork(): boolean {
        return this.getNextBatch().length > 0;
    }

    /**
     * Check if execution is complete.
     */
    isComplete(): boolean {
        const total = this.plan.nodes.size;
        const processed = this.completed.size + this.failed.size + this.skipped.size;
        return processed >= total;
    }

    /**
     * Get the next batch of nodes ready for execution.
     * Returns nodes whose dependencies are all satisfied (completed, failed, or skipped).
     */
    getNextBatch(): string[] {
        const ready: string[] = [];

        for (const [nodeId, node] of this.plan.nodes) {
            // Skip if already processed or in progress
            if (
                this.completed.has(nodeId) ||
                this.failed.has(nodeId) ||
                this.skipped.has(nodeId) ||
                this.inProgress.has(nodeId)
            ) {
                continue;
            }

            // Check if all dependencies are satisfied
            const dependenciesSatisfied = node.dependencies.every(
                (depId) =>
                    this.completed.has(depId) ||
                    this.failed.has(depId) ||
                    this.skipped.has(depId) ||
                    !this.plan.nodes.has(depId) // Dependency not in plan (filtered out)
            );

            if (dependenciesSatisfied) {
                // Check if any required dependency failed without error port
                const shouldSkip = this.shouldSkipDueToFailure(node);
                if (shouldSkip) {
                    this.skipped.add(nodeId);
                } else {
                    ready.push(nodeId);
                }
            }
        }

        return ready;
    }

    /**
     * Check if a node should be skipped because a dependency failed
     * and there's no error port routing.
     */
    private shouldSkipDueToFailure(node: ExecutableNode): boolean {
        for (const depId of node.dependencies) {
            if (this.failed.has(depId)) {
                const depNode = this.plan.nodes.get(depId);
                // If the dependency failed and doesn't have an error port,
                // skip this node
                if (depNode && !depNode.hasErrorPort) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Mark a node as in progress.
     */
    markInProgress(nodeId: string): void {
        this.inProgress.add(nodeId);
    }

    /**
     * Mark multiple nodes as in progress.
     */
    markBatchInProgress(nodeIds: string[]): void {
        for (const nodeId of nodeIds) {
            this.inProgress.add(nodeId);
        }
    }

    /**
     * Mark a node as completed.
     */
    markCompleted(nodeId: string): void {
        this.inProgress.delete(nodeId);
        this.completed.add(nodeId);
    }

    /**
     * Mark a node as failed.
     */
    markFailed(nodeId: string): void {
        this.inProgress.delete(nodeId);
        this.failed.add(nodeId);
    }

    /**
     * Mark a node as skipped.
     */
    markSkipped(nodeId: string): void {
        this.inProgress.delete(nodeId);
        this.skipped.add(nodeId);
    }

    /**
     * Get current execution status.
     */
    getStatus(): {
        completed: string[];
        failed: string[];
        skipped: string[];
        inProgress: string[];
        pending: string[];
        total: number;
    } {
        const completed = Array.from(this.completed);
        const failed = Array.from(this.failed);
        const skipped = Array.from(this.skipped);
        const inProgress = Array.from(this.inProgress);
        const processedSet = new Set([
            ...this.completed,
            ...this.failed,
            ...this.skipped,
            ...this.inProgress
        ]);
        const pending = Array.from(this.plan.nodes.keys()).filter(
            (id) => !processedSet.has(id)
        );

        return {
            completed,
            failed,
            skipped,
            inProgress,
            pending,
            total: this.plan.nodes.size
        };
    }

    /**
     * Get progress percentage.
     */
    getProgress(): number {
        const processed = this.completed.size + this.failed.size + this.skipped.size;
        const total = this.plan.nodes.size;
        return total > 0 ? Math.round((processed / total) * 100) : 100;
    }

    /**
     * Get a specific node from the plan.
     */
    getNode(nodeId: string): ExecutableNode | undefined {
        return this.plan.nodes.get(nodeId);
    }

    /**
     * Reset the queue for re-execution.
     */
    reset(): void {
        this.completed.clear();
        this.failed.clear();
        this.inProgress.clear();
        this.skipped.clear();
    }

    /**
     * Get nodes that failed with error ports (for error routing).
     */
    getNodesWithErrorPorts(): string[] {
        return Array.from(this.failed).filter((nodeId) => {
            const node = this.plan.nodes.get(nodeId);
            return node?.hasErrorPort;
        });
    }

    /**
     * Check if execution completed successfully (no failures).
     */
    isSuccessful(): boolean {
        return this.isComplete() && this.failed.size === 0;
    }

    /**
     * Get all nodes that haven't been processed yet.
     * Includes pending and in-progress nodes.
     */
    getRemainingNodes(): string[] {
        const processedSet = new Set([...this.completed, ...this.failed, ...this.skipped]);
        return Array.from(this.plan.nodes.keys()).filter((id) => !processedSet.has(id));
    }
}
