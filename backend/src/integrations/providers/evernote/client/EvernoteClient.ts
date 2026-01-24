import { createServiceLogger } from "../../../../core/logging";

const logger = createServiceLogger("EvernoteClient");

export interface EvernoteClientConfig {
    accessToken: string;
    noteStoreUrl: string;
    webApiUrlPrefix?: string;
    sandbox?: boolean;
}

/**
 * Evernote API Response Types
 */
export interface EvernoteNotebook {
    guid: string;
    name: string;
    defaultNotebook: boolean;
    serviceCreated: number;
    serviceUpdated: number;
    stack?: string;
}

export interface EvernoteTag {
    guid: string;
    name: string;
    parentGuid?: string;
}

export interface EvernoteNote {
    guid: string;
    title: string;
    content?: string;
    contentHash?: string;
    contentLength?: number;
    created: number;
    updated: number;
    deleted?: number;
    active: boolean;
    notebookGuid: string;
    tagGuids?: string[];
    tagNames?: string[];
}

export interface EvernoteNoteList {
    startIndex: number;
    totalNotes: number;
    notes: EvernoteNote[];
}

export interface EvernoteUser {
    id: number;
    username: string;
    email?: string;
    name?: string;
    timezone?: string;
}

/**
 * Evernote API Client
 *
 * Evernote's API is based on Thrift, but they provide a REST-like HTTP API.
 * The access token is sent as an Authorization header.
 *
 * Note: Evernote has both production and sandbox environments.
 * - Production: www.evernote.com
 * - Sandbox: sandbox.evernote.com
 */
export class EvernoteClient {
    private accessToken: string;
    private noteStoreUrl: string;
    private webApiUrlPrefix: string;
    private sandbox: boolean;

    constructor(config: EvernoteClientConfig) {
        this.accessToken = config.accessToken;
        this.noteStoreUrl = config.noteStoreUrl;
        this.webApiUrlPrefix =
            config.webApiUrlPrefix ||
            (config.sandbox
                ? "https://sandbox.evernote.com/shard"
                : "https://www.evernote.com/shard");
        this.sandbox = config.sandbox || false;

        logger.debug(
            { noteStoreUrl: this.noteStoreUrl, sandbox: this.sandbox },
            "Evernote client initialized"
        );
    }

    /**
     * Get base URL based on environment
     */
    private get baseUrl(): string {
        return this.sandbox ? "https://sandbox.evernote.com" : "https://www.evernote.com";
    }

    /**
     * Make an authenticated request to Evernote API
     */
    private async request<T>(
        endpoint: string,
        options: {
            method?: "GET" | "POST" | "PUT" | "DELETE";
            body?: unknown;
            useNoteStore?: boolean;
        } = {}
    ): Promise<T> {
        const { method = "POST", body, useNoteStore = true } = options;

        // Evernote uses the note store URL for most API calls
        const baseUrl = useNoteStore ? this.noteStoreUrl : this.baseUrl;
        const url = `${baseUrl}${endpoint}`;

        const headers: Record<string, string> = {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json"
        };

        logger.debug({ url, method }, "Making Evernote API request");

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(
                { status: response.status, error: errorText },
                "Evernote API request failed"
            );

            // Handle specific error codes
            if (response.status === 401) {
                throw new Error("Evernote authentication failed. Please reconnect your account.");
            }
            if (response.status === 403) {
                throw new Error("You don't have permission to access this Evernote resource.");
            }
            if (response.status === 404) {
                throw new Error("Evernote resource not found.");
            }
            if (response.status === 429) {
                throw new Error("Evernote rate limit exceeded. Please try again later.");
            }

            throw new Error(`Evernote API error (${response.status}): ${errorText}`);
        }

        const responseText = await response.text();
        if (!responseText) {
            return {} as T;
        }

        try {
            return JSON.parse(responseText) as T;
        } catch {
            // Some endpoints return plain text
            return responseText as unknown as T;
        }
    }

    // =========================================================================
    // USER OPERATIONS
    // =========================================================================

    /**
     * Get the current user's info
     */
    async getUser(): Promise<EvernoteUser> {
        // Use the web API for user info
        return this.request<EvernoteUser>("/edam/user", {
            useNoteStore: false,
            method: "GET"
        });
    }

    // =========================================================================
    // NOTEBOOK OPERATIONS
    // =========================================================================

    /**
     * List all notebooks
     */
    async listNotebooks(): Promise<EvernoteNotebook[]> {
        // Evernote SDK-like call using the web API URL
        const webApiUrl = `${this.webApiUrlPrefix}/json/listNotebooks`;

        const response = await fetch(webApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                auth: this.accessToken
            })
        });

        if (!response.ok) {
            // Fall back to trying the NoteStore URL directly
            logger.debug("Web API failed, trying NoteStore URL");
            return this.listNotebooksViaStore();
        }

        return response.json() as Promise<EvernoteNotebook[]>;
    }

    /**
     * List notebooks via the NoteStore (fallback)
     */
    private async listNotebooksViaStore(): Promise<EvernoteNotebook[]> {
        // Try the cloud API endpoint
        const cloudApiUrl = this.noteStoreUrl.replace("/edam/note/", "/api/v1/");
        const url = `${cloudApiUrl}notebooks`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to list notebooks: ${errorText}`);
        }

        const data = (await response.json()) as { notebooks?: EvernoteNotebook[] };
        return data.notebooks || [];
    }

    /**
     * Get a specific notebook by GUID
     */
    async getNotebook(guid: string): Promise<EvernoteNotebook> {
        return this.request<EvernoteNotebook>(`/notebooks/${guid}`, {
            method: "GET"
        });
    }

    /**
     * Create a new notebook
     */
    async createNotebook(name: string, stack?: string): Promise<EvernoteNotebook> {
        const webApiUrl = `${this.webApiUrlPrefix}/json/createNotebook`;

        const notebook: Partial<EvernoteNotebook> = {
            name,
            ...(stack && { stack })
        };

        const response = await fetch(webApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                auth: this.accessToken,
                notebook
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create notebook: ${errorText}`);
        }

        return response.json() as Promise<EvernoteNotebook>;
    }

    // =========================================================================
    // NOTE OPERATIONS
    // =========================================================================

    /**
     * Search for notes
     *
     * @param query - Evernote search grammar query
     * @param notebookGuid - Optional notebook GUID to search in
     * @param offset - Pagination offset
     * @param maxNotes - Maximum notes to return (default 25, max 250)
     */
    async searchNotes(
        query: string,
        notebookGuid?: string,
        offset: number = 0,
        maxNotes: number = 25
    ): Promise<EvernoteNoteList> {
        const webApiUrl = `${this.webApiUrlPrefix}/json/findNotes`;

        const filter: Record<string, unknown> = {
            words: query
        };

        if (notebookGuid) {
            filter.notebookGuid = notebookGuid;
        }

        const response = await fetch(webApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                auth: this.accessToken,
                filter,
                offset,
                maxNotes
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to search notes: ${errorText}`);
        }

        return response.json() as Promise<EvernoteNoteList>;
    }

    /**
     * Get a note by GUID
     *
     * @param guid - Note GUID
     * @param withContent - Whether to include note content (ENML)
     */
    async getNote(guid: string, withContent: boolean = true): Promise<EvernoteNote> {
        const webApiUrl = `${this.webApiUrlPrefix}/json/getNote`;

        const response = await fetch(webApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                auth: this.accessToken,
                guid,
                withContent,
                withResourcesData: false,
                withResourcesRecognition: false,
                withResourcesAlternateData: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get note: ${errorText}`);
        }

        return response.json() as Promise<EvernoteNote>;
    }

    /**
     * Create a new note
     *
     * @param title - Note title
     * @param content - Note content in ENML format
     * @param notebookGuid - Notebook to create the note in
     * @param tagNames - Optional array of tag names
     */
    async createNote(
        title: string,
        content: string,
        notebookGuid?: string,
        tagNames?: string[]
    ): Promise<EvernoteNote> {
        const webApiUrl = `${this.webApiUrlPrefix}/json/createNote`;

        // Wrap content in ENML if it's plain text
        const enmlContent = content.startsWith("<?xml") ? content : this.wrapInENML(content);

        const note: Record<string, unknown> = {
            title,
            content: enmlContent
        };

        if (notebookGuid) {
            note.notebookGuid = notebookGuid;
        }

        if (tagNames && tagNames.length > 0) {
            note.tagNames = tagNames;
        }

        const response = await fetch(webApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                auth: this.accessToken,
                note
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create note: ${errorText}`);
        }

        return response.json() as Promise<EvernoteNote>;
    }

    /**
     * Update an existing note
     */
    async updateNote(
        guid: string,
        updates: {
            title?: string;
            content?: string;
            notebookGuid?: string;
            tagNames?: string[];
        }
    ): Promise<EvernoteNote> {
        const webApiUrl = `${this.webApiUrlPrefix}/json/updateNote`;

        const note: Record<string, unknown> = {
            guid,
            ...updates
        };

        // Wrap content in ENML if provided and not already ENML
        if (updates.content && !updates.content.startsWith("<?xml")) {
            note.content = this.wrapInENML(updates.content);
        }

        const response = await fetch(webApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                auth: this.accessToken,
                note
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update note: ${errorText}`);
        }

        return response.json() as Promise<EvernoteNote>;
    }

    /**
     * Delete a note (move to trash)
     */
    async deleteNote(guid: string): Promise<number> {
        const webApiUrl = `${this.webApiUrlPrefix}/json/deleteNote`;

        const response = await fetch(webApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                auth: this.accessToken,
                guid
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to delete note: ${errorText}`);
        }

        // Returns the deletion timestamp
        return response.json() as Promise<number>;
    }

    // =========================================================================
    // TAG OPERATIONS
    // =========================================================================

    /**
     * List all tags
     */
    async listTags(): Promise<EvernoteTag[]> {
        const webApiUrl = `${this.webApiUrlPrefix}/json/listTags`;

        const response = await fetch(webApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                auth: this.accessToken
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to list tags: ${errorText}`);
        }

        return response.json() as Promise<EvernoteTag[]>;
    }

    /**
     * Create a new tag
     */
    async createTag(name: string, parentGuid?: string): Promise<EvernoteTag> {
        const webApiUrl = `${this.webApiUrlPrefix}/json/createTag`;

        const tag: Partial<EvernoteTag> = {
            name,
            ...(parentGuid && { parentGuid })
        };

        const response = await fetch(webApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                auth: this.accessToken,
                tag
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create tag: ${errorText}`);
        }

        return response.json() as Promise<EvernoteTag>;
    }

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================

    /**
     * Wrap plain text or HTML content in ENML format
     */
    private wrapInENML(content: string): string {
        // Basic HTML escaping if content is plain text
        const isHtml = content.includes("<") && (content.includes("</") || content.includes("/>"));

        // Escape special characters for plain text
        const escapedContent = isHtml
            ? content
            : content
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/\n/g, "<br/>");

        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note>${escapedContent}</en-note>`;
    }

    /**
     * Extract plain text from ENML content
     */
    extractTextFromENML(enml: string): string {
        // Remove XML declaration and doctype
        let text = enml.replace(/<\?xml[^?]*\?>/g, "");
        text = text.replace(/<!DOCTYPE[^>]*>/g, "");

        // Remove en-note tags
        text = text.replace(/<\/?en-note>/g, "");

        // Convert <br/> to newlines
        text = text.replace(/<br\s*\/?>/gi, "\n");

        // Remove all other HTML tags
        text = text.replace(/<[^>]*>/g, "");

        // Decode HTML entities
        text = text
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
            .replace(/&nbsp;/g, " ");

        return text.trim();
    }
}
