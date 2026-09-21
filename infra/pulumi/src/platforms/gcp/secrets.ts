import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { infrastructureConfig, resourceName } from "../../utils/config";

// Helper function to create a secret
function createSecret(name: string, secretData: pulumi.Output<string> | string) {
    const secret = new gcp.secretmanager.Secret(resourceName(name), {
        secretId: resourceName(name),
        replication: {
            auto: {}
        },
        labels: {
            app: infrastructureConfig.appName,
            environment: infrastructureConfig.environment
        }
    });

    new gcp.secretmanager.SecretVersion(resourceName(`${name}-version`), {
        secret: secret.id,
        secretData: secretData
    });

    return secret;
}

// Create secrets for core application credentials
export const dbPasswordSecret = createSecret("db-password", infrastructureConfig.dbPassword);
export const jwtSecretSecret = createSecret("jwt-secret", infrastructureConfig.jwtSecret);
export const encryptionKeySecret = createSecret(
    "encryption-key",
    infrastructureConfig.encryptionKey
);

// Create flexible application secrets for all integrations
// These can be any key-value pairs (LLM keys, API tokens, OAuth secrets, etc.)
export const appSecrets: { [key: string]: gcp.secretmanager.Secret } = {};
export const appSecretIds: { [key: string]: pulumi.Output<string> } = {};

for (const [key, value] of Object.entries(infrastructureConfig.appSecrets)) {
    // Convert keys to lowercase-hyphen format for secret names
    const secretName = key.toLowerCase().replace(/_/g, "-");
    const secret = createSecret(`app-${secretName}`, value);
    appSecrets[key] = secret;
    appSecretIds[key] = secret.id;
}

// Export secret outputs
export const secretOutputs = {
    // Core secrets
    dbPasswordSecretId: dbPasswordSecret.id,
    jwtSecretSecretId: jwtSecretSecret.id,
    encryptionKeySecretId: encryptionKeySecret.id,

    // Application secrets (dynamic)
    appSecretIds: appSecretIds
};
