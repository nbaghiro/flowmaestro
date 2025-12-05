import { db } from "../database";
import { CreateTwoFactorTokenInput, TwoFactorTokenModel } from "../models/TwoFactorToken";

export class TwoFactorTokenRepository {
    async saveCode(input: CreateTwoFactorTokenInput): Promise<TwoFactorTokenModel> {
        // Invalidate previous tokens
        await db.query(
            `
                UPDATE flowmaestro.two_factor_tokens
                SET verified_at = NOW()
                WHERE user_id = $1
                    AND verified_at IS NULL
                    AND expires_at < NOW()
            `,
            [input.user_id]
        );

        const before = await db.query(
            `
            SELECT *
            FROM flowmaestro.two_factor_tokens
            WHERE user_id = $1
            ORDER BY created_at DESC
        `,
            [input.user_id]
        );

        console.log("[2FA][DEBUG] BEFORE INSERT rows:", before.rows.length);
        console.log("[2FA][DEBUG] BEFORE INSERT tokens:", before.rows);

        const query = `
            INSERT INTO flowmaestro.two_factor_tokens (
                user_id,
                code_hash,
                expires_at,
                ip_address,
                user_agent
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const values = [
            input.user_id,
            input.code_hash,
            input.expires_at,
            input.ip_address ?? null,
            input.user_agent ?? null
        ];

        const result = await db.query<TwoFactorTokenModel>(query, values);
        const token = result.rows[0];

        console.log("[2FA][DEBUG] SAVED TOKEN FULL:", token);

        const after = await db.query(
            `
            SELECT *
            FROM flowmaestro.two_factor_tokens
            WHERE user_id = $1
            ORDER BY created_at DESC
        `,
            [input.user_id]
        );

        console.log("[2FA][DEBUG] AFTER INSERT rows:", after.rows.length);
        console.log("[2FA][DEBUG] AFTER INSERT tokens:", after.rows);

        return token;
    }

    async findValidCode(userId: string): Promise<TwoFactorTokenModel | null> {
        const query = `
            SELECT *
            FROM flowmaestro.two_factor_tokens
            WHERE user_id = $1
                AND verified_at IS NULL
                AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
        `;
        const rawTokens = await db.query(
            `
            SELECT *
            FROM flowmaestro.two_factor_tokens
            WHERE user_id = $1
            ORDER BY created_at DESC
        `,
            [userId]
        );

        console.log("[2FA][DEBUG] VERIFY - RAW TOKENS:", rawTokens.rows);
        console.log("[2FA][DEBUG] findValidCode INPUT userId:", userId);

        const result = await db.query<TwoFactorTokenModel>(query, [userId]);
        console.log("[2FA][DEBUG] findValidCode RESULT:", {
            rowCount: result.rows.length,
            rows: result.rows
        });

        return result.rows[0] || null;
    }

    async consumeCode(id: string): Promise<void> {
        await db.query(
            `UPDATE flowmaestro.two_factor_tokens
                SET verified_at = NOW()
                WHERE id = $1`,
            [id]
        );
    }

    async deleteByUserId(userId: string): Promise<void> {
        await db.query(
            `DELETE FROM flowmaestro.two_factor_tokens
            WHERE user_id = $1`,
            [userId]
        );
    }
}

export const twoFactorTokenRepo = new TwoFactorTokenRepository();
