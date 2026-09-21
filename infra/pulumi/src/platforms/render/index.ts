import * as pulumi from "@pulumi/pulumi";
import * as render from "@pulumi/render";
import {
    categoryTargets,
    hostnamesFor,
    processes,
    secretsByCategory,
    staticSites,
    type ProcessSpec,
    type StaticSiteSpec
} from "../../app/model";
import {
    optionalSecrets,
    providerCredentials,
    resourceName,
    secretValues,
    settings,
    shared
} from "./config";
import type { DeploymentTarget } from "../../app/secrets";

// =============================================================================
// Render platform
// =============================================================================
// Maps the application model onto Render resources through the bridged
// render-oss/render provider (see infra/pulumi/Pulumi.yaml `packages`).
//
// Layout:
//   Project "flowmaestro" with one environment
//   Postgres (app database; Temporal databases live on the same instance)
//   Key Value (Redis-compatible, pub/sub and rate limiting only)
//   Private service "temporal" (temporalio/auto-setup, single process)
//   Web service "api" and background worker "worker" from the backend image
//   Static sites for frontend, marketing, documentation, status and the widget
//   Env groups: one per secret category plus "runtime", linked per deployment

const provider = new render.Provider("render", {
    apiKey: providerCredentials.apiKey,
    ownerId: providerCredentials.ownerId
});

const opts = { provider };
const hostnames = hostnamesFor(shared.domain);

// -----------------------------------------------------------------------------
// Project and environment (adopted, not created)
// -----------------------------------------------------------------------------
// The Render project and its environment were created in the dashboard. Every
// resource below is attached to that environment through `environmentId`, so
// Pulumi never creates a second project. If the project should later be managed
// by Pulumi, define a render.Project and adopt it with
//   pulumi import render:index/project:Project flowmaestro-project <projectId>
// instead of letting a new one be created.

const environmentId = pulumi.output(settings.environmentId);

// -----------------------------------------------------------------------------
// Backing services
// -----------------------------------------------------------------------------

const postgres = new render.Postgres(
    resourceName("postgres"),
    {
        name: resourceName("postgres"),
        plan: settings.postgresPlan,
        version: settings.postgresVersion,
        region: settings.region,
        databaseName: "flowmaestro",
        databaseUser: "flowmaestro",
        environmentId
    },
    opts
);

const keyvalue = new render.Keyvalue(
    resourceName("keyvalue"),
    {
        name: resourceName("keyvalue"),
        plan: settings.keyvaluePlan,
        region: settings.region,
        maxMemoryPolicy: settings.keyvalueMaxMemoryPolicy,
        environmentId
    },
    opts
);

// Internal connection strings are only reachable from services in the same
// region and workspace, which is what we want.
const databaseUrl = postgres.connectionInfo.apply((c) => c.internalConnectionString);
const redisUrl = keyvalue.connectionInfo.apply((c) => c.internalConnectionString);

// Temporal's auto-setup image wants host, port, user and password separately.
interface PostgresParts {
    host: string;
    port: string;
    user: string;
    password: string;
}

const postgresParts: pulumi.Output<PostgresParts> = postgres.connectionInfo.apply((c) => {
    const url = new URL(c.internalConnectionString);
    return {
        host: url.hostname,
        port: url.port || "5432",
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password)
    };
});

// -----------------------------------------------------------------------------
// Temporal
// -----------------------------------------------------------------------------

let temporalAddress: pulumi.Output<string>;
let temporalService: render.PrivateService | undefined;

if (settings.temporalMode === "cloud") {
    if (!settings.temporalCloudAddress || !settings.temporalCloudNamespace) {
        throw new Error(
            'render.temporalMode is "cloud" but temporalCloudAddress or temporalCloudNamespace is missing'
        );
    }
    temporalAddress = pulumi.output(settings.temporalCloudAddress);
} else {
    const temporalSpec = processes.find((p) => p.id === "temporal") as ProcessSpec;
    temporalService = new render.PrivateService(
        resourceName("temporal"),
        {
            name: resourceName("temporal"),
            plan: settings.temporalPlan,
            region: settings.region,
            environmentId,
            numInstances: 1,
            runtimeSource: {
                image: {
                    imageUrl: settings.temporalImage,
                    tag: settings.temporalImageTag
                }
            },
            envVars: {
                DB: { value: "postgres12" },
                DB_PORT: { value: postgresParts.apply((p) => p.port) },
                POSTGRES_SEEDS: { value: postgresParts.apply((p) => p.host) },
                POSTGRES_USER: { value: postgresParts.apply((p) => p.user) },
                POSTGRES_PWD: { value: postgresParts.apply((p) => p.password) },
                DBNAME: { value: settings.temporalDbName },
                VISIBILITY_DBNAME: { value: settings.temporalVisibilityDbName },
                NUM_HISTORY_SHARDS: { value: String(settings.temporalHistoryShards) },
                BIND_ON_IP: { value: "0.0.0.0" },
                PORT: { value: String(temporalSpec.port) }
            }
        },
        opts
    );

    // Render private services are reached by hostname on the private network.
    // The provider exposes `url` (scheme://host[:port]); we keep the host and
    // append Temporal's gRPC port.
    temporalAddress = temporalService.url.apply((u) => {
        const host = new URL(u).hostname;
        return `${host}:${temporalSpec.port}`;
    });
}

let temporalUi: render.PrivateService | undefined;
if (settings.temporalMode === "self-hosted" && settings.temporalUiEnabled) {
    temporalUi = new render.PrivateService(
        resourceName("temporal-ui"),
        {
            name: resourceName("temporal-ui"),
            plan: settings.temporalUiPlan,
            region: settings.region,
            environmentId,
            numInstances: 1,
            runtimeSource: {
                image: { imageUrl: "docker.io/temporalio/ui", tag: "2.21.3" }
            },
            envVars: {
                TEMPORAL_ADDRESS: { value: temporalAddress },
                TEMPORAL_CORS_ORIGINS: { value: `https://${hostnames.app}` },
                PORT: { value: "8080" }
            }
        },
        opts
    );
}

// -----------------------------------------------------------------------------
// Env groups: one per secret category, plus runtime settings
// -----------------------------------------------------------------------------

type EnvVarMap = { [key: string]: render.types.input.EnvGroupEnvVars };

const groupsByCategory = secretsByCategory();
const secretEnvGroups: {
    category: string;
    group: render.EnvGroup;
    targets: DeploymentTarget[];
}[] = [];

// Render rejects an env group with no variables, so a category is only created
// once at least one of its values has been exported. Only the key names are read
// here; the values themselves stay inside the secret Output below.
const plainSecretValues =
    new pulumi.Config().getObject<{ [envVar: string]: string }>("secretValues") ?? {};
const presentSecretKeys = new Set(
    Object.entries(plainSecretValues)
        .filter(([, value]) => typeof value === "string" && value !== "")
        .map(([key]) => key)
);

for (const [category, defs] of Object.entries(groupsByCategory)) {
    if (!defs.some((def) => presentSecretKeys.has(def.envVar))) {
        pulumi.log.warn(
            `No secret values for category "${category}"; its env group is skipped. ` +
                "Run infra/scripts/export-secrets-to-pulumi.sh before deploying."
        );
        continue;
    }

    const envVars: pulumi.Output<EnvVarMap> = secretValues.apply((values) => {
        const map: EnvVarMap = {};
        const missingRequired: string[] = [];
        for (const def of defs) {
            const value = values[def.envVar];
            if (value === undefined || value === "") {
                if (def.required) {
                    missingRequired.push(def.envVar);
                }
                continue;
            }
            map[def.envVar] = { value };
        }
        if (missingRequired.length > 0) {
            throw new Error(
                `Missing required secret values for category "${category}": ${missingRequired.join(", ")}. ` +
                    "Run infra/scripts/export-secrets-to-pulumi.sh or set them with pulumi config."
            );
        }
        return map;
    });

    const group = new render.EnvGroup(
        resourceName(`${category}-secrets`),
        {
            name: resourceName(`${category}-secrets`),
            environmentId,
            envVars
        },
        opts
    );

    secretEnvGroups.push({ category, group, targets: categoryTargets(defs) });
}

const workerSpec = processes.find((p) => p.id === "worker") as ProcessSpec;
const apiSpec = processes.find((p) => p.id === "api") as ProcessSpec;

const runtimeEnvVars: EnvVarMap = {
    NODE_ENV: { value: "production" },
    OTEL_ENABLED: { value: "false" },
    APP_URL: { value: `https://${hostnames.app}` },
    API_URL: { value: `https://${hostnames.api}` },
    MARKETING_URL: { value: `https://${hostnames.www}` },
    TEMPORAL_NAMESPACE: { value: shared.temporalNamespace },
    WORKER_HEALTH_PORT: { value: String(workerSpec.port) },
    BACKEND_PORT: { value: String(apiSpec.port) },
    // Render internal connections do not use TLS; the external URL would.
    POSTGRES_SSL: { value: "disable" },
    GCS_UPLOADS_BUCKET: { value: settings.gcsUploadsBucket },
    GCS_ARTIFACTS_BUCKET: { value: settings.gcsArtifactsBucket },
    GCS_KNOWLEDGE_DOCS_BUCKET: { value: settings.gcsKnowledgeDocsBucket },
    GCS_INTERFACE_DOCS_BUCKET: { value: settings.gcsInterfaceDocsBucket },
    GOOGLE_APPLICATION_CREDENTIALS: { value: "/etc/secrets/gcs-service-account.json" }
};

const runtimeGroup = new render.EnvGroup(
    resourceName("runtime"),
    {
        name: resourceName("runtime"),
        environmentId,
        envVars: runtimeEnvVars
    },
    opts
);

// -----------------------------------------------------------------------------
// Backend processes
// -----------------------------------------------------------------------------

const imageSource = {
    image: {
        imageUrl: settings.image,
        tag: settings.imageTag
    }
};

// Per-service values that come from other resources
const serviceEnvVars = (extra: EnvVarMap): pulumi.Input<EnvVarMap> => ({
    DATABASE_URL: { value: databaseUrl },
    REDIS_URL: { value: redisUrl },
    TEMPORAL_ADDRESS: { value: temporalAddress },
    ...(settings.temporalMode === "cloud" && optionalSecrets.temporalCloudApiKey
        ? { TEMPORAL_API_KEY: { value: optionalSecrets.temporalCloudApiKey } }
        : {}),
    ...extra
});

const secretFiles = optionalSecrets.gcsServiceAccountJson
    ? { "gcs-service-account.json": { content: optionalSecrets.gcsServiceAccountJson } }
    : undefined;

const api = new render.WebService(
    resourceName("api"),
    {
        name: resourceName("api"),
        plan: settings.apiPlan,
        region: settings.region,
        environmentId,
        numInstances: 1,
        runtimeSource: imageSource,
        startCommand: (apiSpec.command as string[]).join(" "),
        preDeployCommand: "cd backend && npm run db:migrate:prod",
        healthCheckPath: apiSpec.healthPath,
        envVars: serviceEnvVars({
            // Render routes traffic to the port named by PORT
            PORT: { value: String(apiSpec.port) }
        }),
        secretFiles,
        customDomains: settings.customDomainsEnabled ? [{ name: hostnames.api }] : undefined
    },
    opts
);

const worker = new render.BackgroundWorker(
    resourceName("worker"),
    {
        name: resourceName("worker"),
        plan: settings.workerPlan,
        region: settings.region,
        environmentId,
        numInstances: 1,
        runtimeSource: imageSource,
        startCommand: (workerSpec.command as string[]).join(" "),
        envVars: serviceEnvVars({}),
        secretFiles
    },
    opts
);

// -----------------------------------------------------------------------------
// Env group links
// -----------------------------------------------------------------------------

const serviceIdByTarget: Record<DeploymentTarget, pulumi.Output<string>> = {
    api: api.id,
    worker: worker.id
};

for (const { category, group, targets } of secretEnvGroups) {
    // The link's logical name must be a plain string; `group.name` is an Output.
    new render.EnvGroupLink(
        resourceName(`link-${category}-secrets`),
        {
            envGroupId: group.id,
            serviceIds: targets.map((t) => serviceIdByTarget[t])
        },
        opts
    );
}

new render.EnvGroupLink(
    resourceName("link-runtime"),
    {
        envGroupId: runtimeGroup.id,
        serviceIds: [api.id, worker.id]
    },
    opts
);

// -----------------------------------------------------------------------------
// Static sites
// -----------------------------------------------------------------------------

const staticSiteResources: { spec: StaticSiteSpec; site: render.StaticSite }[] = [];

if (settings.staticSitesEnabled) {
    const commonEnv: { [key: string]: string } = {
        VITE_API_URL: `https://${hostnames.api}`,
        VITE_WS_URL: `wss://${hostnames.api}`,
        VITE_APP_URL: `https://${hostnames.app}`,
        VITE_DOCS_URL: `https://${hostnames.docs}`,
        VITE_STATIC_URL: `https://${hostnames.static}`,
        ...settings.staticSiteEnv
    };

    for (const spec of staticSites) {
        const envVars: { [key: string]: render.types.input.StaticSiteEnvVars } = {};
        for (const [k, v] of Object.entries(commonEnv)) {
            envVars[k] = { value: v };
        }

        const routes: render.types.input.StaticSiteRoute[] = [];
        const headers: render.types.input.StaticSiteHeader[] = [];
        const domains: render.types.input.StaticSiteCustomDomain[] = [];

        if (spec.spaFallback) {
            routes.push({ source: "/*", destination: "/index.html", type: "rewrite" });
        }

        if (spec.id === "static") {
            // Mirrors infra/docker/static/nginx.conf: any /widget/<name>.js serves the bundle
            routes.push({
                source: "/widget/*.js",
                destination: "/widget/widget.js",
                type: "rewrite"
            });
            headers.push(
                { path: "/*", name: "Access-Control-Allow-Origin", value: "*" },
                { path: "/*", name: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
                {
                    path: "/*",
                    name: "Access-Control-Allow-Headers",
                    value: "Origin, Content-Type, Accept"
                },
                { path: "/*", name: "X-Content-Type-Options", value: "nosniff" },
                { path: "/widget/*", name: "Cache-Control", value: "public, max-age=3600" }
            );
        }

        if (settings.customDomainsEnabled) {
            domains.push({ name: hostnames[spec.hostname] });
            if (spec.id === "marketing") {
                domains.push({ name: hostnames.apex }, { name: hostnames.blog });
            }
        }

        const site = new render.StaticSite(
            resourceName(spec.id),
            {
                name: resourceName(spec.id),
                environmentId,
                repoUrl: settings.repoUrl,
                branch: settings.branch,
                // Rebuild on every push to the branch, as the sibling Galleo service does.
                autoDeploy: true,
                rootDirectory: ".",
                buildCommand: spec.buildCommand,
                publishPath: spec.publishPath,
                envVars,
                routes: routes.length > 0 ? routes : undefined,
                headers: headers.length > 0 ? headers : undefined,
                customDomains: domains.length > 0 ? domains : undefined
            },
            opts
        );

        staticSiteResources.push({ spec, site });
    }
}

// -----------------------------------------------------------------------------
// DNS records to create by hand (Squarespace today, Cloudflare later)
// -----------------------------------------------------------------------------

interface DnsRecord {
    hostname: string;
    type: "CNAME" | "A";
    target: string;
    note?: string;
}

const dnsRecords: pulumi.Output<DnsRecord[]> = pulumi
    .all([api.url, ...staticSiteResources.map((s) => s.site.url)])
    .apply(([apiUrl, ...siteUrls]) => {
        const host = (u: string) => new URL(u).hostname;
        const records: DnsRecord[] = [
            { hostname: hostnames.api, type: "CNAME", target: host(apiUrl) }
        ];
        staticSiteResources.forEach(({ spec }, i) => {
            const target = host(siteUrls[i]);
            records.push({ hostname: hostnames[spec.hostname], type: "CNAME", target });
            if (spec.id === "marketing") {
                records.push({ hostname: hostnames.blog, type: "CNAME", target });
                records.push({
                    hostname: hostnames.apex,
                    type: "A",
                    target: "216.24.57.1",
                    note: "Render apex address; confirm in the dashboard custom domain page"
                });
            }
        });
        return records;
    });

// -----------------------------------------------------------------------------
// Outputs
// -----------------------------------------------------------------------------

export const outputs = {
    platform: "render",
    region: settings.region,
    projectName: settings.projectName,
    projectId: settings.projectId,
    environmentId,

    apiUrl: api.url,
    apiServiceId: api.id,
    workerServiceId: worker.id,
    temporalMode: settings.temporalMode,
    temporalAddress,
    temporalServiceId: temporalService?.id,
    temporalUiServiceId: temporalUi?.id,

    postgresId: postgres.id,
    postgresExternalConnectionString: pulumi.secret(
        postgres.connectionInfo.apply((c) => c.externalConnectionString)
    ),
    postgresPsqlCommand: pulumi.secret(postgres.connectionInfo.apply((c) => c.psqlCommand)),
    keyvalueId: keyvalue.id,

    staticSites: staticSiteResources.map(({ spec, site }) => ({
        id: spec.id,
        hostname: hostnames[spec.hostname],
        url: site.url
    })),

    dnsRecords,

    secretGroups: secretEnvGroups.map(({ group, targets }) => ({
        name: group.name,
        targets
    }))
};
