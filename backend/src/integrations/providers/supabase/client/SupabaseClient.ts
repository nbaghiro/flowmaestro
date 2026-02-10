/**
 * Supabase REST API Client
 *
 * HTTP client wrapping Supabase's PostgREST API for database operations.
 * Uses native fetch per project guidelines.
 */

export interface SupabaseFilter {
    column: string;
    operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "in" | "is";
    value: string | number | boolean | null;
}

export interface SupabaseQueryOptions {
    order?: string;
    limit?: number;
    offset?: number;
    single?: boolean;
}

export interface SupabaseInsertOptions {
    returning?: boolean;
    upsert?: boolean;
    onConflict?: string;
}

interface PostgRESTError {
    message: string;
    code?: string;
    details?: string;
    hint?: string;
}

export class SupabaseClient {
    private readonly baseUrl: string;
    private readonly headers: Record<string, string>;

    constructor(projectUrl: string, apiKey: string) {
        // Remove trailing slash from project URL
        const cleanUrl = projectUrl.replace(/\/+$/, "");
        this.baseUrl = `${cleanUrl}/rest/v1`;
        this.headers = {
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        };
    }

    /**
     * Build filter query params from filter array
     */
    private buildFilterParams(filters: SupabaseFilter[]): URLSearchParams {
        const params = new URLSearchParams();
        for (const filter of filters) {
            let value: string;
            if (filter.operator === "in") {
                const arr = Array.isArray(filter.value) ? filter.value : [filter.value];
                value = `in.(${arr.join(",")})`;
            } else if (filter.operator === "is") {
                value = `is.${filter.value}`;
            } else {
                value = `${filter.operator}.${filter.value}`;
            }
            params.append(filter.column, value);
        }
        return params;
    }

    /**
     * Parse PostgREST error response
     */
    private async parseError(response: Response): Promise<string> {
        try {
            const body = (await response.json()) as PostgRESTError;
            const parts: string[] = [];
            if (body.message) parts.push(body.message);
            if (body.details) parts.push(body.details);
            if (body.hint) parts.push(`Hint: ${body.hint}`);
            return parts.join(". ") || `HTTP ${response.status}: ${response.statusText}`;
        } catch {
            return `HTTP ${response.status}: ${response.statusText}`;
        }
    }

    /**
     * Query rows from a table
     */
    async query(
        table: string,
        select: string = "*",
        filters: SupabaseFilter[] = [],
        options: SupabaseQueryOptions = {}
    ): Promise<{ data: unknown[]; count: number | null }> {
        const params = this.buildFilterParams(filters);
        params.set("select", select);

        if (options.order) {
            params.set("order", options.order);
        }
        if (options.limit !== undefined) {
            params.set("limit", String(options.limit));
        }
        if (options.offset !== undefined) {
            params.set("offset", String(options.offset));
        }

        const requestHeaders: Record<string, string> = { ...this.headers };
        if (options.single) {
            requestHeaders["Accept"] = "application/vnd.pgrst.object+json";
        }
        // Request count in response
        requestHeaders["Prefer"] = "count=exact";

        const url = `${this.baseUrl}/${encodeURIComponent(table)}?${params.toString()}`;
        const response = await fetch(url, {
            method: "GET",
            headers: requestHeaders
        });

        if (!response.ok) {
            const errorMessage = await this.parseError(response);
            throw new Error(errorMessage);
        }

        // Parse content-range header for count
        const contentRange = response.headers.get("content-range");
        let count: number | null = null;
        if (contentRange) {
            const match = contentRange.match(/\/(\d+|\*)/);
            if (match && match[1] !== "*") {
                count = parseInt(match[1], 10);
            }
        }

        if (options.single) {
            const data = await response.json();
            return { data: [data], count: 1 };
        }

        const data = (await response.json()) as unknown[];
        return { data, count };
    }

    /**
     * Insert rows into a table
     */
    async insert(
        table: string,
        data: Record<string, unknown> | Record<string, unknown>[],
        options: SupabaseInsertOptions = {}
    ): Promise<{ data: unknown[]; count: number }> {
        const requestHeaders: Record<string, string> = { ...this.headers };
        const preferParts: string[] = [];

        if (options.returning !== false) {
            preferParts.push("return=representation");
        } else {
            preferParts.push("return=minimal");
        }

        if (options.upsert) {
            preferParts.push("resolution=merge-duplicates");
        }

        requestHeaders["Prefer"] = preferParts.join(",");

        let url = `${this.baseUrl}/${encodeURIComponent(table)}`;
        if (options.upsert && options.onConflict) {
            url += `?on_conflict=${encodeURIComponent(options.onConflict)}`;
        }

        const response = await fetch(url, {
            method: "POST",
            headers: requestHeaders,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorMessage = await this.parseError(response);
            throw new Error(errorMessage);
        }

        if (options.returning === false) {
            const rows = Array.isArray(data) ? data.length : 1;
            return { data: [], count: rows };
        }

        const result = await response.json();
        const resultArray = Array.isArray(result) ? result : [result];
        return { data: resultArray, count: resultArray.length };
    }

    /**
     * Update rows in a table matching filters
     */
    async update(
        table: string,
        data: Record<string, unknown>,
        filters: SupabaseFilter[],
        returning: boolean = true
    ): Promise<{ data: unknown[]; count: number }> {
        const params = this.buildFilterParams(filters);

        const requestHeaders: Record<string, string> = { ...this.headers };
        requestHeaders["Prefer"] = returning ? "return=representation" : "return=minimal";

        const url = `${this.baseUrl}/${encodeURIComponent(table)}?${params.toString()}`;
        const response = await fetch(url, {
            method: "PATCH",
            headers: requestHeaders,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorMessage = await this.parseError(response);
            throw new Error(errorMessage);
        }

        if (!returning) {
            return { data: [], count: 0 };
        }

        const result = await response.json();
        const resultArray = Array.isArray(result) ? result : [result];
        return { data: resultArray, count: resultArray.length };
    }

    /**
     * Delete rows from a table matching filters
     */
    async deleteRows(
        table: string,
        filters: SupabaseFilter[],
        returning: boolean = true
    ): Promise<{ data: unknown[]; count: number }> {
        const params = this.buildFilterParams(filters);

        const requestHeaders: Record<string, string> = { ...this.headers };
        requestHeaders["Prefer"] = returning ? "return=representation" : "return=minimal";

        const url = `${this.baseUrl}/${encodeURIComponent(table)}?${params.toString()}`;
        const response = await fetch(url, {
            method: "DELETE",
            headers: requestHeaders
        });

        if (!response.ok) {
            const errorMessage = await this.parseError(response);
            throw new Error(errorMessage);
        }

        if (!returning) {
            return { data: [], count: 0 };
        }

        const result = await response.json();
        const resultArray = Array.isArray(result) ? result : [result];
        return { data: resultArray, count: resultArray.length };
    }

    /**
     * List tables in the database via PostgREST root endpoint
     */
    async listTables(): Promise<string[]> {
        const response = await fetch(`${this.baseUrl}/`, {
            method: "GET",
            headers: this.headers
        });

        if (!response.ok) {
            const errorMessage = await this.parseError(response);
            throw new Error(errorMessage);
        }

        const definitions = (await response.json()) as Record<string, unknown>;
        return Object.keys(definitions).sort();
    }

    /**
     * Call a PostgreSQL RPC function
     */
    async rpc(functionName: string, params: Record<string, unknown> = {}): Promise<unknown> {
        const url = `${this.baseUrl}/rpc/${encodeURIComponent(functionName)}`;
        const response = await fetch(url, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            const errorMessage = await this.parseError(response);
            throw new Error(errorMessage);
        }

        return response.json();
    }
}
