jest.mock("ioredis");

import {
    eventsKey,
    isUserMessageEvent,
    parseEntries,
    resolveResumePoint,
    turnKey,
    TERMINAL_EVENT_TYPES
} from "../ExecutionEventLog";

describe("ExecutionEventLog helpers", () => {
    it("derives the stream and turn keys from the execution id", () => {
        expect(eventsKey("exec-1")).toBe("agent:exec:exec-1:events");
        expect(turnKey("exec-1")).toBe("agent:exec:exec-1:turn");
    });

    describe("parseEntries", () => {
        it("maps raw stream entries to events", () => {
            const events = parseEntries([
                ["1-0", ["type", "token", "data", '{"token":"Hi","executionId":"e"}']],
                ["2-0", ["data", '{"executionId":"e"}', "type", "thinking"]]
            ]);
            expect(events).toEqual([
                { id: "1-0", type: "token", data: { token: "Hi", executionId: "e" } },
                { id: "2-0", type: "thinking", data: { executionId: "e" } }
            ]);
        });

        it("skips entries without a type and tolerates malformed data", () => {
            const events = parseEntries([
                ["1-0", ["data", "{}"]],
                ["2-0", ["type", "token", "data", "not json"]]
            ]);
            expect(events).toEqual([{ id: "2-0", type: "token", data: {} }]);
        });
    });

    describe("isUserMessageEvent", () => {
        it("recognises a user message and nothing else", () => {
            expect(isUserMessageEvent("message", { message: { role: "user" } })).toBe(true);
            expect(isUserMessageEvent("message", { message: { role: "assistant" } })).toBe(false);
            expect(isUserMessageEvent("token", { message: { role: "user" } })).toBe(false);
            expect(isUserMessageEvent("message", {})).toBe(false);
        });
    });

    describe("resolveResumePoint", () => {
        it("reports a missing stream", () => {
            expect(resolveResumePoint(undefined, null)).toEqual({ after: "0-0", exists: false });
        });

        it("replays from the beginning of a running first turn", () => {
            const latest = { id: "5-0", type: "token", data: {} };
            expect(resolveResumePoint(latest, null)).toEqual({ after: "0-0", exists: true });
        });

        it("starts after the latest user message on a follow-up turn", () => {
            const latest = { id: "9-0", type: "token", data: {} };
            expect(resolveResumePoint(latest, "7-0")).toEqual({ after: "7-0", exists: true });
        });

        it("returns the terminal event of a finished execution", () => {
            for (const type of TERMINAL_EVENT_TYPES) {
                const latest = { id: "9-0", type, data: { executionId: "e" } };
                expect(resolveResumePoint(latest, "7-0")).toEqual({
                    after: "9-0",
                    terminal: latest,
                    exists: true
                });
            }
        });
    });
});
