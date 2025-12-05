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

        const query = `
            INSERT INTO flowmaestro.two_factor_tokens (
                user_id,
                code_hash,
                expires_at,
                ip_address,
                user_agent,
                type
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const values = [
            input.user_id,
            input.code_hash,
            input.expires_at,
            input.ip_address ?? null,
            input.user_agent ?? null,
            input.type
        ];

        const result = await db.query<TwoFactorTokenModel>(query, values);
        const token = result.rows[0];

        console.log("[2FA] Saved token:", {
            id: token.id,
            user_id: token.user_id,
            expires_at: token.expires_at,
            verified_at: token.verified_at,
            code_hash_length: token.code_hash.length
        });

        return token;
    }

    async findValidCode(userId: string): Promise<TwoFactorTokenModel | null> {
        const query = `
            SELECT *
            FROM flowmaestro.two_factor_tokens
            WHERE user_id = $1
                AND verified_at IS NULL
                AND expires_at > NOW()
                AND type = 'sms'
            ORDER BY created_at DESC
            LIMIT 1
        `;
        const result = await db.query<TwoFactorTokenModel>(query, [userId]);
        console.log("[2FA] findValidCode:", {
            userId,
            rows: result.rows.length,
            rowsRaw: result.rows
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
