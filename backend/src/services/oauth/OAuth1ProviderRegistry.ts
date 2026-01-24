import { config, getOAuthRedirectUri } from "../../core/config";
import { createServiceLogger } from "../../core/logging";

const logger = createServiceLogger("OAuth1ProviderRegistry");

/**
 * OAuth 1.0a Provider Configuration
 */
export interface OAuth1Provider {
    name: string;
    displayName: string;
    requestTokenUrl: string;
    authorizeUrl: string;
    accessTokenUrl: string;
    consumerKey: string;
    consumerSecret: string;
    callbackUrl: string;
    signatureMethod: "HMAC-SHA1" | "RSA-SHA1" | "PLAINTEXT";

    // Optional customizations
    getUserInfo?: (accessToken: string, accessTokenSecret: string) => Promise<unknown>;
    sandbox?: boolean; // For providers with sandbox environments
}

/**
 * Get Evernote base URL (sandbox vs production)
 */
function getEvernoteBaseUrl(): string {
    const sandbox = config.oauth.evernote?.sandbox ?? true; // Default to sandbox for safety
    return sandbox ? "https://sandbox.evernote.com" : "https://www.evernote.com";
}

/**
 * Central Registry of OAuth 1.0a Providers
 *
 * Adding a new OAuth 1.0a integration is as simple as adding a new entry here.
 */
export const OAUTH1_PROVIDERS: Record<string, OAuth1Provider> = {
    evernote: {
        name: "evernote",
        displayName: "Evernote",
        requestTokenUrl: `${getEvernoteBaseUrl()}/oauth`,
        authorizeUrl: `${getEvernoteBaseUrl()}/OAuth.action`,
        accessTokenUrl: `${getEvernoteBaseUrl()}/oauth`,
        consumerKey: config.oauth.evernote?.consumerKey || "",
        consumerSecret: config.oauth.evernote?.consumerSecret || "",
        callbackUrl: getOAuthRedirectUri("evernote"),
        signatureMethod: "HMAC-SHA1",
        sandbox: config.oauth.evernote?.sandbox ?? true,
        getUserInfo: async (_accessToken: string, _accessTokenSecret: string) => {
            // Evernote returns user info in the access token response (edam_userId)
            // We don't need to make an additional call
            return {};
        }
    }
};

/**
 * Get OAuth 1.0a provider configuration
 */
export function getOAuth1Provider(provider: string): OAuth1Provider {
    const config = OAUTH1_PROVIDERS[provider];
    if (!config) {
        logger.error({ provider }, "Unknown OAuth 1.0a provider");
        throw new Error(`Unknown OAuth 1.0a provider: ${provider}`);
    }

    // Validate required configuration
    if (!config.consumerKey || !config.consumerSecret) {
        logger.warn({ provider }, "OAuth 1.0a provider credentials not configured");
    }

    return config;
}

/**
 * Check if a provider uses OAuth 1.0a
 */
export function isOAuth1Provider(provider: string): boolean {
    return provider in OAUTH1_PROVIDERS;
}

/**
 * Get all available OAuth 1.0a provider names
 */
export function getOAuth1ProviderNames(): string[] {
    return Object.keys(OAUTH1_PROVIDERS);
}
