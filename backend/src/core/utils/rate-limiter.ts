import { createClient } from "redis";
import { config } from "../config";

export class RateLimiter {
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
            console.error("Redis error:", err);
        });
    }

    /**
     * Ensure Redis connection is established
     */
    private async ensureConnection(): Promise<void> {
        if (!this.isConnected) {
            await this.redis.connect();
            this.isConnected = true;
        }
    }

    /**
     * Check if rate limit exceeded for given key
     * Returns true if limit exceeded, false otherwise
     */
    async isRateLimited(key: string, maxRequests: number, windowMinutes: number): Promise<boolean> {
        await this.ensureConnection();

        const redisKey = `ratelimit:${key}`;
        const count = await this.redis.incr(redisKey);

        if (count === 1) {
            // First request, set expiry
            await this.redis.expire(redisKey, windowMinutes * 60);
        }

        return count > maxRequests;
    }

    /**
     * Get remaining time until rate limit resets (in seconds)
     */
    async getResetTime(key: string): Promise<number> {
        await this.ensureConnection();

        const redisKey = `ratelimit:${key}`;
        const ttl = await this.redis.ttl(redisKey);
        return ttl > 0 ? ttl : 0;
    }

    /**
     * Disconnect from Redis
     */
    async disconnect(): Promise<void> {
        if (this.isConnected) {
            await this.redis.disconnect();
            this.isConnected = false;
        }
    }
}

// Singleton instance
export const rateLimiter = new RateLimiter();
