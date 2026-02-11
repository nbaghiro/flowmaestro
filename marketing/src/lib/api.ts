/**
 * API Client for FlowMaestro Marketing Site
 *
 * Fetches public template data from the backend API.
 */

import type {
    Template,
    TemplateListParams,
    TemplateListResponse,
    AgentTemplate,
    AgentTemplateListParams,
    AgentTemplateListResponse,
    CategoryInfo,
    BlogListParams,
    BlogListResponse,
    BlogPostWithRelated,
    BlogCategoryWithCount
} from "@flowmaestro/shared";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Fetch wrapper with error handling
 */
async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options?.headers
        }
    });

    return response;
}

// ===== Workflow Templates =====

/**
 * Get workflow templates with pagination
 */
export async function getTemplates(
    params?: TemplateListParams
): Promise<{ success: boolean; data: TemplateListResponse; error?: string }> {
    const queryParams = new URLSearchParams();

    if (params?.category) queryParams.set("category", params.category);
    if (params?.tags && params.tags.length > 0) queryParams.set("tags", params.tags.join(","));
    if (params?.featured !== undefined) queryParams.set("featured", params.featured.toString());
    if (params?.search) queryParams.set("search", params.search);
    if (params?.sortBy) queryParams.set("sortBy", params.sortBy);
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.offset) queryParams.set("offset", params.offset.toString());

    const url = `${API_BASE_URL}/templates${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await apiFetch(url, {
        method: "GET"
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get workflow template categories with counts
 */
export async function getTemplateCategories(): Promise<{
    success: boolean;
    data: CategoryInfo[];
    error?: string;
}> {
    const response = await apiFetch(`${API_BASE_URL}/templates/categories`, {
        method: "GET"
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== Agent Templates =====

/**
 * Get agent templates with pagination
 */
export async function getAgentTemplates(
    params?: AgentTemplateListParams
): Promise<{ success: boolean; data: AgentTemplateListResponse; error?: string }> {
    const queryParams = new URLSearchParams();

    if (params?.category) queryParams.set("category", params.category);
    if (params?.tags && params.tags.length > 0) queryParams.set("tags", params.tags.join(","));
    if (params?.featured !== undefined) queryParams.set("featured", params.featured.toString());
    if (params?.search) queryParams.set("search", params.search);
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.offset) queryParams.set("offset", params.offset.toString());

    const url = `${API_BASE_URL}/agent-templates${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await apiFetch(url, {
        method: "GET"
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get agent template categories with counts
 */
export async function getAgentTemplateCategories(): Promise<{
    success: boolean;
    data: CategoryInfo[];
    error?: string;
}> {
    const response = await apiFetch(`${API_BASE_URL}/agent-templates/categories`, {
        method: "GET"
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// ===== Blog Posts =====

/**
 * Get blog posts with pagination
 */
export async function getBlogPosts(
    params?: BlogListParams
): Promise<{ success: boolean; data: BlogListResponse; error?: string }> {
    const queryParams = new URLSearchParams();

    if (params?.category) queryParams.set("category", params.category);
    if (params?.tags && params.tags.length > 0) queryParams.set("tags", params.tags.join(","));
    if (params?.search) queryParams.set("search", params.search);
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.offset) queryParams.set("offset", params.offset.toString());

    const url = `${API_BASE_URL}/public/blog${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await apiFetch(url, {
        method: "GET"
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get a single blog post by slug
 */
export async function getBlogPost(
    slug: string
): Promise<{ success: boolean; data: BlogPostWithRelated; error?: string }> {
    const response = await apiFetch(`${API_BASE_URL}/public/blog/${slug}`, {
        method: "GET"
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get blog categories with counts
 */
export async function getBlogCategories(): Promise<{
    success: boolean;
    data: BlogCategoryWithCount[];
    error?: string;
}> {
    const response = await apiFetch(`${API_BASE_URL}/public/blog/categories`, {
        method: "GET"
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
}

// Re-export types for convenience
export type {
    Template,
    TemplateListParams,
    AgentTemplate,
    AgentTemplateListParams,
    CategoryInfo,
    BlogListParams,
    BlogPostWithRelated,
    BlogCategoryWithCount
};
