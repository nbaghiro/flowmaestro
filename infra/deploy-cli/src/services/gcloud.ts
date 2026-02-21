import { withSpinner } from "../utils/spinner";
import { execOrFail, exec, commandExists } from "./exec";
import type { EnvironmentConfig } from "../config/environments";

/**
 * Check if gcloud is available
 */
export function checkGcloud(): void {
    if (!commandExists("gcloud")) {
        throw new Error(
            "gcloud CLI is not installed. Please install the Google Cloud SDK and try again.\n" +
                "Visit: https://cloud.google.com/sdk/docs/install"
        );
    }
}

/**
 * Get current gcloud project
 */
export async function getCurrentProject(): Promise<string | null> {
    const result = await exec("gcloud", ["config", "get-value", "project"]);
    if (result.exitCode !== 0 || !result.stdout) {
        return null;
    }
    return result.stdout;
}

/**
 * Set gcloud project
 */
export async function setProject(project: string): Promise<void> {
    await withSpinner(
        `Setting GCP project to ${project}...`,
        async () => {
            await execOrFail("gcloud", ["config", "set", "project", project]);
        },
        { successText: `GCP project set to ${project}` }
    );
}

/**
 * Get current authenticated account
 */
export async function getCurrentAccount(): Promise<string | null> {
    const result = await exec("gcloud", [
        "auth",
        "list",
        "--filter=status:ACTIVE",
        "--format=value(account)"
    ]);
    if (result.exitCode !== 0 || !result.stdout) {
        return null;
    }
    return result.stdout;
}

/**
 * Check if user is authenticated with gcloud
 */
export async function isAuthenticated(): Promise<boolean> {
    const account = await getCurrentAccount();
    return account !== null;
}

/**
 * Verify environment configuration
 */
export async function verifyEnvironment(env: EnvironmentConfig): Promise<void> {
    // Check authentication
    const account = await getCurrentAccount();
    if (!account) {
        throw new Error("Not authenticated with gcloud. Please run: gcloud auth login");
    }

    // Set project
    const currentProject = await getCurrentProject();
    if (currentProject !== env.gcpProject) {
        await setProject(env.gcpProject);
    }
}

/**
 * Get all secrets from Secret Manager
 */
export async function listSecrets(project: string): Promise<string[]> {
    const result = await execOrFail("gcloud", [
        "secrets",
        "list",
        "--project",
        project,
        "--format=value(name)"
    ]);

    return result.stdout.split("\n").filter(Boolean);
}

/**
 * Get secret value from Secret Manager
 */
export async function getSecretValue(secretName: string, project: string): Promise<string> {
    const result = await execOrFail("gcloud", [
        "secrets",
        "versions",
        "access",
        "latest",
        "--secret",
        secretName,
        "--project",
        project
    ]);

    return result.stdout;
}

/**
 * Set secret value in Secret Manager
 */
export async function setSecretValue(
    secretName: string,
    value: string,
    project: string
): Promise<void> {
    // Create secret if it doesn't exist
    const existingSecrets = await listSecrets(project);
    if (!existingSecrets.includes(secretName)) {
        await execOrFail("gcloud", [
            "secrets",
            "create",
            secretName,
            "--project",
            project,
            "--replication-policy=automatic"
        ]);
    }

    // Add new version using pipe to stdin
    await execOrFail("bash", [
        "-c",
        `echo -n "${value}" | gcloud secrets versions add ${secretName} --project ${project} --data-file=-`
    ]);
}

/**
 * Check if a secret exists
 */
export async function secretExists(secretName: string, project: string): Promise<boolean> {
    const result = await exec("gcloud", ["secrets", "describe", secretName, "--project", project]);

    return result.exitCode === 0;
}
