/**
 * WebSocket mocking utilities for tests
 */

import { EventEmitter } from "events";
import { vi } from "vitest";

/**
 * Mock WebSocket class for testing
 */
export class MockWebSocket extends EventEmitter {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;

    readonly url: string;
    readonly options: Record<string, unknown>;
    readyState: number = MockWebSocket.CONNECTING;

    private messageHandlers: Array<(data: Buffer) => void> = [];
    private errorHandlers: Array<(error: Error) => void> = [];
    private closeHandlers: Array<(code: number, reason: Buffer) => void> = [];
    private openHandlers: Array<() => void> = [];

    constructor(url: string, options?: Record<string, unknown>) {
        super();
        this.url = url;
        this.options = options ?? {};
    }

    /**
     * Simulate connection open
     */
    simulateOpen(): void {
        this.readyState = MockWebSocket.OPEN;
        this.emit("open");
        this.openHandlers.forEach((handler) => handler());
    }

    /**
     * Simulate receiving a message
     */
    simulateMessage(data: unknown): void {
        const buffer = Buffer.from(typeof data === "string" ? data : JSON.stringify(data));
        this.emit("message", buffer);
        this.messageHandlers.forEach((handler) => handler(buffer));
    }

    /**
     * Simulate an error
     */
    simulateError(error: Error): void {
        this.emit("error", error);
        this.errorHandlers.forEach((handler) => handler(error));
    }

    /**
     * Simulate connection close
     */
    simulateClose(code = 1000, reason = ""): void {
        this.readyState = MockWebSocket.CLOSED;
        const reasonBuffer = Buffer.from(reason);
        this.emit("close", code, reasonBuffer);
        this.closeHandlers.forEach((handler) => handler(code, reasonBuffer));
    }

    /**
     * Mock send method
     */
    send = vi.fn((data: unknown) => {
        if (this.readyState !== MockWebSocket.OPEN) {
            throw new Error("WebSocket is not open");
        }
        return data;
    });

    /**
     * Mock close method
     */
    close = vi.fn((code?: number, reason?: string) => {
        this.readyState = MockWebSocket.CLOSING;
        setTimeout(() => {
            this.simulateClose(code ?? 1000, reason ?? "");
        }, 0);
    });

    /**
     * Override on method to track handlers
     */
    on(event: string, handler: (...args: unknown[]) => void): this {
        super.on(event, handler);

        switch (event) {
            case "message":
                this.messageHandlers.push(handler as (data: Buffer) => void);
                break;
            case "error":
                this.errorHandlers.push(handler as (error: Error) => void);
                break;
            case "close":
                this.closeHandlers.push(handler as (code: number, reason: Buffer) => void);
                break;
            case "open":
                this.openHandlers.push(handler as () => void);
                break;
        }

        return this;
    }
}

/**
 * Create a mock WebSocket that auto-connects
 */
export function createAutoConnectWebSocket(
    url: string,
    options?: Record<string, unknown>
): MockWebSocket {
    const ws = new MockWebSocket(url, options);

    // Auto-connect after a tick
    setTimeout(() => {
        ws.simulateOpen();
    }, 0);

    return ws;
}

/**
 * Mock the ws module with custom behavior
 */
export function mockWebSocketModule(
    createInstance?: (url: string, options?: Record<string, unknown>) => MockWebSocket
) {
    const factory =
        createInstance ??
        ((url: string, options?: Record<string, unknown>) =>
            createAutoConnectWebSocket(url, options));

    const mockConstructor = vi.fn((url: string, options?: Record<string, unknown>) => {
        return factory(url, options);
    }) as unknown as {
        new (url: string, options?: Record<string, unknown>): MockWebSocket;
        OPEN: number;
        CLOSED: number;
        instances: MockWebSocket[];
    };

    mockConstructor.OPEN = MockWebSocket.OPEN;
    mockConstructor.CLOSED = MockWebSocket.CLOSED;
    mockConstructor.instances = [];

    return mockConstructor;
}
