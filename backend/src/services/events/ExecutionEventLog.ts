/**
 * Per-execution event log backed by a Redis Stream.
 *
 * Pub/sub delivers an event only to the subscribers that exist when it is published,
 * so a browser that connects after the run has started, or reconnects after a dropped
 * connection, misses everything published in between. The worker therefore appends
 * every execution event to `agent:exec:{executionId}:events` as well, and the agent
 * SSE route replays from that stream and follows it, resuming from the browser's
 * Last-Event-ID after a reconnect.
 *
 * Entries carry the SSE event name and the JSON payload the route sends to the
 * client, so the route relays them without translation. A `turn` key holds the id of
 * the latest user message, which is where a fresh connection to a multi-turn
 * execution starts.
 */

import Redis from "ioredis";
import { config } from "../../core/config";
import { createServiceLogger } from "../../core/logging";

const logger = createServiceLogger("ExecutionEventLog");

/** Entries kept per execution (approximate, trimmed by Redis) and stream lifetime. */
const MAX_ENTRIES = 20000;
const TTL_SECONDS = 24 * 60 * 60;
const READ_BATCH = 500;

/** Event types after which the stream carries nothing further. */
export const TERMINAL_EVENT_TYPES: ReadonlySet<string> = new Set(["completed", "error"]);

export interface ExecutionEvent {
    /** Redis stream id, also used as the SSE event id. */
    id: string;
    /** SSE event name, for example "token" or "completed". */
    type: string;
    data: Record<string, unknown>;
}

export interface ResumePoint {
    /** Stream id to read after; "0-0" replays from the beginning. */
    after: string;
    /** Set when the execution already ended: the terminal event to send before closing. */
    terminal?: ExecutionEvent;
    /** False when the execution has no entries (not started yet, or the stream expired). */
    exists: boolean;
}

type RawEntry = [id: string, fields: string[]];

const APPEND_SCRIPT = `
local id = redis.call('XADD', KEYS[1], 'MAXLEN', '~', ARGV[1], '*', 'type', ARGV[2], 'data', ARGV[3])
redis.call('EXPIRE', KEYS[1], ARGV[4])
if ARGV[5] == '1' then
    redis.call('SET', KEYS[2], id, 'EX', ARGV[4])
end
return id
`;

type LogClient = Redis & {
    appendExecutionEvent: (
        eventsKey: string,
        turnKey: string,
        maxEntries: number,
        type: string,
        data: string,
        ttlSeconds: number,
        startsTurn: "0" | "1"
    ) => Promise<string>;
};

export function eventsKey(executionId: string): string {
    return `agent:exec:${executionId}:events`;
}

export function turnKey(executionId: string): string {
    return `agent:exec:${executionId}:turn`;
}

export function parseEntries(raw: RawEntry[]): ExecutionEvent[] {
    const events: ExecutionEvent[] = [];
    for (const [id, fields] of raw) {
        let type = "";
        let data: Record<string, unknown> = {};
        for (let i = 0; i + 1 < fields.length; i += 2) {
            if (fields[i] === "type") {
                type = fields[i + 1];
            } else if (fields[i] === "data") {
                try {
                    data = JSON.parse(fields[i + 1]) as Record<string, unknown>;
                } catch {
                    data = {};
                }
            }
        }
        if (type) {
            events.push({ id, type, data });
        }
    }
    return events;
}

export function isUserMessageEvent(type: string, data: Record<string, unknown>): boolean {
    if (type !== "message") {
        return false;
    }
    const message = data.message;
    return (
        typeof message === "object" &&
        message !== null &&
        (message as { role?: unknown }).role === "user"
    );
}

/**
 * Where a connection without a Last-Event-ID starts. A finished execution yields its
 * terminal event. A running one starts after the latest user message, so a follow-up
 * turn signalled into the same execution does not replay the earlier turns; before
 * the first user message everything is replayed.
 */
export function resolveResumePoint(
    latest: ExecutionEvent | undefined,
    latestTurnStart: string | null
): ResumePoint {
    if (!latest) {
        return { after: "0-0", exists: false };
    }
    if (TERMINAL_EVENT_TYPES.has(latest.type)) {
        return { after: latest.id, terminal: latest, exists: true };
    }
    return { after: latestTurnStart ?? "0-0", exists: true };
}

function createClient(): Redis {
    return new Redis({
        host: config.redis.host,
        port: config.redis.port,
        username: config.redis.username,
        password: config.redis.password,
        tls: config.redis.tls ? {} : undefined,
        lazyConnect: true,
        retryStrategy: (times) => Math.min(times * 50, 2000)
    });
}

/**
 * Follows one execution's stream on a dedicated connection. XREAD BLOCK occupies the
 * connection while it waits, so readers must not share the client used for appends.
 */
export class ExecutionEventReader {
    private client: Redis;
    private closed = false;

    constructor(client: Redis) {
        this.client = client;
    }

    /** Entries after `afterId`, waiting up to `blockMs` for new ones; [] on timeout. */
    async read(executionId: string, afterId: string, blockMs: number): Promise<ExecutionEvent[]> {
        if (this.closed) {
            return [];
        }
        const result = await this.client.xread(
            "COUNT",
            READ_BATCH,
            "BLOCK",
            blockMs,
            "STREAMS",
            eventsKey(executionId),
            afterId
        );
        if (!result || result.length === 0) {
            return [];
        }
        return parseEntries(result[0][1] as RawEntry[]);
    }

    close(): void {
        if (this.closed) {
            return;
        }
        this.closed = true;
        this.client.disconnect();
    }
}

export class ExecutionEventLog {
    private static instance: ExecutionEventLog;
    private clientInstance: LogClient | null = null;

    static getInstance(): ExecutionEventLog {
        if (!ExecutionEventLog.instance) {
            ExecutionEventLog.instance = new ExecutionEventLog();
        }
        return ExecutionEventLog.instance;
    }

    private get client(): LogClient {
        if (!this.clientInstance) {
            const client = createClient();
            client.on("error", (error) => {
                logger.error({ err: error.message }, "Event log connection error");
            });
            client.defineCommand("appendExecutionEvent", { numberOfKeys: 2, lua: APPEND_SCRIPT });
            this.clientInstance = client as LogClient;
        }
        return this.clientInstance;
    }

    /**
     * Append one event. Failures are logged and swallowed: the pub/sub publish that
     * accompanies every append still reaches live subscribers, and an execution must
     * not fail because its log did.
     */
    async append(executionId: string, type: string, data: Record<string, unknown>): Promise<void> {
        try {
            await this.client.appendExecutionEvent(
                eventsKey(executionId),
                turnKey(executionId),
                MAX_ENTRIES,
                type,
                JSON.stringify(data),
                TTL_SECONDS,
                isUserMessageEvent(type, data) ? "1" : "0"
            );
        } catch (error) {
            logger.error({ err: error, executionId, type }, "Failed to append execution event");
        }
    }

    async findResumePoint(executionId: string): Promise<ResumePoint> {
        const [latestRaw, latestTurnStart] = await Promise.all([
            this.client.xrevrange(eventsKey(executionId), "+", "-", "COUNT", 1),
            this.client.get(turnKey(executionId))
        ]);
        const latest = parseEntries(latestRaw as RawEntry[])[0];
        return resolveResumePoint(latest, latestTurnStart);
    }

    createReader(): ExecutionEventReader {
        return new ExecutionEventReader(createClient());
    }

    async disconnect(): Promise<void> {
        if (this.clientInstance) {
            await this.clientInstance.quit();
            this.clientInstance = null;
        }
    }
}

export const executionEventLog = ExecutionEventLog.getInstance();
