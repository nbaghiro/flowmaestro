# Form Interfaces - Implementation Plan

## Overview

Form Interfaces allow users to create public-facing, branded interfaces that expose workflows or agents to external users. Unlike traditional form builders with drag-and-drop fields, Form Interfaces have a **fixed structure** optimized for AI-powered input/output interactions.

**Core Value Proposition**: Turn any workflow or agent into a shareable, branded mini-app with a public URL.

---

## User Decisions

| Decision            | Choice                                       |
| ------------------- | -------------------------------------------- |
| Form Interface URLs | Path-based (`/i/{slug}`)                     |
| File Storage        | GCS (existing infrastructure)                |
| Output Format       | Rich text (markdown rendering)               |
| Agent Display       | Final response only (no conversation thread) |
| Re-run              | Yes, "Run Again" button enabled              |
| Spam Prevention     | Rate limiting (10/min/IP)                    |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          FORM INTERFACE                                  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                      COVER PHOTO                                   │  │
│  │         (uploaded image / solid color / stock photo)               │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────┐                                                            │
│  │   ICON   │  Title                                                     │
│  │          │  Description text explaining what this form interface does │
│  └──────────┘                                                            │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Enter your message here...                                        │  │
│  │                                                                    │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─────────────────────────────┐  ┌────────────────────────────────────┐ │
│  │  📎 Attach Files            │  │  🔗 Add URL                        │ │
│  │  [file1.pdf] [image.png]    │  │  [https://example.com/article]     │ │
│  └─────────────────────────────┘  └────────────────────────────────────┘ │
│                                                                          │
│                           [ Submit ]                                     │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  OUTPUT AREA                                                       │  │
│  │                                                                    │  │
│  │  (Shows loading spinner during execution)                          │  │
│  │  (Displays rich text result from workflow/agent)                   │  │
│  │  (Editable after generation)                                       │  │
│  │                                                                    │  │
│  │  [Copy] [Download] [Run Again]                                     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Form Interface Sections

### 1. Cover Photo (Branding)

Options for form interface creator:

| Option           | Description                              |
| ---------------- | ---------------------------------------- |
| Upload Image     | Upload local image file (jpg, png, webp) |
| Predefined Color | Select from curated color palette        |
| Custom Color     | Pick any color via color picker          |
| Stock Photo      | Search and select from Unsplash library  |

**Storage**: Cover images uploaded to GCS at `users/{userId}/form-interfaces/{formInterfaceId}/cover.*`

### 2. Profile Icon

- Upload custom icon from computer
- Displayed as avatar overlapping cover photo (like Notion page icons)
- Supports image files and potentially emoji selection
- Storage: `users/{userId}/form-interfaces/{formInterfaceId}/icon.*`

### 3. Title & Description

- **Title**: Main heading (e.g., "Blog Post Generator", "Resume Analyzer")
- **Description**: Explanatory text set by creator, supports markdown
- Both are static (set by creator, not editable by form user)

### 4. Message Input

- Textarea for form user to enter their request/prompt
- Configurable placeholder text (e.g., "Describe the blog post you want...")
- Maps directly to:
    - Workflow: `inputs.message`
    - Agent: `initialMessage`

### 5. File & Webpage Context

Allow form user to provide additional context alongside their message.

**Files**:

- Drag-and-drop or click to upload
- Multiple files supported (configurable max, default 5)
- File types: PDF, images, documents, spreadsheets
- Uploaded to GCS with signed URLs for processing

**Webpages**:

- Input field to paste URLs
- Multiple URLs supported
- Used as context for workflow/agent (e.g., "analyze this article")

### 6. Output Display

- **Loading State**: Shows spinner/skeleton during execution
- **Result Display**: Rich text with markdown rendering (headers, lists, code blocks, tables)
- **Editable**: User can modify the output after generation
- **Actions**:
    - Copy to clipboard
    - Download as markdown/txt
    - Run Again (re-submit with modified input)

---

## Two-Phase Implementation

---

# Phase 1: Form Interface Builder & Public URLs

Build the complete form interface editor and public rendering infrastructure **without** workflow/agent execution. Form interfaces collect submissions but don't process them.

---

## 1.1 Database Schema

### Migration: `XXXXXX_create-form-interfaces.sql`

```sql
SET search_path TO flowmaestro, public;

-- Form Interface definitions
CREATE TABLE IF NOT EXISTS form_interfaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Identity
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,

    -- Target (REQUIRED - must link to workflow OR agent)
    target_type VARCHAR(20) NOT NULL,  -- 'workflow' | 'agent'
    workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,

    -- Branding
    cover_type VARCHAR(20) DEFAULT 'color',  -- 'image' | 'color' | 'stock'
    cover_value TEXT DEFAULT '#6366f1',      -- URL, hex color, or Unsplash photo ID
    icon_url TEXT,
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Input Configuration
    input_placeholder TEXT DEFAULT 'Enter your message...',
    input_label VARCHAR(255) DEFAULT 'Message',
    allow_file_upload BOOLEAN DEFAULT true,
    allow_url_input BOOLEAN DEFAULT true,
    max_files INTEGER DEFAULT 5,
    max_file_size_mb INTEGER DEFAULT 25,
    allowed_file_types TEXT[] DEFAULT ARRAY['application/pdf', 'image/*', 'text/*'],

    -- Output Configuration
    output_label VARCHAR(255) DEFAULT 'Output',
    show_copy_button BOOLEAN DEFAULT true,
    show_download_button BOOLEAN DEFAULT true,
    allow_output_edit BOOLEAN DEFAULT true,

    -- Submit Button
    submit_button_text VARCHAR(100) DEFAULT 'Submit',
    submit_loading_text VARCHAR(100) DEFAULT 'Processing...',

    -- State
    status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- 'draft' | 'published'
    published_at TIMESTAMP NULL,

    -- Stats
    submission_count BIGINT DEFAULT 0,
    last_submission_at TIMESTAMP NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    -- Constraints
    CONSTRAINT unique_user_slug UNIQUE (user_id, slug),
    CONSTRAINT valid_target CHECK (
        (target_type = 'workflow' AND workflow_id IS NOT NULL AND agent_id IS NULL) OR
        (target_type = 'agent' AND agent_id IS NOT NULL AND workflow_id IS NULL)
    )
);

-- Indexes for form_interfaces
CREATE INDEX idx_form_interfaces_user_id ON form_interfaces(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_form_interfaces_slug ON form_interfaces(slug) WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX idx_form_interfaces_status ON form_interfaces(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_form_interfaces_workflow ON form_interfaces(workflow_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_form_interfaces_agent ON form_interfaces(agent_id) WHERE deleted_at IS NULL;

-- Form interface submissions
CREATE TABLE IF NOT EXISTS form_interface_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interface_id UUID NOT NULL REFERENCES form_interfaces(id) ON DELETE CASCADE,

    -- User Input
    message TEXT,
    files JSONB DEFAULT '[]',     -- [{fileName, fileSize, mimeType, gcsUri}]
    urls JSONB DEFAULT '[]',      -- [{url, title?}]

    -- Output (populated in Phase 2)
    output TEXT,
    output_edited_at TIMESTAMP,   -- NULL if not edited, timestamp if user modified

    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for form_interface_submissions
CREATE INDEX idx_form_interface_submissions_interface_id ON form_interface_submissions(interface_id, created_at DESC);
CREATE INDEX idx_form_interface_submissions_submitted_at ON form_interface_submissions(submitted_at DESC);

-- Function to update submission count
CREATE OR REPLACE FUNCTION update_form_interface_submission_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE form_interfaces
    SET submission_count = submission_count + 1,
        last_submission_at = NEW.submitted_at,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.interface_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_form_interface_submission_count
    AFTER INSERT ON form_interface_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_form_interface_submission_count();
```

---

## 1.2 Shared Types

### File: `shared/src/types/form-interface.ts`

```typescript
// Cover photo types
export type FormInterfaceCoverType = "image" | "color" | "stock";

// File attachment
export interface FormInterfaceFileAttachment {
    fileName: string;
    fileSize: number;
    mimeType: string;
    gcsUri: string;
    downloadUrl?: string; // Signed URL for download
}

// URL attachment
export interface FormInterfaceUrlAttachment {
    url: string;
    title?: string;
}

// Target type
export type FormInterfaceTargetType = "workflow" | "agent";

// Main form interface configuration
export interface FormInterface {
    id: string;
    userId: string;

    // Identity
    name: string;
    slug: string;

    // Target (REQUIRED)
    targetType: FormInterfaceTargetType;
    workflowId: string | null;
    agentId: string | null;

    // Branding
    coverType: FormInterfaceCoverType;
    coverValue: string;
    iconUrl: string | null;
    title: string;
    description: string | null;

    // Input Config
    inputPlaceholder: string;
    inputLabel: string;
    allowFileUpload: boolean;
    allowUrlInput: boolean;
    maxFiles: number;
    maxFileSizeMb: number;
    allowedFileTypes: string[];

    // Output Config
    outputLabel: string;
    showCopyButton: boolean;
    showDownloadButton: boolean;
    allowOutputEdit: boolean;

    // Submit Button
    submitButtonText: string;
    submitLoadingText: string;

    // State
    status: "draft" | "published";
    publishedAt: Date | null;

    // Stats
    submissionCount: number;
    lastSubmissionAt: Date | null;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// Form interface submission
export interface FormInterfaceSubmission {
    id: string;
    interfaceId: string;

    // User Input
    message: string | null;
    files: FormInterfaceFileAttachment[];
    urls: FormInterfaceUrlAttachment[];

    // Output
    output: string | null;
    outputEditedAt: Date | null;

    // Metadata
    ipAddress: string | null;
    userAgent: string | null;
    submittedAt: Date;
}

// Create/Update DTOs
export interface CreateFormInterfaceInput {
    name: string;
    slug: string;
    title: string;
    // Target is REQUIRED - must provide exactly one
    targetType: FormInterfaceTargetType;
    workflowId?: string; // Required if targetType = 'workflow'
    agentId?: string; // Required if targetType = 'agent'
    description?: string;
    coverType?: FormInterfaceCoverType;
    coverValue?: string;
}

export interface UpdateFormInterfaceInput {
    name?: string;
    slug?: string;
    title?: string;
    description?: string;
    coverType?: FormInterfaceCoverType;
    coverValue?: string;
    iconUrl?: string;
    inputPlaceholder?: string;
    inputLabel?: string;
    allowFileUpload?: boolean;
    allowUrlInput?: boolean;
    maxFiles?: number;
    submitButtonText?: string;
    submitLoadingText?: string;
    outputLabel?: string;
    showCopyButton?: boolean;
    showDownloadButton?: boolean;
    allowOutputEdit?: boolean;
    // Target can be changed (rare, but allowed)
    targetType?: FormInterfaceTargetType;
    workflowId?: string;
    agentId?: string;
}

// Public form submission input
export interface SubmitFormInterfaceInput {
    message: string;
    files?: File[];
    urls?: string[];
}

// Public form interface response (for rendering)
export interface PublicFormInterface {
    id: string;
    slug: string;
    coverType: FormInterfaceCoverType;
    coverValue: string;
    iconUrl: string | null;
    title: string;
    description: string | null;
    inputPlaceholder: string;
    inputLabel: string;
    allowFileUpload: boolean;
    allowUrlInput: boolean;
    maxFiles: number;
    maxFileSizeMb: number;
    allowedFileTypes: string[];
    submitButtonText: string;
    submitLoadingText: string;
    outputLabel: string;
    showCopyButton: boolean;
    showDownloadButton: boolean;
    allowOutputEdit: boolean;
}
```

---

## 1.3 Backend Implementation

### Repository: `FormInterfaceRepository.ts`

```typescript
// backend/src/storage/repositories/FormInterfaceRepository.ts
import { pool } from "../database";
import type {
    FormInterface,
    CreateFormInterfaceInput,
    UpdateFormInterfaceInput
} from "@flowmaestro/shared";

export class FormInterfaceRepository {
    async create(userId: string, input: CreateFormInterfaceInput): Promise<FormInterface> {
        const result = await pool.query<FormInterface>(
            `INSERT INTO form_interfaces (user_id, name, slug, title, description, cover_type, cover_value)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                userId,
                input.name,
                input.slug,
                input.title,
                input.description,
                input.coverType || "color",
                input.coverValue || "#6366f1"
            ]
        );
        return this.mapToInterface(result.rows[0]);
    }

    async findById(id: string, userId: string): Promise<FormInterface | null> {
        const result = await pool.query(
            `SELECT * FROM form_interfaces WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
            [id, userId]
        );
        return result.rows[0] ? this.mapToInterface(result.rows[0]) : null;
    }

    async findBySlug(slug: string): Promise<FormInterface | null> {
        const result = await pool.query(
            `SELECT * FROM form_interfaces
             WHERE slug = $1 AND status = 'published' AND deleted_at IS NULL`,
            [slug]
        );
        return result.rows[0] ? this.mapToInterface(result.rows[0]) : null;
    }

    async findByUserId(userId: string): Promise<FormInterface[]> {
        const result = await pool.query(
            `SELECT * FROM form_interfaces
             WHERE user_id = $1 AND deleted_at IS NULL
             ORDER BY updated_at DESC`,
            [userId]
        );
        return result.rows.map(this.mapToInterface);
    }

    async update(
        id: string,
        userId: string,
        input: UpdateFormInterfaceInput
    ): Promise<FormInterface | null> {
        // Build dynamic update query based on provided fields
        const fields: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 3;

        Object.entries(input).forEach(([key, value]) => {
            if (value !== undefined) {
                fields.push(`${this.toSnakeCase(key)} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        });

        if (fields.length === 0) return this.findById(id, userId);

        const query = `
            UPDATE form_interfaces
            SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await pool.query(query, [id, userId, ...values]);
        return result.rows[0] ? this.mapToInterface(result.rows[0]) : null;
    }

    async publish(id: string, userId: string): Promise<FormInterface | null> {
        const result = await pool.query(
            `UPDATE form_interfaces
             SET status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
             RETURNING *`,
            [id, userId]
        );
        return result.rows[0] ? this.mapToInterface(result.rows[0]) : null;
    }

    async unpublish(id: string, userId: string): Promise<FormInterface | null> {
        const result = await pool.query(
            `UPDATE form_interfaces
             SET status = 'draft', published_at = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
             RETURNING *`,
            [id, userId]
        );
        return result.rows[0] ? this.mapToInterface(result.rows[0]) : null;
    }

    async findByWorkflowId(workflowId: string, userId: string): Promise<FormInterface[]> {
        const result = await pool.query(
            `SELECT * FROM form_interfaces
             WHERE workflow_id = $1 AND user_id = $2 AND deleted_at IS NULL
             ORDER BY updated_at DESC`,
            [workflowId, userId]
        );
        return result.rows.map(this.mapToInterface);
    }

    async findByAgentId(agentId: string, userId: string): Promise<FormInterface[]> {
        const result = await pool.query(
            `SELECT * FROM form_interfaces
             WHERE agent_id = $1 AND user_id = $2 AND deleted_at IS NULL
             ORDER BY updated_at DESC`,
            [agentId, userId]
        );
        return result.rows.map(this.mapToInterface);
    }

    async softDelete(id: string, userId: string): Promise<boolean> {
        const result = await pool.query(
            `UPDATE form_interfaces
             SET deleted_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
            [id, userId]
        );
        return (result.rowCount ?? 0) > 0;
    }

    async isSlugAvailable(slug: string, userId: string, excludeId?: string): Promise<boolean> {
        const query = excludeId
            ? `SELECT 1 FROM form_interfaces WHERE slug = $1 AND user_id = $2 AND id != $3 AND deleted_at IS NULL`
            : `SELECT 1 FROM form_interfaces WHERE slug = $1 AND user_id = $2 AND deleted_at IS NULL`;

        const params = excludeId ? [slug, userId, excludeId] : [slug, userId];
        const result = await pool.query(query, params);
        return result.rowCount === 0;
    }

    private mapToInterface(row: Record<string, unknown>): FormInterface {
        return {
            id: row.id as string,
            userId: row.user_id as string,
            name: row.name as string,
            slug: row.slug as string,
            coverType: row.cover_type as FormInterface["coverType"],
            coverValue: row.cover_value as string,
            iconUrl: row.icon_url as string | null,
            title: row.title as string,
            description: row.description as string | null,
            inputPlaceholder: row.input_placeholder as string,
            inputLabel: row.input_label as string,
            allowFileUpload: row.allow_file_upload as boolean,
            allowUrlInput: row.allow_url_input as boolean,
            maxFiles: row.max_files as number,
            maxFileSizeMb: row.max_file_size_mb as number,
            allowedFileTypes: row.allowed_file_types as string[],
            outputLabel: row.output_label as string,
            showCopyButton: row.show_copy_button as boolean,
            showDownloadButton: row.show_download_button as boolean,
            allowOutputEdit: row.allow_output_edit as boolean,
            submitButtonText: row.submit_button_text as string,
            submitLoadingText: row.submit_loading_text as string,
            status: row.status as FormInterface["status"],
            publishedAt: row.published_at ? new Date(row.published_at as string) : null,
            submissionCount: Number(row.submission_count),
            lastSubmissionAt: row.last_submission_at
                ? new Date(row.last_submission_at as string)
                : null,
            createdAt: new Date(row.created_at as string),
            updatedAt: new Date(row.updated_at as string)
        };
    }

    private toSnakeCase(str: string): string {
        return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    }
}
```

### Repository: `FormInterfaceSubmissionRepository.ts`

```typescript
// backend/src/storage/repositories/FormInterfaceSubmissionRepository.ts
import { pool } from "../database";
import type {
    FormInterfaceSubmission,
    FormInterfaceFileAttachment,
    FormInterfaceUrlAttachment
} from "@flowmaestro/shared";

export interface CreateFormInterfaceSubmissionInput {
    interfaceId: string;
    message: string | null;
    files: FormInterfaceFileAttachment[];
    urls: FormInterfaceUrlAttachment[];
    ipAddress: string | null;
    userAgent: string | null;
}

export class FormInterfaceSubmissionRepository {
    async create(input: CreateFormInterfaceSubmissionInput): Promise<FormInterfaceSubmission> {
        const result = await pool.query(
            `INSERT INTO form_interface_submissions
             (interface_id, message, files, urls, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                input.interfaceId,
                input.message,
                JSON.stringify(input.files),
                JSON.stringify(input.urls),
                input.ipAddress,
                input.userAgent
            ]
        );
        return this.mapToSubmission(result.rows[0]);
    }

    async findById(id: string): Promise<FormInterfaceSubmission | null> {
        const result = await pool.query(`SELECT * FROM form_interface_submissions WHERE id = $1`, [
            id
        ]);
        return result.rows[0] ? this.mapToSubmission(result.rows[0]) : null;
    }

    async findByInterfaceId(
        interfaceId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<FormInterfaceSubmission[]> {
        const result = await pool.query(
            `SELECT * FROM form_interface_submissions
             WHERE interface_id = $1
             ORDER BY submitted_at DESC
             LIMIT $2 OFFSET $3`,
            [interfaceId, limit, offset]
        );
        return result.rows.map(this.mapToSubmission);
    }

    async countByInterfaceId(interfaceId: string): Promise<number> {
        const result = await pool.query(
            `SELECT COUNT(*) FROM form_interface_submissions WHERE interface_id = $1`,
            [interfaceId]
        );
        return Number(result.rows[0].count);
    }

    async updateOutput(id: string, output: string): Promise<FormInterfaceSubmission | null> {
        const result = await pool.query(
            `UPDATE form_interface_submissions
             SET output = $2
             WHERE id = $1
             RETURNING *`,
            [id, output]
        );
        return result.rows[0] ? this.mapToSubmission(result.rows[0]) : null;
    }

    async markOutputEdited(id: string): Promise<void> {
        await pool.query(
            `UPDATE form_interface_submissions SET output_edited_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [id]
        );
    }

    private mapToSubmission(row: Record<string, unknown>): FormInterfaceSubmission {
        return {
            id: row.id as string,
            interfaceId: row.interface_id as string,
            message: row.message as string | null,
            files: (row.files as FormInterfaceFileAttachment[]) || [],
            urls: (row.urls as FormInterfaceUrlAttachment[]) || [],
            output: row.output as string | null,
            outputEditedAt: row.output_edited_at ? new Date(row.output_edited_at as string) : null,
            ipAddress: row.ip_address as string | null,
            userAgent: row.user_agent as string | null,
            submittedAt: new Date(row.submitted_at as string)
        };
    }
}
```

### API Routes

```
# Authenticated Routes
POST   /api/form-interfaces                     # Create form interface
GET    /api/form-interfaces                     # List user's form interfaces
GET    /api/form-interfaces/:id                 # Get form interface details
PUT    /api/form-interfaces/:id                 # Update form interface
DELETE /api/form-interfaces/:id                 # Delete form interface
POST   /api/form-interfaces/:id/publish         # Publish form interface
POST   /api/form-interfaces/:id/unpublish       # Unpublish form interface
POST   /api/form-interfaces/:id/duplicate       # Duplicate form interface
POST   /api/form-interfaces/:id/assets          # Upload cover/icon
GET    /api/form-interfaces/:id/submissions     # List submissions

# Lookup by Target (for workflow/agent editors)
GET    /api/form-interfaces?workflowId=x        # Get form interfaces linked to workflow
GET    /api/form-interfaces?agentId=x           # Get form interfaces linked to agent

# Public Routes (No Auth, Rate Limited)
GET    /api/public/form-interfaces/:slug           # Get form interface for rendering
POST   /api/public/form-interfaces/:slug/submit    # Submit form interface (multipart)
```

### Rate Limiting Middleware

```typescript
// backend/src/api/middleware/formInterfaceRateLimiter.ts
const submissionLimits = new Map<string, { count: number; resetAt: number }>();

export function createFormInterfaceRateLimiter(limitPerMinute: number = 10) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const ip = request.ip;
        const now = Date.now();
        const windowMs = 60 * 1000;

        const entry = submissionLimits.get(ip);

        if (entry && entry.resetAt > now) {
            if (entry.count >= limitPerMinute) {
                reply.status(429).send({
                    success: false,
                    error: "Too many submissions. Please try again in a minute."
                });
                return;
            }
            entry.count++;
        } else {
            submissionLimits.set(ip, { count: 1, resetAt: now + windowMs });
        }
    };
}
```

---

## 1.4 Frontend Implementation

### Entry Points

Users can create Form Interfaces from three locations:

#### 1. Form Interfaces List Page (Primary)

```
/form-interfaces → [+ Create Form Interface] → Target Selection Dialog → /form-interfaces/new?workflowId=x
                                                                       → /form-interfaces/new?agentId=x
```

The main hub for managing all form interfaces. Since a form interface without a target is useless, clicking "Create Form Interface" opens a **Target Selection Dialog** first:

```
┌─────────────────────────────────────────────────────────────────┐
│  Create Form Interface                                      [X] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  What should this form interface connect to?                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ⚡ Workflow                                             │    │
│  │  Execute a workflow when user submits the form          │    │
│  │                                                         │    │
│  │  [Select Workflow            ▼]                         │    │
│  │                                                         │    │
│  │  Recent: Lead Capture, Email Processor, Data Pipeline   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  🤖 Agent                                               │    │
│  │  Start an agent conversation when user submits          │    │
│  │                                                         │    │
│  │  [Select Agent               ▼]                         │    │
│  │                                                         │    │
│  │  Recent: Support Bot, Research Assistant, Code Helper   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│                                    [Cancel]  [Continue →]       │
└─────────────────────────────────────────────────────────────────┘
```

- User must select either a workflow OR an agent before proceeding
- "Continue" button disabled until selection is made
- Navigates to `/form-interfaces/new?workflowId={id}` or `/form-interfaces/new?agentId={id}`

#### 2. Workflow Editor

```
┌─────────────────────────────────────────────────────────────────┐
│  Workflow: Lead Capture Pipeline                    [Save] [Run]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐                    │
│  │ Trigger │────▶│ Process │────▶│  Email  │                    │
│  └─────────┘     └─────────┘     └─────────┘                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Form Interfaces                                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  No form interfaces linked to this workflow              │   │
│  │  [+ Create Form Interface]                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

- Button in workflow editor sidebar/footer
- Creates form interface with workflow pre-linked (`targetType: 'workflow'`, `workflowId` set)
- Navigates to: `/form-interfaces/new?workflowId={id}`

#### 3. Agent Builder

```
┌─────────────────────────────────────────────────────────────────┐
│  Agent: Customer Support Bot                       [Save] [Test]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  System Prompt: You are a helpful customer support agent...     │
│                                                                 │
│  Tools: [Knowledge Base] [Create Ticket] [Send Email]           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Form Interfaces                                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  No form interfaces linked to this agent                 │   │
│  │  [+ Create Form Interface]                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

- Button in agent builder sidebar/footer
- Creates form interface with agent pre-linked (`targetType: 'agent'`, `agentId` set)
- Navigates to: `/form-interfaces/new?agentId={id}`

#### Query Parameter Handling

```typescript
// In FormInterfaceEditorPage.tsx
const [searchParams] = useSearchParams();
const workflowId = searchParams.get("workflowId");
const agentId = searchParams.get("agentId");

// Pre-populate target when creating from workflow/agent editor
useEffect(() => {
    if (workflowId) {
        updateFormInterface({
            targetType: "workflow",
            workflowId,
            name: `Form Interface for ${workflowName}`
        });
    } else if (agentId) {
        updateFormInterface({
            targetType: "agent",
            agentId,
            name: `Form Interface for ${agentName}`
        });
    }
}, [workflowId, agentId]);
```

#### Linked Form Interfaces Display

When a workflow/agent has linked form interfaces, show them:

```
┌──────────────────────────────────────────────────────────────┐
│  Form Interfaces                                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 📝 Lead Capture Form          Published   89 subs      │  │
│  │    /i/lead-capture            [Edit] [View] [Unlink]   │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ 📝 Contact Us                 Draft       0 subs       │  │
│  │    /i/contact-us              [Edit] [View] [Unlink]   │  │
│  └────────────────────────────────────────────────────────┘  │
│  [+ Create Another Form Interface]                           │
└──────────────────────────────────────────────────────────────┘
```

---

### Pages

| Route                               | Component                          | Description                     |
| ----------------------------------- | ---------------------------------- | ------------------------------- |
| `/form-interfaces`                  | `FormInterfacesPage.tsx`           | List of user's form interfaces  |
| `/form-interfaces/new`              | `FormInterfaceEditorPage.tsx`      | Create new form interface       |
| `/form-interfaces/new?workflowId=x` | `FormInterfaceEditorPage.tsx`      | Create with workflow pre-linked |
| `/form-interfaces/new?agentId=x`    | `FormInterfaceEditorPage.tsx`      | Create with agent pre-linked    |
| `/form-interfaces/:id/edit`         | `FormInterfaceEditorPage.tsx`      | Edit existing form interface    |
| `/form-interfaces/:id/submissions`  | `FormInterfaceSubmissionsPage.tsx` | View form interface submissions |
| `/i/:slug`                          | `PublicFormInterfacePage.tsx`      | Public form interface (no auth) |

### Component Tree

```
frontend/src/
├── pages/
│   ├── FormInterfacesPage.tsx              # List all form interfaces
│   ├── FormInterfaceEditorPage.tsx         # Create/edit form interface
│   ├── FormInterfaceSubmissionsPage.tsx    # View submissions
│   └── PublicFormInterfacePage.tsx         # Public form interface render
│
├── components/form-interface-builder/
│   ├── TargetSelectionDialog.tsx           # Workflow/Agent selection (shown on create)
│   ├── FormInterfaceEditorLayout.tsx       # Main editor layout
│   ├── FormInterfacePreview.tsx            # Live preview panel
│   ├── TargetDisplay.tsx                   # Shows linked workflow/agent in editor
│   │
│   ├── CoverEditor.tsx                     # Cover photo options
│   │   ├── ImageUploader.tsx               # Upload local image
│   │   ├── ColorPicker.tsx                 # Solid color picker
│   │   ├── ColorPalette.tsx                # Predefined colors
│   │   └── StockPhotoSearch.tsx            # Unsplash integration
│   │
│   ├── IconUploader.tsx                    # Profile icon upload
│   ├── TitleDescriptionEditor.tsx          # Title & description inputs
│   ├── InputConfigEditor.tsx               # Message input settings
│   ├── ContextConfigEditor.tsx             # Files/URLs toggles
│   ├── OutputConfigEditor.tsx              # Output area settings
│   └── SubmitButtonEditor.tsx              # Button text settings
│
├── components/public-form-interface/
│   ├── FormInterfaceHeader.tsx             # Cover + icon + title
│   ├── MessageInput.tsx                    # Textarea input
│   ├── FileUploader.tsx                    # File attachment area
│   ├── UrlInput.tsx                        # URL input area
│   ├── SubmitButton.tsx                    # Submit button
│   └── OutputDisplay.tsx                   # Rich text output area
│       ├── LoadingState.tsx                # Loading spinner
│       ├── MarkdownRenderer.tsx            # Render markdown output
│       └── OutputActions.tsx               # Copy/download/edit buttons
│
└── stores/
    └── formInterfaceBuilderStore.ts        # Zustand store
```

### Zustand Store

```typescript
// frontend/src/stores/formInterfaceBuilderStore.ts
import { create } from "zustand";
import type { FormInterface, UpdateFormInterfaceInput } from "@flowmaestro/shared";

interface FormInterfaceBuilderStore {
    // State
    interface: FormInterface | null;
    isDirty: boolean;
    isSaving: boolean;
    isPublishing: boolean;
    activeTab: "design" | "input" | "output" | "settings";

    // Actions
    setInterface: (iface: FormInterface) => void;
    updateInterface: (updates: UpdateFormInterfaceInput) => void;
    setActiveTab: (tab: FormInterfaceBuilderStore["activeTab"]) => void;
    save: () => Promise<void>;
    publish: () => Promise<void>;
    unpublish: () => Promise<void>;
    reset: () => void;
}

export const useFormInterfaceBuilderStore = create<FormInterfaceBuilderStore>((set, get) => ({
    interface: null,
    isDirty: false,
    isSaving: false,
    isPublishing: false,
    activeTab: "design",

    setInterface: (iface) => set({ interface: iface, isDirty: false }),

    updateInterface: (updates) => {
        const { interface: current } = get();
        if (!current) return;

        set({
            interface: { ...current, ...updates },
            isDirty: true
        });
    },

    setActiveTab: (tab) => set({ activeTab: tab }),

    save: async () => {
        const { interface: iface } = get();
        if (!iface) return;

        set({ isSaving: true });
        try {
            await api.updateFormInterface(iface.id, {
                name: iface.name,
                slug: iface.slug,
                title: iface.title,
                description: iface.description,
                coverType: iface.coverType,
                coverValue: iface.coverValue,
                iconUrl: iface.iconUrl,
                inputPlaceholder: iface.inputPlaceholder,
                inputLabel: iface.inputLabel,
                allowFileUpload: iface.allowFileUpload,
                allowUrlInput: iface.allowUrlInput,
                maxFiles: iface.maxFiles,
                submitButtonText: iface.submitButtonText,
                outputLabel: iface.outputLabel,
                showCopyButton: iface.showCopyButton,
                showDownloadButton: iface.showDownloadButton,
                allowOutputEdit: iface.allowOutputEdit
            });
            set({ isDirty: false });
        } finally {
            set({ isSaving: false });
        }
    },

    publish: async () => {
        const { interface: iface } = get();
        if (!iface) return;

        set({ isPublishing: true });
        try {
            const updated = await api.publishFormInterface(iface.id);
            set({ interface: updated, isDirty: false });
        } finally {
            set({ isPublishing: false });
        }
    },

    unpublish: async () => {
        const { interface: iface } = get();
        if (!iface) return;

        const updated = await api.unpublishFormInterface(iface.id);
        set({ interface: updated });
    },

    reset: () =>
        set({
            interface: null,
            isDirty: false,
            isSaving: false,
            isPublishing: false,
            activeTab: "design"
        })
}));
```

---

## 1.5 Phase 1 Deliverables

- [ ] Target selection dialog (workflow/agent picker) - REQUIRED before creating
- [ ] Create/edit/delete Form Interfaces
- [ ] Cover photo options (upload, color, stock photos)
- [ ] Icon upload
- [ ] Title/description editing
- [ ] Input configuration (placeholder, labels)
- [ ] File/URL toggles
- [ ] Output configuration
- [ ] Target display in editor (shows linked workflow/agent)
- [ ] Publish/unpublish form interfaces
- [ ] Public URL rendering (`/i/:slug`)
- [ ] Collect submissions (message + files + URLs)
- [ ] View submissions list with data
- [ ] Rate limiting on public endpoints

---

# Phase 2: Workflow & Agent Execution

Connect form interfaces to trigger workflows or agents on submission, with real-time output streaming.

---

## 2.1 Database Updates

### Migration: `XXXXXX_add-execution-tracking.sql`

```sql
SET search_path TO flowmaestro, public;

-- Add execution tracking columns to submissions
-- (Target columns already exist in form_interfaces from Phase 1)
ALTER TABLE form_interface_submissions
    ADD COLUMN execution_id UUID REFERENCES executions(id) ON DELETE SET NULL,
    ADD COLUMN execution_status VARCHAR(50),  -- pending, running, completed, failed
    ADD COLUMN thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,
    ADD COLUMN agent_execution_id UUID REFERENCES agent_executions(id) ON DELETE SET NULL,
    ADD COLUMN error TEXT;

-- Indexes for execution tracking
CREATE INDEX idx_form_interface_submissions_execution ON form_interface_submissions(execution_id);
CREATE INDEX idx_form_interface_submissions_thread ON form_interface_submissions(thread_id);
```

---

## 2.2 Shared Types Updates

```typescript
// Add to shared/src/types/form-interface.ts

// Submission with execution tracking (extends base FormInterfaceSubmission)
export interface FormInterfaceSubmissionWithExecution extends FormInterfaceSubmission {
    executionId: string | null;
    executionStatus: "pending" | "running" | "completed" | "failed" | null;
    threadId: string | null;
    agentExecutionId: string | null;
    error: string | null;
}

// Form interface submission result (returned to public form interface after submit)
export interface FormInterfaceSubmissionResult {
    submissionId: string;
    status: "pending" | "running" | "completed" | "failed";
    output: string | null;
    error: string | null;
}
```

---

## 2.3 Backend Services

### FormInterfaceWorkflowTrigger Service

```typescript
// backend/src/services/FormInterfaceWorkflowTriggerService.ts
import { Client as TemporalClient } from "@temporalio/client";
import type { FormInterface, FormInterfaceSubmission } from "@flowmaestro/shared";

export class FormInterfaceWorkflowTriggerService {
    constructor(
        private temporalClient: TemporalClient,
        private submissionRepo: FormInterfaceSubmissionRepository
    ) {}

    async triggerWorkflow(
        formInterface: FormInterface,
        submission: FormInterfaceSubmission
    ): Promise<{ executionId: string }> {
        // Build workflow inputs from submission
        const inputs = {
            _interfaceId: formInterface.id,
            _submissionId: submission.id,
            _submittedAt: submission.submittedAt.toISOString(),
            message: submission.message,
            files: submission.files.map((f) => ({
                fileName: f.fileName,
                fileSize: f.fileSize,
                mimeType: f.mimeType,
                downloadUrl: f.downloadUrl
            })),
            urls: submission.urls.map((u) => u.url)
        };

        // Start Temporal workflow
        const workflowId = `form-interface-${formInterface.id}-${submission.id}`;
        const handle = await this.temporalClient.workflow.start("orchestratorWorkflow", {
            taskQueue: "flowmaestro-orchestrator",
            workflowId,
            args: [
                {
                    workflowId: formInterface.workflowId,
                    inputs,
                    userId: formInterface.userId
                }
            ]
        });

        // Create execution record and update submission
        // ... (similar to existing trigger flow)

        return { executionId: submission.id };
    }
}
```

### FormInterfaceAgentTrigger Service

```typescript
// backend/src/services/FormInterfaceAgentTriggerService.ts
import type { FormInterface, FormInterfaceSubmission } from "@flowmaestro/shared";

export class FormInterfaceAgentTriggerService {
    constructor(
        private threadRepo: ThreadRepository,
        private agentService: AgentService,
        private submissionRepo: FormInterfaceSubmissionRepository
    ) {}

    async triggerAgent(
        formInterface: FormInterface,
        submission: FormInterfaceSubmission
    ): Promise<{ threadId: string; executionId: string }> {
        // Create new thread for this submission
        const thread = await this.threadRepo.create({
            agentId: formInterface.agentId!,
            userId: formInterface.userId,
            title: `${formInterface.title} - ${new Date().toLocaleDateString()}`,
            metadata: {
                interfaceId: formInterface.id,
                submissionId: submission.id
            }
        });

        // Build context message from submission
        const contextMessage = this.buildContextMessage(submission);

        // Start agent execution
        const execution = await this.agentService.executeAgent({
            agentId: formInterface.agentId!,
            threadId: thread.id,
            message: contextMessage,
            userId: formInterface.userId
        });

        // Update submission with thread/execution info
        await this.submissionRepo.updateExecutionInfo(submission.id, {
            targetType: "agent",
            threadId: thread.id,
            agentExecutionId: execution.id,
            executionStatus: "running"
        });

        return {
            threadId: thread.id,
            executionId: execution.id
        };
    }

    private buildContextMessage(submission: FormInterfaceSubmission): string {
        let message = submission.message || "";

        // Append file context
        if (submission.files.length > 0) {
            message += "\n\n**Attached Files:**\n";
            submission.files.forEach((f) => {
                message += `- ${f.fileName} (${f.mimeType})\n`;
            });
        }

        // Append URL context
        if (submission.urls.length > 0) {
            message += "\n\n**Referenced URLs:**\n";
            submission.urls.forEach((u) => {
                message += `- ${u.url}\n`;
            });
        }

        return message;
    }
}
```

### WebSocket Events for Streaming

```typescript
// Emit events during execution for real-time updates
interface FormInterfaceExecutionEvent {
    type: "status" | "output" | "error" | "complete";
    submissionId: string;
    data: {
        status?: string;
        output?: string; // Partial or complete output
        error?: string;
        isStreaming?: boolean; // True while agent is still generating
    };
}

// Client subscribes to: `form-interface:${submissionId}`
```

---

## 2.4 Frontend Updates

### Target Selector Component

```typescript
// frontend/src/components/form-interface-builder/TargetSelector.tsx
interface TargetSelectorProps {
    targetType: FormInterfaceTargetType | null;
    workflowId: string | null;
    agentId: string | null;
    onTargetChange: (type: FormInterfaceTargetType | null, id: string | null) => void;
}

// UI: Radio buttons for None/Workflow/Agent
// When Workflow selected: show workflow dropdown
// When Agent selected: show agent dropdown
```

### Output Display Component (Enhanced)

```typescript
// frontend/src/components/public-form-interface/OutputDisplay.tsx
interface OutputDisplayProps {
    submissionId: string | null;
    status: "idle" | "pending" | "running" | "completed" | "failed";
    output: string | null;
    error: string | null;
    allowEdit: boolean;
    showCopy: boolean;
    showDownload: boolean;
    onOutputEdit: (newOutput: string) => void;
    onRunAgain: () => void;
}

// States:
// - idle: Show placeholder or nothing
// - pending/running: Show loading spinner with status text
// - completed: Show markdown-rendered output with actions
// - failed: Show error message with retry option
```

### Run Again Flow

```typescript
// In PublicFormInterfacePage.tsx
const handleRunAgain = () => {
    // Keep current input values
    // Clear output
    // Reset to idle state
    // User can modify input and resubmit
    setSubmissionId(null);
    setStatus("idle");
    setOutput(null);
};
```

---

## 2.5 Data Flow Diagrams

### Workflow Execution Flow

```
User fills form interface → Submit
         │
         ▼
POST /api/public/form-interfaces/:slug/submit
         │
         ├─► Upload files to GCS
         ├─► Create form_interface_submission record
         ├─► Return submissionId to client
         │
         ▼
FormInterfaceWorkflowTriggerService.triggerWorkflow()
         │
         ├─► Build inputs from submission
         ├─► Start orchestratorWorkflow
         ├─► Update submission.execution_status = 'running'
         │
         ▼
Temporal Workflow Executes
         │
         ├─► Emit progress events via WebSocket
         │
         ▼
Workflow Completes
         │
         ├─► Extract output from workflow result
         ├─► Update submission.output
         ├─► Update submission.execution_status = 'completed'
         ├─► Emit 'complete' event
         │
         ▼
Client receives output, displays in OutputDisplay
```

### Agent Execution Flow

```
User fills form interface → Submit
         │
         ▼
POST /api/public/form-interfaces/:slug/submit
         │
         ├─► Upload files to GCS
         ├─► Create form_interface_submission record
         ├─► Return submissionId to client
         │
         ▼
FormInterfaceAgentTriggerService.triggerAgent()
         │
         ├─► Create new thread
         ├─► Build context message from submission
         ├─► Start agentOrchestratorWorkflow
         │
         ▼
Agent Executes (streaming)
         │
         ├─► Stream partial responses via WebSocket
         │
         ▼
Agent Completes
         │
         ├─► Final response = output
         ├─► Update submission.output
         ├─► Update submission.execution_status = 'completed'
         │
         ▼
Client displays final response in OutputDisplay
(Only final response shown, not conversation thread)
```

---

## 2.6 Phase 2 Deliverables

- [ ] Target selector (workflow/agent) in editor
- [ ] Workflow trigger on submit
- [ ] Agent trigger on submit
- [ ] Real-time status updates via WebSocket
- [ ] Streaming output for agents
- [ ] Output display with loading states
- [ ] Rich text rendering (markdown)
- [ ] Copy/download output buttons
- [ ] Output editing capability
- [ ] Run Again functionality
- [ ] Error handling and retry

---

## Security Considerations

### Rate Limiting

- 10 submissions per minute per IP address
- Configurable per form interface (future)

### File Upload Security

- Allowed MIME types: PDF, images, documents, text
- Max file size: 25MB per file
- Max total: 100MB per submission
- Max files: 5 per submission (configurable)
- Files scanned for malware (future)

### Slug Validation

```typescript
const RESERVED_SLUGS = [
    "api",
    "admin",
    "interfaces",
    "i",
    "login",
    "logout",
    "signup",
    "settings",
    "dashboard",
    "workflows",
    "agents"
];

function validateSlug(slug: string): boolean {
    if (RESERVED_SLUGS.includes(slug.toLowerCase())) return false;
    return /^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$/.test(slug);
}
```

---

## Key Files to Create

### Backend

```
backend/migrations/XXXXXX_create-form-interfaces.sql
backend/migrations/XXXXXX_add-form-interface-execution-tracking.sql
backend/src/storage/models/FormInterface.ts
backend/src/storage/repositories/FormInterfaceRepository.ts
backend/src/storage/repositories/FormInterfaceSubmissionRepository.ts
backend/src/api/routes/form-interfaces/index.ts
backend/src/api/routes/form-interfaces/create.ts
backend/src/api/routes/form-interfaces/list.ts
backend/src/api/routes/form-interfaces/get.ts
backend/src/api/routes/form-interfaces/update.ts
backend/src/api/routes/form-interfaces/delete.ts
backend/src/api/routes/form-interfaces/publish.ts
backend/src/api/routes/form-interfaces/submissions.ts
backend/src/api/routes/public/form-interfaces.ts
backend/src/api/middleware/formInterfaceRateLimiter.ts
backend/src/services/FormInterfaceWorkflowTriggerService.ts
backend/src/services/FormInterfaceAgentTriggerService.ts
backend/src/services/FormInterfaceStorageService.ts
```

### Shared

```
shared/src/types/form-interface.ts
```

### Frontend

```
frontend/src/pages/FormInterfacesPage.tsx
frontend/src/pages/FormInterfaceEditorPage.tsx
frontend/src/pages/FormInterfaceSubmissionsPage.tsx
frontend/src/pages/PublicFormInterfacePage.tsx
frontend/src/stores/formInterfaceBuilderStore.ts
frontend/src/components/form-interface-builder/*.tsx
frontend/src/components/public-form-interface/*.tsx
frontend/src/lib/formInterfaceApi.ts
```

---

## Reference Files

| Pattern                   | Reference File                                            |
| ------------------------- | --------------------------------------------------------- |
| Repository pattern        | `backend/src/storage/repositories/TriggerRepository.ts`   |
| API route structure       | `backend/src/api/routes/triggers/webhook.ts`              |
| Public endpoint (no auth) | `backend/src/api/routes/triggers/webhook.ts`              |
| GCS file uploads          | `backend/src/services/storage/GCSStorageService.ts`       |
| Zustand store pattern     | `frontend/src/stores/workflowStore.ts`                    |
| Agent execution           | `backend/src/temporal/workflows/agent-orchestrator.ts`    |
| Workflow execution        | `backend/src/temporal/workflows/workflow-orchestrator.ts` |
