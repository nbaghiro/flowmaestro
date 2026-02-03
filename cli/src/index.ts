#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import { registerAgentsCommand } from "./commands/agents";
import { registerApiKeysCommand } from "./commands/api-keys";
import { registerConfigCommand } from "./commands/config";
import { registerExecutionsCommand } from "./commands/executions";
import { registerKbCommand } from "./commands/kb";
import { registerLoginCommand } from "./commands/login";
import { registerLogoutCommand } from "./commands/logout";
import { registerThreadsCommand } from "./commands/threads";
import { registerTriggersCommand } from "./commands/triggers";
import { registerWebhooksCommand } from "./commands/webhooks";
import { registerWhoamiCommand } from "./commands/whoami";
import { registerWorkflowsCommand } from "./commands/workflows";
import { registerWorkspaceCommand } from "./commands/workspace";
import { loadConfig, type OutputFormat } from "./config";
import { BANNER } from "./utils/banner";
import { handleError } from "./utils/errors";

const VERSION = "1.0.0";
const program = new Command();

program
    .name("fm")
    .description("FlowMaestro CLI - Manage workflows, agents, and automations")
    .option("-w, --workspace <id>", "Override workspace ID")
    .option("-k, --api-key <key>", "Override API key")
    .option("-o, --output <format>", "Output format (json, table, yaml)", "table")
    .option("-q, --quiet", "Suppress non-essential output")
    .option("-v, --verbose", "Verbose output for debugging")
    .option("-V, --version", "Display version")
    .addHelpText("beforeAll", chalk.cyan(BANNER));

export interface GlobalOptions {
    workspace?: string;
    apiKey?: string;
    output: OutputFormat;
    quiet?: boolean;
    verbose?: boolean;
}

export function getGlobalOptions(): GlobalOptions {
    const opts = program.opts();
    const config = loadConfig();

    return {
        workspace: opts.workspace,
        apiKey: opts.apiKey,
        output: (opts.output as OutputFormat) || config.defaultOutputFormat,
        quiet: opts.quiet,
        verbose: opts.verbose
    };
}

registerLoginCommand(program);
registerLogoutCommand(program);
registerWhoamiCommand(program);
registerConfigCommand(program);
registerWorkspaceCommand(program);
registerWorkflowsCommand(program);
registerExecutionsCommand(program);
registerAgentsCommand(program);
registerThreadsCommand(program);
registerKbCommand(program);
registerTriggersCommand(program);
registerWebhooksCommand(program);
registerApiKeysCommand(program);

program.on("command:*", () => {
    console.error(chalk.red(`Invalid command: ${program.args.join(" ")}`));
    console.error(`Run ${chalk.cyan("fm --help")} to see available commands.`);
    process.exit(1);
});

async function main(): Promise<void> {
    try {
        // Handle version flag manually to show banner
        if (process.argv.includes("-V") || process.argv.includes("--version")) {
            console.log(chalk.cyan(BANNER));
            console.log(chalk.dim(`  v${VERSION}`));
            console.log();
            process.exit(0);
        }

        await program.parseAsync(process.argv);

        // Show help if no command provided
        if (process.argv.length === 2) {
            program.help();
        }
    } catch (error) {
        const opts = program.opts();
        handleError(error, opts.verbose);
    }
}

main().catch((error) => {
    handleError(error, false);
});
