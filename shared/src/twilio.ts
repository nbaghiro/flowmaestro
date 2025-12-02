export interface SendVerificationCodeInput {
    phone: string;
}

export interface VerifyCodeInput {
    phone: string;
    code: string;
}

export interface BackupCode {
    code: string;
    createdAt: string;
}

export interface TwoFactorSetupResponse {
    phone: string;
    backupCodes: BackupCode[];
}
