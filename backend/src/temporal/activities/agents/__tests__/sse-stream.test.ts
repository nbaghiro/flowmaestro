import { readLines, readSSEData } from "../sse-stream";

function bodyFromChunks(chunks: Array<string | Uint8Array>): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    return new ReadableStream<Uint8Array>({
        start(controller) {
            for (const chunk of chunks) {
                controller.enqueue(typeof chunk === "string" ? encoder.encode(chunk) : chunk);
            }
            controller.close();
        }
    });
}

async function collect(iterable: AsyncIterable<string>): Promise<string[]> {
    const out: string[] = [];
    for await (const item of iterable) {
        out.push(item);
    }
    return out;
}

describe("readLines", () => {
    it("joins a line split across two chunks", async () => {
        const lines = await collect(readLines(bodyFromChunks(["hel", "lo\nwor", "ld\n"])));
        expect(lines).toEqual(["hello", "world"]);
    });

    it("yields a trailing line without a terminator", async () => {
        const lines = await collect(readLines(bodyFromChunks(["a\nb"])));
        expect(lines).toEqual(["a", "b"]);
    });

    it("strips carriage returns", async () => {
        const lines = await collect(readLines(bodyFromChunks(["a\r\nb\r", "\n"])));
        expect(lines).toEqual(["a", "b"]);
    });

    it("reassembles a multibyte character split across chunks", async () => {
        const bytes = new TextEncoder().encode("café\n");
        const lines = await collect(readLines(bodyFromChunks([bytes.slice(0, 4), bytes.slice(4)])));
        expect(lines).toEqual(["café"]);
    });
});

describe("readSSEData", () => {
    it("yields the data of each event", async () => {
        const body = bodyFromChunks(['data: {"a":1}\n\ndata: {"a":2}\n\n']);
        expect(await collect(readSSEData(body))).toEqual(['{"a":1}', '{"a":2}']);
    });

    it("does not lose a delta whose line straddles a chunk boundary", async () => {
        const body = bodyFromChunks([
            'data: {"delta":"Thank you for your"}\n\ndata: {"del',
            'ta":" interest!"}\n\ndata: {"delta":" As an AI"}\n\n'
        ]);
        expect(await collect(readSSEData(body))).toEqual([
            '{"delta":"Thank you for your"}',
            '{"delta":" interest!"}',
            '{"delta":" As an AI"}'
        ]);
    });

    it("skips comments and non-data fields and joins multi-line data", async () => {
        const body = bodyFromChunks([
            ": keepalive\n",
            "event: content_block_delta\n",
            "id: 7\n",
            "data: first\n",
            "data: second\n",
            "\n"
        ]);
        expect(await collect(readSSEData(body))).toEqual(["first\nsecond"]);
    });

    it("accepts CRLF line endings and data without a space after the colon", async () => {
        const body = bodyFromChunks(['data:{"x":1}\r\n\r\n']);
        expect(await collect(readSSEData(body))).toEqual(['{"x":1}']);
    });

    it("flushes a final event that has no trailing blank line", async () => {
        const body = bodyFromChunks(["data: [DONE]"]);
        expect(await collect(readSSEData(body))).toEqual(["[DONE]"]);
    });
});
