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
    validateContext
} from "../services/kubernetes";
import { isCI, getGitSha as getCISha } from "../utils/ci";
import {
    printSuccess,
    printError,
    printInfo,
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
}

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

    // Print deployment plan
    printSection("Deployment Plan");
    printInfo(`Environment: ${chalk.cyan(env.name)} (${env.gcpProject})`);
    printInfo(`Services: ${services.map((s) => chalk.cyan(s.displayName)).join(", ")}`);
    printInfo(`Image tag: ${chalk.cyan(tag)}`);
    printInfo(`Skip build: ${options.skipBuild ? chalk.yellow("yes") : "no"}`);
    printInfo(`Wait for rollout: ${options.noWait ? chalk.yellow("no") : "yes"}`);

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
    } else {
        printDryRunAction("Check gcloud, kubectl, docker");
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

    // Build and push images
    if (!options.skipBuild) {
        printSection("Building Images");

        // Configure Docker auth
        await configureDockerAuth(env.gcpRegion, options.dryRun);

        // Track which images we've already built (for shared images like api/worker)
        const builtImages = new Set<string>();

        for (const service of services) {
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
                repoRoot: getRepoPath()
            });

            builtImages.add(service.imageName);
        }
    }

    // Restart deployments
    printSection("Restarting Deployments");

    for (const service of services) {
        await rolloutRestart({
            deploymentName: service.deploymentName,
            env,
            dryRun: options.dryRun
        });
    }

    // Wait for rollouts
    if (!options.noWait) {
        printSection("Waiting for Rollouts");

        for (const service of services) {
            await waitForRollout({
                deploymentName: service.deploymentName,
                env,
                timeout: parseInt(String(options.timeout), 10),
                dryRun: options.dryRun
            });
        }
    }

    // Show deployment status
    if (!options.dryRun) {
        printSection("Deployment Status");

        const pods = await getPods(env);
        const relevantPods = pods.filter((pod) =>
            services.some((s) => pod.name.includes(s.deploymentName))
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
