import chalk from "chalk";
import { Command } from "commander";
import { getEnvironment, SERVICES } from "../config";
import { checkGcloud, verifyEnvironment } from "../services/gcloud";
import {
    checkKubectl,
    getPods,
    getDeploymentStatus,
    validateContext,
    getClusterCredentials
} from "../services/kubernetes";
import { isCI } from "../utils/ci";
import {
    printError,
    printInfo,
    printSection,
    outputTable,
    formatStatus,
    type TableColumn
} from "../utils/output";
import { withSpinner } from "../utils/spinner";

interface StatusOptions {
    env: string;
    watch: boolean;
}

export function registerStatusCommand(program: Command): void {
    program
        .command("status")
        .description("Show deployment status")
        .option("-e, --env <env>", "Environment: prod, staging, dev", "prod")
        .option("-w, --watch", "Watch for changes", false)
        .action(async (opts: StatusOptions) => {
            try {
                await runStatus(opts);
            } catch (error) {
                printError(error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });
}

async function runStatus(options: StatusOptions): Promise<void> {
    const envConfig = getEnvironment(options.env);

    printSection("Deployment Status");
    printInfo(`Environment: ${chalk.cyan(envConfig.name)}`);
    printInfo(`Cluster: ${chalk.cyan(envConfig.clusterName)}`);
    printInfo(`Namespace: ${chalk.cyan(envConfig.namespace)}`);

    // Check prerequisites
    checkGcloud();
    checkKubectl();

    await verifyEnvironment(envConfig);

    if (!isCI()) {
        await getClusterCredentials(envConfig);
    }

    await validateContext(envConfig);

    // Get deployment status
    const deploymentData: Array<{
        service: string;
        deployment: string;
        replicas: string;
        status: string;
    }> = [];

    for (const [_name, service] of Object.entries(SERVICES)) {
        try {
            const status = await getDeploymentStatus(service.deploymentName, envConfig);

            const ready = status.readyReplicas || 0;
            const total = status.replicas || 0;
            const isHealthy = ready === total && total > 0;

            deploymentData.push({
                service: service.displayName,
                deployment: service.deploymentName,
                replicas: `${ready}/${total}`,
                status: isHealthy ? "Running" : ready === 0 ? "Failed" : "Degraded"
            });
        } catch {
            deploymentData.push({
                service: service.displayName,
                deployment: service.deploymentName,
                replicas: "?/?",
                status: "Unknown"
            });
        }
    }

    console.log();
    printSection("Deployments");

    const deploymentColumns: TableColumn[] = [
        { key: "service", header: "Service", width: 20 },
        { key: "deployment", header: "Deployment", width: 25 },
        { key: "replicas", header: "Replicas", width: 12 },
        { key: "status", header: "Status", width: 12, formatter: (v) => formatStatus(String(v)) }
    ];

    outputTable(deploymentData, deploymentColumns);

    // Get pods
    const pods = await withSpinner("Fetching pods...", async () => {
        return getPods(envConfig);
    });

    console.log();
    printSection("Pods");

    const podColumns: TableColumn[] = [
        { key: "name", header: "Pod", width: 55 },
        { key: "ready", header: "Ready", width: 10 },
        { key: "status", header: "Status", width: 12, formatter: (v) => formatStatus(String(v)) },
        { key: "restarts", header: "Restarts", width: 10 }
    ];

    outputTable(pods, podColumns);

    if (options.watch) {
        printInfo("\nWatching for changes... (Ctrl+C to exit)");
        // For watch mode, we'd use kubectl get pods -w
        // For simplicity, just refresh every 5 seconds
        setInterval(async () => {
            console.clear();
            await runStatus({ ...options, watch: false });
        }, 5000);
    }
}
