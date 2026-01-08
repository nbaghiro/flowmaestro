import { FastifyInstance } from "fastify";
import { getFolderContentsRoute } from "./contents";
import { createFolderRoute } from "./create";
import { deleteFolderRoute } from "./delete";
import { getFolderRoute } from "./get";
import { listFoldersRoute } from "./list";
import { moveItemsToFolderRoute } from "./move";
import { updateFolderRoute } from "./update";

export async function folderRoutes(fastify: FastifyInstance) {
    fastify.register(
        async (instance) => {
            instance.register(createFolderRoute);
            instance.register(listFoldersRoute);
            instance.register(getFolderRoute);
            instance.register(updateFolderRoute);
            instance.register(deleteFolderRoute);
            instance.register(getFolderContentsRoute);
            instance.register(moveItemsToFolderRoute);
        },
        { prefix: "/folders" }
    );
}
