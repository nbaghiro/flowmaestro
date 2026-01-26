/**
 * Vercel Operations Output Types
 * Standardized output types for Vercel operations
 */

export interface VercelProjectOutput {
    id: string;
    name: string;
    framework?: string;
    createdAt: number;
    updatedAt: number;
    link?: {
        type: string;
        repo?: string;
        org?: string;
    };
}

export interface VercelDeploymentOutput {
    uid: string;
    name: string;
    url: string;
    state: string;
    target?: string;
    created: number;
    ready?: number;
    creator: {
        uid: string;
        email?: string;
        username?: string;
    };
    inspectorUrl?: string;
}

export interface VercelDomainOutput {
    name: string;
    apexName: string;
    verified: boolean;
    createdAt?: number;
    gitBranch?: string;
    redirect?: string;
}

export interface VercelEnvVarOutput {
    id: string;
    key: string;
    value?: string;
    type: string;
    target: string[];
    gitBranch?: string;
    createdAt?: number;
}
