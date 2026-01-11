import { FastifyInstance } from "fastify";
import { getFolderChildrenRoute } from "./children";
import { getFolderContentsRoute } from "./contents";
import { createFolderRoute } from "./create";
import { deleteFolderRoute } from "./delete";
import { getFolderRoute } from "./get";
import { listFoldersRoute } from "./list";
import { moveItemsToFolderRoute } from "./move";
import { moveFolderRoute } from "./move-folder";
import { removeItemsFromFolderRoute } from "./remove";
import { getFolderTreeRoute } from "./tree";
import { updateFolderRoute } from "./update";

export async function folderRoutes(fastify: FastifyInstance) {
    fastify.register(
        async (instance) => {
            instance.register(createFolderRoute);
            instance.register(listFoldersRoute);
            instance.register(getFolderTreeRoute);
            instance.register(getFolderRoute);
            instance.register(updateFolderRoute);
            instance.register(deleteFolderRoute);
            instance.register(getFolderContentsRoute);
            instance.register(getFolderChildrenRoute);
            instance.register(moveItemsToFolderRoute);
            instance.register(moveFolderRoute);
            instance.register(removeItemsFromFolderRoute);
        },
        { prefix: "/folders" }
    );
}
