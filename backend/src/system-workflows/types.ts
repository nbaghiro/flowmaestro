/**
 * System Workflow Types
 *
 * Type definitions for system workflow definitions used for
 * internal FlowMaestro operations like blog generation, social media posting, etc.
 */

import type { WorkflowDefinition } from "@flowmaestro/shared";

/**
 * System workflow definition with metadata for seeding
 */
export interface SystemWorkflowDefinition {
    /** Unique identifier used for programmatic lookup (e.g., 'blog-generation') */
    key: string;

    /** Human-readable name displayed in Flow Builder */
    name: string;

    /** Description of what this workflow does */
    description: string;

    /** Standard workflow definition */
    definition: WorkflowDefinition;

    /** Optional default trigger configuration */
    defaultTrigger?: {
        type: "schedule";
        cronExpression: string;
        timezone: string;
    };
}
