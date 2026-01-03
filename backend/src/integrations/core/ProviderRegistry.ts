import { getLogger } from "../../core/logging";
import type {
    IProvider,
    ProviderRegistryEntry,
    ProviderSummary,
    TriggerProviderSummary,
    TriggerSummary,
    TriggerProviderCategory,
    TriggerConfigField,
    WebhookRequestData,
    WebhookVerificationResult
} from "./types";

const logger = getLogger();

/**
 * Provider Registry - manages provider instances and lazy loading
 */
export class ProviderRegistry {
    private providers: Map<string, IProvider> = new Map();
    private registry: Map<string, ProviderRegistryEntry> = new Map();

    /**
     * Register a provider
     */
    register(entry: ProviderRegistryEntry): void {
        this.registry.set(entry.name, entry);
    }

    /**
     * Load provider (lazy loading)
     */
    async loadProvider(name: string): Promise<IProvider> {
        // Return cached instance if already loaded
        if (this.providers.has(name)) {
            return this.providers.get(name)!;
        }

        // Get registry entry
        const entry = this.registry.get(name);
        if (!entry) {
            throw new Error(`Provider ${name} not found in registry`);
        }

        // Load provider
        try {
            const provider = await entry.loader();
            this.providers.set(name, provider);
            return provider;
        } catch (error) {
            logger.error(
                { component: "ProviderRegistry", providerName: name, err: error },
                "Failed to load provider"
            );
            throw new Error(
                `Failed to load provider ${name}: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    /**
     * Get provider (throws if not loaded)
     */
    getProvider(name: string): IProvider {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new Error(`Provider ${name} not loaded. Call loadProvider() first.`);
        }
        return provider;
    }

    /**
     * Check if provider is loaded
     */
    isLoaded(name: string): boolean {
        return this.providers.has(name);
    }

    /**
     * Get all registered provider names
     */
    getRegisteredProviders(): string[] {
        return Array.from(this.registry.keys());
    }

    /**
     * Get provider summaries (for API responses)
     */
    async getProviderSummaries(): Promise<ProviderSummary[]> {
        const summaries: ProviderSummary[] = [];

        for (const [name, entry] of this.registry.entries()) {
            // Load provider if not already loaded
            const provider = await this.loadProvider(name);

            // Include trigger info if provider supports webhooks
            const triggers = provider.getTriggers?.() || [];
            const webhookConfig = provider.getWebhookConfig?.() || undefined;

            summaries.push({
                name: provider.name,
                displayName: provider.displayName,
                authMethod: provider.authMethod,
                category: entry.category,
                operationCount: provider.getOperations().length,
                capabilities: provider.capabilities,
                triggers: triggers.length > 0 ? triggers : undefined,
                webhookConfig: webhookConfig || undefined
            });
        }

        return summaries;
    }

    /**
     * Get providers that support triggers (webhooks)
     */
    async getTriggerProviders(): Promise<TriggerProviderSummary[]> {
        const triggerProviders: TriggerProviderSummary[] = [];

        for (const [name, entry] of this.registry.entries()) {
            const provider = await this.loadProvider(name);

            // Only include providers with triggers
            const triggers = provider.getTriggers?.();
            const webhookConfig = provider.getWebhookConfig?.();

            if (!triggers || triggers.length === 0) {
                continue;
            }

            // Map triggers to summaries
            const triggerSummaries: TriggerSummary[] = triggers.map((t) => ({
                id: t.id,
                name: t.name,
                description: t.description,
                configFields: t.configFields,
                tags: t.tags
            }));

            triggerProviders.push({
                providerId: provider.name,
                name: provider.displayName,
                description: `Trigger workflows from ${provider.displayName} events`,
                icon: provider.name, // Use provider name as icon reference
                category: (entry.category as TriggerProviderCategory) || "productivity",
                triggers: triggerSummaries,
                webhookConfig: webhookConfig || {
                    setupType: "manual",
                    signatureType: "none"
                },
                requiresConnection: true, // All providers require authentication
                enabled: true
            });
        }

        return triggerProviders;
    }

    /**
     * Get trigger provider by ID
     */
    async getTriggerProvider(providerId: string): Promise<TriggerProviderSummary | undefined> {
        const entry = this.registry.get(providerId);
        if (!entry) {
            return undefined;
        }

        const provider = await this.loadProvider(providerId);
        const triggers = provider.getTriggers?.();
        const webhookConfig = provider.getWebhookConfig?.();

        if (!triggers || triggers.length === 0) {
            return undefined;
        }

        const triggerSummaries: TriggerSummary[] = triggers.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            configFields: t.configFields,
            tags: t.tags
        }));

        return {
            providerId: provider.name,
            name: provider.displayName,
            description: `Trigger workflows from ${provider.displayName} events`,
            icon: provider.name,
            category: (entry.category as TriggerProviderCategory) || "productivity",
            triggers: triggerSummaries,
            webhookConfig: webhookConfig || {
                setupType: "manual",
                signatureType: "none"
            },
            requiresConnection: true, // All providers require authentication
            enabled: true
        };
    }

    /**
     * Get trigger providers by category
     */
    async getTriggerProvidersByCategory(
        category: TriggerProviderCategory
    ): Promise<TriggerProviderSummary[]> {
        const allProviders = await this.getTriggerProviders();
        return allProviders.filter((p) => p.category === category);
    }

    /**
     * Clear loaded providers (for testing)
     */
    clear(): void {
        this.providers.clear();
    }

    // ========================================================================
    // Webhook Utility Methods
    // ========================================================================

    /**
     * Get a specific trigger event by provider and event ID
     */
    async getTriggerEvent(
        providerId: string,
        eventId: string
    ): Promise<TriggerSummary | undefined> {
        const provider = await this.getTriggerProvider(providerId);
        return provider?.triggers.find((t) => t.id === eventId);
    }

    /**
     * Get trigger config fields for a specific event
     */
    async getTriggerConfigFields(
        providerId: string,
        eventId: string
    ): Promise<TriggerConfigField[] | undefined> {
        const event = await this.getTriggerEvent(providerId, eventId);
        return event?.configFields;
    }

    /**
     * Verify webhook signature using the provider's verification method
     */
    async verifyWebhookSignature(
        providerId: string,
        secret: string,
        request: WebhookRequestData
    ): Promise<WebhookVerificationResult> {
        try {
            const provider = await this.loadProvider(providerId);

            // Use the provider's verification method if available
            if (provider.verifyWebhookSignature) {
                return provider.verifyWebhookSignature(secret, request);
            }

            // If no verification method, assume valid (provider doesn't require signature)
            return { valid: true };
        } catch (error) {
            logger.error(
                { component: "ProviderRegistry", providerId, err: error },
                "Error verifying webhook signature"
            );
            return {
                valid: false,
                error: `Provider not found or verification failed: ${providerId}`
            };
        }
    }

    /**
     * Extract event type from webhook payload using the provider's method
     */
    async extractEventType(
        providerId: string,
        request: WebhookRequestData
    ): Promise<string | undefined> {
        try {
            const provider = await this.loadProvider(providerId);

            // Use the provider's extraction method if available
            if (provider.extractEventType) {
                return provider.extractEventType(request);
            }

            // Fall back to header-based extraction if provider has webhook config
            const webhookConfig = provider.getWebhookConfig?.();
            if (webhookConfig?.eventHeader) {
                return this.getHeader(request.headers, webhookConfig.eventHeader);
            }

            return undefined;
        } catch (error) {
            logger.error(
                { component: "ProviderRegistry", providerId, err: error },
                "Error extracting event type"
            );
            return undefined;
        }
    }

    /**
     * Get the webhook URL for a trigger
     */
    getWebhookUrl(baseUrl: string, triggerId: string, providerId?: string): string {
        if (providerId) {
            return `${baseUrl}/webhooks/provider/${providerId}/${triggerId}`;
        }
        return `${baseUrl}/webhooks/${triggerId}`;
    }

    /**
     * Check if a provider requires automatic webhook registration
     */
    async requiresWebhookRegistration(providerId: string): Promise<boolean> {
        try {
            const provider = await this.loadProvider(providerId);
            const webhookConfig = provider.getWebhookConfig?.();
            return webhookConfig?.setupType === "automatic";
        } catch {
            return false;
        }
    }

    /**
     * Check if a provider uses polling instead of webhooks
     */
    async usesPolling(providerId: string): Promise<boolean> {
        try {
            const provider = await this.loadProvider(providerId);
            const webhookConfig = provider.getWebhookConfig?.();
            return webhookConfig?.setupType === "polling";
        } catch {
            return false;
        }
    }

    /**
     * Get header value (handles string arrays)
     */
    private getHeader(
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

        if (Array.isArray(value)) {
            return value[0];
        }
        return value;
    }
}

// Global provider registry instance
export const providerRegistry = new ProviderRegistry();
