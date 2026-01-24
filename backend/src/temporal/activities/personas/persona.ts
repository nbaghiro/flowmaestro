/**
 * Persona Activities - Configuration and execution support for persona instances
 */

import type { JsonObject, PersonaInstanceProgress } from "@flowmaestro/shared";
import { PersonaDefinitionRepository } from "../../../storage/repositories/PersonaDefinitionRepository";
import { PersonaInstanceConnectionRepository } from "../../../storage/repositories/PersonaInstanceConnectionRepository";
import { PersonaInstanceMessageRepository } from "../../../storage/repositories/PersonaInstanceMessageRepository";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { getAllToolsForUser, isBuiltInTool } from "../../../tools";
import { activityLogger } from "../../core";
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
        available_tools: toolsWithMemory,
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
        }
    };

    activityLogger.info("Persona config built successfully", {
        personaName: persona.name,
        toolCount: toolsWithMemory.length,
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
