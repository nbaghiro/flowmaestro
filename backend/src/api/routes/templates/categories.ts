import { FastifyInstance } from "fastify";
import { TEMPLATE_CATEGORY_META, type TemplateCategory } from "@flowmaestro/shared";
import { TemplateRepository } from "../../../storage/repositories";

export async function getCategoriesRoute(fastify: FastifyInstance) {
    fastify.get("/categories", async (_request, reply) => {
        const templateRepository = new TemplateRepository();
        const categoryCounts = await templateRepository.getCategories();

        // Merge category counts with metadata
        const categories = categoryCounts.map((cc) => ({
            category: cc.category,
            count: cc.count,
            ...TEMPLATE_CATEGORY_META[cc.category as TemplateCategory]
        }));

        // Add categories with zero count that aren't in the database yet
        const existingCategories = new Set(categories.map((c) => c.category));
        const allCategories = Object.entries(TEMPLATE_CATEGORY_META)
            .filter(([key]) => !existingCategories.has(key as TemplateCategory))
            .map(([key, meta]) => ({
                category: key as TemplateCategory,
                count: 0,
                ...meta
            }));

        return reply.send({
            success: true,
            data: [...categories, ...allCategories].sort((a, b) => b.count - a.count)
        });
    });
}
