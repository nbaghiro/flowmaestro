import { z } from "zod";

export const startTwoFactorSetupSchema = z.object({
    phone: z.string().min(8).max(20)
});

export const verifyTwoFactorCodeSchema = z.object({
    phone: z.string().min(8).max(20),
    code: z.string().min(8).max(20)
});

export const disableTwoFactorSchema = z
    .object({
        code: z.string().min(6).max(6).optional(),
        backupCode: z.string().min(8).max(8).optional()
    })
    .refine((data) => data.code || data.backupCode, "Either code or backupCode must be provided");

export const regenerateBackupCodesSchema = z.object({
    password: z.string().min(6).max(128)
});
