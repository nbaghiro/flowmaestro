import chalk from "chalk";
import Table from "cli-table3";
import YAML from "yaml";

export type OutputFormat = "json" | "yaml" | "table";

export interface TableColumn {
    key: string;
    header: string;
    width?: number;
    formatter?: (value: unknown) => string;
}

export interface OutputOptions {
    format: OutputFormat;
    columns?: TableColumn[];
    quiet?: boolean;
}

export function output(data: unknown, options: OutputOptions): void {
    if (options.quiet) {
        return;
    }

    switch (options.format) {
        case "json":
            outputJson(data);
            break;
        case "yaml":
            outputYaml(data);
            break;
        case "table":
        default:
            if (Array.isArray(data) && options.columns) {
                outputTable(data, options.columns);
            } else {
                outputJson(data);
            }
            break;
    }
}

export function outputJson(data: unknown): void {
    console.log(JSON.stringify(data, null, 2));
}

export function outputYaml(data: unknown): void {
    console.log(YAML.stringify(data));
}

export function outputTable(data: unknown[], columns: TableColumn[]): void {
    if (data.length === 0) {
        console.log(chalk.gray("No results found."));
        return;
    }

    const colWidths = columns.map((col) => col.width ?? null);

    const table = new Table({
        head: columns.map((col) => chalk.cyan(col.header)),
        colWidths,
        wordWrap: true,
        style: {
            head: [],
            border: []
        }
    });

    for (const item of data) {
        const row = columns.map((col) => {
            const value = getNestedValue(item, col.key);
            if (col.formatter) {
                return col.formatter(value);
            }
            return formatValue(value);
        });
        table.push(row);
    }

    console.log(table.toString());
}

function getNestedValue(obj: unknown, path: string): unknown {
    const keys = path.split(".");
    let current: unknown = obj;

    for (const key of keys) {
        if (current === null || current === undefined) {
            return undefined;
        }
        if (typeof current === "object" && key in current) {
            current = (current as Record<string, unknown>)[key];
        } else {
            return undefined;
        }
    }

    return current;
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined) {
        return chalk.gray("-");
    }

    if (typeof value === "boolean") {
        return value ? chalk.green("Yes") : chalk.gray("No");
    }

    if (typeof value === "number") {
        return String(value);
    }

    if (value instanceof Date) {
        return formatDate(value);
    }

    if (typeof value === "string") {
        if (isIsoDateString(value)) {
            return formatDate(new Date(value));
        }
        return truncate(value, 50);
    }

    if (Array.isArray(value)) {
        return `[${value.length} items]`;
    }

    if (typeof value === "object") {
        return chalk.gray("{...}");
    }

    return String(value);
}

function isIsoDateString(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
}

export function formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
        return "just now";
    }
    if (minutes < 60) {
        return `${minutes}m ago`;
    }
    if (hours < 24) {
        return `${hours}h ago`;
    }
    if (days < 7) {
        return `${days}d ago`;
    }

    return date.toLocaleDateString();
}

export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
        return str;
    }
    return str.slice(0, maxLength - 3) + "...";
}

export function formatStatus(status: string): string {
    switch (status.toLowerCase()) {
        case "completed":
        case "success":
        case "active":
        case "enabled":
        case "running":
            return chalk.green(status);
        case "in_progress":
        case "pending":
        case "waiting":
            return chalk.yellow(status);
        case "failed":
        case "error":
        case "cancelled":
        case "disabled":
            return chalk.red(status);
        case "paused":
            return chalk.blue(status);
        default:
            return status;
    }
}

export function formatDuration(ms: number): string {
    if (ms < 1000) {
        return `${ms}ms`;
    }
    const seconds = ms / 1000;
    if (seconds < 60) {
        return `${seconds.toFixed(1)}s`;
    }
    const minutes = seconds / 60;
    if (minutes < 60) {
        return `${minutes.toFixed(1)}m`;
    }
    const hours = minutes / 60;
    return `${hours.toFixed(1)}h`;
}

export function printSuccess(message: string): void {
    console.log(chalk.green("\u2713") + " " + message);
}

export function printError(message: string): void {
    console.error(chalk.red("\u2717") + " " + message);
}

export function printWarning(message: string): void {
    console.log(chalk.yellow("\u26a0") + " " + message);
}

export function printInfo(message: string): void {
    console.log(chalk.blue("\u2139") + " " + message);
}

export function printKeyValue(key: string, value: unknown): void {
    const formattedValue = typeof value === "string" ? value : JSON.stringify(value);
    console.log(`${chalk.gray(key + ":")} ${formattedValue}`);
}

export function printSection(title: string): void {
    console.log();
    console.log(chalk.bold(title));
    console.log(chalk.gray("\u2500".repeat(title.length)));
}

export function printDivider(): void {
    console.log(chalk.gray("\u2500".repeat(40)));
}

// Mini ASCII art banner
const BANNER_MINI = [
    "  ██████╗███╗   ███╗ ██████╗████████╗██╗",
    "  ██╔═══╝████╗ ████║██╔════╝╚══██╔══╝██║",
    "  █████╗ ██╔████╔██║██║        ██║   ██║",
    "  ██╔══╝ ██║╚██╔╝██║██║        ██║   ██║",
    "  ██║    ██║ ╚═╝ ██║╚██████╗   ██║   ███████╗",
    "  ╚═╝    ╚═╝     ╚═╝ ╚═════╝   ╚═╝   ╚══════╝"
].join("\n");

export function getBannerText(): string {
    return "\n" + chalk.cyan(BANNER_MINI) + "\n" + chalk.dim("  FlowMaestro Deployment CLI") + "\n";
}

export function printBanner(): void {
    console.log(getBannerText());
}
