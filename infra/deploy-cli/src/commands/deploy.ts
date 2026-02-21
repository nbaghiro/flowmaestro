import chalk from "chalk";
import { Command } from "commander";
import {
    getEnvironment,
    SERVICES,
    resolveServices,
    SERVICE_GROUPS,
    getRepoPath,
    type ServiceConfig
} from "../config";
import { checkDocker, configureDockerAuth, buildAndPush } from "../services/docker";
import { getGitSha } from "../services/exec";
import { checkGcloud, verifyEnvironment } from "../services/gcloud";
import {
    checkKubectl,
    getClusterCredentials,
    rolloutRestart,
    waitForRollout,
    getPods,
    validateContext,
    verifyExternalSecrets,
    runJob,
    checkKustomize,
    installKustomize,
    applyKustomize,
    waitForRolloutStatus
} from "../services/kubernetes";
import { isCI, getGitSha as getCISha } from "../utils/ci";
import {
    printSuccess,
    printError,
    printInfo,
    printWarning,
    printSection,
    outputTable,
    type TableColumn
} from "../utils/output";
import { confirmProduction, printDryRunNotice, printDryRunAction } from "../utils/safety";

interface DeployOptions {
    env: string;
    tag?: string;
    skipBuild: boolean;
    dryRun: boolean;
    noWait: boolean;
    timeout: number;
    yes: boolean;
    verifySecrets: boolean;
    migrate: boolean;
    seed: boolean;
    useKustomize: boolean;
}

// Additional deployments to wait for that aren't direct services
const ADDITIONAL_DEPLOYMENTS = ["temporal-server"];

export function registerDeployCommand(program: Command): void {
    program
        .command("deploy [services...]")
        .description("Deploy services to Kubernetes cluster")
        .option("-e, --env <env>", "Environment: prod, staging, dev", "prod")
        .option("-t, --tag <tag>", "Image tag (default: git SHA)")
        .option("--skip-build", "Skip Docker build, only restart deployments", false)
        .option("--dry-run", "Show what would happen without making changes", false)
        .option("--no-wait", "Don't wait for rollout to complete", false)
        .option("--timeout <minutes>", "Rollout timeout in minutes", "10")
        .option("-y, --yes", "Skip confirmation prompts", false)
        .option("--verify-secrets", "Verify External Secrets are synced before deploy", false)
        .option("--migrate", "Run database migrations before deploying", false)
        .option("--seed", "Run database seeding after migrations", false)
        .option(
            "--use-kustomize",
            "Use Kustomize to apply manifests instead of rollout restart",
            false
        )
        .addHelpText(
            "after",
            `
Services:
  ${Object.keys(SERVICES).join(", ")}

Service Groups:
  ${Object.entries(SERVICE_GROUPS)
      .map(([name, services]) => `${name}: ${services.join(", ")}`)
      .join("\n  ")}

Examples:
  $ fmctl deploy all --env prod
  $ fmctl deploy api worker --tag v1.2.3
  $ fmctl deploy frontend --skip-build
  $ fmctl deploy app --dry-run
  $ fmctl deploy all --migrate --seed --verify-secrets
  $ fmctl deploy all --use-kustomize --env staging
`
        )
        .action(async (services: string[], opts: DeployOptions) => {
            try {
                await runDeploy(services, opts);
            } catch (error) {
                printError(error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });
}

async function runDeploy(serviceNames: string[], options: DeployOptions): Promise<void> {
    // Default to 'all' if no services specified
    if (serviceNames.length === 0) {
        serviceNames = ["all"];
    }

    // Resolve services from names/groups
    const services = resolveServices(serviceNames);

    if (services.length === 0) {
        printError("No services to deploy");
        process.exit(1);
    }

    // Get environment config
    const env = getEnvironment(options.env);

    // Determine image tag
    const tag = options.tag || getCISha() || getGitSha() || "latest";
    const repoRoot = getRepoPath();

    // Separate deployable services from job-only services
    const deployableServices = services.filter((s) => !s.isJob);
    const jobServices = services.filter((s) => s.isJob);

    // Print deployment plan
    printSection("Deployment Plan");
    printInfo(`Environment: ${chalk.cyan(env.name)} (${env.gcpProject})`);
    printInfo(`Services: ${deployableServices.map((s) => chalk.cyan(s.displayName)).join(", ")}`);
    if (jobServices.length > 0) {
        printInfo(`Job images: ${jobServices.map((s) => chalk.cyan(s.displayName)).join(", ")}`);
    }
    printInfo(`Image tag: ${chalk.cyan(tag)}`);
    printInfo(`Skip build: ${options.skipBuild ? chalk.yellow("yes") : "no"}`);
    printInfo(`Wait for rollout: ${options.noWait ? chalk.yellow("no") : "yes"}`);
    printInfo(`Verify secrets: ${options.verifySecrets ? chalk.green("yes") : "no"}`);
    printInfo(`Run migrations: ${options.migrate ? chalk.green("yes") : "no"}`);
    printInfo(`Run seeding: ${options.seed ? chalk.green("yes") : "no"}`);
    printInfo(`Use Kustomize: ${options.useKustomize ? chalk.green("yes") : "no"}`);

    if (options.dryRun) {
        printDryRunNotice();
    }

    // Confirm production deployment
    const confirmed = await confirmProduction("deploy services", {
        yes: options.yes,
        env: options.env
    });

    if (!confirmed) {
        printInfo("Deployment cancelled");
        process.exit(0);
    }

    // Check prerequisites
    printSection("Checking Prerequisites");

    if (!options.dryRun) {
        checkGcloud();
        checkKubectl();

        if (!options.skipBuild) {
            await checkDocker();
        }

        if (options.useKustomize && !checkKustomize()) {
            printWarning("kustomize not found, installing...");
            await installKustomize();
        }
    } else {
        printDryRunAction(
            "Check gcloud, kubectl, docker" + (options.useKustomize ? ", kustomize" : "")
        );
    }

    // Verify environment and configure tools
    if (!options.dryRun) {
        await verifyEnvironment(env);

        // Configure kubectl for the cluster (skip in CI as it's usually pre-configured)
        if (!isCI()) {
            await getClusterCredentials(env);
        }

        // Validate context
        await validateContext(env);
    } else {
        printDryRunAction("Verify environment and get cluster credentials");
    }

    // Verify External Secrets if requested
    if (options.verifySecrets) {
        printSection("Verifying External Secrets");
        await verifyExternalSecrets(env, options.dryRun);
    }

    // Build and push images
    if (!options.skipBuild) {
        printSection("Building Images");

        // Configure Docker auth
        await configureDockerAuth(env.gcpRegion, options.dryRun);

        // Track which images we've already built (for shared images like api/worker)
        const builtImages = new Set<string>();

        // Build all services including job images
        const allServicesToBuild = [...services];

        // If we're running migrations, make sure migrations image is built
        if (options.migrate || options.seed) {
            const migrationsService = SERVICES.migrations;
            if (migrationsService && !allServicesToBuild.find((s) => s.name === "migrations")) {
                allServicesToBuild.push(migrationsService);
            }
        }

        for (const service of allServicesToBuild) {
            // Skip if this service shares an image with another service we're deploying
            if (service.sharesImageWith && builtImages.has(service.imageName)) {
                printInfo(
                    `${service.displayName} shares image with ${service.sharesImageWith}, skipping build`
                );
                continue;
            }

            // Skip if we've already built this image
            if (builtImages.has(service.imageName)) {
                continue;
            }

            // Build args
            const buildArgs = resolveBuildArgs(service, env);

            await buildAndPush({
                service,
                env,
                tag,
                buildArgs,
                dryRun: options.dryRun,
                repoRoot
            });

            builtImages.add(service.imageName);
        }
    }

    // Run database migrations if requested
    if (options.migrate) {
        printSection("Running Database Migrations");
        await runJob("migration", {
            env,
            imageTag: tag,
            repoRoot,
            dryRun: options.dryRun,
            timeout: 300
        });
    }

    // Run database seeding if requested
    if (options.seed) {
        printSection("Running Database Seeding");
        await runJob("seed", {
            env,
            imageTag: tag,
            repoRoot,
            dryRun: options.dryRun,
            timeout: 300
        });
    }

    // Deploy using Kustomize or rollout restart
    if (options.useKustomize) {
        printSection("Applying Kustomize Overlay");

        // Map env name to overlay directory name
        const overlayName =
            options.env === "prod" || options.env === "production" ? "production" : options.env;
        const overlayPath = `infra/k8s/overlays/${overlayName}`;

        await applyKustomize({
            env,
            overlayPath,
            registry: env.registry,
            imageTag: tag,
            repoRoot,
            dryRun: options.dryRun
        });
    } else {
        // Restart deployments
        printSection("Restarting Deployments");

        for (const service of deployableServices) {
            if (!service.deploymentName) {
                continue; // Skip services without deployments (like migrations)
            }
            await rolloutRestart({
                deploymentName: service.deploymentName,
                env,
                dryRun: options.dryRun
            });
        }
    }

    // Wait for rollouts
    if (!options.noWait) {
        printSection("Waiting for Rollouts");

        // Wait for service deployments
        for (const service of deployableServices) {
            if (!service.deploymentName) {
                continue;
            }
            await waitForRollout({
                deploymentName: service.deploymentName,
                env,
                timeout: parseInt(String(options.timeout), 10),
                dryRun: options.dryRun
            });
        }

        // Also wait for additional deployments like temporal-server
        for (const deploymentName of ADDITIONAL_DEPLOYMENTS) {
            await waitForRolloutStatus(
                deploymentName,
                env,
                parseInt(String(options.timeout), 10),
                options.dryRun
            );
        }
    }

    // Show deployment status
    if (!options.dryRun) {
        printSection("Deployment Status");

        const pods = await getPods(env);
        const relevantPods = pods.filter((pod) =>
            deployableServices.some((s) => s.deploymentName && pod.name.includes(s.deploymentName))
        );

        const columns: TableColumn[] = [
            { key: "name", header: "Pod", width: 50 },
            { key: "ready", header: "Ready", width: 10 },
            { key: "status", header: "Status", width: 12 },
            { key: "restarts", header: "Restarts", width: 10 }
        ];

        outputTable(relevantPods, columns);
    }

    console.log();
    printSuccess("Deployment complete!");

    // Print deployment summary
    printSection("Deployment Summary");
    printInfo(`Environment: ${env.name}`);
    printInfo(`Image Tag: ${tag}`);
    printInfo(`Namespace: ${env.namespace}`);
    console.log();
    printInfo("Images deployed:");
    for (const service of services) {
        console.log(`  - ${service.imageName}: ${env.registry}/${service.imageName}:${tag}`);
    }
}

function resolveBuildArgs(service: ServiceConfig, env: { domain: string }): Record<string, string> {
    const buildArgs: Record<string, string> = {};

    if (!service.buildArgs) {
        return buildArgs;
    }

    for (const arg of service.buildArgs) {
        let value: string;

        switch (arg.source) {
            case "env":
                value = process.env[arg.key] || arg.defaultValue || "";
                break;
            case "static":
                // Compute from domain
                if (arg.key === "api_url") {
                    value = `https://api.${env.domain}`;
                } else if (arg.key === "ws_url") {
                    value = `https://api.${env.domain}`;
                } else if (arg.key === "app_url") {
                    value = `https://app.${env.domain}`;
                } else if (arg.key === "docs_url") {
                    value = `https://docs.${env.domain}`;
                } else {
                    value = arg.defaultValue || "";
                }
                break;
            case "pulumi":
                // For now, use default value. Could read from Pulumi stack.
                value = arg.defaultValue || "";
                break;
            default:
                value = arg.defaultValue || "";
        }

        buildArgs[arg.name] = value;
    }

    return buildArgs;
}
