import * as pulumi from "@pulumi/pulumi";

// =============================================================================
// Secret Definition Schema (platform-neutral)
// =============================================================================
// The "secrets" stack config holds a JSON array of SecretDefinition objects.
// Every platform module reads the same list: GCP creates Secret Manager secrets
// and External Secrets mappings from it, Render fills env groups from it.

export type SecretCategory = "core" | "oauth" | "llm" | "service";
export type DeploymentTarget = "api" | "worker";

export interface SecretDefinition {
    name: string; // e.g., "resend-api-key" (kebab-case)
    envVar: string; // e.g., "RESEND_API_KEY" (SCREAMING_SNAKE_CASE)
    category: SecretCategory;
    deployments: DeploymentTarget[];
    required: boolean;
    description?: string;
}

export const secretCategories: SecretCategory[] = ["core", "oauth", "llm", "service"];

const config = new pulumi.Config();

// Parse secrets from config - expects array of SecretDefinition objects
export function parseSecretsConfig(): SecretDefinition[] {
    const secretsJson = config.get("secrets");
    if (!secretsJson) {
        pulumi.log.warn(
            "No secrets defined in Pulumi config. Set flowmaestro-infrastructure:secrets"
        );
        return [];
    }

    try {
        const parsed = JSON.parse(secretsJson);
        if (!Array.isArray(parsed)) {
            throw new Error("secrets config must be a JSON array");
        }
        return parsed as SecretDefinition[];
    } catch (error) {
        throw new Error(`Failed to parse secrets config: ${error}`);
    }
}

export const secretDefinitions = parseSecretsConfig();
