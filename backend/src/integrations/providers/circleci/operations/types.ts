/**
 * CircleCI Operations Output Types
 * Standardized output types for CircleCI operations
 */

export interface CircleCIPipelineOutput {
    id: string;
    number: number;
    projectSlug: string;
    state: string;
    createdAt: string;
    trigger: {
        type: string;
        actor: string;
    };
    vcs?: {
        branch?: string;
        tag?: string;
        revision: string;
        commitSubject?: string;
    };
}

export interface CircleCIWorkflowOutput {
    id: string;
    name: string;
    pipelineId: string;
    pipelineNumber: number;
    projectSlug: string;
    status: string;
    startedBy: string;
    createdAt: string;
    stoppedAt?: string;
}

export interface CircleCIJobOutput {
    id: string;
    name: string;
    jobNumber?: number;
    projectSlug: string;
    status: string;
    type: string;
    startedAt?: string;
    stoppedAt?: string;
    dependencies: string[];
}

export interface CircleCIArtifactOutput {
    path: string;
    url: string;
    nodeIndex: number;
}
