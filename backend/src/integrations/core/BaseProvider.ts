import crypto from "crypto";
import type {
    IProvider,
    OperationDefinition,
    OperationResult,
    MCPTool,
    AuthConfig,
    ProviderCapabilities,
    ExecutionContext,
    TriggerDefinition,
    WebhookConfig,
    WebhookRequestData,
    WebhookVerificationResult
} from "./types";
import type { ConnectionWithData, ConnectionMethod } from "../../storage/models/Connection";
import type { z } from "zod";

/**
 * Abstract base class for all providers
 *
 * Providers should extend this class and implement the required methods.
 * The base class handles operation registration and provides common utilities.
 */
export abstract class BaseProvider implements IProvider {
    abstract readonly name: string;
    abstract readonly displayName: string;
    abstract readonly authMethod: ConnectionMethod;
    abstract readonly capabilities: ProviderCapabilities;

    protected operations: Map<string, OperationDefinition> = new Map();
    protected triggers: TriggerDefinition[] = [];
    protected webhookConfig: WebhookConfig | null = null;

    /**
     * Get authentication configuration
     */
    abstract getAuthConfig(): AuthConfig;

    /**
     * Refresh credentials (optional, for OAuth)
     */
    refreshCredentials?(connection: ConnectionWithData): Promise<unknown>;

    /**
     * Execute operation via direct API
     */
    abstract executeOperation(
        operation: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        context: ExecutionContext
    ): Promise<OperationResult>;

    /**
     * Get MCP tools
     */
    abstract getMCPTools(): MCPTool[];

    /**
     * Execute MCP tool
     */
    abstract executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown>;

    /**
     * Register an operation
     */
    protected registerOperation(operation: OperationDefinition): void {
        this.operations.set(operation.id, operation);
    }

    /**
     * Get all operations
     */
    getOperations(): OperationDefinition[] {
        return Array.from(this.operations.values());
    }

    /**
     * Get operation schema by ID
     */
    getOperationSchema(operationId: string): z.ZodSchema | null {
        const operation = this.operations.get(operationId);
        return operation ? operation.inputSchema : null;
    }

    /**
     * Get operation by ID
     */
    protected getOperation(operationId: string): OperationDefinition | null {
        return this.operations.get(operationId) || null;
    }

    /**
     * Validate operation parameters
     */
    protected validateParams<T = Record<string, unknown>>(
        operationId: string,
        params: Record<string, unknown>
    ): T {
        const operation = this.getOperation(operationId);
        if (!operation) {
            throw new Error(`Operation ${operationId} not found in provider ${this.name}`);
        }

        try {
            return operation.inputSchema.parse(params) as T;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Invalid parameters for ${operationId}: ${error.message}`);
            }
            throw error;
        }
    }

    // =========================================================================
    // TRIGGER METHODS
    // =========================================================================

    /**
     * Register a trigger definition
     */
    protected registerTrigger(trigger: TriggerDefinition): void {
        this.triggers.push(trigger);
    }

    /**
     * Set webhook configuration
     */
    protected setWebhookConfig(config: WebhookConfig): void {
        this.webhookConfig = config;
    }

    /**
     * Get all triggers for this provider
     */
    getTriggers(): TriggerDefinition[] {
        return this.triggers;
    }

    /**
     * Get webhook configuration
     */
    getWebhookConfig(): WebhookConfig | null {
        return this.webhookConfig;
    }

    /**
     * Verify webhook signature
     * Override in provider subclass for custom verification logic
     */
    verifyWebhookSignature(secret: string, request: WebhookRequestData): WebhookVerificationResult {
        if (!this.webhookConfig) {
            return { valid: true }; // No webhook config means no verification needed
        }

        if (this.webhookConfig.signatureType === "none") {
            return { valid: true };
        }

        const signatureHeader = this.webhookConfig.signatureHeader;
        if (!signatureHeader) {
            return { valid: true };
        }

        const signature = this.getHeader(request.headers, signatureHeader);
        if (!signature) {
            return { valid: false, error: `Missing signature header: ${signatureHeader}` };
        }

        const bodyString = this.getBodyString(request);

        switch (this.webhookConfig.signatureType) {
            case "hmac_sha256":
                return this.verifyHmacSha256(signature, bodyString, secret);
            case "hmac_sha1":
                return this.verifyHmacSha1(signature, bodyString, secret);
            case "bearer_token":
                return this.verifyBearerToken(signature, secret);
            case "timestamp_signature":
                return this.verifyTimestampSignature(request, bodyString, secret);
            default:
                return {
                    valid: false,
                    error: `Unknown signature type: ${this.webhookConfig.signatureType}`
                };
        }
    }

    /**
     * Extract event type from webhook request
     * Override in provider subclass for custom extraction logic
     */
    extractEventType(request: WebhookRequestData): string | undefined {
        if (!this.webhookConfig?.eventHeader) {
            return undefined;
        }
        return this.getHeader(request.headers, this.webhookConfig.eventHeader);
    }

    // =========================================================================
    // WEBHOOK VERIFICATION HELPERS
    // =========================================================================

    /**
     * Get header value (case-insensitive)
     */
    protected getHeader(
        headers: Record<string, string | string[] | undefined>,
        name: string
    ): string | undefined {
        // Try exact case first
        let value = headers[name];
        if (!value) {
            // Try lowercase
            const lowerName = name.toLowerCase();
            for (const [key, val] of Object.entries(headers)) {
                if (key.toLowerCase() === lowerName) {
                    value = val;
                    break;
                }
            }
        }
        return Array.isArray(value) ? value[0] : value;
    }

    /**
     * Get body as string
     */
    protected getBodyString(request: WebhookRequestData): string {
        if (request.rawBody) {
            return request.rawBody.toString("utf-8");
        }
        return typeof request.body === "string" ? request.body : request.body.toString("utf-8");
    }

    /**
     * Timing-safe string comparison
     */
    protected timingSafeEqual(a: string, b: string): boolean {
        if (a.length !== b.length) {
            return false;
        }
        return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    }

    /**
     * Verify HMAC-SHA256 signature
     */
    protected verifyHmacSha256(
        signature: string,
        body: string,
        secret: string
    ): WebhookVerificationResult {
        let actualSignature = signature;
        if (actualSignature.startsWith("sha256=")) {
            actualSignature = actualSignature.substring(7);
        }

        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(body, "utf-8");
        const computed = hmac.digest("hex");

        return {
            valid: this.timingSafeEqual(actualSignature.toLowerCase(), computed.toLowerCase())
        };
    }

    /**
     * Verify HMAC-SHA1 signature
     */
    protected verifyHmacSha1(
        signature: string,
        body: string,
        secret: string
    ): WebhookVerificationResult {
        let actualSignature = signature;
        if (actualSignature.startsWith("sha1=")) {
            actualSignature = actualSignature.substring(5);
        }

        const hmac = crypto.createHmac("sha1", secret);
        hmac.update(body, "utf-8");
        const computed = hmac.digest("hex");

        return {
            valid: this.timingSafeEqual(actualSignature.toLowerCase(), computed.toLowerCase())
        };
    }

    /**
     * Verify bearer token
     */
    protected verifyBearerToken(token: string, secret: string): WebhookVerificationResult {
        let actualToken = token;
        if (actualToken.startsWith("Bearer ")) {
            actualToken = actualToken.substring(7);
        }
        return { valid: this.timingSafeEqual(actualToken, secret) };
    }

    /**
     * Verify timestamp-based signature (override in provider for custom logic)
     */
    protected verifyTimestampSignature(
        _request: WebhookRequestData,
        _body: string,
        _secret: string
    ): WebhookVerificationResult {
        // Override in provider subclass (e.g., Slack)
        return { valid: false, error: "Timestamp signature verification not implemented" };
    }
}
