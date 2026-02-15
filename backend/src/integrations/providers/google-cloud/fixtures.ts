import type { TestFixture } from "../../sandbox";

// Cloud Build fixtures (10)
const cloudBuildFixtures: TestFixture[] = [
    {
        operationId: "cloud_build_listBuilds",
        provider: "google-cloud",
        validCases: [{ name: "list", input: {}, expectedOutput: { builds: [] } }],
        errorCases: []
    },
    {
        operationId: "cloud_build_getBuild",
        provider: "google-cloud",
        validCases: [
            { name: "get", input: { buildId: "abc-123" }, expectedOutput: { id: "abc-123" } }
        ],
        errorCases: []
    },
    {
        operationId: "cloud_build_createBuild",
        provider: "google-cloud",
        validCases: [
            {
                name: "create",
                input: {
                    source: {
                        repoSource: {
                            projectId: "my-project",
                            repoName: "my-repo",
                            branchName: "main"
                        }
                    }
                },
                expectedOutput: { id: "new-build" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "cloud_build_retryBuild",
        provider: "google-cloud",
        validCases: [
            {
                name: "retry",
                input: { buildId: "failed-build" },
                expectedOutput: { id: "retry-build" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "cloud_build_cancelBuild",
        provider: "google-cloud",
        validCases: [
            {
                name: "cancel",
                input: { buildId: "running-build" },
                expectedOutput: { message: "Build cancelled" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "cloud_build_listTriggers",
        provider: "google-cloud",
        validCases: [{ name: "list", input: {}, expectedOutput: { triggers: [] } }],
        errorCases: []
    },
    {
        operationId: "cloud_build_getTrigger",
        provider: "google-cloud",
        validCases: [
            {
                name: "get",
                input: { triggerId: "trigger-123" },
                expectedOutput: { id: "trigger-123" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "cloud_build_createTrigger",
        provider: "google-cloud",
        validCases: [
            {
                name: "create",
                input: { name: "my-trigger", github: { owner: "user", name: "repo" } },
                expectedOutput: { id: "new-trigger" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "cloud_build_updateTrigger",
        provider: "google-cloud",
        validCases: [
            {
                name: "update",
                input: { triggerId: "trigger-123", name: "updated-trigger" },
                expectedOutput: { id: "trigger-123" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "cloud_build_deleteTrigger",
        provider: "google-cloud",
        validCases: [
            {
                name: "delete",
                input: { triggerId: "trigger-123" },
                expectedOutput: { message: "Trigger deleted" }
            }
        ],
        errorCases: []
    }
];

// Secret Manager fixtures (9)
const secretManagerFixtures: TestFixture[] = [
    {
        operationId: "secret_manager_listSecrets",
        provider: "google-cloud",
        validCases: [{ name: "list", input: {}, expectedOutput: { secrets: [] } }],
        errorCases: []
    },
    {
        operationId: "secret_manager_createSecret",
        provider: "google-cloud",
        validCases: [
            {
                name: "create",
                input: { secretId: "my-secret" },
                expectedOutput: { name: "projects/my-project/secrets/my-secret" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "secret_manager_getSecret",
        provider: "google-cloud",
        validCases: [
            {
                name: "get",
                input: { secretId: "my-secret" },
                expectedOutput: { name: "projects/my-project/secrets/my-secret" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "secret_manager_updateSecret",
        provider: "google-cloud",
        validCases: [
            {
                name: "update",
                input: { secretId: "my-secret", labels: { env: "prod" } },
                expectedOutput: { name: "projects/my-project/secrets/my-secret" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "secret_manager_deleteSecret",
        provider: "google-cloud",
        validCases: [
            {
                name: "delete",
                input: { secretId: "my-secret" },
                expectedOutput: { message: "Secret deleted" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "secret_manager_addSecretVersion",
        provider: "google-cloud",
        validCases: [
            {
                name: "add",
                input: { secretId: "my-secret", payload: "secret-value" },
                expectedOutput: { name: "projects/my-project/secrets/my-secret/versions/1" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "secret_manager_accessSecretVersion",
        provider: "google-cloud",
        validCases: [
            {
                name: "access",
                input: { secretId: "my-secret", version: "latest" },
                expectedOutput: { payload: "secret-value" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "secret_manager_listSecretVersions",
        provider: "google-cloud",
        validCases: [
            { name: "list", input: { secretId: "my-secret" }, expectedOutput: { versions: [] } }
        ],
        errorCases: []
    },
    {
        operationId: "secret_manager_destroySecretVersion",
        provider: "google-cloud",
        validCases: [
            {
                name: "destroy",
                input: { secretId: "my-secret", version: "1" },
                expectedOutput: { message: "Version destroyed" }
            }
        ],
        errorCases: []
    }
];

// Compute Engine fixtures (10)
const computeEngineFixtures: TestFixture[] = [
    {
        operationId: "compute_engine_listInstances",
        provider: "google-cloud",
        validCases: [
            { name: "list", input: { zone: "us-central1-a" }, expectedOutput: { instances: [] } }
        ],
        errorCases: []
    },
    {
        operationId: "compute_engine_getInstance",
        provider: "google-cloud",
        validCases: [
            {
                name: "get",
                input: { zone: "us-central1-a", instanceName: "my-instance" },
                expectedOutput: { name: "my-instance" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "compute_engine_createInstance",
        provider: "google-cloud",
        validCases: [
            {
                name: "create",
                input: {
                    zone: "us-central1-a",
                    instanceName: "new-instance",
                    machineType: "n1-standard-1",
                    sourceImage: "projects/debian-cloud/global/images/debian-11"
                },
                expectedOutput: { instanceName: "new-instance" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "compute_engine_startInstance",
        provider: "google-cloud",
        validCases: [
            {
                name: "start",
                input: { zone: "us-central1-a", instanceName: "my-instance" },
                expectedOutput: { message: "Instance started" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "compute_engine_stopInstance",
        provider: "google-cloud",
        validCases: [
            {
                name: "stop",
                input: { zone: "us-central1-a", instanceName: "my-instance" },
                expectedOutput: { message: "Instance stopped" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "compute_engine_deleteInstance",
        provider: "google-cloud",
        validCases: [
            {
                name: "delete",
                input: { zone: "us-central1-a", instanceName: "my-instance" },
                expectedOutput: { message: "Instance deleted" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "compute_engine_resetInstance",
        provider: "google-cloud",
        validCases: [
            {
                name: "reset",
                input: { zone: "us-central1-a", instanceName: "my-instance" },
                expectedOutput: { message: "Instance reset" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "compute_engine_setInstanceMetadata",
        provider: "google-cloud",
        validCases: [
            {
                name: "set_metadata",
                input: {
                    zone: "us-central1-a",
                    instanceName: "my-instance",
                    metadata: { key: "value" },
                    fingerprint: "abc123"
                },
                expectedOutput: { message: "Metadata updated" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "compute_engine_addInstanceTags",
        provider: "google-cloud",
        validCases: [
            {
                name: "add_tags",
                input: {
                    zone: "us-central1-a",
                    instanceName: "my-instance",
                    tags: ["web", "prod"],
                    fingerprint: "abc123"
                },
                expectedOutput: { message: "Tags added" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "compute_engine_attachDisk",
        provider: "google-cloud",
        validCases: [
            {
                name: "attach",
                input: { zone: "us-central1-a", instanceName: "my-instance", diskName: "my-disk" },
                expectedOutput: { message: "Disk attached" }
            }
        ],
        errorCases: []
    }
];

// Cloud Run fixtures (10)
const cloudRunFixtures: TestFixture[] = [
    {
        operationId: "cloud_run_listServices",
        provider: "google-cloud",
        validCases: [
            { name: "list", input: { region: "us-central1" }, expectedOutput: { services: [] } }
        ],
        errorCases: []
    },
    {
        operationId: "cloud_run_getService",
        provider: "google-cloud",
        validCases: [
            {
                name: "get",
                input: { region: "us-central1", serviceName: "my-service" },
                expectedOutput: { name: "my-service" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "cloud_run_createService",
        provider: "google-cloud",
        validCases: [
            {
                name: "create",
                input: {
                    region: "us-central1",
                    serviceName: "new-service",
                    containerImage: "gcr.io/my-project/image:latest"
                },
                expectedOutput: { serviceName: "new-service" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "cloud_run_updateService",
        provider: "google-cloud",
        validCases: [
            {
                name: "update",
                input: {
                    region: "us-central1",
                    serviceName: "my-service",
                    containerImage: "gcr.io/my-project/image:v2"
                },
                expectedOutput: { serviceName: "my-service" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "cloud_run_deleteService",
        provider: "google-cloud",
        validCases: [
            {
                name: "delete",
                input: { region: "us-central1", serviceName: "my-service" },
                expectedOutput: { message: "Service deleted" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "cloud_run_listRevisions",
        provider: "google-cloud",
        validCases: [
            {
                name: "list",
                input: { region: "us-central1", serviceName: "my-service" },
                expectedOutput: { revisions: [] }
            }
        ],
        errorCases: []
    },
    {
        operationId: "cloud_run_getRevision",
        provider: "google-cloud",
        validCases: [
            {
                name: "get",
                input: {
                    region: "us-central1",
                    serviceName: "my-service",
                    revisionName: "my-service-001"
                },
                expectedOutput: { name: "my-service-001" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "cloud_run_deleteRevision",
        provider: "google-cloud",
        validCases: [
            {
                name: "delete",
                input: {
                    region: "us-central1",
                    serviceName: "my-service",
                    revisionName: "my-service-001"
                },
                expectedOutput: { message: "Revision deleted" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "cloud_run_updateTraffic",
        provider: "google-cloud",
        validCases: [
            {
                name: "update",
                input: {
                    region: "us-central1",
                    serviceName: "my-service",
                    traffic: [{ revision: "my-service-001", percent: 100 }]
                },
                expectedOutput: { message: "Traffic updated" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "cloud_run_getServiceUrl",
        provider: "google-cloud",
        validCases: [
            {
                name: "get_url",
                input: { region: "us-central1", serviceName: "my-service" },
                expectedOutput: { url: "https://my-service-abc123.run.app" }
            }
        ],
        errorCases: []
    }
];

export const googleCloudFixtures: TestFixture[] = [
    ...cloudBuildFixtures,
    ...secretManagerFixtures,
    ...computeEngineFixtures,
    ...cloudRunFixtures
];
