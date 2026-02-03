/**
 * Miro Operation Types
 *
 * Type definitions for Miro API operation parameters and responses.
 */

export interface MiroBoard {
    id: string;
    name: string;
    description: string;
    team: {
        id: string;
        name: string;
    };
    owner: {
        id: string;
        name: string;
        type: string;
    };
    currentUserMembership: {
        id: string;
        role: string;
        type: string;
    };
    viewLink: string;
    createdAt: string;
    modifiedAt: string;
}

export interface MiroStickyNote {
    id: string;
    type: "sticky_note";
    data: {
        content: string;
        shape: string;
    };
    position: {
        x: number;
        y: number;
        origin: string;
    };
    style: {
        fillColor: string;
        textAlign: string;
        textAlignVertical: string;
    };
    createdAt: string;
    modifiedAt: string;
}

export interface MiroCard {
    id: string;
    type: "card";
    data: {
        title: string;
        description?: string;
    };
    position: {
        x: number;
        y: number;
        origin: string;
    };
    style: {
        cardTheme: string;
    };
    createdAt: string;
    modifiedAt: string;
}

export interface MiroShape {
    id: string;
    type: "shape";
    data: {
        content?: string;
        shape: string;
    };
    position: {
        x: number;
        y: number;
        origin: string;
    };
    style: {
        fillColor: string;
        borderColor: string;
        borderWidth: string;
    };
    createdAt: string;
    modifiedAt: string;
}

export interface MiroTag {
    id: string;
    type: "tag";
    title: string;
    fillColor: string;
}

export interface MiroPaginatedResponse<T> {
    data: T[];
    total: number;
    size: number;
    offset: number;
    limit: number;
}

export interface MiroCursorPaginatedResponse<T> {
    data: T[];
    total: number;
    size: number;
    cursor?: string;
    limit: number;
}
