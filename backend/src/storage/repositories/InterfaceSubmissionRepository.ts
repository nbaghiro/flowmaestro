import type {
    InterfaceSubmission,
    InterfaceFileAttachment,
    InterfaceUrlAttachment
} from "@flowmaestro/shared/src/types/form-interface";
import { db } from "../database";

interface InterfaceSubmissionRow {
    id: string;
    interface_id: string;

    message: string | null;
    files: InterfaceFileAttachment[] | string;
    urls: InterfaceUrlAttachment[] | string;

    output: string | null;
    output_edited_at: Date | null;

    ip_address: string | null;
    user_agent: string | null;
    submitted_at: Date;

    created_at: Date;
}

interface CreateSubmissionInput {
    interfaceId: string;
    message: string | null;
    files: InterfaceFileAttachment[];
    urls: InterfaceUrlAttachment[];
    ipAddress: string | null;
    userAgent: string | null;
}

export class InterfaceSubmissionRepository {
    async create(input: CreateSubmissionInput): Promise<InterfaceSubmission> {
        const result = await db.query(
            `
            INSERT INTO form_interface_submissions (
                interface_id,
                message,
                files,
                urls,
                ip_address,
                user_agent
            )
            VALUES ($1,$2,$3,$4,$5,$6)
            RETURNING *
            `,
            [
                input.interfaceId,
                input.message,
                JSON.stringify(input.files),
                JSON.stringify(input.urls),
                input.ipAddress,
                input.userAgent
            ]
        );

        return this.map(result.rows[0] as InterfaceSubmissionRow);
    }

    async listByInterface(
        interfaceId: string,
        limit = 50,
        offset = 0
    ): Promise<InterfaceSubmission[]> {
        const result = await db.query(
            `
            SELECT *
            FROM form_interface_submissions
            WHERE interface_id = $1
            ORDER BY submitted_at DESC
            LIMIT $2 OFFSET $3
            `,
            [interfaceId, limit, offset]
        );

        return result.rows.map((row) => this.map(row as InterfaceSubmissionRow));
    }

    async findById(id: string): Promise<InterfaceSubmission | null> {
        const result = await db.query(
            `
            SELECT *
            FROM form_interface_submissions
            WHERE id = $1
            `,
            [id]
        );

        return result.rows[0] ? this.map(result.rows[0] as InterfaceSubmissionRow) : null;
    }

    private map(row: InterfaceSubmissionRow): InterfaceSubmission {
        return {
            id: row.id,
            interfaceId: row.interface_id,

            message: row.message,
            files:
                typeof row.files === "string"
                    ? (JSON.parse(row.files) as InterfaceFileAttachment[])
                    : (row.files ?? []),
            urls:
                typeof row.urls === "string"
                    ? (JSON.parse(row.urls) as InterfaceUrlAttachment[])
                    : (row.urls ?? []),

            output: row.output,
            outputEditedAt: row.output_edited_at,

            ipAddress: row.ip_address,
            userAgent: row.user_agent,
            submittedAt: row.submitted_at
        };
    }
}
