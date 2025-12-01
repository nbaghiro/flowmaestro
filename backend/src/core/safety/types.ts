/**
 * Safety & Content Moderation Types
 * Inspired by Mastra's TripWire system for input/output validation
 */

export type SafetyCheckType =
    | "pii_detection"
    | "prompt_injection"
    | "content_moderation"
    | "custom_validator";

export type SafetyAction = "allow" | "block" | "redact" | "warn";

export interface SafetyCheckResult {
    passed: boolean;
    action: SafetyAction;
    type: SafetyCheckType;
    message?: string;
    redactedContent?: string;
    metadata?: {
        detected?: string[];
        confidence?: number;
        [key: string]: unknown;
    };
}

export interface SafetyValidator {
    name: string;
    type: SafetyCheckType;
    enabled: boolean;
    priority: number; // Lower number = higher priority
    validate: (content: string, context: SafetyContext) => Promise<SafetyCheckResult>;
}

export interface SafetyContext {
    userId: string;
    agentId: string;
    executionId: string;
    threadId?: string;
    direction: "input" | "output"; // Input from user, output from agent
    messageRole: "user" | "assistant" | "system" | "tool";
}

export interface SafetyConfig {
    enablePiiDetection: boolean;
    enablePromptInjectionDetection: boolean;
    enableContentModeration: boolean;
    customValidators?: SafetyValidator[];
    piiRedactionEnabled: boolean;
    piiRedactionPlaceholder?: string;
    promptInjectionAction: SafetyAction; // What to do when prompt injection detected
    contentModerationThreshold?: number; // 0-1 confidence threshold
}

export interface SafetyLogEntry {
    id: string;
    userId: string;
    agentId: string;
    executionId: string;
    threadId?: string;
    checkType: SafetyCheckType;
    action: SafetyAction;
    direction: "input" | "output";
    originalContent?: string; // Store only if needed for auditing
    redactedContent?: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
}

/**
 * PII Detection Types
 */
export type PIIType =
    | "email"
    | "phone"
    | "ssn"
    | "credit_card"
    | "ip_address"
    | "passport"
    | "driver_license"
    | "bank_account"
    | "api_key"
    | "password";

export interface PIIMatch {
    type: PIIType;
    value: string;
    start: number;
    end: number;
    confidence: number;
}

export interface PIIDetectionResult {
    hasPII: boolean;
    matches: PIIMatch[];
    redactedContent?: string;
}

/**
 * Prompt Injection Detection Types
 */
export type PromptInjectionPattern =
    | "system_override"
    | "role_manipulation"
    | "instruction_injection"
    | "delimiter_attack"
    | "encoding_bypass"
    | "jailbreak_attempt";

export interface PromptInjectionMatch {
    pattern: PromptInjectionPattern;
    matched: string;
    confidence: number;
    description: string;
}

export interface PromptInjectionResult {
    isInjection: boolean;
    matches: PromptInjectionMatch[];
    riskScore: number; // 0-1
}
