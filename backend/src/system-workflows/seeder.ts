/**
 * System Workflow Seeder
 *
 * Seeds system workflows into the database during deployment.
 * Uses upsert to create new workflows or update existing ones.
 */

import { createServiceLogger } from "../core/logging";
import { WorkflowRepository } from "../storage/repositories/WorkflowRepository";
import { allSystemWorkflows } from "./definitions";

const logger = createServiceLogger("SystemWorkflowSeeder");

// System user and workspace IDs
// These should be created during initial setup or specified via environment
const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID || "00000000-0000-0000-0000-000000000000";
const SYSTEM_WORKSPACE_ID =
    process.env.SYSTEM_WORKSPACE_ID || "00000000-0000-0000-0000-000000000000";

export async function seedSystemWorkflows(): Promise<void> {
    const repo = new WorkflowRepository();

    logger.info({ count: allSystemWorkflows.length }, "Starting system workflow seeding");

    for (const def of allSystemWorkflows) {
        try {
            const workflow = await repo.upsertBySystemKey({
                name: def.name,
                description: def.description,
                definition: def.definition,
                user_id: SYSTEM_USER_ID,
                workspace_id: SYSTEM_WORKSPACE_ID,
                workflow_type: "system",
                system_key: def.key
            });

            logger.info({ key: def.key, id: workflow.id }, "Seeded system workflow");
        } catch (error) {
            logger.error({ error, key: def.key }, "Failed to seed system workflow");
            throw error;
        }
    }

    logger.info({ count: allSystemWorkflows.length }, "System workflow seeding complete");
}
