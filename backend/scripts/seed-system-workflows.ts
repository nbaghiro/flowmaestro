/**
 * Seed System Workflows CLI Script
 *
 * Populates the database with pre-defined system workflows
 * for internal FlowMaestro operations.
 *
 * Usage: npm run db:seed:system-workflows
 */

import { allSystemWorkflows } from "@flowmaestro/shared";
import { createServiceLogger } from "../src/core/logging";
import { db } from "../src/storage/database";
import { WorkflowRepository } from "../src/storage/repositories/WorkflowRepository";

const logger = createServiceLogger("SystemWorkflowSeeder");

// System user and workspace IDs
const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID || "00000000-0000-0000-0000-000000000000";
const SYSTEM_WORKSPACE_ID =
    process.env.SYSTEM_WORKSPACE_ID || "00000000-0000-0000-0000-000000000000";

async function seedSystemWorkflows(): Promise<void> {
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

async function main() {
    console.log("Starting system workflow seeding...\n");

    try {
        await seedSystemWorkflows();
        console.log("\nSystem workflow seeding completed successfully.");
    } catch (error) {
        console.error("\nSystem workflow seeding failed:", error);
        process.exit(1);
    } finally {
        await db.close();
    }
}

main();
