import { FastifyInstance } from "fastify";
import {
    convertFrontendToBackend,
    FrontendWorkflowDefinition,
    stripNonExecutableNodes
} from "../../../core/utils/workflow-converter";
import { getTemporalClient } from "../../../temporal/client";
import { authMiddleware } from "../../middleware";

interface ExecuteWorkflowBody {
    workflowDefinition: FrontendWorkflowDefinition;
    inputs?: Record<string, unknown>;
}

export async function executeWorkflowRoute(fastify: FastifyInstance) {
    fastify.post(
        "/execute",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const body = request.body as ExecuteWorkflowBody;

            if (!body.workflowDefinition || !body.workflowDefinition.nodes) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid workflow definition"
                });
            }

            try {
                const client = await getTemporalClient();

                // Generate unique workflow ID
                const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                // Convert frontend workflow definition to backend format
                const backendWorkflowDef = stripNonExecutableNodes(
                    convertFrontendToBackend(body.workflowDefinition, `Workflow ${workflowId}`),
                    `Workflow ${workflowId}`
                );

                // Start the workflow
                const handle = await client.workflow.start("orchestratorWorkflow", {
                    taskQueue: "flowmaestro-orchestrator",
                    workflowId,
                    args: [
                        {
                            workflowDefinition: backendWorkflowDef,
                            inputs: body.inputs || {}
                        }
                    ]
                });

                fastify.log.info(`Started workflow ${workflowId}`);

                // Wait for the workflow to complete (with timeout)
                const result = await handle.result();

                return reply.send({
                    success: true,
                    data: {
                        workflowId,
                        result
                    }
                });
            } catch (error: unknown) {
                const errorMsg =
                    error instanceof Error ? error.message : "Workflow execution failed";
                fastify.log.error(`Workflow execution failed: ${errorMsg}`);
                return reply.status(500).send({
                    success: false,
                    error: errorMsg
                });
            }
        }
    );
}
