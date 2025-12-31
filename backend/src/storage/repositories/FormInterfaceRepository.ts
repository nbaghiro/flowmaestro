import type {
    FormInterface,
    CreateFormInterfaceInput,
    UpdateFormInterfaceInput
} from "@flowmaestro/shared/src/form-interface";
import { db } from "../database";

interface FormInterfaceRow {
    id: string;
    user_id: string;

    name: string;
    slug: string;

    target_type: "workflow" | "agent";
    workflow_id: string | null;
    agent_id: string | null;

    cover_type: "image" | "color" | "stock";
    cover_value: string;
    icon_url: string | null;
    title: string;
    description: string | null;

    input_placeholder: string;
    input_label: string;
    allow_file_upload: boolean;
    allow_url_input: boolean;
    max_files: number;
    max_file_size_mb: number;
    allowed_file_types: string[];

    output_label: string;
    show_copy_button: boolean;
    show_download_button: boolean;
    allow_output_edit: boolean;

    submit_button_text: string;
    submit_loading_text: string;

    status: "draft" | "published";
    published_at: Date | null;

    submission_count: number;
    last_submission_at: Date | null;

    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export class FormInterfaceRepository {
    async create(userId: string, input: CreateFormInterfaceInput): Promise<FormInterface> {
        const result = await db.query(
            `
            INSERT INTO form_interfaces (
                user_id,
                name,
                slug,
                title,
                description,
                target_type,
                workflow_id,
                agent_id,
                cover_type,
                cover_value
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            RETURNING *
            `,
            [
                userId,
                input.name,
                input.slug,
                input.title,
                input.description ?? null,
                input.targetType,
                input.workflowId ?? null,
                input.agentId ?? null,
                input.coverType ?? "color",
                input.coverValue ?? "#6366f1"
            ]
        );

        return this.map(result.rows[0] as FormInterfaceRow);
    }

    async findBySlug(slug: string): Promise<FormInterface | null> {
        const result = await db.query(
            `
            SELECT *
            FROM form_interfaces
            WHERE slug = $1
              AND status = 'published'
              AND deleted_at IS NULL
            `,
            [slug]
        );

        return result.rows[0] ? this.map(result.rows[0] as FormInterfaceRow) : null;
    }

    async findById(id: string, userId: string): Promise<FormInterface | null> {
        const result = await db.query(
            `
            SELECT *
            FROM form_interfaces
            WHERE id = $1
            AND user_id = $2
            AND deleted_at IS NULL
            `,
            [id, userId]
        );

        return result.rows[0] ? this.map(result.rows[0] as FormInterfaceRow) : null;
    }

    async listByUser(userId: string): Promise<FormInterface[]> {
        const result = await db.query(
            `
            SELECT *
            FROM form_interfaces
            WHERE user_id = $1
              AND deleted_at IS NULL
            ORDER BY updated_at DESC
            `,
            [userId]
        );

        return result.rows.map((row) => this.map(row as FormInterfaceRow));
    }

    async update(
        id: string,
        userId: string,
        input: UpdateFormInterfaceInput
    ): Promise<FormInterface | null> {
        const fields: string[] = [];
        const values: unknown[] = [];
        let i = 3;

        Object.entries(input).forEach(([key, value]) => {
            if (value !== undefined) {
                fields.push(`${this.toSnake(key)} = $${i++}`);
                values.push(value);
            }
        });

        if (!fields.length) return this.findById(id, userId);

        const result = await db.query(
            `
            UPDATE form_interfaces
            SET ${fields.join(", ")},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND user_id = $2
              AND deleted_at IS NULL
            RETURNING *
            `,
            [id, userId, ...values]
        );

        return result.rows[0] ? this.map(result.rows[0] as FormInterfaceRow) : null;
    }

    async publish(id: string, userId: string): Promise<FormInterface | null> {
        const result = await db.query(
            `
            UPDATE form_interfaces
            SET status = 'published',
                published_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND user_id = $2
              AND deleted_at IS NULL
            RETURNING *
            `,
            [id, userId]
        );

        return result.rows[0] ? this.map(result.rows[0] as FormInterfaceRow) : null;
    }

    async unpublish(id: string, userId: string): Promise<FormInterface | null> {
        const result = await db.query(
            `
            UPDATE form_interfaces
            SET status = 'draft',
                published_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND user_id = $2
              AND deleted_at IS NULL
            RETURNING *
            `,
            [id, userId]
        );

        return result.rows[0] ? this.map(result.rows[0] as FormInterfaceRow) : null;
    }

    async softDelete(id: string, userId: string): Promise<boolean> {
        const result = await db.query(
            `
            UPDATE form_interfaces
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND user_id = $2
              AND deleted_at IS NULL
            `,
            [id, userId]
        );

        return (result.rowCount ?? 0) > 0;
    }

    private map(row: FormInterfaceRow): FormInterface {
        return {
            id: row.id,
            userId: row.user_id,

            name: row.name,
            slug: row.slug,

            targetType: row.target_type,
            workflowId: row.workflow_id,
            agentId: row.agent_id,

            coverType: row.cover_type,
            coverValue: row.cover_value,
            iconUrl: row.icon_url,
            title: row.title,
            description: row.description,

            inputPlaceholder: row.input_placeholder,
            inputLabel: row.input_label,
            allowFileUpload: row.allow_file_upload,
            allowUrlInput: row.allow_url_input,
            maxFiles: row.max_files,
            maxFileSizeMb: row.max_file_size_mb,
            allowedFileTypes: row.allowed_file_types,

            outputLabel: row.output_label,
            showCopyButton: row.show_copy_button,
            showDownloadButton: row.show_download_button,
            allowOutputEdit: row.allow_output_edit,

            submitButtonText: row.submit_button_text,
            submitLoadingText: row.submit_loading_text,

            status: row.status,
            publishedAt: row.published_at,

            submissionCount: Number(row.submission_count),
            lastSubmissionAt: row.last_submission_at,

            createdAt: row.created_at,
            updatedAt: row.updated_at,
            deletedAt: row.deleted_at
        };
    }

    private toSnake(str: string) {
        return str.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
    }
}
