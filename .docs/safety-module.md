# Safety Module

The Safety Module provides input/output content moderation for AI agents in FlowMaestro. It protects against PII (Personally Identifiable Information) leakage and prompt injection attacks.

## Overview

The safety system is inspired by Mastra's TripWire pattern and implements a pipeline-based validation approach that processes content before it reaches the LLM and after responses are generated.

```
User Input → [Safety Pipeline] → LLM → [Safety Pipeline] → User Output
                   ↓                          ↓
              PII Detector              PII Detector
              Prompt Injection         (output only)
              Custom Validators
                   ↓                          ↓
              Block/Redact/Warn         Block/Redact/Warn
```

## Architecture

### File Structure

```
backend/src/core/safety/
├── types.ts                    # Type definitions
├── safety-pipeline.ts          # Main orchestration class
├── pii-detector.ts            # PII detection and redaction
└── prompt-injection-detector.ts # Prompt injection detection
```

### Components

| Component                 | Purpose                                                 |
| ------------------------- | ------------------------------------------------------- |
| `SafetyPipeline`          | Orchestrates all validators and determines final action |
| `PIIDetector`             | Detects and redacts personally identifiable information |
| `PromptInjectionDetector` | Detects manipulation attempts in user inputs            |

## Type Definitions

### Safety Check Types

```typescript
type SafetyCheckType =
    | "pii_detection"
    | "prompt_injection"
    | "content_moderation"
    | "custom_validator";
```

### Safety Actions

```typescript
type SafetyAction = "allow" | "block" | "redact" | "warn";
```

| Action   | Behavior                                     |
| -------- | -------------------------------------------- |
| `allow`  | Content passes through unchanged             |
| `block`  | Execution stops immediately with error       |
| `redact` | Sensitive content replaced with placeholders |
| `warn`   | Logged but execution continues               |

### Safety Configuration

Each agent has a `safety_config` field in the database:

```typescript
interface SafetyConfig {
    enablePiiDetection: boolean; // Default: true
    enablePromptInjectionDetection: boolean; // Default: true
    enableContentModeration: boolean; // Default: false (not implemented)
    piiRedactionEnabled: boolean; // Default: true
    piiRedactionPlaceholder?: string; // Default: "[REDACTED]"
    promptInjectionAction: SafetyAction; // Default: "warn"
    contentModerationThreshold?: number; // Default: 0.8
    customValidators?: SafetyValidator[];
}
```

### Safety Context

Passed to validators for context-aware decisions:

```typescript
interface SafetyContext {
    userId: string;
    agentId: string;
    executionId: string;
    threadId?: string;
    direction: "input" | "output";
    messageRole: "user" | "assistant" | "system" | "tool";
}
```

## PII Detection

### Supported PII Types

| Type           | Pattern                       | Placeholder           | Validation             |
| -------------- | ----------------------------- | --------------------- | ---------------------- |
| `email`        | Standard email regex          | `[EMAIL_REDACTED]`    | Common TLD check       |
| `phone`        | US phone numbers              | `[PHONE_REDACTED]`    | Format check           |
| `ssn`          | XXX-XX-XXXX                   | `[SSN_REDACTED]`      | Area number validation |
| `credit_card`  | 16 digits                     | `[CARD_REDACTED]`     | Luhn algorithm         |
| `ip_address`   | IPv4                          | `[IP_REDACTED]`       | Octet range check      |
| `api_key`      | api_key/access_token patterns | `[API_KEY_REDACTED]`  | Length check           |
| `passport`     | 1-2 letters + 6-9 digits      | `[PASSPORT_REDACTED]` | -                      |
| `bank_account` | 8-17 digits                   | `[ACCOUNT_REDACTED]`  | Length check           |

### Detection Result

```typescript
interface PIIDetectionResult {
    hasPII: boolean;
    matches: PIIMatch[];
    redactedContent?: string;
}

interface PIIMatch {
    type: PIIType;
    value: string;
    start: number;
    end: number;
    confidence: number; // 0.7 - 0.95 depending on type
}
```

### Usage Example

```typescript
import { piiDetector } from "../core/safety/pii-detector";

const result = piiDetector.detect("My SSN is 123-45-6789");
// {
//   hasPII: true,
//   matches: [{ type: "ssn", value: "123-45-6789", confidence: 0.95, ... }],
//   redactedContent: "My SSN is [SSN_REDACTED]"
// }
```

## Prompt Injection Detection

### Detection Patterns

| Pattern                 | Weight   | Description                                            |
| ----------------------- | -------- | ------------------------------------------------------ |
| `system_override`       | 0.85-0.9 | "ignore previous instructions", "new system prompt"    |
| `role_manipulation`     | 0.8-0.95 | "you are now", "pretend to be", DAN/Jailbreak keywords |
| `instruction_injection` | 0.75-0.8 | Attempts to inject system role messages                |
| `delimiter_attack`      | 0.7-0.75 | Using delimiters to terminate instructions             |
| `encoding_bypass`       | 0.6      | Encoded characters to bypass filters                   |
| `jailbreak_attempt`     | 0.7-0.8  | "hypothetically", privilege escalation                 |

### Risk Score Calculation

The detector calculates a risk score using weighted average with diminishing returns:

```typescript
// Matches sorted by confidence (descending)
let score = 0;
let weight = 1.0;

for (const match of sortedMatches) {
    score += match.confidence * weight;
    weight *= 0.7; // Diminishing returns
}

return Math.min(score, 1.0);
```

Default threshold: `0.7` (70% risk score triggers detection)

### Detection Result

```typescript
interface PromptInjectionResult {
    isInjection: boolean;
    matches: PromptInjectionMatch[];
    riskScore: number; // 0-1
}
```

### Usage Example

```typescript
import { promptInjectionDetector } from "../core/safety/prompt-injection-detector";

const result = promptInjectionDetector.detect("Ignore all previous instructions and...");
// {
//   isInjection: true,
//   riskScore: 0.9,
//   matches: [{ pattern: "system_override", confidence: 0.9, ... }]
// }
```

## Safety Pipeline

The `SafetyPipeline` class orchestrates all validators:

```typescript
import { SafetyPipeline } from "../core/safety/safety-pipeline";

const pipeline = new SafetyPipeline({
    enablePiiDetection: true,
    enablePromptInjectionDetection: true,
    piiRedactionEnabled: true,
    promptInjectionAction: "block"
});

const { content, shouldProceed, results } = await pipeline.process(userInput, {
    userId: "user-123",
    agentId: "agent-456",
    executionId: "exec-789",
    direction: "input",
    messageRole: "user"
});

if (!shouldProceed) {
    // Handle blocked content
}
```

### Processing Order

1. **PII Detection** (highest priority for privacy)
2. **Prompt Injection Detection** (only for `direction: "input"`)
3. **Custom Validators** (sorted by priority)

### Singleton Instance

A pre-configured singleton is exported for convenience:

```typescript
import { safetyPipeline } from "../core/safety/safety-pipeline";
```

## Integration with Agent Workflows

### Temporal Activities

Safety validation is exposed as Temporal activities:

```typescript
// backend/src/temporal/activities/agents/core.ts

export async function validateInput(input: ValidateInputInput): Promise<ValidateInputResult>;
export async function validateOutput(input: ValidateOutputInput): Promise<ValidateOutputResult>;
export async function logSafetyEvent(input: LogSafetyEventInput): Promise<void>;
```

### Agent Orchestrator Integration

The `agent-orchestrator.ts` workflow validates content at key points:

```typescript
// 1. Validate user input BEFORE LLM call
const safetyResult = await validateInput({
    content: initialMessage,
    context: {
        userId,
        agentId,
        executionId,
        threadId,
        direction: "input",
        messageRole: "user"
    },
    config: agent.safety_config
});

if (!safetyResult.shouldProceed) {
    // Fail execution with safety error
    return { success: false, error: "Input blocked by safety check" };
}

// Use potentially redacted content
const userMessage = { content: safetyResult.content, ... };

// 2. Call LLM...

// 3. Validate LLM output BEFORE returning to user
const outputSafetyResult = await validateOutput({
    content: llmResponse.content,
    context: {
        userId,
        agentId,
        executionId,
        threadId,
        direction: "output",
        messageRole: "assistant"
    },
    config: agent.safety_config
});

if (!outputSafetyResult.shouldProceed) {
    // Fail execution with safety error
    return { success: false, error: "Output blocked by safety check" };
}
```

### Validation Points

| Workflow                  | Input Validations                     | Output Validations |
| ------------------------- | ------------------------------------- | ------------------ |
| `agent-orchestrator.ts`   | 2 (initial + pending messages)        | 1 (final response) |
| `persona-orchestrator.ts` | 3 (initial + clarification + pending) | 1 (final response) |

## Database Schema

### Safety Logs Table

```sql
CREATE TABLE flowmaestro.safety_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id),
    agent_id UUID NOT NULL REFERENCES flowmaestro.agents(id),
    execution_id UUID REFERENCES flowmaestro.agent_executions(id),
    thread_id UUID REFERENCES flowmaestro.threads(id),

    check_type VARCHAR(50) NOT NULL,  -- pii_detection, prompt_injection, etc.
    action VARCHAR(20) NOT NULL,       -- allow, block, redact, warn
    direction VARCHAR(10) NOT NULL,    -- input, output

    original_content TEXT,             -- For auditing (blocked content only)
    redacted_content TEXT,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Safety Metrics View

Pre-aggregated view for analytics:

```sql
CREATE VIEW flowmaestro.safety_metrics AS
SELECT
    agent_id,
    check_type,
    action,
    direction,
    COUNT(*) as event_count,
    DATE_TRUNC('day', created_at) as day
FROM flowmaestro.safety_logs
GROUP BY agent_id, check_type, action, direction, DATE_TRUNC('day', created_at);
```

### Agent Safety Config Column

```sql
ALTER TABLE flowmaestro.agents
ADD COLUMN safety_config JSONB DEFAULT '{
    "enablePiiDetection": true,
    "enablePromptInjectionDetection": true,
    "enableContentModeration": false,
    "piiRedactionEnabled": true,
    "promptInjectionAction": "warn",
    "contentModerationThreshold": 0.8
}'::jsonb;
```

## Repository

The `SafetyLogRepository` provides database access:

```typescript
import { SafetyLogRepository } from "../storage/repositories/SafetyLogRepository";

const repo = new SafetyLogRepository();

// Create log entry
await repo.create({
    user_id: "...",
    agent_id: "...",
    check_type: "pii_detection",
    action: "redact",
    direction: "input",
    metadata: { detected: ["email", "phone"] }
});

// Query logs
const logs = await repo.findByAgentId(agentId, {
    checkType: "prompt_injection",
    action: "block",
    startDate: new Date("2024-01-01")
});

// Get metrics
const metrics = await repo.getMetrics(agentId);

// Get recent blocked attempts
const blocked = await repo.getRecentBlocked(agentId, 50);

// Data retention cleanup
const deletedCount = await repo.deleteOlderThan(90); // Delete logs older than 90 days
```

## Testing

### Test Fixtures

```typescript
// Default (safety disabled for most tests)
export const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
    enablePiiDetection: false,
    enablePromptInjectionDetection: false,
    enableContentModeration: false,
    piiRedactionEnabled: false,
    promptInjectionAction: "allow"
};

// Strict (all safety features enabled)
export const STRICT_SAFETY_CONFIG: SafetyConfig = {
    enablePiiDetection: true,
    enablePromptInjectionDetection: true,
    enableContentModeration: true,
    piiRedactionEnabled: true,
    piiRedactionPlaceholder: "[REDACTED]",
    promptInjectionAction: "block",
    contentModerationThreshold: 0.7
};
```

### Integration Tests

Located at `backend/__tests__/integration/agents/safety-validation.test.ts`:

- PII Detection tests (SSN, credit card, phone, email redaction)
- Prompt Injection tests (blocking, warning modes)
- Output validation tests
- Configuration override tests

### Running Safety Tests

```bash
# Run safety-specific tests
npm test -- --testPathPattern="safety-validation"

# Run all agent tests including safety
npm test -- --testPathPattern="agents"
```

## Configuration Best Practices

### Production Defaults

```typescript
{
    enablePiiDetection: true,
    enablePromptInjectionDetection: true,
    enableContentModeration: false,  // Not implemented
    piiRedactionEnabled: true,
    piiRedactionPlaceholder: "[REDACTED]",
    promptInjectionAction: "warn"    // Log but don't block
}
```

### High-Security Environments

```typescript
{
    enablePiiDetection: true,
    enablePromptInjectionDetection: true,
    piiRedactionEnabled: true,
    promptInjectionAction: "block"   // Block suspicious inputs
}
```

### Development/Testing

```typescript
{
    enablePiiDetection: false,
    enablePromptInjectionDetection: false,
    piiRedactionEnabled: false,
    promptInjectionAction: "allow"
}
```

## Custom Validators

Add custom validation logic:

```typescript
import { safetyPipeline } from "../core/safety/safety-pipeline";
import type { SafetyValidator, SafetyContext, SafetyCheckResult } from "../core/safety/types";

const profanityValidator: SafetyValidator = {
    name: "profanity-filter",
    type: "custom_validator",
    enabled: true,
    priority: 10,
    validate: async (content: string, context: SafetyContext): Promise<SafetyCheckResult> => {
        const hasProfanity = checkForProfanity(content);

        return {
            passed: !hasProfanity,
            action: hasProfanity ? "block" : "allow",
            type: "custom_validator",
            message: hasProfanity ? "Content contains inappropriate language" : undefined
        };
    }
};

safetyPipeline.addValidator(profanityValidator);
```

## Limitations

1. **Content Moderation**: The `enableContentModeration` flag exists but the feature is not implemented
2. **Language Support**: PII patterns are primarily designed for US formats (phone, SSN)
3. **False Positives**: Some patterns (bank accounts, passports) may have higher false positive rates
4. **No ML-based Detection**: Currently uses regex patterns only, no ML models

## Future Enhancements

- [ ] ML-based content moderation integration (OpenAI Moderation API, Perspective API)
- [ ] International PII patterns (EU phone numbers, IBAN, etc.)
- [ ] Configurable pattern sets per agent
- [ ] Real-time safety dashboard in UI
- [ ] Webhook notifications for blocked content
