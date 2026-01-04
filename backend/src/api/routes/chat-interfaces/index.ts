import { FastifyInstance } from "fastify";
import { createChatInterfaceRoute } from "./create";
import { deleteChatInterfaceRoute } from "./delete";
import { duplicateChatInterfaceRoute } from "./duplicate";
import { getChatInterfaceRoute } from "./get";
import { listChatInterfacesRoute } from "./list";
import { publishChatInterfaceRoute } from "./publish";
import { listChatInterfaceSessionsRoute } from "./sessions";
import { unpublishChatInterfaceRoute } from "./unpublish";
import { updateChatInterfaceRoute } from "./update";
import { uploadChatInterfaceAssetRoute } from "./upload-assets";

export async function chatInterfaceRoutes(fastify: FastifyInstance) {
    // Chat interface management routes (requires auth)
    fastify.register(
        async (instance) => {
            instance.register(createChatInterfaceRoute);
            instance.register(listChatInterfacesRoute);
            instance.register(getChatInterfaceRoute);
            instance.register(updateChatInterfaceRoute);
            instance.register(deleteChatInterfaceRoute);
            instance.register(publishChatInterfaceRoute);
            instance.register(unpublishChatInterfaceRoute);
            instance.register(duplicateChatInterfaceRoute);
            instance.register(uploadChatInterfaceAssetRoute);
            instance.register(listChatInterfaceSessionsRoute);
        },
        { prefix: "/chat-interfaces" }
    );
}
