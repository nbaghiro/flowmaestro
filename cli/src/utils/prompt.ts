import chalk from "chalk";
import inquirer from "inquirer";

export interface ConfirmOptions {
    message: string;
    default?: boolean;
}

export async function confirm(options: ConfirmOptions): Promise<boolean> {
    const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
        {
            type: "confirm",
            name: "confirmed",
            message: options.message,
            default: options.default ?? false
        }
    ]);
    return confirmed;
}

export interface InputOptions {
    message: string;
    default?: string;
    validate?: (input: string) => boolean | string;
    transformer?: (input: string) => string;
}

export async function input(options: InputOptions): Promise<string> {
    const { value } = await inquirer.prompt<{ value: string }>([
        {
            type: "input",
            name: "value",
            message: options.message,
            default: options.default,
            validate: options.validate,
            transformer: options.transformer
        }
    ]);
    return value;
}

export interface PasswordOptions {
    message: string;
    mask?: string;
    validate?: (input: string) => boolean | string;
}

export async function password(options: PasswordOptions): Promise<string> {
    const { value } = await inquirer.prompt<{ value: string }>([
        {
            type: "password",
            name: "value",
            message: options.message,
            mask: options.mask ?? "*",
            validate: options.validate
        }
    ]);
    return value;
}

export interface SelectOption<T = string> {
    name: string;
    value: T;
    description?: string;
}

export interface SelectOptions<T = string> {
    message: string;
    choices: SelectOption<T>[];
    default?: T;
}

export async function select<T = string>(options: SelectOptions<T>): Promise<T> {
    const { value } = await inquirer.prompt<{ value: T }>([
        {
            type: "list",
            name: "value",
            message: options.message,
            choices: options.choices.map((c) => ({
                name: c.description ? `${c.name} ${chalk.gray(`- ${c.description}`)}` : c.name,
                value: c.value
            })),
            default: options.default
        }
    ]);
    return value;
}

export interface MultiSelectOptions<T = string> {
    message: string;
    choices: SelectOption<T>[];
    default?: T[];
}

export async function multiSelect<T = string>(options: MultiSelectOptions<T>): Promise<T[]> {
    const { values } = await inquirer.prompt<{ values: T[] }>([
        {
            type: "checkbox",
            name: "values",
            message: options.message,
            choices: options.choices.map((c) => ({
                name: c.description ? `${c.name} ${chalk.gray(`- ${c.description}`)}` : c.name,
                value: c.value,
                checked: options.default?.includes(c.value)
            }))
        }
    ]);
    return values;
}

export interface NumberOptions {
    message: string;
    default?: number;
    min?: number;
    max?: number;
}

export async function number(options: NumberOptions): Promise<number> {
    const { value } = await inquirer.prompt<{ value: number }>([
        {
            type: "number",
            name: "value",
            message: options.message,
            default: options.default,
            validate: (input: number) => {
                if (options.min !== undefined && input < options.min) {
                    return `Value must be at least ${options.min}`;
                }
                if (options.max !== undefined && input > options.max) {
                    return `Value must be at most ${options.max}`;
                }
                return true;
            }
        }
    ]);
    return value;
}

export interface EditorOptions {
    message: string;
    default?: string;
    postfix?: string;
}

export async function editor(options: EditorOptions): Promise<string> {
    const { value } = await inquirer.prompt<{ value: string }>([
        {
            type: "editor",
            name: "value",
            message: options.message,
            default: options.default,
            postfix: options.postfix ?? ".txt"
        }
    ]);
    return value;
}

export interface DynamicPromptsResult {
    [key: string]: unknown;
}

export interface DynamicPrompt {
    name: string;
    type: "input" | "password" | "confirm" | "select" | "number";
    message: string;
    required?: boolean;
    default?: unknown;
    choices?: SelectOption[];
    min?: number;
    max?: number;
}

export async function dynamicPrompts(prompts: DynamicPrompt[]): Promise<DynamicPromptsResult> {
    const result: DynamicPromptsResult = {};

    for (const prompt of prompts) {
        switch (prompt.type) {
            case "input":
                result[prompt.name] = await input({
                    message: prompt.message,
                    default: prompt.default as string | undefined,
                    validate: prompt.required
                        ? (val) => (val.trim() ? true : "This field is required")
                        : undefined
                });
                break;

            case "password":
                result[prompt.name] = await password({
                    message: prompt.message,
                    validate: prompt.required
                        ? (val) => (val.trim() ? true : "This field is required")
                        : undefined
                });
                break;

            case "confirm":
                result[prompt.name] = await confirm({
                    message: prompt.message,
                    default: prompt.default as boolean | undefined
                });
                break;

            case "select":
                if (prompt.choices) {
                    result[prompt.name] = await select({
                        message: prompt.message,
                        choices: prompt.choices,
                        default: prompt.default as string | undefined
                    });
                }
                break;

            case "number":
                result[prompt.name] = await number({
                    message: prompt.message,
                    default: prompt.default as number | undefined,
                    min: prompt.min,
                    max: prompt.max
                });
                break;
        }
    }

    return result;
}
