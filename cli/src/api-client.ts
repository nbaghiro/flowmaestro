import {
    getEffectiveApiUrl,
    getEffectiveWorkspace,
    getEffectiveApiKey,
    loadCredentials,
    saveCredentials,
    isTokenExpired,
    hasRefreshToken
} from "./config";
import { ApiError, AuthenticationError, NetworkError, parseApiError } from "./utils/errors";

export interface RequestOptions {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    headers?: Record<string, string>;
    timeout?: number;
    skipAuth?: boolean;
    apiKey?: string;
    workspace?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        per_page: number;
        total_count: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
    };
    meta?: {
        request_id?: string;
        timestamp?: string;
    };
}

export interface ApiResponse<T> {
    data: T;
    meta?: {
        request_id?: string;
        timestamp?: string;
    };
}

const DEFAULT_TIMEOUT = 30000;

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const baseUrl = getEffectiveApiUrl();
    const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...options.headers
    };

    if (!options.skipAuth) {
        const authHeader = await getAuthHeader(options.apiKey);
        if (authHeader) {
            headers["Authorization"] = authHeader;
        }
    }

    const workspace = options.workspace || getEffectiveWorkspace();
    if (workspace) {
        headers["X-Workspace-Id"] = workspace;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT);

    try {
        const response = await fetch(url, {
            method: options.method || "GET",
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            let errorBody: unknown;
            try {
                errorBody = await response.json();
            } catch {
                errorBody = null;
            }

            if (response.status === 401) {
                throw new AuthenticationError();
            }

            throw parseApiError(response, errorBody);
        }

        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
            return (await response.json()) as T;
        }

        return (await response.text()) as unknown as T;
    } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof AuthenticationError || error instanceof ApiError) {
            throw error;
        }

        if (error instanceof Error) {
            if (error.name === "AbortError") {
                throw new NetworkError("Request timeout");
            }
            if (
                error.message.includes("ECONNREFUSED") ||
                error.message.includes("ENOTFOUND") ||
                error.message.includes("fetch failed")
            ) {
                throw new NetworkError(
                    `Unable to connect to ${baseUrl}. Please check your connection and API URL.`
                );
            }
        }

        throw error;
    }
}

async function getAuthHeader(overrideApiKey?: string): Promise<string | null> {
    const apiKey = overrideApiKey || getEffectiveApiKey();
    if (apiKey) {
        if (apiKey.startsWith("fm_")) {
            return apiKey;
        }
        return `Bearer ${apiKey}`;
    }

    const credentials = loadCredentials();

    if (!credentials.accessToken) {
        return null;
    }

    if (isTokenExpired() && hasRefreshToken()) {
        await refreshAccessToken();
        const newCredentials = loadCredentials();
        return newCredentials.accessToken ? `Bearer ${newCredentials.accessToken}` : null;
    }

    return `Bearer ${credentials.accessToken}`;
}

async function refreshAccessToken(): Promise<void> {
    const credentials = loadCredentials();

    if (!credentials.refreshToken) {
        throw new AuthenticationError("No refresh token available. Please login again.");
    }

    const baseUrl = getEffectiveApiUrl();

    const response = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            refresh_token: credentials.refreshToken
        })
    });

    if (!response.ok) {
        throw new AuthenticationError("Failed to refresh token. Please login again.");
    }

    const data = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
    };

    saveCredentials({
        ...credentials,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || credentials.refreshToken,
        expiresAt: Date.now() + data.expires_in * 1000
    });
}

export async function get<T>(
    endpoint: string,
    options?: Omit<RequestOptions, "method">
): Promise<T> {
    return apiRequest<T>(endpoint, { ...options, method: "GET" });
}

export async function post<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
): Promise<T> {
    return apiRequest<T>(endpoint, { ...options, method: "POST", body });
}

export async function put<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
): Promise<T> {
    return apiRequest<T>(endpoint, { ...options, method: "PUT", body });
}

export async function patch<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
): Promise<T> {
    return apiRequest<T>(endpoint, { ...options, method: "PATCH", body });
}

export async function del<T>(
    endpoint: string,
    options?: Omit<RequestOptions, "method">
): Promise<T> {
    return apiRequest<T>(endpoint, { ...options, method: "DELETE" });
}

export interface StreamOptions {
    onMessage?: (event: MessageEvent) => void;
    onError?: (error: Event) => void;
    onOpen?: () => void;
}

export function createEventSource(endpoint: string, options: StreamOptions = {}): EventSource {
    const baseUrl = getEffectiveApiUrl();
    const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

    const credentials = loadCredentials();
    const apiKey = getEffectiveApiKey();

    let authUrl = url;
    if (apiKey) {
        authUrl += (url.includes("?") ? "&" : "?") + `api_key=${encodeURIComponent(apiKey)}`;
    } else if (credentials.accessToken) {
        authUrl +=
            (url.includes("?") ? "&" : "?") +
            `token=${encodeURIComponent(credentials.accessToken)}`;
    }

    const workspace = getEffectiveWorkspace();
    if (workspace) {
        authUrl += `&workspace=${encodeURIComponent(workspace)}`;
    }

    const eventSource = new EventSource(authUrl);

    if (options.onMessage) {
        eventSource.onmessage = options.onMessage;
    }

    if (options.onError) {
        eventSource.onerror = options.onError;
    }

    if (options.onOpen) {
        eventSource.onopen = options.onOpen;
    }

    return eventSource;
}

export async function paginate<T>(
    endpoint: string,
    options?: RequestOptions & { page?: number; perPage?: number }
): Promise<PaginatedResponse<T>> {
    const params = new URLSearchParams();

    if (options?.page) {
        params.set("page", String(options.page));
    }
    if (options?.perPage) {
        params.set("per_page", String(options.perPage));
    }

    const separator = endpoint.includes("?") ? "&" : "?";
    const url = params.toString() ? `${endpoint}${separator}${params.toString()}` : endpoint;

    return get<PaginatedResponse<T>>(url, options);
}

export async function* paginateAll<T>(
    endpoint: string,
    options?: RequestOptions & { perPage?: number }
): AsyncGenerator<T, void, unknown> {
    let page = 1;
    let hasNext = true;

    while (hasNext) {
        const response = await paginate<T>(endpoint, { ...options, page });

        for (const item of response.data) {
            yield item;
        }

        hasNext = response.pagination.has_next;
        page++;
    }
}
