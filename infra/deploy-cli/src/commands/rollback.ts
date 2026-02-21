import chalk from "chalk";
import { Command } from "commander";
import { getEnvironment, SERVICES, isValidService } from "../config";
import { checkGcloud, verifyEnvironment } from "../services/gcloud";
import {
    checkKubectl,
    rollbackDeployment,
    waitForRollout,
    getRolloutHistory,
    validateContext,
    getClusterCredentials
} from "../services/kubernetes";
import { isCI } from "../utils/ci";
import { printSuccess, printError, printInfo, printSection } from "../utils/output";
import { confirmProduction, printDryRunNotice, printDryRunAction } from "../utils/safety";

interface RollbackOptions {
    env: string;
    revision?: number;
    yes: boolean;
    dryRun: boolean;
}

export function registerRollbackCommand(program: Command): void {
    program
        .command("rollback <service>")
        .description("Rollback a deployment to previous revision")
        .option("-e, --env <env>", "Environment: prod, staging, dev", "prod")
        .option("-r, --revision <number>", "Specific revision to rollback to")
        .option("-y, --yes", "Skip confirmation prompts", false)
        .option("--dry-run", "Show what would happen without making changes", false)
        .addHelpText(
            "after",
            `
Services:
  ${Object.keys(SERVICES).join(", ")}

Examples:
  $ fmctl rollback api
  $ fmctl rollback frontend --revision 3
  $ fmctl rollback worker --env staging
`
        )
        .action(async (service: string, opts: RollbackOptions) => {
            try {
                await runRollback(service, opts);
            } catch (error) {
                printError(error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });
}

async function runRollback(serviceName: string, options: RollbackOptions): Promise<void> {
    // Validate service
    if (!isValidService(serviceName)) {
        printError(`Unknown service: ${serviceName}`);
        printInfo(`Valid services: ${Object.keys(SERVICES).join(", ")}`);
        process.exit(1);
    }

    const service = SERVICES[serviceName];
    const envConfig = getEnvironment(options.env);

    printSection("Rollback");
    printInfo(`Service: ${chalk.cyan(service.displayName)}`);
    printInfo(`Deployment: ${chalk.cyan(service.deploymentName)}`);
    printInfo(`Environment: ${chalk.cyan(envConfig.name)}`);

    if (options.revision !== undefined) {
        printInfo(`Target revision: ${chalk.cyan(options.revision)}`);
    } else {
        printInfo(`Target: ${chalk.cyan("previous revision")}`);
    }

    if (options.dryRun) {
        printDryRunNotice();
    }

    // Check prerequisites
    checkGcloud();
    checkKubectl();

    await verifyEnvironment(envConfig);

    if (!isCI()) {
        await getClusterCredentials(envConfig);
    }

    await validateContext(envConfig);

    // Show rollout history
    printSection("Rollout History");
    const history = await getRolloutHistory(service.deploymentName, envConfig);
    console.log(history);

    // Confirm rollback
    const confirmed = await confirmProduction(`rollback ${service.displayName}`, {
        yes: options.yes,
        env: options.env
    });

    if (!confirmed) {
        printInfo("Rollback cancelled");
        return;
    }

    // Perform rollback
    if (options.dryRun) {
        printDryRunAction(
            `kubectl rollout undo deployment/${service.deploymentName}` +
                (options.revision !== undefined ? ` --to-revision=${options.revision}` : "")
        );
        return;
    }

    await rollbackDeployment(service.deploymentName, envConfig, options.revision, options.dryRun);

    // Wait for rollout
    await waitForRollout({
        deploymentName: service.deploymentName,
        env: envConfig,
        timeout: 5,
        dryRun: options.dryRun
    });

    printSuccess(`${service.displayName} rolled back successfully!`);
}
