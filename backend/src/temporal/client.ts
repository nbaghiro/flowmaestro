import { Connection, Client } from "@temporalio/client";
import { createServiceLogger } from "../core/logging";
import { config } from "../core/config";

const logger = createServiceLogger("temporal-client");

let client: Client | null = null;
let connection: Connection | null = null;
let connectionPromise: Promise<Client> | null = null;

/**
 * Get or create a Temporal client instance with retry logic
 */
export async function getTemporalClient(): Promise<Client> {
    // Return existing client if available
    if (client) {
        return client;
    }

    // If connection is in progress, wait for it
    if (connectionPromise) {
        return connectionPromise;
    }

    // Start connection with retry logic
    connectionPromise = connectWithRetry();

    try {
        const result = await connectionPromise;
        return result;
    } finally {
        connectionPromise = null;
    }
}

/**
 * Connect to Temporal with retry logic for DNS resolution and transient failures
 */
async function connectWithRetry(): Promise<Client> {
    const maxRetries = 10;
    const baseDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logger.info({ attempt, maxRetries }, "Attempting to connect Temporal client");
            connection = await Connection.connect({
                address: config.temporal.address
            });

            client = new Client({
                connection,
                namespace: "default"
            });

            logger.info("Temporal client connected successfully");
            return client;
        } catch (error) {
            if (attempt === maxRetries) {
                logger.error({ err: error }, "Failed to connect Temporal client after max retries");
                throw error;
            }
            const delay = baseDelay * Math.pow(2, attempt - 1);
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn({ attempt, maxRetries, errorMessage, delayMs: delay }, "Temporal client connection failed, retrying");
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw new Error("Failed to establish Temporal client connection");
}

/**
 * Close the Temporal connection
 */
export async function closeTemporalConnection(): Promise<void> {
    if (connection) {
        await connection.close();
        connection = null;
        client = null;
        logger.info("Temporal connection closed");
    }
}
