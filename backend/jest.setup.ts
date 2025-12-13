/**
 * Jest Global Setup
 * Runs before all tests
 */

import path from "path";
import dotenv from "dotenv";
import { Pool } from "pg";
import { DatabaseHelper } from "./tests/helpers/DatabaseHelper";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "error";
process.env.JWT_SECRET = "test-jwt-secret-key-for-testing";

// PostgreSQL test database configuration
process.env.POSTGRES_HOST = process.env.POSTGRES_HOST || "localhost";
process.env.POSTGRES_PORT = process.env.POSTGRES_PORT || "5432";
process.env.POSTGRES_DB = process.env.POSTGRES_DB || "flowmaestro";
process.env.POSTGRES_USER = process.env.POSTGRES_USER || "flowmaestro";
process.env.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || "flowmaestro_dev_password";

// Temporal test configuration
process.env.TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || "localhost:7233";

// Redis test configuration
process.env.REDIS_HOST = process.env.REDIS_HOST || "localhost";
process.env.REDIS_PORT = process.env.REDIS_PORT || "6379";

// Increase timeout for integration tests
jest.setTimeout(60000); // 60 seconds for Temporal workflows

// Global test utilities
global.console = {
    ...console,
    // Suppress console logs during tests unless explicitly needed
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    // Keep error and warn for debugging
    error: console.error,
    warn: console.warn
};

// Global test database pool
let globalTestPool: Pool | null = null;
let globalDbHelper: DatabaseHelper | null = null;

/**
 * Get or create global test pool
 */
export function getGlobalTestPool(): Pool {
    if (!globalTestPool) {
        globalTestPool = new Pool({
            host: process.env.POSTGRES_HOST,
            port: parseInt(process.env.POSTGRES_PORT || "5432"),
            database: process.env.POSTGRES_DB,
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000
        });

        // Set search path to include flowmaestro schema on every new connection
        globalTestPool.on("connect", async (client) => {
            await client.query("SET search_path TO flowmaestro, public");
        });
    }
    return globalTestPool;
}

/**
 * Get or create global database helper
 */
export function getGlobalDbHelper(): DatabaseHelper {
    if (!globalDbHelper) {
        const pool = getGlobalTestPool();
        globalDbHelper = new DatabaseHelper(pool);
    }
    return globalDbHelper;
}

// Cleanup after all tests
afterAll(async () => {
    if (globalDbHelper) {
        await globalDbHelper.cleanup();
    }

    if (globalTestPool) {
        await globalTestPool.end();
        globalTestPool = null;
    }
});

// Mock nanoid to avoid ES module issues
jest.mock("nanoid", () => ({
    nanoid: jest.fn(() => `test-id-${Date.now()}-${Math.random()}`)
}));

// Mock pdf-parse module to avoid dealing with its complex export pattern
jest.mock("pdf-parse", () => {
    // Return a function that extracts text from buffer
    return jest.fn().mockImplementation(async (buffer: Buffer) => {
        const text = buffer.toString("utf-8");
        return {
            numpages: 1,
            numrender: 1,
            info: {},
            metadata: null,
            text: text,
            version: "1.0.0"
        };
    });
});
