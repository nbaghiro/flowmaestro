# Profile & Security Editing - Complete Implementation Specification

**Status:** Ready for Implementation
**Assignee:** TBD
**Estimated Effort:** 3-5 days
**Last Updated:** 2025-12-01

---

## Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [API Contracts](#api-contracts)
8. [Security Considerations](#security-considerations)
9. [Testing Guide](#testing-guide)
10. [Deployment](#deployment)

---

## Overview

### Goal

Implement full editing functionality for the Profile & Security panels in the FlowMaestro Account page, enabling users to:

- Update their name and email address
- Set or change their password
- Enable SMS-based two-factor authentication (2FA) via Twilio
- Disable 2FA when needed
- Manage OAuth connections (existing functionality, no changes)

### Current State

The Account page (`frontend/src/pages/Account.tsx`) currently displays user information statically with non-functional "Edit" buttons. Users cannot modify their profile or security settings.

### Scope

- **In Scope:**
    - Name editing
    - Email editing with verification flow
    - Password setting/changing
    - SMS 2FA setup with Twilio
    - 2FA disable with password verification
    - Backup code generation and management
    - Email notifications for all security changes

- **Out of Scope:**
    - TOTP/Authenticator app support (future enhancement)
    - OAuth account unlinking changes (already implemented)
    - Password strength meter (future enhancement)
    - Session management UI (future enhancement)

### File Changes

- **Create:** 28 new files
- **Modify:** 9 existing files
- **Total:** 37 files

---

## Requirements

### Business Requirements

1. **Name Editing**
    - Users can change their display name at any time
    - No verification required
    - Email notification sent after change

2. **Email Editing**
    - **Hybrid approach:** Only users with a password can change email (blocks OAuth-only users)
    - Requires email verification via link sent to new address
    - Notifications sent to both old and new email addresses
    - Email must be unique (not already in use)

3. **Password Management**
    - OAuth-only users can **set** a password (no current password required)
    - Users with existing passwords must **change** password (current password required)
    - Minimum 8 characters, no other complexity requirements
    - Email notification sent after change

4. **Two-Factor Authentication**
    - **Optional:** Users can choose to enable or disable
    - SMS-based using Twilio
    - 6-digit verification codes
    - 8 backup codes generated upon setup
    - Requires password to disable
    - Email notifications for enable/disable

### Technical Requirements

- **SMS Provider:** Twilio
- **Password Rules:** 8+ characters minimum (existing rule)
- **2FA Enforcement:** Optional (users decide)
- **Email Changes:** Hybrid approach (only if user has password)
- **Code Style:** Follow FlowMaestro CLAUDE.md guidelines
    - 4 spaces indentation
    - Double quotes
    - No `any` types
    - Custom Dialog components (no browser alerts)
    - Native fetch API (not axios)
    - Fastify backend patterns
    - TanStack Query for server state

---

## Architecture

### System Components

```
┌───────────────────────────────────────────────────────────┐
│                         Frontend                          │
│  ┌───────────────────────────────────────────────────┐    │
│  │  Account Page (Account.tsx)                       │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │    │
│  │  │ EditName     │ │ EditEmail    │ │ ChangePwd  │ │    │
│  │  │ Dialog       │ │ Dialog       │ │ Dialog     │ │    │
│  │  └──────────────┘ └──────────────┘ └────────────┘ │    │
│  │  ┌──────────────┐ ┌──────────────┐                │    │
│  │  │ Enable2FA    │ │ Disable2FA   │                │    │
│  │  │ Dialog       │ │ Dialog       │                │    │
│  │  └──────────────┘ └──────────────┘                │    │
│  └───────────────────────────────────────────────────┘    │
│                           │                               │
│                           │ TanStack Query Mutations      │
│                           ▼                               │
│  ┌────────────────────────────────────────────────────┐   │
│  │           API Client (lib/api.ts)                  │   │
│  │  - updateName()       - enableTwoFactor()          │   │
│  │  - updateEmail()      - verifyTwoFactorPhone()     │   │
│  │  - updatePassword()   - disableTwoFactor()         │   │
│  └────────────────────────────────────────────────────┘   │
└───────────────────────┬───────────────────────────────────┘
                        │ HTTPS / Native Fetch
                        ▼
┌────────────────────────────────────────────────────────────┐
│                      Backend (Fastify)                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Profile Routes        │  2FA Routes               │    │
│  │  /api/profile/name     │  /api/two-factor/enable   │    │
│  │  /api/profile/email    │  /api/two-factor/verify   │    │
│  │  /api/profile/password │  /api/two-factor/disable  │    │
│  └────────────────────────────────────────────────────┘    │
│                           │                                │
│                           ▼                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Repositories                                      │    │
│  │  - UserRepository                                  │    │
│  │  - TwoFactorTokenRepository                        │    │
│  │  - TwoFactorBackupCodeRepository                   │    │
│  └────────────────────────────────────────────────────┘    │
│                           │                                │
│                           ▼                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Services                                          │    │
│  │  - EmailService (Resend)  - SmsService (Twilio)    │    │
│  └────────────────────────────────────────────────────┘    │
└───────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                    │
│  - users (add 2FA columns)                                  │
│  - two_factor_tokens (new)                                  │
│  - two_factor_backup_codes (new)                            │
│  - email_verification_tokens (existing - reuse pattern)     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Example: Enable 2FA

1. User enters phone number in EnableTwoFactorDialog
2. Frontend calls `api.enableTwoFactor(phone)`
3. Backend `/api/two-factor/enable`:
    - Validates phone (E.164 format)
    - Generates 6-digit code
    - Hashes code with SHA-256
    - Stores in `two_factor_tokens` table
    - Updates user with pending phone number
    - Sends SMS via Twilio
4. User receives SMS, enters code in dialog
5. Frontend calls `api.verifyTwoFactorPhone(code)`
6. Backend `/api/two-factor/verify-phone`:
    - Hashes submitted code
    - Finds matching token
    - Validates attempts < 3 and not expired
    - Generates 8 backup codes
    - Hashes and stores backup codes
    - Marks 2FA as enabled
    - Returns backup codes to frontend (only time shown)
7. Dialog shows backup codes with download option
8. User downloads/copies codes and closes dialog

---

## Database Schema

### Migration File

**File:** `backend/migrations/1730000000026_add-two-factor-auth.sql`

```sql
-- Add two-factor authentication support to users table
ALTER TABLE users
    ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN two_factor_phone VARCHAR(20),
    ADD COLUMN two_factor_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN two_factor_secret VARCHAR(255); -- Reserved for TOTP future enhancement

-- Add indexes for 2FA fields
CREATE INDEX idx_users_two_factor_enabled ON users(two_factor_enabled);
CREATE INDEX idx_users_two_factor_phone ON users(two_factor_phone);

-- Table for storing hashed 2FA verification codes (SMS)
CREATE TABLE two_factor_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of 6-digit code
    expires_at TIMESTAMP NOT NULL,   -- 5-minute expiry
    attempts INTEGER NOT NULL DEFAULT 0, -- Max 3 attempts
    verified_at TIMESTAMP,           -- NULL until verified
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),          -- IPv4 or IPv6
    user_agent TEXT
);

-- Indexes for two_factor_tokens
CREATE INDEX idx_two_factor_tokens_user_id ON two_factor_tokens(user_id);
CREATE INDEX idx_two_factor_tokens_code_hash ON two_factor_tokens(code_hash);
CREATE INDEX idx_two_factor_tokens_expires_at ON two_factor_tokens(expires_at);

-- Table for storing hashed backup codes
CREATE TABLE two_factor_backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of backup code
    used_at TIMESTAMP,              -- NULL until used
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for two_factor_backup_codes
CREATE INDEX idx_two_factor_backup_codes_user_id ON two_factor_backup_codes(user_id);
CREATE INDEX idx_two_factor_backup_codes_code_hash ON two_factor_backup_codes(code_hash);

-- Comments for documentation
COMMENT ON COLUMN users.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN users.two_factor_phone IS 'Phone number for SMS 2FA (E.164 format)';
COMMENT ON COLUMN users.two_factor_phone_verified IS 'Whether the phone number has been verified';
COMMENT ON COLUMN users.two_factor_secret IS 'TOTP secret for authenticator apps (future use)';
COMMENT ON TABLE two_factor_tokens IS 'Temporary tokens for SMS 2FA verification (5-minute expiry)';
COMMENT ON TABLE two_factor_backup_codes IS 'Single-use backup codes for 2FA recovery';
```

### Schema Diagram

```
users
├── id (UUID, PK)
├── email (VARCHAR 255, UNIQUE)
├── password_hash (VARCHAR 255, nullable)
├── name (VARCHAR 255, nullable)
├── google_id (VARCHAR 255, UNIQUE, nullable)
├── microsoft_id (VARCHAR 255, UNIQUE, nullable)
├── auth_provider (VARCHAR 50, DEFAULT 'local')
├── avatar_url (TEXT, nullable)
├── email_verified (BOOLEAN, DEFAULT FALSE)
├── email_verified_at (TIMESTAMP, nullable)
├── two_factor_enabled (BOOLEAN, DEFAULT FALSE) ◄── NEW
├── two_factor_phone (VARCHAR 20, nullable)      ◄── NEW
├── two_factor_phone_verified (BOOLEAN, DEFAULT FALSE) ◄── NEW
├── two_factor_secret (VARCHAR 255, nullable)    ◄── NEW (reserved)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── last_login_at (TIMESTAMP, nullable)

two_factor_tokens (NEW TABLE)
├── id (UUID, PK)
├── user_id (UUID, FK → users.id)
├── code_hash (VARCHAR 64) -- SHA-256
├── expires_at (TIMESTAMP) -- 5 minutes
├── attempts (INTEGER, DEFAULT 0)
├── verified_at (TIMESTAMP, nullable)
├── created_at (TIMESTAMP)
├── ip_address (VARCHAR 45, nullable)
└── user_agent (TEXT, nullable)

two_factor_backup_codes (NEW TABLE)
├── id (UUID, PK)
├── user_id (UUID, FK → users.id)
├── code_hash (VARCHAR 64) -- SHA-256
├── used_at (TIMESTAMP, nullable)
└── created_at (TIMESTAMP)
```

---

## Backend Implementation

### Phase 1: Models

#### File: `backend/src/storage/models/TwoFactorToken.ts`

```typescript
export interface TwoFactorTokenModel {
    id: string;
    user_id: string;
    code_hash: string;
    expires_at: Date;
    attempts: number;
    verified_at: Date | null;
    created_at: Date;
    ip_address: string | null;
    user_agent: string | null;
}

export interface CreateTwoFactorTokenInput {
    user_id: string;
    code_hash: string;
    expires_at: Date;
    ip_address?: string;
    user_agent?: string;
}
```

#### File: `backend/src/storage/models/TwoFactorBackupCode.ts`

```typescript
export interface TwoFactorBackupCodeModel {
    id: string;
    user_id: string;
    code_hash: string;
    used_at: Date | null;
    created_at: Date;
}

export interface CreateTwoFactorBackupCodeInput {
    user_id: string;
    code_hash: string;
}
```

#### File: `backend/src/storage/models/User.ts` (MODIFY)

Add to the `UserModel` interface:

```typescript
export interface UserModel {
    // ... existing fields ...
    two_factor_enabled: boolean;
    two_factor_phone: string | null;
    two_factor_phone_verified: boolean;
    two_factor_secret: string | null;
}
```

Add to `UpdateUserInput`:

```typescript
export interface UpdateUserInput {
    // ... existing fields ...
    two_factor_enabled?: boolean;
    two_factor_phone?: string | null;
    two_factor_phone_verified?: boolean;
}
```

### Phase 2: Utilities

#### File: `backend/src/core/utils/two-factor.ts` (NEW)

```typescript
import crypto from "crypto";

/**
 * Generate a cryptographically secure 6-digit code
 */
export function generateCode(): string {
    // Generate random number between 0 and 999999
    const buffer = crypto.randomBytes(4);
    const num = buffer.readUInt32BE(0) % 1000000;
    return num.toString().padStart(6, "0");
}

/**
 * Hash a 2FA code with SHA-256
 */
export function hashCode(code: string): string {
    return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Generate 8 backup codes in XXXX-XXXX-XXXX format
 */
export function generateBackupCodes(): string[] {
    const codes: string[] = [];

    for (let i = 0; i < 8; i++) {
        // Generate 12 alphanumeric characters
        const buffer = crypto.randomBytes(9); // 9 bytes = 12 chars base64
        const code = buffer
            .toString("base64")
            .replace(/[^A-Z0-9]/gi, "")
            .substring(0, 12)
            .toUpperCase();

        // Format as XXXX-XXXX-XXXX
        const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
        codes.push(formatted);
    }

    return codes;
}

/**
 * Normalize and hash a backup code for storage/lookup
 * Removes hyphens and converts to uppercase before hashing
 */
export function normalizeAndHashBackupCode(code: string): string {
    const normalized = code.replace(/-/g, "").toUpperCase();
    return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Validate phone number is in E.164 format
 * Format: +[country code][number] (e.g., +14155552671)
 */
export function validatePhoneNumber(phone: string): boolean {
    // E.164 format: + followed by 1-15 digits
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
}

/**
 * Format phone number for display (masks middle digits)
 * Example: +14155552671 -> +1 (415) ***-2671
 */
export function formatPhoneNumber(phone: string): string {
    if (!phone || phone.length < 8) return phone;

    // For US numbers (+1XXXXXXXXXX)
    if (phone.startsWith("+1") && phone.length === 12) {
        const areaCode = phone.slice(2, 5);
        const lastFour = phone.slice(-4);
        return `+1 (${areaCode}) ***-${lastFour}`;
    }

    // For other numbers, just show last 4 digits
    const lastFour = phone.slice(-4);
    const prefix = phone.slice(0, -4).replace(/\d/g, "*");
    return `${prefix}${lastFour}`;
}
```

#### File: `backend/src/shared/config/index.ts` (MODIFY)

Add Twilio configuration:

```typescript
export const config = {
    // ... existing config ...

    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || "",
        authToken: process.env.TWILIO_AUTH_TOKEN || "",
        fromPhone: process.env.TWILIO_FROM_PHONE || ""
    }
};
```

### Phase 3: Repositories

#### File: `backend/src/storage/repositories/TwoFactorTokenRepository.ts` (NEW)

```typescript
import { pool } from "../database";
import type { TwoFactorTokenModel, CreateTwoFactorTokenInput } from "../models/TwoFactorToken";

export class TwoFactorTokenRepository {
    async create(input: CreateTwoFactorTokenInput): Promise<TwoFactorTokenModel> {
        const result = await pool.query<TwoFactorTokenModel>(
            `INSERT INTO two_factor_tokens
             (user_id, code_hash, expires_at, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                input.user_id,
                input.code_hash,
                input.expires_at,
                input.ip_address || null,
                input.user_agent || null
            ]
        );

        return result.rows[0];
    }

    async findLatestByUserId(userId: string): Promise<TwoFactorTokenModel | null> {
        const result = await pool.query<TwoFactorTokenModel>(
            `SELECT * FROM two_factor_tokens
             WHERE user_id = $1
             AND verified_at IS NULL
             AND expires_at > NOW()
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId]
        );

        return result.rows[0] || null;
    }

    async incrementAttempts(id: string): Promise<void> {
        await pool.query(
            `UPDATE two_factor_tokens
             SET attempts = attempts + 1
             WHERE id = $1`,
            [id]
        );
    }

    async markAsVerified(id: string): Promise<void> {
        await pool.query(
            `UPDATE two_factor_tokens
             SET verified_at = NOW()
             WHERE id = $1`,
            [id]
        );
    }

    async invalidateAllForUser(userId: string): Promise<void> {
        await pool.query(
            `UPDATE two_factor_tokens
             SET verified_at = NOW()
             WHERE user_id = $1
             AND verified_at IS NULL`,
            [userId]
        );
    }

    async deleteExpired(): Promise<number> {
        const result = await pool.query(
            `DELETE FROM two_factor_tokens
             WHERE expires_at < NOW() - INTERVAL '1 day'`
        );

        return result.rowCount || 0;
    }
}
```

#### File: `backend/src/storage/repositories/TwoFactorBackupCodeRepository.ts` (NEW)

```typescript
import { pool } from "../database";
import type {
    TwoFactorBackupCodeModel,
    CreateTwoFactorBackupCodeInput
} from "../models/TwoFactorBackupCode";

export class TwoFactorBackupCodeRepository {
    async createBatch(userId: string, codeHashes: string[]): Promise<TwoFactorBackupCodeModel[]> {
        const values = codeHashes.map((hash, index) => `($1, $${index + 2})`).join(", ");

        const result = await pool.query<TwoFactorBackupCodeModel>(
            `INSERT INTO two_factor_backup_codes (user_id, code_hash)
             VALUES ${values}
             RETURNING *`,
            [userId, ...codeHashes]
        );

        return result.rows;
    }

    async findByCodeHash(codeHash: string): Promise<TwoFactorBackupCodeModel | null> {
        const result = await pool.query<TwoFactorBackupCodeModel>(
            `SELECT * FROM two_factor_backup_codes
             WHERE code_hash = $1
             AND used_at IS NULL`,
            [codeHash]
        );

        return result.rows[0] || null;
    }

    async markAsUsed(id: string): Promise<void> {
        await pool.query(
            `UPDATE two_factor_backup_codes
             SET used_at = NOW()
             WHERE id = $1`,
            [id]
        );
    }

    async countUnusedForUser(userId: string): Promise<number> {
        const result = await pool.query<{ count: string }>(
            `SELECT COUNT(*) as count
             FROM two_factor_backup_codes
             WHERE user_id = $1
             AND used_at IS NULL`,
            [userId]
        );

        return parseInt(result.rows[0].count, 10);
    }

    async deleteAllForUser(userId: string): Promise<void> {
        await pool.query(
            `DELETE FROM two_factor_backup_codes
             WHERE user_id = $1`,
            [userId]
        );
    }
}
```

#### File: `backend/src/storage/repositories/UserRepository.ts` (MODIFY)

Update the `update` method to support 2FA fields:

```typescript
async update(id: string, input: UpdateUserInput): Promise<UserModel | null> {
    const result = await pool.query<UserModel>(
        `UPDATE users
         SET email = COALESCE($2, email),
             password_hash = COALESCE($3, password_hash),
             name = COALESCE($4, name),
             google_id = COALESCE($5, google_id),
             microsoft_id = COALESCE($6, microsoft_id),
             avatar_url = COALESCE($7, avatar_url),
             last_login_at = COALESCE($8, last_login_at),
             two_factor_enabled = COALESCE($9, two_factor_enabled),
             two_factor_phone = COALESCE($10, two_factor_phone),
             two_factor_phone_verified = COALESCE($11, two_factor_phone_verified),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
            id,
            input.email,
            input.password_hash,
            input.name,
            input.google_id,
            input.microsoft_id,
            input.avatar_url,
            input.last_login_at,
            input.two_factor_enabled,
            input.two_factor_phone,
            input.two_factor_phone_verified
        ]
    );

    return result.rows[0] || null;
}
```

### Phase 4: Services

#### File: `backend/src/services/SmsService.ts` (NEW)

```typescript
import twilio from "twilio";
import { config } from "../shared/config";

export class SmsService {
    private client: twilio.Twilio;

    constructor() {
        if (!config.twilio.accountSid || !config.twilio.authToken) {
            throw new Error("Twilio credentials not configured");
        }

        this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
    }

    async sendVerificationCode(phone: string, code: string): Promise<void> {
        const message = `Your FlowMaestro verification code is: ${code}. This code expires in 5 minutes.`;

        try {
            await this.client.messages.create({
                body: message,
                from: config.twilio.fromPhone,
                to: phone
            });
        } catch (error) {
            console.error("Failed to send SMS:", error);
            throw new Error("Failed to send verification code");
        }
    }

    async sendTwoFactorCode(phone: string, code: string): Promise<void> {
        // Alias for verification code
        return this.sendVerificationCode(phone, code);
    }
}

// Singleton instance
export const smsService = new SmsService();
```

#### File: `backend/src/services/email/EmailService.ts` (MODIFY)

Add new methods for profile/security notifications using existing Resend/React Email pattern:

```typescript
// Add these methods to the existing EmailService class
// Import new templates at the top:
// import { NameChangedEmail } from "./templates/NameChangedEmail";
// import { EmailChangedEmail } from "./templates/EmailChangedEmail";
// import { TwoFactorEnabledEmail } from "./templates/TwoFactorEnabledEmail";
// import { TwoFactorDisabledEmail } from "./templates/TwoFactorDisabledEmail";

async sendNameChangedNotification(email: string, name: string, userName?: string): Promise<void> {
    try {
        await this.resend.emails.send({
            from: this.fromEmail,
            to: email,
            subject: "Your FlowMaestro profile name has been updated",
            react: NameChangedEmail({ name, userName })
        });
    } catch (error) {
        console.error("Failed to send name changed email:", error);
        // Don't throw - email failure shouldn't fail the request
    }
}

async sendEmailChangedNotification(
    oldEmail: string,
    newEmail: string,
    userName?: string
): Promise<void> {
    try {
        // Send to old email
        await this.resend.emails.send({
            from: this.fromEmail,
            to: oldEmail,
            subject: "Your FlowMaestro email address has been changed",
            react: EmailChangedEmail({ newEmail, isOldAddress: true, userName })
        });

        // Send to new email
        await this.resend.emails.send({
            from: this.fromEmail,
            to: newEmail,
            subject: "Your FlowMaestro email address has been changed",
            react: EmailChangedEmail({ newEmail, isOldAddress: false, userName })
        });
    } catch (error) {
        console.error("Failed to send email changed notification:", error);
    }
}

async sendTwoFactorEnabledNotification(
    email: string,
    phone: string,
    userName?: string
): Promise<void> {
    try {
        await this.resend.emails.send({
            from: this.fromEmail,
            to: email,
            subject: "Two-factor authentication enabled on your account",
            react: TwoFactorEnabledEmail({ phone, userName })
        });
    } catch (error) {
        console.error("Failed to send 2FA enabled email:", error);
    }
}

async sendTwoFactorDisabledNotification(email: string, userName?: string): Promise<void> {
    try {
        await this.resend.emails.send({
            from: this.fromEmail,
            to: email,
            subject: "Two-factor authentication disabled on your account",
            react: TwoFactorDisabledEmail({ userName })
        });
    } catch (error) {
        console.error("Failed to send 2FA disabled email:", error);
    }
}
```

### Phase 5: Validation Schemas

#### File: `backend/src/api/schemas/profile-schemas.ts` (NEW)

```typescript
import { z } from "zod";

export const updateNameSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long")
});

export const updateEmailSchema = z.object({
    email: z.string().email("Invalid email address")
});

export const updatePasswordSchema = z.object({
    currentPassword: z.string().optional(),
    newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(100, "Password too long")
});

export const verifyEmailChangeSchema = z.object({
    token: z.string().length(64, "Invalid token")
});
```

#### File: `backend/src/api/schemas/two-factor-schemas.ts` (NEW)

```typescript
import { z } from "zod";

export const enableTwoFactorSchema = z.object({
    phone: z
        .string()
        .refine(
            (val) => /^\+[1-9]\d{1,14}$/.test(val),
            "Phone number must be in E.164 format (e.g., +14155552671)"
        )
});

export const verifyTwoFactorPhoneSchema = z.object({
    code: z
        .string()
        .length(6, "Code must be 6 digits")
        .regex(/^\d{6}$/, "Code must be numeric")
});

export const disableTwoFactorSchema = z.object({
    password: z.string().min(1, "Password is required")
});

export const resendTwoFactorCodeSchema = z.object({});
```

### Phase 6: API Routes - Profile

#### File: `backend/src/api/routes/profile/update-name.ts` (NEW)

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { updateNameSchema } from "../../schemas/profile-schemas";
import { UserRepository } from "../../../storage/repositories/UserRepository";
import { emailService } from "../../../services/EmailService";
import { AppError } from "../../../shared/errors";

export async function updateNameHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const body = updateNameSchema.parse(request.body);
    const userId = request.user.id;

    const userRepo = new UserRepository();

    const updatedUser = await userRepo.update(userId, {
        name: body.name
    });

    if (!updatedUser) {
        throw new AppError("User not found", 404);
    }

    // Send notification email (non-blocking)
    emailService
        .sendNameChangedNotification(updatedUser.email, updatedUser.name || "")
        .catch(console.error);

    reply.send({
        success: true,
        data: updatedUser
    });
}
```

#### File: `backend/src/api/routes/profile/update-email.ts` (NEW)

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { updateEmailSchema } from "../../schemas/profile-schemas";
import { UserRepository } from "../../../storage/repositories/UserRepository";
import { EmailVerificationTokenRepository } from "../../../storage/repositories/EmailVerificationTokenRepository";
import { emailService } from "../../../services/EmailService";
import { TokenUtils } from "../../../core/utils/token";
import { AppError, ValidationError } from "../../../shared/errors";

export async function updateEmailHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const body = updateEmailSchema.parse(request.body);
    const userId = request.user.id;

    const userRepo = new UserRepository();
    const user = await userRepo.findById(userId);

    if (!user) {
        throw new AppError("User not found", 404);
    }

    // Security: Only allow email change if user has a password
    // OAuth-only users cannot change email (hybrid approach)
    if (!user.password_hash) {
        throw new ValidationError("You must set a password before changing your email address");
    }

    // Check if email is already in use
    const existingUser = await userRepo.findByEmail(body.email);
    if (existingUser && existingUser.id !== userId) {
        throw new ValidationError("This email address is already in use");
    }

    // Don't allow changing to the same email
    if (user.email === body.email) {
        throw new ValidationError("New email must be different from current email");
    }

    // Generate email verification token
    const token = TokenUtils.generate();
    const tokenHash = TokenUtils.hash(token);
    const expiresAt = TokenUtils.generateExpiryDate(); // 15 minutes

    const tokenRepo = new EmailVerificationTokenRepository();
    await tokenRepo.create({
        user_id: userId,
        email: body.email,
        token_hash: tokenHash,
        expires_at: expiresAt,
        ip_address: request.ip,
        user_agent: request.headers["user-agent"]
    });

    // Send verification email to new address
    await emailService.sendEmailVerification(body.email, token);

    reply.send({
        success: true,
        message: "Verification email sent to new address. Please check your inbox."
    });
}
```

#### File: `backend/src/api/routes/profile/verify-email-change.ts` (NEW)

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { verifyEmailChangeSchema } from "../../schemas/profile-schemas";
import { UserRepository } from "../../../storage/repositories/UserRepository";
import { EmailVerificationTokenRepository } from "../../../storage/repositories/EmailVerificationTokenRepository";
import { emailService } from "../../../services/EmailService";
import { TokenUtils } from "../../../core/utils/token";
import { AppError } from "../../../shared/errors";

export async function verifyEmailChangeHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const body = verifyEmailChangeSchema.parse(request.body);
    const tokenHash = TokenUtils.hash(body.token);

    const tokenRepo = new EmailVerificationTokenRepository();
    const tokenRecord = await tokenRepo.findByTokenHash(tokenHash);

    if (!tokenRecord) {
        throw new AppError("Invalid or expired verification link", 400);
    }

    if (TokenUtils.isExpired(tokenRecord.expires_at)) {
        throw new AppError("Verification link has expired", 400);
    }

    if (tokenRecord.verified_at) {
        throw new AppError("This verification link has already been used", 400);
    }

    const userRepo = new UserRepository();
    const user = await userRepo.findById(tokenRecord.user_id);

    if (!user) {
        throw new AppError("User not found", 404);
    }

    const oldEmail = user.email;
    const newEmail = tokenRecord.email;

    // Update user's email
    await userRepo.update(user.id, { email: newEmail });

    // Mark token as verified
    await tokenRepo.markAsVerified(tokenRecord.id);

    // Send notifications to both email addresses
    emailService.sendEmailChangedNotification(oldEmail, newEmail).catch(console.error);

    reply.send({
        success: true,
        message: "Email address updated successfully"
    });
}
```

#### File: `backend/src/api/routes/profile/update-password.ts` (NEW)

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { updatePasswordSchema } from "../../schemas/profile-schemas";
import { UserRepository } from "../../../storage/repositories/UserRepository";
import { emailService } from "../../../services/EmailService";
import { PasswordUtils } from "../../../core/utils/password";
import { AppError, ValidationError } from "../../../shared/errors";

export async function updatePasswordHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const body = updatePasswordSchema.parse(request.body);
    const userId = request.user.id;

    const userRepo = new UserRepository();
    const user = await userRepo.findById(userId);

    if (!user) {
        throw new AppError("User not found", 404);
    }

    // If user has a password, require current password
    if (user.password_hash) {
        if (!body.currentPassword) {
            throw new ValidationError("Current password is required");
        }

        const isValid = await PasswordUtils.verify(body.currentPassword, user.password_hash);

        if (!isValid) {
            throw new ValidationError("Current password is incorrect");
        }
    }
    // If OAuth-only user (no password), allow setting password without current

    // Hash new password
    const newPasswordHash = await PasswordUtils.hash(body.newPassword);

    // Update password
    await userRepo.update(userId, {
        password_hash: newPasswordHash
    });

    // Send notification email
    emailService.sendPasswordChangedNotification(user.email).catch(console.error);

    reply.send({
        success: true,
        message: "Password updated successfully"
    });
}
```

#### File: `backend/src/api/routes/profile/index.ts` (NEW)

```typescript
import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth";
import { updateNameHandler } from "./update-name";
import { updateEmailHandler } from "./update-email";
import { verifyEmailChangeHandler } from "./verify-email-change";
import { updatePasswordHandler } from "./update-password";

export async function profileRoutes(fastify: FastifyInstance): Promise<void> {
    // Update name
    fastify.put("/api/profile/name", { preHandler: [authenticate] }, updateNameHandler);

    // Update email (sends verification)
    fastify.put("/api/profile/email", { preHandler: [authenticate] }, updateEmailHandler);

    // Verify email change (token-based, no auth)
    fastify.post("/api/profile/verify-email", verifyEmailChangeHandler);

    // Update password
    fastify.put("/api/profile/password", { preHandler: [authenticate] }, updatePasswordHandler);
}
```

### Phase 7: API Routes - Two-Factor

#### File: `backend/src/api/routes/two-factor/enable.ts` (NEW)

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { enableTwoFactorSchema } from "../../schemas/two-factor-schemas";
import { UserRepository } from "../../../storage/repositories/UserRepository";
import { TwoFactorTokenRepository } from "../../../storage/repositories/TwoFactorTokenRepository";
import { smsService } from "../../../services/SmsService";
import { generateCode, hashCode, validatePhoneNumber } from "../../../core/utils/two-factor";
import { AppError, ValidationError } from "../../../shared/errors";

export async function enableTwoFactorHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const body = enableTwoFactorSchema.parse(request.body);
    const userId = request.user.id;

    // Validate phone format
    if (!validatePhoneNumber(body.phone)) {
        throw new ValidationError(
            "Invalid phone number format. Use E.164 format (e.g., +14155552671)"
        );
    }

    const userRepo = new UserRepository();
    const user = await userRepo.findById(userId);

    if (!user) {
        throw new AppError("User not found", 404);
    }

    if (user.two_factor_enabled) {
        throw new ValidationError("Two-factor authentication is already enabled");
    }

    // Generate 6-digit code
    const code = generateCode();
    const codeHash = hashCode(code);

    // Calculate expiry (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const tokenRepo = new TwoFactorTokenRepository();

    // Invalidate any existing tokens for this user
    await tokenRepo.invalidateAllForUser(userId);

    // Create new token
    await tokenRepo.create({
        user_id: userId,
        code_hash: codeHash,
        expires_at: expiresAt,
        ip_address: request.ip,
        user_agent: request.headers["user-agent"]
    });

    // Update user with pending phone (not verified yet)
    await userRepo.update(userId, {
        two_factor_phone: body.phone,
        two_factor_phone_verified: false
    });

    // Send SMS
    try {
        await smsService.sendTwoFactorCode(body.phone, code);
    } catch (error) {
        throw new AppError("Failed to send verification code. Please try again.", 500);
    }

    reply.send({
        success: true,
        message: "Verification code sent to your phone"
    });
}
```

#### File: `backend/src/api/routes/two-factor/verify-phone.ts` (NEW)

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { verifyTwoFactorPhoneSchema } from "../../schemas/two-factor-schemas";
import { UserRepository } from "../../../storage/repositories/UserRepository";
import { TwoFactorTokenRepository } from "../../../storage/repositories/TwoFactorTokenRepository";
import { TwoFactorBackupCodeRepository } from "../../../storage/repositories/TwoFactorBackupCodeRepository";
import { emailService } from "../../../services/EmailService";
import {
    hashCode,
    generateBackupCodes,
    normalizeAndHashBackupCode
} from "../../../core/utils/two-factor";
import { AppError, ValidationError } from "../../../shared/errors";

const MAX_ATTEMPTS = 3;

export async function verifyTwoFactorPhoneHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const body = verifyTwoFactorPhoneSchema.parse(request.body);
    const userId = request.user.id;

    const tokenRepo = new TwoFactorTokenRepository();
    const tokenRecord = await tokenRepo.findLatestByUserId(userId);

    if (!tokenRecord) {
        throw new AppError("No pending verification found. Please request a new code.", 400);
    }

    if (new Date() > tokenRecord.expires_at) {
        throw new AppError("Verification code has expired. Please request a new code.", 400);
    }

    if (tokenRecord.attempts >= MAX_ATTEMPTS) {
        throw new ValidationError("Too many failed attempts. Please request a new code.");
    }

    // Verify code
    const codeHash = hashCode(body.code);
    const isValid = codeHash === tokenRecord.code_hash;

    if (!isValid) {
        // Increment attempts
        await tokenRepo.incrementAttempts(tokenRecord.id);

        const attemptsLeft = MAX_ATTEMPTS - (tokenRecord.attempts + 1);
        throw new ValidationError(
            attemptsLeft > 0
                ? `Invalid code. ${attemptsLeft} attempt${attemptsLeft > 1 ? "s" : ""} remaining.`
                : "Too many failed attempts. Please request a new code."
        );
    }

    // Code is valid - generate backup codes
    const backupCodes = generateBackupCodes(); // Returns 8 plain codes
    const backupCodeHashes = backupCodes.map(normalizeAndHashBackupCode);

    const userRepo = new UserRepository();
    const backupCodeRepo = new TwoFactorBackupCodeRepository();

    // Store hashed backup codes
    await backupCodeRepo.createBatch(userId, backupCodeHashes);

    // Enable 2FA
    await userRepo.update(userId, {
        two_factor_enabled: true,
        two_factor_phone_verified: true
    });

    // Mark token as verified
    await tokenRepo.markAsVerified(tokenRecord.id);

    // Get user for email notification
    const user = await userRepo.findById(userId);
    if (user) {
        emailService
            .sendTwoFactorEnabledNotification(user.email, user.two_factor_phone || "")
            .catch(console.error);
    }

    reply.send({
        success: true,
        backupCodes // Return plain codes to user (only time they're shown)
    });
}
```

#### File: `backend/src/api/routes/two-factor/disable.ts` (NEW)

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { disableTwoFactorSchema } from "../../schemas/two-factor-schemas";
import { UserRepository } from "../../../storage/repositories/UserRepository";
import { TwoFactorBackupCodeRepository } from "../../../storage/repositories/TwoFactorBackupCodeRepository";
import { emailService } from "../../../services/EmailService";
import { PasswordUtils } from "../../../core/utils/password";
import { AppError, ValidationError } from "../../../shared/errors";

export async function disableTwoFactorHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const body = disableTwoFactorSchema.parse(request.body);
    const userId = request.user.id;

    const userRepo = new UserRepository();
    const user = await userRepo.findById(userId);

    if (!user) {
        throw new AppError("User not found", 404);
    }

    if (!user.two_factor_enabled) {
        throw new ValidationError("Two-factor authentication is not enabled");
    }

    // Require password verification for security
    if (!user.password_hash) {
        throw new ValidationError("You must set a password to disable two-factor authentication");
    }

    const isValidPassword = await PasswordUtils.verify(body.password, user.password_hash);

    if (!isValidPassword) {
        throw new ValidationError("Incorrect password");
    }

    // Disable 2FA
    await userRepo.update(userId, {
        two_factor_enabled: false,
        two_factor_phone: null,
        two_factor_phone_verified: false
    });

    // Delete all backup codes
    const backupCodeRepo = new TwoFactorBackupCodeRepository();
    await backupCodeRepo.deleteAllForUser(userId);

    // Send notification email
    emailService.sendTwoFactorDisabledNotification(user.email).catch(console.error);

    reply.send({
        success: true,
        message: "Two-factor authentication disabled successfully"
    });
}
```

#### File: `backend/src/api/routes/two-factor/resend-code.ts` (NEW)

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { resendTwoFactorCodeSchema } from "../../schemas/two-factor-schemas";
import { UserRepository } from "../../../storage/repositories/UserRepository";
import { TwoFactorTokenRepository } from "../../../storage/repositories/TwoFactorTokenRepository";
import { smsService } from "../../../services/SmsService";
import { generateCode, hashCode } from "../../../core/utils/two-factor";
import { AppError } from "../../../shared/errors";

export async function resendTwoFactorCodeHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    resendTwoFactorCodeSchema.parse(request.body);
    const userId = request.user.id;

    const userRepo = new UserRepository();
    const user = await userRepo.findById(userId);

    if (!user) {
        throw new AppError("User not found", 404);
    }

    if (!user.two_factor_phone) {
        throw new AppError("No phone number on file. Please start the setup process again.", 400);
    }

    // Generate new code
    const code = generateCode();
    const codeHash = hashCode(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const tokenRepo = new TwoFactorTokenRepository();

    // Invalidate old codes
    await tokenRepo.invalidateAllForUser(userId);

    // Create new token
    await tokenRepo.create({
        user_id: userId,
        code_hash: codeHash,
        expires_at: expiresAt,
        ip_address: request.ip,
        user_agent: request.headers["user-agent"]
    });

    // Send SMS
    try {
        await smsService.sendTwoFactorCode(user.two_factor_phone, code);
    } catch (error) {
        throw new AppError("Failed to send verification code. Please try again.", 500);
    }

    reply.send({
        success: true,
        message: "New verification code sent"
    });
}
```

#### File: `backend/src/api/routes/two-factor/index.ts` (NEW)

```typescript
import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth";
import { enableTwoFactorHandler } from "./enable";
import { verifyTwoFactorPhoneHandler } from "./verify-phone";
import { disableTwoFactorHandler } from "./disable";
import { resendTwoFactorCodeHandler } from "./resend-code";

export async function twoFactorRoutes(fastify: FastifyInstance): Promise<void> {
    // Enable 2FA (send SMS code)
    fastify.post("/api/two-factor/enable", { preHandler: [authenticate] }, enableTwoFactorHandler);

    // Verify phone with SMS code (returns backup codes)
    fastify.post(
        "/api/two-factor/verify-phone",
        { preHandler: [authenticate] },
        verifyTwoFactorPhoneHandler
    );

    // Disable 2FA
    fastify.post(
        "/api/two-factor/disable",
        { preHandler: [authenticate] },
        disableTwoFactorHandler
    );

    // Resend verification code
    fastify.post(
        "/api/two-factor/resend-code",
        { preHandler: [authenticate] },
        resendTwoFactorCodeHandler
    );
}
```

### Phase 8: Server Registration

#### File: `backend/src/api/server.ts` (MODIFY)

Add route registration:

```typescript
import { profileRoutes } from "./routes/profile";
import { twoFactorRoutes } from "./routes/two-factor";

// ... existing imports and setup ...

export async function createServer(): Promise<FastifyInstance> {
    const fastify = Fastify({ logger: true });

    // ... existing middleware and routes ...

    // Register profile and 2FA routes
    await fastify.register(profileRoutes);
    await fastify.register(twoFactorRoutes);

    // ... rest of server setup ...

    return fastify;
}
```

---

## Frontend Implementation

### Phase 1: Shared Types

#### File: `shared/src/account.ts` (NEW)

```typescript
// Profile operations
export interface UpdateNameRequest {
    name: string;
}

export interface UpdateNameResponse {
    success: boolean;
    data: User;
}

export interface UpdateEmailRequest {
    email: string;
}

export interface UpdateEmailResponse {
    success: boolean;
    message: string;
}

export interface UpdatePasswordRequest {
    currentPassword?: string;
    newPassword: string;
}

export interface UpdatePasswordResponse {
    success: boolean;
    message: string;
}

export interface VerifyEmailChangeRequest {
    token: string;
}

export interface VerifyEmailChangeResponse {
    success: boolean;
    message: string;
}

// Two-factor authentication operations
export interface EnableTwoFactorRequest {
    phone: string;
}

export interface EnableTwoFactorResponse {
    success: boolean;
    message: string;
}

export interface VerifyTwoFactorPhoneRequest {
    code: string;
}

export interface VerifyTwoFactorPhoneResponse {
    success: boolean;
    backupCodes: string[];
}

export interface DisableTwoFactorRequest {
    password: string;
}

export interface DisableTwoFactorResponse {
    success: boolean;
    message: string;
}

export interface ResendTwoFactorCodeResponse {
    success: boolean;
    message: string;
}
```

#### File: `shared/src/index.ts` (MODIFY)

```typescript
// ... existing exports ...
export * from "./account";
```

### Phase 2: Dialog Components

#### File: `frontend/src/components/account/EditNameDialog.tsx` (NEW)

```typescript
import React, { useState } from "react";
import { Dialog } from "../common/Dialog";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { Alert } from "../common/Alert";

interface EditNameDialogProps {
    isOpen: boolean;
    currentName: string;
    onClose: () => void;
    onSave: (name: string) => Promise<void>;
}

export const EditNameDialog: React.FC<EditNameDialogProps> = ({
    isOpen,
    currentName,
    onClose,
    onSave
}) => {
    const [name, setName] = useState(currentName);
    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (): Promise<void> => {
        setError("");

        if (!name.trim()) {
            setError("Name is required");
            return;
        }

        if (name.length > 100) {
            setError("Name is too long (max 100 characters)");
            return;
        }

        setIsSaving(true);
        try {
            await onSave(name);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update name");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Edit Name">
            <div className="space-y-4">
                {error && <Alert variant="error">{error}</Alert>}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                    </label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        maxLength={100}
                        autoFocus
                    />
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} loading={isSaving} disabled={isSaving}>
                        Save
                    </Button>
                </div>
            </div>
        </Dialog>
    );
};
```

#### File: `frontend/src/components/account/EditEmailDialog.tsx` (NEW)

```typescript
import React, { useState } from "react";
import { Dialog } from "../common/Dialog";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { Alert } from "../common/Alert";

interface EditEmailDialogProps {
    isOpen: boolean;
    currentEmail: string;
    hasPassword: boolean;
    onClose: () => void;
    onSave: (email: string) => Promise<void>;
}

export const EditEmailDialog: React.FC<EditEmailDialogProps> = ({
    isOpen,
    currentEmail,
    hasPassword,
    onClose,
    onSave
}) => {
    const [email, setEmail] = useState(currentEmail);
    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (): Promise<void> => {
        setError("");

        if (!email.trim()) {
            setError("Email is required");
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address");
            return;
        }

        setIsSaving(true);
        try {
            await onSave(email);
            // Don't close dialog - show success message
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update email");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Change Email Address">
            <div className="space-y-4">
                {!hasPassword && (
                    <Alert variant="warning">
                        You must set a password before changing your email address.
                    </Alert>
                )}

                {error && <Alert variant="error">{error}</Alert>}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Email Address
                    </label>
                    <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter new email"
                        disabled={!hasPassword}
                        autoFocus={hasPassword}
                    />
                    {hasPassword && (
                        <p className="mt-2 text-sm text-gray-500">
                            A verification link will be sent to your new email address.
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        loading={isSaving}
                        disabled={isSaving || !hasPassword}
                    >
                        Send Verification
                    </Button>
                </div>
            </div>
        </Dialog>
    );
};
```

#### File: `frontend/src/components/account/ChangePasswordDialog.tsx` (NEW)

```typescript
import React, { useState } from "react";
import { Dialog } from "../common/Dialog";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { Alert } from "../common/Alert";
import { Eye, EyeOff } from "lucide-react";

interface ChangePasswordDialogProps {
    isOpen: boolean;
    hasPassword: boolean;
    onClose: () => void;
    onSave: (currentPassword: string | undefined, newPassword: string) => Promise<void>;
}

export const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
    isOpen,
    hasPassword,
    onClose,
    onSave
}) => {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (): Promise<void> => {
        setError("");

        if (hasPassword && !currentPassword) {
            setError("Current password is required");
            return;
        }

        if (!newPassword) {
            setError("New password is required");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsSaving(true);
        try {
            await onSave(hasPassword ? currentPassword : undefined, newPassword);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update password");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={hasPassword ? "Change Password" : "Set Password"}
        >
            <div className="space-y-4">
                {error && <Alert variant="error">{error}</Alert>}

                {hasPassword && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Current Password
                        </label>
                        <div className="relative">
                            <Input
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showCurrentPassword ? (
                                    <EyeOff size={18} />
                                ) : (
                                    <Eye size={18} />
                                )}
                            </button>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                    </label>
                    <div className="relative">
                        <Input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            autoFocus={!hasPassword}
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                        Must be at least 8 characters
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                    </label>
                    <div className="relative">
                        <Input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                            {showConfirmPassword ? (
                                <EyeOff size={18} />
                            ) : (
                                <Eye size={18} />
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} loading={isSaving} disabled={isSaving}>
                        {hasPassword ? "Change Password" : "Set Password"}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
};
```

#### File: `frontend/src/components/account/EnableTwoFactorDialog.tsx` (NEW)

```typescript
import React, { useState, useEffect } from "react";
import { Dialog } from "../common/Dialog";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { Alert } from "../common/Alert";
import { Shield, Copy, Download } from "lucide-react";

type Step = "phone" | "verify" | "backup-codes";

interface EnableTwoFactorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onEnable: (phone: string) => Promise<void>;
    onVerify: (code: string) => Promise<string[]>; // Returns backup codes
    onResend: () => Promise<void>;
}

export const EnableTwoFactorDialog: React.FC<EnableTwoFactorDialogProps> = ({
    isOpen,
    onClose,
    onEnable,
    onVerify,
    onResend
}) => {
    const [step, setStep] = useState<Step>("phone");
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [error, setError] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [expirySeconds, setExpirySeconds] = useState(300); // 5 minutes
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    // Countdown timer for code expiry
    useEffect(() => {
        if (step === "verify" && expirySeconds > 0) {
            const timer = setInterval(() => {
                setExpirySeconds((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [step, expirySeconds]);

    const handlePhoneSubmit = async (): Promise<void> => {
        setError("");

        // Validate E.164 format
        const e164Regex = /^\+[1-9]\d{1,14}$/;
        if (!e164Regex.test(phone)) {
            setError("Phone number must be in E.164 format (e.g., +14155552671)");
            return;
        }

        setIsProcessing(true);
        try {
            await onEnable(phone);
            setStep("verify");
            setExpirySeconds(300); // Reset timer
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to send code");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCodeVerify = async (): Promise<void> => {
        setError("");

        if (code.length !== 6) {
            setError("Code must be 6 digits");
            return;
        }

        setIsProcessing(true);
        try {
            const codes = await onVerify(code);
            setBackupCodes(codes);
            setStep("backup-codes");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Invalid code");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleResend = async (): Promise<void> => {
        setError("");
        setIsProcessing(true);
        try {
            await onResend();
            setCode("");
            setExpirySeconds(300); // Reset timer
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to resend code");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCopyCode = (codeText: string, index: number): void => {
        navigator.clipboard.writeText(codeText);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleDownloadCodes = (): void => {
        const content = [
            "FlowMaestro Two-Factor Authentication Backup Codes",
            "",
            "Save these codes in a secure location.",
            "Each code can only be used once.",
            "",
            ...backupCodes.map((c, i) => `${i + 1}. ${c}`),
            "",
            `Generated: ${new Date().toISOString()}`
        ].join("\n");

        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "flowmaestro-backup-codes.txt";
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="Enable Two-Factor Authentication"
            maxWidth="md"
        >
            <div className="space-y-4">
                {/* Step 1: Phone Number */}
                {step === "phone" && (
                    <>
                        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                            <Shield className="text-blue-600" size={24} />
                            <p className="text-sm text-blue-900">
                                Add an extra layer of security by requiring a code from your
                                phone when signing in.
                            </p>
                        </div>

                        {error && <Alert variant="error">{error}</Alert>}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone Number
                            </label>
                            <Input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+14155552671"
                                autoFocus
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                Use E.164 format (country code + number, e.g., +14155552671)
                            </p>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handlePhoneSubmit}
                                loading={isProcessing}
                                disabled={isProcessing}
                            >
                                Send Code
                            </Button>
                        </div>
                    </>
                )}

                {/* Step 2: Verify Code */}
                {step === "verify" && (
                    <>
                        <p className="text-sm text-gray-600">
                            Enter the 6-digit code sent to <strong>{phone}</strong>
                        </p>

                        {error && <Alert variant="error">{error}</Alert>}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Verification Code
                            </label>
                            <Input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                placeholder="000000"
                                maxLength={6}
                                className="text-center text-2xl tracking-widest"
                                autoFocus
                            />
                            <div className="mt-2 flex justify-between items-center">
                                <p className="text-sm text-gray-500">
                                    Code expires in {formatTime(expirySeconds)}
                                </p>
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={isProcessing}
                                    className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                                >
                                    Resend Code
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setStep("phone")}
                                disabled={isProcessing}
                            >
                                Back
                            </Button>
                            <Button
                                onClick={handleCodeVerify}
                                loading={isProcessing}
                                disabled={isProcessing || code.length !== 6}
                            >
                                Verify
                            </Button>
                        </div>
                    </>
                )}

                {/* Step 3: Backup Codes */}
                {step === "backup-codes" && (
                    <>
                        <Alert variant="warning" title="Important">
                            Save these backup codes in a secure location. Each code can only
                            be used once to access your account if you lose your phone.
                        </Alert>

                        <div className="grid grid-cols-2 gap-2">
                            {backupCodes.map((codeText, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200"
                                >
                                    <code className="text-sm font-mono">{codeText}</code>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyCode(codeText, index)}
                                        className="ml-2 p-1 hover:bg-gray-200 rounded"
                                        title="Copy code"
                                    >
                                        {copiedIndex === index ? (
                                            <span className="text-xs text-green-600">✓</span>
                                        ) : (
                                            <Copy size={14} className="text-gray-500" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center">
                            <Button
                                variant="secondary"
                                onClick={handleDownloadCodes}
                                className="flex items-center gap-2"
                            >
                                <Download size={16} />
                                Download Codes
                            </Button>
                            <Button onClick={onClose}>Done</Button>
                        </div>
                    </>
                )}
            </div>
        </Dialog>
    );
};
```

#### File: `frontend/src/components/account/DisableTwoFactorDialog.tsx` (NEW)

```typescript
import React, { useState } from "react";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { Input } from "../common/Input";
import { Alert } from "../common/Alert";

interface DisableTwoFactorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (password: string) => Promise<void>;
}

export const DisableTwoFactorDialog: React.FC<DisableTwoFactorDialogProps> = ({
    isOpen,
    onClose,
    onConfirm
}) => {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const handleConfirm = async (): Promise<void> => {
        setError("");

        if (!password) {
            setError("Password is required");
            return;
        }

        setIsProcessing(true);
        try {
            await onConfirm(password);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to disable 2FA");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={handleConfirm}
            title="Disable Two-Factor Authentication"
            message="Are you sure you want to disable two-factor authentication? This will make your account less secure."
            confirmText="Disable 2FA"
            cancelText="Cancel"
            variant="danger"
        >
            <div className="space-y-4 mt-4">
                <Alert variant="warning">
                    Disabling 2FA will delete all your backup codes and remove SMS
                    verification from your account.
                </Alert>

                {error && <Alert variant="error">{error}</Alert>}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm your password
                    </label>
                    <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        autoFocus
                        disabled={isProcessing}
                    />
                </div>
            </div>
        </ConfirmDialog>
    );
};
```

### Phase 3: API Client

#### File: `frontend/src/lib/api.ts` (MODIFY)

Add these methods to the existing api object:

```typescript
import type {
    UpdateNameRequest,
    UpdateNameResponse,
    UpdateEmailRequest,
    UpdateEmailResponse,
    UpdatePasswordRequest,
    UpdatePasswordResponse,
    EnableTwoFactorRequest,
    EnableTwoFactorResponse,
    VerifyTwoFactorPhoneRequest,
    VerifyTwoFactorPhoneResponse,
    DisableTwoFactorRequest,
    DisableTwoFactorResponse,
    ResendTwoFactorCodeResponse
} from "@flowmaestro/shared";

// Add to existing api object
export const api = {
    // ... existing methods ...

    // Profile methods
    async updateName(name: string): Promise<UpdateNameResponse> {
        const token = this.getAuthToken();
        const response = await fetch(`${API_URL}/api/profile/name`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ name } as UpdateNameRequest)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to update name");
        }

        return response.json();
    },

    async updateEmail(email: string): Promise<UpdateEmailResponse> {
        const token = this.getAuthToken();
        const response = await fetch(`${API_URL}/api/profile/email`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ email } as UpdateEmailRequest)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to update email");
        }

        return response.json();
    },

    async updatePassword(
        currentPassword: string | undefined,
        newPassword: string
    ): Promise<UpdatePasswordResponse> {
        const token = this.getAuthToken();
        const response = await fetch(`${API_URL}/api/profile/password`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            } as UpdatePasswordRequest)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to update password");
        }

        return response.json();
    },

    // Two-factor authentication methods
    async enableTwoFactor(phone: string): Promise<EnableTwoFactorResponse> {
        const token = this.getAuthToken();
        const response = await fetch(`${API_URL}/api/two-factor/enable`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ phone } as EnableTwoFactorRequest)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to enable 2FA");
        }

        return response.json();
    },

    async verifyTwoFactorPhone(code: string): Promise<VerifyTwoFactorPhoneResponse> {
        const token = this.getAuthToken();
        const response = await fetch(`${API_URL}/api/two-factor/verify-phone`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ code } as VerifyTwoFactorPhoneRequest)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to verify code");
        }

        return response.json();
    },

    async disableTwoFactor(password: string): Promise<DisableTwoFactorResponse> {
        const token = this.getAuthToken();
        const response = await fetch(`${API_URL}/api/two-factor/disable`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ password } as DisableTwoFactorRequest)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to disable 2FA");
        }

        return response.json();
    },

    async resendTwoFactorCode(): Promise<ResendTwoFactorCodeResponse> {
        const token = this.getAuthToken();
        const response = await fetch(`${API_URL}/api/two-factor/resend-code`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to resend code");
        }

        return response.json();
    }
};
```

### Phase 4: User Context

#### File: `frontend/src/contexts/AuthContext.tsx` (MODIFY)

Update the User interface to include 2FA fields:

```typescript
export interface User {
    id: string;
    email: string;
    name: string | null;
    avatar_url: string | null;
    google_id: string | null;
    microsoft_id: string | null;
    two_factor_enabled: boolean; // ADD
    two_factor_phone: string | null; // ADD
    two_factor_phone_verified: boolean; // ADD
}
```

### Phase 5: Account Page Integration

#### File: `frontend/src/pages/Account.tsx` (MAJOR REFACTOR)

```typescript
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Toast } from "../components/common/Toast";
import { EditNameDialog } from "../components/account/EditNameDialog";
import { EditEmailDialog } from "../components/account/EditEmailDialog";
import { ChangePasswordDialog } from "../components/account/ChangePasswordDialog";
import { EnableTwoFactorDialog } from "../components/account/EnableTwoFactorDialog";
import { DisableTwoFactorDialog } from "../components/account/DisableTwoFactorDialog";
import { Button } from "../components/common/Button";
import { User, Lock, Shield, Mail } from "lucide-react";

type DialogType =
    | "edit-name"
    | "edit-email"
    | "change-password"
    | "enable-2fa"
    | "disable-2fa"
    | null;

export const Account: React.FC = () => {
    const { user, setUser } = useAuth();
    const queryClient = useQueryClient();
    const [openDialog, setOpenDialog] = useState<DialogType>(null);
    const [toast, setToast] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    const hasPassword = Boolean(user?.password_hash);

    // Name mutation
    const updateNameMutation = useMutation({
        mutationFn: api.updateName,
        onSuccess: (data) => {
            setUser(data.data);
            setToast({ type: "success", message: "Name updated successfully" });
            setOpenDialog(null);
        },
        onError: (error: Error) => {
            setToast({ type: "error", message: error.message });
        }
    });

    // Email mutation
    const updateEmailMutation = useMutation({
        mutationFn: api.updateEmail,
        onSuccess: (data) => {
            setToast({ type: "success", message: data.message });
            setOpenDialog(null);
        },
        onError: (error: Error) => {
            setToast({ type: "error", message: error.message });
        }
    });

    // Password mutation
    const updatePasswordMutation = useMutation({
        mutationFn: ({
            currentPassword,
            newPassword
        }: {
            currentPassword?: string;
            newPassword: string;
        }) => api.updatePassword(currentPassword, newPassword),
        onSuccess: () => {
            setToast({
                type: "success",
                message: hasPassword ? "Password changed successfully" : "Password set successfully"
            });
            setOpenDialog(null);
            // Refresh user to update hasPassword flag
            queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        },
        onError: (error: Error) => {
            setToast({ type: "error", message: error.message });
        }
    });

    // 2FA mutations
    const enableTwoFactorMutation = useMutation({
        mutationFn: api.enableTwoFactor,
        onError: (error: Error) => {
            setToast({ type: "error", message: error.message });
        }
    });

    const verifyTwoFactorMutation = useMutation({
        mutationFn: api.verifyTwoFactorPhone,
        onSuccess: () => {
            setToast({
                type: "success",
                message: "Two-factor authentication enabled successfully"
            });
            // Refresh user data
            queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        },
        onError: (error: Error) => {
            setToast({ type: "error", message: error.message });
        }
    });

    const disableTwoFactorMutation = useMutation({
        mutationFn: api.disableTwoFactor,
        onSuccess: () => {
            setToast({
                type: "success",
                message: "Two-factor authentication disabled"
            });
            setOpenDialog(null);
            // Refresh user data
            queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        },
        onError: (error: Error) => {
            setToast({ type: "error", message: error.message });
        }
    });

    const resendCodeMutation = useMutation({
        mutationFn: api.resendTwoFactorCode,
        onSuccess: () => {
            setToast({ type: "success", message: "Code sent" });
        },
        onError: (error: Error) => {
            setToast({ type: "error", message: error.message });
        }
    });

    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

            {/* Profile Section */}
            <section className="mb-8 bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <User className="text-blue-600" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold">Profile</h2>
                        <p className="text-sm text-gray-600">
                            Manage your personal information
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b">
                        <div>
                            <div className="text-sm text-gray-500">Name</div>
                            <div className="font-medium">{user.name || "Not set"}</div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setOpenDialog("edit-name")}
                        >
                            Edit
                        </Button>
                    </div>

                    <div className="flex justify-between items-center pb-4 border-b">
                        <div>
                            <div className="text-sm text-gray-500">Email</div>
                            <div className="font-medium">{user.email}</div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setOpenDialog("edit-email")}
                        >
                            Edit
                        </Button>
                    </div>
                </div>
            </section>

            {/* Security Section */}
            <section className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-red-100 rounded-lg">
                        <Lock className="text-red-600" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold">Security</h2>
                        <p className="text-sm text-gray-600">
                            Password and authentication settings
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b">
                        <div>
                            <div className="text-sm text-gray-500">Password</div>
                            <div className="font-medium">••••••••</div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setOpenDialog("change-password")}
                        >
                            {hasPassword ? "Change Password" : "Set Password"}
                        </Button>
                    </div>

                    <div className="flex justify-between items-center pb-4 border-b">
                        <div>
                            <div className="text-sm text-gray-500">
                                Two-factor authentication
                            </div>
                            <div className="flex items-center gap-2">
                                {user.two_factor_enabled ? (
                                    <>
                                        <span className="font-medium text-green-600">
                                            Enabled
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            ({user.two_factor_phone})
                                        </span>
                                    </>
                                ) : (
                                    <span className="font-medium text-gray-500">
                                        Disabled
                                    </span>
                                )}
                            </div>
                        </div>
                        {user.two_factor_enabled ? (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setOpenDialog("disable-2fa")}
                            >
                                Disable
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setOpenDialog("enable-2fa")}
                            >
                                Enable
                            </Button>
                        )}
                    </div>

                    {/* OAuth connections (existing) */}
                    <div className="flex justify-between items-center pb-4 border-b">
                        <div>
                            <div className="text-sm text-gray-500">Google Account</div>
                            <div className="font-medium">
                                {user.google_id ? (
                                    <span className="text-green-600">Connected</span>
                                ) : (
                                    <span className="text-gray-500">Not connected</span>
                                )}
                            </div>
                        </div>
                        {user.google_id && (
                            <Button variant="ghost" size="sm">
                                Disconnect
                            </Button>
                        )}
                    </div>

                    <div className="flex justify-between items-center">
                        <div>
                            <div className="text-sm text-gray-500">Microsoft Account</div>
                            <div className="font-medium">
                                {user.microsoft_id ? (
                                    <span className="text-green-600">Connected</span>
                                ) : (
                                    <span className="text-gray-500">Not connected</span>
                                )}
                            </div>
                        </div>
                        {user.microsoft_id && (
                            <Button variant="ghost" size="sm">
                                Disconnect
                            </Button>
                        )}
                    </div>
                </div>
            </section>

            {/* Dialogs */}
            <EditNameDialog
                isOpen={openDialog === "edit-name"}
                currentName={user.name || ""}
                onClose={() => setOpenDialog(null)}
                onSave={(name) => updateNameMutation.mutateAsync(name)}
            />

            <EditEmailDialog
                isOpen={openDialog === "edit-email"}
                currentEmail={user.email}
                hasPassword={hasPassword}
                onClose={() => setOpenDialog(null)}
                onSave={(email) => updateEmailMutation.mutateAsync(email)}
            />

            <ChangePasswordDialog
                isOpen={openDialog === "change-password"}
                hasPassword={hasPassword}
                onClose={() => setOpenDialog(null)}
                onSave={(currentPassword, newPassword) =>
                    updatePasswordMutation.mutateAsync({ currentPassword, newPassword })
                }
            />

            <EnableTwoFactorDialog
                isOpen={openDialog === "enable-2fa"}
                onClose={() => setOpenDialog(null)}
                onEnable={(phone) => enableTwoFactorMutation.mutateAsync(phone)}
                onVerify={(code) => verifyTwoFactorMutation.mutateAsync(code)}
                onResend={() => resendCodeMutation.mutateAsync()}
            />

            <DisableTwoFactorDialog
                isOpen={openDialog === "disable-2fa"}
                onClose={() => setOpenDialog(null)}
                onConfirm={(password) => disableTwoFactorMutation.mutateAsync(password)}
            />

            {/* Toast Notifications */}
            {toast && (
                <Toast
                    isOpen={true}
                    onClose={() => setToast(null)}
                    type={toast.type}
                    title={toast.type === "success" ? "Success" : "Error"}
                    message={toast.message}
                />
            )}
        </div>
    );
};
```

---

## API Contracts

### Profile Endpoints

#### PUT /api/profile/name

**Request:**

```json
{
    "name": "John Doe"
}
```

**Response (200):**

```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "email": "user@example.com",
        "name": "John Doe",
        ...
    }
}
```

**Errors:**

- 401: Unauthorized
- 400: Validation error (name required, too long)

---

#### PUT /api/profile/email

**Request:**

```json
{
    "email": "newemail@example.com"
}
```

**Response (200):**

```json
{
    "success": true,
    "message": "Verification email sent to new address. Please check your inbox."
}
```

**Errors:**

- 401: Unauthorized
- 400: OAuth-only user (no password)
- 400: Email already in use
- 400: Invalid email format

---

#### POST /api/profile/verify-email

**Request:**

```json
{
    "token": "64-character-token"
}
```

**Response (200):**

```json
{
    "success": true,
    "message": "Email address updated successfully"
}
```

**Errors:**

- 400: Invalid or expired token
- 400: Token already used

---

#### PUT /api/profile/password

**Request:**

```json
{
    "currentPassword": "old-password", // Optional if OAuth-only
    "newPassword": "new-password"
}
```

**Response (200):**

```json
{
    "success": true,
    "message": "Password updated successfully"
}
```

**Errors:**

- 401: Unauthorized
- 400: Current password incorrect
- 400: New password too short

---

### Two-Factor Endpoints

#### POST /api/two-factor/enable

**Request:**

```json
{
    "phone": "+14155552671"
}
```

**Response (200):**

```json
{
    "success": true,
    "message": "Verification code sent to your phone"
}
```

**Errors:**

- 401: Unauthorized
- 400: Invalid phone format
- 400: 2FA already enabled

---

#### POST /api/two-factor/verify-phone

**Request:**

```json
{
    "code": "123456"
}
```

**Response (200):**

```json
{
    "success": true,
    "backupCodes": [
        "ABCD-EFGH-IJKL",
        "MNOP-QRST-UVWX",
        ... // 8 codes total
    ]
}
```

**Errors:**

- 401: Unauthorized
- 400: Invalid code
- 400: Too many attempts
- 400: Code expired

---

#### POST /api/two-factor/disable

**Request:**

```json
{
    "password": "user-password"
}
```

**Response (200):**

```json
{
    "success": true,
    "message": "Two-factor authentication disabled successfully"
}
```

**Errors:**

- 401: Unauthorized
- 400: Incorrect password
- 400: 2FA not enabled

---

#### POST /api/two-factor/resend-code

**Request:**

```json
{}
```

**Response (200):**

```json
{
    "success": true,
    "message": "New verification code sent"
}
```

**Errors:**

- 401: Unauthorized
- 400: No pending verification

---

## Security Considerations

### Token Hashing

- **All tokens stored as SHA-256 hashes**, never plaintext
- 2FA codes: 6 digits → SHA-256 before storage
- Backup codes: 12 chars → SHA-256 before storage
- Email verification tokens: 64 chars → SHA-256 before storage

### Password Security

- **PBKDF2-SHA512** with 100,000 iterations
- 16-byte random salt
- Format: `salt:hash` (hex-encoded)

### Rate Limiting

- Email change: 10 requests/hour per user
- Enable 2FA: 5 requests/hour per user
- Resend code: 3 requests/hour per user

### Email Change Security

- **Hybrid approach:** Only users with passwords can change email
- OAuth-only users blocked from email changes
- Verification required (15-minute expiry)
- Notifications sent to both old and new addresses

### 2FA Security

- Codes expire after 5 minutes
- Max 3 verification attempts before new code required
- Backup codes are single-use only
- Disabling 2FA requires password verification
- All 2FA changes trigger email notifications

### Audit Trail

- IP address logged for all token operations
- User agent logged for verification attempts
- Email notifications for all security changes

---

## Testing Guide

### Prerequisites

1. Twilio account with credentials
2. Email service configured
3. Database migrated
4. Backend and frontend running

### Test Scenarios

#### 1. Name Change

```
1. Navigate to Account page
2. Click "Edit" next to Name
3. Enter new name
4. Click "Save"
✓ Name updates in UI
✓ Success toast appears
✓ Email notification received
```

#### 2. Email Change (Password User)

```
1. User must have password set
2. Click "Edit" next to Email
3. Enter new email
4. Click "Send Verification"
✓ Success message shown
✓ Verification email sent to new address
5. Check new email inbox
6. Click verification link
✓ Email updated
✓ Notifications sent to both addresses
```

#### 3. Email Change (OAuth-Only User)

```
1. User signed in via OAuth only (no password)
2. Click "Edit" next to Email
✓ Warning shown: "Must set password first"
✓ Input field disabled
✓ Submit button disabled
```

#### 4. Set Password (OAuth-Only User)

```
1. Click "Set Password"
2. Enter new password (8+ chars)
3. Confirm password
4. Click "Set Password"
✓ Password set successfully
✓ Success toast shown
✓ Email notification sent
✓ User can now change email
```

#### 5. Change Password (Existing Password)

```
1. Click "Change Password"
2. Enter current password
3. Enter new password
4. Confirm new password
5. Click "Change Password"
✓ Password updated
✓ Success toast shown
✓ Email notification sent
```

#### 6. Enable 2FA

```
Step 1:
1. Click "Enable" in 2FA section
2. Enter phone in E.164 format
3. Click "Send Code"
✓ SMS received with 6-digit code
✓ Dialog advances to verification step

Step 2:
4. Enter 6-digit code
5. Click "Verify"
✓ Backup codes displayed (8 codes)

Step 3:
6. Click "Download Codes"
✓ .txt file downloaded
7. Click individual copy buttons
✓ Codes copied to clipboard
8. Click "Done"
✓ 2FA shows as enabled
✓ Phone number displayed
✓ Email notification sent
```

#### 7. Resend 2FA Code

```
1. Start enabling 2FA
2. On verification step, click "Resend Code"
✓ New SMS received
✓ Timer resets to 5:00
✓ Old code invalidated
```

#### 8. Wrong 2FA Code (Attempts Tracking)

```
1. Enter wrong code
✓ Error shown: "Invalid code. 2 attempts remaining."
2. Enter wrong code again
✓ Error shown: "Invalid code. 1 attempt remaining."
3. Enter wrong code third time
✓ Error shown: "Too many attempts. Please request a new code."
✓ Must click "Resend Code"
```

#### 9. Disable 2FA

```
1. Click "Disable" in 2FA section
2. Warning shown about security
3. Enter password
4. Click "Disable 2FA"
✓ 2FA disabled
✓ Phone number removed
✓ Backup codes deleted
✓ Email notification sent
```

#### 10. Edge Cases

**Email Already in Use:**

```
1. Try changing to an email that exists
✓ Error: "This email address is already in use"
```

**Expired Email Verification:**

```
1. Wait > 15 minutes after email change request
2. Click verification link
✓ Error: "Verification link has expired"
```

**Expired 2FA Code:**

```
1. Start 2FA setup
2. Wait > 5 minutes
3. Try entering code
✓ Error: "Verification code has expired"
```

**Invalid Phone Format:**

```
1. Try enabling 2FA with invalid phone
✓ Error: "Phone number must be in E.164 format"
```

---

## Deployment

### Environment Setup

1. **Add to `.env` (backend):**

    ```
    TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
    TWILIO_AUTH_TOKEN=your_auth_token
    TWILIO_FROM_PHONE=+14155551234
    ```

2. **Update `.env.example`:**
    ```
    TWILIO_ACCOUNT_SID=
    TWILIO_AUTH_TOKEN=
    TWILIO_FROM_PHONE=
    ```

### Installation

1. **Install dependencies:**

    ```bash
    cd backend
    npm install twilio
    # Note: Resend and @react-email are already installed
    ```

2. **Run migration:**

    ```bash
    npm run db:migrate
    ```

3. **Verify migration:**

    ```bash
    # Check users table has new columns
    psql -d flowmaestro -c "\d users"

    # Check new tables exist
    psql -d flowmaestro -c "\dt two_factor*"
    ```

### Rollout Plan

1. **Phase 1:** Deploy backend with 2FA disabled (feature flag)
2. **Phase 2:** Deploy frontend with dialogs
3. **Phase 3:** Test end-to-end in staging
4. **Phase 4:** Enable 2FA feature flag in production
5. **Phase 5:** Monitor Twilio usage and email delivery

### Monitoring

- **Twilio Dashboard:** Monitor SMS delivery and costs
- **Resend Dashboard:** Monitor email delivery, bounces, and delivery rates
- **Error Logs:** Watch for validation failures and email/SMS errors
- **Database:** Monitor token expiry cleanup

---

## Success Criteria

Implementation is complete when:

1. ✅ All 37 files created/modified
2. ✅ Migration runs without errors
3. ✅ TypeScript compiles with no errors (`npx tsc --noEmit`)
4. ✅ All 10 test scenarios pass
5. ✅ All API endpoints return correct responses
6. ✅ SMS codes delivered via Twilio
7. ✅ Email notifications sent
8. ✅ No console errors in browser
9. ✅ No security vulnerabilities (see Security Checklist)
10. ✅ Follows FlowMaestro code style (CLAUDE.md)

---

## Notes

- **Email service:** Uses existing Resend API with React Email templates (see `backend/src/services/email/`)
    - Create new templates following the pattern in `templates/PasswordChangedEmail.tsx`
    - Templates needed: `NameChangedEmail`, `EmailChangedEmail`, `TwoFactorEnabledEmail`, `TwoFactorDisabledEmail`
- **SMS costs:** Each 2FA setup costs 1 SMS. Monitor Twilio usage.
- **Future enhancements:** TOTP support can use `two_factor_secret` column
- **Backup codes:** Users should be reminded to save codes securely
- **Recovery:** If user loses phone and backup codes, admin intervention required

---

**Estimated Implementation Time:** 3-5 days for an experienced developer

**Dependencies:**

- Twilio account (free tier available) for SMS
- Resend account (already configured) for email notifications
- Existing auth system
- Existing Dialog components
- PostgreSQL database
