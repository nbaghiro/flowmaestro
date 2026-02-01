import { FastifyInstance } from "fastify";
import { TEMPLATE_CATEGORY_META, TemplateCategory } from "@flowmaestro/shared";
import { AgentTemplateRepository } from "../../../storage/repositories";

export async function getAgentCategoriesRoute(fastify: FastifyInstance) {
    fastify.get("/categories", async (_request, reply) => {
        const agentTemplateRepository = new AgentTemplateRepository();
        const categoryCounts = await agentTemplateRepository.getCategories();

        // Merge category counts with metadata (using shared TEMPLATE_CATEGORY_META)
        const categories = categoryCounts.map((cc) => ({
            category: cc.category,
            count: cc.count,
            ...TEMPLATE_CATEGORY_META[cc.category as TemplateCategory]
        }));

        // Add categories with zero count that aren't in the database yet
        // Agent templates only use the 5 main categories (not ecommerce, saas, healthcare)
        const agentCategories: TemplateCategory[] = [
            "marketing",
            "sales",
            "operations",
            "engineering",
            "support"
        ];
        const existingCategories = new Set<TemplateCategory>(
            categories.map((c) => c.category as TemplateCategory)
        );
        const allCategories = agentCategories
            .filter((key) => !existingCategories.has(key))
            .map((key) => ({
                category: key,
                count: 0,
                ...TEMPLATE_CATEGORY_META[key]
            }));

        return reply.send({
            success: true,
            data: [...categories, ...allCategories].sort((a, b) => b.count - a.count)
        });
    });
}
