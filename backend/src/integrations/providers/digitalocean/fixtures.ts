/**
 * Test fixtures for DigitalOcean provider operations
 *
 * These fixtures are used for integration testing and validation
 */

import type { TestFixture } from "../../sandbox";

// ============================================
// Droplet Fixtures
// ============================================

const droplets_listDroplets: TestFixture = {
    operationId: "droplets_listDroplets",
    provider: "digitalocean",
    validCases: [
        {
            name: "list_all_droplets",
            description: "List all Droplets in account",
            input: {},
            expectedOutput: {
                droplets: [
                    {
                        id: 3164444,
                        name: "example.com",
                        status: "active"
                    }
                ]
            }
        }
    ],
    errorCases: []
};

const droplets_getDroplet: TestFixture = {
    operationId: "droplets_getDroplet",
    provider: "digitalocean",
    validCases: [
        {
            name: "get_droplet_details",
            description: "Get Droplet details by ID",
            input: { dropletId: 3164444 },
            expectedOutput: {
                id: 3164444,
                name: "example.com",
                status: "active"
            }
        }
    ],
    errorCases: []
};

const droplets_createDroplet: TestFixture = {
    operationId: "droplets_createDroplet",
    provider: "digitalocean",
    validCases: [
        {
            name: "create_basic_droplet",
            description: "Create a basic Droplet",
            input: {
                name: "my-droplet",
                region: "nyc1",
                size: "s-1vcpu-1gb",
                image: "ubuntu-22-04-x64"
            },
            expectedOutput: {
                id: 3164444,
                name: "my-droplet",
                status: "new"
            }
        }
    ],
    errorCases: []
};

const droplets_deleteDroplet: TestFixture = {
    operationId: "droplets_deleteDroplet",
    provider: "digitalocean",
    validCases: [
        {
            name: "delete_droplet",
            description: "Delete a Droplet",
            input: { dropletId: 3164444 },
            expectedOutput: {
                dropletId: 3164444,
                message: "Droplet deleted successfully"
            }
        }
    ],
    errorCases: []
};

const droplets_powerOnDroplet: TestFixture = {
    operationId: "droplets_powerOnDroplet",
    provider: "digitalocean",
    validCases: [
        {
            name: "power_on",
            description: "Power on a Droplet",
            input: { dropletId: 3164444 },
            expectedOutput: {
                dropletId: 3164444,
                actionType: "power_on"
            }
        }
    ],
    errorCases: []
};

const droplets_powerOffDroplet: TestFixture = {
    operationId: "droplets_powerOffDroplet",
    provider: "digitalocean",
    validCases: [
        {
            name: "power_off",
            description: "Power off a Droplet",
            input: { dropletId: 3164444 },
            expectedOutput: {
                dropletId: 3164444,
                actionType: "power_off"
            }
        }
    ],
    errorCases: []
};

const droplets_rebootDroplet: TestFixture = {
    operationId: "droplets_rebootDroplet",
    provider: "digitalocean",
    validCases: [
        {
            name: "reboot",
            description: "Reboot a Droplet",
            input: { dropletId: 3164444 },
            expectedOutput: {
                dropletId: 3164444,
                actionType: "reboot"
            }
        }
    ],
    errorCases: []
};

const droplets_resizeDroplet: TestFixture = {
    operationId: "droplets_resizeDroplet",
    provider: "digitalocean",
    validCases: [
        {
            name: "resize",
            description: "Resize a Droplet",
            input: { dropletId: 3164444, size: "s-2vcpu-2gb" },
            expectedOutput: {
                dropletId: 3164444,
                newSize: "s-2vcpu-2gb"
            }
        }
    ],
    errorCases: []
};

// ============================================
// Kubernetes Fixtures
// ============================================

const kubernetes_listClusters: TestFixture = {
    operationId: "kubernetes_listClusters",
    provider: "digitalocean",
    validCases: [
        {
            name: "list_all_clusters",
            description: "List all Kubernetes clusters",
            input: {},
            expectedOutput: {
                clusters: [
                    {
                        id: "bd5f5959-5e1e-4205-a714-a914373942af",
                        name: "prod-cluster-01"
                    }
                ]
            }
        }
    ],
    errorCases: []
};

const kubernetes_getCluster: TestFixture = {
    operationId: "kubernetes_getCluster",
    provider: "digitalocean",
    validCases: [
        {
            name: "get_cluster_details",
            description: "Get Kubernetes cluster details",
            input: { clusterId: "bd5f5959-5e1e-4205-a714-a914373942af" },
            expectedOutput: {
                id: "bd5f5959-5e1e-4205-a714-a914373942af",
                name: "prod-cluster-01"
            }
        }
    ],
    errorCases: []
};

const kubernetes_createCluster: TestFixture = {
    operationId: "kubernetes_createCluster",
    provider: "digitalocean",
    validCases: [
        {
            name: "create_cluster",
            description: "Create a Kubernetes cluster",
            input: {
                name: "prod-cluster",
                region: "nyc1",
                version: "1.28.2-do.0",
                node_pools: [{ name: "worker-pool", size: "s-2vcpu-2gb", count: 3 }]
            },
            expectedOutput: {
                id: "bd5f5959-5e1e-4205-a714-a914373942af",
                name: "prod-cluster"
            }
        }
    ],
    errorCases: []
};

const kubernetes_deleteCluster: TestFixture = {
    operationId: "kubernetes_deleteCluster",
    provider: "digitalocean",
    validCases: [
        {
            name: "delete_cluster",
            description: "Delete a Kubernetes cluster",
            input: { clusterId: "bd5f5959-5e1e-4205-a714-a914373942af" },
            expectedOutput: {
                clusterId: "bd5f5959-5e1e-4205-a714-a914373942af",
                message: "Kubernetes cluster deletion initiated"
            }
        }
    ],
    errorCases: []
};

const kubernetes_listNodePools: TestFixture = {
    operationId: "kubernetes_listNodePools",
    provider: "digitalocean",
    validCases: [
        {
            name: "list_node_pools",
            description: "List node pools in a cluster",
            input: { clusterId: "bd5f5959-5e1e-4205-a714-a914373942af" },
            expectedOutput: {
                nodePools: [{ id: "cdda885e-7e5f-4b7c-9df5-1c8c0ce70d15", name: "worker-pool" }]
            }
        }
    ],
    errorCases: []
};

const kubernetes_getNodePool: TestFixture = {
    operationId: "kubernetes_getNodePool",
    provider: "digitalocean",
    validCases: [
        {
            name: "get_node_pool",
            description: "Get node pool details",
            input: {
                clusterId: "bd5f5959-5e1e-4205-a714-a914373942af",
                nodePoolId: "cdda885e-7e5f-4b7c-9df5-1c8c0ce70d15"
            },
            expectedOutput: {
                id: "cdda885e-7e5f-4b7c-9df5-1c8c0ce70d15",
                name: "worker-pool"
            }
        }
    ],
    errorCases: []
};

const kubernetes_scaleNodePool: TestFixture = {
    operationId: "kubernetes_scaleNodePool",
    provider: "digitalocean",
    validCases: [
        {
            name: "scale_node_pool",
            description: "Scale a node pool",
            input: {
                clusterId: "bd5f5959-5e1e-4205-a714-a914373942af",
                nodePoolId: "cdda885e-7e5f-4b7c-9df5-1c8c0ce70d15",
                count: 5
            },
            expectedOutput: {
                id: "cdda885e-7e5f-4b7c-9df5-1c8c0ce70d15",
                count: 5
            }
        }
    ],
    errorCases: []
};

// ============================================
// Apps Fixtures
// ============================================

const apps_listApps: TestFixture = {
    operationId: "apps_listApps",
    provider: "digitalocean",
    validCases: [
        {
            name: "list_all_apps",
            description: "List all App Platform apps",
            input: {},
            expectedOutput: {
                apps: [{ id: "4f6c71e2-1e90-4762-9fee-6cc4a0a9f2cf", name: "my-app" }]
            }
        }
    ],
    errorCases: []
};

const apps_getApp: TestFixture = {
    operationId: "apps_getApp",
    provider: "digitalocean",
    validCases: [
        {
            name: "get_app_details",
            description: "Get App Platform app details",
            input: { appId: "4f6c71e2-1e90-4762-9fee-6cc4a0a9f2cf" },
            expectedOutput: {
                id: "4f6c71e2-1e90-4762-9fee-6cc4a0a9f2cf"
            }
        }
    ],
    errorCases: []
};

const apps_createDeployment: TestFixture = {
    operationId: "apps_createDeployment",
    provider: "digitalocean",
    validCases: [
        {
            name: "create_deployment",
            description: "Trigger a new deployment",
            input: { appId: "4f6c71e2-1e90-4762-9fee-6cc4a0a9f2cf" },
            expectedOutput: {
                appId: "4f6c71e2-1e90-4762-9fee-6cc4a0a9f2cf",
                message: "Deployment triggered successfully"
            }
        }
    ],
    errorCases: []
};

const apps_getDeploymentLogs: TestFixture = {
    operationId: "apps_getDeploymentLogs",
    provider: "digitalocean",
    validCases: [
        {
            name: "get_logs",
            description: "Get deployment logs",
            input: {
                appId: "4f6c71e2-1e90-4762-9fee-6cc4a0a9f2cf",
                deploymentId: "b6bdf840-2854-4f87-a36c-5f231c617c84",
                componentName: "web"
            },
            expectedOutput: {
                appId: "4f6c71e2-1e90-4762-9fee-6cc4a0a9f2cf"
            }
        }
    ],
    errorCases: []
};

const apps_rollbackDeployment: TestFixture = {
    operationId: "apps_rollbackDeployment",
    provider: "digitalocean",
    validCases: [
        {
            name: "rollback",
            description: "Rollback to previous deployment",
            input: {
                appId: "4f6c71e2-1e90-4762-9fee-6cc4a0a9f2cf",
                deploymentId: "b6bdf840-2854-4f87-a36c-5f231c617c84"
            },
            expectedOutput: {
                appId: "4f6c71e2-1e90-4762-9fee-6cc4a0a9f2cf",
                message: "Rollback initiated successfully"
            }
        }
    ],
    errorCases: []
};

// ============================================
// Database Fixtures
// ============================================

const databases_listDatabases: TestFixture = {
    operationId: "databases_listDatabases",
    provider: "digitalocean",
    validCases: [
        {
            name: "list_all_databases",
            description: "List all managed databases",
            input: {},
            expectedOutput: {
                databases: [
                    {
                        id: "9cc10173-e9ea-4176-9dbc-a4cee4c4ff30",
                        name: "backend-db",
                        engine: "pg"
                    }
                ]
            }
        }
    ],
    errorCases: []
};

const databases_getDatabase: TestFixture = {
    operationId: "databases_getDatabase",
    provider: "digitalocean",
    validCases: [
        {
            name: "get_database_details",
            description: "Get database cluster details",
            input: { databaseId: "9cc10173-e9ea-4176-9dbc-a4cee4c4ff30" },
            expectedOutput: {
                id: "9cc10173-e9ea-4176-9dbc-a4cee4c4ff30",
                name: "backend-db"
            }
        }
    ],
    errorCases: []
};

const databases_createDatabase: TestFixture = {
    operationId: "databases_createDatabase",
    provider: "digitalocean",
    validCases: [
        {
            name: "create_database",
            description: "Create a database cluster",
            input: {
                name: "backend-db",
                engine: "pg",
                region: "nyc1",
                size: "db-s-1vcpu-1gb",
                num_nodes: 1
            },
            expectedOutput: {
                id: "9cc10173-e9ea-4176-9dbc-a4cee4c4ff30",
                name: "backend-db"
            }
        }
    ],
    errorCases: []
};

const databases_listBackups: TestFixture = {
    operationId: "databases_listBackups",
    provider: "digitalocean",
    validCases: [
        {
            name: "list_backups",
            description: "List database backups",
            input: { databaseId: "9cc10173-e9ea-4176-9dbc-a4cee4c4ff30" },
            expectedOutput: {
                backups: [],
                databaseId: "9cc10173-e9ea-4176-9dbc-a4cee4c4ff30"
            }
        }
    ],
    errorCases: []
};

// ============================================
// Load Balancer Fixtures
// ============================================

const loadBalancers_listLoadBalancers: TestFixture = {
    operationId: "loadBalancers_listLoadBalancers",
    provider: "digitalocean",
    validCases: [
        {
            name: "list_all_load_balancers",
            description: "List all load balancers",
            input: {},
            expectedOutput: {
                loadBalancers: [
                    {
                        id: "4de7ac8b-495b-4884-9a69-1050c6793cd6",
                        name: "web-lb",
                        status: "active"
                    }
                ]
            }
        }
    ],
    errorCases: []
};

const loadBalancers_getLoadBalancer: TestFixture = {
    operationId: "loadBalancers_getLoadBalancer",
    provider: "digitalocean",
    validCases: [
        {
            name: "get_load_balancer_details",
            description: "Get load balancer details",
            input: { loadBalancerId: "4de7ac8b-495b-4884-9a69-1050c6793cd6" },
            expectedOutput: {
                id: "4de7ac8b-495b-4884-9a69-1050c6793cd6",
                name: "web-lb"
            }
        }
    ],
    errorCases: []
};

const loadBalancers_createLoadBalancer: TestFixture = {
    operationId: "loadBalancers_createLoadBalancer",
    provider: "digitalocean",
    validCases: [
        {
            name: "create_load_balancer",
            description: "Create a load balancer",
            input: {
                name: "web-lb",
                region: "nyc1",
                forwarding_rules: [
                    {
                        entry_protocol: "http",
                        entry_port: 80,
                        target_protocol: "http",
                        target_port: 8080
                    }
                ]
            },
            expectedOutput: {
                id: "4de7ac8b-495b-4884-9a69-1050c6793cd6",
                name: "web-lb"
            }
        }
    ],
    errorCases: []
};

const loadBalancers_deleteLoadBalancer: TestFixture = {
    operationId: "loadBalancers_deleteLoadBalancer",
    provider: "digitalocean",
    validCases: [
        {
            name: "delete_load_balancer",
            description: "Delete a load balancer",
            input: { loadBalancerId: "4de7ac8b-495b-4884-9a69-1050c6793cd6" },
            expectedOutput: {
                loadBalancerId: "4de7ac8b-495b-4884-9a69-1050c6793cd6",
                message: "Load balancer deleted successfully"
            }
        }
    ],
    errorCases: []
};

/**
 * Export all DigitalOcean fixtures as an array
 */
export const digitaloceanFixtures: TestFixture[] = [
    // Droplets
    droplets_listDroplets,
    droplets_getDroplet,
    droplets_createDroplet,
    droplets_deleteDroplet,
    droplets_powerOnDroplet,
    droplets_powerOffDroplet,
    droplets_rebootDroplet,
    droplets_resizeDroplet,
    // Kubernetes
    kubernetes_listClusters,
    kubernetes_getCluster,
    kubernetes_createCluster,
    kubernetes_deleteCluster,
    kubernetes_listNodePools,
    kubernetes_getNodePool,
    kubernetes_scaleNodePool,
    // Apps
    apps_listApps,
    apps_getApp,
    apps_createDeployment,
    apps_getDeploymentLogs,
    apps_rollbackDeployment,
    // Databases
    databases_listDatabases,
    databases_getDatabase,
    databases_createDatabase,
    databases_listBackups,
    // Load Balancers
    loadBalancers_listLoadBalancers,
    loadBalancers_getLoadBalancer,
    loadBalancers_createLoadBalancer,
    loadBalancers_deleteLoadBalancer
];
