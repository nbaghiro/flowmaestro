import { clearCredentials, isAuthenticated } from "../config";
import { handleError } from "../utils/errors";
import { printSuccess, printWarning } from "../utils/output";
import { confirm } from "../utils/prompt";
import type { Command } from "commander";

export function registerLogoutCommand(program: Command): void {
    program
        .command("logout")
        .description("Log out and clear stored credentials")
        .option("-f, --force", "Skip confirmation prompt")
        .action(async (options) => {
            try {
                if (!isAuthenticated()) {
                    printWarning("You are not currently logged in.");
                    return;
                }

                if (!options.force) {
                    const proceed = await confirm({
                        message: "Are you sure you want to log out?",
                        default: true
                    });

                    if (!proceed) {
                        printWarning("Logout cancelled.");
                        return;
                    }
                }

                clearCredentials();
                printSuccess("Successfully logged out.");
            } catch (error) {
                handleError(error, program.opts().verbose);
            }
        });
}
