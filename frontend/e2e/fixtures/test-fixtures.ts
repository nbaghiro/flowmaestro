import { test as base, expect, Page } from "@playwright/test";

/**
 * E2E Test Fixtures for FlowMaestro
 *
 * Provides reusable test helpers and page objects for E2E tests.
 */

// ============================================================================
// TYPES
// ============================================================================

interface TestUser {
    email: string;
    password: string;
    name: string;
}

interface WorkflowData {
    name: string;
    description?: string;
    patternId?: string;
}

// ============================================================================
// TEST FIXTURES
// ============================================================================

export const test = base.extend<{
    testUser: TestUser;
    authenticatedPage: Page;
}>({
    // eslint-disable-next-line no-empty-pattern
    testUser: async ({}, use) => {
        await use({
            email: "test@flowmaestro.dev",
            password: "TestPassword123!",
            name: "Test User"
        });
    },

    authenticatedPage: async ({ page, testUser }, use) => {
        // Navigate to login
        await page.goto("/login");

        // Fill login form
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.fill('[data-testid="password-input"]', testUser.password);
        await page.click('[data-testid="login-button"]');

        // Wait for dashboard to load
        await page.waitForURL(/\/(dashboard|workflows)/);

        await use(page);
    }
});

export { expect };

// ============================================================================
// PAGE OBJECT HELPERS
// ============================================================================

/**
 * Helper to navigate to workflows page
 */
export async function navigateToWorkflows(page: Page): Promise<void> {
    await page.goto("/workflows");
    await page.waitForSelector('[data-testid="workflows-list"]', { timeout: 10000 });
}

/**
 * Helper to create a new workflow
 */
export async function createWorkflow(page: Page, workflow: WorkflowData): Promise<string> {
    // Click create workflow button
    await page.click('[data-testid="create-workflow-button"]');

    // Wait for dialog
    await page.waitForSelector('[data-testid="create-workflow-dialog"]');

    // Fill workflow name
    await page.fill('[data-testid="workflow-name-input"]', workflow.name);

    // Fill description if provided
    if (workflow.description) {
        await page.fill('[data-testid="workflow-description-input"]', workflow.description);
    }

    // Select pattern if provided
    if (workflow.patternId) {
        await page.click(`[data-testid="pattern-${workflow.patternId}"]`);
    }

    // Submit
    await page.click('[data-testid="create-workflow-submit"]');

    // Wait for navigation to canvas
    await page.waitForURL(/\/workflows\/[a-z0-9-]+/);

    // Extract workflow ID from URL
    const url = page.url();
    const workflowId = url.split("/workflows/")[1]?.split("/")[0] || "";

    return workflowId;
}

/**
 * Helper to open workflow canvas
 */
export async function openWorkflowCanvas(page: Page, workflowId: string): Promise<void> {
    await page.goto(`/workflows/${workflowId}`);
    await page.waitForSelector('[data-testid="workflow-canvas"]', { timeout: 15000 });
}

/**
 * Helper to add a node to the canvas
 */
export async function addNodeToCanvas(
    page: Page,
    nodeType: string,
    position?: { x: number; y: number }
): Promise<void> {
    // Open node library
    await page.click('[data-testid="add-node-button"]');

    // Wait for node library
    await page.waitForSelector('[data-testid="node-library"]');

    // Find and drag the node type
    const nodeItem = page.locator(`[data-testid="node-item-${nodeType}"]`);

    if (position) {
        const canvas = page.locator('[data-testid="workflow-canvas"]');
        const canvasBox = await canvas.boundingBox();

        if (canvasBox) {
            await nodeItem.dragTo(canvas, {
                targetPosition: {
                    x: position.x - canvasBox.x,
                    y: position.y - canvasBox.y
                }
            });
        }
    } else {
        // Click to add at default position
        await nodeItem.click();
    }

    // Close node library
    await page.keyboard.press("Escape");
}

/**
 * Helper to select a node on the canvas
 */
export async function selectNode(page: Page, nodeId: string): Promise<void> {
    await page.click(`[data-testid="node-${nodeId}"]`);
    await page.waitForSelector('[data-testid="node-inspector"]');
}

/**
 * Helper to connect two nodes
 */
export async function connectNodes(
    page: Page,
    sourceNodeId: string,
    targetNodeId: string,
    sourceHandle = "output",
    targetHandle = "input"
): Promise<void> {
    const sourceHandleLocator = page.locator(
        `[data-testid="node-${sourceNodeId}"] [data-handleid="${sourceHandle}"]`
    );
    const targetHandleLocator = page.locator(
        `[data-testid="node-${targetNodeId}"] [data-handleid="${targetHandle}"]`
    );

    await sourceHandleLocator.dragTo(targetHandleLocator);
}

/**
 * Helper to save workflow
 */
export async function saveWorkflow(page: Page): Promise<void> {
    await page.click('[data-testid="save-workflow-button"]');
    // Wait for save confirmation
    await page.waitForSelector('[data-testid="save-success-toast"]', { timeout: 5000 });
}

/**
 * Helper to execute workflow
 */
export async function executeWorkflow(page: Page): Promise<void> {
    await page.click('[data-testid="execute-workflow-button"]');
    // Wait for execution to start
    await page.waitForSelector('[data-testid="execution-status"]', { timeout: 10000 });
}

/**
 * Helper to wait for execution completion
 */
export async function waitForExecutionComplete(page: Page, timeout = 60000): Promise<void> {
    await page.waitForSelector('[data-testid="execution-complete"]', { timeout });
}

/**
 * Helper to get execution status
 */
export async function getExecutionStatus(page: Page): Promise<string> {
    const statusElement = page.locator('[data-testid="execution-status"]');
    return (await statusElement.textContent()) || "";
}

/**
 * Helper to configure node in inspector
 */
export async function configureNodeField(
    page: Page,
    fieldName: string,
    value: string
): Promise<void> {
    const field = page.locator(`[data-testid="field-${fieldName}"]`);
    await field.fill(value);
}

/**
 * Helper to delete a node
 */
export async function deleteNode(page: Page, nodeId: string): Promise<void> {
    await selectNode(page, nodeId);
    await page.keyboard.press("Delete");
    // Wait for node to be removed
    await page.waitForSelector(`[data-testid="node-${nodeId}"]`, {
        state: "detached",
        timeout: 5000
    });
}

/**
 * Helper to check if node exists on canvas
 */
export async function nodeExists(page: Page, nodeId: string): Promise<boolean> {
    const node = page.locator(`[data-testid="node-${nodeId}"]`);
    return await node.isVisible();
}

/**
 * Helper to get node count on canvas
 */
export async function getNodeCount(page: Page): Promise<number> {
    const nodes = page.locator('[data-testid^="node-"]');
    return await nodes.count();
}

/**
 * Helper to get all node types on canvas
 */
export async function getNodeTypes(page: Page): Promise<string[]> {
    const nodes = page.locator("[data-node-type]");
    const count = await nodes.count();
    const types: string[] = [];

    for (let i = 0; i < count; i++) {
        const type = await nodes.nth(i).getAttribute("data-node-type");
        if (type) {
            types.push(type);
        }
    }

    return types;
}
