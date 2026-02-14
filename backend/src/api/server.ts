import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { config } from "../core/config";
import { initializeLogger, shutdownLogger } from "../core/logging";
import { initializeOTel, shutdownOTel } from "../core/observability";
import { voiceSessionManager } from "../services/ai";
import { redisEventBus } from "../services/events/RedisEventBus";
import { credentialRefreshScheduler } from "../services/oauth/CredentialRefreshScheduler";
import { connectRedis, redis } from "../services/redis";
import { webhookDispatcher } from "../services/webhooks";
import { eventBridge } from "../services/websocket/EventBridge";
import { db } from "../storage/database";
import { getTemporalClient, closeTemporalConnection } from "../temporal/client";
import { errorHandler, requestContextMiddleware } from "./middleware";
import { agentTemplateRoutes } from "./routes/agent-templates";
import { agentRoutes } from "./routes/agents";
import { analyticsRoutes } from "./routes/analytics";
import { apiKeyRoutes } from "./routes/api-keys";
import { authRoutes } from "./routes/auth";
import { billingRoutes } from "./routes/billing";
import { blogAdminRoutes } from "./routes/blog";
import { chatInterfaceRoutes } from "./routes/chat-interfaces";
import { checkpointRoutes } from "./routes/checkpoints";
import { connectionRoutes } from "./routes/connections";
import { executionRoutes } from "./routes/executions";
import { extensionRoutes } from "./routes/extension";
import { folderRoutes } from "./routes/folders";
import { formInterfaceRoutes } from "./routes/form-interfaces";
import { integrationRoutes } from "./routes/integrations";
import { knowledgeBaseRoutes } from "./routes/knowledge-bases";
import { logRoutes } from "./routes/logs";
import { oauthRoutes } from "./routes/oauth";
import { oauth1Routes } from "./routes/oauth1";
import { personaInstanceRoutes } from "./routes/persona-instances";
import { personaRoutes } from "./routes/personas";
import { publicBlogRoutes } from "./routes/public/blog";
import { publicChatInterfaceFileRoutes } from "./routes/public/chat-interface-files";
import { publicChatInterfaceQueryRoutes } from "./routes/public/chat-interface-query";
import { publicChatInterfaceStreamRoutes } from "./routes/public/chat-interface-stream";
import { publicChatInterfaceRoutes } from "./routes/public/chat-interfaces";
import { publicFormInterfaceFilesRoutes } from "./routes/public/form-interface-files";
import { publicFormInterfaceQueryRoutes } from "./routes/public/form-interface-query";
import { publicFormInterfaceStreamRoutes } from "./routes/public/form-interface-stream";
import { publicFormInterfaceRoutes } from "./routes/public/form-interfaces";
import { sandboxRoutes } from "./routes/sandbox";
import { templateRoutes } from "./routes/templates";
import { threadRoutes } from "./routes/threads";
import { toolRoutes } from "./routes/tools";
import { triggerRoutes } from "./routes/triggers";
import { publicApiV1Routes } from "./routes/v1";
import { webhookRoutes } from "./routes/webhooks";
import { workflowRoutes } from "./routes/workflows";
import { workspaceRoutes } from "./routes/workspaces";
import { voiceWebSocketRoutes } from "./websocket";

export async function buildServer() {
    // Initialize centralized logger
    const logger = initializeLogger({
        level: config.logging.level,
        serviceName: config.logging.serviceName,
        serviceVersion: config.logging.serviceVersion,
        environment: config.env,
        gcpProjectId: config.logging.gcpProjectId,
        enableCloudLogging: config.logging.enableCloudLogging
    });

    const fastify = Fastify({
        loggerInstance: logger,
        // Disable default serializers since we have custom ones in the logger
        disableRequestLogging: false
    });

    // Register CORS with dynamic origin
    // - Allows any origin (for widgets and public API on external sites)
    // - Credentials enabled for known origins (for authenticated routes with cookies/sessions)
    // - Route-level authentication (JWT, API keys) provides security
    await fastify.register(cors, {
        origin: (origin: string | undefined, callback) => {
            // Allow requests with no origin (same-origin, server-to-server, curl, etc.)
            if (!origin) {
                callback(null, true);
                return;
            }
            // Return the actual origin string (required when credentials: true)
            // Security is handled by route-level auth (JWT, API keys)
            callback(null, origin);
        },
        // Credentials (cookies) are needed for authenticated routes from known origins
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        // Explicitly allow headers used by the frontend
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Session-ID",
            "X-Workspace-Id",
            "X-Requested-With",
            "Accept",
            "Origin"
        ],
        // Expose headers that the frontend may need to read
        exposedHeaders: ["X-Correlation-ID"]
    });

    // Register JWT
    await fastify.register(jwt, {
        secret: config.jwt.secret,
        sign: {
            expiresIn: config.jwt.expiresIn
        }
    });

    // Register multipart for file uploads
    await fastify.register(multipart, {
        limits: {
            fileSize: 50 * 1024 * 1024 // 50MB limit
        }
    });

    // Register WebSocket support for real-time voice chat
    await fastify.register(websocket, {
        options: {
            maxPayload: 1024 * 1024 // 1MB max payload for audio chunks
        }
    });

    // Configure JSON parser to allow empty bodies and store raw body for Stripe webhooks
    fastify.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) => {
        try {
            // Store raw body for Stripe webhook signature verification
            (req as typeof req & { rawBody?: Buffer }).rawBody = body as Buffer;

            const bodyString = body.toString();
            const json = bodyString === "" || bodyString === "{}" ? {} : JSON.parse(bodyString);
            done(null, json);
        } catch (err) {
            done(err as Error, undefined);
        }
    });

    // Initialize event bridge (manages Redis connection for SSE streaming)
    await eventBridge.initialize();

    // Connect to Redis for rate limiting and caching
    await connectRedis();
    fastify.log.info("Redis connected for rate limiting");

    // Initialize OpenTelemetry (exports to GCP Cloud Trace/Monitoring)
    initializeOTel({
        serviceName: "flowmaestro-api",
        serviceVersion: "1.0.0",
        enabled: config.env === "production"
    });
    fastify.log.info("OpenTelemetry initialized for distributed tracing");

    // Start credential refresh scheduler for automatic OAuth token refresh
    credentialRefreshScheduler.start();
    fastify.log.info("Credential refresh scheduler started");

    // Start webhook retry processor for failed webhook deliveries
    webhookDispatcher.startRetryProcessor(30000); // Check every 30 seconds
    fastify.log.info("Webhook retry processor started");

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
    await fastify.register(analyticsRoutes);
    await fastify.register(authRoutes, { prefix: "/auth" });
    await fastify.register(workflowRoutes, { prefix: "/workflows" });
    await fastify.register(templateRoutes, { prefix: "/templates" });
    await fastify.register(agentTemplateRoutes, { prefix: "/agent-templates" });
    await fastify.register(checkpointRoutes, { prefix: "/checkpoints" });
    await fastify.register(executionRoutes, { prefix: "/executions" });
    await fastify.register(connectionRoutes, { prefix: "/connections" });
    await fastify.register(integrationRoutes, { prefix: "/integrations" });
    await fastify.register(logRoutes);
    await fastify.register(oauthRoutes, { prefix: "/oauth" });
    await fastify.register(oauth1Routes, { prefix: "/oauth1" });
    await fastify.register(knowledgeBaseRoutes, { prefix: "/knowledge-bases" });
    await fastify.register(agentRoutes, { prefix: "/agents" });
    await fastify.register(apiKeyRoutes, { prefix: "/api-keys" });
    await fastify.register(threadRoutes, { prefix: "/threads" });
    await fastify.register(toolRoutes, { prefix: "/tools" });
    await fastify.register(triggerRoutes);
    await fastify.register(folderRoutes);
    await fastify.register(formInterfaceRoutes);
    await fastify.register(chatInterfaceRoutes);
    await fastify.register(webhookRoutes, { prefix: "/webhooks" });
    await fastify.register(workspaceRoutes);
    await fastify.register(extensionRoutes, { prefix: "/extension" });
    await fastify.register(personaRoutes, { prefix: "/personas" });
    await fastify.register(personaInstanceRoutes, { prefix: "/persona-instances" });
    await fastify.register(sandboxRoutes, { prefix: "/sandbox" });

    // Public routes (widgets and public API - CORS allows any origin via dynamic origin check)
    await fastify.register(publicFormInterfaceRoutes, { prefix: "/public/form-interfaces" });
    await fastify.register(publicFormInterfaceFilesRoutes, { prefix: "/public/form-interfaces" });
    await fastify.register(publicFormInterfaceStreamRoutes, { prefix: "/public/form-interfaces" });
    await fastify.register(publicFormInterfaceQueryRoutes, { prefix: "/public/form-interfaces" });
    await fastify.register(publicChatInterfaceRoutes, { prefix: "/public/chat-interfaces" });
    await fastify.register(publicChatInterfaceStreamRoutes, { prefix: "/public/chat-interfaces" });
    await fastify.register(publicChatInterfaceFileRoutes, { prefix: "/public/chat-interfaces" });
    await fastify.register(publicChatInterfaceQueryRoutes, { prefix: "/public/chat-interfaces" });
    await fastify.register(publicApiV1Routes, { prefix: "/api/v1" });
    await fastify.register(publicBlogRoutes, { prefix: "/public/blog" });

    // Blog admin routes (authenticated)
    await fastify.register(blogAdminRoutes, { prefix: "/blog" });

    // Billing routes (Stripe integration)
    await fastify.register(billingRoutes);

    // WebSocket routes for real-time voice chat
    await fastify.register(voiceWebSocketRoutes);

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

        // Proactively connect to Temporal (non-blocking)
        // This ensures the connection is ready when the first workflow execution request comes in
        getTemporalClient()
            .then(() => fastify.log.info("Temporal client ready"))
            .catch((err) =>
                fastify.log.warn(`Temporal client pre-connection failed: ${err.message}`)
            );
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

            // Close all voice sessions
            await voiceSessionManager.closeAllSessions();

            // Stop credential refresh scheduler
            credentialRefreshScheduler.stop();

            // Stop webhook retry processor
            webhookDispatcher.stopRetryProcessor();

            // Close Temporal connection
            await closeTemporalConnection();

            // Shutdown OpenTelemetry (flush pending telemetry)
            await shutdownOTel();

            // Flush and shutdown logger
            await shutdownLogger();

            await db.close();
            await redis.quit();
            await redisEventBus.disconnect();
            process.exit(0);
        });
    });

    return fastify;
}
