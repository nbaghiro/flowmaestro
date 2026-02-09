/**
 * Persona Activities - Configuration and execution support for persona instances
 */

import type { DeliverableType, JsonObject, PersonaInstanceProgress } from "@flowmaestro/shared";
import { PersonaDefinitionRepository } from "../../../storage/repositories/PersonaDefinitionRepository";
import { PersonaInstanceConnectionRepository } from "../../../storage/repositories/PersonaInstanceConnectionRepository";
import { PersonaInstanceDeliverableRepository } from "../../../storage/repositories/PersonaInstanceDeliverableRepository";
import { PersonaInstanceMessageRepository } from "../../../storage/repositories/PersonaInstanceMessageRepository";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { getAllToolsForUser, isBuiltInTool } from "../../../tools";
import { activityLogger } from "../../core";
import { personaWorkflowTools } from "../../workflows/persona-tools";
import { injectThreadMemoryTool } from "../agents/memory";
import type { Tool } from "../../../storage/models/Agent";
import type { ThreadMessage } from "../../../storage/models/AgentExecution";
import type { PersonaDefinitionModel } from "../../../storage/models/PersonaDefinition";
import type {
    PersonaInstanceStatus,
    PersonaInstanceCompletionReason
} from "../../../storage/models/PersonaInstance";
import type { AnyTool, IntegrationTool } from "../../../tools";
import type { AgentConfig } from "../../workflows/agent-orchestrator";

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface GetPersonaConfigInput {
    personaInstanceId: string;
    userId: string;
    workspaceId: string;
}

export interface UpdatePersonaInstanceProgressInput {
    personaInstanceId: string;
    iterationCount?: number;
    accumulatedCostCredits?: number;
    progress?: PersonaInstanceProgress;
}

export interface UpdatePersonaInstanceStatusInput {
    personaInstanceId: string;
    status: PersonaInstanceStatus;
    completionReason?: PersonaInstanceCompletionReason;
    startedAt?: Date;
    completedAt?: Date;
    iterationCount?: number;
    accumulatedCostCredits?: number;
    progress?: PersonaInstanceProgress;
}

export interface GetPersonaClarificationStateInput {
    personaInstanceId: string;
}

export interface PersonaClarificationState {
    complete: boolean;
    exchangeCount: number;
    maxExchanges: number;
    skipped: boolean;
}

export interface UpdatePersonaClarificationStateInput {
    personaInstanceId: string;
    complete?: boolean;
    skipped?: boolean;
    exchangeCount?: number;
}

export interface AddPersonaMessageInput {
    personaInstanceId: string;
    threadId: string;
    message: ThreadMessage;
}

export interface SummarizeThreadContextInput {
    messages: ThreadMessage[];
    maxMessages: number;
    personaName: string;
    model: string;
    provider: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert a tool from the tools module to the Tool format used by agents
 */
function convertToolToAgentFormat(tool: AnyTool): Tool {
    if (isBuiltInTool(tool)) {
        return {
            id: `builtin-${tool.name}`,
            name: tool.name,
            description: tool.description,
            type: "builtin",
            schema: tool.inputSchema as JsonObject,
            config: {
                functionName: tool.name
            }
        };
    }

    // Integration tool
    const integrationTool = tool as IntegrationTool;
    return {
        id: `integration-${integrationTool.name}`,
        name: integrationTool.name,
        description: integrationTool.description,
        type: "mcp",
        schema: integrationTool.inputSchema as JsonObject,
        config: {
            connectionId: integrationTool.connectionId,
            provider: integrationTool.provider
        }
    };
}

/**
 * Build a system prompt that includes the persona's instructions and task context
 */
function buildPersonaSystemPrompt(
    persona: PersonaDefinitionModel,
    taskDescription: string | null,
    additionalContext: JsonObject
): string {
    let prompt = persona.system_prompt;

    // Add SOP steps if available
    if (persona.sop_steps && persona.sop_steps.length > 0) {
        prompt += "\n\n## Standard Operating Procedure\n";
        persona.sop_steps.forEach((step, index) => {
            prompt += `${index + 1}. ${step}\n`;
        });
    }

    // Add task description
    if (taskDescription) {
        prompt += `\n\n## Current Task\n${taskDescription}`;
    }

    // Add any additional context
    if (additionalContext && Object.keys(additionalContext).length > 0) {
        prompt += "\n\n## Additional Context\n";

        if (additionalContext.knowledge_bases && Array.isArray(additionalContext.knowledge_bases)) {
            prompt += `\nKnowledge bases available: ${additionalContext.knowledge_bases.length}`;
        }

        if (additionalContext.files && Array.isArray(additionalContext.files)) {
            prompt += `\nFiles provided: ${additionalContext.files.length}`;
        }

        // Add any other context as key-value pairs
        for (const [key, value] of Object.entries(additionalContext)) {
            if (key !== "knowledge_bases" && key !== "files" && value !== undefined) {
                prompt += `\n${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`;
            }
        }
    }

    // Add deliverables expectations if defined
    if (persona.deliverables && persona.deliverables.length > 0) {
        prompt += "\n\n## Expected Deliverables\n";
        persona.deliverables.forEach((deliverable) => {
            prompt += `- **${deliverable.name}** (${deliverable.type}): ${deliverable.description}\n`;
        });
    }

    // Add execution rules for tool usage
    prompt += `\n\n## Execution Rules

You MUST follow these rules during task execution:

1. **Always Use Tools**: Every response should include at least one tool call until your task is complete. Do not respond with only text unless you are providing a brief status update alongside tool calls.

2. **Create Deliverables**: Use the \`deliverable_create\` tool for ALL outputs (reports, data files, code) that the user should receive. The user expects tangible results from your work.

3. **Track Progress**: Call \`update_progress\` when starting each major phase of work. This helps the user understand what you're working on.

4. **Signal Completion**: When you have finished ALL work and created all deliverables, call \`task_complete\` with a summary of what was accomplished.

IMPORTANT: Do not respond with only text without tool calls. If you have nothing left to do, call task_complete.`;

    return prompt;
}

// =============================================================================
// Activity Functions
// =============================================================================

/**
 * Get persona configuration for workflow execution
 *
 * This activity:
 * 1. Loads the persona instance and its definition
 * 2. Gets ALL tools available to the user (built-in + integrations)
 * 3. Builds an AgentConfig that can be used by the agent orchestrator
 */
export async function getPersonaConfig(input: GetPersonaConfigInput): Promise<AgentConfig> {
    const { personaInstanceId, userId, workspaceId } = input;

    activityLogger.info("Loading persona configuration", {
        personaInstanceId,
        userId,
        workspaceId
    });

    // Load the persona instance
    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.findByIdAndWorkspaceId(personaInstanceId, workspaceId);

    if (!instance) {
        throw new Error(`Persona instance ${personaInstanceId} not found or access denied`);
    }

    // Verify user ownership
    if (instance.user_id !== userId) {
        throw new Error(`Persona instance ${personaInstanceId} not found or access denied`);
    }

    // Load the persona definition
    const definitionRepo = new PersonaDefinitionRepository();
    const persona = await definitionRepo.findById(instance.persona_definition_id);

    if (!persona) {
        throw new Error(`Persona definition ${instance.persona_definition_id} not found`);
    }

    activityLogger.info("Persona definition loaded", {
        personaId: persona.id,
        personaName: persona.name,
        model: persona.model,
        provider: persona.provider
    });

    // Get granted connections for this persona instance
    const instanceConnRepo = new PersonaInstanceConnectionRepository();
    const grantedConnections =
        await instanceConnRepo.findByInstanceIdWithDetails(personaInstanceId);
    const grantedConnectionIds = new Set(grantedConnections.map((c) => c.connection_id));

    activityLogger.info("Granted connections for persona", {
        personaInstanceId,
        grantedCount: grantedConnections.length,
        providers: grantedConnections.map((c) => c.connection.provider)
    });

    // Get ALL tools for the user
    const toolCollection = await getAllToolsForUser(userId, workspaceId);

    // Filter integration tools to only those with granted connections
    const filteredIntegrationTools = toolCollection.integration.filter((tool) => {
        const integrationTool = tool as IntegrationTool;
        // If the tool has a connectionId, check if it's granted
        if (integrationTool.connectionId) {
            return grantedConnectionIds.has(integrationTool.connectionId);
        }
        // Tools without explicit connectionId are allowed (fallback behavior)
        return true;
    });

    // Combine built-in tools with filtered integration tools
    const allTools: AnyTool[] = [...toolCollection.builtIn, ...filteredIntegrationTools];

    activityLogger.info("Tools collected for persona", {
        builtInCount: toolCollection.builtIn.length,
        integrationCount: filteredIntegrationTools.length,
        totalIntegrations: toolCollection.integration.length,
        filteredOut: toolCollection.integration.length - filteredIntegrationTools.length,
        totalCount: allTools.length
    });

    // Convert tools to agent format
    const availableTools: Tool[] = allTools.map(convertToolToAgentFormat);

    // Inject thread memory tool for semantic search
    const toolsWithMemory = injectThreadMemoryTool(availableTools);

    // Inject persona workflow control tools (task_complete, update_progress, deliverable_create)
    // These are handled directly by the workflow, not via executeToolCall
    const toolsWithWorkflowControls = [...toolsWithMemory, ...personaWorkflowTools];

    // Build the system prompt with task context
    const systemPrompt = buildPersonaSystemPrompt(
        persona,
        instance.task_description,
        instance.additional_context as JsonObject
    );

    // Build and return the AgentConfig
    const config: AgentConfig = {
        id: persona.id, // Use persona ID as the "agent" ID
        name: `${persona.name} (Persona)`,
        model: persona.model,
        provider: persona.provider,
        connection_id: null, // Personas use default provider credentials
        system_prompt: systemPrompt,
        temperature: persona.temperature,
        max_tokens: persona.max_tokens,
        max_iterations: 100, // Personas have higher iteration limit for complex tasks
        available_tools: toolsWithWorkflowControls,
        memory_config: {
            type: "buffer",
            max_messages: 50 // Higher for long-running tasks
        },
        safety_config: {
            enablePiiDetection: true,
            enablePromptInjectionDetection: true,
            enableContentModeration: true,
            piiRedactionEnabled: true,
            promptInjectionAction: "block"
        },
        // Cost and duration limits (from instance, with persona defaults as fallback)
        max_cost_credits:
            instance.max_cost_credits ?? persona.default_max_cost_credits ?? undefined,
        max_duration_hours:
            instance.max_duration_hours ?? persona.default_max_duration_hours ?? undefined
    };

    activityLogger.info("Persona config built successfully", {
        personaName: persona.name,
        toolCount: toolsWithWorkflowControls.length,
        workflowControlTools: personaWorkflowTools.length,
        maxIterations: config.max_iterations
    });

    return config;
}

/**
 * Update persona instance progress
 *
 * Called periodically during execution to track progress
 */
export async function updatePersonaInstanceProgress(
    input: UpdatePersonaInstanceProgressInput
): Promise<void> {
    const { personaInstanceId, iterationCount, accumulatedCostCredits, progress } = input;

    activityLogger.debug("Updating persona instance progress", {
        personaInstanceId,
        iterationCount,
        accumulatedCostCredits
    });

    const instanceRepo = new PersonaInstanceRepository();

    await instanceRepo.update(personaInstanceId, {
        ...(iterationCount !== undefined && { iteration_count: iterationCount }),
        ...(accumulatedCostCredits !== undefined && {
            accumulated_cost_credits: accumulatedCostCredits
        }),
        ...(progress && { progress })
    });
}

/**
 * Update persona instance status
 *
 * Called when execution state changes (running, completed, failed, etc.)
 */
export async function updatePersonaInstanceStatus(
    input: UpdatePersonaInstanceStatusInput
): Promise<void> {
    const {
        personaInstanceId,
        status,
        completionReason,
        startedAt,
        completedAt,
        iterationCount,
        accumulatedCostCredits,
        progress
    } = input;

    activityLogger.info("Updating persona instance status", {
        personaInstanceId,
        status,
        completionReason
    });

    const instanceRepo = new PersonaInstanceRepository();

    // Calculate duration if completing
    let durationSeconds: number | undefined;
    if (completedAt && startedAt) {
        durationSeconds = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000);
    } else if (completedAt) {
        // Try to get started_at from the instance
        const instance = await instanceRepo.findById(personaInstanceId);
        if (instance?.started_at) {
            durationSeconds = Math.floor(
                (completedAt.getTime() - instance.started_at.getTime()) / 1000
            );
        }
    }

    await instanceRepo.update(personaInstanceId, {
        status,
        ...(completionReason && { completion_reason: completionReason }),
        ...(startedAt && { started_at: startedAt }),
        ...(completedAt && { completed_at: completedAt }),
        ...(durationSeconds !== undefined && { duration_seconds: durationSeconds }),
        ...(iterationCount !== undefined && { iteration_count: iterationCount }),
        ...(accumulatedCostCredits !== undefined && {
            accumulated_cost_credits: accumulatedCostCredits
        }),
        ...(progress && { progress })
    });
}

/**
 * Get the current clarification state for a persona instance
 */
export async function getPersonaClarificationState(
    input: GetPersonaClarificationStateInput
): Promise<PersonaClarificationState | null> {
    const { personaInstanceId } = input;

    activityLogger.debug("Getting persona clarification state", { personaInstanceId });

    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.findById(personaInstanceId);

    if (!instance) {
        return null;
    }

    return {
        complete: instance.clarification_complete,
        exchangeCount: instance.clarification_exchange_count,
        maxExchanges: instance.clarification_max_exchanges,
        skipped: instance.clarification_skipped
    };
}

/**
 * Update the clarification state for a persona instance
 */
export async function updatePersonaClarificationState(
    input: UpdatePersonaClarificationStateInput
): Promise<void> {
    const { personaInstanceId, complete, skipped, exchangeCount } = input;

    activityLogger.debug("Updating persona clarification state", {
        personaInstanceId,
        complete,
        skipped,
        exchangeCount
    });

    const instanceRepo = new PersonaInstanceRepository();

    // If skipping, use the dedicated method
    if (skipped) {
        await instanceRepo.skipClarification(personaInstanceId);
        return;
    }

    // Build update object
    const updates: Record<string, boolean | number> = {};

    if (complete !== undefined) {
        updates.clarification_complete = complete;
    }

    if (exchangeCount !== undefined) {
        updates.clarification_exchange_count = exchangeCount;
    }

    if (Object.keys(updates).length > 0) {
        await instanceRepo.update(personaInstanceId, updates);
    }
}

/**
 * Add a message to the persona instance conversation
 *
 * This saves the message to both the thread and the persona instance messages table
 */
export async function addPersonaMessage(input: AddPersonaMessageInput): Promise<void> {
    const { personaInstanceId, threadId, message } = input;

    activityLogger.debug("Adding persona message", {
        personaInstanceId,
        threadId,
        role: message.role,
        contentLength: message.content?.length || 0
    });

    const messageRepo = new PersonaInstanceMessageRepository();

    await messageRepo.create({
        instance_id: personaInstanceId,
        thread_id: threadId,
        role: message.role,
        content: message.content || "",
        tool_calls: message.tool_calls,
        tool_name: message.tool_name,
        tool_call_id: message.tool_call_id
    });
}

/**
 * Summarize thread context using LLM
 *
 * When message history exceeds maxMessages, this activity uses an LLM to
 * create a summary of older messages, preserving important context while
 * reducing message count for continue-as-new operations.
 */
export async function summarizeThreadContext(
    input: SummarizeThreadContextInput
): Promise<ThreadMessage[]> {
    const { messages, maxMessages, personaName } = input;

    // If messages are within limit, return as-is
    if (messages.length <= maxMessages) {
        activityLogger.debug("No summarization needed", {
            messageCount: messages.length,
            maxMessages
        });
        return messages;
    }

    activityLogger.info("Summarizing thread context", {
        messageCount: messages.length,
        maxMessages,
        personaName
    });

    // Find system prompt (should be first message)
    const systemPrompt = messages.find((m) => m.role === "system");

    // Keep recent messages (last maxMessages - 10 to leave room for summary)
    const recentCount = Math.max(maxMessages - 10, 20);
    const recentMessages = messages.slice(-recentCount);

    // Get messages to summarize (between system prompt and recent messages)
    const startIndex = systemPrompt ? 1 : 0;
    const endIndex = messages.length - recentCount;

    if (endIndex <= startIndex) {
        // Nothing to summarize
        return messages;
    }

    const messagesToSummarize = messages.slice(startIndex, endIndex);

    activityLogger.debug("Summarizing messages", {
        summarizeCount: messagesToSummarize.length,
        recentCount: recentMessages.length
    });

    try {
        // For now, create a structured summary without LLM
        // This can be enhanced later to use actual LLM summarization
        const summaryContent = createStructuredSummary(messagesToSummarize, personaName);

        // Create summary message
        const summaryMessage: ThreadMessage = {
            id: `summary-${Date.now()}`,
            role: "system",
            content: `[CONTEXT SUMMARY - Earlier conversation with ${personaName}]\n\n${summaryContent}`,
            timestamp: new Date()
        };

        // Combine: system prompt + summary + recent messages
        const result: ThreadMessage[] = [];

        if (systemPrompt) {
            result.push(systemPrompt);
        }

        result.push(summaryMessage);

        // Add recent messages, excluding the system prompt if it's in there
        for (const msg of recentMessages) {
            if (msg.id !== systemPrompt?.id) {
                result.push(msg);
            }
        }

        activityLogger.info("Thread context summarized", {
            originalCount: messages.length,
            summarizedCount: result.length,
            summarizedMessages: messagesToSummarize.length
        });

        return result;
    } catch (error) {
        activityLogger.error(
            "Failed to summarize thread context",
            error instanceof Error ? error : new Error("Unknown error")
        );

        // Fall back to naive truncation
        const fallbackResult: ThreadMessage[] = [];
        if (systemPrompt) {
            fallbackResult.push(systemPrompt);
        }
        for (const msg of recentMessages) {
            if (msg.id !== systemPrompt?.id) {
                fallbackResult.push(msg);
            }
        }
        return fallbackResult;
    }
}

/**
 * Create a structured summary of messages without LLM
 * Extracts key information like tool calls, findings, and decisions
 */
function createStructuredSummary(messages: ThreadMessage[], personaName: string): string {
    const toolsUsed = new Set<string>();
    const toolResults: string[] = [];
    const keyDecisions: string[] = [];
    const userRequirements: string[] = [];
    let lastAssistantMessage = "";

    for (const msg of messages) {
        if (msg.tool_calls) {
            for (const tc of msg.tool_calls) {
                toolsUsed.add(tc.name);
            }
        }

        if (msg.role === "tool" && msg.tool_name && msg.content) {
            try {
                const result = JSON.parse(msg.content);
                if (result.success !== false && !result.error) {
                    const summary =
                        typeof result.data === "object"
                            ? JSON.stringify(result.data).substring(0, 200)
                            : String(result.data || result.message || "").substring(0, 200);
                    if (summary) {
                        toolResults.push(`${msg.tool_name}: ${summary}`);
                    }
                }
            } catch {
                // Ignore JSON parse errors
            }
        }

        // Extract user requirements from user messages
        if (msg.role === "user" && msg.content) {
            const lines = msg.content.split("\n");
            for (const line of lines) {
                const trimmed = line.trim();
                // Look for requirement-like statements (not too short, not too long)
                if (trimmed.length >= 15 && trimmed.length <= 200) {
                    const lowerLine = trimmed.toLowerCase();
                    // Prioritize lines that look like requirements or requests
                    if (
                        lowerLine.includes("need") ||
                        lowerLine.includes("want") ||
                        lowerLine.includes("should") ||
                        lowerLine.includes("must") ||
                        lowerLine.includes("please") ||
                        lowerLine.includes("require") ||
                        lowerLine.startsWith("- ") ||
                        /^\d+\./.test(trimmed)
                    ) {
                        userRequirements.push(trimmed);
                    }
                }
            }
        }

        if (msg.role === "assistant" && msg.content) {
            lastAssistantMessage = msg.content;
            // Look for decision-like statements
            const lines = msg.content.split("\n");
            for (const line of lines) {
                const lowerLine = line.toLowerCase();
                if (
                    lowerLine.includes("will ") ||
                    lowerLine.includes("decided") ||
                    lowerLine.includes("found that") ||
                    lowerLine.includes("discovered") ||
                    lowerLine.includes("completed") ||
                    lowerLine.includes("identified") ||
                    lowerLine.includes("determined") ||
                    lowerLine.includes("conclusion")
                ) {
                    if (line.trim().length > 20 && line.trim().length < 200) {
                        keyDecisions.push(line.trim());
                    }
                }
            }
        }
    }

    const sections: string[] = [];

    if (toolsUsed.size > 0) {
        sections.push(`**Tools Used:** ${Array.from(toolsUsed).join(", ")}`);
    }

    // Include user requirements to preserve task context
    if (userRequirements.length > 0) {
        sections.push(
            `**User Requirements:**\n${userRequirements
                .slice(0, 8)
                .map((r) => `- ${r}`)
                .join("\n")}`
        );
    }

    if (toolResults.length > 0) {
        sections.push(
            `**Key Tool Results:**\n${toolResults
                .slice(0, 10)
                .map((r) => `- ${r}`)
                .join("\n")}`
        );
    }

    if (keyDecisions.length > 0) {
        sections.push(
            `**Key Progress:**\n${keyDecisions
                .slice(0, 10)
                .map((d) => `- ${d}`)
                .join("\n")}`
        );
    }

    if (lastAssistantMessage && lastAssistantMessage.length > 50) {
        sections.push(
            `**Last Status:** ${lastAssistantMessage.substring(0, 400)}${lastAssistantMessage.length > 400 ? "..." : ""}`
        );
    }

    return sections.length > 0
        ? sections.join("\n\n")
        : `${personaName} has been working on the task. ${messages.length} messages were summarized.`;
}

// =============================================================================
// Persona Workflow Tool Activities
// =============================================================================

export interface CreatePersonaDeliverableInput {
    personaInstanceId: string;
    name: string;
    type: string;
    content: string;
    description?: string;
    fileExtension?: string;
}

export interface CreatePersonaDeliverableResult {
    success: boolean;
    id?: string;
    name?: string;
    fileExtension?: string;
    fileSizeBytes?: number;
    error?: string;
}

/**
 * Create a deliverable for a persona instance
 *
 * This activity is called when the persona uses the deliverable_create workflow tool.
 * It saves the deliverable content to the database.
 */
export async function createPersonaDeliverable(
    input: CreatePersonaDeliverableInput
): Promise<CreatePersonaDeliverableResult> {
    const { personaInstanceId, name, type, content, description, fileExtension } = input;

    activityLogger.info("Creating persona deliverable", {
        personaInstanceId,
        name,
        type,
        contentLength: content.length
    });

    try {
        // Determine file extension
        const extension = getDeliverableExtension(type, fileExtension);

        const repo = new PersonaInstanceDeliverableRepository();
        const deliverable = await repo.create({
            instance_id: personaInstanceId,
            name: name.trim(),
            description: description?.trim(),
            type: type as DeliverableType,
            content,
            file_extension: extension
        });

        activityLogger.info("Persona deliverable created", {
            personaInstanceId,
            deliverableId: deliverable.id,
            name: deliverable.name,
            type: deliverable.type
        });

        return {
            success: true,
            id: deliverable.id,
            name: deliverable.name,
            fileExtension: deliverable.file_extension || extension,
            fileSizeBytes: deliverable.file_size_bytes || content.length
        };
    } catch (error) {
        activityLogger.error(
            "Failed to create persona deliverable",
            error instanceof Error ? error : new Error("Unknown error")
        );

        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
        };
    }
}

/**
 * Get file extension for a deliverable type
 */
function getDeliverableExtension(type: string, customExtension?: string): string {
    if (customExtension) {
        return customExtension.startsWith(".") ? customExtension.slice(1) : customExtension;
    }

    const extensions: Record<string, string> = {
        markdown: "md",
        csv: "csv",
        json: "json",
        code: "txt",
        html: "html",
        pdf: "pdf",
        image: "png"
    };
    return extensions[type] || "txt";
}
