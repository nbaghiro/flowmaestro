/**
 * Code Sandbox Module
 *
 * Docker-based code execution sandbox for running Python, JavaScript, and Shell code safely.
 *
 * Key components:
 * - docker.ts: Container lifecycle management
 * - sessions.ts: TTL-based session store for stateful execution
 * - languages/: Language-specific code wrappers
 * - types.ts: Type definitions
 *
 * Usage:
 * This module is used by the code_execute builtin tool via the Temporal activity.
 * It creates isolated Docker containers for each execution, with optional session
 * persistence for multi-call stateful computations.
 */

// Types
export * from "./types";

// Docker management
export {
    createContainer,
    executeInContainer,
    copyToContainer,
    copyFromContainer,
    writeToContainer,
    readFromContainer,
    installPackages,
    destroyContainer,
    isContainerRunning,
    getContainerStats,
    cleanupStaleContainers
} from "./docker";

// Session management
export {
    createSession,
    getSession,
    touchSession,
    deleteSession,
    getSessionForUser,
    isSessionActive,
    getUserSessions,
    getSessionStats,
    cleanupAllSessions,
    stopCleanupTimer
} from "./sessions";

// Language wrappers
export {
    getLanguageConfig,
    languageConfigs,
    type LanguageConfig,
    wrapPythonCode,
    parsePythonOutput,
    getPythonCommand,
    wrapJavaScriptCode,
    parseJavaScriptOutput,
    getJavaScriptCommand,
    wrapShellCode,
    parseShellOutput,
    getShellCommand
} from "./languages";
