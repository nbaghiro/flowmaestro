import { getLogger } from "../core/logging";
import { ConnectionRepository } from "../storage/repositories/ConnectionRepository";
import {
    executeLLMNode,
    type LLMExecutionCallbacks
} from "../temporal/activities/execution/handlers/ai/llm";
import type {
    WorkflowContext,
    ChatResponse,
    ActionType,
    ChatMessage
} from "../api/schemas/chat-schemas";

const logger = getLogger();

export interface StreamCallbacks {
    onToken?: (token: string) => void;
    onComplete?: (response: ChatResponse) => void;
    onError?: (error: Error) => void;
}

// Interface for React Flow node structure
interface ReactFlowNode {
    id: string;
    type: string;
    data?: {
        label?: string;
        config?: Record<string, unknown>;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

export class WorkflowChatService {
    private connectionRepo = new ConnectionRepository();
    /**
     * Process chat request with streaming support
     */
    async processChat(
        action: ActionType,
        message: string,
        context: WorkflowContext,
        conversationHistory: ChatMessage[],
        connectionId: string,
        model: string | undefined,
        callbacks?: StreamCallbacks
    ): Promise<ChatResponse> {
        try {
            let response: ChatResponse;

            // null action = conversational mode (no structured changes)
            if (action === null) {
                response = await this.handleConversation(
                    message,
                    context,
                    conversationHistory,
                    connectionId,
                    model,
                    callbacks
                );
            } else {
                // Node modification operations
                switch (action) {
                    case "add":
                        response = await this.addNodes(
                            context,
                            message,
                            connectionId,
                            model,
                            callbacks
                        );
                        break;
                    case "modify":
                        response = await this.modifyNodes(
                            context,
                            message,
                            connectionId,
                            model,
                            callbacks
                        );
                        break;
                    case "remove":
                        response = await this.removeNodes(
                            context,
                            message,
                            connectionId,
                            model,
                            callbacks
                        );
                        break;
                    default:
                        throw new Error(`Unsupported action: ${action}`);
                }
            }

            callbacks?.onComplete?.(response);
            return response;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            callbacks?.onError?.(err);
            throw err;
        }
    }

    /**
     * Handle conversational messages (non-node operations)
     * Provides intelligent, context-aware responses with conversation history
     */
    private async handleConversation(
        message: string,
        context: WorkflowContext,
        conversationHistory: ChatMessage[],
        connectionId: string,
        model: string | undefined,
        callbacks?: StreamCallbacks
    ): Promise<ChatResponse> {
        // Build conversation context from history (last 10 messages)
        const conversationContext = conversationHistory
            .slice(-10)
            .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
            .join("\n\n");

        // Extract node types present in workflow
        const nodeTypes = Array.from(
            new Set((context.nodes as ReactFlowNode[]).map((n) => n.type))
        ).join(", ");
        const selectedNodeInfo = context.selectedNodeId
            ? (context.nodes as ReactFlowNode[]).find((n) => n.id === context.selectedNodeId)
            : null;

        // Serialize the full workflow structure
        const workflowData = this.serializeWorkflowContext(context);

        // Build system prompt for conversational mode
        const systemPrompt = `You are FlowMaestro AI, an intelligent assistant for the FlowMaestro workflow automation platform.

You can help users:
- Understand and explain their workflows
- Guide them on how to add, modify, or remove nodes
- Debug workflow issues and errors
- Optimize workflows and suggest improvements
- Answer general questions about workflow automation

Current workflow:
${workflowData}

Workflow summary:
- ${context.nodes.length} nodes in the workflow
- ${selectedNodeInfo ? `Selected node: ${selectedNodeInfo.type} (ID: ${context.selectedNodeId})` : "No node selected"}
- Node types present: ${nodeTypes || "none"}
- Connections: ${context.edges.length} edge${context.edges.length !== 1 ? "s" : ""}

Guidelines:
- Be helpful, friendly, and conversational
- Use the workflow data above to provide specific, informed answers
- Reference actual nodes and connections when analyzing the workflow
- If the user wants to modify the workflow, explain HOW they can do it or suggest they ask specifically (e.g., "add a new HTTP node")
- Provide actionable, specific advice based on the workflow structure
- Keep responses concise but complete`;

        // Build prompt with conversation history
        const prompt = conversationContext
            ? `Previous conversation:\n${conversationContext}\n\nUser: ${message}\n\nAssistant:`
            : `User: ${message}\n\nAssistant:`;

        // Call LLM with streaming support
        const llmCallbacks: LLMExecutionCallbacks | undefined = callbacks?.onToken
            ? { onToken: callbacks.onToken }
            : undefined;

        const result = await executeLLMNode(
            {
                provider: await this.getProviderFromConnection(connectionId),
                model: model || (await this.getDefaultModel(connectionId)),
                connectionId,
                systemPrompt,
                prompt,
                temperature: 0.7,
                maxTokens: 1500
            },
            {},
            llmCallbacks
        );

        const responseText = (result as { text?: string }).text || String(result);

        return {
            response: responseText,
            changes: undefined // Conversational mode doesn't propose changes
        };
    }

    /**
     * Explain how the workflow works
     */
    async explainWorkflow(
        context: WorkflowContext,
        connectionId: string,
        model: string | undefined,
        callbacks?: StreamCallbacks
    ): Promise<ChatResponse> {
        const nodeCount = context.nodes.length;
        const edgeCount = context.edges.length;

        // Build system prompt
        const systemPrompt = `You are an AI assistant helping users understand their workflow.

Context: The user has created a workflow with ${nodeCount} nodes and ${edgeCount} connections.

Task: Provide a clear, concise explanation of how this workflow works.

Guidelines:
- Identify the high-level purpose
- Explain the key steps (node sequence)
- Describe the data flow
- Mention any potential issues or bottlenecks
- Keep response under 200 words
- Use bullet points for clarity
- Be conversational and helpful`;

        // Serialize workflow for prompt
        const workflowSummary = this.serializeWorkflowContext(context);

        const userPrompt = `Please explain this workflow:

${workflowSummary}`;

        // Call LLM with streaming support
        const llmCallbacks: LLMExecutionCallbacks | undefined = callbacks?.onToken
            ? { onToken: callbacks.onToken }
            : undefined;

        const result = await executeLLMNode(
            {
                provider: await this.getProviderFromConnection(connectionId),
                model: model || (await this.getDefaultModel(connectionId)),
                connectionId,
                systemPrompt,
                prompt: userPrompt,
                temperature: 0.7,
                maxTokens: 1000
            },
            {},
            llmCallbacks
        );

        const responseText = (result as { text?: string }).text || String(result);

        return {
            response: responseText
        };
    }

    /**
     * Debug workflow and suggest fixes
     */
    async debugWorkflow(
        context: WorkflowContext,
        message: string,
        connectionId: string,
        model: string | undefined,
        callbacks?: StreamCallbacks
    ): Promise<ChatResponse> {
        const systemPrompt = `You are an AI workflow debugging assistant.

Task: Analyze the workflow and suggest fixes.

Guidelines:
- Identify configuration issues
- Check for missing required fields
- Validate node connections
- Suggest error handling improvements
- Provide specific, actionable fixes`;

        const workflowSummary = this.serializeWorkflowContext(context);

        const userPrompt = `User question: ${message}

Workflow:
${workflowSummary}`;

        const llmCallbacks: LLMExecutionCallbacks | undefined = callbacks?.onToken
            ? { onToken: callbacks.onToken }
            : undefined;

        const result = await executeLLMNode(
            {
                provider: await this.getProviderFromConnection(connectionId),
                model: model || (await this.getDefaultModel(connectionId)),
                connectionId,
                systemPrompt,
                prompt: userPrompt,
                temperature: 0.5,
                maxTokens: 1500
            },
            {},
            llmCallbacks
        );

        const responseText = (result as { text?: string }).text || String(result);

        return {
            response: responseText
        };
    }

    /**
     * Optimize workflow
     */
    async optimizeWorkflow(
        context: WorkflowContext,
        connectionId: string,
        model: string | undefined,
        callbacks?: StreamCallbacks
    ): Promise<ChatResponse> {
        const systemPrompt = `You are an AI workflow optimization assistant.

Task: Analyze the workflow and suggest optimizations.

Focus areas:
- Performance improvements (reduce API calls, parallel execution)
- Error handling (add error branches, timeouts, retries)
- Data flow optimization (reduce unnecessary transformations)
- Best practices (proper variable usage, clear node labels)
- Workflow structure (better organization, reduce complexity)

Guidelines:
- Provide 3-5 specific, actionable suggestions
- Explain the benefit of each suggestion
- Be practical and prioritize high-impact changes
- Keep suggestions under 300 words total`;

        const workflowSummary = this.serializeWorkflowContext(context);

        const userPrompt = `Please analyze this workflow and suggest optimizations:

${workflowSummary}`;

        const llmCallbacks: LLMExecutionCallbacks | undefined = callbacks?.onToken
            ? { onToken: callbacks.onToken }
            : undefined;

        const result = await executeLLMNode(
            {
                provider: await this.getProviderFromConnection(connectionId),
                model: model || (await this.getDefaultModel(connectionId)),
                connectionId,
                systemPrompt,
                prompt: userPrompt,
                temperature: 0.7,
                maxTokens: 1500
            },
            {},
            llmCallbacks
        );

        const responseText = (result as { text?: string }).text || String(result);

        return {
            response: responseText
        };
    }

    /**
     * Add nodes to workflow
     */
    async addNodes(
        context: WorkflowContext,
        message: string,
        connectionId: string,
        model: string | undefined,
        callbacks?: StreamCallbacks
    ): Promise<ChatResponse> {
        const systemPrompt = `You are an AI workflow assistant helping users add nodes to their workflow.

Available node types:
- llm: Call an LLM (GPT, Claude, etc.) with a prompt
- http: Make HTTP requests to external APIs
- transform: Transform data with JavaScript code
- conditional: Branch workflow based on conditions
- switch: Multi-way branching based on value
- loop: Iterate over arrays or repeat actions
- database: Query or update databases
- variable: Set or get workflow variables
- input: Workflow input parameters
- output: Workflow output results
- wait: Delay execution
- embeddings: Generate text embeddings
- knowledge-base-query: Query vector database

Task: Based on the user's request, suggest nodes to add to the workflow.

Response format (JSON):
{
  "explanation": "Brief explanation of what nodes you're suggesting and why",
  "nodes": [
    {
      "type": "node-type",
      "label": "Descriptive label",
      "config": { /* node-specific configuration */ },
      "connectTo": "existing-node-id (optional - suggest connection to existing node)"
    }
  ]
}

Guidelines:
- Suggest 1-3 nodes maximum
- Provide sensible default configurations
- Consider the existing workflow context
- Be practical and specific
- If workflow has nodes, suggest connections (connectTo) when logical flow is clear
- For example: if adding an HTTP node after an LLM node, suggest connecting them`;

        const workflowSummary = this.serializeWorkflowContext(context);

        const userPrompt = `User request: ${message}

Current workflow:
${workflowSummary}

Please suggest nodes to add based on the user's request.`;

        const llmCallbacks: LLMExecutionCallbacks | undefined = callbacks?.onToken
            ? { onToken: callbacks.onToken }
            : undefined;

        const result = await executeLLMNode(
            {
                provider: await this.getProviderFromConnection(connectionId),
                model: model || (await this.getDefaultModel(connectionId)),
                connectionId,
                systemPrompt,
                prompt: userPrompt,
                temperature: 0.7,
                maxTokens: 2000
            },
            {},
            llmCallbacks
        );

        const responseText = (result as { text?: string }).text || String(result);

        // Try to parse JSON response
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);

                // Convert to NodeChange format
                const changes =
                    parsed.nodes?.map((node: unknown, index: number) => {
                        const n = node as Record<string, unknown>;
                        return {
                            type: "add" as const,
                            nodeType: n.type as string,
                            nodeLabel: n.label as string,
                            config: (n.config as Record<string, unknown>) || {},
                            position: {
                                x: 100 + index * 250,
                                y: 100
                            },
                            ...(n.connectTo
                                ? { connectTo: n.connectTo as string }
                                : ({} as Record<string, unknown>))
                        };
                    }) || [];

                return {
                    response: parsed.explanation || responseText,
                    changes
                };
            }
        } catch (error) {
            logger.error(
                { component: "WorkflowChatService", err: error },
                "Failed to parse LLM response as JSON"
            );
        }

        // Fallback to text-only response
        return {
            response: responseText
        };
    }

    /**
     * Modify nodes in workflow
     */
    async modifyNodes(
        context: WorkflowContext,
        message: string,
        connectionId: string,
        model: string | undefined,
        callbacks?: StreamCallbacks
    ): Promise<ChatResponse> {
        const systemPrompt = `You are an AI workflow assistant helping users modify nodes in their workflow.

Task: Based on the user's request, suggest modifications to existing nodes.

Response format (JSON):
{
  "explanation": "Brief explanation of what you're modifying and why",
  "nodes": [
    {
      "nodeId": "id-of-node-to-modify",
      "updates": {
        "label": "New label (optional)",
        "config": { /* updated configuration fields */ }
      }
    }
  ]
}

Guidelines:
- Only modify what the user explicitly asks for
- Preserve existing config values unless changing them
- Provide clear explanation of changes
- If user mentions "selected node", use the selectedNodeId from context`;

        const workflowSummary = this.serializeWorkflowContext(context);

        const userPrompt = `User request: ${message}

Current workflow:
${workflowSummary}

Please suggest modifications based on the user's request.`;

        const llmCallbacks: LLMExecutionCallbacks | undefined = callbacks?.onToken
            ? { onToken: callbacks.onToken }
            : undefined;

        const result = await executeLLMNode(
            {
                provider: await this.getProviderFromConnection(connectionId),
                model: model || (await this.getDefaultModel(connectionId)),
                connectionId,
                systemPrompt,
                prompt: userPrompt,
                temperature: 0.7,
                maxTokens: 2000
            },
            {},
            llmCallbacks
        );

        const responseText = (result as { text?: string }).text || String(result);

        // Try to parse JSON response
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);

                // Convert to NodeChange format
                const changes =
                    parsed.nodes?.map((node: unknown) => {
                        const n = node as Record<string, unknown>;
                        return {
                            type: "modify" as const,
                            nodeId: n.nodeId as string,
                            updates: n.updates as Record<string, unknown>
                        };
                    }) || [];

                return {
                    response: parsed.explanation || responseText,
                    changes
                };
            }
        } catch (error) {
            logger.error(
                { component: "WorkflowChatService", err: error },
                "Failed to parse LLM response as JSON"
            );
        }

        // Fallback to text-only response
        return {
            response: responseText
        };
    }

    /**
     * Remove nodes from workflow
     */
    async removeNodes(
        context: WorkflowContext,
        message: string,
        connectionId: string,
        model: string | undefined,
        callbacks?: StreamCallbacks
    ): Promise<ChatResponse> {
        const systemPrompt = `You are an AI workflow assistant helping users remove or clean up nodes in their workflow.

Task: Based on the user's request, identify nodes to remove from the workflow.

Response format (JSON):
{
  "explanation": "Brief explanation of what you're removing and why",
  "nodeIds": ["node-id-1", "node-id-2"]
}

Guidelines:
- Be conservative - only suggest removing nodes the user clearly wants removed
- Explain the impact of removing each node
- If user says "cleanup", identify duplicate, unused, or problematic nodes
- Consider dependencies - warn if removing a node breaks connections`;

        const workflowSummary = this.serializeWorkflowContext(context);

        const userPrompt = `User request: ${message}

Current workflow:
${workflowSummary}

Please identify which nodes should be removed based on the user's request.`;

        const llmCallbacks: LLMExecutionCallbacks | undefined = callbacks?.onToken
            ? { onToken: callbacks.onToken }
            : undefined;

        const result = await executeLLMNode(
            {
                provider: await this.getProviderFromConnection(connectionId),
                model: model || (await this.getDefaultModel(connectionId)),
                connectionId,
                systemPrompt,
                prompt: userPrompt,
                temperature: 0.5,
                maxTokens: 1500
            },
            {},
            llmCallbacks
        );

        const responseText = (result as { text?: string }).text || String(result);

        // Try to parse JSON response
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);

                // Convert to NodeChange format
                const changes =
                    parsed.nodeIds?.map((nodeId: string) => ({
                        type: "remove" as const,
                        nodeId
                    })) || [];

                return {
                    response: parsed.explanation || responseText,
                    changes
                };
            }
        } catch (error) {
            logger.error(
                { component: "WorkflowChatService", err: error },
                "Failed to parse LLM response as JSON"
            );
        }

        // Fallback to text-only response
        return {
            response: responseText
        };
    }

    /**
     * Serialize workflow context for AI prompt
     */
    private serializeWorkflowContext(context: WorkflowContext): string {
        const { nodes, edges, selectedNodeId } = context;

        if (nodes.length === 0) {
            return "Empty workflow (no nodes)";
        }

        // For large workflows, use summarization
        if (nodes.length > 20) {
            const nodeTypes: Record<string, number> = {};
            (nodes as ReactFlowNode[]).forEach((node) => {
                const type = node.type || "unknown";
                nodeTypes[type] = (nodeTypes[type] || 0) + 1;
            });

            return `Workflow Summary:
- ${nodes.length} nodes total
- Node types: ${Object.entries(nodeTypes)
                .map(([type, count]) => `${count} ${type}`)
                .join(", ")}
- ${edges.length} connections
${selectedNodeId ? `- Selected node: ${selectedNodeId}` : ""}

Node list:
${(nodes as ReactFlowNode[])
    .map((n) => `- ${n.id}: ${n.type} ${n.data?.label ? `(${n.data.label})` : ""}`)
    .join("\n")}`;
        }

        // Full context for smaller workflows
        return JSON.stringify({ nodes, edges, selectedNodeId }, null, 2);
    }

    /**
     * Get provider from connection ID
     */
    private async getProviderFromConnection(
        connectionId: string
    ): Promise<"openai" | "anthropic" | "google" | "cohere" | "huggingface"> {
        const connection = await this.connectionRepo.findById(connectionId);
        if (!connection) {
            throw new Error(`Connection not found: ${connectionId}`);
        }

        // Validate provider is one of the supported types
        const provider = connection.provider.toLowerCase();
        if (
            provider !== "openai" &&
            provider !== "anthropic" &&
            provider !== "google" &&
            provider !== "cohere" &&
            provider !== "huggingface"
        ) {
            throw new Error(`Unsupported provider: ${connection.provider}`);
        }

        return provider as "openai" | "anthropic" | "google" | "cohere" | "huggingface";
    }

    /**
     * Get default model for provider
     */
    private async getDefaultModel(connectionId: string): Promise<string> {
        const connection = await this.connectionRepo.findById(connectionId);
        if (!connection) {
            throw new Error(`Connection not found: ${connectionId}`);
        }

        // Check if there's a default model in metadata
        const defaultModel = connection.metadata?.provider_config?.default_model;
        if (defaultModel && typeof defaultModel === "string") {
            return defaultModel;
        }

        // Provider-specific defaults
        const provider = connection.provider.toLowerCase();
        switch (provider) {
            case "openai":
                return "gpt-4o";
            case "anthropic":
                return "claude-3-5-sonnet-20241022";
            case "google":
                return "gemini-1.5-pro";
            case "cohere":
                return "command-r-plus";
            case "huggingface":
                return "meta-llama/Llama-3.3-70B-Instruct";
            default:
                return "gpt-4o"; // Fallback
        }
    }
}
