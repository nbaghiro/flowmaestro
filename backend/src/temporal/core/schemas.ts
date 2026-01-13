/**
 * Validation Schemas
 *
 * Zod schemas for validating node configurations.
 */

import { z } from "zod";

// ============================================================================
// BASE SCHEMAS
// ============================================================================

/**
 * Output variable name - alphanumeric with underscores.
 */
export const OutputVariableSchema = z
    .string()
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Output variable must be a valid identifier")
    .optional();

/**
 * Variable reference pattern - supports {{variableName}} syntax.
 */
export const VariableReferenceSchema = z.string().min(1, "Variable reference is required");

/**
 * Header/query parameter pair.
 */
export const KeyValuePairSchema = z.object({
    key: z.string().min(1, "Key is required"),
    value: z.string()
});

// ============================================================================
// AI NODE SCHEMAS
// ============================================================================

/**
 * LLM Node Configuration.
 */
export const LLMNodeConfigSchema = z.object({
    provider: z.enum(["openai", "anthropic", "google", "cohere", "huggingface"], {
        required_error: "LLM provider is required. Please select an LLM connection.",
        invalid_type_error: "Invalid LLM provider"
    }),
    model: z.string().min(1, "Model is required. Please select a model."),
    connectionId: z.string().optional(),
    systemPrompt: z.string().optional(),
    prompt: z.string().min(1, "Prompt is required. Please enter a prompt."),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
    topP: z.number().min(0).max(1).optional(),
    outputVariable: OutputVariableSchema,
    /** Enable extended thinking/reasoning mode for supported models */
    enableThinking: z.boolean().optional(),
    /** Token budget for thinking (minimum 1024, maximum 32768) */
    thinkingBudget: z.number().int().min(1024).max(32768).optional()
});

export type LLMNodeConfig = z.infer<typeof LLMNodeConfigSchema>;

/**
 * Vision Node Configuration.
 */
export const VisionNodeConfigSchema = z.object({
    provider: z.enum(["openai", "anthropic", "google"], {
        required_error: "Vision provider is required"
    }),
    model: z.string().min(1, "Model is required"),
    connectionId: z.string().uuid("Invalid connection ID format").optional(),
    operation: z.enum(["analyze", "generate"]).default("analyze"),
    imageInput: z.string().optional(),
    prompt: z.string().optional(),
    maxTokens: z.number().int().positive().optional().default(1000),
    outputVariable: OutputVariableSchema
});

export type VisionNodeConfig = z.infer<typeof VisionNodeConfigSchema>;

/**
 * Audio Node Configuration.
 */
export const AudioNodeConfigSchema = z.object({
    provider: z.enum(["openai", "google"], {
        required_error: "Audio provider is required"
    }),
    connectionId: z.string().uuid("Invalid connection ID format").optional(),
    operation: z.enum(["transcribe", "synthesize"]),
    audioInput: z.string().optional(),
    textInput: z.string().optional(),
    voice: z.string().optional(),
    language: z.string().optional(),
    outputVariable: OutputVariableSchema
});

export type AudioNodeConfig = z.infer<typeof AudioNodeConfigSchema>;

/**
 * Audio Input Node Configuration (STT - Speech-to-Text).
 * Transcribes audio from file uploads or recordings.
 */
export const AudioInputNodeConfigSchema = z.object({
    provider: z.enum(["openai", "deepgram"], {
        required_error: "STT provider is required"
    }),
    model: z.string().min(1, "Model is required"),
    // Audio source - input parameter name from workflow trigger
    inputName: z.string().min(1, "Input parameter name is required").default("audio"),
    // Optional language hint for better accuracy
    language: z.string().optional(),
    // Deepgram-specific options
    punctuate: z.boolean().optional().default(true),
    diarize: z.boolean().optional().default(false),
    // Output configuration
    outputVariable: z.string().min(1, "Output variable is required"),
    // Description for UI
    label: z.string().optional(),
    description: z.string().optional()
});

export type AudioInputNodeConfig = z.infer<typeof AudioInputNodeConfigSchema>;

/**
 * Audio Output Node Configuration (TTS - Text-to-Speech).
 * Generates speech from text using various TTS providers.
 */
export const AudioOutputNodeConfigSchema = z.object({
    provider: z.enum(["openai", "elevenlabs", "deepgram"], {
        required_error: "TTS provider is required"
    }),
    model: z.string().min(1, "Model/voice is required"),
    // Text to synthesize - supports variable interpolation
    textInput: z.string().min(1, "Text input is required"),
    // Voice settings
    voice: z.string().optional(),
    speed: z.number().min(0.25).max(4.0).optional().default(1.0),
    // ElevenLabs-specific settings
    stability: z.number().min(0).max(1).optional().default(0.5),
    similarityBoost: z.number().min(0).max(1).optional().default(0.75),
    // Output settings
    outputFormat: z.enum(["mp3", "wav", "opus"]).default("mp3"),
    returnAsUrl: z.boolean().optional().default(false),
    outputVariable: z.string().min(1, "Output variable is required"),
    // Description for UI
    label: z.string().optional(),
    description: z.string().optional()
});

export type AudioOutputNodeConfig = z.infer<typeof AudioOutputNodeConfigSchema>;

/**
 * Embeddings Node Configuration.
 */
export const EmbeddingsNodeConfigSchema = z.object({
    provider: z.enum(["openai", "cohere", "google"], {
        required_error: "Embeddings provider is required"
    }),
    model: z.string().min(1, "Model is required"),
    connectionId: z.string().uuid("Invalid connection ID format").optional(),
    input: z.string().min(1, "Input text is required"),
    batchMode: z.boolean().optional().default(false),
    outputVariable: OutputVariableSchema
});

export type EmbeddingsNodeConfig = z.infer<typeof EmbeddingsNodeConfigSchema>;

/**
 * Router Route Schema - defines a classification route.
 */
export const RouterRouteSchema = z.object({
    value: z.string().min(1, "Route value is required"),
    label: z.string().optional(),
    description: z.string().optional()
});

/**
 * Router Node Configuration.
 * LLM-based classification into predefined routes.
 */
export const RouterNodeConfigSchema = z.object({
    provider: z.enum(["openai", "anthropic", "google"], {
        required_error: "LLM provider is required for routing"
    }),
    model: z.string().min(1, "Model is required"),
    connectionId: z.string().optional(),
    systemPrompt: z.string().optional(),
    prompt: z.string().min(1, "Classification prompt is required"),
    routes: z.array(RouterRouteSchema).min(2, "At least 2 routes are required"),
    defaultRoute: z.string().optional(),
    temperature: z.number().min(0).max(1).optional().default(0),
    outputVariable: z.string().min(1, "Output variable is required")
});

export type RouterNodeConfig = z.infer<typeof RouterNodeConfigSchema>;

// ============================================================================
// INTEGRATION NODE SCHEMAS
// ============================================================================

/**
 * HTTP Node Configuration.
 */
export const HTTPNodeConfigSchema = z.object({
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
    url: z.string().min(1, "URL is required"),
    headers: z.array(KeyValuePairSchema).optional().default([]),
    queryParams: z.array(KeyValuePairSchema).optional().default([]),
    authType: z.enum(["none", "basic", "bearer", "apiKey"]).optional().default("none"),
    authCredentials: z.string().optional(),
    bodyType: z.enum(["json", "form", "raw"]).optional().default("json"),
    body: z.string().optional(),
    timeout: z.number().int().positive().max(300).optional().default(30),
    retryCount: z.number().int().min(0).max(5).optional().default(0),
    outputVariable: OutputVariableSchema
});

export type HTTPNodeConfig = z.infer<typeof HTTPNodeConfigSchema>;

/**
 * Code Node Configuration.
 */
export const CodeNodeConfigSchema = z.object({
    language: z.enum(["javascript", "python"], {
        required_error: "Programming language is required"
    }),
    code: z.string().min(1, "Code is required"),
    timeout: z.number().int().positive().max(300000).optional().default(30000),
    memory: z.number().int().positive().max(512).optional().default(128),
    inputVariables: z.array(z.string()).optional().default([]),
    outputVariable: OutputVariableSchema,
    allowNetworkAccess: z.boolean().optional().default(false),
    allowFileSystemAccess: z.boolean().optional().default(false)
});

export type CodeNodeConfig = z.infer<typeof CodeNodeConfigSchema>;

/**
 * Database Node Configuration.
 */
export const DatabaseNodeConfigSchema = z.object({
    databaseType: z.enum(["postgres", "mysql", "mongodb"], {
        required_error: "Database type is required"
    }),
    connectionId: z.string().uuid("Invalid connection ID format"),
    operation: z.enum(["query", "insert", "update", "delete"]).default("query"),
    query: z.string().min(1, "Query is required"),
    parameters: z.record(z.unknown()).optional().default({}),
    outputVariable: OutputVariableSchema
});

export type DatabaseNodeConfig = z.infer<typeof DatabaseNodeConfigSchema>;

/**
 * File Operations Node Configuration.
 */
export const FileOperationsNodeConfigSchema = z.object({
    operation: z.enum(["read", "write", "delete", "list", "exists"]),
    path: z.string().min(1, "File path is required"),
    content: z.string().optional(),
    encoding: z.enum(["utf8", "base64", "binary"]).optional().default("utf8"),
    outputVariable: OutputVariableSchema
});

export type FileOperationsNodeConfig = z.infer<typeof FileOperationsNodeConfigSchema>;

/**
 * Integration Node Configuration.
 */
export const IntegrationNodeConfigSchema = z.object({
    service: z.enum(["slack", "email", "googlesheets", "discord", "twilio"], {
        required_error: "Integration service is required"
    }),
    action: z.string().min(1, "Action is required"),
    connectionId: z.string().uuid("Invalid connection ID format").optional(),
    parameters: z.record(z.unknown()).optional().default({}),
    outputVariable: OutputVariableSchema
});

export type IntegrationNodeConfig = z.infer<typeof IntegrationNodeConfigSchema>;

/**
 * Action Node Configuration.
 * Performs actions in external applications (send, create, update, delete operations).
 * Uses the same provider/connection infrastructure as Integration nodes.
 */
export const ActionNodeConfigSchema = z.object({
    provider: z.string().min(1, "Provider is required"),
    operation: z.string().min(1, "Operation is required"),
    connectionId: z.string().uuid("Invalid connection ID format"),
    parameters: z.record(z.unknown()).optional().default({}),
    outputVariable: OutputVariableSchema
});

export type ActionNodeConfig = z.infer<typeof ActionNodeConfigSchema>;

/**
 * Knowledge Base Query Node Configuration.
 */
export const KnowledgeBaseQueryNodeConfigSchema = z.object({
    knowledgeBaseId: z.string().uuid("Invalid knowledge base ID format"),
    query: z.string().min(1, "Query is required"),
    topK: z.number().int().positive().max(100).optional().default(5),
    threshold: z.number().min(0).max(1).optional().default(0.7),
    outputVariable: OutputVariableSchema
});

export type KnowledgeBaseQueryNodeConfig = z.infer<typeof KnowledgeBaseQueryNodeConfigSchema>;

// ============================================================================
// LOGIC NODE SCHEMAS
// ============================================================================

/**
 * Conditional Node Configuration.
 */
export const ConditionalNodeConfigSchema = z.object({
    conditionType: z.enum(["simple", "expression"]).default("simple"),
    // Simple mode
    leftValue: z.string().optional(),
    operator: z
        .enum([
            "==",
            "!=",
            ">",
            "<",
            ">=",
            "<=",
            "contains",
            "startsWith",
            "endsWith",
            "isEmpty",
            "isNotEmpty",
            "isNull",
            "isNotNull"
        ])
        .optional(),
    rightValue: z.string().optional(),
    // Expression mode
    expression: z.string().optional()
});

export type ConditionalNodeConfig = z.infer<typeof ConditionalNodeConfigSchema>;

/**
 * Loop Node Configuration.
 */
export const LoopNodeConfigSchema = z.object({
    loopType: z.enum(["forEach", "while", "count"]).default("forEach"),
    // forEach mode
    arrayPath: z.string().optional(), // Variable path to array: {{items}}, {{data.results}}
    itemVariable: z.string().optional().default("item"),
    indexVariable: z.string().optional().default("index"),
    // while mode
    condition: z.string().optional(),
    maxIterations: z.number().int().positive().max(10000).optional().default(1000),
    // count mode
    count: z.union([z.number(), z.string()]).optional(), // Can be number or variable reference
    startIndex: z.number().int().min(0).optional().default(0)
});

export type LoopNodeConfig = z.output<typeof LoopNodeConfigSchema>;

/**
 * Switch Case.
 */
export const SwitchCaseSchema = z.object({
    value: z.string(),
    label: z.string().optional()
});

/**
 * Switch Node Configuration.
 */
export const SwitchNodeConfigSchema = z.object({
    expression: z.string().min(1, "Expression is required"), // Variable to evaluate: {{status}}, {{count}}
    cases: z.array(SwitchCaseSchema).min(1, "At least one case is required"),
    defaultCase: z.string().optional()
});

export type SwitchNodeConfig = z.infer<typeof SwitchNodeConfigSchema>;

/**
 * Wait Node Configuration.
 */
export const WaitNodeConfigSchema = z.object({
    waitType: z.enum(["duration", "until"]).default("duration"),
    // Duration mode - supports both direct ms and value+unit
    duration: z.number().int().positive().optional(), // Direct milliseconds
    durationValue: z.number().positive().optional(), // Value (e.g., 5)
    durationUnit: z
        .enum(["ms", "seconds", "minutes", "hours", "days"])
        .optional()
        .default("seconds"),
    // Until mode
    timestamp: z.string().optional(), // ISO 8601 timestamp
    timezone: z.string().optional(), // IANA timezone
    // Output
    outputVariable: OutputVariableSchema
});

export type WaitNodeConfig = z.output<typeof WaitNodeConfigSchema>;

// ============================================================================
// DATA NODE SCHEMAS
// ============================================================================

/**
 * Transform Node Configuration.
 */
export const TransformNodeConfigSchema = z.object({
    operation: z.enum([
        "map",
        "filter",
        "reduce",
        "sort",
        "merge",
        "extract",
        "custom",
        "parseXML",
        "parseJSON",
        "passthrough"
    ]),
    inputData: z.string().min(1, "Input data reference is required"),
    expression: z.string().optional().default(""),
    outputVariable: z.string().min(1, "Output variable is required")
});

export type TransformNodeConfig = z.infer<typeof TransformNodeConfigSchema>;

/**
 * Shared Memory Node Configuration.
 * Provides key-value storage with semantic search capabilities.
 *
 * Operations:
 * - store: Save a value with a key, optionally indexed for semantic search
 * - search: Find relevant values by meaning/query
 *
 * Values can also be accessed directly via {{shared.keyName}} interpolation.
 */
export const SharedMemoryNodeConfigSchema = z.object({
    operation: z.enum(["store", "search"]),
    // For store operation
    key: z.string().optional(),
    value: z.string().optional(),
    enableSemanticSearch: z.boolean().optional().default(true),
    // For search operation
    searchQuery: z.string().optional(),
    topK: z.number().int().min(1).max(50).optional().default(5),
    similarityThreshold: z.number().min(0).max(1).optional().default(0.7)
});

export type SharedMemoryNodeConfig = z.infer<typeof SharedMemoryNodeConfigSchema>;

/**
 * Output Node Configuration.
 */
export const OutputNodeConfigSchema = z.object({
    outputName: z.string().min(1, "Output name is required"),
    value: z.string().min(1, "Output value is required"),
    format: z.enum(["json", "string", "number", "boolean"]).default("string"),
    description: z.string().optional()
});

export type OutputNodeConfig = z.infer<typeof OutputNodeConfigSchema>;

/**
 * Template Output Node Configuration.
 * Renders markdown templates with variable interpolation.
 */
export const TemplateOutputNodeConfigSchema = z.object({
    outputName: z.string().min(1, "Output name is required"),
    template: z.string().min(1, "Template content is required"),
    outputFormat: z.enum(["markdown", "html"]).default("markdown"),
    description: z.string().optional()
});

export type TemplateOutputNodeConfig = z.infer<typeof TemplateOutputNodeConfigSchema>;

// ============================================================================
// CONTROL NODE SCHEMAS
// ============================================================================

/**
 * Input Node Validation Configuration.
 */
export const InputValidationSchema = z.object({
    pattern: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    jsonSchema: z.unknown().optional()
});

/**
 * Input Node Configuration.
 * Simple input node for providing text or JSON data at workflow start.
 */
export const InputNodeConfigSchema = z.object({
    inputType: z.enum(["text", "json"]).default("text"),
    value: z.string().default("")
});

export type InputNodeConfig = z.infer<typeof InputNodeConfigSchema>;

/**
 * Human Review Node Configuration.
 * For collecting user input during workflow execution (human-in-the-loop).
 * Pauses workflow until user provides input.
 */
export const HumanReviewNodeConfigSchema = z.object({
    prompt: z.string().min(1, "Prompt is required"),
    description: z.string().optional(),
    variableName: z.string().min(1, "Variable name is required"),
    inputType: z.enum(["text", "number", "boolean", "json"]).default("text"),
    placeholder: z.string().optional(),
    required: z.boolean().default(true),
    defaultValue: z.unknown().optional(),
    validation: InputValidationSchema.optional(),
    outputVariable: z.string().min(1, "Output variable is required")
});

export type HumanReviewNodeConfig = z.infer<typeof HumanReviewNodeConfigSchema>;

/**
 * Supported file types for the Files node.
 */
export const SupportedFileTypes = [
    "pdf",
    "docx",
    "doc",
    "txt",
    "md",
    "html",
    "json",
    "csv"
] as const;

export type SupportedFileType = (typeof SupportedFileTypes)[number];

/**
 * Files Node Configuration.
 * For processing uploaded files at workflow trigger time.
 * Extracts text and chunks content for downstream processing.
 */
export const FilesNodeConfigSchema = z.object({
    // Input configuration
    inputName: z.string().min(1, "Input name is required"),
    required: z.boolean().default(true),

    // Chunking configuration (reuses KB pattern)
    chunkSize: z.number().int().positive().max(10000).optional().default(1000),
    chunkOverlap: z.number().int().min(0).max(500).optional().default(200),

    // File type restrictions (optional - if empty, all types allowed)
    allowedFileTypes: z.array(z.enum(SupportedFileTypes)).optional(),

    // Output configuration
    outputVariable: z.string().min(1, "Output variable is required"),

    // Description for UI
    label: z.string().optional(),
    description: z.string().optional()
});

export type FilesNodeConfig = z.infer<typeof FilesNodeConfigSchema>;

/**
 * URL Node Configuration.
 * For fetching webpage content at workflow trigger time.
 */
export const URLNodeConfigSchema = z.object({
    // URLs to fetch
    urls: z.array(z.string().url()).default([]),

    // Scraping options
    scrapingMode: z.enum(["html", "text", "markdown"]).default("html"),
    scrapeSubpages: z.boolean().default(false),
    timeout: z.number().int().min(5).max(60).default(30),
    followRedirects: z.boolean().default(true),
    includeMetadata: z.boolean().default(true),

    // Chunking settings
    chunkingAlgorithm: z.enum(["sentence", "paragraph", "fixed", "semantic"]).default("sentence"),
    chunkOverlap: z.number().int().min(0).max(2000).default(1000),
    chunkSize: z.number().int().min(500).max(5000).default(2500),
    advancedExtraction: z.boolean().default(false),
    ocrEnabled: z.boolean().default(false),

    // Input/Output configuration
    inputName: z.string().default("urls"),
    outputVariable: z.string().default("fetchedContent"),
    required: z.boolean().default(true),

    // Description for UI
    label: z.string().optional(),
    description: z.string().optional()
});

export type URLNodeConfig = z.infer<typeof URLNodeConfigSchema>;

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validation result type.
 */
export interface SchemaValidationResult<T> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        errors: Array<{
            path: string;
            message: string;
        }>;
    };
}

/**
 * Validate config with a schema and return structured result.
 */
export function validateConfig<T>(
    schema: z.ZodSchema<T>,
    config: unknown,
    nodeName: string
): SchemaValidationResult<T> {
    const result = schema.safeParse(config);

    if (result.success) {
        return {
            success: true,
            data: result.data
        };
    }

    const errors = result.error.issues.map((issue) => ({
        path: issue.path.join(".") || "root",
        message: issue.message
    }));

    const errorMessages = errors.map((e) => (e.path ? `${e.path}: ${e.message}` : e.message));

    return {
        success: false,
        error: {
            message: `${nodeName} configuration error:\n${errorMessages.join("\n")}`,
            errors
        }
    };
}

/**
 * Validate and throw if invalid - for use in executors.
 * Uses z.ZodType to properly infer output type after transforms/defaults.
 */
export function validateOrThrow<TOutput, TDef extends z.ZodTypeDef, TInput>(
    schema: z.ZodType<TOutput, TDef, TInput>,
    config: unknown,
    nodeName: string
): TOutput {
    const result = schema.safeParse(config);

    if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
            path: issue.path.join(".") || "root",
            message: issue.message
        }));

        const errorMessages = errors.map((e) => (e.path ? `${e.path}: ${e.message}` : e.message));

        throw new Error(`${nodeName} configuration error:\n${errorMessages.join("\n")}`);
    }

    return result.data;
}

/**
 * Maps node types to their schemas.
 */
export const NodeSchemaRegistry: Record<string, z.ZodSchema> = {
    // AI
    llm: LLMNodeConfigSchema,
    vision: VisionNodeConfigSchema,
    audio: AudioNodeConfigSchema, // Legacy - will be removed
    embeddings: EmbeddingsNodeConfigSchema,
    router: RouterNodeConfigSchema,
    // Audio (separate input/output nodes)
    audioInput: AudioInputNodeConfigSchema,
    audioOutput: AudioOutputNodeConfigSchema,
    // Integrations
    http: HTTPNodeConfigSchema,
    code: CodeNodeConfigSchema,
    database: DatabaseNodeConfigSchema,
    fileOperations: FileOperationsNodeConfigSchema,
    integration: IntegrationNodeConfigSchema,
    action: ActionNodeConfigSchema,
    knowledgeBaseQuery: KnowledgeBaseQueryNodeConfigSchema,
    // Logic
    conditional: ConditionalNodeConfigSchema,
    loop: LoopNodeConfigSchema,
    switch: SwitchNodeConfigSchema,
    wait: WaitNodeConfigSchema,
    humanReview: HumanReviewNodeConfigSchema,
    // Data
    transform: TransformNodeConfigSchema,
    "shared-memory": SharedMemoryNodeConfigSchema,
    output: OutputNodeConfigSchema,
    templateOutput: TemplateOutputNodeConfigSchema,
    // Control
    input: InputNodeConfigSchema,
    files: FilesNodeConfigSchema,
    url: URLNodeConfigSchema
};

/**
 * Get schema for a node type.
 */
export function getNodeSchema(nodeType: string): z.ZodSchema | undefined {
    return NodeSchemaRegistry[nodeType];
}

/**
 * Validate a node config by type.
 */
export function validateNodeConfig(
    nodeType: string,
    config: unknown
): SchemaValidationResult<unknown> {
    const schema = getNodeSchema(nodeType);

    if (!schema) {
        return {
            success: true,
            data: config
        };
    }

    return validateConfig(schema, config, `${nodeType} node`);
}
