import { z } from "zod";

// Folder ID param schema
export const folderIdParamSchema = z.object({
    id: z.string().uuid()
});

// Create folder request
export const createFolderSchema = z.object({
    name: z.string().min(1).max(100),
    color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional()
});

// Update folder request
export const updateFolderSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
    position: z.number().int().min(0).optional()
});

// Type exports
export type CreateFolderRequest = z.infer<typeof createFolderSchema>;
export type UpdateFolderRequest = z.infer<typeof updateFolderSchema>;
export type FolderIdParam = z.infer<typeof folderIdParamSchema>;
