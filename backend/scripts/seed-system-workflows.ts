/**
 * Seed System Workflows CLI Script
 *
 * Runs the system workflow seeder to populate the database with
 * pre-defined system workflows for internal FlowMaestro operations.
 *
 * Usage: npm run seed:system-workflows
 */

import { db } from "../src/storage/database";
import { seedSystemWorkflows } from "../src/system-workflows/seeder";

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
