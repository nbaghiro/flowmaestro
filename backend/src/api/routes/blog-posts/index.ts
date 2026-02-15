/**
 * Admin Blog Routes
 *
 * Authenticated routes for managing blog posts.
 * Requires blog admin authorization.
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { createServiceLogger } from "../../../core/logging";
import {
    BLOG_CATEGORIES,
    BLOG_STATUSES,
    type BlogCategory,
    type BlogStatus
} from "../../../storage/models/BlogPost";
import { BlogPostRepository } from "../../../storage/repositories/BlogPostRepository";
import { authMiddleware } from "../../middleware/auth";
import { blogAdminMiddleware } from "../../middleware/blog-admin";
import { NotFoundError, BadRequestError } from "../../middleware/error-handler";
import { invalidateBlogCache } from "../public/blog-posts";

const logger = createServiceLogger("AdminBlogRoutes");

// Validation schemas
const createBlogPostSchema = z.object({
    slug: z
        .string()
        .min(1)
        .max(255)
        .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens only"),
    title: z.string().min(1).max(500),
    excerpt: z.string().max(500).optional(),
    content: z.string().min(1),
    featured_image_url: z.string().url().optional(),
    featured_image_alt: z.string().max(500).optional(),
    author_name: z.string().min(1).max(255),
    author_avatar_url: z.string().url().optional(),
    author_bio: z.string().max(1000).optional(),
    category: z.enum(BLOG_CATEGORIES as unknown as [string, ...string[]]),
    tags: z.array(z.string()).max(10).optional(),
    meta_title: z.string().max(70).optional(),
    meta_description: z.string().max(160).optional(),
    canonical_url: z.string().url().optional(),
    og_image_url: z.string().url().optional(),
    status: z.enum(BLOG_STATUSES as unknown as [string, ...string[]]).optional(),
    read_time_minutes: z.number().int().min(1).max(60).optional()
});

const updateBlogPostSchema = z.object({
    slug: z
        .string()
        .min(1)
        .max(255)
        .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens only")
        .optional(),
    title: z.string().min(1).max(500).optional(),
    excerpt: z.string().max(500).optional(),
    content: z.string().min(1).optional(),
    featured_image_url: z.string().url().nullable().optional(),
    featured_image_alt: z.string().max(500).nullable().optional(),
    author_name: z.string().min(1).max(255).optional(),
    author_avatar_url: z.string().url().nullable().optional(),
    author_bio: z.string().max(1000).nullable().optional(),
    category: z.enum(BLOG_CATEGORIES as unknown as [string, ...string[]]).optional(),
    tags: z.array(z.string()).max(10).optional(),
    meta_title: z.string().max(70).nullable().optional(),
    meta_description: z.string().max(160).nullable().optional(),
    canonical_url: z.string().url().nullable().optional(),
    og_image_url: z.string().url().nullable().optional(),
    status: z.enum(BLOG_STATUSES as unknown as [string, ...string[]]).optional(),
    read_time_minutes: z.number().int().min(1).max(60).optional()
});

interface ListQueryParams {
    category?: string;
    status?: string;
    search?: string;
    limit?: string;
    offset?: string;
}

interface IdParams {
    id: string;
}

export async function blogAdminRoutes(fastify: FastifyInstance) {
    const blogRepo = new BlogPostRepository();

    // Apply auth middleware to all routes
    fastify.addHook("preHandler", authMiddleware);
    fastify.addHook("preHandler", blogAdminMiddleware);

    /**
     * GET /blog
     * List all blog posts (including drafts) for admin
     */
    fastify.get("/", async (request, reply) => {
        const query = request.query as ListQueryParams;
        const category = query.category as BlogCategory | undefined;
        const status = query.status as BlogStatus | undefined;
        const search = query.search;
        const limit = Math.min(parseInt(query.limit || "20"), 100);
        const offset = parseInt(query.offset || "0");

        try {
            const result = await blogRepo.findAll({
                category,
                status,
                search,
                limit,
                offset
            });

            return reply.send({
                success: true,
                data: {
                    posts: result.posts,
                    total: result.total,
                    limit,
                    offset,
                    hasMore: offset + limit < result.total
                }
            });
        } catch (error) {
            logger.error({ error }, "Error fetching blog posts");
            return reply.status(500).send({
                success: false,
                error: "Failed to fetch blog posts"
            });
        }
    });

    /**
     * GET /blog/:id
     * Get a single blog post by ID (for editing)
     */
    fastify.get<{ Params: IdParams }>("/:id", async (request, reply) => {
        const { id } = request.params;

        try {
            const post = await blogRepo.findById(id);

            if (!post) {
                throw new NotFoundError("Blog post not found");
            }

            return reply.send({
                success: true,
                data: post
            });
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error, id }, "Error fetching blog post");
            return reply.status(500).send({
                success: false,
                error: "Failed to fetch blog post"
            });
        }
    });

    /**
     * POST /blog
     * Create a new blog post
     */
    fastify.post("/", async (request, reply) => {
        const body = createBlogPostSchema.parse(request.body);

        try {
            // Check if slug is available
            const slugAvailable = await blogRepo.isSlugAvailable(body.slug);
            if (!slugAvailable) {
                throw new BadRequestError(`Slug "${body.slug}" is already in use`);
            }

            const post = await blogRepo.create({
                ...body,
                category: body.category as BlogCategory,
                status: body.status as BlogStatus | undefined,
                created_by: request.user.id
            });

            logger.info({ postId: post.id, slug: post.slug }, "Blog post created");

            // Invalidate cache if published
            if (post.status === "published") {
                invalidateBlogCache(post.slug);
            }

            return reply.status(201).send({
                success: true,
                data: post
            });
        } catch (error) {
            if (error instanceof BadRequestError) {
                throw error;
            }
            logger.error({ error }, "Error creating blog post");
            return reply.status(500).send({
                success: false,
                error: "Failed to create blog post"
            });
        }
    });

    /**
     * PUT /blog/:id
     * Update a blog post
     */
    fastify.put<{ Params: IdParams }>("/:id", async (request, reply) => {
        const { id } = request.params;
        const body = updateBlogPostSchema.parse(request.body);

        try {
            // Get existing post to check slug
            const existing = await blogRepo.findById(id);
            if (!existing) {
                throw new NotFoundError("Blog post not found");
            }

            // Check if new slug is available (if slug is being changed)
            if (body.slug && body.slug !== existing.slug) {
                const slugAvailable = await blogRepo.isSlugAvailable(body.slug, id);
                if (!slugAvailable) {
                    throw new BadRequestError(`Slug "${body.slug}" is already in use`);
                }
            }

            const post = await blogRepo.update(id, {
                ...body,
                category: body.category as BlogCategory | undefined,
                status: body.status as BlogStatus | undefined,
                updated_by: request.user.id
            });

            if (!post) {
                throw new NotFoundError("Blog post not found");
            }

            logger.info({ postId: post.id, slug: post.slug }, "Blog post updated");

            // Invalidate cache for old and new slug
            invalidateBlogCache(existing.slug);
            if (body.slug && body.slug !== existing.slug) {
                invalidateBlogCache(body.slug);
            }

            return reply.send({
                success: true,
                data: post
            });
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof BadRequestError) {
                throw error;
            }
            logger.error({ error, id }, "Error updating blog post");
            return reply.status(500).send({
                success: false,
                error: "Failed to update blog post"
            });
        }
    });

    /**
     * DELETE /blog/:id
     * Soft delete a blog post
     */
    fastify.delete<{ Params: IdParams }>("/:id", async (request, reply) => {
        const { id } = request.params;

        try {
            // Get post to get slug for cache invalidation
            const post = await blogRepo.findById(id);
            if (!post) {
                throw new NotFoundError("Blog post not found");
            }

            const deleted = await blogRepo.softDelete(id);
            if (!deleted) {
                throw new NotFoundError("Blog post not found");
            }

            logger.info({ postId: id, slug: post.slug }, "Blog post deleted");

            // Invalidate cache
            invalidateBlogCache(post.slug);

            return reply.send({
                success: true,
                message: "Blog post deleted"
            });
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error, id }, "Error deleting blog post");
            return reply.status(500).send({
                success: false,
                error: "Failed to delete blog post"
            });
        }
    });

    /**
     * POST /blog/:id/publish
     * Publish a blog post
     */
    fastify.post<{ Params: IdParams }>("/:id/publish", async (request, reply) => {
        const { id } = request.params;

        try {
            const post = await blogRepo.publish(id, request.user.id);

            if (!post) {
                throw new NotFoundError("Blog post not found");
            }

            logger.info({ postId: post.id, slug: post.slug }, "Blog post published");

            // Invalidate cache
            invalidateBlogCache(post.slug);

            return reply.send({
                success: true,
                data: post
            });
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error, id }, "Error publishing blog post");
            return reply.status(500).send({
                success: false,
                error: "Failed to publish blog post"
            });
        }
    });

    /**
     * POST /blog/:id/unpublish
     * Unpublish a blog post (set to draft)
     */
    fastify.post<{ Params: IdParams }>("/:id/unpublish", async (request, reply) => {
        const { id } = request.params;

        try {
            const post = await blogRepo.unpublish(id, request.user.id);

            if (!post) {
                throw new NotFoundError("Blog post not found");
            }

            logger.info({ postId: post.id, slug: post.slug }, "Blog post unpublished");

            // Invalidate cache
            invalidateBlogCache(post.slug);

            return reply.send({
                success: true,
                data: post
            });
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ error, id }, "Error unpublishing blog post");
            return reply.status(500).send({
                success: false,
                error: "Failed to unpublish blog post"
            });
        }
    });

    /**
     * GET /blog/check-slug/:slug
     * Check if a slug is available
     */
    fastify.get<{ Params: { slug: string }; Querystring: { excludeId?: string } }>(
        "/check-slug/:slug",
        async (request, reply) => {
            const { slug } = request.params;
            const { excludeId } = request.query;

            try {
                const available = await blogRepo.isSlugAvailable(slug, excludeId);

                return reply.send({
                    success: true,
                    data: { available }
                });
            } catch (error) {
                logger.error({ error, slug }, "Error checking slug availability");
                return reply.status(500).send({
                    success: false,
                    error: "Failed to check slug availability"
                });
            }
        }
    );
}
