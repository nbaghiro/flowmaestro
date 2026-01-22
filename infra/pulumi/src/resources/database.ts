import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { infrastructureConfig, resourceName, resourceLabels } from "../utils/config";
import { network, privateVpcConnection } from "./networking";

// Create Cloud SQL PostgreSQL instance
export const database = new gcp.sql.DatabaseInstance(
    resourceName("db"),
    {
        name: resourceName("db"),
        region: infrastructureConfig.region,
        databaseVersion: infrastructureConfig.dbVersion,
        deletionProtection: infrastructureConfig.environment === "production",

        settings: {
            tier: infrastructureConfig.dbTier,
            diskSize: infrastructureConfig.dbDiskSize,
            diskType: "PD_SSD",
            diskAutoresize: true,
            diskAutoresizeLimit: 500,

            availabilityType: infrastructureConfig.dbHighAvailability ? "REGIONAL" : "ZONAL",

            // Database flags
            databaseFlags: [
                {
                    name: "timezone",
                    value: "UTC"
                },
                {
                    // Increase max connections for concurrent API/worker/job pods
                    // Default for db-g1-small is ~25, which is too low
                    name: "max_connections",
                    value: "50"
                }
            ],

            // Note: pgvector extension can be enabled via SQL after database creation
            // No database flags needed for PostgreSQL 15+
            // Run: CREATE EXTENSION IF NOT EXISTS vector;

            ipConfiguration: {
                ipv4Enabled: false,
                privateNetwork: network.id,
                enablePrivatePathForGoogleCloudServices: true
            },

            backupConfiguration: infrastructureConfig.dbBackupEnabled
                ? {
                      enabled: true,
                      startTime: "03:00",
                      pointInTimeRecoveryEnabled: true,
                      transactionLogRetentionDays: 7,
                      backupRetentionSettings: {
                          retainedBackups: 7,
                          retentionUnit: "COUNT"
                      }
                  }
                : undefined,

            maintenanceWindow: {
                day: 7, // Sunday
                hour: 3,
                updateTrack: "stable"
            },

            insightsConfig: {
                queryInsightsEnabled: true,
                queryPlansPerMinute: 5,
                queryStringLength: 1024,
                recordApplicationTags: true,
                recordClientAddress: true
            },

            userLabels: resourceLabels()
        }
    },
    {
        dependsOn: [privateVpcConnection]
    }
);

// Create application database
export const appDatabaseName = new gcp.sql.Database(resourceName("app-database"), {
    name: "flowmaestro",
    instance: database.name,
    charset: "UTF8",
    collation: "en_US.UTF8"
});

// Create Temporal database (for self-hosted Temporal)
export const temporalDatabaseName = new gcp.sql.Database(resourceName("temporal-database"), {
    name: "temporal",
    instance: database.name,
    charset: "UTF8",
    collation: "en_US.UTF8"
});

// Create Temporal visibility database (required by Temporal)
export const temporalVisibilityDatabaseName = new gcp.sql.Database(
    resourceName("temporal-visibility-database"),
    {
        name: "temporal_visibility",
        instance: database.name,
        charset: "UTF8",
        collation: "en_US.UTF8"
    }
);

// Create application database user
export const appDatabaseUser = new gcp.sql.User(resourceName("app-db-user"), {
    name: "flowmaestro",
    instance: database.name,
    password: infrastructureConfig.dbPassword
});

// Create Temporal database user
export const temporalDatabaseUser = new gcp.sql.User(resourceName("temporal-db-user"), {
    name: "temporal",
    instance: database.name,
    password: infrastructureConfig.dbPassword
});

// Export database outputs
export const databaseOutputs = {
    instanceName: database.name,
    instanceConnectionName: database.connectionName,
    privateIp: database.privateIpAddress,

    // Application database
    appDatabaseName: appDatabaseName.name,
    appUserName: appDatabaseUser.name,

    // Temporal databases
    temporalDatabaseName: temporalDatabaseName.name,
    temporalVisibilityDatabaseName: temporalVisibilityDatabaseName.name,
    temporalUserName: temporalDatabaseUser.name
};

// Export database connection strings for Kubernetes
export const appDatabaseConnectionString = pulumi.interpolate`postgresql://${appDatabaseUser.name}:${infrastructureConfig.dbPassword}@${database.privateIpAddress}:5432/${appDatabaseName.name}`;

export const temporalDatabaseConnectionString = pulumi.interpolate`postgresql://${temporalDatabaseUser.name}:${infrastructureConfig.dbPassword}@${database.privateIpAddress}:5432/${temporalDatabaseName.name}`;

export const temporalVisibilityDatabaseConnectionString = pulumi.interpolate`postgresql://${temporalDatabaseUser.name}:${infrastructureConfig.dbPassword}@${database.privateIpAddress}:5432/${temporalVisibilityDatabaseName.name}`;
