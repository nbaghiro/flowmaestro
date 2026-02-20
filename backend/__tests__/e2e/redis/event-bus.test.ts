/**
 * Redis Event Bus E2E Tests
 *
 * Tests Redis pub/sub functionality for real-time event distribution
 * using Testcontainers. Verifies subscription, publishing, and
 * pattern-based matching.
 */

import Redis from "ioredis";
import { getRedis, flushRedis } from "../setup";

describe("Redis Event Bus (Real Redis)", () => {
    let publisher: Redis;
    let subscriber: Redis;

    beforeEach(async () => {
        await flushRedis();
        const redis = getRedis();

        // Create separate connections for pub/sub
        // ioredis connections in subscribe mode can't do other commands
        publisher = redis.duplicate();
        subscriber = redis.duplicate();
    });

    afterEach(async () => {
        // Remove all event listeners first to prevent hanging
        subscriber.removeAllListeners();

        // Use Promise.race with timeout to prevent hanging on unsubscribe
        const cleanup = async () => {
            try {
                await subscriber.unsubscribe();
                await subscriber.punsubscribe();
            } catch {
                // Ignore errors during unsubscribe
            }
            await subscriber.quit();
            await publisher.quit();
        };

        const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2000));
        await Promise.race([cleanup(), timeout]);
    });

    // ========================================================================
    // BASIC PUB/SUB
    // ========================================================================

    describe("publish and subscribe", () => {
        it("should receive published message on subscribed channel", async () => {
            const channel = "events:test:basic";
            const receivedMessages: string[] = [];

            // Subscribe
            await subscriber.subscribe(channel);
            subscriber.on("message", (_ch: string, message: string) => {
                receivedMessages.push(message);
            });

            // Small delay to ensure subscription is active
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Publish
            const published = await publisher.publish(channel, "test-message");

            // Wait for message delivery
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(published).toBe(1); // 1 subscriber received the message
            expect(receivedMessages).toContain("test-message");
        });

        it("should handle JSON message payloads", async () => {
            const channel = "events:test:json";
            const receivedMessages: unknown[] = [];

            await subscriber.subscribe(channel);
            subscriber.on("message", (_ch: string, message: string) => {
                receivedMessages.push(JSON.parse(message));
            });

            await new Promise((resolve) => setTimeout(resolve, 50));

            const payload = { event: "user.created", data: { id: "123", name: "Test" } };
            await publisher.publish(channel, JSON.stringify(payload));

            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(receivedMessages).toHaveLength(1);
            expect(receivedMessages[0]).toEqual(payload);
        });

        it("should not receive messages from unsubscribed channels", async () => {
            const subscribedChannel = "events:subscribed";
            const unsubscribedChannel = "events:unsubscribed";
            const receivedMessages: string[] = [];

            await subscriber.subscribe(subscribedChannel);
            subscriber.on("message", (_ch: string, message: string) => {
                receivedMessages.push(message);
            });

            await new Promise((resolve) => setTimeout(resolve, 50));

            await publisher.publish(subscribedChannel, "subscribed-message");
            await publisher.publish(unsubscribedChannel, "unsubscribed-message");

            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(receivedMessages).toHaveLength(1);
            expect(receivedMessages[0]).toBe("subscribed-message");
        });
    });

    // ========================================================================
    // PATTERN-BASED SUBSCRIPTION
    // ========================================================================

    describe("pattern-based subscription", () => {
        it("should receive messages matching glob pattern", async () => {
            const pattern = "events:user:*";
            const receivedMessages: { channel: string; message: string }[] = [];

            await subscriber.psubscribe(pattern);
            subscriber.on("pmessage", (_pattern: string, channel: string, message: string) => {
                receivedMessages.push({ channel, message });
            });

            await new Promise((resolve) => setTimeout(resolve, 50));

            await publisher.publish("events:user:created", "user-created");
            await publisher.publish("events:user:updated", "user-updated");
            await publisher.publish("events:workflow:started", "workflow-started"); // Should NOT match

            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(receivedMessages).toHaveLength(2);
            expect(receivedMessages.map((m) => m.channel)).toContain("events:user:created");
            expect(receivedMessages.map((m) => m.channel)).toContain("events:user:updated");
        });

        it("should support multi-segment patterns", async () => {
            const pattern = "events:*:*:completed";
            const receivedMessages: string[] = [];

            await subscriber.psubscribe(pattern);
            subscriber.on("pmessage", (_pattern: string, channel: string, _message: string) => {
                receivedMessages.push(channel);
            });

            await new Promise((resolve) => setTimeout(resolve, 50));

            await publisher.publish("events:workflow:abc123:completed", "done");
            await publisher.publish("events:execution:xyz789:completed", "done");
            await publisher.publish("events:workflow:abc123:started", "started"); // Should NOT match

            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(receivedMessages).toHaveLength(2);
        });
    });

    // ========================================================================
    // THREAD-SPECIFIC CHANNELS
    // ========================================================================

    describe("thread-specific channels", () => {
        it("should isolate messages to specific thread channels", async () => {
            const thread1Channel = "thread:thread-1:events";
            const thread2Channel = "thread:thread-2:events";
            const thread1Messages: string[] = [];
            const thread2Messages: string[] = [];

            // Create separate subscribers for each thread
            const sub1 = getRedis().duplicate();
            const sub2 = getRedis().duplicate();

            await sub1.subscribe(thread1Channel);
            await sub2.subscribe(thread2Channel);

            sub1.on("message", (_ch: string, msg: string) => thread1Messages.push(msg));
            sub2.on("message", (_ch: string, msg: string) => thread2Messages.push(msg));

            await new Promise((resolve) => setTimeout(resolve, 50));

            await publisher.publish(thread1Channel, "message-for-thread-1");
            await publisher.publish(thread2Channel, "message-for-thread-2");
            await publisher.publish(thread1Channel, "another-for-thread-1");

            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(thread1Messages).toHaveLength(2);
            expect(thread2Messages).toHaveLength(1);
            expect(thread1Messages).toContain("message-for-thread-1");
            expect(thread1Messages).toContain("another-for-thread-1");
            expect(thread2Messages).toContain("message-for-thread-2");

            await sub1.unsubscribe();
            await sub2.unsubscribe();
            await sub1.quit();
            await sub2.quit();
        });
    });

    // ========================================================================
    // MULTIPLE SUBSCRIBERS
    // ========================================================================

    describe("multiple subscribers", () => {
        it("should deliver message to all subscribers (fan-out)", async () => {
            const channel = "events:broadcast";
            const sub1Messages: string[] = [];
            const sub2Messages: string[] = [];
            const sub3Messages: string[] = [];

            const sub1 = getRedis().duplicate();
            const sub2 = getRedis().duplicate();
            const sub3 = getRedis().duplicate();

            await sub1.subscribe(channel);
            await sub2.subscribe(channel);
            await sub3.subscribe(channel);

            sub1.on("message", (_ch: string, msg: string) => sub1Messages.push(msg));
            sub2.on("message", (_ch: string, msg: string) => sub2Messages.push(msg));
            sub3.on("message", (_ch: string, msg: string) => sub3Messages.push(msg));

            await new Promise((resolve) => setTimeout(resolve, 50));

            const subscriberCount = await publisher.publish(channel, "broadcast-message");

            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(subscriberCount).toBe(3);
            expect(sub1Messages).toContain("broadcast-message");
            expect(sub2Messages).toContain("broadcast-message");
            expect(sub3Messages).toContain("broadcast-message");

            await sub1.unsubscribe();
            await sub2.unsubscribe();
            await sub3.unsubscribe();
            await sub1.quit();
            await sub2.quit();
            await sub3.quit();
        });
    });

    // ========================================================================
    // UNSUBSCRIBE
    // ========================================================================

    describe("unsubscribe cleanup", () => {
        it("should stop receiving messages after unsubscribe", async () => {
            const channel = "events:test:unsubscribe";
            const receivedMessages: string[] = [];

            await subscriber.subscribe(channel);
            subscriber.on("message", (_ch: string, msg: string) => receivedMessages.push(msg));

            await new Promise((resolve) => setTimeout(resolve, 50));

            await publisher.publish(channel, "before-unsubscribe");

            await new Promise((resolve) => setTimeout(resolve, 50));

            await subscriber.unsubscribe(channel);

            await publisher.publish(channel, "after-unsubscribe");

            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(receivedMessages).toHaveLength(1);
            expect(receivedMessages[0]).toBe("before-unsubscribe");
        });

        it("should return 0 when publishing to channel with no subscribers", async () => {
            const channel = "events:no-subscribers";

            const subscriberCount = await publisher.publish(channel, "orphan-message");

            expect(subscriberCount).toBe(0);
        });
    });

    // ========================================================================
    // MESSAGE ORDERING
    // ========================================================================

    describe("message ordering", () => {
        it("should deliver messages in order", async () => {
            const channel = "events:test:ordering";
            const receivedMessages: string[] = [];

            await subscriber.subscribe(channel);
            subscriber.on("message", (_ch: string, msg: string) => receivedMessages.push(msg));

            await new Promise((resolve) => setTimeout(resolve, 50));

            for (let i = 0; i < 10; i++) {
                await publisher.publish(channel, `message-${i}`);
            }

            await new Promise((resolve) => setTimeout(resolve, 200));

            expect(receivedMessages).toHaveLength(10);
            for (let i = 0; i < 10; i++) {
                expect(receivedMessages[i]).toBe(`message-${i}`);
            }
        });
    });
});
