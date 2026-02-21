import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { Command } from "commander";
import { getRepoPath } from "../config";
import { exec, execOrFail, commandExists } from "../services/exec";
import { printSuccess, printError, printWarning, printInfo, printSection } from "../utils/output";
import { withSpinner } from "../utils/spinner";

interface ValidateOptions {
    env: string;
    strict: boolean;
}

export function registerValidateCommand(program: Command): void {
    program
        .command("validate")
        .description("Validate Kubernetes manifests")
        .option("-e, --env <env>", "Environment: production, staging", "production")
        .option("--strict", "Fail on warnings", false)
        .action(async (opts: ValidateOptions) => {
            try {
                await runValidate(opts);
            } catch (error) {
                printError(error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });
}

async function runValidate(options: ValidateOptions): Promise<void> {
    const { env, strict } = options;

    printSection("Kubernetes Manifest Validation");
    printInfo(`Environment: ${chalk.cyan(env)}`);

    const k8sDir = getRepoPath("infra/k8s");
    const overlayDir = path.join(k8sDir, "overlays", env);

    // Check if overlay directory exists
    if (!fs.existsSync(overlayDir)) {
        printError(`Overlay directory not found: ${overlayDir}`);
        printInfo(`Available overlays: ${listOverlays(k8sDir).join(", ")}`);
        process.exit(1);
    }

    // Check for required tools
    printSection("Checking Tools");

    const tools = [
        { name: "kustomize", required: true },
        { name: "kubeconform", required: false },
        { name: "kubectl", required: true }
    ];

    let hasAllRequired = true;
    for (const tool of tools) {
        if (commandExists(tool.name)) {
            printSuccess(`${tool.name} found`);
        } else if (tool.required) {
            printError(`${tool.name} not found (required)`);
            hasAllRequired = false;
        } else {
            printWarning(`${tool.name} not found (optional)`);
        }
    }

    if (!hasAllRequired) {
        printError("Missing required tools");
        process.exit(1);
    }

    // Build manifests with kustomize
    printSection("Building Manifests");

    let manifests: string;

    await withSpinner(
        "Building with kustomize...",
        async () => {
            const result = await execOrFail("kustomize", ["build", overlayDir]);
            manifests = result.stdout;
        },
        { successText: "Manifests built successfully" }
    );

    // Count resources
    const resourceCount = (manifests!.match(/^kind:/gm) || []).length;
    printInfo(`Found ${chalk.cyan(resourceCount)} Kubernetes resources`);

    // Validate with kubectl dry-run
    printSection("Kubectl Validation");

    await withSpinner(
        "Running kubectl dry-run validation...",
        async () => {
            // Pipe manifests to kubectl
            const proc = await exec("bash", [
                "-c",
                `echo "${manifests!.replace(/"/g, '\\"')}" | kubectl apply --dry-run=client -f -`
            ]);

            if (proc.exitCode !== 0) {
                throw new Error(proc.stderr);
            }
        },
        { successText: "kubectl dry-run validation passed" }
    );

    // Validate with kubeconform if available
    if (commandExists("kubeconform")) {
        printSection("Kubeconform Validation");

        const kubeconformResult = await withSpinner(
            "Running kubeconform...",
            async () => {
                const proc = await exec("bash", [
                    "-c",
                    `echo '${manifests!.replace(/'/g, "\\'")}' | kubeconform -strict -summary -output json`
                ]);
                return proc;
            },
            { successText: "kubeconform validation complete" }
        );

        if (kubeconformResult.exitCode !== 0) {
            printError("kubeconform validation failed");
            console.log(kubeconformResult.stderr);
            if (strict) {
                process.exit(1);
            }
        }
    }

    // Check for deprecated APIs
    printSection("Deprecated API Check");

    const deprecatedPatterns = [
        {
            pattern: /apiVersion:\s*extensions\/v1beta1/,
            message: "extensions/v1beta1 is deprecated"
        },
        { pattern: /apiVersion:\s*apps\/v1beta1/, message: "apps/v1beta1 is deprecated" },
        { pattern: /apiVersion:\s*apps\/v1beta2/, message: "apps/v1beta2 is deprecated" },
        {
            pattern: /apiVersion:\s*networking\.k8s\.io\/v1beta1/,
            message: "networking.k8s.io/v1beta1 is deprecated"
        }
    ];

    let hasDeprecated = false;
    for (const { pattern, message } of deprecatedPatterns) {
        if (pattern.test(manifests!)) {
            printWarning(message);
            hasDeprecated = true;
        }
    }

    if (!hasDeprecated) {
        printSuccess("No deprecated APIs found");
    } else if (strict) {
        printError("Deprecated APIs found (strict mode)");
        process.exit(1);
    }

    // Summary
    console.log();
    printSection("Validation Summary");
    printSuccess(`Environment: ${env}`);
    printSuccess(`Resources: ${resourceCount}`);
    printSuccess("All validations passed!");
}

function listOverlays(k8sDir: string): string[] {
    const overlaysDir = path.join(k8sDir, "overlays");
    if (!fs.existsSync(overlaysDir)) {
        return [];
    }

    return fs.readdirSync(overlaysDir).filter((name) => {
        const stat = fs.statSync(path.join(overlaysDir, name));
        return stat.isDirectory();
    });
}
