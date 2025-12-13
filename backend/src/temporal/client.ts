import { Connection, Client } from "@temporalio/client";
import { config } from "../core/config";

let client: Client | null = null;
let connection: Connection | null = null;

/**
 * Get or create a Temporal client instance
 */
export async function getTemporalClient(): Promise<Client> {
    if (!client) {
        connection = await Connection.connect({
            address: config.temporal.address
        });

        client = new Client({
            connection,
            namespace: "default"
        });

        console.log("Temporal client connected");
    }

    return client;
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
