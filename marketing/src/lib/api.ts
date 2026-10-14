/**
 * Template data for the marketing site.
 *
 * The site deploys on its own, so it ships with a snapshot of the seeded workflow and agent
 * templates and serves every list from it. When VITE_API_URL is set, the live API is tried
 * first and the snapshot is the fallback.
 */

import {
    TEMPLATE_CATEGORY_META,
    type AgentTemplate,
    type AgentTemplateListParams,
    type AgentTemplateListResponse,
    type CategoryInfo,
    type Template,
    type TemplateCategory,
    type TemplateListParams,
    type TemplateListResponse
} from "@flowmaestro/shared";

const API_BASE_URL: string = import.meta.env.VITE_API_URL || "";
const FETCH_TIMEOUT_MS = 4000;

interface ApiResult<T> {
    success: boolean;
    data: T;
    error?: string;
}

interface SnapshotWorkflow {
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    required_integrations: string[];
    featured: boolean;
    order: number;
    definition: Template["definition"];
}

interface SnapshotAgent {
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    required_integrations: string[];
    featured: boolean;
    order: number;
    model: string;
    provider: AgentTemplate["provider"];
    temperature: number;
    max_tokens: number;
    system_prompt: string;
    available_tools: AgentTemplate["available_tools"];
}

interface Snapshot {
    generatedAt: string;
    workflows: SnapshotWorkflow[];
    agents: SnapshotAgent[];
}

// The snapshot is a few hundred kilobytes, so it loads on first use as its own chunk.
let snapshotPromise: Promise<Snapshot> | null = null;

function loadSnapshot(): Promise<Snapshot> {
    if (!snapshotPromise) {
        snapshotPromise = import("../data/templates.snapshot.json").then(
            (module) => module.default as unknown as Snapshot
        );
    }
    return snapshotPromise;
}

function snapshotDate(snapshot: Snapshot): string {
    return `${snapshot.generatedAt}T00:00:00.000Z`;
}

// ===== Snapshot adapters =====

function toTemplate(item: SnapshotWorkflow, date: string): Template {
    return {
        id: item.id,
        name: item.name,
        description: item.description,
        definition: item.definition,
        category: item.category as TemplateCategory,
        tags: item.tags,
        icon: null,
        color: null,
        preview_image_url: null,
        author_name: "FlowMaestro",
        author_avatar_url: null,
        view_count: 0,
        use_count: 0,
        featured: item.featured,
        required_integrations: item.required_integrations,
        version: "1.0.0",
        created_at: date,
        updated_at: date
    };
}

function toAgentTemplate(item: SnapshotAgent, date: string): AgentTemplate {
    return {
        id: item.id,
        name: item.name,
        description: item.description,
        system_prompt: item.system_prompt,
        model: item.model,
        provider: item.provider,
        temperature: item.temperature,
        max_tokens: item.max_tokens,
        available_tools: item.available_tools,
        category: item.category as AgentTemplate["category"],
        tags: item.tags,
        icon: null,
        color: null,
        author_name: "FlowMaestro",
        author_avatar_url: null,
        view_count: 0,
        use_count: 0,
        featured: item.featured,
        required_integrations: item.required_integrations,
        version: "1.0.0",
        created_at: date,
        updated_at: date
    };
}

interface Listable {
    name: string;
    description: string;
    category: string;
    tags: string[];
    featured: boolean;
    order: number;
}

interface ListFilters {
    category?: string;
    tags?: string[];
    featured?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
}

function matches(item: Listable, filters: ListFilters): boolean {
    if (filters.category && item.category !== filters.category) return false;
    if (filters.featured !== undefined && item.featured !== filters.featured) return false;
    if (filters.tags && filters.tags.length > 0) {
        const tags = new Set(item.tags.map((tag) => tag.toLowerCase()));
        if (!filters.tags.some((tag) => tags.has(tag.toLowerCase()))) return false;
    }
    if (filters.search) {
        const needle = filters.search.toLowerCase();
        const haystack = `${item.name} ${item.description} ${item.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
    }
    return true;
}

function page<T extends Listable, R>(
    items: T[],
    filters: ListFilters,
    map: (item: T) => R
): { items: R[]; total: number; page: number; pageSize: number; hasMore: boolean } {
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const offset = filters.offset && filters.offset > 0 ? filters.offset : 0;
    const filtered = items
        .filter((item) => matches(item, filters))
        .sort((a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order);
    const slice = filtered.slice(offset, offset + limit).map(map);
    return {
        items: slice,
        total: filtered.length,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        hasMore: offset + limit < filtered.length
    };
}

function categoriesOf(items: Listable[]): CategoryInfo[] {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    return [...counts.entries()]
        .map(([category, count]) => {
            const meta = TEMPLATE_CATEGORY_META[category as TemplateCategory];
            return {
                category: category as TemplateCategory,
                count,
                label: meta?.label ?? category,
                icon: meta?.icon ?? "",
                color: meta?.color ?? ""
            };
        })
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

// ===== Live API (optional) =====

async function fromApi<T>(path: string, query?: URLSearchParams): Promise<ApiResult<T> | null> {
    if (!API_BASE_URL) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const suffix = query && query.toString() ? `?${query.toString()}` : "";
        const response = await fetch(`${API_BASE_URL}${path}${suffix}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal
        });
        if (!response.ok) return null;
        return (await response.json()) as ApiResult<T>;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

function listQuery(params?: TemplateListParams | AgentTemplateListParams): URLSearchParams {
    const query = new URLSearchParams();
    if (params?.category) query.set("category", params.category);
    if (params?.tags && params.tags.length > 0) query.set("tags", params.tags.join(","));
    if (params?.featured !== undefined) query.set("featured", String(params.featured));
    if (params?.search) query.set("search", params.search);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    return query;
}

// ===== Workflow templates =====

export async function getTemplates(
    params?: TemplateListParams
): Promise<ApiResult<TemplateListResponse>> {
    const query = listQuery(params);
    if (params?.sortBy) query.set("sortBy", params.sortBy);
    const live = await fromApi<TemplateListResponse>("/templates", query);
    if (live) return live;
    const snapshot = await loadSnapshot();
    const date = snapshotDate(snapshot);
    return {
        success: true,
        data: page(snapshot.workflows, params ?? {}, (item) => toTemplate(item, date))
    };
}

export async function getTemplateCategories(): Promise<ApiResult<CategoryInfo[]>> {
    const live = await fromApi<CategoryInfo[]>("/templates/categories");
    if (live) return live;
    const snapshot = await loadSnapshot();
    return { success: true, data: categoriesOf(snapshot.workflows) };
}

// ===== Agent templates =====

export async function getAgentTemplates(
    params?: AgentTemplateListParams
): Promise<ApiResult<AgentTemplateListResponse>> {
    const live = await fromApi<AgentTemplateListResponse>("/agent-templates", listQuery(params));
    if (live) return live;
    const snapshot = await loadSnapshot();
    const date = snapshotDate(snapshot);
    return {
        success: true,
        data: page(snapshot.agents, params ?? {}, (item) => toAgentTemplate(item, date))
    };
}

export async function getAgentTemplateCategories(): Promise<ApiResult<CategoryInfo[]>> {
    const live = await fromApi<CategoryInfo[]>("/agent-templates/categories");
    if (live) return live;
    const snapshot = await loadSnapshot();
    return { success: true, data: categoriesOf(snapshot.agents) };
}

// Re-export types for convenience
export type { Template, TemplateListParams, AgentTemplate, AgentTemplateListParams, CategoryInfo };
