/**
 * Blog Post Model
 *
 * TypeScript interfaces for the blog_posts table.
 * Used by BlogPostRepository and API routes.
 */

export const BLOG_CATEGORIES = [
    "product",
    "engineering",
    "tutorial",
    "case-study",
    "news",
    "company"
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const BLOG_STATUSES = ["draft", "published", "archived"] as const;

export type BlogStatus = (typeof BLOG_STATUSES)[number];

/**
 * Full blog post model (internal use)
 */
export interface BlogPostModel {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    content: string;
    featured_image_url: string | null;
    featured_image_alt: string | null;
    author_name: string;
    author_avatar_url: string | null;
    author_bio: string | null;
    category: BlogCategory;
    tags: string[];
    meta_title: string | null;
    meta_description: string | null;
    canonical_url: string | null;
    og_image_url: string | null;
    status: BlogStatus;
    published_at: Date | null;
    view_count: number;
    read_time_minutes: number;
    created_by: string | null;
    updated_by: string | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

/**
 * Blog post summary for list views (excludes content)
 */
export interface BlogPostSummary {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    featured_image_url: string | null;
    featured_image_alt: string | null;
    author_name: string;
    author_avatar_url: string | null;
    category: BlogCategory;
    tags: string[];
    published_at: Date | null;
    read_time_minutes: number;
}

/**
 * Input for creating a new blog post
 */
export interface CreateBlogPostInput {
    slug: string;
    title: string;
    excerpt?: string;
    content: string;
    featured_image_url?: string;
    featured_image_alt?: string;
    author_name: string;
    author_avatar_url?: string;
    author_bio?: string;
    category: BlogCategory;
    tags?: string[];
    meta_title?: string;
    meta_description?: string;
    canonical_url?: string;
    og_image_url?: string;
    status?: BlogStatus;
    read_time_minutes?: number;
    created_by?: string;
}

/**
 * Input for updating a blog post
 */
export interface UpdateBlogPostInput {
    slug?: string;
    title?: string;
    excerpt?: string | null;
    content?: string;
    featured_image_url?: string | null;
    featured_image_alt?: string | null;
    author_name?: string;
    author_avatar_url?: string | null;
    author_bio?: string | null;
    category?: BlogCategory;
    tags?: string[];
    meta_title?: string | null;
    meta_description?: string | null;
    canonical_url?: string | null;
    og_image_url?: string | null;
    status?: BlogStatus;
    read_time_minutes?: number;
    updated_by?: string;
}

/**
 * Options for listing blog posts
 */
export interface BlogPostListOptions {
    category?: BlogCategory;
    tags?: string[];
    status?: BlogStatus;
    search?: string;
    limit?: number;
    offset?: number;
}

/**
 * Result of listing blog posts
 */
export interface BlogPostListResult {
    posts: BlogPostSummary[];
    total: number;
}

/**
 * Category count for filtering UI
 */
export interface BlogCategoryCount {
    category: BlogCategory;
    count: number;
}

/**
 * Category metadata for display
 */
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
