/**
 * Status API Client
 *
 * Fetches status data from the FlowMaestro API.
 */

import type { StatusResponse } from "@flowmaestro/shared";

// Default to localhost for development, production URL for builds
const API_URL =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? "http://localhost:3001" : "https://api.flowmaestro.ai");

/**
 * Fetch aggregated status from the API
 */
export async function fetchStatus(): Promise<StatusResponse> {
    const response = await fetch(`${API_URL}/public/status`);

    if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error || "Failed to fetch status");
    }

    return data.data;
}
