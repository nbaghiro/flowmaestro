/**
 * SSE Handler Tests
 *
 * Tests for Server-Sent Events handler (sse-handler.ts)
 */

import { createSSEHandler, sendTerminalEvent } from "../sse-handler";
import type { FastifyRequest, FastifyReply } from "fastify";

describe("SSE Handler", () => {
    let mockRequest: Partial<FastifyRequest>;
    let mockReply: Partial<FastifyReply>;
    let mockRaw: {
        write: jest.Mock;
        end: jest.Mock;
        writeHead: jest.Mock;
    };
    let mockRequestRaw: {
        on: jest.Mock;
    };

    beforeEach(() => {
        mockRaw = {
            write: jest.fn().mockReturnValue(true),
            end: jest.fn(),
            writeHead: jest.fn()
        };

        mockRequestRaw = {
            on: jest.fn()
        };

        mockRequest = {
            raw: mockRequestRaw as unknown as FastifyRequest["raw"]
        };

        mockReply = {
            raw: mockRaw as unknown as FastifyReply["raw"]
        };
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe("createSSEHandler", () => {
        it("should set correct SSE headers", () => {
            createSSEHandler(mockRequest as FastifyRequest, mockReply as FastifyReply);

            expect(mockRaw.writeHead).toHaveBeenCalledWith(
                200,
                expect.objectContaining({
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive"
                })
            );
        });

        it("should include X-Accel-Buffering header for nginx", () => {
            createSSEHandler(mockRequest as FastifyRequest, mockReply as FastifyReply);

            expect(mockRaw.writeHead).toHaveBeenCalledWith(
                200,
                expect.objectContaining({
                    "X-Accel-Buffering": "no"
                })
            );
        });

        it("should return SSEContext with all methods", () => {
            const context = createSSEHandler(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(context).toHaveProperty("sendEvent");
            expect(context).toHaveProperty("sendComment");
            expect(context).toHaveProperty("close");
            expect(context).toHaveProperty("onDisconnect");
            expect(context).toHaveProperty("isConnected");
        });

        it("should allow custom headers", () => {
            createSSEHandler(mockRequest as FastifyRequest, mockReply as FastifyReply, {
                headers: { "X-Custom": "value" }
            });

            expect(mockRaw.writeHead).toHaveBeenCalledWith(
                200,
                expect.objectContaining({
                    "X-Custom": "value"
                })
            );
        });

        it("should register close handler on request", () => {
            createSSEHandler(mockRequest as FastifyRequest, mockReply as FastifyReply);

            expect(mockRequestRaw.on).toHaveBeenCalledWith("close", expect.any(Function));
        });

        it("should register error handler on request", () => {
            createSSEHandler(mockRequest as FastifyRequest, mockReply as FastifyReply);

            expect(mockRequestRaw.on).toHaveBeenCalledWith("error", expect.any(Function));
        });

        it("should start keepAlive interval with default 30s", () => {
            jest.useFakeTimers();

            createSSEHandler(mockRequest as FastifyRequest, mockReply as FastifyReply);

            // Advance time to trigger keepAlive
            jest.advanceTimersByTime(30000);

            expect(mockRaw.write).toHaveBeenCalledWith(": keepalive\n\n");
        });

        it("should allow custom keepAlive interval", () => {
            jest.useFakeTimers();

            createSSEHandler(mockRequest as FastifyRequest, mockReply as FastifyReply, {
                keepAliveInterval: 5000
            });

            // Advance time to trigger keepAlive
            jest.advanceTimersByTime(5000);

            expect(mockRaw.write).toHaveBeenCalledWith(": keepalive\n\n");
        });

        it("should disable keepAlive when interval is 0", () => {
            jest.useFakeTimers();

            createSSEHandler(mockRequest as FastifyRequest, mockReply as FastifyReply, {
                keepAliveInterval: 0
            });

            jest.advanceTimersByTime(60000);

            expect(mockRaw.write).not.toHaveBeenCalledWith(": keepalive\n\n");
        });
    });

    describe("sendEvent", () => {
        it("should send event with data", () => {
            const context = createSSEHandler(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            context.sendEvent("message", { text: "Hello" });

            expect(mockRaw.write).toHaveBeenCalledWith(
                'event: message\ndata: {"text":"Hello"}\n\n'
            );
        });

        it("should not send when connection is closed", () => {
            const context = createSSEHandler(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            // Simulate close
            context.close();
            mockRaw.write.mockClear();

            context.sendEvent("message", { test: true });

            expect(mockRaw.write).not.toHaveBeenCalled();
        });
    });

    describe("sendComment", () => {
        it("should send comment", () => {
            const context = createSSEHandler(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            context.sendComment("This is a comment");

            expect(mockRaw.write).toHaveBeenCalledWith(": This is a comment\n\n");
        });

        it("should not send when connection is closed", () => {
            const context = createSSEHandler(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            context.close();
            mockRaw.write.mockClear();

            context.sendComment("test comment");

            expect(mockRaw.write).not.toHaveBeenCalled();
        });
    });

    describe("close", () => {
        it("should end the connection", () => {
            jest.useFakeTimers();
            const context = createSSEHandler(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            context.close();

            expect(mockRaw.end).toHaveBeenCalled();
        });

        it("should clear keepAlive interval", () => {
            jest.useFakeTimers();
            const context = createSSEHandler(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            context.close();
            mockRaw.write.mockClear();

            // Advance past keepAlive interval
            jest.advanceTimersByTime(60000);

            // No keepalive should be sent after close
            expect(mockRaw.write).not.toHaveBeenCalledWith(": keepalive\n\n");
        });

        it("should not end if already closed", () => {
            jest.useFakeTimers();
            const context = createSSEHandler(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            context.close();
            mockRaw.end.mockClear();

            context.close();

            expect(mockRaw.end).not.toHaveBeenCalled();
        });
    });

    describe("onDisconnect", () => {
        it("should call callback when connection closes", () => {
            const callback = jest.fn();

            // Capture the close handler
            let closeHandler: () => void = () => {};
            mockRequestRaw.on.mockImplementation((event, handler) => {
                if (event === "close") {
                    closeHandler = handler;
                }
            });

            // Re-create to capture handler
            const context2 = createSSEHandler(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );
            context2.onDisconnect(callback);

            // Simulate disconnect
            closeHandler();

            expect(callback).toHaveBeenCalled();
        });

        it("should support multiple disconnect handlers", () => {
            let closeHandler: () => void = () => {};
            mockRequestRaw.on.mockImplementation((event, handler) => {
                if (event === "close") {
                    closeHandler = handler;
                }
            });

            const context = createSSEHandler(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            const callback1 = jest.fn();
            const callback2 = jest.fn();

            context.onDisconnect(callback1);
            context.onDisconnect(callback2);

            closeHandler();

            expect(callback1).toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });
    });

    describe("isConnected", () => {
        it("should return true when connection is open", () => {
            const context = createSSEHandler(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(context.isConnected()).toBe(true);
        });

        it("should return false after close", () => {
            jest.useFakeTimers();
            const context = createSSEHandler(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            context.close();

            expect(context.isConnected()).toBe(false);
            jest.useRealTimers();
        });
    });

    describe("sendTerminalEvent", () => {
        it("should send event and close after delay", () => {
            jest.useFakeTimers();
            const context = createSSEHandler(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            sendTerminalEvent(context, "completed", { success: true });

            expect(mockRaw.write).toHaveBeenCalledWith(
                'event: completed\ndata: {"success":true}\n\n'
            );

            // Connection should still be open
            expect(context.isConnected()).toBe(true);

            // After delay, should close
            jest.advanceTimersByTime(500);

            expect(mockRaw.end).toHaveBeenCalled();
        });

        it("should call cleanup function before closing", () => {
            jest.useFakeTimers();
            const context = createSSEHandler(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );
            const cleanup = jest.fn();

            sendTerminalEvent(context, "done", {}, cleanup);

            // Cleanup not called yet
            expect(cleanup).not.toHaveBeenCalled();

            jest.advanceTimersByTime(500);

            expect(cleanup).toHaveBeenCalled();
        });
    });
});
