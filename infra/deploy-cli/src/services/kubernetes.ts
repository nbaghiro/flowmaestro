import { printDryRunAction } from "../utils/safety";
import { withSpinner } from "../utils/spinner";
import { execOrFail, exec, commandExists } from "./exec";
import type { EnvironmentConfig } from "../config/environments";

export interface KubernetesOptions {
    env: EnvironmentConfig;
    dryRun?: boolean;
}

export interface RolloutOptions extends KubernetesOptions {
    deploymentName: string;
    timeout?: number; // in minutes
}

export interface PodInfo {
    name: string;
    ready: string;
    status: string;
    restarts: number;
    age: string;
}

/**
 * Check if kubectl is available
 */
export function checkKubectl(): void {
    if (!commandExists("kubectl")) {
        throw new Error("kubectl is not installed. Please install kubectl and try again.");
    }
}

/**
 * Get current kubectl context
 */
export async function getCurrentContext(): Promise<string> {
    const result = await execOrFail("kubectl", ["config", "current-context"]);
    return result.stdout;
}

/**
 * Validate that kubectl is pointing to the expected cluster
 */
export async function validateContext(env: EnvironmentConfig): Promise<void> {
    const context = await getCurrentContext();

    // Context name typically includes cluster name
    if (!context.includes(env.clusterName) && !context.includes(env.gcpProject)) {
        throw new Error(
            `kubectl context "${context}" does not match expected cluster "${env.clusterName}".\n` +
                `Please run: gcloud container clusters get-credentials ${env.clusterName} --region=${env.gcpRegion} --project=${env.gcpProject}`
        );
    }
}

/**
 * Get GKE credentials for a cluster
 */
export async function getClusterCredentials(env: EnvironmentConfig, dryRun = false): Promise<void> {
    const args = [
        "container",
        "clusters",
        "get-credentials",
        env.clusterName,
        `--region=${env.gcpRegion}`,
        `--project=${env.gcpProject}`
    ];

    if (dryRun) {
        printDryRunAction(`gcloud ${args.join(" ")}`);
        return;
    }

    await withSpinner(
        "Getting cluster credentials...",
        async () => {
            await execOrFail("gcloud", args);
        },
        { successText: "Cluster credentials configured" }
    );
}

/**
 * Restart a deployment (rolling update)
 */
export async function rolloutRestart(options: RolloutOptions): Promise<void> {
    const { deploymentName, env, dryRun } = options;

    if (dryRun) {
        printDryRunAction(
            `kubectl rollout restart deployment/${deploymentName} -n ${env.namespace}`
        );
        return;
    }

    await withSpinner(
        `Restarting ${deploymentName}...`,
        async () => {
            await execOrFail("kubectl", [
                "rollout",
                "restart",
                `deployment/${deploymentName}`,
                "-n",
                env.namespace
            ]);
        },
        { successText: `${deploymentName} restart initiated` }
    );
}

/**
 * Wait for a rollout to complete
 */
export async function waitForRollout(options: RolloutOptions): Promise<void> {
    const { deploymentName, env, timeout = 5, dryRun } = options;

    if (dryRun) {
        printDryRunAction(
            `kubectl rollout status deployment/${deploymentName} -n ${env.namespace} --timeout=${timeout}m`
        );
        return;
    }

    await withSpinner(
        `Waiting for ${deploymentName} rollout...`,
        async () => {
            await execOrFail("kubectl", [
                "rollout",
                "status",
                `deployment/${deploymentName}`,
                "-n",
                env.namespace,
                `--timeout=${timeout}m`
            ]);
        },
        { successText: `${deploymentName} rolled out successfully` }
    );
}

/**
 * Get pods for a deployment
 */
export async function getPods(env: EnvironmentConfig, labelSelector?: string): Promise<PodInfo[]> {
    const args = ["get", "pods", "-n", env.namespace, "-o", "json"];

    if (labelSelector) {
        args.push("-l", labelSelector);
    }

    const result = await execOrFail("kubectl", args);
    const data = JSON.parse(result.stdout);

    return data.items.map(
        (pod: {
            metadata: { name: string };
            status: {
                phase: string;
                containerStatuses?: Array<{ ready: boolean; restartCount: number }>;
            };
        }) => {
            const containerStatuses = pod.status.containerStatuses || [];
            const ready = containerStatuses.filter((c: { ready: boolean }) => c.ready).length;
            const total = containerStatuses.length;

            return {
                name: pod.metadata.name,
                ready: `${ready}/${total}`,
                status: pod.status.phase,
                restarts: containerStatuses.reduce(
                    (sum: number, c: { restartCount: number }) => sum + c.restartCount,
                    0
                ),
                age: "N/A" // Would need to calculate from creationTimestamp
            };
        }
    );
}

/**
 * Get deployment status
 */
export async function getDeploymentStatus(
    deploymentName: string,
    env: EnvironmentConfig
): Promise<{
    replicas: number;
    readyReplicas: number;
    updatedReplicas: number;
    availableReplicas: number;
}> {
    const result = await execOrFail("kubectl", [
        "get",
        `deployment/${deploymentName}`,
        "-n",
        env.namespace,
        "-o",
        "json"
    ]);

    const data = JSON.parse(result.stdout);
    const status = data.status || {};

    return {
        replicas: status.replicas || 0,
        readyReplicas: status.readyReplicas || 0,
        updatedReplicas: status.updatedReplicas || 0,
        availableReplicas: status.availableReplicas || 0
    };
}

/**
 * Get logs for a deployment
 */
export async function getLogs(
    deploymentName: string,
    env: EnvironmentConfig,
    options: { follow?: boolean; tail?: number; container?: string } = {}
): Promise<void> {
    const args = ["logs", `deployment/${deploymentName}`, "-n", env.namespace];

    if (options.follow) {
        args.push("-f");
    }

    if (options.tail) {
        args.push("--tail", String(options.tail));
    }

    if (options.container) {
        args.push("-c", options.container);
    }

    // Stream logs directly to stdout
    await exec("kubectl", args, { stream: true });
}

/**
 * Rollback a deployment to previous revision
 */
export async function rollbackDeployment(
    deploymentName: string,
    env: EnvironmentConfig,
    revision?: number,
    dryRun = false
): Promise<void> {
    const args = ["rollout", "undo", `deployment/${deploymentName}`, "-n", env.namespace];

    if (revision !== undefined) {
        args.push(`--to-revision=${revision}`);
    }

    if (dryRun) {
        printDryRunAction(`kubectl ${args.join(" ")}`);
        return;
    }

    await withSpinner(
        `Rolling back ${deploymentName}...`,
        async () => {
            await execOrFail("kubectl", args);
        },
        { successText: `${deploymentName} rollback initiated` }
    );
}

/**
 * Get rollout history for a deployment
 */
export async function getRolloutHistory(
    deploymentName: string,
    env: EnvironmentConfig
): Promise<string> {
    const result = await execOrFail("kubectl", [
        "rollout",
        "history",
        `deployment/${deploymentName}`,
        "-n",
        env.namespace
    ]);

    return result.stdout;
}

/**
 * Apply a Kubernetes manifest
 */
export async function applyManifest(
    manifestPath: string,
    env: EnvironmentConfig,
    dryRun = false
): Promise<void> {
    const args = ["apply", "-f", manifestPath, "-n", env.namespace];

    if (dryRun) {
        args.push("--dry-run=client");
    }

    await execOrFail("kubectl", args);
}

/**
 * Delete a Kubernetes resource
 */
export async function deleteResource(
    resourceType: string,
    name: string,
    env: EnvironmentConfig,
    options: { ignoreNotFound?: boolean } = {}
): Promise<void> {
    const args = ["delete", resourceType, name, "-n", env.namespace];

    if (options.ignoreNotFound) {
        args.push("--ignore-not-found");
    }

    await execOrFail("kubectl", args);
}
