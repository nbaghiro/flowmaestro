/**
 * Language Wrappers Index
 *
 * Exports all language-specific code wrappers.
 */

export { wrapPythonCode, parsePythonOutput, getPythonCommand } from "./python";

export { wrapJavaScriptCode, parseJavaScriptOutput, getJavaScriptCommand } from "./javascript";

export { wrapShellCode, parseShellOutput, getShellCommand } from "./shell";

import { wrapJavaScriptCode, parseJavaScriptOutput, getJavaScriptCommand } from "./javascript";
import { wrapPythonCode, parsePythonOutput, getPythonCommand } from "./python";
import { wrapShellCode, parseShellOutput, getShellCommand } from "./shell";
import type { SupportedLanguage, CodeExecutionResult } from "../types";

/**
 * Language configuration
 */
export interface LanguageConfig {
    /** File extension for the code file */
    extension: string;

    /** Wrap code with input injection and output capture */
    wrapCode: (code: string, inputData?: Record<string, unknown>) => string;

    /** Parse execution output */
    parseOutput: (
        stdout: string,
        stderr: string,
        exitCode: number,
        executionTimeMs: number
    ) => Partial<CodeExecutionResult>;

    /** Get execution command */
    getCommand: () => string[];
}

/**
 * Language configurations
 */
export const languageConfigs: Record<SupportedLanguage, LanguageConfig> = {
    python: {
        extension: ".py",
        wrapCode: wrapPythonCode,
        parseOutput: parsePythonOutput,
        getCommand: getPythonCommand
    },
    javascript: {
        extension: ".js",
        wrapCode: wrapJavaScriptCode,
        parseOutput: parseJavaScriptOutput,
        getCommand: getJavaScriptCommand
    },
    shell: {
        extension: ".sh",
        wrapCode: wrapShellCode,
        parseOutput: parseShellOutput,
        getCommand: getShellCommand
    }
};

/**
 * Get language configuration
 */
export function getLanguageConfig(language: SupportedLanguage): LanguageConfig {
    const config = languageConfigs[language];
    if (!config) {
        throw new Error(`Unsupported language: ${language}`);
    }
    return config;
}
