import chalk from "chalk";
import ora, { type Ora } from "ora";

let currentSpinner: Ora | null = null;

export function startSpinner(text: string): Ora {
    if (currentSpinner) {
        currentSpinner.stop();
    }

    currentSpinner = ora({
        text,
        color: "cyan"
    }).start();

    return currentSpinner;
}

export function updateSpinner(text: string): void {
    if (currentSpinner) {
        currentSpinner.text = text;
    }
}

export function succeedSpinner(text?: string): void {
    if (currentSpinner) {
        currentSpinner.succeed(text);
        currentSpinner = null;
    }
}

export function failSpinner(text?: string): void {
    if (currentSpinner) {
        currentSpinner.fail(text);
        currentSpinner = null;
    }
}

export function warnSpinner(text?: string): void {
    if (currentSpinner) {
        currentSpinner.warn(text);
        currentSpinner = null;
    }
}

export function stopSpinner(): void {
    if (currentSpinner) {
        currentSpinner.stop();
        currentSpinner = null;
    }
}

export function infoSpinner(text: string): void {
    if (currentSpinner) {
        currentSpinner.info(text);
        currentSpinner = null;
    }
}

export async function withSpinner<T>(
    text: string,
    fn: () => Promise<T>,
    options?: {
        successText?: string | ((result: T) => string);
        failText?: string | ((error: Error) => string);
    }
): Promise<T> {
    const spinner = startSpinner(text);

    try {
        const result = await fn();

        const successText =
            typeof options?.successText === "function"
                ? options.successText(result)
                : options?.successText;

        spinner.succeed(successText);
        return result;
    } catch (error) {
        let failText: string;
        if (typeof options?.failText === "function" && error instanceof Error) {
            failText = options.failText(error);
        } else if (typeof options?.failText === "string") {
            failText = options.failText;
        } else if (error instanceof Error) {
            failText = error.message;
        } else {
            failText = "Failed";
        }

        spinner.fail(failText);
        throw error;
    }
}

export interface ProgressOptions {
    total: number;
    format?: string;
}

export function createProgress(label: string, options: ProgressOptions): ProgressTracker {
    return new ProgressTracker(label, options);
}

export class ProgressTracker {
    private current = 0;
    private spinner: Ora;

    constructor(
        private label: string,
        private options: ProgressOptions
    ) {
        this.spinner = ora({
            text: this.formatText(),
            color: "cyan"
        }).start();
    }

    increment(amount = 1): void {
        this.current = Math.min(this.current + amount, this.options.total);
        this.spinner.text = this.formatText();
    }

    update(value: number): void {
        this.current = Math.min(value, this.options.total);
        this.spinner.text = this.formatText();
    }

    complete(text?: string): void {
        this.current = this.options.total;
        this.spinner.succeed(text || this.formatText());
    }

    fail(text?: string): void {
        this.spinner.fail(text || `${this.label} failed`);
    }

    private formatText(): string {
        const percentage = Math.round((this.current / this.options.total) * 100);
        const bar = this.createBar(percentage);
        return `${this.label} ${bar} ${percentage}% (${this.current}/${this.options.total})`;
    }

    private createBar(percentage: number): string {
        const width = 20;
        const filled = Math.round((percentage / 100) * width);
        const empty = width - filled;
        return chalk.cyan("█".repeat(filled)) + chalk.gray("░".repeat(empty));
    }
}
