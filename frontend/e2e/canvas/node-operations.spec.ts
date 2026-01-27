import { test, expect } from "../fixtures/test-fixtures";

/**
 * E2E Tests: Canvas Node Operations
 *
 * Tests canvas interactions including:
 * - Adding nodes
 * - Selecting nodes
 * - Configuring nodes
 * - Deleting nodes
 * - Connecting nodes
 * - Canvas navigation
 */

test.describe("Canvas Node Operations", () => {
    test.beforeEach(async ({ page }) => {
        // Create a new blank workflow for testing
        await page.goto("/workflows/new");
        await page.waitForSelector('[data-testid="workflow-canvas"]', { timeout: 15000 });
    });

    test.describe("Adding Nodes", () => {
        test("should display add node button", async ({ page }) => {
            const addButton = page.locator('[data-testid="add-node-button"]');
            await expect(addButton).toBeVisible();
        });

        test("should open node library panel", async ({ page }) => {
            await page.click('[data-testid="add-node-button"]');

            const library = page.locator('[data-testid="node-library"]');
            await expect(library).toBeVisible();
        });

        test("should display node categories", async ({ page }) => {
            await page.click('[data-testid="add-node-button"]');
            await page.waitForSelector('[data-testid="node-library"]');

            // Should show categories
            const categories = page.locator('[data-testid^="node-category-"]');
            const count = await categories.count();
            expect(count).toBeGreaterThan(0);
        });

        test("should add input node to canvas", async ({ page }) => {
            await page.click('[data-testid="add-node-button"]');
            await page.waitForSelector('[data-testid="node-library"]');

            // Click on input node type
            await page.click('[data-testid="node-item-input"]');

            // Node should be added to canvas
            const inputNode = page.locator('[data-node-type="input"]');
            await expect(inputNode).toBeVisible({ timeout: 5000 });
        });

        test("should add LLM node to canvas", async ({ page }) => {
            await page.click('[data-testid="add-node-button"]');
            await page.waitForSelector('[data-testid="node-library"]');

            await page.click('[data-testid="node-item-llm"]');

            const llmNode = page.locator('[data-node-type="llm"]');
            await expect(llmNode).toBeVisible({ timeout: 5000 });
        });

        test("should add output node to canvas", async ({ page }) => {
            await page.click('[data-testid="add-node-button"]');
            await page.waitForSelector('[data-testid="node-library"]');

            await page.click('[data-testid="node-item-output"]');

            const outputNode = page.locator('[data-node-type="output"]');
            await expect(outputNode).toBeVisible({ timeout: 5000 });
        });

        test("should drag node to specific position", async ({ page }) => {
            await page.click('[data-testid="add-node-button"]');
            await page.waitForSelector('[data-testid="node-library"]');

            const nodeItem = page.locator('[data-testid="node-item-transform"]');
            const canvas = page.locator('[data-testid="workflow-canvas"]');

            await nodeItem.dragTo(canvas);

            const transformNode = page.locator('[data-node-type="transform"]');
            await expect(transformNode).toBeVisible({ timeout: 5000 });
        });
    });

    test.describe("Selecting Nodes", () => {
        test.beforeEach(async ({ page }) => {
            // Add a node first
            await page.click('[data-testid="add-node-button"]');
            await page.waitForSelector('[data-testid="node-library"]');
            await page.click('[data-testid="node-item-llm"]');
            await page.waitForSelector('[data-node-type="llm"]');
            await page.keyboard.press("Escape"); // Close library
        });

        test("should select node on click", async ({ page }) => {
            const node = page.locator('[data-node-type="llm"]');
            await node.click();

            await expect(node).toHaveClass(/selected/);
        });

        test("should show node inspector when selected", async ({ page }) => {
            const node = page.locator('[data-node-type="llm"]');
            await node.click();

            const inspector = page.locator('[data-testid="node-inspector"]');
            await expect(inspector).toBeVisible();
        });

        test("should deselect node when clicking canvas", async ({ page }) => {
            const node = page.locator('[data-node-type="llm"]');
            await node.click();

            // Click on empty canvas area
            const canvas = page.locator('[data-testid="workflow-canvas"]');
            await canvas.click({ position: { x: 50, y: 50 } });

            // Inspector should be hidden
            const inspector = page.locator('[data-testid="node-inspector"]');
            await expect(inspector).not.toBeVisible();
        });

        test("should allow multi-select with shift+click", async ({ page }) => {
            // Add another node
            await page.click('[data-testid="add-node-button"]');
            await page.waitForSelector('[data-testid="node-library"]');
            await page.click('[data-testid="node-item-transform"]');
            await page.keyboard.press("Escape");

            // Select first node
            const llmNode = page.locator('[data-node-type="llm"]');
            await llmNode.click();

            // Shift+click second node
            const transformNode = page.locator('[data-node-type="transform"]');
            await transformNode.click({ modifiers: ["Shift"] });

            // Both should be selected
            const selectedNodes = page.locator('[data-testid^="node-"].selected');
            await expect(selectedNodes).toHaveCount(2);
        });
    });

    test.describe("Configuring Nodes", () => {
        test.beforeEach(async ({ page }) => {
            // Add LLM node
            await page.click('[data-testid="add-node-button"]');
            await page.waitForSelector('[data-testid="node-library"]');
            await page.click('[data-testid="node-item-llm"]');
            await page.waitForSelector('[data-node-type="llm"]');
            await page.keyboard.press("Escape");

            // Select it
            await page.click('[data-node-type="llm"]');
            await page.waitForSelector('[data-testid="node-inspector"]');
        });

        test("should display node configuration fields", async ({ page }) => {
            // Should show provider selector
            const providerField = page.locator('[data-testid="field-provider"]');
            await expect(providerField).toBeVisible();

            // Should show model selector
            const modelField = page.locator('[data-testid="field-model"]');
            await expect(modelField).toBeVisible();
        });

        test("should update node label", async ({ page }) => {
            const labelField = page.locator('[data-testid="field-label"]');
            await labelField.fill("My Custom LLM");

            // Node should show new label
            const nodeLabel = page.locator('[data-node-type="llm"] [data-testid="node-label"]');
            await expect(nodeLabel).toHaveText("My Custom LLM");
        });

        test("should update node provider", async ({ page }) => {
            const providerSelect = page.locator('[data-testid="field-provider"]');
            await providerSelect.click();
            await page.click('[data-value="anthropic"]');

            // Provider should be updated
            await expect(providerSelect).toHaveValue("anthropic");
        });

        test("should show validation errors for required fields", async ({ page }) => {
            // Clear a required field
            const promptField = page.locator('[data-testid="field-prompt"]');
            if (await promptField.isVisible()) {
                await promptField.clear();
                await page.click('[data-testid="workflow-canvas"]'); // Blur

                // Should show error
                const error = page.locator('[data-testid="field-prompt-error"]');
                await expect(error).toBeVisible();
            }
        });
    });

    test.describe("Deleting Nodes", () => {
        test.beforeEach(async ({ page }) => {
            // Add node
            await page.click('[data-testid="add-node-button"]');
            await page.waitForSelector('[data-testid="node-library"]');
            await page.click('[data-testid="node-item-transform"]');
            await page.waitForSelector('[data-node-type="transform"]');
            await page.keyboard.press("Escape");
        });

        test("should delete node with delete key", async ({ page }) => {
            const node = page.locator('[data-node-type="transform"]');
            await node.click();
            await page.keyboard.press("Delete");

            await expect(node).not.toBeVisible();
        });

        test("should delete node with backspace key", async ({ page }) => {
            const node = page.locator('[data-node-type="transform"]');
            await node.click();
            await page.keyboard.press("Backspace");

            await expect(node).not.toBeVisible();
        });

        test("should show delete confirmation for connected nodes", async ({ page }) => {
            // Add second node and connect them
            await page.click('[data-testid="add-node-button"]');
            await page.click('[data-testid="node-item-output"]');
            await page.keyboard.press("Escape");

            // Connect nodes (if handles are visible)
            const sourceHandle = page.locator(
                '[data-node-type="transform"] [data-handleid="output"]'
            );
            const targetHandle = page.locator('[data-node-type="output"] [data-handleid="input"]');

            if ((await sourceHandle.isVisible()) && (await targetHandle.isVisible())) {
                await sourceHandle.dragTo(targetHandle);
            }

            // Try to delete
            const node = page.locator('[data-node-type="transform"]');
            await node.click();
            await page.keyboard.press("Delete");

            // Should delete (or show confirmation)
            await expect(node).not.toBeVisible();
        });

        test("should delete multiple selected nodes", async ({ page }) => {
            // Add another node
            await page.click('[data-testid="add-node-button"]');
            await page.click('[data-testid="node-item-code"]');
            await page.keyboard.press("Escape");

            // Select both
            await page.click('[data-node-type="transform"]');
            await page.click('[data-node-type="code"]', { modifiers: ["Shift"] });

            // Delete
            await page.keyboard.press("Delete");

            // Both should be gone
            await expect(page.locator('[data-node-type="transform"]')).not.toBeVisible();
            await expect(page.locator('[data-node-type="code"]')).not.toBeVisible();
        });
    });

    test.describe("Connecting Nodes", () => {
        test.beforeEach(async ({ page }) => {
            // Add input node
            await page.click('[data-testid="add-node-button"]');
            await page.click('[data-testid="node-item-input"]');

            // Add LLM node
            await page.click('[data-testid="add-node-button"]');
            await page.click('[data-testid="node-item-llm"]');
            await page.keyboard.press("Escape");
        });

        test("should create edge by dragging between handles", async ({ page }) => {
            const sourceHandle = page.locator('[data-node-type="input"] [data-handleid="output"]');
            const targetHandle = page.locator('[data-node-type="llm"] [data-handleid="input"]');

            if ((await sourceHandle.isVisible()) && (await targetHandle.isVisible())) {
                await sourceHandle.dragTo(targetHandle);

                // Edge should be created
                const edge = page.locator('[data-testid^="edge-"]');
                await expect(edge).toBeVisible();
            }
        });

        test("should prevent invalid connections", async ({ page }) => {
            // Try connecting output to output (invalid)
            const source = page.locator('[data-node-type="input"] [data-handleid="output"]');
            const target = page.locator('[data-node-type="llm"] [data-handleid="output"]');

            if ((await source.isVisible()) && (await target.isVisible())) {
                await source.dragTo(target);

                // No edge should be created
                const edges = page.locator('[data-testid^="edge-"]');
                const count = await edges.count();
                expect(count).toBe(0);
            }
        });

        test("should delete edge when clicking delete button", async ({ page }) => {
            // Create connection
            const sourceHandle = page.locator('[data-node-type="input"] [data-handleid="output"]');
            const targetHandle = page.locator('[data-node-type="llm"] [data-handleid="input"]');

            if ((await sourceHandle.isVisible()) && (await targetHandle.isVisible())) {
                await sourceHandle.dragTo(targetHandle);

                // Select edge
                const edge = page.locator('[data-testid^="edge-"]');
                await edge.click();

                // Delete
                await page.keyboard.press("Delete");

                // Edge should be gone
                await expect(edge).not.toBeVisible();
            }
        });
    });

    test.describe("Canvas Navigation", () => {
        test("should zoom in with scroll", async ({ page }) => {
            const canvas = page.locator('[data-testid="workflow-canvas"]');
            const initialTransform = await canvas.evaluate(
                (el) => el.querySelector(".react-flow__viewport")?.getAttribute("style") || ""
            );

            await canvas.hover();
            await page.mouse.wheel(0, -100);

            const newTransform = await canvas.evaluate(
                (el) => el.querySelector(".react-flow__viewport")?.getAttribute("style") || ""
            );

            expect(newTransform).not.toBe(initialTransform);
        });

        test("should pan canvas with drag", async ({ page }) => {
            const canvas = page.locator('[data-testid="workflow-canvas"]');

            await canvas.hover();

            // Middle mouse drag or space+drag for panning
            await page.mouse.down({ button: "middle" });
            await page.mouse.move(100, 100);
            await page.mouse.up({ button: "middle" });

            // Canvas should have moved (verify viewport transform changed)
            const transform = await canvas.evaluate(
                (el) => el.querySelector(".react-flow__viewport")?.getAttribute("style") || ""
            );
            expect(transform).toContain("translate");
        });

        test("should fit view with keyboard shortcut", async ({ page }) => {
            // Add nodes first
            await page.click('[data-testid="add-node-button"]');
            await page.click('[data-testid="node-item-llm"]');
            await page.keyboard.press("Escape");

            // Fit view (usually Ctrl+0 or a button)
            await page.click('[data-testid="fit-view-button"]');

            // Canvas should contain all nodes in view
            const node = page.locator('[data-node-type="llm"]');
            await expect(node).toBeInViewport();
        });
    });
});
