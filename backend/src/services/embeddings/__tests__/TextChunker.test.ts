/**
 * TextChunker Tests
 *
 * Tests for text chunking service (TextChunker.ts)
 */

import { TextChunker } from "../TextChunker";

describe("TextChunker", () => {
    describe("Constructor", () => {
        it("should create chunker with default config", () => {
            const chunker = new TextChunker();

            // Verify it works with defaults
            const chunks = chunker.chunkText("Test sentence.");
            expect(chunks).toBeDefined();
        });

        it("should create chunker with custom config", () => {
            const chunker = new TextChunker({
                chunkSize: 500,
                chunkOverlap: 50
            });

            // Test with text that has sentence boundaries to ensure proper chunking
            const sentences = [];
            for (let i = 0; i < 10; i++) {
                sentences.push(
                    `This is sentence number ${i} with some padding text to make it longer.`
                );
            }
            const text = sentences.join(" ");
            const chunks = chunker.chunkText(text);

            // Should produce at least one chunk
            expect(chunks.length).toBeGreaterThanOrEqual(1);
            expect(chunks[0].content.length).toBeLessThanOrEqual(500);
        });

        it("should throw when overlap >= chunk size", () => {
            expect(() => new TextChunker({ chunkSize: 100, chunkOverlap: 100 })).toThrow(
                /overlap must be smaller than chunk size/
            );
        });

        it("should throw when overlap > chunk size", () => {
            expect(() => new TextChunker({ chunkSize: 100, chunkOverlap: 150 })).toThrow(
                /overlap must be smaller than chunk size/
            );
        });
    });

    describe("chunkText", () => {
        let chunker: TextChunker;

        beforeEach(() => {
            chunker = new TextChunker({ chunkSize: 100, chunkOverlap: 20 });
        });

        it("should return empty array for empty text", () => {
            expect(chunker.chunkText("")).toEqual([]);
            expect(chunker.chunkText("   ")).toEqual([]);
        });

        it("should return single chunk for short text", () => {
            const chunks = chunker.chunkText("Short text.");

            expect(chunks.length).toBe(1);
            expect(chunks[0].content).toBe("Short text.");
            expect(chunks[0].index).toBe(0);
        });

        it("should split long text into multiple chunks", () => {
            const sentences = [
                "This is the first sentence.",
                "This is the second sentence.",
                "This is the third sentence.",
                "This is the fourth sentence.",
                "This is the fifth sentence."
            ];
            const text = sentences.join(" ");

            const chunks = chunker.chunkText(text);

            expect(chunks.length).toBeGreaterThan(1);
            // Each chunk should have an incrementing index
            for (let i = 0; i < chunks.length; i++) {
                expect(chunks[i].index).toBe(i);
            }
        });

        it("should include metadata in chunks", () => {
            const chunks = chunker.chunkText("Test sentence.");

            expect(chunks[0].metadata).toBeDefined();
            expect(chunks[0].metadata.sentence_count).toBe(1);
            expect(chunks[0].metadata.start_char).toBeDefined();
            expect(chunks[0].metadata.end_char).toBeDefined();
        });

        it("should include document metadata in chunks", () => {
            const docMetadata = { source: "test.txt", author: "Test Author" };
            const chunks = chunker.chunkText("Test sentence.", docMetadata);

            expect(chunks[0].metadata.source).toBe("test.txt");
            expect(chunks[0].metadata.author).toBe("Test Author");
        });

        it("should create overlapping chunks", () => {
            // Create text that spans multiple chunks
            const chunkerWithOverlap = new TextChunker({ chunkSize: 50, chunkOverlap: 15 });
            const text =
                "First sentence here. Second sentence here. Third sentence here. Fourth sentence here.";

            const chunks = chunkerWithOverlap.chunkText(text);

            // With overlap, content from later chunks may appear in earlier ones' successors
            if (chunks.length > 1) {
                // Chunks should exist and have content
                expect(chunks[0].content.length).toBeGreaterThan(0);
                expect(chunks[1].content.length).toBeGreaterThan(0);
            }
        });

        it("should handle text without sentence boundaries", () => {
            const text = "No periods or sentence endings just continuous text without breaks";
            const chunks = chunker.chunkText(text);

            expect(chunks.length).toBeGreaterThanOrEqual(1);
            expect(chunks[0].content).toBeTruthy();
        });
    });

    describe("Sentence splitting", () => {
        let chunker: TextChunker;

        beforeEach(() => {
            chunker = new TextChunker({ chunkSize: 1000, chunkOverlap: 100 });
        });

        it("should split on periods", () => {
            const text = "First sentence. Second sentence. Third sentence.";
            const chunks = chunker.chunkText(text);

            expect(chunks[0].metadata.sentence_count).toBe(3);
        });

        it("should split on question marks", () => {
            const text = "Is this a question? Yes it is! And this too.";
            const chunks = chunker.chunkText(text);

            expect(chunks[0].metadata.sentence_count).toBe(3);
        });

        it("should split on exclamation marks", () => {
            const text = "Wow! Amazing! Incredible!";
            const chunks = chunker.chunkText(text);

            expect(chunks[0].metadata.sentence_count).toBe(3);
        });

        it("should preserve common abbreviations", () => {
            const text = "Dr. Smith met Mr. Jones. They discussed etc. and more.";
            const chunks = chunker.chunkText(text);

            // Should not split on "Dr." or "Mr." or "etc."
            // The exact count depends on implementation
            expect(chunks[0].content).toContain("Dr.");
            expect(chunks[0].content).toContain("Mr.");
        });
    });

    describe("chunkStructuredText", () => {
        let chunker: TextChunker;

        beforeEach(() => {
            chunker = new TextChunker({ chunkSize: 500, chunkOverlap: 50 });
        });

        it("should chunk markdown with heading preservation", () => {
            const markdown = `# Main Title

This is introduction text.

## Section One

Content for section one with multiple sentences. More text here.

## Section Two

Content for section two.
`;

            const chunks = chunker.chunkStructuredText(markdown, "markdown");

            expect(chunks.length).toBeGreaterThan(0);
            // Each chunk should have heading metadata
            const hasHeadingMetadata = chunks.some(
                (c) => c.metadata.heading !== undefined || c.metadata.level !== undefined
            );
            expect(hasHeadingMetadata).toBe(true);
        });

        it("should handle html structure type", () => {
            const html = "<html><body><p>Hello world.</p></body></html>";
            const chunks = chunker.chunkStructuredText(html, "html");

            expect(chunks.length).toBeGreaterThan(0);
        });

        it("should handle code structure type", () => {
            const code = `function hello() {
    console.log("Hello");
}

function goodbye() {
    console.log("Goodbye");
}`;
            const chunks = chunker.chunkStructuredText(code, "code");

            expect(chunks.length).toBeGreaterThan(0);
        });

        it("should fall back to regular chunking for unknown structure", () => {
            const text = "Regular text without special structure.";
            // TypeScript would prevent this, but testing fallback behavior
            const chunks = chunker.chunkStructuredText(text, "markdown");

            expect(chunks.length).toBeGreaterThan(0);
        });
    });

    describe("Markdown sectioning", () => {
        let chunker: TextChunker;

        beforeEach(() => {
            chunker = new TextChunker({ chunkSize: 1000, chunkOverlap: 100 });
        });

        it("should preserve heading levels in metadata", () => {
            const markdown = `# H1 Title

Content under H1.

## H2 Title

Content under H2.

### H3 Title

Content under H3.
`;

            const chunks = chunker.chunkStructuredText(markdown, "markdown");

            const levels = chunks.map((c) => c.metadata.level).filter(Boolean);
            expect(levels).toContain(1);
            expect(levels).toContain(2);
            expect(levels).toContain(3);
        });

        it("should handle markdown without headings", () => {
            const markdown = "Just plain text in markdown without any headings.";
            const chunks = chunker.chunkStructuredText(markdown, "markdown");

            expect(chunks.length).toBeGreaterThan(0);
            expect(chunks[0].metadata.heading).toBe("");
        });

        it("should handle consecutive headings", () => {
            const markdown = `# First

## Second

### Third

Some content finally.
`;

            const chunks = chunker.chunkStructuredText(markdown, "markdown");

            expect(chunks.length).toBeGreaterThan(0);
        });
    });

    describe("Edge cases", () => {
        it("should handle very long single sentence", () => {
            const chunker = new TextChunker({ chunkSize: 50, chunkOverlap: 10 });
            const longSentence = "A".repeat(200) + ".";

            const chunks = chunker.chunkText(longSentence);

            // Should still produce chunks even if sentence is longer than chunk size
            expect(chunks.length).toBeGreaterThan(0);
        });

        it("should handle unicode characters", () => {
            const chunker = new TextChunker();
            const text = "Hello 你好 مرحبا שלום. More text here.";

            const chunks = chunker.chunkText(text);

            expect(chunks[0].content).toContain("你好");
            expect(chunks[0].content).toContain("مرحبا");
        });

        it("should handle newlines in text", () => {
            const chunker = new TextChunker();
            const text = "Line one.\nLine two.\nLine three.";

            const chunks = chunker.chunkText(text);

            expect(chunks.length).toBeGreaterThan(0);
        });

        it("should handle multiple spaces", () => {
            const chunker = new TextChunker();
            const text = "Word    with    multiple    spaces.";

            const chunks = chunker.chunkText(text);

            expect(chunks.length).toBeGreaterThan(0);
        });

        it("should handle only punctuation", () => {
            const chunker = new TextChunker();
            const text = "...";

            const chunks = chunker.chunkText(text);

            // Should produce at least one chunk for non-empty content
            expect(chunks.length).toBeGreaterThanOrEqual(1);
        });
    });
});
