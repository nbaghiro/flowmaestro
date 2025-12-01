/**
 * PII Detection Service
 * Detects and redacts personally identifiable information
 */

import type { PIIType, PIIMatch, PIIDetectionResult } from "./types";

interface PIIPattern {
    type: PIIType;
    regex: RegExp;
    placeholder: string;
    validator?: (match: string) => boolean;
}

// PII detection patterns
const PII_PATTERNS: PIIPattern[] = [
    {
        type: "email",
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        placeholder: "[EMAIL_REDACTED]"
    },
    {
        type: "phone",
        regex: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
        placeholder: "[PHONE_REDACTED]"
    },
    {
        type: "ssn",
        regex: /\b\d{3}-\d{2}-\d{4}\b/g,
        placeholder: "[SSN_REDACTED]",
        validator: (match: string) => {
            // Basic SSN validation (not starting with 000, 666, or 900-999)
            const parts = match.split("-");
            const area = parseInt(parts[0], 10);
            return area !== 0 && area !== 666 && area < 900;
        }
    },
    {
        type: "credit_card",
        regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
        placeholder: "[CARD_REDACTED]",
        validator: (match: string) => {
            // Luhn algorithm validation
            const digits = match.replace(/\D/g, "");
            if (digits.length < 13 || digits.length > 19) return false;

            let sum = 0;
            let isEven = false;

            for (let i = digits.length - 1; i >= 0; i--) {
                let digit = parseInt(digits[i], 10);

                if (isEven) {
                    digit *= 2;
                    if (digit > 9) digit -= 9;
                }

                sum += digit;
                isEven = !isEven;
            }

            return sum % 10 === 0;
        }
    },
    {
        type: "ip_address",
        regex: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
        placeholder: "[IP_REDACTED]",
        validator: (match: string) => {
            const parts = match.split(".");
            return parts.every((part) => {
                const num = parseInt(part, 10);
                return num >= 0 && num <= 255;
            });
        }
    },
    {
        type: "api_key",
        regex: /\b(?:api[_-]?key|apikey|access[_-]?token|secret[_-]?key)[\s:=]+['"]?([a-zA-Z0-9_-]{20,})['"]?\b/gi,
        placeholder: "[API_KEY_REDACTED]"
    },
    {
        type: "passport",
        regex: /\b[A-Z]{1,2}[0-9]{6,9}\b/g,
        placeholder: "[PASSPORT_REDACTED]"
    },
    {
        type: "bank_account",
        regex: /\b\d{8,17}\b/g,
        placeholder: "[ACCOUNT_REDACTED]",
        validator: (match: string) => {
            // Only flag if it looks like a bank account (8-17 digits)
            return match.length >= 8 && match.length <= 17;
        }
    }
];

export class PIIDetector {
    private patterns: PIIPattern[];
    private enabledTypes: Set<PIIType>;

    constructor(enabledTypes?: PIIType[]) {
        this.patterns = PII_PATTERNS;
        this.enabledTypes = enabledTypes
            ? new Set(enabledTypes)
            : new Set(PII_PATTERNS.map((p) => p.type));
    }

    /**
     * Detect PII in content
     */
    detect(content: string): PIIDetectionResult {
        const matches: PIIMatch[] = [];

        for (const pattern of this.patterns) {
            if (!this.enabledTypes.has(pattern.type)) continue;

            const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
            let match: RegExpExecArray | null;

            while ((match = regex.exec(content)) !== null) {
                const value = match[0];

                // Validate if validator provided
                if (pattern.validator && !pattern.validator(value)) {
                    continue;
                }

                matches.push({
                    type: pattern.type,
                    value,
                    start: match.index,
                    end: match.index + value.length,
                    confidence: this.calculateConfidence(pattern.type, value)
                });
            }
        }

        return {
            hasPII: matches.length > 0,
            matches,
            redactedContent: matches.length > 0 ? this.redact(content, matches) : undefined
        };
    }

    /**
     * Redact PII from content
     */
    redact(content: string, matches: PIIMatch[]): string {
        // Sort matches by start position (descending) to replace from end to start
        const sortedMatches = [...matches].sort((a, b) => b.start - a.start);

        let redacted = content;

        for (const match of sortedMatches) {
            const pattern = this.patterns.find((p) => p.type === match.type);
            const placeholder = pattern?.placeholder || "[REDACTED]";

            redacted =
                redacted.substring(0, match.start) + placeholder + redacted.substring(match.end);
        }

        return redacted;
    }

    /**
     * Calculate confidence score for PII match
     */
    private calculateConfidence(type: PIIType, value: string): number {
        // Simple confidence scoring based on pattern type
        switch (type) {
            case "email":
                // Higher confidence for common TLDs
                return value.match(/\.(com|org|net|edu|gov)$/i) ? 0.95 : 0.85;
            case "phone":
                // Higher confidence for formatted numbers
                return value.includes("-") || value.includes(".") ? 0.9 : 0.75;
            case "ssn":
                return 0.95;
            case "credit_card":
                return 0.9; // Already validated with Luhn
            case "ip_address":
                return 0.8;
            case "api_key":
                return 0.85;
            case "passport":
                return 0.7; // Lower confidence due to potential false positives
            case "bank_account":
                return 0.7; // Lower confidence due to potential false positives
            default:
                return 0.8;
        }
    }

    /**
     * Enable/disable specific PII types
     */
    setEnabledTypes(types: PIIType[]): void {
        this.enabledTypes = new Set(types);
    }

    /**
     * Check if specific PII type is enabled
     */
    isTypeEnabled(type: PIIType): boolean {
        return this.enabledTypes.has(type);
    }
}

// Export singleton instance
export const piiDetector = new PIIDetector();
