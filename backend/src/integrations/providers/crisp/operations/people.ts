/**
 * Crisp People Operations
 */

import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { CrispClient } from "../client/CrispClient";
import type { CrispPerson } from "../types";

// ============================================
// List People
// ============================================

export const listPeopleSchema = z.object({
    pageNumber: z.number().int().min(1).optional().default(1).describe("Page number (1-indexed)")
});

export type ListPeopleParams = z.infer<typeof listPeopleSchema>;

export const listPeopleOperation: OperationDefinition = {
    id: "listPeople",
    name: "List People",
    description: "List people profiles with pagination",
    category: "people",
    inputSchema: listPeopleSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListPeople(
    client: CrispClient,
    params: ListPeopleParams
): Promise<OperationResult> {
    try {
        const people = await client.listPeople(params.pageNumber);

        return {
            success: true,
            data: {
                people
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list people",
                retryable: true
            }
        };
    }
}

// ============================================
// Get Person
// ============================================

export const getPersonSchema = z.object({
    peopleId: z.string().min(1).describe("Person ID")
});

export type GetPersonParams = z.infer<typeof getPersonSchema>;

export const getPersonOperation: OperationDefinition = {
    id: "getPerson",
    name: "Get Person",
    description: "Retrieve a specific person profile by ID",
    category: "people",
    inputSchema: getPersonSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetPerson(
    client: CrispClient,
    params: GetPersonParams
): Promise<OperationResult> {
    try {
        const person = (await client.getPerson(params.peopleId)) as CrispPerson;

        return {
            success: true,
            data: person
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get person",
                retryable: true
            }
        };
    }
}

// ============================================
// Create Person
// ============================================

export const createPersonSchema = z.object({
    email: z.string().email().optional().describe("Person's email address"),
    phone: z.string().optional().describe("Person's phone number"),
    nickname: z.string().optional().describe("Person's display name"),
    avatar: z.string().url().optional().describe("URL to person's avatar image"),
    gender: z.string().optional().describe("Person's gender"),
    address: z.string().optional().describe("Person's address"),
    segments: z.array(z.string()).optional().describe("Segments to assign to the person"),
    notepad: z.string().optional().describe("Internal notes about the person")
});

export type CreatePersonParams = z.infer<typeof createPersonSchema>;

export const createPersonOperation: OperationDefinition = {
    id: "createPerson",
    name: "Create Person",
    description: "Create a new person profile",
    category: "people",
    inputSchema: createPersonSchema,
    retryable: false,
    timeout: 10000
};

export async function executeCreatePerson(
    client: CrispClient,
    params: CreatePersonParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {};

        if (params.email) data.email = params.email;
        if (params.phone) data.phone = params.phone;
        if (params.nickname) data.nickname = params.nickname;
        if (params.avatar) data.avatar = params.avatar;
        if (params.gender) data.gender = params.gender;
        if (params.address) data.address = params.address;
        if (params.segments) data.segments = params.segments;
        if (params.notepad) data.notepad = params.notepad;

        const result = await client.createPerson(data);

        return {
            success: true,
            data: {
                people_id: result.people_id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create person",
                retryable: false
            }
        };
    }
}

// ============================================
// Update Person
// ============================================

export const updatePersonSchema = z.object({
    peopleId: z.string().min(1).describe("Person ID"),
    email: z.string().email().optional().describe("Person's email address"),
    phone: z.string().optional().describe("Person's phone number"),
    nickname: z.string().optional().describe("Person's display name"),
    avatar: z.string().url().optional().describe("URL to person's avatar image"),
    gender: z.string().optional().describe("Person's gender"),
    address: z.string().optional().describe("Person's address"),
    segments: z.array(z.string()).optional().describe("Segments to assign to the person"),
    notepad: z.string().optional().describe("Internal notes about the person")
});

export type UpdatePersonParams = z.infer<typeof updatePersonSchema>;

export const updatePersonOperation: OperationDefinition = {
    id: "updatePerson",
    name: "Update Person",
    description: "Update an existing person profile",
    category: "people",
    inputSchema: updatePersonSchema,
    retryable: false,
    timeout: 10000
};

export async function executeUpdatePerson(
    client: CrispClient,
    params: UpdatePersonParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {};

        if (params.email) data.email = params.email;
        if (params.phone) data.phone = params.phone;
        if (params.nickname) data.nickname = params.nickname;
        if (params.avatar) data.avatar = params.avatar;
        if (params.gender) data.gender = params.gender;
        if (params.address) data.address = params.address;
        if (params.segments) data.segments = params.segments;
        if (params.notepad) data.notepad = params.notepad;

        const person = (await client.updatePerson(params.peopleId, data)) as CrispPerson;

        return {
            success: true,
            data: person
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update person",
                retryable: false
            }
        };
    }
}
