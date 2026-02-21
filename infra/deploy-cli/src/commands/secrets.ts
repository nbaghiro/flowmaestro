import * as fs from "fs";
import chalk from "chalk";
import { Command } from "commander";
import { getEnvironment, getRepoPath } from "../config";
import { checkGcloud, listSecrets, getSecretValue, setSecretValue } from "../services/gcloud";
import {
    printSuccess,
    printError,
    printInfo,
    printWarning,
    printSection,
    outputTable,
    type TableColumn
} from "../utils/output";
import { confirm, input, password } from "../utils/prompt";
import { withSpinner } from "../utils/spinner";

interface SecretsSetupOptions {
    env: string;
    promptAll: boolean;
}

interface SecretsSyncOptions {
    env: string;
}

interface SecretsListOptions {
    env: string;
}

interface SecretsVerifyOptions {
    env: string;
}

interface SecretDefinition {
    name: string;
    envVar: string;
    category: string;
    deployments: string[];
    required: boolean;
    description: string;
}

export function registerSecretsCommand(program: Command): void {
    const secretsCommand = program.command("secrets").description("Manage GCP secrets");

    // Setup command
    secretsCommand
        .command("setup")
        .description("Interactive setup of secrets in GCP Secret Manager")
        .option("-e, --env <env>", "Environment: prod, staging", "prod")
        .option("--prompt-all", "Prompt for all secrets, even if they exist", false)
        .action(async (opts: SecretsSetupOptions) => {
            try {
                await runSecretsSetup(opts);
            } catch (error) {
                printError(error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });

    // Sync local command
    secretsCommand
        .command("sync-local")
        .description("Sync secrets from GCP to local .env file")
        .option("-e, --env <env>", "Environment to sync from", "prod")
        .action(async (opts: SecretsSyncOptions) => {
            try {
                await runSecretsSync(opts);
            } catch (error) {
                printError(error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });

    // List command
    secretsCommand
        .command("list")
        .description("List all secrets")
        .option("-e, --env <env>", "Environment", "prod")
        .action(async (opts: SecretsListOptions) => {
            try {
                await runSecretsList(opts);
            } catch (error) {
                printError(error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });

    // Verify command
    secretsCommand
        .command("verify")
        .description("Verify all required secrets are set")
        .option("-e, --env <env>", "Environment", "prod")
        .action(async (opts: SecretsVerifyOptions) => {
            try {
                await runSecretsVerify(opts);
            } catch (error) {
                printError(error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });
}

async function loadSecretDefinitions(): Promise<SecretDefinition[]> {
    // Try to load from Pulumi config
    const pulumiConfigPath = getRepoPath("infra/pulumi/Pulumi.production.yaml");

    if (!fs.existsSync(pulumiConfigPath)) {
        printWarning("Pulumi config not found, using default secret definitions");
        return getDefaultSecretDefinitions();
    }

    try {
        const content = fs.readFileSync(pulumiConfigPath, "utf-8");
        // Parse YAML to find secrets config
        const YAML = await import("yaml");
        const config = YAML.parse(content);

        const secretsJson = config?.config?.["flowmaestro-infrastructure:secrets"];
        if (secretsJson) {
            return JSON.parse(secretsJson) as SecretDefinition[];
        }
    } catch (error) {
        printWarning(`Failed to parse Pulumi config: ${error}`);
    }

    return getDefaultSecretDefinitions();
}

function getDefaultSecretDefinitions(): SecretDefinition[] {
    return [
        {
            name: "jwt-secret",
            envVar: "JWT_SECRET",
            category: "core",
            deployments: ["api"],
            required: true,
            description: "JWT signing secret"
        },
        {
            name: "encryption-key",
            envVar: "ENCRYPTION_KEY",
            category: "core",
            deployments: ["api", "worker"],
            required: true,
            description: "Encryption key for sensitive data"
        },
        {
            name: "openai-api-key",
            envVar: "OPENAI_API_KEY",
            category: "llm",
            deployments: ["worker"],
            required: false,
            description: "OpenAI API key"
        },
        {
            name: "anthropic-api-key",
            envVar: "ANTHROPIC_API_KEY",
            category: "llm",
            deployments: ["worker"],
            required: false,
            description: "Anthropic API key"
        },
        {
            name: "resend-api-key",
            envVar: "RESEND_API_KEY",
            category: "service",
            deployments: ["api"],
            required: false,
            description: "Resend email API key"
        }
    ];
}

async function runSecretsSetup(options: SecretsSetupOptions): Promise<void> {
    const envConfig = getEnvironment(options.env);

    printSection("Secrets Setup");
    printInfo(`Environment: ${chalk.cyan(envConfig.name)}`);
    printInfo(`Project: ${chalk.cyan(envConfig.gcpProject)}`);

    checkGcloud();

    // Load secret definitions
    const definitions = await loadSecretDefinitions();

    // Get existing secrets
    const existingSecrets = await withSpinner("Fetching existing secrets...", async () => {
        return listSecrets(envConfig.gcpProject);
    });

    const secretPrefix = "flowmaestro-app-";

    for (const def of definitions) {
        const secretName = `${secretPrefix}${def.name}`;
        const exists = existingSecrets.includes(secretName);

        if (exists && !options.promptAll) {
            printInfo(`${def.envVar}: ${chalk.green("exists")} (skipping)`);
            continue;
        }

        console.log();
        printInfo(`${chalk.bold(def.envVar)}: ${def.description}`);
        printInfo(`  Category: ${def.category}`);
        printInfo(`  Required: ${def.required ? chalk.yellow("yes") : "no"}`);
        printInfo(`  Deployments: ${def.deployments.join(", ")}`);

        if (exists) {
            const shouldUpdate = await confirm({
                message: `Secret exists. Update ${def.envVar}?`,
                default: false
            });
            if (!shouldUpdate) continue;
        }

        // Prompt for value
        const isSensitive = def.name.includes("key") || def.name.includes("secret");
        let value: string;

        if (isSensitive) {
            value = await password({
                message: `Enter value for ${def.envVar}:`,
                validate: (v) => {
                    if (def.required && !v.trim()) {
                        return "This secret is required";
                    }
                    return true;
                }
            });
        } else {
            value = await input({
                message: `Enter value for ${def.envVar}:`,
                validate: (v) => {
                    if (def.required && !v.trim()) {
                        return "This secret is required";
                    }
                    return true;
                }
            });
        }

        if (!value.trim()) {
            printWarning(`Skipping ${def.envVar} (no value provided)`);
            continue;
        }

        // Set the secret
        await withSpinner(
            `Setting ${def.envVar}...`,
            async () => {
                await setSecretValue(secretName, value, envConfig.gcpProject);
            },
            { successText: `${def.envVar} set successfully` }
        );
    }

    console.log();
    printSuccess("Secrets setup complete!");
}

async function runSecretsSync(options: SecretsSyncOptions): Promise<void> {
    const envConfig = getEnvironment(options.env);

    printSection("Sync Secrets to Local");
    printInfo(`Source: ${chalk.cyan(envConfig.name)} (${envConfig.gcpProject})`);

    const envPath = getRepoPath("backend/.env");
    printInfo(`Target: ${chalk.cyan(envPath)}`);

    const shouldContinue = await confirm({
        message: "This will update your local .env file. Continue?",
        default: true
    });

    if (!shouldContinue) {
        printInfo("Sync cancelled");
        return;
    }

    checkGcloud();

    // Load secret definitions
    const definitions = await loadSecretDefinitions();

    // Load existing .env
    let envContent = "";
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf-8");
    }

    const secretPrefix = "flowmaestro-app-";
    let updatedCount = 0;

    for (const def of definitions) {
        const secretName = `${secretPrefix}${def.name}`;

        try {
            const value = await getSecretValue(secretName, envConfig.gcpProject);

            // Update or add to env content
            const regex = new RegExp(`^${def.envVar}=.*$`, "m");
            const newLine = `${def.envVar}=${value}`;

            if (regex.test(envContent)) {
                envContent = envContent.replace(regex, newLine);
            } else {
                envContent += `\n${newLine}`;
            }

            updatedCount++;
            printSuccess(`Synced ${def.envVar}`);
        } catch {
            printWarning(`Could not fetch ${def.envVar}`);
        }
    }

    // Write updated .env
    fs.writeFileSync(envPath, envContent.trim() + "\n");

    console.log();
    printSuccess(`Synced ${updatedCount} secrets to ${envPath}`);
}

async function runSecretsList(options: SecretsListOptions): Promise<void> {
    const envConfig = getEnvironment(options.env);

    printSection("Secrets List");
    printInfo(`Environment: ${chalk.cyan(envConfig.name)}`);

    checkGcloud();

    const secrets = await withSpinner("Fetching secrets...", async () => {
        return listSecrets(envConfig.gcpProject);
    });

    const flowmaestroSecrets = secrets.filter((s) => s.startsWith("flowmaestro-app-"));

    if (flowmaestroSecrets.length === 0) {
        printWarning("No FlowMaestro secrets found");
        return;
    }

    const columns: TableColumn[] = [
        { key: "name", header: "Secret Name", width: 40 },
        { key: "envVar", header: "Environment Variable", width: 30 }
    ];

    const data = flowmaestroSecrets.map((name) => ({
        name: name.replace("flowmaestro-app-", ""),
        envVar: name.replace("flowmaestro-app-", "").replace(/-/g, "_").toUpperCase()
    }));

    outputTable(data, columns);
}

async function runSecretsVerify(options: SecretsVerifyOptions): Promise<void> {
    const envConfig = getEnvironment(options.env);

    printSection("Verify Secrets");
    printInfo(`Environment: ${chalk.cyan(envConfig.name)}`);

    checkGcloud();

    const definitions = await loadSecretDefinitions();
    const secrets = await listSecrets(envConfig.gcpProject);

    const secretPrefix = "flowmaestro-app-";
    let allValid = true;
    const results: Array<{
        name: string;
        required: boolean;
        status: string;
    }> = [];

    for (const def of definitions) {
        const secretName = `${secretPrefix}${def.name}`;
        const exists = secrets.includes(secretName);

        let status: string;
        if (exists) {
            status = chalk.green("OK");
        } else if (def.required) {
            status = chalk.red("MISSING");
            allValid = false;
        } else {
            status = chalk.yellow("not set");
        }

        results.push({
            name: def.envVar,
            required: def.required,
            status
        });
    }

    const columns: TableColumn[] = [
        { key: "name", header: "Secret", width: 30 },
        {
            key: "required",
            header: "Required",
            width: 10,
            formatter: (v) => (v ? chalk.yellow("yes") : "no")
        },
        { key: "status", header: "Status", width: 15 }
    ];

    outputTable(results, columns);

    console.log();
    if (allValid) {
        printSuccess("All required secrets are configured!");
    } else {
        printError("Some required secrets are missing!");
        printInfo("Run 'fmctl secrets setup' to configure them");
        process.exit(1);
    }
}
