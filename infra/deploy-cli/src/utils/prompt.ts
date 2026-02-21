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
