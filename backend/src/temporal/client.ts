import { Connection, Client } from "@temporalio/client";
import { config } from "../core/config";

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
            console.log(
                `Attempting to connect Temporal client (attempt ${attempt}/${maxRetries})...`
            );
            connection = await Connection.connect({
                address: config.temporal.address
            });

            client = new Client({
                connection,
                namespace: "default"
            });

            console.log("✅ Temporal client connected");
            return client;
        } catch (error) {
            if (attempt === maxRetries) {
                console.error("❌ Failed to connect Temporal client after max retries");
                throw error;
            }
            const delay = baseDelay * Math.pow(2, attempt - 1);
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(
                `⚠️  Temporal client connection failed (attempt ${attempt}/${maxRetries}): ${errorMessage}`
            );
            console.log(`   Retrying in ${delay}ms...`);
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
        console.log("Temporal connection closed");
    }
}
