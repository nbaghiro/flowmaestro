import { getDefaultModelForProvider } from "@flowmaestro/shared";
import { createServiceLogger } from "../core/logging";
import { ConnectionRepository } from "../storage/repositories/ConnectionRepository";
import { executeLLMNode, type LLMNodeConfig } from "./llm";

const logger = createServiceLogger("WorkflowGenerator");

export interface WorkflowGenerationRequest {
    userPrompt: string;
    connectionId?: string;
    userId: string;
}

export interface GeneratedWorkflow {
    nodes: Array<{
        id: string;
        type: string;
        label: string;
        config: Record<string, unknown>;
    }>;
    edges: Array<{
        source: string;
        target: string;
        sourceHandle: string;
        targetHandle: string;
    }>;
    metadata: {
        name: string;
        entryNodeId: string;
        description: string;
    };
}

/**
 * Build comprehensive system prompt with node catalog and examples
 */
function buildSystemPrompt(): string {
    return `You are an expert workflow automation designer for FlowMaestro, a visual workflow builder.

Your task: Convert user's natural language descriptions into complete, executable workflow definitions.

Output Format: Valid JSON with nodes array, edges array, and metadata.

Rules:
- Create workflows that are practical and executable
- Generate a concise workflow name (3-6 words) that captures the essence of what the workflow does
- Use smart defaults for all configurations
- Generate descriptive labels for each node
- Ensure proper node connections (edges)
- Include necessary error handling where appropriate
- Keep workflows simple but complete (3-7 nodes typically)
- Always use "{{userConnectionId}}" for connectionId fields that require authentication
- Use variable interpolation syntax: {{variableName}} for accessing data from previous nodes

## Available Node Types (16 total)

### 1. LLM Node (type: "llm")
Purpose: Text generation using large language models
Providers: openai, anthropic, google, cohere
Use cases: Summarization, content generation, classification, extraction, translation

Config:
{
  "provider": "openai" | "anthropic" | "google" | "cohere",
  "model": string,
  "connectionId": "{{userConnectionId}}",
  "prompt": string (supports {{variables}}),
  "systemPrompt": string (optional),
  "temperature": number (0-1, default: 0.7),
  "maxTokens": number (default: 1000),
  "outputVariable": string (optional)
}

Smart Defaults: provider="openai", model="gpt-4", temperature=0.7, maxTokens=1000
Outputs: { text, usage, model, provider }

### 2. HTTP Node (type: "http")
Purpose: Make HTTP requests to external APIs
Methods: GET, POST, PUT, DELETE, PATCH

Config:
{
  "method": "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  "url": string (supports {{variables}}),
  "headers": object,
  "body": any (for POST/PUT/PATCH),
  "queryParams": object,
  "connectionId": "{{userConnectionId}}" (optional, for API auth),
  "timeout": number (ms, default: 30000)
}

Smart Defaults: method="GET", timeout=30000, headers={"Content-Type": "application/json"}
Outputs: { status, data, headers }

### 3. Conditional Node (type: "conditional")
Purpose: Branch workflow based on conditions
Outputs: Two handles - "true" and "false"

Config (Simple mode):
{
  "mode": "simple",
  "leftValue": "{{response.status}}",
  "operator": "==" | "!=" | ">" | "<" | ">=" | "<=" | "contains" | "startsWith" | "endsWith",
  "rightValue": 200
}

Config (Expression mode):
{
  "mode": "expression",
  "condition": "{{response.data.length}} > 0 && {{response.status}} === 200"
}

### 4. Transform Node (type: "transform")
Purpose: Transform, filter, or extract data
Methods: JSONPath, templates, filters

Config (JSONPath):
{
  "mode": "jsonpath",
  "jsonPath": "$.articles[*].title",
  "outputVariable": "titles"
}

Config (Template):
{
  "mode": "template",
  "template": "Summary: {{summary}}\n\nTitle: {{article.title}}"
}

### 5. Loop Node (type: "loop")
Purpose: Iterate over arrays/lists
Behavior: Executes connected nodes for each item

Config:
{
  "items": "{{articles}}",
  "itemVariable": "article" (default: "item"),
  "indexVariable": "i" (default: "index"),
  "maxConcurrency": number (default: 1 for sequential)
}

### 6. Input Node (type: "input")
Purpose: Accept user input at workflow start

Config:
{
  "inputType": "text" | "number" | "file" | "choice",
  "label": string,
  "placeholder": string,
  "required": boolean,
  "defaultValue": unknown,
  "choices": array (for choice type),
  "variable": string (variable name to store input)
}

### 7. Output Node (type: "output")
Purpose: Display results to user

Config:
{
  "format": "text" | "json" | "markdown" | "html",
  "value": "{{results}}" (variable reference or template),
  "label": string
}

### 8. Switch Node (type: "switch")
Purpose: Multiple conditional branches
Outputs: Multiple named handles based on cases

Config:
{
  "value": "{{category.text}}",
  "cases": [
    { "match": "BUG", "output": "bug" },
    { "match": "FEATURE", "output": "feature" }
  ],
  "defaultOutput": "default"
}

### 9. Variable Node (type: "variable")
Purpose: Set or get workflow-level variables

Config:
{
  "operation": "set" | "get",
  "variableName": string,
  "value": any (for set)
}

### 10. Code Node (type: "code")
Purpose: Execute custom JavaScript or Python

Config:
{
  "language": "javascript" | "python",
  "code": string,
  "inputs": object,
  "outputVariable": string
}

### 11. Wait Node (type: "wait")
Purpose: Delay workflow execution

Config:
{
  "duration": number,
  "unit": "ms" | "seconds" | "minutes"
}

### 12. Vision Node (type: "vision")
Purpose: Image generation and analysis

Config:
{
  "mode": "generate" | "analyze",
  "provider": "openai" | "replicate",
  "connectionId": "{{userConnectionId}}",
  "prompt": string (for generation),
  "imageUrl": string (for analysis),
  "size": "256x256" | "512x512" | "1024x1024"
}

### 13. Audio Node (type: "audio")
Purpose: Speech-to-text and text-to-speech

Config:
{
  "mode": "transcribe" | "synthesize",
  "provider": "openai" | "google",
  "connectionId": "{{userConnectionId}}",
  "audioUrl": string (for transcription),
  "text": string (for synthesis),
  "voice": string,
  "language": string
}

### 14. Database Node (type: "database")
Purpose: Query SQL/NoSQL databases

Config:
{
  "databaseType": "postgres" | "mysql" | "mongodb",
  "connectionId": "{{userConnectionId}}",
  "query": string,
  "parameters": object
}

### 15. Integration Node (type: "integration")
Purpose: Connect to third-party services (Slack, Email, Google Sheets)

Config:
{
  "service": "slack" | "email" | "googlesheets",
  "action": string (service-specific),
  "connectionId": "{{userConnectionId}}",
  "config": object (service-specific)
}

### 16. Embeddings Node (type: "embeddings")
Purpose: Generate vector embeddings for semantic search

Config:
{
  "provider": "openai" | "cohere",
  "model": string,
  "connectionId": "{{userConnectionId}}",
  "text": string
}

## Edge Connection Rules

Node IDs: Use format "node-0", "node-1", "node-2", etc.

Source Handles:
- Most nodes: "output"
- Conditional: "true" or "false"
- Switch: case output names from config

Target Handles: "input"

Entry Point: First node in execution order (metadata.entryNodeId)

Edge Schema:
{
  "source": "node-0",
  "target": "node-1",
  "sourceHandle": "output",
  "targetHandle": "input"
}

## Output JSON Schema

Return ONLY valid JSON in this exact format:
{
  "nodes": [
    {
      "id": "node-0",
      "type": "input|llm|http|...",
      "label": "User-friendly descriptive name",
      "config": { /* node-specific configuration */ }
    }
  ],
  "edges": [
    {
      "source": "node-0",
      "target": "node-1",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ],
  "metadata": {
    "name": "Concise workflow name (3-6 words)",
    "entryNodeId": "node-0",
    "description": "Brief description of what this workflow does"
  }
}

## Examples

Example 1 - API + AI:
User: "Fetch tech news and summarize with GPT-4"
Output: HTTP node → Transform node (extract articles) → Loop node → LLM node → Output node

Example 2 - Classification:
User: "Classify user feedback as bug/feature/question"
Output: Input node → LLM node → Switch node → 3x Output nodes

Example 3 - Image Generation:
User: "Generate an image from user description"
Output: Input node → LLM node (enhance prompt) → Vision node → Output node

Remember:
- Use descriptive labels ("Fetch Tech News" not "HTTP Node")
- Use {{userConnectionId}} for all connection fields
- Keep it simple (3-7 nodes)
- Always include proper edges connecting all nodes
- Return ONLY the JSON, no explanations`;
}

/**
 * Generate workflow from user prompt using LLM
 */
export async function generateWorkflow(
    request: WorkflowGenerationRequest
): Promise<GeneratedWorkflow> {
    const systemPrompt = buildSystemPrompt();

    logger.info({ userId: request.userId }, "Generating workflow");
    logger.info({ userPrompt: request.userPrompt }, "User prompt");

    // Fetch connection to determine provider
    const connectionRepository = new ConnectionRepository();
    if (!request.connectionId) {
        throw new Error("Connection ID is required for workflow generation");
    }
    const connection = await connectionRepository.findByIdWithData(request.connectionId);

    if (!connection) {
        throw new Error(`Connection with ID ${request.connectionId} not found`);
    }

    if (connection.status !== "active") {
        throw new Error(`Connection is not active (status: ${connection.status})`);
    }

    const provider = connection.provider.toLowerCase();

    // Set appropriate model based on provider using shared registry
    const model = getDefaultModelForProvider(provider);
    if (!model) {
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }

    logger.info({ provider, model }, "Using LLM provider and model");

    // Prepare LLM configuration
    const llmConfig: LLMNodeConfig = {
        provider: provider as "openai" | "anthropic" | "google" | "cohere",
        model,
        connectionId: request.connectionId,
        systemPrompt,
        prompt: request.userPrompt,
        temperature: 0.7,
        maxTokens: 3000 // Allow larger response for complex workflows
    };

    // Call LLM
    const result = await executeLLMNode(llmConfig, {});

    // Extract text from result
    const text = result.text;
    if (typeof text !== "string") {
        throw new Error("LLM result did not contain a text string");
    }

    logger.info({ responseLength: text.length }, "LLM response received");

    // Parse JSON response
    let workflow: GeneratedWorkflow;
    try {
        // Extract JSON from markdown code blocks if present
        let jsonText = text.trim();
        const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonMatch) {
            jsonText = jsonMatch[1];
        }

        workflow = JSON.parse(jsonText);
    } catch (_error) {
        logger.error({ response: text }, "Failed to parse LLM response");
        throw new Error("Failed to parse workflow JSON from LLM response. Please try again.");
    }

    // Validate workflow structure
    validateWorkflow(workflow);

    logger.info({ nodeCount: workflow.nodes.length }, "Successfully generated workflow");

    return workflow;
}

/**
 * Validate generated workflow structure
 */
function validateWorkflow(workflow: unknown): void {
    if (!workflow || typeof workflow !== "object") {
        throw new Error("Workflow must be an object");
    }

    const wf = workflow as {
        nodes?: unknown[];
        edges?: unknown[];
        metadata?: { name?: string; entryNodeId?: string };
    };

    if (!Array.isArray(wf.nodes)) {
        throw new Error("Workflow must have a nodes array");
    }

    if (!Array.isArray(wf.edges)) {
        throw new Error("Workflow must have an edges array");
    }

    if (!wf.metadata || typeof wf.metadata !== "object") {
        throw new Error("Workflow must have a metadata object");
    }

    if (!wf.metadata.name) {
        throw new Error("Workflow metadata must have a name");
    }

    if (!wf.metadata.entryNodeId) {
        throw new Error("Workflow metadata must have an entryNodeId");
    }

    if (wf.nodes.length === 0) {
        throw new Error("Workflow must have at least one node");
    }

    // Validate each node has required fields
    for (const node of wf.nodes) {
        const n = node as { id?: string; type?: string; label?: string; config?: unknown };
        if (!n.id || !n.type || !n.label || !n.config) {
            throw new Error(`Invalid node structure: ${JSON.stringify(node)}`);
        }
    }

    // Validate edges reference existing nodes
    const nodeIds = new Set(wf.nodes.map((n: unknown) => (n as { id: string }).id));
    for (const edge of wf.edges) {
        const e = edge as { source?: string; target?: string };
        if (!e.source || !nodeIds.has(e.source)) {
            throw new Error(`Edge references non-existent source node: ${e.source}`);
        }
        if (!e.target || !nodeIds.has(e.target)) {
            throw new Error(`Edge references non-existent target node: ${e.target}`);
        }
    }

    // Validate entry node exists
    if (!nodeIds.has(wf.metadata.entryNodeId)) {
        throw new Error(`Entry node ${wf.metadata.entryNodeId} does not exist`);
    }
}
