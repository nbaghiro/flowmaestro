export interface UserModel {
    id: string;
    email: string;
    password_hash: string | null; // Nullable for OAuth users
    name: string | null;
    google_id: string | null;
    microsoft_id: string | null;
    auth_provider: "local" | "google" | "microsoft";
    avatar_url: string | null;
    email_verified: boolean;
    email_verified_at: Date | null;
    created_at: Date;
    updated_at: Date;
    last_login_at: Date | null;
    two_factor_enabled: boolean;
    two_factor_phone: string | null;
    two_factor_phone_verified: boolean;
    two_factor_secret: string | null;
}

export interface CreateUserInput {
    email: string;
    password_hash?: string; // Optional for OAuth users
    name?: string;
    google_id?: string;
    microsoft_id?: string;
    auth_provider?: "local" | "google" | "microsoft";
    avatar_url?: string;
}

export interface UpdateUserInput {
    email?: string;
    password_hash?: string;
    name?: string;
    google_id?: string | null;
    microsoft_id?: string | null;
    avatar_url?: string | null;
    last_login_at?: Date;
    two_factor_enabled?: boolean;
    two_factor_phone?: string | null;
    two_factor_phone_verified?: boolean;
    email_verified?: boolean;
    email_verified_at?: Date | null;
}
