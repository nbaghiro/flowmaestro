import { z } from "zod";

export const updateNameSchema = z.object({
    name: z.string().min(1).max(100)
});

export const updateEmailSchema = z.object({
    email: z.string().email()
});

export const updatePasswordSchema = z.object({
    currentPassword: z.string().min(6).max(128),
    newPassword: z.string().min(6).max(128)
});
