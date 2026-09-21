import * as pulumi from "@pulumi/pulumi";

// =============================================================================
// Platform switch
// =============================================================================
// One Pulumi project, one platform module per hosting target. The stack config
// key `flowmaestro-infrastructure:platform` selects which module runs:
//
//   gcp    (default) GKE Autopilot, Cloud SQL, Memorystore, Secret Manager.
//                    Stack: production. Resource names are unchanged from the
//                    original flat program, so state and URNs are preserved.
//   render           Render web service, background worker, private service for
//                    Temporal, Postgres, Key Value, static sites, env groups.
//                    Stack: render-prod.
//
// The platform modules are loaded with require() so that a stack for one platform
// never evaluates the other platform's config (for example gcp:project is only
// required by the GCP module). The platform-neutral description of the
// application lives in ./src/app and is shared by both.

const config = new pulumi.Config();
const platform = config.get("platform") || "gcp";

interface PlatformModule {
    outputs: Record<string, unknown>;
}

function loadPlatform(name: string): PlatformModule {
    switch (name) {
        case "gcp":
            // Only the selected platform may be loaded: importing both would create both sets of resources.
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            return require("./src/platforms/gcp") as PlatformModule;
        case "render":
            // Only the selected platform may be loaded: importing both would create both sets of resources.
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            return require("./src/platforms/render") as PlatformModule;
        default:
            throw new Error(`Unknown platform "${name}". Expected "gcp" or "render".`);
    }
}

const selected = loadPlatform(platform);

// Stack outputs. The shape for "gcp" is identical to the pre-split program.
export const outputs = selected.outputs;
export const activePlatform = platform;
