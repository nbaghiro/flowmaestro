import { randomBytes } from "crypto";
import { getOAuthProvider, OAuthProvider } from "./OAuthProviderRegistry";
import { generatePKCEPair } from "./utils/pkce";

/**
 * OAuth state token data
 */
interface StateTokenData {
    userId: string;
    provider: string; // Track which service initiated the OAuth flow
    expiresAt: number;
    codeVerifier?: string; // PKCE code verifier
    subdomain?: string; // For providers like Zendesk that require per-connection subdomain
}

/**
 * OAuth token data from provider
 */
interface OAuthToken {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
}

/**
 * OAuth token exchange result
 */
export interface OAuthTokenResult {
    userId: string;
    provider: string; // The actual provider that initiated the OAuth flow
    tokens: {
        access_token: string;
        refresh_token?: string;
        token_type: string;
        expires_in?: number;
        scope?: string;
    };
    accountInfo: unknown;
    subdomain?: string; // For providers like Zendesk that require per-connection subdomain
}

/**
 * Generic OAuth 2.0 Service
 *
 * This service implements a generic OAuth 2.0 authorization code flow
 * that works with ANY OAuth provider configured in the registry.
 *
 * Key features:
 * - CSRF protection via state tokens
 * - Generic token exchange
 * - Automatic token refresh
 * - Token revocation
 */
export class OAuthService {
    private stateStore = new Map<string, StateTokenData>();

    /**
     * Generate authorization URL for user to visit
     * GENERIC - works for all OAuth providers
     *
     * @param provider - The OAuth provider name
     * @param userId - The user ID initiating the OAuth flow
     * @param options - Optional parameters (e.g., subdomain for Zendesk)
     */
    generateAuthUrl(provider: string, userId: string, options?: { subdomain?: string }): string {
        const config = getOAuthProvider(provider);

        // Handle providers that require subdomain/shop (like Zendesk, Shopify)
        let authUrl = config.authUrl;
        if (provider === "zendesk") {
            if (!options?.subdomain) {
                throw new Error("Zendesk requires a subdomain to initiate OAuth flow");
            }
            authUrl = authUrl.replace("{subdomain}", options.subdomain);
        } else if (provider === "shopify") {
            if (!options?.subdomain) {
                throw new Error("Shopify requires a shop name to initiate OAuth flow");
            }
            // Shopify uses {shop} placeholder - store shop name in subdomain field
            authUrl = authUrl.replace("{shop}", options.subdomain);
        }

        // Generate PKCE parameters if provider supports it
        let codeVerifier: string | undefined;
        let codeChallenge: string | undefined;

        if (config.pkceEnabled) {
            const pkce = generatePKCEPair();
            codeVerifier = pkce.codeVerifier;
            codeChallenge = pkce.codeChallenge;
        }

        // Generate CSRF state token (store code_verifier and subdomain if using PKCE)
        const state = this.generateStateToken(userId, provider, codeVerifier, options?.subdomain);

        // Build authorization URL with parameters
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            response_type: "code",
            state,
            ...config.authParams
        });

        // Add PKCE challenge if enabled
        if (codeChallenge) {
            params.set("code_challenge", codeChallenge);
            params.set("code_challenge_method", "S256");
        }

        // Add scopes if provider uses them
        if (config.scopes && config.scopes.length > 0) {
            params.set("scope", config.scopes.join(" "));
        }

        const finalAuthUrl = `${authUrl}?${params.toString()}`;
        console.log(`[OAuth] Generated auth URL for ${provider}:`, finalAuthUrl);

        return finalAuthUrl;
    }

    /**
     * Exchange authorization code for access token
     * GENERIC - works for all OAuth providers
     */
    async exchangeCodeForToken(
        _provider: string,
        code: string,
        state: string
    ): Promise<OAuthTokenResult> {
        // Validate state token (CSRF protection)
        const stateData = this.validateStateToken(state);
        if (!stateData) {
            throw new Error("Invalid or expired state token");
        }

        // Use provider from state (handles shared callbacks like /google/callback)
        const actualProvider = stateData.provider;

        const config = getOAuthProvider(actualProvider);

        console.log(`[OAuth] Exchanging code for token: ${actualProvider}`);

        try {
            // Exchange code for token (with PKCE verifier if applicable)
            // For Zendesk, pass the subdomain for token URL resolution
            const tokenData = await this.performTokenExchange(
                config,
                code,
                stateData.codeVerifier,
                stateData.subdomain
            );

            console.log(`[OAuth] Token exchange successful for ${actualProvider}`);

            // Get user info from provider
            let accountInfo: Record<string, unknown> = {};
            if (config.getUserInfo) {
                try {
                    // Pass subdomain for providers that need it (like Zendesk)
                    const userInfo = await config.getUserInfo(
                        tokenData.access_token,
                        stateData.subdomain
                    );
                    accountInfo = userInfo as Record<string, unknown>;
                    console.log(`[OAuth] Retrieved user info for ${actualProvider}:`, accountInfo);
                } catch (error: unknown) {
                    console.error(`[OAuth] Failed to get user info for ${actualProvider}:`, error);
                    // Continue anyway, user info is optional
                }
            }

            return {
                userId: stateData.userId,
                provider: actualProvider, // Return the actual provider from state
                tokens: {
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token,
                    token_type: tokenData.token_type || "Bearer",
                    expires_in: tokenData.expires_in,
                    scope: tokenData.scope
                },
                accountInfo,
                subdomain: stateData.subdomain // Include subdomain for providers like Zendesk
            };
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            console.error(`[OAuth] Token exchange failed for ${actualProvider}:`, errorMsg);
            throw new Error(`Failed to exchange authorization code: ${errorMsg}`);
        }
    }

    /**
     * Refresh access token using refresh token
     * GENERIC - works for all OAuth providers that support refresh
     */
    async refreshAccessToken(
        provider: string,
        refreshToken: string
    ): Promise<{
        access_token: string;
        refresh_token?: string;
        token_type: string;
        expires_in?: number;
    }> {
        const config = getOAuthProvider(provider);

        if (config.refreshable === false) {
            throw new Error(`Provider ${provider} does not support token refresh`);
        }

        console.log(`[OAuth] Refreshing token for ${provider}`);

        try {
            const params: Record<string, string> = {
                client_id: config.clientId,
                client_secret: config.clientSecret,
                refresh_token: refreshToken,
                grant_type: "refresh_token"
            };

            const response = await fetch(config.tokenUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Accept: "application/json"
                },
                body: new URLSearchParams(params).toString()
            });

            if (!response.ok) {
                const errorData = (await response.json().catch(() => ({}))) as {
                    error_description?: string;
                    error?: string;
                };
                throw new Error(
                    errorData.error_description || errorData.error || response.statusText
                );
            }

            const tokenData = (await response.json()) as {
                access_token: string;
                refresh_token?: string;
                token_type?: string;
                expires_in?: number;
            };

            console.log(`[OAuth] Token refresh successful for ${provider}`);

            return {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token || refreshToken, // Some providers don't return new refresh token
                token_type: tokenData.token_type || "Bearer",
                expires_in: tokenData.expires_in
            };
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            console.error(`[OAuth] Token refresh failed for ${provider}:`, errorMsg);
            throw new Error(`Failed to refresh token: ${errorMsg}`);
        }
    }

    /**
     * Revoke access token
     * GENERIC - works for providers that support revocation
     */
    async revokeToken(provider: string, accessToken: string): Promise<void> {
        const config = getOAuthProvider(provider);

        if (!config.revokeUrl) {
            console.log(`[OAuth] Provider ${provider} does not support token revocation`);
            return;
        }

        console.log(`[OAuth] Revoking token for ${provider}`);

        try {
            const url = new URL(config.revokeUrl);
            url.searchParams.append("token", accessToken);

            await fetch(url.toString(), {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            });

            console.log(`[OAuth] Token revoked successfully for ${provider}`);
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            console.error(`[OAuth] Token revocation failed for ${provider}:`, errorMsg);
            // Don't throw - revocation failure shouldn't block deletion
        }
    }

    /**
     * Perform token exchange (handles provider-specific quirks)
     */
    private async performTokenExchange(
        config: OAuthProvider,
        code: string,
        codeVerifier?: string,
        subdomain?: string
    ): Promise<OAuthToken> {
        const params: Record<string, string> = {
            client_id: config.clientId,
            code,
            redirect_uri: config.redirectUri,
            grant_type: "authorization_code",
            ...(config.tokenParams || {})
        };

        // PKCE flow: use code_verifier instead of client_secret
        if (codeVerifier) {
            params.code_verifier = codeVerifier;
            // Note: For PKCE, client_secret is still sent but via Basic Auth header (see below)
        } else {
            // Non-PKCE flow: include client_secret in body
            params.client_secret = config.clientSecret;
        }

        // Notion requires Basic Auth instead of client_id/client_secret in body
        const isNotion = config.name === "notion";
        const usesBasicAuth = isNotion || config.pkceEnabled;

        const headers: Record<string, string> = {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json"
        };

        if (usesBasicAuth) {
            // Notion and PKCE-enabled providers (like Airtable) use Basic Auth
            const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString(
                "base64"
            );
            headers["Authorization"] = `Basic ${credentials}`;
            delete params.client_id;
            delete params.client_secret;
        }

        // Handle providers with dynamic subdomain/shop (like Zendesk, Shopify)
        let tokenUrl = config.tokenUrl;
        if (config.name === "zendesk" && subdomain) {
            tokenUrl = tokenUrl.replace("{subdomain}", subdomain);
        } else if (config.name === "shopify" && subdomain) {
            tokenUrl = tokenUrl.replace("{shop}", subdomain);
        }

        const response = await fetch(tokenUrl, {
            method: "POST",
            headers,
            body: new URLSearchParams(params).toString()
        });

        if (!response.ok) {
            const errorData = (await response.json().catch(() => ({}))) as {
                error_description?: string;
                error?: string;
            };
            throw new Error(errorData.error_description || errorData.error || response.statusText);
        }

        return (await response.json()) as OAuthToken;
    }

    /**
     * Generate a secure state token for CSRF protection
     */
    private generateStateToken(
        userId: string,
        provider: string,
        codeVerifier?: string,
        subdomain?: string
    ): string {
        const state = randomBytes(32).toString("hex");

        this.stateStore.set(state, {
            userId,
            provider, // Store which service initiated the flow
            expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes expiry
            codeVerifier, // Store PKCE verifier if using PKCE
            subdomain // Store subdomain for providers like Zendesk
        });

        // Cleanup expired states periodically
        this.cleanupExpiredStates();

        return state;
    }

    /**
     * Validate and consume state token
     */
    private validateStateToken(state: string): StateTokenData | null {
        const data = this.stateStore.get(state);

        if (!data) {
            console.error("[OAuth] State token not found");
            return null;
        }

        if (data.expiresAt < Date.now()) {
            console.error("[OAuth] State token expired");
            this.stateStore.delete(state);
            return null;
        }

        // Consume the state token (one-time use)
        this.stateStore.delete(state);

        return data;
    }

    /**
     * Remove expired state tokens from memory
     */
    private cleanupExpiredStates(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [state, data] of this.stateStore.entries()) {
            if (data.expiresAt < now) {
                this.stateStore.delete(state);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[OAuth] Cleaned up ${cleaned} expired state tokens`);
        }
    }
}

/**
 * Singleton instance
 */
export const oauthService = new OAuthService();
