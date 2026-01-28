import { FastifyInstance } from "fastify";
import { TemplateCategory, TemplateSortBy } from "../../../storage/models/Template";
import { TemplateRepository } from "../../../storage/repositories";
import { validateQuery } from "../../middleware";
import { listTemplatesQuerySchema, ListTemplatesQuery } from "../../schemas/template-schemas";

export async function listTemplatesRoute(fastify: FastifyInstance) {
    fastify.get(
        "/",
        {
            preHandler: [validateQuery(listTemplatesQuerySchema)]
        },
        async (request, reply) => {
            const templateRepository = new TemplateRepository();
            const query = request.query as ListTemplatesQuery;

            const { templates, total } = await templateRepository.findAll({
                category: query.category as TemplateCategory | undefined,
                tags: query.tags,
                featured: query.featured,
                search: query.search,
                status: query.status || "active",
                sortBy: (query.sortBy as TemplateSortBy) || "complexity",
                limit: query.limit || 20,
                offset: query.offset || 0
            });

            const limit = query.limit || 20;
            const offset = query.offset || 0;
            const page = Math.floor(offset / limit) + 1;
            const pageSize = limit;
            const hasMore = offset + templates.length < total;

            return reply.send({
                success: true,
                data: {
                    items: templates,
                    total,
                    page,
                    pageSize,
                    hasMore
                }
            });
        }
    );
}
