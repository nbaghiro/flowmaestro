import type {
    PageContext,
    PageMetadata,
    StructuredPageData,
    ExtractedTable,
    ExtractedList,
    ExtractedForm,
    ExtractedHeading,
    ExtensionMessage,
    GetPageContextMessage
} from "@flowmaestro/shared";

/**
 * Listen for messages from the service worker
 */
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === "GET_PAGE_CONTEXT") {
        const payload = (message as GetPageContextMessage).payload;
        const context = extractPageContext(payload.includeStructured);
        sendResponse({
            type: "PAGE_CONTEXT_RESULT",
            payload: context
        });
    }
    return true;
});

/**
 * Extract complete page context
 */
function extractPageContext(includeStructured: boolean): PageContext {
    const context: PageContext = {
        url: window.location.href,
        title: document.title,
        text: extractVisibleText(),
        metadata: extractMetadata(),
        selection: getSelectedText(),
        extractedAt: new Date().toISOString()
    };

    if (includeStructured) {
        context.structured = extractStructuredData();
    }

    return context;
}

/**
 * Extract visible text content from the page
 */
function extractVisibleText(): string {
    // Clone the body to avoid modifying the actual page
    const clone = document.body.cloneNode(true) as HTMLElement;

    // Remove elements that shouldn't be included
    const selectorsToRemove = [
        "script",
        "style",
        "noscript",
        "iframe",
        "svg",
        "canvas",
        "video",
        "audio",
        "nav",
        "footer",
        "header",
        "[aria-hidden='true']",
        "[hidden]",
        ".sr-only",
        ".visually-hidden"
    ];

    selectorsToRemove.forEach((selector) => {
        clone.querySelectorAll(selector).forEach((el) => el.remove());
    });

    // Get text content
    let text = clone.innerText || clone.textContent || "";

    // Clean up whitespace
    text = text
        .replace(/\s+/g, " ")
        .replace(/\n\s*\n/g, "\n\n")
        .trim();

    // Limit to reasonable size (100k chars)
    if (text.length > 100000) {
        text = text.substring(0, 100000) + "...";
    }

    return text;
}

/**
 * Extract page metadata from meta tags
 */
function extractMetadata(): PageMetadata {
    const metadata: PageMetadata = {};

    // Standard meta tags
    const description = document.querySelector('meta[name="description"]');
    if (description) {
        metadata.description = description.getAttribute("content") || undefined;
    }

    const keywords = document.querySelector('meta[name="keywords"]');
    if (keywords) {
        const content = keywords.getAttribute("content");
        if (content) {
            metadata.keywords = content.split(",").map((k) => k.trim());
        }
    }

    const author = document.querySelector('meta[name="author"]');
    if (author) {
        metadata.author = author.getAttribute("content") || undefined;
    }

    // Open Graph tags
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
        metadata.ogImage = ogImage.getAttribute("content") || undefined;
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
        metadata.ogTitle = ogTitle.getAttribute("content") || undefined;
    }

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
        metadata.ogDescription = ogDescription.getAttribute("content") || undefined;
    }

    // Publish date from various sources
    const publishDate =
        document.querySelector('meta[property="article:published_time"]') ||
        document.querySelector('meta[name="date"]') ||
        document.querySelector("time[datetime]");
    if (publishDate) {
        metadata.publishDate =
            publishDate.getAttribute("content") ||
            publishDate.getAttribute("datetime") ||
            undefined;
    }

    // Canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
        metadata.canonicalUrl = canonical.getAttribute("href") || undefined;
    }

    // Favicon
    const favicon =
        document.querySelector('link[rel="icon"]') ||
        document.querySelector('link[rel="shortcut icon"]');
    if (favicon) {
        const href = favicon.getAttribute("href");
        if (href) {
            metadata.favicon = new URL(href, window.location.origin).href;
        }
    }

    return metadata;
}

/**
 * Extract structured data from the page
 */
function extractStructuredData(): StructuredPageData {
    return {
        tables: extractTables(),
        lists: extractLists(),
        forms: extractForms(),
        headings: extractHeadings()
    };
}

/**
 * Extract tables from the page
 */
function extractTables(): ExtractedTable[] {
    const tables: ExtractedTable[] = [];
    const tableElements = document.querySelectorAll("table");

    tableElements.forEach((table) => {
        // Skip hidden tables
        if (!isElementVisible(table)) return;

        const extractedTable: ExtractedTable = {
            headers: [],
            rows: []
        };

        // Get caption
        const caption = table.querySelector("caption");
        if (caption) {
            extractedTable.caption = caption.textContent?.trim();
        }

        // Get aria-label
        const ariaLabel = table.getAttribute("aria-label");
        if (ariaLabel && !extractedTable.caption) {
            extractedTable.caption = ariaLabel;
        }

        // Extract headers
        const headerCells = table.querySelectorAll("thead th, tr:first-child th");
        headerCells.forEach((th) => {
            extractedTable.headers.push(th.textContent?.trim() || "");
        });

        // Extract rows
        const rows = table.querySelectorAll("tbody tr, tr:not(:first-child)");
        rows.forEach((row) => {
            const cells = row.querySelectorAll("td, th");
            const rowData: string[] = [];
            cells.forEach((cell) => {
                rowData.push(cell.textContent?.trim() || "");
            });
            if (rowData.length > 0) {
                extractedTable.rows.push(rowData);
            }
        });

        // Only include tables with data
        if (extractedTable.rows.length > 0 || extractedTable.headers.length > 0) {
            tables.push(extractedTable);
        }
    });

    return tables.slice(0, 20); // Limit to 20 tables
}

/**
 * Extract lists from the page
 */
function extractLists(): ExtractedList[] {
    const lists: ExtractedList[] = [];
    const listElements = document.querySelectorAll("ul, ol");

    listElements.forEach((list) => {
        // Skip hidden lists and navigation menus
        if (!isElementVisible(list)) return;
        if (list.closest("nav")) return;

        const extractedList: ExtractedList = {
            type: list.tagName.toLowerCase() === "ol" ? "ordered" : "unordered",
            items: []
        };

        const items = list.querySelectorAll(":scope > li");
        items.forEach((item) => {
            const text = item.textContent?.trim();
            if (text && text.length > 0 && text.length < 500) {
                extractedList.items.push(text);
            }
        });

        // Only include lists with items
        if (extractedList.items.length > 2) {
            lists.push(extractedList);
        }
    });

    return lists.slice(0, 20); // Limit to 20 lists
}

/**
 * Extract forms from the page
 */
function extractForms(): ExtractedForm[] {
    const forms: ExtractedForm[] = [];
    const formElements = document.querySelectorAll("form");

    formElements.forEach((form) => {
        // Skip hidden forms
        if (!isElementVisible(form)) return;

        const extractedForm: ExtractedForm = {
            action: form.action || undefined,
            method: form.method || undefined,
            fields: []
        };

        // Extract input fields
        const inputs = form.querySelectorAll("input, select, textarea");
        inputs.forEach((input) => {
            const inputEl = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

            // Skip hidden and submit inputs
            if (inputEl.type === "hidden" || inputEl.type === "submit") return;

            const field: ExtractedForm["fields"][0] = {
                name: inputEl.name || inputEl.id || "",
                type: inputEl.type || inputEl.tagName.toLowerCase()
            };

            // Get label
            const labelEl = form.querySelector(`label[for="${inputEl.id}"]`);
            if (labelEl) {
                field.label = labelEl.textContent?.trim();
            }

            // Get value (but not for password fields)
            if (inputEl.type !== "password") {
                field.value = inputEl.value || undefined;
            }

            // Get select options
            if (inputEl instanceof HTMLSelectElement) {
                field.options = Array.from(inputEl.options).map((opt) => opt.text);
            }

            if (field.name || field.label) {
                extractedForm.fields.push(field);
            }
        });

        // Only include forms with fields
        if (extractedForm.fields.length > 0) {
            forms.push(extractedForm);
        }
    });

    return forms.slice(0, 10); // Limit to 10 forms
}

/**
 * Extract headings from the page
 */
function extractHeadings(): ExtractedHeading[] {
    const headings: ExtractedHeading[] = [];
    const headingElements = document.querySelectorAll("h1, h2, h3, h4, h5, h6");

    headingElements.forEach((heading) => {
        // Skip hidden headings
        if (!isElementVisible(heading)) return;

        const level = parseInt(heading.tagName.substring(1));
        const text = heading.textContent?.trim();

        if (text && text.length > 0 && text.length < 200) {
            headings.push({ level, text });
        }
    });

    return headings.slice(0, 50); // Limit to 50 headings
}

/**
 * Get user-selected text
 */
function getSelectedText(): string | undefined {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
        return selection.toString().trim();
    }
    return undefined;
}

/**
 * Check if an element is visible
 */
function isElementVisible(element: Element): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

// Export for testing
export {
    extractPageContext,
    extractVisibleText,
    extractMetadata,
    extractStructuredData,
    extractTables,
    extractLists,
    extractForms,
    extractHeadings
};
