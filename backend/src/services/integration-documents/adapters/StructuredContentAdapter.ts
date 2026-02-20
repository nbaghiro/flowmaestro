/**
 * Structured Content Adapter
 *
 * Adapter for structured content providers like Notion, Confluence.
 * Converts pages/blocks to markdown for knowledge base import.
 */

import { createServiceLogger } from "../../../core/logging";
import { providerRegistry } from "../../../integrations/registry";
import { BaseDocumentAdapter } from "./DocumentAdapter";
import type { IProvider, OperationResult } from "../../../integrations/core/types";
import type { ConnectionWithData } from "../../../storage/models/Connection";
import type {
    DocumentCapability,
    IntegrationFile,
    IntegrationBrowseResult,
    IntegrationDownloadResult,
    BrowseOptions
} from "../types";

const logger = createServiceLogger("StructuredContentAdapter");

/**
 * Adapter for structured content providers (Notion, Confluence, Coda)
 */
export class StructuredContentAdapter extends BaseDocumentAdapter {
    readonly provider: string;
    readonly capability: DocumentCapability;

    private providerInstance: IProvider;

    constructor(provider: IProvider, capability: DocumentCapability) {
        super();
        this.provider = provider.name;
        this.capability = capability;
        this.providerInstance = provider;
    }

    /**
     * Browse/search pages in the provider
     */
    async browse(
        connection: ConnectionWithData,
        options: BrowseOptions
    ): Promise<IntegrationBrowseResult> {
        // Structured content providers typically use search for browsing
        const searchOp = this.capability.searchOperation || this.capability.listOperation;
        if (!searchOp) {
            throw new Error(`Provider ${this.provider} does not support page listing`);
        }

        const params: Record<string, unknown> = {};

        // For Notion, use filter to show only pages
        if (this.provider === "notion") {
            params.filter = { value: "page", property: "object" };
        }

        if (options.query) {
            params.query = options.query;
        }

        if (options.pageSize) {
            params.page_size = options.pageSize;
        }

        if (options.pageToken) {
            params.start_cursor = options.pageToken;
        }

        const result = await this.providerInstance.executeOperation(searchOp, params, connection, {
            mode: "workflow",
            workflowId: "integration-import",
            nodeId: "browse"
        });

        if (!result.success) {
            throw new Error(result.error?.message || "Failed to list pages");
        }

        return {
            files: this.normalizePageList(result),
            nextPageToken: this.extractNextCursor(result),
            breadcrumbs: []
        };
    }

    /**
     * Search for pages
     */
    async search(
        connection: ConnectionWithData,
        query: string,
        options?: { pageToken?: string; pageSize?: number }
    ): Promise<IntegrationBrowseResult> {
        const searchOp = this.capability.searchOperation;
        if (!searchOp) {
            throw new Error(`Provider ${this.provider} does not support search`);
        }

        const params: Record<string, unknown> = {
            query
        };

        if (this.provider === "notion") {
            params.filter = { value: "page", property: "object" };
        }

        if (options?.pageSize) {
            params.page_size = options.pageSize;
        }

        if (options?.pageToken) {
            params.start_cursor = options.pageToken;
        }

        const result = await this.providerInstance.executeOperation(searchOp, params, connection, {
            mode: "workflow",
            workflowId: "integration-import",
            nodeId: "search"
        });

        if (!result.success) {
            throw new Error(result.error?.message || "Failed to search pages");
        }

        return {
            files: this.normalizePageList(result),
            nextPageToken: this.extractNextCursor(result),
            breadcrumbs: []
        };
    }

    /**
     * Download page content as markdown
     */
    async download(
        connection: ConnectionWithData,
        fileId: string,
        _mimeType: string
    ): Promise<IntegrationDownloadResult> {
        if (!this.capability.getContentOperation) {
            throw new Error(`Provider ${this.provider} does not support content retrieval`);
        }

        // Get page content
        const result = await this.providerInstance.executeOperation(
            this.capability.getContentOperation,
            { page_id: fileId },
            connection,
            { mode: "workflow", workflowId: "integration-import", nodeId: "getPage" }
        );

        if (!result.success) {
            throw new Error(result.error?.message || "Failed to get page content");
        }

        // Get page blocks for content
        let blocks: unknown[] = [];
        try {
            const blocksResult = await this.getPageBlocks(connection, fileId);
            blocks = blocksResult;
        } catch (error) {
            logger.warn(
                { pageId: fileId, err: error },
                "Failed to get page blocks, using page metadata only"
            );
        }

        const page = result.data as Record<string, unknown>;

        // Convert to markdown
        const markdown = this.convertToMarkdown(page, blocks);
        const buffer = Buffer.from(markdown, "utf-8");

        // Extract title
        const title = this.extractPageTitle(page);

        return {
            buffer,
            contentType: "text/markdown",
            filename: `${title || fileId}.md`,
            size: buffer.length,
            fileId,
            modifiedTime: page.last_edited_time as string | null,
            contentHash: this.computeHash(buffer)
        };
    }

    /**
     * Get page blocks (for Notion)
     */
    private async getPageBlocks(
        connection: ConnectionWithData,
        pageId: string
    ): Promise<unknown[]> {
        if (this.provider !== "notion") {
            return [];
        }

        // Use the blocks endpoint directly via the provider
        try {
            // Try to get blocks using a hypothetical getBlocks operation
            // If not available, we'll use the page content only
            const result = await this.providerInstance.executeOperation(
                "getBlocks",
                { page_id: pageId },
                connection,
                { mode: "workflow", workflowId: "integration-import", nodeId: "getBlocks" }
            );

            if (result.success && result.data) {
                const data = result.data as { results?: unknown[] };
                return data.results || [];
            }
        } catch {
            // Operation might not exist, that's okay
        }

        return [];
    }

    /**
     * Get page info without content
     */
    async getFileInfo(
        connection: ConnectionWithData,
        fileId: string
    ): Promise<IntegrationFile | null> {
        if (!this.capability.getContentOperation) {
            return null;
        }

        try {
            const result = await this.providerInstance.executeOperation(
                this.capability.getContentOperation,
                { page_id: fileId },
                connection,
                { mode: "workflow", workflowId: "integration-import", nodeId: "getPage" }
            );

            if (!result.success) {
                return null;
            }

            const page = result.data as Record<string, unknown>;
            return this.normalizePage(page);
        } catch (error) {
            logger.debug({ fileId, err: error }, "Failed to get page info");
            return null;
        }
    }

    /**
     * Normalize page list from provider response
     */
    private normalizePageList(result: OperationResult): IntegrationFile[] {
        const data = result.data as Record<string, unknown>;

        let items: unknown[] = [];

        if (Array.isArray(data)) {
            items = data;
        } else if (data.results) {
            items = data.results as unknown[];
        }

        return items
            .filter((item) => {
                const page = item as Record<string, unknown>;
                // Filter to only pages, not databases
                return page.object === "page" || !page.object;
            })
            .map((item) => this.normalizePage(item as Record<string, unknown>));
    }

    /**
     * Normalize a single page from provider format
     */
    private normalizePage(page: Record<string, unknown>): IntegrationFile {
        const title = this.extractPageTitle(page);

        if (this.provider === "notion") {
            return {
                id: page.id as string,
                name: title || "Untitled",
                mimeType: "text/markdown", // Will be converted to markdown
                size: null,
                isFolder: false,
                modifiedTime: page.last_edited_time as string | null,
                path: page.url as string | null,
                downloadable: true,
                parentId: (page.parent as Record<string, unknown>)?.page_id as string | null
            };
        }

        // Generic structured content
        return {
            id: (page.id || page.key) as string,
            name: title || "Untitled",
            mimeType: "text/markdown",
            size: null,
            isFolder: false,
            modifiedTime: (page.last_edited_time || page.updated_at || page.modified) as
                | string
                | null,
            path: (page.url || page.link) as string | null,
            downloadable: true,
            parentId: null
        };
    }

    /**
     * Extract page title from various formats
     */
    private extractPageTitle(page: Record<string, unknown>): string {
        // Notion format
        if (page.properties) {
            const props = page.properties as Record<string, unknown>;

            // Try common title property names
            for (const titleKey of ["title", "Title", "Name", "name"]) {
                const titleProp = props[titleKey] as Record<string, unknown>;
                if (titleProp?.title) {
                    const titleArray = titleProp.title as Array<{ plain_text?: string }>;
                    if (titleArray.length > 0 && titleArray[0].plain_text) {
                        return titleArray[0].plain_text;
                    }
                }
            }
        }

        // Direct title property
        if (typeof page.title === "string") {
            return page.title;
        }

        // Array of title objects
        if (Array.isArray(page.title) && page.title.length > 0) {
            const firstTitle = page.title[0] as { plain_text?: string; text?: string };
            return firstTitle.plain_text || firstTitle.text || "";
        }

        // Name property
        if (typeof page.name === "string") {
            return page.name;
        }

        return "";
    }

    /**
     * Convert Notion page and blocks to markdown
     */
    private convertToMarkdown(page: Record<string, unknown>, blocks: unknown[]): string {
        const lines: string[] = [];

        // Add title as H1
        const title = this.extractPageTitle(page);
        if (title) {
            lines.push(`# ${title}`);
            lines.push("");
        }

        // Add metadata as YAML frontmatter
        lines.push("---");
        lines.push(`id: ${page.id}`);
        if (page.url) {
            lines.push(`url: ${page.url}`);
        }
        if (page.created_time) {
            lines.push(`created: ${page.created_time}`);
        }
        if (page.last_edited_time) {
            lines.push(`modified: ${page.last_edited_time}`);
        }
        lines.push("---");
        lines.push("");

        // Convert blocks to markdown
        if (blocks.length > 0) {
            for (const block of blocks) {
                const markdown = this.blockToMarkdown(block as Record<string, unknown>);
                if (markdown) {
                    lines.push(markdown);
                }
            }
        } else {
            // If no blocks, try to extract content from page properties
            const propsContent = this.extractPropertiesAsMarkdown(page);
            if (propsContent) {
                lines.push(propsContent);
            }
        }

        return lines.join("\n");
    }

    /**
     * Convert a single Notion block to markdown
     */
    private blockToMarkdown(block: Record<string, unknown>): string {
        const type = block.type as string;

        switch (type) {
            case "paragraph":
                return this.richTextToMarkdown(block.paragraph as Record<string, unknown>) + "\n";

            case "heading_1":
                return `# ${this.richTextToMarkdown(block.heading_1 as Record<string, unknown>)}\n`;

            case "heading_2":
                return `## ${this.richTextToMarkdown(block.heading_2 as Record<string, unknown>)}\n`;

            case "heading_3":
                return `### ${this.richTextToMarkdown(block.heading_3 as Record<string, unknown>)}\n`;

            case "bulleted_list_item":
                return `- ${this.richTextToMarkdown(block.bulleted_list_item as Record<string, unknown>)}`;

            case "numbered_list_item":
                return `1. ${this.richTextToMarkdown(block.numbered_list_item as Record<string, unknown>)}`;

            case "to_do": {
                const todo = block.to_do as Record<string, unknown>;
                const checked = todo.checked ? "x" : " ";
                return `- [${checked}] ${this.richTextToMarkdown(todo)}`;
            }

            case "toggle":
                return `<details>\n<summary>${this.richTextToMarkdown(block.toggle as Record<string, unknown>)}</summary>\n</details>\n`;

            case "code": {
                const code = block.code as Record<string, unknown>;
                const language = code.language || "";
                return `\`\`\`${language}\n${this.richTextToMarkdown(code)}\n\`\`\`\n`;
            }

            case "quote":
                return `> ${this.richTextToMarkdown(block.quote as Record<string, unknown>)}\n`;

            case "divider":
                return "---\n";

            case "callout": {
                const callout = block.callout as Record<string, unknown>;
                const icon = callout.icon as Record<string, unknown>;
                const emoji = icon?.emoji || "💡";
                return `> ${emoji} ${this.richTextToMarkdown(callout)}\n`;
            }

            case "image": {
                const image = block.image as Record<string, unknown>;
                const url =
                    (image.file as Record<string, unknown>)?.url ||
                    (image.external as Record<string, unknown>)?.url ||
                    "";
                const caption = this.richTextToMarkdown(image);
                return `![${caption || "image"}](${url})\n`;
            }

            case "bookmark": {
                const bookmark = block.bookmark as Record<string, unknown>;
                const url = bookmark.url as string;
                const caption = this.richTextToMarkdown(bookmark);
                return `[${caption || url}](${url})\n`;
            }

            case "link_preview": {
                const preview = block.link_preview as Record<string, unknown>;
                return `[${preview.url}](${preview.url})\n`;
            }

            case "table_of_contents":
                return "[TOC]\n";

            default: {
                // Unknown block type - try to extract text
                const blockData = block[type] as Record<string, unknown>;
                if (blockData && blockData.rich_text) {
                    return this.richTextToMarkdown(blockData) + "\n";
                }
                return "";
            }
        }
    }

    /**
     * Convert Notion rich text array to markdown
     */
    private richTextToMarkdown(blockData: Record<string, unknown>): string {
        const richText = blockData?.rich_text as Array<Record<string, unknown>>;

        if (!richText || !Array.isArray(richText)) {
            return "";
        }

        return richText
            .map((item) => {
                let text = (item.plain_text as string) || "";

                const annotations = item.annotations as Record<string, boolean>;
                if (annotations) {
                    if (annotations.bold) text = `**${text}**`;
                    if (annotations.italic) text = `*${text}*`;
                    if (annotations.strikethrough) text = `~~${text}~~`;
                    if (annotations.code) text = `\`${text}\``;
                }

                // Handle links
                if (item.href) {
                    text = `[${text}](${item.href})`;
                }

                return text;
            })
            .join("");
    }

    /**
     * Extract page properties as markdown
     */
    private extractPropertiesAsMarkdown(page: Record<string, unknown>): string {
        const properties = page.properties as Record<string, unknown>;
        if (!properties) return "";

        const lines: string[] = [];

        for (const [key, value] of Object.entries(properties)) {
            if (key === "title" || key === "Title" || key === "Name") continue; // Skip title, already used as H1

            const prop = value as Record<string, unknown>;
            const propType = prop.type as string;
            let propValue = "";

            switch (propType) {
                case "rich_text":
                    propValue = this.richTextToMarkdown({ rich_text: prop.rich_text });
                    break;
                case "number":
                    propValue = String(prop.number || "");
                    break;
                case "select":
                    propValue = ((prop.select as Record<string, unknown>)?.name as string) || "";
                    break;
                case "multi_select":
                    propValue = ((prop.multi_select as Array<Record<string, unknown>>) || [])
                        .map((s) => s.name)
                        .join(", ");
                    break;
                case "date": {
                    const date = prop.date as Record<string, unknown>;
                    propValue = (date?.start as string) || "";
                    break;
                }
                case "url":
                    propValue = (prop.url as string) || "";
                    break;
                case "email":
                    propValue = (prop.email as string) || "";
                    break;
                case "phone_number":
                    propValue = (prop.phone_number as string) || "";
                    break;
                case "checkbox":
                    propValue = prop.checkbox ? "Yes" : "No";
                    break;
                default:
                    continue;
            }

            if (propValue) {
                lines.push(`**${key}:** ${propValue}`);
            }
        }

        return lines.join("\n\n");
    }

    /**
     * Extract next cursor from provider response
     */
    private extractNextCursor(result: OperationResult): string | null {
        const data = result.data as Record<string, unknown>;

        if (data.has_more && data.next_cursor) {
            return data.next_cursor as string;
        }

        return null;
    }
}

/**
 * Create a structured content adapter for a provider
 */
export async function createStructuredContentAdapter(
    providerName: string,
    capability: DocumentCapability
): Promise<StructuredContentAdapter> {
    const provider = await providerRegistry.loadProvider(providerName);
    return new StructuredContentAdapter(provider, capability);
}
