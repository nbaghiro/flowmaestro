/**
 * DigitalOcean HTTP Client
 *
 * Handles all HTTP communication with DigitalOcean API.
 * Uses OAuth2 Bearer token authentication.
 *
 * Base URL: https://api.digitalocean.com/v2/
 *
 * Rate limit: 5000 requests/hour (~83/minute)
 */

import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface DigitalOceanClientConfig {
    accessToken: string;
}

// ============================================
// DigitalOcean API Types
// ============================================

export interface DigitalOceanDroplet {
    id: number;
    name: string;
    memory: number;
    vcpus: number;
    disk: number;
    locked: boolean;
    status: "new" | "active" | "off" | "archive";
    kernel: {
        id: number;
        name: string;
        version: string;
    } | null;
    created_at: string;
    features: string[];
    backup_ids: number[];
    next_backup_window: { start: string; end: string } | null;
    snapshot_ids: number[];
    image: {
        id: number;
        name: string;
        distribution: string;
        slug: string | null;
        public: boolean;
        regions: string[];
        min_disk_size: number;
        type: "base" | "snapshot" | "backup" | "custom";
        created_at: string;
    };
    volume_ids: string[];
    size: {
        slug: string;
        memory: number;
        vcpus: number;
        disk: number;
        transfer: number;
        price_monthly: number;
        price_hourly: number;
        regions: string[];
        available: boolean;
    };
    size_slug: string;
    networks: {
        v4: Array<{
            ip_address: string;
            netmask: string;
            gateway: string;
            type: "public" | "private";
        }>;
        v6: Array<{
            ip_address: string;
            netmask: number;
            gateway: string;
            type: "public" | "private";
        }>;
    };
    region: {
        name: string;
        slug: string;
        features: string[];
        available: boolean;
        sizes: string[];
    };
    tags: string[];
    vpc_uuid: string;
}

export interface DigitalOceanKubernetesCluster {
    id: string;
    name: string;
    region: string;
    version: string;
    cluster_subnet: string;
    service_subnet: string;
    vpc_uuid: string;
    ipv4: string;
    endpoint: string;
    tags: string[];
    node_pools: DigitalOceanNodePool[];
    maintenance_policy: {
        start_time: string;
        day: string;
    };
    auto_upgrade: boolean;
    status: {
        state:
            | "running"
            | "provisioning"
            | "degraded"
            | "error"
            | "deleted"
            | "upgrading"
            | "deleting";
        message?: string;
    };
    created_at: string;
    updated_at: string;
    surge_upgrade: boolean;
    ha: boolean;
    registry_enabled: boolean;
}

export interface DigitalOceanNodePool {
    id: string;
    name: string;
    size: string;
    count: number;
    tags: string[];
    labels: Record<string, string>;
    taints: Array<{
        key: string;
        value: string;
        effect: "NoSchedule" | "PreferNoSchedule" | "NoExecute";
    }>;
    auto_scale: boolean;
    min_nodes: number;
    max_nodes: number;
    nodes: Array<{
        id: string;
        name: string;
        status: {
            state: "provisioning" | "running" | "draining" | "deleting";
        };
        droplet_id: string;
        created_at: string;
        updated_at: string;
    }>;
}

export interface DigitalOceanApp {
    id: string;
    owner_uuid: string;
    spec: {
        name: string;
        region: string;
        services?: Array<{
            name: string;
            github?: { repo: string; branch: string };
            gitlab?: { repo: string; branch: string };
            image?: { registry_type: string; registry: string; repository: string; tag: string };
            dockerfile_path?: string;
            build_command?: string;
            run_command?: string;
            instance_count: number;
            instance_size_slug: string;
            http_port?: number;
            routes?: Array<{ path: string }>;
            envs?: Array<{ key: string; value: string; type: string }>;
        }>;
        static_sites?: Array<{
            name: string;
            github?: { repo: string; branch: string };
            gitlab?: { repo: string; branch: string };
            build_command?: string;
            output_dir?: string;
            routes?: Array<{ path: string }>;
            envs?: Array<{ key: string; value: string; type: string }>;
        }>;
        workers?: Array<{
            name: string;
            github?: { repo: string; branch: string };
            gitlab?: { repo: string; branch: string };
            dockerfile_path?: string;
            build_command?: string;
            run_command?: string;
            instance_count: number;
            instance_size_slug: string;
            envs?: Array<{ key: string; value: string; type: string }>;
        }>;
        databases?: Array<{
            name: string;
            engine: string;
            version?: string;
            size?: string;
            num_nodes?: number;
        }>;
    };
    default_ingress: string;
    created_at: string;
    updated_at: string;
    active_deployment?: DigitalOceanDeployment;
    in_progress_deployment?: DigitalOceanDeployment;
    last_deployment_created_at?: string;
    live_url?: string;
    live_url_base?: string;
    live_domain?: string;
    tier_slug: string;
    region: {
        slug: string;
        label: string;
        flag: string;
        continent: string;
        data_centers: string[];
        default: boolean;
    };
}

export interface DigitalOceanDeployment {
    id: string;
    spec: DigitalOceanApp["spec"];
    services?: Array<{
        name: string;
        source_commit_hash?: string;
    }>;
    static_sites?: Array<{
        name: string;
        source_commit_hash?: string;
    }>;
    workers?: Array<{
        name: string;
        source_commit_hash?: string;
    }>;
    phase:
        | "UNKNOWN"
        | "PENDING_BUILD"
        | "BUILDING"
        | "PENDING_DEPLOY"
        | "DEPLOYING"
        | "ACTIVE"
        | "SUPERSEDED"
        | "ERROR"
        | "CANCELED";
    phase_last_updated_at: string;
    created_at: string;
    updated_at: string;
    cause: string;
    cloned_from?: string;
    progress: {
        pending_steps: number;
        running_steps: number;
        success_steps: number;
        error_steps: number;
        total_steps: number;
        steps: Array<{
            name: string;
            status: "UNKNOWN" | "PENDING" | "RUNNING" | "ERROR" | "SUCCESS";
            started_at?: string;
            ended_at?: string;
            reason?: { code: string; message: string };
        }>;
    };
}

export interface DigitalOceanDatabase {
    id: string;
    name: string;
    engine: "pg" | "mysql" | "redis" | "mongodb" | "kafka";
    version: string;
    num_nodes: number;
    size: string;
    region: string;
    status: "creating" | "online" | "resizing" | "migrating" | "forking";
    created_at: string;
    private_network_uuid: string;
    tags: string[];
    db_names: string[];
    connection: {
        protocol: string;
        uri: string;
        database: string;
        host: string;
        port: number;
        user: string;
        password: string;
        ssl: boolean;
    };
    private_connection: {
        protocol: string;
        uri: string;
        database: string;
        host: string;
        port: number;
        user: string;
        password: string;
        ssl: boolean;
    };
    maintenance_window: {
        day: string;
        hour: string;
        pending: boolean;
        description: string[];
    };
}

export interface DigitalOceanDatabaseBackup {
    created_at: string;
    size_gigabytes: number;
}

export interface DigitalOceanLoadBalancer {
    id: string;
    name: string;
    ip: string;
    algorithm: "round_robin" | "least_connections";
    status: "new" | "active" | "errored";
    created_at: string;
    forwarding_rules: Array<{
        entry_protocol: "http" | "https" | "http2" | "http3" | "tcp" | "udp";
        entry_port: number;
        target_protocol: "http" | "https" | "http2" | "tcp" | "udp";
        target_port: number;
        certificate_id?: string;
        tls_passthrough?: boolean;
    }>;
    health_check: {
        protocol: "http" | "https" | "tcp";
        port: number;
        path: string;
        check_interval_seconds: number;
        response_timeout_seconds: number;
        unhealthy_threshold: number;
        healthy_threshold: number;
    };
    sticky_sessions: {
        type: "none" | "cookies";
        cookie_name?: string;
        cookie_ttl_seconds?: number;
    };
    region: {
        name: string;
        slug: string;
        features: string[];
        available: boolean;
        sizes: string[];
    };
    tag: string;
    droplet_ids: number[];
    redirect_http_to_https: boolean;
    enable_proxy_protocol: boolean;
    enable_backend_keepalive: boolean;
    vpc_uuid: string;
    disable_lets_encrypt_dns_records: boolean;
    project_id: string;
    http_idle_timeout_seconds: number;
    firewall?: {
        deny: string[];
        allow: string[];
    };
}

interface DigitalOceanResponse<T> {
    [key: string]: T | unknown;
}

interface DigitalOceanErrorResponse {
    id: string;
    message: string;
    request_id?: string;
}

interface DigitalOceanMeta {
    total?: number;
}

interface DigitalOceanLinks {
    pages?: {
        first?: string;
        prev?: string;
        next?: string;
        last?: string;
    };
}

export class DigitalOceanClient extends BaseAPIClient {
    constructor(config: DigitalOceanClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.digitalocean.com/v2",
            timeout: 60000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"],
                backoffStrategy: "exponential",
                initialDelay: 1000,
                maxDelay: 30000
            },
            connectionPool: {
                keepAlive: true,
                maxSockets: 50,
                maxFreeSockets: 10,
                keepAliveMsecs: 60000
            }
        };

        super(clientConfig);

        // Add authorization header using Bearer token
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${config.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Handle DigitalOcean-specific errors
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as DigitalOceanErrorResponse;

            if (data?.message) {
                throw new Error(`DigitalOcean API error: ${data.message}`);
            }

            if (error.response.status === 401) {
                throw new Error(
                    "DigitalOcean authentication failed. Please check your access token."
                );
            }

            if (error.response.status === 403) {
                throw new Error(
                    "DigitalOcean permission denied. Your token may not have access to this resource."
                );
            }

            if (error.response.status === 404) {
                throw new Error("Resource not found in DigitalOcean.");
            }

            if (error.response.status === 429) {
                throw new Error("DigitalOcean rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Droplet Operations
    // ============================================

    /**
     * List all droplets
     */
    async listDroplets(params?: { page?: number; per_page?: number; tag_name?: string }): Promise<{
        droplets: DigitalOceanDroplet[];
        meta?: DigitalOceanMeta;
        links?: DigitalOceanLinks;
    }> {
        const response = await this.get<
            DigitalOceanResponse<DigitalOceanDroplet[]> & {
                meta?: DigitalOceanMeta;
                links?: DigitalOceanLinks;
            }
        >("/droplets", params);
        return {
            droplets: (response.droplets as DigitalOceanDroplet[]) || [],
            meta: response.meta,
            links: response.links
        };
    }

    /**
     * Get a specific droplet
     */
    async getDroplet(dropletId: number): Promise<DigitalOceanDroplet> {
        const response = await this.get<DigitalOceanResponse<{ droplet: DigitalOceanDroplet }>>(
            `/droplets/${dropletId}`
        );
        return response.droplet as DigitalOceanDroplet;
    }

    /**
     * Create a droplet
     */
    async createDroplet(params: {
        name: string;
        region: string;
        size: string;
        image: string | number;
        ssh_keys?: (string | number)[];
        backups?: boolean;
        ipv6?: boolean;
        vpc_uuid?: string;
        user_data?: string;
        monitoring?: boolean;
        volumes?: string[];
        tags?: string[];
    }): Promise<DigitalOceanDroplet> {
        const response = await this.post<DigitalOceanResponse<{ droplet: DigitalOceanDroplet }>>(
            "/droplets",
            params
        );
        return response.droplet as DigitalOceanDroplet;
    }

    /**
     * Delete a droplet
     */
    async deleteDroplet(dropletId: number): Promise<void> {
        await this.delete<void>(`/droplets/${dropletId}`);
    }

    /**
     * Perform droplet action
     */
    async performDropletAction(
        dropletId: number,
        action: { type: string; [key: string]: unknown }
    ): Promise<{ action: { id: number; status: string; type: string; started_at: string } }> {
        const response = await this.post<{
            action: { id: number; status: string; type: string; started_at: string };
        }>(`/droplets/${dropletId}/actions`, action);
        return response;
    }

    // ============================================
    // Kubernetes Operations
    // ============================================

    /**
     * List Kubernetes clusters
     */
    async listKubernetesClusters(params?: { page?: number; per_page?: number }): Promise<{
        kubernetes_clusters: DigitalOceanKubernetesCluster[];
        meta?: DigitalOceanMeta;
        links?: DigitalOceanLinks;
    }> {
        const response = await this.get<
            DigitalOceanResponse<DigitalOceanKubernetesCluster[]> & {
                meta?: DigitalOceanMeta;
                links?: DigitalOceanLinks;
            }
        >("/kubernetes/clusters", params);
        return {
            kubernetes_clusters:
                (response.kubernetes_clusters as DigitalOceanKubernetesCluster[]) || [],
            meta: response.meta,
            links: response.links
        };
    }

    /**
     * Get a specific Kubernetes cluster
     */
    async getKubernetesCluster(clusterId: string): Promise<DigitalOceanKubernetesCluster> {
        const response = await this.get<
            DigitalOceanResponse<{ kubernetes_cluster: DigitalOceanKubernetesCluster }>
        >(`/kubernetes/clusters/${clusterId}`);
        return response.kubernetes_cluster as DigitalOceanKubernetesCluster;
    }

    /**
     * Create a Kubernetes cluster
     */
    async createKubernetesCluster(params: {
        name: string;
        region: string;
        version: string;
        node_pools: Array<{
            name: string;
            size: string;
            count: number;
            tags?: string[];
            auto_scale?: boolean;
            min_nodes?: number;
            max_nodes?: number;
        }>;
        vpc_uuid?: string;
        tags?: string[];
        ha?: boolean;
        surge_upgrade?: boolean;
        auto_upgrade?: boolean;
    }): Promise<DigitalOceanKubernetesCluster> {
        const response = await this.post<
            DigitalOceanResponse<{ kubernetes_cluster: DigitalOceanKubernetesCluster }>
        >("/kubernetes/clusters", params);
        return response.kubernetes_cluster as DigitalOceanKubernetesCluster;
    }

    /**
     * Delete a Kubernetes cluster
     */
    async deleteKubernetesCluster(clusterId: string): Promise<void> {
        await this.delete<void>(`/kubernetes/clusters/${clusterId}`);
    }

    /**
     * List node pools
     */
    async listNodePools(clusterId: string): Promise<{ node_pools: DigitalOceanNodePool[] }> {
        const response = await this.get<
            DigitalOceanResponse<{ node_pools: DigitalOceanNodePool[] }>
        >(`/kubernetes/clusters/${clusterId}/node_pools`);
        return { node_pools: (response.node_pools as DigitalOceanNodePool[]) || [] };
    }

    /**
     * Get a specific node pool
     */
    async getNodePool(clusterId: string, nodePoolId: string): Promise<DigitalOceanNodePool> {
        const response = await this.get<DigitalOceanResponse<{ node_pool: DigitalOceanNodePool }>>(
            `/kubernetes/clusters/${clusterId}/node_pools/${nodePoolId}`
        );
        return response.node_pool as DigitalOceanNodePool;
    }

    /**
     * Update node pool (scale)
     */
    async updateNodePool(
        clusterId: string,
        nodePoolId: string,
        params: {
            name?: string;
            count?: number;
            auto_scale?: boolean;
            min_nodes?: number;
            max_nodes?: number;
            tags?: string[];
        }
    ): Promise<DigitalOceanNodePool> {
        const response = await this.put<DigitalOceanResponse<{ node_pool: DigitalOceanNodePool }>>(
            `/kubernetes/clusters/${clusterId}/node_pools/${nodePoolId}`,
            params
        );
        return response.node_pool as DigitalOceanNodePool;
    }

    // ============================================
    // App Platform Operations
    // ============================================

    /**
     * List apps
     */
    async listApps(params?: {
        page?: number;
        per_page?: number;
    }): Promise<{ apps: DigitalOceanApp[]; meta?: DigitalOceanMeta; links?: DigitalOceanLinks }> {
        const response = await this.get<
            DigitalOceanResponse<DigitalOceanApp[]> & {
                meta?: DigitalOceanMeta;
                links?: DigitalOceanLinks;
            }
        >("/apps", params);
        return {
            apps: (response.apps as DigitalOceanApp[]) || [],
            meta: response.meta,
            links: response.links
        };
    }

    /**
     * Get a specific app
     */
    async getApp(appId: string): Promise<DigitalOceanApp> {
        const response = await this.get<DigitalOceanResponse<{ app: DigitalOceanApp }>>(
            `/apps/${appId}`
        );
        return response.app as DigitalOceanApp;
    }

    /**
     * Create a deployment
     */
    async createDeployment(
        appId: string,
        params?: {
            force_build?: boolean;
        }
    ): Promise<DigitalOceanDeployment> {
        const response = await this.post<
            DigitalOceanResponse<{ deployment: DigitalOceanDeployment }>
        >(`/apps/${appId}/deployments`, params || {});
        return response.deployment as DigitalOceanDeployment;
    }

    /**
     * Get deployment logs
     */
    async getDeploymentLogs(
        appId: string,
        deploymentId: string,
        componentName: string,
        params?: {
            type?: "BUILD" | "DEPLOY" | "RUN";
            follow?: boolean;
            pod_connection_timeout?: string;
        }
    ): Promise<{ live_url?: string; url?: string; historic_urls?: string[] }> {
        const response = await this.get<{
            live_url?: string;
            url?: string;
            historic_urls?: string[];
        }>(`/apps/${appId}/deployments/${deploymentId}/components/${componentName}/logs`, params);
        return response;
    }

    /**
     * Rollback to a previous deployment
     */
    async rollbackDeployment(appId: string, deploymentId: string): Promise<DigitalOceanDeployment> {
        const response = await this.post<
            DigitalOceanResponse<{ deployment: DigitalOceanDeployment }>
        >(`/apps/${appId}/rollback`, { deployment_id: deploymentId });
        return response.deployment as DigitalOceanDeployment;
    }

    // ============================================
    // Database Operations
    // ============================================

    /**
     * List databases
     */
    async listDatabases(params?: { page?: number; per_page?: number; tag_name?: string }): Promise<{
        databases: DigitalOceanDatabase[];
        meta?: DigitalOceanMeta;
        links?: DigitalOceanLinks;
    }> {
        const response = await this.get<
            DigitalOceanResponse<DigitalOceanDatabase[]> & {
                meta?: DigitalOceanMeta;
                links?: DigitalOceanLinks;
            }
        >("/databases", params);
        return {
            databases: (response.databases as DigitalOceanDatabase[]) || [],
            meta: response.meta,
            links: response.links
        };
    }

    /**
     * Get a specific database
     */
    async getDatabase(databaseId: string): Promise<DigitalOceanDatabase> {
        const response = await this.get<DigitalOceanResponse<{ database: DigitalOceanDatabase }>>(
            `/databases/${databaseId}`
        );
        return response.database as DigitalOceanDatabase;
    }

    /**
     * Create a database cluster
     */
    async createDatabase(params: {
        name: string;
        engine: "pg" | "mysql" | "redis" | "mongodb" | "kafka";
        version?: string;
        region: string;
        size: string;
        num_nodes: number;
        tags?: string[];
        private_network_uuid?: string;
    }): Promise<DigitalOceanDatabase> {
        const response = await this.post<DigitalOceanResponse<{ database: DigitalOceanDatabase }>>(
            "/databases",
            params
        );
        return response.database as DigitalOceanDatabase;
    }

    /**
     * List database backups
     */
    async listDatabaseBackups(
        databaseId: string
    ): Promise<{ backups: DigitalOceanDatabaseBackup[] }> {
        const response = await this.get<
            DigitalOceanResponse<{ backups: DigitalOceanDatabaseBackup[] }>
        >(`/databases/${databaseId}/backups`);
        return { backups: (response.backups as DigitalOceanDatabaseBackup[]) || [] };
    }

    // ============================================
    // Load Balancer Operations
    // ============================================

    /**
     * List load balancers
     */
    async listLoadBalancers(params?: { page?: number; per_page?: number }): Promise<{
        load_balancers: DigitalOceanLoadBalancer[];
        meta?: DigitalOceanMeta;
        links?: DigitalOceanLinks;
    }> {
        const response = await this.get<
            DigitalOceanResponse<DigitalOceanLoadBalancer[]> & {
                meta?: DigitalOceanMeta;
                links?: DigitalOceanLinks;
            }
        >("/load_balancers", params);
        return {
            load_balancers: (response.load_balancers as DigitalOceanLoadBalancer[]) || [],
            meta: response.meta,
            links: response.links
        };
    }

    /**
     * Get a specific load balancer
     */
    async getLoadBalancer(loadBalancerId: string): Promise<DigitalOceanLoadBalancer> {
        const response = await this.get<
            DigitalOceanResponse<{ load_balancer: DigitalOceanLoadBalancer }>
        >(`/load_balancers/${loadBalancerId}`);
        return response.load_balancer as DigitalOceanLoadBalancer;
    }

    /**
     * Create a load balancer
     */
    async createLoadBalancer(params: {
        name: string;
        region: string;
        forwarding_rules: Array<{
            entry_protocol: "http" | "https" | "http2" | "http3" | "tcp" | "udp";
            entry_port: number;
            target_protocol: "http" | "https" | "http2" | "tcp" | "udp";
            target_port: number;
            certificate_id?: string;
            tls_passthrough?: boolean;
        }>;
        health_check?: {
            protocol?: "http" | "https" | "tcp";
            port?: number;
            path?: string;
            check_interval_seconds?: number;
            response_timeout_seconds?: number;
            unhealthy_threshold?: number;
            healthy_threshold?: number;
        };
        sticky_sessions?: {
            type?: "none" | "cookies";
            cookie_name?: string;
            cookie_ttl_seconds?: number;
        };
        droplet_ids?: number[];
        tag?: string;
        redirect_http_to_https?: boolean;
        enable_proxy_protocol?: boolean;
        enable_backend_keepalive?: boolean;
        vpc_uuid?: string;
        project_id?: string;
        http_idle_timeout_seconds?: number;
        firewall?: {
            deny?: string[];
            allow?: string[];
        };
        algorithm?: "round_robin" | "least_connections";
    }): Promise<DigitalOceanLoadBalancer> {
        const response = await this.post<
            DigitalOceanResponse<{ load_balancer: DigitalOceanLoadBalancer }>
        >("/load_balancers", params);
        return response.load_balancer as DigitalOceanLoadBalancer;
    }

    /**
     * Delete a load balancer
     */
    async deleteLoadBalancer(loadBalancerId: string): Promise<void> {
        await this.delete<void>(`/load_balancers/${loadBalancerId}`);
    }
}
