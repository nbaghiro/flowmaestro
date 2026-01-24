import Redis from "ioredis";
import { config } from "../core/config";
import { createServiceLogger } from "../core/logging";

const logger = createServiceLogger("Redis");

/**
 * Shared Redis client for generic operations (rate limiting, caching, etc.)
 */
export const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    lazyConnect: true,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

redis.on("connect", () => {
    logger.info("Connected to Redis");
});

redis.on("error", (error) => {
    logger.error({ err: error.message }, "Redis error");
});
