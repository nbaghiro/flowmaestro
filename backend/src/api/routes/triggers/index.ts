import { FastifyInstance } from "fastify";
import { createTriggerRoute } from "./create";
import { deleteTriggerRoute } from "./delete";
import { executeTriggerRoute } from "./execute";
import { getTriggerRoute } from "./get";
import { listTriggersRoute } from "./list";
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

    // Trigger management routes (requires auth)
    fastify.register(
        async (instance) => {
            instance.register(createTriggerRoute);
            instance.register(listTriggersRoute);
            instance.register(getTriggerRoute);
            instance.register(updateTriggerRoute);
            instance.register(deleteTriggerRoute);
            instance.register(executeTriggerRoute);
        },
        { prefix: "/triggers" }
    );
}
