import { FastifyInstance } from "fastify";
import { getFolderContentsRoute } from "./contents";
import { createFolderRoute } from "./create";
import { deleteFolderRoute } from "./delete";
import { getFolderRoute } from "./get";
import { listFoldersRoute } from "./list";
import { updateFolderRoute } from "./update";

export async function folderRoutes(fastify: FastifyInstance) {
    await createFolderRoute(fastify);
    await listFoldersRoute(fastify);
    await getFolderRoute(fastify);
    await updateFolderRoute(fastify);
    await deleteFolderRoute(fastify);
    await getFolderContentsRoute(fastify);
}
