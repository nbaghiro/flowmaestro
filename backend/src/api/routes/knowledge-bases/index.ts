import { FastifyInstance } from "fastify";
import { addUrlRoute } from "./add-url";
import { createKnowledgeBaseRoute } from "./create";
import { deleteKnowledgeBaseRoute } from "./delete";
import { deleteDocumentRoute } from "./delete-document";
import { downloadDocumentRoute } from "./download-document";
import { getKnowledgeBaseRoute } from "./get";
import { listKnowledgeBasesRoute } from "./list";
import { listDocumentsRoute } from "./list-documents";
import { queryKnowledgeBaseRoute } from "./query";
import { reprocessDocumentRoute } from "./reprocess-document";
import { getStatsRoute } from "./stats";
import { streamKnowledgeBaseRoute } from "./stream";
import { updateKnowledgeBaseRoute } from "./update";
import { uploadDocumentRoute } from "./upload-document";

export async function knowledgeBaseRoutes(fastify: FastifyInstance) {
    // Knowledge Base CRUD
    await listKnowledgeBasesRoute(fastify);
    await createKnowledgeBaseRoute(fastify);
    await getKnowledgeBaseRoute(fastify);
    await updateKnowledgeBaseRoute(fastify);
    await deleteKnowledgeBaseRoute(fastify);
    await getStatsRoute(fastify);

    // Document Management
    await listDocumentsRoute(fastify);
    await uploadDocumentRoute(fastify);
    await downloadDocumentRoute(fastify);
    await addUrlRoute(fastify);
    await deleteDocumentRoute(fastify);
    await reprocessDocumentRoute(fastify);

    // Query
    await queryKnowledgeBaseRoute(fastify);

    // Real-time streaming
    await streamKnowledgeBaseRoute(fastify);
}
