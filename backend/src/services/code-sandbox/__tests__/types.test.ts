/**
 * Code Sandbox Types Unit Tests
 *
 * Tests for type definitions and default values.
 */

import { DEFAULT_RESOURCE_LIMITS } from "../types";
import type {
    SupportedLanguage,
    ResourceLimits,
    ContainerConfig,
    CodeExecutionRequest,
    CodeExecutionResult,
    SessionState,
    DangerousPattern
} from "../types";

describe("Code Sandbox Types", () => {
    describe("DEFAULT_RESOURCE_LIMITS", () => {
        it("should have correct default memory limit", () => {
            expect(DEFAULT_RESOURCE_LIMITS.memoryBytes).toBe(256 * 1024 * 1024); // 256 MB
        });

        it("should have correct default CPU limit", () => {
            expect(DEFAULT_RESOURCE_LIMITS.cpuCores).toBe(0.5);
        });

        it("should have correct default timeout", () => {
            expect(DEFAULT_RESOURCE_LIMITS.timeoutMs).toBe(30000); // 30 seconds
        });

        it("should have correct default max PIDs", () => {
            expect(DEFAULT_RESOURCE_LIMITS.maxPids).toBe(100);
        });

        it("should have correct default max output size", () => {
            expect(DEFAULT_RESOURCE_LIMITS.maxOutputBytes).toBe(100 * 1024); // 100 KB
        });
    });

    describe("Type Compatibility", () => {
        it("should accept valid SupportedLanguage values", () => {
            const languages: SupportedLanguage[] = ["python", "javascript", "shell"];
            expect(languages).toHaveLength(3);
        });

        it("should create valid ResourceLimits object", () => {
            const limits: ResourceLimits = {
                memoryBytes: 512 * 1024 * 1024,
                cpuCores: 1.0,
                timeoutMs: 60000,
                maxPids: 200,
                maxOutputBytes: 200 * 1024
            };

            expect(limits.memoryBytes).toBe(512 * 1024 * 1024);
            expect(limits.cpuCores).toBe(1.0);
        });

        it("should create valid ContainerConfig object", () => {
            const config: ContainerConfig = {
                containerId: "container-123",
                language: "python",
                limits: DEFAULT_RESOURCE_LIMITS,
                networkEnabled: false,
                createdAt: new Date()
            };

            expect(config.containerId).toBe("container-123");
            expect(config.networkEnabled).toBe(false);
        });

        it("should create ContainerConfig with optional sessionId", () => {
            const config: ContainerConfig = {
                containerId: "container-456",
                language: "javascript",
                limits: DEFAULT_RESOURCE_LIMITS,
                networkEnabled: true,
                sessionId: "session-abc",
                createdAt: new Date()
            };

            expect(config.sessionId).toBe("session-abc");
        });

        it("should create valid CodeExecutionRequest object", () => {
            const request: CodeExecutionRequest = {
                code: "print('hello')",
                language: "python",
                timeout: 30000
            };

            expect(request.code).toBe("print('hello')");
            expect(request.language).toBe("python");
        });

        it("should create CodeExecutionRequest with all optional fields", () => {
            const request: CodeExecutionRequest = {
                code: "result = data * 2",
                language: "python",
                timeout: 60000,
                inputData: { data: 21 },
                inputFiles: [{ path: "/workspace/input.csv", variableName: "csv_data" }],
                outputFiles: [
                    { sandboxPath: "/tmp/output.csv", workspacePath: "/workspace/output.csv" }
                ],
                packages: ["pandas", "numpy"],
                sessionId: "session-123"
            };

            expect(request.inputData).toEqual({ data: 21 });
            expect(request.inputFiles).toHaveLength(1);
            expect(request.outputFiles).toHaveLength(1);
            expect(request.packages).toEqual(["pandas", "numpy"]);
            expect(request.sessionId).toBe("session-123");
        });

        it("should create valid CodeExecutionResult object", () => {
            const result: CodeExecutionResult = {
                result: { value: 42 },
                stdout: "Processing...\n",
                stderr: "",
                metadata: {
                    executionTimeMs: 150,
                    language: "python"
                }
            };

            expect(result.result).toEqual({ value: 42 });
            expect(result.metadata.executionTimeMs).toBe(150);
        });

        it("should create CodeExecutionResult with all metadata fields", () => {
            const result: CodeExecutionResult = {
                result: "success",
                stdout: "output",
                stderr: "",
                metadata: {
                    executionTimeMs: 200,
                    language: "shell",
                    exitCode: 0,
                    sandboxId: "sandbox-abc",
                    sessionId: "session-xyz"
                },
                savedFiles: [{ workspacePath: "/workspace/result.txt", size: 1024 }],
                warnings: ["Network access disabled"]
            };

            expect(result.metadata.exitCode).toBe(0);
            expect(result.metadata.sandboxId).toBe("sandbox-abc");
            expect(result.savedFiles).toHaveLength(1);
            expect(result.warnings).toContain("Network access disabled");
        });

        it("should create valid SessionState object", () => {
            const now = new Date();
            const state: SessionState = {
                sessionId: "session-123",
                containerId: "container-abc",
                language: "python",
                createdAt: now,
                lastActivityAt: now,
                userId: "user-456"
            };

            expect(state.sessionId).toBe("session-123");
            expect(state.userId).toBe("user-456");
            expect(state.createdAt).toBe(now);
        });

        it("should create valid DangerousPattern object", () => {
            const pattern: DangerousPattern = {
                pattern: "os.system\\(",
                language: "python",
                description: "Dangerous os.system call",
                blocking: true,
                lineNumber: 5
            };

            expect(pattern.pattern).toBe("os.system\\(");
            expect(pattern.blocking).toBe(true);
            expect(pattern.lineNumber).toBe(5);
        });

        it("should create DangerousPattern with 'all' language", () => {
            const pattern: DangerousPattern = {
                pattern: "rm -rf /",
                language: "all",
                description: "Dangerous delete command",
                blocking: true
            };

            expect(pattern.language).toBe("all");
        });

        it("should create non-blocking DangerousPattern (warning)", () => {
            const pattern: DangerousPattern = {
                pattern: "requests.get",
                language: "python",
                description: "Network request",
                blocking: false
            };

            expect(pattern.blocking).toBe(false);
        });
    });
});
