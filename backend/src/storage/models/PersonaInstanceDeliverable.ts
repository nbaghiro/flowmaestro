/**
 * Persona Instance Deliverable Model
 *
 * Represents a deliverable produced by a persona instance during execution.
 * Deliverables can be markdown reports, CSV files, code, images, etc.
 */

import type { DeliverableType } from "@flowmaestro/shared";

/**
 * Database row for persona instance deliverable
 */
export interface PersonaInstanceDeliverableRow {
    id: string;
    instance_id: string;
    name: string;
    description: string | null;
    type: DeliverableType;
    content: string | null;
    file_url: string | null;
    file_size_bytes: number | null;
    file_extension: string | null;
    preview: string | null;
    created_at: Date;
}

/**
 * Persona instance deliverable model
 */
export interface PersonaInstanceDeliverableModel {
    id: string;
    instance_id: string;
    name: string;
    description: string | null;
    type: DeliverableType;
    content: string | null;
    file_url: string | null;
    file_size_bytes: number | null;
    file_extension: string | null;
    preview: string | null;
    created_at: Date;
}

/**
 * Input for creating a new deliverable
 */
export interface CreateDeliverableInput {
    instance_id: string;
    name: string;
    description?: string;
    type: DeliverableType;
    content?: string;
    file_url?: string;
    file_size_bytes?: number;
    file_extension?: string;
}

/**
 * Deliverable summary for API responses
 */
export interface DeliverableSummary {
    id: string;
    name: string;
    description: string | null;
    type: DeliverableType;
    file_size_bytes: number | null;
    file_extension: string | null;
    preview: string | null;
    created_at: string;
}
