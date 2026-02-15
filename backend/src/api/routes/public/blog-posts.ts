/**
 * Public Blog Routes
 *
 * Routes for the public blog API (no authentication required).
 * These routes are used by the marketing site at blog.flowmaestro.ai
 */

import { FastifyInstance } from "fastify";
import type { BlogPostSummary, BlogPost, BlogPostWithRelated } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { redis } from "../../../services/redis";
import {
    BLOG_CATEGORIES,
    BLOG_CATEGORY_META,
    type BlogCategory,
    type BlogPostModel,
    type BlogPostSummary as BackendBlogPostSummary
} from "../../../storage/models/BlogPost";
import { BlogPostRepository } from "../../../storage/repositories/BlogPostRepository";

const logger = createServiceLogger("PublicBlogRoutes");

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 300;

// Transform backend summary to frontend format (camelCase)
function transformSummary(post: BackendBlogPostSummary): BlogPostSummary {
    return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        featuredImageUrl: post.featured_image_url,
        featuredImageAlt: post.featured_image_alt,
        author: {
            name: post.author_name,
            avatarUrl: post.author_avatar_url,
            bio: null
        },
        category: post.category,
        tags: post.tags,
        publishedAt: post.published_at?.toISOString() || null,
        readTimeMinutes: post.read_time_minutes
    };
}

// Transform backend post to frontend format (camelCase)
function transformPost(post: BlogPostModel): BlogPost {
    return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        featuredImageUrl: post.featured_image_url,
        featuredImageAlt: post.featured_image_alt,
        author: {
            name: post.author_name,
            avatarUrl: post.author_avatar_url,
            bio: post.author_bio
        },
        category: post.category,
        tags: post.tags,
        metaTitle: post.meta_title,
        metaDescription: post.meta_description,
        canonicalUrl: post.canonical_url,
        ogImageUrl: post.og_image_url,
        status: post.status,
        publishedAt: post.published_at?.toISOString() || null,
        viewCount: post.view_count,
        readTimeMinutes: post.read_time_minutes,
        createdAt: post.created_at.toISOString(),
        updatedAt: post.updated_at.toISOString()
    };
}

interface ListQueryParams {
    category?: string;
    search?: string;
    limit?: string;
    offset?: string;
    tags?: string;
}

interface SlugParams {
    slug: string;
}

export async function publicBlogRoutes(fastify: FastifyInstance) {
    const blogRepo = new BlogPostRepository();

    /**
     * GET /public/blog
     * List published blog posts with pagination and filtering
     */
    fastify.get("/", async (request, reply) => {
        const query = request.query as ListQueryParams;
        const category = query.category as BlogCategory | undefined;
        const search = query.search;
        const limit = Math.min(parseInt(query.limit || "20"), 50);
        const offset = parseInt(query.offset || "0");
        const tags = query.tags ? query.tags.split(",").map((t) => t.trim()) : undefined;

        // Validate category if provided
        if (category && !BLOG_CATEGORIES.includes(category)) {
            return reply.status(400).send({
                success: false,
                error: `Invalid category. Valid categories: ${BLOG_CATEGORIES.join(", ")}`
            });
        }

        try {
            // Try cache for non-search queries
            const cacheKey = search
                ? null
                : `blog:list:${category || "all"}:${tags?.join(",") || ""}:${limit}:${offset}`;

            if (cacheKey) {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    reply.header("X-Cache", "HIT");
                    return reply.send(JSON.parse(cached));
                }
            }

            const result = await blogRepo.findPublished({
                category,
                tags,
                search,
                limit,
                offset
            });

            // Transform posts to camelCase format
            const transformedPosts = result.posts.map(transformSummary);

            const response = {
                success: true,
                data: {
                    posts: transformedPosts,
                    total: result.total,
                    limit,
                    offset,
                    hasMore: offset + limit < result.total
                }
            };

            // Cache the result
            if (cacheKey) {
                await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(response));
                reply.header("X-Cache", "MISS");
            }

            // Set cache headers for CDN
            reply.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");

            return reply.send(response);
        } catch (error) {
            logger.error({ error }, "Error fetching blog posts");
            return reply.status(500).send({
                success: false,
                error: "Failed to fetch blog posts"
            });
        }
    });

    /**
     * GET /public/blog/categories
     * Get all categories with post counts
     */
    fastify.get("/categories", async (_request, reply) => {
        try {
            // Try cache
            const cacheKey = "blog:categories";
            const cached = await redis.get(cacheKey);

            if (cached) {
                reply.header("X-Cache", "HIT");
                return reply.send(JSON.parse(cached));
            }

            const categories = await blogRepo.getCategories();

            // Enrich with metadata
            const enrichedCategories = categories.map((cat) => ({
                ...cat,
                ...BLOG_CATEGORY_META[cat.category]
            }));

            const response = {
                success: true,
                data: enrichedCategories
            };

            // Cache for longer (categories change rarely)
            await redis.setex(cacheKey, CACHE_TTL * 2, JSON.stringify(response));
            reply.header("X-Cache", "MISS");
            reply.header("Cache-Control", "public, max-age=300, stale-while-revalidate=600");

            return reply.send(response);
        } catch (error) {
            logger.error({ error }, "Error fetching blog categories");
            return reply.status(500).send({
                success: false,
                error: "Failed to fetch categories"
            });
        }
    });

    /**
     * GET /public/blog/:slug
     * Get a single published blog post by slug
     */
    fastify.get<{ Params: SlugParams }>("/:slug", async (request, reply) => {
        const { slug } = request.params;

        try {
            // Try cache
            const cacheKey = `blog:post:${slug}`;
            const cached = await redis.get(cacheKey);

            if (cached) {
                // Still increment view count even on cache hit
                const post = JSON.parse(cached);
                blogRepo.incrementViewCount(post.data.id);
                reply.header("X-Cache", "HIT");
                return reply.send(post);
            }

            const post = await blogRepo.findPublishedBySlug(slug);

            if (!post) {
                return reply.status(404).send({
                    success: false,
                    error: "Blog post not found"
                });
            }

            // Increment view count (fire and forget)
            blogRepo.incrementViewCount(post.id);

            // Get related posts
            const relatedPosts = await blogRepo.findRelated(post.id, post.category, post.tags, 3);

            // Transform to camelCase format
            const transformedPost: BlogPostWithRelated = {
                ...transformPost(post),
                relatedPosts: relatedPosts.map(transformSummary)
            };

            const response = {
                success: true,
                data: transformedPost
            };

            // Cache the result
            await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(response));
            reply.header("X-Cache", "MISS");
            reply.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");

            return reply.send(response);
        } catch (error) {
            logger.error({ error, slug }, "Error fetching blog post");
            return reply.status(500).send({
                success: false,
                error: "Failed to fetch blog post"
            });
        }
    });
}

/**
 * Invalidate blog cache when posts are created/updated/deleted
 */
export async function invalidateBlogCache(slug?: string): Promise<void> {
    try {
        // Delete specific post cache if slug provided
        if (slug) {
            await redis.del(`blog:post:${slug}`);
        }

        // Delete all list caches (pattern match)
        const listKeys = await redis.keys("blog:list:*");
        if (listKeys.length > 0) {
            await redis.del(...listKeys);
        }

        // Delete categories cache
        await redis.del("blog:categories");

        logger.info({ slug }, "Blog cache invalidated");
    } catch (error) {
        logger.error({ error, slug }, "Failed to invalidate blog cache");
    }
}
