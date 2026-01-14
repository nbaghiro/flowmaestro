import { randomBytes } from "crypto";
import { createClient } from "redis";
import { config } from "../../core/config";
import { createServiceLogger } from "../../core/logging";

const logger = createServiceLogger("DeviceCodeService");

export interface DeviceCode {
    deviceCode: string;
    userCode: string;
    clientId: string;
    expiresAt: number;
    interval: number;
    userId?: string;
    authorized: boolean;
}

export interface DeviceCodeResponse {
    device_code: string;
    user_code: string;
    verification_uri: string;
    verification_uri_complete: string;
    expires_in: number;
    interval: number;
}

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
}

export type DeviceFlowError =
    | "authorization_pending"
    | "slow_down"
    | "expired_token"
    | "access_denied"
    | "invalid_request";

const DEVICE_CODE_TTL = 600; // 10 minutes
const POLL_INTERVAL = 5; // 5 seconds
const REDIS_KEY_PREFIX = "device_code:";
const USER_CODE_KEY_PREFIX = "device_user_code:";

class DeviceCodeService {
    private redis: ReturnType<typeof createClient>;
    private isConnected: boolean = false;

    constructor() {
        this.redis = createClient({
            socket: {
                host: config.redis.host,
                port: config.redis.port
            }
        });

        this.redis.on("error", (err) => {
            logger.error({ error: err }, "Redis error in DeviceCodeService");
        });
    }

    private async ensureConnection(): Promise<void> {
        if (!this.isConnected) {
            await this.redis.connect();
            this.isConnected = true;
        }
    }

    /**
     * Generate a device code and user code for CLI authentication
     */
    async generateDeviceCode(clientId: string): Promise<DeviceCodeResponse> {
        await this.ensureConnection();

        // Generate cryptographically random codes
        const deviceCode = randomBytes(32).toString("hex");
        const userCode = this.generateUserCode();

        const deviceCodeData: DeviceCode = {
            deviceCode,
            userCode,
            clientId,
            expiresAt: Date.now() + DEVICE_CODE_TTL * 1000,
            interval: POLL_INTERVAL,
            authorized: false
        };

        // Store device code data
        await this.redis.setEx(
            `${REDIS_KEY_PREFIX}${deviceCode}`,
            DEVICE_CODE_TTL,
            JSON.stringify(deviceCodeData)
        );

        // Store reverse lookup by user code
        await this.redis.setEx(`${USER_CODE_KEY_PREFIX}${userCode}`, DEVICE_CODE_TTL, deviceCode);

        // Build verification URLs
        // Use appUrl for the frontend (where user logs in)
        const baseUrl = config.appUrl || "http://localhost:3000";
        const verificationUri = `${baseUrl}/device`;
        const verificationUriComplete = `${verificationUri}?code=${userCode}`;

        logger.info(
            { clientId, userCode, expiresIn: DEVICE_CODE_TTL },
            "Generated device code for CLI authentication"
        );

        return {
            device_code: deviceCode,
            user_code: userCode,
            verification_uri: verificationUri,
            verification_uri_complete: verificationUriComplete,
            expires_in: DEVICE_CODE_TTL,
            interval: POLL_INTERVAL
        };
    }

    /**
     * Generate a user-friendly code like "ABCD-1234"
     */
    private generateUserCode(): string {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars
        let code = "";
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `${code.slice(0, 4)}-${code.slice(4)}`;
    }

    /**
     * Get device code data by device code
     */
    async getDeviceCode(deviceCode: string): Promise<DeviceCode | null> {
        await this.ensureConnection();

        const data = await this.redis.get(`${REDIS_KEY_PREFIX}${deviceCode}`);
        if (!data) {
            return null;
        }

        return JSON.parse(data) as DeviceCode;
    }

    /**
     * Get device code data by user code
     */
    async getDeviceCodeByUserCode(userCode: string): Promise<DeviceCode | null> {
        await this.ensureConnection();

        const deviceCode = await this.redis.get(`${USER_CODE_KEY_PREFIX}${userCode}`);
        if (!deviceCode) {
            return null;
        }

        return this.getDeviceCode(deviceCode);
    }

    /**
     * Authorize a device code (called when user approves in browser)
     */
    async authorizeDeviceCode(userCode: string, userId: string): Promise<boolean> {
        await this.ensureConnection();

        const normalizedCode = userCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
        const formattedCode = `${normalizedCode.slice(0, 4)}-${normalizedCode.slice(4)}`;

        const deviceCode = await this.redis.get(`${USER_CODE_KEY_PREFIX}${formattedCode}`);
        if (!deviceCode) {
            logger.warn({ userCode: formattedCode }, "Device code not found for user code");
            return false;
        }

        const data = await this.getDeviceCode(deviceCode);
        if (!data) {
            return false;
        }

        if (data.expiresAt < Date.now()) {
            logger.warn({ userCode: formattedCode }, "Device code expired");
            return false;
        }

        // Update with user ID and mark as authorized
        const updatedData: DeviceCode = {
            ...data,
            userId,
            authorized: true
        };

        const ttl = Math.floor((data.expiresAt - Date.now()) / 1000);
        if (ttl > 0) {
            await this.redis.setEx(
                `${REDIS_KEY_PREFIX}${deviceCode}`,
                ttl,
                JSON.stringify(updatedData)
            );
        }

        logger.info({ userCode: formattedCode, userId }, "Device code authorized");

        return true;
    }

    /**
     * Deny a device code authorization
     */
    async denyDeviceCode(userCode: string): Promise<boolean> {
        await this.ensureConnection();

        const normalizedCode = userCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
        const formattedCode = `${normalizedCode.slice(0, 4)}-${normalizedCode.slice(4)}`;

        const deviceCode = await this.redis.get(`${USER_CODE_KEY_PREFIX}${formattedCode}`);
        if (!deviceCode) {
            return false;
        }

        // Delete both keys
        await this.redis.del(`${REDIS_KEY_PREFIX}${deviceCode}`);
        await this.redis.del(`${USER_CODE_KEY_PREFIX}${formattedCode}`);

        logger.info({ userCode: formattedCode }, "Device code denied");

        return true;
    }

    /**
     * Poll for token (called by CLI during device flow)
     * Returns token data if authorized, error code otherwise
     */
    async pollForToken(
        deviceCode: string,
        clientId: string
    ): Promise<{ userId: string } | { error: DeviceFlowError }> {
        await this.ensureConnection();

        const data = await this.getDeviceCode(deviceCode);

        if (!data) {
            return { error: "expired_token" };
        }

        if (data.clientId !== clientId) {
            return { error: "invalid_request" };
        }

        if (data.expiresAt < Date.now()) {
            // Clean up expired codes
            await this.redis.del(`${REDIS_KEY_PREFIX}${deviceCode}`);
            await this.redis.del(`${USER_CODE_KEY_PREFIX}${data.userCode}`);
            return { error: "expired_token" };
        }

        if (!data.authorized) {
            return { error: "authorization_pending" };
        }

        if (!data.userId) {
            return { error: "authorization_pending" };
        }

        // Clean up after successful authorization
        await this.redis.del(`${REDIS_KEY_PREFIX}${deviceCode}`);
        await this.redis.del(`${USER_CODE_KEY_PREFIX}${data.userCode}`);

        logger.info({ userId: data.userId }, "Device code exchanged for token");

        return { userId: data.userId };
    }

    async disconnect(): Promise<void> {
        if (this.isConnected) {
            await this.redis.disconnect();
            this.isConnected = false;
        }
    }
}

// Singleton instance
export const deviceCodeService = new DeviceCodeService();
