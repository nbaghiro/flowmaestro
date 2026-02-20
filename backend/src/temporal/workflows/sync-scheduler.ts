/**
 * Sync Scheduler Workflow
 *
 * Periodic workflow that checks for integration sources that need syncing
 * and triggers import workflows for them.
 *
 * This workflow should be scheduled as a cron workflow (e.g., every 5 minutes)
 */

import { proxyActivities, startChild, ParentClosePolicy } from "@temporalio/workflow";
import { createWorkflowLogger } from "../core/workflow-logger";
import type * as activities from "../activities";
import type { IntegrationImportWorkflowInput } from "./integration-import";

// ============================================================================
// ACTIVITY PROXIES
// ============================================================================

const { findSourcesDueForSync, updateSourceSyncStatus } = proxyActivities<{
    findSourcesDueForSync: (limit: number) => Promise<
        Array<{
            id: string;
            knowledgeBaseId: string;
            connectionId: string;
            provider: string;
            sourceConfig: IntegrationImportWorkflowInput["sourceConfig"];
        }>
    >;
    updateSourceSyncStatus: typeof activities.updateSourceSyncStatus;
}>({
    startToCloseTimeout: "1 minute",
    retry: {
        initialInterval: "1s",
        backoffCoefficient: 2,
        maximumAttempts: 3,
        maximumInterval: "10s"
    }
});

// ============================================================================
// TYPES
// ============================================================================

export interface SyncSchedulerWorkflowInput {
    maxConcurrentSyncs?: number;
}

export interface SyncSchedulerWorkflowResult {
    sourcesChecked: number;
    syncsStarted: number;
    errors: string[];
}

// ============================================================================
// WORKFLOW
// ============================================================================

/**
 * Sync Scheduler Workflow
 *
 * Checks for sources that need syncing and starts child workflows for each.
 * Should be run as a scheduled workflow (cron).
 */
export async function syncSchedulerWorkflow(
    input: SyncSchedulerWorkflowInput = {}
): Promise<SyncSchedulerWorkflowResult> {
    const wfLogger = createWorkflowLogger({
        executionId: "sync-scheduler",
        workflowName: "SyncScheduler",
        userId: undefined
    });

    const maxConcurrent = input.maxConcurrentSyncs || 10;
    const errors: string[] = [];
    let syncsStarted = 0;

    wfLogger.info("Starting sync scheduler", { maxConcurrent });

    try {
        // Find sources that are due for sync
        const sources = await findSourcesDueForSync(maxConcurrent);

        wfLogger.info("Found sources due for sync", { count: sources.length });

        // Start import workflows for each source
        for (const source of sources) {
            try {
                // Update status to syncing before starting
                await updateSourceSyncStatus({
                    sourceId: source.id,
                    status: "syncing"
                });

                // Start child workflow
                await startChild("integrationImportWorkflow", {
                    workflowId: `integration-import-${source.id}-scheduled-${Date.now()}`,
                    taskQueue: "flowmaestro-orchestrator",
                    args: [
                        {
                            sourceId: source.id,
                            knowledgeBaseId: source.knowledgeBaseId,
                            connectionId: source.connectionId,
                            provider: source.provider,
                            sourceConfig: source.sourceConfig,
                            isInitialImport: false
                        }
                    ],
                    parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_ABANDON
                });

                syncsStarted++;
                wfLogger.info("Started sync for source", { sourceId: source.id });
            } catch (error) {
                const errorMsg = `Failed to start sync for source ${source.id}: ${error instanceof Error ? error.message : String(error)}`;
                errors.push(errorMsg);
                wfLogger.error("Failed to start sync", error as Error, { sourceId: source.id });

                // Reset status to pending so it will be picked up again
                try {
                    await updateSourceSyncStatus({
                        sourceId: source.id,
                        status: "pending"
                    });
                } catch {
                    // Ignore
                }
            }
        }

        wfLogger.info("Sync scheduler completed", {
            sourcesChecked: sources.length,
            syncsStarted,
            errorCount: errors.length
        });

        return {
            sourcesChecked: sources.length,
            syncsStarted,
            errors
        };
    } catch (error) {
        wfLogger.error("Sync scheduler failed", error as Error);

        return {
            sourcesChecked: 0,
            syncsStarted: 0,
            errors: [error instanceof Error ? error.message : "Unknown error"]
        };
    }
}
