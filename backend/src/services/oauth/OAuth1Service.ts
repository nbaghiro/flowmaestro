import crypto, { randomBytes } from "crypto";
import { createServiceLogger } from "../../core/logging";
import { getOAuth1Provider } from "./OAuth1ProviderRegistry";

const logger = createServiceLogger("OAuth1Service");

/**
 * OAuth 1.0a state token data
 */
interface StateTokenData {
    userId: string;
    workspaceId: string;
    provider: string;
    requestToken: string;
    requestTokenSecret: string;
    expiresAt: number;
}

/**
 * OAuth 1.0a token result
 */
export interface OAuth1TokenResult {
    userId: string;
    workspaceId: string;
    provider: string;
    tokens: {
        oauth_token: string;
        oauth_token_secret: string;
        [key: string]: string | undefined;
    };
    accountInfo: unknown;
}

/**
 * OAuth 1.0a signature parameters
 */
interface OAuthSignatureParams {
    method: string;
    url: string;
    consumerKey: string;
    consumerSecret: string;
    token?: string;
    tokenSecret?: string;
    extraParams?: Record<string, string>;
}

/**
 * Generic OAuth 1.0a Service
 *
 * This service implements the OAuth 1.0a authorization flow which includes:
 * 1. Request Token - Get temporary credentials from the provider
 * 2. Authorize - Redirect user to provider for authorization
 * 3. Access Token - Exchange request token for access token
 *
 * Key features:
 * - HMAC-SHA1 signature generation
 * - Nonce and timestamp generation
 * - CSRF protection via state tokens
 */
export class OAuth1Service {
    private stateStore = new Map<string, StateTokenData>();

    /**
     * Generate a nonce (unique string for each request)
     */
    private generateNonce(): string {
        return randomBytes(16).toString("hex");
    }

    /**
     * Generate Unix timestamp
     */
    private generateTimestamp(): string {
        return Math.floor(Date.now() / 1000).toString();
    }

    /**
     * Percent encode a string according to RFC 3986
     */
    private percentEncode(str: string): string {
        return encodeURIComponent(str).replace(/[!'()*]/g, (c) => {
            return "%" + c.charCodeAt(0).toString(16).toUpperCase();
        });
    }

    /**
     * Generate OAuth 1.0a signature base string
     */
    private generateSignatureBaseString(
        method: string,
        url: string,
        params: Record<string, string>
    ): string {
        // Sort parameters alphabetically
        const sortedParams = Object.keys(params)
            .sort()
            .map((key) => `${this.percentEncode(key)}=${this.percentEncode(params[key])}`)
            .join("&");

        return `${method.toUpperCase()}&${this.percentEncode(url)}&${this.percentEncode(sortedParams)}`;
    }

    /**
     * Generate HMAC-SHA1 signature
     */
    private generateSignature(
        baseString: string,
        consumerSecret: string,
        tokenSecret?: string
    ): string {
        const signingKey = `${this.percentEncode(consumerSecret)}&${this.percentEncode(tokenSecret || "")}`;
        const hmac = crypto.createHmac("sha1", signingKey);
        hmac.update(baseString);
        return hmac.digest("base64");
    }

    /**
     * Generate OAuth Authorization header
     */
    private generateAuthorizationHeader(params: OAuthSignatureParams): string {
        const timestamp = this.generateTimestamp();
        const nonce = this.generateNonce();

        // OAuth parameters
        const oauthParams: Record<string, string> = {
            oauth_consumer_key: params.consumerKey,
            oauth_nonce: nonce,
            oauth_signature_method: "HMAC-SHA1",
            oauth_timestamp: timestamp,
            oauth_version: "1.0",
            ...(params.token && { oauth_token: params.token }),
            ...(params.extraParams || {})
        };

        // Generate signature base string
        const allParams = { ...oauthParams };
        const baseString = this.generateSignatureBaseString(params.method, params.url, allParams);

        // Generate signature
        const signature = this.generateSignature(
            baseString,
            params.consumerSecret,
            params.tokenSecret
        );

        // Add signature to params
        oauthParams.oauth_signature = signature;

        // Build Authorization header
        const headerParams = Object.keys(oauthParams)
            .sort()
            .map((key) => `${this.percentEncode(key)}="${this.percentEncode(oauthParams[key])}"`)
            .join(", ");

        return `OAuth ${headerParams}`;
    }

    /**
     * Step 1: Get request token from provider
     */
    async getRequestToken(
        provider: string,
        userId: string,
        workspaceId: string
    ): Promise<{ authUrl: string }> {
        const config = getOAuth1Provider(provider);

        logger.info({ provider }, "Getting request token");

        // Generate authorization header for request token
        const authHeader = this.generateAuthorizationHeader({
            method: "POST",
            url: config.requestTokenUrl,
            consumerKey: config.consumerKey,
            consumerSecret: config.consumerSecret,
            extraParams: {
                oauth_callback: config.callbackUrl
            }
        });

        // Request the request token
        const response = await fetch(config.requestTokenUrl, {
            method: "POST",
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(
                { provider, status: response.status, error: errorText },
                "Failed to get request token"
            );
            throw new Error(`Failed to get request token: ${errorText}`);
        }

        // Parse response (URL-encoded)
        const responseText = await response.text();
        const params = new URLSearchParams(responseText);
        const requestToken = params.get("oauth_token");
        const requestTokenSecret = params.get("oauth_token_secret");

        if (!requestToken || !requestTokenSecret) {
            throw new Error("Invalid response: missing oauth_token or oauth_token_secret");
        }

        logger.info({ provider }, "Got request token");

        // Store state for CSRF protection (request token serves as the state key)
        this.generateStateToken(userId, workspaceId, provider, requestToken, requestTokenSecret);

        // Build authorization URL
        const authUrl = `${config.authorizeUrl}?oauth_token=${encodeURIComponent(requestToken)}`;

        return { authUrl };
    }

    /**
     * Step 3: Exchange request token for access token
     */
    async exchangeForAccessToken(
        provider: string,
        oauthToken: string,
        oauthVerifier: string
    ): Promise<OAuth1TokenResult> {
        // Find and validate state
        const stateData = this.findAndConsumeState(oauthToken);
        if (!stateData) {
            throw new Error("Invalid or expired request token");
        }

        const config = getOAuth1Provider(provider);

        logger.info({ provider }, "Exchanging request token for access token");

        // Generate authorization header for access token
        const authHeader = this.generateAuthorizationHeader({
            method: "POST",
            url: config.accessTokenUrl,
            consumerKey: config.consumerKey,
            consumerSecret: config.consumerSecret,
            token: oauthToken,
            tokenSecret: stateData.requestTokenSecret,
            extraParams: {
                oauth_verifier: oauthVerifier
            }
        });

        // Request access token
        const response = await fetch(config.accessTokenUrl, {
            method: "POST",
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(
                { provider, status: response.status, error: errorText },
                "Failed to get access token"
            );
            throw new Error(`Failed to get access token: ${errorText}`);
        }

        // Parse response (URL-encoded)
        const responseText = await response.text();
        const params = new URLSearchParams(responseText);

        const accessToken = params.get("oauth_token");
        const accessTokenSecret = params.get("oauth_token_secret");

        if (!accessToken || !accessTokenSecret) {
            throw new Error("Invalid response: missing oauth_token or oauth_token_secret");
        }

        // Collect all returned parameters (some providers return extra data)
        const tokens: {
            oauth_token: string;
            oauth_token_secret: string;
            [key: string]: string | undefined;
        } = {
            oauth_token: accessToken,
            oauth_token_secret: accessTokenSecret
        };

        // Add any extra parameters (like Evernote's edam_* fields)
        for (const [key, value] of params.entries()) {
            if (key !== "oauth_token" && key !== "oauth_token_secret") {
                tokens[key] = value;
            }
        }

        logger.info({ provider }, "Got access token");

        // Get user info if supported
        let accountInfo: Record<string, unknown> = {};
        if (config.getUserInfo) {
            try {
                accountInfo = (await config.getUserInfo(accessToken, accessTokenSecret)) as Record<
                    string,
                    unknown
                >;
                logger.info({ provider }, "Retrieved user info");
            } catch (error) {
                logger.error({ provider, err: error }, "Failed to get user info");
                // Continue anyway, user info is optional
            }
        }

        return {
            userId: stateData.userId,
            workspaceId: stateData.workspaceId,
            provider: stateData.provider,
            tokens,
            accountInfo
        };
    }

    /**
     * Generate signed authorization header for API requests
     */
    generateSignedHeader(
        method: string,
        url: string,
        consumerKey: string,
        consumerSecret: string,
        accessToken: string,
        accessTokenSecret: string,
        extraParams?: Record<string, string>
    ): string {
        return this.generateAuthorizationHeader({
            method,
            url,
            consumerKey,
            consumerSecret,
            token: accessToken,
            tokenSecret: accessTokenSecret,
            extraParams
        });
    }

    /**
     * Generate state token and store it
     */
    private generateStateToken(
        userId: string,
        workspaceId: string,
        provider: string,
        requestToken: string,
        requestTokenSecret: string
    ): string {
        // Use the request token as the state key (it's unique per flow)
        this.stateStore.set(requestToken, {
            userId,
            workspaceId,
            provider,
            requestToken,
            requestTokenSecret,
            expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes expiry
        });

        // Cleanup expired states periodically
        this.cleanupExpiredStates();

        return requestToken;
    }

    /**
     * Find state by request token and consume it
     */
    private findAndConsumeState(requestToken: string): StateTokenData | null {
        const data = this.stateStore.get(requestToken);

        if (!data) {
            logger.error("Request token not found in state store");
            return null;
        }

        if (data.expiresAt < Date.now()) {
            logger.error("Request token expired");
            this.stateStore.delete(requestToken);
            return null;
        }

        // Consume the state (one-time use)
        this.stateStore.delete(requestToken);

        return data;
    }

    /**
     * Remove expired states
     */
    private cleanupExpiredStates(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [token, data] of this.stateStore.entries()) {
            if (data.expiresAt < now) {
                this.stateStore.delete(token);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.info({ count: cleaned }, "Cleaned up expired OAuth 1.0a states");
        }
    }
}

/**
 * Singleton instance
 */
export const oauth1Service = new OAuth1Service();
