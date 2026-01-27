import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for FlowMaestro E2E tests
 *
 * This configuration is self-contained and works in both local dev and CI:
 * - Uses dedicated E2E ports (3002/5174) to avoid conflicts with local dev (3001/5173)
 * - Runs global setup to seed test data
 *
 * Port isolation allows running E2E tests while local dev servers are running.
 */

// E2E test ports (different from local dev: 3001/5173)
const E2E_BACKEND_PORT = process.env.E2E_BACKEND_PORT || "3002";
const E2E_FRONTEND_PORT = process.env.E2E_FRONTEND_PORT || "5174";
const E2E_BACKEND_URL = `http://localhost:${E2E_BACKEND_PORT}`;
const E2E_FRONTEND_URL = `http://localhost:${E2E_FRONTEND_PORT}`;

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? "github" : "html",
    timeout: 60000,
    expect: {
        timeout: 10000
    },
    use: {
        baseURL: E2E_FRONTEND_URL,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure"
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] }
        }
    ],
    globalSetup: "./e2e/global-setup.ts",
    webServer: [
        {
            command: "npm run dev",
            cwd: "../backend",
            url: `${E2E_BACKEND_URL}/health`,
            reuseExistingServer: false,
            timeout: 120000,
            stdout: "pipe",
            stderr: "pipe",
            env: {
                ...process.env,
                BACKEND_PORT: E2E_BACKEND_PORT,
                APP_URL: E2E_FRONTEND_URL
            }
        },
        {
            command: `npm run dev -- --port ${E2E_FRONTEND_PORT}`,
            url: E2E_FRONTEND_URL,
            reuseExistingServer: false,
            timeout: 120000,
            stdout: "pipe",
            stderr: "pipe",
            env: {
                ...process.env,
                VITE_API_URL: E2E_BACKEND_URL,
                VITE_WS_URL: E2E_BACKEND_URL
            }
        }
    ]
});
