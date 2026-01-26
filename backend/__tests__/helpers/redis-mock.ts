/**
 * Redis Mock Utilities
 *
 * Provides mock Redis client for testing rate limiters and pub/sub services.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MockRedisClientOptions {
    /** Simulated latency in ms for async operations */
    latency?: number;
    /** Whether the client should be "connected" */
    connected?: boolean;
    /** Initial data to populate the mock store */
    initialData?: Record<string, string | number>;
    /** Whether connect() should fail */
    connectShouldFail?: boolean;
}

export interface MockRedisMultiResult {
    value: number | string | null;
    error?: Error;
}

// ============================================================================
// MOCK REDIS CLIENT
// ============================================================================

export class MockRedisClient {
    private store: Map<string, string | number> = new Map();
    private ttls: Map<string, number> = new Map();
    private subscriptions: Map<string, Set<(message: string) => void>> = new Map();
    private connected = false;
    private options: MockRedisClientOptions;

    constructor(options: MockRedisClientOptions = {}) {
        this.options = options;

        if (options.initialData) {
            for (const [key, value] of Object.entries(options.initialData)) {
                this.store.set(key, value);
            }
        }

        if (options.connected) {
            this.connected = true;
        }
    }

    private async delay(): Promise<void> {
        if (this.options.latency) {
            await new Promise((resolve) => setTimeout(resolve, this.options.latency));
        }
    }

    async connect(): Promise<void> {
        await this.delay();
        if (this.options.connectShouldFail) {
            throw new Error("Failed to connect to Redis");
        }
        this.connected = true;
    }

    async disconnect(): Promise<void> {
        await this.delay();
        this.connected = false;
    }

    async quit(): Promise<void> {
        return this.disconnect();
    }

    get isOpen(): boolean {
        return this.connected;
    }

    // ============================================================================
    // STRING OPERATIONS
    // ============================================================================

    async get(key: string): Promise<string | null> {
        await this.delay();
        const value = this.store.get(key);
        if (value === undefined) return null;
        return String(value);
    }

    async set(
        key: string,
        value: string | number,
        options?: { EX?: number; PX?: number; NX?: boolean; XX?: boolean }
    ): Promise<string | null> {
        await this.delay();

        if (options?.NX && this.store.has(key)) {
            return null;
        }

        if (options?.XX && !this.store.has(key)) {
            return null;
        }

        this.store.set(key, value);

        if (options?.EX) {
            this.ttls.set(key, Date.now() + options.EX * 1000);
        } else if (options?.PX) {
            this.ttls.set(key, Date.now() + options.PX);
        }

        return "OK";
    }

    async setEx(key: string, seconds: number, value: string): Promise<string> {
        await this.set(key, value, { EX: seconds });
        return "OK";
    }

    async del(...keys: string[]): Promise<number> {
        await this.delay();
        let count = 0;
        for (const key of keys) {
            if (this.store.delete(key)) {
                this.ttls.delete(key);
                count++;
            }
        }
        return count;
    }

    async exists(...keys: string[]): Promise<number> {
        await this.delay();
        return keys.filter((k) => this.store.has(k)).length;
    }

    // ============================================================================
    // NUMERIC OPERATIONS
    // ============================================================================

    async incr(key: string): Promise<number> {
        await this.delay();
        const current = this.store.get(key);
        const value = current === undefined ? 1 : Number(current) + 1;
        this.store.set(key, value);
        return value;
    }

    async incrBy(key: string, increment: number): Promise<number> {
        await this.delay();
        const current = this.store.get(key);
        const value = current === undefined ? increment : Number(current) + increment;
        this.store.set(key, value);
        return value;
    }

    async decr(key: string): Promise<number> {
        await this.delay();
        const current = this.store.get(key);
        const value = current === undefined ? -1 : Number(current) - 1;
        this.store.set(key, value);
        return value;
    }

    // ============================================================================
    // TTL OPERATIONS
    // ============================================================================

    async expire(key: string, seconds: number): Promise<number> {
        await this.delay();
        if (!this.store.has(key)) return 0;
        this.ttls.set(key, Date.now() + seconds * 1000);
        return 1;
    }

    async ttl(key: string): Promise<number> {
        await this.delay();
        if (!this.store.has(key)) return -2;
        const expiry = this.ttls.get(key);
        if (!expiry) return -1;
        const remaining = Math.ceil((expiry - Date.now()) / 1000);
        return remaining > 0 ? remaining : -2;
    }

    async pExpire(key: string, milliseconds: number): Promise<number> {
        await this.delay();
        if (!this.store.has(key)) return 0;
        this.ttls.set(key, Date.now() + milliseconds);
        return 1;
    }

    // ============================================================================
    // PIPELINE / MULTI
    // ============================================================================

    multi(): MockRedisPipeline {
        return new MockRedisPipeline(this);
    }

    // ============================================================================
    // PUB/SUB
    // ============================================================================

    async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
        await this.delay();
        if (!this.subscriptions.has(channel)) {
            this.subscriptions.set(channel, new Set());
        }
        this.subscriptions.get(channel)!.add(callback);
    }

    async unsubscribe(channel: string, callback?: (message: string) => void): Promise<void> {
        await this.delay();
        if (callback) {
            this.subscriptions.get(channel)?.delete(callback);
        } else {
            this.subscriptions.delete(channel);
        }
    }

    async publish(channel: string, message: string): Promise<number> {
        await this.delay();
        const subscribers = this.subscriptions.get(channel);
        if (!subscribers) return 0;
        for (const callback of subscribers) {
            callback(message);
        }
        return subscribers.size;
    }

    // ============================================================================
    // TEST HELPERS
    // ============================================================================

    /**
     * Clear all data (useful between tests)
     */
    clear(): void {
        this.store.clear();
        this.ttls.clear();
        this.subscriptions.clear();
    }

    /**
     * Get current store state for assertions
     */
    getStore(): Map<string, string | number> {
        return new Map(this.store);
    }

    /**
     * Set store value directly (for test setup)
     */
    setStoreValue(key: string, value: string | number): void {
        this.store.set(key, value);
    }

    /**
     * Trigger TTL expiration check manually (for testing expiry)
     */
    triggerExpirations(): void {
        const now = Date.now();
        for (const [key, expiry] of this.ttls) {
            if (expiry <= now) {
                this.store.delete(key);
                this.ttls.delete(key);
            }
        }
    }
}

// ============================================================================
// MOCK PIPELINE
// ============================================================================

export class MockRedisPipeline {
    private client: MockRedisClient;
    private commands: Array<() => Promise<unknown>> = [];

    constructor(client: MockRedisClient) {
        this.client = client;
    }

    incr(key: string): this {
        this.commands.push(() => this.client.incr(key));
        return this;
    }

    expire(key: string, seconds: number): this {
        this.commands.push(() => this.client.expire(key, seconds));
        return this;
    }

    get(key: string): this {
        this.commands.push(() => this.client.get(key));
        return this;
    }

    set(key: string, value: string | number): this {
        this.commands.push(() => this.client.set(key, value));
        return this;
    }

    del(key: string): this {
        this.commands.push(() => this.client.del(key));
        return this;
    }

    async exec(): Promise<Array<MockRedisMultiResult>> {
        const results: Array<MockRedisMultiResult> = [];
        for (const command of this.commands) {
            try {
                const value = await command();
                results.push({ value: value as number | string | null });
            } catch (error) {
                results.push({ value: null, error: error as Error });
            }
        }
        this.commands = [];
        return results;
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a mock Redis client for testing.
 */
export function createMockRedis(options: MockRedisClientOptions = {}): MockRedisClient {
    return new MockRedisClient(options);
}

/**
 * Create a Jest mock for the redis createClient function.
 * Returns a function that creates mock clients.
 */
export function createRedisMock(options: MockRedisClientOptions = {}) {
    const mockClient = createMockRedis(options);

    return {
        createClient: jest.fn().mockReturnValue(mockClient),
        mockClient
    };
}
