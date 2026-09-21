/**
 * Line and event readers for streaming HTTP bodies.
 *
 * Provider streams arrive in arbitrary network chunks, so a line (and with it a
 * `data:` payload) can be split across two reads. Both readers keep the unfinished
 * tail of a chunk and complete it with the next one. Splitting each chunk on "\n"
 * on its own silently drops every delta that straddles a boundary, which shows up
 * as missing words in the stored response.
 */

function stripCarriageReturn(line: string): string {
    return line.endsWith("\r") ? line.slice(0, -1) : line;
}

/**
 * Yield the body line by line, without the line terminator. A trailing line with
 * no terminator is yielded when the stream ends.
 */
export async function* readLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
        let done = false;
        while (!done) {
            const result = await reader.read();
            done = result.done;
            buffer += done ? decoder.decode() : decoder.decode(result.value, { stream: true });

            let newline = buffer.indexOf("\n");
            while (newline !== -1) {
                yield stripCarriageReturn(buffer.slice(0, newline));
                buffer = buffer.slice(newline + 1);
                newline = buffer.indexOf("\n");
            }
        }

        if (buffer.length > 0) {
            yield stripCarriageReturn(buffer);
        }
    } finally {
        reader.releaseLock();
    }
}

/**
 * Yield the `data` payload of each event in a text/event-stream body. Events are
 * delimited by a blank line, multiple `data:` lines in one event are joined with
 * "\n", comments and the other fields (`event`, `id`, `retry`) are skipped; the
 * providers we call put the event type inside the JSON payload.
 */
export async function* readSSEData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
    let dataLines: string[] = [];

    for await (const line of readLines(body)) {
        if (line === "") {
            if (dataLines.length > 0) {
                yield dataLines.join("\n");
                dataLines = [];
            }
            continue;
        }

        if (line.startsWith(":")) {
            continue;
        }

        const colon = line.indexOf(":");
        const field = colon === -1 ? line : line.slice(0, colon);
        if (field !== "data") {
            continue;
        }

        let value = colon === -1 ? "" : line.slice(colon + 1);
        if (value.startsWith(" ")) {
            value = value.slice(1);
        }
        dataLines.push(value);
    }

    if (dataLines.length > 0) {
        yield dataLines.join("\n");
    }
}
