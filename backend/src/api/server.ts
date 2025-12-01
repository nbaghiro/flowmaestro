import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { config } from "../core/config";
import { initializeSpanService, getSpanService } from "../core/tracing";
import { analyticsScheduler } from "../services/AnalyticsService";
import { redisEventBus } from "../services/events/RedisEventBus";
import { credentialRefreshScheduler } from "../services/oauth/CredentialRefreshScheduler";
import { eventBridge } from "../services/websocket/EventBridge";
import { db } from "../storage/database";
import { errorHandler, requestContextMiddleware } from "./middleware";
import { agentTemplateRoutes } from "./routes/agent-templates";
import { agentRoutes } from "./routes/agents";
import { analyticsRoutes } from "./routes/analytics";
import { authRoutes } from "./routes/auth";
import { checkpointRoutes } from "./routes/checkpoints";
import { connectionRoutes } from "./routes/connections";
import { executionRoutes } from "./routes/executions";
import { integrationRoutes } from "./routes/integrations";
import { knowledgeBaseRoutes } from "./routes/knowledge-bases";
import { oauthRoutes } from "./routes/oauth";
import { templateRoutes } from "./routes/templates";
import { threadRoutes } from "./routes/threads";
import { triggerRoutes } from "./routes/triggers";
import { webhookRoutes } from "./routes/webhooks";
import { websocketRoutes } from "./routes/websocket";
import { workflowRoutes } from "./routes/workflows";

export async function buildServer() {
    const fastify = Fastify({
        logger: {
            level: config.logLevel,
            transport:
                config.env === "development"
                    ? {
                          target: "pino-pretty",
                          options: {
                              translateTime: "HH:MM:ss Z",
                              ignore: "pid,hostname"
                          }
                      }
                    : undefined
        }
    });

    // Register CORS
    await fastify.register(cors, {
        origin: config.cors.origin,
        credentials: config.cors.credentials,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    });

    // Register JWT
    await fastify.register(jwt, {
        secret: config.jwt.secret,
        sign: {
            expiresIn: config.jwt.expiresIn
        }
    });

    // Register WebSocket
    await fastify.register(websocket);

    // Register multipart for file uploads
    await fastify.register(multipart, {
        limits: {
            fileSize: 50 * 1024 * 1024 // 50MB limit
        }
    });

    // Configure JSON parser to allow empty bodies
    fastify.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
        try {
            const json = body === "" || body === "{}" ? {} : JSON.parse(body as string);
            done(null, json);
        } catch (err) {
            done(err as Error, undefined);
        }
    });

    // Initialize event bridge (connect orchestrator events to WebSocket via Redis)
    await eventBridge.initialize();

    // Initialize observability (distributed tracing with spans)
    initializeSpanService({
        pool: db.getPool(),
        batchSize: 10,
        flushIntervalMs: 5000
    });

    fastify.log.info("SpanService initialized for distributed tracing");

    // Start analytics scheduler for periodic aggregation
    await analyticsScheduler.start();
    fastify.log.info("Analytics scheduler started");

    // Start credential refresh scheduler for automatic OAuth token refresh
    credentialRefreshScheduler.start();
    fastify.log.info("Credential refresh scheduler started");

    // Register RequestContext middleware (runs on every request)
    fastify.addHook("onRequest", requestContextMiddleware);

    // Health check route
    fastify.get("/health", async (_request, reply) => {
        const dbHealthy = await db.healthCheck();

        if (!dbHealthy) {
            return reply.status(503).send({
                success: false,
                error: "Database connection failed"
            });
        }

        return reply.send({
            success: true,
            data: {
                status: "healthy",
                timestamp: new Date().toISOString()
            }
        });
    });

    // Register routes
    await fastify.register(authRoutes, { prefix: "/api/auth" });
    await fastify.register(workflowRoutes, { prefix: "/api/workflows" });
    await fastify.register(templateRoutes, { prefix: "/api/templates" });
    await fastify.register(agentTemplateRoutes, { prefix: "/api/agent-templates" });
    await fastify.register(checkpointRoutes, { prefix: "/api/checkpoints" });
    await fastify.register(executionRoutes, { prefix: "/api/executions" });
    await fastify.register(connectionRoutes, { prefix: "/api/connections" });
    await fastify.register(integrationRoutes, { prefix: "/api/integrations" });
    await fastify.register(oauthRoutes, { prefix: "/api/oauth" });
    await fastify.register(knowledgeBaseRoutes, { prefix: "/api/knowledge-bases" });
    await fastify.register(agentRoutes, { prefix: "/api/agents" });
    await fastify.register(threadRoutes, { prefix: "/api/threads" });
    await fastify.register(triggerRoutes, { prefix: "/api" });
    await fastify.register(webhookRoutes, { prefix: "/api/webhooks" });
    await fastify.register(analyticsRoutes);
    await fastify.register(websocketRoutes);

    // Error handler (must be last)
    fastify.setErrorHandler(errorHandler);

    return fastify;
}

export async function startServer() {
    const fastify = await buildServer();

    try {
        await fastify.listen({
            port: config.server.port,
            host: config.server.host
        });

        fastify.log.info(`Server listening on http://${config.server.host}:${config.server.port}`);
    } catch (error) {
        fastify.log.error(error);
        process.exit(1);
    }

    // Graceful shutdown
    const signals = ["SIGINT", "SIGTERM"];
    signals.forEach((signal) => {
        process.on(signal, async () => {
            fastify.log.info(`Received ${signal}, closing server...`);
            await fastify.close();

            // Stop analytics scheduler
            analyticsScheduler.stop();

            // Stop credential refresh scheduler
            credentialRefreshScheduler.stop();

            // Flush spans before shutdown
            const spanService = getSpanService();
            await spanService.shutdown();

            await db.close();
            await redisEventBus.disconnect();
            process.exit(0);
        });
    });

    return fastify;
}
