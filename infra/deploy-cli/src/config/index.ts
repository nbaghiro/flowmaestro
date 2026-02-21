export * from "./environments";
export * from "./services";

import * as fs from "fs";
import * as path from "path";

// Resolve the repository root directory
function findRepoRoot(): string {
    let dir = __dirname;

    // Walk up until we find package.json with workspaces (root package.json)
    while (dir !== path.dirname(dir)) {
        const packageJsonPath = path.join(dir, "package.json");
        if (fs.existsSync(packageJsonPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
                if (pkg.workspaces) {
                    return dir;
                }
            } catch {
                // Continue searching
            }
        }
        dir = path.dirname(dir);
    }

    // Fallback: assume we're in infra/deploy-cli/dist/config
    return path.resolve(__dirname, "../../../../");
}

export const REPO_ROOT = findRepoRoot();

export function getRepoPath(...parts: string[]): string {
    return path.join(REPO_ROOT, ...parts);
}
