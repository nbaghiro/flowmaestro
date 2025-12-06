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

    // GKE Configuration
    gkeAutopilot: boolean;
    gkeVersion: string;

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

    // Secrets (required) - these are Output<string> because they're secrets
    dbPassword: pulumi.Output<string>;
    jwtSecret: pulumi.Output<string>;
    encryptionKey: pulumi.Output<string>;

    // Temporal Configuration (self-hosted)
    temporalNamespace: string;

    // Marketing Site Configuration
    gaMeasurementId: string;

    // Application Secrets (flexible key-value pairs for any integration)
    // Format: JSON object like {"OPENAI_API_KEY": "sk-...", "SLACK_TOKEN": "xoxb-..."}
    appSecrets: { [key: string]: string };
}

// Default configuration values
const defaults = {
    gkeAutopilot: true,
    gkeVersion: "latest",
    dbVersion: "POSTGRES_15",
    dbTier: "db-custom-2-7680",
    dbDiskSize: 100,
    dbHighAvailability: true,
    dbBackupEnabled: true,
    redisVersion: "REDIS_7_0",
    redisMemorySizeGb: 5,
    redisTier: "STANDARD_HA" as const
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

    // GKE Configuration
    gkeAutopilot: config.getBoolean("gkeAutopilot") ?? defaults.gkeAutopilot,
    gkeVersion: config.get("gkeVersion") || defaults.gkeVersion,

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
