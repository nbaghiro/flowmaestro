/**
 * Blog Post Repository
 *
 * Database access layer for blog posts.
 * Provides CRUD operations and specialized queries.
 */

import { db } from "../database";
import {
    BlogPostModel,
    BlogPostSummary,
    BlogPostListOptions,
    BlogPostListResult,
    BlogCategoryCount,
    CreateBlogPostInput,
    UpdateBlogPostInput,
    BlogCategory,
    BlogStatus
} from "../models/BlogPost";

interface BlogPostRow {
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
    category: string;
    tags: string[];
    meta_title: string | null;
    meta_description: string | null;
    canonical_url: string | null;
    og_image_url: string | null;
    status: string;
    published_at: string | Date | null;
    view_count: number;
    read_time_minutes: number;
    created_by: string | null;
    updated_by: string | null;
    created_at: string | Date;
    updated_at: string | Date;
    deleted_at: string | Date | null;
}

export class BlogPostRepository {
    /**
     * Find all posts with pagination and filters (for admin)
     */
    async findAll(options: BlogPostListOptions = {}): Promise<BlogPostListResult> {
        const { category, tags, status, search, limit = 20, offset = 0 } = options;

        const conditions: string[] = ["deleted_at IS NULL"];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (status) {
            conditions.push(`status = $${paramIndex++}`);
            values.push(status);
        }

        if (category) {
            conditions.push(`category = $${paramIndex++}`);
            values.push(category);
        }

        if (tags && tags.length > 0) {
            conditions.push(`tags && $${paramIndex++}`);
            values.push(tags);
        }

        if (search) {
            conditions.push(
                `to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, '')) @@ plainto_tsquery('english', $${paramIndex++})`
            );
            values.push(search);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.blog_posts
            ${whereClause}
        `;

        const query = `
            SELECT id, slug, title, excerpt, featured_image_url, featured_image_alt,
                   author_name, author_avatar_url, category, tags, published_at, read_time_minutes
            FROM flowmaestro.blog_posts
            ${whereClause}
            ORDER BY published_at DESC NULLS LAST, created_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex}
        `;

        values.push(limit, offset);

        const [countResult, postsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, values.slice(0, -2)),
            db.query<Omit<BlogPostRow, "content">>(query, values)
        ]);

        return {
            posts: postsResult.rows.map((row) => this.mapToSummary(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * Find all published posts (for public API)
     */
    async findPublished(options: BlogPostListOptions = {}): Promise<BlogPostListResult> {
        return this.findAll({ ...options, status: "published" });
    }

    /**
     * Find a post by ID
     */
    async findById(id: string): Promise<BlogPostModel | null> {
        const query = `
            SELECT * FROM flowmaestro.blog_posts
            WHERE id = $1 AND deleted_at IS NULL
        `;

        const result = await db.query<BlogPostRow>(query, [id]);
        return result.rows.length > 0 ? this.mapToModel(result.rows[0]) : null;
    }

    /**
     * Find a post by slug
     */
    async findBySlug(slug: string): Promise<BlogPostModel | null> {
        const query = `
            SELECT * FROM flowmaestro.blog_posts
            WHERE slug = $1 AND deleted_at IS NULL
        `;

        const result = await db.query<BlogPostRow>(query, [slug]);
        return result.rows.length > 0 ? this.mapToModel(result.rows[0]) : null;
    }

    /**
     * Find a published post by slug (for public API)
     */
    async findPublishedBySlug(slug: string): Promise<BlogPostModel | null> {
        const query = `
            SELECT * FROM flowmaestro.blog_posts
            WHERE slug = $1 AND status = 'published' AND deleted_at IS NULL
        `;

        const result = await db.query<BlogPostRow>(query, [slug]);
        return result.rows.length > 0 ? this.mapToModel(result.rows[0]) : null;
    }

    /**
     * Create a new blog post
     */
    async create(input: CreateBlogPostInput): Promise<BlogPostModel> {
        const query = `
            INSERT INTO flowmaestro.blog_posts (
                slug, title, excerpt, content, featured_image_url, featured_image_alt,
                author_name, author_avatar_url, author_bio, category, tags,
                meta_title, meta_description, canonical_url, og_image_url,
                status, read_time_minutes, created_by, updated_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $18)
            RETURNING *
        `;

        const values = [
            input.slug,
            input.title,
            input.excerpt || null,
            input.content,
            input.featured_image_url || null,
            input.featured_image_alt || null,
            input.author_name,
            input.author_avatar_url || null,
            input.author_bio || null,
            input.category,
            input.tags || [],
            input.meta_title || null,
            input.meta_description || null,
            input.canonical_url || null,
            input.og_image_url || null,
            input.status || "draft",
            input.read_time_minutes || this.estimateReadTime(input.content),
            input.created_by || null
        ];

        const result = await db.query<BlogPostRow>(query, values);
        return this.mapToModel(result.rows[0]);
    }

    /**
     * Update a blog post
     */
    async update(id: string, input: UpdateBlogPostInput): Promise<BlogPostModel | null> {
        // Build dynamic update query
        const updates: string[] = ["updated_at = NOW()"];
        const values: unknown[] = [];
        let paramIndex = 1;

        const fieldMap: Record<string, keyof UpdateBlogPostInput> = {
            slug: "slug",
            title: "title",
            excerpt: "excerpt",
            content: "content",
            featured_image_url: "featured_image_url",
            featured_image_alt: "featured_image_alt",
            author_name: "author_name",
            author_avatar_url: "author_avatar_url",
            author_bio: "author_bio",
            category: "category",
            tags: "tags",
            meta_title: "meta_title",
            meta_description: "meta_description",
            canonical_url: "canonical_url",
            og_image_url: "og_image_url",
            status: "status",
            read_time_minutes: "read_time_minutes",
            updated_by: "updated_by"
        };

        for (const [column, field] of Object.entries(fieldMap)) {
            if (input[field] !== undefined) {
                updates.push(`${column} = $${paramIndex++}`);
                values.push(input[field]);
            }
        }

        // Recalculate read time if content changed
        if (input.content && !input.read_time_minutes) {
            updates.push(`read_time_minutes = $${paramIndex++}`);
            values.push(this.estimateReadTime(input.content));
        }

        values.push(id);

        const query = `
            UPDATE flowmaestro.blog_posts
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query<BlogPostRow>(query, values);
        return result.rows.length > 0 ? this.mapToModel(result.rows[0]) : null;
    }

    /**
     * Publish a blog post
     */
    async publish(id: string, userId?: string): Promise<BlogPostModel | null> {
        const query = `
            UPDATE flowmaestro.blog_posts
            SET status = 'published',
                published_at = NOW(),
                updated_at = NOW(),
                updated_by = $2
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query<BlogPostRow>(query, [id, userId || null]);
        return result.rows.length > 0 ? this.mapToModel(result.rows[0]) : null;
    }

    /**
     * Unpublish a blog post (set to draft)
     */
    async unpublish(id: string, userId?: string): Promise<BlogPostModel | null> {
        const query = `
            UPDATE flowmaestro.blog_posts
            SET status = 'draft',
                updated_at = NOW(),
                updated_by = $2
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query<BlogPostRow>(query, [id, userId || null]);
        return result.rows.length > 0 ? this.mapToModel(result.rows[0]) : null;
    }

    /**
     * Soft delete a blog post
     */
    async softDelete(id: string): Promise<boolean> {
        const query = `
            UPDATE flowmaestro.blog_posts
            SET deleted_at = NOW()
            WHERE id = $1 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Increment view count
     */
    async incrementViewCount(id: string): Promise<void> {
        const query = `
            UPDATE flowmaestro.blog_posts
            SET view_count = view_count + 1
            WHERE id = $1 AND deleted_at IS NULL
        `;

        await db.query(query, [id]);
    }

    /**
     * Get categories with post counts (published only)
     */
    async getCategories(): Promise<BlogCategoryCount[]> {
        const query = `
            SELECT category, COUNT(*) as count
            FROM flowmaestro.blog_posts
            WHERE status = 'published' AND deleted_at IS NULL
            GROUP BY category
            ORDER BY count DESC
        `;

        const result = await db.query<{ category: string; count: string }>(query);
        return result.rows.map((row) => ({
            category: row.category as BlogCategory,
            count: parseInt(row.count)
        }));
    }

    /**
     * Find related posts by category and tags
     */
    async findRelated(
        postId: string,
        category: BlogCategory,
        tags: string[],
        limit = 3
    ): Promise<BlogPostSummary[]> {
        const query = `
            SELECT id, slug, title, excerpt, featured_image_url, featured_image_alt,
                   author_name, author_avatar_url, category, tags, published_at, read_time_minutes,
                   (CASE WHEN category = $2 THEN 1 ELSE 0 END) +
                   (SELECT COUNT(*) FROM unnest(tags) t WHERE t = ANY($3)) as relevance
            FROM flowmaestro.blog_posts
            WHERE id != $1 AND status = 'published' AND deleted_at IS NULL
            ORDER BY relevance DESC, published_at DESC
            LIMIT $4
        `;

        const result = await db.query<Omit<BlogPostRow, "content"> & { relevance: number }>(query, [
            postId,
            category,
            tags,
            limit
        ]);
        return result.rows.map((row) => this.mapToSummary(row));
    }

    /**
     * Check if a slug is available
     */
    async isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
        const query = excludeId
            ? "SELECT 1 FROM flowmaestro.blog_posts WHERE slug = $1 AND id != $2 AND deleted_at IS NULL"
            : "SELECT 1 FROM flowmaestro.blog_posts WHERE slug = $1 AND deleted_at IS NULL";

        const values = excludeId ? [slug, excludeId] : [slug];
        const result = await db.query(query, values);
        return result.rows.length === 0;
    }

    /**
     * Estimate read time in minutes based on word count
     * Average reading speed: 200-250 words per minute
     */
    private estimateReadTime(content: string): number {
        const wordCount = content.split(/\s+/).filter(Boolean).length;
        const minutes = Math.ceil(wordCount / 225);
        return Math.max(1, minutes);
    }

    /**
     * Map database row to full model
     */
    private mapToModel(row: BlogPostRow): BlogPostModel {
        return {
            id: row.id,
            slug: row.slug,
            title: row.title,
            excerpt: row.excerpt,
            content: row.content,
            featured_image_url: row.featured_image_url,
            featured_image_alt: row.featured_image_alt,
            author_name: row.author_name,
            author_avatar_url: row.author_avatar_url,
            author_bio: row.author_bio,
            category: row.category as BlogCategory,
            tags: row.tags || [],
            meta_title: row.meta_title,
            meta_description: row.meta_description,
            canonical_url: row.canonical_url,
            og_image_url: row.og_image_url,
            status: row.status as BlogStatus,
            published_at: row.published_at ? new Date(row.published_at) : null,
            view_count: row.view_count,
            read_time_minutes: row.read_time_minutes,
            created_by: row.created_by,
            updated_by: row.updated_by,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            deleted_at: row.deleted_at ? new Date(row.deleted_at) : null
        };
    }

    /**
     * Map database row to summary (for list views)
     */
    private mapToSummary(row: Omit<BlogPostRow, "content">): BlogPostSummary {
        return {
            id: row.id,
            slug: row.slug,
            title: row.title,
            excerpt: row.excerpt,
            featured_image_url: row.featured_image_url,
            featured_image_alt: row.featured_image_alt,
            author_name: row.author_name,
            author_avatar_url: row.author_avatar_url,
            category: row.category as BlogCategory,
            tags: row.tags || [],
            published_at: row.published_at ? new Date(row.published_at) : null,
            read_time_minutes: row.read_time_minutes
        };
    }
}
