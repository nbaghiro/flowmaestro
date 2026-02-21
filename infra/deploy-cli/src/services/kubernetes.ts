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

/**
 * Verify all External Secrets are synced and ready
 */
export async function verifyExternalSecrets(env: EnvironmentConfig, dryRun = false): Promise<void> {
    if (dryRun) {
        printDryRunAction("Verify External Secrets are synced");
        return;
    }

    await withSpinner(
        "Verifying External Secrets...",
        async () => {
            // Get all ExternalSecrets
            const result = await execOrFail("kubectl", [
                "get",
                "externalsecret",
                "-n",
                env.namespace,
                "-o",
                "json"
            ]);

            const data = JSON.parse(result.stdout);
            const items = data.items || [];

            if (items.length === 0) {
                throw new Error("No ExternalSecrets found in namespace");
            }

            // Check each ExternalSecret is ready
            for (const es of items) {
                const name = es.metadata?.name;
                const conditions = es.status?.conditions || [];
                const readyCondition = conditions.find((c: { type: string }) => c.type === "Ready");

                if (!readyCondition || readyCondition.status !== "True") {
                    throw new Error(
                        `ExternalSecret ${name} is not ready. Run: kubectl get externalsecret ${name} -n ${env.namespace} -o yaml`
                    );
                }
            }

            // Verify required K8s secrets exist
            // app-secrets is the main combined secret, others are category-specific
            const requiredSecrets = ["app-secrets"];
            for (const secret of requiredSecrets) {
                const checkResult = await exec("kubectl", [
                    "get",
                    "secret",
                    secret,
                    "-n",
                    env.namespace
                ]);

                if (checkResult.exitCode !== 0) {
                    throw new Error(`Required secret ${secret} is missing`);
                }
            }
        },
        { successText: "All External Secrets verified" }
    );
}

export interface JobOptions {
    env: EnvironmentConfig;
    imageTag: string;
    repoRoot: string;
    dryRun?: boolean;
    timeout?: number; // in seconds
}

/**
 * Run a Kubernetes job (e.g., migrations, seeding)
 */
export async function runJob(jobType: "migration" | "seed", options: JobOptions): Promise<void> {
    const { env, imageTag, repoRoot, dryRun = false, timeout = 300 } = options;

    const jobFile =
        jobType === "migration"
            ? "infra/k8s/jobs/db-migration.yaml"
            : "infra/k8s/jobs/db-seed.yaml";
    const jobLabel = jobType === "migration" ? "db-migration" : "db-seed";
    const displayName = jobType === "migration" ? "Database Migration" : "Database Seeding";

    if (dryRun) {
        printDryRunAction(`Run ${displayName} job with image tag ${imageTag}`);
        return;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const jobName = `${jobLabel}-${timestamp}`;

    await withSpinner(
        `Running ${displayName}...`,
        async () => {
            // Delete existing jobs of this type
            await exec("kubectl", [
                "delete",
                "job",
                "-n",
                env.namespace,
                "-l",
                `component=${jobLabel}`,
                "--ignore-not-found"
            ]);

            // Read job template and replace placeholders
            const fs = await import("fs/promises");
            const path = await import("path");
            const jobPath = path.join(repoRoot, jobFile);
            let jobYaml = await fs.readFile(jobPath, "utf-8");

            jobYaml = jobYaml
                .replace(/\$\{TIMESTAMP\}/g, String(timestamp))
                .replace(/\$\{IMAGE_TAG\}/g, imageTag);

            // Apply the job
            await execOrFail("kubectl", ["apply", "-f", "-", "-n", env.namespace], {
                input: jobYaml
            });

            // Wait for job to complete
            await execOrFail("kubectl", [
                "wait",
                "--for=condition=complete",
                `job/${jobName}`,
                "-n",
                env.namespace,
                `--timeout=${timeout}s`
            ]);

            // Get job logs
            const logsResult = await exec("kubectl", [
                "logs",
                `job/${jobName}`,
                "-n",
                env.namespace
            ]);

            if (logsResult.stdout) {
                console.log(`\n${displayName} logs:\n${logsResult.stdout}`);
            }
        },
        { successText: `${displayName} completed successfully` }
    );
}

/**
 * Check if kustomize is available
 */
export function checkKustomize(): boolean {
    return commandExists("kustomize");
}

/**
 * Install kustomize if not present
 */
export async function installKustomize(): Promise<void> {
    if (checkKustomize()) {
        return;
    }

    await withSpinner(
        "Installing kustomize...",
        async () => {
            // Download and install kustomize
            await execOrFail("bash", [
                "-c",
                'curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash && sudo mv kustomize /usr/local/bin/'
            ]);
        },
        { successText: "kustomize installed" }
    );
}

export interface KustomizeOptions {
    env: EnvironmentConfig;
    overlayPath: string;
    registry: string;
    imageTag: string;
    repoRoot: string;
    dryRun?: boolean;
}

/**
 * Apply Kubernetes manifests using Kustomize
 */
export async function applyKustomize(options: KustomizeOptions): Promise<void> {
    const { env, overlayPath, registry, imageTag, repoRoot, dryRun = false } = options;
    const path = await import("path");
    const fullOverlayPath = path.join(repoRoot, overlayPath);

    if (dryRun) {
        printDryRunAction(`Apply Kustomize overlay at ${overlayPath} with image tag ${imageTag}`);
        return;
    }

    await withSpinner(
        "Applying Kustomize overlay...",
        async () => {
            // Update image tags in kustomization
            await execOrFail(
                "kustomize",
                [
                    "edit",
                    "set",
                    "image",
                    `${registry}/backend:latest=${registry}/backend:${imageTag}`,
                    `${registry}/frontend:latest=${registry}/frontend:${imageTag}`,
                    `${registry}/marketing:latest=${registry}/marketing:${imageTag}`,
                    `${registry}/documentation:latest=${registry}/documentation:${imageTag}`,
                    `${registry}/static:latest=${registry}/static:${imageTag}`,
                    `${registry}/status:latest=${registry}/status:${imageTag}`
                ],
                { cwd: fullOverlayPath }
            );

            // Apply the overlay
            await execOrFail("kubectl", ["apply", "-k", fullOverlayPath, "-n", env.namespace]);
        },
        { successText: "Kustomize overlay applied" }
    );
}

/**
 * Wait for rollout status of a deployment
 */
export async function waitForRolloutStatus(
    deploymentName: string,
    env: EnvironmentConfig,
    timeout = 10,
    dryRun = false
): Promise<void> {
    if (dryRun) {
        printDryRunAction(
            `kubectl rollout status deployment/${deploymentName} -n ${env.namespace} --timeout=${timeout}m`
        );
        return;
    }

    await withSpinner(
        `Waiting for ${deploymentName}...`,
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
        { successText: `${deploymentName} is ready` }
    );
}
