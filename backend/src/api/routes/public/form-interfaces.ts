import { FastifyInstance } from "fastify";
import type {
    PublicFormInterface,
    FormInterfaceFileAttachment,
    FormInterfaceUrlAttachment,
    WorkflowDefinition,
    JsonValue
} from "@flowmaestro/shared";
import {
    convertFrontendToBackend,
    stripNonExecutableNodes,
    validateWorkflowForExecution
} from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";
import { ExecutionRepository } from "../../../storage/repositories/ExecutionRepository";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { FormInterfaceSubmissionRepository } from "../../../storage/repositories/FormInterfaceSubmissionRepository";
import { ThreadRepository } from "../../../storage/repositories/ThreadRepository";
import { TriggerRepository } from "../../../storage/repositories/TriggerRepository";
import { WorkflowRepository } from "../../../storage/repositories/WorkflowRepository";
import { getTemporalClient } from "../../../temporal/client";
import { formInterfaceRateLimiter } from "../../middleware/formInterfaceRateLimiter";

const logger = createServiceLogger("PublicFormInterfaceRoutes");

/**
 * Maps a FormInterface to PublicFormInterface (strips sensitive fields)
 */
function toPublicFormInterface(formInterface: {
    id: string;
    slug: string;
    coverType: string;
    coverValue: string;
    iconUrl: string | null;
    title: string;
    description: string | null;
    inputPlaceholder: string;
    inputLabel: string;
    fileUploadLabel: string;
    urlInputLabel: string;
    allowFileUpload: boolean;
    allowUrlInput: boolean;
    maxFiles: number;
    maxFileSizeMb: number;
    allowedFileTypes: string[];
    submitButtonText: string;
    submitLoadingText: string;
    outputLabel: string;
    showCopyButton: boolean;
    showDownloadButton: boolean;
    allowOutputEdit: boolean;
}): PublicFormInterface {
    return {
        id: formInterface.id,
        slug: formInterface.slug,
        coverType: formInterface.coverType as PublicFormInterface["coverType"],
        coverValue: formInterface.coverValue,
        iconUrl: formInterface.iconUrl,
        title: formInterface.title,
        description: formInterface.description,
        inputPlaceholder: formInterface.inputPlaceholder,
        inputLabel: formInterface.inputLabel,
        fileUploadLabel: formInterface.fileUploadLabel,
        urlInputLabel: formInterface.urlInputLabel,
        allowFileUpload: formInterface.allowFileUpload,
        allowUrlInput: formInterface.allowUrlInput,
        maxFiles: formInterface.maxFiles,
        maxFileSizeMb: formInterface.maxFileSizeMb,
        allowedFileTypes: formInterface.allowedFileTypes,
        submitButtonText: formInterface.submitButtonText,
        submitLoadingText: formInterface.submitLoadingText,
        outputLabel: formInterface.outputLabel,
        showCopyButton: formInterface.showCopyButton,
        showDownloadButton: formInterface.showDownloadButton,
        allowOutputEdit: formInterface.allowOutputEdit
    };
}

export async function publicFormInterfaceRoutes(fastify: FastifyInstance) {
    const formInterfaceRepo = new FormInterfaceRepository();
    const submissionRepo = new FormInterfaceSubmissionRepository();

    /**
     * GET /api/public/form-interfaces/:slug
     * Get a published form interface for rendering (no auth required)
     */
    fastify.get("/:slug", async (request, reply) => {
        const { slug } = request.params as { slug: string };

        try {
            const formInterface = await formInterfaceRepo.findBySlug(slug);

            if (!formInterface) {
                return reply.status(404).send({
                    success: false,
                    error: "Form interface not found"
                });
            }

            return reply.send({
                success: true,
                data: toPublicFormInterface(formInterface)
            });
        } catch (error) {
            logger.error({ slug, error }, "Error fetching public form interface");
            return reply.status(500).send({
                success: false,
                error: "Failed to load form interface"
            });
        }
    });

    /**
     * POST /api/public/form-interfaces/:slug/submit
     * Submit to a form interface (rate limited, no auth required)
     * Phase 2: Now executes workflows/agents
     */
    fastify.post(
        "/:slug/submit",
        {
            preHandler: [formInterfaceRateLimiter]
        },
        async (request, reply) => {
            const { slug } = request.params as { slug: string };
            const body = request.body as {
                message?: string;
                files?: FormInterfaceFileAttachment[];
                urls?: FormInterfaceUrlAttachment[];
            };

            try {
                // Find the form interface
                const formInterface = await formInterfaceRepo.findBySlug(slug);

                if (!formInterface) {
                    return reply.status(404).send({
                        success: false,
                        error: "Form interface not found"
                    });
                }

                // Validate message is provided
                if (!body.message || body.message.trim() === "") {
                    return reply.status(400).send({
                        success: false,
                        error: "Message is required"
                    });
                }

                // Validate file count if files provided
                if (body.files && body.files.length > formInterface.maxFiles) {
                    return reply.status(400).send({
                        success: false,
                        error: `Maximum ${formInterface.maxFiles} files allowed`
                    });
                }

                // Create submission record with running status
                const submission = await submissionRepo.create({
                    interfaceId: formInterface.id,
                    message: body.message,
                    files: body.files || [],
                    urls: body.urls || [],
                    ipAddress: request.ip,
                    userAgent: request.headers["user-agent"] || null,
                    executionStatus: "running"
                });

                logger.info(
                    { submissionId: submission.id, formInterfaceId: formInterface.id },
                    "Form interface submission received"
                );

                let executionId: string;

                // Execute based on target type
                if (formInterface.targetType === "workflow" && formInterface.workflowId) {
                    executionId = await executeWorkflow(
                        formInterface,
                        submission.id,
                        body.message || "",
                        body.files || [],
                        body.urls || []
                    );
                } else if (formInterface.targetType === "agent" && formInterface.agentId) {
                    executionId = await executeAgent(
                        formInterface,
                        submission.id,
                        body.message || "",
                        body.files || [],
                        body.urls || []
                    );
                } else {
                    // No valid target - mark as failed
                    await submissionRepo.updateExecutionStatus(submission.id, "failed");
                    return reply.status(400).send({
                        success: false,
                        error: "Form interface has no valid execution target"
                    });
                }

                // Update submission with execution ID
                await submissionRepo.updateExecutionStatus(submission.id, "running", executionId);

                // Start attachment processing workflow if there are attachments
                const hasAttachments =
                    (body.files && body.files.length > 0) || (body.urls && body.urls.length > 0);

                if (hasAttachments) {
                    try {
                        await submissionRepo.updateAttachmentsStatus(submission.id, "processing");

                        const client = await getTemporalClient();
                        // Use unified document processing workflow
                        await client.workflow.start("processDocumentWorkflow", {
                            taskQueue: "flowmaestro-orchestrator",
                            workflowId: `form-attachment-${submission.id}`,
                            args: [
                                {
                                    storageTarget: "form-submission",
                                    submissionId: submission.id,
                                    files: (body.files || []).map((f) => ({
                                        filename: f.fileName,
                                        gcsPath: f.gcsUri || "",
                                        mimeType: f.mimeType,
                                        size: f.fileSize
                                    })),
                                    urls: (body.urls || []).map((u) => ({
                                        url: u.url,
                                        title: u.title
                                    })),
                                    userId: formInterface.userId
                                }
                            ]
                        });

                        logger.info(
                            { submissionId: submission.id },
                            "Started attachment processing workflow"
                        );
                    } catch (attachmentError) {
                        // Log but don't fail the submission
                        logger.error(
                            { submissionId: submission.id, error: attachmentError },
                            "Failed to start attachment processing workflow"
                        );
                    }
                } else {
                    // No attachments - mark as ready
                    await submissionRepo.updateAttachmentsStatus(submission.id, "ready");
                }

                return reply.status(201).send({
                    success: true,
                    data: {
                        submissionId: submission.id,
                        executionId
                    }
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                const errorStack = error instanceof Error ? error.stack : undefined;
                logger.error(
                    {
                        slug,
                        error: errorMessage,
                        stack: errorStack
                    },
                    "Error processing form interface submission"
                );
                return reply.status(500).send({
                    success: false,
                    error: "Failed to process submission"
                });
            }
        }
    );
}

/**
 * Execute a workflow for a form interface submission
 */
async function executeWorkflow(
    formInterface: {
        id: string;
        workflowId: string | null;
        triggerId: string | null;
        userId: string;
    },
    submissionId: string,
    message: string,
    files: FormInterfaceFileAttachment[],
    urls: FormInterfaceUrlAttachment[]
): Promise<string> {
    const triggerRepo = new TriggerRepository();
    const executionRepo = new ExecutionRepository();
    const workflowRepo = new WorkflowRepository();

    if (!formInterface.workflowId) {
        throw new Error("Form interface has no workflow configured");
    }

    // Get the workflow
    const workflow = await workflowRepo.findById(formInterface.workflowId);
    if (!workflow) {
        throw new Error("Workflow not found");
    }

    // Pre-execution validation
    const validation = validateWorkflowForExecution(workflow.definition as WorkflowDefinition);
    if (!validation.isValid) {
        throw new Error(`Workflow validation failed: ${validation.errors.join(", ")}`);
    }

    // Prepare inputs for workflow
    const inputs: Record<string, unknown> = {
        message,
        files: files.map((f) => f.downloadUrl || f.gcsUri),
        urls: urls.map((u) => u.url),
        submissionId,
        formInterfaceId: formInterface.id
    };

    // Create execution record
    const execution = await executionRepo.create({
        workflow_id: formInterface.workflowId,
        inputs: inputs as Record<string, JsonValue>
    });

    // If form has a trigger, use it
    if (formInterface.triggerId) {
        const trigger = await triggerRepo.findById(formInterface.triggerId);
        if (trigger && trigger.enabled) {
            await triggerRepo.createExecution({
                trigger_id: trigger.id,
                execution_id: execution.id,
                trigger_payload: inputs as Record<string, JsonValue>
            });
            await triggerRepo.recordTrigger(trigger.id);
        }
    }

    // Start Temporal workflow
    const client = await getTemporalClient();
    const workflowId = `execution-${execution.id}`;

    // Convert workflow definition
    let backendWorkflowDef: WorkflowDefinition;
    const workflowDef = workflow.definition as { nodes?: unknown; edges?: unknown };

    if (workflowDef.nodes && !Array.isArray(workflowDef.nodes)) {
        backendWorkflowDef = {
            ...(workflowDef as WorkflowDefinition),
            name: workflow.name
        };
    } else if (workflowDef.nodes && Array.isArray(workflowDef.nodes)) {
        backendWorkflowDef = convertFrontendToBackend(
            workflow.definition as unknown as {
                nodes: Array<{
                    id: string;
                    type: string;
                    data: Record<string, unknown>;
                    position?: { x: number; y: number };
                }>;
                edges: Array<{
                    id: string;
                    source: string;
                    target: string;
                    sourceHandle?: string;
                }>;
            },
            workflow.name
        );
    } else {
        throw new Error("Invalid workflow definition format");
    }

    backendWorkflowDef = stripNonExecutableNodes(backendWorkflowDef, workflow.name);

    // Start the workflow
    await client.workflow.start("orchestratorWorkflow", {
        taskQueue: "flowmaestro-orchestrator",
        workflowId,
        args: [
            {
                executionId: execution.id,
                workflowDefinition: backendWorkflowDef,
                inputs,
                userId: formInterface.userId,
                workspaceId: workflow.workspace_id,
                formSubmissionId: submissionId
            }
        ]
    });

    logger.info(
        { executionId: execution.id, workflowId: formInterface.workflowId, submissionId },
        "Started workflow execution from form interface"
    );

    return execution.id;
}

/**
 * Execute an agent for a form interface submission
 */
async function executeAgent(
    formInterface: { id: string; agentId: string | null; userId: string },
    submissionId: string,
    message: string,
    files: FormInterfaceFileAttachment[],
    urls: FormInterfaceUrlAttachment[]
): Promise<string> {
    const agentRepo = new AgentRepository();
    const executionRepo = new AgentExecutionRepository();
    const threadRepo = new ThreadRepository();

    if (!formInterface.agentId) {
        throw new Error("Form interface has no agent configured");
    }

    // Get the agent
    const agent = await agentRepo.findById(formInterface.agentId);
    if (!agent) {
        throw new Error("Agent not found");
    }

    // Create a new thread for this submission
    const thread = await threadRepo.create({
        user_id: formInterface.userId,
        workspace_id: agent.workspace_id,
        agent_id: formInterface.agentId
    });

    // Create execution record
    const execution = await executionRepo.create({
        agent_id: formInterface.agentId,
        user_id: formInterface.userId,
        thread_id: thread.id,
        status: "running",
        thread_history: [],
        iterations: 0
    });

    // Build message with file context
    let fullMessage = message;
    if (files.length > 0) {
        const fileUrls = files.map((f) => f.downloadUrl || f.gcsUri).join("\n");
        fullMessage += `\n\nAttached files:\n${fileUrls}`;
    }
    if (urls.length > 0) {
        const urlList = urls.map((u) => u.url).join("\n");
        fullMessage += `\n\nReference URLs:\n${urlList}`;
    }

    // Start Temporal workflow
    const client = await getTemporalClient();
    await client.workflow.start("agentOrchestratorWorkflow", {
        taskQueue: "flowmaestro-orchestrator",
        workflowId: execution.id,
        args: [
            {
                executionId: execution.id,
                agentId: formInterface.agentId,
                userId: formInterface.userId,
                threadId: thread.id,
                initialMessage: fullMessage,
                workspaceId: agent.workspace_id,
                formSubmissionId: submissionId
            }
        ]
    });

    logger.info(
        { executionId: execution.id, agentId: formInterface.agentId, submissionId },
        "Started agent execution from form interface"
    );

    return execution.id;
}
