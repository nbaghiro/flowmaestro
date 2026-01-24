import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { createServiceLogger } from "../../../core/logging";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { PersonaInstanceConnectionRepository } from "../../../storage/repositories/PersonaInstanceConnectionRepository";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { BadRequestError, NotFoundError } from "../../middleware";

const logger = createServiceLogger("PersonaInstanceConnections");

const instanceIdParamSchema = z.object({
    id: z.string().uuid()
});

const connectionIdParamSchema = z.object({
    id: z.string().uuid(),
    connectionId: z.string().uuid()
});

const grantConnectionBodySchema = z.object({
    connection_id: z.string().uuid(),
    scopes: z.array(z.string()).optional()
});

type InstanceIdParams = z.infer<typeof instanceIdParamSchema>;
type ConnectionIdParams = z.infer<typeof connectionIdParamSchema>;
type GrantConnectionBody = z.infer<typeof grantConnectionBodySchema>;

/**
 * GET /api/persona-instances/:id/connections
 * List all connections granted to this instance
 */
export async function listInstanceConnectionsHandler(
    request: FastifyRequest<{
        Params: InstanceIdParams;
    }>,
    reply: FastifyReply
): Promise<void> {
    const workspaceId = request.workspace!.id;

    // Validate params
    const paramsResult = instanceIdParamSchema.safeParse(request.params);
    if (!paramsResult.success) {
        throw new BadRequestError(paramsResult.error.errors.map((e) => e.message).join(", "));
    }

    const { id } = paramsResult.data;

    // Verify instance exists and belongs to workspace
    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.findByIdAndWorkspaceId(id, workspaceId);

    if (!instance) {
        throw new NotFoundError("Persona instance not found");
    }

    // Get connections with details
    const connectionRepo = new PersonaInstanceConnectionRepository();
    const connections = await connectionRepo.findByInstanceIdWithDetails(id);

    reply.code(200).send({
        success: true,
        data: connections
    });
}

/**
 * POST /api/persona-instances/:id/connections
 * Grant connection access to instance
 */
export async function grantInstanceConnectionHandler(
    request: FastifyRequest<{
        Params: InstanceIdParams;
        Body: GrantConnectionBody;
    }>,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const workspaceId = request.workspace!.id;

    // Validate params
    const paramsResult = instanceIdParamSchema.safeParse(request.params);
    if (!paramsResult.success) {
        throw new BadRequestError(paramsResult.error.errors.map((e) => e.message).join(", "));
    }

    // Validate body
    const bodyResult = grantConnectionBodySchema.safeParse(request.body);
    if (!bodyResult.success) {
        throw new BadRequestError(bodyResult.error.errors.map((e) => e.message).join(", "));
    }

    const { id } = paramsResult.data;
    const { connection_id, scopes } = bodyResult.data;

    // Verify instance exists and belongs to workspace
    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.findByIdAndWorkspaceId(id, workspaceId);

    if (!instance) {
        throw new NotFoundError("Persona instance not found");
    }

    // Verify connection exists and belongs to user/workspace
    const connRepo = new ConnectionRepository();
    const connection = await connRepo.findByIdAndWorkspaceId(connection_id, workspaceId);

    if (!connection) {
        throw new NotFoundError("Connection not found");
    }

    // Grant connection
    const instanceConnRepo = new PersonaInstanceConnectionRepository();
    const instanceConnection = await instanceConnRepo.create({
        instance_id: id,
        connection_id,
        granted_scopes: scopes
    });

    logger.info(
        {
            personaInstanceId: id,
            connectionId: connection_id,
            userId,
            scopes
        },
        "Connection granted to persona instance"
    );

    // Fetch with details for response
    const connectionWithDetails = await instanceConnRepo.findByInstanceIdWithDetails(id);
    const grantedConnection = connectionWithDetails.find((c) => c.connection_id === connection_id);

    reply.code(201).send({
        success: true,
        data: grantedConnection || instanceConnection
    });
}

/**
 * DELETE /api/persona-instances/:id/connections/:connectionId
 * Revoke connection access from instance
 */
export async function revokeInstanceConnectionHandler(
    request: FastifyRequest<{
        Params: ConnectionIdParams;
    }>,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const workspaceId = request.workspace!.id;

    // Validate params
    const paramsResult = connectionIdParamSchema.safeParse(request.params);
    if (!paramsResult.success) {
        throw new BadRequestError(paramsResult.error.errors.map((e) => e.message).join(", "));
    }

    const { id, connectionId } = paramsResult.data;

    // Verify instance exists and belongs to workspace
    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.findByIdAndWorkspaceId(id, workspaceId);

    if (!instance) {
        throw new NotFoundError("Persona instance not found");
    }

    // Delete connection
    const instanceConnRepo = new PersonaInstanceConnectionRepository();
    const deleted = await instanceConnRepo.delete(id, connectionId);

    if (!deleted) {
        throw new NotFoundError("Connection not found for this instance");
    }

    logger.info(
        {
            personaInstanceId: id,
            connectionId,
            userId
        },
        "Connection revoked from persona instance"
    );

    reply.code(200).send({
        success: true,
        message: "Connection revoked"
    });
}
