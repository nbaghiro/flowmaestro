/**
 * Prompt Injection Detection Service
 * Detects attempts to manipulate agent behavior through crafted inputs
 */

import type { PromptInjectionPattern, PromptInjectionMatch, PromptInjectionResult } from "./types";

interface InjectionPattern {
    pattern: PromptInjectionPattern;
    regex: RegExp;
    weight: number; // Weight for risk score calculation (0-1)
    description: string;
}

// Known prompt injection patterns
const INJECTION_PATTERNS: InjectionPattern[] = [
    {
        pattern: "system_override",
        regex: /(ignore|disregard|forget)\s+(previous|prior|above|all)\s+(instructions|prompts|rules|directions)/gi,
        weight: 0.9,
        description: "Attempt to override system instructions"
    },
    {
        pattern: "system_override",
        regex: /(new|updated|revised)\s+(instructions|system\s+prompt|guidelines)/gi,
        weight: 0.85,
        description: "Attempt to inject new system instructions"
    },
    {
        pattern: "role_manipulation",
        regex: /(you\s+are\s+now|from\s+now\s+on|pretend\s+to\s+be|act\s+as)\s+(a\s+)?(different|new|helpful|unrestricted)/gi,
        weight: 0.8,
        description: "Attempt to change agent role or behavior"
    },
    {
        pattern: "role_manipulation",
        regex: /\b(DAN|DevMode|Developer\s+Mode|Jailbreak|Unrestricted)\b/gi,
        weight: 0.95,
        description: "Known jailbreak attempt keywords"
    },
    {
        pattern: "instruction_injection",
        regex: /["""][\s\S]*?system[\s\S]*?:/gi,
        weight: 0.75,
        description: "Attempt to inject system role messages"
    },
    {
        pattern: "instruction_injection",
        regex: /```\s*system\s*\n/gi,
        weight: 0.8,
        description: "Code block system role injection"
    },
    {
        pattern: "delimiter_attack",
        regex: /(---+|===+|####+)\s*(end|stop|ignore|reset)\s*(instructions|prompt|system)/gi,
        weight: 0.7,
        description: "Delimiter-based instruction termination"
    },
    {
        pattern: "delimiter_attack",
        regex: /<\s*(end|stop)_?(system|instructions|prompt)\s*>/gi,
        weight: 0.75,
        description: "XML/HTML tag-based instruction control"
    },
    {
        pattern: "encoding_bypass",
        regex: /\\x[0-9a-f]{2}|\\u[0-9a-f]{4}|&#\d+;|&[a-z]+;/gi,
        weight: 0.6,
        description: "Encoded characters that might bypass filters"
    },
    {
        pattern: "jailbreak_attempt",
        regex: /(hypothetically|theoretically|in\s+a\s+fictional\s+world)\s+.*\s+(ignore|bypass|override)/gi,
        weight: 0.7,
        description: "Fictional scenario framing for rule bypass"
    },
    {
        pattern: "jailbreak_attempt",
        regex: /\b(sudo|admin|root|administrator)\s+(mode|access|privileges)/gi,
        weight: 0.8,
        description: "Privileged access manipulation attempt"
    }
];

// Suspicious patterns that warrant lower confidence warnings
const SUSPICIOUS_PATTERNS: InjectionPattern[] = [
    {
        pattern: "instruction_injection",
        regex: /\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>/gi,
        weight: 0.5,
        description: "Model-specific instruction tokens"
    },
    {
        pattern: "system_override",
        regex: /(override|bypass|disable)\s+(safety|guardrails|filters|restrictions)/gi,
        weight: 0.65,
        description: "Safety mechanism bypass attempt"
    }
];

export class PromptInjectionDetector {
    private patterns: InjectionPattern[];
    private suspiciousPatterns: InjectionPattern[];
    private threshold: number;

    constructor(threshold = 0.7) {
        this.patterns = INJECTION_PATTERNS;
        this.suspiciousPatterns = SUSPICIOUS_PATTERNS;
        this.threshold = threshold;
    }

    /**
     * Detect prompt injection attempts
     */
    detect(content: string): PromptInjectionResult {
        const matches: PromptInjectionMatch[] = [];

        // Check high-confidence patterns
        for (const pattern of this.patterns) {
            const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
            const match = content.match(regex);

            if (match) {
                matches.push({
                    pattern: pattern.pattern,
                    matched: match[0],
                    confidence: pattern.weight,
                    description: pattern.description
                });
            }
        }

        // Check suspicious patterns
        for (const pattern of this.suspiciousPatterns) {
            const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
            const match = content.match(regex);

            if (match) {
                matches.push({
                    pattern: pattern.pattern,
                    matched: match[0],
                    confidence: pattern.weight,
                    description: pattern.description
                });
            }
        }

        // Calculate overall risk score
        const riskScore = this.calculateRiskScore(matches);

        return {
            isInjection: riskScore >= this.threshold,
            matches,
            riskScore
        };
    }

    /**
     * Calculate risk score from matches
     */
    private calculateRiskScore(matches: PromptInjectionMatch[]): number {
        if (matches.length === 0) return 0;

        // Use weighted average with diminishing returns for multiple matches
        const sortedMatches = matches.sort((a, b) => b.confidence - a.confidence);

        let score = 0;
        let weight = 1.0;

        for (const match of sortedMatches) {
            score += match.confidence * weight;
            weight *= 0.7; // Diminishing returns for additional matches
        }

        // Normalize to 0-1 range
        return Math.min(score, 1.0);
    }

    /**
     * Set detection threshold (0-1)
     */
    setThreshold(threshold: number): void {
        this.threshold = Math.max(0, Math.min(1, threshold));
    }

    /**
     * Get current threshold
     */
    getThreshold(): number {
        return this.threshold;
    }

    /**
     * Add custom pattern
     */
    addCustomPattern(pattern: InjectionPattern): void {
        this.patterns.push(pattern);
    }

    /**
     * Remove custom pattern by description
     */
    removeCustomPattern(description: string): void {
        this.patterns = this.patterns.filter((p) => p.description !== description);
    }
}

// Export singleton instance
export const promptInjectionDetector = new PromptInjectionDetector();
