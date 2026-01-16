/**
 * Data Migration Script: Create Personal Workspaces for Existing Users
 *
 * This script:
 * 1. Creates a personal workspace for each existing user
 * 2. Creates owner membership records
 * 3. Initializes workspace credits (100 free credits)
 * 4. Assigns all user's existing resources to their workspace
 *
 * Run with: npx tsx backend/scripts/migrate-workspaces.ts
 */

import * as path from "path";
import * as dotenv from "dotenv";
import { Pool } from "pg";
import { WORKSPACE_LIMITS } from "@flowmaestro/shared";

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Create database pool directly (avoids importing from src/ which isn't in migrations image)
const pool = new Pool({
    host: process.env.POSTGRES_HOST || "localhost",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "flowmaestro",
    user: process.env.POSTGRES_USER || "flowmaestro",
    password: process.env.POSTGRES_PASSWORD || "flowmaestro_dev_password"
});

interface UserRow {
    id: string;
    email: string;
    name: string | null;
}

interface ResourceCount {
    table_name: string;
    count: number;
}

function generateSlug(name: string, id: string): string {
    const baseSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50);

    // Add a short unique suffix from the user ID
    const suffix = id.slice(0, 8);
    return baseSlug ? `${baseSlug}-${suffix}` : suffix;
}

async function migrateWorkspaces(): Promise<void> {
    console.log("Starting workspace migration...\n");

    // Get all users who don't have a workspace yet
    const usersResult = await pool.query<UserRow>(`
        SELECT u.id, u.email, u.name
        FROM flowmaestro.users u
        WHERE NOT EXISTS (
            SELECT 1 FROM flowmaestro.workspaces w
            WHERE w.owner_id = u.id AND w.category = 'personal'
        )
        ORDER BY u.created_at ASC
    `);

    const users = usersResult.rows;
    console.log(`Found ${users.length} users without personal workspaces\n`);

    if (users.length === 0) {
        console.log("No users need migration. Exiting.");
        return;
    }

    const limits = WORKSPACE_LIMITS.free;
    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
        const workspaceName = "Personal Workspace";
        const slug = generateSlug(user.name || "personal", user.id);

        console.log(`Migrating user: ${user.email}`);

        try {
            await pool.query("BEGIN");

            // 1. Create the personal workspace
            const workspaceResult = await pool.query<{ id: string }>(
                `
                INSERT INTO flowmaestro.workspaces (
                    name, slug, description, category, type, owner_id,
                    max_workflows, max_agents, max_knowledge_bases, max_kb_chunks,
                    max_members, max_connections, execution_history_days
                )
                VALUES ($1, $2, $3, 'personal', 'free', $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id
            `,
                [
                    workspaceName,
                    slug,
                    "Your personal workspace",
                    user.id,
                    limits.max_workflows,
                    limits.max_agents,
                    limits.max_knowledge_bases,
                    limits.max_kb_chunks,
                    limits.max_members,
                    limits.max_connections,
                    limits.execution_history_days
                ]
            );

            const workspaceId = workspaceResult.rows[0].id;

            // 2. Create owner membership
            await pool.query(
                `
                INSERT INTO flowmaestro.workspace_members (
                    workspace_id, user_id, role, accepted_at
                )
                VALUES ($1, $2, 'owner', NOW())
            `,
                [workspaceId, user.id]
            );

            // 3. Initialize credits (100 free bonus credits)
            await pool.query(
                `
                INSERT INTO flowmaestro.workspace_credits (
                    workspace_id, subscription_balance, purchased_balance, bonus_balance,
                    lifetime_allocated
                )
                VALUES ($1, 0, 0, 100, 100)
            `,
                [workspaceId]
            );

            // 4. Record the initial credit transaction
            await pool.query(
                `
                INSERT INTO flowmaestro.credit_transactions (
                    workspace_id, user_id, amount, balance_before, balance_after,
                    transaction_type, description
                )
                VALUES ($1, $2, 100, 0, 100, 'bonus', 'Initial free credits')
            `,
                [workspaceId, user.id]
            );

            // 5. Update all user's resources to belong to this workspace
            const resourceTables = [
                "workflows",
                "agents",
                "threads",
                "connections",
                "database_connections",
                "knowledge_bases",
                "folders",
                "form_interfaces",
                "chat_interfaces",
                "api_keys",
                "outgoing_webhooks"
            ];

            for (const table of resourceTables) {
                await pool.query(
                    `
                    UPDATE flowmaestro.${table}
                    SET workspace_id = $1
                    WHERE user_id = $2 AND workspace_id IS NULL
                `,
                    [workspaceId, user.id]
                );
            }

            // Update workflow_triggers (joins through workflows)
            await pool.query(
                `
                UPDATE flowmaestro.workflow_triggers wt
                SET workspace_id = $1
                FROM flowmaestro.workflows w
                WHERE wt.workflow_id = w.id
                    AND w.user_id = $2
                    AND wt.workspace_id IS NULL
            `,
                [workspaceId, user.id]
            );

            // 6. Update user's default/last workspace
            await pool.query(
                `
                UPDATE flowmaestro.users
                SET default_workspace_id = $1, last_workspace_id = $1
                WHERE id = $2
            `,
                [workspaceId, user.id]
            );

            await pool.query("COMMIT");

            successCount++;
            console.log(`  ✓ Created workspace: ${workspaceName} (${workspaceId})`);
        } catch (error) {
            await pool.query("ROLLBACK");
            errorCount++;
            console.error(
                `  ✗ Failed for ${user.email}:`,
                error instanceof Error ? error.message : error
            );
        }
    }

    console.log("\n--- Migration Summary ---");
    console.log(`Total users processed: ${users.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${errorCount}`);

    // Verify resource counts
    console.log("\n--- Resource Assignment Verification ---");
    const verifyResult = await pool.query<ResourceCount>(`
        SELECT 'workflows' as table_name, COUNT(*) as count FROM flowmaestro.workflows WHERE workspace_id IS NULL AND deleted_at IS NULL
        UNION ALL
        SELECT 'agents', COUNT(*) FROM flowmaestro.agents WHERE workspace_id IS NULL AND deleted_at IS NULL
        UNION ALL
        SELECT 'folders', COUNT(*) FROM flowmaestro.folders WHERE workspace_id IS NULL AND deleted_at IS NULL
        UNION ALL
        SELECT 'connections', COUNT(*) FROM flowmaestro.connections WHERE workspace_id IS NULL
        UNION ALL
        SELECT 'knowledge_bases', COUNT(*) FROM flowmaestro.knowledge_bases WHERE workspace_id IS NULL
    `);

    for (const row of verifyResult.rows) {
        const status = row.count === 0 ? "✓" : "⚠";
        console.log(`  ${status} ${row.table_name}: ${row.count} unassigned`);
    }
}

// Run the migration
migrateWorkspaces()
    .then(async () => {
        console.log("\nMigration complete!");
        await pool.end();
        process.exit(0);
    })
    .catch(async (error) => {
        console.error("\nMigration failed:", error);
        await pool.end();
        process.exit(1);
    });
