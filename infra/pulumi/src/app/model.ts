import { secretDefinitions, type DeploymentTarget, type SecretDefinition } from "./secrets";

// =============================================================================
// Platform-neutral application model
// =============================================================================
// Describes what FlowMaestro needs from any hosting platform: the long-running
// processes, the static sites, the backing services, and the environment each
// process expects. Platform modules (./platforms/gcp, ./platforms/render) turn
// this into provider resources. Nothing in this file imports a provider SDK.

export interface ImageRef {
    repository: string; // e.g. ghcr.io/nbaghiro/flowmaestro-backend
    tag: string; // git sha or version
}

export type ProcessKind = "web" | "worker" | "private";

export interface ProcessSpec {
    id: "api" | "worker" | "temporal" | "temporalUi";
    kind: ProcessKind;
    description: string;
    // Command run inside the backend image (undefined for third-party images)
    command?: string[];
    // Container port the process listens on, if it serves traffic
    port?: number;
    healthPath?: string;
    // Which secret groups the process receives (matches SecretDefinition.deployments)
    deployment?: DeploymentTarget;
}

export interface StaticSiteSpec {
    id: "frontend" | "marketing" | "documentation" | "status" | "static";
    description: string;
    // Workspace names passed to npm --workspace
    workspaces: string[];
    // Command run from the repository root after the install
    buildCommand: string;
    // Directory, relative to the repository root, that holds the built site
    publishPath: string;
    // Hostname key used for the custom domain (see hostnames below)
    hostname: keyof AppHostnames;
    spaFallback: boolean;
}

export interface AppHostnames {
    api: string;
    app: string;
    www: string;
    apex: string;
    blog: string;
    docs: string;
    static: string;
    status: string;
}

export function hostnamesFor(domain: string): AppHostnames {
    return {
        api: `api.${domain}`,
        app: `app.${domain}`,
        www: `www.${domain}`,
        apex: domain,
        blog: `blog.${domain}`,
        docs: `docs.${domain}`,
        static: `static.${domain}`,
        status: `status.${domain}`
    };
}

// Backend processes. Both run from the same backend image.
export const processes: ProcessSpec[] = [
    {
        id: "api",
        kind: "web",
        description: "Fastify API server (REST, SSE, voice WebSocket)",
        command: ["node", "backend/dist/backend/src/index.js"],
        port: 3001,
        healthPath: "/health",
        deployment: "api"
    },
    {
        id: "worker",
        kind: "worker",
        description: "Temporal worker (workflow and agent orchestration)",
        command: ["node", "backend/dist/backend/src/temporal/worker.js"],
        port: 9090,
        healthPath: "/health",
        deployment: "worker"
    },
    {
        id: "temporal",
        kind: "private",
        description: "Self-hosted Temporal server (single process, Postgres persistence)",
        port: 7233
    },
    {
        id: "temporalUi",
        kind: "private",
        description: "Temporal web UI (optional)",
        port: 8080
    }
];

// Static sites built from the repository. The install is limited to the
// workspaces each site needs so that a build does not install the whole monorepo.
export const staticSites: StaticSiteSpec[] = [
    {
        id: "frontend",
        description: "Application frontend (Vite SPA)",
        workspaces: ["frontend", "shared"],
        buildCommand:
            "npm ci --workspace=frontend --workspace=shared --ignore-scripts && npm run build --workspace=shared && npm run build --workspace=frontend",
        publishPath: "frontend/dist",
        hostname: "app",
        spaFallback: true
    },
    {
        id: "marketing",
        description: "Marketing site (Vite SPA, serves www, apex and blog)",
        workspaces: ["marketing", "shared"],
        buildCommand:
            "npm ci --workspace=marketing --workspace=shared --ignore-scripts && npm run build --workspace=shared && npm run build --workspace=marketing",
        publishPath: "marketing/dist",
        hostname: "www",
        spaFallback: true
    },
    {
        id: "documentation",
        description: "Docusaurus documentation",
        workspaces: ["documentation"],
        buildCommand:
            "npm ci --workspace=documentation --ignore-scripts && npm run build --workspace=documentation",
        publishPath: "documentation/build",
        hostname: "docs",
        spaFallback: false
    },
    {
        id: "status",
        description: "Public status page (Vite SPA)",
        workspaces: ["status", "shared"],
        buildCommand:
            "npm ci --workspace=status --workspace=shared --ignore-scripts && npm run build --workspace=shared && npm run build --workspace=status",
        publishPath: "status/dist",
        hostname: "status",
        spaFallback: true
    },
    {
        id: "static",
        description: "Embeddable widget bundle served as /widget/<anything>.js",
        workspaces: ["sdks/widget"],
        // Mirrors infra/docker/static/Dockerfile: the tsup bundle becomes widget/widget.js
        buildCommand:
            "npm ci --workspace=@flowmaestro/widget --ignore-scripts && npm run build --workspace=@flowmaestro/widget && mkdir -p sdks/widget/site/widget && cp sdks/widget/dist/auto-init.global.js sdks/widget/site/widget/widget.js",
        publishPath: "sdks/widget/site",
        hostname: "static",
        spaFallback: false
    }
];

// Non-secret runtime settings every platform must provide to the backend
// processes. Values are filled by the platform module from its own config.
export const runtimeEnvKeys = [
    "NODE_ENV",
    "OTEL_ENABLED",
    "APP_URL",
    "API_URL",
    "MARKETING_URL",
    "TEMPORAL_ADDRESS",
    "TEMPORAL_NAMESPACE",
    "WORKER_HEALTH_PORT",
    "BACKEND_PORT",
    "POSTGRES_SSL",
    "GCS_UPLOADS_BUCKET",
    "GCS_ARTIFACTS_BUCKET",
    "GCS_KNOWLEDGE_DOCS_BUCKET",
    "GCS_INTERFACE_DOCS_BUCKET",
    "GOOGLE_APPLICATION_CREDENTIALS"
] as const;

export type RuntimeEnvKey = (typeof runtimeEnvKeys)[number];

// Secrets grouped by category, and the deployments each category reaches.
// The `deployments` list on each definition is the source of truth; a category
// is linked to a process when any secret in it targets that process.
export function secretsByCategory(): Record<string, SecretDefinition[]> {
    const groups: Record<string, SecretDefinition[]> = {};
    for (const def of secretDefinitions) {
        (groups[def.category] ??= []).push(def);
    }
    return groups;
}

export function categoryTargets(defs: SecretDefinition[]): DeploymentTarget[] {
    const targets = new Set<DeploymentTarget>();
    for (const def of defs) {
        for (const d of def.deployments) {
            targets.add(d);
        }
    }
    return [...targets];
}

export { secretDefinitions };
