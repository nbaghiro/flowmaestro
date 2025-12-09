# Phase 15: Governance & Security Nodes

## Overview

Implement 4 governance and security nodes: Approval Gate, Audit Log, PII Redactor, and Encryption Node.

---

## Prerequisites

- **Phase 12**: Human-in-the-Loop (similar pause mechanism for Approval Gate)

---

## Existing Infrastructure

### User Input Workflow (Temporal)

**File**: `backend/src/temporal/workflows/user-input-workflow.ts`

```typescript
// Existing pause-and-wait pattern using Temporal signals
import { condition, defineSignal, defineQuery, setHandler } from "@temporalio/workflow";

export const userInputSignal = defineSignal<[string]>("userInput");
export const hasReceivedInputQuery = defineQuery<boolean>("hasReceivedInput");

export async function userInputWorkflow(
    input: UserInputWorkflowInput
): Promise<UserInputWorkflowResult> {
    // Wait for signal with timeout
    const timedOut = !(await condition(() => hasReceivedInput, timeoutMs));
    // Returns { success, userResponse, timedOut }
}

// Adapt this pattern for Approval Gate with multiple approvers and decisions
```

### Redis Rate Limiter

**File**: `backend/src/core/utils/rate-limiter.ts`

```typescript
export class RateLimiter {
    private redis: ReturnType<typeof createClient>;

    async isRateLimited(key: string, maxRequests: number, windowMinutes: number): Promise<boolean> {
        const redisKey = `ratelimit:${key}`;
        const count = await this.redis.incr(redisKey);
        if (count === 1) {
            await this.redis.expire(redisKey, windowMinutes * 60);
        }
        return count > maxRequests;
    }

    async getResetTime(key: string): Promise<number>;
}

export const rateLimiter = new RateLimiter();
```

### Redis Event Bus

**File**: `backend/src/services/events/RedisEventBus.ts`

```typescript
// Cross-process event communication via Redis Pub/Sub
// Use for approval notifications and state updates

export class RedisEventBus {
    async publish(channel: string, event: WebSocketEvent): Promise<void>;
    async subscribe(pattern: string, handler: (event: WebSocketEvent) => void): Promise<void>;
}

export const redisEventBus = RedisEventBus.getInstance();
```

### Connection Repository for KMS

**File**: `backend/src/storage/repositories/ConnectionRepository.ts`

```typescript
// Store KMS credentials / vault tokens for encryption node
const connection = await connectionRepository.findByIdWithData(connectionId);
// { accessToken, secretKey, vaultUrl, etc. }
```

---

## Nodes (4)

| Node                | Description                   | Category         |
| ------------------- | ----------------------------- | ---------------- |
| **Approval Gate**   | Pause for human approval      | tools/enterprise |
| **Audit Log**       | Record actions for compliance | tools/enterprise |
| **PII Redactor**    | Mask sensitive data           | tools/enterprise |
| **Encryption Node** | Encrypt/decrypt data          | tools/enterprise |

---

## Node Specifications

### Approval Gate Node

**Purpose**: Pause workflow until human approves/rejects

**Config**:

- Approvers: users / roles / dynamic
- Approval type: single / N of M / sequential
- Notification channels: email / Slack / in-app
- Timeout action: approve / reject / escalate
- Escalation chain
- Required comments

**Inputs**: `data` (any), `request` (string)
**Outputs**: `approved` (boolean), `approver` (object), `comments` (string), `timestamp`

### Audit Log Node

**Purpose**: Write audit records for compliance

**Config**:

- Destinations: database / S3 / SIEM
- Log format: structured JSON
- Fields to log
- Retention policy
- PII handling

**Inputs**: `action` (string), `data` (any)
**Outputs**: `logId`, `success`

### PII Redactor Node

**Purpose**: Detect and mask personally identifiable information

**Config**:

- PII types: SSN, credit card, phone, email, address, custom
- Redaction style: mask / hash / remove
- Custom patterns (regex)
- Exceptions list

**Inputs**: `data` (string/object)
**Outputs**: `redacted` (same type), `piiFound` (array), `redactionCount`

### Encryption Node

**Purpose**: Encrypt or decrypt sensitive data

**Config**:

- Mode: encrypt / decrypt
- Algorithm: AES-256-GCM
- Key source: KMS / vault / environment
- Key ID
- Additional authenticated data

**Inputs**: `data` (string/object)
**Outputs**: `result` (encrypted/decrypted), `keyId`

---

## Complete TypeScript Interfaces

```typescript
// backend/src/temporal/activities/node-executors/enterprise/types.ts

export interface ApprovalGateNodeConfig {
    approvers: Array<{
        type: "user" | "role" | "dynamic";
        value: string; // userId, roleId, or variable reference
    }>;
    approvalType: "single" | "nOfM" | "sequential";
    requiredApprovals?: number; // For nOfM
    notificationChannels: Array<"email" | "slack" | "in-app">;
    timeoutMs?: number;
    timeoutAction: "approve" | "reject" | "escalate";
    escalationChain?: string[];
    requireComments: boolean;
    requestTemplate?: string;
    outputVariable?: string;
}

export interface ApprovalGateNodeResult {
    approved: boolean;
    approvers: Array<{
        userId: string;
        email: string;
        decision: "approved" | "rejected";
        comments?: string;
        timestamp: Date;
    }>;
    finalDecision: "approved" | "rejected" | "escalated" | "timed_out";
    timestamp: Date;
}

export interface AuditLogNodeConfig {
    destinations: Array<"database" | "s3" | "siem">;
    s3Config?: {
        bucket: string;
        prefix?: string;
        region: string;
    };
    siemConfig?: {
        endpoint: string;
        apiKey: string;
    };
    fieldsToLog: string[];
    piiHandling: "redact" | "hash" | "include";
    retentionDays?: number;
    outputVariable?: string;
}

export interface AuditLogNodeResult {
    logId: string;
    success: boolean;
    destinations: Record<string, boolean>;
    timestamp: Date;
}

export interface PIIRedactorNodeConfig {
    piiTypes: Array<"ssn" | "creditCard" | "phone" | "email" | "address" | "name" | "dob">;
    customPatterns?: Array<{
        name: string;
        pattern: string; // regex
        replacement: string;
    }>;
    redactionStyle: "mask" | "hash" | "remove";
    maskCharacter?: string;
    exceptions?: string[];
    recursive: boolean;
    outputVariable?: string;
}

export interface PIIRedactorNodeResult {
    redacted: unknown; // same type as input
    piiFound: Array<{
        type: string;
        count: number;
        locations?: string[];
    }>;
    redactionCount: number;
}

export interface EncryptionNodeConfig {
    mode: "encrypt" | "decrypt";
    algorithm: "aes-256-gcm" | "aes-256-cbc";
    keySource: "kms" | "vault" | "environment";
    keyId?: string;
    vaultPath?: string;
    environmentVar?: string;
    additionalAuthenticatedData?: string;
    outputFormat?: "base64" | "hex";
    outputVariable?: string;
}

export interface EncryptionNodeResult {
    result: string;
    keyId: string;
    algorithm: string;
    iv?: string;
    authTag?: string;
}
```

---

## Backend Executor Implementations

### Approval Gate Executor

```typescript
// backend/src/temporal/activities/node-executors/enterprise/approval-gate-executor.ts
import type { JsonObject } from "@flowmaestro/shared";
import { condition, defineSignal, setHandler } from "@temporalio/workflow";
import { redisEventBus } from "../../../services/events/RedisEventBus";
import { db } from "../../../storage/database";
import type { ApprovalGateNodeConfig, ApprovalGateNodeResult } from "./types";

// Signal for approval decisions
export const approvalDecisionSignal = defineSignal<[ApprovalDecision]>("approvalDecision");

interface ApprovalDecision {
    approverId: string;
    decision: "approved" | "rejected";
    comments?: string;
}

export async function executeApprovalGateNode(
    config: ApprovalGateNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const executionId = context.executionId as string;
    const nodeId = context.nodeId as string;

    // Create approval request record
    const approvalRequest = await createApprovalRequest({
        executionId,
        nodeId,
        config,
        data: context.data
    });

    // Send notifications to approvers
    await sendApprovalNotifications(approvalRequest, config);

    // Track approvals
    const approvals: ApprovalDecision[] = [];
    let isComplete = false;

    // Set up signal handler
    setHandler(approvalDecisionSignal, (decision: ApprovalDecision) => {
        approvals.push(decision);
        isComplete = checkApprovalComplete(approvals, config);
    });

    // Wait for approvals with timeout
    const timeoutMs = config.timeoutMs || 24 * 60 * 60 * 1000; // Default 24 hours
    const timedOut = !(await condition(() => isComplete, timeoutMs));

    // Handle timeout
    if (timedOut) {
        return handleTimeout(config, approvalRequest);
    }

    // Determine final decision
    const finalDecision = determineFinalDecision(approvals, config);

    // Update request record
    await updateApprovalRequest(approvalRequest.id, {
        status: finalDecision,
        completedAt: new Date()
    });

    const result: ApprovalGateNodeResult = {
        approved: finalDecision === "approved",
        approvers: approvals.map((a) => ({
            userId: a.approverId,
            email: "", // Lookup from user
            decision: a.decision,
            comments: a.comments,
            timestamp: new Date()
        })),
        finalDecision,
        timestamp: new Date()
    };

    if (config.outputVariable) {
        return { [config.outputVariable]: result } as unknown as JsonObject;
    }
    return result as unknown as JsonObject;
}

function checkApprovalComplete(
    approvals: ApprovalDecision[],
    config: ApprovalGateNodeConfig
): boolean {
    const approved = approvals.filter((a) => a.decision === "approved").length;
    const rejected = approvals.filter((a) => a.decision === "rejected").length;

    switch (config.approvalType) {
        case "single":
            return approvals.length >= 1;
        case "nOfM":
            return approved >= (config.requiredApprovals || 1) || rejected > 0;
        case "sequential":
            return approvals.length >= config.approvers.length || rejected > 0;
        default:
            return false;
    }
}

function determineFinalDecision(
    approvals: ApprovalDecision[],
    config: ApprovalGateNodeConfig
): "approved" | "rejected" | "escalated" {
    const approved = approvals.filter((a) => a.decision === "approved").length;
    const rejected = approvals.filter((a) => a.decision === "rejected").length;

    if (rejected > 0) return "rejected";

    switch (config.approvalType) {
        case "single":
            return approved >= 1 ? "approved" : "rejected";
        case "nOfM":
            return approved >= (config.requiredApprovals || 1) ? "approved" : "rejected";
        case "sequential":
            return approved >= config.approvers.length ? "approved" : "rejected";
        default:
            return "rejected";
    }
}

async function handleTimeout(
    config: ApprovalGateNodeConfig,
    request: { id: string }
): Promise<JsonObject> {
    switch (config.timeoutAction) {
        case "approve":
            return {
                approved: true,
                finalDecision: "approved",
                timedOut: true
            } as unknown as JsonObject;
        case "reject":
            return {
                approved: false,
                finalDecision: "rejected",
                timedOut: true
            } as unknown as JsonObject;
        case "escalate":
            // Send escalation notifications
            if (config.escalationChain?.length) {
                await sendEscalationNotifications(request.id, config.escalationChain);
            }
            return {
                approved: false,
                finalDecision: "escalated",
                timedOut: true
            } as unknown as JsonObject;
        default:
            return {
                approved: false,
                finalDecision: "rejected",
                timedOut: true
            } as unknown as JsonObject;
    }
}

async function createApprovalRequest(data: {
    executionId: string;
    nodeId: string;
    config: ApprovalGateNodeConfig;
    data: unknown;
}) {
    const result = await db.query(
        `
        INSERT INTO flowmaestro.approval_requests
        (execution_id, node_id, config, request_data, status)
        VALUES ($1, $2, $3, $4, 'pending')
        RETURNING *
    `,
        [data.executionId, data.nodeId, JSON.stringify(data.config), JSON.stringify(data.data)]
    );
    return result.rows[0];
}

async function updateApprovalRequest(id: string, updates: { status: string; completedAt: Date }) {
    await db.query(
        `
        UPDATE flowmaestro.approval_requests
        SET status = $1, completed_at = $2
        WHERE id = $3
    `,
        [updates.status, updates.completedAt, id]
    );
}

async function sendApprovalNotifications(request: { id: string }, config: ApprovalGateNodeConfig) {
    for (const channel of config.notificationChannels) {
        switch (channel) {
            case "email":
                // Integrate with email service
                break;
            case "slack":
                // Integrate with Slack
                break;
            case "in-app":
                await redisEventBus.publish("approvals:pending", {
                    type: "approval_required",
                    data: { requestId: request.id }
                });
                break;
        }
    }
}

async function sendEscalationNotifications(requestId: string, escalationChain: string[]) {
    // Send notifications to escalation chain
    for (const userId of escalationChain) {
        await redisEventBus.publish(`user:${userId}:notifications`, {
            type: "approval_escalation",
            data: { requestId }
        });
    }
}
```

### Audit Log Executor

```typescript
// backend/src/temporal/activities/node-executors/enterprise/audit-log-executor.ts
import type { JsonObject } from "@flowmaestro/shared";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "../../../storage/database";
import { executePIIRedactorNode } from "./pii-redactor-executor";
import type { AuditLogNodeConfig, AuditLogNodeResult } from "./types";

export async function executeAuditLogNode(
    config: AuditLogNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const timestamp = new Date();
    const logId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Extract fields to log
    let logData = extractFields(context, config.fieldsToLog);

    // Handle PII
    if (config.piiHandling === "redact") {
        const redactResult = await executePIIRedactorNode(
            {
                piiTypes: ["ssn", "creditCard", "phone", "email"],
                redactionStyle: "mask",
                recursive: true
            },
            { data: logData } as JsonObject
        );
        logData = (redactResult as { redacted: unknown }).redacted;
    } else if (config.piiHandling === "hash") {
        logData = hashPIIFields(logData);
    }

    const auditRecord = {
        logId,
        timestamp: timestamp.toISOString(),
        action: context.action as string,
        userId: context.userId as string,
        workflowId: context.workflowId as string,
        executionId: context.executionId as string,
        nodeId: context.nodeId as string,
        data: logData,
        metadata: {
            ip: context.ip,
            userAgent: context.userAgent
        }
    };

    const destinations: Record<string, boolean> = {};

    // Write to each destination
    for (const dest of config.destinations) {
        try {
            switch (dest) {
                case "database":
                    await writeToDatabase(auditRecord, config.retentionDays);
                    destinations.database = true;
                    break;
                case "s3":
                    await writeToS3(auditRecord, config.s3Config!);
                    destinations.s3 = true;
                    break;
                case "siem":
                    await writeToSIEM(auditRecord, config.siemConfig!);
                    destinations.siem = true;
                    break;
            }
        } catch (error) {
            console.error(`Failed to write audit log to ${dest}:`, error);
            destinations[dest] = false;
        }
    }

    const result: AuditLogNodeResult = {
        logId,
        success: Object.values(destinations).some(Boolean),
        destinations,
        timestamp
    };

    if (config.outputVariable) {
        return { [config.outputVariable]: result } as unknown as JsonObject;
    }
    return result as unknown as JsonObject;
}

function extractFields(context: JsonObject, fields: string[]): unknown {
    if (fields.length === 0 || fields.includes("*")) {
        return context;
    }

    const result: Record<string, unknown> = {};
    for (const field of fields) {
        const value = getNestedValue(context, field);
        if (value !== undefined) {
            result[field] = value;
        }
    }
    return result;
}

function getNestedValue(obj: JsonObject, path: string): unknown {
    return path.split(".").reduce((current, key) => {
        return current && typeof current === "object"
            ? (current as Record<string, unknown>)[key]
            : undefined;
    }, obj as unknown);
}

function hashPIIFields(data: unknown): unknown {
    // Hash known PII field names
    const piiFields = ["ssn", "social_security", "credit_card", "password", "secret"];
    const crypto = require("crypto");

    function hashValue(value: string): string {
        return crypto.createHash("sha256").update(value).digest("hex").substring(0, 16);
    }

    function processObject(obj: unknown): unknown {
        if (typeof obj !== "object" || obj === null) return obj;
        if (Array.isArray(obj)) return obj.map(processObject);

        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            if (piiFields.some((pii) => key.toLowerCase().includes(pii))) {
                result[key] = typeof value === "string" ? hashValue(value) : "[HASHED]";
            } else {
                result[key] = processObject(value);
            }
        }
        return result;
    }

    return processObject(data);
}

async function writeToDatabase(record: object, retentionDays?: number) {
    const expiresAt = retentionDays
        ? new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000)
        : null;

    await db.query(
        `
        INSERT INTO flowmaestro.audit_logs
        (id, data, expires_at)
        VALUES ($1, $2, $3)
    `,
        [(record as { logId: string }).logId, JSON.stringify(record), expiresAt]
    );
}

async function writeToS3(record: object, config: NonNullable<AuditLogNodeConfig["s3Config"]>) {
    const s3Client = new S3Client({ region: config.region });
    const key = `${config.prefix || "audit"}/${new Date().toISOString().split("T")[0]}/${(record as { logId: string }).logId}.json`;

    await s3Client.send(
        new PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            Body: JSON.stringify(record),
            ContentType: "application/json"
        })
    );
}

async function writeToSIEM(record: object, config: NonNullable<AuditLogNodeConfig["siemConfig"]>) {
    await fetch(config.endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(record)
    });
}
```

### PII Redactor Executor

```typescript
// backend/src/temporal/activities/node-executors/enterprise/pii-redactor-executor.ts
import type { JsonObject } from "@flowmaestro/shared";
import type { PIIRedactorNodeConfig, PIIRedactorNodeResult } from "./types";

// Built-in PII patterns
const PII_PATTERNS: Record<string, RegExp> = {
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    creditCard: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
    phone: /\b(?:\+?1[-.]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    address:
        /\b\d{1,5}\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct)\.?\b/gi,
    name: null, // Requires NER - placeholder
    dob: /\b(?:0?[1-9]|1[0-2])[-\/](?:0?[1-9]|[12]\d|3[01])[-\/](?:19|20)\d{2}\b/g
};

export async function executePIIRedactorNode(
    config: PIIRedactorNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const input = context.data;
    const piiFound: PIIRedactorNodeResult["piiFound"] = [];
    let redactionCount = 0;

    // Build pattern list
    const patterns: Array<{ name: string; pattern: RegExp; replacement: string }> = [];

    for (const piiType of config.piiTypes) {
        const pattern = PII_PATTERNS[piiType];
        if (pattern) {
            patterns.push({
                name: piiType,
                pattern: new RegExp(pattern.source, pattern.flags),
                replacement: getReplacementString(piiType, config)
            });
        }
    }

    // Add custom patterns
    if (config.customPatterns) {
        for (const custom of config.customPatterns) {
            patterns.push({
                name: custom.name,
                pattern: new RegExp(custom.pattern, "g"),
                replacement: custom.replacement
            });
        }
    }

    // Process input
    const redacted = processValue(input, patterns, piiFound, redactionCount, config);

    const result: PIIRedactorNodeResult = {
        redacted: redacted.value,
        piiFound,
        redactionCount: redacted.count
    };

    if (config.outputVariable) {
        return { [config.outputVariable]: result } as unknown as JsonObject;
    }
    return result as unknown as JsonObject;
}

function getReplacementString(piiType: string, config: PIIRedactorNodeConfig): string {
    switch (config.redactionStyle) {
        case "mask":
            const maskChar = config.maskCharacter || "*";
            return `[${piiType.toUpperCase()}]`;
        case "hash":
            return "[HASH]"; // Will be replaced with actual hash
        case "remove":
            return "";
        default:
            return `[${piiType.toUpperCase()}]`;
    }
}

function processValue(
    value: unknown,
    patterns: Array<{ name: string; pattern: RegExp; replacement: string }>,
    piiFound: PIIRedactorNodeResult["piiFound"],
    count: number,
    config: PIIRedactorNodeConfig
): { value: unknown; count: number } {
    if (typeof value === "string") {
        let result = value;
        let totalCount = count;

        for (const { name, pattern, replacement } of patterns) {
            const matches = result.match(pattern);
            if (matches && matches.length > 0) {
                // Check exceptions
                const filteredMatches = matches.filter((m) => !config.exceptions?.includes(m));

                if (filteredMatches.length > 0) {
                    // Track found PII
                    const existingEntry = piiFound.find((p) => p.type === name);
                    if (existingEntry) {
                        existingEntry.count += filteredMatches.length;
                    } else {
                        piiFound.push({ type: name, count: filteredMatches.length });
                    }

                    totalCount += filteredMatches.length;

                    // Apply redaction
                    if (config.redactionStyle === "hash") {
                        const crypto = require("crypto");
                        result = result.replace(pattern, (match) => {
                            if (config.exceptions?.includes(match)) return match;
                            return crypto
                                .createHash("sha256")
                                .update(match)
                                .digest("hex")
                                .substring(0, 8);
                        });
                    } else {
                        result = result.replace(pattern, (match) => {
                            if (config.exceptions?.includes(match)) return match;
                            return replacement;
                        });
                    }
                }
            }
        }

        return { value: result, count: totalCount };
    }

    if (Array.isArray(value) && config.recursive) {
        let totalCount = count;
        const result = value.map((item) => {
            const processed = processValue(item, patterns, piiFound, totalCount, config);
            totalCount = processed.count;
            return processed.value;
        });
        return { value: result, count: totalCount };
    }

    if (typeof value === "object" && value !== null && config.recursive) {
        let totalCount = count;
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
            const processed = processValue(val, patterns, piiFound, totalCount, config);
            totalCount = processed.count;
            result[key] = processed.value;
        }
        return { value: result, count: totalCount };
    }

    return { value, count };
}
```

### Encryption Node Executor

```typescript
// backend/src/temporal/activities/node-executors/enterprise/encryption-executor.ts
import crypto from "crypto";
import type { JsonObject } from "@flowmaestro/shared";
import {
    KMSClient,
    EncryptCommand,
    DecryptCommand,
    GenerateDataKeyCommand
} from "@aws-sdk/client-kms";
import type { EncryptionNodeConfig, EncryptionNodeResult } from "./types";

export async function executeEncryptionNode(
    config: EncryptionNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const data = context.data as string | object;
    const dataString = typeof data === "string" ? data : JSON.stringify(data);

    // Get encryption key
    const keyInfo = await getEncryptionKey(config);

    let result: EncryptionNodeResult;

    if (config.mode === "encrypt") {
        result = await encryptData(dataString, keyInfo, config);
    } else {
        result = await decryptData(dataString, keyInfo, config);
    }

    if (config.outputVariable) {
        return { [config.outputVariable]: result } as unknown as JsonObject;
    }
    return result as unknown as JsonObject;
}

interface KeyInfo {
    key: Buffer;
    keyId: string;
}

async function getEncryptionKey(config: EncryptionNodeConfig): Promise<KeyInfo> {
    switch (config.keySource) {
        case "kms":
            return await getKMSKey(config.keyId!);
        case "vault":
            return await getVaultKey(config.vaultPath!);
        case "environment":
            return getEnvironmentKey(config.environmentVar!);
        default:
            throw new Error(`Unsupported key source: ${config.keySource}`);
    }
}

async function getKMSKey(keyId: string): Promise<KeyInfo> {
    const kmsClient = new KMSClient({});

    // Generate a data key for envelope encryption
    const response = await kmsClient.send(
        new GenerateDataKeyCommand({
            KeyId: keyId,
            KeySpec: "AES_256"
        })
    );

    return {
        key: Buffer.from(response.Plaintext!),
        keyId
    };
}

async function getVaultKey(vaultPath: string): Promise<KeyInfo> {
    const vaultUrl = process.env.VAULT_URL;
    const vaultToken = process.env.VAULT_TOKEN;

    const response = await fetch(`${vaultUrl}/v1/${vaultPath}`, {
        headers: { "X-Vault-Token": vaultToken! }
    });

    if (!response.ok) {
        throw new Error(`Vault key retrieval failed: ${response.status}`);
    }

    const data = await response.json();
    return {
        key: Buffer.from(data.data.key, "base64"),
        keyId: vaultPath
    };
}

function getEnvironmentKey(envVar: string): KeyInfo {
    const keyValue = process.env[envVar];
    if (!keyValue) {
        throw new Error(`Environment variable ${envVar} not found`);
    }

    return {
        key: Buffer.from(keyValue, "base64"),
        keyId: envVar
    };
}

async function encryptData(
    data: string,
    keyInfo: KeyInfo,
    config: EncryptionNodeConfig
): Promise<EncryptionNodeResult> {
    const iv = crypto.randomBytes(16);
    const algorithm = config.algorithm === "aes-256-gcm" ? "aes-256-gcm" : "aes-256-cbc";

    const cipher = crypto.createCipheriv(algorithm, keyInfo.key, iv);

    if (config.additionalAuthenticatedData && algorithm === "aes-256-gcm") {
        (cipher as crypto.CipherGCM).setAAD(Buffer.from(config.additionalAuthenticatedData));
    }

    let encrypted = cipher.update(data, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const outputFormat = config.outputFormat || "base64";
    const result: EncryptionNodeResult = {
        result: encrypted.toString(outputFormat),
        keyId: keyInfo.keyId,
        algorithm,
        iv: iv.toString(outputFormat)
    };

    if (algorithm === "aes-256-gcm") {
        result.authTag = (cipher as crypto.CipherGCM).getAuthTag().toString(outputFormat);
    }

    return result;
}

async function decryptData(
    encryptedData: string,
    keyInfo: KeyInfo,
    config: EncryptionNodeConfig
): Promise<EncryptionNodeResult> {
    const inputFormat = config.outputFormat || "base64";
    const algorithm = config.algorithm === "aes-256-gcm" ? "aes-256-gcm" : "aes-256-cbc";

    // Parse input (expects JSON with encrypted, iv, authTag)
    const parsed = JSON.parse(encryptedData);
    const encrypted = Buffer.from(parsed.result, inputFormat);
    const iv = Buffer.from(parsed.iv, inputFormat);

    const decipher = crypto.createDecipheriv(algorithm, keyInfo.key, iv);

    if (algorithm === "aes-256-gcm" && parsed.authTag) {
        (decipher as crypto.DecipherGCM).setAuthTag(Buffer.from(parsed.authTag, inputFormat));
    }

    if (config.additionalAuthenticatedData && algorithm === "aes-256-gcm") {
        (decipher as crypto.DecipherGCM).setAAD(Buffer.from(config.additionalAuthenticatedData));
    }

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return {
        result: decrypted.toString("utf8"),
        keyId: keyInfo.keyId,
        algorithm
    };
}
```

---

## Migration: Approval Requests & Audit Logs Tables

```sql
-- backend/migrations/XXXXXXXXXX_create-enterprise-tables.sql

-- Approval requests table
CREATE TABLE IF NOT EXISTS flowmaestro.approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL,
    node_id VARCHAR(255) NOT NULL,
    config JSONB NOT NULL,
    request_data JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    approvals JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_approval_requests_execution ON flowmaestro.approval_requests(execution_id);
CREATE INDEX idx_approval_requests_status ON flowmaestro.approval_requests(status);

-- Audit logs table
CREATE TABLE IF NOT EXISTS flowmaestro.audit_logs (
    id VARCHAR(255) PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_audit_logs_created_at ON flowmaestro.audit_logs(created_at);
CREATE INDEX idx_audit_logs_expires_at ON flowmaestro.audit_logs(expires_at) WHERE expires_at IS NOT NULL;

-- Auto-delete expired audit logs (optional, run via cron)
-- DELETE FROM flowmaestro.audit_logs WHERE expires_at < NOW();
```

---

## Node Registration

```typescript
// Add to backend/src/shared/registry/node-registry.ts

{
    type: "approval-gate",
    name: "Approval Gate",
    description: "Pause workflow until human approval",
    category: "tools",
    subcategory: "enterprise",
    keywords: ["approval", "human", "review", "gate", "pause", "wait"],
    isEnterprise: true,
    inputs: [
        { name: "data", type: "any", required: false },
        { name: "request", type: "string", required: false }
    ],
    outputs: [
        { name: "approved", type: "boolean" },
        { name: "approver", type: "object" },
        { name: "comments", type: "string" }
    ],
    configSchema: { /* ApprovalGateNodeConfig schema */ }
},
{
    type: "audit-log",
    name: "Audit Log",
    description: "Write audit records for compliance",
    category: "tools",
    subcategory: "enterprise",
    keywords: ["audit", "log", "compliance", "record", "trail"],
    isEnterprise: true,
    inputs: [
        { name: "action", type: "string", required: true },
        { name: "data", type: "any", required: false }
    ],
    outputs: [
        { name: "logId", type: "string" },
        { name: "success", type: "boolean" }
    ],
    configSchema: { /* AuditLogNodeConfig schema */ }
},
{
    type: "pii-redactor",
    name: "PII Redactor",
    description: "Detect and mask personally identifiable information",
    category: "tools",
    subcategory: "enterprise",
    keywords: ["pii", "redact", "mask", "privacy", "gdpr", "sensitive"],
    isEnterprise: true,
    inputs: [{ name: "data", type: "any", required: true }],
    outputs: [
        { name: "redacted", type: "any" },
        { name: "piiFound", type: "array" },
        { name: "redactionCount", type: "number" }
    ],
    configSchema: { /* PIIRedactorNodeConfig schema */ }
},
{
    type: "encryption",
    name: "Encryption Node",
    description: "Encrypt or decrypt sensitive data using AES-256",
    category: "tools",
    subcategory: "enterprise",
    keywords: ["encrypt", "decrypt", "secure", "aes", "kms", "vault"],
    isEnterprise: true,
    inputs: [{ name: "data", type: "any", required: true }],
    outputs: [
        { name: "result", type: "string" },
        { name: "keyId", type: "string" }
    ],
    configSchema: { /* EncryptionNodeConfig schema */ }
}
```

---

## Unit Tests

### Test Pattern

**Pattern A/D (Mixed)**: PII detection is pure logic, Approval Gate requires mock services.

### Files to Create

| Executor     | Test File                                                                     | Pattern |
| ------------ | ----------------------------------------------------------------------------- | ------- |
| ApprovalGate | `backend/tests/unit/node-executors/governance/approval-gate-executor.test.ts` | C       |
| AuditLog     | `backend/tests/unit/node-executors/governance/audit-log-executor.test.ts`     | A + DB  |
| PIIRedactor  | `backend/tests/unit/node-executors/governance/pii-redactor-executor.test.ts`  | A       |
| Encryption   | `backend/tests/unit/node-executors/governance/encryption-executor.test.ts`    | A       |

### Required Test Cases

#### approval-gate-executor.test.ts

- `should pause workflow awaiting approval`
- `should notify configured approvers`
- `should resume on approval`
- `should reject on denial`
- `should timeout with default action`
- `should support multi-level approval`

#### audit-log-executor.test.ts

- `should log workflow actions to database`
- `should include timestamp and actor`
- `should capture before/after state`
- `should support compliance tags`
- `should be tamper-evident`

#### pii-redactor-executor.test.ts

- `should detect email addresses`
- `should detect phone numbers`
- `should detect SSN/tax IDs`
- `should detect credit card numbers`
- `should support custom patterns`
- `should preserve data structure while redacting`

#### encryption-executor.test.ts

- `should encrypt data with specified key`
- `should decrypt data with correct key`
- `should fail decryption with wrong key`
- `should support field-level encryption`
- `should handle key rotation`

---

## Test Workflow: GDPR-Compliant Processing

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│   Input     │───▶│ PII Redactor │───▶│ Audit Log   │───▶│ Encryption  │
│ (customer)  │    │              │    │ (redacted)  │    │ Node        │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
```

**Test Input**:

```json
{
    "name": "John Smith",
    "email": "john@example.com",
    "ssn": "123-45-6789",
    "notes": "Called from 555-123-4567"
}
```

**Expected After PII Redactor**:

```json
{
    "name": "[NAME]",
    "email": "[EMAIL]",
    "ssn": "[SSN]",
    "notes": "Called from [PHONE]"
}
```

---

## Files to Create

### Frontend Components

```
frontend/src/canvas/nodes/tools/enterprise/
├── ApprovalGateNode.tsx
├── AuditLogNode.tsx
├── PIIRedactorNode.tsx
├── EncryptionNode.tsx
├── config/
│   ├── ApprovalGateNodeConfig.tsx
│   ├── AuditLogNodeConfig.tsx
│   ├── PIIRedactorNodeConfig.tsx
│   └── EncryptionNodeConfig.tsx
└── index.ts
```

### Backend

```
backend/src/temporal/activities/node-executors/enterprise/
├── approval-gate-executor.ts
├── audit-log-executor.ts
├── pii-redactor-executor.ts
└── encryption-executor.ts

backend/src/services/enterprise/
├── approval-manager.ts
├── audit-logger.ts
├── pii-detector.ts
└── kms-client.ts
```

---

## How to Deliver

1. Register all 4 nodes in `node-registry.ts` with `isEnterprise: true`
2. Create approval workflow UI (pending approvals list)
3. Set up audit log destinations
4. Implement PII detection patterns
5. Integrate with KMS for encryption keys
6. Create frontend node components
7. Add "Enterprise" badge styling
8. Test compliance scenarios

---

## How to Test

| Test                 | Expected Result               |
| -------------------- | ----------------------------- |
| Approval single user | Pauses until approved         |
| Approval 2 of 3      | Continues after 2 approvals   |
| Approval timeout     | Takes timeout action          |
| Audit log write      | Record created in destination |
| PII detect SSN       | SSN masked as [SSN]           |
| PII custom pattern   | Custom regex detected         |
| Encrypt data         | Returns encrypted blob        |
| Decrypt data         | Returns original data         |

### Integration Tests

```typescript
describe("Approval Gate", () => {
    it("pauses for approval", async () => {
        const execution = await startWorkflow(approvalWorkflow);
        expect(execution.status).toBe("waiting_approval");

        await submitApproval(execution.id, {
            approved: true,
            approver: "user@company.com"
        });

        const result = await waitForCompletion(execution.id);
        expect(result.approved).toBe(true);
    });
});

describe("PII Redactor", () => {
    it("redacts SSN", async () => {
        const result = await executePIIRedactor({
            data: "My SSN is 123-45-6789"
        });
        expect(result.redacted).toBe("My SSN is [SSN]");
        expect(result.piiFound).toContain("ssn");
    });
});
```

---

## Acceptance Criteria

- [ ] Approval Gate pauses workflow
- [ ] Approval Gate sends notifications
- [ ] Approval Gate supports multiple approvers
- [ ] Approval Gate handles timeout/escalation
- [ ] Approval Gate records decision with timestamp
- [ ] Audit Log writes to database
- [ ] Audit Log writes to S3 (optional)
- [ ] Audit Log includes all specified fields
- [ ] PII Redactor detects SSN, credit cards, phones, emails
- [ ] PII Redactor supports custom regex patterns
- [ ] PII Redactor preserves data structure
- [ ] Encryption Node encrypts with AES-256-GCM
- [ ] Encryption Node integrates with KMS
- [ ] All nodes show "Enterprise" badge

---

## Enterprise Feature Gating

These nodes should be:

- Visible to all users (with Enterprise badge)
- Usable only on Enterprise plans
- Show upgrade prompt for non-enterprise users

---

## Dependencies

These nodes enable SOC2/GDPR compliant workflows.
