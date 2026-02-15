/**
 * Webhook Test Utilities
 *
 * Utilities for testing webhook signature verification across providers.
 * Provides helper functions to create valid and invalid signatures for testing.
 */

import crypto from "crypto";
import type { WebhookRequestData, WebhookSignatureType } from "../../src/integrations/core/types";

/**
 * Options for creating webhook test data
 */
export interface WebhookTestDataOptions {
    /** The signing secret */
    secret: string;
    /** The request body (string or object) */
    body: string | object;
    /** Optional timestamp override (Unix seconds) */
    timestamp?: number;
    /** Whether to generate an invalid signature */
    invalidSignature?: boolean;
    /** Whether to use an expired timestamp */
    expiredTimestamp?: boolean;
    /** Custom headers to include */
    customHeaders?: Record<string, string>;
}

/**
 * Result of creating webhook test data
 */
export interface WebhookTestData {
    request: WebhookRequestData;
    signature: string;
    timestamp?: string;
}

// =============================================================================
// SLACK WEBHOOK SIGNATURES
// =============================================================================

/**
 * Create a Slack-style timestamp signature
 */
export function createSlackSignature(secret: string, timestamp: string, body: string): string {
    const baseString = `v0:${timestamp}:${body}`;
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(baseString, "utf-8");
    return `v0=${hmac.digest("hex")}`;
}

/**
 * Create Slack webhook test data
 */
export function createSlackWebhookData(options: WebhookTestDataOptions): WebhookTestData {
    const bodyString = typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body);

    let timestamp: string;
    if (options.expiredTimestamp) {
        // 10 minutes ago (beyond 5-minute window)
        timestamp = String(Math.floor(Date.now() / 1000) - 600);
    } else {
        timestamp = options.timestamp
            ? String(options.timestamp)
            : String(Math.floor(Date.now() / 1000));
    }

    let signature: string;
    if (options.invalidSignature) {
        signature = "v0=invalid_signature_000000000000000000000000000000";
    } else {
        signature = createSlackSignature(options.secret, timestamp, bodyString);
    }

    return {
        request: {
            headers: {
                "x-slack-signature": signature,
                "x-slack-request-timestamp": timestamp,
                "content-type": "application/json",
                ...options.customHeaders
            },
            body: bodyString
        },
        signature,
        timestamp
    };
}

// =============================================================================
// GITHUB WEBHOOK SIGNATURES
// =============================================================================

/**
 * Create a GitHub-style HMAC-SHA256 signature
 */
export function createGitHubSignature(secret: string, body: string): string {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(body, "utf-8");
    return `sha256=${hmac.digest("hex")}`;
}

/**
 * Create GitHub webhook test data
 */
export function createGitHubWebhookData(options: WebhookTestDataOptions): WebhookTestData {
    const bodyString = typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body);

    let signature: string;
    if (options.invalidSignature) {
        signature = "sha256=invalid_signature_00000000000000000000000000000000";
    } else {
        signature = createGitHubSignature(options.secret, bodyString);
    }

    return {
        request: {
            headers: {
                "x-hub-signature-256": signature,
                "x-github-event": "push",
                "content-type": "application/json",
                ...options.customHeaders
            },
            body: bodyString
        },
        signature
    };
}

// =============================================================================
// STRIPE WEBHOOK SIGNATURES
// =============================================================================

/**
 * Create a Stripe-style timestamp signature
 */
export function createStripeSignature(secret: string, timestamp: string, body: string): string {
    const signedPayload = `${timestamp}.${body}`;
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(signedPayload, "utf-8");
    return hmac.digest("hex");
}

/**
 * Create Stripe webhook test data
 */
export function createStripeWebhookData(options: WebhookTestDataOptions): WebhookTestData {
    const bodyString = typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body);

    let timestamp: string;
    if (options.expiredTimestamp) {
        // 10 minutes ago (beyond 5-minute tolerance)
        timestamp = String(Math.floor(Date.now() / 1000) - 600);
    } else {
        timestamp = options.timestamp
            ? String(options.timestamp)
            : String(Math.floor(Date.now() / 1000));
    }

    let signature: string;
    if (options.invalidSignature) {
        signature = "invalid_signature_00000000000000000000000000000000";
    } else {
        signature = createStripeSignature(options.secret, timestamp, bodyString);
    }

    const stripeSignatureHeader = `t=${timestamp},v1=${signature}`;

    return {
        request: {
            headers: {
                "stripe-signature": stripeSignatureHeader,
                "content-type": "application/json",
                ...options.customHeaders
            },
            body: bodyString
        },
        signature,
        timestamp
    };
}

// =============================================================================
// GENERIC HMAC SIGNATURES
// =============================================================================

/**
 * Create a generic HMAC signature
 */
export function createHmacSignature(
    secret: string,
    body: string,
    algorithm: "sha256" | "sha1" = "sha256"
): string {
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(body, "utf-8");
    return hmac.digest("hex");
}

/**
 * Create generic HMAC webhook test data
 */
export function createHmacWebhookData(
    options: WebhookTestDataOptions,
    config: {
        algorithm?: "sha256" | "sha1";
        signatureHeader?: string;
        signaturePrefix?: string;
    } = {}
): WebhookTestData {
    const {
        algorithm = "sha256",
        signatureHeader = "x-signature",
        signaturePrefix = ""
    } = config;

    const bodyString = typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body);

    let signature: string;
    if (options.invalidSignature) {
        signature = "invalid_signature_00000000000000000000000000000000";
    } else {
        signature = createHmacSignature(options.secret, bodyString, algorithm);
    }

    const fullSignature = signaturePrefix ? `${signaturePrefix}${signature}` : signature;

    return {
        request: {
            headers: {
                [signatureHeader]: fullSignature,
                "content-type": "application/json",
                ...options.customHeaders
            },
            body: bodyString
        },
        signature: fullSignature
    };
}

// =============================================================================
// BEARER TOKEN SIGNATURES
// =============================================================================

/**
 * Create bearer token webhook test data
 */
export function createBearerTokenWebhookData(options: WebhookTestDataOptions): WebhookTestData {
    const bodyString = typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body);

    const token = options.invalidSignature ? "invalid_token" : options.secret;

    return {
        request: {
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": "application/json",
                ...options.customHeaders
            },
            body: bodyString
        },
        signature: token
    };
}

// =============================================================================
// WEBHOOK VERIFICATION TEST HELPERS
// =============================================================================

/**
 * Test vectors for webhook signature verification
 */
export interface WebhookTestVector {
    name: string;
    description: string;
    signatureType: WebhookSignatureType;
    request: WebhookRequestData;
    secret: string;
    expectedValid: boolean;
    expectedError?: string | RegExp;
}

/**
 * Create standard test vectors for a signature type
 */
export function createStandardTestVectors(
    signatureType: WebhookSignatureType,
    createWebhookData: (options: WebhookTestDataOptions) => WebhookTestData
): WebhookTestVector[] {
    const secret = "test_signing_secret_12345";
    const body = JSON.stringify({ type: "test_event", data: { id: "123" } });

    const vectors: WebhookTestVector[] = [];

    // Valid signature
    const validData = createWebhookData({ secret, body });
    vectors.push({
        name: "valid_signature",
        description: "Should verify valid signature",
        signatureType,
        request: validData.request,
        secret,
        expectedValid: true
    });

    // Invalid signature
    const invalidData = createWebhookData({ secret, body, invalidSignature: true });
    vectors.push({
        name: "invalid_signature",
        description: "Should reject invalid signature",
        signatureType,
        request: invalidData.request,
        secret,
        expectedValid: false
    });

    // Missing signature header
    const missingHeaderData = createWebhookData({ secret, body });
    // Remove all signature-related headers
    const headersWithoutSig: Record<string, string> = { "content-type": "application/json" };
    vectors.push({
        name: "missing_signature_header",
        description: "Should reject request with missing signature header",
        signatureType,
        request: { ...missingHeaderData.request, headers: headersWithoutSig },
        secret,
        expectedValid: false,
        expectedError: /missing/i
    });

    // Wrong secret
    const wrongSecretData = createWebhookData({ secret: "wrong_secret", body });
    vectors.push({
        name: "wrong_secret",
        description: "Should reject signature made with wrong secret",
        signatureType,
        request: wrongSecretData.request,
        secret, // Use original secret for verification
        expectedValid: false
    });

    return vectors;
}

/**
 * Create timestamp-specific test vectors
 */
export function createTimestampTestVectors(
    signatureType: WebhookSignatureType,
    createWebhookData: (options: WebhookTestDataOptions) => WebhookTestData
): WebhookTestVector[] {
    const secret = "test_signing_secret_12345";
    const body = JSON.stringify({ type: "test_event" });

    const vectors: WebhookTestVector[] = [];

    // Expired timestamp (replay attack prevention)
    const expiredData = createWebhookData({ secret, body, expiredTimestamp: true });
    vectors.push({
        name: "expired_timestamp",
        description: "Should reject request with expired timestamp (replay attack prevention)",
        signatureType,
        request: expiredData.request,
        secret,
        expectedValid: false,
        expectedError: /too old|expired/i
    });

    // Future timestamp (clock skew handling - most implementations reject)
    const futureTimestamp = Math.floor(Date.now() / 1000) + 600; // 10 minutes in future
    const futureData = createWebhookData({ secret, body, timestamp: futureTimestamp });
    vectors.push({
        name: "future_timestamp",
        description: "Should handle future timestamp (potential clock skew)",
        signatureType,
        request: futureData.request,
        secret,
        expectedValid: false // Most implementations reject future timestamps
    });

    return vectors;
}

// =============================================================================
// SAMPLE WEBHOOK PAYLOADS
// =============================================================================

/**
 * Sample Slack event payload
 */
export function createSlackEventPayload(
    eventType: string,
    eventData: Record<string, unknown> = {}
): object {
    return {
        token: "verification_token",
        team_id: "T1234567890",
        api_app_id: "A1234567890",
        event: {
            type: eventType,
            user: "U1234567890",
            channel: "C1234567890",
            ts: "1234567890.123456",
            ...eventData
        },
        type: "event_callback",
        event_id: "Ev1234567890",
        event_time: 1234567890
    };
}

/**
 * Sample GitHub event payload
 */
export function createGitHubEventPayload(
    action: string,
    repository: Record<string, unknown> = {}
): object {
    return {
        action,
        sender: {
            login: "octocat",
            id: 1,
            type: "User"
        },
        repository: {
            id: 123456789,
            name: "Hello-World",
            full_name: "octocat/Hello-World",
            owner: {
                login: "octocat"
            },
            ...repository
        }
    };
}

/**
 * Sample Stripe event payload
 */
export function createStripeEventPayload(
    type: string,
    objectData: Record<string, unknown> = {}
): object {
    return {
        id: "evt_1234567890",
        object: "event",
        api_version: "2023-10-16",
        created: Math.floor(Date.now() / 1000),
        type,
        data: {
            object: {
                id: "obj_1234567890",
                object: "payment_intent",
                ...objectData
            }
        },
        livemode: false
    };
}
