import * as pulumi from "@pulumi/pulumi";

// Get Pulumi configuration
const config = new pulumi.Config();
const gcpConfig = new pulumi.Config("gcp");

export interface InfrastructureConfig {
    // GCP Configuration
    project: string;
    region: string;
    zone: string;

    // Application Configuration
    appName: string;
    environment: string;
    domain: string;

    // GitHub Actions CI/CD (optional)
    githubRepo: string; // Format: "owner/repo-name"

    // GKE Configuration
    gkeAutopilot: boolean;
    gkeVersion: string;
    gkePrivateNodes: boolean; // If false, saves ~$140/mo by not needing Cloud NAT

    // Database Configuration
    dbVersion: string;
    dbTier: string;
    dbDiskSize: number;
    dbHighAvailability: boolean;
    dbBackupEnabled: boolean;

    // Redis Configuration
    redisVersion: string;
    redisMemorySizeGb: number;
    redisTier: "BASIC" | "STANDARD_HA";

    // Logging Configuration
    appLogRetentionDays: number; // Days to retain app logs (default: 7 for dev, 30 for prod)
    errorLogRetentionDays: number; // Days to retain error logs (default: 14 for dev, 90 for prod)

    // Secrets (required) - these are Output<string> because they're secrets
    dbPassword: pulumi.Output<string>;
    jwtSecret: pulumi.Output<string>;
    encryptionKey: pulumi.Output<string>;

    // Temporal Configuration (self-hosted)
    temporalNamespace: string;

    // Marketing Site Configuration
    gaMeasurementId: string;

    // DEPRECATED: Use "secrets" config instead (see app-secrets.ts)
    // Application Secrets (flexible key-value pairs for any integration)
    // Format: JSON object like {"OPENAI_API_KEY": "sk-...", "SLACK_TOKEN": "xoxb-..."}
    appSecrets: { [key: string]: string };
}

// =============================================================================
// Secret Definitions Config (NEW - see app-secrets.ts)
// =============================================================================
// The "secrets" config defines application secrets with metadata.
// Format: JSON array of SecretDefinition objects
//
// Example (set via pulumi config):
//   pulumi config set secrets '[
//     {"name":"resend-api-key","envVar":"RESEND_API_KEY","category":"service","deployments":["api"],"required":true},
//     {"name":"openai-api-key","envVar":"OPENAI_API_KEY","category":"llm","deployments":["api","worker"],"required":false}
//   ]'
//
// SecretDefinition schema:
//   - name: string (kebab-case, e.g., "resend-api-key")
//   - envVar: string (SCREAMING_SNAKE_CASE, e.g., "RESEND_API_KEY")
//   - category: "core" | "oauth" | "llm" | "service"
//   - deployments: ("api" | "worker")[]
//   - required: boolean
//   - description?: string (optional)

// Default configuration values (dev-friendly to minimize costs)
// Override these in Pulumi.<stack>.yaml for production
const defaults = {
    gkeAutopilot: true,
    gkeVersion: "latest",
    gkePrivateNodes: false, // Public nodes (no Cloud NAT needed, saves ~$140/mo)
    dbVersion: "POSTGRES_15",
    dbTier: "db-g1-small", // ~$25/month (use db-custom-2-7680 for prod)
    dbDiskSize: 10, // 10GB (use 100+ for prod)
    dbHighAvailability: false, // No HA replica (enable for prod)
    dbBackupEnabled: false, // No backups (enable for prod)
    redisVersion: "REDIS_7_0",
    redisMemorySizeGb: 1, // 1GB (use 5+ for prod)
    redisTier: "BASIC" as const, // No HA replica (use STANDARD_HA for prod)
    appLogRetentionDays: 7, // 7 days for dev (use 30 for prod)
    errorLogRetentionDays: 14 // 14 days for dev (use 90 for prod)
};

// Parse application secrets from JSON config
function parseAppSecrets(): { [key: string]: string } {
    const secretsJson = config.get("appSecrets");
    if (!secretsJson) {
        return {};
    }

    try {
        const parsed = JSON.parse(secretsJson);
        if (typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("appSecrets must be a JSON object");
        }
        return parsed;
    } catch (error) {
        throw new Error(`Failed to parse appSecrets: ${error}`);
    }
}

// Export configuration
export const infrastructureConfig: InfrastructureConfig = {
    // GCP Configuration
    project: gcpConfig.require("project"),
    region: gcpConfig.get("region") || "us-central1",
    zone: gcpConfig.get("zone") || "us-central1-a",

    // Application Configuration
    appName: config.get("appName") || "flowmaestro",
    environment: config.get("environment") || "production",
    domain: config.require("domain"),

    // GitHub Actions CI/CD (optional)
    githubRepo: config.get("githubRepo") || "",

    // GKE Configuration
    gkeAutopilot: config.getBoolean("gkeAutopilot") ?? defaults.gkeAutopilot,
    gkeVersion: config.get("gkeVersion") || defaults.gkeVersion,
    gkePrivateNodes: config.getBoolean("gkePrivateNodes") ?? defaults.gkePrivateNodes,

    // Database Configuration
    dbVersion: config.get("dbVersion") || defaults.dbVersion,
    dbTier: config.get("dbTier") || defaults.dbTier,
    dbDiskSize: config.getNumber("dbDiskSize") || defaults.dbDiskSize,
    dbHighAvailability: config.getBoolean("dbHighAvailability") ?? defaults.dbHighAvailability,
    dbBackupEnabled: config.getBoolean("dbBackupEnabled") ?? defaults.dbBackupEnabled,

    // Redis Configuration
    redisVersion: config.get("redisVersion") || defaults.redisVersion,
    redisMemorySizeGb: config.getNumber("redisMemorySizeGb") || defaults.redisMemorySizeGb,
    redisTier: (config.get("redisTier") as "BASIC" | "STANDARD_HA") || defaults.redisTier,

    // Logging Configuration
    appLogRetentionDays: config.getNumber("appLogRetentionDays") || defaults.appLogRetentionDays,
    errorLogRetentionDays:
        config.getNumber("errorLogRetentionDays") || defaults.errorLogRetentionDays,

    // Secrets (required)
    dbPassword: config.requireSecret("dbPassword"),
    jwtSecret: config.requireSecret("jwtSecret"),
    encryptionKey: config.requireSecret("encryptionKey"),

    // Temporal Configuration (self-hosted)
    temporalNamespace: config.get("temporalNamespace") || "default",

    // Marketing Site Configuration
    gaMeasurementId: config.get("gaMeasurementId") || "",

    // Application Secrets (flexible)
    appSecrets: parseAppSecrets()
};

// Helper function to create resource names
export function resourceName(name: string): string {
    return `${infrastructureConfig.appName}-${name}`;
}

// Helper function to create resource labels
export function resourceLabels(): { [key: string]: string } {
    return {
        app: infrastructureConfig.appName,
        environment: infrastructureConfig.environment,
        "managed-by": "pulumi"
    };
}
