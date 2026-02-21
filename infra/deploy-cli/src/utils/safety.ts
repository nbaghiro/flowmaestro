import chalk from "chalk";
import { isCI } from "./ci";
import { confirm } from "./prompt";

/**
 * Production safety utilities
 */

export async function confirmProduction(
    action: string,
    options: { yes?: boolean; env: string }
): Promise<boolean> {
    // In CI or with --yes flag, skip confirmation
    if (options.yes || isCI()) {
        return true;
    }

    // Only require confirmation for production
    if (options.env !== "prod" && options.env !== "production") {
        return true;
    }

    console.log();
    console.log(chalk.yellow.bold("  \u26a0  WARNING: PRODUCTION ENVIRONMENT  \u26a0"));
    console.log();
    console.log(`  You are about to ${chalk.red(action)} in ${chalk.red.bold("PRODUCTION")}.`);
    console.log("  This will affect live users.");
    console.log();

    return confirm({
        message: "Are you sure you want to continue?",
        default: false
    });
}

export function printDryRunNotice(): void {
    console.log();
    console.log(chalk.yellow.bold("  DRY RUN MODE"));
    console.log(chalk.yellow("  No changes will be made. Showing what would happen:"));
    console.log();
}

export function printDryRunAction(description: string): void {
    console.log(chalk.gray("  Would execute:"), description);
}
