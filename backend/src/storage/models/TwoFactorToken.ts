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
