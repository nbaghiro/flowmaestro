/**
 * Language Wrappers Unit Tests
 *
 * Tests for Python, JavaScript, and Shell code wrappers and output parsers.
 */

import {
    wrapJavaScriptCode,
    parseJavaScriptOutput,
    getJavaScriptCommand
} from "../languages/javascript";
import { wrapPythonCode, parsePythonOutput, getPythonCommand } from "../languages/python";
import { wrapShellCode, parseShellOutput, getShellCommand } from "../languages/shell";

describe("Language Wrappers", () => {
    describe("Python Wrapper", () => {
        describe("wrapPythonCode", () => {
            it("should wrap code with input injection", () => {
                const wrapped = wrapPythonCode("result = x + y", { x: 1, y: 2 });

                expect(wrapped).toContain("import json");
                expect(wrapped).toContain("_fm_input = json.loads");
                expect(wrapped).toContain("globals().update(_fm_input)");
                expect(wrapped).toContain("result = x + y");
            });

            it("should include result capture markers", () => {
                const wrapped = wrapPythonCode("result = 42");

                expect(wrapped).toContain("__FM_RESULT_START__");
                expect(wrapped).toContain("__FM_RESULT_END__");
            });

            it("should include error handling", () => {
                const wrapped = wrapPythonCode("x = 1");

                expect(wrapped).toContain("except Exception as e:");
                expect(wrapped).toContain("__FM_ERROR_START__");
                expect(wrapped).toContain("__FM_ERROR_END__");
                expect(wrapped).toContain("sys.exit(1)");
            });

            it("should handle empty input data", () => {
                const wrapped = wrapPythonCode("x = 1");

                expect(wrapped).toContain("_fm_input = json.loads('{}')");
            });

            it("should escape single quotes in input data", () => {
                const wrapped = wrapPythonCode("x = 1", { text: "it's a test" });

                expect(wrapped).toContain("it\\'s a test");
            });

            it("should escape triple quotes in code", () => {
                const code = "text = '''multi\nline'''";
                const wrapped = wrapPythonCode(code);

                expect(wrapped).toContain("\\'''");
            });

            it("should include traceback in error handling", () => {
                const wrapped = wrapPythonCode("x = 1");

                expect(wrapped).toContain("traceback.format_exc()");
            });
        });

        describe("parsePythonOutput", () => {
            it("should extract result from stdout", () => {
                const stdout =
                    'Some output\n__FM_RESULT_START__\n{"value": 42}\n__FM_RESULT_END__\n';
                const result = parsePythonOutput(stdout, "", 0, 100);

                expect(result.result).toEqual({ value: 42 });
                expect(result.stdout).toBe("Some output");
            });

            it("should handle result without other output", () => {
                const stdout = '__FM_RESULT_START__\n"hello"\n__FM_RESULT_END__\n';
                const result = parsePythonOutput(stdout, "", 0, 100);

                expect(result.result).toBe("hello");
                expect(result.stdout).toBe("");
            });

            it("should handle non-JSON result as string", () => {
                const stdout = "__FM_RESULT_START__\nnot valid json\n__FM_RESULT_END__\n";
                const result = parsePythonOutput(stdout, "", 0, 100);

                expect(result.result).toBe("not valid json");
                expect(result.warnings).toContain(
                    "Failed to parse result as JSON, returning as string"
                );
            });

            it("should parse error details from stderr", () => {
                const stderr =
                    '__FM_ERROR_START__\n{"error": "division by zero", "type": "ZeroDivisionError", "traceback": "..."}\n__FM_ERROR_END__\n';
                const result = parsePythonOutput("", stderr, 1, 100);

                expect(result.stderr).toContain("ZeroDivisionError: division by zero");
            });

            it("should include metadata", () => {
                const result = parsePythonOutput("output", "", 0, 150);

                expect(result.metadata).toEqual({
                    executionTimeMs: 150,
                    language: "python",
                    exitCode: 0
                });
            });

            it("should handle null result", () => {
                const stdout = "__FM_RESULT_START__\nnull\n__FM_RESULT_END__\n";
                const result = parsePythonOutput(stdout, "", 0, 100);

                expect(result.result).toBeNull();
            });

            it("should handle array result", () => {
                const stdout = "__FM_RESULT_START__\n[1, 2, 3]\n__FM_RESULT_END__\n";
                const result = parsePythonOutput(stdout, "", 0, 100);

                expect(result.result).toEqual([1, 2, 3]);
            });

            it("should preserve stdout before result marker", () => {
                const stdout = "Line 1\nLine 2\n__FM_RESULT_START__\n42\n__FM_RESULT_END__\nLine 3";
                const result = parsePythonOutput(stdout, "", 0, 100);

                expect(result.stdout).toContain("Line 1");
                expect(result.stdout).toContain("Line 2");
            });
        });

        describe("getPythonCommand", () => {
            it("should return correct command array", () => {
                const cmd = getPythonCommand();

                expect(cmd).toEqual(["python3", "-u", "/tmp/code.py"]);
            });
        });
    });

    describe("JavaScript Wrapper", () => {
        describe("wrapJavaScriptCode", () => {
            it("should wrap code with input injection", () => {
                const wrapped = wrapJavaScriptCode("const sum = x + y;", { x: 1, y: 2 });

                expect(wrapped).toContain("__fmInput");
                expect(wrapped).toContain("Object.assign(globalThis, __fmInput)");
                expect(wrapped).toContain("const sum = x + y;");
            });

            it("should wrap code in async IIFE", () => {
                const wrapped = wrapJavaScriptCode("await fetch()");

                expect(wrapped).toContain("(async () => {");
                expect(wrapped).toContain("})();");
            });

            it("should include result capture", () => {
                const wrapped = wrapJavaScriptCode("const result = 42;");

                expect(wrapped).toContain("__FM_RESULT_START__");
                expect(wrapped).toContain("__FM_RESULT_END__");
                expect(wrapped).toContain("typeof result !== 'undefined'");
            });

            it("should include error handling", () => {
                const wrapped = wrapJavaScriptCode("x = 1");

                expect(wrapped).toContain("catch (error)");
                expect(wrapped).toContain("__FM_ERROR_START__");
                expect(wrapped).toContain("__FM_ERROR_END__");
                expect(wrapped).toContain("process.exit(1)");
            });

            it("should handle BigInt serialization", () => {
                const wrapped = wrapJavaScriptCode("result = 1n");

                expect(wrapped).toContain("typeof value === 'bigint'");
                expect(wrapped).toContain("value.toString()");
            });

            it("should handle Date serialization", () => {
                const wrapped = wrapJavaScriptCode("result = new Date()");

                expect(wrapped).toContain("instanceof Date");
                expect(wrapped).toContain("toISOString()");
            });

            it("should handle Map serialization", () => {
                const wrapped = wrapJavaScriptCode("result = new Map()");

                expect(wrapped).toContain("instanceof Map");
                expect(wrapped).toContain("Object.fromEntries(value)");
            });

            it("should handle Set serialization", () => {
                const wrapped = wrapJavaScriptCode("result = new Set()");

                expect(wrapped).toContain("instanceof Set");
                expect(wrapped).toContain("Array.from(value)");
            });

            it("should handle Error serialization", () => {
                const wrapped = wrapJavaScriptCode("result = new Error('test')");

                expect(wrapped).toContain("instanceof Error");
                expect(wrapped).toContain("value.message");
                expect(wrapped).toContain("value.stack");
            });
        });

        describe("parseJavaScriptOutput", () => {
            it("should extract result from stdout", () => {
                const stdout =
                    'Console log\n__FM_RESULT_START__\n{"value": 42}\n__FM_RESULT_END__\n';
                const result = parseJavaScriptOutput(stdout, "", 0, 100);

                expect(result.result).toEqual({ value: 42 });
                expect(result.stdout).toBe("Console log");
            });

            it("should handle non-JSON result", () => {
                const stdout = "__FM_RESULT_START__\nnot json\n__FM_RESULT_END__\n";
                const result = parseJavaScriptOutput(stdout, "", 0, 100);

                expect(result.result).toBe("not json");
                expect(result.warnings).toContain(
                    "Failed to parse result as JSON, returning as string"
                );
            });

            it("should parse error details", () => {
                const stderr =
                    '__FM_ERROR_START__\n{"error": "undefined is not a function", "type": "TypeError", "stack": "..."}\n__FM_ERROR_END__\n';
                const result = parseJavaScriptOutput("", stderr, 1, 100);

                expect(result.stderr).toContain("TypeError: undefined is not a function");
            });

            it("should include metadata", () => {
                const result = parseJavaScriptOutput("output", "", 0, 200);

                expect(result.metadata).toEqual({
                    executionTimeMs: 200,
                    language: "javascript",
                    exitCode: 0
                });
            });
        });

        describe("getJavaScriptCommand", () => {
            it("should return correct command array", () => {
                const cmd = getJavaScriptCommand();

                expect(cmd).toEqual(["node", "/tmp/code.js"]);
            });
        });
    });

    describe("Shell Wrapper", () => {
        describe("wrapShellCode", () => {
            it("should wrap code with shebang and set -e", () => {
                const wrapped = wrapShellCode("echo hello");

                expect(wrapped).toContain("#!/bin/bash");
                expect(wrapped).toContain("set -e");
            });

            it("should export input data as environment variables", () => {
                const wrapped = wrapShellCode("echo $NAME", { name: "test", value: 42 });

                expect(wrapped).toContain("export NAME='test'");
                expect(wrapped).toContain("export VALUE='42'");
            });

            it("should convert variable names to uppercase", () => {
                const wrapped = wrapShellCode("echo $MYVAR", { myVar: "test" });

                // sanitizeVarName uppercases and replaces invalid chars, but doesn't split camelCase
                expect(wrapped).toContain("export MYVAR=");
            });

            it("should handle special characters in variable names", () => {
                const wrapped = wrapShellCode("echo $VAR", { "my-var.name": "test" });

                expect(wrapped).toContain("export MY_VAR_NAME=");
            });

            it("should handle variable names starting with numbers", () => {
                const wrapped = wrapShellCode("echo $VAR", { "123var": "test" });

                expect(wrapped).toContain("export _123VAR=");
            });

            it("should escape single quotes in values", () => {
                const wrapped = wrapShellCode("echo $TEXT", { text: "it's a test" });

                expect(wrapped).toContain("it'\"'\"'s a test");
            });

            it("should handle null/undefined values", () => {
                const wrapped = wrapShellCode("echo $VAR", {
                    nullVal: null,
                    undefinedVal: undefined
                });

                expect(wrapped).toContain("export NULLVAL=''");
                expect(wrapped).toContain("export UNDEFINEDVAL=''");
            });

            it("should JSON stringify object values", () => {
                const wrapped = wrapShellCode("echo $DATA", { data: { key: "value" } });

                expect(wrapped).toContain("export DATA=");
                expect(wrapped).toContain('{"key":"value"}');
            });

            it("should include user script", () => {
                const wrapped = wrapShellCode("echo hello\nls -la");

                expect(wrapped).toContain("echo hello");
                expect(wrapped).toContain("ls -la");
            });
        });

        describe("parseShellOutput", () => {
            it("should return stdout as result on success", () => {
                const result = parseShellOutput("hello world\n", "", 0, 100);

                expect(result.result).toBe("hello world");
                expect(result.stdout).toBe("hello world\n");
            });

            it("should return null result on failure", () => {
                const result = parseShellOutput("partial output", "error occurred", 1, 100);

                expect(result.result).toBeNull();
                expect(result.stderr).toBe("error occurred");
            });

            it("should handle empty stdout on success", () => {
                const result = parseShellOutput("", "", 0, 100);

                expect(result.result).toBeNull();
            });

            it("should include metadata", () => {
                const result = parseShellOutput("output", "", 0, 50);

                expect(result.metadata).toEqual({
                    executionTimeMs: 50,
                    language: "shell",
                    exitCode: 0
                });
            });

            it("should preserve stderr on error", () => {
                const result = parseShellOutput("", "command not found", 127, 100);

                expect(result.stderr).toBe("command not found");
                expect(result.metadata?.exitCode).toBe(127);
            });

            it("should trim whitespace from result", () => {
                const result = parseShellOutput("  hello  \n\n", "", 0, 100);

                expect(result.result).toBe("hello");
            });
        });

        describe("getShellCommand", () => {
            it("should return correct command array", () => {
                const cmd = getShellCommand();

                expect(cmd).toEqual(["bash", "/tmp/code.sh"]);
            });
        });
    });
});
