/**
 * AWS Multi-Service Client
 *
 * Unified client for AWS Lambda, CloudWatch, and ECS services.
 * Uses AWS Signature V4 authentication and handles service-specific endpoints.
 */

import { AWSBaseClient, type AWSClientConfig } from "../../../core/aws";

export interface AWSUnifiedClientConfig {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
}

/**
 * AWS Client for multiple services (Lambda, CloudWatch, ECS)
 *
 * This client can make requests to different AWS services by dynamically
 * constructing the appropriate service endpoint.
 */
export class AWSClient {
    private clients: Map<string, AWSBaseClient>;
    private config: AWSUnifiedClientConfig;

    constructor(config: AWSUnifiedClientConfig) {
        this.config = config;
        this.clients = new Map();
    }

    /**
     * Get or create a service-specific client
     */
    private getServiceClient(service: string): AWSBaseClient {
        if (!this.clients.has(service)) {
            const clientConfig: AWSClientConfig = {
                accessKeyId: this.config.accessKeyId,
                secretAccessKey: this.config.secretAccessKey,
                region: this.config.region,
                service,
                timeout: 60000
            };

            const client = new (class extends AWSBaseClient {
                constructor(config: AWSClientConfig) {
                    super(config);
                }
            })(clientConfig);

            this.clients.set(service, client);
        }

        return this.clients.get(service)!;
    }

    /**
     * Lambda client
     */
    get lambda(): AWSBaseClient {
        return this.getServiceClient("lambda");
    }

    /**
     * CloudWatch Logs client
     */
    get logs(): AWSBaseClient {
        return this.getServiceClient("logs");
    }

    /**
     * CloudWatch Monitoring client
     */
    get monitoring(): AWSBaseClient {
        return this.getServiceClient("monitoring");
    }

    /**
     * ECS client
     */
    get ecs(): AWSBaseClient {
        return this.getServiceClient("ecs");
    }

    /**
     * Get region
     */
    getRegion(): string {
        return this.config.region;
    }
}
