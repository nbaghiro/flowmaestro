/**
 * SharePoint Client
 * Uses Microsoft Graph API v1.0 for SharePoint operations
 */
export class SharePointClient {
    private accessToken: string;
    private baseUrl = "https://graph.microsoft.com/v1.0";

    constructor(config: { accessToken: string }) {
        this.accessToken = config.accessToken;
    }

    /**
     * Make an authenticated request to Microsoft Graph API
     */
    private async request<T>(
        endpoint: string,
        options: {
            method?: string;
            body?: Record<string, unknown>;
        } = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json"
        };

        const fetchOptions: RequestInit = {
            method: options.method || "GET",
            headers
        };

        if (options.body) {
            fetchOptions.body = JSON.stringify(options.body);
        }

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Microsoft Graph API error: ${response.status}`;

            try {
                const errorJson = JSON.parse(errorText) as {
                    error?: { message?: string; code?: string };
                };
                if (errorJson.error?.message) {
                    errorMessage = errorJson.error.message;
                }
            } catch {
                // Use default error message
            }

            throw new Error(errorMessage);
        }

        // Handle empty responses (204 No Content)
        if (response.status === 204) {
            return {} as T;
        }

        return (await response.json()) as T;
    }

    /**
     * List SharePoint sites
     */
    async listSites(params: { query?: string; top?: number }): Promise<{
        value: Array<{
            id: string;
            name: string;
            displayName: string;
            webUrl: string;
            description?: string;
        }>;
        "@odata.nextLink"?: string;
    }> {
        const searchQuery = params.query || "*";
        let endpoint = `/sites?search=${encodeURIComponent(searchQuery)}`;
        if (params.top) {
            endpoint += `&$top=${params.top}`;
        }
        return this.request(endpoint);
    }

    /**
     * Get a specific site
     */
    async getSite(siteId: string): Promise<{
        id: string;
        name: string;
        displayName: string;
        webUrl: string;
        description?: string;
        root?: Record<string, unknown>;
    }> {
        return this.request(`/sites/${siteId}`);
    }

    /**
     * List lists in a site
     */
    async listLists(params: { siteId: string; top?: number }): Promise<{
        value: Array<{
            id: string;
            name: string;
            displayName: string;
            description?: string;
            webUrl?: string;
            list?: { template: string };
        }>;
        "@odata.nextLink"?: string;
    }> {
        let endpoint = `/sites/${params.siteId}/lists`;
        if (params.top) {
            endpoint += `?$top=${params.top}`;
        }
        return this.request(endpoint);
    }

    /**
     * Get a specific list
     */
    async getList(params: { siteId: string; listId: string }): Promise<{
        id: string;
        name: string;
        displayName: string;
        description?: string;
        webUrl?: string;
        list?: { template: string };
    }> {
        return this.request(`/sites/${params.siteId}/lists/${params.listId}`);
    }

    /**
     * List items in a list
     */
    async listItems(params: {
        siteId: string;
        listId: string;
        top?: number;
        filter?: string;
    }): Promise<{
        value: Array<{
            id: string;
            fields?: Record<string, unknown>;
            createdDateTime?: string;
            lastModifiedDateTime?: string;
        }>;
        "@odata.nextLink"?: string;
    }> {
        let endpoint = `/sites/${params.siteId}/lists/${params.listId}/items?expand=fields`;
        if (params.top) {
            endpoint += `&$top=${params.top}`;
        }
        if (params.filter) {
            endpoint += `&$filter=${encodeURIComponent(params.filter)}`;
        }
        return this.request(endpoint);
    }

    /**
     * Create an item in a list
     */
    async createItem(params: {
        siteId: string;
        listId: string;
        fields: Record<string, unknown>;
    }): Promise<{
        id: string;
        fields?: Record<string, unknown>;
        createdDateTime?: string;
    }> {
        return this.request(`/sites/${params.siteId}/lists/${params.listId}/items`, {
            method: "POST",
            body: {
                fields: params.fields
            }
        });
    }

    /**
     * List drive items (files) in a site
     */
    async listDriveItems(params: { siteId: string; folderId?: string; top?: number }): Promise<{
        value: Array<{
            id: string;
            name: string;
            size?: number;
            webUrl?: string;
            file?: { mimeType: string };
            folder?: { childCount: number };
            lastModifiedDateTime?: string;
        }>;
        "@odata.nextLink"?: string;
    }> {
        let endpoint: string;
        if (params.folderId) {
            endpoint = `/sites/${params.siteId}/drive/items/${params.folderId}/children`;
        } else {
            endpoint = `/sites/${params.siteId}/drive/root/children`;
        }
        if (params.top) {
            endpoint += `?$top=${params.top}`;
        }
        return this.request(endpoint);
    }

    /**
     * Search content across SharePoint
     */
    async searchContent(params: { query: string; top?: number; entityTypes?: string[] }): Promise<{
        value: Array<{
            searchTerms: string[];
            hitsContainers: Array<{
                total: number;
                hits: Array<{
                    hitId: string;
                    summary?: string;
                    resource?: {
                        "@odata.type"?: string;
                        name?: string;
                        webUrl?: string;
                    };
                }>;
            }>;
        }>;
    }> {
        const entityTypes = params.entityTypes || ["site", "list", "listItem", "driveItem"];

        return this.request("/search/query", {
            method: "POST",
            body: {
                requests: [
                    {
                        entityTypes,
                        query: {
                            queryString: params.query
                        },
                        from: 0,
                        size: params.top || 25
                    }
                ]
            }
        });
    }
}
