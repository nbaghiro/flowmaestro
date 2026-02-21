import chalk from "chalk";
import { Command } from "commander";
import { getEnvironment, SERVICES, isValidService } from "../config";
import { checkGcloud, verifyEnvironment } from "../services/gcloud";
import {
    checkKubectl,
    getLogs,
    validateContext,
    getClusterCredentials
} from "../services/kubernetes";
import { isCI } from "../utils/ci";
import { printError, printInfo, printSection } from "../utils/output";

interface LogsOptions {
    env: string;
    follow: boolean;
    tail: number;
    container?: string;
}

export function registerLogsCommand(program: Command): void {
    program
        .command("logs <service>")
        .description("View service logs")
        .option("-e, --env <env>", "Environment: prod, staging, dev", "prod")
        .option("-f, --follow", "Follow log output", false)
        .option("--tail <lines>", "Number of lines to show", "100")
        .option("-c, --container <name>", "Container name (if multiple)")
        .addHelpText(
            "after",
            `
Services:
  ${Object.keys(SERVICES).join(", ")}

Examples:
  $ fmctl logs api
  $ fmctl logs worker --follow
  $ fmctl logs frontend --tail 200
`
        )
        .action(async (service: string, opts: LogsOptions) => {
            try {
                await runLogs(service, opts);
            } catch (error) {
                printError(error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });
}

async function runLogs(serviceName: string, options: LogsOptions): Promise<void> {
    // Validate service
    if (!isValidService(serviceName)) {
        printError(`Unknown service: ${serviceName}`);
        printInfo(`Valid services: ${Object.keys(SERVICES).join(", ")}`);
        process.exit(1);
    }

    const service = SERVICES[serviceName];
    const envConfig = getEnvironment(options.env);

    printSection("Logs");
    printInfo(`Service: ${chalk.cyan(service.displayName)}`);
    printInfo(`Deployment: ${chalk.cyan(service.deploymentName)}`);
    printInfo(`Environment: ${chalk.cyan(envConfig.name)}`);

    if (options.follow) {
        printInfo("Following logs... (Ctrl+C to exit)");
    }

    console.log();

    // Check prerequisites
    checkGcloud();
    checkKubectl();

    await verifyEnvironment(envConfig);

    if (!isCI()) {
        await getClusterCredentials(envConfig);
    }

    await validateContext(envConfig);

    // Stream logs
    await getLogs(service.deploymentName, envConfig, {
        follow: options.follow,
        tail: parseInt(String(options.tail), 10),
        container: options.container
    });
}
