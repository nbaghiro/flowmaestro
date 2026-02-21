import { printDryRunAction } from "../utils/safety";
import { withSpinner } from "../utils/spinner";
import { execOrFail, exec, commandExists } from "./exec";
import type { EnvironmentConfig } from "../config/environments";
import type { ServiceConfig } from "../config/services";

export interface DockerBuildOptions {
    service: ServiceConfig;
    env: EnvironmentConfig;
    tag: string;
    buildArgs?: Record<string, string>;
    dryRun?: boolean;
    repoRoot: string;
}

export interface DockerPushOptions {
    imageName: string;
    registry: string;
    tag: string;
    dryRun?: boolean;
}

/**
 * Check if Docker is available and running
 */
export async function checkDocker(): Promise<void> {
    if (!commandExists("docker")) {
        throw new Error("Docker is not installed. Please install Docker and try again.");
    }

    const result = await exec("docker", ["info"]);
    if (result.exitCode !== 0) {
        throw new Error("Docker daemon is not running. Please start Docker and try again.");
    }
}

/**
 * Configure Docker authentication for GCP Artifact Registry
 */
export async function configureDockerAuth(region: string, dryRun = false): Promise<void> {
    const registry = `${region}-docker.pkg.dev`;

    if (dryRun) {
        printDryRunAction(`gcloud auth configure-docker ${registry}`);
        return;
    }

    await withSpinner(
        "Configuring Docker authentication...",
        async () => {
            await execOrFail("gcloud", ["auth", "configure-docker", registry, "--quiet"]);
        },
        { successText: "Docker authentication configured" }
    );
}

/**
 * Build a Docker image
 */
export async function buildImage(options: DockerBuildOptions): Promise<string> {
    const { service, env, tag, buildArgs, dryRun, repoRoot } = options;
    const fullImageName = `${env.registry}/${service.imageName}:${tag}`;

    const args = [
        "build",
        "--platform",
        "linux/amd64",
        "-f",
        service.dockerFile,
        "-t",
        fullImageName
    ];

    // Add build args
    if (buildArgs) {
        for (const [key, value] of Object.entries(buildArgs)) {
            args.push("--build-arg", `${key}=${value}`);
        }
    }

    // Add context (repo root)
    args.push(".");

    if (dryRun) {
        printDryRunAction(`docker ${args.join(" ")}`);
        return fullImageName;
    }

    await withSpinner(
        `Building ${service.displayName} image...`,
        async () => {
            await execOrFail("docker", args, { cwd: repoRoot, stream: true });
        },
        { successText: `${service.displayName} image built: ${fullImageName}` }
    );

    return fullImageName;
}

/**
 * Push a Docker image to registry
 */
export async function pushImage(options: DockerPushOptions): Promise<void> {
    const { imageName, registry, tag, dryRun } = options;
    const fullImageName = `${registry}/${imageName}:${tag}`;

    if (dryRun) {
        printDryRunAction(`docker push ${fullImageName}`);
        return;
    }

    await withSpinner(
        `Pushing ${imageName} image...`,
        async () => {
            await execOrFail("docker", ["push", fullImageName]);
        },
        { successText: `${imageName} image pushed` }
    );
}

/**
 * Build and push a Docker image
 */
export async function buildAndPush(options: DockerBuildOptions): Promise<string> {
    const imageName = await buildImage(options);

    if (!options.dryRun) {
        await pushImage({
            imageName: options.service.imageName,
            registry: options.env.registry,
            tag: options.tag,
            dryRun: options.dryRun
        });
    } else {
        printDryRunAction(`docker push ${imageName}`);
    }

    return imageName;
}

/**
 * Get image digest for verification
 */
export async function getImageDigest(fullImageName: string): Promise<string | null> {
    const result = await exec("docker", [
        "inspect",
        "--format={{index .RepoDigests 0}}",
        fullImageName
    ]);

    if (result.exitCode !== 0) {
        return null;
    }

    return result.stdout || null;
}
