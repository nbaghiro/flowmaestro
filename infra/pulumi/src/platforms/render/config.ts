import * as pulumi from "@pulumi/pulumi";

// =============================================================================
// Render platform configuration
// =============================================================================
// Two config namespaces are used:
//
//   render:apiKey, render:ownerId      Provider credentials (bridged provider
//                                      namespace). ownerId is the workspace id
//                                      (tea-...). apiKey is a secret.
//
//   flowmaestro-infrastructure:render  One JSON object with the platform
//                                      settings below (plans, region, image,
//                                      Temporal mode, static sites, buckets).
//
// Shared project keys read here: domain, appName, environment,
// temporalNamespace, secrets (definitions), secretValues (ENV_VAR -> value,
// written by infra/scripts/export-secrets-to-pulumi.sh).

const project = new pulumi.Config();
const renderProvider = new pulumi.Config("render");

export type TemporalMode = "self-hosted" | "cloud";

export interface RenderSettings {
    region: string; // frankfurt | ohio | oregon | singapore | virginia
    // Existing Render project and environment, created in the dashboard and
    // adopted here (see `render projects list` / `render environments list`).
    projectId: string; // prj-...
    environmentId: string; // evm-...
    projectName: string; // informational, used in outputs only

    image: string; // e.g. ghcr.io/nbaghiro/flowmaestro-backend
    imageTag: string; // git sha or release tag

    apiPlan: string; // starter | standard | pro ...
    workerPlan: string;
    temporalPlan: string;
    temporalUiEnabled: boolean;
    temporalUiPlan: string;

    postgresPlan: string; // basic_256mb | basic_1gb | basic_4gb | pro_4gb ... (Terraform spelling)
    postgresVersion: string; // "15"
    keyvaluePlan: string; // free | starter | ...
    keyvalueMaxMemoryPolicy: string; // allkeys_lru

    temporalMode: TemporalMode;
    temporalImage: string; // docker.io/temporalio/auto-setup
    temporalImageTag: string; // 1.23.0
    temporalDbName: string;
    temporalVisibilityDbName: string;
    temporalHistoryShards: number;
    // Temporal Cloud only
    temporalCloudAddress?: string;
    temporalCloudNamespace?: string;

    repoUrl: string; // https://github.com/nbaghiro/flowmaestro
    branch: string;
    staticSitesEnabled: boolean;
    customDomainsEnabled: boolean;
    // Extra build-time variables for the static sites (VITE_*)
    staticSiteEnv: { [key: string]: string };

    gcsUploadsBucket: string;
    gcsArtifactsBucket: string;
    gcsKnowledgeDocsBucket: string;
    gcsInterfaceDocsBucket: string;
}

const defaults: RenderSettings = {
    region: "oregon",
    projectId: "",
    environmentId: "",
    projectName: "FlowMaestro",
    image: "ghcr.io/nbaghiro/flowmaestro-backend",
    imageTag: "latest",
    apiPlan: "starter",
    workerPlan: "starter",
    temporalPlan: "starter",
    temporalUiEnabled: false,
    temporalUiPlan: "starter",
    postgresPlan: "basic_256mb",
    postgresVersion: "15",
    keyvaluePlan: "free",
    keyvalueMaxMemoryPolicy: "allkeys_lru",
    temporalMode: "self-hosted",
    temporalImage: "docker.io/temporalio/auto-setup",
    temporalImageTag: "1.23.0",
    temporalDbName: "temporal",
    temporalVisibilityDbName: "temporal_visibility",
    temporalHistoryShards: 4,
    repoUrl: "https://github.com/nbaghiro/flowmaestro",
    branch: "main",
    staticSitesEnabled: true,
    customDomainsEnabled: false,
    staticSiteEnv: {},
    gcsUploadsBucket: "flowmaestro-uploads-flowmaestro-prod",
    gcsArtifactsBucket: "flowmaestro-artifacts-flowmaestro-prod",
    gcsKnowledgeDocsBucket: "flowmaestro-knowledge-docs-flowmaestro-prod",
    gcsInterfaceDocsBucket: "flowmaestro-interface-docs-flowmaestro-prod"
};

export const settings: RenderSettings = {
    ...defaults,
    ...(project.getObject<Partial<RenderSettings>>("render") ?? {})
};

if (!settings.projectId || !settings.environmentId) {
    throw new Error(
        "render.projectId and render.environmentId are required: the Render project is " +
            "created in the dashboard and adopted, not created by Pulumi"
    );
}

export const shared = {
    appName: project.get("appName") || "flowmaestro",
    environment: project.get("environment") || "production",
    domain: project.require("domain"),
    temporalNamespace: project.get("temporalNamespace") || "default"
};

// Provider credentials: stack config first, environment variables as a
// fallback (RENDER_API_KEY, RENDER_OWNER_ID) so that CI and previews can run
// without writing credentials into the stack file.
function credential(key: string, envVar: string, secret: boolean): pulumi.Output<string> {
    const fromConfig = secret ? renderProvider.getSecret(key) : renderProvider.get(key);
    if (fromConfig !== undefined) {
        return pulumi.output(fromConfig);
    }
    const fromEnv = process.env[envVar];
    if (fromEnv) {
        return secret ? pulumi.secret(fromEnv) : pulumi.output(fromEnv);
    }
    throw new Error(`Missing render:${key} (or ${envVar} in the environment)`);
}

export const providerCredentials = {
    apiKey: credential("apiKey", "RENDER_API_KEY", true),
    ownerId: credential("ownerId", "RENDER_OWNER_ID", false)
};

// Secret values keyed by ENV_VAR. Written with
//   pulumi config set --secret --path "secretValues.<ENV_VAR>" -- "<value>"
export const secretValues: pulumi.Output<{ [envVar: string]: string }> =
    project.getSecretObject<{ [envVar: string]: string }>("secretValues") ??
    pulumi.output({} as { [envVar: string]: string });

// Optional secrets that are not part of the definitions list
export const optionalSecrets = {
    // Contents of the GCS service account key file, mounted as a secret file
    gcsServiceAccountJson: project.getSecret("gcsServiceAccountJson"),
    temporalCloudApiKey: project.getSecret("temporalCloudApiKey")
};

export function resourceName(name: string): string {
    return `${shared.appName}-${name}`;
}
