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
    useCache?: boolean; // Enable registry caching
    pushLatest?: boolean; // Also tag and push as :latest
}

export interface DockerPushOptions {
    imageName: string;
    registry: string;
    tag: string;
    dryRun?: boolean;
    pushLatest?: boolean; // Also push :latest tag
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
 * Check if Docker Buildx is available
 */
export async function hasBuildx(): Promise<boolean> {
    const result = await exec("docker", ["buildx", "version"]);
    return result.exitCode === 0;
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
 * Uses buildx with registry caching when available for faster CI builds
 */
export async function buildImage(options: DockerBuildOptions): Promise<string> {
    const { service, env, tag, buildArgs, dryRun, repoRoot, useCache = true } = options;
    const fullImageName = `${env.registry}/${service.imageName}:${tag}`;
    const latestImageName = `${env.registry}/${service.imageName}:latest`;

    // Check if buildx is available for advanced caching
    const buildxAvailable = await hasBuildx();

    // Use buildx build for better caching support
    const args = buildxAvailable
        ? ["buildx", "build", "--push"] // buildx can build and push in one step
        : ["build"];

    args.push(
        "--platform",
        "linux/amd64",
        "-f",
        service.dockerFile,
        "-t",
        fullImageName,
        "-t",
        latestImageName // Also tag as latest
    );

    // Add cache configuration for faster builds (buildx only)
    if (useCache && buildxAvailable) {
        args.push(
            "--cache-from",
            `type=registry,ref=${latestImageName}`,
            "--cache-to",
            "type=inline"
        );
    }

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
    const { imageName, registry, tag, dryRun, pushLatest = true } = options;
    const fullImageName = `${registry}/${imageName}:${tag}`;
    const latestImageName = `${registry}/${imageName}:latest`;

    if (dryRun) {
        printDryRunAction(`docker push ${fullImageName}`);
        if (pushLatest) {
            printDryRunAction(`docker push ${latestImageName}`);
        }
        return;
    }

    await withSpinner(
        `Pushing ${imageName} image...`,
        async () => {
            await execOrFail("docker", ["push", fullImageName]);
            if (pushLatest) {
                await execOrFail("docker", ["push", latestImageName]);
            }
        },
        { successText: `${imageName} image pushed (${tag}${pushLatest ? " + latest" : ""})` }
    );
}

/**
 * Build and push a Docker image
 * When buildx is available, build and push happen in one step
 * Otherwise, build and push are separate steps
 */
export async function buildAndPush(options: DockerBuildOptions): Promise<string> {
    const buildxAvailable = await hasBuildx();

    // buildImage with buildx already pushes, so we only need to push separately
    // when buildx is not available
    const imageName = await buildImage(options);

    if (!buildxAvailable) {
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
