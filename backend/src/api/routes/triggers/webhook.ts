import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { WebhookService, WebhookRequestData } from "../../../temporal/services/WebhookService";

/**
 * Webhook receiver endpoint
 * PUBLIC endpoint - no auth required
 * Receives webhook requests and triggers workflow execution
 */
export async function webhookReceiverRoute(fastify: FastifyInstance) {
    // Handle all HTTP methods
    const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
    type MethodName = "get" | "post" | "put" | "delete" | "patch";

    methods.forEach((method) => {
        const methodName = method.toLowerCase() as MethodName;
        fastify[methodName]("/:triggerId", async (request: FastifyRequest, reply: FastifyReply) => {
            const webhookService = new WebhookService();
            const { triggerId } = request.params as { triggerId: string };

            // Extract request data
            const headers: Record<string, string | string[]> = {};
            for (const [key, value] of Object.entries(request.headers)) {
                if (value !== undefined) {
                    headers[key] = value;
                }
            }

            const requestData: WebhookRequestData = {
                method: request.method,
                headers,
                body: (request.body as Record<string, unknown>) || {},
                query: (request.query as Record<string, unknown>) || {},
                path: request.url,
                ip: request.ip,
                userAgent: request.headers["user-agent"] || undefined
            };

            try {
                const result = await webhookService.processWebhook(triggerId, requestData);

                return reply.status(result.statusCode).send({
                    success: result.success,
                    executionId: result.executionId,
                    message: result.message,
                    error: result.error
                });
            } catch (error) {
                console.error("Webhook processing error:", error);
                return reply.status(500).send({
                    success: false,
                    error: "Internal server error"
                });
            }
        });
    });
}
