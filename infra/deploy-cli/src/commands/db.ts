import * as fs from "fs";
import chalk from "chalk";
import { Command } from "commander";
import { getEnvironment, getRepoPath } from "../config";
import { execOrFail, exec, checkKubectl } from "../services";
import { configureDockerAuth, buildImage } from "../services/docker";
import { checkGcloud, verifyEnvironment } from "../services/gcloud";
import { getClusterCredentials, validateContext, deleteResource } from "../services/kubernetes";
import { isCI } from "../utils/ci";
import { printSuccess, printError, printInfo, printWarning, printSection } from "../utils/output";
import { confirmProduction, printDryRunNotice, printDryRunAction } from "../utils/safety";
import { withSpinner } from "../utils/spinner";

interface DbMigrateOptions {
    env: string;
    yes: boolean;
    dryRun: boolean;
}

interface DbSeedOptions {
    env: string;
    yes: boolean;
}

export function registerDbCommand(program: Command): void {
    const dbCommand = program
        .command("db")
        .description("Database operations (migrate, seed, status)");

    // Migrate command
    dbCommand
        .command("migrate")
        .description("Run database migrations")
        .option("-e, --env <env>", "Environment: local, prod, staging", "local")
        .option("-y, --yes", "Skip confirmation prompts", false)
        .option("--dry-run", "Show what would happen without making changes", false)
        .action(async (opts: DbMigrateOptions) => {
            try {
                await runMigrate(opts);
            } catch (error) {
                printError(error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });

    // Seed command
    dbCommand
        .command("seed")
        .description("Seed database with initial data")
        .option("-e, --env <env>", "Environment: local, prod, staging", "local")
        .option("-y, --yes", "Skip confirmation prompts", false)
        .action(async (opts: DbSeedOptions) => {
            try {
                await runSeed(opts);
            } catch (error) {
                printError(error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });

    // Status command
    dbCommand
        .command("status")
        .description("Show database migration status")
        .option("-e, --env <env>", "Environment: local, prod, staging", "local")
        .action(async (opts: { env: string }) => {
            try {
                await showMigrationStatus(opts.env);
            } catch (error) {
                printError(error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });
}

async function runMigrate(options: DbMigrateOptions): Promise<void> {
    const { env, yes, dryRun } = options;

    if (env === "local") {
        // Local migration - just run npm script
        printSection("Running Local Migrations");

        if (dryRun) {
            printDryRunNotice();
            printDryRunAction("npm run db:migrate --workspace=backend");
            return;
        }

        await withSpinner(
            "Running migrations...",
            async () => {
                await execOrFail("npm", ["run", "db:migrate", "--workspace=backend"], {
                    cwd: getRepoPath()
                });
            },
            { successText: "Migrations completed successfully" }
        );

        printSuccess("Local migrations complete!");
        return;
    }

    // Production/staging migration
    const envConfig = getEnvironment(env);

    printSection("Production Database Migration");
    printWarning("This will run migrations against the PRODUCTION database!");
    printInfo(`Environment: ${chalk.cyan(envConfig.name)}`);
    printInfo(`Project: ${chalk.cyan(envConfig.gcpProject)}`);

    if (dryRun) {
        printDryRunNotice();
    }

    // Confirm production
    const confirmed = await confirmProduction("run database migrations", {
        yes,
        env
    });

    if (!confirmed) {
        printInfo("Migration cancelled");
        return;
    }

    if (dryRun) {
        printDryRunAction("Build migrations Docker image");
        printDryRunAction("Push image to Artifact Registry");
        printDryRunAction("Delete existing migration jobs");
        printDryRunAction("Create and run migration Kubernetes job");
        return;
    }

    // Check prerequisites
    checkGcloud();
    checkKubectl();

    await verifyEnvironment(envConfig);

    if (!isCI()) {
        await getClusterCredentials(envConfig);
    }

    await validateContext(envConfig);

    // Build migrations image
    printSection("Building Migration Image");

    await configureDockerAuth(envConfig.gcpRegion);

    const timestamp = Math.floor(Date.now() / 1000);
    const imageTag = "latest";

    await buildImage({
        service: {
            name: "migrations",
            displayName: "Migrations",
            deploymentName: "migrations",
            dockerFile: "infra/docker/migrations/Dockerfile",
            imageName: "migrations"
        },
        env: envConfig,
        tag: imageTag,
        repoRoot: getRepoPath()
    });

    // Push image
    await withSpinner(
        "Pushing migrations image...",
        async () => {
            await execOrFail("docker", ["push", `${envConfig.registry}/migrations:${imageTag}`]);
        },
        { successText: "Migrations image pushed" }
    );

    // Delete existing migration jobs
    printSection("Running Migration Job");

    await withSpinner(
        "Cleaning up existing migration jobs...",
        async () => {
            await deleteResource("job", "", envConfig, { ignoreNotFound: true });
            await execOrFail("kubectl", [
                "delete",
                "job",
                "-n",
                envConfig.namespace,
                "-l",
                "component=db-migration",
                "--ignore-not-found"
            ]);
        },
        { successText: "Existing jobs cleaned up" }
    );

    // Apply migration job
    const jobName = `db-migration-${timestamp}`;
    const manifestPath = getRepoPath("infra/k8s/jobs/db-migration.yaml");

    // Read and modify the manifest
    let manifest = fs.readFileSync(manifestPath, "utf-8");
    manifest = manifest.replace(/\$\{TIMESTAMP\}/g, String(timestamp));
    manifest = manifest.replace(/\$\{IMAGE_TAG\}/g, imageTag);

    // Write to temp file
    const tempManifestPath = `/tmp/db-migration-${timestamp}.yaml`;
    fs.writeFileSync(tempManifestPath, manifest);

    await withSpinner(
        `Creating migration job ${jobName}...`,
        async () => {
            await execOrFail("kubectl", ["apply", "-f", tempManifestPath]);
        },
        { successText: `Migration job ${jobName} created` }
    );

    // Wait for job to complete
    await withSpinner(
        "Waiting for migration to complete (timeout: 5 minutes)...",
        async () => {
            await execOrFail("kubectl", [
                "wait",
                "--for=condition=complete",
                `job/${jobName}`,
                "-n",
                envConfig.namespace,
                "--timeout=300s"
            ]);
        },
        { successText: "Migration completed successfully" }
    );

    // Show logs
    printSection("Migration Logs");
    const logsResult = await exec("kubectl", ["logs", `job/${jobName}`, "-n", envConfig.namespace]);
    console.log(logsResult.stdout);

    // Cleanup temp file
    fs.unlinkSync(tempManifestPath);

    printSuccess("Production migrations complete!");
}

async function runSeed(options: DbSeedOptions): Promise<void> {
    const { env, yes } = options;

    if (env === "local") {
        printSection("Running Local Database Seed");

        await withSpinner(
            "Seeding database...",
            async () => {
                await execOrFail("npm", ["run", "db:seed", "--workspace=backend"], {
                    cwd: getRepoPath()
                });
            },
            { successText: "Database seeded successfully" }
        );

        printSuccess("Local database seeded!");
        return;
    }

    // Production seeding (similar to migrate, but different job)
    const envConfig = getEnvironment(env);

    printSection("Production Database Seed");
    printInfo(`Environment: ${envConfig.name}`);
    printWarning("This will seed the PRODUCTION database!");

    const confirmed = await confirmProduction("seed the database", {
        yes,
        env
    });

    if (!confirmed) {
        printInfo("Seeding cancelled");
        return;
    }

    printError("Production seeding via fmctl is not yet implemented.");
    printInfo("Please use the db-seed.sh script directly for now.");
}

async function showMigrationStatus(env: string): Promise<void> {
    printSection("Migration Status");

    if (env === "local") {
        // For local, we could query the migrations table directly
        printInfo("Checking local migration status...");

        const result = await exec("npm", ["run", "db:migrate:status", "--workspace=backend"], {
            cwd: getRepoPath()
        });

        if (result.exitCode === 0) {
            console.log(result.stdout);
        } else {
            printWarning("Could not determine migration status");
            printInfo("Try running: npm run db:migrate --workspace=backend");
        }
    } else {
        // For production, we'd need to query the cluster
        const envConfig = getEnvironment(env);
        printInfo(`Environment: ${envConfig.name}`);
        printInfo(`Project: ${envConfig.gcpProject}`);
        printWarning("Remote migration status check not yet implemented");
    }
}
