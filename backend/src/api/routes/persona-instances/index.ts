import { FastifyInstance } from "fastify";
import { authMiddleware } from "../../middleware/auth";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";
import {
    getInstanceApprovalsHandler,
    approveActionHandler,
    denyActionHandler,
    getPendingApprovalCountHandler,
    listPendingApprovalsHandler
} from "./approvals";
import { cancelPersonaInstanceHandler } from "./cancel";
import { completePersonaInstanceHandler } from "./complete";
import {
    listInstanceConnectionsHandler,
    grantInstanceConnectionHandler,
    revokeInstanceConnectionHandler
} from "./connections";
import { continuePersonaInstanceHandler } from "./continue";
import { createPersonaInstanceHandler } from "./create";
import { getPersonaInstancesDashboardHandler, getPersonaInstancesCountHandler } from "./dashboard";
import { deletePersonaInstanceHandler } from "./delete";
import {
    listDeliverables,
    getDeliverable,
    downloadDeliverable,
    deleteDeliverable
} from "./deliverables";
import { extendApprovalHandler } from "./extend-approval";
import { getPersonaInstanceHandler } from "./get";
import { listPersonaInstancesHandler } from "./list";
import { sendPersonaInstanceMessageHandler } from "./message";
import { skipClarificationHandler } from "./skip-clarification";
import { streamPersonaInstanceRoute } from "./stream";
import { uploadPersonaFilesHandler } from "./upload-files";

export async function personaInstanceRoutes(fastify: FastifyInstance) {
    // All persona instance routes require authentication and workspace context
    fastify.addHook("preHandler", authMiddleware);
    fastify.addHook("preHandler", workspaceContextMiddleware);

    // Dashboard (optimized for quick loading)
    fastify.get("/dashboard", getPersonaInstancesDashboardHandler);

    // Count for badge display
    fastify.get("/count", getPersonaInstancesCountHandler);

    // File uploads for persona inputs
    fastify.post("/files", uploadPersonaFilesHandler);

    // CRUD operations
    fastify.post("/", createPersonaInstanceHandler);
    fastify.get("/", listPersonaInstancesHandler);
    fastify.get("/:id", getPersonaInstanceHandler);
    fastify.delete("/:id", deletePersonaInstanceHandler);

    // Instance actions
    fastify.post("/:id/message", sendPersonaInstanceMessageHandler);
    fastify.post("/:id/cancel", cancelPersonaInstanceHandler);
    fastify.post("/:id/complete", completePersonaInstanceHandler);
    fastify.post("/:id/continue", continuePersonaInstanceHandler);
    fastify.post("/:id/skip-clarification", skipClarificationHandler);

    // Connection management
    fastify.get("/:id/connections", listInstanceConnectionsHandler);
    fastify.post("/:id/connections", grantInstanceConnectionHandler);
    fastify.delete("/:id/connections/:connectionId", revokeInstanceConnectionHandler);

    // Deliverables
    fastify.get("/:id/deliverables", listDeliverables);
    fastify.get("/:id/deliverables/:deliverableId", getDeliverable);
    fastify.get("/:id/deliverables/:deliverableId/download", downloadDeliverable);
    fastify.delete("/:id/deliverables/:deliverableId", deleteDeliverable);

    // Approval management
    fastify.get("/approvals", listPendingApprovalsHandler);
    fastify.get("/approvals/count", getPendingApprovalCountHandler);
    fastify.get("/:id/approvals", getInstanceApprovalsHandler);
    fastify.post("/:id/approvals/:approvalId/approve", approveActionHandler);
    fastify.post("/:id/approvals/:approvalId/deny", denyActionHandler);
    fastify.post("/:id/approvals/:approvalId/extend", extendApprovalHandler);

    // Real-time streaming
    await fastify.register(streamPersonaInstanceRoute);
}
