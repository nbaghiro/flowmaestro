import chalk from "chalk";
import { Command } from "commander";
import { registerDbCommand } from "./commands/db";
import { registerDeployCommand } from "./commands/deploy";
import { registerLogsCommand } from "./commands/logs";
import { registerPublishCommand } from "./commands/publish";
import { registerRollbackCommand } from "./commands/rollback";
import { registerSecretsCommand } from "./commands/secrets";
import { registerStatusCommand } from "./commands/status";
import { registerValidateCommand } from "./commands/validate";
import { getBannerText, printBanner } from "./utils/output";

const program = new Command();

program
    .name("fmctl")
    .description("FlowMaestro Deployment CLI - Unified deployment operations")
    .version("1.0.0")
    .addHelpText("beforeAll", getBannerText())
    .hook("preAction", () => {
        // Print banner before any command
        printBanner();
    });

// Global options
program
    .option("-v, --verbose", "Enable verbose output")
    .option("-q, --quiet", "Suppress non-essential output");

// Register all commands
registerDeployCommand(program);
registerDbCommand(program);
registerSecretsCommand(program);
registerStatusCommand(program);
registerLogsCommand(program);
registerRollbackCommand(program);
registerValidateCommand(program);
registerPublishCommand(program);

// Handle unknown commands
program.on("command:*", () => {
    console.error(chalk.red(`Unknown command: ${program.args.join(" ")}`));
    console.log();
    console.log("Available commands:");
    program.commands.forEach((cmd) => {
        console.log(`  ${chalk.cyan(cmd.name())} - ${cmd.description()}`);
    });
    process.exit(1);
});

// Parse and execute
program.parseAsync(process.argv).catch((error) => {
    console.error(chalk.red("Error:"), error.message);
    if (program.opts().verbose) {
        console.error(error.stack);
    }
    process.exit(1);
});
