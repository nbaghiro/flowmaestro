import { FastifyInstance } from "fastify";
import { cancelRoute } from "./cancel";
import { checkoutRoute } from "./checkout";
import { createSubscriptionRoute } from "./create-subscription";
import { creditPackCheckoutRoute } from "./credit-pack-checkout";
import { paymentHistoryRoute } from "./payment-history";
import { plansRoute } from "./plans";
import { portalRoute } from "./portal";
import { reactivateRoute } from "./reactivate";
import { subscriptionRoute } from "./subscription";
import { webhookRoute } from "./webhook";

export async function billingRoutes(fastify: FastifyInstance) {
    // Authenticated billing routes
    fastify.register(
        async (instance) => {
            instance.register(plansRoute);
            instance.register(subscriptionRoute);
            instance.register(checkoutRoute);
            instance.register(createSubscriptionRoute);
            instance.register(creditPackCheckoutRoute);
            instance.register(portalRoute);
            instance.register(cancelRoute);
            instance.register(reactivateRoute);
            instance.register(paymentHistoryRoute);
        },
        { prefix: "/billing" }
    );

    // Webhook route (no auth - uses Stripe signature verification)
    fastify.register(webhookRoute, { prefix: "/billing" });
}
