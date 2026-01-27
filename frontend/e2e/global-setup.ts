/**
 * Playwright Global Setup
 *
 * This runs once before all tests to:
 * 1. Wait for backend to be healthy
 * 2. Create/verify test user exists
 *
 * Prerequisites:
 * - Infrastructure must be running (npm run docker:up)
 * - Playwright will auto-start backend and frontend via webServer config
 *
 * For local development:
 *   npm run docker:up
 *   npx playwright test
 *
 * For CI:
 *   Infrastructure is started in the CI workflow before running tests
 */

import type { FullConfig } from "@playwright/test";

// Use E2E port (default 3002) to avoid conflicts with local dev (3001)
const E2E_BACKEND_PORT = process.env.E2E_BACKEND_PORT || "3002";
const BACKEND_URL = `http://localhost:${E2E_BACKEND_PORT}`;
const TEST_USER = {
    email: "test@flowmaestro.dev",
    password: "TestPassword123!",
    name: "Test User"
};

async function waitForBackend(maxRetries = 60, delayMs = 2000): Promise<void> {
    console.log("Waiting for backend to be healthy...");
    console.log("(Make sure infrastructure is running: npm run docker:up)");

    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(`${BACKEND_URL}/health`);
            if (response.ok) {
                const data = await response.json();
                if (data.status === "healthy") {
                    console.log("Backend is healthy");
                    return;
                }
            }
        } catch {
            // Backend not ready yet
        }

        if (i < maxRetries - 1) {
            console.log(`Backend not ready, retrying in ${delayMs}ms... (${i + 1}/${maxRetries})`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }

    throw new Error(
        "Backend failed to become healthy within timeout.\n" +
            "Make sure infrastructure is running: npm run docker:up"
    );
}

async function ensureTestUserExists(): Promise<void> {
    console.log("Ensuring test user exists...");

    // First, try to login to check if user exists
    const loginResponse = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: TEST_USER.email,
            password: TEST_USER.password
        })
    });

    if (loginResponse.ok) {
        console.log("Test user already exists and can login");
        return;
    }

    // User doesn't exist or wrong password, try to register
    console.log("Test user not found, attempting to register...");

    const registerResponse = await fetch(`${BACKEND_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: TEST_USER.email,
            password: TEST_USER.password,
            name: TEST_USER.name
        })
    });

    if (registerResponse.ok) {
        console.log("Test user registered successfully");
        return;
    }

    const registerData = await registerResponse.json().catch(() => ({}));

    // Check if registration failed because user already exists
    if (registerResponse.status === 400 && registerData.error?.includes("already registered")) {
        console.log("Test user already exists (registration rejected)");
        // This might mean password is different - that's a test configuration issue
        console.warn("Warning: Test user exists but login failed. Check test user credentials.");
        return;
    }

    console.error("Failed to create test user:", registerData);
    throw new Error(`Failed to ensure test user exists: ${JSON.stringify(registerData)}`);
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
    console.log("\n=== Playwright Global Setup ===\n");

    // Wait for backend to be healthy
    await waitForBackend();

    // Ensure test user exists
    await ensureTestUserExists();

    console.log("\n=== Global Setup Complete ===\n");
}
