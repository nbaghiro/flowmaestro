/**
 * Lattice API Response Types
 */

/**
 * Lattice User resource
 */
export interface LatticeUser {
    id: string;
    name: string;
    email: string;
    title: string | null;
    department: LatticeDepartmentRef | null;
    managerId: string | null;
    managerName: string | null;
    status: "active" | "inactive" | "deactivated";
    startDate: string | null;
    avatarUrl: string | null;
    createdAt: string;
    updatedAt: string | null;
}

/**
 * Lattice Department Reference
 */
export interface LatticeDepartmentRef {
    id: string;
    name: string;
}

/**
 * Lattice Goal resource
 */
export interface LatticeGoal {
    id: string;
    title: string;
    description: string | null;
    ownerId: string;
    ownerName: string;
    status: LatticeGoalStatus;
    progress: number;
    dueDate: string | null;
    parentGoalId: string | null;
    keyResults: LatticeKeyResult[];
    createdAt: string;
    updatedAt: string | null;
}

/**
 * Lattice Goal Status
 */
export type LatticeGoalStatus =
    | "on_track"
    | "behind"
    | "at_risk"
    | "completed"
    | "not_started"
    | "closed";

/**
 * Lattice Key Result
 */
export interface LatticeKeyResult {
    id: string;
    title: string;
    currentValue: number;
    targetValue: number;
    unit: string | null;
}

/**
 * Lattice Review Cycle resource
 */
export interface LatticeReviewCycle {
    id: string;
    name: string;
    status: "draft" | "active" | "completed" | "archived";
    startDate: string;
    endDate: string;
    reviewType: string;
    participantCount: number;
    completedCount: number;
    createdAt: string;
    updatedAt: string | null;
}

/**
 * Lattice Department resource
 */
export interface LatticeDepartment {
    id: string;
    name: string;
    parentId: string | null;
    parentName: string | null;
    headId: string | null;
    headName: string | null;
    memberCount: number;
    createdAt: string;
    updatedAt: string | null;
}

/**
 * Lattice API Pagination
 */
export interface LatticePagination {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

/**
 * Lattice API Response wrapper for single resource
 */
export interface LatticeResourceResponse<T> {
    data: T;
}

/**
 * Lattice API Response wrapper for collections
 */
export interface LatticeCollectionResponse<T> {
    data: T[];
    pagination: LatticePagination;
}

/**
 * Lattice Create Goal request
 */
export interface LatticeCreateGoalRequest {
    title: string;
    ownerId: string;
    description?: string;
    dueDate?: string;
    parentGoalId?: string;
}

/**
 * Lattice Update Goal request
 */
export interface LatticeUpdateGoalRequest {
    goalId: string;
    title?: string;
    description?: string;
    status?: LatticeGoalStatus;
    progress?: number;
    dueDate?: string;
}
