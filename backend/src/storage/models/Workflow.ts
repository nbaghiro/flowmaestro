import { WorkflowDefinition } from "@flowmaestro/shared";

export type WorkflowType = "user" | "system";

export interface WorkflowModel {
    id: string;
    name: string;
    description: string | null;
    definition: WorkflowDefinition;
    user_id: string;
    workspace_id: string;
    version: number;
    ai_generated: boolean;
    ai_prompt: string | null;
    workflow_type: WorkflowType;
    system_key: string | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface CreateWorkflowInput {
    name: string;
    description?: string;
    definition: WorkflowDefinition;
    user_id: string;
    workspace_id: string;
    ai_generated?: boolean;
    ai_prompt?: string;
    workflow_type?: WorkflowType;
    system_key?: string;
}

export interface UpdateWorkflowInput {
    name?: string;
    description?: string;
    definition?: WorkflowDefinition;
    version?: number;
    ai_generated?: boolean;
    ai_prompt?: string;
    workflow_type?: WorkflowType;
    system_key?: string;
}
