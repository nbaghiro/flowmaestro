/**
 * Node Validation Rules
 *
 * Defines validation rules for each workflow node type.
 * These rules are used to validate node configurations and show errors in the UI.
 */

import {
    type NodeValidationRulesMap,
    type NodeValidationRule,
    requiredField,
    requiredUUID,
    requiredIdentifier,
    requiredArray,
    conditionalRule,
    requireOneOf,
    isEmpty
} from "./validation";

// ============================================================================
// AI NODE RULES
// ============================================================================

const llmRules: NodeValidationRule[] = [
    requiredField("provider", "Select a provider"),
    requiredField("model", "Select a model"),
    requiredField("prompt", "Enter a prompt"),
    requiredUUID("connectionId", "Select a connection")
];

const visionRules: NodeValidationRule[] = [
    requiredField("provider", "Select a provider"),
    requiredField("model", "Select a model"),
    requiredUUID("connectionId", "Select a connection")
];

// Audio Input (STT) rules
const audioInputRules: NodeValidationRule[] = [
    requiredField("provider", "Select an STT provider"),
    requiredField("model", "Select a model"),
    requiredField("inputName", "Enter an input parameter name"),
    requiredIdentifier("outputVariable", "Enter an output variable name")
];

// Audio Output (TTS) rules
const audioOutputRules: NodeValidationRule[] = [
    requiredField("provider", "Select a TTS provider"),
    requiredField("model", "Select a model or voice"),
    requiredField("textInput", "Enter text to synthesize"),
    requiredIdentifier("outputVariable", "Enter an output variable name")
];

const embeddingsRules: NodeValidationRule[] = [
    requiredField("provider", "Select a provider"),
    requiredField("model", "Select a model"),
    requiredField("input", "Enter input text or variable"),
    requiredUUID("connectionId", "Select a connection")
];

const routerRules: NodeValidationRule[] = [
    requiredField("provider", "Select a provider"),
    requiredField("model", "Select a model"),
    requiredField("prompt", "Enter a classification prompt"),
    requiredArray("routes", 2, "Add at least 2 routes"),
    requiredIdentifier("outputVariable", "Enter an output variable name"),
    requiredUUID("connectionId", "Select a connection")
];

const kbQueryRules: NodeValidationRule[] = [
    requiredUUID("knowledgeBaseId", "Select a knowledge base"),
    requiredField("query", "Enter a query")
];

// ============================================================================
// INPUT/OUTPUT NODE RULES
// ============================================================================

const inputRules: NodeValidationRule[] = [
    // Input nodes have defaults, so no strict requirements
];

const outputRules: NodeValidationRule[] = [
    requiredField("outputName", "Enter an output name"),
    requiredField("value", "Enter an output value")
];

const filesRules: NodeValidationRule[] = [
    requiredField("inputName", "Enter an input parameter name"),
    requiredIdentifier("outputVariable", "Enter an output variable name")
];

const waitForUserRules: NodeValidationRule[] = [
    requiredField("prompt", "Enter a prompt for the user"),
    requiredIdentifier("variableName", "Enter a variable name"),
    requiredIdentifier("outputVariable", "Enter an output variable name")
];

// ============================================================================
// TRIGGER NODE RULES
// ============================================================================

const triggerRules: NodeValidationRule[] = [
    requiredField("providerId", "Select an integration for this trigger"),
    requiredField("eventId", "Select a trigger event"),
    requiredUUID("connectionId", "Select a connection")
];

// ============================================================================
// ACTION NODE RULES
// ============================================================================

const actionRules: NodeValidationRule[] = [
    requiredField("provider", "Select an integration for this action"),
    requiredField("operation", "Select an action to perform"),
    requiredUUID("connectionId", "Select a connection")
];

// ============================================================================
// LOGIC NODE RULES
// ============================================================================

const conditionalRules: NodeValidationRule[] = [
    // Either expression mode OR simple mode must be configured
    {
        field: "expression",
        severity: "error",
        validate: (_value, config) => {
            const hasExpression = !isEmpty(config.expression);
            const hasSimpleMode = !isEmpty(config.leftValue) && !isEmpty(config.operator);

            if (!hasExpression && !hasSimpleMode) {
                return "Configure a condition (expression or comparison)";
            }
            return null;
        }
    }
];

const switchRules: NodeValidationRule[] = [
    requiredField("expression", "Enter a value to switch on"),
    requiredArray("cases", 1, "Add at least 1 case")
];

const loopRules: NodeValidationRule[] = [
    requiredField("loopType", "Select a loop type"),
    // Conditional rules based on loop type
    conditionalRule(
        "arrayPath",
        (config) => config.loopType === "forEach",
        "Enter the array to iterate over"
    ),
    conditionalRule("condition", (config) => config.loopType === "while", "Enter a loop condition"),
    conditionalRule(
        "count",
        (config) => config.loopType === "count",
        "Enter the number of iterations"
    )
];

const waitRules: NodeValidationRule[] = [
    // Either duration or timestamp must be set
    requireOneOf(["duration", "durationValue", "timestamp"], "Set a duration or timestamp")
];

const transformRules: NodeValidationRule[] = [
    requiredField("operation", "Select a transform operation"),
    requiredField("inputData", "Enter input data or variable"),
    requiredField("expression", "Enter a transform expression"),
    requiredIdentifier("outputVariable", "Enter an output variable name")
];

const sharedMemoryRules: NodeValidationRule[] = [
    requiredField("operation", "Select an operation (Store or Search)"),
    conditionalRule("key", (config) => config.operation === "store", "Enter a key for the value"),
    conditionalRule("value", (config) => config.operation === "store", "Enter a value to store"),
    conditionalRule(
        "searchQuery",
        (config) => config.operation === "search",
        "Enter a search query"
    )
];

const codeRules: NodeValidationRule[] = [
    requiredField("language", "Select a programming language"),
    requiredField("code", "Enter code to execute")
];

// ============================================================================
// UTILS NODE RULES
// ============================================================================

const httpRules: NodeValidationRule[] = [
    requiredField("url", "Enter a URL"),
    conditionalRule(
        "authCredentials",
        (config) => config.authType !== "none" && !isEmpty(config.authType),
        "Enter authentication credentials"
    ),
    conditionalRule(
        "body",
        (config) => ["POST", "PUT", "PATCH"].includes(config.method as string),
        "Enter a request body"
    )
];

const databaseRules: NodeValidationRule[] = [
    requiredField("databaseType", "Select a database type"),
    requiredUUID("connectionId", "Select a database connection"),
    requiredField("query", "Enter a query")
];

// ============================================================================
// INTEGRATION NODE RULES
// ============================================================================

const integrationRules: NodeValidationRule[] = [
    requiredField("provider", "Select an integration provider"),
    requiredField("operation", "Select an operation"),
    requiredUUID("connectionId", "Select a connection")
];

// ============================================================================
// EXPORT RULES MAP
// ============================================================================

/**
 * Map of node types to their validation rules.
 */
export const nodeValidationRules: NodeValidationRulesMap = {
    // AI nodes
    llm: llmRules,
    vision: visionRules,
    embeddings: embeddingsRules,
    router: routerRules,
    "kb-query": kbQueryRules,
    "shared-memory": sharedMemoryRules,

    // Audio nodes (separate input/output)
    audioInput: audioInputRules,
    audioOutput: audioOutputRules,

    // Input/Output nodes
    input: inputRules,
    output: outputRules,
    files: filesRules,
    trigger: triggerRules,
    action: actionRules,

    // Logic nodes
    conditional: conditionalRules,
    switch: switchRules,
    loop: loopRules,
    wait: waitRules,
    transform: transformRules,
    code: codeRules,
    "wait-for-user": waitForUserRules,

    // Utils nodes
    http: httpRules,
    database: databaseRules,

    // Integration nodes
    integration: integrationRules,

    // Nodes without validation requirements
    comment: []
};

/**
 * Get validation rules for a specific node type.
 */
export function getValidationRules(nodeType: string): NodeValidationRule[] {
    return nodeValidationRules[nodeType] || [];
}
