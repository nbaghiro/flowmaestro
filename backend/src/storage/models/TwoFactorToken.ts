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

export interface TwoFactorTokenModel {
    id: string;
    user_id: string;
    code_hash: string;
    expires_at: Date;
    verified_at: Date | null;
    created_at: Date;
    attempts: number;
    ip_address: string | null;
    user_agent: string | null;
    type: string;
}

export interface CreateTwoFactorTokenInput {
    user_id: string;
    code_hash: string;
    expires_at: Date;
    ip_address?: string | null;
    user_agent?: string | null;
    type: string;
}
