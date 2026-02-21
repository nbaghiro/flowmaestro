export interface EnvironmentConfig {
    name: string;
    gcpProject: string;
    gcpRegion: string;
    clusterName: string;
    namespace: string;
    registry: string;
    domain: string;
}

export const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
    prod: {
        name: "production",
        gcpProject: "flowmaestro-prod",
        gcpRegion: "us-central1",
        clusterName: "flowmaestro-cluster",
        namespace: "flowmaestro",
        registry: "us-central1-docker.pkg.dev/flowmaestro-prod/flowmaestro",
        domain: "flowmaestro.ai"
    },
    staging: {
        name: "staging",
        gcpProject: "flowmaestro-staging",
        gcpRegion: "us-central1",
        clusterName: "flowmaestro-staging-cluster",
        namespace: "flowmaestro",
        registry: "us-central1-docker.pkg.dev/flowmaestro-staging/flowmaestro",
        domain: "staging.flowmaestro.ai"
    },
    dev: {
        name: "development",
        gcpProject: "flowmaestro-dev",
        gcpRegion: "us-central1",
        clusterName: "flowmaestro-dev-cluster",
        namespace: "flowmaestro",
        registry: "us-central1-docker.pkg.dev/flowmaestro-dev/flowmaestro",
        domain: "dev.flowmaestro.ai"
    }
};

export type EnvironmentName = keyof typeof ENVIRONMENTS;

export function getEnvironment(name: string): EnvironmentConfig {
    // Support aliases
    const normalizedName = name === "production" ? "prod" : name;

    const env = ENVIRONMENTS[normalizedName];
    if (!env) {
        throw new Error(
            `Unknown environment: ${name}. Valid environments: ${Object.keys(ENVIRONMENTS).join(", ")}`
        );
    }
    return env;
}

export function isValidEnvironment(name: string): name is EnvironmentName {
    return name in ENVIRONMENTS;
}
