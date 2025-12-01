import { FastifyInstance, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { wsManager } from "../../services/websocket/WebSocketManager";

export async function websocketRoutes(fastify: FastifyInstance) {
    fastify.get("/ws", { websocket: true }, async (socket, request: FastifyRequest) => {
        const connectionId = uuidv4();

        // Verify JWT token from query parameter or header
        let userId: string;
        try {
            const query = request.query as Record<string, string>;
            const token = query["token"] || request.headers.authorization?.replace("Bearer ", "");

            if (!token) {
                fastify.log.warn("WebSocket connection rejected: No token provided");
                socket.close(1008, "Authentication required");
                return;
            }

            // Manually verify the JWT token
            const decoded = fastify.jwt.verify(token) as { id: string; email: string };
            userId = decoded.id;

            if (!userId) {
                fastify.log.warn("WebSocket connection rejected: Invalid token payload");
                socket.close(1008, "Invalid token");
                return;
            }
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : "Authentication failed";
            fastify.log.error({ error: errorMsg }, "WebSocket authentication failed");
            socket.close(1008, "Authentication failed");
            return;
        }

        // Add connection to manager
        wsManager.addConnection(connectionId, socket, userId);

        fastify.log.info(
            {
                connectionId,
                userId
            },
            "WebSocket connection established"
        );

        // Send welcome message
        socket.send(
            JSON.stringify({
                type: "connected",
                connectionId,
                message: "Connected to FlowMaestro WebSocket"
            })
        );

        socket.on("error", (error: Error) => {
            fastify.log.error({ error, connectionId }, "WebSocket error");
        });

        socket.on("close", () => {
            fastify.log.info({ connectionId }, "WebSocket connection closed");
        });
    });
}
