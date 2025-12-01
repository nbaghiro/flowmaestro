import * as fs from "fs/promises";
import * as cheerio from "cheerio";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { DocumentFileType } from "../../storage/models/KnowledgeDocument";

export interface ExtractedText {
    content: string;
    metadata: {
        pages?: number;
        wordCount?: number;
        language?: string;
        [key: string]: unknown;
    };
}

export class TextExtractor {
    /**
     * Extract text from a file based on its type
     */
    async extractFromFile(filePath: string, fileType: DocumentFileType): Promise<ExtractedText> {
        switch (fileType) {
            case "pdf":
                return this.extractFromPDF(filePath);
            case "docx":
            case "doc":
                return this.extractFromDocx(filePath);
            case "txt":
            case "md":
                return this.extractFromText(filePath);
            case "html": {
                const htmlContent = await fs.readFile(filePath, "utf-8");
                return this.extractFromHTML(htmlContent);
            }
            case "json":
                return this.extractFromJSON(filePath);
            case "csv":
                return this.extractFromCSV(filePath);
            default:
                throw new Error(`Unsupported file type: ${fileType}`);
        }
    }

    /**
     * Extract text from a URL (fetches and processes HTML)
     */
    async extractFromURL(url: string): Promise<ExtractedText> {
        try {
            // Validate URL
            const parsedUrl = new URL(url);
            if (!["http:", "https:"].includes(parsedUrl.protocol)) {
                throw new Error(
                    `Unsupported protocol: ${parsedUrl.protocol}. Only http and https are supported.`
                );
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds

            let response: Response;
            try {
                // Build comprehensive browser-like headers to avoid bot detection
                const headers: Record<string, string> = {
                    "User-Agent":
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Cache-Control": "max-age=0",
                    "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    "Sec-Ch-Ua-Mobile": "?0",
                    "Sec-Ch-Ua-Platform": '"macOS"',
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "none",
                    "Sec-Fetch-User": "?1",
                    "Upgrade-Insecure-Requests": "1",
                    Connection: "keep-alive",
                    DNT: "1"
                };

                // Add Referer if we have a previous URL (for redirects)
                if (parsedUrl.hostname) {
                    headers.Referer = `${parsedUrl.protocol}//${parsedUrl.hostname}/`;
                }

                response = await fetch(url, {
                    headers,
                    redirect: "follow",
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
            } catch (error) {
                clearTimeout(timeoutId);
                if (error instanceof Error && error.name === "AbortError") {
                    console.error("[TextExtractor] Request timeout after 60 seconds");
                    throw new Error("Request timeout: The URL took too long to respond");
                }
                console.error("[TextExtractor] Fetch error:", error);
                throw error;
            }

            if (!response.ok) {
                const status = response.status;
                const statusText = response.statusText;

                console.error(`[TextExtractor] HTTP error: ${status} ${statusText}`);

                if (status === 403) {
                    throw new Error(
                        "HTTP 403 Forbidden: The website blocked the request. This may be due to bot protection (Cloudflare, etc.). " +
                            "Try a different URL or contact support if this is a legitimate use case."
                    );
                } else if (status === 401) {
                    throw new Error(
                        "HTTP 401 Unauthorized: Authentication required to access this URL."
                    );
                } else if (status === 404) {
                    throw new Error(
                        "HTTP 404 Not Found: The URL does not exist or has been removed."
                    );
                } else if (status >= 500) {
                    throw new Error(
                        `HTTP ${status} ${statusText}: Server error. The website may be temporarily unavailable.`
                    );
                } else {
                    throw new Error(`HTTP ${status}: ${statusText}`);
                }
            }

            const contentType = response.headers.get("content-type") || "";
            const contentLength = response.headers.get("content-length");
            const finalUrl = response.url || url; // Get final URL after redirects

            // Check content size
            if (contentLength) {
                const size = parseInt(contentLength, 10);
                if (size > 10 * 1024 * 1024) {
                    console.error(
                        `[TextExtractor] Content too large: ${(size / 1024 / 1024).toFixed(2)}MB`
                    );
                    throw new Error(
                        `Content too large: ${(size / 1024 / 1024).toFixed(2)}MB. Maximum size is 10MB.`
                    );
                }
            }

            if (contentType.includes("text/html")) {
                const htmlContent = await response.text();

                // Check actual content size
                if (htmlContent.length > 10 * 1024 * 1024) {
                    console.error(
                        `[TextExtractor] HTML content too large: ${(htmlContent.length / 1024 / 1024).toFixed(2)}MB`
                    );
                    throw new Error(
                        `HTML content too large: ${(htmlContent.length / 1024 / 1024).toFixed(2)}MB. Maximum size is 10MB.`
                    );
                }

                const result = this.extractFromHTML(htmlContent, finalUrl);
                console.log(
                    `[TextExtractor] Extracted ${result.content.length} characters, ${result.metadata.wordCount || 0} words`
                );
                return result;
            } else if (contentType.includes("text/plain")) {
                const textContent = await response.text();

                if (textContent.length > 10 * 1024 * 1024) {
                    throw new Error(
                        `Text content too large: ${(textContent.length / 1024 / 1024).toFixed(2)}MB. Maximum size is 10MB.`
                    );
                }

                return {
                    content: textContent,
                    metadata: {
                        wordCount: this.countWords(textContent),
                        source: finalUrl,
                        contentType: contentType.split(";")[0].trim()
                    }
                };
            } else if (contentType.includes("application/json")) {
                const jsonContent = await response.text();
                const data = JSON.parse(jsonContent);
                const textParts = this.extractTextFromObject(data);
                const fullText = textParts.join("\n");

                return {
                    content: fullText,
                    metadata: {
                        wordCount: this.countWords(fullText),
                        source: finalUrl,
                        contentType: "application/json",
                        structure: "json"
                    }
                };
            } else if (contentType.includes("application/pdf")) {
                throw new Error(
                    "PDF URLs are not yet supported. Please download and upload the file."
                );
            } else if (
                contentType.includes("application/xml") ||
                contentType.includes("text/xml")
            ) {
                const xmlContent = await response.text();
                return this.extractFromHTML(xmlContent, finalUrl);
            } else {
                try {
                    const textContent = await response.text();
                    return {
                        content: textContent,
                        metadata: {
                            wordCount: this.countWords(textContent),
                            source: finalUrl,
                            contentType: contentType.split(";")[0].trim(),
                            note: "Content type not explicitly supported, extracted as plain text"
                        }
                    };
                } catch (_parseError) {
                    throw new Error(
                        `Unsupported content type: ${contentType}. Failed to parse as text.`
                    );
                }
            }
        } catch (error: unknown) {
            console.error("[TextExtractor] Error in extractFromURL:", error);
            if (error instanceof Error) {
                // Re-throw with more context if it's already an Error
                if (error.message.includes("Failed to fetch URL")) {
                    throw error;
                }
                const enhancedError = new Error(`Failed to fetch URL: ${error.message}`);
                enhancedError.stack = error.stack;
                throw enhancedError;
            }
            throw new Error(`Failed to fetch URL: ${String(error)}`);
        }
    }

    /**
     * Extract text from PDF files
     */
    private async extractFromPDF(filePath: string): Promise<ExtractedText> {
        try {
            const dataBuffer = await fs.readFile(filePath);

            const pdfParser = new PDFParse({ data: dataBuffer });
            const data = await pdfParser.getText();

            return {
                content: data.text,
                metadata: {
                    pages: data.total,
                    wordCount: this.countWords(data.text)
                }
            };
        } catch (error: unknown) {
            throw new Error(
                `Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    /**
     * Extract text from DOCX files
     */
    private async extractFromDocx(filePath: string): Promise<ExtractedText> {
        try {
            const buffer = await fs.readFile(filePath);
            const result = await mammoth.extractRawText({ buffer });

            return {
                content: result.value,
                metadata: {
                    wordCount: this.countWords(result.value),
                    messages: result.messages // Any warnings during extraction
                }
            };
        } catch (error: unknown) {
            throw new Error(
                `Failed to extract text from DOCX: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    /**
     * Extract text from plain text or markdown files
     */
    private async extractFromText(filePath: string): Promise<ExtractedText> {
        try {
            const content = await fs.readFile(filePath, "utf-8");

            return {
                content,
                metadata: {
                    wordCount: this.countWords(content)
                }
            };
        } catch (error: unknown) {
            throw new Error(
                `Failed to read text file: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    /**
     * Extract text from HTML content
     */
    private extractFromHTML(html: string, sourceUrl?: string): ExtractedText {
        try {
            const $ = cheerio.load(html);

            // Remove unwanted elements that don't contribute to content
            $("script, style, noscript, iframe, embed, object, svg, canvas, audio, video").remove();

            // Remove common navigation and footer elements
            $(
                "nav, footer, header, aside, .nav, .navigation, .footer, .header, .sidebar, .menu"
            ).remove();

            // Remove comments
            $.root()
                .find("*")
                .contents()
                .filter(function () {
                    return this.nodeType === 8; // Comment node
                })
                .remove();

            // Extract metadata
            const title =
                $("title").text().trim() ||
                $('meta[property="og:title"]').attr("content")?.trim() ||
                $("h1").first().text().trim() ||
                "";

            const description =
                $('meta[name="description"]').attr("content")?.trim() ||
                $('meta[property="og:description"]').attr("content")?.trim() ||
                "";

            const author =
                $('meta[name="author"]').attr("content")?.trim() ||
                $('meta[property="article:author"]').attr("content")?.trim() ||
                "";

            const publishedTime =
                $('meta[property="article:published_time"]').attr("content")?.trim() ||
                $("time[datetime]").attr("datetime")?.trim() ||
                "";

            const keywords = $('meta[name="keywords"]').attr("content")?.trim() || "";

            // Extract main content with priority order
            const contentSelectors = [
                "main article",
                "article",
                "main",
                '[role="main"] article',
                '[role="main"]',
                ".article-content",
                ".post-content",
                ".entry-content",
                ".content",
                ".main-content",
                "#content",
                "#main-content",
                ".body-content"
            ];

            let mainContent = "";
            for (const selector of contentSelectors) {
                const element = $(selector).first();
                if (element.length > 0) {
                    // Clone to avoid modifying original
                    const cloned = element.clone();
                    // Remove nested navigation, ads, etc.
                    cloned.find("nav, .nav, .ad, .advertisement, .sidebar, .social-share").remove();
                    mainContent = cloned.text();
                    if (mainContent.trim().length > 100) {
                        // Only use if substantial content
                        break;
                    }
                }
            }

            // Fallback to body if no main content found
            if (!mainContent || mainContent.trim().length < 100) {
                const body = $("body").clone();
                // Remove common non-content elements
                body.find(
                    "nav, footer, header, aside, script, style, .nav, .footer, .header, .sidebar, .menu, .ad, .advertisement"
                ).remove();
                mainContent = body.text();
            }

            // Extract headings for structure
            const headings: string[] = [];
            $("h1, h2, h3").each((_, el) => {
                const text = $(el).text().trim();
                if (text) {
                    headings.push(text);
                }
            });

            // Extract links (for context)
            const links: Array<{ text: string; href: string }> = [];
            $("a[href]").each((_, el) => {
                const $el = $(el);
                const text = $el.text().trim();
                const href = $el.attr("href");
                if (text && href && text.length < 100) {
                    // Only short link texts
                    try {
                        // Resolve relative URLs
                        const absoluteUrl = sourceUrl ? new URL(href, sourceUrl).toString() : href;
                        links.push({ text, href: absoluteUrl });
                    } catch {
                        // Skip invalid URLs
                    }
                }
            });

            // Clean up whitespace while preserving structure
            mainContent = mainContent
                .replace(/\s+/g, " ") // Replace multiple spaces with single space
                .replace(/\n\s*\n\s*\n+/g, "\n\n") // Replace multiple newlines with double newline
                .trim();

            // Combine all text parts
            const textParts: string[] = [];

            if (title) textParts.push(`Title: ${title}`);
            if (description) textParts.push(`Description: ${description}`);
            if (headings.length > 0) {
                textParts.push(`\nHeadings:\n${headings.join("\n")}`);
            }
            if (mainContent) {
                textParts.push(`\nContent:\n${mainContent}`);
            }

            const fullText = textParts.join("\n\n");

            // Build metadata object
            const metadata: Record<string, unknown> = {
                title,
                description,
                wordCount: this.countWords(fullText),
                source: sourceUrl,
                characterCount: fullText.length
            };

            if (author) metadata.author = author;
            if (publishedTime) metadata.publishedTime = publishedTime;
            if (keywords) metadata.keywords = keywords.split(",").map((k) => k.trim());
            if (headings.length > 0) metadata.headingCount = headings.length;
            if (links.length > 0) {
                metadata.linkCount = links.length;
                // Include first few links as context
                metadata.sampleLinks = links.slice(0, 5).map((l) => l.text);
            }

            return {
                content: fullText,
                metadata
            };
        } catch (error: unknown) {
            throw new Error(
                `Failed to extract text from HTML: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    /**
     * Extract text from JSON files
     */
    private async extractFromJSON(filePath: string): Promise<ExtractedText> {
        try {
            const content = await fs.readFile(filePath, "utf-8");
            const data = JSON.parse(content);

            // Extract all text values from the JSON recursively
            const textParts = this.extractTextFromObject(data);
            const fullText = textParts.join("\n");

            return {
                content: fullText,
                metadata: {
                    wordCount: this.countWords(fullText),
                    structure: "json"
                }
            };
        } catch (error: unknown) {
            throw new Error(
                `Failed to extract text from JSON: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    /**
     * Extract text from CSV files
     */
    private async extractFromCSV(filePath: string): Promise<ExtractedText> {
        try {
            const content = await fs.readFile(filePath, "utf-8");

            // Simple CSV parsing (for production, consider using a library like csv-parser)
            const lines = content.split("\n");
            const rows: string[][] = [];

            for (const line of lines) {
                if (line.trim()) {
                    // Basic CSV splitting (doesn't handle quoted commas)
                    const cells = line.split(",").map((cell) => cell.trim());
                    rows.push(cells);
                }
            }

            // Convert to text format
            const textParts: string[] = [];

            if (rows.length > 0) {
                // First row as headers
                const headers = rows[0];
                textParts.push(`Headers: ${headers.join(", ")}`);

                // Remaining rows as data
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    const rowText = headers
                        .map((header, index) => `${header}: ${row[index] || ""}`)
                        .join(", ");
                    textParts.push(rowText);
                }
            }

            const fullText = textParts.join("\n");

            return {
                content: fullText,
                metadata: {
                    rowCount: rows.length - 1, // Excluding header
                    columnCount: rows[0]?.length || 0,
                    wordCount: this.countWords(fullText)
                }
            };
        } catch (error: unknown) {
            throw new Error(
                `Failed to extract text from CSV: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    /**
     * Recursively extract text from JSON objects
     */
    private extractTextFromObject(obj: unknown, depth: number = 0): string[] {
        const textParts: string[] = [];
        const maxDepth = 10; // Prevent infinite recursion

        if (depth > maxDepth) {
            return textParts;
        }

        if (typeof obj === "string") {
            textParts.push(obj);
        } else if (Array.isArray(obj)) {
            for (const item of obj) {
                textParts.push(...this.extractTextFromObject(item, depth + 1));
            }
        } else if (typeof obj === "object" && obj !== null) {
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    // Include the key as context
                    textParts.push(`${key}:`);
                    textParts.push(
                        ...this.extractTextFromObject(
                            obj[key as keyof typeof obj] as unknown,
                            depth + 1
                        )
                    );
                }
            }
        } else if (typeof obj === "number" || typeof obj === "boolean") {
            textParts.push(String(obj));
        }

        return textParts;
    }

    /**
     * Count words in text
     */
    private countWords(text: string): number {
        return text.trim().split(/\s+/).length;
    }
}
