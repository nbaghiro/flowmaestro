import { ChunkMetadata } from "../../storage/models/KnowledgeChunk";

export interface ChunkConfig {
    chunkSize: number; // Maximum characters per chunk
    chunkOverlap: number; // Number of characters to overlap between chunks
}

export interface TextChunk {
    content: string;
    index: number;
    metadata: ChunkMetadata;
}

export class TextChunker {
    private config: ChunkConfig;

    constructor(config?: Partial<ChunkConfig>) {
        this.config = {
            chunkSize: config?.chunkSize || 1000,
            chunkOverlap: config?.chunkOverlap || 200
        };

        // Validate config
        if (this.config.chunkOverlap >= this.config.chunkSize) {
            throw new Error("Chunk overlap must be smaller than chunk size");
        }
    }

    /**
     * Split text into chunks with overlap, preserving sentence boundaries
     */
    chunkText(text: string, documentMetadata?: Record<string, unknown>): TextChunk[] {
        if (!text || text.trim().length === 0) {
            return [];
        }

        const chunks: TextChunk[] = [];
        const { chunkSize, chunkOverlap } = this.config;

        // Split text into sentences first
        const sentences = this.splitIntoSentences(text);

        let currentChunk = "";
        let currentSentences: string[] = [];
        let chunkIndex = 0;
        let charPosition = 0;

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i];
            const potentialChunk = currentChunk + (currentChunk ? " " : "") + sentence;

            // If adding this sentence would exceed chunk size
            if (potentialChunk.length > chunkSize && currentChunk.length > 0) {
                // Save current chunk
                chunks.push({
                    content: currentChunk.trim(),
                    index: chunkIndex,
                    metadata: {
                        start_char: charPosition - currentChunk.length,
                        end_char: charPosition,
                        sentence_count: currentSentences.length,
                        ...documentMetadata
                    }
                });

                chunkIndex++;

                // Start new chunk with overlap
                // Include last few sentences for context
                const overlapSentences = this.getOverlapSentences(currentSentences, chunkOverlap);
                currentChunk = overlapSentences.join(" ");
                currentSentences = [...overlapSentences.map((s) => s)];
                charPosition = currentChunk.length;
            }

            // Add sentence to current chunk
            if (currentChunk) {
                currentChunk += " " + sentence;
            } else {
                currentChunk = sentence;
            }
            currentSentences.push(sentence);
            charPosition += sentence.length + 1; // +1 for space
        }

        // Add final chunk if there's content
        if (currentChunk.trim().length > 0) {
            chunks.push({
                content: currentChunk.trim(),
                index: chunkIndex,
                metadata: {
                    start_char: charPosition - currentChunk.length,
                    end_char: charPosition,
                    sentence_count: currentSentences.length,
                    ...documentMetadata
                }
            });
        }

        return chunks;
    }

    /**
     * Split text into chunks for specific document types with structure
     */
    chunkStructuredText(
        text: string,
        structure: "markdown" | "html" | "code",
        documentMetadata?: Record<string, unknown>
    ): TextChunk[] {
        switch (structure) {
            case "markdown":
                return this.chunkMarkdown(text, documentMetadata);
            case "html":
                return this.chunkHTML(text, documentMetadata);
            case "code":
                return this.chunkCode(text, documentMetadata);
            default:
                return this.chunkText(text, documentMetadata);
        }
    }

    /**
     * Split markdown text, preserving headings structure
     */
    private chunkMarkdown(text: string, documentMetadata?: Record<string, unknown>): TextChunk[] {
        const chunks: TextChunk[] = [];
        const sections = this.splitMarkdownSections(text);

        let chunkIndex = 0;

        for (const section of sections) {
            const sectionChunks = this.chunkText(section.content, {
                heading: section.heading,
                level: section.level,
                ...documentMetadata
            });

            // Update chunk indices
            for (const chunk of sectionChunks) {
                chunks.push({
                    ...chunk,
                    index: chunkIndex++
                });
            }
        }

        return chunks;
    }

    /**
     * Split markdown into sections by headings
     */
    private splitMarkdownSections(
        text: string
    ): Array<{ heading: string; level: number; content: string }> {
        const sections: Array<{ heading: string; level: number; content: string }> = [];
        const lines = text.split("\n");

        let currentHeading = "";
        let currentLevel = 0;
        let currentContent: string[] = [];

        for (const line of lines) {
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

            if (headingMatch) {
                // Save previous section if exists
                if (currentContent.length > 0) {
                    sections.push({
                        heading: currentHeading,
                        level: currentLevel,
                        content: currentContent.join("\n").trim()
                    });
                }

                // Start new section
                currentHeading = headingMatch[2];
                currentLevel = headingMatch[1].length;
                currentContent = [];
            } else {
                currentContent.push(line);
            }
        }

        // Add final section
        if (currentContent.length > 0) {
            sections.push({
                heading: currentHeading,
                level: currentLevel,
                content: currentContent.join("\n").trim()
            });
        }

        return sections;
    }

    /**
     * Chunk HTML content (placeholder - similar to markdown)
     */
    private chunkHTML(text: string, documentMetadata?: Record<string, unknown>): TextChunk[] {
        // For now, use basic chunking
        // In production, you might want to preserve HTML structure
        return this.chunkText(text, documentMetadata);
    }

    /**
     * Chunk code (placeholder - could preserve function/class boundaries)
     */
    private chunkCode(text: string, documentMetadata?: Record<string, unknown>): TextChunk[] {
        // For now, use basic chunking
        // In production, you might want to chunk by functions/classes
        return this.chunkText(text, documentMetadata);
    }

    /**
     * Split text into sentences using basic rules
     */
    private splitIntoSentences(text: string): string[] {
        // This is a simple sentence splitter
        // For production, consider using a proper NLP library
        const sentences: string[] = [];

        // Split on sentence boundaries (., !, ?)
        // But preserve common abbreviations (Mr., Dr., etc.)
        const parts = text.split(/([.!?]+\s+)/).filter(Boolean);

        let currentSentence = "";

        for (const part of parts) {
            currentSentence += part;

            // Check if this looks like end of sentence
            if (/[.!?]+\s+$/.test(part) && currentSentence.trim().length > 0) {
                // Check for common abbreviations
                const isAbbreviation = /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|i\.e|e\.g)\.\s*$/.test(
                    currentSentence
                );

                if (!isAbbreviation) {
                    sentences.push(currentSentence.trim());
                    currentSentence = "";
                }
            }
        }

        // Add remaining text as final sentence
        if (currentSentence.trim().length > 0) {
            sentences.push(currentSentence.trim());
        }

        return sentences;
    }

    /**
     * Get sentences that fit within the overlap size
     */
    private getOverlapSentences(sentences: string[], overlapSize: number): string[] {
        const overlapSentences: string[] = [];
        let overlapLength = 0;

        // Work backwards from the end
        for (let i = sentences.length - 1; i >= 0; i--) {
            const sentence = sentences[i];
            if (overlapLength + sentence.length <= overlapSize) {
                overlapSentences.unshift(sentence);
                overlapLength += sentence.length + 1; // +1 for space
            } else {
                break;
            }
        }

        return overlapSentences;
    }
}
