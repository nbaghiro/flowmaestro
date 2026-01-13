/**
 * Workflow Generation Chat Service
 *
 * Handles chat-based workflow generation with extended thinking support.
 * This service enables gradual, conversational workflow creation through AI assistance.
 */

import {
    getNodeCatalogForPrompt,
    type GenerationChatMessage,
    type GenerationChatResponse,
    type WorkflowPlan,
    type ProposedNode,
    type ProposedEdge,
    type JsonObject,
    type WorkflowDefinition,
    type WorkflowNode
} from "@flowmaestro/shared";
import { getLogger } from "../core/logging";
import { ConnectionRepository } from "../storage/repositories/ConnectionRepository";
import { WorkflowRepository } from "../storage/repositories/WorkflowRepository";
import {
    executeLLMNode,
    type LLMExecutionCallbacks
} from "../temporal/activities/execution/handlers/ai/llm";

const logger = getLogger();

// ============================================================================
// TYPES
// ============================================================================

export interface GenerationStreamCallbacks {
    onThinkingStart?: () => void;
    onThinkingToken?: (token: string) => void;
    onThinkingComplete?: (thinkingContent: string) => void;
    onToken?: (token: string) => void;
    onComplete?: (response: GenerationChatResponse) => void;
    onError?: (error: Error) => void;
}

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

const WORKFLOW_GENERATION_SYSTEM_PROMPT = `You are FlowMaestro, an expert AI assistant that helps users design automation workflows through conversation.

Your primary goal is to understand what the user wants to automate and guide them toward creating an optimal workflow.

## Your Role

1. **Understand Requirements**: Ask clarifying questions to fully understand:
   - What the user wants to automate
   - Data sources and inputs needed
   - Desired outputs and destinations
   - Any conditions, loops, or branching logic
   - Error handling preferences

2. **Suggest Approaches**: When you understand the requirements:
   - Propose workflow structures
   - Explain trade-offs between different approaches
   - Recommend appropriate node types

3. **Generate Workflow Plans**: When ready, generate a complete workflow plan in JSON format.

## Available Node Types
${getNodeCatalogForPrompt()}

## Conversation Guidelines

- Be conversational and helpful
- Ask one or two clarifying questions at a time (not overwhelming lists)
- When the user's intent is clear, generate the workflow plan
- Explain your reasoning and suggestions
- If the user provides vague requirements, ask for specifics

## Generating Workflow Plans

When you have enough information to generate a workflow, output a JSON block with the following structure:

\`\`\`json
{
  "workflowPlan": {
    "name": "Descriptive Workflow Name",
    "description": "Brief description of what this workflow does",
    "summary": "Human-readable summary explaining the workflow step by step",
    "entryNodeId": "node-1",
    "nodes": [
      {
        "id": "node-1",
        "type": "input",
        "label": "User Input",
        "description": "Receives the initial data",
        "config": {
          "variableName": "inputData",
          "inputType": "text"
        }
      },
      {
        "id": "node-2",
        "type": "llm",
        "label": "Process with AI",
        "description": "Analyzes the input using GPT-4",
        "config": {
          "provider": "openai",
          "model": "gpt-4o",
          "prompt": "{{inputData}}"
        },
        "connectTo": "node-1"
      }
    ],
    "edges": [
      {
        "id": "edge-1",
        "source": "node-1",
        "target": "node-2"
      }
    ]
  }
}
\`\`\`

## Important Rules

1. Always use valid node types from the catalog above
2. Use \`{{variableName}}\` syntax for variable interpolation
3. Include meaningful labels and descriptions for each node
4. Connect nodes logically with edges
5. Start with an input or trigger node as entry point
6. End with output or action nodes as appropriate
7. Generate unique IDs for nodes (e.g., node-1, node-2, etc.)
8. Only generate the plan when you're confident about the requirements`;

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class WorkflowGenerationChatService {
    private connectionRepo = new ConnectionRepository();
    private workflowRepo = new WorkflowRepository();

    /**
     * Process a chat message for workflow generation
     */
    async processMessage(
        message: string,
        conversationHistory: GenerationChatMessage[],
        connectionId: string,
        model: string,
        enableThinking: boolean,
        thinkingBudget: number | undefined,
        callbacks?: GenerationStreamCallbacks
    ): Promise<GenerationChatResponse> {
        try {
            logger.info(
                {
                    messageLength: message.length,
                    historyLength: conversationHistory.length,
                    connectionId,
                    model,
                    enableThinking,
                    thinkingBudget
                },
                "Processing workflow generation chat message"
            );

            // Get connection to determine provider
            const connection = await this.connectionRepo.findByIdWithData(connectionId);
            if (!connection) {
                throw new Error(`Connection not found: ${connectionId}`);
            }

            // Build conversation context from history
            const conversationContext = this.buildConversationContext(conversationHistory);

            // Build the user prompt with conversation context
            const userPrompt = conversationContext
                ? `Previous conversation:\n${conversationContext}\n\nUser: ${message}`
                : message;

            // Execute LLM with thinking support
            let fullResponse = "";
            let thinkingContent = "";

            const llmCallbacks: LLMExecutionCallbacks = {
                onThinkingStart: () => {
                    callbacks?.onThinkingStart?.();
                },
                onThinkingToken: (token) => {
                    thinkingContent += token;
                    callbacks?.onThinkingToken?.(token);
                },
                onThinkingComplete: (content) => {
                    thinkingContent = content;
                    callbacks?.onThinkingComplete?.(content);
                },
                onToken: (token) => {
                    fullResponse += token;
                    callbacks?.onToken?.(token);
                }
            };

            // Calculate appropriate token limits
            // When thinking is enabled, maxTokens must be > thinkingBudget (Anthropic requirement)
            const effectiveThinkingBudget = thinkingBudget ?? 4096;
            const responseTokens = 4000; // Tokens reserved for actual response
            const effectiveMaxTokens = enableThinking
                ? effectiveThinkingBudget + responseTokens
                : responseTokens;

            const llmConfig = {
                provider: connection.provider as "openai" | "anthropic" | "google" | "cohere",
                model,
                connectionId,
                systemPrompt: WORKFLOW_GENERATION_SYSTEM_PROMPT,
                prompt: userPrompt,
                temperature: 0.7,
                maxTokens: effectiveMaxTokens,
                enableThinking,
                thinkingBudget: effectiveThinkingBudget
            };

            await executeLLMNode(llmConfig, {}, llmCallbacks);

            // Parse the response for workflow plan
            const workflowPlan = this.extractWorkflowPlan(fullResponse);

            // Generate suggested follow-up questions
            const suggestedQuestions = this.generateSuggestedQuestions(fullResponse, workflowPlan);

            const response: GenerationChatResponse = {
                response: fullResponse,
                thinking: thinkingContent || undefined,
                workflowPlan,
                suggestedQuestions
            };

            callbacks?.onComplete?.(response);
            return response;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.error({ err }, "Failed to process workflow generation chat");
            callbacks?.onError?.(err);
            throw err;
        }
    }

    /**
     * Create a workflow from an approved plan
     */
    async createWorkflowFromPlan(
        plan: WorkflowPlan,
        userId: string,
        workspaceId: string,
        _folderId?: string // TODO: Add folder support to workflow creation
    ): Promise<{ workflowId: string; name: string }> {
        logger.info(
            {
                planName: plan.name,
                nodeCount: plan.nodes.length,
                edgeCount: plan.edges.length,
                userId
            },
            "Creating workflow from plan"
        );

        // Convert plan nodes to workflow definition format with horizontal flow layout
        const nodesMap: Record<string, WorkflowNode> = {};

        // Layout configuration for horizontal flow
        const startX = 100;
        const startY = 200;
        const nodeWidth = 280; // Estimated node width
        const nodeHeight = 200; // Estimated max node height
        const horizontalGap = 80; // Gap between columns
        const verticalGap = 100; // Gap between rows
        const xSpacing = nodeWidth + horizontalGap;
        const ySpacing = nodeHeight + verticalGap;

        // Build a graph to determine node levels (for horizontal layout)
        const nodeIdToIndex = new Map<string, number>();
        plan.nodes.forEach((node, idx) => nodeIdToIndex.set(node.id, idx));

        // Calculate depth/level for each node based on edges (BFS from entry)
        const nodeLevels = new Map<string, number>();
        const nodesAtLevel = new Map<number, string[]>();

        // Find entry node or use first node
        const entryNodeId = plan.entryNodeId || plan.nodes[0]?.id;

        // Build adjacency list from edges
        const adjacency = new Map<string, string[]>();
        for (const edge of plan.edges) {
            if (!adjacency.has(edge.source)) {
                adjacency.set(edge.source, []);
            }
            adjacency.get(edge.source)!.push(edge.target);
        }

        // BFS to assign levels
        const visited = new Set<string>();
        const queue: { nodeId: string; level: number }[] = [{ nodeId: entryNodeId, level: 0 }];

        while (queue.length > 0) {
            const { nodeId, level } = queue.shift()!;

            if (visited.has(nodeId)) continue;
            visited.add(nodeId);

            nodeLevels.set(nodeId, level);
            if (!nodesAtLevel.has(level)) {
                nodesAtLevel.set(level, []);
            }
            nodesAtLevel.get(level)!.push(nodeId);

            // Add children to queue
            const children = adjacency.get(nodeId) || [];
            for (const childId of children) {
                if (!visited.has(childId)) {
                    queue.push({ nodeId: childId, level: level + 1 });
                }
            }
        }

        // Handle any unvisited nodes (disconnected)
        for (const node of plan.nodes) {
            if (!visited.has(node.id)) {
                const maxLevel = Math.max(...Array.from(nodeLevels.values()), -1);
                const level = maxLevel + 1;
                nodeLevels.set(node.id, level);
                if (!nodesAtLevel.has(level)) {
                    nodesAtLevel.set(level, []);
                }
                nodesAtLevel.get(level)!.push(node.id);
            }
        }

        // Calculate positions based on levels (horizontal flow: level = x position)
        // Add wave pattern for visual interest
        for (const node of plan.nodes) {
            const level = nodeLevels.get(node.id) || 0;
            const nodesInLevel = nodesAtLevel.get(level) || [node.id];
            const indexInLevel = nodesInLevel.indexOf(node.id);

            // Center nodes vertically within their level
            const totalHeightForLevel = (nodesInLevel.length - 1) * ySpacing;
            const levelStartY = startY - totalHeightForLevel / 2;

            // Add wave offset: alternating up/down based on level for visual flow
            // Creates a gentle sine wave pattern across the horizontal axis
            const waveAmplitude = 30; // pixels of vertical offset
            const waveOffset = Math.sin(level * 0.8) * waveAmplitude;

            const position = {
                x: startX + level * xSpacing,
                y: levelStartY + indexInLevel * ySpacing + waveOffset
            };

            nodesMap[node.id] = {
                type: node.type,
                name: node.label,
                config: node.config,
                position
            };
        }

        // Convert plan edges to workflow definition format
        const edges = plan.edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle
        }));

        // Create the workflow definition
        const workflowDefinition: WorkflowDefinition = {
            name: plan.name,
            nodes: nodesMap,
            edges,
            entryPoint: plan.entryNodeId
        };

        // Create the workflow in the database
        const workflow = await this.workflowRepo.create({
            user_id: userId,
            workspace_id: workspaceId,
            name: plan.name,
            description: plan.description,
            definition: workflowDefinition
        });

        logger.info(
            {
                workflowId: workflow.id,
                workflowName: workflow.name
            },
            "Workflow created from plan"
        );

        return {
            workflowId: workflow.id,
            name: workflow.name
        };
    }

    /**
     * Build conversation context string from history
     */
    private buildConversationContext(history: GenerationChatMessage[]): string {
        if (history.length === 0) return "";

        // Take last 10 messages for context
        return history
            .slice(-10)
            .map((msg) => {
                const role = msg.role === "user" ? "User" : "Assistant";
                return `${role}: ${msg.content}`;
            })
            .join("\n\n");
    }

    /**
     * Extract workflow plan from LLM response
     */
    private extractWorkflowPlan(response: string): WorkflowPlan | undefined {
        try {
            // Look for JSON code block with workflowPlan
            const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
            if (!jsonMatch) {
                // Try to find raw JSON object
                const rawJsonMatch = response.match(/\{\s*"workflowPlan"\s*:/);
                if (!rawJsonMatch) return undefined;

                // Extract JSON starting from workflowPlan
                const startIndex = response.indexOf('{"workflowPlan"');
                if (startIndex === -1) return undefined;

                // Find matching closing brace
                let braceCount = 0;
                let endIndex = startIndex;
                for (let i = startIndex; i < response.length; i++) {
                    if (response[i] === "{") braceCount++;
                    if (response[i] === "}") braceCount--;
                    if (braceCount === 0) {
                        endIndex = i + 1;
                        break;
                    }
                }

                const jsonStr = response.substring(startIndex, endIndex);
                const parsed = JSON.parse(jsonStr);
                return this.validateAndNormalizePlan(parsed.workflowPlan);
            }

            const jsonStr = jsonMatch[1];
            const parsed = JSON.parse(jsonStr);

            if (parsed.workflowPlan) {
                return this.validateAndNormalizePlan(parsed.workflowPlan);
            }

            return undefined;
        } catch (error) {
            logger.warn(
                { error: error instanceof Error ? error.message : String(error) },
                "Failed to parse workflow plan from response"
            );
            return undefined;
        }
    }

    /**
     * Validate and normalize a workflow plan
     */
    private validateAndNormalizePlan(plan: unknown): WorkflowPlan | undefined {
        if (!plan || typeof plan !== "object") return undefined;

        const p = plan as Record<string, unknown>;

        // Check required fields
        if (!p.name || !p.nodes || !Array.isArray(p.nodes)) return undefined;

        // Normalize nodes
        const nodes: ProposedNode[] = (p.nodes as unknown[]).map((node, index) => {
            const n = node as Record<string, unknown>;
            return {
                id: String(n.id || `node-${index + 1}`),
                type: String(n.type || "input"),
                label: String(n.label || `Node ${index + 1}`),
                config: (n.config as JsonObject) || {},
                position: n.position as { x: number; y: number } | undefined,
                connectTo: n.connectTo as string | string[] | undefined,
                description: n.description as string | undefined
            };
        });

        // Normalize edges
        let edges: ProposedEdge[] = [];
        if (Array.isArray(p.edges)) {
            edges = (p.edges as unknown[]).map((edge, index) => {
                const e = edge as Record<string, unknown>;
                return {
                    id: String(e.id || `edge-${index + 1}`),
                    source: String(e.source),
                    target: String(e.target),
                    sourceHandle: e.sourceHandle as string | undefined,
                    targetHandle: e.targetHandle as string | undefined,
                    label: e.label as string | undefined
                };
            });
        } else {
            // Generate edges from connectTo if edges not provided
            edges = this.generateEdgesFromConnectTo(nodes);
        }

        // Calculate node counts by category
        const nodeCountByCategory: Record<string, number> = {};
        for (const node of nodes) {
            const category = this.getNodeCategory(node.type);
            nodeCountByCategory[category] = (nodeCountByCategory[category] || 0) + 1;
        }

        return {
            name: String(p.name),
            description: String(p.description || ""),
            summary: String(p.summary || ""),
            entryNodeId: String(p.entryNodeId || nodes[0]?.id || ""),
            nodes,
            edges,
            nodeCountByCategory
        };
    }

    /**
     * Generate edges from connectTo properties
     */
    private generateEdgesFromConnectTo(nodes: ProposedNode[]): ProposedEdge[] {
        const edges: ProposedEdge[] = [];
        let edgeIndex = 1;

        for (const node of nodes) {
            if (node.connectTo) {
                const sources = Array.isArray(node.connectTo) ? node.connectTo : [node.connectTo];
                for (const source of sources) {
                    edges.push({
                        id: `edge-${edgeIndex++}`,
                        source,
                        target: node.id
                    });
                }
            }
        }

        return edges;
    }

    /**
     * Get node category from type
     */
    private getNodeCategory(type: string): string {
        const categoryMap: Record<string, string> = {
            llm: "AI",
            vision: "AI",
            embeddings: "AI",
            router: "AI",
            "kb-query": "AI",
            audioInput: "AI",
            audioOutput: "AI",
            input: "Input",
            files: "Input",
            url: "Input",
            output: "Output",
            templateOutput: "Output",
            action: "Output",
            conditional: "Logic",
            switch: "Logic",
            loop: "Logic",
            wait: "Logic",
            humanReview: "Logic",
            transform: "Logic",
            code: "Logic",
            "shared-memory": "Logic",
            http: "Utility",
            database: "Utility",
            integration: "Integration",
            fileOperations: "Integration"
        };
        return categoryMap[type] || "Other";
    }

    /**
     * Generate suggested follow-up questions
     */
    private generateSuggestedQuestions(response: string, plan: WorkflowPlan | undefined): string[] {
        const questions: string[] = [];

        if (plan) {
            // Plan was generated, suggest refinement questions
            questions.push("Can you add error handling to this workflow?");
            questions.push("What about logging or notifications?");
            questions.push("Can you add a conditional branch?");
        } else {
            // No plan yet, suggest clarifying questions
            if (response.toLowerCase().includes("what") || response.includes("?")) {
                // AI asked a question, suggest common answers
                questions.push("Yes, that sounds right");
                questions.push("Can you show me an example?");
            } else {
                questions.push("Generate the workflow plan");
                questions.push("What other options do I have?");
            }
        }

        return questions.slice(0, 3);
    }
}

// Export singleton instance
export const workflowGenerationChatService = new WorkflowGenerationChatService();
