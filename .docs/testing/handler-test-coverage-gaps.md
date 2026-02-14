# Handler Test Coverage Gaps

This document provides a detailed analysis of test coverage gaps in the workflow node executor/handler test suite, along with specific test cases to implement.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Coverage Status Overview](#coverage-status-overview)
3. [Priority 1: File Operations Handler](#priority-1-file-operations-handler)
4. [Priority 2: Audio Input Handler](#priority-2-audio-input-handler)
5. [Priority 3: Shared Memory Handler](#priority-3-shared-memory-handler)
6. [Priority 4: Input Handler](#priority-4-input-handler)
7. [Priority 5: Cross-Handler Gaps](#priority-5-cross-handler-gaps)
8. [Test Pattern Reference](#test-pattern-reference)
9. [Implementation Checklist](#implementation-checklist)

---

## Executive Summary

| Metric                | Current          | Target       | Progress     |
| --------------------- | ---------------- | ------------ | ------------ |
| Handlers with tests   | 36/38 (95%)      | 38/38 (100%) | ⚪           |
| Avg tests per handler | 42               | 40+          | 🟢 Achieved! |
| Concurrency tests     | ~50% of handlers | 70%          | 🟢 +35%      |
| Timeout tests         | ~35% of handlers | 60%          | 🟢 +25%      |
| Error depth coverage  | ~50%             | 50%          | 🟢 Achieved! |

**Completed (Phase 1, 2 & 3):**

- ✅ File Operations - Added 21 tests (URL timeout, PDF/CSV edge cases, concurrency)
- ✅ Audio Input - Added 15 tests (concurrency, formats, rate limiting, error handling)
- ✅ Shared Memory - Added 12 tests (concurrency, search, large values, validation)
- ✅ Input Handler - Added 18 tests (concurrency, JSON/text edge cases, validation)
- ✅ Web Browse - Added 4 tests (timeout, concurrent requests, error isolation)
- ✅ Web Search - Added 4 tests (timeout, concurrent searches, rate limit isolation)
- ✅ File Download - Added 4 tests (timeout, concurrent downloads, error isolation)
- ✅ Screenshot Capture - Added 6 tests (timeout, concurrency, cleanup)
- ✅ Code Handler - Added 4 tests (concurrent JS, error isolation, Python cleanup)
- ✅ Switch Handler - Added 3 tests (concurrent evaluations, state isolation)
- ✅ PDF Generation - Added 4 tests (concurrency, error isolation, cleanup)

**Remaining (Phase 4 - Future):**

- Integration tests for handler chaining (LLM → Transform → Output)

---

## Coverage Status Overview

### Handlers by Test Count

| Category | Handler          | Tests | Status       |
| -------- | ---------------- | ----- | ------------ |
| **High** | Code             | 84    | ✅ Excellent |
| **High** | Conditional      | 56    | ✅ Excellent |
| **High** | Transform        | 54    | ✅ Excellent |
| **High** | Loop             | 46    | ✅ Excellent |
| **High** | LLM              | 45    | ✅ Excellent |
| **Good** | Human Review     | 36    | ✅ Good      |
| **Good** | Integration Node | 35    | ✅ Good      |
| **Good** | Vision           | 35    | ✅ Good      |
| **Good** | File Operations  | 57    | ✅ Excellent |
| **Good** | Input            | 40    | ✅ Good      |
| **Good** | PDF Extract      | 34    | ✅ Good      |
| **Good** | Audio Input      | 33    | ✅ Good      |
| **Good** | Shared Memory    | 32    | ✅ Good      |
| **Good** | Switch           | 30    | ✅ Good      |

### Test File Mapping

```
handlers/
├── ai/
│   ├── llm.ts                    → __tests__/llm.test.ts (45 tests)
│   ├── vision.ts                 → __tests__/vision.test.ts (35 tests)
│   ├── audio.ts                  → __tests__/audio.test.ts
│   ├── embeddings.ts             → __tests__/embeddings.test.ts
│   ├── image-generation.ts       → __tests__/image-generation.test.ts
│   ├── video-generation.ts       → __tests__/video-generation.test.ts
│   ├── audio-transcription.ts    → __tests__/audio-transcription.test.ts
│   └── ocr-extraction.ts         → __tests__/ocr-extraction.test.ts
├── inputs/
│   ├── input.ts                  → __tests__/input.test.ts (22 tests)
│   ├── audio-input.ts            → __tests__/audio-input.test.ts (18 tests)
│   ├── url.ts                    → __tests__/url.test.ts
│   ├── files.ts                  → __tests__/files.test.ts
│   ├── file-read.ts              → __tests__/file-read.test.ts
│   ├── file-download.ts          → __tests__/file-download.test.ts
│   ├── pdf-extract.ts            → __tests__/pdf-extract.test.ts
│   ├── web-browse.ts             → __tests__/web-browse.test.ts
│   └── web-search.ts             → __tests__/web-search.test.ts
├── outputs/
│   ├── output.ts                 → __tests__/output.test.ts
│   ├── template-output.ts        → __tests__/template-output.test.ts
│   ├── audio-output.ts           → __tests__/audio-output.test.ts
│   ├── file-write.ts             → __tests__/file-write.test.ts
│   ├── action.ts                 → __tests__/action.test.ts
│   ├── chart-generation.ts       → __tests__/chart-generation.test.ts
│   ├── pdf-generation.ts         → __tests__/pdf-generation.test.ts
│   ├── screenshot-capture.ts     → __tests__/screenshot-capture.test.ts
│   └── spreadsheet-generation.ts → __tests__/spreadsheet-generation.test.ts
├── logic/
│   ├── code.ts                   → __tests__/code.test.ts (84 tests)
│   ├── conditional.ts            → __tests__/conditional.test.ts (56 tests)
│   ├── transform.ts              → __tests__/transform.test.ts (54 tests)
│   ├── loop.ts                   → __tests__/loop.test.ts (46 tests)
│   ├── switch.ts                 → __tests__/switch.test.ts (30 tests)
│   ├── shared-memory.ts          → __tests__/shared-memory.test.ts (20 tests)
│   ├── human-review.ts           → __tests__/human-review.test.ts
│   └── wait.ts                   → __tests__/wait.test.ts
├── integrations/
│   ├── integration.ts            → __tests__/integration-node.test.ts (35 tests)
│   └── file.ts                   → __tests__/file-operations.test.ts (partial)
└── utils/
    ├── http.ts                   → __tests__/http.test.ts
    └── database.ts               → __tests__/database.test.ts
```

---

## Priority 1: File Operations Handler

**File:** `handlers/integrations/file.ts` (319 lines)
**Existing Tests:** `file-operations.test.ts` - covers basic operations but lacks integration-specific tests

### Implementation Details

The `FileOperationsNodeHandler` supports:

- `read` - Read file from path or URL
- `write` - Write content to file path
- `parsePDF` - Parse PDF from URL, path, or base64
- `parseCSV` - Parse CSV file
- `parseJSON` - Parse JSON file

### Missing Test Scenarios

#### 1. Path Security Tests (Critical)

```typescript
describe("path security", () => {
    it("prevents path traversal attacks", async () => {
        const input = createHandlerInput({
            nodeType: "file",
            nodeConfig: {
                operation: "read",
                fileSource: "path",
                filePath: "../../../etc/passwd"
            }
        });

        await expect(handler.execute(input)).rejects.toThrow(/path traversal/i);
    });

    it("rejects absolute paths outside allowed directories", async () => {
        const input = createHandlerInput({
            nodeType: "file",
            nodeConfig: {
                operation: "write",
                outputPath: "/etc/hosts",
                content: "malicious content"
            }
        });

        await expect(handler.execute(input)).rejects.toThrow(/not allowed/i);
    });

    it("handles symlink attacks", async () => {
        // Create symlink to sensitive file
        const input = createHandlerInput({
            nodeType: "file",
            nodeConfig: {
                operation: "read",
                fileSource: "path",
                filePath: "/tmp/symlink-to-passwd"
            }
        });

        await expect(handler.execute(input)).rejects.toThrow();
    });
});
```

#### 2. URL Download Security Tests

```typescript
describe("URL security", () => {
    it("prevents SSRF attacks to internal networks", async () => {
        const input = createHandlerInput({
            nodeType: "file",
            nodeConfig: {
                operation: "read",
                fileSource: "url",
                filePath: "http://169.254.169.254/latest/meta-data/"
            }
        });

        await expect(handler.execute(input)).rejects.toThrow(/blocked/i);
    });

    it("validates URL scheme (only http/https)", async () => {
        const input = createHandlerInput({
            nodeType: "file",
            nodeConfig: {
                operation: "read",
                fileSource: "url",
                filePath: "file:///etc/passwd"
            }
        });

        await expect(handler.execute(input)).rejects.toThrow(/scheme/i);
    });

    it("handles URL redirect chains", async () => {
        nock("https://example.com")
            .get("/file")
            .reply(302, "", { Location: "https://cdn.example.com/file.pdf" });

        nock("https://cdn.example.com").get("/file.pdf").reply(200, "content");

        const input = createHandlerInput({
            nodeType: "file",
            nodeConfig: {
                operation: "read",
                fileSource: "url",
                filePath: "https://example.com/file"
            }
        });

        const output = await handler.execute(input);
        expect(output.result.content).toBe("content");
    });
});
```

#### 3. Timeout and Resource Limits

```typescript
describe("resource limits", () => {
    it("times out on slow URL downloads", async () => {
        nock("https://slow.example.com")
            .get("/large-file")
            .delay(35000) // Exceeds 30s timeout
            .reply(200, "content");

        const input = createHandlerInput({
            nodeType: "file",
            nodeConfig: {
                operation: "read",
                fileSource: "url",
                filePath: "https://slow.example.com/large-file"
            }
        });

        await expect(handler.execute(input)).rejects.toThrow(/timeout/i);
    });

    it("rejects files exceeding size limit", async () => {
        const largeContent = "x".repeat(100 * 1024 * 1024); // 100MB

        const input = createHandlerInput({
            nodeType: "file",
            nodeConfig: {
                operation: "write",
                outputPath: "/tmp/large-file.txt",
                content: largeContent
            }
        });

        await expect(handler.execute(input)).rejects.toThrow(/size limit/i);
    });
});
```

#### 4. PDF Parsing Edge Cases

```typescript
describe("PDF parsing edge cases", () => {
    it("handles encrypted PDFs", async () => {
        // Mock encrypted PDF buffer
        const input = createHandlerInput({
            nodeType: "file",
            nodeConfig: {
                operation: "parsePDF",
                fileSource: "path",
                filePath: "/tmp/encrypted.pdf"
            }
        });

        await expect(handler.execute(input)).rejects.toThrow(/encrypted|password/i);
    });

    it("handles corrupted PDF files", async () => {
        const input = createHandlerInput({
            nodeType: "file",
            nodeConfig: {
                operation: "parsePDF",
                fileData: Buffer.from("not a pdf").toString("base64")
            }
        });

        await expect(handler.execute(input)).rejects.toThrow(/invalid|corrupt/i);
    });

    it("handles PDFs with no text (image-only)", async () => {
        // PDF with only images returns empty text
        const input = createHandlerInput({
            nodeType: "file",
            nodeConfig: {
                operation: "parsePDF",
                fileSource: "path",
                filePath: "/tmp/image-only.pdf"
            }
        });

        const output = await handler.execute(input);
        expect(output.result.content).toBe("");
        expect(output.result.metadata?.pages).toBeGreaterThan(0);
    });
});
```

#### 5. CSV Parsing Edge Cases

```typescript
describe("CSV parsing edge cases", () => {
    it("handles CSV with quoted fields containing commas", async () => {
        const csvContent = 'name,description\n"Smith, John","A, B, C"';

        mockReadFile.mockResolvedValue(csvContent);

        const input = createHandlerInput({
            nodeType: "file",
            nodeConfig: {
                operation: "parseCSV",
                fileSource: "path",
                filePath: "/tmp/quoted.csv"
            }
        });

        const output = await handler.execute(input);
        const parsed = JSON.parse(output.result.content);
        expect(parsed[0].name).toBe("Smith, John");
    });

    it("handles CSV with different delimiters", async () => {
        const csvContent = "name;age\nAlice;30";
        // Should handle or detect semicolon delimiter
    });

    it("handles CSV with BOM marker", async () => {
        const csvContent = "\uFEFFname,age\nAlice,30";
        // Should strip BOM and parse correctly
    });
});
```

#### 6. Concurrent File Operations

```typescript
describe("concurrent operations", () => {
    it("handles multiple concurrent reads", async () => {
        const inputs = Array.from({ length: 5 }, (_, i) =>
            createHandlerInput({
                nodeType: "file",
                nodeConfig: {
                    operation: "read",
                    fileSource: "path",
                    filePath: `/tmp/file-${i}.txt`
                }
            })
        );

        const outputs = await Promise.all(inputs.map((input) => handler.execute(input)));

        expect(outputs).toHaveLength(5);
        outputs.forEach((output) => {
            expect(output.result.content).toBeDefined();
        });
    });

    it("handles concurrent write to same file (last write wins)", async () => {
        const inputs = [
            createHandlerInput({
                nodeType: "file",
                nodeConfig: {
                    operation: "write",
                    outputPath: "/tmp/concurrent.txt",
                    content: "first"
                }
            }),
            createHandlerInput({
                nodeType: "file",
                nodeConfig: {
                    operation: "write",
                    outputPath: "/tmp/concurrent.txt",
                    content: "second"
                }
            })
        ];

        await Promise.all(inputs.map((input) => handler.execute(input)));

        // Verify last write state
    });
});
```

### Test Count: Add ~25 tests

---

## Priority 2: Audio Input Handler

**File:** `handlers/inputs/audio-input.ts`
**Current Tests:** 18 (in `audio-input.test.ts`)

### Existing Coverage

- ✅ Handler properties (4 tests)
- ✅ OpenAI Whisper provider (3 tests)
- ✅ Deepgram provider (4 tests)
- ✅ Audio source handling (4 tests)
- ✅ Validation errors (2 tests)
- ✅ Output variable (1 test)

### Missing Test Scenarios

#### 1. Concurrent Transcription

```typescript
describe("concurrent transcription", () => {
    it("handles multiple simultaneous transcriptions", async () => {
        mockOpenAICreate
            .mockResolvedValueOnce({ text: "First audio", language: "en", duration: 1.0 })
            .mockResolvedValueOnce({ text: "Second audio", language: "en", duration: 2.0 })
            .mockResolvedValueOnce({ text: "Third audio", language: "en", duration: 1.5 });

        const inputs = [
            createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio1",
                    outputVariable: "result1"
                },
                context: createTestContext({
                    inputs: {
                        audio1: { fileName: "a1.mp3", mimeType: "audio/mpeg", gcsUri: "gs://b/a1" }
                    }
                })
            }),
            createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio2",
                    outputVariable: "result2"
                },
                context: createTestContext({
                    inputs: {
                        audio2: { fileName: "a2.mp3", mimeType: "audio/mpeg", gcsUri: "gs://b/a2" }
                    }
                })
            }),
            createHandlerInput({
                nodeType: "audioInput",
                nodeConfig: {
                    provider: "openai",
                    model: "whisper-1",
                    inputName: "audio3",
                    outputVariable: "result3"
                },
                context: createTestContext({
                    inputs: {
                        audio3: { fileName: "a3.mp3", mimeType: "audio/mpeg", gcsUri: "gs://b/a3" }
                    }
                })
            })
        ];

        const outputs = await Promise.all(inputs.map((input) => handler.execute(input)));

        expect(outputs).toHaveLength(3);
        expect(outputs[0].result.result1.text).toBe("First audio");
        expect(outputs[1].result.result2.text).toBe("Second audio");
        expect(outputs[2].result.result3.text).toBe("Third audio");
    });
});
```

#### 2. Provider Timeout Handling

```typescript
describe("timeout handling", () => {
    it("times out on slow OpenAI transcription", async () => {
        mockOpenAICreate.mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 120000)) // Never resolves in time
        );

        const input = createHandlerInput({
            nodeType: "audioInput",
            nodeConfig: {
                provider: "openai",
                model: "whisper-1",
                inputName: "audio",
                outputVariable: "result"
            },
            context: createTestContext({
                inputs: {
                    audio: { fileName: "slow.mp3", mimeType: "audio/mpeg", gcsUri: "gs://b/slow" }
                }
            })
        });

        await expect(handler.execute(input)).rejects.toThrow(/timeout/i);
    }, 10000);

    it("times out on slow Deepgram API", async () => {
        nock("https://api.deepgram.com")
            .post("/v1/listen")
            .query(true)
            .delay(60000)
            .reply(200, { results: { channels: [{ alternatives: [{ transcript: "late" }] }] } });

        const input = createHandlerInput({
            nodeType: "audioInput",
            nodeConfig: {
                provider: "deepgram",
                model: "nova-2",
                inputName: "audio",
                outputVariable: "result"
            },
            context: createTestContext({
                inputs: {
                    audio: { fileName: "slow.mp3", mimeType: "audio/mpeg", gcsUri: "gs://b/slow" }
                }
            })
        });

        await expect(handler.execute(input)).rejects.toThrow(/timeout/i);
    });
});
```

#### 3. Large Audio File Handling

```typescript
describe("large file handling", () => {
    it("handles audio files near size limit", async () => {
        // 24MB audio file (under typical 25MB limit)
        const largeBase64 = Buffer.alloc(24 * 1024 * 1024).toString("base64");

        mockOpenAICreate.mockResolvedValue({
            text: "Large file transcription",
            language: "en",
            duration: 3600.0 // 1 hour
        });

        const input = createHandlerInput({
            nodeType: "audioInput",
            nodeConfig: {
                provider: "openai",
                model: "whisper-1",
                inputName: "audio",
                outputVariable: "result"
            },
            context: createTestContext({
                inputs: {
                    audio: { fileName: "large.mp3", mimeType: "audio/mpeg", base64: largeBase64 }
                }
            })
        });

        const output = await handler.execute(input);
        expect(output.result.result.duration).toBe(3600.0);
    });

    it("rejects audio files exceeding size limit", async () => {
        const input = createHandlerInput({
            nodeType: "audioInput",
            nodeConfig: {
                provider: "openai",
                model: "whisper-1",
                inputName: "audio",
                outputVariable: "result"
            },
            context: createTestContext({
                inputs: {
                    audio: {
                        fileName: "huge.mp3",
                        mimeType: "audio/mpeg",
                        gcsUri: "gs://b/huge",
                        size: 100 * 1024 * 1024 // 100MB - over limit
                    }
                }
            })
        });

        await expect(handler.execute(input)).rejects.toThrow(/size|limit/i);
    });
});
```

#### 4. Audio Format Edge Cases

```typescript
describe("audio format handling", () => {
    it("handles unsupported audio format gracefully", async () => {
        const input = createHandlerInput({
            nodeType: "audioInput",
            nodeConfig: {
                provider: "openai",
                model: "whisper-1",
                inputName: "audio",
                outputVariable: "result"
            },
            context: createTestContext({
                inputs: {
                    audio: {
                        fileName: "audio.flac",
                        mimeType: "audio/flac",
                        gcsUri: "gs://b/audio.flac"
                    }
                }
            })
        });

        // Should either succeed (if format supported) or provide clear error
        // OpenAI Whisper supports: mp3, mp4, mpeg, mpga, m4a, wav, webm
    });

    it("handles corrupted audio file", async () => {
        mockOpenAICreate.mockRejectedValue(new Error("Invalid audio file"));

        const input = createHandlerInput({
            nodeType: "audioInput",
            nodeConfig: {
                provider: "openai",
                model: "whisper-1",
                inputName: "audio",
                outputVariable: "result"
            },
            context: createTestContext({
                inputs: {
                    audio: {
                        fileName: "corrupt.mp3",
                        mimeType: "audio/mpeg",
                        base64: Buffer.from("not audio data").toString("base64")
                    }
                }
            })
        });

        await expect(handler.execute(input)).rejects.toThrow(/invalid/i);
    });
});
```

#### 5. Provider Rate Limiting

```typescript
describe("rate limiting", () => {
    it("handles OpenAI rate limit response", async () => {
        mockOpenAICreate.mockRejectedValue({
            status: 429,
            error: { message: "Rate limit exceeded" }
        });

        const input = createHandlerInput({
            nodeType: "audioInput",
            nodeConfig: {
                provider: "openai",
                model: "whisper-1",
                inputName: "audio",
                outputVariable: "result"
            },
            context: createTestContext({
                inputs: { audio: { fileName: "a.mp3", mimeType: "audio/mpeg", gcsUri: "gs://b/a" } }
            })
        });

        await expect(handler.execute(input)).rejects.toThrow(/rate limit/i);
    });

    it("handles Deepgram rate limit response", async () => {
        nock("https://api.deepgram.com")
            .post("/v1/listen")
            .query(true)
            .reply(429, { error: "Rate limit exceeded" });

        const input = createHandlerInput({
            nodeType: "audioInput",
            nodeConfig: {
                provider: "deepgram",
                model: "nova-2",
                inputName: "audio",
                outputVariable: "result"
            },
            context: createTestContext({
                inputs: { audio: { fileName: "a.mp3", mimeType: "audio/mpeg", gcsUri: "gs://b/a" } }
            })
        });

        await expect(handler.execute(input)).rejects.toThrow(/rate limit/i);
    });
});
```

### Test Count: Add ~12 tests

---

## Priority 3: Shared Memory Handler

**File:** `handlers/logic/shared-memory.ts`
**Current Tests:** 20 (in `shared-memory.test.ts`)

### Existing Coverage

- ✅ Handler properties (4 tests)
- ✅ Store operation (7 tests)
- ✅ Search operation (3 tests - limited by embedding mock)
- ✅ Metrics (2 tests)
- ✅ Edge cases (4 tests)

### Missing Test Scenarios

#### 1. Concurrent Store Operations

```typescript
describe("concurrent store operations", () => {
    it("handles multiple concurrent stores to different keys", async () => {
        const inputs = Array.from({ length: 10 }, (_, i) =>
            createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: {
                    operation: "store",
                    key: `key_${i}`,
                    value: `value_${i}`,
                    enableSemanticSearch: false
                }
            })
        );

        const outputs = await Promise.all(inputs.map((input) => handler.execute(input)));

        expect(outputs).toHaveLength(10);
        outputs.forEach((output, i) => {
            expect(output.result.stored).toBe(true);
            expect(output.result.key).toBe(`key_${i}`);
        });
    });

    it("handles concurrent stores to same key (last write wins)", async () => {
        const inputs = [
            createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: { operation: "store", key: "race", value: "first" }
            }),
            createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: { operation: "store", key: "race", value: "second" }
            }),
            createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: { operation: "store", key: "race", value: "third" }
            })
        ];

        await Promise.all(inputs.map((input) => handler.execute(input)));

        // Verify behavior is deterministic or documented
    });
});
```

#### 2. Search with Results

```typescript
describe("search with results", () => {
    it("returns matching entries sorted by relevance", async () => {
        const handlerWithEmbeddings = createSharedMemoryNodeHandler();

        // Mock embedding generator to return different vectors
        let callCount = 0;
        handlerWithEmbeddings.setEmbeddingGenerator(async (text: string) => {
            callCount++;
            if (text === "cat story") return [0.9, 0.1, 0.1];
            if (text === "dog story") return [0.1, 0.9, 0.1];
            return [0.5, 0.5, 0.5]; // Query vector
        });

        // Pre-populate context with stored entries
        const context = createTestContext({
            sharedMemory: {
                story1: "A cat sat on the mat",
                story2: "A dog ran in the park"
            },
            sharedMemoryEmbeddings: {
                story1: [0.9, 0.1, 0.1],
                story2: [0.1, 0.9, 0.1]
            }
        });

        const input = createHandlerInput({
            nodeType: "shared-memory",
            nodeConfig: {
                operation: "search",
                searchQuery: "feline animal"
            },
            context
        });

        const output = await handlerWithEmbeddings.execute(input);

        expect(output.result.results).toBeDefined();
        expect(output.result.resultCount).toBeGreaterThan(0);
    });

    it("returns empty results when no matches found", async () => {
        const handlerWithEmbeddings = createSharedMemoryNodeHandler();
        handlerWithEmbeddings.setEmbeddingGenerator(async () => [0.1, 0.2, 0.3]);

        const context = createTestContext({
            sharedMemory: {} // No entries
        });

        const input = createHandlerInput({
            nodeType: "shared-memory",
            nodeConfig: {
                operation: "search",
                searchQuery: "anything"
            },
            context
        });

        const output = await handlerWithEmbeddings.execute(input);

        expect(output.result.results).toEqual([]);
        expect(output.result.resultCount).toBe(0);
    });

    it("respects topK limit in search results", async () => {
        const handlerWithEmbeddings = createSharedMemoryNodeHandler();
        handlerWithEmbeddings.setEmbeddingGenerator(async () => [0.5, 0.5, 0.5]);

        const sharedMemory: Record<string, string> = {};
        for (let i = 0; i < 20; i++) {
            sharedMemory[`entry_${i}`] = `Content ${i}`;
        }

        const context = createTestContext({ sharedMemory });

        const input = createHandlerInput({
            nodeType: "shared-memory",
            nodeConfig: {
                operation: "search",
                searchQuery: "content",
                topK: 5
            },
            context
        });

        const output = await handlerWithEmbeddings.execute(input);

        expect(output.result.results.length).toBeLessThanOrEqual(5);
    });
});
```

#### 3. Memory Limits

```typescript
describe("memory limits", () => {
    it("handles very large values", async () => {
        const largeValue = "x".repeat(1024 * 1024); // 1MB string

        const input = createHandlerInput({
            nodeType: "shared-memory",
            nodeConfig: {
                operation: "store",
                key: "largeKey",
                value: largeValue,
                enableSemanticSearch: false
            }
        });

        const output = await handler.execute(input);

        expect(output.result.stored).toBe(true);
    });

    it("enforces maximum key length", async () => {
        const longKey = "k".repeat(1000);

        const input = createHandlerInput({
            nodeType: "shared-memory",
            nodeConfig: {
                operation: "store",
                key: longKey,
                value: "test"
            }
        });

        // Should either succeed or throw with clear error
        // Document the behavior
    });

    it("handles many stored entries", async () => {
        const context = createTestContext({
            sharedMemory: Object.fromEntries(
                Array.from({ length: 1000 }, (_, i) => [`key_${i}`, `value_${i}`])
            )
        });

        const input = createHandlerInput({
            nodeType: "shared-memory",
            nodeConfig: {
                operation: "store",
                key: "newKey",
                value: "newValue"
            },
            context
        });

        const output = await handler.execute(input);
        expect(output.result.stored).toBe(true);
    });
});
```

#### 4. Embedding Generator Errors

```typescript
describe("embedding generator errors", () => {
    it("handles embedding generation failure gracefully", async () => {
        const handlerWithEmbeddings = createSharedMemoryNodeHandler();
        handlerWithEmbeddings.setEmbeddingGenerator(async () => {
            throw new Error("Embedding service unavailable");
        });

        const input = createHandlerInput({
            nodeType: "shared-memory",
            nodeConfig: {
                operation: "store",
                key: "testKey",
                value: "test value",
                enableSemanticSearch: true
            }
        });

        await expect(handler.execute(input)).rejects.toThrow(/embedding/i);
    });

    it("handles embedding generation timeout", async () => {
        const handlerWithEmbeddings = createSharedMemoryNodeHandler();
        handlerWithEmbeddings.setEmbeddingGenerator(async () => {
            await new Promise((resolve) => setTimeout(resolve, 60000));
            return [0.1, 0.2, 0.3];
        });

        const input = createHandlerInput({
            nodeType: "shared-memory",
            nodeConfig: {
                operation: "search",
                searchQuery: "test"
            }
        });

        // Should timeout, not hang
    });
});
```

### Test Count: Add ~10 tests

---

## Priority 4: Input Handler

**File:** `handlers/inputs/input.ts`
**Current Tests:** 22 (in `input.test.ts`)

### Existing Coverage

- ✅ Handler properties (4 tests)
- ✅ Text input (4 tests)
- ✅ JSON input (7 tests)
- ✅ Output metadata (2 tests)
- ✅ Metrics (1 test)
- ✅ Schema validation (2 tests)
- ✅ Edge cases (2 tests)

### Missing Test Scenarios

#### 1. Concurrent Input Processing

```typescript
describe("concurrent input processing", () => {
    it("handles multiple simultaneous inputs", async () => {
        const inputs = Array.from({ length: 5 }, (_, i) =>
            createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "text",
                    value: `Input ${i}`
                }
            })
        );

        const outputs = await Promise.all(inputs.map((input) => handler.execute(input)));

        expect(outputs).toHaveLength(5);
        outputs.forEach((output, i) => {
            expect(output.result.input).toBe(`Input ${i}`);
        });
    });
});
```

#### 2. Additional Input Types

```typescript
describe("additional input types", () => {
    it("handles number input type", async () => {
        const input = createHandlerInput({
            nodeType: "input",
            nodeConfig: {
                inputType: "number",
                value: "42.5"
            }
        });

        const output = await handler.execute(input);
        expect(output.result.input).toBe(42.5);
    });

    it("handles boolean input type", async () => {
        const input = createHandlerInput({
            nodeType: "input",
            nodeConfig: {
                inputType: "boolean",
                value: "true"
            }
        });

        const output = await handler.execute(input);
        expect(output.result.input).toBe(true);
    });

    it("handles date input type", async () => {
        const input = createHandlerInput({
            nodeType: "input",
            nodeConfig: {
                inputType: "date",
                value: "2024-01-15"
            }
        });

        const output = await handler.execute(input);
        expect(output.result.input).toMatch(/2024-01-15/);
    });
});
```

#### 3. Validation Depth

```typescript
describe("validation depth", () => {
    it("validates JSON against provided schema", async () => {
        const input = createHandlerInput({
            nodeType: "input",
            nodeConfig: {
                inputType: "json",
                value: '{"name": "test"}',
                schema: {
                    type: "object",
                    required: ["name", "email"],
                    properties: {
                        name: { type: "string" },
                        email: { type: "string", format: "email" }
                    }
                }
            }
        });

        // Should fail validation - missing email
        await expect(handler.execute(input)).rejects.toThrow(/email/i);
    });

    it("validates nested JSON structure", async () => {
        const input = createHandlerInput({
            nodeType: "input",
            nodeConfig: {
                inputType: "json",
                value: '{"user": {"profile": "invalid"}}',
                schema: {
                    type: "object",
                    properties: {
                        user: {
                            type: "object",
                            properties: {
                                profile: {
                                    type: "object" // Should be object, not string
                                }
                            }
                        }
                    }
                }
            }
        });

        await expect(handler.execute(input)).rejects.toThrow(/type/i);
    });

    it("handles circular reference in JSON", async () => {
        // Circular references cannot be represented in JSON string
        // but test handler behavior with deeply nested structures
        const deeplyNested = JSON.stringify({
            level1: {
                level2: {
                    level3: {
                        level4: {
                            level5: "deep value"
                        }
                    }
                }
            }
        });

        const input = createHandlerInput({
            nodeType: "input",
            nodeConfig: {
                inputType: "json",
                value: deeplyNested
            }
        });

        const output = await handler.execute(input);
        expect(output.result.input.level1.level2.level3.level4.level5).toBe("deep value");
    });
});
```

#### 4. Security Considerations

```typescript
describe("security", () => {
    it("sanitizes HTML in text input when configured", async () => {
        const input = createHandlerInput({
            nodeType: "input",
            nodeConfig: {
                inputType: "text",
                value: '<script>alert("xss")</script>Hello',
                sanitize: true
            }
        });

        const output = await handler.execute(input);
        expect(output.result.input).not.toContain("<script>");
    });

    it("handles prototype pollution attempts in JSON", async () => {
        const input = createHandlerInput({
            nodeType: "input",
            nodeConfig: {
                inputType: "json",
                value: '{"__proto__": {"polluted": true}}'
            }
        });

        const output = await handler.execute(input);

        // Ensure prototype is not polluted
        expect(({} as Record<string, boolean>).polluted).toBeUndefined();
    });
});
```

### Test Count: Add ~8 tests

---

## Priority 5: Cross-Handler Gaps

These gaps apply across multiple handlers and should be addressed systematically.

### 1. Timeout Tests (All Async Handlers)

Handlers that need timeout tests:

- `web-browse.ts`
- `web-search.ts`
- `file-download.ts`
- `screenshot-capture.ts`
- `pdf-generation.ts`

```typescript
// Template for timeout tests
describe("timeout handling", () => {
    it("times out after configured duration", async () => {
        // Mock slow response
        nock("https://example.com").get("/slow").delay(60000).reply(200, "late response");

        const input = createHandlerInput({
            nodeType: "handler-type",
            nodeConfig: {
                url: "https://example.com/slow",
                timeout: 5000
            }
        });

        await expect(handler.execute(input)).rejects.toThrow(/timeout/i);
    });

    it("cleans up resources on timeout", async () => {
        // Verify browser closed, connections dropped, temp files deleted
    });
});
```

### 2. Concurrent Execution Tests (Stateless Handlers)

Handlers that should have concurrency tests:

- `transform.ts` - Already has good coverage
- `code.ts` - Needs concurrent process execution tests
- `conditional.ts` - Already has concurrent branching tests
- `switch.ts` - Needs concurrent routing tests

```typescript
// Template for concurrent tests
describe("concurrent execution", () => {
    it("handles N parallel executions", async () => {
        const inputs = Array.from({ length: 10 }, (_, i) =>
            createHandlerInput({
                nodeType: "handler-type",
                nodeConfig: {
                    /* ... */
                }
            })
        );

        const outputs = await Promise.all(inputs.map((i) => handler.execute(i)));

        expect(outputs).toHaveLength(10);
        // Verify all outputs are correct
    });
});
```

### 3. Resource Cleanup Tests

Handlers with resource concerns:

- `code.ts` - Process cleanup, temp file cleanup
- `screenshot-capture.ts` - Browser instance cleanup
- `file-write.ts` - Temp file cleanup on error
- `pdf-generation.ts` - Temp file cleanup

```typescript
// Template for cleanup tests
describe("resource cleanup", () => {
    it("cleans up temp files on success", async () => {
        const input = createHandlerInput({
            /* ... */
        });
        await handler.execute(input);

        // Verify temp directory is clean
        const tempFiles = await fs.readdir("/tmp/handler-temp");
        expect(tempFiles).toHaveLength(0);
    });

    it("cleans up temp files on error", async () => {
        const input = createHandlerInput({
            /* ... */
        });

        await expect(handler.execute(input)).rejects.toThrow();

        // Still verify cleanup happened
        const tempFiles = await fs.readdir("/tmp/handler-temp");
        expect(tempFiles).toHaveLength(0);
    });
});
```

### 4. Integration Tests (New Test File)

Create `__tests__/integration/handler-chain.test.ts`:

```typescript
/**
 * Handler Chain Integration Tests
 *
 * Tests that verify handlers work correctly when chained together
 * in a workflow context.
 */

describe("handler chaining", () => {
    describe("LLM → Transform → Output chain", () => {
        it("passes LLM output through transform to output", async () => {
            // 1. Execute LLM handler
            const llmOutput = await llmHandler.execute(
                createHandlerInput({
                    nodeType: "llm",
                    nodeConfig: { provider: "openai", model: "gpt-4", prompt: "List 3 colors" }
                })
            );

            // 2. Execute Transform with LLM output in context
            const transformOutput = await transformHandler.execute(
                createHandlerInput({
                    nodeType: "transform",
                    nodeConfig: {
                        operation: "split",
                        input: "{{llm.text}}",
                        delimiter: ","
                    },
                    context: createTestContext({
                        nodeOutputs: { llm: llmOutput.result }
                    })
                })
            );

            // 3. Execute Output with Transform result
            const outputResult = await outputHandler.execute(
                createHandlerInput({
                    nodeType: "output",
                    nodeConfig: {
                        template: "Colors: {{transform.items}}"
                    },
                    context: createTestContext({
                        nodeOutputs: {
                            llm: llmOutput.result,
                            transform: transformOutput.result
                        }
                    })
                })
            );

            expect(outputResult.result).toBeDefined();
        });
    });

    describe("error propagation", () => {
        it("propagates errors through handler chain", async () => {
            // First handler succeeds
            const firstOutput = await inputHandler.execute(/* ... */);

            // Second handler fails
            const secondContext = createTestContext({
                nodeOutputs: { input: firstOutput.result }
            });

            // Verify error context includes chain information
        });
    });

    describe("context preservation", () => {
        it("preserves all node outputs through chain", async () => {
            // Execute 5 handlers in sequence
            // Verify final context has all 5 outputs
        });
    });
});
```

---

## Test Pattern Reference

### Standard Test Structure

Every handler test file should follow this structure:

```typescript
describe("HandlerName", () => {
    let handler: HandlerType;

    beforeEach(() => {
        handler = createHandler();
        jest.clearAllMocks();
        // Additional setup
    });

    afterEach(() => {
        // Cleanup
    });

    // 1. Handler metadata
    describe("handler properties", () => {
        it("has correct name", () => {});
        it("supports expected node types", () => {});
        it("can handle supported types", () => {});
        it("cannot handle other types", () => {});
    });

    // 2. Config validation
    describe("config validation", () => {
        it("throws on missing required fields", () => {});
        it("throws on invalid field values", () => {});
        it("accepts valid configuration", () => {});
    });

    // 3. Core functionality (varies by handler)
    describe("main operation", () => {
        it("executes successfully with valid input", () => {});
        it("returns expected output structure", () => {});
        it("handles variable interpolation", () => {});
    });

    // 4. Provider-specific (for multi-provider handlers)
    describe("Provider X", () => {
        it("calls Provider X API correctly", () => {});
        it("handles Provider X responses", () => {});
        it("handles Provider X errors", () => {});
    });

    // 5. Output handling
    describe("output handling", () => {
        it("wraps result in outputVariable when specified", () => {});
        it("returns direct result when no outputVariable", () => {});
    });

    // 6. Error handling
    describe("error handling", () => {
        it("handles API errors gracefully", () => {});
        it("handles network errors", () => {});
        it("handles validation errors", () => {});
        it("provides meaningful error messages", () => {});
    });

    // 7. Metrics
    describe("metrics", () => {
        it("records execution duration", () => {});
        it("includes relevant metrics", () => {});
    });

    // 8. Edge cases
    describe("edge cases", () => {
        it("handles empty input", () => {});
        it("handles very large input", () => {});
        it("handles special characters", () => {});
        it("handles null/undefined values", () => {});
    });

    // 9. Concurrency (where applicable)
    describe("concurrent execution", () => {
        it("handles multiple parallel executions", () => {});
    });

    // 10. Timeouts (where applicable)
    describe("timeout handling", () => {
        it("times out on slow operations", () => {});
        it("cleans up on timeout", () => {});
    });
});
```

### Common Test Utilities

From `handler-test-utils.ts`:

```typescript
// Create handler input
const input = createHandlerInput({
    nodeType: "llm",
    nodeConfig: { provider: "openai", model: "gpt-4", prompt: "Hello" },
    context: createTestContext({
        /* ... */
    })
});

// Create test context with various state
const context = createTestContext({
    inputs: { userInput: "value" },
    nodeOutputs: { previousNode: { result: "data" } },
    variables: { counter: 5 },
    sharedMemory: { stored: "value" }
});

// Variable reference helper
const prompt = `Process this: ${mustacheRef("data", "content")}`;
// Produces: "Process this: {{data.content}}"

// Common configurations
const config = CommonConfigs.llm.openai("gpt-4", "Hello");
const config = CommonConfigs.sharedMemory.store("key", "value");

// Assertions
assertValidOutput(output); // Verifies output structure
assertBranchSelection(output, "trueBranch"); // For conditional handlers
```

---

## Implementation Checklist

### Phase 1: Critical ✅ COMPLETED

- [x] **File Operations Handler** (57 tests total, +21 new tests)
    - [x] Add URL timeout/error tests (3 tests)
    - [x] Add PDF edge case tests (5 tests)
    - [x] Add CSV edge case tests (5 tests)
    - [x] Add concurrent operation tests (3 tests)
    - [x] Add edge case tests (5 tests)

- [x] **Audio Input Handler** (33 tests total, +15 new tests)
    - [x] Add concurrent transcription tests (2 tests)
    - [x] Add large file tests (2 tests)
    - [x] Add format edge case tests (3 tests)
    - [x] Add rate limiting tests (2 tests)
    - [x] Add provider error handling tests (3 tests)
    - [x] Add edge case tests (3 tests)

### Phase 2: Important ✅ COMPLETED

- [x] **Shared Memory Handler** (32 tests total, +12 new tests)
    - [x] Add concurrent store tests (2 tests)
    - [x] Add search edge case tests (3 tests)
    - [x] Add memory/large value tests (3 tests)
    - [x] Add embedding edge case tests (2 tests)
    - [x] Add config validation tests (2 tests)

- [x] **Input Handler** (40 tests total, +18 new tests)
    - [x] Add concurrent processing tests (3 tests)
    - [x] Add additional JSON edge case tests (6 tests)
    - [x] Add text input edge case tests (4 tests)
    - [x] Add validation/error handling tests (3 tests)
    - [x] Add output structure tests (2 tests)

### Phase 3: Enhancement ✅ COMPLETED

- [x] **Cross-Handler Timeout Tests** (+8 tests)
    - [x] web-browse.ts (2 tests: slow response handling, connection timeout)
    - [x] web-search.ts (2 tests: API timeout, slow search handling)
    - [x] file-download.ts (2 tests: download timeout, slow download handling)
    - [x] screenshot-capture.ts (2 tests: navigation timeout, slow page render)

- [x] **Cross-Handler Concurrency Tests** (+9 tests)
    - [x] web-browse.ts (2 tests: simultaneous requests, error isolation)
    - [x] web-search.ts (2 tests: simultaneous searches, rate limit isolation)
    - [x] file-download.ts (2 tests: simultaneous downloads, error isolation)
    - [x] screenshot-capture.ts (2 tests: simultaneous captures, error isolation)
    - [x] code.ts (2 tests: simultaneous JS executions, error isolation)
    - [x] switch.ts (3 tests: simultaneous evaluations, different configs, state isolation)
    - [x] pdf-generation.ts (2 tests: simultaneous generations, error isolation)

- [x] **Resource Cleanup Tests** (+6 tests)
    - [x] code.ts (2 tests: Python temp file cleanup on success/failure)
    - [x] screenshot-capture.ts (2 tests: cleanup on success/failure)
    - [x] pdf-generation.ts (2 tests: cleanup on success/failure)

### Phase 4: Integration (Future)

- [ ] **Integration Tests**
    - [ ] Create handler-chain.test.ts
    - [ ] Add LLM → Transform → Output chain test
    - [ ] Add error propagation test
    - [ ] Add context preservation test

### Verification

After each phase:

1. Run `npm test -- --testPathPattern="handlers"` to verify all tests pass
2. Run `npx tsc --noEmit` to verify no type errors
3. Review test coverage metrics

---

## Notes

- Test file locations: `backend/src/temporal/activities/execution/handlers/__tests__/`
- Test utilities: `backend/__tests__/helpers/handler-test-utils.ts`
- HTTP mocks: `backend/__tests__/helpers/http-mock.ts`
- Reference implementation: `llm.test.ts` (45 tests, comprehensive coverage)
