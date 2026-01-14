import chalk from "chalk";
import { performDeviceLogin } from "../auth/device-flow";
import { saveCredentials, isAuthenticated } from "../config";
import { handleError } from "../utils/errors";
import { printSuccess } from "../utils/output";
import { confirm, input } from "../utils/prompt";
import type { Command } from "commander";

export function registerLoginCommand(program: Command): void {
    program
        .command("login")
        .description("Authenticate with FlowMaestro")
        .option("--api-key", "Login using an API key instead of OAuth")
        .action(async (options) => {
            try {
                if (options.apiKey) {
                    await loginWithApiKey();
                } else {
                    await loginWithOAuth();
                }
            } catch (error) {
                handleError(error, program.opts().verbose);
            }
        });
}

async function loginWithOAuth(): Promise<void> {
    if (isAuthenticated()) {
        const proceed = await confirm({
            message: "You are already logged in. Do you want to log in again?",
            default: false
        });

        if (!proceed) {
            console.log(chalk.gray("Login cancelled."));
            return;
        }
    }

    await performDeviceLogin();
}

async function loginWithApiKey(): Promise<void> {
    console.log();
    console.log(chalk.bold("Login with API Key"));
    console.log(chalk.gray("You can create an API key in the FlowMaestro dashboard."));
    console.log();

    const apiKey = await input({
        message: "Enter your API key:",
        validate: (value) => {
            if (!value.trim()) {
                return "API key is required";
            }
            if (!value.startsWith("fm_live_") && !value.startsWith("fm_test_")) {
                return "API key must start with 'fm_live_' or 'fm_test_'";
            }
            return true;
        }
    });

    saveCredentials({
        apiKey: apiKey.trim()
    });

    printSuccess("API key saved successfully!");
    console.log();
    console.log(chalk.gray("Run 'fm whoami' to verify your authentication."));
}
