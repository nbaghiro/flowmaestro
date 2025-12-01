/**
 * Safety Pipeline
 * Orchestrates all safety checks and validators
 */

import { piiDetector } from "./pii-detector";
import { promptInjectionDetector } from "./prompt-injection-detector";
import type {
    SafetyCheckResult,
    SafetyValidator,
    SafetyContext,
    SafetyConfig,
    SafetyAction
} from "./types";

export class SafetyPipeline {
    private config: SafetyConfig;
    private customValidators: SafetyValidator[] = [];

    constructor(config?: Partial<SafetyConfig>) {
        this.config = {
            enablePiiDetection: true,
            enablePromptInjectionDetection: true,
            enableContentModeration: false,
            piiRedactionEnabled: true,
            piiRedactionPlaceholder: "[REDACTED]",
            promptInjectionAction: "block",
            contentModerationThreshold: 0.8,
            ...config
        };
    }

    /**
     * Run all safety checks on content
     */
    async validate(content: string, context: SafetyContext): Promise<SafetyCheckResult[]> {
        const results: SafetyCheckResult[] = [];

        // 1. PII Detection (highest priority for privacy)
        if (this.config.enablePiiDetection) {
            const piiResult = await this.checkPII(content, context);
            results.push(piiResult);
        }

        // 2. Prompt Injection Detection (only for user inputs)
        if (this.config.enablePromptInjectionDetection && context.direction === "input") {
            const injectionResult = await this.checkPromptInjection(content, context);
            results.push(injectionResult);
        }

        // 3. Custom Validators
        for (const validator of this.getSortedValidators()) {
            if (validator.enabled) {
                const result = await validator.validate(content, context);
                results.push(result);
            }
        }

        return results;
    }

    /**
     * Process content through safety pipeline
     * Returns modified content and whether to proceed
     */
    async process(
        content: string,
        context: SafetyContext
    ): Promise<{
        content: string;
        shouldProceed: boolean;
        results: SafetyCheckResult[];
    }> {
        const results = await this.validate(content, context);
        let processedContent = content;
        let shouldProceed = true;

        for (const result of results) {
            // Handle blocking
            if (!result.passed && result.action === "block") {
                shouldProceed = false;
                break;
            }

            // Handle redaction
            if (result.action === "redact" && result.redactedContent) {
                processedContent = result.redactedContent;
            }

            // Warnings don't block but are logged
            if (result.action === "warn") {
                console.warn(`[Safety Warning] ${result.type}: ${result.message}`, result.metadata);
            }
        }

        return {
            content: processedContent,
            shouldProceed,
            results
        };
    }

    /**
     * PII Detection Check
     */
    private async checkPII(content: string, _context: SafetyContext): Promise<SafetyCheckResult> {
        const detection = piiDetector.detect(content);

        if (!detection.hasPII) {
            return {
                passed: true,
                action: "allow",
                type: "pii_detection"
            };
        }

        const action: SafetyAction = this.config.piiRedactionEnabled ? "redact" : "warn";

        return {
            passed: false,
            action,
            type: "pii_detection",
            message: `Detected ${detection.matches.length} PII item(s)`,
            redactedContent: detection.redactedContent,
            metadata: {
                detected: detection.matches.map((m) => m.type),
                count: detection.matches.length,
                matches: detection.matches.map((m) => ({
                    type: m.type,
                    confidence: m.confidence
                }))
            }
        };
    }

    /**
     * Prompt Injection Detection Check
     */
    private async checkPromptInjection(
        content: string,
        _context: SafetyContext
    ): Promise<SafetyCheckResult> {
        const detection = promptInjectionDetector.detect(content);

        if (!detection.isInjection) {
            return {
                passed: true,
                action: "allow",
                type: "prompt_injection"
            };
        }

        const action = this.config.promptInjectionAction;

        return {
            passed: false,
            action,
            type: "prompt_injection",
            message: `Potential prompt injection detected (risk: ${(detection.riskScore * 100).toFixed(1)}%)`,
            metadata: {
                riskScore: detection.riskScore,
                detected: detection.matches.map((m) => m.pattern),
                matches: detection.matches.map((m) => ({
                    pattern: m.pattern,
                    confidence: m.confidence,
                    description: m.description
                }))
            }
        };
    }

    /**
     * Add custom validator
     */
    addValidator(validator: SafetyValidator): void {
        this.customValidators.push(validator);
    }

    /**
     * Remove validator by name
     */
    removeValidator(name: string): void {
        this.customValidators = this.customValidators.filter((v) => v.name !== name);
    }

    /**
     * Get validators sorted by priority
     */
    private getSortedValidators(): SafetyValidator[] {
        return [...this.customValidators].sort((a, b) => a.priority - b.priority);
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<SafetyConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     */
    getConfig(): SafetyConfig {
        return { ...this.config };
    }
}

// Export singleton instance with default config
export const safetyPipeline = new SafetyPipeline();
