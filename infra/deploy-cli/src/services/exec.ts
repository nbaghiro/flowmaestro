import { spawn, execSync } from "child_process";

export interface ExecResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

export interface ExecOptions {
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
    quiet?: boolean;
    stream?: boolean; // Stream output to console in real-time
}

/**
 * Execute a command and return the result
 */
export async function exec(
    command: string,
    args: string[],
    options: ExecOptions = {}
): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: options.cwd,
            env: { ...process.env, ...options.env },
            stdio: options.stream ? ["inherit", "pipe", "pipe"] : "pipe"
        });

        let stdout = "";
        let stderr = "";

        if (child.stdout) {
            child.stdout.on("data", (data) => {
                const str = data.toString();
                stdout += str;
                if (options.stream && !options.quiet) {
                    process.stdout.write(str);
                }
            });
        }

        if (child.stderr) {
            child.stderr.on("data", (data) => {
                const str = data.toString();
                stderr += str;
                if (options.stream && !options.quiet) {
                    process.stderr.write(str);
                }
            });
        }

        const timeoutId = options.timeout
            ? setTimeout(() => {
                  child.kill("SIGTERM");
                  reject(new Error(`Command timed out after ${options.timeout}ms`));
              }, options.timeout)
            : null;

        child.on("close", (code) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            resolve({
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode: code ?? 0
            });
        });

        child.on("error", (err) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            reject(err);
        });
    });
}

/**
 * Execute a command and throw if it fails
 */
export async function execOrFail(
    command: string,
    args: string[],
    options: ExecOptions = {}
): Promise<ExecResult> {
    const result = await exec(command, args, options);

    if (result.exitCode !== 0) {
        const error = new Error(
            `Command failed with exit code ${result.exitCode}: ${command} ${args.join(" ")}\n${result.stderr}`
        );
        (error as Error & { exitCode: number }).exitCode = result.exitCode;
        throw error;
    }

    return result;
}

/**
 * Execute a command synchronously and return stdout
 */
export function execSync_safe(command: string, options: { cwd?: string } = {}): string | null {
    try {
        return execSync(command, {
            cwd: options.cwd,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"]
        }).trim();
    } catch {
        return null;
    }
}

/**
 * Check if a command exists in PATH
 */
export function commandExists(command: string): boolean {
    try {
        execSync(`command -v ${command}`, { stdio: "pipe" });
        return true;
    } catch {
        return false;
    }
}

/**
 * Check for required commands and throw if any are missing
 */
export function requireCommands(commands: string[]): void {
    const missing = commands.filter((cmd) => !commandExists(cmd));
    if (missing.length > 0) {
        throw new Error(
            `Missing required commands: ${missing.join(", ")}\n` +
                "Please install these tools and try again."
        );
    }
}

/**
 * Get the current git SHA (short form)
 */
export function getGitSha(cwd?: string): string | null {
    return execSync_safe("git rev-parse --short HEAD", { cwd });
}

/**
 * Get the current git branch
 */
export function getGitBranch(cwd?: string): string | null {
    return execSync_safe("git rev-parse --abbrev-ref HEAD", { cwd });
}

/**
 * Check if git working directory is clean
 */
export function isGitClean(cwd?: string): boolean {
    const result = execSync_safe("git status --porcelain", { cwd });
    return result === "";
}
