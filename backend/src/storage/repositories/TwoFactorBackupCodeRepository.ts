import { db } from "../database";
import { CreateTwoFactorBackupCodeInput, TwoFactorBackupCodeModel } from "../models/TwoFactorToken";

export class TwoFactorBackupCodeRepository {
    async create(input: CreateTwoFactorBackupCodeInput): Promise<TwoFactorBackupCodeModel> {
        const query = `
            INSERT INTO flowmaestro.two_factor_backup_codes (
                user_id,
                code_hash
            )
            VALUES ($1, $2)
            RETURNING *
        `;

        const values = [input.user_id, input.code_hash];
        const result = await db.query<TwoFactorBackupCodeModel>(query, values);

        return result.rows[0];
    }

    async findByUserId(userId: string): Promise<TwoFactorBackupCodeModel[]> {
        const query = `
            SELECT * FROM flowmaestro.two_factor_backup_codes
            WHERE user_id = $1
            ORDER BY created_at ASC
        `;

        const result = await db.query<TwoFactorBackupCodeModel>(query, [userId]);
        return result.rows;
    }

    async consumeCode(userId: string, codeHash: string): Promise<boolean> {
        const query = `
            UPDATE flowmaestro.two_factor_backup_codes
            SET used_at = NOW()
            WHERE user_id = $1
              AND code_hash = $2
              AND used_at IS NULL
            RETURNING *
        `;

        const values = [userId, codeHash];
        const result = await db.query(query, values);

        return result.rows.length > 0;
    }
}

export const twoFactorBackupCodeRepo = new TwoFactorBackupCodeRepository();
