/**
 * Code Execution Security
 *
 * Analyzes code for dangerous patterns that should be blocked or warned about.
 * This is a first line of defense - the Docker sandbox provides the actual isolation.
 */

import { createServiceLogger } from "../../../../core/logging";
import type { DangerousPattern, SupportedLanguage } from "../../../code-sandbox/types";

const logger = createServiceLogger("CodeSecurity");

/**
 * Dangerous patterns that block execution
 */
const BLOCKED_PATTERNS: Array<{
    pattern: RegExp;
    language: SupportedLanguage | "all";
    description: string;
}> = [
    // Python dangerous patterns
    {
        pattern: /os\.system\s*\(/,
        language: "python",
        description: "os.system() can execute arbitrary shell commands"
    },
    {
        pattern: /subprocess\.(call|run|Popen|check_output|check_call)\s*\(/,
        language: "python",
        description: "subprocess module can execute arbitrary commands"
    },
    {
        pattern: /exec\s*\(\s*(?:input|raw_input)\s*\(/,
        language: "python",
        description: "exec(input()) allows arbitrary code execution from user input"
    },
    {
        pattern: /eval\s*\(\s*(?:input|raw_input)\s*\(/,
        language: "python",
        description: "eval(input()) allows arbitrary code execution from user input"
    },
    {
        pattern: /__import__\s*\(\s*['"](?:os|subprocess|shutil|sys|ctypes)['"]\s*\)/,
        language: "python",
        description: "Dynamic import of dangerous modules"
    },
    {
        pattern: /shutil\.rmtree\s*\(\s*['"]\/['"]\s*\)/,
        language: "python",
        description: "Attempting to delete root filesystem"
    },

    // JavaScript dangerous patterns
    {
        pattern: /process\.exit\s*\(/,
        language: "javascript",
        description: "process.exit() terminates the process prematurely"
    },
    {
        pattern: /require\s*\(\s*['"]child_process['"]\s*\)/,
        language: "javascript",
        description: "child_process module can execute arbitrary commands"
    },
    {
        pattern: /require\s*\(\s*['"]fs['"]\s*\)/,
        language: "javascript",
        description:
            "fs module can access the filesystem directly (use inputFiles/outputFiles instead)"
    },
    {
        pattern: /require\s*\(\s*['"]net['"]\s*\)/,
        language: "javascript",
        description: "net module can make raw socket connections"
    },
    {
        pattern: /eval\s*\(\s*(?:process\.env|process\.argv)/,
        language: "javascript",
        description: "eval() with process data allows code injection"
    },

    // Shell dangerous patterns
    {
        pattern: /rm\s+-rf\s+\/($|\s)/,
        language: "shell",
        description: "Attempting to recursively delete root filesystem"
    },
    {
        pattern: /rm\s+-rf\s+\/\*/,
        language: "shell",
        description: "Attempting to delete everything under root"
    },
    {
        pattern: /mkfs\./,
        language: "shell",
        description: "mkfs commands can format filesystems"
    },
    {
        pattern: /dd\s+.*of=\/dev\/[sh]d[a-z]/,
        language: "shell",
        description: "dd to raw disk device can destroy data"
    },
    {
        pattern: /:\(\)\s*{\s*:\s*\|\s*:\s*&\s*}\s*;/,
        language: "shell",
        description: "Fork bomb detected"
    },
    {
        pattern: /\/dev\/(?:sd[a-z]|nvme|hd[a-z])/,
        language: "shell",
        description: "Direct access to disk devices"
    },

    // All languages - network exfiltration attempts
    {
        pattern: /curl\s+.*-d.*(?:\/etc\/passwd|\/etc\/shadow)/,
        language: "all",
        description: "Attempting to exfiltrate system files"
    },
    {
        pattern: /wget\s+.*--post-file=/,
        language: "all",
        description: "Attempting to upload files via wget"
    }
];

/**
 * Warning patterns that are logged but allowed
 */
const WARNING_PATTERNS: Array<{
    pattern: RegExp;
    language: SupportedLanguage | "all";
    description: string;
}> = [
    // Python network patterns
    {
        pattern: /requests\.(get|post|put|delete|patch)\s*\(/,
        language: "python",
        description: "Making HTTP requests (network access may be disabled)"
    },
    {
        pattern: /urllib\.(request|urlopen)/,
        language: "python",
        description: "Making HTTP requests (network access may be disabled)"
    },
    {
        pattern: /httpx\.(get|post|put|delete|patch|AsyncClient)\s*\(/,
        language: "python",
        description: "Making HTTP requests (network access may be disabled)"
    },
    {
        pattern: /aiohttp\.(ClientSession|request)/,
        language: "python",
        description: "Making async HTTP requests (network access may be disabled)"
    },

    // Python file write patterns
    {
        pattern: /open\s*\([^)]+,\s*['"]w/,
        language: "python",
        description: "Writing to file (use outputFiles to save results)"
    },

    // JavaScript patterns
    {
        pattern: /fetch\s*\(/,
        language: "javascript",
        description: "Making HTTP requests (network access may be disabled)"
    },
    {
        pattern: /XMLHttpRequest/,
        language: "javascript",
        description: "Making HTTP requests (network access may be disabled)"
    },

    // Shell patterns
    {
        pattern: /curl\s+/,
        language: "shell",
        description: "Making HTTP requests (network access may be disabled)"
    },
    {
        pattern: /wget\s+/,
        language: "shell",
        description: "Making HTTP requests (network access may be disabled)"
    },
    {
        pattern: /nc\s+/,
        language: "shell",
        description: "Netcat command (network access may be disabled)"
    }
];

/**
 * Result of security analysis
 */
export interface SecurityAnalysisResult {
    /** Whether the code should be blocked */
    blocked: boolean;

    /** Patterns that caused blocking */
    blockedPatterns: DangerousPattern[];

    /** Patterns that triggered warnings */
    warningPatterns: DangerousPattern[];

    /** Human-readable summary */
    summary: string;
}

/**
 * Analyze code for dangerous patterns
 */
export function analyzeCodeSecurity(
    code: string,
    language: SupportedLanguage
): SecurityAnalysisResult {
    const blockedPatterns: DangerousPattern[] = [];
    const warningPatterns: DangerousPattern[] = [];

    // Check blocked patterns
    for (const { pattern, language: patternLang, description } of BLOCKED_PATTERNS) {
        if (patternLang !== "all" && patternLang !== language) {
            continue;
        }

        const match = code.match(pattern);
        if (match) {
            const lineNumber = getLineNumber(code, match.index || 0);
            blockedPatterns.push({
                pattern: pattern.source,
                language: patternLang,
                description,
                blocking: true,
                lineNumber
            });
        }
    }

    // Check warning patterns
    for (const { pattern, language: patternLang, description } of WARNING_PATTERNS) {
        if (patternLang !== "all" && patternLang !== language) {
            continue;
        }

        const match = code.match(pattern);
        if (match) {
            const lineNumber = getLineNumber(code, match.index || 0);
            warningPatterns.push({
                pattern: pattern.source,
                language: patternLang,
                description,
                blocking: false,
                lineNumber
            });
        }
    }

    // Generate summary
    let summary = "";
    if (blockedPatterns.length > 0) {
        summary = `Code blocked: ${blockedPatterns.map((p) => p.description).join("; ")}`;
        logger.warn({ language, patterns: blockedPatterns }, "Dangerous code blocked");
    } else if (warningPatterns.length > 0) {
        summary = `Warnings: ${warningPatterns.map((p) => p.description).join("; ")}`;
        logger.info({ language, patterns: warningPatterns }, "Code execution warnings");
    } else {
        summary = "No security concerns detected";
    }

    return {
        blocked: blockedPatterns.length > 0,
        blockedPatterns,
        warningPatterns,
        summary
    };
}

/**
 * Get line number for a character index
 */
function getLineNumber(code: string, index: number): number {
    const lines = code.substring(0, index).split("\n");
    return lines.length;
}

/**
 * Sanitize code input (basic XSS/injection prevention)
 */
export function sanitizeCode(code: string): string {
    // Remove null bytes which can cause issues
    return code.replace(/\0/g, "");
}

/**
 * Validate package names for security
 */
export function validatePackageNames(packages: string[]): {
    valid: string[];
    invalid: string[];
} {
    const valid: string[] = [];
    const invalid: string[] = [];

    // Allow: alphanumeric, dash, underscore, dot, and version specifiers
    const validPattern = /^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*([<>=!]+[a-zA-Z0-9._-]+)?$/;

    for (const pkg of packages) {
        if (validPattern.test(pkg)) {
            valid.push(pkg);
        } else {
            invalid.push(pkg);
        }
    }

    return { valid, invalid };
}
