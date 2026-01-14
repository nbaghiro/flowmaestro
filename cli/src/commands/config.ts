import chalk from "chalk";
import {
    loadConfig,
    setConfigValue,
    getConfigDir,
    type CliConfig,
    type OutputFormat
} from "../config";
import { handleError, ValidationError } from "../utils/errors";
import { printSuccess, printKeyValue, printSection } from "../utils/output";
import type { Command } from "commander";

const VALID_KEYS: (keyof CliConfig)[] = ["apiUrl", "currentWorkspace", "defaultOutputFormat"];

const OUTPUT_FORMATS: OutputFormat[] = ["json", "table", "yaml"];

export function registerConfigCommand(program: Command): void {
    const configCmd = program.command("config").description("Manage CLI configuration");

    configCmd
        .command("get [key]")
        .description("Get configuration value(s)")
        .action((key?: string) => {
            try {
                const config = loadConfig();

                if (key) {
                    if (!isValidConfigKey(key)) {
                        throw new ValidationError(
                            `Invalid config key: ${key}. Valid keys: ${VALID_KEYS.join(", ")}`
                        );
                    }
                    const value = config[key as keyof CliConfig];
                    console.log(value ?? chalk.gray("(not set)"));
                } else {
                    printSection("Configuration");
                    printKeyValue("Config directory", getConfigDir());
                    console.log();

                    for (const k of VALID_KEYS) {
                        const value = config[k];
                        printKeyValue(k, value ?? chalk.gray("(not set)"));
                    }
                }
            } catch (error) {
                handleError(error, program.opts().verbose);
            }
        });

    configCmd
        .command("set <key> <value>")
        .description("Set a configuration value")
        .action((key: string, value: string) => {
            try {
                if (!isValidConfigKey(key)) {
                    throw new ValidationError(
                        `Invalid config key: ${key}. Valid keys: ${VALID_KEYS.join(", ")}`
                    );
                }

                const typedKey = key as keyof CliConfig;

                if (typedKey === "defaultOutputFormat") {
                    if (!OUTPUT_FORMATS.includes(value as OutputFormat)) {
                        throw new ValidationError(
                            `Invalid output format: ${value}. Valid formats: ${OUTPUT_FORMATS.join(", ")}`
                        );
                    }
                    setConfigValue(typedKey, value as OutputFormat);
                } else if (typedKey === "apiUrl") {
                    try {
                        new URL(value);
                    } catch {
                        throw new ValidationError(`Invalid URL: ${value}`);
                    }
                    setConfigValue(typedKey, value);
                } else {
                    setConfigValue(typedKey, value);
                }

                printSuccess(`Set ${key} = ${value}`);
            } catch (error) {
                handleError(error, program.opts().verbose);
            }
        });

    configCmd
        .command("unset <key>")
        .description("Unset a configuration value")
        .action((key: string) => {
            try {
                if (!isValidConfigKey(key)) {
                    throw new ValidationError(
                        `Invalid config key: ${key}. Valid keys: ${VALID_KEYS.join(", ")}`
                    );
                }

                const typedKey = key as keyof CliConfig;

                if (typedKey === "apiUrl" || typedKey === "defaultOutputFormat") {
                    throw new ValidationError(`Cannot unset required config key: ${key}`);
                }

                setConfigValue(typedKey, undefined as unknown as string);
                printSuccess(`Unset ${key}`);
            } catch (error) {
                handleError(error, program.opts().verbose);
            }
        });

    configCmd
        .command("path")
        .description("Show configuration file path")
        .action(() => {
            console.log(getConfigDir());
        });
}

function isValidConfigKey(key: string): key is keyof CliConfig {
    return VALID_KEYS.includes(key as keyof CliConfig);
}
