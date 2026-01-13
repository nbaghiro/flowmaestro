import { FastifyInstance } from "fastify";
import { authMiddleware, workspaceContextMiddleware } from "../../middleware";
import { createTriggerRoute } from "./create";
import { deleteTriggerRoute } from "./delete";
import { executeTriggerRoute } from "./execute";
import { getTriggerRoute } from "./get";
import { listTriggersRoute } from "./list";
import { triggerProvidersRoute } from "./providers";
import { updateTriggerRoute } from "./update";
import { webhookReceiverRoute } from "./webhook";

export async function triggerRoutes(fastify: FastifyInstance) {
    // Webhook receiver routes (PUBLIC - no auth)
    fastify.register(
        async (instance) => {
            instance.register(webhookReceiverRoute);
        },
        { prefix: "/webhooks" }
    );

    // Trigger management routes (requires auth and workspace context)
    fastify.register(
        async (instance) => {
            // Add auth and workspace context middleware to all routes in this scope
            instance.addHook("preHandler", authMiddleware);
            instance.addHook("preHandler", workspaceContextMiddleware);

            instance.register(createTriggerRoute);
            instance.register(listTriggersRoute);
            instance.register(getTriggerRoute);
            instance.register(updateTriggerRoute);
            instance.register(deleteTriggerRoute);
            instance.register(executeTriggerRoute);
            instance.register(triggerProvidersRoute);
        },
        { prefix: "/triggers" }
    );
}
