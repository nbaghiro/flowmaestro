import chalk from "chalk";

/**
 * ASCII art banner for FlowMaestro CLI
 */
export const BANNER = `
  ███████╗██╗      ██████╗ ██╗    ██╗███╗   ███╗ █████╗ ███████╗███████╗████████╗██████╗  ██████╗
  ██╔════╝██║     ██╔═══██╗██║    ██║████╗ ████║██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗
  █████╗  ██║     ██║   ██║██║ █╗ ██║██╔████╔██║███████║█████╗  ███████╗   ██║   ██████╔╝██║   ██║
  ██╔══╝  ██║     ██║   ██║██║███╗██║██║╚██╔╝██║██╔══██║██╔══╝  ╚════██║   ██║   ██╔══██╗██║   ██║
  ██║     ███████╗╚██████╔╝╚███╔███╔╝██║ ╚═╝ ██║██║  ██║███████╗███████║   ██║   ██║  ██║╚██████╔╝
  ╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝
`;

/**
 * Compact banner for narrower terminals (stacked layout)
 */
export const BANNER_COMPACT = `
  ███████╗██╗      ██████╗ ██╗    ██╗
  ██╔════╝██║     ██╔═══██╗██║    ██║
  █████╗  ██║     ██║   ██║██║ █╗ ██║
  ██╔══╝  ██║     ██║   ██║██║███╗██║
  ██║     ███████╗╚██████╔╝╚███╔███╔╝
  ╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝
  ███╗   ███╗ █████╗ ███████╗███████╗████████╗██████╗  ██████╗
  ████╗ ████║██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗
  ██╔████╔██║███████║█████╗  ███████╗   ██║   ██████╔╝██║   ██║
  ██║╚██╔╝██║██╔══██║██╔══╝  ╚════██║   ██║   ██╔══██╗██║   ██║
  ██║ ╚═╝ ██║██║  ██║███████╗███████║   ██║   ██║  ██║╚██████╔╝
  ╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝
`;

/**
 * Minimal banner for very narrow terminals or quiet mode
 */
export const BANNER_MINIMAL = `
  ███████╗███╗   ███╗
  ██╔════╝████╗ ████║
  █████╗  ██╔████╔██║
  ██╔══╝  ██║╚██╔╝██║
  ██║     ██║ ╚═╝ ██║
  ╚═╝     ╚═╝     ╚═╝
`;

/**
 * Print the banner with optional version
 */
export function printBanner(version?: string, color: boolean = true): void {
    const banner = color ? chalk.cyan(BANNER) : BANNER;
    console.log(banner);

    if (version) {
        const versionText = `  v${version}`;
        console.log(color ? chalk.dim(versionText) : versionText);
    }
    console.log();
}

/**
 * Print a compact banner suitable for narrower terminals
 */
export function printCompactBanner(version?: string, color: boolean = true): void {
    const banner = color ? chalk.cyan(BANNER_COMPACT) : BANNER_COMPACT;
    console.log(banner);

    if (version) {
        const versionText = `  v${version}`;
        console.log(color ? chalk.dim(versionText) : versionText);
    }
    console.log();
}

/**
 * Get the appropriate banner based on terminal width
 */
export function getBanner(): string {
    const width = process.stdout.columns || 80;

    if (width >= 100) {
        return BANNER;
    } else if (width >= 65) {
        return BANNER_COMPACT;
    } else {
        return BANNER_MINIMAL;
    }
}

/**
 * Print the appropriate banner based on terminal width
 */
export function printResponsiveBanner(version?: string, color: boolean = true): void {
    const banner = getBanner();
    console.log(color ? chalk.cyan(banner) : banner);

    if (version) {
        const versionText = `  v${version}`;
        console.log(color ? chalk.dim(versionText) : versionText);
    }
    console.log();
}
