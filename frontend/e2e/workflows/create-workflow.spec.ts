import { test, expect } from "../fixtures/test-fixtures";

/**
 * E2E Tests: Workflow Creation
 *
 * Tests the workflow creation flow including:
 * - Creating blank workflows
 * - Creating workflows from patterns
 * - Validation of workflow names
 * - Pattern selection UI
 */

test.describe("Create Workflow", () => {
    test.beforeEach(async ({ page }) => {
        // Start from the workflows page
        await page.goto("/workflows");
    });

    test("should display create workflow button", async ({ page }) => {
        const createButton = page.locator('[data-testid="create-workflow-button"]');
        await expect(createButton).toBeVisible();
    });

    test("should open create workflow dialog", async ({ page }) => {
        await page.click('[data-testid="create-workflow-button"]');
        const dialog = page.locator('[data-testid="create-workflow-dialog"]');
        await expect(dialog).toBeVisible();
    });

    test("should create a blank workflow", async ({ page }) => {
        // Open create dialog
        await page.click('[data-testid="create-workflow-button"]');
        await page.waitForSelector('[data-testid="create-workflow-dialog"]');

        // Fill workflow name
        await page.fill('[data-testid="workflow-name-input"]', "My Test Workflow");

        // Fill description
        await page.fill(
            '[data-testid="workflow-description-input"]',
            "A test workflow created via E2E test"
        );

        // Submit
        await page.click('[data-testid="create-workflow-submit"]');

        // Should navigate to canvas
        await expect(page).toHaveURL(/\/workflows\/[a-z0-9-]+/);

        // Canvas should be visible
        const canvas = page.locator('[data-testid="workflow-canvas"]');
        await expect(canvas).toBeVisible({ timeout: 15000 });
    });

    test("should require workflow name", async ({ page }) => {
        // Open create dialog
        await page.click('[data-testid="create-workflow-button"]');
        await page.waitForSelector('[data-testid="create-workflow-dialog"]');

        // Try to submit without name
        await page.click('[data-testid="create-workflow-submit"]');

        // Should show validation error
        const errorMessage = page.locator('[data-testid="name-error"]');
        await expect(errorMessage).toBeVisible();
    });

    test("should display pattern categories", async ({ page }) => {
        await page.click('[data-testid="create-workflow-button"]');
        await page.waitForSelector('[data-testid="create-workflow-dialog"]');

        // Should show pattern categories
        const basicCategory = page.locator('[data-testid="pattern-category-basic"]');
        const intermediateCategory = page.locator('[data-testid="pattern-category-intermediate"]');
        const advancedCategory = page.locator('[data-testid="pattern-category-advanced"]');

        await expect(basicCategory).toBeVisible();
        await expect(intermediateCategory).toBeVisible();
        await expect(advancedCategory).toBeVisible();
    });

    test("should create workflow from simple-chat pattern", async ({ page }) => {
        await page.click('[data-testid="create-workflow-button"]');
        await page.waitForSelector('[data-testid="create-workflow-dialog"]');

        // Fill workflow name
        await page.fill('[data-testid="workflow-name-input"]', "Simple Chat Test");

        // Select simple-chat pattern
        await page.click('[data-testid="pattern-simple-chat"]');

        // Submit
        await page.click('[data-testid="create-workflow-submit"]');

        // Should navigate to canvas
        await expect(page).toHaveURL(/\/workflows\/[a-z0-9-]+/);

        // Wait for canvas to load
        await page.waitForSelector('[data-testid="workflow-canvas"]', { timeout: 15000 });

        // Should have 3 nodes (input, llm, output)
        const nodes = page.locator('[data-testid^="node-"]');
        await expect(nodes).toHaveCount(3, { timeout: 10000 });
    });

    test("should show pattern preview on hover", async ({ page }) => {
        await page.click('[data-testid="create-workflow-button"]');
        await page.waitForSelector('[data-testid="create-workflow-dialog"]');

        // Hover over a pattern
        const patternCard = page.locator('[data-testid="pattern-simple-chat"]');
        await patternCard.hover();

        // Should show preview
        const preview = page.locator('[data-testid="pattern-preview"]');
        await expect(preview).toBeVisible({ timeout: 5000 });
    });

    test("should filter patterns by search", async ({ page }) => {
        await page.click('[data-testid="create-workflow-button"]');
        await page.waitForSelector('[data-testid="create-workflow-dialog"]');

        // Type in search
        const searchInput = page.locator('[data-testid="pattern-search-input"]');
        if (await searchInput.isVisible()) {
            await searchInput.fill("router");

            // Should filter patterns
            const patterns = page.locator('[data-testid^="pattern-"]');
            const count = await patterns.count();
            expect(count).toBeLessThan(10); // Filtered down
        }
    });

    test("should close dialog on cancel", async ({ page }) => {
        await page.click('[data-testid="create-workflow-button"]');
        await page.waitForSelector('[data-testid="create-workflow-dialog"]');

        // Click cancel
        await page.click('[data-testid="create-workflow-cancel"]');

        // Dialog should be closed
        const dialog = page.locator('[data-testid="create-workflow-dialog"]');
        await expect(dialog).not.toBeVisible();
    });

    test("should close dialog on escape key", async ({ page }) => {
        await page.click('[data-testid="create-workflow-button"]');
        await page.waitForSelector('[data-testid="create-workflow-dialog"]');

        // Press escape
        await page.keyboard.press("Escape");

        // Dialog should be closed
        const dialog = page.locator('[data-testid="create-workflow-dialog"]');
        await expect(dialog).not.toBeVisible();
    });
});
