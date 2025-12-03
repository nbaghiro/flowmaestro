import { db } from "../database";
import { UserModel, CreateUserInput, UpdateUserInput } from "../models/User";

export class UserRepository {
    async create(input: CreateUserInput): Promise<UserModel> {
        const query = `
            INSERT INTO flowmaestro.users (
                email,
                password_hash,
                name,
                google_id,
                microsoft_id,
                auth_provider,
                avatar_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const values = [
            input.email,
            input.password_hash || null,
            input.name || null,
            input.google_id || null,
            input.microsoft_id || null,
            input.auth_provider || "local",
            input.avatar_url || null
        ];

        const result = await db.query<UserModel>(query, values);
        return this.mapRow(result.rows[0]);
    }

    async findById(id: string): Promise<UserModel | null> {
        const query = `
            SELECT * FROM flowmaestro.users
            WHERE id = $1
        `;

        const result = await db.query<UserModel>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByEmail(email: string): Promise<UserModel | null> {
        const query = `
            SELECT * FROM flowmaestro.users
            WHERE email = $1
        `;

        const result = await db.query<UserModel>(query, [email]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByGoogleId(googleId: string): Promise<UserModel | null> {
        const query = `
            SELECT * FROM flowmaestro.users
            WHERE google_id = $1
        `;

        const result = await db.query<UserModel>(query, [googleId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByMicrosoftId(microsoftId: string): Promise<UserModel | null> {
        const query = `
            SELECT * FROM flowmaestro.users
            WHERE microsoft_id = $1
        `;

        const result = await db.query<UserModel>(query, [microsoftId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByEmailOrGoogleId(email: string, googleId: string): Promise<UserModel | null> {
        const query = `
            SELECT * FROM flowmaestro.users
            WHERE email = $1 OR google_id = $2
            LIMIT 1
        `;

        const result = await db.query<UserModel>(query, [email, googleId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByEmailOrMicrosoftId(email: string, microsoftId: string): Promise<UserModel | null> {
        const query = `
            SELECT * FROM flowmaestro.users
            WHERE email = $1 OR microsoft_id = $2
            LIMIT 1
        `;

        const result = await db.query<UserModel>(query, [email, microsoftId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async update(id: string, input: UpdateUserInput): Promise<UserModel | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.email !== undefined) {
            updates.push(`email = $${paramIndex++}`);
            values.push(input.email);
        }

        if (input.password_hash !== undefined) {
            updates.push(`password_hash = $${paramIndex++}`);
            values.push(input.password_hash);
        }

        if (input.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }

        if (input.google_id !== undefined) {
            updates.push(`google_id = $${paramIndex++}`);
            values.push(input.google_id);
        }

        if (input.microsoft_id !== undefined) {
            updates.push(`microsoft_id = $${paramIndex++}`);
            values.push(input.microsoft_id);
        }

        if (input.auth_provider !== undefined) {
            updates.push(`auth_provider = $${paramIndex++}`);
            values.push(input.auth_provider);
        }

        if (input.avatar_url !== undefined) {
            updates.push(`avatar_url = $${paramIndex++}`);
            values.push(input.avatar_url);
        }

        if (input.last_login_at !== undefined) {
            updates.push(`last_login_at = $${paramIndex++}`);
            values.push(input.last_login_at);
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.users
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query<UserModel>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async delete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.users
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    async updateEmailVerification(userId: string): Promise<void> {
        const query = `
            UPDATE flowmaestro.users
            SET email_verified = TRUE,
                email_verified_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
        `;

        await db.query(query, [userId]);
    }

    async updatePassword(userId: string, passwordHash: string): Promise<void> {
        const query = `
            UPDATE flowmaestro.users
            SET password_hash = $2,
                updated_at = NOW()
            WHERE id = $1
        `;

        await db.query(query, [userId, passwordHash]);
    }

    private mapRow(row: unknown): UserModel {
        const r = row as {
            id: string;
            email: string;
            password_hash: string | null;
            name: string | null;
            google_id: string | null;
            microsoft_id: string | null;
            auth_provider: "local" | "google" | "microsoft";
            avatar_url: string | null;
            email_verified: boolean;
            email_verified_at: string | Date | null;
            created_at: string | Date;
            updated_at: string | Date;
            last_login_at: string | Date | null;
            two_factor_enabled: boolean;
            two_factor_phone: string | null;
            two_factor_phone_verified: boolean;
            two_factor_secret: string | null;
        };
        return {
            id: r.id,
            email: r.email,
            password_hash: r.password_hash,
            name: r.name,
            google_id: r.google_id,
            microsoft_id: r.microsoft_id,
            auth_provider: r.auth_provider,
            avatar_url: r.avatar_url,
            email_verified: r.email_verified,
            email_verified_at: r.email_verified_at ? new Date(r.email_verified_at) : null,
            created_at: new Date(r.created_at),
            updated_at: new Date(r.updated_at),
            last_login_at: r.last_login_at ? new Date(r.last_login_at) : null,
            two_factor_enabled: r.two_factor_enabled,
            two_factor_phone: r.two_factor_phone,
            two_factor_phone_verified: r.two_factor_phone_verified,
            two_factor_secret: r.two_factor_secret
        };
    }
}
