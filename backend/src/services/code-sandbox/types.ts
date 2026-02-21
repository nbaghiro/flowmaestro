/**
 * Code Sandbox Types
 *
 * Type definitions for the Docker-based code execution sandbox.
 */

/**
 * Supported programming languages
 */
export type SupportedLanguage = "python" | "javascript" | "shell";

/**
 * Resource limits for container execution
 */
export interface ResourceLimits {
    /** Memory limit in bytes (default: 256MB) */
    memoryBytes: number;

    /** CPU limit in cores (default: 0.5) */
    cpuCores: number;

    /** Timeout in milliseconds (default: 30000) */
    timeoutMs: number;

    /** Maximum PIDs (default: 100) */
    maxPids: number;

    /** Maximum output size in bytes (default: 100KB) */
    maxOutputBytes: number;
}

/**
 * Default resource limits
 */
export const DEFAULT_RESOURCE_LIMITS: ResourceLimits = {
    memoryBytes: 256 * 1024 * 1024, // 256 MB
    cpuCores: 0.5,
    timeoutMs: 30000, // 30 seconds
    maxPids: 100,
    maxOutputBytes: 100 * 1024 // 100 KB
};

/**
 * Container configuration
 */
export interface ContainerConfig {
    /** Unique container ID */
    containerId: string;

    /** Language being executed */
    language: SupportedLanguage;

    /** Resource limits */
    limits: ResourceLimits;

    /** Whether network access is enabled */
    networkEnabled: boolean;

    /** Session ID for persistent containers */
    sessionId?: string;

    /** Creation timestamp */
    createdAt: Date;
}

/**
 * Code execution request
 */
export interface CodeExecutionRequest {
    /** Code to execute */
    code: string;

    /** Programming language */
    language: SupportedLanguage;

    /** Timeout in milliseconds */
    timeout: number;

    /** Input data to pass to the code */
    inputData?: Record<string, unknown>;

    /** Input files to read and pass to code */
    inputFiles?: Array<{
        path: string;
        variableName: string;
    }>;

    /** Output files to save from sandbox */
    outputFiles?: Array<{
        sandboxPath: string;
        workspacePath: string;
    }>;

    /** Additional packages to install (runtime) */
    packages?: string[];

    /** Session ID for persistent state */
    sessionId?: string;
}

/**
 * Code execution result
 */
export interface CodeExecutionResult {
    /** Return value from the code */
    result: unknown;

    /** Standard output */
    stdout: string;

    /** Standard error */
    stderr: string;

    /** Execution metadata */
    metadata: {
        /** Execution time in milliseconds */
        executionTimeMs: number;

        /** Language used */
        language: SupportedLanguage;

        /** Exit code (for shell commands) */
        exitCode?: number;

        /** Sandbox container ID (for debugging) */
        sandboxId?: string;

        /** Session ID (if session was used) */
        sessionId?: string;
    };

    /** Files saved to workspace */
    savedFiles?: Array<{
        workspacePath: string;
        size: number;
    }>;

    /** Warnings encountered during execution */
    warnings?: string[];
}

/**
 * Session state
 */
export interface SessionState {
    /** Session ID */
    sessionId: string;

    /** Container ID for this session */
    containerId: string;

    /** Language being used */
    language: SupportedLanguage;

    /** Creation timestamp */
    createdAt: Date;

    /** Last activity timestamp */
    lastActivityAt: Date;

    /** User ID who owns this session */
    userId: string;
}

/**
 * Dangerous pattern detected in code
 */
export interface DangerousPattern {
    /** Pattern that was detected */
    pattern: string;

    /** Language the pattern applies to */
    language: SupportedLanguage | "all";

    /** Description of the danger */
    description: string;

    /** Whether this blocks execution (true) or just warns (false) */
    blocking: boolean;

    /** Line number where pattern was found (if applicable) */
    lineNumber?: number;
}
