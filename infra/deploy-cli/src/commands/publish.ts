import chalk from "chalk";
import { Command } from "commander";
import { getRepoPath } from "../config";
import { execOrFail, exec, getGitSha, isGitClean } from "../services/exec";
import { printSuccess, printError, printInfo, printWarning, printSection } from "../utils/output";
import { confirm, select, input } from "../utils/prompt";
import { withSpinner } from "../utils/spinner";

interface PackageConfig {
    name: string;
    displayName: string;
    workspace: string;
    tagPrefix: string;
    access: "public" | "restricted";
    description: string;
}

const PACKAGES: Record<string, PackageConfig> = {
    sdk: {
        name: "@flowmaestro/sdk",
        displayName: "JavaScript SDK",
        workspace: "@flowmaestro/sdk",
        tagPrefix: "sdk-v",
        access: "public",
        description: "JavaScript/TypeScript SDK"
    },
    widget: {
        name: "@flowmaestro/widget",
        displayName: "Widget SDK",
        workspace: "@flowmaestro/widget",
        tagPrefix: "widget-v",
        access: "public",
        description: "Embeddable widget SDK"
    },
    fm: {
        name: "@flowmaestro/cli",
        displayName: "FM CLI",
        workspace: "@flowmaestro/cli",
        tagPrefix: "fm-v",
        access: "public",
        description: "Public FlowMaestro CLI (fm)"
    },
    fmctl: {
        name: "@flowmaestro/deploy-cli",
        displayName: "Deploy CLI",
        workspace: "@flowmaestro/deploy-cli",
        tagPrefix: "fmctl-v",
        access: "restricted",
        description: "Internal deployment CLI (fmctl)"
    }
};

type PackageName = keyof typeof PACKAGES;

interface PublishOptions {
    dryRun: boolean;
    yes: boolean;
    tag?: string;
    skipBuild: boolean;
}

export function registerPublishCommand(program: Command): void {
    program
        .command("publish [packages...]")
        .description("Publish packages to npm")
        .option("--dry-run", "Show what would be published without actually publishing", false)
        .option("-y, --yes", "Skip confirmation prompts", false)
        .option("-t, --tag <version>", "Version tag (e.g., 1.0.0)")
        .option("--skip-build", "Skip build step", false)
        .addHelpText(
            "after",
            `
Packages:
  ${Object.entries(PACKAGES)
      .map(([key, pkg]) => `${key.padEnd(8)} - ${pkg.displayName} (${pkg.access})`)
      .join("\n  ")}

Examples:
  $ fmctl publish sdk              # Publish SDK with prompted version
  $ fmctl publish fm fmctl         # Publish both CLIs
  $ fmctl publish sdk --tag 1.2.0  # Publish SDK as v1.2.0
  $ fmctl publish sdk --dry-run    # Preview what would be published
`
        )
        .action(async (packages: string[], opts: PublishOptions) => {
            try {
                await runPublish(packages, opts);
            } catch (error) {
                printError(error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });
}

async function runPublish(packageNames: string[], options: PublishOptions): Promise<void> {
    // If no packages specified, prompt for selection
    if (packageNames.length === 0) {
        const selected = await select<string>({
            message: "Select package to publish:",
            choices: Object.entries(PACKAGES).map(([key, pkg]) => ({
                name: `${pkg.displayName} (${pkg.name})`,
                value: key,
                description: pkg.description
            }))
        });
        packageNames = [selected];
    }

    // Validate package names
    for (const name of packageNames) {
        if (!(name in PACKAGES)) {
            printError(`Unknown package: ${name}`);
            printInfo(`Valid packages: ${Object.keys(PACKAGES).join(", ")}`);
            process.exit(1);
        }
    }

    const packages = packageNames.map((name) => PACKAGES[name as PackageName]);

    // Check git status
    printSection("Pre-publish Checks");

    const repoRoot = getRepoPath();

    if (!isGitClean(repoRoot)) {
        printWarning("Git working directory is not clean");
        if (!options.yes) {
            const proceed = await confirm({
                message: "Continue anyway?",
                default: false
            });
            if (!proceed) {
                printInfo("Publish cancelled");
                return;
            }
        }
    }

    const gitSha = getGitSha(repoRoot);
    printInfo(`Git SHA: ${chalk.cyan(gitSha || "unknown")}`);

    // Determine version for each package
    const publishPlans: Array<{
        pkg: PackageConfig;
        version: string;
        tag: string;
    }> = [];

    for (const pkg of packages) {
        // Get current version from package.json
        const currentVersion = await getPackageVersion(pkg.workspace, repoRoot);
        printInfo(`${pkg.displayName} current version: ${chalk.cyan(currentVersion)}`);

        let version: string;
        if (options.tag) {
            version = options.tag.replace(/^v/, "");
        } else if (!options.yes) {
            version = await input({
                message: `Version for ${pkg.displayName}:`,
                default: currentVersion,
                validate: (v) => {
                    if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(v)) {
                        return "Invalid semver version (e.g., 1.0.0 or 1.0.0-beta.1)";
                    }
                    return true;
                }
            });
        } else {
            version = currentVersion;
        }

        publishPlans.push({
            pkg,
            version,
            tag: `${pkg.tagPrefix}${version}`
        });
    }

    // Show publish plan
    printSection("Publish Plan");

    for (const plan of publishPlans) {
        console.log();
        printInfo(`${chalk.bold(plan.pkg.displayName)}`);
        printInfo(`  Package: ${chalk.cyan(plan.pkg.name)}`);
        printInfo(`  Version: ${chalk.cyan(plan.version)}`);
        printInfo(`  Tag: ${chalk.cyan(plan.tag)}`);
        printInfo(
            `  Access: ${plan.pkg.access === "public" ? chalk.green("public") : chalk.yellow("restricted")}`
        );
    }

    if (options.dryRun) {
        console.log();
        printWarning("DRY RUN - No changes will be made");
    }

    // Confirm
    if (!options.yes && !options.dryRun) {
        console.log();
        const confirmed = await confirm({
            message: "Proceed with publish?",
            default: false
        });
        if (!confirmed) {
            printInfo("Publish cancelled");
            return;
        }
    }

    // Build and publish each package
    for (const plan of publishPlans) {
        await publishPackage(plan.pkg, plan.version, {
            dryRun: options.dryRun,
            skipBuild: options.skipBuild,
            repoRoot
        });
    }

    // Create git tags
    if (!options.dryRun) {
        printSection("Creating Git Tags");

        for (const plan of publishPlans) {
            await withSpinner(
                `Creating tag ${plan.tag}...`,
                async () => {
                    await execOrFail("git", ["tag", plan.tag], { cwd: repoRoot });
                },
                { successText: `Tag ${plan.tag} created` }
            );
        }

        console.log();
        printInfo("Push tags to trigger CI publish:");
        for (const plan of publishPlans) {
            console.log(chalk.dim(`  git push origin ${plan.tag}`));
        }
    }

    console.log();
    printSuccess("Publish complete!");
}

async function getPackageVersion(workspace: string, repoRoot: string): Promise<string> {
    const result = await exec("npm", ["pkg", "get", "version", `--workspace=${workspace}`], {
        cwd: repoRoot
    });

    if (result.exitCode !== 0) {
        throw new Error(`Failed to get version for ${workspace}`);
    }

    // npm pkg get returns JSON like {"@flowmaestro/sdk":"1.0.0"}
    try {
        const json = JSON.parse(result.stdout);
        const version = Object.values(json)[0] as string;
        return version.replace(/"/g, "");
    } catch {
        // Fallback: try to extract version directly
        const match = result.stdout.match(/"(\d+\.\d+\.\d+[^"]*)"/);
        return match ? match[1] : "1.0.0";
    }
}

async function publishPackage(
    pkg: PackageConfig,
    version: string,
    options: { dryRun: boolean; skipBuild: boolean; repoRoot: string }
): Promise<void> {
    const { dryRun, skipBuild, repoRoot } = options;

    printSection(`Publishing ${pkg.displayName}`);

    // Update version in package.json
    if (!dryRun) {
        await withSpinner(
            `Setting version to ${version}...`,
            async () => {
                await execOrFail(
                    "npm",
                    ["pkg", "set", `version=${version}`, `--workspace=${pkg.workspace}`],
                    { cwd: repoRoot }
                );
            },
            { successText: `Version set to ${version}` }
        );
    } else {
        printInfo(`Would set version to ${version}`);
    }

    // Build
    if (!skipBuild) {
        if (!dryRun) {
            await withSpinner(
                `Building ${pkg.displayName}...`,
                async () => {
                    await execOrFail("npm", ["run", "build", `--workspace=${pkg.workspace}`], {
                        cwd: repoRoot
                    });
                },
                { successText: `${pkg.displayName} built` }
            );
        } else {
            printInfo(`Would build ${pkg.workspace}`);
        }
    }

    // Type check
    if (!dryRun) {
        await withSpinner(
            `Type checking ${pkg.displayName}...`,
            async () => {
                await execOrFail("npm", ["run", "typecheck", `--workspace=${pkg.workspace}`], {
                    cwd: repoRoot
                });
            },
            { successText: `${pkg.displayName} type check passed` }
        );
    } else {
        printInfo(`Would type check ${pkg.workspace}`);
    }

    // Publish
    const publishArgs = ["publish", `--workspace=${pkg.workspace}`, `--access=${pkg.access}`];

    if (dryRun) {
        publishArgs.push("--dry-run");
    }

    await withSpinner(
        dryRun ? `Would publish ${pkg.name}@${version}...` : `Publishing ${pkg.name}@${version}...`,
        async () => {
            await execOrFail("npm", publishArgs, { cwd: repoRoot });
        },
        {
            successText: dryRun
                ? `Would publish ${pkg.name}@${version}`
                : `${pkg.name}@${version} published!`
        }
    );
}
