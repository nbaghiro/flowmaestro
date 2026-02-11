/**
 * Blog Types
 *
 * Shared types for the FlowMaestro blog system.
 * Used by both frontend and backend.
 */

// =============================================================================
// Categories
// =============================================================================

export const BLOG_CATEGORIES = [
    "product",
    "engineering",
    "tutorial",
    "case-study",
    "news",
    "company"
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const BLOG_CATEGORY_META: Record<BlogCategory, { label: string; description: string }> = {
    product: {
        label: "Product",
        description: "Product updates, features, and announcements"
    },
    engineering: {
        label: "Engineering",
        description: "Technical deep dives and engineering insights"
    },
    tutorial: {
        label: "Tutorials",
        description: "Step-by-step guides and how-tos"
    },
    "case-study": {
        label: "Case Studies",
        description: "Customer success stories and use cases"
    },
    news: {
        label: "News",
        description: "Company news and industry updates"
    },
    company: {
        label: "Company",
        description: "Culture, team, and company updates"
    }
};

// =============================================================================
// Status
// =============================================================================

export const BLOG_STATUSES = ["draft", "published", "archived"] as const;

export type BlogStatus = (typeof BLOG_STATUSES)[number];

// =============================================================================
// Author
// =============================================================================

export interface BlogAuthor {
    name: string;
    avatarUrl: string | null;
    bio: string | null;
}

// =============================================================================
// Blog Post Summary (for list views)
// =============================================================================

export interface BlogPostSummary {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    featuredImageUrl: string | null;
    featuredImageAlt: string | null;
    author: BlogAuthor;
    category: BlogCategory;
    tags: string[];
    publishedAt: string | null;
    readTimeMinutes: number;
}

// =============================================================================
// Full Blog Post
// =============================================================================

export interface BlogPost {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    content: string;
    featuredImageUrl: string | null;
    featuredImageAlt: string | null;
    author: BlogAuthor;
    category: BlogCategory;
    tags: string[];
    metaTitle: string | null;
    metaDescription: string | null;
    canonicalUrl: string | null;
    ogImageUrl: string | null;
    status: BlogStatus;
    publishedAt: string | null;
    viewCount: number;
    readTimeMinutes: number;
    createdAt: string;
    updatedAt: string;
}

// =============================================================================
// API Types
// =============================================================================

export interface BlogListParams {
    category?: BlogCategory;
    tags?: string[];
    search?: string;
    limit?: number;
    offset?: number;
}

export interface BlogListResponse {
    posts: BlogPostSummary[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

export interface BlogCategoryWithCount {
    category: BlogCategory;
    label: string;
    description: string;
    count: number;
}

export interface BlogPostWithRelated extends BlogPost {
    relatedPosts: BlogPostSummary[];
}
