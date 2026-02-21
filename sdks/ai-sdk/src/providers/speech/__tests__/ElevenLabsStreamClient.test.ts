/**
 * Tests for ElevenLabsStreamClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { silentTestLogger, captureTestLogger } from "../../../__tests__/fixtures/configs";
import {
    mockElevenLabsAudioChunk,
    mockElevenLabsFinalChunk,
    mockElevenLabsError
} from "../../../__tests__/fixtures/responses";

// Track mock WebSocket instances
let lastMockWebSocket: MockWebSocket | null = null;

// Simple mock WebSocket implementation inline to avoid hoisting issues
class MockWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;

    readonly url: string;
    readonly options: Record<string, unknown>;
    readyState: number = MockWebSocket.CONNECTING;

    private openHandlers: Array<() => void> = [];
    private messageHandlers: Array<(data: Buffer) => void> = [];
    private errorHandlers: Array<(error: Error) => void> = [];
    private closeHandlers: Array<(code: number, reason: Buffer) => void> = [];

    constructor(url: string, options?: Record<string, unknown>) {
        this.url = url;
        this.options = options ?? {};
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        lastMockWebSocket = this;
    }

    on(event: string, handler: (...args: unknown[]) => void): this {
        switch (event) {
            case "open":
                this.openHandlers.push(handler as () => void);
                break;
            case "message":
                this.messageHandlers.push(handler as (data: Buffer) => void);
                break;
            case "error":
                this.errorHandlers.push(handler as (error: Error) => void);
                break;
            case "close":
                this.closeHandlers.push(handler as (code: number, reason: Buffer) => void);
                break;
        }
        return this;
    }

    send = vi.fn();
    close = vi.fn();

    simulateOpen(): void {
        this.readyState = MockWebSocket.OPEN;
        this.openHandlers.forEach((h) => h());
    }

    simulateMessage(data: unknown): void {
        const buffer = Buffer.from(typeof data === "string" ? data : JSON.stringify(data));
        this.messageHandlers.forEach((h) => h(buffer));
    }

    simulateError(error: Error): void {
        this.errorHandlers.forEach((h) => h(error));
    }

    simulateClose(code = 1000, reason = ""): void {
        this.readyState = MockWebSocket.CLOSED;
        const reasonBuffer = Buffer.from(reason);
        this.closeHandlers.forEach((h) => h(code, reasonBuffer));
    }
}

// Add static properties that the client checks
(MockWebSocket as unknown as { OPEN: number; CLOSED: number }).OPEN = MockWebSocket.OPEN;
(MockWebSocket as unknown as { OPEN: number; CLOSED: number }).CLOSED = MockWebSocket.CLOSED;

// Mock ws module
vi.mock("ws", () => {
    return {
        default: MockWebSocket
    };
});

describe("ElevenLabsStreamClient", () => {
    let ElevenLabsStreamClient: typeof import("../elevenlabs").ElevenLabsStreamClient;
    let client: import("../elevenlabs").ElevenLabsStreamClient;

    beforeEach(async () => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        lastMockWebSocket = null;

        // Dynamic import after mock
        const module = await import("../elevenlabs");
        ElevenLabsStreamClient = module.ElevenLabsStreamClient;

        client = new ElevenLabsStreamClient({
            apiKey: "test-elevenlabs-key",
            logger: silentTestLogger
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.resetModules();
    });

    describe("constructor", () => {
        it("should create client with API key", () => {
            expect(client).toBeDefined();
            expect(client.getIsConnected()).toBe(false);
        });

        it("should accept custom elevenlabs config", () => {
            const customClient = new ElevenLabsStreamClient({
                apiKey: "test-key",
                elevenlabs: {
                    voiceId: "custom-voice",
                    modelId: "eleven_multilingual_v2",
                    stability: 0.8,
                    similarityBoost: 0.9
                }
            });

            expect(customClient).toBeDefined();
        });

        it("should accept custom logger", () => {
            const { logger } = captureTestLogger();
            const customClient = new ElevenLabsStreamClient({
                apiKey: "test-key",
                logger
            });

            expect(customClient).toBeDefined();
        });
    });

    describe("connect", () => {
        it("should connect to ElevenLabs WebSocket", async () => {
            const connectPromise = client.connect();

            const ws = lastMockWebSocket!;
            ws.simulateOpen();

            await connectPromise;

            expect(client.getIsConnected()).toBe(true);
        });

        it("should throw error if API key is missing", async () => {
            const noKeyClient = new ElevenLabsStreamClient({
                apiKey: ""
            });

            await expect(noKeyClient.connect()).rejects.toThrow(
                "ElevenLabs API key not configured"
            );
        });

        it("should construct correct WebSocket URL", async () => {
            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;

            expect(ws.url).toContain("wss://api.elevenlabs.io/v1/text-to-speech");
            expect(ws.options).toEqual(
                expect.objectContaining({
                    headers: expect.objectContaining({
                        "xi-api-key": "test-elevenlabs-key"
                    })
                })
            );

            ws.simulateOpen();
            await connectPromise;
        });

        it("should include voice ID and model in URL", async () => {
            const customClient = new ElevenLabsStreamClient({
                apiKey: "test-key",
                elevenlabs: {
                    voiceId: "my-voice-id",
                    modelId: "eleven_flash_v2_5"
                }
            });

            const connectPromise = customClient.connect();
            const ws = lastMockWebSocket!;

            expect(ws.url).toContain("my-voice-id");
            expect(ws.url).toContain("eleven_flash_v2_5");

            ws.simulateOpen();
            await connectPromise;
        });

        it("should send initial config on connect", async () => {
            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            // Check that initial config was sent
            expect(ws.send).toHaveBeenCalledWith(expect.stringContaining("voice_settings"));
        });

        it("should call onOpen handler when connected", async () => {
            const onOpen = vi.fn();
            client.setOnOpen(onOpen);

            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            expect(onOpen).toHaveBeenCalled();
        });

        it("should reject on connection error", async () => {
            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;

            ws.simulateError(new Error("Connection failed"));

            await expect(connectPromise).rejects.toThrow("Connection failed");
        });
    });

    describe("streamText", () => {
        it("should send text when connected", async () => {
            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            // Clear initial config send
            ws.send.mockClear();

            client.streamText("Hello world");

            expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ text: "Hello world" }));
        });

        it("should not send text when not connected", () => {
            client.streamText("Hello");

            // Should not throw, just log warning
        });

        it("should buffer multiple text chunks", async () => {
            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            ws.send.mockClear();

            client.streamText("Hello ");
            client.streamText("world");
            client.streamText("!");

            expect(ws.send).toHaveBeenCalledTimes(3);
        });
    });

    describe("endText", () => {
        it("should send empty string to signal end", async () => {
            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            ws.send.mockClear();

            client.endText();

            expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ text: "" }));
        });

        it("should do nothing when not connected", () => {
            client.endText();

            // Should not throw
        });
    });

    describe("interrupt", () => {
        it("should clear buffer and reconnect", async () => {
            // Use real timers for this test since interrupt has async close/connect flow
            vi.useRealTimers();

            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            // Start streaming
            client.streamText("Hello");

            // Start interrupt - this will close and reconnect
            const interruptPromise = client.interrupt();

            // Allow the close to happen and connect to start
            await new Promise((r) => setTimeout(r, 10));

            // New connection should have been created
            const newWs = lastMockWebSocket!;
            newWs.simulateOpen();

            await interruptPromise;

            expect(client.getIsConnected()).toBe(true);

            // Restore fake timers for other tests
            vi.useFakeTimers();
        });
    });

    describe("close", () => {
        it("should close WebSocket connection", async () => {
            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            await client.close();

            expect(ws.close).toHaveBeenCalled();
            expect(client.getIsConnected()).toBe(false);
        });
    });

    describe("audio chunk handling", () => {
        it("should call onAudioChunk for audio messages", async () => {
            const onAudioChunk = vi.fn();
            client.setOnAudioChunk(onAudioChunk);

            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            ws.simulateMessage(mockElevenLabsAudioChunk);

            expect(onAudioChunk).toHaveBeenCalledWith("SGVsbG8gV29ybGQh");
        });

        it("should call onComplete for final audio chunk", async () => {
            const onComplete = vi.fn();
            client.setOnComplete(onComplete);

            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            ws.simulateMessage(mockElevenLabsFinalChunk);

            expect(onComplete).toHaveBeenCalled();
        });

        it("should still emit audio on final chunk", async () => {
            const onAudioChunk = vi.fn();
            client.setOnAudioChunk(onAudioChunk);

            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            ws.simulateMessage(mockElevenLabsFinalChunk);

            expect(onAudioChunk).toHaveBeenCalledWith("RmluYWwgY2h1bms=");
        });
    });

    describe("error handling", () => {
        it("should call onError handler for error messages", async () => {
            const onError = vi.fn();
            client.setOnError(onError);

            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            ws.simulateMessage(mockElevenLabsError);

            expect(onError).toHaveBeenCalledWith("Voice not found", "VOICE_NOT_FOUND");
        });

        it("should call onError handler on WebSocket error", async () => {
            const onError = vi.fn();
            client.setOnError(onError);

            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            ws.simulateError(new Error("Connection lost"));

            expect(onError).toHaveBeenCalledWith(expect.stringContaining("Connection lost"));
        });

        it("should handle malformed JSON messages", async () => {
            const { logger, logs } = captureTestLogger();
            const logClient = new ElevenLabsStreamClient({
                apiKey: "test-key",
                logger
            });

            const connectPromise = logClient.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            ws.simulateMessage("not json");

            const errorLogs = logs.filter((l) => l.level === "error");
            expect(errorLogs.some((l) => l.message === "Failed to parse ElevenLabs message")).toBe(
                true
            );
        });
    });

    describe("updateConfig", () => {
        it("should update voice configuration", async () => {
            client.updateConfig({
                voiceId: "new-voice",
                stability: 0.9
            });

            // Config is updated internally - would affect future connections
            // This is mainly a smoke test
            expect(client).toBeDefined();
        });
    });
});
