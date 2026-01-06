/**
 * Example 06: Webhook Receiver
 *
 * This example demonstrates how to receive and verify webhook notifications:
 * 1. Set up an Express server to receive webhooks
 * 2. Verify webhook signatures for security
 * 3. Handle different event types
 *
 * Run: npx tsx 06-webhook-receiver.ts
 *
 * Note: For local testing, use a tunnel service like ngrok:
 *   ngrok http 3456
 * Then create a webhook in FlowMaestro pointing to your ngrok URL.
 */

import crypto from "crypto";
import "dotenv/config";
import express from "express";

// Configuration
const PORT = parseInt(process.env.WEBHOOK_PORT || "3456", 10);

// In production, store this securely (from when you created the webhook)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "your_webhook_secret_here";

// Event handlers
const eventHandlers: Record<string, (data: WebhookPayload) => void> = {
    "execution.started": handleExecutionStarted,
    "execution.completed": handleExecutionCompleted,
    "execution.failed": handleExecutionFailed,
    "thread.message.created": handleMessageCreated,
    "thread.message.completed": handleMessageCompleted,
    test: handleTestEvent
};

interface WebhookPayload {
    id: string;
    event: string;
    created_at: string;
    data: Record<string, unknown>;
}

async function main() {
    const app = express();

    // Parse JSON bodies (important: must be before signature verification)
    app.use(
        express.json({
            verify: (req, _res, buf) => {
                // Store raw body for signature verification
                (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
            }
        })
    );

    console.log("FlowMaestro Webhook Receiver Example\n");
    console.log("=".repeat(50));

    // Health check endpoint
    app.get("/health", (_req, res) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // Webhook endpoint
    app.post("/webhook", (req, res) => {
        const signature = req.headers["x-flowmaestro-signature"] as string;
        const deliveryId = req.headers["x-flowmaestro-delivery-id"] as string;

        console.log(`\n${"=".repeat(50)}`);
        console.log(`Received webhook: ${deliveryId}`);
        console.log(`Timestamp: ${new Date().toISOString()}`);

        // Verify signature
        const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody;
        if (!verifySignature(rawBody?.toString() || JSON.stringify(req.body), signature)) {
            console.log("WARNING: Invalid signature!");
            // In production, you should reject invalid signatures
            // return res.status(401).json({ error: 'Invalid signature' });
        } else {
            console.log("Signature: Valid");
        }

        const payload = req.body as WebhookPayload;
        console.log(`Event: ${payload.event}`);

        // Route to appropriate handler
        const handler = eventHandlers[payload.event];
        if (handler) {
            try {
                handler(payload);
            } catch (error) {
                console.error("Handler error:", error);
            }
        } else {
            console.log(`Unknown event type: ${payload.event}`);
            console.log("Payload:", JSON.stringify(payload, null, 2));
        }

        // Always respond quickly (within 10 seconds)
        res.status(200).json({ received: true });
    });

    // Start server
    app.listen(PORT, () => {
        console.log(`\nWebhook server listening on port ${PORT}`);
        console.log("\nEndpoints:");
        console.log(`  POST http://localhost:${PORT}/webhook - Receive webhooks`);
        console.log(`  GET  http://localhost:${PORT}/health  - Health check`);
        console.log("\nFor local testing, use ngrok:");
        console.log(`  ngrok http ${PORT}`);
        console.log("\nThen create a webhook in FlowMaestro pointing to:");
        console.log("  https://your-ngrok-url.ngrok.io/webhook");
        console.log("\nWaiting for webhooks...\n");
    });
}

/**
 * Verify the webhook signature
 */
function verifySignature(payload: string, signature: string): boolean {
    if (!signature || !WEBHOOK_SECRET || WEBHOOK_SECRET === "your_webhook_secret_here") {
        console.log("Note: Signature verification skipped (no secret configured)");
        return true;
    }

    const expectedSignature = crypto
        .createHmac("sha256", WEBHOOK_SECRET)
        .update(payload)
        .digest("hex");

    return signature === `v1=${expectedSignature}`;
}

// Event Handlers

function handleExecutionStarted(payload: WebhookPayload): void {
    const data = payload.data;
    console.log("\n[EXECUTION STARTED]");
    console.log(`  Execution ID: ${data.execution_id}`);
    console.log(`  Workflow ID: ${data.workflow_id}`);
    console.log(`  Started at: ${payload.created_at}`);
}

function handleExecutionCompleted(payload: WebhookPayload): void {
    const data = payload.data;
    console.log("\n[EXECUTION COMPLETED]");
    console.log(`  Execution ID: ${data.execution_id}`);
    console.log(`  Workflow ID: ${data.workflow_id}`);
    console.log(`  Status: ${data.status}`);
    if (data.outputs) {
        console.log(`  Outputs: ${JSON.stringify(data.outputs, null, 2)}`);
    }

    // Example: Trigger downstream actions
    // await notifyUser(data.execution_id, data.outputs);
    // await updateDatabase(data);
}

function handleExecutionFailed(payload: WebhookPayload): void {
    const data = payload.data;
    console.log("\n[EXECUTION FAILED]");
    console.log(`  Execution ID: ${data.execution_id}`);
    console.log(`  Workflow ID: ${data.workflow_id}`);
    console.log(`  Error: ${data.error}`);

    // Example: Alert on failures
    // await sendAlert(`Execution ${data.execution_id} failed: ${data.error}`);
}

function handleMessageCreated(payload: WebhookPayload): void {
    const data = payload.data;
    console.log("\n[MESSAGE CREATED]");
    console.log(`  Thread ID: ${data.thread_id}`);
    console.log(`  Message ID: ${data.message_id}`);
    console.log(`  Role: ${data.role}`);
}

function handleMessageCompleted(payload: WebhookPayload): void {
    const data = payload.data;
    console.log("\n[MESSAGE COMPLETED]");
    console.log(`  Thread ID: ${data.thread_id}`);
    console.log(`  Message ID: ${data.message_id}`);
    console.log(`  Content preview: ${String(data.content || "").substring(0, 100)}...`);
}

function handleTestEvent(payload: WebhookPayload): void {
    console.log("\n[TEST EVENT]");
    console.log(`  Message: ${payload.data.message}`);
    console.log(`  Webhook ID: ${payload.data.webhook_id}`);
    console.log("\n  Test event received successfully!");
}

main().catch(console.error);
