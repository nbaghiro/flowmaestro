/**
 * Tests for DeepgramStreamClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { silentTestLogger, captureTestLogger } from "../../../__tests__/fixtures/configs";
import {
    mockDeepgramTranscript,
    mockDeepgramMetadata,
    mockDeepgramError
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

describe("DeepgramStreamClient", () => {
    let DeepgramStreamClient: typeof import("../deepgram").DeepgramStreamClient;
    let client: import("../deepgram").DeepgramStreamClient;

    beforeEach(async () => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        lastMockWebSocket = null;

        // Dynamic import after mock
        const module = await import("../deepgram");
        DeepgramStreamClient = module.DeepgramStreamClient;

        client = new DeepgramStreamClient({
            apiKey: "test-deepgram-key",
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

        it("should accept custom deepgram config", async () => {
            const customClient = new DeepgramStreamClient({
                apiKey: "test-key",
                deepgram: {
                    model: "nova-3",
                    language: "es",
                    sampleRate: 8000
                }
            });

            expect(customClient).toBeDefined();
        });

        it("should accept custom logger", async () => {
            const { logger } = captureTestLogger();
            const customClient = new DeepgramStreamClient({
                apiKey: "test-key",
                logger
            });

            expect(customClient).toBeDefined();
        });
    });

    describe("connect", () => {
        it("should connect to Deepgram WebSocket", async () => {
            const connectPromise = client.connect();

            // Get the mock WebSocket and simulate open
            const ws = lastMockWebSocket!;
            ws.simulateOpen();

            await connectPromise;

            expect(client.getIsConnected()).toBe(true);
        });

        it("should throw error if API key is missing", async () => {
            const noKeyClient = new DeepgramStreamClient({
                apiKey: ""
            });

            await expect(noKeyClient.connect()).rejects.toThrow("Deepgram API key not configured");
        });

        it("should construct correct WebSocket URL with parameters", async () => {
            const connectPromise = client.connect();

            const ws = lastMockWebSocket!;
            expect(ws.url).toContain("wss://api.deepgram.com/v1/listen");
            expect(ws.options).toEqual(
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: "Token test-deepgram-key"
                    })
                })
            );

            ws.simulateOpen();
            await connectPromise;
        });

        it("should include model and language in URL", async () => {
            const customClient = new DeepgramStreamClient({
                apiKey: "test-key",
                deepgram: {
                    model: "nova-3",
                    language: "fr"
                }
            });

            const connectPromise = customClient.connect();
            const ws = lastMockWebSocket!;

            expect(ws.url).toContain("model=nova-3");
            expect(ws.url).toContain("language=fr");

            ws.simulateOpen();
            await connectPromise;
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

        it("should start keep-alive ping interval", async () => {
            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            // Advance time by 10 seconds
            vi.advanceTimersByTime(10000);

            expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: "KeepAlive" }));
        });
    });

    describe("sendAudio", () => {
        it("should send audio data when connected", async () => {
            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            const audioData = Buffer.from("audio data");
            client.sendAudio(audioData);

            expect(ws.send).toHaveBeenCalledWith(audioData);
        });

        it("should not send audio when not connected", () => {
            const audioData = Buffer.from("audio data");
            client.sendAudio(audioData);

            // Should not throw, just log warning
        });
    });

    describe("sendBase64Audio", () => {
        it("should convert base64 to buffer and send", async () => {
            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            const base64Audio = Buffer.from("audio data").toString("base64");
            client.sendBase64Audio(base64Audio);

            expect(ws.send).toHaveBeenCalledWith(expect.any(Buffer));
        });
    });

    describe("close", () => {
        it("should send CloseStream message and close connection", async () => {
            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            const closePromise = client.close();

            // Advance past the 500ms wait
            await vi.advanceTimersByTimeAsync(600);
            await closePromise;

            expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: "CloseStream" }));
            expect(ws.close).toHaveBeenCalled();
            expect(client.getIsConnected()).toBe(false);
        });

        it("should stop keep-alive interval", async () => {
            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            const closePromise = client.close();
            await vi.advanceTimersByTimeAsync(600);
            await closePromise;

            // Clear call history
            ws.send.mockClear();

            // Advance time - no more keep-alive pings
            vi.advanceTimersByTime(20000);

            expect(ws.send).not.toHaveBeenCalledWith(JSON.stringify({ type: "KeepAlive" }));
        });
    });

    describe("transcript handling", () => {
        it("should call onTranscript for final transcripts", async () => {
            const onTranscript = vi.fn();
            client.setOnTranscript(onTranscript);

            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            ws.simulateMessage(mockDeepgramTranscript);

            expect(onTranscript).toHaveBeenCalledWith("Hello, how are you?", true, false);
        });

        it("should handle interim transcripts", async () => {
            const onTranscript = vi.fn();
            client.setOnTranscript(onTranscript);

            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            const interimTranscript = {
                ...mockDeepgramTranscript,
                is_final: false
            };
            ws.simulateMessage(interimTranscript);

            expect(onTranscript).toHaveBeenCalledWith("Hello, how are you?", false, false);
        });

        it("should handle speech_final transcripts", async () => {
            const onTranscript = vi.fn();
            client.setOnTranscript(onTranscript);

            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            const speechFinalTranscript = {
                ...mockDeepgramTranscript,
                speech_final: true
            };
            ws.simulateMessage(speechFinalTranscript);

            expect(onTranscript).toHaveBeenCalledWith("Hello, how are you?", true, true);
        });

        it("should handle Metadata messages", async () => {
            const { logger, logs } = captureTestLogger();
            const logClient = new DeepgramStreamClient({
                apiKey: "test-key",
                logger
            });

            const connectPromise = logClient.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            ws.simulateMessage(mockDeepgramMetadata);

            const debugLogs = logs.filter((l) => l.level === "debug");
            expect(debugLogs.some((l) => l.message === "Deepgram metadata received")).toBe(true);
        });

        it("should handle Error messages", async () => {
            const onError = vi.fn();
            client.setOnError(onError);

            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            ws.simulateMessage(mockDeepgramError);

            expect(onError).toHaveBeenCalledWith("Invalid audio format");
        });

        it("should ignore empty transcripts", async () => {
            const onTranscript = vi.fn();
            client.setOnTranscript(onTranscript);

            const connectPromise = client.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            const emptyTranscript = {
                type: "Results",
                channel: {
                    alternatives: [{ transcript: "", confidence: 0 }]
                }
            };
            ws.simulateMessage(emptyTranscript);

            expect(onTranscript).not.toHaveBeenCalled();
        });
    });

    describe("error handling", () => {
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
            const logClient = new DeepgramStreamClient({
                apiKey: "test-key",
                logger
            });

            const connectPromise = logClient.connect();
            const ws = lastMockWebSocket!;
            ws.simulateOpen();
            await connectPromise;

            ws.simulateMessage("not json");

            const errorLogs = logs.filter((l) => l.level === "error");
            expect(errorLogs.some((l) => l.message === "Failed to parse Deepgram message")).toBe(
                true
            );
        });
    });
});
