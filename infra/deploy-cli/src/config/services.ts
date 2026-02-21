export interface BuildArg {
    name: string;
    source: "env" | "pulumi" | "static";
    key: string;
    defaultValue?: string;
}

export interface ServiceConfig {
    name: string;
    displayName: string;
    deploymentName: string;
    dockerFile: string;
    imageName: string;
    buildArgs?: BuildArg[];
    sharesImageWith?: string; // If set, skips build and uses this service's image
}

export const SERVICES: Record<string, ServiceConfig> = {
    api: {
        name: "api",
        displayName: "API Server",
        deploymentName: "api-server",
        dockerFile: "infra/docker/backend/Dockerfile",
        imageName: "backend"
    },
    frontend: {
        name: "frontend",
        displayName: "Frontend",
        deploymentName: "frontend",
        dockerFile: "infra/docker/frontend/Dockerfile",
        imageName: "frontend",
        buildArgs: [
            {
                name: "VITE_API_URL",
                source: "static",
                key: "api_url" // Will be computed from domain
            },
            {
                name: "VITE_WS_URL",
                source: "static",
                key: "ws_url" // Will be computed from domain
            },
            {
                name: "VITE_UNSPLASH_ACCESS_KEY",
                source: "env",
                key: "VITE_UNSPLASH_ACCESS_KEY",
                defaultValue: ""
            },
            {
                name: "VITE_POSTHOG_KEY",
                source: "env",
                key: "VITE_POSTHOG_KEY",
                defaultValue: "phc_19ngK2JEzaHA8Z1RvdZsdGepCqqTKhyunujOw0NRz2F"
            },
            {
                name: "VITE_POSTHOG_HOST",
                source: "env",
                key: "VITE_POSTHOG_HOST",
                defaultValue: "https://us.i.posthog.com"
            }
        ]
    },
    worker: {
        name: "worker",
        displayName: "Temporal Worker",
        deploymentName: "temporal-worker",
        dockerFile: "infra/docker/backend/Dockerfile",
        imageName: "backend",
        sharesImageWith: "api" // Uses same image as api
    },
    marketing: {
        name: "marketing",
        displayName: "Marketing Site",
        deploymentName: "marketing",
        dockerFile: "infra/docker/marketing/Dockerfile",
        imageName: "marketing",
        buildArgs: [
            {
                name: "VITE_GA_MEASUREMENT_ID",
                source: "pulumi",
                key: "gaMeasurementId",
                defaultValue: ""
            },
            {
                name: "VITE_POSTHOG_KEY",
                source: "env",
                key: "VITE_POSTHOG_KEY",
                defaultValue: ""
            },
            {
                name: "VITE_POSTHOG_HOST",
                source: "env",
                key: "VITE_POSTHOG_HOST",
                defaultValue: "https://us.i.posthog.com"
            }
        ]
    },
    documentation: {
        name: "documentation",
        displayName: "Documentation Site",
        deploymentName: "documentation",
        dockerFile: "infra/docker/documentation/Dockerfile",
        imageName: "documentation",
        buildArgs: [
            {
                name: "VITE_POSTHOG_KEY",
                source: "env",
                key: "VITE_POSTHOG_KEY",
                defaultValue: ""
            },
            {
                name: "VITE_POSTHOG_HOST",
                source: "env",
                key: "VITE_POSTHOG_HOST",
                defaultValue: "https://us.i.posthog.com"
            }
        ]
    },
    static: {
        name: "static",
        displayName: "Static Assets (Widget)",
        deploymentName: "static",
        dockerFile: "infra/docker/static/Dockerfile",
        imageName: "static"
    },
    status: {
        name: "status",
        displayName: "Status Page",
        deploymentName: "status-page",
        dockerFile: "infra/docker/status/Dockerfile",
        imageName: "status"
    }
};

export type ServiceName = keyof typeof SERVICES;

// Service groups for convenience
export const SERVICE_GROUPS: Record<string, ServiceName[]> = {
    all: ["api", "frontend", "worker", "marketing", "documentation", "static", "status"],
    app: ["api", "frontend", "worker"],
    sites: ["marketing", "documentation", "status"],
    backend: ["api", "worker"]
};

export function getService(name: string): ServiceConfig {
    const service = SERVICES[name];
    if (!service) {
        throw new Error(
            `Unknown service: ${name}. Valid services: ${Object.keys(SERVICES).join(", ")}`
        );
    }
    return service;
}

export function isValidService(name: string): name is ServiceName {
    return name in SERVICES;
}

export function resolveServices(names: string[]): ServiceConfig[] {
    const resolved = new Set<string>();

    for (const name of names) {
        if (name in SERVICE_GROUPS) {
            for (const service of SERVICE_GROUPS[name]) {
                resolved.add(service);
            }
        } else if (isValidService(name)) {
            resolved.add(name);
        } else {
            throw new Error(
                `Unknown service or group: ${name}. Valid options: ${[...Object.keys(SERVICES), ...Object.keys(SERVICE_GROUPS)].join(", ")}`
            );
        }
    }

    return Array.from(resolved).map((name) => SERVICES[name]);
}
