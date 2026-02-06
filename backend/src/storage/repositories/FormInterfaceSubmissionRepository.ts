import type {
    FormInterfaceSubmission,
    FormInterfaceFileAttachment,
    FormInterfaceUrlAttachment,
    FormSubmissionExecutionStatus,
    FormSubmissionAttachmentsStatus
} from "@flowmaestro/shared";
import { db } from "../database";

// Database row interface
interface FormInterfaceSubmissionRow {
    id: string;
    interface_id: string;
    message: string | null;
    files: FormInterfaceFileAttachment[] | string;
    urls: FormInterfaceUrlAttachment[] | string;
    output: string | null;
    output_edited_at: string | Date | null;
    execution_id: string | null;
    execution_status: FormSubmissionExecutionStatus;
    attachments_status: FormSubmissionAttachmentsStatus;
    ip_address: string | null;
    user_agent: string | null;
    submitted_at: string | Date;
    created_at: string | Date;
}

// Input for creating a submission
export interface CreateFormInterfaceSubmissionInput {
    interfaceId: string;
    message: string | null;
    files: FormInterfaceFileAttachment[];
    urls: FormInterfaceUrlAttachment[];
    ipAddress: string | null;
    userAgent: string | null;
    executionStatus?: FormSubmissionExecutionStatus;
}

export class FormInterfaceSubmissionRepository {
    /**
     * Create a new submission
     */
    async create(input: CreateFormInterfaceSubmissionInput): Promise<FormInterfaceSubmission> {
        const query = `
            INSERT INTO flowmaestro.form_interface_submissions
                (interface_id, message, files, urls, ip_address, user_agent, execution_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const values = [
            input.interfaceId,
            input.message,
            JSON.stringify(input.files),
            JSON.stringify(input.urls),
            input.ipAddress,
            input.userAgent,
            input.executionStatus || "pending"
        ];

        const result = await db.query(query, values);
        return this.mapRow(result.rows[0] as FormInterfaceSubmissionRow);
    }

    /**
     * Find submission by ID
     */
    async findById(id: string): Promise<FormInterfaceSubmission | null> {
        const query = `
            SELECT * FROM flowmaestro.form_interface_submissions
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return result.rows.length > 0
            ? this.mapRow(result.rows[0] as FormInterfaceSubmissionRow)
            : null;
    }

    /**
     * Find submissions for a form interface
     */
    async findByInterfaceId(
        interfaceId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{ submissions: FormInterfaceSubmission[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.form_interface_submissions
            WHERE interface_id = $1
        `;

        const query = `
            SELECT * FROM flowmaestro.form_interface_submissions
            WHERE interface_id = $1
            ORDER BY submitted_at DESC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, submissionsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, [interfaceId]),
            db.query(query, [interfaceId, limit, offset])
        ]);

        return {
            submissions: submissionsResult.rows.map((row) =>
                this.mapRow(row as FormInterfaceSubmissionRow)
            ),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * Count submissions for a form interface
     */
    async countByInterfaceId(interfaceId: string): Promise<number> {
        const query = `
            SELECT COUNT(*) as count
            FROM flowmaestro.form_interface_submissions
            WHERE interface_id = $1
        `;

        const result = await db.query<{ count: string }>(query, [interfaceId]);
        return parseInt(result.rows[0].count);
    }

    /**
     * Update the output of a submission (for Phase 2 execution)
     */
    async updateOutput(id: string, output: string): Promise<FormInterfaceSubmission | null> {
        const query = `
            UPDATE flowmaestro.form_interface_submissions
            SET output = $2
            WHERE id = $1
            RETURNING *
        `;

        const result = await db.query(query, [id, output]);
        return result.rows.length > 0
            ? this.mapRow(result.rows[0] as FormInterfaceSubmissionRow)
            : null;
    }

    /**
     * Mark output as edited by user
     */
    async markOutputEdited(id: string): Promise<void> {
        const query = `
            UPDATE flowmaestro.form_interface_submissions
            SET output_edited_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `;

        await db.query(query, [id]);
    }

    /**
     * Get recent submissions for analytics
     */
    async getRecentSubmissions(
        interfaceId: string,
        hours: number = 24
    ): Promise<FormInterfaceSubmission[]> {
        const query = `
            SELECT * FROM flowmaestro.form_interface_submissions
            WHERE interface_id = $1
              AND submitted_at > NOW() - INTERVAL '${hours} hours'
            ORDER BY submitted_at DESC
        `;

        const result = await db.query(query, [interfaceId]);
        return result.rows.map((row) => this.mapRow(row as FormInterfaceSubmissionRow));
    }

    /**
     * Update execution status and optionally execution ID
     */
    async updateExecutionStatus(
        id: string,
        status: FormSubmissionExecutionStatus,
        executionId?: string,
        output?: string
    ): Promise<FormInterfaceSubmission | null> {
        let query: string;
        let values: unknown[];

        if (executionId && output) {
            query = `
                UPDATE flowmaestro.form_interface_submissions
                SET execution_status = $2, execution_id = $3, output = $4
                WHERE id = $1
                RETURNING *
            `;
            values = [id, status, executionId, output];
        } else if (executionId) {
            query = `
                UPDATE flowmaestro.form_interface_submissions
                SET execution_status = $2, execution_id = $3
                WHERE id = $1
                RETURNING *
            `;
            values = [id, status, executionId];
        } else if (output) {
            query = `
                UPDATE flowmaestro.form_interface_submissions
                SET execution_status = $2, output = $3
                WHERE id = $1
                RETURNING *
            `;
            values = [id, status, output];
        } else {
            query = `
                UPDATE flowmaestro.form_interface_submissions
                SET execution_status = $2
                WHERE id = $1
                RETURNING *
            `;
            values = [id, status];
        }

        const result = await db.query(query, values);
        return result.rows.length > 0
            ? this.mapRow(result.rows[0] as FormInterfaceSubmissionRow)
            : null;
    }

    /**
     * Update attachments processing status
     */
    async updateAttachmentsStatus(
        id: string,
        status: FormSubmissionAttachmentsStatus
    ): Promise<FormInterfaceSubmission | null> {
        const query = `
            UPDATE flowmaestro.form_interface_submissions
            SET attachments_status = $2
            WHERE id = $1
            RETURNING *
        `;

        const result = await db.query(query, [id, status]);
        return result.rows.length > 0
            ? this.mapRow(result.rows[0] as FormInterfaceSubmissionRow)
            : null;
    }

    /**
     * Find submission by execution ID
     */
    async findByExecutionId(executionId: string): Promise<FormInterfaceSubmission | null> {
        const query = `
            SELECT * FROM flowmaestro.form_interface_submissions
            WHERE execution_id = $1
        `;

        const result = await db.query(query, [executionId]);
        return result.rows.length > 0
            ? this.mapRow(result.rows[0] as FormInterfaceSubmissionRow)
            : null;
    }

    /**
     * Map database row to FormInterfaceSubmission model
     */
    private mapRow(row: FormInterfaceSubmissionRow): FormInterfaceSubmission {
        return {
            id: row.id,
            interfaceId: row.interface_id,
            message: row.message,
            files:
                typeof row.files === "string"
                    ? (JSON.parse(row.files) as FormInterfaceFileAttachment[])
                    : row.files || [],
            urls:
                typeof row.urls === "string"
                    ? (JSON.parse(row.urls) as FormInterfaceUrlAttachment[])
                    : row.urls || [],
            output: row.output,
            outputEditedAt: row.output_edited_at ? new Date(row.output_edited_at) : null,
            executionId: row.execution_id || undefined,
            executionStatus: row.execution_status || "pending",
            attachmentsStatus: row.attachments_status || "pending",
            ipAddress: row.ip_address,
            userAgent: row.user_agent,
            submittedAt: new Date(row.submitted_at),
            createdAt: new Date(row.created_at)
        };
    }
}
