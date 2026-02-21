/**
 * Code Execute Tool Types
 *
 * Type definitions and Zod schemas for the code execution tool.
 */

import { z } from "zod";

/**
 * Input schema for code_execute tool
 */
export const codeExecuteInputSchema = z.object({
    code: z
        .string()
        .min(1)
        .max(100000)
        .describe(
            "The code to execute. For Python, assign output to 'result' variable. For JavaScript, assign to 'result'. For shell, stdout is the result."
        ),

    language: z
        .enum(["python", "javascript", "shell"])
        .describe("The programming language of the code"),

    timeout: z
        .number()
        .int()
        .min(1000)
        .max(300000)
        .default(30000)
        .describe("Execution timeout in milliseconds (1-300 seconds, default 30s)"),

    inputData: z
        .record(z.unknown())
        .optional()
        .describe("Input data to pass to the code as variables"),

    inputFiles: z
        .array(
            z.object({
                path: z.string().describe("Path to the file in the workspace"),
                variableName: z.string().describe("Variable name to assign the file content to")
            })
        )
        .optional()
        .describe("Files to read from workspace and pass to code"),

    outputFiles: z
        .array(
            z.object({
                sandboxPath: z.string().describe("Path to the file in the sandbox"),
                workspacePath: z.string().describe("Path to save the file in the workspace")
            })
        )
        .optional()
        .describe("Files to save from sandbox to workspace after execution"),

    packages: z
        .array(z.string())
        .optional()
        .describe(
            "Additional packages to install before execution (pip for Python, npm for JavaScript)"
        ),

    sessionId: z
        .string()
        .optional()
        .describe(
            "Session ID for stateful execution across multiple calls. Omit for one-shot execution."
        )
});

export type CodeExecuteInput = z.infer<typeof codeExecuteInputSchema>;

/**
 * Code execution output format
 */
export interface CodeExecuteOutput {
    /** Return value from the code */
    result: unknown;

    /** Standard output (console/print statements) */
    stdout: string;

    /** Standard error (warnings, errors) */
    stderr: string;

    /** Execution metadata */
    metadata: {
        /** Execution time in milliseconds */
        executionTimeMs: number;

        /** Language used */
        language: string;

        /** Exit code (0 = success) */
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
 * JSON Schema for LLM (matches Zod schema above)
 */
export const codeExecuteJsonSchema = {
    type: "object" as const,
    properties: {
        code: {
            type: "string",
            description:
                "The code to execute. For Python, assign output to 'result' variable. For JavaScript, assign to 'result'. For shell, stdout is the result.",
            minLength: 1,
            maxLength: 100000
        },
        language: {
            type: "string",
            enum: ["python", "javascript", "shell"],
            description: "The programming language of the code"
        },
        timeout: {
            type: "number",
            description: "Execution timeout in milliseconds (1-300 seconds, default 30s)",
            minimum: 1000,
            maximum: 300000,
            default: 30000
        },
        inputData: {
            type: "object",
            description: "Input data to pass to the code as variables",
            additionalProperties: true
        },
        inputFiles: {
            type: "array",
            description: "Files to read from workspace and pass to code",
            items: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "Path to the file in the workspace"
                    },
                    variableName: {
                        type: "string",
                        description: "Variable name to assign the file content to"
                    }
                },
                required: ["path", "variableName"]
            }
        },
        outputFiles: {
            type: "array",
            description: "Files to save from sandbox to workspace after execution",
            items: {
                type: "object",
                properties: {
                    sandboxPath: {
                        type: "string",
                        description: "Path to the file in the sandbox"
                    },
                    workspacePath: {
                        type: "string",
                        description: "Path to save the file in the workspace"
                    }
                },
                required: ["sandboxPath", "workspacePath"]
            }
        },
        packages: {
            type: "array",
            description:
                "Additional packages to install before execution (pip for Python, npm for JavaScript)",
            items: {
                type: "string"
            }
        },
        sessionId: {
            type: "string",
            description:
                "Session ID for stateful execution across multiple calls. Omit for one-shot execution."
        }
    },
    required: ["code", "language"]
};
